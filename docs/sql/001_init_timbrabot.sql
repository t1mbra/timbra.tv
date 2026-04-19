-- Timbrabot Postgres persistence (PERSISTENCE_DRIVER=postgres)
-- Run once against your database (psql, Railway, Neon SQL editor, etc.).

CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_guild_state (
  guild_id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_guild_state_updated_at ON bot_guild_state (updated_at);
