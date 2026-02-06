# 🔥 Water Dashboard Standards & Versioning Guide

**Comprehensive Standards Documentation for Fire22 Water Dashboard System**  
**Version: 2.0.0** | **Last Updated: 2025-08-27**

## 📋 Table of Contents

- [Overview](#overview)
- [Versioning Standards](#versioning-standards)
- [Global Data Types](#global-data-types)
- [Storage Tier Standards](#storage-tier-standards)
- [Testing Standards](#testing-standards)
- [Bun Configuration Standards](#bun-configuration-standards)
- [Cache Manager Standards](#cache-manager-standards)
- [R2 Storage Standards](#r2-storage-standards)
- [Durable Objects Standards](#durable-objects-standards)
- [Worker Configuration](#worker-configuration)
- [Error Handling Standards](#error-handling-standards)
- [Performance Standards](#performance-standards)
- [Security Standards](#security-standards)
- [Implementation Examples](#implementation-examples)

---

## Overview

The Water Dashboard Standards provide a comprehensive framework for maintaining
consistency, quality, and performance across the entire Fire22 Water Dashboard
ecosystem. These standards ensure all components follow unified patterns for
versioning, data types, testing, and configuration.

### Key Principles

1. **Consistency**: All components follow the same standards
2. **Type Safety**: Full TypeScript coverage with strict types
3. **Performance**: Defined targets for all operations
4. **Security**: Built-in security standards at every level
5. **Scalability**: Standards designed for growth
6. **Documentation**: Self-documenting code patterns

### Standards Hierarchy

```text
Water Dashboard Standards
├── Versioning (SemVer 2.0.0)
├── Data Types (TypeScript strict)
├── Storage Standards (D1/R2/KV/DO)
├── Testing Standards (80%+ coverage)
├── Configuration Standards (Bun-native)
└── Error Handling (Standardized codes)
```

---

## Versioning Standards

### Semantic Versioning (SemVer)

All components follow **Semantic Versioning 2.0.0**:

```text
MAJOR.MINOR.PATCH-PRERELEASE+BUILD
```

#### Version Components

| Component  | Description                        | Example        |
| ---------- | ---------------------------------- | -------------- |
| MAJOR      | Breaking changes                   | 2.x.x → 3.0.0  |
| MINOR      | New features (backward compatible) | 2.1.x → 2.2.0  |
| PATCH      | Bug fixes (backward compatible)    | 2.1.3 → 2.1.4  |
| PRERELEASE | Pre-release versions               | 2.1.4-beta.1   |
| BUILD      | Build metadata                     | 2.1.4+20250827 |

### Component Versioning

```typescript
import {
  ComponentVersion,
  VersionStandard,
} from '@/types/water-dashboard-standards';

const dashboardVersion = new ComponentVersion(
  'water-dashboard',
  {
    major: 2,
    minor: 0,
    patch: 0,
    prerelease: 'beta.1',
    build: '20250827',
  },
  new Date('2025-08-27'),
  [
    'Added comprehensive standards system',
    'Implemented global type definitions',
    'Enhanced storage tier architecture',
  ]
);

console.log(dashboardVersion.toString()); // "2.0.0-beta.1+20250827"
```

### Version Matrix

| Component       | Current Version | Next Release | Status |
| --------------- | --------------- | ------------ | ------ |
| Water Dashboard | 2.0.0           | 2.1.0        | Stable |
| WebLogManager   | 1.3.2           | 1.4.0        | Stable |
| Fire22 L-Keys   | 3.0.9           | 3.1.0        | Stable |
| Database Schema | 1.0.0           | 1.1.0        | Stable |
| API Interface   | 2.0.0           | 2.1.0        | Beta   |

---

## Global Data Types

### Fire22 L-Key System

```typescript
import type {
  Fire22LKey,
  Fire22LKeyMapping,
} from '@/types/water-dashboard-standards';

// Type-safe L-key usage
const customerId: Fire22LKey = 'L-603';
const amount: Fire22LKey = 'L-69';

// L-key mapping with full type safety
const lkeyMapping: Fire22LKeyMapping = {
  lkey: 'L-603',
  databaseField: 'customer_id',
  tableName: 'web_logs',
  description: 'Customer identifier',
  fieldType: 'TEXT',
  isIndexed: true,
  multilingual: false,
  validationRules: [
    {
      type: 'required',
      message: 'Customer ID is required',
    },
    {
      type: 'pattern',
      value: /^[A-Z]{2,3}\d{4,6}$/,
      message: 'Invalid customer ID format',
    },
  ],
  version: '3.0.9',
};
```

### Standard Data Structures

```typescript
import type {
  WebLogEntry,
  Fire22Customer,
  AnalyticsSummary,
} from '@/types/water-dashboard-standards';

// Create type-safe web log entry
const logEntry: WebLogEntry = {
  id: crypto.randomUUID(),
  timestamp: new Date(),
  logType: LogType.TRANSACTION,
  customerId: 'BB2212',
  amount: 500.0,
  balance: 1500.0,
  fire22LanguageKeys: ['L-603', 'L-69', 'L-187'],
  languageCode: 'pt',
  schemaVersion: '1.0.0',
};

// Type-safe customer object
const customer: Fire22Customer = {
  id: 'BB2212',
  customerName: 'João Silva',
  customerType: CustomerType.PLAYER,
  loginId: 'joao.silva',
  balance: 1500.0,
  currency: 'BRL',
  languageCode: 'pt',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  fire22LanguageKeys: ['L-603', 'L-526', 'L-152', 'L-187'],
};
```

---

## Storage Tier Standards

### D1 Database Standards

```typescript
import type { D1DatabaseStandard } from '@/types/water-dashboard-standards';

const d1Standard: D1DatabaseStandard = {
  binding: 'DB',
  name: 'fire22-dashboard',
  id: '2420fa98-6168-41de-a41a-7a2bb0a405b1',
  retentionDays: 90,
  maxRowsPerQuery: 10000,
  queryTimeout: 30000,
  connectionPool: {
    min: 5,
    max: 20,
    idle: 10,
  },
  performanceTargets: {
    queryResponseTime: 50, // ms
    writeLatency: 10, // ms
    readLatency: 5, // ms
  },
};
```

### R2 Bucket Standards

```typescript
import type { R2BucketStandard } from '@/types/water-dashboard-standards';

const r2Standard: R2BucketStandard = {
  binding: 'REGISTRY_STORAGE',
  bucketName: 'fire22-packages',
  retentionYears: 7,
  compressionEnabled: true,
  compressionRatio: 0.4, // 60% compression
  archiveStructure: {
    format: 'date-partitioned',
    fileFormat: 'json',
    naming: 'logs-{timestamp}.json',
  },
  performanceTargets: {
    uploadLatency: 100, // ms
    downloadLatency: 50, // ms
    throughputMBps: 100, // MB/s
  },
};
```

### KV Namespace Standards

```typescript
import type { KVNamespaceStandard } from '@/types/water-dashboard-standards';

const kvStandard: KVNamespaceStandard = {
  binding: 'FIRE22_DATA_CACHE',
  id: 'da65a2af54b445948671a6ac4e8f9cfc',
  ttlSeconds: 3600,
  maxItemsPerKey: 50,
  cacheStrategy: 'lru',
  performanceTargets: {
    hitRate: 0.85, // 85% target
    missLatency: 10, // ms
    hitLatency: 1, // ms
  },
};
```

---

## Testing Standards

### Test Suite Configuration

```typescript
import type { TestSuiteConfiguration } from '@/types/water-dashboard-standards';

const testConfig: TestSuiteConfiguration = {
  name: 'Water Dashboard Integration Tests',
  type: 'integration',
  coverage: {
    enabled: true,
    threshold: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
  timeout: 30000,
  retries: 2,
  parallel: true,
  environment: {
    preset: 'bun',
    setup: './test/setup.ts',
    teardown: './test/teardown.ts',
    globals: {
      FIRE22_API_BASE: 'https://test-api.fire22.ag',
    },
  },
  reporting: {
    format: 'html',
    outputDir: './coverage',
    verbose: true,
  },
};
```

### Test Case Structure

```typescript
import { test, expect } from 'bun:test';
import type { TestCase } from '@/types/water-dashboard-standards';

test('Fire22 L-key mapping validation', async () => {
  const testCase: TestCase = {
    id: 'test-lkey-001',
    suite: 'lkey-validation',
    name: 'Validate L-603 mapping',
    type: 'unit',
    input: 'L-603',
    expectedOutput: 'customer_id',
    assertions: [
      {
        type: 'equality',
        actual: getLKeyField('L-603'),
        expected: 'customer_id',
        message: 'L-603 should map to customer_id',
      },
    ],
    duration: 0,
    status: 'pending',
    metadata: {
      tags: ['lkey', 'mapping', 'critical'],
      priority: 'high',
      author: 'system',
    },
  };

  expect(testCase.expectedOutput).toBe('customer_id');
});
```

---

## Bun Configuration Standards

### bunfig.toml Configuration

```toml
# Bun Configuration following Water Dashboard Standards

[install]
lockfile.save = true
lockfile.frozen = true
registry = "https://registry.npmjs.org"
cache = ".bun/cache"

[test]
root = "./test"
preload = ["./test/setup.ts"]
coverage = true
coverageThreshold = 80
timeout = 30000

[dev]
port = 3001
hostname = "localhost"
publicPath = "/"
hmr = true

# Performance optimization
[env]
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = "30"
BUN_CONFIG_VERBOSE_FETCH = "false"
```

### TypeScript Bun Configuration

```typescript
import type { BunConfiguration } from '@/types/water-dashboard-standards';

const bunConfig: BunConfiguration = {
  runtime: {
    jsx: 'react',
    jsxImportSource: 'react',
    smol: false,
    logLevel: 'info',
  },
  install: {
    lockfile: {
      save: true,
      frozen: true,
    },
    registry: 'https://registry.npmjs.org',
    cache: '.bun/cache',
  },
  test: {
    root: './test',
    preload: ['./test/setup.ts'],
    coverage: true,
    coverageThreshold: 80,
    timeout: 30000,
  },
  performance: {
    dns: {
      ttl: 30,
      prefetch: ['fire22.ag', 'api.fire22.ag', 'cloud.fire22.ag'],
      cache: true,
    },
    memory: {
      maxHeap: 512,
      maxOldSpace: 256,
    },
    concurrency: {
      workers: 4,
      maxThreads: 8,
    },
  },
};
```

---

## Cache Manager Standards

### Cache Configuration

```typescript
import type {
  CacheConfiguration,
  CacheEntry,
} from '@/types/water-dashboard-standards';

class StandardCacheManager {
  private config: CacheConfiguration = {
    maxEntries: 10000,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    defaultTTL: 3600,
    evictionPolicy: 'lru',
    compressionThreshold: 1024, // Compress entries > 1KB
    warmupEnabled: true,
    persistEnabled: true,
    namespace: 'water-dashboard',
  };

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: ttl || this.config.defaultTTL,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (ttl || this.config.defaultTTL) * 1000),
      hits: 0,
      lastAccessed: new Date(),
      size: JSON.stringify(value).length,
      compressed:
        JSON.stringify(value).length > this.config.compressionThreshold,
      version: '1.0.0',
    };

    // Implementation...
  }

  async getStats(): Promise<CacheStatistics> {
    return {
      totalEntries: 5432,
      totalSize: 45 * 1024 * 1024, // 45MB
      hitRate: 0.87,
      missRate: 0.13,
      evictionCount: 234,
      avgEntrySize: 8500,
      avgTTL: 2800,
      oldestEntry: new Date('2025-08-27T00:00:00Z'),
      newestEntry: new Date(),
    };
  }
}
```

### Cache Key Patterns

```typescript
// Standard cache key patterns
const CACHE_KEYS = {
  // Customer data
  customer: (id: string) => `customer:${id}`,
  customerProfile: (id: string) => `customer:profile:${id}`,

  // Transaction data
  transaction: (id: string) => `transaction:${id}`,
  transactionList: (customerId: string) => `transactions:${customerId}`,

  // Analytics
  analytics: (period: string) => `analytics:${period}`,
  summary: (type: string, hours: number) => `summary:${type}:${hours}h`,

  // Fire22 specific
  fire22Auth: (token: string) => `fire22:auth:${token}`,
  fire22Customer: (id: string) => `fire22:customer:${id}`,

  // Query results
  queryResult: (hash: string) => `query:${hash}`,

  // System
  health: () => 'system:health',
  metrics: () => 'system:metrics',
} as const;
```

---

## R2 Storage Standards

### Archive Structure

```typescript
// R2 Archive file structure
interface R2ArchiveStructure {
  bucket: 'fire22-packages';
  structure: {
    logs: {
      path: '/logs/archived/{environment}/{date}/';
      naming: 'logs-{timestamp}.json';
      compression: true;
      encryption: true;
    };
    backups: {
      path: '/backups/{environment}/{date}/';
      naming: 'backup-{component}-{timestamp}.sql';
      retention: '7 years';
    };
    exports: {
      path: '/exports/{type}/{date}/';
      naming: 'export-{type}-{timestamp}.csv';
      compression: true;
    };
  };
  metadata: {
    version: string;
    created: Date;
    environment: string;
    checksum: string;
  };
}
```

### R2 Operations

```typescript
class R2StorageManager {
  async archive(data: WebLogEntry[]): Promise<string> {
    const timestamp = Date.now();
    const environment = process.env.ENVIRONMENT || 'production';
    const date = new Date().toISOString().split('T')[0];

    const archiveData = {
      version: '2.0.0',
      environment,
      timestamp,
      count: data.length,
      data: data.map(entry => ({
        ...entry,
        archived: true,
        archiveDate: new Date(),
      })),
    };

    const key = `logs/archived/${environment}/${date}/logs-${timestamp}.json`;
    const compressed = await this.compress(archiveData);

    await this.r2.put(key, compressed, {
      metadata: {
        version: '2.0.0',
        environment,
        originalSize: JSON.stringify(archiveData).length,
        compressedSize: compressed.length,
        checksum: await this.generateChecksum(compressed),
      },
    });

    return key;
  }
}
```

---

## Durable Objects Standards

### Durable Object Configuration

```typescript
import type { DurableObjectStandard } from '@/types/water-dashboard-standards';

const durableObjectConfig: DurableObjectStandard = {
  className: 'WaterDashboardState',
  namespace: 'WATER_DASHBOARD_DO',
  scriptName: 'water-dashboard-worker',
  persistenceModel: 'transactional',
  storage: {
    maxKeySize: 2048, // 2KB
    maxValueSize: 131072, // 128KB
    maxKeys: 10000,
  },
  alarm: {
    maxConcurrent: 10,
    retryPolicy: 'exponential',
  },
  performanceTargets: {
    initTime: 50, // ms
    requestLatency: 10, // ms
    storageLatency: 5, // ms
  },
};
```

### Durable Object Implementation

```typescript
export class WaterDashboardState implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/session':
        return this.handleSession(request);
      case '/state':
        return this.getState();
      case '/reset':
        return this.resetState();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async alarm(): Promise<void> {
    // Periodic cleanup
    const storage = await this.state.storage.list();
    const now = Date.now();

    for (const [key, value] of storage) {
      if (value.expiresAt && value.expiresAt < now) {
        await this.state.storage.delete(key);
      }
    }
  }
}
```

---

## Worker Configuration

### wrangler.toml Standards

```toml
# Water Dashboard Worker Configuration
name = "water-dashboard-worker"
main = "src/index.ts"
compatibility_date = "2024-08-27"
compatibility_flags = ["nodejs_compat"]

# Environment-specific configuration
[env.production]
name = "water-dashboard-production"
route = "dashboard.fire22.ag/*"

[[env.production.d1_databases]]
binding = "DB"
database_name = "fire22-dashboard"
database_id = "2420fa98-6168-41de-a41a-7a2bb0a405b1"

[[env.production.r2_buckets]]
binding = "REGISTRY_STORAGE"
bucket_name = "fire22-packages"

[[env.production.kv_namespaces]]
binding = "FIRE22_DATA_CACHE"
id = "da65a2af54b445948671a6ac4e8f9cfc"

[[env.production.durable_objects.bindings]]
name = "WATER_DASHBOARD_DO"
class_name = "WaterDashboardState"
script_name = "water-dashboard-worker"

[env.production.vars]
FIRE22_API_BASE_URL = "https://fire22.ag/cloud/api"
FIRE22_SECURITY_LEVEL = "HIGH"
DB_RETENTION_DAYS = "90"
R2_RETENTION_YEARS = "7"
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = "30"
```

### Worker Implementation

```typescript
import type { WorkerConfiguration } from '@/types/water-dashboard-standards';

const workerConfig: WorkerConfiguration = {
  name: 'water-dashboard-worker',
  environment: 'production',
  routes: ['dashboard.fire22.ag/*'],

  bindings: {
    databases: [
      {
        binding: 'DB',
        name: 'fire22-dashboard',
        id: '2420fa98-6168-41de-a41a-7a2bb0a405b1',
        retentionDays: 90,
        maxRowsPerQuery: 10000,
        queryTimeout: 30000,
        connectionPool: { min: 5, max: 20, idle: 10 },
        performanceTargets: {
          queryResponseTime: 50,
          writeLatency: 10,
          readLatency: 5,
        },
      },
    ],
    r2Buckets: [
      {
        binding: 'REGISTRY_STORAGE',
        bucketName: 'fire22-packages',
        retentionYears: 7,
        compressionEnabled: true,
        compressionRatio: 0.4,
        archiveStructure: {
          format: 'date-partitioned',
          fileFormat: 'json',
          naming: 'logs-{timestamp}.json',
        },
        performanceTargets: {
          uploadLatency: 100,
          downloadLatency: 50,
          throughputMBps: 100,
        },
      },
    ],
    kvNamespaces: [
      {
        binding: 'FIRE22_DATA_CACHE',
        id: 'da65a2af54b445948671a6ac4e8f9cfc',
        ttlSeconds: 3600,
        maxItemsPerKey: 50,
        cacheStrategy: 'lru',
        performanceTargets: {
          hitRate: 0.85,
          missLatency: 10,
          hitLatency: 1,
        },
      },
    ],
    durableObjects: [
      {
        className: 'WaterDashboardState',
        namespace: 'WATER_DASHBOARD_DO',
        scriptName: 'water-dashboard-worker',
        persistenceModel: 'transactional',
        storage: {
          maxKeySize: 2048,
          maxValueSize: 131072,
          maxKeys: 10000,
        },
        performanceTargets: {
          initTime: 50,
          requestLatency: 10,
          storageLatency: 5,
        },
      },
    ],
    secrets: ['FIRE22_TOKEN', 'JWT_SECRET', 'ADMIN_PASSWORD'],
    vars: {
      FIRE22_API_BASE_URL: 'https://fire22.ag/cloud/api',
      FIRE22_SECURITY_LEVEL: 'HIGH',
    },
  },

  limits: {
    cpuMs: 50,
    memoryMB: 128,
    subrequests: 50,
    duration: 30,
  },

  compatibility: {
    date: '2024-08-27',
    flags: ['nodejs_compat'],
  },

  triggers: {
    crons: [
      {
        schedule: '0 2 * * *',
        handler: 'archiveLogs',
      },
      {
        schedule: '*/5 * * * *',
        handler: 'syncFire22Data',
      },
    ],
  },
};
```

---

## Error Handling Standards

### Standard Error Implementation

```typescript
import { Fire22Error, ErrorCode } from '@/types/water-dashboard-standards';

// Throwing standardized errors
function validateAmount(amount: number): void {
  if (amount < 0) {
    throw new Fire22Error(
      ErrorCode.INVALID_AMOUNT,
      'Amount cannot be negative',
      400,
      { amount, min: 0 },
      'L-69' // Amount L-key
    );
  }

  if (amount > 1000000) {
    throw new Fire22Error(
      ErrorCode.LIMIT_EXCEEDED,
      'Amount exceeds maximum limit',
      400,
      { amount, max: 1000000 },
      'L-69'
    );
  }
}

// Error handling middleware
export async function errorHandler(
  error: unknown,
  request: Request
): Promise<Response> {
  if (error instanceof Fire22Error) {
    return Response.json(error.toJSON(), {
      status: error.statusCode,
    });
  }

  // Log unknown errors
  console.error('Unhandled error:', error);

  return Response.json(
    {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
```

---

## Performance Standards

### Performance Targets

| Operation      | Target | Acceptable | Critical |
| -------------- | ------ | ---------- | -------- |
| API Response   | <50ms  | <100ms     | >200ms   |
| Database Query | <10ms  | <50ms      | >100ms   |
| Cache Hit      | <1ms   | <5ms       | >10ms    |
| Cache Miss     | <10ms  | <20ms      | >50ms    |
| R2 Upload      | <100ms | <200ms     | >500ms   |
| R2 Download    | <50ms  | <100ms     | >200ms   |
| DO Request     | <10ms  | <20ms      | >50ms    |
| DNS Resolution | <1ms   | <5ms       | >10ms    |

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Bun.nanoseconds();

    try {
      const result = await fn();
      const duration = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms

      this.recordMetric(operation, duration);

      // Check against standards
      this.checkPerformance(operation, duration);

      return result;
    } catch (error) {
      const duration = (Bun.nanoseconds() - start) / 1_000_000;
      this.recordMetric(`${operation}:error`, duration);
      throw error;
    }
  }

  private checkPerformance(operation: string, duration: number): void {
    const standards = {
      'api.response': { target: 50, acceptable: 100, critical: 200 },
      'db.query': { target: 10, acceptable: 50, critical: 100 },
      'cache.hit': { target: 1, acceptable: 5, critical: 10 },
      'cache.miss': { target: 10, acceptable: 20, critical: 50 },
    };

    const standard = standards[operation];
    if (!standard) return;

    if (duration > standard.critical) {
      console.error(
        `⚠️ CRITICAL: ${operation} took ${duration}ms (target: ${standard.target}ms)`
      );
    } else if (duration > standard.acceptable) {
      console.warn(
        `⚠️ WARNING: ${operation} took ${duration}ms (target: ${standard.target}ms)`
      );
    }
  }
}
```

---

## Security Standards

### Security Requirements

```typescript
interface SecurityStandards {
  authentication: {
    jwtExpiry: 86400; // 24 hours
    sessionTimeout: 1800; // 30 minutes
    maxLoginAttempts: 5;
    passwordMinLength: 8;
    passwordComplexity: {
      requireUppercase: true;
      requireLowercase: true;
      requireNumbers: true;
      requireSpecialChars: true;
    };
  };

  rateLimit: {
    requestsPerMinute: 60;
    requestsPerHour: 1000;
    burstSize: 10;
  };

  encryption: {
    algorithm: 'AES-256-GCM';
    keyRotation: 90; // days
  };

  audit: {
    enabled: true;
    retention: 90; // days
    includeIP: true;
    includeUserAgent: true;
    includePayload: false;
  };
}
```

---

## Implementation Examples

### Complete Integration Example

```typescript
import {
  WebLogEntry,
  Fire22Customer,
  Fire22Error,
  ErrorCode,
  LogType,
  TransactionStatus,
  CustomerType,
  GLOBAL_CONSTANTS,
} from '@/types/water-dashboard-standards';

class WaterDashboardService {
  private cache: CacheManager;
  private db: D1Database;
  private r2: R2Bucket;
  private monitor: PerformanceMonitor;

  async processTransaction(
    customerId: string,
    amount: number
  ): Promise<WebLogEntry> {
    return this.monitor.measure('transaction.process', async () => {
      // Validate input using standards
      if (!customerId.match(/^[A-Z]{2,3}\d{4,6}$/)) {
        throw new Fire22Error(
          ErrorCode.VALIDATION_FAILED,
          'Invalid customer ID format',
          400,
          { customerId },
          'L-603'
        );
      }

      // Check cache first
      const cacheKey = `customer:${customerId}`;
      let customer = await this.cache.get<Fire22Customer>(cacheKey);

      if (!customer) {
        // Fetch from database
        customer = await this.db
          .prepare('SELECT * FROM fire22_customers WHERE id = ?')
          .bind(customerId)
          .first<Fire22Customer>();

        // Update cache
        await this.cache.set(cacheKey, customer, 3600);
      }

      // Validate balance
      if (customer.balance < amount) {
        throw new Fire22Error(
          ErrorCode.INSUFFICIENT_BALANCE,
          'Insufficient balance',
          400,
          { balance: customer.balance, required: amount },
          'L-187'
        );
      }

      // Create log entry following standards
      const logEntry: WebLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        logType: LogType.TRANSACTION,
        actionType: 'withdrawal',
        customerId,
        amount,
        balance: customer.balance - amount,
        fire22LanguageKeys: ['L-603', 'L-69', 'L-187'],
        languageCode: customer.languageCode,
        status: TransactionStatus.PROCESSING,
        schemaVersion: GLOBAL_CONSTANTS.SCHEMA_VERSION,
      };

      // Store in database
      await this.db
        .prepare(
          `
        INSERT INTO web_logs (
          id, timestamp, log_type, action_type, 
          customer_id, amount, balance, 
          fire22_language_keys, language_code, status, schema_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          logEntry.id,
          logEntry.timestamp.toISOString(),
          logEntry.logType,
          logEntry.actionType,
          logEntry.customerId,
          logEntry.amount,
          logEntry.balance,
          JSON.stringify(logEntry.fire22LanguageKeys),
          logEntry.languageCode,
          logEntry.status,
          logEntry.schemaVersion
        )
        .run();

      // Archive if needed
      if (await this.shouldArchive()) {
        await this.archiveOldLogs();
      }

      return logEntry;
    });
  }

  private async shouldArchive(): Promise<boolean> {
    const lastArchive = await this.cache.get<Date>('last_archive');
    if (!lastArchive) return true;

    const hoursSinceArchive =
      (Date.now() - lastArchive.getTime()) / (1000 * 60 * 60);
    return hoursSinceArchive >= 24;
  }

  private async archiveOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - GLOBAL_CONSTANTS.LOG_RETENTION_DAYS
    );

    const logs = await this.db
      .prepare(
        `
      SELECT * FROM web_logs 
      WHERE timestamp < ? 
      AND status != 'archived'
      LIMIT 1000
    `
      )
      .bind(cutoffDate.toISOString())
      .all<WebLogEntry>();

    if (logs.results.length > 0) {
      // Archive to R2
      const archiveKey = await this.r2Archive.archive(logs.results);

      // Update status in database
      const ids = logs.results.map(log => log.id);
      await this.db
        .prepare(
          `
        UPDATE web_logs 
        SET status = 'archived', 
            archive_key = ? 
        WHERE id IN (${ids.map(() => '?').join(',')})
      `
        )
        .bind(archiveKey, ...ids)
        .run();

      // Update cache
      await this.cache.set('last_archive', new Date(), 86400);
    }
  }
}
```

---

## Migration to Standards

### Step-by-Step Migration

1. **Update TypeScript Imports**

```typescript
// Before
import { LogType } from './types/logs';
import { Customer } from './types/customer';

// After
import {
  LogType,
  Fire22Customer,
  WebLogEntry,
} from '@/types/water-dashboard-standards';
```

2. **Update Data Structures**

```typescript
// Before
const log = {
  type: 'transaction',
  customer: 'BB2212',
  amount: 500,
};

// After
const log: WebLogEntry = {
  id: crypto.randomUUID(),
  timestamp: new Date(),
  logType: LogType.TRANSACTION,
  customerId: 'BB2212',
  amount: 500,
  fire22LanguageKeys: ['L-603', 'L-69'],
  schemaVersion: '1.0.0',
};
```

3. **Update Error Handling**

```typescript
// Before
throw new Error('Invalid amount');

// After
throw new Fire22Error(
  ErrorCode.INVALID_AMOUNT,
  'Invalid amount',
  400,
  { amount },
  'L-69'
);
```

4. **Update Configuration**

```typescript
// Before
const config = {
  db: 'fire22-dashboard',
  cache_ttl: 3600,
};

// After
const config: WorkerConfiguration = {
  name: 'water-dashboard-worker',
  environment: 'production',
  // ... full configuration following standards
};
```

---

## Standards Compliance Checklist

### Development Checklist

- [ ] All types imported from `@/types/water-dashboard-standards`
- [ ] Version follows SemVer format
- [ ] Fire22 L-keys used for all relevant fields
- [ ] Error handling uses Fire22Error class
- [ ] Cache keys follow standard patterns
- [ ] Performance targets defined and monitored
- [ ] Security standards implemented
- [ ] Test coverage meets 80% threshold
- [ ] Documentation updated with standards

### Code Review Checklist

- [ ] TypeScript strict mode enabled
- [ ] No `any` types without justification
- [ ] All async operations have error handling
- [ ] Performance monitoring in place
- [ ] Cache strategy documented
- [ ] Database queries optimized
- [ ] Security requirements met
- [ ] Tests follow standard structure

### Deployment Checklist

- [ ] Version bumped appropriately
- [ ] Changelog updated
- [ ] Migration tested in staging
- [ ] Performance benchmarks passed
- [ ] Security audit completed
- [ ] Documentation reflects changes
- [ ] Rollback plan documented
- [ ] Monitoring configured

---

## Conclusion

The Water Dashboard Standards provide a comprehensive framework for building,
testing, and maintaining the Fire22 Water Dashboard system. By following these
standards, we ensure:

1. **Consistency** across all components
2. **Type safety** with full TypeScript coverage
3. **Performance** meeting defined targets
4. **Security** at every level
5. **Maintainability** through clear patterns
6. **Scalability** for future growth

### Quick Reference

```typescript
// Import all standards
import * as Standards from '@/types/water-dashboard-standards';

// Use global constants
const { GLOBAL_CONSTANTS } = Standards;

// Version: 2.0.0
// Schema: 1.0.0
// Fire22 L-Keys: 25 mapped
// Performance Target: <50ms
// Cache Hit Rate: 85%+
// Test Coverage: 80%+
```

---

**Last Updated**: 2025-08-27  
**Version**: 2.0.0  
**Status**: Active  
**Maintained By**: Fire22 Water Dashboard Team
