// src/background/download.ts
var API_BASE = "https://api.gitfold.cc";
var TIMEOUT_MS = 3e4;
async function handleDownload(url, info) {
  if (info.type === "repo") {
    const branch = info.branch || "HEAD";
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`;
    await chrome.tabs.create({ url: archiveUrl, active: false });
    return { ok: true };
  }
  const { github_token: token } = await chrome.storage.local.get("github_token");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(url)}`;
    const headers = { "X-Client": "extension" };
    if (token) headers["X-GitHub-Token"] = token;
    const response = await fetch(apiUrl, { signal: controller.signal, headers });
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
  } finally {
    clearTimeout(timeoutId);
  }
}

// src/background/index.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "download") {
    handleDownload(msg.url, msg.info).then(sendResponse).catch(() => sendResponse({ ok: false, code: "network", hasToken: false }));
    return true;
  }
  if (msg.action === "openPopup") {
    chrome.action.openPopup?.();
    return false;
  }
  return false;
});
//# sourceMappingURL=background.js.map
