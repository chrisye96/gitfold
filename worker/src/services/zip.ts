/**
 * GitFold Worker — Zip Service
 *
 * Creates a zip archive from fetched files using fflate (pure JS, no native deps).
 * Strips the root path prefix so the zip root = the downloaded directory contents.
 */

import { zipSync } from 'fflate'

/**
 * Create a zip archive buffer from an array of files.
 * Strips the root path prefix so the zip root = the downloaded directory.
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

    if (!zipPath) continue
    fileMap[zipPath] = data
  }

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
 * Derive the zip filename from a repo path.
 * Appends "-gitfold.cc" as attribution suffix.
 *
 * @example  zipFilename('plugins/feature-dev', 'claude-code') → 'feature-dev-gitfold.cc'
 * @example  zipFilename('', 'claude-code') → 'claude-code-gitfold.cc'
 */
export function zipFilename(path: string, repoName: string): string {
  const base = path ? (path.split('/').pop() ?? repoName) : repoName
  return `${base}-gitfold.cc`
}
