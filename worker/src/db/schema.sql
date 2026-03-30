-- ============================================================
-- GitSnip D1 Database Schema — Phase 2
-- ============================================================

-- Users (created on OAuth login)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- UUID v4
  email       TEXT UNIQUE NOT NULL,
  github_id   INTEGER UNIQUE,             -- GitHub user ID
  github_login TEXT,                      -- GitHub username
  avatar_url  TEXT,
  created_at  INTEGER NOT NULL,           -- Unix timestamp (ms)
  updated_at  INTEGER NOT NULL
);

-- GitHub Token (OAuth access_token, encrypted at rest)
CREATE TABLE github_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,          -- AES-GCM encrypted
  scope           TEXT,                   -- e.g. 'public_repo'
  token_type      TEXT DEFAULT 'oauth',   -- 'oauth' | 'pat'
  created_at      INTEGER NOT NULL,
  last_used_at    INTEGER,
  UNIQUE(user_id, token_type)
);

-- Subscriptions (Stripe-managed, replaces KV for new users)
CREATE TABLE subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_sub_id         TEXT UNIQUE,
  tier                  TEXT NOT NULL DEFAULT 'free',     -- 'free' | 'pro' | 'power'
  status                TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start  INTEGER,
  current_period_end    INTEGER,
  cancel_at_period_end  INTEGER DEFAULT 0,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_sub_id);
