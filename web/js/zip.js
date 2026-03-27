/**
 * GitSnip — Browser Zip Helper
 * Bundles fetched files into a zip using JSZip (loaded via CDN).
 * Everything runs client-side — no backend needed.
 *
 * @module zip
 */

/**
 * Build the content of the .gitsnip attribution file.
 *
 * @param {string} sourceUrl  - Original GitHub tree URL
 * @returns {string}
 */
function attributionContent(sourceUrl) {
  return [
    'Downloaded with GitSnip — https://gitsnip.cc',
    '',
    `Source:     ${sourceUrl}`,
    `Downloaded: ${new Date().toISOString()}`,
    '',
    'GitSnip lets you download any GitHub directory as a zip.',
    'No git clone needed. Visit https://gitsnip.cc',
  ].join('\n')
}

/**
 * Create a zip blob from an array of fetched files.
 * Strips the repo path prefix so the zip root is the target directory.
 * Always includes a .gitsnip attribution file at the zip root.
 *
 * @param {Array<{ path: string, data: ArrayBuffer }>} files
 * @param {string} rootPath   - e.g. "plugins/feature-dev" — stripped from zip paths
 * @param {(pct: number) => void} [onProgress]  - called with 0–100
 * @param {string} [sourceUrl]  - Original GitHub URL for the attribution file
 * @returns {Promise<Blob>}
 */
export async function createZip(files, rootPath, onProgress, sourceUrl) {
  // JSZip is loaded via <script> tag in index.html
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip is not loaded. Check your internet connection.')
  }

  const zip = new JSZip() // eslint-disable-line no-undef
  const prefix = rootPath ? rootPath + '/' : ''

  for (const { path, data } of files) {
    // Strip directory prefix so zip root = the downloaded folder contents
    const zipPath = prefix && path.startsWith(prefix)
      ? path.slice(prefix.length)
      : path

    if (!zipPath) continue // skip if path becomes empty (shouldn't happen)
    zip.file(zipPath, data)
  }

  // Attribution file — always added at zip root
  zip.file('.gitsnip', attributionContent(sourceUrl || 'https://gitsnip.cc'))

  return zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent))
    },
  )
}

/**
 * Trigger a browser file-save dialog for a Blob.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick so the download has a chance to start
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Format bytes into a human-readable string (KB / MB).
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
