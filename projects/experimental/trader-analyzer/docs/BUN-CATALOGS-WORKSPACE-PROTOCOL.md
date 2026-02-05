# Bun Catalogs & Workspace Protocol

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Catalogs Documentation](https://bun.com/docs/pm/catalogs)

## Overview

Bun provides two powerful features for managing dependencies in monorepos:

1. **Catalogs** — Share common dependency versions across multiple packages
2. **Workspace Protocol** — Reference local workspace packages with version resolution

---

## Catalogs

### What are Catalogs?

Catalogs let you define common dependency versions once in the root `package.json` and reference them consistently throughout your monorepo. This ensures all packages use the same version of critical dependencies.

### Benefits

- ✅ **Consistency** — All packages use the same version of critical dependencies
- ✅ **Maintenance** — Update a dependency version in one place instead of across multiple package.json files
- ✅ **Clarity** — Makes it obvious which dependencies are standardized across your monorepo
- ✅ **Simplicity** — No need for complex version resolution strategies or external tools

### How to Use Catalogs

#### 1. Define Catalogs in Root package.json

**Single Catalog** (`catalog`):
```json
{
  "name": "my-monorepo",
  "catalog": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0"
  },
  "workspaces": ["packages/*"]
}
```

**Multiple Named Catalogs** (`catalogs`):
```json
{
  "name": "my-monorepo",
  "catalogs": {
    "ui": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "testing": {
      "jest": "30.0.0",
      "testing-library": "14.0.0"
    },
    "build": {
      "webpack": "5.88.2",
      "babel": "7.22.10"
    }
  },
  "workspaces": ["packages/*"]
}
```

**Combined** (both `catalog` and `catalogs`):
```json
{
  "name": "my-monorepo",
  "catalog": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "catalogs": {
    "testing": {
      "jest": "30.0.0"
    }
  },
  "workspaces": ["packages/*"]
}
```

#### 2. Reference Catalog Versions in Workspace Packages

**Default Catalog** (`catalog:`):
```json
{
  "name": "app",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

**Named Catalogs** (`catalog:<name>`):
```json
{
  "name": "app",
  "dependencies": {
    "react": "catalog:",
    "jest": "catalog:testing",
    "webpack": "catalog:build"
  }
}
```

#### 3. Run Bun Install

```bash
bun install
```

Bun resolves all `catalog:` references to the versions defined in the root `package.json`.

### Updating Versions

To update versions across all packages, simply change the version in the root `package.json`:

```json
{
  "catalog": {
    "react": "^19.1.0",  // Updated from ^19.0.0
    "react-dom": "^19.1.0"  // Updated from ^19.0.0
  }
}
```

Then run `bun install` to update all packages.

### Lockfile Integration

Bun's lockfile tracks catalog versions:

```json
{
  "lockfileVersion": 1,
  "catalog": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "catalogs": {
    "testing": {
      "jest": "30.0.0"
    }
  }
}
```

---

## Workspace Protocol

### What is the Workspace Protocol?

The `workspace:` protocol allows you to reference local workspace packages in your monorepo. Bun resolves these references to the actual workspace packages.

### Syntax

```json
{
  "dependencies": {
    "@nexus/utils": "workspace:*",
    "@nexus/ui": "workspace:^1.0.0",
    "@nexus/api": "workspace:1.0.2"
  }
}
```

### Version Resolution

Bun resolves workspace protocol versions as follows:

| Protocol | Resolution |
|----------|------------|
| `workspace:*` | Matches any version (always resolves to workspace package) |
| `workspace:^1.0.0` | Matches semver range (resolves to workspace package if version matches) |
| `workspace:1.0.2` | Exact version match (resolves to `1.0.2` even if current version is `1.0.1`) |

**Important**: `workspace:1.0.2` resolves to `1.0.2` even if the current workspace package version is `1.0.1`. This allows you to specify the version you want to use, and Bun will use that version when publishing.

### Example

**Root package.json**:
```json
{
  "name": "my-monorepo",
  "workspaces": ["packages/*"]
}
```

**packages/utils/package.json**:
```json
{
  "name": "@nexus/utils",
  "version": "1.0.1"
}
```

**packages/app/package.json**:
```json
{
  "name": "app",
  "dependencies": {
    "@nexus/utils": "workspace:1.0.2"
  }
}
```

When you run `bun install`, Bun resolves `workspace:1.0.2` to version `1.0.2`, even though the current workspace package version is `1.0.1`.

### Publishing

When you run `bun publish` or `bun pm pack`, Bun automatically replaces `workspace:` references with the resolved version numbers. The published package includes regular semver strings and no longer depends on your catalog definitions.

**Before publishing**:
```json
{
  "dependencies": {
    "@nexus/utils": "workspace:1.0.2"
  }
}
```

**After publishing**:
```json
{
  "dependencies": {
    "@nexus/utils": "1.0.2"
  }
}
```

---

## Real-World Example

### Complete Monorepo Setup

**Root package.json**:
```json
{
  "name": "@nexus/trader-analyzer",
  "version": "0.1.0",
  "workspaces": ["bench", "packages/*"],
  "catalog": {
    "typescript": "^5.0.0",
    "@types/bun": "latest"
  },
  "catalogs": {
    "testing": {
      "jest": "30.0.0",
      "testing-library": "14.0.0"
    }
  }
}
```

**packages/utils/package.json**:
```json
{
  "name": "@nexus/utils",
  "version": "1.0.1",
  "dependencies": {
    "typescript": "catalog:"
  },
  "devDependencies": {
    "jest": "catalog:testing"
  }
}
```

**packages/api/package.json**:
```json
{
  "name": "@nexus/api",
  "version": "1.0.2",
  "dependencies": {
    "@nexus/utils": "workspace:1.0.2",
    "typescript": "catalog:"
  },
  "devDependencies": {
    "jest": "catalog:testing"
  }
}
```

**packages/app/package.json**:
```json
{
  "name": "app",
  "dependencies": {
    "@nexus/utils": "workspace:*",
    "@nexus/api": "workspace:^1.0.0",
    "typescript": "catalog:"
  }
}
```

---

## Limitations and Edge Cases

### Catalogs

- Catalog references must match a dependency defined in either `catalog` or one of the named `catalogs`
- Empty strings and whitespace in catalog names are ignored (treated as default catalog)
- Invalid dependency versions in catalogs will fail to resolve during `bun install`
- Catalogs are only available within workspaces; they cannot be used outside the monorepo

### Workspace Protocol

- `workspace:` protocol only works within the monorepo
- Version resolution follows semver rules for ranges (`workspace:^1.0.0`)
- Exact versions (`workspace:1.0.2`) resolve to that specific version, even if the workspace package version differs
- When publishing, `workspace:` references are replaced with actual version numbers

### Comparison with `bun link`

| Feature | `workspace:` Protocol | `bun link` (`link:`) |
|---------|----------------------|---------------------|
| **Scope** | Monorepo only | Global (system-wide) |
| **Registration** | Automatic (workspace config) | `bun link` command |
| **Use Case** | Monorepo workspace packages | External packages, testing |
| **Syntax** | `workspace:*` or `workspace:1.0.2` | `link:package-name` |

**See**: [Bun Link Documentation](./BUN-LINK.md) for complete `bun link` guide.

---

## Project Configuration

### Current Setup

**Workspaces**: `bench/` (configured in root `package.json`)

**Catalogs**: Not yet configured (can be added to root `package.json`)

**Workspace Protocol**: Check workspace packages for `workspace:` usage

### Adding Catalogs

To add catalogs to this project:

1. **Edit root `package.json`**:
```json
{
  "catalog": {
    "typescript": "^5.0.0",
    "@types/bun": "latest"
  },
  "catalogs": {
    "testing": {
      "jest": "30.0.0"
    }
  }
}
```

2. **Update workspace packages** to use `catalog:`:
```json
{
  "dependencies": {
    "typescript": "catalog:"
  },
  "devDependencies": {
    "jest": "catalog:testing"
  }
}
```

3. **Run `bun install`** to resolve catalog versions

### Verification Commands

```bash
# Check catalog configuration
cat package.json | grep -A 10 "catalog"

# Find workspace protocol usage
rg "workspace:" package.json packages/*/package.json bench/package.json

# List workspace packages
bun pm ls

# Verify catalog resolution
bun install --verbose
```

---

## Best Practices

### Catalogs

1. ✅ **Use catalogs for shared dependencies** — Common dependencies like TypeScript, React, testing libraries
2. ✅ **Group related dependencies** — Use named catalogs (`catalogs`) for logical groupings (testing, build, ui)
3. ✅ **Document catalog purpose** — Add comments explaining why dependencies are cataloged
4. ✅ **Keep catalogs updated** — Regularly review and update catalog versions

### Workspace Protocol

1. ✅ **Use `workspace:*` for development** — Matches any version, always resolves to workspace package
2. ✅ **Use specific versions for publishing** — `workspace:1.0.2` ensures exact version when published
3. ✅ **Document workspace dependencies** — Make it clear which packages depend on workspace packages
4. ✅ **Test before publishing** — Verify workspace protocol resolution before publishing packages

---

## Troubleshooting

### Catalog Issues

**Problem**: Catalog reference not resolving

**Solution**: 
1. Verify catalog is defined in root `package.json`
2. Check catalog name matches (case-sensitive)
3. Run `bun install` to regenerate lockfile

**Problem**: Invalid catalog version

**Solution**: 
1. Check version format in catalog definition
2. Verify package exists in registry
3. Check for typos in package names

### Workspace Protocol Issues

**Problem**: Workspace package not found

**Solution**:
1. Verify workspace is configured in root `package.json`
2. Check workspace package name matches exactly
3. Ensure workspace package exists in the monorepo

**Problem**: Version resolution incorrect

**Solution**:
1. Check workspace package version in its `package.json`
2. Verify semver range syntax (`workspace:^1.0.0`)
3. Use `workspace:*` for development, specific versions for publishing

---

## Related Documentation

- [Bun Workspaces](./BUN-WORKSPACES.md) — Complete workspace management guide
- [Bun Isolated Installs](./BUN-ISOLATED-INSTALLS.md) — Workspace installation strategy
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Lockfile format and catalog tracking
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) — Complete configuration reference

---

## Search Commands

```bash
# Find catalog definitions
rg "catalog" package.json

# Find workspace protocol usage
rg "workspace:" package.json packages/*/package.json

# Find named catalogs
rg "catalogs" package.json

# Check workspace configuration
rg "workspaces" package.json
```

---

**Status**: ⚠️ Not yet configured (can be added)  
**Catalogs**: 0 default + 0 named  
**Workspace Protocol**: Check individual workspace packages  
**Recommendation**: Add catalogs for common dependencies like TypeScript, testing libraries
