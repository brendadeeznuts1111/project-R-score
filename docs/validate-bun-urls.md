# Bun URL Validation Script

A comprehensive validation tool for cross-referencing and validating GitHub commit hashes against Bun's official documentation base URLs.

## Features

- ✅ **Colored Output**: Easy-to-read terminal output with status indicators
- 🔗 **URL Validation**: Tests HTTP status codes for all Bun-related URLs
- 📊 **Summary Reports**: Clear pass/fail statistics
- 🔍 **Commit Hash Analysis**: Validates Git hash format and length
- 📋 **Constants Integration**: Automatically includes URLs from `BUN_CONSTANTS_VERSION.json`
- ⚡ **Parallel Testing**: Fast validation using Promise.all()

## Usage

### Direct Execution
```bash
bun run scripts/validate-bun-urls.ts
```

### Via Package Script
```bash
bun run validate:bun-urls
```

## What It Tests

### Core Validation Tests
- GitHub tree URLs with commit hashes
- Raw GitHub file access (bun.d.ts)
- Official Bun documentation pages
- Repository and release URLs
- Installation scripts and RSS feeds

### Constants from BUN_CONSTANTS_VERSION.json
- All URL-type constants from your project configuration
- Automatic variable substitution (`${BUN_BASE_URL}`, etc.)
- Project-specific URLs from scanner and mcp-bun-docs

### Commit Hash Analysis
- Length validation (must be 40 characters)
- Hexadecimal format verification
- SHA-1 hash format checking

## Output Interpretation

- **✅ Green/Passed**: URL returns 200 OK
- **❌ Red/Failed**: URL returns error status or network failure
- **📊 Summary**: Total counts of passed/failed tests
- **🔍 Analysis**: Commit hash format validation

## Exit Codes

- `0`: All tests passed successfully
- `1`: Script execution failed (network error, file not found, etc.)

## Example Output

```
🔍 Bun URL Validation Script
================================

Running 25 validation tests...

✅ GitHub Tree URL (commit hash validation)
   URL: https://github.com/oven-sh/bun/tree/main/packages/bun-types
   Status: 200 OK

✅ Raw GitHub File (bun.d.ts)
   URL: https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts
   Status: 200 OK

[... more results ...]

📊 Summary
==========
Total tests: 25
✅ Passed: 25
❌ Failed: 0

🎉 All URLs validated successfully!

🔍 Commit Hash Analysis
=======================
Commit hash: main
Length check (40 chars): ✅ Valid
Hex format check: ✅ Valid
✅ Commit hash format is valid
```

## Quick One-Liners (Original Commands)

For ad-hoc testing, you can still use the original one-liners:

```bash
# Basic commit URL check
bun -e 'console.log((await fetch("https://github.com/oven-sh/bun/tree/main/packages/bun-types").then(r=>r.status))===200?"OK":"404 or error")'

# Raw file existence
bun -e 'console.log((await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts").then(r=>r.status))===200?"raw OK":"raw 404")'

# Hash format validation
bun -e 'const commit="main"; console.log(commit.length===40?"valid hash length":"bad hash format")'

# 404 detector
bun -e 'const u="https://github.com/oven-sh/bun/tree/main/packages/bun-types"; console.log((await fetch(u,{method:"HEAD"})).status===200?"exists":"404")'

# Extract commit hash
bun -e 'const u="https://github.com/oven-sh/bun/tree/main/packages/bun-types"; console.log(u.match(/[a-f0-9]{40}/)?.[0]||"no hash found")'
```

## Integration

This script is designed to integrate seamlessly with your Bun project:

- Reads constants from `BUN_CONSTANTS_VERSION.json`
- Uses Bun's native fetch API for fast HTTP requests
- Leverages TypeScript for type safety
- Provides both programmatic and CLI interfaces

## When URLs Fail

If any URLs return 404 or error status:

1. **Commit hash outdated**: Update to latest commit or use `main` branch
2. **Path changed**: Verify file/directory structure in Bun repository
3. **Documentation moved**: Check Bun's official documentation for new URLs
4. **Network issues**: Retry later or check internet connectivity

## Customization

To add more URLs for validation:

1. Edit the `testCases` array in `scripts/validate-bun-urls.ts`
2. Or add URL constants to `BUN_CONSTANTS_VERSION.json`
3. The script automatically picks up new URL-type constants

## Dependencies

- Bun runtime (for fetch API and TypeScript support)
- Access to `BUN_CONSTANTS_VERSION.json` (optional, falls back gracefully)

---

🚀 **Ready to validate your Bun URLs!** Run `bun run validate:bun-urls` to get started.