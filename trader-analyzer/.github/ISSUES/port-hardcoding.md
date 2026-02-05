# Port Configuration Should Be Hardcoded with Constants

**Issue Type:** Enhancement / Consistency  
**Priority:** Medium  
**Labels:** `constants`, `configuration`, `documentation`  
**Status:** ✅ Fixed  
**Branch:** `feature/hardcode-ports-constants`  
**Tag:** `v0.1.16-port-hardcoding`

## Problem

Ports are currently retrieved dynamically using `getPort()` and `getWSPort()` functions throughout the codebase, which makes it difficult to:
1. Know the default port values without reading code
2. Have consistent port references in API documentation
3. Trace port configuration to a single source of truth

## Current State

- ✅ `src/index.ts` - Fixed: Uses `API_CONSTANTS.PORT` directly
- ✅ `src/api/docs.ts` - Fixed: Uses hardcoded `API_CONSTANTS.DEFAULT_PORT`
- ✅ `scripts/dev-server.ts` - Fixed: Uses hardcoded port (3000)
- ✅ Documentation comments - Fixed: Reference actual port values

## Solution Implemented

1. **Hardcoded ports in constants** - Use `API_CONSTANTS.PORT` (3000) and `API_CONSTANTS.WS_PORT` (3002) directly
2. **Updated all references** - Replaced `getPort()` calls with `API_CONSTANTS.PORT`
3. **Updated documentation** - Replaced `$PORT` references with actual port numbers (3000, 3002)
4. **Maintained override capability** - Environment variables can still override, but defaults are explicit
5. **Added tests** - Created `test/port-config.test.ts` to verify port configuration

## Files Changed

- ✅ `src/api/docs.ts` - Hardcoded ports in OpenAPI spec
- ✅ `src/index.ts` - Server startup uses `API_CONSTANTS.PORT`
- ✅ `scripts/dev-server.ts` - Dev server uses hardcoded port
- ✅ `test/port-config.test.ts` - New test file for port configuration
- ✅ `dashboard/index.html` - Added Environment/Flags/Constants tab

## Testing

✅ **All tests passing:**
```bash
bun test test/port-config.test.ts
# 8 pass, 0 fail
```

Tests verify:
- PORT is hardcoded to 3000
- WS_PORT is hardcoded to 3002
- Ports are valid numbers in valid range (1-65535)
- PORT and DEFAULT_PORT match
- WS_PORT and DEFAULT_WS_PORT match

## Bun PM Packages

✅ **No Bun PM packages affected:**
- No `bun pm` packages in use
- Only standard npm packages: `ccxt`, `hono`, `protobufjs`, `uuid`
- Changes are internal to codebase only
- No external package dependencies modified

## Benefits

- ✅ Single source of truth for port configuration
- ✅ Easier to trace port values in codebase
- ✅ Consistent API documentation
- ✅ Better developer experience (no need to search for port values)
- ✅ Test coverage for port configuration

## Related

- Constants Reference: `docs/CONSTANTS-REFERENCE.md`
- Dashboard: Environment/Flags/Constants tab
- API Constants: `src/constants/index.ts`
- Tests: `test/port-config.test.ts`

## Status

✅ **COMPLETED** - Branch pushed, tests passing, ready for PR merge
