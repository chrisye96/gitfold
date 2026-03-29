/**
 * GitSnip shared types
 * Used by both web frontend (browser) and worker backend (Cloudflare Workers)
 */

// TODO(Phase 3): add 'gitlab' | 'bitbucket' when multi-provider support lands
export type ProviderName = 'github'

export interface RepoInfo {
  provider: ProviderName
  /** 'folder' when path is non-empty; 'repo' when path is '' (full repo) */
  type: 'folder' | 'repo'
  owner: string
  repo: string
  branch: string
  path: string
  /** Original URL that was parsed */
  originalUrl: string
}

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  size?: number
  sha: string
}

// TODO(Phase 3): implement concrete providers (GitLab, Bitbucket) against this interface
export interface Provider {
  name: ProviderName
  /** Parse a URL and extract repo info. Returns null if URL is not for this provider. */
  parseUrl(url: string): RepoInfo | null
  /** Fetch the full recursive file tree for a given path */
  getTree(info: RepoInfo, token?: string): Promise<TreeEntry[]>
  /** Get the raw content URL for a file entry */
  getRawUrl(entry: TreeEntry, info: RepoInfo): string
}

// TODO(Phase 2): used by CLI and npm library — not yet consumed by web or Worker
export interface SnipOptions {
  url: string
  token?: string
  /** Output format. Default: 'zip' */
  format?: 'zip' | 'tar.gz'
  /** Paths to exclude. Default: ['.git'] */
  exclude?: string[]
  /** If set, only include files matching these patterns */
  include?: string[]
  /** Flatten directory structure in output. Default: false */
  flatten?: boolean
  /** Progress callback (done files, total files) */
  onProgress?: (done: number, total: number) => void
}

export interface SnipInfo {
  provider: ProviderName
  owner: string
  repo: string
  branch: string
  path: string
  fileCount: number
  totalSize: number
  files: Array<{
    path: string
    size: number
  }>
}

/** Unified error format for API responses */
export interface GitSnipError {
  code:
    | 'INVALID_URL'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'TOO_LARGE'
    | 'TOO_MANY_FILES'
    | 'GITHUB_ERROR'
    | 'UNSUPPORTED_PROVIDER'
  message: string
  hint?: string
}
