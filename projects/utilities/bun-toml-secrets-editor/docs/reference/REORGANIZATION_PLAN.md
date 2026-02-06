# 🗂️ Codebase Reorganization Plan

## Overview

This document outlines the comprehensive reorganization of the bun-toml-secrets-editor codebase to improve maintainability, discoverability, and developer experience.

## Current Issues

1. **Root Directory Clutter**
   - 15+ markdown documentation files mixed with config
   - 12 CPU profile files in root
   - Test files scattered at root level

2. **Multiple Test Directories**
   - `tests/` - main test directory
   - `test/` - secondary test directory (4 files)

3. **Multiple CLI Locations**
   - `src/cli/` - 25 CLI files
   - `cli/` - additional CLI files
   - `cmds/` - publishing commands

4. **Mixed Concerns in src/**
   - Server files mixed with CLI
   - RSS functionality mixed with core secrets
   - Examples scattered across locations

5. **Scripts Directory**
   - 30+ uncategorized scripts
   - Profiling, demos, debugging all mixed

## Proposed Structure

```text
bun-toml-secrets-editor/
├── docs/                           # All documentation
│   ├── guides/                    # User guides
│   ├── reference/                 # API reference
│   ├── architecture/              # Design/architecture docs
│   │   ├── ENTERPRISE_*.md
│   │   ├── HEADER_CASE_*.md
│   │   └── RSS_V1.3.7_*.md
│   └── development/               # Dev/contributing guides
│       ├── CONTRIBUTING_*.md
│       ├── FFI_*.md
│       ├── NIX_*.md
│       └── STEP_BY_STEP_*.md
│
├── src/                           # Source code
│   ├── cli/                       # CLI tools (consolidated)
│   │   ├── index.ts              # Matrix CLI
│   │   ├── duoplus-cli.ts
│   │   └── rss-cli.ts
│   ├── core/                      # Core secrets/TOML logic
│   ├── rss/                       # RSS functionality
│   │   ├── rss-fetcher.ts
│   │   ├── server.ts
│   │   └── ...
│   ├── server/                    # Server implementations
│   │   ├── server.ts
│   │   ├── server-governed.js
│   │   └── ...
│   ├── utils/                     # Shared utilities
│   └── types/                     # TypeScript definitions
│
├── tests/                         # ALL tests (consolidated)
│   ├── ffi/                       # FFI test files
│   │   ├── test-ffi.ts
│   │   └── ...
│   ├── *.test.ts                  # Other test files
│   └── setup.ts
│
├── scripts/                       # Build/publish scripts only
│   ├── build-cross-platform.ts
│   ├── postinstall.ts
│   └── __tests__/
│
├── tools/                         # Development tools
│   ├── profiling/                 # Profiling utilities
│   │   ├── auto-profiler.js
│   │   ├── memory-guardian.js
│   │   └── ...
│   ├── demos/                     # Demo scripts
│   │   ├── buffer-performance-demo.js
│   │   └── ...
│   └── debugging/                 # Debug utilities
│       ├── debug-fetch.ts
│       └── ...
│
├── examples/                      # ALL examples (consolidated)
│   ├── cli/                       # CLI examples
│   ├── secrets/                   # TOML/secrets examples
│   ├── rss/                       # RSS examples
│   └── ffi/                       # FFI examples
│
├── profiles/                      # CPU/heap profiles
│   └── CPU.*.md
│
└── config/                        # Configuration files
```

## Reorganization Scripts

### 1. Dry Run (Preview)
```bash
bun run scripts/reorganize-dry-run.ts
```

Shows what files will be moved without making any changes.

### 2. Execute Reorganization
```bash
./reorganize-codebase.sh
```

Performs the actual file moves. **Run the dry run first!**

### 3. Fix Import Paths
```bash
# Preview changes
bun run scripts/fix-imports.ts

# Apply changes
bun run scripts/fix-imports.ts --apply
```

Updates import statements in moved files.

## Files Being Moved

| Category | Count | Destination |
|----------|-------|-------------|
| Documentation | 14 | docs/{development,architecture}/ |
| Test files | 11 | tests/ffi/, tests/ |
| Scripts | 15 | tools/{profiling,demos,debugging}/ |
| Server files | 4 | src/server/ |
| RSS files | 7 | src/rss/, src/cli/ |
| Examples | 14 | examples/ |
| **Total** | **65** | - |

## Post-Reorganization Tasks

After running the reorganization:

1. **Review Changes**
   ```bash
   git status
   git diff --stat
   ```

2. **Update package.json Scripts**
   - Update any script paths that reference moved files
   - Verify all `bun run` commands still work

3. **Fix Import Paths**
   ```bash
   bun run scripts/fix-imports.ts --apply
   ```

4. **Run Tests**
   ```bash
   bun test
   ```

5. **Verify Builds**
   ```bash
   bun run build
   ```

6. **Update .gitignore** (if needed)
   - Add patterns for tools/profiling output
   - Ensure profiles/ is handled correctly

## Rollback Plan

If issues arise:

```bash
# Reset all changes
git reset --hard HEAD

# Or selectively restore files
git checkout -- <file-path>
```

## Benefits

1. **Clear Separation of Concerns**
   - Documentation organized by purpose
   - Tools separated from core scripts
   - Examples easy to find

2. **Reduced Cognitive Load**
   - Fewer files in root directory
   - Logical grouping of related files
   - Consistent naming conventions

3. **Better Discoverability**
   - New developers can quickly find what they need
   - Related files are co-located

4. **Easier Maintenance**
   - Updates to docs don't clutter PRs
   - Profile files isolated
   - Test organization matches source

## Timeline

- **Phase 1**: Move documentation (low risk)
- **Phase 2**: Consolidate tests (low risk)
- **Phase 3**: Organize scripts (medium risk)
- **Phase 4**: Move server/rss files (higher risk - update imports)
- **Phase 5**: Consolidate examples (low risk)
- **Phase 6**: Fix import paths and verify

Each phase can be done independently. The full reorganization takes ~5 minutes to execute.
