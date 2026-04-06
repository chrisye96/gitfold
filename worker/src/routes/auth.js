/**
 * GitFold Worker — Auth Routes (Phase 2)
 *
 * GET  /v1/auth/github           → Redirect to GitHub OAuth
 * GET  /v1/auth/github/callback  → Handle OAuth callback
 * POST /v1/auth/logout           → Clear session
 * GET  /v1/auth/me               → Current user info
 */
import { Hono } from 'hono';
import { corsHeaders, errorResponse } from '../middleware/security.js';
import { buildAuthUrl, exchangeCode, fetchGitHubUser, findOrCreateUser, storeOAuthToken, getUserTier, createOAuthState, validateOAuthState, } from '../services/auth.js';
import { signJwt, sessionCookie, clearSessionCookie, getSessionFromCookie, verifyJwt } from '../services/jwt.js';
const auth = new Hono();
const FRONTEND_ORIGIN = 'https://gitfold.cc';
// ─── GET /auth/github ───────────────────────────────────────────────────────
auth.get('/auth/github', async (c) => {
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET || !c.env.JWT_SECRET) {
        return errorResponse(500, 'CONFIG_ERROR', 'GitHub OAuth not configured.');
    }
    const state = await createOAuthState(c.env.GITFOLD_CACHE);
    const redirectUri = new URL('/v1/auth/github/callback', c.req.url).toString();
    const authUrl = buildAuthUrl(c.env, state, redirectUri);
    return c.redirect(authUrl, 302);
});
// ─── GET /auth/github/callback ──────────────────────────────────────────────
auth.get('/auth/github/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    // User denied authorization
    if (error) {
        return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=denied`, 302);
    }
    if (!code || !state) {
        return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=missing_params`, 302);
    }
    if (!c.env.JWT_SECRET) {
        return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=server_error`, 302);
    }
    // Validate CSRF state
    const stateValid = await validateOAuthState(c.env.GITFOLD_CACHE, state);
    if (!stateValid) {
        return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=invalid_state`, 302);
    }
    try {
        // 1. Exchange code for access token
        const redirectUri = new URL('/v1/auth/github/callback', c.req.url).toString();
        const accessToken = await exchangeCode(code, c.env, redirectUri);
        // 2. Fetch GitHub user profile
        const githubUser = await fetchGitHubUser(accessToken);
        // 3. Find or create user in D1
        const dbUser = await findOrCreateUser(c.env.DB, githubUser);
        // 4. Encrypt and store OAuth token
        if (c.env.TOKEN_ENCRYPTION_KEY) {
            await storeOAuthToken(c.env.DB, dbUser.id, accessToken, c.env.TOKEN_ENCRYPTION_KEY);
        }
        // 5. Determine user's tier (from D1 subscriptions, or fallback)
        const tier = await getUserTier(c.env.DB, dbUser.id);
        // 6. Sign JWT session
        const jwt = await signJwt({
            sub: dbUser.id,
            email: dbUser.email,
            githubLogin: dbUser.github_login,
            avatarUrl: dbUser.avatar_url ?? undefined,
            tier,
        }, c.env.JWT_SECRET);
        // 7. Set cookie and redirect to frontend
        const cookie = sessionCookie(jwt, 'gitfold.cc');
        return new Response(null, {
            status: 302,
            headers: {
                Location: `${FRONTEND_ORIGIN}/?auth=success`,
                'Set-Cookie': cookie,
            },
        });
    }
    catch (err) {
        console.error('[auth] OAuth callback error:', err);
        return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=server_error`, 302);
    }
});
// ─── POST /auth/logout ──────────────────────────────────────────────────────
auth.post('/auth/logout', async (c) => {
    // Optionally revoke the JWT by storing its jti in KV
    const cookieHeader = c.req.header('Cookie');
    const token = getSessionFromCookie(cookieHeader ?? null);
    if (token && c.env.JWT_SECRET) {
        const payload = await verifyJwt(token, c.env.JWT_SECRET);
        if (payload?.jti) {
            // Store in KV for the remaining TTL to block reuse
            const remainingTtl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
            if (remainingTtl > 0) {
                await c.env.GITFOLD_CACHE.put(`session:revoked:${payload.jti}`, '1', { expirationTtl: remainingTtl });
            }
        }
    }
    const cookie = clearSessionCookie('gitfold.cc');
    return Response.json({ ok: true }, {
        headers: {
            'Set-Cookie': cookie,
            ...corsHeaders(c.req.header('Origin')),
        },
    });
});
// ─── GET /auth/me ───────────────────────────────────────────────────────────
auth.get('/auth/me', async (c) => {
    const sessionUser = c.get('sessionUser');
    if (!sessionUser) {
        return Response.json({ authenticated: false }, { headers: corsHeaders(c.req.header('Origin')) });
    }
    return Response.json({
        authenticated: true,
        userId: sessionUser.userId,
        email: sessionUser.email,
        githubLogin: sessionUser.githubLogin,
        tier: sessionUser.tier,
    }, { headers: corsHeaders(c.req.header('Origin')) });
});
export default auth;
