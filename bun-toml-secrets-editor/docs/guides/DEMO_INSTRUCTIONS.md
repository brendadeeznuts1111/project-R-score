# 🚀 Quick Demo Instructions

## The Issue
You're trying to run the demo commands from the wrong directory! The scripts are located in the `backend/` subdirectory.

## Quick Fix

### Option 1: Navigate to Backend Directory
```bash
cd backend
bun run features:demo
bun run features:http  
bun run features:buffer
```

### Option 2: Use the Demo Runner Script
```bash
./run-demo.sh
```
This script will navigate to the correct directory and let you choose what to run.

### Option 3: Run from Anywhere
```bash
# From project root:
cd backend && bun run features:demo && cd ..

# Or one-liner:
cd backend && bun run features:demo && bun run features:http && bun run features:buffer && cd ..
```

## Available Commands (from backend directory)

```bash
# Feature demonstrations
bun run features:demo      # Core features
bun run features:http      # HTTP features
bun run features:buffer    # Buffer optimization  
bun run features:complete  # ALL features together ⭐

# Performance testing
bun run benchmark:all      # All benchmarks
bun run profile:all        # Complete profiling

# Specific testing
bun run test:headers       # Header preservation
```

## Recommended Start

```bash
cd backend
bun run features:complete
```

This will show you ALL 16 Bun v1.3.7 features working together! 🌟
