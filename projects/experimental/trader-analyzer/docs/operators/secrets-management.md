# Secrets Management Guide

## Overview

The secrets management system provides secure, role-based access to Bun.secrets for managing API keys, tokens, and other sensitive configuration data. All operations require senior-engineer role authorization.

## Quick Commands

```bash
# View all secrets (requires senior-engineer role)
bun run secrets:list

# Set a new API key
bun run secrets:set --service=nexus --name=mcp.bun.apiKey --value="sk-..."

# Delete a secret
bun run secrets:delete --service=nexus --name=mcp.bun.apiKey

# Rotate all secrets (90-day compliance)
bun run secrets:rotate

# Emergency rotation (if compromised)
bun run secrets:emergency-rotate

# Provision initial secrets (production/staging)
bun run secrets:provision --environment=production

# Check rotation status
bun run secrets:rotate:status

# View version history
bun run secrets:versions --service=nexus --name=mcp.bun.apiKey

# Rollback to previous version
bun run secrets:rollback --service=nexus --name=mcp.bun.apiKey --version=2
```

## Services & Keys

### Nexus (MCP API Keys)
- `mcp.bun.apiKey` - Bun API key for MCP operations
- `mcp.openai.apiKey` - OpenAI API key
- `mcp.anthropic.apiKey` - Anthropic API key

### Telegram (Bot Tokens)
- `telegram.bot.token` - Telegram bot token
- `telegram.chat.id` - Default chat ID

### GitHub (API Tokens)
- `github.token` - GitHub personal access token
- `github.app.id` - GitHub App ID

### Database (Connection Strings)
- `database.url` - Database connection URL
- `database.password` - Database password

## Tmux Integration

```bash
Ctrl-Space + S  # Open secrets management window
# Shows: Secrets dashboard with access status, recent logs, and available commands
```

The secrets management window displays:
- **Access Status**: Whether you have permission to view/manage secrets
- **Rotation Status**: Compliance status, last rotation, and next due date
- **Recent Logs**: Last 5 secret-related access log entries
- **Available Commands**: Quick reference for all secrets CLI commands

**Example Dashboard Output:**
```text
🔐 Secrets Management Dashboard
=================================

❌ Access denied - senior-engineer role required

🔄 Rotation Status:
🔄 Secrets Rotation Status
==========================
Last Rotation: Never (rotation not yet implemented)
Next Rotation Due: N/A
Compliance Status: ⚠️  Non-compliant (no rotation tracking)

📋 Recent Access Logs:
No recent secret access logs

💻 Available Commands:
  bun run secrets:list    - List all secrets
  bun run secrets:set     - Set new secret
  bun run secrets:delete  - Delete secret
  bun run secrets:rotate  - Rotate all secrets
```

## Security Features

- **Role-based Access**: Integrated with `src/auth/secret-guard.ts` for consistent authorization
- **Granular Permissions**: Read/write/delete permissions based on operator role
- **Audit Logging**: All operations logged with structured logging and operator tracking
- **Secure Storage**: Uses Bun.secrets (OS-native keychain integration)
- **Version Control**: Automatic version tracking for all secrets (rollback support)
- **Compliance**: 90-day rotation enforcement with version history
- **Validation**: Input sanitization and format validation
- **Session Management**: Operator session tracking via `src/secrets/operator-session.ts`

## Version Control

All secrets are automatically versioned when set or rotated:

- **Automatic Versioning**: Each `set()` operation creates a new version
- **Version History**: Last 10 versions are retained for rollback
- **Version Metadata**: Tracks timestamp, operator, reason (rotation/manual/emergency/rollback)
- **Rollback Support**: Restore previous versions if needed

