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
async function handleDownload(url, info) {
  if (info.type === "repo") {
    const branch = info.branch || "HEAD";
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`;
    await chrome.tabs.create({ url: archiveUrl, active: false });
    return { ok: true };
  }
  const { github_token: token } = await chrome.storage.local.get("github_token");
  try {
    const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(url)}`;
    const headers = { "X-Client": "extension" };
    if (token) headers["X-GitHub-Token"] = token;
    const response = await fetchWithRetry(apiUrl, headers);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const safePath = info.path.replace(/\//g, "-") || "root";
      const filename = `${info.owner}-${info.repo}-${safePath}.zip`;
      await chrome.downloads.download({ url: blobUrl, filename, saveAs: false });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 6e4);
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

// src/background/index.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "download") {
    handleDownload(msg.url, msg.info).then(sendResponse).catch(() => sendResponse({ ok: false, code: "network", hasToken: false }));
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
