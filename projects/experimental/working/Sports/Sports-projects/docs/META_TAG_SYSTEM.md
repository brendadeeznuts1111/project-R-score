---
title: "#META Tag System Documentation"
type: "documentation"
status: "active"
version: "1.0.0"
created: "2025-11-15"
created_forge_date: "2025-11-15"
created_forge_time: "2025-11-15T00:00:00Z (UTC)"
created_system_time: "2025-11-15 00:00:00 (UTC)"
updated: "2025-11-15"
updated_forge_date: "2025-11-15"
updated_forge_time: "2025-11-15T00:00:00Z (UTC)"
updated_system_time: "2025-11-15 00:00:00 (UTC)"
modified: "2025-11-15"
modified_forge_date: "2025-11-15"
modified_forge_time: "2025-11-15T00:00:00Z (UTC)"
modified_system_time: "2025-11-15 00:00:00 (UTC)"
category: "documentation"
description: "Complete documentation for the [[META]] tag system - flexible metadata embedded in component IDs"
author: "bun-platform"
tags: [documentation, meta-tags, metadata, component-ids, forge-007]
priority: "high"
project: "metadata-system"
component_ref: "[#REF:META_TAG_SYSTEM_100]"
related_components:
  - "[#REF:SUGGESTION_110]"
  - "[#REF:AUTOMATED_100]"
usage: "Reference guide for using [[META]] tags in component IDs. Includes format specification, authorized keys, validation rules, and integration examples."
deprecated: false
replaces: ""
---

# `#META` Tag System Documentation

