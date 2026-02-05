# 📦 Bun PM: Package Management Utilities `[SCOPE:PACKAGE_MANAGER][DOMAIN:UTILITIES][TYPE:COMMAND_GROUP]` {#bun-pm}

**Enterprise-Grade Package Operations:** Tarball creation, dependency analysis, version management, security controls.

---

## 📦 Pack: Production Tarball Generation `[SCOPE:PACKAGING][DOMAIN:DISTRIBUTION][TYPE:ARCHIVE]` {#bun-pm-pack}

### 🎯 Basic Pack Operations `[SCOPE:BUILD][DOMAIN:ARTIFACTS][TYPE:CREATION]` {#pack-basic}
```bash
bun pm pack                    # Create versioned tarball
bun pm pack --quiet           # Script-friendly output: "my-pkg-1.0.0.tgz"
bun pm pack --destination ./dist  # Custom output directory
```

### ⚙️ Advanced Pack Options `[SCOPE:CONFIG][DOMAIN:OPTIMIZATION][TYPE:OPTIONS]` {#pack-options}
```bash
bun pm pack --dry-run         # Preview without writing
bun pm pack --filename dist.tgz  # Exact filename (excludes --destination)
bun pm pack --ignore-scripts  # Skip pre/postpack scripts
bun pm pack --gzip-level 6    # Custom compression (0-9)
```

**Output Modes:** 
- **Default:** Verbose file listing, sizes, checksums
- **Quiet:** Only tarball filename for automation

---

## 📁 Bin: Executable Path Management `[SCOPE:PATHS][DOMAIN:EXECUTABLES][TYPE:LOCATION]` {#bun-pm-bin}

### 🔍 Binary Directory Resolution `[SCOPE:RESOLUTION][DOMAIN:PATHS][TYPE:QUERY]` {#bin-paths}
```bash
bun pm bin                    # Local: ./node_modules/.bin
bun pm bin -g                 # Global: ~/.bun/bin
```

---

## 📊 LS: Dependency Tree Analysis `[SCOPE:ANALYSIS][DOMAIN:DEPENDENCIES][TYPE:VISUALIZATION]` {#bun-pm-ls}

### 🔍 Dependency Tree Views `[SCOPE:INSPECTION][DOMAIN:HIERARCHY][TYPE:TREES]` {#ls-views}
```bash
bun pm ls                     # Direct dependencies only
bun pm ls --all               # Full dependency tree (nth-order)
```

**Output:** Resolved versions, tree structure, package counts.

---

## 🔐 Authentication & Identity `[SCOPE:AUTH][DOMAIN:IDENTITY][TYPE:VERIFICATION]` {#bun-pm-auth}

### 👤 Registry Authentication `[SCOPE:REGISTRY][DOMAIN:AUTHENTICATION][TYPE:IDENTITY]` {#whoami}
```bash
bun pm whoami                 # npm username (requires bunx npm login)
```

---

## 🔒 Security: Trust & Verification `[SCOPE:SECURITY][DOMAIN:TRUST][TYPE:CONTROLS]` {#bun-pm-security}

### 🚨 Untrusted Dependency Analysis `[SCOPE:SECURITY][DOMAIN:SCRIPTS][TYPE:BLOCKING]` {#untrusted}
```bash
bun pm untrusted              # List blocked lifecycle scripts
```

### ✅ Trust Management `[SCOPE:SECURITY][DOMAIN:APPROVAL][TYPE:WHITELISTING]` {#trust}
```bash
bun pm trust <pkg-name>       # Run scripts & add to trustedDependencies
bun pm trust --all            # Trust all untrusted dependencies
```

### 📋 Default Trusted Packages `[SCOPE:SECURITY][DOMAIN:WHITELIST][TYPE:REFERENCE]` {#default-trusted}
```bash
bun pm default-trusted        # Show pre-approved package list
```

---

## 🔄 Cache & Lockfile Management `[SCOPE:CACHE][DOMAIN:STORAGE][TYPE:MANAGEMENT]` {#bun-pm-cache}

