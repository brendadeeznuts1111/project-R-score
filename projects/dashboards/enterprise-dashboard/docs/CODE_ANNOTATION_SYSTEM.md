# Code Annotation System

**Date:** January 24, 2026  
**Status:** ✅ Documented

## Overview

Structured code annotation system for tagging code with domain, scope, type, metadata, and references. This system enables better code organization, analysis, and documentation generation.

## Annotation Format

```
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]
```

### Tag Definitions

#### `[DOMAIN]`
High-level domain classification:
- `API` - API endpoints and routes
- `AUTH` - Authentication and authorization
- `KYC` - Know Your Customer system
- `CLIENT` - Frontend/client code
- `SERVER` - Backend/server code
- `UTILS` - Utility functions
- `CONFIG` - Configuration management
- `DB` - Database operations
- `NETWORK` - Network utilities
- `SECURITY` - Security-related code

#### `[SCOPE]`
Functional scope within domain:
- `ENDPOINT` - API endpoint
- `TAB` - UI tab component
- `QUERY` - Database query
- `ROUTER` - Routing logic
- `HANDLER` - Request handler
- `VALIDATOR` - Input validation
- `MATRIX` - Matrix/grid components
- `UTILS` - Utility functions
- `CORE` - Core modules
- `HOOK` - React hooks
- `COMPONENT` - React components
- `SERVICE` - Backend services
- `MODEL` - Data models
- `BENCH` - Benchmarks
- `FIXTURE` - Test fixtures

#### `[TYPE]`
Code type classification:
- `CLASS` - Class definition
- `FUNCTION` - Function definition
- `INTERFACE` - TypeScript interface
- `TYPE` - TypeScript type alias
- `ENUM` - Enumeration
- `CONST` - Constant definition
- `HOOK` - React hook
- `COMPONENT` - React component

#### `[META:{PROPERTY}]`
Metadata with properties:
- `META:{async}` - Async function
- `META:{export}` - Exported symbol
- `META:{private}` - Private member
- `META:{deprecated}` - Deprecated code
- `META:{experimental}` - Experimental feature
- `META:{performance}` - Performance-critical
- `META:{security}` - Security-sensitive

#### `[CLASS]`
Class-specific tags:
- `CLASS` - Standard class
- `ABSTRACT` - Abstract class
- `SINGLETON` - Singleton pattern
- `FACTORY` - Factory pattern
- `BUILDER` - Builder pattern

#### `[FUNCTION]`
Function-specific tags:
- `PURE` - Pure function (no side effects)
- `ASYNC` - Async function
- `GENERATOR` - Generator function
- `CURRIED` - Curried function
- `MEMOIZED` - Memoized function

#### `[INTERFACE]`
Interface-specific tags:
- `INTERFACE` - TypeScript interface
- `TYPE` - Type alias
- `GENERIC` - Generic type
- `UNION` - Union type
- `INTERSECTION` - Intersection type

#### `[#REF:*]`
Reference tags:
- `#REF:ISSUE-123` - References issue/ticket
- `#REF:PR-456` - References pull request
- `#REF:DOC-789` - References documentation
- `#REF:API-*` - References API endpoint
- `#REF:CLASS-*` - References class
- `#REF:FUNC-*` - References function

#### `[BUN-NATIVE]`
Bun-specific features:
- `BUN-NATIVE` - Uses Bun native APIs
- `BUN-SQLITE` - Uses Bun SQLite
- `BUN-SPAWN` - Uses Bun.spawn
- `BUN-FILE` - Uses Bun.file
- `BUN-SERVE` - Uses Bun.serve
- `BUN-TRANSPILE` - Uses Bun.Transpiler
- `BUN-TOML` - Uses TOML imports

## Usage Examples

### Class Annotation

```typescript
/**
 * [KYC][SERVICE][CLASS][META:{export}][BUN-NATIVE]
 * Main orchestration engine for KYC failsafe flow
 * #REF:ISSUE-123
 */
export class KYCFailsafeEngine {
  // ...
}
```

### Function Annotation

```typescript
/**
 * [API][ENDPOINT][FUNCTION][META:{async}][META:{export}][BUN-NATIVE]
 * Authenticate user and return JWT token
 * #REF:API-AUTH-LOGIN
 */
export async function authenticateUser(
  credentials: Credentials
): Promise<AuthResult> {
  // ...
}
```

### Interface Annotation

```typescript
/**
 * [AUTH][MODEL][INTERFACE][META:{export}]
 * Authentication context with permissions
 * #REF:DOC-AUTH-SYSTEM
 */
export interface AuthContext {
  userId: string;
  permissions: Permission[];
}
```

### React Component Annotation

```typescript
/**
 * [CLIENT][TAB][COMPONENT][META:{export}]
 * KYC review tab with filtering and bulk actions
 * #REF:PR-456
 */
export function KYCReviewTab({ showToast }: Props) {
  // ...
}
```

## Integration with Analyze CLI

The annotation system integrates with `cli/analyze.ts`:

```bash
# Extract annotations from codebase
bun run cli/analyze.ts annotations

# Filter by domain
bun run cli/analyze.ts annotations --domain=KYC

# Filter by scope
bun run cli/analyze.ts annotations --scope=SERVICE

# Find Bun-native code
bun run cli/analyze.ts annotations --bun-native

# Find references
bun run cli/analyze.ts annotations --ref=ISSUE-123
```

## Benefits

1. **Code Organization** - Clear classification of code by domain and scope
2. **Documentation** - Self-documenting code with structured tags
3. **Analysis** - Easy filtering and searching of codebase
4. **Refactoring** - Identify related code for refactoring
5. **Onboarding** - New developers can understand code structure quickly
6. **Dependencies** - Track references between code elements

## Best Practices

1. **Be Specific** - Use the most specific domain and scope tags
2. **Consistent** - Use the same tags for similar code patterns
3. **Complete** - Include all relevant tags (domain, scope, type)
4. **Reference** - Link to issues, PRs, or documentation when relevant
5. **Bun Features** - Tag Bun-native code for performance awareness

## Related Documentation

- [CLI Tools](./cli/CLI_TOOLS.md) - Analysis tools
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines
- [`.analyze.json`](../.analyze.json) - Code quality thresholds
