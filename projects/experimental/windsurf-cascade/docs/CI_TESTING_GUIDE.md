# CI Testing Configuration for Odds Protocol
# bun test will now enforce stricter rules in CI environments

## CI Enforcement Rules
- ❌ No `test.only()` allowed in CI
- ❌ No new snapshots without `--update-snapshots` flag
- ✅ Use `test.failing()` for known bugs and TDD

## Environment Variables
```bash
# Enable strict CI mode (default in CI)
CI=true

# Disable strict behavior if needed
CI=false
```

## CI Commands
```bash
# Standard CI testing
bun test --timeout 30000

# Update snapshots in CI (explicit)
bun test --update-snapshots

# Run with coverage
bun test --coverage --threshold 80
```
