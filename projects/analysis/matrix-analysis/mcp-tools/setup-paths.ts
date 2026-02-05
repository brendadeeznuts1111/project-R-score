#!/usr/bin/env bun
// setup-paths.ts - Path configuration for Enhanced Multi-Tenant Dashboard

import { join } from "path";

// Define base paths (portable — derived from script location)
const BASE_DIR = import.meta.dir;
const CONFIG_DIR = join(BASE_DIR, "config");
const DATA_DIR = join(BASE_DIR, "data");
const LOGS_DIR = join(BASE_DIR, "logs");
const BACKUPS_DIR = join(BASE_DIR, "backups");
const SNAPSHOTS_DIR = join(BASE_DIR, "snapshots");
const AUDIT_DIR = join(BASE_DIR, "audit-review");

// Path configuration object
const pathConfig = {
  // Base directories
  BASE_DIR,
  CONFIG_DIR,
  DATA_DIR,
  LOGS_DIR,
  BACKUPS_DIR,
  SNAPSHOTS_DIR,
  AUDIT_DIR,

  // Database paths
  DATABASE: {
    DEVELOPMENT: `${DATA_DIR}/dev-audit.db`,
    STAGING: `${DATA_DIR}/staging-audit.db`,
    PRODUCTION: `${DATA_DIR}/prod-audit.db`,
    TEST: `${DATA_DIR}/test-audit.db`
  },

  // Configuration files
  CONFIG: {
    DEVELOPMENT: `${CONFIG_DIR}/.env.development`,
    STAGING: `${CONFIG_DIR}/.env.staging`,
    PRODUCTION: `${CONFIG_DIR}/.env.production`,
    NGINX: `${CONFIG_DIR}/nginx.conf`,
    DOCKER: `${CONFIG_DIR}/Dockerfile`,
    K8S: `${CONFIG_DIR}/k8s-deployment.yaml`,
    SYSTEMD: `${CONFIG_DIR}/dashboard.service`,
    LOGROTATE: `${CONFIG_DIR}/logrotate-dashboard`,
    BACKUP_CRON: `${CONFIG_DIR}/backup-cron`
  },

  // Log files
  LOGS: {
    APPLICATION: `${LOGS_DIR}/dashboard.log`,
    ACCESS: `${LOGS_DIR}/access.log`,
    ERROR: `${LOGS_DIR}/error.log`,
    AUDIT: `${LOGS_DIR}/audit.log`,
    PERFORMANCE: `${LOGS_DIR}/performance.log`,
    BACKUP: `${LOGS_DIR}/backup.log`,
    WEBSOCKET: `${LOGS_DIR}/websocket.log`
  },

  // Backup paths
  BACKUPS: {
    DAILY: `${BACKUPS_DIR}/daily`,
    WEEKLY: `${BACKUPS_DIR}/weekly`,
    MONTHLY: `${BACKUPS_DIR}/monthly`,
    SNAPSHOTS: `${BACKUPS_DIR}/snapshots`,
    CONFIGS: `${BACKUPS_DIR}/configs`
  },

  // Snapshot paths
  SNAPSHOTS: {
    TENANT_A: `${SNAPSHOTS_DIR}/tenant-a`,
    TENANT_B: `${SNAPSHOTS_DIR}/tenant-b`,
    TENANT_C: `${SNAPSHOTS_DIR}/tenant-c`,
    TEMP: `${SNAPSHOTS_DIR}/temp`,
    ARCHIVE: `${SNAPSHOTS_DIR}/archive`
  },

  // Audit paths
  AUDIT: {
    TENANT_A: `${AUDIT_DIR}/tenant-a`,
    TENANT_B: `${AUDIT_DIR}/tenant-b`,
    TENANT_C: `${AUDIT_DIR}/tenant-c`,
    REPORTS: `${AUDIT_DIR}/reports`,
    VIOLATIONS: `${AUDIT_DIR}/violations`
  },

  // Server URLs (for different environments)
  URLS: {
    DEVELOPMENT: {
      DASHBOARD: "http://localhost:3333/enhanced-dashboard.html",
      API: "http://localhost:3333/api",
      HEALTH: "http://localhost:3333/health",
      METRICS: "http://localhost:3333/metrics",
      WEBSOCKET: "ws://localhost:3333"
    },
    STAGING: {
      DASHBOARD: "https://staging.yourdomain.com/enhanced-dashboard.html",
      API: "https://staging.yourdomain.com/api",
      HEALTH: "https://staging.yourdomain.com/health",
      METRICS: "https://staging.yourdomain.com/metrics",
      WEBSOCKET: "wss://staging.yourdomain.com"
    },
    PRODUCTION: {
      DASHBOARD: "https://dashboard.yourdomain.com/enhanced-dashboard.html",
      API: "https://dashboard.yourdomain.com/api",
      HEALTH: "https://dashboard.yourdomain.com/health",
      METRICS: "https://dashboard.yourdomain.com/metrics",
      WEBSOCKET: "wss://dashboard.yourdomain.com"
    }
  },

  // Ports
  PORTS: {
    DEVELOPMENT: 3333,
    STAGING: 3334,
    PRODUCTION: 3335,
    METRICS: 9090,
    WEBSOCKET: 3333
  },

  // File paths for core components
  FILES: {
    ENHANCED_DASHBOARD: `${BASE_DIR}/enhanced-dashboard.ts`,
    DASHBOARD_HTML: `${BASE_DIR}/enhanced-dashboard.html`,
    CLI: `${BASE_DIR}/dashboard-cli.ts`,
    DEPLOY: `${BASE_DIR}/deploy.ts`,
    TESTS: `${BASE_DIR}/test_suite.test.ts`,
    DEMO: `${BASE_DIR}/demo-complete-system.ts`,
    ANSI_UTILS: `${BASE_DIR}/ansi-utils.ts`,
    TABLE_UTILS: `${BASE_DIR}/table-utils.ts`,
    TENANT_ARCHIVER: `${BASE_DIR}/tenant-archiver.ts`
  },

  // Binary and executable paths
  BINARIES: {
    BIN_DIR: `${BASE_DIR}/bin`,
    NODE_BIN: join(process.env.HOME || "/root", ".bun/bin"),
    PYTHON_BIN: `/usr/bin/python3`,
    DOCKER_BIN: `/usr/local/bin/docker`
  },

  // Script paths
  SCRIPTS: {
    SCRIPTS_DIR: `${BASE_DIR}/scripts`,
    DEPLOY_SCRIPT: `${BASE_DIR}/deploy.ts`,
    BACKUP_SCRIPT: `${BASE_DIR}/scripts/backup.sh`,
    RESTORE_SCRIPT: `${BASE_DIR}/scripts/restore.sh`
  }
};

