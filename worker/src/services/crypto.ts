/**
 * GitFold Worker — Token Encryption (Phase 2)
 *
 * AES-256-GCM encryption for GitHub OAuth tokens stored in D1.
 * Uses Web Crypto API (Workers-compatible, no Node.js deps).
 *
 * Storage format: base64(iv + ciphertext + tag)
 * IV is 12 bytes, randomly generated per encryption.
 */

const ALGO = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

/**
 * Derive a CryptoKey from the raw hex secret.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  // Accept hex string (64 chars = 32 bytes)
  const rawBytes = hexToBytes(secret)
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt a plaintext string (e.g., GitHub OAuth token).
 * @returns Base64-encoded string: iv (12 bytes) + ciphertext + GCM tag
 */
export async function encryptToken(token: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const plaintext = new TextEncoder().encode(token)

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    plaintext,
  )

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return bytesToBase64(combined)
}

/**
 * Decrypt a previously encrypted token.
 * @param encrypted Base64-encoded string from encryptToken()
 * @returns The original plaintext token
 */
export async function decryptToken(encrypted: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const combined = base64ToBytes(encrypted)

  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext,
  )

  return new TextDecoder().decode(plaintext)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
