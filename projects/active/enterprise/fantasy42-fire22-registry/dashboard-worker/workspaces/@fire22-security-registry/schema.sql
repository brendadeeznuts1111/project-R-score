-- Fire22 Registry Database Schema
-- D1 SQLite schema for package registry

CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON data for the package
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_version ON packages(version);
CREATE INDEX IF NOT EXISTS idx_packages_created ON packages(created_at);

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_name TEXT NOT NULL,
    package_version TEXT NOT NULL,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_downloads_package ON downloads(package_name, package_version);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(downloaded_at);

CREATE TABLE IF NOT EXISTS security_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_name TEXT NOT NULL,
    package_version TEXT NOT NULL,
    scan_result TEXT NOT NULL, -- JSON scan results
    vulnerability_count INTEGER DEFAULT 0,
    security_score INTEGER DEFAULT 100,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_package ON security_scans(package_name, package_version);
CREATE INDEX IF NOT EXISTS idx_security_score ON security_scans(security_score);