# Management & Integration CLI

**Unified CLI for managing services, integrations, and configurations**

---

## Quick Start

```bash
# Show help
bun run management help

# Check service status
bun run management services

# Check integration status
bun run management integrations

# Run full health check
bun run management health
```

---

## Commands

### Services

List all service statuses (API, Dashboard, MCP, Telegram).

```bash
bun run management services
# or
bun run services
```

**Output:**
- Service name
- Status (RUNNING, STOPPED, ERROR)
- Port number (if applicable)

---

### Integrations

List all integration statuses (Telegram, Database, API, MCP).

```bash
bun run management integrations
# or
bun run integrations
```

**Output:**
- Integration name with icon
- Status (CONNECTED, DISCONNECTED, ERROR)
- Type (API, Database, Service, External)

---

### Test Integration

Test a specific integration to verify connectivity and configuration.

```bash
bun run management test <integration>
```

**Examples:**
```bash
bun run management test telegram
bun run management test database
bun run management test api
bun run management test mcp
```

**Output:**
- Connection status
- Configuration details (if applicable)
- Error messages (if disconnected)

---

### Configuration

Show current system configuration.

```bash
bun run management config
# or
bun run config
```

**Shows:**
- API Port
- Environment (development/production)
- Bun Version
- Telegram Bot Token (configured/not configured)
- Telegram Chat ID (configured/not configured)
- MCP Server URL
- Database Path

---

### Validate Configuration

Validate all configuration settings and check for required components.

```bash
bun run management validate
# or
bun run validate
```

**Checks:**
- Telegram Bot Token (optional)
- Telegram Chat ID (optional)
- Database File (required)
- API Server (optional)

**Output:**
- ✓ or ✗ for each check
- Status (OK, REQUIRED, OPTIONAL)

---

### Health Check

Run a comprehensive health check of all services, integrations, and configuration.

```bash
bun run management health
# or
bun run health
```

**Includes:**
- Service statuses
- Integration statuses
- Configuration validation

---

## Shortcuts

All commands have convenient shortcuts:

```bash
# Full command
bun run management <command>

# Shortcut alias
bun run mgmt <command>

# Direct shortcuts (for common commands)
bun run services
bun run integrations
bun run health
bun run config
bun run validate
```

---

## Integration Types

### Telegram
- **Type:** External
- **Checks:** Bot token and chat ID configuration
- **Status:** CONNECTED if both configured, DISCONNECTED otherwise

### Database (SQLite)
- **Type:** Database
- **Checks:** Database file existence at `./data/research.db`
- **Status:** CONNECTED if file exists, DISCONNECTED otherwise

### API Server
- **Type:** API
- **Checks:** Health endpoint at `http://localhost:3001/api/health`
- **Status:** CONNECTED if responding, DISCONNECTED otherwise

### MCP Server
- **Type:** Service
- **Checks:** MCP_SERVER_URL environment variable
- **Status:** CONNECTED if configured, DISCONNECTED otherwise

---

## Examples

### Check if all services are running
```bash
bun run management services
```

### Test Telegram integration
```bash
bun run management test telegram
```

### Validate configuration before deployment
```bash
bun run management validate
```

### Full system health check
```bash
bun run management health
```

### Quick config check
```bash
bun run config
```

---

## Integration with Other CLIs

The Management CLI works alongside other CLI tools:

```bash
# Check services
bun run management services

# Then start a service if needed
bun run dev

# Check integrations
bun run management integrations

# Test Telegram integration
bun run management test telegram

# Send a Telegram message
bun run telegram send "System is healthy!"
```

---

## Error Handling

All commands include error handling:

- **Service checks** gracefully handle missing services
- **Integration tests** provide clear error messages
- **Configuration validation** shows what's missing
- **Health checks** aggregate all statuses

---

## Environment Variables

The CLI checks these environment variables:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat/supergroup ID
- `MCP_SERVER_URL` - MCP server URL
- `PORT` - API server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

---

## Related Documentation

- [Telegram CLI](./TELEGRAM-CLI.md) - Telegram-specific commands
- [MCP CLI](../src/cli/mcp.ts) - MCP tool execution
- [GitHub CLI](../src/cli/github.ts) - GitHub integration
- [Security CLI](../src/cli/security.ts) - Security testing

---

## Future Enhancements

Planned features:

- [ ] Service start/stop/restart commands
- [ ] Integration enable/disable commands
- [ ] Configuration file management
- [ ] Service logs viewing
- [ ] Performance metrics
- [ ] Alerting integration
