/**
 * GitFold Worker — Unified Cache Service (Phase 2)
 *
 * Manages R2-based ZIP caching + existing KV tree caching.
 * ZIP cache key: zip/{owner}/{repo}/{path_hash}/{commit_sha}.zip
 *
 * ZIP caches are keyed by commit SHA so they auto-invalidate when
 * the repo changes — no TTL needed.
 */

import type { Env, RepoInfo } from '../types.js'

// ─── R2 ZIP Cache ───────────────────────────────────────────────────────────

/**
 * Build the R2 cache key for a ZIP archive.
 */
export function zipCacheKey(info: RepoInfo, commitSha: string): string {
  return `zip/${info.owner}/${info.repo}/${encodeURIComponent(info.path || '_root')}/${commitSha}.zip`
}

/**
 * Try to get a cached ZIP from R2.
 * @returns The R2Object body stream + metadata, or null if not cached.
 */
export async function getZipFromR2(
  env: Env,
  key: string,
): Promise<R2ObjectBody | null> {
  if (!env.R2_CACHE) return null
  try {
    const obj = await env.R2_CACHE.get(key)
    return obj
  } catch (err) {
    console.warn('[cache] R2 get error:', err)
    return null
  }
}

/**
 * Save a ZIP archive to R2 (fire-and-forget via waitUntil).
 * Sets custom metadata with creation timestamp for cleanup.
 */
export async function saveZipToR2(
  env: Env,
  key: string,
  data: Uint8Array,
): Promise<void> {
  if (!env.R2_CACHE) return
  try {
    await env.R2_CACHE.put(key, data, {
      httpMetadata: {
        contentType: 'application/zip',
      },
      customMetadata: {
        createdAt: String(Date.now()),
      },
    })
  } catch (err) {
    console.warn('[cache] R2 put error:', err)
  }
}

// ─── Commit SHA fetching ────────────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com'

/**
 * Fetch the HEAD commit SHA for a branch.
 * This is a lightweight API call (1 request) used to build the cache key.
 * Returns null on error (cache miss path will proceed).
 */
export async function fetchCommitSha(
  info: RepoInfo,
  token: string | undefined,
): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'GitFold/1.0 (https://gitfold.cc)',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${info.owner}/${info.repo}/commits/${encodeURIComponent(info.branch)}`,
      { headers },
    )
    if (!res.ok) return null
    const data = await res.json<{ sha: string }>()
    return data.sha ?? null
  } catch {
    return null
  }
}

// ─── R2 Cleanup (Cron) ─────────────────────────────────────────────────────

/**
 * Delete R2 objects older than `maxAgeDays` days.
 * Called from the scheduled (cron) handler.
 */
export async function cleanupOldZips(
  env: Env,
  maxAgeDays = 30,
): Promise<{ deleted: number }> {
  if (!env.R2_CACHE) return { deleted: 0 }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let deleted = 0
  let cursor: string | undefined

  // List and delete in batches
  do {
    const listed = await env.R2_CACHE.list({
      prefix: 'zip/',
      limit: 500,
      cursor,
    })

    const toDelete: string[] = []
    for (const obj of listed.objects) {
      const createdAt = obj.customMetadata?.createdAt
      if (createdAt && parseInt(createdAt, 10) < cutoff) {
        toDelete.push(obj.key)
      } else if (!createdAt && obj.uploaded.getTime() < cutoff) {
        // Fallback to R2's uploaded timestamp
        toDelete.push(obj.key)
      }
    }

    if (toDelete.length > 0) {
      await env.R2_CACHE.delete(toDelete)
      deleted += toDelete.length
    }

    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  console.log(`[cache] Cleaned up ${deleted} expired ZIP files`)
  return { deleted }
}
