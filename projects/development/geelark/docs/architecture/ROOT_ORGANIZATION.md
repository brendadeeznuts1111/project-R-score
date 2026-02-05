# Root Directory Organization

This document describes the organization of the root directory of the codebase.

## 📁 Directory Structure

### Root Level Files (Essential Configuration)
- `package.json` - Project configuration and scripts
- `tsconfig.json` - TypeScript configuration
- `bunfig.toml` - Bun runtime configuration
- `bun.lock` - Dependency lock file
- `.gitignore` - Git ignore patterns
- `README.md` - Main project documentation
- `env.d.ts` - TypeScript environment type definitions
- `meta.json` - System manifest (auto-generated)

### 📂 Organized Directories

#### `bin/` - CLI Entry Points
All command-line interface entry points are located here:
- `dev-hq-cli.ts` - Main CLI with insights, health, and analysis commands
- `dev-hq.ts` - Production-ready CLI
- `dev-hq-test.ts` - Test runner CLI
- `dev-hq-automate` - Automation CLI
- `errors.ts` - Error handling utilities

#### `src/` - Source Code
Main application source code:
- Core modules (CLI, Dashboard, Logger, FeatureRegistry, etc.)
- Services and utilities
- Examples and components

#### `tests/` - Test Files
All test files and related resources:
- `unit/` - Unit tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests
- `performance/` - Performance benchmarks
- `demos/` - Demo and example files
  - `index.tsx` - TSX demo
  - `smol-demo.tsx` - Smol flag demo
  - `test-demo.ts` - Test demonstration
  - `index.js` - JavaScript demo
- `config/` - Test configuration files
- `.test-hidden.ts` - Hidden test file

#### `scripts/` - Build and Utility Scripts
Automation and build scripts:
- `analyze-bundle.ts` - Bundle analysis
- `build-validation.ts` - Build validation
- `generate-meta.ts` - Meta manifest generation
- `lint.ts` - Linting utilities
- `test-dev-hq.sh` - Dev HQ test shell script
- Other utility scripts

#### `docs/` - Documentation
Project documentation:
- API references
- Architecture guides
- Tutorials and user guides
- Feature documentation

#### `session/` - Session Files
Temporary analysis and planning documents:
- `bundle-analysis-results.md` - Bundle analysis results
- `ServiceFactory-Test-Summary.md` - Test summary
- `error-handling-plan.md` - Error handling documentation
- `bundle-analysis-notes.md` - Analysis notes

#### `bench/` - Benchmarks
Performance benchmark files

#### `config/` - Configuration Files
All configuration files organized by category:
- `config/build/` - Build configuration files (build-defines.json, custom-loaders.json)
- `config/security/` - Security scanner configurations (security-scanners.json, security-suppressions.xml)
- `config/tsconfig/` - TypeScript configuration files (tsconfig.dev.json, tsconfig.prod.json, tsconfig.audit.json)

#### `dev-hq/` - Dev HQ Core
Core Dev HQ automation and server code

#### `examples/` - Example Code
Example implementations and demonstrations

#### `packages/` - Package Templates
Package creation templates

#### `schemas/` - JSON Schemas
JSON schema definitions for validation

## 🔄 Migration Summary

### Files Moved

1. **CLI Entry Points** → `bin/`
   - `dev-hq-cli.ts`
   - `dev-hq.ts`
   - `dev-hq-test.ts`
   - `dev-hq-automate`

2. **Demo/Test Files** → `tests/demos/`
   - `index.tsx`
   - `smol-demo.tsx`
   - `test-demo.ts`
   - `index.js`

3. **Shell Scripts** → `scripts/`
   - `test-dev-hq.sh`

4. **Analysis Documents** → `session/`
   - `ServiceFactory-Test-Summary.md`
   - `bundle-analysis-results.md`

5. **Hidden Test File** → `tests/`
   - `.test-hidden.ts`

### Updated References

- `package.json` scripts updated to use `bin/dev-hq-cli.ts`
- All import paths in `bin/` files updated from `./dev-hq/` to `../dev-hq/`
- All import paths verified and working

## ✅ Benefits

1. **Cleaner Root**: Root directory now only contains essential configuration files
2. **Better Organization**: Related files grouped logically
3. **Easier Navigation**: Clear separation between CLI, source, tests, and docs
4. **Maintainability**: Easier to find and manage files

## 📝 Notes

- All import paths have been updated and verified
- No linting errors introduced
- All package.json scripts updated to reflect new paths
- Test files that create temporary `index.tsx` files are unaffected

