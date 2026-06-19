"use strict";
(() => {
  // src/popup/popup.ts
  var TOKEN_FORMAT = /^(ghp_|github_pat_|gho_|ghs_|ghu_|ghr_)[A-Za-z0-9_]+$/;
  var tokenInput = document.getElementById("token-input");
  var saveBtn = document.getElementById("save-btn");
  var clearBtn = document.getElementById("clear-btn");
  var statusRow = document.getElementById("status-row");
  var statusText = document.getElementById("status-text");
  var inputRow = document.getElementById("input-row");
  var tokenError = document.getElementById("token-error");
  var generateLink = document.getElementById("generate-link");
  function showError(msg) {
    tokenError.textContent = msg;
    tokenError.hidden = false;
    tokenInput.classList.add("token-input--error");
  }
  function clearError() {
    tokenError.hidden = true;
    tokenError.textContent = "";
    tokenInput.classList.remove("token-input--error");
  }
  function showSavedState(limitPerHour) {
    inputRow.hidden = true;
    statusRow.hidden = false;
    const limitText = limitPerHour && limitPerHour >= 5e3 ? "5,000 req/hr" : "active";
    statusText.textContent = `\u2713 GitHub Token: ${limitText}`;
  }
  function showInputState() {
    inputRow.hidden = false;
    statusRow.hidden = true;
    tokenInput.removeAttribute("readonly");
    tokenInput.focus();
  }
  chrome.storage.local.get("github_token", (result) => {
    const token = result["github_token"];
    if (token) {
      showSavedState(null);
    } else {
      showInputState();
    }
  });
  tokenInput.addEventListener("focus", () => {
    tokenInput.removeAttribute("readonly");
  });
  tokenInput.addEventListener("input", () => {
    clearError();
    saveBtn.disabled = tokenInput.value.trim().length === 0;
  });
  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !saveBtn.disabled) saveToken();
  });
  saveBtn.addEventListener("click", saveToken);
  async function saveToken() {
    const token = tokenInput.value.trim();
    if (!TOKEN_FORMAT.test(token)) {
      showError("Invalid token format \u2014 should start with ghp_, github_pat_, or similar");
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving\u2026";
    clearError();
    const result = await chrome.runtime.sendMessage({ action: "saveToken", token });
    saveBtn.textContent = "Save";
    if (result.valid) {
      tokenInput.value = "";
      showSavedState(result.limit ?? null);
    } else if (result.reason === "auth") {
      showError("Token is invalid or expired \u2014 check your GitHub settings");
      saveBtn.disabled = false;
    } else {
      showSavedState(null);
    }
  }
  clearBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ action: "clearToken" });
    tokenInput.value = "";
    showInputState();
  });
  generateLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: e.currentTarget.href });
  });
})();
//# sourceMappingURL=popup.js.map
