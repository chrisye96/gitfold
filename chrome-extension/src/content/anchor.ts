/**
 * Find a stable anchor element next to which the GitFold button is inserted.
 *
 * Priority chain (try each in order, use first match):
 *   1. aria-label="Code"         — accessibility contract, very stable
 *   2. data-testid="code-button" — testing contract, stable
 *   3. button text === "Code"    — fragile but better than nothing
 *   4. null                      — graceful degradation; caller must handle
 */
export function findAnchor(): Element | null {
  // Priority 1
  const byAriaLabel = document.querySelector('[aria-label="Code"]')
  if (byAriaLabel) return byAriaLabel

  // Priority 2
  const byTestId = document.querySelector('[data-testid="code-button"]')
  if (byTestId) return byTestId

  // Priority 3
  const buttons = Array.from(document.querySelectorAll('button'))
  const byText = buttons.find(btn => btn.textContent?.trim() === 'Code')
  if (byText) return byText

  // Priority 4: graceful degradation
  return null
}
