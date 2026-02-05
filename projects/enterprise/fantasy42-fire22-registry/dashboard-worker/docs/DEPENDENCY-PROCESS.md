# Dependency Management Process

## Adding New Dependencies

### Step 1: Pre-Installation Check

```bash
# Check if dependency exists in npm registry
npm view <package-name> versions --json
```

### Step 2: Add Dependency

```bash
# Use our helper script (recommended)
bun run scripts/add-dependency.ts <package-name>

# Or manually with safeguards
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/ bun add <package-name>
```

### Step 3: Verify Installation

```bash
# Check that dependency was added
bun pm ls | grep <package-name>

# Test import
bun run -e "import '<package-name>'; console.log('✓ Import works')"
```

### Step 4: Update Documentation

Add the dependency to `docs/DEPENDENCIES.md` with:

- Package name and version
- Purpose/usage
- License information
- Security considerations

## Cloudflare Workers Compatibility

### Compatible Package Types

✅ Pure JavaScript/TypeScript packages ✅ Packages with WebAssembly ✅ Packages
using Web APIs (fetch, crypto, etc.) ✅ ESM modules

### Incompatible Package Types

❌ Node.js built-in modules (fs, path, etc.) ❌ Native addons (.node files) ❌
Packages requiring Node.js runtime

### Checking Compatibility

```bash
# Check if package uses Node.js APIs
npm view <package-name> dependencies

# Test in Workers environment
wrangler dev --test <package-name>
```

## Dependency Update Process

### Weekly Updates

```bash
# Check for updates
bun outdated

# Update patch versions
bun update

# Update minor versions
bun update --latest
```

### Security Updates

```bash
# Run security audit
bun audit

# Fix vulnerabilities
bun audit fix
```
