/**
 * GitFold Worker — Subscription Service (Phase 1)
 *
 * Manages subscription state in KV.
 * KV schema:
 *   sub:token:{token}   → SubRecord (for API auth)
 *   sub:email:{hash}    → SubRecord (for lookup by email)
 */
// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_LIMITS = {
    free: 50,
    pro: 1000,
    power: 5000,
};
// ─── Public API ──────────────────────────────────────────────────────────────
/**
 * Resolve the file limit for a request based on subscription token and GitHub token.
 */
export async function getFileLimit(req, env) {
    const subToken = req.headers.get('X-Sub-Token');
    if (subToken) {
        const record = await getSubByToken(env.GITFOLD_SUBS, subToken);
        if (record && isActive(record)) {
            const limit = tierLimit(record.tier, env);
            return { tier: record.tier, limit };
        }
    }
    const hasGithubToken = !!req.headers.get('X-GitHub-Token');
    if (hasGithubToken) {
        return { tier: 'free', limit: parseInt(env.TOKEN_FILE_LIMIT ?? '200', 10) };
    }
    return { tier: 'free', limit: parseInt(env.FREE_FILE_LIMIT ?? '50', 10) };
}
/**
 * Look up a subscription by email hash.
 */
export async function getSubByEmail(kv, email) {
    const hash = await hashEmail(email);
    return kv.get(`sub:email:${hash}`, 'json');
}
/**
 * Look up a subscription by sub token.
 */
export async function getSubByToken(kv, token) {
    return kv.get(`sub:token:${token}`, 'json');
}
/**
 * Save or update a subscription (writes both email and token keys).
 */
export async function saveSub(kv, token, record) {
    const hash = await hashEmail(record.email);
    const json = JSON.stringify(record);
    // Write both keys atomically-ish (KV is eventually consistent anyway)
    await Promise.all([
        kv.put(`sub:token:${token}`, json),
        kv.put(`sub:email:${hash}`, json),
    ]);
}
/**
 * Delete a subscription (removes both keys).
 */
export async function deleteSub(kv, token, email) {
    const hash = await hashEmail(email);
    await Promise.all([
        kv.delete(`sub:token:${token}`),
        kv.delete(`sub:email:${hash}`),
    ]);
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function isActive(record) {
    if (record.expiresAt && record.expiresAt < Date.now())
        return false;
    return true;
}
function tierLimit(tier, env) {
    if (tier === 'pro')
        return parseInt(env.PRO_FILE_LIMIT ?? '1000', 10);
    if (tier === 'power')
        return parseInt(env.POWER_FILE_LIMIT ?? '5000', 10);
    return parseInt(env.FREE_FILE_LIMIT ?? '50', 10);
}
/**
 * SHA-256 hash of an email address (lowercase, trimmed).
 */
async function hashEmail(email) {
    const data = new TextEncoder().encode(email.toLowerCase().trim());
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Generate a random subscription token.
 */
export function generateSubToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return 'sub_' + Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
