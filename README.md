# GitFold

**English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

> Download any GitHub directory as a zip — instantly.

**[gitfold.cc](https://gitfold.cc)** · [Docs](https://gitfold.cc/docs) · [API](https://api.gitfold.cc/docs)

---

## The Fastest Way

Change `github.com` → `gitfold.cc` in any GitHub tree URL and press Enter:

```
https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
         ↓
https://gitfold.cc/anthropics/claude-code/tree/main/plugins/feature-dev
```

That's it. Your browser downloads the zip immediately.

---

## Other Ways

**Web UI** — Paste a GitHub URL at [gitfold.cc](https://gitfold.cc)

**API**
```bash
curl -L "https://api.gitfold.cc/v1/download?url=https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev" \
     -o feature-dev.zip

# tar.gz format
curl -L "https://api.gitfold.cc/v1/download?url=...&format=tar.gz" -o archive.tar.gz
```

**CLI**
```bash
npx gitfold.cc https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
npx gitfold.cc <url> --format tar.gz
npx gitfold.cc <url> --info
npx gitfold.cc <url> --token ghp_xxxx
```

---

## Project Structure

```
gitfold/
├── shared/           # URL parser & types (used by both web and worker)
├── web/              # Static frontend → gitfold.cc (Cloudflare Pages)
├── worker/           # REST API backend → api.gitfold.cc (Cloudflare Workers)
│   └── src/
│       ├── routes/     # api.ts
│       ├── services/   # github, zip, tar, cache
│       └── middleware/ # security
├── chrome-extension/ # Browser extension
├── action/           # GitHub Action
├── docs/             # llms.txt, llms-full.txt
└── cli/              # npx gitfold.cc
```

## Development

```bash
# Install dependencies
pnpm install

# Run worker API locally (port 8787)
pnpm dev:worker

# Serve frontend locally
pnpm dev:web
```

Copy `worker/.dev.vars.example` → `worker/.dev.vars`:

```ini
GITHUB_TOKEN=ghp_...             # optional system token
```

## Deployment

```bash
# Create infrastructure, then put the namespace id in worker/wrangler.toml
wrangler kv namespace create GITFOLD_CACHE
wrangler r2 bucket create gitfold-cache

# Optional shared fallback token for anonymous requests
wrangler secret put GITHUB_TOKEN

# Deploy
pnpm deploy:worker
```

The frontend deploys to Cloudflare Pages on `git push`.

---

## AI Usage

```
GET https://gitfold.cc/llms.txt
GET https://gitfold.cc/llms-full.txt
```

GitFold is designed to be AI-friendly. See [llms.txt](https://gitfold.cc/llms.txt) for machine-readable docs.

---

## License

MIT
