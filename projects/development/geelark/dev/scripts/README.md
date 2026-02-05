# Dev HQ Scripts Directory

This directory contains utility scripts for building, analyzing, validating, and developing the Dev HQ codebase. All scripts are written in TypeScript and leverage Bun's runtime capabilities.

## 📁 Directory Structure

```
scripts/
├── README.md                    # This file
├── analysis/                    # Bundle and code analysis scripts
│   ├── analyze-bundle.ts       # Bundle size analysis
│   ├── analyze-bundles.js      # Multi-bundle analysis
│   └── bundle-analysis.ts      # Comprehensive bundle analysis
├── build/                       # Build validation scripts
│   └── build-validation.ts     # Build configuration validation
├── validation/                 # Feature and code validation
│   ├── verify-features.ts      # Feature flag verification
│   ├── verify-features-simple.ts  # Simple feature verification
│   └── verify-features-enhanced.ts # Enhanced feature verification
├── dev/                        # Development setup scripts
│   ├── setup-dev.sh           # Development environment setup
│   └── test-dev-hq.sh         # Dev HQ test runner
├── generate-meta.ts            # Meta manifest generator
├── lint.ts                     # Linting utilities
├── type-check.ts               # TypeScript type checking
├── tsconfig.json               # TypeScript configuration
└── types.d.ts                  # Type definitions
```

## 🔧 Script Categories

### Analysis Scripts (`analysis/`)
Bundle analysis and code metrics tools for performance optimization.

### Build Scripts (`build/`)
Build validation and configuration management utilities.

### Development Scripts (`dev/`)
Development environment setup and testing utilities.

### Validation Scripts (`validation/`)
Feature flag verification and code validation tools.

### Utility Scripts (root level)
General-purpose scripts for common development tasks.

### Analysis Scripts (`analysis/`)

#### `analyze-bundle.ts`
Analyzes bundle sizes, composition, and optimization opportunities.

**Usage:**
```bash
bun run scripts/analysis/analyze-bundle.ts
```

**Features:**
- Bundle size metrics
- Module composition analysis
- Feature flag impact analysis
- Optimization recommendations

#### `analyze-bundles.js`
Multi-bundle analysis comparing different build configurations.

**Usage:**
```bash
bun run scripts/analysis/analyze-bundles.js
```

#### `bundle-analysis.ts`
Comprehensive bundle analysis with detailed reporting.

**Usage:**
```bash
bun run scripts/analysis/bundle-analysis.ts
```

### Build Scripts (`build/`)

#### `build-validation.ts`
Validates build configurations and feature flag combinations.

**Usage:**
```bash
bun run scripts/build/build-validation.ts [config-name]
```

**Supported Configs:**
- `production-lite`
- `production-standard`
- `production-premium`
- `security-audit`

**Features:**
- Validates feature flag combinations
- Checks for conflicting flags
- Verifies build configuration integrity

### Validation Scripts (`validation/`)

#### `verify-features.ts`
Comprehensive feature flag verification.

**Usage:**
```bash
bun run scripts/validation/verify-features.ts
```

**Features:**
- Environment feature checks
- Tier feature validation
- Security feature analysis
- Resilience feature verification
- Monitoring feature checks
- Performance feature validation
- Integration feature checks
- A/B testing analysis
- Security analysis
- Recommendations

#### `verify-features-simple.ts`
Simple feature flag verification for quick checks.

**Usage:**
```bash
bun run scripts/validation/verify-features-simple.ts
```

#### `verify-features-enhanced.ts`
Enhanced feature verification with detailed reporting.

**Usage:**
```bash
bun run scripts/validation/verify-features-enhanced.ts
```

### Development Scripts (`dev/`)

#### `setup-dev.sh`
Sets up the development environment.

**Usage:**
```bash
bash scripts/dev/setup-dev.sh
```

**Features:**
- Installs dependencies
- Sets up environment variables
- Configures development tools
- Validates setup

#### `test-dev-hq.sh`
Dev HQ test runner with various options.

**Usage:**
```bash
bash scripts/dev/test-dev-hq.sh [options] [test-type]
```

**Options:**
- `-c, --coverage` - Run with coverage
- `-w, --watch` - Watch mode
- `-v, --verbose` - Verbose output
- `-d, --debug` - Debug mode
- `-b, --benchmark` - Performance benchmarks
- `-s, --security` - Security tests
- `-j, --json` - JSON output

**Test Types:**
- `api-server` - API server tests
- `automation` - Automation tests
- `spawn-server` - Spawn server tests
- `performance` - Performance tests
- `security` - Security tests
- `all` - All Dev HQ tests (default)

### Utility Scripts

#### `generate-meta.ts`
Generates the `meta.json` manifest file.

**Usage:**
```bash
bun run scripts/generate-meta.ts
```

**Features:**
- Generates system manifest
- Includes build configurations
- Feature flag definitions
- Dashboard layouts
- Logging configurations
- Security policies
- API definitions
- Scaling profiles

#### `lint.ts`
Linting utilities for code quality.

**Usage:**
```bash
bun run scripts/lint.ts
bun run scripts/lint.ts --fix
```

#### `type-check.ts`
TypeScript type checking.

**Usage:**
```bash
bun run scripts/type-check.ts
```

## 🚀 Common Workflows

### Development Setup
```bash
# Setup development environment
bash scripts/dev/setup-dev.sh

# Run type checking
bun run scripts/type-check.ts

# Run linting
bun run scripts/lint.ts
```

### Build Validation
```bash
# Validate production build
bun run scripts/build/build-validation.ts production-premium

# Verify features
bun run scripts/validation/verify-features.ts
```

### Analysis
```bash
# Analyze bundle sizes
bun run scripts/analysis/analyze-bundle.ts

# Comprehensive bundle analysis
bun run scripts/analysis/bundle-analysis.ts
```

### Testing
```bash
# Run all Dev HQ tests
bash scripts/dev/test-dev-hq.sh

# Run with coverage
bash scripts/dev/test-dev-hq.sh --coverage

# Run specific test type
bash scripts/dev/test-dev-hq.sh api-server
```

## 📦 Package.json Scripts

These scripts are also available via npm/bun scripts:

```bash
# Analysis
bun run analyze:bundle

# Build validation
bun run build:prod-premium  # Includes validation

# Meta generation
bun run generate:meta

# Linting
bun run lint
bun run lint:fix

# Type checking
bun run type-check
```

## 🔗 Related Documentation

- [Build Configurations](../docs/architecture/ARCHITECTURE.md)
- [Feature Flags Guide](../docs/guides/FEATURE_FLAGS_PRO_TIPS.md)
- [Testing Guide](../tests/README.md)

## 📝 Adding New Scripts

When adding new scripts:

1. Place them in the appropriate subdirectory:
   - `analysis/` - Analysis and reporting scripts
   - `build/` - Build-related scripts
   - `validation/` - Validation scripts
   - `dev/` - Development utilities

2. Add a shebang for executable scripts:
   ```typescript
   #!/usr/bin/env bun
   ```

3. Include JSDoc comments describing the script's purpose

4. Update this README with usage instructions

5. Add to `package.json` scripts if commonly used

