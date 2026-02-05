-- RBAC Database Schema
-- Users, Roles, Permissions, and Data Scopes

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role_id TEXT NOT NULL,
  feature_flags TEXT, -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  permissions_json TEXT NOT NULL, -- JSON array
  data_scopes_json TEXT NOT NULL, -- JSON array
  feature_flags TEXT -- JSON array
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  rollout INTEGER DEFAULT 0, -- 0-100
  conditions_json TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Data Source Registry
CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  package_name TEXT,
  package_version TEXT,
  properties_json TEXT, -- JSON array
  pipeline_config_json TEXT, -- JSON
  access_control_json TEXT, -- JSON
  metadata_json TEXT, -- JSON
  feature_flag TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(namespace, version)
);
