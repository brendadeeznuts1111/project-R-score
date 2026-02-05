# Bun Filter Examples

**Reference**: [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)

---

## Multiple Filter Examples

### Basic Multiple Filters

```bash
# Check multiple workspace packages
bun outdated --filter @monorepo/types --filter @monorepo/cli

# Each --filter adds another package to check
bun outdated --filter '.' --filter 'bench'
```

### Filter Patterns

```bash
# All packages in a scope
bun outdated --filter '@graph/*'

# Specific packages
bun outdated --filter '@graph/types' --filter '@graph/api'

# Root + specific packages
bun outdated --filter '.' --filter '@graph/types'
```

### Combining Filters with Exclusions

```bash
# Include some, exclude others
bun outdated --filter '@graph/*' '!@graph/dev'

# Multiple includes and excludes
bun outdated --filter '@graph/types' --filter '@graph/api' '!@types/*'
```

---

## Real-World Examples

### Check Production Dependencies Only

```bash
# Root workspace, exclude dev dependencies
bun outdated --filter '.' '!@types/*'

# Multiple workspaces, exclude dev dependencies
bun outdated --filter '.' --filter 'bench' '!@types/*'
```

### Check Specific Scopes

```bash
# All @graph packages
bun outdated --filter '@graph/*'

# Specific @graph packages
bun outdated --filter '@graph/types' --filter '@graph/api' --filter '@graph/cli'
```

### Monorepo Workflow

```bash
# Check all workspaces
bun outdated --filter '*' 

# Check root + specific packages
bun outdated --filter '.' --filter '@monorepo/types' --filter '@monorepo/cli'

# Production dependencies across workspaces
bun outdated --filter '*' '!@types/*'
```

---

## Integration with Scripts

### PM Check Script

```bash
# Multiple filters
bun run pm:check --filter @graph/types --filter @graph/api

# With exclusions
bun run pm:check --filter '@graph/*' --exclude '@graph/dev'
```

### Publish Script

```bash
# Publish specific package
VERSION=1.4.1 bun run publish:graph --package @graph/types
```

---

## Filter Syntax Reference

| Syntax | Description | Example |
|--------|-------------|---------|
| `--filter <name>` | Single package | `--filter @graph/types` |
| `--filter <name> --filter <name>` | Multiple packages | `--filter @graph/types --filter @graph/api` |
| `--filter <pattern>` | Pattern match | `--filter '@graph/*'` |
| `'!pattern'` | Exclusion | `'!@types/*'` |
| `--filter '.'` | Root workspace | `--filter '.'` |
| `--filter '*'` | All workspaces | `--filter '*'` |

---

## Common Patterns

### Development Workflow

```bash
# Check your package only
bun outdated --filter @monorepo/types

# Check related packages
bun outdated --filter @monorepo/types --filter @monorepo/api

# Check all except dev
bun outdated --filter '*' '!@types/*'
```

### CI/CD Workflow

```bash
# Check all production dependencies
bun outdated --filter '*' '!@types/*' '!*test*'

# Check specific packages for security
bun outdated --filter '@graph/types' --filter '@graph/api'
```

---

## See Also

- [Bun Workspace Filter](./BUN-WORKSPACE-FILTER.md) - Complete filter guide
- [Bun PM Commands](./BUN-PM-COMMANDS.md) - Package manager commands
- [Bun Workspaces](./BUN-WORKSPACES.md) - Workspace configuration
