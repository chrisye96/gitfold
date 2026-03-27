/**
 * GitSnip Worker — Zip Service
 *
 * Creates a zip archive from fetched files using fflate (pure JS, no native deps).
 * Strips the root path prefix so the zip root = the downloaded directory contents.
 */

import { zipSync } from 'fflate'

/**
 * Create a zip archive buffer from an array of files.
 *
 * @param files    - Array of { path, data } objects (paths are full repo paths)
 * @param rootPath - e.g. "plugins/feature-dev" — stripped from zip entry paths
 * @returns        - Uint8Array containing the complete zip file
 */
export function createZip(
  files: Array<{ path: string; data: Uint8Array }>,
  rootPath: string,
): Uint8Array {
  const prefix = rootPath ? rootPath + '/' : ''

  const fileMap: Record<string, Uint8Array> = {}

  for (const { path, data } of files) {
    // Strip directory prefix so the zip root = directory contents
    const zipPath =
      prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path

    // Skip if path becomes empty (shouldn't happen in normal use)
    if (!zipPath) continue

    fileMap[zipPath] = data
  }

  // Synchronous zip with level-6 DEFLATE compression
  return zipSync(fileMap, { level: 6 })
}

/**
 * Build the Response for a zip download.
 *
 * @param zipData  - The zip archive Uint8Array
 * @param filename - Suggested filename (without .zip extension — added automatically)
 * @param headers  - Additional headers to merge (e.g. CORS)
 */
export function zipResponse(
  zipData: Uint8Array,
  filename: string,
  extraHeaders: HeadersInit = {},
): Response {
  const safeName = filename.endsWith('.zip') ? filename : filename + '.zip'
  return new Response(zipData, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(zipData.byteLength),
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

/**
 * Derive a user-friendly filename from a repo path.
 * Uses the last path segment, or the repo name as fallback.
 *
 * @example  zipFilename('plugins/feature-dev', 'claude-code') → 'feature-dev'
 * @example  zipFilename('', 'claude-code') → 'claude-code'
 */
export function zipFilename(path: string, repoName: string): string {
  if (path) {
    return path.split('/').pop() ?? repoName
  }
  return repoName
}
