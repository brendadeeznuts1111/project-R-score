# Covert Steam Inspectable Types

Custom `Bun.inspect.custom` implementations for Covert Steam alert types, providing beautiful console output for debugging and development.

## Overview

The inspectable wrappers enhance `Bun.inspect()` output for Covert Steam types, making debugging easier with formatted, readable representations.

## InspectableCovertSteamAlert

Wrapper class for `CovertSteamEventRecord` with custom inspect implementation.

### Usage

```typescript
import { makeInspectable, InspectableCovertSteamAlert } from "./types/covert-steam-inspectable";

const alert = {
  event_identifier: "NFL-2025-001",
  detection_timestamp: Date.now(),
  bookmaker_name: "DraftKings",
  impact_severity_score: 9.5,
  source_dark_node_id: "node_abc123",
};

// Create inspectable wrapper
const inspectable = makeInspectable(alert);

// Use Bun.inspect() for formatted output
console.log(Bun.inspect(inspectable));
// =>
// CovertSteamAlert {
//   event: "NFL-2025-001"
//   bookmaker: "DraftKings"
//   severity: "9.5 🚨 CRITICAL"
//   detected: "2025-01-06T12:00:00.000Z"
//   node: "node_abc123"
// }
```

### Features

- **Formatted severity display** - Shows score, emoji, and level (e.g., "9.5 🚨 CRITICAL")
- **ISO timestamp formatting** - Human-readable detection time
- **Selective field display** - Only shows fields that are present
- **JSON serialization** - `toJSON()` method returns plain object

### API

```typescript
class InspectableCovertSteamAlert implements CovertSteamEventRecord {
  constructor(alert: CovertSteamEventRecord);
  
  [Bun.inspect.custom](depth: number, options: any): string;
  toJSON(): CovertSteamEventRecord;
}

function makeInspectable(alert: CovertSteamEventRecord): InspectableCovertSteamAlert;
```

## InspectableCovertSteamSendResult

Wrapper for alert send results with custom inspect.

### Usage

```typescript
import { InspectableCovertSteamSendResult } from "./types/covert-steam-inspectable";

const result = new InspectableCovertSteamSendResult({
  ok: true,
  messageId: 12345,
});

console.log(Bun.inspect(result));
// =>
// CovertSteamSendResult {
//   ok: true
//   messageId: 12345
// }
```

### Error Result

```typescript
const errorResult = new InspectableCovertSteamSendResult({
  ok: false,
  error: "Invalid topic ID",
});

console.log(Bun.inspect(errorResult));
// =>
// CovertSteamSendResult {
//   ok: false
//   error: "Invalid topic ID"
// }
```

## Integration with CLI

The interactive console CLI automatically uses inspectable wrappers:

```bash
bun run covert-steam

covert-steam> format TEST-001 --severity=9.5 --bookmaker=DraftKings

📋 Alert Preview

CovertSteamAlert {
  event: "TEST-001"
  bookmaker: "DraftKings"
  severity: "9.5 🚨 CRITICAL"
  detected: "2025-01-06T12:00:00.000Z"
}

────────────────────────────────────────────────────────────
🚨 <b>CRITICAL Covert Steam Alert!</b>
...
```

## Benefits

1. **Better Debugging** - Formatted output makes it easy to see alert details
2. **Consistent Formatting** - All alerts display in the same format
3. **Severity Visualization** - Emoji and level make severity immediately clear
4. **Type Safety** - Implements the same interface, so it's a drop-in replacement
5. **JSON Compatible** - `toJSON()` ensures serialization works correctly

## Implementation Details

### Custom Inspect Symbol

Uses `Bun.inspect.custom` (identical to Node.js `util.inspect.custom`):

```typescript
[Bun.inspect.custom](depth: number, options: any): string {
  // Custom formatting logic
  return formattedString;
}
```

### Severity Formatting

Automatically formats severity with emoji and level:
- `9.5 🚨 CRITICAL` - Score >= 9
- `7.2 ⚠️ HIGH` - Score >= 7 and < 9
- `5.5 📈 MEDIUM` - Score >= 5 and < 7
- `3.0 📊 LOW` - Score < 5

### Timestamp Formatting

Converts epoch milliseconds to ISO 8601 format:
- Input: `1704556800000`
- Output: `"2025-01-06T12:00:00.000Z"`

## See Also

- [Bun.inspect() Documentation](https://bun.com/docs/runtime/utils#bun-inspect)
- [Bun.inspect.custom Documentation](https://bun.com/docs/runtime/utils#bun-inspect-custom)
- [Covert Steam CLI Documentation](./COVERT-STEAM-CLI.md)
- [Covert Steam Mini App Integration](./COVERT-STEAM-MINIAPP-INTEGRATION.md)
