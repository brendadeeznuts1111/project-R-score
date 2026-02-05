# Bun Workspace Filter

**Reference**: [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)

---

## Filtering Workspace Packages

The `--filter` flag allows you to target specific workspace packages in monorepos.

---

## Basic Usage

### Filter by Package Name

```bash
# Check outdated packages in specific workspaces (multiple filters)
bun outdated --filter @monorepo/types --filter @monorepo/cli

# Install dependencies for specific packages
bun install --filter @graph/types --filter @graph/api

# Run tests in specific workspaces
bun test --filter @graph/types
```

**Multiple Filters**: You can use multiple `--filter` flags to check multiple packages:

```bash
# Check multiple workspace packages
bun outdated --filter @monorepo/types --filter @monorepo/cli --filter @monorepo/api

# Each --filter flag adds another package to check
bun outdated --filter '.' --filter 'bench'
```

### Filter by Pattern

```bash
# All @graph packages
bun outdated --filter "@graph/*"

# All packages in packages/ directory
bun outdated --filter "packages/*"

# Root workspace
bun outdated --filter "."
```

---

## Common Commands with Filter

### Outdated Packages

```bash
# Check all @graph packages
bun outdated --filter "@graph/*"

# Check specific packages
bun outdated --filter @graph/types --filter @graph/api

# Or use npm script
bun run pm:outdated:graph
```

### Install Dependencies

```bash
# Install for specific packages
bun install --filter @graph/types

# Install for multiple packages
bun install --filter @graph/types --filter @graph/api
```

### Run Tests

```bash
# Test specific workspace
bun test --filter @graph/types

# Test multiple workspaces
bun test --filter @graph/types --filter @graph/api
```

### Publish

```bash
# Publish specific package (via our script)
VERSION=1.4.1 bun run publish:graph --package @graph/types
```

---

## Filter Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `@scope/name` | Exact package name | `@graph/types` |
| `@scope/*` | All packages in scope | `@graph/*` |
| `packages/*` | All packages in directory | `packages/*` |
| `.` | Root workspace | `.` |
| `*` | All workspaces | `*` |
| `!pattern` | Exclude pattern (negation) | `!@types/*` |

### Negation Patterns

Exclude packages from results using `!` prefix:

```bash
# Check outdated, excluding @types packages
bun outdated '!@types/*'

# Exclude multiple patterns
bun outdated '!@types/*' '!@graph/*'

# Include some, exclude others
bun outdated '@graph/*' '!@graph/dev'
```

**Common Use Cases**:
- Exclude dev dependencies (`!@types/*`)
- Exclude test packages (`!*test*`)
- Exclude specific scopes (`!@internal/*`)

---

## Integration with Our Scripts

### PM Check Script

```bash
# Check outdated for specific packages
bun run pm:check --filter @graph/types --filter @graph/api

# Check all @graph packages
bun run pm:check --filter "@graph/*"
```

### Publish Script

```bash
# Publish specific package
VERSION=1.4.1 bun run publish:graph --package @graph/types
```

---

## Examples

### Check Outdated in Workspace

```bash
# All @graph packages
bun outdated --filter "@graph/*"

# Specific packages
bun outdated --filter @graph/types --filter @graph/cli

# Root + specific packages
bun outdated --filter "." --filter @graph/types
```

### Install for Workspace

```bash
# Install dependencies for @graph/types
bun install --filter @graph/types

# Install for multiple packages
bun install --filter @graph/types --filter @graph/api
```

### Run Commands in Workspace

```bash
# Test specific workspace
bun test --filter @graph/types

# Build specific workspace
bun build --filter @graph/types

# Run script in workspace
bun run --filter @graph/types build
```

---

## NPM Scripts

```json
{
  "scripts": {
    "pm:outdated:graph": "bun outdated --filter '@graph/*'"
  }
}
```

**Usage**:
```bash
bun run pm:outdated:graph
```

---

## Best Practices

### 1. Use Filters for Monorepo Operations

```bash
# Instead of running in each package directory
cd packages/types && bun outdated

# Use filter
bun outdated --filter @graph/types
```

### 2. Combine Multiple Filters

```bash
# Check multiple packages at once
bun outdated --filter @graph/types --filter @graph/api --filter @graph/cli
```

### 3. Use Patterns for Bulk Operations

```bash
# All @graph packages
bun outdated --filter "@graph/*"

# All packages in packages/
bun outdated --filter "packages/*"
```

---

## Related Documentation

- [Bun Workspaces](./BUN-WORKSPACES.md) - Workspace configuration
- [Bun PM Commands](./BUN-PM-COMMANDS.md) - Package manager commands
- [Bun Workspaces with Private Registry](./BUN-WORKSPACES-PRIVATE-REGISTRY.md) - Registry setup
