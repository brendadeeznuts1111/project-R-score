# Database Documentation

## Overview

The Bun Payment Linker uses PostgreSQL as its primary database with Redis for caching and real-time data. The database is designed for multi-tenant architecture with complete data isolation and audit capabilities.

## Database Schema

### Core Tables

#### applications
Stores loan application data and risk assessment results.

```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    stripe_account_id VARCHAR(255),
    plaid_verification_id VARCHAR(255),
    duoplus_device_id VARCHAR(255),
    blockchain_tx_hash VARCHAR(255),
    
    -- Applicant Information
    full_legal_name VARCHAR(255) NOT NULL,
    ssn_encrypted TEXT NOT NULL,
    annual_income DECIMAL(12,2) NOT NULL,
    employment_status VARCHAR(20) NOT NULL,
    requested_limit DECIMAL(12,2),
    credit_score INTEGER,
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    
    -- Risk Assessment
    risk_score INTEGER,
    fraud_probability DECIMAL(5,2),
    identity_match DECIMAL(5,2),
    decision VARCHAR(20),
    confidence DECIMAL(5,2),
    
    -- Processing Information
    processing_time_ms INTEGER,
    model_version VARCHAR(50),
    shap_explanation JSONB,
    risk_factors JSONB,
    
    -- Verification Status
    identity_verification JSONB,
    credit_report JSONB,
    kyc_documents JSONB,
    
    -- Manual Review
    reviewed_by VARCHAR(255),
    review_reason TEXT,
    reviewed_at TIMESTAMP,
    
    -- Audit Trail
    ip_address INET,
    user_agent TEXT,
    device_fingerprint JSONB,
    
    -- Status and Timestamps
    status VARCHAR(20) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

#### devices
Manages cloud device provisioning and automation.

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id_external VARCHAR(255) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    
    -- Device Information
    device_type VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    os_version VARCHAR(50),
    region VARCHAR(20) NOT NULL,
    
    -- Status and Health
    status VARCHAR(20) DEFAULT 'offline',
    current_task VARCHAR(255),
    last_heartbeat TIMESTAMP,
    last_seen TIMESTAMP,
    
    -- Capabilities
    capabilities JSONB,
    installed_apps JSONB,
    
    -- Metrics
    battery_level DECIMAL(5,2),
    signal_strength INTEGER,
    data_usage_mb DECIMAL(10,2),
    temperature_celsius DECIMAL(5,2),
    uptime_seconds INTEGER,
    
    -- Connectivity
    wifi_connected BOOLEAN DEFAULT FALSE,
    cellular_connected BOOLEAN DEFAULT FALSE,
    bluetooth_enabled BOOLEAN DEFAULT FALSE,
    ip_address INET,
    mac_address VARCHAR(17),
    
    -- Configuration
    configuration JSONB,
    automation_rules JSONB,
    
    -- Provisioning Information
    provisioned_by VARCHAR(255),
    provisioned_at TIMESTAMP,
    decommissioned_by VARCHAR(255),
    decommissioned_at TIMESTAMP,
    
    -- Usage Statistics
    total_tasks_processed INTEGER DEFAULT 0,
    successful_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    last_task_at TIMESTAMP,
    
    -- Security
    security_profile VARCHAR(100),
    security_events JSONB,
    compromised BOOLEAN DEFAULT FALSE,
    last_security_scan TIMESTAMP,
    
    -- Maintenance
    last_maintenance TIMESTAMP,
    maintenance_notes TEXT,
    next_maintenance_due TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

#### audit_logs
Immutable audit trail for compliance and regulatory requirements.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    -- Blockchain Information
    blockchain_tx_hash VARCHAR(255),
    block_number VARCHAR(50),
    merkle_root VARCHAR(255),
    block_timestamp TIMESTAMP,
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_description TEXT,
    
    -- Decision Information
    decision VARCHAR(20),
    risk_score INTEGER,
    confidence DECIMAL(5,2),
    
    -- User Information
    user_id VARCHAR(255),
    user_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    
    -- System Information
    service_name VARCHAR(100) NOT NULL,
    service_version VARCHAR(50),
    environment VARCHAR(20),
    
    -- Event Data
    event_data JSONB,
    previous_state JSONB,
    new_state JSONB,
    metadata JSONB,
    
    -- Compliance Information
    compliance_requirement VARCHAR(100),
    regulation VARCHAR(50),
    audit_required BOOLEAN DEFAULT TRUE,
    retention_until TIMESTAMP,
    
    -- Verification Information
    verification_hash VARCHAR(255),
    signature TEXT,
    signing_key_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    verification_notes TEXT,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    
    -- Timestamps
    event_timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

#### users
User authentication and authorization.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    last_login_at TIMESTAMP,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    
    -- Authorization
    role VARCHAR(50) DEFAULT 'user',
    permissions JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

#### tenants
Multi-tenant configuration and isolation.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant Information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    
    -- Configuration
    settings JSONB,
    feature_flags JSONB,
    
    -- Limits and Quotas
    max_applications_per_month INTEGER DEFAULT 10000,
    max_devices INTEGER DEFAULT 100,
    max_users INTEGER DEFAULT 50,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    
    -- Billing
    billing_email VARCHAR(255),
    billing_address JSONB,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

## Indexes

### Performance Indexes

```sql
-- Applications indexes
CREATE INDEX idx_applications_tenant_id ON applications(tenant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_decision ON applications(decision);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_risk_score ON applications(risk_score);
CREATE INDEX idx_applications_stripe_account_id ON applications(stripe_account_id);

-- Devices indexes
CREATE INDEX idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_device_type ON devices(device_type);
CREATE INDEX idx_devices_region ON devices(region);
CREATE INDEX idx_devices_last_heartbeat ON devices(last_heartbeat);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_application_id ON audit_logs(application_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_timestamp ON audit_logs(event_timestamp);
CREATE INDEX idx_audit_logs_blockchain_tx_hash ON audit_logs(blockchain_tx_hash);

-- Users indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

## Database Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npx knex migrate:make create_new_table
```

### Migration Files

Migration files are located in `src/database/migrations/` and follow the naming convention:
```
001_create_applications_table.js
002_create_devices_table.js
003_create_audit_logs_table.js
...
```

## Database Seeding

### Running Seeds

```bash
# Run all seeds
npm run seed

# Run specific seed file
npx knex seed:run --specific=001_tenants.js
```

### Seed Data

Seed files are located in `src/database/seeds/` and include:
- Default tenant configurations
- Test user accounts
- Sample device configurations
- Demo application data

## Data Encryption

### Sensitive Data Encryption

Sensitive data is encrypted at the field level using AES-256:

```javascript
// Example of encrypting SSN
const encryptedSSN = security.encrypt(rawSSN);

// Example of decrypting SSN
const decryptedSSN = security.decrypt(encryptedSSN);
```

### Encrypted Fields

- `applications.ssn_encrypted`
- `users.password_hash`
- Any PII fields in JSONB columns

## Database Connections

### Connection Pooling

```javascript
const knex = require('knex')({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10
  }
});
```

### Connection Configuration

Development:
```javascript
{
  host: 'localhost',
  port: 5432,
  database: 'bun_payment_linker_dev',
  user: 'postgres',
  password: 'password'
}
```

Production:
```javascript
{
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
  }
}
```

## Query Optimization

### Slow Query Monitoring

Enable slow query logging in PostgreSQL:

```sql
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

