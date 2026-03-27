# GitSnip

> Download any GitHub directory as a zip — instantly.

**[gitsnip.cc](https://gitsnip.cc)** · [Docs](https://gitsnip.cc/docs) · [API](https://api.gitsnip.cc/docs)

---

## The Fastest Way

Change `github.com` → `gitsnip.cc` in any GitHub tree URL and press Enter:

```
https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
         ↓
https://gitsnip.cc/anthropics/claude-code/tree/main/plugins/feature-dev
```

That's it. Your browser downloads the zip immediately.

---

## Other Ways

**Web UI** — Paste a GitHub URL at [gitsnip.cc](https://gitsnip.cc)

**API**
```bash
curl -L "https://api.gitsnip.cc/v1/download?url=https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev" \
     -o feature-dev.zip
```

**CLI** *(coming soon)*
```bash
npx gitsnip https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
```

---

## Project Structure

```
gitsnip/
├── shared/          # URL parser & types (used by both web and worker)
├── web/             # Static frontend → gitsnip.cc (Cloudflare Pages)
├── worker/          # REST API backend → api.gitsnip.cc (Cloudflare Workers)
├── docs/            # llms.txt, llms-full.txt, api.md
└── cli/             # CLI tool (Phase 2)
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

Copy `worker/.dev.vars.example` → `worker/.dev.vars` and add your GitHub token.

---

## AI Usage

```
GET https://gitsnip.cc/llms.txt
```

GitSnip is designed to be AI-friendly. See [llms.txt](https://gitsnip.cc/llms.txt) for machine-readable docs.

---

## License

MIT
