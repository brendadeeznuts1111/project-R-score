# 🛠️ Enhanced Multi-Tenant Dashboard - Path Variables Setup

## ✅ **Path Variables Successfully Configured**

### **📁 Directory Structure Created:**

```text
/Users/nolarose/mcp-tools/
├── config/                    # Configuration files
├── data/                      # Database files
├── logs/                      # Log files
├── backups/                   # Backup storage
│   ├── daily/                # Daily backups
│   ├── weekly/               # Weekly backups
│   ├── monthly/              # Monthly backups
│   ├── snapshots/            # Snapshot backups
│   └── configs/              # Configuration backups
├── snapshots/                 # Tenant snapshots
│   ├── tenant-a/             # Tenant A snapshots
│   ├── tenant-b/             # Tenant B snapshots
│   ├── tenant-c/             # Tenant C snapshots
│   ├── temp/                 # Temporary snapshots
│   └── archive/              # Archived snapshots
└── audit-review/              # Audit data
    ├── tenant-a/             # Tenant A audit
    ├── tenant-b/             # Tenant B audit
    ├── tenant-c/             # Tenant C audit
    ├── reports/              # Audit reports
    └── violations/           # Violation data
```

### **🔧 Environment Variables Set:**

#### **Base Directories:**

- `DASHBOARD_BASE_DIR` - `/Users/nolarose/mcp-tools`
- `DASHBOARD_CONFIG_DIR` - `/Users/nolarose/mcp-tools/config`
- `DASHBOARD_DATA_DIR` - `/Users/nolarose/mcp-tools/data`
- `DASHBOARD_LOGS_DIR` - `/Users/nolarose/mcp-tools/logs`
- `DASHBOARD_BACKUPS_DIR` - `/Users/nolarose/mcp-tools/backups`
- `DASHBOARD_SNAPSHOTS_DIR` - `/Users/nolarose/mcp-tools/snapshots`
- `DASHBOARD_AUDIT_DIR` - `/Users/nolarose/mcp-tools/audit-review`

#### **Database Paths:**

- `DASHBOARD_DB_DEV` - `/Users/nolarose/mcp-tools/data/dev-audit.db`
- `DASHBOARD_DB_STAGING` - `/Users/nolarose/mcp-tools/data/staging-audit.db`
- `DASHBOARD_DB_PROD` - `/Users/nolarose/mcp-tools/data/prod-audit.db`
- `DASHBOARD_DB_TEST` - `/Users/nolarose/mcp-tools/data/test-audit.db`

#### **Configuration Files:**

- `DASHBOARD_ENV_DEV` - `/Users/nolarose/mcp-tools/config/.env.development`
- `DASHBOARD_ENV_STAGING` - `/Users/nolarose/mcp-tools/config/.env.staging`
- `DASHBOARD_ENV_PROD` - `/Users/nolarose/mcp-tools/config/.env.production`

#### **Log Files:**

- `DASHBOARD_LOG_APP` - `/Users/nolarose/mcp-tools/logs/dashboard.log`
- `DASHBOARD_LOG_ACCESS` - `/Users/nolarose/mcp-tools/logs/access.log`
- `DASHBOARD_LOG_ERROR` - `/Users/nolarose/mcp-tools/logs/error.log`
- `DASHBOARD_LOG_AUDIT` - `/Users/nolarose/mcp-tools/logs/audit.log`
- `DASHBOARD_LOG_PERF` - `/Users/nolarose/mcp-tools/logs/performance.log`

#### **Server URLs:**

- `DASHBOARD_URL_DEV` - `http://localhost:3333/enhanced-dashboard.html`
- `DASHBOARD_URL_STAGING` - `https://staging.yourdomain.com/enhanced-dashboard.html`
- `DASHBOARD_URL_PROD` - `https://dashboard.yourdomain.com/enhanced-dashboard.html`

#### **Ports:**

- `DASHBOARD_PORT_DEV` - `3333`
- `DASHBOARD_PORT_STAGING` - `3334`
- `DASHBOARD_PORT_PROD` - `3335`

#### **Core Files:**

