/**
 * GitFold Worker — Session Middleware (Phase 2)
 *
 * Reads the `gitfold_session` JWT cookie, verifies it,
 * and attaches the session user to the Hono context.
 *
 * Does NOT block unauthenticated requests — downstream
 * handlers decide whether auth is required.
 */
import { getSessionFromCookie, verifyJwt } from '../services/jwt.js';
/**
 * Session middleware.
 * If a valid JWT cookie is present, sets `sessionUser` on context.
 * Otherwise, proceeds without error.
 */
export async function sessionMiddleware(c, next) {
    const secret = c.env.JWT_SECRET;
    if (!secret)
        return next(); // JWT not configured — skip
    const cookieHeader = c.req.header('Cookie');
    const token = getSessionFromCookie(cookieHeader ?? null);
    if (!token)
        return next();
    const payload = await verifyJwt(token, secret);
    if (!payload)
        return next();
    // Check revocation list (optional, best-effort)
    if (payload.jti) {
        const revoked = await c.env.GITFOLD_CACHE.get(`session:revoked:${payload.jti}`);
        if (revoked)
            return next(); // Token was revoked via logout
    }
    // Attach session user to context
    c.set('sessionUser', {
        userId: payload.sub,
        email: payload.email,
        githubLogin: payload.githubLogin,
        tier: payload.tier,
    });
    return next();
}