### Common Query Patterns

#### Paginated Results
```javascript
const result = await db('applications')
  .where('tenant_id', tenantId)
  .orderBy('created_at', 'desc')
  .limit(20)
  .offset((page - 1) * 20);
```

#### Aggregated Statistics
```javascript
const stats = await db('applications')
  .where('tenant_id', tenantId)
  .where('created_at', '>=', startDate)
  .select(
    db.raw('COUNT(*) as total'),
    db.raw('COUNT(CASE WHEN decision = "approved" THEN 1 END) as approved'),
    db.raw('COUNT(CASE WHEN decision = "declined" THEN 1 END) as declined'),
    db.raw('AVG(risk_score) as avg_risk_score')
  )
  .first();
```

## Backup and Recovery

### Automated Backups

```bash
# Daily backup
pg_dump -h localhost -U postgres bun_payment_linker > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U postgres bun_payment_linker | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Point-in-Time Recovery

Enable WAL archiving in PostgreSQL:

```sql
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backup/archive/%f';
SELECT pg_reload_conf();
```

## Monitoring and Maintenance

### Database Health Checks

```javascript
async function healthCheck() {
  const result = await db.raw('SELECT version() as version, NOW() as timestamp');
  const connections = await db.raw('SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = "active"');
  
  return {
    status: 'healthy',
    version: result.rows[0].version,
    activeConnections: connections.rows[0].active_connections
  };
}
```

### Maintenance Tasks

```sql
-- Update table statistics
ANALYZE applications;
ANALYZE devices;
ANALYZE audit_logs;

-- Rebuild indexes
REINDEX INDEX CONCURRENTLY idx_applications_tenant_id;

-- Clean up old audit logs (based on retention policy)
DELETE FROM audit_logs 
WHERE event_timestamp < NOW() - INTERVAL '7 years' 
AND retention_until < NOW();
```

## Data Privacy and Compliance

### GDPR Compliance

- Right to be forgotten: Soft delete with `deleted_at` timestamp
- Data portability: Export functionality for user data
- Data minimization: Only collect necessary data

### Data Retention

```sql
-- Set retention policies
UPDATE audit_logs 
SET retention_until = created_at + INTERVAL '7 years'
WHERE regulation = 'GDPR';

UPDATE audit_logs 
SET retention_until = created_at + INTERVAL '10 years'
WHERE regulation = 'FCRA';
```

### Access Controls

```sql
-- Row-level security for multi-tenant isolation
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON applications
  FOR ALL TO application_user
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## Performance Tuning

### Configuration Optimization

```sql
-- Memory settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';

-- Connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Query planning
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
```

### Partitioning Strategy

For large tables, consider partitioning by date:

```sql
-- Partition audit_logs by month
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_y2024m02 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Increase pool size
   - Check network connectivity
   - Verify database server load

2. **Slow Queries**
   - Use EXPLAIN ANALYZE
   - Check missing indexes
   - Optimize query structure

3. **Lock Contention**
   - Identify long-running transactions
   - Use appropriate isolation levels
   - Implement retry logic

### Debug Queries

```sql
-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
