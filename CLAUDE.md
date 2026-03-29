# CLAUDE.md — GitSnip

## Project overview

GitSnip lets users download any GitHub subdirectory as a zip.
Monorepo with four packages, **no bundler** for the frontend:

| Directory | Purpose | Runtime |
|-----------|---------|---------|
| `web/` | Static HTML/CSS/JS frontend | Cloudflare Pages |
| `worker/` | API (zip streaming, caching) | Cloudflare Workers |
| `shared/` | URL parsing & types (TS) | Shared |
| `cli/` | `npx gitsnip <url>` | Node.js |

Package manager: **pnpm** (workspaces).

## Development

```bash
pnpm dev          # start worker + web dev servers
pnpm dev:web      # web only (serve on localhost)
pnpm dev:worker   # worker only (wrangler dev)
```

## Architecture notes

- `web/` is a pure static site (no SSR / no template engine). Cross-page reuse is done via **JS modules**.
- `shared/` contains TypeScript source; `web/js/parse-url.js` is the browser-compatible copy.
