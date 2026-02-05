# AGENTS.md - Code Mode

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Coding Rules

### TOML Serialization Pattern (Mandatory)
Bun has `TOML.parse()` but NOT `TOML.stringify()`. When saving TOML files, you MUST manually build the string line-by-line as shown in [`ConfigManager.save()`](src/config-manager.ts:280). Do NOT attempt to use JSON.stringify or external TOML libraries.

```typescript
// CORRECT: Manual TOML string building
const lines: string[] = [];
lines.push(`title = "${config.title}"`);
lines.push(`version = "${config.version}"`);
// ... continue for all sections

// WRONG: Will not work
import * as TOML from 'some-toml-lib'; // ❌ ESLint error + not needed
const tomlString = TOML.stringify(config); // ❌ Bun doesn't have this
```

### Feature Flag Usage (Compile-Time Only)
Features are NOT runtime environment variables. They are compile-time flags using Bun's `--feature` flag:

```typescript
// CORRECT: Check feature at compile time
import { feature } from 'bun';

if (feature('ENTERPRISE')) {
  // This code is only included in enterprise builds
  enableEnterpriseFeatures();
}

// WRONG: Runtime check won't work
if (process.env.ENTERPRISE) { // ❌ Feature flags don't work this way
  enableEnterpriseFeatures();
}
```

### Import Restrictions (ESLint Enforced)
The following imports are **banned** and will cause ESLint errors:
- `axios` → Use native `fetch()`
- `node-fetch` → Use native `fetch()`
- `form-data` → Use native `FormData` API
- `dotenv` → Bun auto-loads `.env` files

### Path Aliases (Required Usage)
Always use path aliases instead of relative imports:
- `@/*` → `src/*`
- `@config/*` → `config/*`
- `@types/*` → `types/*`
- `@utils/*` → `utils/*`

```typescript
// CORRECT
import { ConfigManager } from '@/config-manager';

// WRONG
import { ConfigManager } from '../../src/config-manager'; // ❌ Don't use relative paths
```

### Explicit Return Types (Required)
All TypeScript functions MUST have explicit return types:

```typescript
// CORRECT
function generateApiKey(prefix: string): string { ... }
async function loadConfig(path: string): Promise<Config> { ... }

// WRONG (will trigger ESLint warning)
function generateApiKey(prefix: string) { ... } // ❌ Missing return type
```

### Unused Variables Convention
Prefix unused variables with underscore:

```typescript
// CORRECT
function processData(_unusedParam: string, usedParam: string) { ... }

// WRONG (will trigger ESLint error)
function processData(unusedParam: string, usedParam: string) { ... } // ❌ Not prefixed