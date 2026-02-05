-- Registry Dashboard Database Schema
-- SQLite schema for private npm registry with team ownership

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  published_by TEXT NOT NULL,
  package_json TEXT NOT NULL,
  tarball BLOB NOT NULL,
  UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS package_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  benchmark_data TEXT,
  metadata TEXT,
  FOREIGN KEY(package_name, version) REFERENCES packages(name, version)
);

CREATE TABLE IF NOT EXISTS package_teams (
  package_name TEXT PRIMARY KEY,
  team TEXT NOT NULL,
  team_lead TEXT NOT NULL,
  maintainer TEXT NOT NULL,
  telegram_handle TEXT,
  supergroup TEXT,
  topic TEXT
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  published_by TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_timestamp ON packages(timestamp);
CREATE INDEX IF NOT EXISTS idx_metadata_package ON package_metadata(package_name, version);
CREATE INDEX IF NOT EXISTS idx_publications_package ON publications(package_name);
CREATE INDEX IF NOT EXISTS idx_publications_timestamp ON publications(timestamp);

CREATE TABLE IF NOT EXISTS rfcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by TEXT,
  reviewed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_rfcs_package ON rfcs(package_name);
CREATE INDEX IF NOT EXISTS idx_rfcs_status ON rfcs(status);
CREATE INDEX IF NOT EXISTS idx_rfcs_submitted_at ON rfcs(submitted_at);