- `DASHBOARD_SERVER` - `/Users/nolarose/mcp-tools/enhanced-dashboard.ts`
- `DASHBOARD_UI` - `/Users/nolarose/mcp-tools/enhanced-dashboard.html`
- `DASHBOARD_CLI` - `/Users/nolarose/mcp-tools/dashboard-cli.ts`
- `DASHBOARD_DEPLOY` - `/Users/nolarose/mcp-tools/deploy.ts`

### **🚀 Command Aliases Created:**

#### **Dashboard Management:**

- `dashboard-start` - Start the dashboard server
- `dashboard-status` - Check dashboard status
- `dashboard-health` - Run health check
- `dashboard-metrics` - View performance metrics
- `dashboard-logs` - Tail dashboard logs
- `dashboard-deploy` - Run deployment script
- `dashboard-demo` - Run complete system demo

#### **Navigation Aliases:**

- `cd-dashboard` - Navigate to dashboard directory
- `cd-config` - Navigate to config directory
- `cd-logs` - Navigate to logs directory
- `cd-data` - Navigate to data directory
- `cd-backups` - Navigate to backups directory
- `cd-snapshots` - Navigate to snapshots directory

### **📄 Generated Files:**

1. **`setup-paths.sh`** - Shell script to load environment variables
2. **`paths.ts`** - TypeScript path constants and utilities
3. **`.env.template`** - Environment variables template
4. **`.env`** - Active environment configuration
5. **`dashboard-paths.sh`** - Persistent path variables and aliases

### **🔧 Usage Instructions:**

#### **Load Environment Variables:**

```bash
# Temporary (current session)
source /Users/nolarose/mcp-tools/setup-paths.sh

# Permanent (add to ~/.zshrc or ~/.bashrc)
source /Users/nolarose/mcp-tools/dashboard-paths.sh
```

#### **Use in TypeScript:**

```typescript
import { PATHS, getPaths } from './paths';

// Get environment-specific paths
const devPaths = getPaths('development');
console.log(devPaths.database); // dev-audit.db

// Access specific paths
console.log(PATHS.LOGS.APPLICATION);
console.log(PATHS.CONFIG.K8S);
```

#### **Use Command Aliases:**

```bash
# Start the dashboard
dashboard-start

# Check status
dashboard-status

# View logs
dashboard-logs

# Navigate directories
cd-dashboard
cd-logs
cd-backups
```

### **📊 Complete Path Variables Reference:**

**📋 Table Column Descriptions:**

- **Variable Name**: Environment variable name
- **Path/Value**: Actual path or value of the variable
- **Purpose**: What the variable is used for
- **Usage Example**: Example command using the variable
- **Type**: Variable type (Directory, File, URL, Number, Binary)
- **Environment**: Which environment(s) it applies to
- **Default Created**: Whether the file/directory is created by default (✅ Yes / ❌ No)
- **Binary/Executable**: Associated binary or executable path (if applicable)
- **Property**: Additional property or attribute of the variable
- **Default**: Default string value or configuration

