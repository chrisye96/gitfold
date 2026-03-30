/**
 * GitSnip Worker — Billing Routes (Phase 1)
 *
 * POST /v1/checkout         → Create Stripe Checkout Session
 * POST /v1/webhook/stripe   → Handle Stripe Webhook
 * GET  /v1/sub/status       → Query subscription status by email or token
 */

import { Hono } from 'hono'
import type { Env } from '../types.js'
import { corsHeaders, errorResponse } from '../middleware/security.js'
import { createCheckoutSession, verifyWebhook, processWebhookEvent } from '../services/stripe.js'
import { getSubByEmail, getSubByToken } from '../services/subscription.js'

const billing = new Hono<{ Bindings: Env }>()

// ─── POST /checkout ──────────────────────────────────────────────────────────

billing.post('/checkout', async (c) => {
  let email: string | undefined
  let rawTier: string | undefined
  try {
    const body = await c.req.json<{ email?: string; tier?: string }>()
    email = body.email?.trim().toLowerCase()
    rawTier = body.tier
  } catch {
    return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body.')
  }

  if (!email) {
    return errorResponse(400, 'INVALID_REQUEST', 'Email is required.')
  }

  const tier: 'pro' | 'power' = rawTier === 'power' ? 'power' : 'pro'

  try {
    const origin = new URL(c.req.url).origin
    const url = await createCheckoutSession(
      {
        email,
        tier,
        successUrl: `https://gitsnip.cc/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `https://gitsnip.cc/pricing?checkout=cancelled`,
      },
      c.env,
    )
    return Response.json({ url }, { headers: corsHeaders() })
  } catch (err) {
    console.error('[billing] checkout error:', err)
    return errorResponse(500, 'CHECKOUT_ERROR', 'Failed to create checkout session.')
  }
})

// ─── POST /webhook/stripe ────────────────────────────────────────────────────

billing.post('/webhook/stripe', async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return errorResponse(500, 'CONFIG_ERROR', 'Webhook secret not configured.')
  }

  const payload = await c.req.text()
  const signature = c.req.header('Stripe-Signature')

  const event = await verifyWebhook(payload, signature ?? null, secret)
  if (!event) {
    return errorResponse(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed.')
  }

  try {
    await processWebhookEvent(event, c.env)
    return Response.json({ received: true })
  } catch (err) {
    console.error('[billing] webhook processing error:', err)
    return errorResponse(500, 'WEBHOOK_ERROR', 'Failed to process webhook event.')
  }
})

// ─── GET /sub/claim ──────────────────────────────────────────────────────

billing.get('/sub/claim', async (c) => {
  const sessionId = c.req.query('session_id')
  if (!sessionId) {
    return errorResponse(400, 'INVALID_REQUEST', 'Missing session_id parameter.')
  }

  const mapping = await c.env.GITSNIP_SUBS.get<{ token: string; email: string }>(
    `session:${sessionId}`,
    'json',
  )

  if (!mapping) {
    return Response.json(
      { ok: false, message: 'Session not found or expired. It may take a moment — please refresh.' },
      { headers: corsHeaders() },
    )
  }

  return Response.json(
    { ok: true, token: mapping.token, email: mapping.email },
    { headers: corsHeaders() },
  )
})

// ─── GET /sub/status ─────────────────────────────────────────────────────────

billing.get('/sub/status', async (c) => {
  const email = c.req.query('email')
  const token = c.req.query('token')

  if (!email && !token) {
    return errorResponse(400, 'INVALID_REQUEST', 'Provide email or token query parameter.')
  }

  const record = token
    ? await getSubByToken(c.env.GITSNIP_SUBS, token)
    : await getSubByEmail(c.env.GITSNIP_SUBS, email!)

  if (!record) {
    return Response.json(
      { tier: 'free', active: false },
      { headers: corsHeaders() },
    )
  }

  const active = !record.expiresAt || record.expiresAt > Date.now()

  return Response.json(
    {
      tier: active ? record.tier : 'free',
      active,
      email: record.email,
    },
    { headers: corsHeaders() },
  )
})

export default billing
