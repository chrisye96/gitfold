/**
 * GitFold — Team Management UI (Phase 3 / Power Tier)
 *
 * Handles all team operations: create, invite, list members, remove, join.
 *
 * @module team
 */

import { renderLayout } from './layout.js'
import { initTheme } from './theme.js'
import { checkSession } from './auth.js'

const API_BASE = 'https://api.gitfold.cc'

// ─── DOM refs (populated after DOMContentLoaded) ──────────────────────────────

let teamMain    // #team-main
let session     // current user session

// ─── API helpers ─────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}/v1${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.message || 'API error'), { code: data.code })
  return data
}

// ─── Views ────────────────────────────────────────────────────────────────────

function renderNotSignedIn() {
  teamMain.innerHTML = `
    <div class="team-empty">
      <h2>Team Management</h2>
      <p>Sign in with GitHub to manage your team.</p>
      <a href="/" class="btn btn--primary">Go to GitFold</a>
    </div>
  `
}

function renderNotPower() {
  teamMain.innerHTML = `
    <div class="team-empty">
      <h2>Team Management</h2>
      <p>Team features require a <strong>Power</strong> subscription.</p>
      <a href="/pricing" class="btn btn--primary">Upgrade to Power →</a>
    </div>
  `
}

function renderError(msg) {
  teamMain.innerHTML = `<div class="team-empty"><p class="team-error">${msg}</p></div>`
}

async function loadAndRender() {
  teamMain.innerHTML = '<div class="team-loading">Loading…</div>'

  try {
    const data = await api('GET', '/team/info')

    if (!data.team) {
      renderCreateTeam()
    } else {
      renderTeamDashboard(data.team)
    }
  } catch (err) {
    renderError(err.message || 'Failed to load team info.')
  }
}

// ─── Create team view ─────────────────────────────────────────────────────────

function renderCreateTeam() {
  teamMain.innerHTML = `
    <div class="team-card">
      <h2 class="team-card-title">Create your team</h2>
      <p class="team-card-sub">Power members of your team inherit your Power tier limits (5,000 files).</p>
      <form id="create-team-form" class="team-form">
        <label for="team-name-input" class="team-label">Team name</label>
        <div class="team-input-row">
          <input id="team-name-input" type="text" class="team-input"
                 placeholder="Acme Corp" maxlength="64" required />
          <button type="submit" class="btn btn--primary">Create</button>
        </div>
        <p id="create-team-error" class="team-error" hidden></p>
      </form>
    </div>
  `

  document.getElementById('create-team-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('team-name-input').value.trim()
    const errEl = document.getElementById('create-team-error')
    errEl.hidden = true
    try {
      await api('POST', '/team/create', { name })
      loadAndRender()
    } catch (err) {
      errEl.textContent = err.message
      errEl.hidden = false
    }
  })
}

// ─── Team dashboard view ──────────────────────────────────────────────────────

async function renderTeamDashboard(teamInfo) {
  teamMain.innerHTML = '<div class="team-loading">Loading members…</div>'

  let membersData
  try {
    membersData = await api('GET', '/team/members')
  } catch {
    renderError('Failed to load team members.')
    return
  }

  const isOwner = teamInfo.ownerId === session?.userId
  const members = membersData.members || []

  teamMain.innerHTML = `
    <div class="team-card">
      <div class="team-card-header">
        <div>
          <h2 class="team-card-title">${escHtml(teamInfo.name)}</h2>
          <p class="team-card-sub">${members.length} member${members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      ${isOwner ? `
      <div class="team-invite-section">
        <h3 class="team-section-title">Invite a member</h3>
        <form id="invite-form" class="team-form">
          <div class="team-input-row">
            <input id="invite-email" type="email" class="team-input"
                   placeholder="colleague@example.com" required />
            <button type="submit" class="btn btn--primary">Send invite</button>
          </div>
          <p id="invite-result" class="team-invite-result" hidden></p>
          <p id="invite-error" class="team-error" hidden></p>
        </form>
      </div>
      ` : ''}

      <div class="team-members-section">
        <h3 class="team-section-title">Members</h3>
        <ul class="team-members-list" id="team-members-list">
          ${members.map(m => memberRow(m, isOwner, teamInfo.ownerId)).join('')}
        </ul>
      </div>
    </div>
  `

  if (isOwner) {
    document.getElementById('invite-form').addEventListener('submit', handleInvite)
  }

  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => handleRemove(btn.dataset.remove))
  })
}