**Example**:
```bash
# View version history
bun run secrets:versions --service=nexus --name=mcp.bun.apiKey

# Output:
# Current Version: 3
# Last Rotation: 2025-12-07T12:00:00.000Z
# Versions:
#   v3 - 2025-12-07T12:00:00.000Z (rotation) [abc123def456]
#   v2 - 2025-11-01T10:00:00.000Z (manual) [xyz789uvw012]
#   v1 - 2025-10-01T08:00:00.000Z (manual) [def456ghi789]

# Rollback to version 2
bun run secrets:rollback --service=nexus --name=mcp.bun.apiKey --version=2
```
## Role-Based Permissions

| Role | Read | Write | Delete | Description |
|------|------|-------|--------|-------------|
| senior-engineer | ✅ | ✅ | ✅ | Full access to all secret operations |
| engineer | ✅ | ❌ | ❌ | Read-only access for development |
| analyst | ✅ | ❌ | ❌ | Read-only access for analysis |

## Usage Examples

### Setting API Keys (senior-engineer only)
```bash
# Set Bun API key for MCP
bun run secrets:set --service=nexus --name=mcp.bun.apiKey --value="sk-1234567890abcdef"

# Set Telegram bot token
bun run secrets:set --service=telegram --name=telegram.bot.token --value="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
```

### Managing Secrets
```bash
# List all secrets (requires senior-engineer role)
bun run secrets:list

# Delete expired key (requires senior-engineer role)
bun run secrets:delete --service=nexus --name=mcp.expired.apiKey

# Rotate all secrets (requires senior-engineer role)
bun run secrets:rotate --all
```

## Implementation Details

- **Backend**: Bun.secrets API with macOS Keychain/Linux libsecret/Windows Credential Manager
- **CLI**: TypeScript CLI with role-based authorization
- **Logging**: Structured logging with audit trails
- **Tmux**: Integrated keyboard shortcuts for operators

## Troubleshooting

### Access Denied
- Ensure you have senior-engineer role in operator session
- Check operator session is active: `bun run mgmt auth status`

### Secret Not Found
- Verify service and name spelling
- Check if secret exists: `bun run secrets:list`

### Rotation Failed
- Check rotation cron is scheduled: `bun run secrets:rotate:status`
- Verify operator has write permissions
- Review rotation logs for errors

## Emergency Procedures

If secrets are compromised:

**IMMEDIATE**: Run `bun run secrets:emergency-rotate`

**VERIFY**: Check audit_log for unauthorized access (HBSE-006 codes)

**NOTIFY**: Alert compliance team per incident response plan

**Reference**: @docs/security/incident-response.md

## Deployment Checklist

```bash
# 1. Provision signing key
gpg --gen-key
gh secret set SIGNING_KEY < signing.key

# 2. Initialize keychain on production servers
# macOS: Keychain is automatic
# Linux: apt install libsecret-1-0
# Windows: Credential Manager is built-in

# 3. Seed initial secrets
bun run secrets:provision --environment=production

# 4. Verify access controls
# Test with analyst role (should fail on write/delete)
# Expected: PERMISSION_DENIED

# 5. Run integration tests
bun test test/integration/secrets.test.ts

# 6. Deploy to staging
# (Use your deployment process)

# 7. Monitor audit logs for 24h
tmux attach -t mlgs-monitoring
# Watch for HBSE-* codes
```

## Monitoring & Alerting

### Prometheus Metrics

All secret operations are tracked via Prometheus metrics:

- `hyperbun_secret_access_total` - Access attempts (success/denied/error)
- `hyperbun_secret_rotation_timestamp` - Rotation events
- `hyperbun_secret_validation_errors_total` - Validation failures
- `hyperbun_emergency_rotation_total` - Emergency rotations

**Reference**: @docs/VERIFY-SECRETS-METRICS.md

### Alert Rules

Prometheus alert rules are defined in `.github/workflows/secrets-alerts.yml`:

- **UnauthorizedSecretAccess** - Critical alert for denied access attempts
- **SecretRotationOverdue** - High alert for secrets not rotated in 90+ days
- **SecretValidationErrors** - Medium alert for validation failures
- **EmergencyRotationExecuted** - Critical alert for emergency rotations

**Reference**: @docs/security/incident-response.md
