export interface AnchorResult {
  element: Element
  /** 'before' = insert GitFold before the anchor; 'after' = insert after */
  position: 'before' | 'after'
}

/**
 * Find a stable anchor element next to which the GitFold button is inserted.
 *
 * Priority chain (try each in order, use first match):
 *   1. aria-label="Code"          — repo root: accessibility contract, very stable     → insert before
 *   2. data-testid="code-button"  — repo root: testing contract, stable                → insert before
 *   3. button text === "Code"     — repo root: fragile but better than nothing         → insert before
 *   4. aria-label="Copy path"     — subdirectory: breadcrumb copy button               → insert after
 *   5. aria-label="Add file"      — subdirectory: toolbar "Add file" button            → insert before
 *   6. null                       — graceful degradation; caller must handle
 *
 * Note: GitHub renders different toolbar buttons on repo root vs subdirectory
 * pages. Repo root has a "Code" dropdown; subdirectories have "Copy path"
 * in the breadcrumb and "Add file" in the toolbar instead.
 */
export function findAnchor(): AnchorResult | null {
  // Priority 1 — repo root
  const byAriaLabel = document.querySelector('[aria-label="Code"]')
  if (byAriaLabel) return { element: byAriaLabel, position: 'before' }

  // Priority 2 — repo root
  const byTestId = document.querySelector('[data-testid="code-button"]')
  if (byTestId) return { element: byTestId, position: 'before' }

  // Priority 3 — repo root (text match fallback)
  const buttons = Array.from(document.querySelectorAll('button'))
  const byText = buttons.find(btn => btn.textContent?.trim() === 'Code')
  if (byText) return { element: byText, position: 'before' }

  // Priority 4 — subdirectory pages (breadcrumb copy button)
  const copyPathBtn = document.querySelector('[aria-label="Copy path"]')
  if (copyPathBtn) return { element: copyPathBtn, position: 'after' }

  // Priority 5 — subdirectory pages (toolbar Add file button)
  const addFileBtn = document.querySelector('[aria-label="Add file"]')
  if (addFileBtn) return { element: addFileBtn, position: 'before' }

  // Priority 6: graceful degradation
  return null
}
