---
'@fire22/security-registry': patch
'@fire22/api-consolidated': patch
'@fire22/security-scanner': patch
'fire22-dashboard-worker': patch
---

feat(versioning): Complete versioning and code signing system integration

🔐 **Versioning & Code Signing Implementation:**

- Implemented Bun.secrets-based registry authentication using OS-native
  credential storage
- Configured security scanner for vulnerability scanning during `bun install`
- Fixed registry URLs from defunct `packages.apexodds.net` to
  `fire22.workers.dev/registry/`
- Added comprehensive changeset configuration for automated release management

🏗️ **Security & Registry Enhancements:**

- Added secure credential storage using Keychain (macOS), libsecret (Linux),
  Credential Manager (Windows)
- Implemented registry authentication with proper token management
- Configured scoped package registries for @fire22/_, @ff/_, @brendadeeznuts/\*
  packages
- Added audit level filtering (`--audit-level=high`, `--prod`, `--ignore` flags)

📚 **Documentation & Tooling:**

- Enhanced CLAUDE.md with comprehensive versioning and code signing
  documentation
- Added GPG commit signing requirements and setup process
- Created registry authentication management tools with CLI interface
- Implemented automated workflow documentation and branch protection guidelines

🛠️ **Infrastructure Updates:**

- Updated bunfig.toml with security scanner configuration
- Enhanced Fire22 entity system with agent and customer repositories
- Fixed malformed JSON in workspace package.json files
- Added dependency verification and reporting tools

This release establishes a complete versioning and security foundation with:

- ✅ Secure OS-native credential storage
- ✅ Vulnerability scanning during package installation
- ✅ Proper registry authentication and configuration
- ✅ Automated release management with changesets
- ✅ GPG-signed commits and comprehensive documentation
