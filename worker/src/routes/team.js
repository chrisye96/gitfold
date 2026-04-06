/**
 * GitFold Worker — Team Routes (Phase 3)
 *
 * All routes require an active session (Power tier owner or team member).
 *
 * POST /v1/team/create              → Create a new team (owner = current user)
 * POST /v1/team/invite              → Invite a member by email → invite link
 * GET  /v1/team/members             → List team members
 * DELETE /v1/team/member/:memberId  → Remove a member (owner only)
 * POST /v1/team/join                → Accept an invite (by token)
 * GET  /v1/team/info                → Current user's team info
 */
import { Hono } from 'hono';
import { corsHeaders, errorResponse } from '../middleware/security.js';
const team = new Hono();
// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireSession(sessionUser) {
    if (!sessionUser) {
        return errorResponse(401, 'UNAUTHORIZED', 'You must be signed in to manage teams.');
    }
    return null;
}
function requirePower(sessionUser) {
    const authErr = requireSession(sessionUser);
    if (authErr)
        return authErr;
    if (sessionUser.tier !== 'power') {
        return errorResponse(403, 'FORBIDDEN', 'Team features require a Power subscription.');
    }
    return null;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getUserTeam(db, userId) {
    // Check if owner
    const owned = await db
        .prepare('SELECT * FROM teams WHERE owner_id = ? LIMIT 1')
        .bind(userId)
        .first();
    if (owned)
        return { ...owned, role: 'owner' };
    // Check if member
    const membership = await db
        .prepare(`
      SELECT t.*, tm.role FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ? AND tm.status = 'active'
      LIMIT 1
    `)
        .bind(userId)
        .first();
    return membership ?? null;
}
// ─── POST /team/create ───────────────────────────────────────────────────────
team.post('/team/create', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requirePower(sessionUser);
    if (err)
        return err;
    let name;
    try {
        const body = await c.req.json();
        name = body.name?.trim();
    }
    catch {
        return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body.');
    }
    if (!name || name.length < 2 || name.length > 64) {
        return errorResponse(400, 'INVALID_REQUEST', 'Team name must be 2–64 characters.');
    }
    // Check if user already owns or is in a team
    const existing = await getUserTeam(c.env.DB, sessionUser.userId);
    if (existing) {
        return errorResponse(409, 'ALREADY_IN_TEAM', 'You are already in a team.');
    }
    const teamId = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.prepare('INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)').bind(teamId, name, sessionUser.userId, now).run();
    return Response.json({ ok: true, team: { id: teamId, name, ownerId: sessionUser.userId, createdAt: now } }, { headers: corsHeaders(c.req.header('Origin')) });
});
// ─── POST /team/invite ───────────────────────────────────────────────────────
team.post('/team/invite', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requirePower(sessionUser);
    if (err)
        return err;
    let email;
    try {
        const body = await c.req.json();
        email = body.email?.trim().toLowerCase();
    }
    catch {
        return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body.');
    }
    if (!email || !email.includes('@')) {
        return errorResponse(400, 'INVALID_REQUEST', 'Valid email is required.');
    }
    // Must be a team owner
    const userTeam = await c.env.DB
        .prepare('SELECT id FROM teams WHERE owner_id = ? LIMIT 1')
        .bind(sessionUser.userId)
        .first();
    if (!userTeam) {
        return errorResponse(404, 'NO_TEAM', 'Create a team first.');
    }
    // Check for existing invite for this email
    const existing = await c.env.DB
        .prepare("SELECT id, status FROM team_members WHERE team_id = ? AND email = ? LIMIT 1")
        .bind(userTeam.id, email)
        .first();
    if (existing?.status === 'active') {
        return errorResponse(409, 'ALREADY_MEMBER', 'This person is already a member.');
    }
    const inviteToken = crypto.randomUUID();
    const now = Date.now();
    if (existing) {
        // Re-invite (update token)
        await c.env.DB
            .prepare("UPDATE team_members SET invite_token = ?, status = 'invited', created_at = ? WHERE id = ?")
            .bind(inviteToken, now, existing.id)
            .run();
    }
    else {
        await c.env.DB
            .prepare('INSERT INTO team_members (id, team_id, email, role, status, invite_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(crypto.randomUUID(), userTeam.id, email, 'member', 'invited', inviteToken, now)
            .run();
    }
    // Return invite URL (frontend shows it to the owner to share)
    const inviteUrl = `https://gitfold.cc/team?join=${inviteToken}`;
    return Response.json({ ok: true, inviteUrl, inviteToken, email }, { headers: corsHeaders(c.req.header('Origin')) });
});
// ─── GET /team/members ───────────────────────────────────────────────────────
team.get('/team/members', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requireSession(sessionUser);
    if (err)
        return err;
    const userTeam = await getUserTeam(c.env.DB, sessionUser.userId);
    if (!userTeam) {
        return Response.json({ members: [], team: null }, { headers: corsHeaders(c.req.header('Origin')) });
    }
    const members = await c.env.DB
        .prepare(`
      SELECT tm.id, tm.email, tm.role, tm.status, tm.joined_at, tm.created_at,
             u.github_login, u.avatar_url
      FROM team_members tm
      LEFT JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ? AND tm.status != 'removed'
      ORDER BY tm.created_at ASC
    `)
        .bind(userTeam.id)
        .all();
    return Response.json({
        team: { id: userTeam.id, name: userTeam.name, ownerId: userTeam.owner_id },
        members: members.results,
    }, { headers: corsHeaders(c.req.header('Origin')) });
});
// ─── DELETE /team/member/:memberId ───────────────────────────────────────────
team.delete('/team/member/:memberId', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requireSession(sessionUser);
    if (err)
        return err;
    const memberId = c.req.param('memberId');
    // Must be owner of the team containing this member
    const ownerTeam = await c.env.DB
        .prepare('SELECT id FROM teams WHERE owner_id = ? LIMIT 1')
        .bind(sessionUser.userId)
        .first();
    if (!ownerTeam) {
        return errorResponse(403, 'FORBIDDEN', 'Only the team owner can remove members.');
    }
    const member = await c.env.DB
        .prepare('SELECT id FROM team_members WHERE id = ? AND team_id = ?')
        .bind(memberId, ownerTeam.id)
        .first();
    if (!member) {
        return errorResponse(404, 'NOT_FOUND', 'Member not found in your team.');
    }
    await c.env.DB
        .prepare("UPDATE team_members SET status = 'removed' WHERE id = ?")
        .bind(memberId)
        .run();
    return Response.json({ ok: true }, { headers: corsHeaders(c.req.header('Origin')) });
});
// ─── POST /team/join ─────────────────────────────────────────────────────────
team.post('/team/join', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requireSession(sessionUser);
    if (err)
        return err;
    let inviteToken;
    try {
        const body = await c.req.json();
        inviteToken = body.token?.trim();
    }
    catch {
        return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body.');
    }
    if (!inviteToken) {
        return errorResponse(400, 'INVALID_REQUEST', 'Invite token is required.');
    }
    const invite = await c.env.DB
        .prepare("SELECT * FROM team_members WHERE invite_token = ? AND status = 'invited' LIMIT 1")
        .bind(inviteToken)
        .first();
    if (!invite) {
        return errorResponse(404, 'INVALID_TOKEN', 'Invite token not found or already used.');
    }
    const now = Date.now();
    await c.env.DB
        .prepare("UPDATE team_members SET user_id = ?, status = 'active', joined_at = ?, invite_token = NULL WHERE id = ?")
        .bind(sessionUser.userId, now, invite.id)
        .run();
    const teamInfo = await c.env.DB
        .prepare('SELECT id, name, owner_id FROM teams WHERE id = ? LIMIT 1')
        .bind(invite.team_id)
        .first();
    return Response.json({ ok: true, team: teamInfo }, { headers: corsHeaders(c.req.header('Origin')) });
});
// ─── GET /team/info ──────────────────────────────────────────────────────────
team.get('/team/info', async (c) => {
    const sessionUser = c.get('sessionUser');
    const err = requireSession(sessionUser);
    if (err)
        return err;
    const userTeam = await getUserTeam(c.env.DB, sessionUser.userId);
    return Response.json({ team: userTeam ?? null }, { headers: corsHeaders(c.req.header('Origin')) });
});
export default team;
