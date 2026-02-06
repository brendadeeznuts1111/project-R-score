# Covert Steam Alert Mini App & Console Integration

Deep integration of CovertSteamEvent alerts with Telegram Mini App (TMA) and enhanced console display using Bun.inspect.table().

## Overview

This integration provides:
- **Telegram Mini App API endpoints** for alert management
- **Interactive console CLI** using Bun's console AsyncIterable
- **Tabular data display** using Bun.inspect.table()
- **Bot integration** with Mini App deep links
- **MCP tools** with table output

## Telegram Mini App API Endpoints

### GET /api/miniapp/alerts/covert-steam

Get list of Covert Steam alerts for TMA display.

**Query Parameters:**
- `severity` (number, optional) - Filter by minimum severity score
- `bookmaker` (string, optional) - Filter by bookmaker name
- `limit` (number, optional) - Maximum results (default: 50)
- `acknowledged` (boolean, optional) - Filter by acknowledgment status

**Response:** `TMAAlertListResponse` with alerts array and metadata

**Example:**
```bash
curl "http://localhost:3001/api/miniapp/alerts/covert-steam?severity=7&limit=20"
```

### POST /api/miniapp/alerts/covert-steam

Create and send a new Covert Steam alert.

**Request Body:**
```json
{
  "event_identifier": "NFL-2025-001",
  "detection_timestamp": 1704556800000,
  "bookmaker_name": "DraftKings",
  "source_dark_node_id": "node_abc123",
  "impact_severity_score": 9.5,
  "topicId": 2,
  "pinMessage": true
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "id": "NFL-2025-001-1704556800000",
    "messageId": 12345,
    "deepLink": "http://localhost:8080/alert/covert-steam/?id=..."
  }
}
```

### GET /api/miniapp/alerts/covert-steam/:id

Get a specific alert by ID.

### GET /api/miniapp/alerts/covert-steam/stats

Get statistics about Covert Steam alerts.

**Response:**
```json
{
  "total": 42,
  "bySeverity": {
    "critical": 8,
    "high": 15,
    "medium": 12,
    "low": 7
  },
  "byBookmaker": {
    "DraftKings": 18,
    "Betfair": 12,
    "FanDuel": 12
  },
  "recentAlerts": [...]
}
```

## Bun.inspect.table() Integration

### Console CLI Tables

The interactive console uses `Bun.inspect.table()` for beautiful tabular display:

```typescript
// Example: Display alerts table
const tableData = alerts.map(alert => ({
  Event: alert.event_identifier,
  Bookmaker: alert.bookmaker_name || "N/A",
  Severity: `${alert.impact_severity_score} ${emoji}`,
  Timestamp: new Date(alert.detection_timestamp).toISOString(),
}));

// Bun.inspect.table() API:
// - Second param: array of property names to display
// - Third param (optional): options object with { colors: true }
console.log(
  Bun.inspect.table(tableData, ["Event", "Bookmaker", "Severity", "Timestamp"], {
    colors: true,
  })
);
```

### Table Display Functions

Located in `src/cli/covert-steam-table.ts`:

1. **displayAlertsTable()** - Display alerts in table format
2. **displaySeverityThresholdsTable()** - Show severity thresholds
3. **displayTopicsTable()** - List Telegram topics
4. **displayAlertStatsTable()** - Show alert statistics

### MCP Tools with Tables

MCP tools return formatted tables:

```typescript
// covert-steam-list-topics returns:
Bun.inspect.table(topicTableData, {
  columns: ["Topic", "Thread ID", "Logical ID"],
  header: true,
})
```

## Interactive Console Features

### Bun Console AsyncIterable

Uses Bun's native console AsyncIterable for stdin reading:

```typescript
// Read from stdin line by line
for await (const line of console) {
  const trimmed = line.trim();
  // Process command...
  printPrompt();
}
```

### Console Depth Configuration

Configure object inspection depth in `bunfig.toml`:

```toml
[console]
depth = 5  # Default depth for nested objects
```

Override per run:
```bash
bun --console-depth=10 run src/cli/covert-steam.ts
```

### Commands with Table Output

- `topics` - Displays topics table
- `severity <score>` - Displays severity thresholds table
- `list` / `alerts` - Displays alerts table
- `stats` - Displays statistics tables

## Bot Integration

### Mini App Deep Links in Alerts

Alerts sent to Telegram include two links:

1. **Dashboard Deep Link** - RFC 001 compliant link to dashboard
2. **Mini App Link** - Direct link to open in Telegram Mini App

**Example Alert Message:**
```html
🚨 <b>CRITICAL Covert Steam Alert!</b>

<b>Event:</b> <code>NFL-2025-001</code>
<b>Bookmaker:</b> <code>DraftKings</code>
<b>Severity:</b> <code>9.5</code>/10

<a href="http://localhost:8080/alert/covert-steam/?id=...">View Details on Dashboard</a>
<a href="https://staging.factory-wager-miniapp.pages.dev/alert/covert-steam/?id=...">Open in Mini App</a>
```

### Mini App URL Configuration

Set via environment variable:
```bash
export MINIAPP_URL="https://staging.factory-wager-miniapp.pages.dev"
```

