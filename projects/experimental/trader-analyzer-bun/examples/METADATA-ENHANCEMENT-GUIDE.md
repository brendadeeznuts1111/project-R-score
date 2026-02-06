# Examples Metadata Enhancement Guide

**Status**: ✅ Enhancement Pattern Established  
**Last Updated**: 2025-12-08

## Overview

This guide documents the metadata enhancement pattern for example files in the `examples/` directory. Enhanced metadata improves discoverability, cross-referencing, and documentation integration.

---

## Metadata Structure

### Standard Header Template

```typescript
#!/usr/bin/env bun
/**
 * @fileoverview [Brief Description]
 * @description [Detailed description of what the example demonstrates]
 * @module examples/[module-name]
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@[VERSION];instance-id=EXAMPLE-[NAME]-001;version=[VERSION]}]
 * [PROPERTIES:{example={value:"[Example Name]";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-[CATEGORY]"];@version:"[VERSION]"}}]
 * [CLASS:[ClassName]][#REF:v-[VERSION].BP.EXAMPLES.[CATEGORY].1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: [VERSION]
 * Ripgrep Pattern: [VERSION]|EXAMPLE-[NAME]-001|BP-EXAMPLE@[VERSION]|[filename-pattern]
 * 
 * Demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 * 
 * @example [VERSION].1: Example Name
 * // Test Formula:
 * // 1. Step 1
 * // 2. Step 2
 * // 3. Step 3
 * // Expected Result: What should happen
 * //
 * // Snippet:
 * ```typescript
 * // Code example
 * ```
 * 
 * @see {@link ../docs/[DOC-FILE].md Related Documentation}
 * @see {@link ../test/[TEST-FILE].ts Related Tests}
 * @see {@link https://bun.sh/docs/... Bun Documentation}
 * 
 * // Ripgrep: [VERSION]
 * // Ripgrep: EXAMPLE-[NAME]-001
 * // Ripgrep: BP-EXAMPLE@[VERSION]
 * 
 * Run: bun run examples/[filename].ts
 * 
 * @author NEXUS Team
 * @since Bun [VERSION]+
 */
```

---

## Version Numbering

### Format: `MAJOR.MINOR.PATCH.SUB.SUB.SUB`

Examples:
- `1.3.4.1.0.0.0` - URLPattern basic examples
- `1.3.4.2.0.0.0` - Standalone executable examples
- `6.2.0.0.0.0.0` - Bun utils demo
- `6.3.0.0.0.0.0` - Tag manager

### Version Assignment Rules

1. **Major.Minor.Patch**: Match Bun version or feature version
2. **Sub versions**: Increment for each example file
3. **Consistency**: Use same major.minor.patch for related examples

---

## Blueprint Metadata

### Format

```text
[[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@[VERSION];instance-id=EXAMPLE-[NAME]-001;version=[VERSION]}]
```

### Instance ID Format

- Prefix: `EXAMPLE-`
- Name: Uppercase with hyphens (e.g., `URLPATTERN-BASIC`, `STANDALONE-BUILD`)
- Suffix: `-001` (increment for multiple instances)

### Properties Format

```text
[PROPERTIES:{example={value:"[Example Name]";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-[CATEGORY]"];@version:"[VERSION]"}}]
```

### Class Reference Format

```text
[CLASS:[ClassName]][#REF:v-[VERSION].BP.EXAMPLES.[CATEGORY].1.0.A.1.1.EXAMPLE.1.1]
```

---

## Ripgrep Patterns

### Purpose

Enable quick discovery of examples via `rg` (ripgrep) searches.

### Format

```text
Ripgrep Pattern: [VERSION]|EXAMPLE-[NAME]-001|BP-EXAMPLE@[VERSION]|[filename-pattern]
```

### Usage Examples

```bash
# Find all URLPattern examples
rg "1\.3\.4\.1\.0\.0\.0"

# Find specific example
rg "EXAMPLE-URLPATTERN-BASIC-001"

# Find by blueprint
rg "BP-EXAMPLE@1\.3\.4\.1\.0\.0\.0"

# Find by filename pattern
rg "urlpattern-basic-examples"
```

---

## Example Documentation

### @example Format

```typescript
/**
 * @example [VERSION].1: Example Name
 * // Test Formula:
 * // 1. Step 1 description
 * // 2. Step 2 description
 * // 3. Step 3 description
 * // Expected Result: What should happen
 * //
 * // Snippet:
 * ```typescript
 * // Actual code example
 * ```
 */
```

### Multiple Examples

Number examples sequentially:
- `@example [VERSION].1: First Example`
- `@example [VERSION].2: Second Example`
- `@example [VERSION].3: Third Example`

---

## Cross-References

### Documentation Links

```typescript
@see {@link ../docs/[DOC-FILE].md Related Documentation}
```

### Test Links

```typescript
@see {@link ../test/[TEST-FILE].ts Related Tests}
```

### External Links

```typescript
@see {@link https://bun.sh/docs/... Bun Documentation}
@see {@link https://developer.mozilla.org/... MDN Documentation}
```

---

## Categories

### Common Categories

- `BP-URLPATTERN` - URLPattern API examples
- `BP-BUILD` - Build and compilation examples
- `BP-DEMO` - General demonstrations
- `BP-SECURITY` - Security examples
- `BP-NETWORKING` - Network and server examples
- `BP-UTILS` - Utility examples

---

## Enhanced Examples

### ✅ Enhanced

- `urlpattern-basic-examples.ts` - Version 1.3.4.1.0.0.0
- `build-standalone-example.ts` - Version 1.3.4.2.0.0.0
- `demos/tag-manager.ts` - Version 6.3.0.0.0.0.0
- `demos/tag-manager-pro.ts` - Version 6.3.2.0.0.0.0
- `demos/demo-bun-utils.ts` - Version 6.2.0.0.0.0.0

### 🔄 Needs Enhancement

- `bun-1.3.4-urlpattern.ts`
- `bun-fetch-api-examples.ts`
- `bun-fetch-streaming-examples.ts`
- `bun-security-examples.ts`
- `bun-serve-examples.ts`
- Other example files

---

## Enhancement Checklist

When enhancing an example file, ensure:

- [ ] Version number assigned
- [ ] Blueprint metadata added
- [ ] Instance ID created
- [ ] Ripgrep patterns defined
- [ ] Demonstrates section filled
- [ ] At least 2 @example entries
- [ ] Cross-references to docs/tests
- [ ] Run command specified
- [ ] Author and since tags added
- [ ] Ripgrep comments at end

---

## Benefits

### Discoverability

- **Ripgrep**: Find examples by version, name, or pattern
- **Cross-references**: Navigate between docs, tests, and examples
- **Version tracking**: Understand which Bun version features are demonstrated

### Documentation Integration

- **Auto-linking**: Documentation can reference examples
- **Test formulas**: Clear testing instructions
- **Code snippets**: Copy-paste ready examples

### Maintenance

- **Version tracking**: Know when examples were created/updated
- **Blueprint tracking**: Understand example relationships
- **Consistency**: Standardized metadata format

---

## Related Documentation

- [Examples README](./README.md) - Main examples index
- [Examples Commands](./COMMANDS.md) - Command reference
- [Naming Conventions](../docs/NAMING-CONVENTIONS.md) - Code style guidelines
- [Anti-Patterns Guide](../docs/ANTI-PATTERNS.md) - Common mistakes to avoid

---

**Last Updated**: 2025-12-08  
**Status**: ✅ Pattern Established
