-- Fire22 Security Registry Database Schema

-- Packages table - stores package metadata
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  main TEXT,
  types TEXT,
  dependencies TEXT, -- JSON string
  dev_dependencies TEXT, -- JSON string
  keywords TEXT, -- JSON array as string
  author TEXT,
  license TEXT,
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  
  -- Security information
  security_scanned_at TEXT NOT NULL,
  security_score INTEGER DEFAULT 100,
  vulnerabilities INTEGER DEFAULT 0,
  risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  
  -- Package integrity
  sha256_hash TEXT NOT NULL,
  sha512_hash TEXT NOT NULL,
  tarball_size INTEGER,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  UNIQUE(name, version)
);

-- Package vulnerabilities - detailed vulnerability information
CREATE TABLE IF NOT EXISTS package_vulnerabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL,
  vulnerability_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  cve TEXT,
  cwe TEXT,
  cvss REAL,
  affected_versions TEXT, -- JSON array
  patched_versions TEXT, -- JSON array
  reference_links TEXT, -- JSON array
  discovered_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE
);

-- Registry users and authentication
CREATE TABLE IF NOT EXISTS registry_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'publisher', 'reader')) DEFAULT 'reader',
  api_token TEXT UNIQUE,
  token_expires_at TEXT,
  
  -- User permissions
  allowed_scopes TEXT, -- JSON array of allowed scopes like ["@fire22", "@ff"]
  max_packages INTEGER DEFAULT 10,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Package downloads tracking
CREATE TABLE IF NOT EXISTS package_downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL,
  downloaded_by TEXT, -- IP address or user ID
  user_agent TEXT,
  downloaded_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE
);

-- Security scan results
CREATE TABLE IF NOT EXISTS security_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL,
  scan_type TEXT CHECK(scan_type IN ('pre-publish', 'periodic', 'manual')) NOT NULL,
  scanner_version TEXT NOT NULL,
  
  -- Scan results
  overall_score INTEGER DEFAULT 0,
  vulnerabilities_found INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  scan_duration_ms INTEGER,
  
  -- Detailed results
  dependencies_scanned INTEGER DEFAULT 0,
  code_analysis_passed BOOLEAN DEFAULT 0,
  malware_detected BOOLEAN DEFAULT 0,
  
  scan_started_at TEXT NOT NULL,
  scan_completed_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE
);

-- Registry configuration and settings
CREATE TABLE IF NOT EXISTS registry_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit log for registry operations
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL, -- 'publish', 'download', 'delete', 'scan', etc.
  resource_type TEXT NOT NULL, -- 'package', 'user', 'config'
  resource_id TEXT, -- package name, user id, etc.
  details TEXT, -- JSON with additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES registry_users (id) ON DELETE SET NULL
);

-- Insert default configuration
INSERT OR IGNORE INTO registry_config (key, value, description) VALUES
  ('min_security_score', '50', 'Minimum security score required for package publication'),
  ('scanning_enabled', 'true', 'Enable security scanning for all packages'),
  ('allowed_scopes', '["@fire22", "@ff", "@brendadeeznuts"]', 'Allowed package scopes'),
  ('max_package_size_mb', '100', 'Maximum package size in MB'),
  ('registry_name', 'Fire22 Security Registry', 'Display name for the registry'),
  ('registry_version', '1.0.0', 'Current registry version');

-- Insert default admin user (password should be changed in production)
INSERT OR IGNORE INTO registry_users (username, email, password_hash, role, allowed_scopes) VALUES
  ('admin', 'admin@fire22.dev', '$2b$12$example-hash-change-in-production', 'admin', '["@fire22", "@ff", "@brendadeeznuts"]');

-- Create views for easier querying
CREATE VIEW IF NOT EXISTS package_summary AS
SELECT 
  p.id,
  p.name,
  p.version,
  p.description,
  p.author,
  p.license,
  p.published_at,
  p.downloads,
  p.security_score,
  p.vulnerabilities,
  p.risk_level,
  COUNT(pv.id) as vulnerability_count
FROM packages p
LEFT JOIN package_vulnerabilities pv ON p.id = pv.package_id
GROUP BY p.id, p.name, p.version;

-- Create view for security dashboard
CREATE VIEW IF NOT EXISTS security_dashboard AS
SELECT 
  COUNT(*) as total_packages,
  COUNT(CASE WHEN security_score >= 90 THEN 1 END) as excellent_packages,
  COUNT(CASE WHEN security_score >= 70 AND security_score < 90 THEN 1 END) as good_packages,
  COUNT(CASE WHEN security_score >= 50 AND security_score < 70 THEN 1 END) as moderate_packages,
  COUNT(CASE WHEN security_score < 50 THEN 1 END) as poor_packages,
  AVG(security_score) as avg_security_score,
  SUM(downloads) as total_downloads,
  COUNT(CASE WHEN vulnerabilities > 0 THEN 1 END) as vulnerable_packages
FROM packages;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_published ON packages(published_at);
CREATE INDEX IF NOT EXISTS idx_packages_security_score ON packages(security_score);
CREATE INDEX IF NOT EXISTS idx_packages_downloads ON packages(downloads);
CREATE INDEX IF NOT EXISTS idx_packages_risk_level ON packages(risk_level);

-- Additional indexes for foreign key tables
CREATE INDEX IF NOT EXISTS idx_vulnerability_package ON package_vulnerabilities(package_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_severity ON package_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_users_username ON registry_users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON registry_users(email);
CREATE INDEX IF NOT EXISTS idx_users_token ON registry_users(api_token);
CREATE INDEX IF NOT EXISTS idx_downloads_package ON package_downloads(package_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON package_downloads(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_scans_package ON security_scans(package_id);
CREATE INDEX IF NOT EXISTS idx_scans_date ON security_scans(scan_completed_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

-- Triggers for maintaining updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_packages_timestamp 
  AFTER UPDATE ON packages
  FOR EACH ROW
BEGIN
  UPDATE packages SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
  AFTER UPDATE ON registry_users
  FOR EACH ROW
BEGIN
  UPDATE registry_users SET updated_at = datetime('now') WHERE id = NEW.id;
END;