# CLI Commands Quick Reference

**11.0.9.0.0.0.0: Quick Reference Guide**

Fast lookup for common CLI commands and their version numbers.

## Most Used Commands

### Telegram (`11.1.0.0.0.0.0`)

```bash
# Send message
bun run telegram send "Message" --topic 2 --pin  # 11.1.1.1.0.0.0

# List topics
bun run telegram list-topics  # 11.1.1.2.0.0.0

# View history
bun run telegram history --topic=2 --limit=10  # 11.1.1.4.0.0.0
```

### MCP Tools (`11.2.0.0.0.0.0`)

```bash
# List all tools
bun run mcp list  # 11.2.1.0.0.0.0

# Execute tool
bun run mcp exec tooling-diagnostics  # 11.2.2.0.0.0.0
```

### Dashboard (`11.3.0.0.0.0.0`)

```bash
# Start dashboard
bun run dashboard  # 11.3.0.0.0.0.0

# Run once
bun run dashboard --once  # 11.3.1.0.0.0.0
```

### Data Import (`11.4.0.0.0.0.0`)

```bash
# Import CSV
bun run fetch import file.csv  # 11.4.1.0.0.0.0

# Fetch from exchange
bun run fetch api binance KEY SECRET BTC/USD  # 11.4.2.0.0.0.0

# View stats
bun run fetch stats  # 11.4.1.2.0.0.0
```

### Security (`11.5.0.0.0.0.0`)

```bash
# Web pentest
bun security pentest web --target=https://example.com  # 11.5.1.1.0.0.0

# Generate SRI
bun security sri generate --files="dist/*.js"  # 11.5.3.1.0.0.0
```

## Version Quick Lookup

| Command | Version | File |
|---------|---------|------|
| `telegram send` | `11.1.1.1.0.0.0` | telegram.md |
| `telegram list-topics` | `11.1.1.2.0.0.0` | telegram.md |
| `mcp list` | `11.2.1.0.0.0.0` | mcp.md |
| `mcp exec` | `11.2.2.0.0.0.0` | mcp.md |
| `dashboard` | `11.3.0.0.0.0.0` | dashboard.md |
| `fetch import` | `11.4.1.0.0.0.0` | fetch.md |
| `fetch api` | `11.4.2.0.0.0.0` | fetch.md |
| `security pentest web` | `11.5.1.1.0.0.0` | security.md |
| `security sri generate` | `11.5.3.1.0.0.0` | security.md |
| `management status` | `11.6.1.1.0.0.0` | management.md |

## Keyboard Shortcuts (Dashboard)

- `q` - Quit (`11.3.2.1.0.0.0`)
- `r` - Refresh (`11.3.2.1.0.0.0`)
- `a` - Arbitrage view (`11.3.7.2.0.0.0`)
- `s` - Streams view (`11.3.7.3.0.0.0`)
- `w` - Trading view (`11.3.7.4.0.0.0`)
- `o` - Sports betting view (`11.3.7.5.0.0.0`)

## Environment Variables

- `TELEGRAM_BOT_TOKEN` (`11.1.4.0.0.0.0`)
- `TELEGRAM_CHAT_ID` (`11.1.4.0.0.0.0`)
- `API_URL` (`11.3.6.0.0.0.0`)

## See Also

- [README.md](./README.md) - Full command index
- [VERSION-INDEX.md](./VERSION-INDEX.md) - Complete version reference
- [VERSIONING.md](./VERSIONING.md) - Versioning system documentation
