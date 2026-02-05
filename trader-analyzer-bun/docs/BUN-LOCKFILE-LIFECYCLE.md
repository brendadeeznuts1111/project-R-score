# Bun Lockfile & Lifecycle Scripts

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Lockfile Documentation](https://bun.com/docs/pm/lockfile)

## Overview

Bun's lockfile (`bun.lock`) ensures reproducible installs across environments. Unlike other package managers, Bun uses a "default-secure" approach for lifecycle scripts, requiring explicit trust for packages.

---

## Lockfile

### Format

Running `bun install` creates a lockfile called `bun.lock`.

**Should it be committed to git?**  
✅ **Yes** — Always commit `bun.lock` to version control for reproducible installs.

### Generate Lockfile Without Installing

To generate a lockfile without installing to `node_modules`:

```bash
bun install --lockfile-only
```

**Note**: Using `--lockfile-only` will still populate the global install cache with registry metadata and git/tarball dependencies.

### Opt Out

To install without creating a lockfile:

```bash
bun install --no-save
```

### Text-Based Lockfile

Bun v1.2+ changed the default lockfile format to the text-based `bun.lock`. Existing binary `bun.lockb` lockfiles can be migrated:

```bash
bun install --save-text-lockfile --frozen-lockfile --lockfile-only
# Then delete bun.lockb
```

**Benefits of text-based lockfile**:
- ✅ Human-readable
- ✅ Better for version control (smaller diffs)
- ✅ Easier to debug
- ✅ Can be manually edited if needed

### Automatic Lockfile Migration

When running `bun install` in a project without a `bun.lock`, Bun automatically migrates existing lockfiles:

- `yarn.lock` (v1)
- `package-lock.json` (npm)
- `pnpm-lock.yaml` (pnpm)

The original lockfile is preserved and can be removed manually after verification.

### Yarn Lockfile Support

To install a Yarn lockfile *in addition* to `bun.lock`:

**Command line**:
```bash
bun install --yarn
```

**Configuration** (`config/bunfig.toml`):
```toml
[install.lockfile]
# whether to save a non-Bun lockfile alongside bun.lock
# only "yarn" is supported
print = "yarn"
```

---

## Lifecycle Scripts

### Security Model

Unlike other npm clients, **Bun does not execute arbitrary lifecycle scripts by default**. This is a security feature to prevent malicious packages from running arbitrary code during installation.

### Common Lifecycle Scripts

Packages can define lifecycle scripts in their `package.json`:

- `preinstall` — Runs before the package is installed
- `postinstall` — Runs after the package is installed
- `preuninstall` — Runs before the package is uninstalled
- `prepublishOnly` — Runs before the package is published

### `postinstall` Scripts

The `postinstall` script is particularly important. It's widely used to:
- Build platform-specific binaries
- Install native Node.js add-ons
- Set up package-specific configuration

**Example**: `node-sass` uses `postinstall` to build a native binary for Sass.

### `trustedDependencies`

Bun uses a "default-secure" approach. To allow lifecycle scripts for specific packages, add them to `trustedDependencies` in your `package.json`:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "trustedDependencies": [
    "node-sass",
    "sharp",
    "bcrypt"
  ]
}
```

Once added, reinstall the package:

```bash
bun install
```

Bun will read this field and run lifecycle scripts for trusted packages.

### Default Trusted Packages

The top 500 npm packages with lifecycle scripts are allowed by default. See the full list: [default-trusted-dependencies.txt](https://github.com/oven-sh/bun/blob/main/src/install/default-trusted-dependencies.txt)

### Disable All Lifecycle Scripts

To disable lifecycle scripts for all packages:

```bash
bun install --ignore-scripts
```

---

## Scopes and Registries

### Default Registry

The default registry is `registry.npmjs.org`. Configure globally in `bunfig.toml`:

```toml
[install]
# Set default registry as a string
registry = "https://registry.npmjs.org"

# Set a token
registry = { url = "https://registry.npmjs.org", token = "123456" }

# Set username/password
registry = "https://username:password@registry.npmjs.org"
```

### Scoped Registries

Configure private registries scoped to particular organizations:

```toml
[install.scopes]
# Registry as string
"@myorg1" = "https://username:password@registry.myorg.com/"

# Registry with username/password (environment variables)
"@myorg2" = { username = "myusername", password = "$NPM_PASS", url = "https://registry.myorg.com/" }

# Registry with token
"@myorg3" = { token = "$npm_token", url = "https://registry.myorg.com/" }
```

**Current Project Configuration** (`config/bunfig.toml`):
```toml
[install.scopes]
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
"@nexus" = { token = "$NEXUS_REGISTRY_TOKEN", url = "https://registry.nexus.internal/" }
```

### `.npmrc` Support

Bun also reads `.npmrc` files. See [Bun .npmrc Documentation](https://bun.com/docs/pm/npmrc).

**See**: [Bun Registry Secrets](./BUN-REGISTRY-SECRETS.md) for secure credential management using `Bun.secrets`.

---

## Overrides and Resolutions

### Overview

Bun supports npm's `"overrides"` and Yarn's `"resolutions"` in `package.json`. These mechanisms allow you to specify version ranges for **metadependencies**—the dependencies of your dependencies.

### Why Use Overrides?

By default, Bun installs the latest version of all dependencies and metadependencies according to the ranges specified in each package's `package.json`.

**Example**: Your project depends on `foo`, which depends on `bar`. If a security vulnerability is introduced in `bar@4.5.6`, you can pin `bar` to a safer version using overrides.

### `"overrides"`

Add packages to the `"overrides"` field in `package.json`:

```json
{
  "name": "my-app",
  "dependencies": {
    "foo": "^2.0.0"
  },
  "overrides": {
    "bar": "~4.4.0"
  }
}
```

**Note**: Bun currently only supports **top-level `"overrides"`**. Nested overrides are not supported.

### `"resolutions"`

Yarn's alternative to `"overrides"`. Bun supports this for easier migration from Yarn:

```json
{
  "name": "my-app",
  "dependencies": {
    "foo": "^2.0.0"
  },
  "resolutions": {
    "bar": "~4.4.0"
  }
}
```

**Note**: As with `"overrides"`, nested resolutions are not currently supported.

### Use Cases

1. **Security vulnerabilities** — Pin vulnerable metadependencies to safe versions
2. **Compatibility** — Force specific versions for compatibility
3. **Bug fixes** — Use patched versions before upstream fixes are released
4. **Testing** — Test with specific dependency versions

---

## Project Configuration

### Current Setup

**Lockfile**: `bun.lock` (text-based, v1.2+)

**Trusted Dependencies**: Check `package.json` for `trustedDependencies` array

**Scoped Registries**: Configured in `config/bunfig.toml`
- `@orca` — ORCA internal packages
- `@nexus` — NEXUS Enterprise packages

**Overrides/Resolutions**: Check `package.json` for `overrides` or `resolutions` fields

### Verification Commands

```bash
# Check lockfile exists
ls -lh bun.lock

