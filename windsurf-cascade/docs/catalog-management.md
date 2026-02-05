# 📦 Bun v1.3 Catalog Management Guide

This guide explains how to use Bun v1.3's enhanced dependency catalog system to synchronize versions across the Odds Protocol monorepo.

## 🎯 What are Catalogs?

Bun v1.3 catalogs centralize dependency version management across monorepo packages. Define versions once in your root `package.json` and reference them in workspace packages using the `catalog:` prefix.

### Benefits
- **Version Consistency**: All packages use the same dependency versions
- **Easy Updates**: Update versions once in the root catalog
- **Reduced Conflicts**: Eliminates version mismatches across packages
- **Simplified Maintenance**: Centralized dependency management
- **Better Security**: Easier to audit and update vulnerable dependencies

## 📁 Catalog Structure

### Root Package.json
```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "typescript": "^5.4.5",
      "@types/bun": "latest",
      "zod": "^3.22.4"
    },
    "catalogs": {
      "websocket": {
        "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.40.0",
        "ws": "^8.14.2"
      },
      "testing": {
        "vitest": "^1.3.1",
        "@vitest/coverage-v8": "^1.3.1"
      }
    }
  }
}
```

### Workspace Package Usage
```json
{
  "name": "@company/ui",
  "dependencies": {
    "typescript": "catalog:",
    "zod": "catalog:",
    "ws": "catalog:websocket"
  },
  "devDependencies": {
    "vitest": "catalog:testing"
  }
}
```

## 🚀 Available Scripts

### Validation & Analysis
```bash
# Validate catalog configuration
bun run catalog:validate

# Generate comprehensive report
bun run catalog:report

# Check for outdated packages
bun run catalog:update --check-outdated
```

### Synchronization
```bash
# Analyze potential migrations (dry run)
bun run catalog:sync

# Apply catalog migrations
bun run catalog:sync --apply

# Generate detailed sync report
bun run catalog:sync --report
```

### Updates & Maintenance
```bash
# Update specific package to latest
bun run catalog:update --package typescript --catalog default --latest

# Update all packages to latest versions
bun run catalog:update --latest

# Dry run updates
bun run catalog:update --latest --dry-run
```

## 📊 Catalog Categories

The Odds Protocol uses organized catalog categories:

### Default Catalog
Core dependencies used across multiple packages:
- `typescript`, `@types/bun`, `@types/node`
- `zod`, `lodash`, `date-fns`, `uuid`, `debug`
- `eslint`, `prettier`, `fast-check`

### Named Catalogs
- **`websocket`**: WebSocket-related libraries
- **`ml`**: Machine learning dependencies
- **`data`**: Data processing libraries
- **`crypto`**: Security and encryption
- **`database`**: Database drivers and clients
- **`testing`**: Testing frameworks and utilities
- **`build`**: Build tools and bundlers
- **`performance`**: Performance monitoring tools
- **`monitoring`**: Logging and metrics
- **`production`**: Production-specific dependencies
- **`development`**: Development tools
- **`bun`**: Bun-specific dependencies

## 🔧 Best Practices

### 1. Use Appropriate Catalogs
```json
// ✅ Good - Use specific catalogs
"ws": "catalog:websocket",
"vitest": "catalog:testing"

// ❌ Avoid - Put everything in default
"ws": "catalog:",
"vitest": "catalog:"
```

### 2. Keep Catalogs Organized
- Group related dependencies in named catalogs
- Use default catalog for truly universal dependencies
- Maintain semantic catalog names

### 3. Version Management
```bash
# Check what's outdated
bun run catalog:update --check-outdated

# Update systematically
bun run catalog:update --latest

# Validate after updates
bun run catalog:validate
```

### 4. Regular Maintenance
```bash
# Weekly validation
bun run catalog:validate

# Monthly comprehensive report
bun run catalog:report

# Quarterly cleanup
bun run catalog:sync --report
```

## 📈 Monitoring & Reports

### Validation Report
```bash
bun run catalog:validate
```
Shows:
- Catalog configuration validity
- Usage statistics
- Orphaned dependencies
- Errors and warnings

### Comprehensive Report
```bash
bun run catalog:report
```
Generates detailed markdown report with:
- Executive summary
- Usage analysis
- Version consistency
- Package details
- Recommendations

### Synchronization Report
```bash
bun run catalog:sync --report
```
Identifies:
- Packages not using catalogs
- Migration opportunities
- Version mismatches

## 🔄 Migration Guide

### From Direct Versions
```json
// Before
{
  "dependencies": {
    "typescript": "^5.4.5",
    "ws": "^8.14.2"
  }
}

// After
{
  "dependencies": {
    "typescript": "catalog:",
    "ws": "catalog:websocket"
  }
}
```

### Automatic Migration
```bash
# Analyze what needs migration
bun run catalog:sync

# Apply migrations
bun run catalog:sync --apply
```

## ⚡ Performance Tips

### Isolated Installs
Bun v1.3 uses isolated installs by default for better performance:
```bash
# Explicit isolated install
bun install --linker=isolated

# Fallback to hoisted if needed
bun install --linker=hoisted
```

### Fast Install
```bash
# Enable fast install backend
bun install --backend=iouring

# Cache for CI/CD
bun install --frozen-lockfile
```

## 🛠️ Advanced Usage

### Custom Catalog Scripts
Create custom scripts in `scripts/` directory:
```typescript
#!/usr/bin/env bun
// scripts/custom-catalog-check.ts

// Custom validation logic
// Automated updates
// Integration with CI/CD
```

### CI/CD Integration
```yaml
# .github/workflows/catalog-check.yml
- name: Validate Catalogs
  run: bun run catalog:validate

- name: Check Outdated
  run: bun run catalog:update --check-outdated

- name: Generate Report
  run: bun run catalog:report
```

### Environment-Specific Catalogs
```json
{
  "catalogs": {
    "development": {
      "nodemon": "^3.1.0"
    },
    "production": {
      "pm2": "^5.3.1"
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Catalog Reference Not Found
```
Error: Package "react" referenced from catalog:default not found
```
**Solution**: Add the package to the appropriate catalog in root package.json

#### 2. Version Mismatches
```
Warning: Found version mismatches across packages
```
**Solution**: Run `bun run catalog:sync --apply` to synchronize

#### 3. Orphaned Dependencies
```
Warning: Found 5 unused catalog dependencies
```
**Solution**: Remove unused entries or verify they're needed

### Debug Commands
```bash
# Detailed validation
bun run catalog:validate

# Check specific catalog
bun run catalog:validate --catalog websocket

# Verbose output
bun run catalog:sync --verbose
```

## 📚 Additional Resources

- [Bun v1.3 Documentation](https://bun.com/docs)
- [Catalog Specification](https://bun.com/docs/install/catalogs)
- [Workspace Configuration](https://bun.com/docs/install/workspaces)
- [Isolated Installs](https://bun.com/docs/install/isolated)

## 🤝 Contributing

When adding new dependencies:
1. Check if they exist in catalogs first
2. Add to appropriate catalog if new
3. Use `catalog:` reference in package.json
4. Run validation: `bun run catalog:validate`

---

*This guide covers Bun v1.3's catalog system for the Odds Protocol monorepo. For general Bun documentation, visit [bun.com](https://bun.com).*
