# Repository Standards & Constants

This document defines the standards, constants, and conventions for the Fire22
Dashboard Worker repository.

## Repository Information

### Basic Details

- **Repository Name**: `fire22-dashboard-worker`
- **Version**: `3.0.9`
- **License**: Proprietary - Fire22 Sportsbook Platform
- **Homepage**: https://dashboard-worker.brendawill2233.workers.dev
- **Repository URL**:
  https://github.com/brendadeeznuts1111/fire22-dashboard-worker

### Team & Contacts

- **Maintainer**: Fire22 Development Team
- **Security Contact**: security@fire22.com
- **Support**:
  https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues

## Technical Constants

### Runtime Requirements

```typescript
const RUNTIME_REQUIREMENTS = {
  BUN_VERSION: '>=1.2.20',
  NODE_VERSION: '>=18.0.0', // Fallback only
  TYPESCRIPT_VERSION: '>=5.9.2',
  CLOUDFLARE_WORKERS_COMPATIBILITY: '2024-08-27',
} as const;
```

### Performance Budgets

```typescript
const PERFORMANCE_BUDGETS = {
  BUNDLE_SIZE_LIMIT: '1MB',
  COLD_START_LIMIT: '50ms',
  MEMORY_LIMIT: '256MB',
  BUILD_TIME_LIMIT: '30s',
  TEST_TIMEOUT: '120s',
  E2E_TIMEOUT: '300s',
} as const;
```

### Workspace Configuration

```typescript
const WORKSPACES = {
  CORE_DASHBOARD: {
    name: '@fire22/core-dashboard',
    path: 'workspaces/@fire22-core-dashboard',
    maxSize: '500KB',
    target: 'cloudflare-workers',
  },
  PATTERN_SYSTEM: {
    name: '@fire22/pattern-system',
    path: 'workspaces/@fire22-pattern-system',
    maxSize: '800KB',
    target: 'cloudflare-workers',
  },
  API_CLIENT: {
    name: '@fire22/api-client',
    path: 'workspaces/@fire22-api-client',
    maxSize: '400KB',
    target: 'cloudflare-workers',
  },
  SPORTS_BETTING: {
    name: '@fire22/sports-betting',
    path: 'workspaces/@fire22-sports-betting',
    maxSize: '600KB',
    target: 'cloudflare-workers',
  },
  TELEGRAM_INTEGRATION: {
    name: '@fire22/telegram-integration',
    path: 'workspaces/@fire22-telegram-integration',
    maxSize: '350KB',
    target: 'cloudflare-workers',
  },
  BUILD_SYSTEM: {
    name: '@fire22/build-system',
    path: 'workspaces/@fire22-build-system',
    maxSize: 'unlimited',
    target: 'node',
  },
} as const;
```

### Environment Constants

```typescript
const ENVIRONMENTS = {
  DEVELOPMENT: {
    name: 'development',
    cloudflareEnv: 'dev',
    domain: 'dev.dashboard-worker.brendawill2233.workers.dev',
    rateLimits: { rpm: 1000, rph: 10000 },
  },
  STAGING: {
    name: 'staging',
    cloudflareEnv: 'staging',
    domain: 'staging.dashboard-worker.brendawill2233.workers.dev',
    rateLimits: { rpm: 5000, rph: 50000 },
  },
  PRODUCTION: {
    name: 'production',
    cloudflareEnv: 'production',
    domain: 'dashboard-worker.brendawill2233.workers.dev',
    rateLimits: { rpm: 10000, rph: 100000 },
  },
} as const;
```

## Code Standards

### File Naming Conventions

```typescript
const NAMING_CONVENTIONS = {
  COMPONENTS: 'PascalCase', // UserDashboard.tsx
  UTILITIES: 'camelCase', // formatCurrency.ts
  CONSTANTS: 'SCREAMING_SNAKE_CASE', // API_ENDPOINTS.ts
  CONFIG_FILES: 'kebab-case', // build-config.ts
  TEST_FILES: 'camelCase.test.ts', // userAuth.test.ts
  SPEC_FILES: 'camelCase.spec.ts', // apiClient.spec.ts
  TYPES: 'PascalCase', // UserProfile.ts
  INTERFACES: 'PascalCase with I', // IApiResponse.ts
  SCHEMAS: 'kebab-case.sql', // user-schema.sql
} as const;
```

### Directory Structure Standards

```typescript
const DIRECTORY_STRUCTURE = {
  SOURCE: 'src/',
  TESTS: 'test/',
  DOCS: 'docs/',
  SCRIPTS: 'scripts/',
  CONFIGS: './',
  WORKSPACES: 'workspaces/',
  PACKAGES: 'packages/',
  BENCHMARKS: 'bench/',
  SCHEMAS: './*.sql',
  GITHUB: '.github/',
} as const;
```

### Code Quality Standards