// Create directories if they don't exist
function createDirectories() {
  const directories = [
    BASE_DIR,
    CONFIG_DIR,
    DATA_DIR,
    LOGS_DIR,
    BACKUPS_DIR,
    SNAPSHOTS_DIR,
    AUDIT_DIR,
    pathConfig.BACKUPS.DAILY,
    pathConfig.BACKUPS.WEEKLY,
    pathConfig.BACKUPS.MONTHLY,
    pathConfig.BACKUPS.SNAPSHOTS,
    pathConfig.BACKUPS.CONFIGS,
    pathConfig.SNAPSHOTS.TENANT_A,
    pathConfig.SNAPSHOTS.TENANT_B,
    pathConfig.SNAPSHOTS.TENANT_C,
    pathConfig.SNAPSHOTS.TEMP,
    pathConfig.SNAPSHOTS.ARCHIVE,
    pathConfig.AUDIT.TENANT_A,
    pathConfig.AUDIT.TENANT_B,
    pathConfig.AUDIT.TENANT_C,
    pathConfig.AUDIT.REPORTS,
    pathConfig.AUDIT.VIOLATIONS
  ];

  for (const dir of directories) {
    Bun.spawnSync(["mkdir", "-p", dir]);
    console.log(`✅ Ensured directory: ${dir}`);
  }
}