**REF**: [#REF:META_TAG_SYSTEM_100]  
**Version**: 1.0.0 | **Status**: Active | **Category**: Documentation  
**Related Components**: 
- Suggestion Engine: [#REF:SUGGESTION_110]
- Policy Engine: [#REF:AUTOMATED_100]

## Overview

The `#META` tag is the workhorse of the metadata system, providing crucial flexibility and extensibility within the strict structure of component IDs. It enables arbitrary, flexible, and context-specific metadata to be embedded directly into component ID strings.

## Format Specification

### Basic Format

```
[#META:key1=value1,key2=value2,key3=value3]
```

### Rules

1. **Separator**: Comma (`,`) is the primary separator between key-value pairs
2. **Delimiter**: Equals sign (`=`) separates the key from its value
3. **No Whitespace**: **Strictly no whitespace** around commas or equals signs within the tag
4. **Key Naming**: `UPPER_SNAKE_CASE` (e.g., `OWNER_TEAM`, `DEPLOYMENT_REGION`, `CRITICAL_PATH`)
5. **Value Naming**: Flexible, but single-word or `kebab-case` values are preferred
6. **Quoted Values**: Values containing spaces or commas should be quoted: `DESCRIPTION="This is a description"`

### Examples

**Valid:**
```
[#META:OWNER_TEAM=dev-team-a,PRIORITY=high]
[#META:KEY1=value1,KEY2=value2]
[#META:DESCRIPTION="Short summary text"]
```

**Invalid:**
```
[#META:KEY1 = value1, KEY2=value2]  ❌ Whitespace around equals/comma
[#META:invalid-key=value]          ❌ Key not UPPER_SNAKE_CASE
[#META:KEY1=value1, ]              ❌ Empty pair
```

## Authorized Keys

The system validates `#META` tags against an authorized keys whitelist defined in `config/meta-keys.json`. This prevents arbitrary proliferation and ensures consistency.

### Common Keys

| Key                | Description                        | Example Values                                     |
| ------------------ | ---------------------------------- | -------------------------------------------------- |
| `AUDIENCE`         | Who is this component for          | `operators`, `developers`, `stakeholders`          |
| `SECTION`          | Context within a document          | `intro`, `overview`, `deployment`, `monitoring`    |
| `PRIORITY`         | Business priority                  | `high`, `medium`, `low`, `urgent`, `critical`      |
| `OWNER_TEAM`       | Responsible team                   | `dev-team-a`, `platform-squad`                     |
| `DEPLOYMENT_ENV`   | Deployment environment             | `prod`, `staging`, `dev`, `test`, `local`          |
| `CRITICAL_PATH`    | Extreme importance flag            | `true`, `false`                                    |
| `DATA_SENSITIVITY` | Data classification                | `PII`, `PCI`, `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` |
| `SECURITY_LEVEL`   | Security classification            | `L1`, `L2`, `L3`, `L4`, `L5`                       |
| `FRAMEWORK`        | Framework used (CLIENT components) | `React`, `Vue`, `Solid`, `Svelte`                  |
| `AUTH_METHOD`      | Authentication mechanism           | `JWT`, `OAuth2`, `API-Key`, `Basic`                |
| `PROTOCOL`         | Communication protocol             | `gRPC`, `REST`, `Kafka`, `WebSocket`, `GraphQL`    |
| `DESCRIPTION`      | Short text summary                 | Freeform (max 100 chars)                           |
| `STATUS_CODE`      | HTTP status code (API components)  | `200-OK`, `404-NOT_FOUND`                          |
| `BUN_RUNTIME`      | Bun runtime configuration          | `native`, `node`, `bun`                            |
| `BUN_API`          | Bun API features used              | Freeform                                           |
| `HSL_PHASE`        | HSL color phase for categorization | Freeform (kebab-case)                              |

## Validation: FORGE-007

The `#META` tag is validated by **FORGE-007: Meta Parse Failure (META_CORRUPTION)**.

### Violation Triggers

1. **Format Violations**:
   - Whitespace around commas or equals signs
   - Invalid key format (not UPPER_SNAKE_CASE)
   - Missing equals sign in key-value pair
   - Empty key-value pairs

2. **Validation Errors**:
   - Key not in authorized keys whitelist (warning)
   - Invalid enum value for constrained keys
   - Value doesn't match pattern (for freeform keys with patterns)
   - Value exceeds max length

### Example Violation Output

```
[FORGE-007][CHROMA/SERVER/APIGATEWAY][META_CORRUPTION][CH:FF00FF][hsl(300,100%,50%)]
  [[META]] tag parse error: Whitespace violation: no spaces allowed around commas or equals signs
  └─ Expected Format: [#META:key1=value1,key2=value2,...] (no whitespace around commas or equals)
  └─ Invalid: [[META]]:KEY1 = value1, KEY2=value2 (whitespace around comma/equals)
  └─ Valid: [[META]]:KEY1=value1,KEY2=value2
  └─ Casting: Remove all whitespace around commas and equals signs. Keys must be UPPER_SNAKE_CASE.
  └─ Auto-fix: bun forge:hammer --fix FORGE-007 --file ./vault/server/apigateway.md
  └─ Immutable ID: wyhash:9a0b1c2d3e4f5a6b
  └─ HSL Phase: hsl(300,100%,50%) (path hash: FF00FF)
```

## Usage

### Parsing

```typescript
import { parseMETATag, extractMETAFromText } from './packages/registry/meta-parser';

// Parse from tag string
const result = parseMETATag("[#META:OWNER_TEAM=dev-team-a,PRIORITY=high]");
if (result.error) {
  console.error(result.error);
} else {
  console.log(result.parsed); // { OWNER_TEAM: "dev-team-a", PRIORITY: "high" }
}

// Extract from text content
const text = "Component [#META:KEY1=value1,KEY2=value2] description";
const extracted = extractMETAFromText(text);
```

### Validation

```typescript
import { validateMetaKeys } from './packages/registry/meta-parser';

const parsed = { OWNER_TEAM: "dev-team-a", PRIORITY: "high" };
const validation = await validateMetaKeys(parsed);

if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
  console.warn("Warnings:", validation.warnings);
}
```

### Formatting

```typescript
import { formatMETATag } from './packages/registry/meta-parser';

const meta = {
  OWNER_TEAM: "dev-team-a",
  PRIORITY: "high",
  DESCRIPTION: "This is a description"
};

const formatted = formatMETATag(meta);
// Returns: [#META:OWNER_TEAM=dev-team-a,PRIORITY=high,DESCRIPTION="This is a description"]
```

## Integration Points

### 1. Parsing (`tools/arch-parser.ts`)

The `parseComponentId` function extracts `[#META:...]` tags and parses them into a `meta` object:

```typescript
const parsed = parseComponentId("DOMAIN/PATH/COMPONENT [#META:KEY1=value1]");
// parsed.meta = { KEY1: "value1" }
```

### 2. Validation (`scripts/validate-vault-frontmatter.ts`)

The validation script automatically checks all `#META` tags in markdown files and reports FORGE-007 violations.

### 3. Querying (`bun-platform search-notes`)

Future enhancement: Filter notes by `#META` tags:
```bash
bun-platform search-notes --meta="owner=DevTeamA,critical_path=true"
```

### 4. Generation (`bun-platform create-note`)

Future enhancement: Generate `#META` tags from CLI:
```bash
bun-platform create-note --meta-tags="OWNER_TEAM=dev-team-a,PRIORITY=high"
```

## Configuration

The authorized keys configuration is stored in `config/meta-keys.json`. To add a new key:

1. Edit `config/meta-keys.json`
2. Add the key definition with:
   - `description`: What the key represents
   - `values`: Array of allowed values or `"freeform"`
   - `required`: Whether the key is required
   - `pattern`: Regex pattern for freeform values (optional)
   - `maxLength`: Maximum length for freeform values (optional)

Example:
```json
{
  "authorizedKeys": {
    "NEW_KEY": {
      "description": "Description of the new key",
      "values": ["value1", "value2"],
      "required": false
    }
  }
}
```

## Best Practices

1. **Use Authorized Keys**: Always use keys from the authorized list when possible
2. **Consistent Naming**: Use `UPPER_SNAKE_CASE` for keys, `kebab-case` for values
3. **No Whitespace**: Never add whitespace around commas or equals signs
4. **Quote Complex Values**: Use quotes for values containing spaces or commas
5. **Keep Values Short**: Prefer single-word or short kebab-case values
6. **Validate Early**: Run `bun scripts/validate-vault-frontmatter.ts` to catch violations

## Testing

Run the test suite:
```bash
bun test packages/registry/meta-parser.test.ts
```

## Advanced Usage

### Real-World Examples

#### Component with Multiple Metadata
```
FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0 [#META:OWNER_TEAM=forge-intelligence,PRIORITY=critical,DEPLOYMENT_ENV=prod,CRITICAL_PATH=true,DATA_SENSITIVITY=INTERNAL]
```

#### API Component with Protocol Metadata
```
CHROMA/SERVER/API/GATEWAY_v2.0.0 [#META:PROTOCOL=REST,AUTH_METHOD=JWT,STATUS_CODE=200-OK,DEPLOYMENT_ENV=prod]
```

#### Client Component with Framework
```
CHROMA/CLIENT/DASHBOARD/ADMIN_PANEL_v1.0.0 [#META:FRAMEWORK=React,AUDIENCE=admins,SECURITY_LEVEL=L4]
```

### Integration with Frontmatter Properties

The `#META` tag system complements the frontmatter properties system:

| System                     | Purpose                           | Location            |
| -------------------------- | --------------------------------- | ------------------- |
| **Frontmatter Properties** | Document metadata (88 properties) | YAML frontmatter    |
| **#META Tags**             | Component ID metadata (flexible)  | Component ID string |

**Example**: A component note might have:
```yaml
---
component_id: "FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0 [#META:OWNER_TEAM=forge-intelligence,PRIORITY=critical]"
owner: "forge-intelligence"
priority: "critical"
---
```

### Querying and Filtering

#### By Owner Team
```bash
# Find all components owned by a specific team
grep -r "\[#META:.*OWNER_TEAM=forge-intelligence" vault/
```

#### By Priority
```bash
# Find all critical components
grep -r "\[#META:.*PRIORITY=critical" vault/
```

#### By Deployment Environment
```bash
# Find all production components
grep -r "\[#META:.*DEPLOYMENT_ENV=prod" vault/
```

### Programmatic Access

#### Extract META Tags from Component IDs
```typescript
import { extractMETAFromText } from './packages/registry/meta-parser';

const componentId = "FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0 [#META:OWNER_TEAM=forge-intelligence,PRIORITY=critical]";
const meta = extractMETAFromText(componentId);
// Returns: { OWNER_TEAM: "forge-intelligence", PRIORITY: "critical" }
```

#### Filter Components by META Tags
```typescript
import { parseComponentId } from './tools/arch-parser';

const components = [
  "FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0 [#META:OWNER_TEAM=forge-intelligence,PRIORITY=critical]",
  "CHROMA/SERVER/API/GATEWAY_v2.0.0 [#META:OWNER_TEAM=platform-squad,PRIORITY=high]"
];

const criticalComponents = components
  .map(id => parseComponentId(id))
  .filter(parsed => parsed.meta?.PRIORITY === 'critical');
```

## Relationship to Other Systems

### Frontmatter Properties System

The `#META` tag system works alongside the frontmatter properties system:

- **Frontmatter Properties**: 88 standardized properties in YAML frontmatter
- **#META Tags**: Flexible, extensible metadata in component ID strings
- **Use Case**: Frontmatter for document metadata, [[META]] for component-specific metadata

### Component ID System

The `#META` tag is embedded within component IDs:

```
DOMAIN/PATH/COMPONENT_NAME_v1.0.0 [#META:KEY1=value1,KEY2=value2]
```

This allows metadata to travel with the component ID without requiring separate storage.

### FORGE Validation System

The `#META` tag is validated by **FORGE-007: Meta Parse Failure (META_CORRUPTION)**:

- Format violations trigger FORGE-007 errors
- Validation runs automatically via `scripts/validate-vault-frontmatter.ts`
- Auto-fix available via `bun forge:hammer --fix FORGE-007`

## Common Patterns

### Pattern 1: Team Ownership
```
[#META:OWNER_TEAM=team-name,PRIORITY=high]
```

### Pattern 2: Deployment Context
```
[#META:DEPLOYMENT_ENV=prod,CRITICAL_PATH=true]
```

### Pattern 3: Security Classification
```
[#META:DATA_SENSITIVITY=PII,SECURITY_LEVEL=L4]
```

### Pattern 4: Technical Stack
```
[#META:FRAMEWORK=React,PROTOCOL=REST,AUTH_METHOD=JWT]
```

### Pattern 5: Component Context
```
[#META:AUDIENCE=operators,SECTION=monitoring,DESCRIPTION="Real-time monitoring dashboard"]
```

## Troubleshooting

### Common Issues

#### Issue: Whitespace Violations
**Error**: `FORGE-007: Whitespace violation`
**Fix**: Remove all whitespace around commas and equals signs
```diff
- [#META:KEY1 = value1, KEY2=value2]
+ [#META:KEY1=value1,KEY2=value2]
```

#### Issue: Invalid Key Format
**Error**: `Key not UPPER_SNAKE_CASE`
**Fix**: Convert to UPPER_SNAKE_CASE
```diff
- [#META:owner-team=value]
+ [#META:OWNER_TEAM=value]
```

#### Issue: Unauthorized Key
**Warning**: `Key not in authorized keys whitelist`
**Fix**: Use authorized key or add to `config/meta-keys.json`

#### Issue: Invalid Enum Value
**Error**: `Invalid enum value for constrained key`
**Fix**: Use allowed value from `config/meta-keys.json`
```diff
- [#META:PRIORITY=urgent]
+ [#META:PRIORITY=critical]
```

## Migration Guide

### Adding META Tags to Existing Components

1. **Identify Component**: Find component ID in architecture notes
2. **Determine Metadata**: Decide which keys apply
3. **Add Tag**: Append `[#META:KEY=value]` to component ID
4. **Validate**: Run `bun scripts/validate-vault-frontmatter.ts`
5. **Update References**: Update all references to component ID

### Example Migration

**Before**:
```
FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0
```

**After**:
```
FORGE/INTELLIGENCE/SUGGESTION/ENGINE/SUGGESTION_ENGINE_v1.1.0 [#META:OWNER_TEAM=forge-intelligence,PRIORITY=critical,DEPLOYMENT_ENV=prod]
```

## Performance Considerations

### Parsing Performance
- META tag parsing is optimized for speed
- Regex-based extraction is efficient
- Validation is cached for repeated keys

### Storage Impact
- META tags add minimal overhead to component IDs
- Average tag length: ~50-100 characters
- No separate storage required (embedded in ID)

## Future Enhancements

### Planned Features

1. **CLI Query Tool**: `bun-platform search-components --meta="OWNER_TEAM=forge-intelligence"`
2. **Auto-Generation**: Generate META tags from frontmatter properties
3. **Validation Dashboard**: Visual dashboard for META tag compliance
4. **Migration Tool**: Automated migration of existing components
5. **Query Language**: Advanced querying with logical operators

### Integration Roadmap

- **Phase 1**: Core parsing and validation ✅
- **Phase 2**: CLI query tools (in progress)
- **Phase 3**: Auto-generation from frontmatter
- **Phase 4**: Advanced querying and filtering
- **Phase 5**: Dashboard integration

## References

- **FORGE-007**: `packages/registry/hammer.ts`
- **Parser**: `packages/registry/meta-parser.ts`
- **Config**: `config/meta-keys.json`
- **Validation**: `scripts/validate-vault-frontmatter.ts`
- **Architecture Parser**: `tools/arch-parser.ts`
- **Quick Reference**: `docs/META_TAG_QUICK_REFERENCE.md`
- **Frontmatter Properties**: `docs/PROPERTIES_BY_CATEGORY.md`

## Related Documentation

### In Vault
- **[[META_TAG_REGISTRY|🏷️ META Tag Registry]]** - Registry documentation
- **[[PROPERTIES_BY_CATEGORY|📋 Properties by Category]]** - Frontmatter properties reference (88 properties)
- **[[GOLDEN_FILE_STANDARD|✨ Golden File Standard]]** - Complete file standards

### In Feed Project
- **META_TAG_QUICK_REFERENCE.md** - Quick reference guide (`docs/META_TAG_QUICK_REFERENCE.md`)
- **META_TAG_SYSTEM.md** - This file (`docs/META_TAG_SYSTEM.md`)
- **meta-keys.json** - Authorized keys configuration (`config/meta-keys.json`)

---

*The `#META` tag marries strict machine-readability with human-driven flexibility, enabling rich, dynamic querying and rapid extensibility of metadata without structural changes.*

