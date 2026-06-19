const TOKEN_FORMAT = /^(ghp_|github_pat_|gho_|ghs_|ghu_|ghr_)[A-Za-z0-9_]+$/

const tokenInput  = document.getElementById('token-input')  as HTMLInputElement
const saveBtn     = document.getElementById('save-btn')      as HTMLButtonElement
const clearBtn    = document.getElementById('clear-btn')     as HTMLButtonElement
const statusRow   = document.getElementById('status-row')    as HTMLDivElement
const statusText  = document.getElementById('status-text')   as HTMLSpanElement
const inputRow    = document.getElementById('input-row')     as HTMLDivElement
const tokenError  = document.getElementById('token-error')   as HTMLParagraphElement
const generateLink = document.getElementById('generate-link') as HTMLAnchorElement

// ── Helpers ──────────────────────────────────────────────────────────────

function showError(msg: string): void {
  tokenError.textContent = msg
  tokenError.hidden = false
  tokenInput.classList.add('token-input--error')
}

function clearError(): void {
  tokenError.hidden = true
  tokenError.textContent = ''
  tokenInput.classList.remove('token-input--error')
}

function showSavedState(limitPerHour: number | null): void {
  inputRow.hidden = true
  statusRow.hidden = false
  const limitText = limitPerHour && limitPerHour >= 5000 ? '5,000 req/hr' : 'active'
  statusText.textContent = `✓ GitHub Token: ${limitText}`
}

function showInputState(): void {
  inputRow.hidden = false
  statusRow.hidden = true
  tokenInput.removeAttribute('readonly')
  tokenInput.focus()
}

// ── Init: check for existing token ───────────────────────────────────────

chrome.storage.local.get('github_token', (result) => {
  const token = result['github_token'] as string | undefined
  if (token) {
    showSavedState(null)  // We show "active" without re-validating on every open
  } else {
    showInputState()
  }
})

// ── Prevent autofill: remove readonly on focus ───────────────────────────

tokenInput.addEventListener('focus', () => {
  tokenInput.removeAttribute('readonly')
})

// ── Input validation: enable Save + clear error as user types ─────────────

tokenInput.addEventListener('input', () => {
  clearError()
  saveBtn.disabled = tokenInput.value.trim().length === 0
})

tokenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !saveBtn.disabled) saveToken()
})

// ── Save ──────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', saveToken)

async function saveToken(): Promise<void> {
  const token = tokenInput.value.trim()

  if (!TOKEN_FORMAT.test(token)) {
    showError('Invalid token format — should start with ghp_, github_pat_, or similar')
    return
  }

  saveBtn.disabled = true
  saveBtn.textContent = 'Saving…'
  clearError()

  const result: { valid: boolean; reason?: string; limit?: number } =
    await chrome.runtime.sendMessage({ action: 'saveToken', token })

  saveBtn.textContent = 'Save'

  if (result.valid) {
    tokenInput.value = ''
    showSavedState(result.limit ?? null)
  } else if (result.reason === 'auth') {
    showError('Token is invalid or expired — check your GitHub settings')
    saveBtn.disabled = false
  } else {
    // Network error during validation: token was saved anyway
    showSavedState(null)
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────

clearBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'clearToken' })
  tokenInput.value = ''
  showInputState()
})

// ── Open generate link without closing popup ─────────────────────────────

generateLink.addEventListener('click', (e) => {
  e.preventDefault()
  chrome.tabs.create({ url: (e.currentTarget as HTMLAnchorElement).href })
})
