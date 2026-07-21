# CRC32 SQL Toolkit - Publishing Guide

## 📦 Package Information

**Package Name**: `@your-org/crc32-sql-toolkit`
**Version**: `2.0.0`
**License**: `MIT`

## 🚀 Publishing Options

### Option 1: Bucket Publishing (Custom Storage)

```bash
# Dry run to see what will be published
bun run publish --bucket=your-bucket-name --dry-run

# Actual publish to bucket
bun run publish --bucket=your-bucket-name --version=2.0.0
```

### Option 2: NPM Registry Publishing

```bash
# Login to npm (first time only)
bunx npm login

# Dry run to validate package
bun publish --dry-run

# Actual publish to npm
bun publish --access=public

# Publish with tag (e.g., beta, next)
bun publish --tag=beta

# Publish with OTP (if 2FA enabled)
bun publish --otp=123456
```

## 📋 Package Contents

The package includes:

- **Core Library**: `utils/crc32-sql-helper.ts` - SQL helper with CRC32 validation
- **CLI Tools**:
  - `crc32-archive` - Archive generation CLI
  - `crc32-benchmark` - Performance benchmark tool
  - `crc32-sql-test` - SQL integration test suite
- **Database**: `migrations/001_crc32_audit_trail.sql` - Database schema
- **Documentation**: Batch tracing, performance metrics, usage guides
- **Scripts**: Migration, testing, and publishing utilities

## 🔧 Usage After Publishing

### Install from npm

```bash
# Install the package
bun add @your-org/crc32-sql-toolkit

# Or with npm
npm install @your-org/crc32-sql-toolkit
```

### Use in Your Project

```typescript
import { CRC32SQLHelper } from '@your-org/crc32-sql-toolkit';

const helper = new CRC32SQLHelper();
await helper.insertWithCRC32Validation('users', userData);
```

### Run CLI Tools

```bash
# Run CRC32 benchmark
bunx crc32-benchmark

# Generate archive
bunx crc32-archive --format=tar --output=archive.tar.gz

# Run SQL tests
bunx crc32-sql-test
```

## ✅ Pre-Publish Checklist

- [ ] Update package name from `@your-org/crc32-sql-toolkit` to your actual org
- [ ] Update author email and repository URLs
- [ ] Run tests: `bun run test:crc32-sql-insert`
- [ ] Run benchmark: `bun run demo-simd-benchmark.ts`
- [ ] Verify package.json fields are correct
- [ ] Check license compatibility
- [ ] Ensure all necessary files are included in `files` array

## 🎯 Publishing Commands Summary

```bash
# Development
bun run dev                    # Start development server
bun run test:crc32-sql-insert  # Run SQL integration tests
bun run migrate:up             # Run database migrations

# Publishing
bun run publish --dry-run      # Validate without uploading
bun publish --dry-run          # NPM dry run
bun publish                    # Publish to npm
bunx npm login                 # Login to npm registry
```

## 📊 Package Metrics

- **Total Files**: 24
- **Unpacked Size**: 98.62KB
- **Dependencies**: 0 (runtime)
- **Peer Dependencies**: Bun >= 1.3.6
- **License**: MIT

## 🔗 Links

- Repository: Update in package.json
- Issues: Update in package.json
- Documentation: Included in package
- NPM Package: Will be available after publishing
