# Database Migrations

This directory contains SQL migration files for the Dev Dashboard database schema.

## Migration Files

- `005_create_p2p_gateway_history.sql` - Creates P2P gateway history table, indexes, views, and configuration table
- `006_create_profile_history.sql` - Creates profile engine history table, indexes, views, and configuration table

## Running Migrations

Migrations are automatically applied when the dashboard starts. The `enhanced-dashboard.ts` file includes the schema definitions and will create tables if they don't exist.

### Manual Migration

If you need to run migrations manually:

```bash
# Using sqlite3 CLI
sqlite3 data/dashboard.db < migrations/005_create_p2p_gateway_history.sql
sqlite3 data/dashboard.db < migrations/006_create_profile_history.sql

# Or using Bun
bun -e "import { Database } from 'bun:sqlite'; const db = new Database('data/dashboard.db'); db.exec(await Bun.file('migrations/005_create_p2p_gateway_history.sql').text());"
```

## Migration Order

Migrations should be run in order:
1. `005_create_p2p_gateway_history.sql` - P2P gateway tables
2. `006_create_profile_history.sql` - Profile engine tables

## Schema Notes

- SQLite doesn't support `JSONB` type, so JSON is stored as `TEXT`
- SQLite doesn't support `TIMESTAMP` type, so timestamps are stored as `INTEGER` (Unix timestamp)
- SQLite doesn't support `BOOLEAN` type, so booleans are stored as `INTEGER` (0 or 1)
- SQLite doesn't support `TEXT[]` type, so arrays are stored as JSON in `TEXT` fields
- Foreign key constraints are defined but SQLite requires `PRAGMA foreign_keys = ON` to enforce them

## Views

The migrations create the following views:

- `p2p_gateway_metrics` - Aggregated metrics by gateway and operation
- `profile_engine_metrics` - Aggregated metrics by operation

These views can be queried directly:

```sql
-- Get P2P metrics
SELECT * FROM p2p_gateway_metrics WHERE gateway = 'venmo';

-- Get profile metrics
SELECT * FROM profile_engine_metrics WHERE operation = 'xgboost_personalize';
```

## Configuration Tables

The migrations also create configuration tables:

- `p2p_gateway_configs` - Per-gateway configuration settings
- `profile_engine_configs` - Profile engine configuration settings

These tables store runtime configuration that can be updated without code changes.
