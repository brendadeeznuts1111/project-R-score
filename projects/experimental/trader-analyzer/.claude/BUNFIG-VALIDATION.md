# ORCA Bunfig.toml Validation Rules

**TOML v1.0.0 strict compliance. Invalid syntax yields parse error on load.**

---

## Core Constraints

### File Format
- **Extension**: Must end in `.toml` or `.bunfig.toml` (case-insensitive)
- **Encoding**: UTF-8 only, BOM stripped
- **Location Priority**:
  1. `./bunfig.toml` (project root)
  2. `$XDG_CONFIG_HOME/.bunfig.toml`
  3. `$HOME/.bunfig.toml`

### Syntax Rules
- **Sections**: `[section]` format
- **Nested keys**: Dotted notation (e.g., `install.scopes.@orca.url`)
- **Value Types**: Strings (quoted), integers, floats, booleans, arrays `[]`, tables `{}`
- **Comments**: `#` prefix, inline or line-end
- **Interpolation**: `$VAR` or `${VAR}` syntax (undefined vars remain literal)

---

## Scoped Registry Configuration

### Valid Formats

#### String URL
```toml
[install.scopes]
"@orca" = "https://registry.orca.sh/"
```

#### Object with Token
```toml
[install.scopes]
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
```

#### Object with Username/Password
```toml
[install.scopes]
"@orca" = { username = "orca", password = "$ORCA_PASS", url = "https://registry.orca.sh/" }
```

### Validation Rules
- Scope name must be quoted if starts with `@`
- URL must be valid HTTP/HTTPS
- Token/password loaded from environment variables
- Undefined env vars remain as literal strings

---

## Current Configuration

```toml
[install.scopes]
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
```

**Validation**:
- ✅ TOML v1.0.0 compliant
- ✅ Scope quoted (starts with `@`)
- ✅ Object format with token auth
- ✅ Environment variable interpolation
- ✅ Valid URL format

---

## Error Handling

### Parse Errors
- Invalid syntax: Parse fails, config ignored
- Type mismatch: Runtime default applied
- Unknown keys: Logged as warnings, defaulted

### Runtime Validation
- Invalid scope names: Rejected
- Invalid URLs: Bind error on use
- Missing auth: 401 on registry request

---

## Enforcement

### Post-Parse Validation (Binary)
Validation utility: `src/utils/bunfig-validator.ts`

```typescript
import { validateBunfig, validateScopeName, validateRegistryURL } from './utils/bunfig-validator';

// Validate entire config
const result = validateBunfig(parsedConfig);
if (!result.valid) {
  console.error('Bunfig validation errors:', result.errors);
}

// Validate individual components
validateScopeName("@orca");  // true
validateScopeName("orca");   // false (missing @)
validateRegistryURL("https://registry.orca.sh/");  // true
```

### Scope Name Validation
- Pattern: `@[a-z0-9-]+`
- Invalid scopes rejected at parse time
- No fallback to default registry
- Validation: `validateScopeName(scope)`

### Registry URL Validation
- Must be valid HTTP/HTTPS URL
- Validation: `validateRegistryURL(url)`
- Invalid URLs cause bind error on use

---

## Impact

- **Runtime**: No impact on v0.1.11 runtime
- **Feed latency**: Unchanged
- **Installation**: Only affects `bun install` for configured scopes
- **Validation**: Post-parse in binary, rejects invalid configs

---

**Status**: Validated  
**TOML Version**: 1.0.0  
**Compliance**: Strict  
**Runtime Impact**: None
