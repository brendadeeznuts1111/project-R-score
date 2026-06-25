# Biome Integration

**Date:** January 24, 2026  
**Status:** ✅ Configured

## Overview

Biome has been integrated as the primary linter and formatter, aligned with the `.analyze.json` code quality thresholds.

## Configuration

### `biome.json`

The Biome configuration matches the `.analyze.json` thresholds:

- **Base Complexity:** `maxComplexity: 8` (matches `.analyze.json`)
- **Import Organization:** Enabled automatically
- **Performance Rules:** `noAccumulatingSpread`, `noDelete` as errors
- **Console Logs:** Warnings (not errors)

### Overrides

**Test Files (`scripts/__tests__/**`):**
- `maxComplexity: 15` (relaxed for test setup)
- `noConsoleLog: off` (allows console in tests)

**Type Test Files (`**/*.types.test.ts`):**
- `noConsoleLog: off` (allows console in type tests)

**V8 Bindings (`**/v8-bindings/**/*`):**
- `maxComplexity: 12` (slightly relaxed for native bindings)

## Usage

### Primary Commands (Biome)

```bash
# Lint and check
bun run lint

# Lint and auto-fix
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check
```

### Legacy Commands (ESLint/Prettier)

ESLint and Prettier are still available for compatibility:

```bash
# ESLint
bun run lint:eslint
bun run lint:eslint:fix

# Prettier
bun run format:prettier
bun run format:prettier:check
```

## Installation

If Biome is not installed, add it to devDependencies:

```bash
bun add -d @biomejs/biome
```

## Integration with `.analyze.json`

The Biome configuration is aligned with `.analyze.json`:

| Setting | `.analyze.json` | `biome.json` |
|---------|----------------|--------------|
| Base Complexity | 8 | 8 |
| Test Files | 15 | 15 |
| V8 Bindings | 12 | 12 |
| Console Logs | N/A | warn |

## Benefits

1. **Faster Performance** - Biome is significantly faster than ESLint
2. **Unified Tool** - Combines linting and formatting in one tool
3. **Consistent Rules** - Aligned with code quality thresholds
4. **Import Organization** - Automatically organizes imports
5. **Backward Compatible** - ESLint/Prettier still available

## Migration Notes

- Primary linting/formatting now uses Biome
- ESLint and Prettier scripts preserved with suffixes
- Existing ESLint config (`eslint.config.js`) remains for reference
- Pre-commit hooks can be updated to use Biome

## Related Documentation

- [`.analyze.json`](../.analyze.json) - Code quality thresholds
- [CLI Tools](./cli/CLI_TOOLS.md) - Analysis tools
