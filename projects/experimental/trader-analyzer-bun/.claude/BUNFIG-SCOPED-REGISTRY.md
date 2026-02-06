# ORCA Bunfig Scoped Registry Configuration

**Scoped registry configured for @orca internal packages. No runtime impact.**

---

## Configuration

### File Location
- **Local**: `./bunfig.toml` (project root)
- **Priority**: Local overrides global
- **CLI**: Flags override all

### Scoped Registry Setup
```toml
[install.scopes]
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
```

### Authentication Methods

#### Token Auth (Preferred)
```toml
"@orca" = { token = "$ORCA_TOKEN", url = "https://registry.orca.sh/" }
```
- Loads `ORCA_TOKEN` from `.env.local`
- Secure, no credentials in config file
- Recommended for production

#### Username/Password Auth
```toml
"@orca" = { username = "orca", password = "$ORCA_PASS", url = "https://registry.orca.sh/" }
```
- Loads `ORCA_PASS` from `.env.local`
- Alternative to token auth

#### URL with Embedded Auth (Not Recommended)
```toml
"@orca" = "https://orca:token@registry.orca.sh/"
```
- Credentials in config file
- Not recommended for security

---

## Usage

### Installing ORCA Internal Packages
```bash
bun add @orca/internal-package
```

Bun automatically uses `https://registry.orca.sh/` for `@orca` scope.

### Environment Variables
Create `.env.local`:
```bash
ORCA_TOKEN=your-token-here
# OR
ORCA_PASS=your-password-here
```

---

## Configuration Priority

1. **CLI flags** (highest priority)
2. **Local bunfig.toml** (`./bunfig.toml`)
3. **Global bunfig.toml** (`$XDG_CONFIG_HOME/.bunfig.toml`)
4. **Global fallback** (`$HOME/.bunfig.toml`)

---

## Impact

- **Runtime**: No impact on v0.1.11 runtime
- **Feed latency**: Unchanged
- **Installation**: Only affects `bun install` for `@orca` scoped packages
- **Public packages**: Continue using default npm registry

---

## Validation

```bash
# Verify config is valid
bun install --dry-run

# Test scoped package install
bun add @orca/test-package --dry-run
```

---

**Status**: Configured  
**Version**: v0.1.11+  
**Scope**: `@orca` internal packages only  
**Registry**: `https://registry.orca.sh/`
