# 🔐 TOML Secrets Editor & Optimizer

A production-grade TOML editor that enforces Bun's environment variable expansion syntax, security policies, and integrates with the URLPattern observability platform.

## ✨ Features

- **🔒 Security-First**: Environment variable validation, dangerous pattern detection, and policy enforcement
- **⚡ Bun-Native**: Built with Bun's TOML parser, SQLite, and performance APIs
- **🔍 URLPattern Integration**: Extract and analyze URL patterns with security validation
- **📊 Audit Trail**: Complete SQLite-based audit logging with security scoring
- **🎯 Interactive Mode**: PTY-based interactive editor for human review
- **🗜️ Optimization**: Advanced TOML optimization with configurable transformations
- **📋 CLI Interface**: Full-featured command-line interface with multiple commands

## 🚀 Quick Start

### Installation

```bash
# Clone and build
git clone <repository>
cd shortcut
bun install
bun run toml:build

# Or use directly
bun src/cli/toml-cli.ts --help
```

### Basic Usage

```bash
# Edit a TOML file with security validation
bun run toml:edit config.toml --set "api.url=https://api.${ENV}.com"

# Validate security policies
bun run toml:validate secrets.toml --fail-on-dangerous

# Optimize and minify
bun run toml:optimize config.toml --output config.min.toml --minify

# Interactive mode
bun run toml:interactive secrets.toml

# Audit multiple files
bun run toml:audit config/*.toml --format json

# Extract URL patterns
bun run toml:patterns config.toml
```

## 📁 Project Structure

```
src/
├── services/
│   ├── toml-editor.ts      # Core TOML editor service
│   └── pty-editor.ts       # Interactive PTY editor
├── integrations/
│   ├── pattern-extractor.ts # URLPattern security analysis
│   └── audit-logger.ts     # SQLite audit trail
├── config/
│   └── policy-manager.ts   # Security policy management
└── cli/
    └── toml-cli.ts         # Command-line interface
```

## 🔧 Configuration

Copy `.observatory-policy.toml` to your project and customize security rules:

```toml
[secrets]
allowed_prefixes = ["PUBLIC_", "PRIVATE_", "SECRET_"]
blocked_patterns = ["*PASSWORD*", "*TOKEN*", "*KEY"]
max_secrets_per_file = 50
require_defaults = true

[validation]
min_security_score = 70
fail_on_dangerous = true

[optimization]
strip_comments = true
sort_keys = true
minify = false
```

## 🎯 CLI Commands

### Edit
```bash
bun run toml:edit config.toml \
  --set "database.url=${DB_URL}" \
  --set "cache.redis=${REDIS_URL:-localhost:6379}" \
  --validate
```

### Validate
```bash
bun run toml:validate secrets.toml \
  --fail-on-dangerous \
  --format json
```

### Optimize
```bash
bun run toml:optimize config.toml \
  --output config.min.toml \
  --strip-comments \
  --sort-keys \
  --minify
```

### Audit
```bash
bun run toml:audit config/*.toml \
  --format markdown \
  --user "developer@company.com"
```

### Interactive Mode
```bash
bun run toml:interactive secrets.toml
```

Available commands in interactive mode:
- `:validate` - Run security validation
- `:optimize` - Optimize and minify
- `:edit <key>=<value>` - Edit a value
- `:save` - Write changes to file
- `:patterns` - Show URL patterns
- `:quit` - Exit editor

## 🔒 Security Features

### Environment Variable Classification

- **PUBLIC_**: Safe for client bundles
- **PRIVATE_**: Server-only variables
- **SECRET_**: Encrypted at rest
- **TRUSTED_**: Manual review required

### Validation Rules

- ✅ Environment variable syntax validation
- ✅ Dangerous pattern detection (PASSWORD, TOKEN, KEY)
- ✅ Classification system enforcement
- ✅ Default value requirements
- ✅ Maximum secrets per file limits

### URLPattern Security

- 🔍 Extract URL patterns from TOML values
- ⚠️ Detect dangerous environment variables
- 🌐 Validate against trusted domains
- 📊 Generate security recommendations

## 📊 Audit Trail

Complete audit logging with SQLite:

```typescript
// Log all edits with security scoring
auditLogger.logEdit({
  filePath: 'config.toml',
  user: 'developer@company.com',
  action: 'edit',
  secretsTouched: ['DB_URL', 'API_KEY'],
  scoreBefore: 85,
  scoreAfter: 92,
  changes: ['Updated database URL']
});
```

## 🗜️ Optimization Pipeline

Configurable transformations:

1. **Strip Comments**: Remove TOML comments
2. **Inline Environment Variables**: Replace with actual values
3. **Sort Keys**: Alphabetical key ordering
4. **Minify**: Remove extra whitespace

## 🧪 Testing

```bash
# Run all tests
bun test

# Test specific functionality
bun run test:core
bun run test:integration
bun run test:performance
```

## 📦 Build & Distribution

```bash
# Build production binary
bun run toml:build

# Creates:
# - toml-guard (full features)
# - toml-guard-minimal (minimal version)
# - toml-guard-dev (development version)
```

## 🔧 Advanced Usage

### Programmatic API

```typescript
import { TomlSecretsEditor } from './src/services/toml-editor';

const editor = new TomlSecretsEditor('config.toml', {
  policy: {
    allowedPrefixes: ['PUBLIC_', 'PRIVATE_'],
    maxSecretsPerFile: 25
  }
});

const result = await editor.edit('config.toml', {
  database: {
    url: '${DB_URL:-localhost:5432}',
    pool: {
      max: '${DB_POOL_MAX:-10}'
    }
  }
});

console.log(`Security score: ${result.securityScore}`);
console.log(`Secrets found: ${result.secretsCount}`);
```

### URLPattern Analysis

```typescript
import { URLPatternExtractor } from './src/integrations/pattern-extractor';

const extractor = new URLPatternExtractor();
const result = extractor.extractAndAnalyze(tomlContent, 'config.toml');

console.log(`Found ${result.patterns.length} URL patterns`);
result.securityIssues.forEach(issue => {
  console.log(`⚠️ ${issue.description}`);
});
```

## 🛡️ Security Hardening Checklist

- ✅ Environment variable syntax validation
- ✅ Dangerous pattern detection
- ✅ Classification system (PUBLIC/PRIVATE/SECRET/TRUSTED)
- ✅ Audit logging with user tracking
- ✅ Encryption at rest for sensitive vars
- ✅ Bundle-time dead code elimination
- ✅ CRC32 fast hashing for deduplication
- ✅ S3 proxy support for corporate networks
- ✅ Archive backup with tamper-proof exports
- ✅ Interactive PTY editor for human review

## 📚 Examples

See the `examples/` directory for sample configurations:

- `config.toml` - Basic application configuration
- `secrets.toml` - Production secrets with security policies
- `patterns.toml` - URLPattern examples and analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [Bun TOML Parser](https://bun.sh/docs/docs/toml)
- [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [SQLite Integration](https://bun.sh/docs/docs/sqlite)

---

**Built with ❤️ using Bun's native APIs for maximum performance and security.**