Or use default: `https://staging.factory-wager-miniapp.pages.dev`

## MCP Tools Enhanced

### Tabular Output Tools

1. **covert-steam-list-topics** - Returns formatted table
2. **covert-steam-get-severity-info** - Returns threshold table
3. **covert-steam-list-alerts** - Returns alerts table
4. **covert-steam-alert-stats** - Returns statistics tables

### Example MCP Response

```json
{
  "content": [{
    "text": "📋 Available Telegram Topics\n\n┌─────────────┬───────────┬────────────┐\n│ Topic       │ Thread ID │ Logical ID │\n├─────────────┼───────────┼────────────┤\n│ Live Alerts │ 91        │ live-alerts│\n└─────────────┴───────────┴────────────┘\n"
  }]
}
```

## Usage Examples

### Interactive Console

```bash
# Start console
bun run covert-steam

covert-steam> topics
📋 Available Telegram Topics

┌─────────────┬───────────┬────────────┐
│ Topic       │ Thread ID │ Logical ID │
├─────────────┼───────────┼────────────┤
│ Live Alerts │ 91        │ live-alerts│
└─────────────┴───────────┴────────────┘

covert-steam> severity 9.5
📊 Severity Analysis for Score: 9.5

┌──────────┬──────────────┬───────┬──────────┬────────┐
│ Level    │ Range        │ Emoji │ Auto-Pin  │ Current│
├──────────┼──────────────┼───────┼──────────┼────────┤
│ CRITICAL │ >= 9         │ 🚨    │ Yes       │ ✓      │
│ HIGH     │ >= 7 and < 9 │ ⚠️    │ No        │        │
└──────────┴──────────────┴───────┴──────────┴────────┘

covert-steam> list --limit=5
📋 Recent Covert Steam Alerts

┌──────────────┬────────────┬─────────────┬─────────────────────┐
│ Event        │ Bookmaker  │ Severity    │ Timestamp          │
├──────────────┼────────────┼─────────────┼─────────────────────┤
│ NFL-2025-001 │ DraftKings │ 9.5 🚨      │ 2025-01-06 12:00:00│
└──────────────┴────────────┴─────────────┴─────────────────────┘
```

### API Usage

```bash
# Get alerts for Mini App
curl "http://localhost:3001/api/miniapp/alerts/covert-steam?severity=7"

# Create alert via API
curl -X POST "http://localhost:3001/api/miniapp/alerts/covert-steam" \
  -H "Content-Type: application/json" \
  -d '{
    "event_identifier": "NFL-2025-001",
    "detection_timestamp": 1704556800000,
    "bookmaker_name": "DraftKings",
    "impact_severity_score": 9.5
  }'

# Get statistics
curl "http://localhost:3001/api/miniapp/alerts/covert-steam/stats"
```

## Configuration

### Console Depth

**bunfig.toml:**
```toml
[console]
depth = 5  # Object inspection depth
```

**CLI Override:**
```bash
bun --console-depth=10 run src/cli/covert-steam.ts
```

### Mini App URL

**Environment Variable:**
```bash
export MINIAPP_URL="https://production.factory-wager-miniapp.pages.dev"
```

**Default:** `https://staging.factory-wager-miniapp.pages.dev`

## Architecture

### Data Flow

```text
CovertSteamEvent Detection
    ↓
sendCovertSteamAlertToTelegram()
    ↓
formatCovertSteamAlert() → Generates deep-link + Mini App link
    ↓
Telegram Message (with both links)
    ↓
User clicks "Open in Mini App"
    ↓
TMA loads /api/miniapp/alerts/covert-steam/:id
    ↓
Displays alert details in Mini App UI
```

### Components

1. **API Layer** (`src/api/covert-steam-alerts.ts`)
   - TMA endpoints for alert management
   - Alert storage (in-memory, replace with database)

2. **Console CLI** (`src/cli/covert-steam.ts`)
   - Interactive console using Bun AsyncIterable
   - Table display using Bun.inspect.table()

3. **Table Utilities** (`src/cli/covert-steam-table.ts`)
   - Reusable table display functions
   - Consistent formatting across CLI and MCP

4. **MCP Tools** (`src/mcp/tools/covert-steam-alerts.ts`)
   - Enhanced with table output
   - Programmatic access to alert management

5. **Alert Formatter** (`src/telegram/covert-steam-alert.ts`)
   - Generates both dashboard and Mini App links
   - RFC 001 compliant deep-link generation

## Benefits

1. **Rich Data Visualization** - Tables make data easy to scan
2. **Mini App Integration** - Direct access from Telegram alerts
3. **Interactive Console** - Native Bun stdin reading
4. **Consistent Formatting** - Bun.inspect.table() everywhere
5. **Programmatic Access** - MCP tools for automation
6. **API-First Design** - TMA can fetch alerts programmatically

## See Also

- [Covert Steam CLI Documentation](./COVERT-STEAM-CLI.md)
- [RFC 001: Telegram Deep-Link Standard](./rfc/001-telegram-deeplink-standard.md)
- [Telegram Mini App Documentation](./9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9111100)
- [Bun.inspect.table() Documentation](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata%2C-properties%2C-options)
