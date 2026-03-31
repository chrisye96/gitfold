#!/usr/bin/env node
/**
 * gitfold — programmatic library
 *
 * import { info, snip } from 'gitfold'
 *
 * Works in Node.js 18+ and modern browsers (native fetch required).
 * Zero dependencies.
 *
 * @module gitfold
 */

const DEFAULT_API = 'https://api.gitfold.cc/v1'

/**
 * @typedef {Object} SnipInfo
 * @property {string} owner
 * @property {string} repo
 * @property {string} branch
 * @property {string} path
 * @property {number} fileCount
 * @property {number} totalSize
 * @property {Array<{path: string, size: number}>} files
 */

/**
 * Fetch metadata for a GitHub directory without downloading files.
 *
 * @param {string} url - GitHub directory URL
 * @param {object} [options]
 * @param {string} [options.token] - GitHub Personal Access Token
 * @param {string} [options.apiBase] - API base URL (default: https://api.gitfold.cc/v1)
 * @returns {Promise<SnipInfo>}
 *
 * @example
 * const meta = await info('https://github.com/owner/repo/tree/main/src')
 * console.log(meta.fileCount, meta.totalSize)
 */
export async function info(url, { token, apiBase = DEFAULT_API } = {}) {
  const headers = {}
  if (token) headers['X-GitHub-Token'] = token

  const res = await fetch(`${apiBase}/info?url=${encodeURIComponent(url)}`, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `GitFold API error: HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Download a GitHub directory as a zip or tar.gz archive.
 * Returns a Fetch Response — use .blob(), .arrayBuffer(), or .body for streaming.
 *
 * For full-repo URLs (no path), the response is a 302 redirect to GitHub's archive.
 * Follow redirects (default fetch behavior) to get the actual file.
 *
 * @param {string} url - GitHub directory or repository URL
 * @param {object} [options]
 * @param {string} [options.token] - GitHub Personal Access Token
 * @param {'zip'|'tar.gz'} [options.format] - Archive format (default: 'zip')
 * @param {string} [options.apiBase] - API base URL (default: https://api.gitfold.cc/v1)
 * @returns {Promise<Response>} - Streaming response with the archive
 *
 * @example
 * // Download and save (Node.js)
 * import { snip } from 'gitfold'
 * import { pipeline } from 'node:stream/promises'
 * import { Readable } from 'node:stream'
 * import { createWriteStream } from 'node:fs'
 *
 * const res = await snip('https://github.com/owner/repo/tree/main/src')
 * await pipeline(Readable.fromWeb(res.body), createWriteStream('src.zip'))
 *
 * @example
 * // Get as Blob (browser)
 * const res = await snip('https://github.com/owner/repo/tree/main/src')
 * const blob = await res.blob()
 * const link = URL.createObjectURL(blob)
 */
export async function snip(url, { token, format = 'zip', apiBase = DEFAULT_API } = {}) {
  const headers = {}
  if (token) headers['X-GitHub-Token'] = token

  const fmt = format === 'tar.gz' || format === 'tgz' ? 'tar.gz' : 'zip'
  const res = await fetch(
    `${apiBase}/download?url=${encodeURIComponent(url)}&format=${fmt}`,
    { headers },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `GitFold API error: HTTP ${res.status}`)
  }
  return res
}