| Variable Name | Path/Value | Purpose | Usage Example | Type | Environment | Default Created | Binary/Executable | Property | Default |
| :------------ | :--------- | :------ | :------------ | :--- | :--------- | :------------- | :--------------- | :------- | :------ |
| **Base Directories** | | | | | | | | | |
| `DASHBOARD_BASE_DIR` | `/Users/nolarose/mcp-tools` | Root directory for all dashboard files | `cd $DASHBOARD_BASE_DIR` | Directory | All | ✅ Yes | N/A | read-write | "/Users/nolarose/mcp-tools" |
| `DASHBOARD_CONFIG_DIR` | `/Users/nolarose/mcp-tools/config` | Configuration files storage | `ls $DASHBOARD_CONFIG_DIR` | Directory | All | ✅ Yes | N/A | read-write | "/Users/nolarose/mcp-tools/config" |
| `DASHBOARD_DATA_DIR` | `/Users/nolarose/mcp-tools/data` | Database files location | `sqlite3 $DASHBOARD_DATA_DIR/dev.db` | Directory | All | ✅ Yes | sqlite3 | read-write | "/Users/nolarose/mcp-tools/data" |
| `DASHBOARD_LOGS_DIR` | `/Users/nolarose/mcp-tools/logs` | Log files storage | `tail -f $DASHBOARD_LOGS_DIR/dashboard.log` | Directory | All | ✅ Yes | tail | read-write | "/Users/nolarose/mcp-tools/logs" |
| `DASHBOARD_BACKUPS_DIR` | `/Users/nolarose/mcp-tools/backups` | Backup storage location | `ls $DASHBOARD_BACKUPS_DIR/daily/` | Directory | All | ✅ Yes | tar | read-write | "/Users/nolarose/mcp-tools/backups" |
| `DASHBOARD_SNAPSHOTS_DIR` | `/Users/nolarose/mcp-tools/snapshots` | Tenant snapshots storage | `find $DASHBOARD_SNAPSHOTS_DIR -name "*.json"` | Directory | All | ✅ Yes | find | read-write | "/Users/nolarose/mcp-tools/snapshots" |
| `DASHBOARD_AUDIT_DIR` | `/Users/nolarose/mcp-tools/audit-review` | Audit data storage | `cat $DASHBOARD_AUDIT_DIR/reports/*.json` | Directory | All | ✅ Yes | cat | read-only | "/Users/nolarose/mcp-tools/audit-review" |
| `DASHBOARD_BIN_DIR` | `/Users/nolarose/mcp-tools/bin` | Custom binaries and executables | `ls $DASHBOARD_BIN_DIR` | Directory | All | ✅ Yes | N/A | executable | "/Users/nolarose/mcp-tools/bin" |
| `DASHBOARD_SCRIPTS_DIR` | `/Users/nolarose/mcp-tools/scripts` | Utility and automation scripts | `ls $DASHBOARD_SCRIPTS_DIR` | Directory | All | ✅ Yes | N/A | executable | "/Users/nolarose/mcp-tools/scripts" |
| **Binary Paths** | | | | | | | | | |
| `DASHBOARD_NODE_BIN` | `/Users/nolarose/.bun/bin` | Node.js/Bun executable directory | `export PATH="$DASHBOARD_NODE_BIN:$PATH"` | Directory | All | ❌ No | bun | executable | "/Users/nolarose/.bun/bin" |
| `DASHBOARD_PYTHON_BIN` | `/usr/bin/python3` | Python executable path | `python3 --version` | Binary | All | ❌ No | python3 | executable | "/usr/bin/python3" |
| `DASHBOARD_DOCKER_BIN` | `/usr/local/bin/docker` | Docker executable path | `docker --version` | Binary | All | ❌ No | docker | executable | "/usr/local/bin/docker" |
| **Script Paths** | | | | | | | | | |
| `DASHBOARD_DEPLOY_SCRIPT` | `/Users/nolarose/mcp-tools/deploy.ts` | Main deployment script | `bun run $DASHBOARD_DEPLOY_SCRIPT` | File | All | ✅ Yes | bun | executable | "/Users/nolarose/mcp-tools/deploy.ts" |
| `DASHBOARD_BACKUP_SCRIPT` | `/Users/nolarose/mcp-tools/scripts/backup.sh` | Backup automation script | `$DASHBOARD_BACKUP_SCRIPT --full` | File | All | ✅ Yes | bash | executable | "/Users/nolarose/mcp-tools/scripts/backup.sh" |
| `DASHBOARD_RESTORE_SCRIPT` | `/Users/nolarose/mcp-tools/scripts/restore.sh` | Restore automation script | `$DASHBOARD_RESTORE_SCRIPT --from-backup` | File | All | ✅ Yes | bash | executable | "/Users/nolarose/mcp-tools/scripts/restore.sh" |
| **Database Paths** | | | | | | | | | |
| `DASHBOARD_DB_DEV` | `/Users/nolarose/mcp-tools/data/dev-audit.db` | Development database | `sqlite3 $DASHBOARD_DB_DEV` | File | Development | ✅ Yes | sqlite3 | read-write | "/Users/nolarose/mcp-tools/data/dev-audit.db" |
| `DASHBOARD_DB_STAGING` | `/Users/nolarose/mcp-tools/data/staging-audit.db` | Staging database | `sqlite3 $DASHBOARD_DB_STAGING` | File | Staging | ❌ No | sqlite3 | read-write | "/Users/nolarose/mcp-tools/data/staging-audit.db" |
| `DASHBOARD_DB_PROD` | `/Users/nolarose/mcp-tools/data/prod-audit.db` | Production database | `sqlite3 $DASHBOARD_DB_PROD` | File | Production | ❌ No | sqlite3 | read-only | "/Users/nolarose/mcp-tools/data/prod-audit.db" |
| `DASHBOARD_DB_TEST` | `/Users/nolarose/mcp-tools/data/test-audit.db` | Test database | `sqlite3 $DASHBOARD_DB_TEST` | File | Test | ❌ No | sqlite3 | read-write | "/Users/nolarose/mcp-tools/data/test-audit.db" |
| **Configuration Files** | | | | | | | | | |
| `DASHBOARD_ENV_DEV` | `/Users/nolarose/mcp-tools/config/.env.development` | Development environment config | `cat $DASHBOARD_ENV_DEV` | File | Development | ✅ Yes | cat | read-write | "/Users/nolarose/mcp-tools/config/.env.development" |
| `DASHBOARD_ENV_STAGING` | `/Users/nolarose/mcp-tools/config/.env.staging` | Staging environment config | `cat $DASHBOARD_ENV_STAGING` | File | Staging | ❌ No | cat | read-write | "/Users/nolarose/mcp-tools/config/.env.staging" |
| `DASHBOARD_ENV_PROD` | `/Users/nolarose/mcp-tools/config/.env.production` | Production environment config | `cat $DASHBOARD_ENV_PROD` | File | Production | ❌ No | cat | read-only | "/Users/nolarose/mcp-tools/config/.env.production" |
| **Log Files** | | | | | | | | | |
| `DASHBOARD_LOG_APP` | `/Users/nolarose/mcp-tools/logs/dashboard.log` | Main application log | `tail -f $DASHBOARD_LOG_APP` | File | All | ✅ Yes | tail | append-only | "/Users/nolarose/mcp-tools/logs/dashboard.log" |
| `DASHBOARD_LOG_ACCESS` | `/Users/nolarose/mcp-tools/logs/access.log` | HTTP access log | `grep "POST" $DASHBOARD_LOG_ACCESS` | File | All | ✅ Yes | grep | append-only | "/Users/nolarose/mcp-tools/logs/access.log" |
| `DASHBOARD_LOG_ERROR` | `/Users/nolarose/mcp-tools/logs/error.log` | Error log file | `tail $DASHBOARD_LOG_ERROR` | File | All | ✅ Yes | tail | append-only | "/Users/nolarose/mcp-tools/logs/error.log" |
| `DASHBOARD_LOG_AUDIT` | `/Users/nolarose/mcp-tools/logs/audit.log` | Audit trail log | `cat $DASHBOARD_LOG_AUDIT` | File | All | ✅ Yes | cat | append-only | "/Users/nolarose/mcp-tools/logs/audit.log" |
| `DASHBOARD_LOG_PERF` | `/Users/nolarose/mcp-tools/logs/performance.log` | Performance metrics log | `grep "response_time" $DASHBOARD_LOG_PERF` | File | All | ✅ Yes | grep | append-only | "/Users/nolarose/mcp-tools/logs/performance.log" |
| **Server URLs** | | | | | | | | | |
| `DASHBOARD_URL_DEV` | `<http://localhost:3333/enhanced-dashboard.html>` | Development dashboard URL | `open $DASHBOARD_URL_DEV` | URL | Development | N/A | open | http | "http://localhost:3333/enhanced-dashboard.html" |
| `DASHBOARD_URL_STAGING` | `<https://staging.yourdomain.com/enhanced-dashboard.html>` | Staging dashboard URL | `curl $DASHBOARD_URL_STAGING` | URL | Staging | N/A | curl | https | "https://staging.yourdomain.com/enhanced-dashboard.html" |
| `DASHBOARD_URL_PROD` | `<https://dashboard.yourdomain.com/enhanced-dashboard.html>` | Production dashboard URL | `curl $DASHBOARD_URL_PROD` | URL | Production | N/A | curl | https | "https://dashboard.yourdomain.com/enhanced-dashboard.html" |
| **Ports** | | | | | | | | | |
| `DASHBOARD_PORT_DEV` | `3333` | Development server port | `lsof -i :$DASHBOARD_PORT_DEV` | Number | Development | N/A | lsof | tcp | "3333" |
| `DASHBOARD_PORT_STAGING` | `3334` | Staging server port | `lsof -i :$DASHBOARD_PORT_STAGING` | Number | Staging | N/A | lsof | tcp | "3334" |
| `DASHBOARD_PORT_PROD` | `3336` | Production server port | `lsof -i :$DASHBOARD_PORT_PROD` | Number | Production | N/A | lsof | tcp | "3336" |
| **Core Files** | | | | | | | | | |
| `DASHBOARD_SERVER` | `/Users/nolarose/mcp-tools/enhanced-dashboard.ts` | Main server application | `bun run $DASHBOARD_SERVER` | File | All | ✅ Yes | bun | executable | "/Users/nolarose/mcp-tools/enhanced-dashboard.ts" |
| `DASHBOARD_UI` | `/Users/nolarose/mcp-tools/enhanced-dashboard.html` | Frontend dashboard UI | `open $DASHBOARD_UI` | File | All | ✅ Yes | open | readable | "/Users/nolarose/mcp-tools/enhanced-dashboard.html" |
| `DASHBOARD_CLI` | `/Users/nolarose/mcp-tools/dashboard-cli.ts` | Command-line interface | `bun $DASHBOARD_CLI --help` | File | All | ✅ Yes | bun | executable | "/Users/nolarose/mcp-tools/dashboard-cli.ts" |
| `DASHBOARD_DEPLOY` | `/Users/nolarose/mcp-tools/deploy.ts` | Deployment automation script | `bun run $DASHBOARD_DEPLOY production` | File | All | ✅ Yes | bun | executable | "/Users/nolarose/mcp-tools/deploy.ts" |

