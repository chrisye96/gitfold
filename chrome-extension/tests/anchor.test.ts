import { describe, it, expect, beforeEach } from 'vitest'
import { findAnchor } from '../src/content/anchor'

describe('findAnchor — priority chain', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('Priority 1: finds by aria-label="Code"', () => {
    document.body.innerHTML = `<button aria-label="Code">Code</button>`
    expect(findAnchor()).not.toBeNull()
  })

  it('Priority 1 wins over text when both present', () => {
    document.body.innerHTML = `
      <button aria-label="Code">Code</button>
      <button>Code</button>
    `
    const anchor = findAnchor()
    expect(anchor?.getAttribute('aria-label')).toBe('Code')
  })

  it('Priority 2: finds by data-testid="code-button" when no aria-label', () => {
    document.body.innerHTML = `<button data-testid="code-button">Code</button>`
    expect(findAnchor()).not.toBeNull()
  })

  it('Priority 3: finds by button text content when no attributes', () => {
    document.body.innerHTML = `<button>Code</button>`
    expect(findAnchor()).not.toBeNull()
  })

  it('Priority 3: ignores buttons with non-matching text', () => {
    document.body.innerHTML = `<button>Clone</button><button>Fork</button>`
    expect(findAnchor()).toBeNull()
  })

  it('Priority 4: returns null when no anchor found (no crash)', () => {
    document.body.innerHTML = `<div>no buttons here</div>`
    expect(findAnchor()).toBeNull()
  })
})