# Verify lockfile format
head -n 20 bun.lock

# Check trusted dependencies
cat package.json | grep -A 10 trustedDependencies

# Check scoped registries
cat config/bunfig.toml | grep -A 5 "install.scopes"

# Check overrides/resolutions
cat package.json | grep -A 10 "overrides\|resolutions"
```

---

## Best Practices

### Lockfile

1. ✅ **Always commit `bun.lock`** to version control
2. ✅ **Use text-based lockfile** (`bun.lock`) for better version control
3. ✅ **Don't edit lockfile manually** unless absolutely necessary
4. ✅ **Regenerate lockfile** after major dependency changes

### Lifecycle Scripts

1. ✅ **Minimize trusted dependencies** — Only trust packages you need
2. ✅ **Review lifecycle scripts** before adding to `trustedDependencies`
3. ✅ **Use `--ignore-scripts`** in CI/CD if scripts aren't needed
4. ✅ **Document why packages are trusted** in code comments

### Scoped Registries

1. ✅ **Use `Bun.secrets`** for registry credentials (see [Bun Registry Secrets](./BUN-REGISTRY-SECRETS.md))
2. ✅ **Use environment variables** in `bunfig.toml` (e.g., `$ORCA_TOKEN`)
3. ✅ **Don't hardcode credentials** in configuration files
4. ✅ **Test registry access** after configuration changes

### Overrides/Resolutions

1. ✅ **Document why overrides are needed** in code comments
2. ✅ **Review overrides regularly** — Remove when no longer needed
3. ✅ **Use specific versions** when possible (avoid `*` or `latest`)
4. ✅ **Test thoroughly** after adding overrides

---

## Troubleshooting

### Lockfile Issues

**Problem**: Lockfile conflicts or merge issues

**Solution**:
```bash
# Regenerate lockfile
rm bun.lock
bun install
```

**Problem**: Lockfile out of sync with `package.json`

**Solution**:
```bash
# Update lockfile
bun install
```

### Lifecycle Script Issues

**Problem**: Package not working after install (missing binaries)

**Solution**: Add package to `trustedDependencies`:
```json
{
  "trustedDependencies": ["package-name"]
}
```
Then reinstall: `bun install`

**Problem**: Want to skip all scripts

**Solution**: Use `--ignore-scripts` flag:
```bash
bun install --ignore-scripts
```

### Registry Issues

**Problem**: Can't install scoped packages

**Solution**: 
1. Verify registry configuration in `bunfig.toml`
2. Check environment variables are set
3. Use `Bun.secrets` for credentials (see [Bun Registry Secrets](./BUN-REGISTRY-SECRETS.md))

**Problem**: Authentication failures

**Solution**:
```bash
# Test registry access
bun install --verbose

# Check credentials
bun run scripts/registry-secrets.ts list
```

### Override Issues

**Problem**: Override not taking effect

**Solution**:
1. Verify syntax in `package.json`
2. Clear cache and reinstall:
   ```bash
   rm -rf node_modules bun.lock
   bun install
   ```

**Problem**: Nested overrides not working

**Solution**: Bun doesn't support nested overrides. Use top-level overrides only.

---

## Related Documentation

- [Bun Lockfile Official Docs](https://bun.com/docs/pm/lockfile)
- [Bun PM](./BUN-PM.md) — Package manager utilities (`bun pm untrusted`, `bun pm trust`, `bun pm default-trusted`, `bun pm hash`)
- [Bun Isolated Installs](./BUN-ISOLATED-INSTALLS.md) — Lockfile format with isolated installs
- [Bun Registry Secrets](./BUN-REGISTRY-SECRETS.md) — Secure registry credential management
- [Bun Workspaces](./BUN-WORKSPACES.md) — Workspace lockfile handling
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md) — Complete configuration reference

---

## Search Commands

```bash
# Find lockfile
ls -lh bun.lock*

# Find trusted dependencies
rg "trustedDependencies" package.json

# Find overrides/resolutions
rg "overrides|resolutions" package.json

# Find scoped registry config
rg "install.scopes" config/bunfig.toml

# Find lifecycle scripts in dependencies
rg "postinstall|preinstall" node_modules/*/package.json
```

---

**Status**: ✅ Configured  
**Lockfile Format**: Text-based (`bun.lock`)  
**Default Trust**: Top 500 npm packages  
**Scoped Registries**: `@orca`, `@nexus` configured  
**Security**: Default-secure lifecycle scripts
