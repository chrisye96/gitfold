/**
 * GitSnip Worker — Stripe Service (Phase 1)
 *
 * Handles:
 *   1. Creating Stripe Checkout sessions
 *   2. Verifying Stripe webhook signatures
 *   3. Processing webhook events (subscription lifecycle)
 *
 * No Stripe SDK — uses fetch() against Stripe API (Workers-compatible).
 */

import type { Env, Tier, SubRecord } from '../types.js'
import { saveSub, deleteSub, generateSubToken } from './subscription.js'

const STRIPE_API = 'https://api.stripe.com/v1'

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CheckoutParams {
  email: string
  tier: 'pro' | 'power'
  successUrl: string
  cancelUrl: string
}

/**
 * Create a Stripe Checkout Session and return the hosted URL.
 */
export async function createCheckoutSession(
  params: CheckoutParams,
  env: Env,
): Promise<string> {
  const priceId = params.tier === 'pro'
    ? env.STRIPE_PRO_PRICE_ID
    : env.STRIPE_POWER_PRICE_ID

  if (!priceId || !env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe not configured')
  }

  const body = new URLSearchParams({
    'mode': 'subscription',
    'customer_email': params.email,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': params.successUrl,
    'cancel_url': params.cancelUrl,
    'metadata[tier]': params.tier,
  })

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[stripe] checkout error:', err)
    throw new Error('Failed to create checkout session')
  }

  const session = await res.json<{ url: string }>()
  return session.url
}

// ─── Webhook verification ────────────────────────────────────────────────────

/**
 * Verify Stripe webhook signature (HMAC-SHA256).
 * Returns parsed event on success, null on failure.
 */
export async function verifyWebhook(
  payload: string,
  signature: string | null,
  secret: string,
): Promise<StripeEvent | null> {
  if (!signature) return null

  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k, v]
    }),
  )

  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return null

  // Tolerance: reject events older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
  if (age > 300) return null

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload),
  )
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (!timingSafeEqual(sig, expectedHex)) return null

  try {
    return JSON.parse(payload) as StripeEvent
  } catch {
    return null
  }
}

// ─── Webhook event processing ────────────────────────────────────────────────

interface StripeEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

/**
 * Process a verified Stripe webhook event.
 * Updates subscription state in KV.
 */
export async function processWebhookEvent(
  event: StripeEvent,
  env: Env,
): Promise<void> {
  const obj = event.data.object

  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionId = obj['id'] as string
      const email = obj['customer_email'] as string
      const customerId = obj['customer'] as string
      const subId = obj['subscription'] as string
      const tier = (obj['metadata'] as Record<string, string>)?.['tier'] as Tier ?? 'pro'

      const token = generateSubToken()
      const record: SubRecord = {
        tier,
        email,
        stripeCustomerId: customerId,
        stripeSubId: subId,
      }
      await saveSub(env.GITSNIP_SUBS, token, record)

      const claimData = JSON.stringify({ token, email })
      // Store mappings for token claim (by session ID and subscription ID)
      await Promise.all([
        env.GITSNIP_SUBS.put(`checkout:${subId}`, claimData, { expirationTtl: 3600 }),
        env.GITSNIP_SUBS.put(`session:${sessionId}`, claimData, { expirationTtl: 3600 }),
      ])
      break
    }

    case 'customer.subscription.updated': {
      const email = await getCustomerEmail(obj['customer'] as string, env)
      if (!email) break

      const status = obj['status'] as string
      if (status === 'active' || status === 'trialing') {
        // Subscription renewed or updated — ensure KV is current
        const existing = await findSubByStripeId(obj['id'] as string, env)
        if (existing) {
          existing.record.expiresAt = undefined
          await saveSub(env.GITSNIP_SUBS, existing.token, existing.record)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subId = obj['id'] as string
      const existing = await findSubByStripeId(subId, env)
      if (existing) {
        await deleteSub(env.GITSNIP_SUBS, existing.token, existing.record.email)
      }
      break
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Look up a customer's email from Stripe API.
 */
async function getCustomerEmail(customerId: string, env: Env): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY) return null
  const res = await fetch(`${STRIPE_API}/customers/${customerId}`, {
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  })
  if (!res.ok) return null
  const customer = await res.json<{ email?: string }>()
  return customer.email ?? null
}

/**
 * Find a subscription in KV by Stripe subscription ID.
 * This is a reverse lookup — we scan the checkout mapping.
 */
async function findSubByStripeId(
  stripeSubId: string,
  env: Env,
): Promise<{ token: string; record: SubRecord } | null> {
  const mapping = await env.GITSNIP_SUBS.get<{ token: string; email: string }>(
    `checkout:${stripeSubId}`,
    'json',
  )
  if (!mapping) return null

  const record = await env.GITSNIP_SUBS.get<SubRecord>(
    `sub:token:${mapping.token}`,
    'json',
  )
  if (!record) return null

  return { token: mapping.token, record }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
