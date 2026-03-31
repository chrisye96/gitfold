# GitFold

> Download any GitHub directory as a zip — instantly.

**[gitfold.cc](https://gitfold.cc)** · [Docs](https://gitfold.cc/docs) · [Pricing](https://gitfold.cc/pricing) · [API](https://api.gitfold.cc/docs)

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
npx gitfold https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
npx gitfold <url> --format tar.gz
npx gitfold <url> --info
npx gitfold <url> --token ghp_xxxx
```

---

## Tiers

| Tier | Files | How to unlock |
|------|-------|---------------|
| Free | 50 | Default |
| Token | 200 | Add GitHub PAT or sign in with GitHub |
| Pro | 1,000 | [Subscribe](https://gitfold.cc/pricing) |
| Power | 5,000 | [Subscribe](https://gitfold.cc/pricing) |

---

## Project Structure

```
gitfold/
├── shared/          # URL parser & types (used by both web and worker)
├── web/             # Static frontend → gitfold.cc (Cloudflare Pages)
├── worker/          # REST API backend → api.gitfold.cc (Cloudflare Workers)
│   └── src/
│       ├── routes/  # api.ts, auth.ts, billing.ts
│       ├── services/# github, zip, tar, cache, auth, stripe, analytics, crypto, jwt
│       ├── middleware/ # security, session
│       └── db/      # D1 schema + migrations
├── docs/            # llms.txt, llms-full.txt
└── cli/             # npx gitfold
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

Copy `worker/.dev.vars.example` → `worker/.dev.vars` and fill in secrets:

```ini
GITHUB_TOKEN=ghp_...             # optional system token
STRIPE_SECRET_KEY=sk_test_...    # Phase 1
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_POWER_PRICE_ID=price_...
GITHUB_CLIENT_ID=...             # Phase 2 OAuth
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...                   # 32+ char random string
TOKEN_ENCRYPTION_KEY=...         # 64 hex chars (32 bytes)
```

## Deployment

See `plans/implementation-plan.md` for full deployment steps. Quick reference:

```bash
# Create infrastructure
wrangler d1 create gitfold-db
wrangler r2 bucket create gitfold-cache

# Apply DB migrations
wrangler d1 migrations apply gitfold-db

# Set secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY

# Deploy
pnpm deploy:worker
```

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
