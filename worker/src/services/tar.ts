/**
 * GitSnip Worker — TAR.GZ Service
 *
 * Streams a POSIX ustar tar archive, gzip-compressed via CompressionStream.
 * Zero dependencies — uses only the Web Streams API available in Workers.
 */

const enc = new TextEncoder()

/**
 * Build a 512-byte ustar TAR header for a single file entry.
 */
function buildTarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512)

  function writeStr(offset: number, maxLen: number, value: string) {
    const bytes = enc.encode(value)
    header.set(bytes.subarray(0, Math.min(bytes.length, maxLen)), offset)
  }

  function writeOctal(offset: number, len: number, value: number) {
    // len includes the null terminator
    writeStr(offset, len, value.toString(8).padStart(len - 1, '0') + '\0')
  }

  // Long filenames: split into prefix (≤155) + name (≤100) per ustar spec
  let prefix = ''
  let shortName = name
  if (name.length > 100) {
    const splitAt = name.slice(0, 155).lastIndexOf('/')
    if (splitAt > 0) {
      prefix = name.slice(0, splitAt)
      shortName = name.slice(splitAt + 1)
    }
    // If shortName still > 100 chars, truncate (edge case for very deep paths)
    if (shortName.length > 100) shortName = shortName.slice(shortName.length - 100)
  }

  writeStr(0, 100, shortName)                                         // name
  writeOctal(100, 8, 0o644)                                           // mode
  writeOctal(108, 8, 0)                                               // uid
  writeOctal(116, 8, 0)                                               // gid
  writeOctal(124, 12, size)                                           // size
  writeOctal(136, 12, Math.floor(Date.now() / 1000))                  // mtime
  header.fill(32, 148, 156)                                           // checksum: 8 spaces placeholder
  header[156] = 48                                                    // typeflag: '0' = regular file
  writeStr(257, 6, 'ustar\0')                                         // magic
  writeStr(263, 2, '00')                                              // version
  writeStr(345, 155, prefix)                                          // prefix

  // Checksum: sum of all bytes (checksum field treated as spaces)
  let sum = 0
  for (const b of header) sum += b
  // Write as 6-digit octal + NUL + space (POSIX format)
  writeStr(148, 8, sum.toString(8).padStart(6, '0') + '\0 ')

  return header
}

/**
 * Stream a tar.gz archive as a Response.
 * Uses CompressionStream('gzip') — available in Cloudflare Workers.
 *
 * @param files    - Array of { path, data } (paths are full repo paths)
 * @param rootPath - Directory prefix to strip (e.g. "src/components")
 * @param filename - Suggested filename (without .tar.gz — added automatically)
 * @param extraHeaders - Additional response headers (e.g. CORS)
 */
export function tarGzResponse(
  files: Array<{ path: string; data: Uint8Array }>,
  rootPath: string,
  filename: string,
  extraHeaders: HeadersInit = {},
): Response {
  const prefix = rootPath ? rootPath + '/' : ''
  const EMPTY_512 = new Uint8Array(512)

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const compressed = readable.pipeThrough(new CompressionStream('gzip'))
  const writer = writable.getWriter()

  // Write TAR entries asynchronously
  ;(async () => {
    try {
      for (const { path, data } of files) {
        const entryPath = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path
        if (!entryPath) continue

        const header = buildTarHeader(entryPath, data.byteLength)
        await writer.write(header)
        await writer.write(data)

        // Pad data to next 512-byte boundary
        const remainder = data.byteLength % 512
        if (remainder > 0) {
          await writer.write(new Uint8Array(512 - remainder))
        }
      }
      // End-of-archive: two 512-byte zero blocks
      await writer.write(EMPTY_512)
      await writer.write(EMPTY_512)
      await writer.close()
    } catch (err) {
      await writer.abort(err)
    }
  })()

  const safeName = filename.endsWith('.tar.gz') ? filename : filename + '.tar.gz'
  return new Response(compressed, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}