// Generate shell script for path exports
async function generateShellScript() {
  const shellScript = `#!/bin/bash
# Enhanced Multi-Tenant Dashboard - Environment Paths
# Generated by setup-paths.ts

# Base directories
export DASHBOARD_BASE_DIR="${pathConfig.BASE_DIR}"
export DASHBOARD_CONFIG_DIR="${pathConfig.CONFIG_DIR}"
export DASHBOARD_DATA_DIR="${pathConfig.DATA_DIR}"
export DASHBOARD_LOGS_DIR="${pathConfig.LOGS_DIR}"
export DASHBOARD_BACKUPS_DIR="${pathConfig.BACKUPS_DIR}"
export DASHBOARD_SNAPSHOTS_DIR="${pathConfig.SNAPSHOTS_DIR}"
export DASHBOARD_AUDIT_DIR="${pathConfig.AUDIT_DIR}"

# Database paths
export DASHBOARD_DB_DEV="${pathConfig.DATABASE.DEVELOPMENT}"
export DASHBOARD_DB_STAGING="${pathConfig.DATABASE.STAGING}"
export DASHBOARD_DB_PROD="${pathConfig.DATABASE.PRODUCTION}"
export DASHBOARD_DB_TEST="${pathConfig.DATABASE.TEST}"

# Configuration files
export DASHBOARD_ENV_DEV="${pathConfig.CONFIG.DEVELOPMENT}"
export DASHBOARD_ENV_STAGING="${pathConfig.CONFIG.STAGING}"
export DASHBOARD_ENV_PROD="${pathConfig.CONFIG.PRODUCTION}"
export DASHBOARD_NGINX_CONF="${pathConfig.CONFIG.NGINX}"
export DASHBOARD_K8S_DEPLOY="${pathConfig.CONFIG.K8S}"
export DASHBOARD_SYSTEMD_SERVICE="${pathConfig.CONFIG.SYSTEMD}"

# Log files
export DASHBOARD_LOG_APP="${pathConfig.LOGS.APPLICATION}"
export DASHBOARD_LOG_ACCESS="${pathConfig.LOGS.ACCESS}"
export DASHBOARD_LOG_ERROR="${pathConfig.LOGS.ERROR}"
export DASHBOARD_LOG_AUDIT="${pathConfig.LOGS.AUDIT}"
export DASHBOARD_LOG_PERF="${pathConfig.LOGS.PERFORMANCE}"

# Server URLs
export DASHBOARD_URL_DEV="${pathConfig.URLS.DEVELOPMENT.DASHBOARD}"
export DASHBOARD_URL_STAGING="${pathConfig.URLS.STAGING.DASHBOARD}"
export DASHBOARD_URL_PROD="${pathConfig.URLS.PRODUCTION.DASHBOARD}"

# Ports
export DASHBOARD_PORT_DEV="${pathConfig.PORTS.DEVELOPMENT}"
export DASHBOARD_PORT_STAGING="${pathConfig.PORTS.STAGING}"
export DASHBOARD_PORT_PROD="${pathConfig.PORTS.PRODUCTION}"

# Core files
export DASHBOARD_SERVER="${pathConfig.FILES.ENHANCED_DASHBOARD}"
export DASHBOARD_UI="${pathConfig.FILES.DASHBOARD_HTML}"
export DASHBOARD_CLI="${pathConfig.FILES.CLI}"
export DASHBOARD_DEPLOY="${pathConfig.FILES.DEPLOY}"

# Binary and executable paths
export DASHBOARD_BIN_DIR="${pathConfig.BINARIES.BIN_DIR}"
export DASHBOARD_NODE_BIN="${pathConfig.BINARIES.NODE_BIN}"
export DASHBOARD_PYTHON_BIN="${pathConfig.BINARIES.PYTHON_BIN}"
export DASHBOARD_DOCKER_BIN="${pathConfig.BINARIES.DOCKER_BIN}"

# Script paths
export DASHBOARD_SCRIPTS_DIR="${pathConfig.SCRIPTS.SCRIPTS_DIR}"
export DASHBOARD_DEPLOY_SCRIPT="${pathConfig.SCRIPTS.DEPLOY_SCRIPT}"
export DASHBOARD_BACKUP_SCRIPT="${pathConfig.SCRIPTS.BACKUP_SCRIPT}"
export DASHBOARD_RESTORE_SCRIPT="${pathConfig.SCRIPTS.RESTORE_SCRIPT}"

echo "✅ Enhanced Dashboard environment variables set"
echo "📁 Base Directory: $DASHBOARD_BASE_DIR"
echo "🔧 Config Directory: $DASHBOARD_CONFIG_DIR"
echo "💾 Data Directory: $DASHBOARD_DATA_DIR"
echo "📊 Logs Directory: $DASHBOARD_LOGS_DIR"
echo "💿 Backups Directory: $DASHBOARD_BACKUPS_DIR"
`;

  await Bun.write(join(BASE_DIR, "setup-paths.sh"), shellScript);
  console.log(`✅ Created shell script: ${join(BASE_DIR, "setup-paths.sh")}`);
}

