import { describe, it, expect, beforeEach } from 'vitest'
import { findAnchor } from '../src/content/anchor'

describe('findAnchor — priority chain', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('Priority 1: finds by aria-label="Code" (insert before)', () => {
    document.body.innerHTML = `<button aria-label="Code">Code</button>`
    const result = findAnchor()
    expect(result).not.toBeNull()
    expect(result!.element.getAttribute('aria-label')).toBe('Code')
    expect(result!.position).toBe('before')
  })

  it('Priority 1 wins over text and subdirectory anchors', () => {
    document.body.innerHTML = `
      <button aria-label="Code">Code</button>
      <button>Code</button>
      <span aria-label="Copy path">Copy path</span>
      <button aria-label="Add file">Add file</button>
    `
    const result = findAnchor()
    expect(result!.element.getAttribute('aria-label')).toBe('Code')
    expect(result!.position).toBe('before')
  })

  it('Priority 2: finds by data-testid="code-button" when no aria-label (insert before)', () => {
    document.body.innerHTML = `<button data-testid="code-button">Code</button>`
    const result = findAnchor()
    expect(result).not.toBeNull()
    expect(result!.element.getAttribute('data-testid')).toBe('code-button')
    expect(result!.position).toBe('before')
  })

  it('Priority 3: finds by button text content when no attributes (insert before)', () => {
    document.body.innerHTML = `<button>Code</button>`
    const result = findAnchor()
    expect(result).not.toBeNull()
    expect(result!.element.textContent?.trim()).toBe('Code')
    expect(result!.position).toBe('before')
  })

  it('Priority 4: finds by aria-label="Copy path" on subdirectory pages (insert after)', () => {
    document.body.innerHTML = `
      <span aria-label="Copy path">Copy path</span>
      <button aria-label="Add file">Add file</button>
    `
    const result = findAnchor()
    expect(result).not.toBeNull()
    expect(result!.element.getAttribute('aria-label')).toBe('Copy path')
    expect(result!.position).toBe('after')
  })

  it('Priority 5: finds by aria-label="Add file" when no Copy path (insert before)', () => {
    document.body.innerHTML = `<button aria-label="Add file">Add file</button>`
    const result = findAnchor()
    expect(result).not.toBeNull()
    expect(result!.element.getAttribute('aria-label')).toBe('Add file')
    expect(result!.position).toBe('before')
  })

  it('Priority 4 wins over Priority 5 when both present', () => {
    document.body.innerHTML = `
      <span aria-label="Copy path">Copy path</span>
      <button aria-label="Add file">Add file</button>
    `
    const result = findAnchor()
    expect(result!.element.getAttribute('aria-label')).toBe('Copy path')
    expect(result!.position).toBe('after')
  })

  it('Priority 6: returns null when no anchor found (no crash)', () => {
    document.body.innerHTML = `<div>no buttons here</div>`
    expect(findAnchor()).toBeNull()
  })

  it('ignores non-matching buttons and returns null', () => {
    document.body.innerHTML = `<button>Clone</button><button>Fork</button>`
    expect(findAnchor()).toBeNull()
  })
})
