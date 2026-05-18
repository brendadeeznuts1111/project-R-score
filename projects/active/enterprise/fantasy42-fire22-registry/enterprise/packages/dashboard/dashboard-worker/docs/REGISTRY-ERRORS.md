# Registry Error Documentation

## Common Registry Errors and Solutions

### 404_PACKAGE_NOT_FOUND

**Description:** Package not found in registry **Solution:** Ensure package name
is correct and registry URL is valid **Related URL:**
https://packages.apexodds.net

### INVALID_REGISTRY

**Description:** Registry URL is not accessible or returns errors **Solution:**
Use official npm registry: https://registry.npmjs.org/

### SCOPED_REGISTRY_FAIL

**Description:** Scoped package registry is not accessible **Solution:**
Fallback to main registry for scoped packages

### VERSION_MISMATCH

**Description:** Requested version not available in registry **Solution:** Use
latest compatible version or check package.json constraints

## Quick Fixes

### 1. Complete Reset

```bash
bun run scripts/fix-registry-config.ts --fix
```

### 2. Manual Registry Override

```bash
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun install
```

### 3. Clear All Caches

```bash
rm -rf node_modules .bun bun.lockb
bun install --force
```

## Dependency Installation Process

### For New Dependencies

```bash
# 1. Always use the helper script
bun run scripts/add-dependency.ts <package-name>

# 2. Or manually with registry override
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun add <package-name>
```

### For Dev Dependencies

```bash
bun run scripts/add-dependency.ts --dev <package-name>
```

## Verified Working Registries

- ✅ https://registry.npmjs.org/ (Official NPM)
- ❌ https://packages.apexodds.net/ (Returns 404)
- ❌ https://fire22.workers.dev/registry/ (Not accessible)

## Environment Variables

Set these in your shell or .env file:

- `BUN_CONFIG_REGISTRY`: Override default registry
- `NPM_CONFIG_REGISTRY`: NPM registry override
- `BUN_CONFIG_NO_CUSTOM_REGISTRIES`: Disable all custom registries
