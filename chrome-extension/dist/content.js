"use strict";
(() => {
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

  // src/content/anchor.ts
  function findAnchor() {
    const byAriaLabel = document.querySelector('[aria-label="Code"]');
    if (byAriaLabel) return { element: byAriaLabel, position: "before" };
    const byTestId = document.querySelector('[data-testid="code-button"]');
    if (byTestId) return { element: byTestId, position: "before" };
    const buttons = Array.from(document.querySelectorAll("button"));
    const byText = buttons.find((btn) => btn.textContent?.trim() === "Code");
    if (byText) return { element: byText, position: "before" };
    const copyPathBtn = document.querySelector('[aria-label="Copy path"]');
    if (copyPathBtn) return { element: copyPathBtn, position: "after" };
    const addFileBtn = document.querySelector('[aria-label="Add file"]');
    if (addFileBtn) return { element: addFileBtn, position: "before" };
    return null;
  }

  // src/content/button.css
  var button_default = `/* \u2500\u2500 Shadow DOM stylesheet \u2014 self-contained, no dependencies on GitHub's page \u2500
   Tokens mirror web/css/tokens.css exactly.
   When tokens change in web/css/tokens.css, update this file to match.       */

:host {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;

  /* Light mode \u2014 mirrors web/css/tokens.css */
  --c-primary:       #0969da;
  --c-primary-hover: #035cc5;
  --c-success:       #1a7f37;
  --c-error:         #cf222e;
  --c-text:          #1F2328;
  --c-text-muted:    #656d76;
  --c-border:        #d0d7de;
  --c-surface:       #f6f8fa;
  --c-focus-ring:    rgba(9, 105, 218, 0.3);
  --radius-sm:       4px;
  --radius:          6px;
  --transition:      80ms ease-in-out;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :host {
    --c-primary:       #2f81f7;
    --c-primary-hover: #388bfd;
    --c-success:       #3fb950;
    --c-error:         #f85149;
    --c-text:          #e6edf3;
    --c-text-muted:    #9ba3ab;
    --c-border:        #30363d;
    --c-surface:       #161b22;
    --c-focus-ring:    rgba(47, 129, 247, 0.4);
  }
}

/* \u2500\u2500 Primary download button \u2014 matches .btn-token-save from web \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.gf-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--c-primary);
  color: #ffffff;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25;
  cursor: pointer;
  transition: background var(--transition), opacity var(--transition);
  white-space: nowrap;
  user-select: none;
}

.gf-btn:hover:not(:disabled) {
  background: var(--c-primary-hover);
}

.gf-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--c-focus-ring);
}

.gf-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* \u2500\u2500 State variants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.gf-btn--success {
  background: transparent;
  color: var(--c-success);
  border-color: transparent;
  cursor: default;
  font-weight: 500;
}

/* \u2500\u2500 Error message (not a button) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.gf-error-msg {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--c-error);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* \u2500\u2500 Secondary action button (Add Token / Retry) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.gf-action-btn {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: transparent;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--c-text);
  cursor: pointer;
  margin-left: 6px;
  transition: background var(--transition);
  white-space: nowrap;
}

.gf-action-btn:hover {
  background: var(--c-surface);
}

/* \u2500\u2500 Loading spinner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@keyframes gf-spin {
  to { transform: rotate(360deg); }
}

.gf-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: gf-spin 0.65s linear infinite;
  flex-shrink: 0;
}
`;

  // src/content/button.ts
  var ICON_DOWNLOAD = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z"/>
</svg>`;
  var ERROR_MESSAGES = {
    rate_limited: (hasToken) => hasToken ? "Rate limit reached \u2014 try later" : "Rate limit \u2014 add a token",
    not_found: () => "Folder not found",
    forbidden: () => "Private repo \u2014 add a token",
    network: () => "Network error",
    too_many_files: () => "Too many files",
    unknown: () => "Something went wrong"
  };
  function mountButton(shadow, label, callbacks) {
    const style = document.createElement("style");
    style.textContent = button_default;
    shadow.appendChild(style);
    const container = document.createElement("div");
    container.style.cssText = "display:inline-flex;align-items:center;";
    shadow.appendChild(container);
    function setState(state) {
      container.innerHTML = "";
      if (state.status === "idle") {
        const btn = document.createElement("button");
        btn.className = "gf-btn";
        const displayLabel = state.label ?? label;
        if (state.fileCount !== void 0) btn.title = `${state.fileCount} files`;
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = ICON_DOWNLOAD;
        const labelText = document.createTextNode(` ${displayLabel}`);
        btn.appendChild(iconSpan);
        btn.appendChild(labelText);
        btn.addEventListener("click", callbacks.onDownload);
        container.appendChild(btn);
      } else if (state.status === "loading") {
        const btn = document.createElement("button");
        btn.className = "gf-btn";
        btn.disabled = true;
        btn.innerHTML = `<span class="gf-spinner" aria-hidden="true"></span> <span>Downloading\u2026</span>`;
        container.appendChild(btn);
      } else if (state.status === "success") {
        const btn = document.createElement("button");
        btn.className = "gf-btn gf-btn--success";
        btn.textContent = "\u2713 Downloaded";
        btn.disabled = true;
        container.appendChild(btn);
      } else {
        const { code, hasToken } = state;
        const msg = ERROR_MESSAGES[code](hasToken);
        const span = document.createElement("span");
        span.className = "gf-error-msg";
        span.textContent = `\u2715 ${msg}`;
        container.appendChild(span);
        const needsToken = code === "rate_limited" && !hasToken || code === "forbidden";
        const needsRetry = code === "network" || code === "unknown";
        if (needsToken) {
          const btn = document.createElement("button");
          btn.className = "gf-action-btn";
          btn.textContent = "Add Token";
          btn.addEventListener("click", callbacks.onAddToken);
          container.appendChild(btn);
        } else if (needsRetry) {
          const btn = document.createElement("button");
          btn.className = "gf-action-btn";
          btn.textContent = "Retry";
          btn.addEventListener("click", callbacks.onRetry);
          container.appendChild(btn);
        }
      }
    }
    setState({ status: "idle" });
    return setState;
  }

  // src/content/checkboxes.ts
  var PREFIX = "gitfold-cb";
  var STYLE_ID = `${PREFIX}-style`;
  var selected = /* @__PURE__ */ new Set();
  function getSelectedPaths() {
    return Array.from(selected);
  }
  function cleanupCheckboxes() {
    selected.clear();
    document.querySelectorAll(`.${PREFIX}-wrap`).forEach((el) => el.remove());
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(`${PREFIX}-toolbar`)?.remove();
  }
  function injectCheckboxes() {
    if (!parseGithubUrl(window.location.href)) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      .${PREFIX}-wrap { display: contents; }
      .${PREFIX}-cb { width: 16px; height: 16px; cursor: pointer; accent-color: #0969da; }
      .${PREFIX}-toolbar {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 8px; font-size: 0.8125rem;
        color: #656d76;
      }
    `;
      document.head.appendChild(style);
    }
    const rows = Array.from(
      document.querySelectorAll('[role="row"][data-testid], [role="row"][aria-label]')
    ).filter((row) => row.querySelector('a[href*="/blob/"], a[href*="/tree/"]'));
    for (const row of rows) {
      if (row.querySelector(`.${PREFIX}-cb`)) continue;
      const link = row.querySelector('a[href*="/blob/"], a[href*="/tree/"]');
      if (!link) continue;
      const match = link.href.match(/\/(blob|tree)\/[^/]+\/(.+)$/);
      if (!match) continue;
      const path = decodeURIComponent(match[2]);
      const wrap = document.createElement("span");
      wrap.className = `${PREFIX}-wrap`;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = `${PREFIX}-cb`;
      cb.checked = selected.has(path);
      cb.setAttribute("aria-label", `Select ${path}`);
      cb.addEventListener("change", () => {
        if (cb.checked) {
          selected.add(path);
        } else {
          selected.delete(path);
        }
        updateToolbar();
        document.dispatchEvent(new CustomEvent("gitfold:selection-changed"));
      });
      wrap.appendChild(cb);
      row.insertBefore(wrap, row.firstChild);
    }
  }
  function updateToolbar() {
    const count = selected.size;
    let toolbar = document.getElementById(`${PREFIX}-toolbar`);
    if (count === 0) {
      toolbar?.remove();
      return;
    }
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.id = `${PREFIX}-toolbar`;
      toolbar.className = `${PREFIX}-toolbar`;
      const fileList = document.querySelector('[aria-label="Files"]') ?? document.querySelector('[data-testid="file-tree-content"]');
      fileList?.parentElement?.insertBefore(toolbar, fileList);
    }
    toolbar.textContent = `${count} item${count === 1 ? "" : "s"} selected`;
  }

  // src/content/mount.ts
  var MOUNT_ID = "gitfold-root";
  var selectionChangedHandler = null;
  function tryMount() {
    const info = parseGithubUrl(window.location.href);
    if (!info) {
      cleanup();
      return;
    }
    if (document.getElementById(MOUNT_ID)) return;
    const anchorResult = findAnchor();
    if (!anchorResult) return;
    const { element: anchor, position: insertPosition } = anchorResult;
    const label = info.type === "folder" ? "Download Folder" : "Download Repository";
    const host = document.createElement("div");
    host.id = MOUNT_ID;
    const shadow = host.attachShadow({ mode: "open" });
    let setState;
    const callbacks = {
      onDownload: async () => {
        setState({ status: "loading" });
        try {
          const selectedPaths = getSelectedPaths();
          const response = await chrome.runtime.sendMessage({
            action: "download",
            url: window.location.href,
            info,
            selectedPaths: selectedPaths.length > 0 ? selectedPaths : void 0
          });
          if (response.ok) {
            setState({ status: "success" });
            setTimeout(() => setState({ status: "idle" }), 2e3);
          } else {
            setState({
              status: "error",
              code: response.code ?? "unknown",
              hasToken: response.hasToken ?? false
            });
          }
        } catch {
          setState({ status: "error", code: "network", hasToken: false });
        }
      },
      onAddToken: () => {
        chrome.runtime.sendMessage({ action: "openPopup" });
      },
      onRetry: () => {
        setState({ status: "idle" });
      }
    };
    setState = mountButton(shadow, label, callbacks);
    selectionChangedHandler = () => {
      const paths = getSelectedPaths();
      setState({
        status: "idle",
        label: paths.length > 0 ? `Download ${paths.length} selected` : void 0
      });
    };
    document.addEventListener("gitfold:selection-changed", selectionChangedHandler);
    const fileCount = getVisibleFileCount();
    if (fileCount !== null) {
      setState({ status: "idle", fileCount });
    }
    if (insertPosition === "after") {
      anchor.parentElement?.insertBefore(host, anchor.nextSibling);
    } else {
      anchor.parentElement?.insertBefore(host, anchor);
    }
  }
  function cleanup() {
    document.getElementById(MOUNT_ID)?.remove();
    if (selectionChangedHandler) {
      document.removeEventListener("gitfold:selection-changed", selectionChangedHandler);
      selectionChangedHandler = null;
    }
    cleanupCheckboxes();
  }
  function getVisibleFileCount() {
    const countEl = document.querySelector('[data-testid="files-count"]') ?? document.querySelector('[aria-label*="files"]');
    if (!countEl) return null;
    const match = countEl.textContent?.match(/(\d+)\s+files?/);
    return match ? parseInt(match[1], 10) : null;
  }

  // src/content/index.ts
  var lastHref = "";
  function checkNavigation() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      mountAndInject();
    }
  }
  setInterval(checkNavigation, 500);
  var origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    mountAndInject();
  };
  window.addEventListener("popstate", mountAndInject);
  var debounceTimer = 0;
  var observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(mountAndInject, 300);
  });
  observer.observe(document.body, { childList: true, subtree: false });
  mountAndInject();
  function mountAndInject() {
    tryMount();
    setTimeout(injectCheckboxes, 500);
  }
})();
//# sourceMappingURL=content.js.map
