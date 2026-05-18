# 📦 Bun Add: Dependency Management `[SCOPE:PACKAGE_MANAGER][DOMAIN:INSTALLATION][TYPE:COMMAND]` {#bun-add}

**Precision Dependency Control:** Version pinning, security-first scripting, multi-source packages.

---

## 🎯 Basic Package Installation `[SCOPE:INSTALL][DOMAIN:DEPENDENCIES][TYPE:OPERATIONS]` {#bun-add-basic}

### 📦 Version Specification `[SCOPE:VERSIONING][DOMAIN:PRECISION][TYPE:CONTROL]` {#version-control}
```bash
bun add preact                  # Latest version
bun add zod@3.20.0             # Exact version
bun add zod@^3.0.0             # Version range
bun add zod@latest             # Latest tag
```

### 🔧 Dependency Type Flags `[SCOPE:CONFIG][DOMAIN:DEPENDENCY_TYPES][TYPE:OPTIONS]` {#dependency-types}

| Flag | Alias | Target | Use Case |
|------|-------|---------|----------|
| `--dev` | `-d`, `-D` | `devDependencies` | TypeScript types, build tools |
| `--optional` | - | `optionalDependencies` | Fallback packages |
| `--peer` | - | `peerDependencies` | Plugin systems, frameworks |
| `--exact` | `-E` | Pinned versions | Production stability |

```bash
bun add --dev @types/react      # Development dependencies
bun add --optional lodash       # Optional dependencies  
bun add --peer @types/bun       # Peer dependencies
bun add react --exact           # Version pinning: "18.2.0" vs "^18.2.0"
```

---

## 🌍 Global Package Installation `[SCOPE:INSTALL][DOMAIN:GLOBAL][TYPE:TOOLS]` {#bun-add-global}

### 🔧 CLI Tool Installation `[SCOPE:TOOLS][DOMAIN:COMMAND_LINE][TYPE:INSTALLATION]` {#global-tools}
```bash
bun add --global cowsay        # Install CLI tools globally
bun add -g cowsay              # Short form
bun install --global cowsay    # Alternative syntax
```

### ⚙️ Global Path Configuration `[SCOPE:CONFIG][DOMAIN:PATHS][TYPE:GLOBAL]` {#global-config}
```toml
# bunfig.toml
[install]
globalDir = "~/.bun/install/global"    # Package storage
globalBinDir = "~/.bun/bin"            # Binary links
```

---

## 🛡️ Security: Trusted Dependencies `[SCOPE:SECURITY][DOMAIN:SCRIPTS][TYPE:CONTROLS]` {#trusted-dependencies}

### 🔒 Lifecycle Script Control `[SCOPE:SECURITY][DOMAIN:EXECUTION][TYPE:WHITELISTING]` {#lifecycle-control}
```json
{
  "name": "my-app",
  "trustedDependencies": ["my-trusted-package"]  // Whitelist for script execution
}
```
**Security Model:** Blocks arbitrary `postinstall` scripts by default.

---

## 🔗 Alternative Package Sources `[SCOPE:SOURCES][DOMAIN:RESOLUTION][TYPE:PROTOCOLS]` {#alternative-sources}

### 🔐 Git Dependencies `[SCOPE:VCS][DOMAIN:REPOSITORIES][TYPE:INSTALLATION]` {#git-dependencies}
```bash
bun add git@github.com:moment/moment.git        # SSH
bun add github:colinhacks/zod                   # GitHub shorthand
bun add git+https://github.com/iamkun/dayjs.git # HTTPS
bun add git+ssh://github.com/lodash/lodash.git#4.17.21  # With commit/tag
```

### 📦 Tarball Dependencies `[SCOPE:ARTIFACTS][DOMAIN:ARCHIVES][TYPE:INSTALLATION]` {#tarball-dependencies}
```bash
bun add zod@https://registry.npmjs.org/zod/-/zod-3.21.4.tgz
```
```json
{
  "name": "my-app",
  "dependencies": {
    "zod": "https://registry.npmjs.org/zod/-/zod-3.21.4.tgz"
  }
}
```

---

## ⚙️ Advanced Installation Options `[SCOPE:CONFIG][DOMAIN:ADVANCED][TYPE:OPTIONS]` {#advanced-options}

### 🎛️ Platform & Architecture Control `[SCOPE:PLATFORM][DOMAIN:TARGETING][TYPE:FILTERING]` {#platform-control}
```bash
bun add --os linux --cpu arm64    # Platform-specific optional deps
bun add --os '*' --cpu '*'        # All platforms
```

### 🔍 Interactive Updates `[SCOPE:UPDATES][DOMAIN:SELECTIVE][TYPE:INTERACTIVE]` {#interactive-updates}
```bash
bun update --interactive         # Choose which dependencies to update
bun update -i --filter @myapp/frontend  # Scoped workspace updates
```

### 📊 Dependency Analysis `[SCOPE:ANALYSIS][DOMAIN:INSIGHTS][TYPE:COMMANDS]` {#dependency-analysis}
```bash
bun why tailwindcss              # Dependency chain explanation
bun outdated --recursive         # Workspace-wide version checking
```

---

## 🏆 Bun Add Achievement: Precision Dependency Management `[SCOPE:SUMMARY][DOMAIN:INSTALLATION][TYPE:OUTCOME]` {#bun-add-achievement}

**Version Precision:** Exact pinning, range specification, tag targeting.
**Security First:** Default script blocking, explicit trust model.
**Multi-Source Support:** Git repositories, tarballs, registry packages.
**Platform Intelligence:** Architecture-aware installation, workspace optimization.

**🚀 Bun Add: Enterprise-grade dependency management with security and precision. ✨**
