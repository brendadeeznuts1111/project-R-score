// Enhanced Multi-Tenant Dashboard - Path Constants
// Derived from import.meta.dir (portable, no hardcoded paths)

import { join } from "path";

const BASE_DIR = import.meta.dir;
const CONFIG_DIR = join(BASE_DIR, "config");
const DATA_DIR = join(BASE_DIR, "data");
const LOGS_DIR = join(BASE_DIR, "logs");
const BACKUPS_DIR = join(BASE_DIR, "backups");
const SNAPSHOTS_DIR = join(BASE_DIR, "snapshots");
const AUDIT_DIR = join(BASE_DIR, "audit-review");

export const PATHS = {
  "BASE_DIR": BASE_DIR,
  "CONFIG_DIR": CONFIG_DIR,
  "DATA_DIR": DATA_DIR,
  "LOGS_DIR": LOGS_DIR,
  "BACKUPS_DIR": BACKUPS_DIR,
  "SNAPSHOTS_DIR": SNAPSHOTS_DIR,
  "AUDIT_DIR": AUDIT_DIR,
  "DATABASE": {
    "DEVELOPMENT": join(DATA_DIR, "dev-audit.db"),
    "STAGING": join(DATA_DIR, "staging-audit.db"),
    "PRODUCTION": join(DATA_DIR, "prod-audit.db"),
    "TEST": join(DATA_DIR, "test-audit.db")
  },
  "CONFIG": {
    "DEVELOPMENT": join(CONFIG_DIR, ".env.development"),
    "STAGING": join(CONFIG_DIR, ".env.staging"),
    "PRODUCTION": join(CONFIG_DIR, ".env.production"),
    "NGINX": join(CONFIG_DIR, "nginx.conf"),
    "DOCKER": join(CONFIG_DIR, "Dockerfile"),
    "K8S": join(CONFIG_DIR, "k8s-deployment.yaml"),
    "SYSTEMD": join(CONFIG_DIR, "dashboard.service"),
    "LOGROTATE": join(CONFIG_DIR, "logrotate-dashboard"),
    "BACKUP_CRON": join(CONFIG_DIR, "backup-cron")
  },
  "LOGS": {
    "APPLICATION": join(LOGS_DIR, "dashboard.log"),
    "ACCESS": join(LOGS_DIR, "access.log"),
    "ERROR": join(LOGS_DIR, "error.log"),
    "AUDIT": join(LOGS_DIR, "audit.log"),
    "PERFORMANCE": join(LOGS_DIR, "performance.log"),
    "BACKUP": join(LOGS_DIR, "backup.log"),
    "WEBSOCKET": join(LOGS_DIR, "websocket.log")
  },
  "BACKUPS": {
    "DAILY": join(BACKUPS_DIR, "daily"),
    "WEEKLY": join(BACKUPS_DIR, "weekly"),
    "MONTHLY": join(BACKUPS_DIR, "monthly"),
    "SNAPSHOTS": join(BACKUPS_DIR, "snapshots"),
    "CONFIGS": join(BACKUPS_DIR, "configs")
  },
  "SNAPSHOTS": {
    "TENANT_A": join(SNAPSHOTS_DIR, "tenant-a"),
    "TENANT_B": join(SNAPSHOTS_DIR, "tenant-b"),
    "TENANT_C": join(SNAPSHOTS_DIR, "tenant-c"),
    "TEMP": join(SNAPSHOTS_DIR, "temp"),
    "ARCHIVE": join(SNAPSHOTS_DIR, "archive")
  },
  "AUDIT": {
    "TENANT_A": join(AUDIT_DIR, "tenant-a"),
    "TENANT_B": join(AUDIT_DIR, "tenant-b"),
    "TENANT_C": join(AUDIT_DIR, "tenant-c"),
    "REPORTS": join(AUDIT_DIR, "reports"),
    "VIOLATIONS": join(AUDIT_DIR, "violations")
  },
  "URLS": {
    "DEVELOPMENT": {
      "DASHBOARD": "http://localhost:3333/enhanced-dashboard.html",
      "API": "http://localhost:3333/api",
      "HEALTH": "http://localhost:3333/health",
      "METRICS": "http://localhost:3333/metrics",
      "WEBSOCKET": "ws://localhost:3333"
    },
    "STAGING": {
      "DASHBOARD": "https://staging.yourdomain.com/enhanced-dashboard.html",
      "API": "https://staging.yourdomain.com/api",
      "HEALTH": "https://staging.yourdomain.com/health",
      "METRICS": "https://staging.yourdomain.com/metrics",
      "WEBSOCKET": "wss://staging.yourdomain.com"
    },
    "PRODUCTION": {
      "DASHBOARD": "https://dashboard.yourdomain.com/enhanced-dashboard.html",
      "API": "https://dashboard.yourdomain.com/api",
      "HEALTH": "https://dashboard.yourdomain.com/health",
      "METRICS": "https://dashboard.yourdomain.com/metrics",
      "WEBSOCKET": "wss://dashboard.yourdomain.com"
    }
  },
  "PORTS": {
    "DEVELOPMENT": 3333,
    "STAGING": 3334,
    "PRODUCTION": 3335,
    "METRICS": 9090,
    "WEBSOCKET": 3333
  },
  "FILES": {
    "ENHANCED_DASHBOARD": join(BASE_DIR, "enhanced-dashboard.ts"),
    "DASHBOARD_HTML": join(BASE_DIR, "enhanced-dashboard.html"),
    "CLI": join(BASE_DIR, "dashboard-cli.ts"),
    "DEPLOY": join(BASE_DIR, "deploy.ts"),
    "TESTS": join(BASE_DIR, "test_suite.test.ts"),
    "DEMO": join(BASE_DIR, "demo-complete-system.ts"),
    "ANSI_UTILS": join(BASE_DIR, "ansi-utils.ts"),
    "TABLE_UTILS": join(BASE_DIR, "table-utils.ts"),
    "TENANT_ARCHIVER": join(BASE_DIR, "tenant-archiver.ts")
  },
  "BINARIES": {
    "BIN_DIR": join(BASE_DIR, "bin"),
    "NODE_BIN": join(process.env.HOME || "/root", ".bun/bin"),
    "PYTHON_BIN": "/usr/bin/python3",
    "DOCKER_BIN": "/usr/local/bin/docker"
  },
  "SCRIPTS": {
    "SCRIPTS_DIR": join(BASE_DIR, "scripts"),
    "DEPLOY_SCRIPT": join(BASE_DIR, "deploy.ts"),
    "BACKUP_SCRIPT": join(BASE_DIR, "scripts/backup.sh"),
    "RESTORE_SCRIPT": join(BASE_DIR, "scripts/restore.sh")
  }
};

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
  return join(SNAPSHOTS_DIR, tenant);
}

export function getAuditPath(tenant: string): string {
  return join(AUDIT_DIR, tenant);
}
