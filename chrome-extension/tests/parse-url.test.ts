import { describe, it, expect } from 'vitest'
import { parseGithubUrl } from '../src/shared/parse-url'

describe('parseGithubUrl', () => {
  it('parses a tree URL with path → type folder', () => {
    const result = parseGithubUrl('https://github.com/facebook/react/tree/main/packages/react')
    expect(result).toMatchObject({
      type: 'folder',
      owner: 'facebook',
      repo: 'react',
      branch: 'main',
      path: 'packages/react',
    })
  })

  it('parses a tree URL without path → type repo', () => {
    const result = parseGithubUrl('https://github.com/facebook/react/tree/main')
    expect(result).toMatchObject({ type: 'repo', owner: 'facebook', repo: 'react', branch: 'main', path: '' })
  })

  it('parses a bare repo URL → type repo', () => {
    const result = parseGithubUrl('https://github.com/facebook/react')
    expect(result).toMatchObject({ type: 'repo', owner: 'facebook', repo: 'react', branch: '' })
  })

  it('returns null for a blob URL', () => {
    expect(parseGithubUrl('https://github.com/facebook/react/blob/main/README.md')).toBeNull()
  })

  it('returns null for a non-GitHub URL', () => {
    expect(parseGithubUrl('https://gitlab.com/foo/bar/tree/main')).toBeNull()
  })

  it('returns null for an issues URL', () => {
    expect(parseGithubUrl('https://github.com/facebook/react/issues/1234')).toBeNull()
  })
})