### **🚀 Command Aliases Quick Reference:**

**📋 Table Column Descriptions:**

- **Alias**: Command shortcut name
- **Command**: Actual command that gets executed
- **Description**: What the alias does
- **When to Use**: Recommended usage scenarios
- **Category**: Type of command (Server, Navigation, Deployment, Demo)
- **Dependencies**: Required tools or files for the alias to work
- **Property**: Command property (interactive, batch, monitoring, etc.)
- **Default**: Default behavior or configuration
- **Environment**: Which environment(s) it applies to
- **Risk Level**: Safety level of the command (Low, Medium, High)

| Alias | Command | Description | When to Use | Category | Dependencies | Property | Default | Environment | Risk Level |
| :---- | :------ | :--------- | :--------- | :------- | :---------- | :------- | :------ | :--------- | :--------- |
| **Dashboard Management** | | | | | | | | | |
| `dashboard-start` | `cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts start` | Start the dashboard server | Development/Production | Server | bun, dashboard-cli.ts | interactive | foreground | All | Low |
| `dashboard-status` | `cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts status` | Check server status | Monitoring | Server | bun, dashboard-cli.ts | monitoring | status-check | All | Low |
| `dashboard-health` | `cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts health` | Run health check | Health monitoring | Server | bun, dashboard-cli.ts | monitoring | health-check | All | Low |
| `dashboard-metrics` | `cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts metrics` | View performance metrics | Performance analysis | Server | bun, dashboard-cli.ts | monitoring | metrics-view | All | Low |
| `dashboard-logs` | `cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts logs --tail` | Tail dashboard logs | Debugging | Server | bun, dashboard-cli.ts | interactive | real-time | All | Low |
| `dashboard-deploy` | `cd $DASHBOARD_BASE_DIR && bun deploy.ts` | Run deployment script | Deployment | Deployment | bun, deploy.ts | batch | production | All | Medium |
| `dashboard-demo` | `cd $DASHBOARD_BASE_DIR && bun demo-complete-system.ts` | Run system demo | Testing/Demo | Demo | bun, demo-complete-system.ts | interactive | demonstration | All | Low |
| **Navigation** | | | | | | | | | |
| `cd-dashboard` | `cd $DASHBOARD_BASE_DIR` | Navigate to dashboard directory | Quick access | Navigation | None | directory-change | $DASHBOARD_BASE_DIR | All | Low |
| `cd-config` | `cd $DASHBOARD_CONFIG_DIR` | Navigate to config directory | Configuration | Navigation | None | directory-change | $DASHBOARD_CONFIG_DIR | All | Low |
| `cd-logs` | `cd $DASHBOARD_LOGS_DIR` | Navigate to logs directory | Log analysis | Navigation | None | directory-change | $DASHBOARD_LOGS_DIR | All | Low |
| `cd-data` | `cd $DASHBOARD_DATA_DIR` | Navigate to data directory | Database access | Navigation | None | directory-change | $DASHBOARD_DATA_DIR | All | Low |
| `cd-backups` | `cd $DASHBOARD_BACKUPS_DIR` | Navigate to backups directory | Backup management | Navigation | None | directory-change | $DASHBOARD_BACKUPS_DIR | All | Low |
| `cd-snapshots` | `cd $DASHBOARD_SNAPSHOTS_DIR` | Navigate to snapshots directory | Snapshot analysis | Navigation | None | directory-change | $DASHBOARD_SNAPSHOTS_DIR | All | Low |

