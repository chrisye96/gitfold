#!/usr/bin/env node
/**
 * gitfold CLI
 * Download any GitHub directory as a zip or tar.gz.
 *
 * Usage:
 *   npx gitfold <github-url> [options]
 *
 * Requires Node.js >= 18 (native fetch + parseArgs).
 */

import { parseArgs } from 'node:util'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const API     = 'https://api.gitfold.cc/v1'
const VERSION = '0.1.0'

// ─── Args ─────────────────────────────────────────────────────────────────────

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output:  { type: 'string',  short: 'o' },
    token:   { type: 'string',  short: 't' },
    format:  { type: 'string',  short: 'f', default: 'zip' },
    info:    { type: 'boolean', short: 'i', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    help:    { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
})

if (values.version) {
  console.log(VERSION)
  process.exit(0)
}

if (values.help || positionals.length === 0) {
  console.log(`
gitfold v${VERSION} — Download any GitHub directory as a zip or tar.gz

Usage:
  npx gitfold <github-url> [options]

Options:
  -o, --output <file>        Output path (default: <dirname> — gitfold.cc.zip)
  -t, --token  <token>       GitHub Personal Access Token (skips rate limits)
  -f, --format <zip|tar.gz>  Archive format (default: zip)
  -i, --info                 Show file info without downloading
  -v, --version              Print version
  -h, --help                 Show this help

Examples:
  npx gitfold https://github.com/anthropics/claude-code/tree/main/plugins
  npx gitfold https://github.com/... -o archive.zip
  npx gitfold https://github.com/... --format tar.gz
  npx gitfold https://github.com/... --info
  npx gitfold https://github.com/... --token ghp_xxxx
`)
  process.exit(values.help ? 0 : 1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function defaultFilename(url, fmt) {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    const last = u.pathname.replace(/\/+$/, '').split('/').at(-1) || 'download'
    const ext = fmt === 'tar.gz' ? 'tar.gz' : 'zip'
    return `${last} — gitfold.cc.${ext}`
  } catch {
    const ext = fmt === 'tar.gz' ? 'tar.gz' : 'zip'
    return `download — gitfold.cc.${ext}`
  }
}

async function apiFetch(path) {
  const headers = {}
  if (values.token) headers['X-GitHub-Token'] = values.token

  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = body.message || res.statusText
    const hint = body.hint ? `\nHint: ${body.hint}` : ''
    throw new Error(`${msg}${hint}`)
  }
  return res
}

// ─── Info mode ────────────────────────────────────────────────────────────────

if (values.info) {
  const res  = await apiFetch(`/info?url=${encodeURIComponent(positionals[0])}`)
  const data = await res.json()

  const pathLabel = data.path ? `/${data.path}` : '/'
  console.log(`\n  ${data.owner}/${data.repo}${pathLabel}  (${data.branch})`)
  console.log(`  ${data.fileCount} files  ·  ${formatBytes(data.totalSize)}\n`)
  for (const f of data.files) {
    console.log(`    ${f.path}  (${formatBytes(f.size)})`)
  }
  console.log()
  process.exit(0)
}

// ─── Download mode ────────────────────────────────────────────────────────────

if (values.token && !/^[\x20-\x7E]+$/.test(values.token)) {
  console.error('Error: --token must contain only ASCII characters')
  process.exit(1)
}

const fmt = ['tar.gz', 'tgz'].includes(values.format) ? 'tar.gz' : 'zip'
const outPath = values.output || defaultFilename(positionals[0], fmt)

process.stdout.write(`Downloading → ${outPath} ... `)

const res = await apiFetch(`/download?url=${encodeURIComponent(positionals[0])}&format=${fmt}`)
await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath))

console.log('done ✓')
