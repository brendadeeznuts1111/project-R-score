# Annotations Command - Quick Reference

**Command:** `bun run cli/analyze.ts annotations [path] [options]`

## Basic Usage

```bash
# Extract all annotations
bun run cli/analyze.ts annotations

# Scan specific directory
bun run cli/analyze.ts annotations src/server/kyc/

# Show statistics
bun run cli/analyze.ts annotations src/server/kyc/ --stats
```

## Filtering Options

### Filter by Domain
```bash
bun run cli/analyze.ts annotations src/ --domain=KYC
```

### Filter by Scope
```bash
bun run cli/analyze.ts annotations src/ --scope=SERVICE
```

### Filter Bun-Native Code
```bash
bun run cli/analyze.ts annotations src/server/ --bun-native
```

### Filter by Reference
```bash
# Find all annotations referencing issues
bun run cli/analyze.ts annotations src/ --ref=ISSUE

# Find specific API references
bun run cli/analyze.ts annotations src/ --ref=API-KYC
```

### Combined Filters
```bash
# KYC services that use Bun-native features
bun run cli/analyze.ts annotations src/ --domain=KYC --scope=SERVICE --bun-native
```

## Output Formats

### Human-Readable (Default)
```bash
bun run cli/analyze.ts annotations src/server/kyc/
```

### JSON Output
```bash
bun run cli/analyze.ts annotations src/server/kyc/ --format=json
```

### With Statistics
```bash
bun run cli/analyze.ts annotations src/server/kyc/ --stats
```

## Example Output

### Statistics View
```
📊 Annotation Statistics

Total: 5 annotations

By Domain:
  KYC: 5

By Scope:
  SERVICE: 5

By Type:
  CLASS: 3
  FUNCTION: 2

Features:
  Bun-Native: 5 (100%)
  With References: 5 (100%)
```

### Filtered View
```
📋 Code Annotations

Found 3 annotations (filtered from 5 total)

KYC (3)
  src/server/kyc/failsafeEngine.ts:2 scope:SERVICE type:CLASS bun:BUN-NATIVE refs:ISSUE-KYC-001
    * [KYC][SERVICE][CLASS][META:{export}][BUN-NATIVE]
```

## Annotation Format

```
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
```

### Example Annotations

**Class:**
```typescript
/**
 * [KYC][SERVICE][CLASS][META:{export}][BUN-NATIVE]
 * KYC Failsafe Engine
 * #REF:ISSUE-KYC-001
 */
export class KYCFailsafeEngine { }
```

**Function:**
```typescript
/**
 * [API][ENDPOINT][FUNCTION][META:{async}][META:{export}][BUN-NATIVE]
 * Authenticate user
 * #REF:API-AUTH-LOGIN
 */
export async function authenticateUser() { }
```

**Interface:**
```typescript
/**
 * [AUTH][MODEL][INTERFACE][META:{export}]
 * Authentication context
 * #REF:DOC-AUTH-SYSTEM
 */
export interface AuthContext { }
```

## Common Use Cases

### Find All Bun-Native Code
```bash
bun run cli/analyze.ts annotations src/ --bun-native --stats
```

### Find Code by Issue Reference
```bash
bun run cli/analyze.ts annotations src/ --ref=ISSUE-123
```

### Analyze Domain Coverage
```bash
bun run cli/analyze.ts annotations src/ --stats
```

### Export for Analysis
```bash
bun run cli/analyze.ts annotations src/ --format=json > annotations.json
```

## Related Documentation

- [Code Annotation System](../CODE_ANNOTATION_SYSTEM.md) - Complete annotation format documentation
- [CLI Tools](CLI_TOOLS.md) - Full CLI tools reference
