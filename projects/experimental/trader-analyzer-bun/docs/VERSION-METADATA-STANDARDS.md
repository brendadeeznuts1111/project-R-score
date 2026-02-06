# Version & Metadata Standards

**Last Updated**: 2025-01-08  
**Status**: ✅ Active Standards

---

## Overview

This document defines the version and metadata standards for the NEXUS Trading Intelligence Platform codebase. All new code should follow these patterns for consistency, discoverability, and maintainability.

---

## Version Numbering System

### Hierarchical 7-Level Version Format

```text
MAJOR.MINOR.PATCH.SUB.SUB.SUB.SUB
```

**Example**: `10.1.1.3.0.0.0`

### Version Assignment Rules

1. **Major.Minor.Patch**: Match feature version or Bun version
2. **Sub versions**: Increment for each component/method/file
3. **Consistency**: Use same major.minor.patch for related components

### Version Categories

- **`10.X.X.X.X.X.X`** - Authentication & Session Management
- **`6.X.X.X.X.X.X`** - Examples & Architectural Documentation
- **`8.X.X.X.X.X.X`** - Binary Manifest & UI Policies
- **`0.1.0`** - Package.json semantic version (standard npm format)

---

## Metadata Structure

### File-Level Metadata Template

```typescript
#!/usr/bin/env bun
/**
 * @fileoverview [Component Name]
 * @description [Detailed description]
 * @module [module/path]
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-XXX@VERSION;instance-id=ID-001;version=VERSION}]]
 * [PROPERTIES:{key={value:"val";@root:"ROOT";@chain:["BP-X","BP-Y"];@version:"VERSION"}}]
 * [CLASS:ClassName]
 * [#REF:v-VERSION.BP.XXX.1.0.A.1.1.COMPONENT.1.1]]
 * 
 * Version: VERSION
 * Ripgrep Pattern: VERSION|ID-001|BP-XXX@VERSION|[filename-pattern]
 * 
 * @see {@link ../docs/[DOC-FILE].md Related Documentation}
 * @see {@link ../test/[TEST-FILE].ts Related Tests}
 * 
 * @author NEXUS Team
 * @since Bun [VERSION]+
 */
```

### Metadata Components

1. **Blueprint**: `BP-[CATEGORY]-[COMPONENT]@[VERSION]`
2. **Instance ID**: `[COMPONENT]-[TYPE]-[NUMBER]` (e.g., `AUTH-SERVICE-001`)
3. **Ripgrep Pattern**: Enables quick discovery via `rg` searches
4. **Cross-References**: `@see` tags linking to docs, tests, examples

---

## Package.json Version

### Standard Format

```json
{
  "name": "@nexus/trader-analyzer",
  "version": "0.1.0",
  "engines": {
    "bun": ">=1.2.0"
  },
  "bunVersion": "1.3+ recommended"
}
```

### Version Management

- **Semantic Versioning**: `MAJOR.MINOR.PATCH` (e.g., `0.1.0`)
- **Pre-release**: `MAJOR.MINOR.PATCH-tag.N` (e.g., `1.4.0-beta.1`)
- **Update via**: `VERSION=1.4.0 bun run scripts/publish-graph-monorepo.ts`

---

## Naming Conventions

### Classes
- **Format**: `[Component][Type]`
- **Examples**: `AuthService`, `SessionMiddleware`, `CSRFService`

### Functions
- **Format**: `[action][object]` or `[action]`
- **Examples**: `handleLogin`, `validateSession`, `setUIPreference`

### Constants
- **Format**: `[CATEGORY]_[NAME]` (UPPER_SNAKE_CASE)
- **Examples**: `UI_PREFERENCE_NAMES`, `RSS_FEED_URLS`

### Files
- **Format**: `[component]-[type].ts`
- **Examples**: `auth-service.ts`, `session-middleware.ts`

### Instance IDs
- **Format**: `[COMPONENT]-[TYPE]-[NUMBER]`
- **Examples**: `AUTH-SERVICE-001`, `SESSION-MIDDLEWARE-001`

---

## Scripts Directory

### Script Metadata (Optional)

Scripts in `scripts/` directory don't require full hierarchical versioning, but should include:

```typescript
#!/usr/bin/env bun
/**
 * @fileoverview [Script Name]
 * @description [What the script does]
 * @module scripts/[script-name]
 * 
 * Usage:
 *   bun run scripts/[script-name].ts [args]
 * 
 * @see scripts/[related-script].ts
 */
```

### Version Management Scripts

Scripts that manage versions should:
- Accept `VERSION` environment variable
- Validate version format: `/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/`
- Update `package.json` versions consistently
- Handle `workspace:*` dependencies correctly

---

## Examples Directory

### Example Metadata Format

```typescript
/**
 * Version: [VERSION]
 * Ripgrep Pattern: [VERSION]|EXAMPLE-[NAME]-001|BP-EXAMPLE@[VERSION]
 * 
 * @example [VERSION].1: Example Name
 * // Test Formula:
 * // 1. Step 1
 * // 2. Step 2
 * // Expected Result: What happens
 */
```

### Example Version Categories

- **`6.1.X.X.X.X.X`** - HTMLRewriter examples
- **`6.2.X.X.X.X.X`** - Bun Utils examples
- **`6.3.X.X.X.X.X`** - Tag Manager examples
- **`6.4.X.X.X.X.X`** - Other examples

---

## Documentation Standards

### Documentation Headers

```markdown
### [DOMAIN.CATEGORY.KEYWORD.RG] Component Name
**Reference**: `#REF:v-VERSION.BP.XXX.1.0.A.1.1.COMPONENT.1.1`  
**File**: `src/path/to/file.ts`  
**Class**: `ClassName`  
**Version**: `VERSION`
```

### Cross-References

- Link to related components via `@see` tags
- Include ripgrep patterns for discoverability
- Reference documentation files consistently

---

## Validation & Verification

### Ripgrep Patterns

All version numbers should be searchable via ripgrep:

```bash
# Find by version
rg "10\.1\.1\.3\.0\.0\.0" src/

# Find by instance ID
rg "AUTH-SERVICE-001" src/

# Find by blueprint
rg "BP-AUTH-SERVICE@10\.1\.1\.0\.0\.0\.0" src/
```

### Version Consistency Checks

- All version numbers should match their hierarchical level
- Instance IDs should be unique within their category
- Blueprint references should be consistent
- Cross-references should be valid

---

## Best Practices

### ✅ Do

- Use hierarchical versioning for source files
- Include ripgrep patterns for discoverability
- Add cross-references to related components
- Follow naming conventions consistently
- Update version numbers when making breaking changes

### ❌ Don't

- Use random version numbers
- Skip metadata in new files
- Mix version formats (semantic vs hierarchical)
- Create duplicate instance IDs
- Break cross-reference links

---

## Related Documentation

- [Versioning & Metadata Summary](./10.4-VERSIONING-METADATA-SUMMARY.md)
- [Complete Versioning Report](./10.5-COMPLETE-VERSIONING-REPORT.md)
- [Metadata Documentation Mapping](./api/METADATA-DOCUMENTATION-MAPPING.md)
- [Examples Metadata Enhancement Guide](../examples/METADATA-ENHANCEMENT-GUIDE.md)
- [Naming Conventions](./guides/NAMING-CONVENTIONS.md)

---

**Status**: ✅ Standards established and active  
**Maintenance**: Update this document when versioning patterns change
