# Signal Handling Quick Reference

## Signal Types

| Signal | Number | Can Catch? | Cleanup? | Exit Code |
|--------|--------|------------|----------|-----------|
| SIGINT | 2 | ✅ Yes | ✅ Yes | 130 |
| SIGTERM | 15 | ✅ Yes | ✅ Yes | 143 |
| SIGHUP | 1 | ✅ Yes | ✅ Yes | 129 |
| SIGUSR1 | 10 | ✅ Yes | ✅ Yes | 138 |
| SIGUSR2 | 12 | ✅ Yes | ✅ Yes | 139 |
| SIGKILL | 9 | ❌ No | ❌ No | 137 |

## Usage

### Graceful (SIGTERM)
```bash
kill -15 <pid>  # or -SIGTERM
kimi-shell stop  # Uses SIGTERM
```

### Force (SIGKILL)
```bash
kill -9 <pid>   # or -SIGKILL
```

## Implementation
```typescript
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});
```
