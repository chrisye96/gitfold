# GitFold

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文**

> 立刻把任何 GitHub 目錄下載成 zip。

**[gitfold.cc](https://gitfold.cc)** · [文件](https://gitfold.cc/docs) · [API](https://api.gitfold.cc/docs)

---

## 最快的方法

把任何 GitHub 目錄網址（tree URL）中的 `github.com` 改成 `gitfold.cc`，再按 Enter：

```
https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
         ↓
https://gitfold.cc/anthropics/claude-code/tree/main/plugins/feature-dev
```

就這麼簡單。瀏覽器會立刻開始下載 zip。

---

## 其他方法

**網頁介面**：在 [gitfold.cc](https://gitfold.cc) 貼上 GitHub 網址

**API**
```bash
curl -L "https://api.gitfold.cc/v1/download?url=https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev" \
     -o feature-dev.zip

# tar.gz 格式
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

## 專案結構

```
gitfold/
├── shared/           # URL 解析器與型別（web 和 worker 共用）
├── web/              # 靜態前端 → gitfold.cc（Cloudflare Pages）
├── worker/           # REST API 後端 → api.gitfold.cc（Cloudflare Workers）
│   └── src/
│       ├── routes/     # api.ts
│       ├── services/   # github, zip, tar, cache
│       └── middleware/ # 安全性
├── chrome-extension/ # 瀏覽器擴充功能
├── action/           # GitHub Action
├── docs/             # llms.txt, llms-full.txt
└── cli/              # npx gitfold.cc
```

## 開發

```bash
# 安裝相依套件
pnpm install

# 在本機執行 worker API（連接埠 8787）
pnpm dev:worker

# 在本機啟動前端
pnpm dev:web
```

將 `worker/.dev.vars.example` 複製為 `worker/.dev.vars`：

```ini
GITHUB_TOKEN=ghp_...             # 選用的系統 token
```

## 部署

```bash
# 建立基礎架構，然後把 namespace id 填入 worker/wrangler.toml
wrangler kv namespace create GITFOLD_CACHE
wrangler r2 bucket create gitfold-cache

# 選用：匿名請求共用的備援 token
wrangler secret put GITHUB_TOKEN

# 部署
pnpm deploy:worker
```

前端會在 `git push` 時自動部署到 Cloudflare Pages。

---

## 供 AI 使用

```
GET https://gitfold.cc/llms.txt
GET https://gitfold.cc/llms-full.txt
```

GitFold 的設計對 AI 友善。機器可讀的文件請見 [llms.txt](https://gitfold.cc/llms.txt)。

---

## 授權條款

MIT

> 本文由英文版機器翻譯而來，尚未經過母語人士逐行審閱。如有出入，以 [English](README.md) 版本為準。