function memberRow(m, isOwner, ownerId) {
  const badge = m.status === 'invited'
    ? '<span class="team-badge team-badge--pending">Invited</span>'
    : m.role === 'owner' ? '<span class="team-badge team-badge--owner">Owner</span>' : ''

  const avatar = m.github_login
    ? `<img src="https://avatars.githubusercontent.com/${m.github_login}" width="28" height="28" alt="" class="team-avatar" />`
    : `<span class="team-avatar team-avatar--placeholder">${(m.email[0] || '?').toUpperCase()}</span>`

  const removeBtn = isOwner && m.email !== session?.email
    ? `<button class="team-member-del" data-remove="${m.id}" type="button"
               aria-label="Remove ${escHtml(m.email)}">
         <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
           <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
         </svg>
       </button>`
    : ''

  return `
    <li class="team-member-row">
      ${avatar}
      <span class="team-member-info">
        <span class="team-member-name">${escHtml(m.github_login || m.email)}</span>
        <span class="team-member-email">${escHtml(m.email)}</span>
      </span>
      ${badge}
      ${removeBtn}
    </li>
  `
}

async function handleInvite(e) {
  e.preventDefault()
  const email = document.getElementById('invite-email').value.trim()
  const resultEl = document.getElementById('invite-result')
  const errorEl = document.getElementById('invite-error')
  resultEl.hidden = true
  errorEl.hidden = true

  try {
    const data = await api('POST', '/team/invite', { email })
    resultEl.innerHTML = `
      Invite link for <strong>${escHtml(email)}</strong>:<br>
      <input class="team-invite-link" value="${escHtml(data.inviteUrl)}" readonly />
      <button type="button" class="team-copy-link" onclick="navigator.clipboard.writeText('${escHtml(data.inviteUrl)}').then(()=>this.textContent='Copied!')">Copy</button>
    `
    resultEl.hidden = false
    document.getElementById('invite-email').value = ''
    // Reload member list
    loadAndRender()
  } catch (err) {
    errorEl.textContent = err.message
    errorEl.hidden = false
  }
}

async function handleRemove(memberId) {
  if (!confirm('Remove this member from your team?')) return
  try {
    await api('DELETE', `/team/member/${memberId}`)
    loadAndRender()
  } catch (err) {
    alert(err.message)
  }
}

// ─── Join via invite token ────────────────────────────────────────────────────

async function handleJoinToken(token) {
  teamMain.innerHTML = '<div class="team-loading">Joining team…</div>'
  try {
    const data = await api('POST', '/team/join', { token })
    teamMain.innerHTML = `
      <div class="team-empty">
        <h2>Welcome to ${escHtml(data.team?.name || 'the team')}! 🎉</h2>
        <p>You now have Power tier access shared by your team.</p>
        <a href="/" class="btn btn--primary">Start downloading →</a>
      </div>
    `
    // Clean URL
    window.history.replaceState({}, '', '/team')
  } catch (err) {
    renderError(err.message || 'Invalid or expired invite link.')
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Init ─────────────────────────────────────────────────────────────────────

renderLayout()
initTheme()

teamMain = document.getElementById('team-main')

checkSession(API_BASE).then(s => {
  session = s

  if (!s?.authenticated) {
    renderNotSignedIn()
    return
  }

  if (s.tier !== 'power') {
    // Check for join token even for non-power users (they'll get power via team)
    const params = new URLSearchParams(window.location.search)
    const joinToken = params.get('join')
    if (joinToken) {
      handleJoinToken(joinToken)
      return
    }
    renderNotPower()
    return
  }

  // Check for join token
  const params = new URLSearchParams(window.location.search)
  const joinToken = params.get('join')
  if (joinToken) {
    handleJoinToken(joinToken)
    return
  }

  loadAndRender()
})
