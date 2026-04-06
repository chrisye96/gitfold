/**
 * GitFold Worker — JWT Session Management (Phase 2)
 *
 * Minimal JWT implementation using Web Crypto (HMAC-SHA256).
 * No external libraries — Workers-compatible.
 *
 * Session cookie: gitfold_session=<jwt>
 *   HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Domain=gitfold.cc
 */
const ALGO = { name: 'HMAC', hash: 'SHA-256' };
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
// ─── Public API ─────────────────────────────────────────────────────────────
/**
 * Sign a JWT with HMAC-SHA256.
 * @param payload Session data (iat/exp/jti auto-filled if missing)
 * @param secret  HMAC key (hex string or raw)
 */
export async function signJwt(payload, secret) {
    const now = Math.floor(Date.now() / 1000);
    const full = {
        ...payload,
        iat: payload.iat ?? now,
        exp: payload.exp ?? now + SESSION_TTL,
        jti: payload.jti ?? generateJti(),
        avatarUrl: payload.avatarUrl,
    };
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify(full));
    const signingInput = `${header}.${body}`;
    const key = await importKey(secret);
    const sig = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${arrayToBase64url(new Uint8Array(sig))}`;
}
/**
 * Verify and decode a JWT.
 * @returns Decoded payload, or null if invalid/expired.
 */
export async function verifyJwt(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    const header = parts[0];
    const body = parts[1];
    const sig = parts[2];
    const signingInput = `${header}.${body}`;
    const key = await importKey(secret);
    const sigBytes = base64urlToArray(sig);
    const valid = await crypto.subtle.verify(ALGO, key, sigBytes, new TextEncoder().encode(signingInput));
    if (!valid)
        return null;
    try {
        const payload = JSON.parse(base64urlDecode(body));
        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
/**
 * Build the Set-Cookie header value for a session JWT.
 */
export function sessionCookie(jwt, domain) {
    const parts = [
        `gitfold_session=${jwt}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${SESSION_TTL}`,
        'Path=/',
    ];
    if (domain)
        parts.push(`Domain=${domain}`);
    return parts.join('; ');
}
/**
 * Build a Set-Cookie header that clears the session.
 */
export function clearSessionCookie(domain) {
    const parts = [
        'gitfold_session=',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=0',
        'Path=/',
    ];
    if (domain)
        parts.push(`Domain=${domain}`);
    return parts.join('; ');
}
/**
 * Parse a cookie header and extract the session JWT.
 */
export function getSessionFromCookie(cookieHeader) {
    if (!cookieHeader)
        return null;
    const match = cookieHeader.match(/(?:^|;\s*)gitfold_session=([^;]+)/);
    return match?.[1] ?? null;
}
// ─── Helpers ────────────────────────────────────────────────────────────────
async function importKey(secret) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']);
}
function generateJti() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function base64url(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - str.length % 4) % 4);
    return atob(padded);
}
function arrayToBase64url(arr) {
    let binary = '';
    for (let i = 0; i < arr.length; i++) {
        binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlToArray(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - str.length % 4) % 4);
    const binary = atob(padded);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        arr[i] = binary.charCodeAt(i);
    }
    return arr;
}
