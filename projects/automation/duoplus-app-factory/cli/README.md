# 🖥️ CLI Tools

Command-line tools for managing and monitoring the Nebula-Flow™ system.

## Available Tools

### Lightning Dashboard
**File**: `lightning-dashboard.ts`

Interactive terminal dashboard for Lightning Network monitoring.

```bash
bun run dashboard
```

**Features**:
- Real-time channel metrics
- Yield tracking (today/quest)
- Keyboard shortcuts:
  - `r` - Rebalance channels
  - `c` - Consolidate funds
  - `s` - Show statistics
  - `q` - Quit

### Live Metrics
**File**: `live-metrics.ts`

Display live operational metrics in real-time.

```bash
bun run bench:watch
```

**Displays**:
- Active connections
- Transaction throughput
- Channel health
- Yield generation rate

### Log Metrics
**File**: `log-metrics.ts`

Log operational metrics to files for analysis.

```bash
bun run log-metrics
```

**Output**:
- `logs/lightning-audit.jsonl` - Invoice audit trail
- `logs/yield-generation.jsonl` - Yield tracking
- `logs/compliance-review-queue.jsonl` - Manual reviews

### Atlas Restore
**File**: `atlas-restore.ts`

Restore device inventory from backups.

```bash
bun run atlas-restore
```

**Functions**:
- Restore device state
- Recover from snapshots
- Verify device integrity

## Usage Examples

### Start Dashboard
```bash
bun run dashboard
```

### Monitor Live Metrics
```bash
bun run bench:watch
```

### Log Metrics to Files
```bash
bun run log-metrics
```

### Restore Device Inventory
```bash
bun run atlas-restore
```

## Development

### Adding New CLI Tools

1. Create new file in `cli/` directory
2. Export main function
3. Add script to `package.json`
4. Update this README

### File Structure
```typescript
// cli/my-tool.ts
export async function main() {
  // Your CLI logic here
}

main().catch(console.error);
```

### Add to package.json
```json
{
  "scripts": {
    "my-tool": "bun run cli/my-tool.ts"
  }
}
```

## Logging

All CLI tools log to:
- `logs/` - Application logs
- `logs/lightning-audit.jsonl` - Audit trail
- `logs/yield-generation.jsonl` - Yield data

## Error Handling

CLI tools include:
- Error recovery
- Graceful shutdown
- Detailed error messages
- Logging for debugging

## Performance

- Minimal memory footprint
- Efficient data processing
- Real-time updates
- Responsive UI

---

**Version**: 3.5.0

