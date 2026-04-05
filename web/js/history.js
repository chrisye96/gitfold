/**
 * GitFold — Download History (localStorage)
 *
 * Stores the last MAX_ENTRIES downloads in localStorage.
 * Each entry records the repo info, timestamp, file count, and total size.
 *
 * @module history
 */

const HISTORY_KEY = 'gitfold_history'
const MAX_ENTRIES = 20

/**
 * @typedef {Object} HistoryEntry
 * @property {string} url          - Original GitHub URL
 * @property {string} owner
 * @property {string} repo
 * @property {string} branch
 * @property {string} path         - Subdirectory path (empty = full repo)
 * @property {string} zipName      - Suggested zip filename
 * @property {number} fileCount
 * @property {number} totalSize    - Total uncompressed bytes
 * @property {number} timestamp    - Unix ms
 */

// ─── Storage helpers ─────────────────────────────────────────────────────────

/** @returns {HistoryEntry[]} */
export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function _save(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // Quota exceeded — silently skip
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed download into history.
 *
 * @param {{ owner:string, repo:string, branch:string, path:string }} info
 * @param {{ fileCount:number, totalSize:number, zipName:string, url:string }} stats
 */
export function saveToHistory(info, stats) {
  const entry = {
    url: stats.url,
    owner: info.owner,
    repo: info.repo,
    branch: info.branch,
    path: info.path,
    zipName: stats.zipName,
    fileCount: stats.fileCount,
    totalSize: stats.totalSize,
    timestamp: Date.now(),
  }

  const existing = getHistory()
  // De-duplicate by url (move to front if already present)
  const filtered = existing.filter(e => e.url !== entry.url)
  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES)
  _save(updated)
  return updated
}

/**
 * Remove a specific entry by index.
 * @param {number} index
 */
export function removeFromHistory(index) {
  const entries = getHistory()
  entries.splice(index, 1)
  _save(entries)
  return entries
}

/** Clear all history. */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** Format bytes to human-readable string. */
function fmtBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Format a timestamp to a relative or absolute string. */
function fmtTime(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

/**
 * Render the history panel into a container element.
 * Calls onSelect(entry) when the user clicks a history entry.
 * Calls onUpdate() when entries are deleted/cleared.
 *
 * @param {HTMLElement} container
 * @param {(entry: HistoryEntry) => void} onSelect
 * @param {() => void} onUpdate
 */
export function renderHistory(container, onSelect, onUpdate) {
  const entries = getHistory()

  if (entries.length === 0) {
    container.innerHTML = '<p class="history-empty">No downloads yet.</p>'
    return
  }

  const list = document.createElement('ul')
  list.className = 'history-list'

  entries.forEach((entry, idx) => {
    const li = document.createElement('li')
    li.className = 'history-item'

    const label = entry.path
      ? `${entry.owner}/${entry.repo} › ${entry.path}`
      : `${entry.owner}/${entry.repo}`

    li.innerHTML = `
      <button class="history-item-btn" type="button" title="Re-download: ${entry.url}">
        <span class="history-item-label">${label}</span>
        <span class="history-item-meta">
          ${entry.fileCount ? `${entry.fileCount} files` : ''}
          ${entry.totalSize ? ` · ${fmtBytes(entry.totalSize)}` : ''}
          · ${fmtTime(entry.timestamp)}
        </span>
      </button>
      <button class="history-item-del" type="button" aria-label="Remove from history" title="Remove">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `

    li.querySelector('.history-item-btn').addEventListener('click', () => {
      onSelect(entry)
    })

    li.querySelector('.history-item-del').addEventListener('click', (e) => {
      e.stopPropagation()
      removeFromHistory(idx)
      onUpdate()
    })

    list.appendChild(li)
  })

  container.innerHTML = ''
  container.appendChild(list)
}