// Generate TypeScript paths file
async function generateTypeScriptPaths() {
  const tsContent = `// Enhanced Multi-Tenant Dashboard - Path Constants
// Generated by setup-paths.ts

export const PATHS = ${JSON.stringify(pathConfig, null, 2)};

// Environment-specific path getters
export function getPaths(environment: 'development' | 'staging' | 'production' = 'development') {
  return {
    database: PATHS.DATABASE[environment.toUpperCase() as keyof typeof PATHS.DATABASE],
    config: PATHS.CONFIG[environment.toUpperCase() as keyof typeof PATHS.CONFIG],
    urls: PATHS.URLS[environment.toUpperCase() as keyof typeof PATHS.URLS],
    port: PATHS.PORTS[environment.toUpperCase() as keyof typeof PATHS.PORTS]
  };
}

// Utility functions
export function ensureDirectoryExists(path: string): void {
  Bun.spawnSync(["mkdir", "-p", path]);
}

export function getLogPath(type: 'app' | 'access' | 'error' | 'audit' | 'performance'): string {
  const logMap = {
    app: PATHS.LOGS.APPLICATION,
    access: PATHS.LOGS.ACCESS,
    error: PATHS.LOGS.ERROR,
    audit: PATHS.LOGS.AUDIT,
    performance: PATHS.LOGS.PERFORMANCE
  };
  return logMap[type];
}

export function getSnapshotPath(tenant: string): string {
  return \`\${PATHS.SNAPSHOTS_DIR}/\${tenant}\`;
}

export function getAuditPath(tenant: string): string {
  return \`\${PATHS.AUDIT_DIR}/\${tenant}\`;
}
`;

  await Bun.write(join(BASE_DIR, "paths.ts"), tsContent);
  console.log(`✅ Created TypeScript paths file: ${join(BASE_DIR, "paths.ts")}`);
}

// Generate .env file template
async function generateEnvTemplate() {
  const envTemplate = `# Enhanced Multi-Tenant Dashboard - Environment Variables
# Generated by setup-paths.ts

# Server Configuration
PORT=${pathConfig.PORTS.DEVELOPMENT}
HOST=localhost
CORS_ORIGIN=http://localhost:3001
COMPRESSION=true

# Database Configuration
DB_PATH=${pathConfig.DATABASE.DEVELOPMENT}
BACKUP_ENABLED=true
BACKUP_INTERVAL=3600000
BACKUP_RETENTION=168

# Directory Configuration
CONFIG_DIR=${pathConfig.CONFIG_DIR}
DATA_DIR=${pathConfig.DATA_DIR}
LOGS_DIR=${pathConfig.LOGS_DIR}
BACKUPS_DIR=${pathConfig.BACKUPS_DIR}
SNAPSHOTS_DIR=${pathConfig.SNAPSHOTS_DIR}
AUDIT_DIR=${pathConfig.AUDIT_DIR}

# Feature Flags
CACHE_ENABLED=true
CACHE_TTL=300000
CACHE_MAX_SIZE=1000
WEBSOCKETS_ENABLED=true
METRICS_ENABLED=true
ALERTS_ENABLED=true
SCHEDULING_ENABLED=true

# Security Configuration
API_KEY_ENABLED=false
JWT_ENABLED=false
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
AUDIT_ENABLED=true

# Monitoring Configuration
HEALTH_CHECK_ENABLED=true
METRICS_ENDPOINT_ENABLED=true
PROFILING_ENABLED=false

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=${pathConfig.LOGS.APPLICATION}
ACCESS_LOG=${pathConfig.LOGS.ACCESS}
ERROR_LOG=${pathConfig.LOGS.ERROR}
AUDIT_LOG=${pathConfig.LOGS.AUDIT}
`;

  await Bun.write(join(BASE_DIR, ".env.template"), envTemplate);
  console.log(`✅ Created .env template: ${join(BASE_DIR, ".env.template")}`);
}

// Main execution
async function main() {
  console.log("🔧 Setting up Enhanced Multi-Tenant Dashboard paths...");
  console.log("=" .repeat(60));

  createDirectories();
  await generateShellScript();
  await generateTypeScriptPaths();
  await generateEnvTemplate();

  console.log("\n✅ Path setup completed!");
  console.log("\n📋 Generated files:");
  console.log(`  📄 setup-paths.sh - Shell script for environment variables`);
  console.log(`  📄 paths.ts - TypeScript path constants`);
  console.log(`  📄 .env.template - Environment variables template`);
  console.log(`  📁 All required directories created`);

  console.log("\n🚀 Usage:");
  console.log(`  # Load environment variables`);
  console.log(`  source ${BASE_DIR}/setup-paths.sh`);
  console.log();
  console.log(`  # Import paths in TypeScript`);
  console.log(`  import { PATHS, getPaths } from './paths';`);
  console.log();
  console.log(`  # Copy environment template`);
  console.log(`  cp .env.template .env`);
  console.log(`  # Edit .env with your settings`);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { pathConfig, createDirectories, generateShellScript, generateTypeScriptPaths, generateEnvTemplate };
