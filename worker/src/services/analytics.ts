/**
 * GitSnip Worker — Usage Analytics (Phase 2)
 *
 * Writes download events to Cloudflare Analytics Engine.
 * Fire-and-forget — never blocks or fails the download.
 *
 * Query data later via the Analytics Engine SQL API:
 *   SELECT blob1 AS userId, double1 AS fileCount, ...
 *   FROM gitsnip_usage
 *   WHERE timestamp > now() - INTERVAL '7' DAY
 */

import type { Env, Tier } from '../types.js'

export interface DownloadEvent {
  /** D1 user ID or 'anon' */
  userId: string
  tier: Tier
  owner: string
  repo: string
  path: string
  fileCount: number
  totalBytes: number
  durationMs: number
  /** Whether the ZIP was served from R2 cache */
  cacheHit: boolean
}

/**
 * Track a download event in Analytics Engine.
 * Safe to call without awaiting — fails silently.
 */
export function trackDownload(env: Env, event: DownloadEvent): void {
  if (!env.ANALYTICS) return

  try {
    env.ANALYTICS.writeDataPoint({
      // String dimensions (up to 20 blobs)
      blobs: [
        event.userId,                   // blob1: user ID
        event.tier,                     // blob2: tier
        event.owner,                    // blob3: repo owner
        event.repo,                     // blob4: repo name
        event.path,                     // blob5: directory path
        event.cacheHit ? '1' : '0',    // blob6: cache hit flag
      ],
      // Numeric metrics (up to 20 doubles)
      doubles: [
        event.fileCount,                // double1: file count
        event.totalBytes,               // double2: total bytes
        event.durationMs,               // double3: duration in ms
      ],
      // Index for per-user queries
      indexes: [event.userId],
    })
  } catch (err) {
    // Never let analytics break downloads
    console.warn('[analytics] writeDataPoint error:', err)
  }
}
