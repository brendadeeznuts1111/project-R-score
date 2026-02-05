# 📍 IMPORTANT - Directory Reminder

## The Issue
You need to be in the `backend/` directory to run the Bun v1.3.7 commands!

## Quick Commands

### From Anywhere:
```bash
cd backend && bun run benchmark:all
cd backend && bun run features:complete
cd backend && bun run profile:all
```

### Or Use the Demo Runner:
```bash
./run-demo.sh
```

## Available Commands (from backend directory):
```bash
# Features
bun run features:demo      # Core features
bun run features:http      # HTTP features
bun run features:buffer    # Buffer optimization
bun run features:complete  # ALL features ⭐

# Performance
bun run benchmark:all      # All benchmarks
bun run profile:all        # Complete profiling

# Testing
bun run test:headers       # Header preservation
```

## Current Working Directory Should Be:
```
/Users/nolarose/Projects/bun-toml-secrets-editor/backend
```

NOT:
```
/Users/nolarose/Projects/bun-toml-secrets-editor
```

## Easiest Way:
```bash
./run-demo.sh
```
This handles navigation automatically! 🚀
