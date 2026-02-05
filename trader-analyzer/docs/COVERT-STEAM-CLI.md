# Covert Steam Alert CLI & Console

Interactive console interface and CLI commands for managing CovertSteamEvent alerts.

## Quick Start

### Interactive Console

```bash
# Start interactive console
bun run covert-steam

# Or use the alias
bun run covert-steam:console
```

### CLI Commands

```bash
# Send alert via CLI
bun run telegram covert-steam send "NFL-2025-001" --severity=9.5 --bookmaker="DraftKings"

# Format preview
bun run telegram covert-steam format "NFL-2025-001" --severity=7.5

# List topics
bun run telegram covert-steam list-topics

# Test credentials
bun run telegram covert-steam test-credentials

# Get severity info
bun run telegram covert-steam severity-info 9.5
```

## Interactive Console Commands

The interactive console uses Bun's `console` AsyncIterable for reading from stdin:

### Available Commands

- `send <event_id> [options]` - Send Covert Steam alert
- `format <event_id> [options]` - Format alert preview
- `topics` - List available topics
- `credentials` - Test Telegram credentials
- `severity <score>` - Get severity level info
- `help` - Show help message
- `exit`, `quit`, `q` - Exit console

### Examples

```bash
# Start console
$ bun run covert-steam

covert-steam> send NFL-2025-001 --severity=9.5 --bookmaker=DraftKings
📤 Sending alert: NFL-2025-001...
✅ Alert sent successfully!
   Message ID: 12345
   Topic: 2
   Pinned: Yes

covert-steam> format NFL-2025-002 --severity=7.5
📋 Alert Preview
Severity: HIGH ⚠️
Event: NFL-2025-002
Timestamp: 2025-01-06T12:00:00.000Z
────────────────────────────────────────────────────────────
🚨 HIGH Covert Steam Alert!
...

covert-steam> severity 9.5
📊 Severity Analysis for Score: 9.5
Level: CRITICAL 🚨
Auto-Pin: Yes (CRITICAL threshold)
...

covert-steam> exit
👋 Goodbye!
```

## Console Configuration

### bunfig.toml

Console depth is configured in `bunfig.toml`:

```toml
[console]
# Object inspection depth for console.log() output
# Higher depth shows more nested object details
depth = 5
```

### CLI Override

Override console depth per run:

```bash
# Use deeper inspection for debugging
bun --console-depth=10 run src/cli/covert-steam.ts

# Use shallow inspection for cleaner output
bun --console-depth=2 run src/cli/covert-steam.ts
```

## Features

### Bun Console AsyncIterable

The console uses Bun's native `console` AsyncIterable feature:

```typescript
// Read from stdin line by line
for await (const line of console) {
  // Process command
}
```

This provides:
- ✅ Native stdin reading without external dependencies
- ✅ Clean async/await syntax
- ✅ Automatic line buffering
- ✅ Graceful Ctrl+C handling

### Object Inspection Depth

Configure how deeply nested objects are displayed:

- **Default**: Depth 5 (configured in bunfig.toml)
- **CLI Override**: `--console-depth <number>`
- **Use Cases**:
  - Depth 2-3: Quick overview
  - Depth 5: Standard detail (default)
  - Depth 7-10: Full debugging detail

### Error Handling

- Graceful error messages with emoji indicators
- Helpful suggestions for common errors
- Credential validation before sending
- Topic ID validation

## MCP Integration

The same functionality is available via MCP tools:

```typescript
// Send alert via MCP
await mcpServer.callTool("covert-steam-send-alert", {
  eventIdentifier: "NFL-2025-001",
  detectionTimestamp: Date.now(),
  bookmakerName: "DraftKings",
  impactSeverityScore: 9.5
});

// Format preview
await mcpServer.callTool("covert-steam-format-alert", {
  eventIdentifier: "NFL-2025-001",
  detectionTimestamp: Date.now(),
  impactSeverityScore: 7.5
});
```

## Configuration

### Environment Variables

```bash
# Telegram credentials (required)
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="-1001234567890"

# Or use Bun.secrets (recommended)
bun secret set TELEGRAM_BOT_TOKEN "your_bot_token"
bun secret set TELEGRAM_CHAT_ID "-1001234567890"
```

### Console Depth

Set in `bunfig.toml` or override via CLI:

```bash
# Persistent configuration
[console]
depth = 5

# Per-run override
bun --console-depth=7 run src/cli/covert-steam.ts
```

## Troubleshooting

### Console Not Responding

If the console doesn't respond to input:
- Ensure you're running in an interactive terminal
- Check that stdin is not redirected
- Try running with explicit console depth: `bun --console-depth=5 run src/cli/covert-steam.ts`

### Object Display Too Shallow/Deep

Adjust console depth:
- Increase: `bun --console-depth=10 run src/cli/covert-steam.ts`
- Decrease: `bun --console-depth=2 run src/cli/covert-steam.ts`
- Or update `bunfig.toml`: `depth = 7`

### Credentials Not Found

```bash
# Test credentials
bun run telegram covert-steam test-credentials

# Set credentials
bun secret set TELEGRAM_BOT_TOKEN "your_token"
bun secret set TELEGRAM_CHAT_ID "your_chat_id"
```

## See Also

- [Telegram CLI Documentation](./TELEGRAM-CLI.md)
- [RFC 001: Telegram Deep-Link Standard](./rfc/001-telegram-deeplink-standard.md)
- [Communication & Notification Documentation](./9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md)
