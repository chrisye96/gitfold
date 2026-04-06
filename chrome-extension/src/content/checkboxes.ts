import { parseGithubUrl } from '../shared/parse-url'

const PREFIX = 'gitfold-cb'
const STYLE_ID = `${PREFIX}-style`

export interface SelectedItem {
  path: string
  /** 'blob' = file, 'tree' = folder */
  type: 'blob' | 'tree'
}

// Selected items: map of path → type
export const selected = new Map<string, 'blob' | 'tree'>()

/** Called from mount.ts to get current selection for download. */
export function getSelectedItems(): SelectedItem[] {
  return Array.from(selected.entries()).map(([path, type]) => ({ path, type }))
}

/** Called on navigation: clear selection and remove injected checkboxes. */
export function cleanupCheckboxes(): void {
  selected.clear()
  document.querySelectorAll(`.${PREFIX}-cb`).forEach(el => el.remove())
  document.getElementById(STYLE_ID)?.remove()
  document.getElementById(`${PREFIX}-toolbar`)?.remove()
}

/**
 * Inject checkboxes into GitHub's file list rows.
 * Uses semantic attributes (role="row", data-testid) to find rows.
 * Styling uses a unique class prefix — no Shadow DOM since checkboxes
 * must interleave with GitHub's own DOM rows.
 */
export function injectCheckboxes(): void {
  if (!parseGithubUrl(window.location.href)) return

  // Inject styles once
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .${PREFIX}-cb {
        width: 14px; height: 14px; cursor: pointer; accent-color: #0969da;
        margin: 0; margin-right: 6px; flex-shrink: 0; vertical-align: middle;
      }
      .${PREFIX}-toolbar {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 8px; font-size: 0.8125rem;
        color: #656d76;
      }
    `
    document.head.appendChild(style)
  }

  // Find file list rows — GitHub uses different DOM structures:
  //   - Repo root: [role="row"] with data-testid or aria-label
  //   - Subdirectory pages: <tr class="react-directory-row">
  const rows = Array.from(
    document.querySelectorAll(
      '[role="row"][data-testid], [role="row"][aria-label], tr.react-directory-row'
    )
  ).filter(row => row.querySelector('a[href*="/blob/"], a[href*="/tree/"]'))

  for (const row of rows) {
    if (row.querySelector(`.${PREFIX}-cb`)) continue  // already injected

    const link = row.querySelector<HTMLAnchorElement>('a[href*="/blob/"], a[href*="/tree/"]')
    if (!link) continue

    // Extract relative path from the href
    const match = link.href.match(/\/(blob|tree)\/[^/]+\/(.+)$/)
    if (!match) continue
    const itemType = match[1] as 'blob' | 'tree'
    const path = decodeURIComponent(match[2])

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.className = `${PREFIX}-cb`
    cb.checked = selected.has(path)
    cb.setAttribute('aria-label', `Select ${path}`)

    cb.addEventListener('change', () => {
      if (cb.checked) {
        selected.set(path, itemType)
      } else {
        selected.delete(path)
      }
      updateToolbar()
      // Notify mount.ts that selection changed
      document.dispatchEvent(new CustomEvent('gitfold:selection-changed'))
    })

    // Insert inside the filename column (next to the file icon), not as a
    // sibling of <td> elements — that breaks table layout.
    // GitHub has two name cells per row (small-screen + large-screen);
    // target the large-screen one which is actually visible on desktop.
    const filenameCol =
      row.querySelector('.react-directory-row-name-cell-large-screen .react-directory-filename-column') ??
      row.querySelector('.react-directory-filename-column') ??  // fallback
      row  // repo root fallback (role="row" divs)
    filenameCol.insertBefore(cb, filenameCol.firstChild)
  }
}

function updateToolbar(): void {
  const count = selected.size
  let toolbar = document.getElementById(`${PREFIX}-toolbar`)

  if (count === 0) {
    toolbar?.remove()
    return
  }

  if (!toolbar) {
    toolbar = document.createElement('div')
    toolbar.id = `${PREFIX}-toolbar`
    toolbar.className = `${PREFIX}-toolbar`
    // Insert above the file list
    const fileList = document.querySelector('[aria-label="Files"]') ??
                     document.querySelector('[data-testid="file-tree-content"]')
    fileList?.parentElement?.insertBefore(toolbar, fileList)
  }

  toolbar.textContent = `${count} item${count === 1 ? '' : 's'} selected`
}
