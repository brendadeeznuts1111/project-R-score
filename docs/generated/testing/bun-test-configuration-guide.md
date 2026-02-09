# ⚙️ Bun Test Configuration Complete Guide v2.8

**Generated**: 2026-02-06T22:22:28.798Z
**Bun Version**: 1.3.8

## 🔧 Configuration Options Overview

| Option | Description | Use Case | Example |
|--------|-------------|----------|---------|
| `--preload` | Load script before tests | Global setup/mocks | `--preload ./setup.ts` |
| `--define` | Set compile-time constants | Environment values | `--define "process.env.API_URL='http://localhost:3000'"` |
| `--loader` | Custom module loaders | File processing | `--loader .special:special-loader` |
| `--tsconfig-override` | Custom TypeScript config | Test-specific settings | `--tsconfig-override ./test-tsconfig.json` |
| `--conditions` | Package resolution conditions | Environment variants | `--conditions development` |
| `--env-file` | Load environment file | Test configuration | `--env-file .env.test` |

## 📊 Configuration Test Results

| Test | Option | Value | Exit Code | Time (ms) | Features |
|------|--------|-------|-----------|----------|----------|
| preload-config | --preload | ./setup.ts | 0 | 325.10 | Preload script loaded |
| define-config | --define | "process.env.API_URL='http://localhost:3000'" | 1 | 26.83 | None |
| loader-config | --loader | .special:special-loader | 1 | 11.18 | None |
| tsconfig-config | --tsconfig-override | ./test-tsconfig.json | 1 | 284.65 | None |
| conditions-config | --conditions | development | 0 | 284.84 | None |
| env-file-config | --env-file | .env.test | 0 | 280.29 | None |

## 🚀 Configuration Examples

### 1. Global Setup with Preload

```bash
# Create setup.ts
cat > setup.ts << EOF
import { beforeAll, afterAll } from "bun:test";

beforeAll(() => {
  // Global setup
  global.testDB = await createTestDatabase();
});

afterAll(() => {
  // Global cleanup
  await global.testDB.close();
});
EOF

# Run tests with preload
bun test --preload ./setup.ts
```

### 2. Compile-time Constants

```bash
# Define environment variables at compile time
bun test --define "process.env.API_URL='http://localhost:3000'" \
  --define "process.env.NODE_ENV='test'"

# In your test:
expect(process.env.API_URL).toBe("http://localhost:3000");
```

### 3. Custom Loaders

```bash
# Create custom loader
cat > special-loader.ts << EOF
import { plugin } from "bun";

plugin({
  name: "special-loader",
  setup(build) {
    build.onLoad({ filter: /\.special$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(source)};`,
        loader: "js"
      };
    });
  }
});
EOF

# Use custom loader
bun test --loader ./special-loader.ts
```

### 4. TypeScript Configuration Override

```bash
# Create test-specific tsconfig
cat > test-tsconfig.json << EOF
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/test/*": ["test/*"]
    }
  }
}
EOF

# Run with custom tsconfig
bun test --tsconfig-override ./test-tsconfig.json
```

### 5. Package Conditions

```bash
# package.json with conditional exports
cat > package.json << EOF
{
  "exports": {
    ".": {
      "development": "./src/dev.ts",
      "production": "./src/prod.ts",
      "default": "./src/default.ts"
    }
  }
}
EOF

# Run with development condition
bun test --conditions development
```

### 6. Environment Files

```bash
# Create test environment file
cat > .env.test << EOF
API_URL=http://localhost:3000
DATABASE_URL=postgresql://test:test@localhost:5432/testdb
JWT_SECRET=test-secret
NODE_ENV=test
EOF

# Run with environment file
bun test --env-file .env.test
## 🎯 Advanced Configuration Combinations

### Complete Test Setup

```bash
bun test \
  --preload ./setup.ts \
  --env-file .env.test \
  --define "process.env.NODE_ENV='test'" \
  --tsconfig-override ./test-tsconfig.json \
  --conditions development
```

### CI/CD Configuration

```bash
# CI-optimized test configuration
bun test \
  --env-file .env.ci \
  --define "process.env.CI=true" \
  --conditions production \
  --bail --coverage
```

### Development Configuration

```bash
# Development-friendly configuration
bun test \
  --preload ./setup-dev.ts \
  --env-file .env.dev \
  --conditions development \
  --watch --verbose
```

## 💡 Configuration Best Practices

### File Organization

```
project/
├── setup.ts              # Global test setup
├── test-tsconfig.json    # Test TypeScript config
├── .env.test            # Test environment
├── .env.ci              # CI environment
├── special-loader.ts    # Custom loader
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Configuration Management

- **Separate configs**: Different env files for different environments
- **Version control**: Commit configuration files, exclude secrets
- **Documentation**: Document custom loaders and setup scripts
- **Consistency**: Use same configuration patterns across projects

### Performance Considerations

- **Preload overhead**: Only preload what's necessary
- **Loader complexity**: Keep custom loaders simple and fast
- **TypeScript compilation**: Use tsconfig override for test-specific optimizations
- **Environment variables**: Use --define for compile-time constants when possible

## 🔧 Troubleshooting

### Common Issues

- **Preload not executing**: Check file path and syntax
- **Define not working**: Ensure proper quoting and escaping
- **Loader not found**: Verify loader file exists and exports plugin
- **Path mapping failing**: Check tsconfig paths and baseUrl
- **Conditions not working**: Verify package.json exports structure
- **Env file not loading**: Check file path and format

### Debugging Configuration

```bash
# Test configuration with verbose output
bun test --verbose --preload ./setup.ts

# Check environment variables
bun test --env-file .env.test --run -e "console.log(process.env)"

# Verify TypeScript configuration
bun test --tsconfig-override ./test-tsconfig.json --verbose
```

---

*Generated by Bun Test Configuration Demo v2.8*