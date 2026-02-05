# 🔗 Fire22 Dashboard - Database Connection Guide v4.0.0-staging

## Overview

This guide covers database connection management, troubleshooting, and
optimization for the Fire22 Dashboard Worker system.

## Connection Architecture

### Multi-Tier Database System

```
┌─────────────────────────────────────────────────────────┐
│                DATABASE CONNECTION TIER                │
├─────────────────────────────────────────────────────────┤
│  Tier 1: D1 Database    │  Tier 2: R2 Storage         │
│  ┌─────────────────┐    │  ┌─────────────────────────┐  │
│  │ Active Data     │    │  │ Archive Storage         │  │
│  │ 90-day retention│────┼──│ 7-year retention        │  │
│  │ <50ms response  │    │  │ Cold storage            │  │
│  └─────────────────┘    │  └─────────────────────────┘  │
│           │              │              │               │
│  Tier 3: KV Cache       │  Connection Pool Manager     │
│  ┌─────────────────┐    │  ┌─────────────────────────┐  │
│  │ Hot Data        │    │  │ Connection Pooling      │  │
│  │ <10ms response  │────┼──│ Load Balancing         │  │
│  │ 85%+ hit rate   │    │  │ Health Monitoring       │  │
│  └─────────────────┘    │  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Connection Pool Configuration

### Default Settings

```typescript
const connectionConfig = {
  // D1 Database Configuration
  d1: {
    database: 'fire22-dashboard',
    maxConnections: 20,
    connectionTimeout: 30000, // 30 seconds
    idleTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // KV Cache Configuration
  kv: {
    namespace: 'FIRE22_DATA_CACHE',
    defaultTTL: 3600, // 1 hour
    maxKeySize: 512, // 512 bytes
    maxValueSize: 25165824, // 24MB
  },

  // R2 Storage Configuration
  r2: {
    bucket: 'fire22-packages',
    maxFileSize: 104857600, // 100MB
    compressionEnabled: true,
    retentionPolicy: '7years',
  },
};
```

### Advanced Pool Settings

```typescript
// Production-optimized settings
const productionConfig = {
  connectionPool: {
    min: 5, // Minimum connections
    max: 20, // Maximum connections
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 300000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },

  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retryLimit: 3,
  },
};
```

## Connection Troubleshooting

### Error Code E2001: Connection Pool Exhausted

**Symptoms:**

- `[ERROR] [DATABASE] [v1.0.0] [E2001][CRITICAL]Connection pool exhausted - troubleshoot`
- Application freezing or hanging
- 503 Service Unavailable responses

**Immediate Actions:**

1. **Check Pool Status**

```bash
# Monitor connection pool health
bun run scripts/integrated-health-system.ts

# Check database connections
curl -X GET http://localhost:3001/health
```

2. **Analyze Connection Usage**

```typescript
// Connection pool diagnostics
const poolStatus = {
  active: pool.activeCount(),
  idle: pool.idleCount(),
  total: pool.totalCount(),
  waiting: pool.waitingCount(),
};

console.log('Pool Status:', poolStatus);
```

3. **Emergency Pool Reset**

```typescript
// Emergency connection pool reset
async function resetConnectionPool() {
  await pool.drain();
  await pool.clear();
  logger.warning(
    'DATABASE',
    '1.0.0',
    'Connection pool reset completed',
    'E2001'
  );
}
```

### Common Connection Issues

#### Issue 1: Connection Leaks

**Symptoms:** Pool exhausts over time **Solution:**

```typescript
// Proper connection handling
async function queryWithProperCleanup() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM table');
    return result;
  } finally {
    client.release(); // Always release connection
  }
}
```

#### Issue 2: Long-Running Queries

**Symptoms:** Connections held for extended periods **Solution:**

```typescript
// Query timeout configuration
const queryConfig = {
  query: 'SELECT * FROM large_table',
  timeout: 30000, // 30 second timeout
  onTimeout: () => {
    logger.error('DATABASE', '1.0.0', 'Query timeout exceeded', 'E2002');
  },
};
```

#### Issue 3: Network Connectivity

**Symptoms:** Intermittent connection failures **Solution:**

```bash
# Network diagnostics
bun test scripts/dns-performance.test.ts
ping api.cloudflare.com
nslookup workers.dev
```

## Performance Optimization

### Connection Pool Tuning

```typescript
// Optimal pool configuration based on workload
function calculateOptimalPoolSize(
  avgQueryTime: number,
  requestsPerSecond: number
) {
  // Formula: Pool Size = (Average Query Time * Requests Per Second) + Buffer
  const baseSize = Math.ceil((avgQueryTime * requestsPerSecond) / 1000);
  const bufferSize = Math.ceil(baseSize * 0.2); // 20% buffer

  return {
    min: Math.max(2, Math.ceil(baseSize * 0.1)),
    max: baseSize + bufferSize,
    recommended: baseSize,
  };
}
```

### Query Optimization

```sql
-- Optimized queries with proper indexing
CREATE INDEX CONCURRENTLY idx_web_logs_timestamp_type
ON web_logs(timestamp, log_type)
WHERE timestamp > NOW() - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY idx_web_logs_customer_risk
ON web_logs(customer_id, risk_score)
WHERE risk_score >= 50;
```

### Caching Strategy

```typescript
// Multi-layer caching implementation
class DatabaseCache {
  private l1Cache = new Map(); // Memory cache
  private l2Cache: KVNamespace; // KV cache

