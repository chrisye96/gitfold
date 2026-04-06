/**
 * GitFold — URL Parser (TypeScript, shared)
 *
 * Single source of truth for URL parsing logic used by the Worker bundle.
 * The browser (web/js/parse-url.js) is a plain-JS mirror of this file.
 * When changing parsing logic, update both files.
 */
/**
 * Parse a GitHub directory URL into a RepoInfo object.
 *
 * Accepts:
 *   https://github.com/owner/repo/tree/branch/path/to/dir
 *   https://github.com/owner/repo/tree/branch          (root — path will be '')
 *   github.com/owner/repo/tree/branch/path             (no protocol)
 *   https://gitfold.cc/owner/repo/tree/branch/path     (gitfold URL)
 */
export function parseGithubUrl(url) {
    if (!url || typeof url !== 'string')
        return null;
    let normalized = url.trim();
    if (normalized.startsWith('//'))
        normalized = 'https:' + normalized;
    if (!normalized.startsWith('http'))
        normalized = 'https://' + normalized;
    let u;
    try {
        u = new URL(normalized);
    }
    catch {
        return null;
    }
    if (u.hostname !== 'github.com' && u.hostname !== 'gitfold.cc')
        return null;
    // Pattern 1: /owner/repo/tree/branch[/path]
    const treeMatch = u.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/);
    // Pattern 2: /owner/repo (bare repo URL, no branch)
    const repoMatch = !treeMatch && u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    const match = treeMatch || repoMatch;
    if (!match)
        return null;
    const owner = match[1];
    const repo = match[2];
    if (!owner || !repo)
        return null;
    // Reject obvious non-repo segments
    if (owner === 'login' || owner === 'settings' || owner === 'explore')
        return null;
    if (treeMatch) {
        const branch = treeMatch[3];
        const rawPath = treeMatch[4] || '';
        const path = rawPath.replace(/\/+$/, '');
        return {
            provider: 'github',
            type: (path ? 'folder' : 'repo'),
            owner,
            repo,
            branch,
            path,
            originalUrl: url,
        };
    }
    // Bare repo URL — branch unknown, will be resolved at download time
    return {
        provider: 'github',
        type: 'repo',
        owner,
        repo,
        branch: '',
        path: '',
        originalUrl: url,
    };
}
