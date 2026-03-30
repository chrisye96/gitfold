-- ============================================================
-- Migration 0002: Teams + Power Tier
-- ============================================================

-- Teams
CREATE TABLE teams (
  id          TEXT PRIMARY KEY,                        -- UUID v4
  name        TEXT NOT NULL,
  owner_id    TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);

-- Team members (invited or active)
CREATE TABLE team_members (
  id           TEXT PRIMARY KEY,                       -- UUID v4
  team_id      TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES users(id),              -- NULL until invite accepted
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',         -- 'owner' | 'member'
  status       TEXT NOT NULL DEFAULT 'invited',        -- 'invited' | 'active' | 'removed'
  invite_token TEXT UNIQUE,                            -- one-time join token
  joined_at    INTEGER,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_team_members_team_id   ON team_members(team_id);
CREATE INDEX idx_team_members_user_id   ON team_members(user_id);
CREATE INDEX idx_team_members_inv_token ON team_members(invite_token);