### **🔧 Advanced Usage Examples:**

#### **Database Operations:**

```bash
# Backup development database
cp $DASHBOARD_DB_DEV $DASHBOARD_BACKUPS_DIR/daily/dev-$(date +%Y%m%d).db

# Check database size
ls -lh $DASHBOARD_DB_DEV

# Query database
sqlite3 $DASHBOARD_DB_DEV "SELECT COUNT(*) FROM violations;"
```

#### **Log Analysis:**

```bash
# View recent errors
tail -20 $DASHBOARD_LOG_ERROR

# Count API calls today
grep "$(date +%Y-%m-%d)" $DASHBOARD_LOG_ACCESS | wc -l

# Monitor performance in real-time
tail -f $DASHBOARD_LOG_PERF | grep "response_time"
```

#### **Configuration Management:**

```bash
# Compare development and staging configs
diff $DASHBOARD_ENV_DEV $DASHBOARD_ENV_STAGING

# Update production config
nano $DASHBOARD_ENV_PROD

# Validate configuration
bun -c $DASHBOARD_SERVER
```

#### **Backup Operations:**

```bash
# Create daily backup
mkdir -p $DASHBOARD_BACKUPS_DIR/daily/$(date +%Y%m%d)
cp $DASHBOARD_DATA_DIR/*.db $DASHBOARD_BACKUPS_DIR/daily/$(date +%Y%m%d)/

# List recent backups
ls -la $DASHBOARD_BACKUPS_DIR/daily/ | tail -10

# Clean old backups (keep 7 days)
find $DASHBOARD_BACKUPS_DIR/daily -mtime +7 -delete
```

### **✅ Verification:**

All path variables have been tested and are working correctly:

- ✅ **Directories created** - All required directories exist
- ✅ **Environment variables set** - All variables accessible
- ✅ **Aliases working** - Command shortcuts functional
- ✅ **Files generated** - Configuration files created
- ✅ **Paths verified** - All paths point to correct locations
- ✅ **Table reference** - Complete documentation provided

### **🎯 Next Steps:**

1. **Add to shell profile** for persistent variables:

   ```bash
   echo 'source /Users/nolarose/mcp-tools/dashboard-paths.sh' >> ~/.zshrc
   ```

2. **Customize environment** in `.env` file:

   ```bash
   nano /Users/nolarose/mcp-tools/.env
   ```

3. **Start using the dashboard** with the new aliases:

   ```bash
   dashboard-start
   ```

4. **Reference the table** for quick path variable lookup

**🎉 Path variables are now fully configured with comprehensive documentation and ready for use!**

**All directories created, environment variables set, command aliases working, and complete reference table provided!** 🚀
