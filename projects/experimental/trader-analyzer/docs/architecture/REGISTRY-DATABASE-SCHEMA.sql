-- Private Registry Database Schema (PostgreSQL)
-- Stores package metadata, maintainer ACLs, and benchmark history

-- Packages table
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100) NOT NULL,
  package_json TEXT NOT NULL,
  tarball BYTEA,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Maintainers table
CREATE TABLE maintainers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('team-lead', 'contributor', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Package-Maintainer relationship table
CREATE TABLE package_maintainers (
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  maintainer_id INTEGER NOT NULL REFERENCES maintainers(id) ON DELETE CASCADE,
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('full-access', 'read-write', 'read-only')),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (package_id, maintainer_id)
);

-- Benchmarks table
CREATE TABLE benchmarks (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  property_name VARCHAR(100) NOT NULL,
  values JSONB NOT NULL,
  best_value FLOAT NOT NULL,
  results JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Package versions history (TimescaleDB hypertable)
CREATE TABLE package_versions (
  time TIMESTAMPTZ NOT NULL,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  version VARCHAR(100) NOT NULL,
  published_by INTEGER REFERENCES maintainers(id),
  benchmark_results JSONB,
  metadata JSONB
);

-- Create TimescaleDB hypertable for time-series data
SELECT create_hypertable('package_versions', 'time');

-- Indexes for performance
CREATE INDEX idx_packages_name ON packages(name);
CREATE INDEX idx_packages_version ON packages(version);
CREATE INDEX idx_packages_published_at ON packages(published_at DESC);
CREATE INDEX idx_maintainers_email ON maintainers(email);
CREATE INDEX idx_package_maintainers_package ON package_maintainers(package_id);
CREATE INDEX idx_package_maintainers_maintainer ON package_maintainers(maintainer_id);
CREATE INDEX idx_benchmarks_package ON benchmarks(package_id);
CREATE INDEX idx_benchmarks_timestamp ON benchmarks(timestamp DESC);
CREATE INDEX idx_package_versions_package ON package_versions(package_id);
CREATE INDEX idx_package_versions_time ON package_versions(time DESC);

-- Insert team leads
INSERT INTO maintainers (email, name, role) VALUES 
('alex.chen@yourcompany.com', 'Alex Chen', 'team-lead'),
('sarah.kumar@yourcompany.com', 'Sarah Kumar', 'team-lead'),
('mike.rodriguez@yourcompany.com', 'Mike Rodriguez', 'team-lead')
ON CONFLICT (email) DO NOTHING;

-- Insert maintainers
INSERT INTO maintainers (email, name, role) VALUES 
('jordan.lee@yourcompany.com', 'Jordan Lee', 'contributor'),
('priya.patel@yourcompany.com', 'Priya Patel', 'contributor'),
('tom.wilson@yourcompany.com', 'Tom Wilson', 'contributor'),
('lisa.zhang@yourcompany.com', 'Lisa Zhang', 'contributor'),
('david.kim@yourcompany.com', 'David Kim', 'contributor'),
('emma.brown@yourcompany.com', 'Emma Brown', 'contributor'),
('ryan.gupta@yourcompany.com', 'Ryan Gupta', 'contributor')
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintainers_updated_at BEFORE UPDATE ON maintainers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Package with maintainers
CREATE VIEW package_maintainers_view AS
SELECT 
    p.id,
    p.name,
    p.version,
    p.published_at,
    json_agg(
        json_build_object(
            'name', m.name,
            'email', m.email,
            'role', m.role,
            'scope', pm.scope
        )
    ) as maintainers
FROM packages p
LEFT JOIN package_maintainers pm ON p.id = pm.package_id
LEFT JOIN maintainers m ON pm.maintainer_id = m.id
GROUP BY p.id, p.name, p.version, p.published_at;

-- View: Latest benchmarks per package
CREATE VIEW latest_benchmarks_view AS
SELECT DISTINCT ON (package_id, property_name)
    package_id,
    property_name,
    best_value,
    results,
    timestamp
FROM benchmarks
ORDER BY package_id, property_name, timestamp DESC;
