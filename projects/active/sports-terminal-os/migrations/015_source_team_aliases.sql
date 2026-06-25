-- Migration 015: Source Team Aliases
-- Zone 10: Odds Drift
-- Tables: source_team_aliases
--
-- Stores cross-source verified team name aliases. Each row maps a raw
-- source team name to its canonical team name, with provenance tracking.
--
-- Used by:
--   - team-alias-loader.ts (hydrates aliasMap at startup)
--   - OddsDriftEngine.resolveTopics() (fuzzy resolution fallback)

-- UP

CREATE TABLE IF NOT EXISTS source_team_aliases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_team  TEXT    NOT NULL,
  alias           TEXT    NOT NULL,
  source          TEXT    NOT NULL,
  verified        INTEGER DEFAULT 0,
  score           REAL    DEFAULT 1.0,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at      INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(source, alias)
);

CREATE INDEX IF NOT EXISTS idx_team_aliases_canonical ON source_team_aliases(canonical_team);
CREATE INDEX IF NOT EXISTS idx_team_aliases_source ON source_team_aliases(source);
CREATE INDEX IF NOT EXISTS idx_team_aliases_alias ON source_team_aliases(alias);

-- Seed known aliases (common football/soccer variants)
INSERT OR IGNORE INTO source_team_aliases (canonical_team, alias, source, verified, score) VALUES
  ('Manchester City',     'Man City',          '*', 1, 1.0),
  ('Manchester City',     'Manchester City',   '*', 1, 1.0),
  ('Manchester United',   'Man Utd',           '*', 1, 1.0),
  ('Manchester United',   'Manchester United', '*', 1, 1.0),
  ('Manchester United',   'Man United',        '*', 1, 1.0),
  ('Tottenham Hotspur',   'Tottenham',         '*', 1, 1.0),
  ('Tottenham Hotspur',   'Spurs',             '*', 1, 1.0),
  ('Arsenal',             'Arsenal',           '*', 1, 1.0),
  ('Chelsea',             'Chelsea',           '*', 1, 1.0),
  ('Liverpool',           'Liverpool',         '*', 1, 1.0),
  ('Newcastle United',    'Newcastle',         '*', 1, 1.0),
  ('Newcastle United',    'Newcastle Utd',     '*', 1, 1.0),
  ('Aston Villa',         'Aston Villa',       '*', 1, 1.0),
  ('West Ham United',     'West Ham',          '*', 1, 1.0),
  ('Brighton & Hove Albion', 'Brighton',       '*', 1, 1.0);

-- DOWN

DROP INDEX IF EXISTS idx_team_aliases_alias;
DROP INDEX IF EXISTS idx_team_aliases_source;
DROP INDEX IF EXISTS idx_team_aliases_canonical;
DROP TABLE IF EXISTS source_team_aliases;