```typescript
const QUALITY_STANDARDS = {
  TEST_COVERAGE: {
    MINIMUM: 80,
    TARGET: 90,
    CRITICAL_PATHS: 95,
  },
  ESLINT: {
    MAX_WARNINGS: 0,
    MAX_ERRORS: 0,
  },
  TYPESCRIPT: {
    STRICT_MODE: true,
    NO_IMPLICIT_ANY: true,
    NO_UNUSED_VARS: true,
  },
  PRETTIER: {
    PRINT_WIDTH: 100,
    TAB_WIDTH: 2,
    SEMI: true,
    SINGLE_QUOTE: true,
    TRAILING_COMMA: 'es5',
  },
} as const;
```

## Documentation Standards

### Required Documentation

- [ ] README.md (comprehensive project overview)
- [ ] API documentation (for all public endpoints)
- [ ] Architecture documentation (system design)
- [ ] Setup and installation guides
- [ ] Contributing guidelines
- [ ] Security policy
- [ ] Changelog
- [ ] License information

### Documentation Quality Metrics

```typescript
const DOCS_STANDARDS = {
  README_MIN_SECTIONS: [
    'Overview',
    'Quick Start',
    'Installation',
    'Usage',
    'API Reference',
    'Contributing',
    'License',
  ],
  API_DOCS_COVERAGE: '100%', // All public APIs must be documented
  CODE_COMMENT_COVERAGE: '80%', // Complex functions must have comments
  INLINE_DOCS: 'JSDoc format',
} as const;
```

## Security Standards

### Security Requirements

```typescript
const SECURITY_REQUIREMENTS = {
  DEPENDENCY_SCAN: 'automated',
  VULNERABILITY_SCAN: 'weekly',
  SECRET_DETECTION: 'pre-commit',
  AUDIT_LEVEL: 'high',
  JWT_EXPIRATION: '24h',
  RATE_LIMITING: 'enabled',
  CORS_POLICY: 'restrictive',
  HTTPS_ONLY: true,
  CSP_ENABLED: true,
} as const;
```

### Secret Management

```typescript
const SECRET_CATEGORIES = {
  API_KEYS: 'External service API keys',
  DATABASE_URLS: 'Database connection strings',
  JWT_SECRETS: 'JWT signing secrets',
  ENCRYPTION_KEYS: 'Data encryption keys',
  WEBHOOK_SECRETS: 'Webhook validation secrets',
  CERTIFICATES: 'SSL/TLS certificates',
} as const;
```

## CI/CD Standards

### Pipeline Requirements

```typescript
const PIPELINE_STAGES = {
  VALIDATE: ['lint', 'type-check', 'format-check'],
  TEST: ['unit', 'integration', 'e2e'],
  BUILD: ['compile', 'bundle', 'optimize'],
  SECURITY: ['dependency-scan', 'secret-scan', 'vulnerability-check'],
  DEPLOY: ['staging', 'production'],
  MONITOR: ['health-check', 'performance-metrics'],
} as const;
```

### Deployment Environments

```typescript
const DEPLOYMENT_CONFIG = {
  STAGING: {
    auto_deploy: true,
    branch: 'develop',
    approvals_required: 0,
  },
  PRODUCTION: {
    auto_deploy: false,
    branch: 'main',
    approvals_required: 2,
  },
} as const;
```

## Monitoring & Observability

### Metrics Collection

```typescript
const METRICS = {
  PERFORMANCE: ['response_time', 'throughput', 'error_rate'],
  BUSINESS: ['active_users', 'api_calls', 'feature_usage'],
  INFRASTRUCTURE: ['cpu_usage', 'memory_usage', 'disk_io'],
  CUSTOM: ['pattern_weaver_performance', 'queue_depth', 'cache_hit_rate'],
} as const;
```

### Alerting Thresholds

```typescript
const ALERT_THRESHOLDS = {
  ERROR_RATE: { warning: 1, critical: 5 }, // percentage
  RESPONSE_TIME: { warning: 1000, critical: 5000 }, // milliseconds
  MEMORY_USAGE: { warning: 80, critical: 90 }, // percentage
  DISK_USAGE: { warning: 85, critical: 95 }, // percentage
  QUEUE_DEPTH: { warning: 1000, critical: 5000 }, // messages
} as const;
```

## Versioning & Release Standards

### Semantic Versioning

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (x.Y.0): New features (backward compatible)
- **PATCH** (x.y.Z): Bug fixes (backward compatible)

### Release Process

1. Version bump in `package.json`
2. Update `CHANGELOG.md`
3. Create release branch
4. Run full test suite
5. Deploy to staging
6. Manual QA testing
7. Create GitHub release
8. Deploy to production
9. Monitor deployment

### Branch Strategy

- `main` - Production ready code
- `develop` - Active development
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency fixes
- `release/*` - Release preparation

## Repository Maintenance

### Regular Tasks

- [ ] Weekly dependency updates
- [ ] Monthly security scans
- [ ] Quarterly performance reviews
- [ ] Bi-annual architecture reviews

### Automated Tasks

- [ ] Daily CI/CD pipeline runs
- [ ] Nightly security scans
- [ ] Weekly dependency vulnerability checks
- [ ] Monthly performance benchmarks

This document should be reviewed and updated quarterly to ensure standards
remain current and effective.
