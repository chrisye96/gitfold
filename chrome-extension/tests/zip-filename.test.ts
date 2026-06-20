import { describe, it, expect } from 'vitest'
import { zipFilename } from '../src/shared/parse-url'

describe('zipFilename', () => {
  it('names a folder zip after the current (deepest) directory', () => {
    expect(zipFilename({ type: 'folder', repo: 'claude-code', path: 'plugins/feature-dev' }))
      .toBe('feature-dev_gitfold-cc.zip')
  })

  it('uses the repo name when the path is a single top-level folder', () => {
    expect(zipFilename({ type: 'folder', repo: 'react', path: 'packages' }))
      .toBe('packages_gitfold-cc.zip')
  })

  it('falls back to the repo name when path is empty', () => {
    expect(zipFilename({ type: 'folder', repo: 'react', path: '' }))
      .toBe('react_gitfold-cc.zip')
  })

  it('names a full-repo download after the repo', () => {
    expect(zipFilename({ type: 'repo', repo: 'react', path: '' })).toBe('react.zip')
  })
})
