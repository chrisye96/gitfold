# GitSnip — Developer Guide

## Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- A Cloudflare account (free tier is sufficient)
- A GitHub Personal Access Token (optional, for higher rate limits)

---

## Project Structure

```
gitsnip/
├── web/                  # Frontend — served by Cloudflare Pages
│   ├── index.html        # Main page (5-state UI)
│   ├── docs.html         # Documentation page
│   ├── css/main.css      # Styles
│   └── js/
│       ├── parse-url.js  # URL parser (browser mirror of shared/parse-url.ts)
│       ├── github.js     # GitHub API client (fetches directly in the browser)
│       ├── zip.js        # JSZip helper
│       ├── main.js       # UI state machine
│       └── i18n.js       # i18n foundation
├── worker/               # Backend — Cloudflare Worker (REST API)
│   ├── src/
│   │   ├── index.ts      # Hono entry point
│   │   ├── routes/api.ts # GET /v1/download, GET /v1/info
│   │   ├── middleware/
│   │   │   └── security.ts # URL validation, limits, CORS
│   │   └── services/
│   │       ├── github.ts # GitHub API + KV caching
│   │       └── zip.ts    # fflate zip creation
│   ├── wrangler.toml     # Cloudflare Worker config
│   └── .dev.vars         # Local secrets (not committed)
├── shared/               # Types and utilities shared by web + worker
│   ├── types.ts          # Core TypeScript interfaces
│   └── parse-url.ts      # URL parser (TypeScript source of truth)
├── docs/
│   ├── api.md            # API reference (source of truth)
│   └── llms-full.txt     # AI-optimised API reference
└── cli/                  # Phase 2 — CLI tool (not yet implemented)
```

---

## Local Development

### Install dependencies

```bash
pnpm install
```

### Start the web frontend

```bash
pnpm dev:web
# Serves web/ at http://localhost:3000
```

The web frontend fetches files **directly from GitHub** in the browser — it does not call the Worker API. You do not need the Worker running for frontend development.

### Start the Worker API (optional)

```bash
pnpm dev:worker
# Runs wrangler dev at http://localhost:8787
```

You will need a `.dev.vars` file in `worker/`:

```bash
cp worker/.dev.vars.example worker/.dev.vars
# Edit worker/.dev.vars and add your GITHUB_TOKEN
```

> **Note:** `wrangler dev` requires the KV namespace IDs in `wrangler.toml` to be set. For local dev you can use placeholder values — Wrangler creates an in-memory KV store automatically.

### TypeScript type-check (Worker)

```bash
pnpm --filter worker type-check
```

---

## First-Time Cloudflare Deployment

### 1. Authenticate with Cloudflare

```bash
wrangler login
# Opens a browser window for OAuth
```

### 2. Create the KV namespace

```bash
wrangler kv:namespace create GITSNIP_CACHE
# Copy the returned id into wrangler.toml → kv_namespaces[0].id

wrangler kv:namespace create GITSNIP_CACHE --preview
# Copy the returned id into wrangler.toml → kv_namespaces[0].preview_id
```

Edit `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding    = "GITSNIP_CACHE"
id         = "PASTE_ID_HERE"
preview_id = "PASTE_PREVIEW_ID_HERE"
```

### 3. Set secrets (optional)

```bash
echo "ghp_your_token" | wrangler secret put GITHUB_TOKEN
```

### 4. Deploy the Worker

```bash
pnpm deploy:worker
# Deploys to api.gitsnip.cc (configure the route in wrangler.toml first)
```

### 5. Deploy the frontend

Connect the `web/` folder to **Cloudflare Pages** via the dashboard:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create project
2. Connect your GitHub repo
3. Set **build output directory** to `web`
4. Leave the build command empty (no build step — pure static files)
5. Add a custom domain: `gitsnip.cc`

After the first setup, every `git push` to `master` redeploys automatically.

---

## Architecture Overview

```
Browser user
  │
  ├─ visits gitsnip.cc (Cloudflare Pages)
  │    └─ web/index.html → web/js/*.js
  │         ├─ parse-url.js    parses the GitHub URL
  │         ├─ github.js       fetches tree + files directly from GitHub
  │         └─ zip.js          creates zip in the browser (JSZip)
  │
  └─ or calls api.gitsnip.cc (Cloudflare Worker)
       ├─ GET /v1/info      → JSON metadata
       └─ GET /v1/download  → zip stream
            ├─ fetchTree()  → GitHub API (2 calls, KV-cached 5 min)
            └─ fetchAllFiles() → raw.githubusercontent.com (no rate limit)
```

**Key insight:** The web frontend and the Worker API are completely independent paths. The Worker is only needed for programmatic/API access (curl, CLI, AI agents).

---

## Adding a New Language (i18n)

1. Open `web/js/i18n.js`
2. Copy the `en` strings object
3. Translate all values
4. Call `setLocale('zh', zhStrings)` before page load

```js
import { setLocale } from './i18n.js'
setLocale('zh', {
  'app.tagline': '下载任何 GitHub 目录，即时完成。',
  // ...
})
```

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GITHUB_TOKEN` | `worker/.dev.vars` / Wrangler secret | GitHub PAT for higher rate limits |
| `ENVIRONMENT` | `wrangler.toml [vars]` | `"production"` or `"development"` |
| `MAX_FILES` | `wrangler.toml [vars]` | Max files per request (default: 500) |
| `MAX_SIZE_MB` | `wrangler.toml [vars]` | Max download size in MB (default: 100) |

---

## Rate Limits

| Scenario | GitHub API limit | Notes |
|---|---|---|
| Web UI (no token) | 60 req/hour per user IP | Each browser is independent |
| Web UI (with token) | 5,000 req/hour per token | Token stored in localStorage |
| Worker API (no token) | 60 req/hour per Worker IP | Shared across all anonymous callers |
| Worker API (X-GitHub-Token) | 5,000 req/hour per token | Caller supplies their own token |

Raw file downloads (`raw.githubusercontent.com`) do **not** count against the GitHub API rate limit.
