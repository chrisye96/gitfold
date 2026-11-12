# GitFold

[English](README.md) | **简体中文** | [繁體中文](README.zh-TW.md)

> 立刻把任意 GitHub 目录下载为 zip。

**[gitfold.cc](https://gitfold.cc)** · [文档](https://gitfold.cc/docs) · [API](https://api.gitfold.cc/docs)

---

## 最快的方法

把任意 GitHub 目录网址（tree URL）中的 `github.com` 改成 `gitfold.cc`，然后按 Enter：

```
https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
         ↓
https://gitfold.cc/anthropics/claude-code/tree/main/plugins/feature-dev
```

就这么简单。浏览器会立刻开始下载 zip。

---

## 其他方法

**网页界面**：在 [gitfold.cc](https://gitfold.cc) 粘贴 GitHub 网址

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

## 项目结构

```
gitfold/
├── shared/           # URL 解析器和类型（web 和 worker 共用）
├── web/              # 静态前端 → gitfold.cc（Cloudflare Pages）
├── worker/           # REST API 后端 → api.gitfold.cc（Cloudflare Workers）
│   └── src/
│       ├── routes/     # api.ts
│       ├── services/   # github, zip, tar, cache
│       └── middleware/ # 安全
├── chrome-extension/ # 浏览器扩展
├── action/           # GitHub Action
├── docs/             # llms.txt, llms-full.txt
└── cli/              # npx gitfold.cc
```

## 开发

```bash
# 安装依赖
pnpm install

# 在本地运行 worker API（端口 8787）
pnpm dev:worker

# 在本地启动前端
pnpm dev:web
```

把 `worker/.dev.vars.example` 复制为 `worker/.dev.vars`：

```ini
GITHUB_TOKEN=ghp_...             # 可选的系统 token
```

## 部署

```bash
# 创建基础设施，然后把 namespace id 填进 worker/wrangler.toml
wrangler kv namespace create GITFOLD_CACHE
wrangler r2 bucket create gitfold-cache

# 可选：匿名请求共用的备用 token
wrangler secret put GITHUB_TOKEN

# 部署
pnpm deploy:worker
```

前端在 `git push` 时自动部署到 Cloudflare Pages。

---

## 供 AI 使用

```
GET https://gitfold.cc/llms.txt
GET https://gitfold.cc/llms-full.txt
```

GitFold 的设计对 AI 友好。机器可读的文档见 [llms.txt](https://gitfold.cc/llms.txt)。

---

## 许可证

MIT

> 本文由英文版机器翻译而来，尚未经过母语者逐行审校。如有出入，以 [English](README.md) 版本为准。
