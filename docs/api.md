# GitSnip API Reference

Base URL: `https://api.gitsnip.cc`

All endpoints support CORS and are publicly accessible.
Authentication is optional but recommended for higher rate limits.

---

## Authentication

Pass a GitHub Personal Access Token via header (read-only `public_repo` scope is sufficient):

```
X-GitHub-Token: ghp_your_token_here
```

Without a token: GitHub API allows 60 requests/hour per IP (shared across all unauthenticated calls).
With a token: 5,000 requests/hour per token.

---

## Endpoints

### GET /v1/download

Download a GitHub directory as a zip file.

**Query parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | ✓ | URL-encoded GitHub tree URL |

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `X-GitHub-Token` | — | GitHub PAT (increases rate limit) |

**Response**

- `200 OK` — `application/zip` stream with `Content-Disposition: attachment; filename="dirname.zip"`
- The zip contains only the contents of the target directory (prefix stripped from paths)
- `.git` directories are automatically excluded

**Example**

```bash
curl -L "https://api.gitsnip.cc/v1/download?url=https%3A%2F%2Fgithub.com%2Fanthropics%2Fclaude-code%2Ftree%2Fmain%2Fplugins%2Ffeature-dev" \
     -o feature-dev.zip

# With token:
curl -L \
     -H "X-GitHub-Token: ghp_xxxx" \
     "https://api.gitsnip.cc/v1/download?url=https%3A%2F%2Fgithub.com%2Fanthropics%2Fclaude-code%2Ftree%2Fmain%2Fplugins" \
     -o plugins.zip
```

---

### GET /v1/info

Get metadata about a GitHub directory without downloading it.

**Query parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | ✓ | URL-encoded GitHub tree URL |

**Response**

```json
{
  "provider": "github",
  "owner": "anthropics",
  "repo": "claude-code",
  "branch": "main",
  "path": "plugins/feature-dev",
  "fileCount": 5,
  "totalSize": 12840,
  "files": [
    { "path": "plugins/feature-dev/README.md", "size": 1204 },
    { "path": "plugins/feature-dev/prompt.md", "size": 11636 }
  ]
}
```

**Example**

```bash
curl "https://api.gitsnip.cc/v1/info?url=https%3A%2F%2Fgithub.com%2Fanthropics%2Fclaude-code%2Ftree%2Fmain%2Fplugins%2Ffeature-dev"
```

---

### GET /health

Service health check.

```json
{
  "ok": true,
  "service": "gitsnip-worker",
  "version": "1.0.0",
  "timestamp": "2026-03-27T00:00:00.000Z"
}
```

---

## Error Format

All errors return JSON in this format:

```json
{
  "code": "RATE_LIMITED",
  "message": "GitHub API rate limit exceeded. Resets at ...",
  "hint": "Provide X-GitHub-Token header to get 5,000 requests/hour."
}
```

### Error codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `INVALID_URL` | Missing `url` param, not a GitHub tree URL, or path is empty |
| 401 | `UNAUTHORIZED` | GitHub token is invalid or expired |
| 404 | `NOT_FOUND` | Repository, branch, or path does not exist |
| 413 | `TOO_MANY_FILES` | Directory contains more than 500 files |
| 413 | `TOO_LARGE` | Directory exceeds 100 MB |
| 429 | `RATE_LIMITED` | GitHub API rate limit exceeded |
| 502 | `GITHUB_ERROR` | GitHub API returned an unexpected error |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Limits

| Limit | Value |
|-------|-------|
| Max files per request | 500 |
| Max total size | 100 MB |
| Rate limit (no token) | Cloudflare: 20 req/min/IP; GitHub: 60 req/hour/IP |
| Rate limit (with token) | Cloudflare: 20 req/min/IP; GitHub: 5,000 req/hour/token |

---

## Short alias

`/v1/` is a short alias for `/api/v1/`:

```bash
# These are equivalent:
https://api.gitsnip.cc/api/v1/download?url=...
https://api.gitsnip.cc/v1/download?url=...
```
