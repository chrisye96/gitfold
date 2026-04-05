// src/background/download.ts
var API_BASE = "https://api.gitfold.cc";
var TIMEOUT_MS = 3e4;
async function fetchWithRetry(url, headers, maxRetries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timeoutId);
      if (res.status >= 500 && attempt < maxRetries) continue;
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === "AbortError") throw err;
    }
  }
  throw lastError;
}
async function downloadBlob(blob, filename) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const dataUrl = `data:application/octet-stream;base64,${base64}`;
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
}
async function handleDownload(url, info, selectedItems) {
  if (info.type === "repo") {
    const branch = info.branch || "HEAD";
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`;
    await chrome.tabs.create({ url: archiveUrl, active: false });
    return { ok: true };
  }
  const { github_token: token } = await chrome.storage.local.get("github_token");
  if (selectedItems && selectedItems.length > 0) {
    const hasToken = Boolean(token);
    const headers = { "X-Client": "extension" };
    if (token) headers["X-GitHub-Token"] = token;
    let successCount = 0;
    let lastErrorCode = "unknown";
    for (const item of selectedItems) {
      try {
        if (item.type === "blob") {
          const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${item.path}`;
          const filename = item.path.split("/").pop() || "file";
          await chrome.downloads.download({ url: rawUrl, filename, saveAs: false });
          successCount++;
        } else {
          const treeUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${item.path}`;
          const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(treeUrl)}`;
          const response = await fetchWithRetry(apiUrl, headers);
          if (response.ok) {
            const blob = await response.blob();
            const safePath = item.path.replace(/\//g, "-");
            const filename = `${info.owner}-${info.repo}-${safePath}.zip`;
            await downloadBlob(blob, filename);
            successCount++;
          } else {
            const s = response.status;
            if (s === 429) lastErrorCode = "rate_limited";
            else if (s === 404) lastErrorCode = "not_found";
            else if (s === 401 || s === 403) lastErrorCode = "forbidden";
            else if (s === 413) lastErrorCode = "too_many_files";
            else lastErrorCode = "unknown";
          }
        }
      } catch (err) {
        lastErrorCode = "network";
      }
    }
    if (successCount > 0) return { ok: true };
    return { ok: false, code: lastErrorCode, hasToken };
  }
  try {
    const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(url)}`;
    const headers = { "X-Client": "extension" };
    if (token) headers["X-GitHub-Token"] = token;
    const response = await fetchWithRetry(apiUrl, headers);
    if (response.ok) {
      const blob = await response.blob();
      const safePath = info.path.replace(/\//g, "-") || "root";
      const filename = `${info.owner}-${info.repo}-${safePath}.zip`;
      await downloadBlob(blob, filename);
      return { ok: true };
    }
    const hasToken = Boolean(token);
    const status = response.status;
    if (status === 429) return { ok: false, code: "rate_limited", hasToken };
    if (status === 404) return { ok: false, code: "not_found", hasToken };
    if (status === 401 || status === 403) return { ok: false, code: "forbidden", hasToken };
    if (status === 413) return { ok: false, code: "too_many_files", hasToken };
    return { ok: false, code: "unknown", hasToken };
  } catch (err) {
    const hasToken = Boolean(token);
    if (err.name === "AbortError") return { ok: false, code: "network", hasToken };
    return { ok: false, code: "network", hasToken };
  }
}

// src/background/token.ts
var STORAGE_KEY = "github_token";
var TOKEN_FORMAT = /^(ghp_|github_pat_|gho_|ghs_|ghu_|ghr_)[A-Za-z0-9_]+$/;
async function saveToken(token) {
  await chrome.storage.local.set({ [STORAGE_KEY]: token });
}
async function clearToken() {
  await chrome.storage.local.remove(STORAGE_KEY);
}
async function validateToken(token) {
  if (!TOKEN_FORMAT.test(token)) {
    return { valid: false, reason: "format" };
  }
  try {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) return { valid: false, reason: "auth" };
    if (response.ok) {
      const data = await response.json();
      return { valid: true, limit: data.resources.core.limit };
    }
    return { valid: true, limit: 0 };
  } catch {
    return { valid: true, limit: 0 };
  }
}

// src/shared/parse-url.ts
function parseGithubUrl(url) {
  if (!url || typeof url !== "string") return null;
  let normalized = url.trim();
  if (normalized.startsWith("//")) normalized = "https:" + normalized;
  if (!normalized.startsWith("http")) normalized = "https://" + normalized;
  let u;
  try {
    u = new URL(normalized);
  } catch {
    return null;
  }
  if (u.hostname !== "github.com" && u.hostname !== "gitfold.cc") return null;
  const treeMatch = u.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/);
  const repoMatch = !treeMatch && u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
  const match = treeMatch || repoMatch;
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo) return null;
  if (owner === "login" || owner === "settings" || owner === "explore") return null;
  if (treeMatch) {
    const branch = treeMatch[3];
    const rawPath = treeMatch[4] || "";
    const path = rawPath.replace(/\/+$/, "");
    return {
      provider: "github",
      type: path ? "folder" : "repo",
      owner,
      repo,
      branch,
      path,
      originalUrl: url
    };
  }
  return {
    provider: "github",
    type: "repo",
    owner,
    repo,
    branch: "",
    path: "",
    originalUrl: url
  };
}

// src/background/context-menu.ts
var MENU_ID = "gitfold-download";
function registerContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Download with GitFold",
      contexts: ["page"],
      documentUrlPatterns: [
        "https://github.com/*/tree/*",
        "https://github.com/*/*"
      ]
    });
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.url) return;
    const repoInfo = parseGithubUrl(tab.url);
    if (!repoInfo) return;
    handleDownload(tab.url, repoInfo).catch(console.error);
  });
}

// src/background/index.ts
registerContextMenu();
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "download") {
    handleDownload(msg.url, msg.info, msg.selectedItems).then(sendResponse).catch((err) => {
      console.error("[GitFold] download failed:", err);
      sendResponse({ ok: false, code: "network", hasToken: false });
    });
    return true;
  }
  if (msg.action === "saveToken") {
    validateToken(msg.token).then(async (result) => {
      if (result.valid) await saveToken(msg.token);
      sendResponse(result);
    }).catch(() => sendResponse({ valid: false, reason: "network" }));
    return true;
  }
  if (msg.action === "clearToken") {
    clearToken().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg.action === "openPopup") {
    chrome.action.openPopup?.();
    return false;
  }
  return false;
});
//# sourceMappingURL=background.js.map