  async get(key: string): Promise<any> {
    // L1 Cache (Memory) - Fastest
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2 Cache (KV) - Fast
    const cached = await this.l2Cache.get(key);
    if (cached) {
      this.l1Cache.set(key, cached); // Promote to L1
      return cached;
    }

    // L3 (Database) - Fallback
    const result = await this.queryDatabase(key);

    // Cache the result in both layers
    this.l1Cache.set(key, result);
    await this.l2Cache.put(key, result, { expirationTtl: 3600 });

    return result;
  }
}
```

## Monitoring and Alerts

### Health Check Endpoints

```typescript
// Comprehensive database health check
export async function getDatabaseHealth() {
  const health = {
    d1: await checkD1Health(),
    kv: await checkKVHealth(),
    r2: await checkR2Health(),
    connectionPool: getPoolStats(),
  };

  return {
    status: health.d1.status === 'healthy' ? 'healthy' : 'degraded',
    responseTime: Math.max(health.d1.responseTime, health.kv.responseTime),
    details: health,
  };
}

async function checkD1Health() {
  const start = Date.now();
  try {
    await db.prepare('SELECT 1').first();
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      lastCheck: new Date(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - start,
      lastCheck: new Date(),
    };
  }
}
```

### Automated Alerts

```typescript
// Database monitoring with automated alerts
class DatabaseMonitor {
  private alertThresholds = {
    connectionPoolUsage: 0.8, // 80% pool usage
    responseTime: 1000, // 1 second
    errorRate: 0.05, // 5% error rate
  };

  async checkAndAlert() {
    const stats = await this.gatherStats();

    if (stats.poolUsage > this.alertThresholds.connectionPoolUsage) {
      await this.sendAlert('HIGH_POOL_USAGE', {
        current: stats.poolUsage,
        threshold: this.alertThresholds.connectionPoolUsage,
      });
    }

    if (stats.avgResponseTime > this.alertThresholds.responseTime) {
      await this.sendAlert('SLOW_RESPONSE', {
        current: stats.avgResponseTime,
        threshold: this.alertThresholds.responseTime,
      });
    }
  }
}
```

## Security Considerations

### Connection Security

```typescript
// Secure connection configuration
const secureConnectionConfig = {
  ssl: {
    enabled: true,
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT,
    cert: process.env.DB_CLIENT_CERT,
    key: process.env.DB_CLIENT_KEY,
  },

  authentication: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  security: {
    maxStatements: 100, // Prevent SQL injection
    preparedStatements: true, // Use prepared statements
    queryLogging: true, // Log all queries
    connectionLogging: true, // Log connections/disconnections
  },
};
```

### Access Control

```typescript
// Role-based database access
class DatabaseAccessControl {
  private roles = {
    admin: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP'],
    user: ['SELECT', 'INSERT', 'UPDATE'],
    readonly: ['SELECT'],
  };

  async executeQuery(query: string, userRole: string) {
    const allowedOperations = this.roles[userRole] || [];
    const operation = this.extractOperation(query);

    if (!allowedOperations.includes(operation)) {
      throw new Error(
        `Operation ${operation} not allowed for role ${userRole}`
      );
    }

    return await this.db.prepare(query).run();
  }
}
```

## Backup and Recovery

### Automated Backups

```typescript
// Automated backup system
class DatabaseBackup {
  async performDailyBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      tables: await this.backupAllTables(),
      metadata: await this.getMetadata(),
    };

    // Store in R2 with 7-year retention
    await this.r2.put(
      `backups/${backup.timestamp}.json`,
      JSON.stringify(backup),
      {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          retentionPolicy: '7years',
          backupType: 'daily',
        },
      }
    );
  }
}
```

## Migration Scripts

### Schema Updates

```sql
-- Safe schema migration template
BEGIN TRANSACTION;

-- 1. Create new columns/tables
ALTER TABLE web_logs ADD COLUMN new_field TEXT;

-- 2. Populate new columns
UPDATE web_logs SET new_field = 'default_value' WHERE new_field IS NULL;

-- 3. Create indexes
CREATE INDEX CONCURRENTLY idx_web_logs_new_field ON web_logs(new_field);

-- 4. Update application code deployment checkpoint

-- 5. Remove old columns (in next migration)
-- ALTER TABLE web_logs DROP COLUMN old_field;

COMMIT;
```

### Data Migration

```typescript
// Safe data migration utility
class DataMigration {
  async migrateInBatches(query: string, batchSize: number = 1000) {
    let offset = 0;
    let processedRows = 0;

    while (true) {
      const batch = await this.db
        .prepare(
          `
        ${query} LIMIT ${batchSize} OFFSET ${offset}
      `
        )
        .all();

      if (batch.length === 0) break;

      await this.processBatch(batch);

      processedRows += batch.length;
      offset += batchSize;

      // Progress logging
      logger.info('MIGRATION', '1.0.0', `Migrated ${processedRows} rows`);

      // Rate limiting to prevent overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

## Related Documentation

- [Database Optimization Guide](./optimization.md)
- [Connection Pool Configuration](./pool-config.md)
- [Security Best Practices](../security/database-security.md)
- [Performance Monitoring](../monitoring/database-monitoring.md)
- [Error Code Reference](../../scripts/error-code-index.ts)

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Related Error Codes**: E2001, E2002
