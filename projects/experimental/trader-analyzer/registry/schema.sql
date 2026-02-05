-- Private Registry Database Schema (PostgreSQL)
-- Stores package metadata, maintainers, and benchmark results

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
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

CREATE INDEX idx_packages_name ON packages(name);
CREATE INDEX idx_packages_published_at ON packages(published_at);

-- Maintainers table
CREATE TABLE IF NOT EXISTS maintainers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('team-lead', 'contributor', 'viewer', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_maintainers_email ON maintainers(email);

-- Package maintainers junction table
CREATE TABLE IF NOT EXISTS package_maintainers (
  package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
  maintainer_id INTEGER REFERENCES maintainers(id) ON DELETE CASCADE,
  scope VARCHAR(50) CHECK (scope IN ('full-access', 'read-write', 'read-only')),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (package_id, maintainer_id)
);

CREATE INDEX idx_package_maintainers_package ON package_maintainers(package_id);
CREATE INDEX idx_package_maintainers_maintainer ON package_maintainers(maintainer_id);

-- Benchmarks table
CREATE TABLE IF NOT EXISTS benchmarks (
  id SERIAL PRIMARY KEY,
  package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
  property_name VARCHAR(100),
  values JSONB,
  best_value FLOAT,
  results JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  environment JSONB,
  metadata JSONB
);

CREATE INDEX idx_benchmarks_package ON benchmarks(package_id);
CREATE INDEX idx_benchmarks_timestamp ON benchmarks(timestamp);
CREATE INDEX idx_benchmarks_property ON benchmarks(property_name);

-- Benchmark history (TimescaleDB hypertable for time-series)
-- Note: Requires TimescaleDB extension
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('benchmarks', 'timestamp');

-- Package versions history
CREATE TABLE IF NOT EXISTS package_versions (
  id SERIAL PRIMARY KEY,
  package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
  version VARCHAR(100) NOT NULL,
  changelog TEXT,
  published_by INTEGER REFERENCES maintainers(id),
  published_at TIMESTAMP DEFAULT NOW(),
  benchmark_results JSONB,
  metadata JSONB
);

CREATE INDEX idx_package_versions_package ON package_versions(package_id);
CREATE INDEX idx_package_versions_published_at ON package_versions(published_at);

-- Registry access logs
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  maintainer_id INTEGER REFERENCES maintainers(id),
  package_id INTEGER REFERENCES packages(id),
  action VARCHAR(50) CHECK (action IN ('publish', 'read', 'update', 'delete')),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_logs_maintainer ON access_logs(maintainer_id);
CREATE INDEX idx_access_logs_package ON access_logs(package_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

-- Insert default team leads
INSERT INTO maintainers (email, name, role) VALUES
  ('alex.chen@yourcompany.com', 'Alex Chen', 'team-lead'),
  ('maria.rodriguez@yourcompany.com', 'Maria Rodriguez', 'team-lead'),
  ('david.kim@yourcompany.com', 'David Kim', 'team-lead'),
  ('sarah.park@yourcompany.com', 'Sarah Park', 'team-lead'),
  ('tom.wilson@yourcompany.com', 'Tom Wilson', 'admin'),
  ('jordan.lee@yourcompany.com', 'Jordan Lee', 'contributor'),
  ('taylor.smith@yourcompany.com', 'Taylor Smith', 'contributor')
ON CONFLICT (email) DO NOTHING;

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintainers_updated_at BEFORE UPDATE ON maintainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views

-- Package with maintainers view
CREATE OR REPLACE VIEW package_maintainers_view AS
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

-- Latest benchmarks view
CREATE OR REPLACE VIEW latest_benchmarks_view AS
SELECT DISTINCT ON (package_id, property_name)
  b.id,
  b.package_id,
  p.name as package_name,
  b.property_name,
  b.best_value,
  b.results,
  b.timestamp
FROM benchmarks b
JOIN packages p ON b.package_id = p.id
ORDER BY b.package_id, b.property_name, b.timestamp DESC;
