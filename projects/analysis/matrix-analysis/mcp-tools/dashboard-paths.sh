# Enhanced Multi-Tenant Dashboard - Persistent Path Variables
# Add this to your ~/.zshrc or ~/.bashrc

# Dashboard paths
export DASHBOARD_BASE_DIR="/Users/nolarose/mcp-tools"
export DASHBOARD_CONFIG_DIR="$DASHBOARD_BASE_DIR/config"
export DASHBOARD_DATA_DIR="$DASHBOARD_BASE_DIR/data"
export DASHBOARD_LOGS_DIR="$DASHBOARD_BASE_DIR/logs"
export DASHBOARD_BACKUPS_DIR="$DASHBOARD_BASE_DIR/backups"
export DASHBOARD_SNAPSHOTS_DIR="$DASHBOARD_BASE_DIR/snapshots"
export DASHBOARD_AUDIT_DIR="$DASHBOARD_BASE_DIR/audit-review"

# Database paths
export DASHBOARD_DB_DEV="$DASHBOARD_DATA_DIR/dev-audit.db"
export DASHBOARD_DB_STAGING="$DASHBOARD_DATA_DIR/staging-audit.db"
export DASHBOARD_DB_PROD="$DASHBOARD_DATA_DIR/prod-audit.db"
export DASHBOARD_DB_TEST="$DASHBOARD_DATA_DIR/test-audit.db"

# Configuration files
export DASHBOARD_ENV_DEV="$DASHBOARD_CONFIG_DIR/.env.development"
export DASHBOARD_ENV_STAGING="$DASHBOARD_CONFIG_DIR/.env.staging"
export DASHBOARD_ENV_PROD="$DASHBOARD_CONFIG_DIR/.env.production"

# Log files
export DASHBOARD_LOG_APP="$DASHBOARD_LOGS_DIR/dashboard.log"
export DASHBOARD_LOG_ACCESS="$DASHBOARD_LOGS_DIR/access.log"
export DASHBOARD_LOG_ERROR="$DASHBOARD_LOGS_DIR/error.log"
export DASHBOARD_LOG_AUDIT="$DASHBOARD_LOGS_DIR/audit.log"

# Server URLs
export DASHBOARD_URL_DEV="http://localhost:3333/enhanced-dashboard.html"
export DASHBOARD_URL_STAGING="https://staging.yourdomain.com/enhanced-dashboard.html"
export DASHBOARD_URL_PROD="https://dashboard.yourdomain.com/enhanced-dashboard.html"

# Ports
export DASHBOARD_PORT_DEV="3333"
export DASHBOARD_PORT_STAGING="3334"
export DASHBOARD_PORT_PROD="3335"

# Core files
export DASHBOARD_SERVER="$DASHBOARD_BASE_DIR/enhanced-dashboard.ts"
export DASHBOARD_UI="$DASHBOARD_BASE_DIR/enhanced-dashboard.html"
export DASHBOARD_CLI="$DASHBOARD_BASE_DIR/dashboard-cli.ts"
export DASHBOARD_DEPLOY="$DASHBOARD_BASE_DIR/deploy.ts"

# Dashboard aliases for convenience
alias dashboard-start="cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts start"
alias dashboard-status="cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts status"
alias dashboard-health="cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts health"
alias dashboard-metrics="cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts metrics"
alias dashboard-logs="cd $DASHBOARD_BASE_DIR && bun dashboard-cli.ts logs --tail"
alias dashboard-deploy="cd $DASHBOARD_BASE_DIR && bun deploy.ts"
alias dashboard-demo="cd $DASHBOARD_BASE_DIR && bun demo-complete-system.ts"

# Quick navigation aliases
alias cd-dashboard="cd $DASHBOARD_BASE_DIR"
alias cd-config="cd $DASHBOARD_CONFIG_DIR"
alias cd-logs="cd $DASHBOARD_LOGS_DIR"
alias cd-data="cd $DASHBOARD_DATA_DIR"
alias cd-backups="cd $DASHBOARD_BACKUPS_DIR"
alias cd-snapshots="cd $DASHBOARD_SNAPSHOTS_DIR"

echo "✅ Enhanced Dashboard paths and aliases loaded"
echo "🚀 Quick commands: dashboard-start, dashboard-status, dashboard-health"
