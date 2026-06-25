# 🚀 Using bunx with CRC32 Tools

## What is `bunx`?

`bunx` is Bun's equivalent of `npx` or `yarn dlx` - it auto-installs and runs packages from npm. It's roughly **100x faster** than `npx` for locally installed packages.

## 🎯 Examples with Our CRC32 Project

### **1. Running External Tools**

```bash
# Format code with Prettier (auto-installed)
bunx prettier --write *.ts

# Run database migrations
bunx prisma migrate dev

# Generate types
bunx typescript --version

# Run tests with coverage
bunx c8 bun test
```

### **2. Using Package Flags**

```bash
# When binary name differs from package name
bunx -p @angular/cli ng new my-app

# Run specific version
bunx uglify-js@3.14.0 app.js

# Force using Bun runtime instead of Node.js
bunx --bun vite dev
```

### **3. Our CRC32 Tools (if published to npm)**

If we published our tools to npm, you could run:

```bash
# Generate CRC32 benchmark archives
bunx crc32-archive --format=tar.gz --level=12 --output=benchmark.tar.gz

# Run CRC32 performance benchmarks
bunx crc32-benchmark

# Test CRC32 SQL integration
bunx crc32-sql-test
```

### **4. Local Development Usage**

For local development, use the package.json scripts:

```bash
# Archive generation
bun run tools/export-crc32-archive.ts --format=tar.gz

# Benchmark testing
bun run demo-simd-benchmark.ts

# SQL integration tests
bun run test:crc32-sql-insert
```

## 📦 Package Configuration

Our `package.json` bin configuration:

```json
{
  "bin": {
    "quantum-cli": "./cli.ts",
    "crc32-archive": "./tools/export-crc32-archive.ts",
    "crc32-benchmark": "./demo-simd-benchmark.ts",
    "crc32-sql-test": "./scripts/test-crc32-sql.ts"
  }
}
```

## 🔧 Shebang Support

Our TypeScript files can use Bun shebangs:

```typescript
#!/usr/bin/env bun
// This forces execution with Bun runtime
console.log("Running with Bun!");
```

## ⚡ Performance Benefits

- **100x faster** than `npx` for local packages
- **Global cache** for installed packages
- **Fast startup** times
- **Native TypeScript** support

## 🎯 Real-World Usage

```bash
# Development workflow
bunx prettier --write *.ts          # Format code
bunx eslint . --fix                 # Lint and fix
bunx tsc --noEmit                   # Type check
bun run test:crc32-sql-insert       # Run our tests

# Production deployment
bunx @vercel/ncc build cli.ts       # Bundle for deployment
bunx pkg dist/cli.js                # Create executable
```

## 📋 Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `bunx <package>` | Run npm package | `bunx prettier` |
| `bunx -p <pkg> <bin>` | Different binary name | `bunx -p @angular/cli ng` |
| `bunx --bun <pkg>` | Force Bun runtime | `bunx --bun vite` |
| `bunx <pkg>@version` | Specific version | `bunx uglify-js@3.14.0` |

The `bunx` tool provides instant access to any npm package without manual installation, making it perfect for development workflows and CI/CD pipelines.