### 🗂️ Cache Operations `[SCOPE:STORAGE][DOMAIN:OPTIMIZATION][TYPE:MAINTENANCE]` {#cache-ops}
```bash
bun pm cache                  # Print global cache path
bun pm cache rm               # Clear global module cache
```

### 🔐 Lockfile Hashing `[SCOPE:VERIFICATION][DOMAIN:INTEGRITY][TYPE:HASHING]` {#hashing}
```bash
bun pm hash                   # Generate & print lockfile hash
bun pm hash-string            # Print hash input string
bun pm hash-print             # Print stored lockfile hash
```

### 🔄 Lockfile Migration `[SCOPE:MIGRATION][DOMAIN:COMPATIBILITY][TYPE:CONVERSION]` {#migrate}
```bash
bun pm migrate               # Convert other lockfiles without install
```

---

## 🏷️ Version Management: Semantic Release `[SCOPE:VERSIONING][DOMAIN:RELEASE][TYPE:MANAGEMENT]` {#bun-pm-version}

### 🚀 Version Bumping `[SCOPE:RELEASE][DOMAIN:SEMVER][TYPE:INCREMENT]` {#version-bump}
```bash
bun pm version patch         # 1.0.0 → 1.0.1
bun pm version minor         # 1.0.0 → 1.1.0  
bun pm version major         # 1.0.0 → 2.0.0
bun pm version 1.2.3         # Set specific version
```

### 🔧 Pre-release Management `[SCOPE:RELEASE][DOMAIN:PRERELEASE][TYPE:VERSIONING]` {#prerelease}
```bash
bun pm version prerelease --preid beta    # 1.0.0 → 1.0.1-beta.0
bun pm version prepatch --preid alpha     # 1.0.0 → 1.0.1-alpha.0
bun pm version preminor --preid rc        # 1.0.0 → 1.1.0-rc.0
```

### ⚙️ Version Options `[SCOPE:CONFIG][DOMAIN:GIT][TYPE:INTEGRATION]` {#version-options}
```bash
bun pm version patch --no-git-tag-version    # Skip git commit/tag
bun pm version minor -m "Release: %s"        # Custom commit message
bun pm version major --force                 # Bypass dirty git check
```

---

## 📝 Package.json Management `[SCOPE:CONFIGURATION][DOMAIN:METADATA][TYPE:MANIPULATION]` {#bun-pm-pkg}

### 🔍 Property Access `[SCOPE:QUERY][DOMAIN:METADATA][TYPE:READING]` {#pkg-get}
```bash
bun pm pkg get name version              # Multiple properties
bun pm pkg get scripts.build             # Nested dot notation
bun pm pkg get contributors[0]           # Array bracket notation
bun pm pkg get scripts[test:watch]       # Special character keys
```

### ✏️ Property Modification `[SCOPE:EDIT][DOMAIN:METADATA][TYPE:WRITING]` {#pkg-set}
```bash
bun pm pkg set name="new-pkg" version=2.0.0
bun pm pkg set scripts.test="jest" --json  # JSON value parsing
```

### 🗑️ Property Deletion `[SCOPE:EDIT][DOMAIN:METADATA][TYPE:REMOVAL]` {#pkg-delete}
```bash
bun pm pkg delete description scripts.test
```

### 🔧 Auto-Fix Common Issues `[SCOPE:MAINTENANCE][DOMAIN:VALIDATION][TYPE:AUTOFIX]` {#pkg-fix}
```bash
bun pm pkg fix                  # Automated package.json correction
```

---

## 🏆 Bun PM Achievement: Complete Package Lifecycle `[SCOPE:SUMMARY][DOMAIN:UTILITIES][TYPE:OUTCOME]` {#bun-pm-achievement}

**Production Packaging:** Tarball generation with npm-pack compliance.
**Security Governance:** Script trust controls, dependency verification.
**Version Management:** Semantic versioning with Git integration.
**Metadata Manipulation:** Programmatic package.json management.
**Cache Optimization:** Global storage management and integrity hashing.

**🚀 Bun PM: Enterprise-grade package utilities for the complete dependency lifecycle. ✨**
