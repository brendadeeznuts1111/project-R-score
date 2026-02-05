-- Fantasy42-Fire22 Registry Database Schema
-- Enterprise-grade schema with comprehensive indexing and constraints

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Registry packages
CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    author TEXT,
    license TEXT DEFAULT 'MIT',
    repository TEXT,
    homepage TEXT,
    keywords TEXT,
    maintainers TEXT,
    dist_tags TEXT,
    readme TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_private BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    star_count INTEGER DEFAULT 0
);

-- Package versions
CREATE TABLE IF NOT EXISTS package_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    tarball_url TEXT,
    integrity TEXT,
    shasum TEXT,
    engines TEXT,
    peer_dependencies TEXT,
    dependencies TEXT,
    dev_dependencies TEXT,
    scripts TEXT,
    files TEXT,
    main TEXT,
    module TEXT,
    types TEXT,
    exports TEXT,
    cpu TEXT,
    os TEXT,
    deprecated BOOLEAN DEFAULT FALSE,
    deprecation_message TEXT,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    UNIQUE(package_id, version)
);

-- ============================================================================
-- SECURITY TABLES
-- ============================================================================

-- Security scan results
CREATE TABLE IF NOT EXISTS security_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_name TEXT NOT NULL,
    package_version TEXT NOT NULL,
    scan_type TEXT NOT NULL,
    status TEXT NOT NULL,
    vulnerabilities_found INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    scan_result TEXT,
    scan_metadata TEXT,
    scanned_by TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Security events and incidents
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    source_ip TEXT,
    user_agent TEXT,
    package_name TEXT,
    package_version TEXT,
    details TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolution_notes TEXT
);

-- ============================================================================
-- AUDIT & COMPLIANCE TABLES
-- ============================================================================

-- Audit log for all registry operations
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    user_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    user_agent_details TEXT,
    old_values TEXT,
    new_values TEXT,
    compliance_impact TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compliance check results
CREATE TABLE IF NOT EXISTS compliance_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_name TEXT NOT NULL,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    compliance_level TEXT NOT NULL,
    findings TEXT,
    recommendations TEXT,
    remediation_steps TEXT,
    checked_by TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_check_date DATETIME
);

-- Regulatory reports
CREATE TABLE IF NOT EXISTS regulatory_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    report_period TEXT NOT NULL,
    compliance_status TEXT NOT NULL,
    violations_count INTEGER DEFAULT 0,
    corrective_actions TEXT,
    generated_by TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    approved_by TEXT,
    approved_at DATETIME
);

-- ============================================================================
-- MONITORING TABLES
-- ============================================================================

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    unit TEXT,
    tags TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System health checks
CREATE TABLE IF NOT EXISTS system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    geo_location TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flag_name TEXT NOT NULL UNIQUE,
    flag_value BOOLEAN DEFAULT FALSE,
    description TEXT,
    enabled_environments TEXT DEFAULT 'development',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configuration settings
CREATE TABLE IF NOT EXISTS config_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Package indexes
CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_author ON packages(author);
CREATE INDEX IF NOT EXISTS idx_packages_license ON packages(license);
CREATE INDEX IF NOT EXISTS idx_packages_created ON packages(created_at);
CREATE INDEX IF NOT EXISTS idx_packages_updated ON packages(updated_at);

-- Version indexes
CREATE INDEX IF NOT EXISTS idx_versions_package_id ON package_versions(package_id);
CREATE INDEX IF NOT EXISTS idx_versions_version ON package_versions(version);
CREATE INDEX IF NOT EXISTS idx_versions_published ON package_versions(published_at);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_security_scans_package ON security_scans(package_name, package_version);
CREATE INDEX IF NOT EXISTS idx_security_scans_status ON security_scans(status);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);

-- Monitoring indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_time ON performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Update timestamp trigger for packages
CREATE TRIGGER IF NOT EXISTS update_package_timestamp
    AFTER UPDATE ON packages
BEGIN
    UPDATE packages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Audit trigger for packages
CREATE TRIGGER IF NOT EXISTS audit_package_changes
    AFTER INSERT ON packages
BEGIN
    INSERT INTO audit_log (action, entity_type, entity_id, new_values)
    VALUES ('CREATE', 'package', NEW.id, json_object('name', NEW.name, 'description', NEW.description));
END;

-- Audit trigger for package versions
CREATE TRIGGER IF NOT EXISTS audit_version_changes
    AFTER INSERT ON package_versions
BEGIN
    INSERT INTO audit_log (action, entity_type, entity_id, new_values)
    VALUES ('PUBLISH', 'version', NEW.id, json_object('version', NEW.version, 'package_id', NEW.package_id));
END;
