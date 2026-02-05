# Private Registry Database Schema

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

The private registry uses PostgreSQL for package metadata, maintainer access control, and benchmark history. TimescaleDB extension is recommended for time-series benchmark data.

---

## Schema

See [`registry/schema.sql`](../../registry/schema.sql) for complete schema definition.

### Key Tables

- **packages**: Package metadata and versions
- **maintainers**: Team leads and contributors
- **package_maintainers**: Package ownership and access control
- **benchmarks**: Benchmark results and property optimization
- **package_versions**: Version history with changelog
- **access_logs**: Audit trail for registry access

---

## Access Control

### Roles

- **team-lead**: Full access to own packages, can publish
- **contributor**: Read-write access, cannot publish
- **viewer**: Read-only access
- **admin**: Full system access (Tom Wilson)

### Scope Levels

- **full-access**: Publish, update, delete
- **read-write**: Update, read (no publish)
- **read-only**: Read only

---

## Queries

### Get packages by maintainer

```sql
SELECT p.name, p.version, p.published_at
FROM packages p
JOIN package_maintainers pm ON p.id = pm.package_id
JOIN maintainers m ON pm.maintainer_id = m.id
WHERE m.email = 'alex.chen@yourcompany.com'
ORDER BY p.published_at DESC;
```

### Get latest benchmarks

```sql
SELECT * FROM latest_benchmarks_view
WHERE package_name = '@graph/layer4';
```

### Get package maintainers

```sql
SELECT * FROM package_maintainers_view
WHERE name = '@graph/layer4';
```

---

## Migration

```bash
# Apply schema
psql -U postgres -d registry -f registry/schema.sql

# With TimescaleDB
psql -U postgres -d registry -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
psql -U postgres -d registry -c "SELECT create_hypertable('benchmarks', 'timestamp');"
```

---

## Related Documentation

- [`registry/schema.sql`](../../registry/schema.sql) - Complete schema
- [`docs/architecture/TEAM-STRUCTURE.md`](./TEAM-STRUCTURE.md) - Team structure
