# Project Organization Guide

## Directory Structure

```text
toml-cli/                              # Project root
│
├── src/                               # Source code
│   └── config-manager.ts              # Main CLI application (561 lines)
│                                      # - R2Storage class
│                                      # - ConfigManager class
│                                      # - CLI command handler
│
├── tests/                             # Test suite
│   ├── unit/                          # Unit tests
│   │   └── config-manager.test.ts     # 22 unit & integration tests
│   └── bench/                         # Performance benchmarks
│       └── config-manager.benchmark.ts # Performance analysis
│
├── examples/                          # Example configurations
│   ├── config.toml                    # Sample TOML config
│   ├── demo.toml                      # Demo configuration
│   ├── test-config.toml               # Test configuration
│   └── final-test.toml                # Final test config
│
├── scripts/                           # Utility scripts
│   └── create-bucket.ts               # R2 bucket creation helper
│
├── docs/                              # Documentation
│   ├── README.md                      # Complete user guide
│   ├── QUICKSTART.md                  # 1-minute setup
│   ├── IMPLEMENTATION.md              # Technical overview
│   ├── TEST_RESULTS.md                # Benchmark results & analysis
│   └── TEST_GUIDE.md                  # How to run tests
│
├── agent-container/                   # Container configurations (future)
│
├── README.md                          # Root README (quick reference)
├── package.json                       # Project metadata & scripts
├── bunfig.toml                        # Bun runtime configuration
├── .env.example                       # Environment variable template
└── .gitignore                         # Git ignore rules
```

## File Organization Logic

### Source Code (`src/`)
- **Single entry point**: `config-manager.ts`
- Contains all classes and logic:
  - `R2Storage` - Cloudflare R2 operations
  - `ConfigManager` - TOML management
  - CLI handler and command router

### Tests (`tests/`)
- **Unit tests**: `tests/unit/` - Integration and unit tests
- **Benchmarks**: `tests/bench/` - Performance measurement
- Both reference source code from `../../src/`

### Examples (`examples/`)
- Sample TOML configuration files
- Used by tests and documentation
- Reference for users

### Scripts (`scripts/`)
- Utility scripts (not core functionality)
- R2 bucket creation helper
- Future automation tools

### Documentation (`docs/`)
- Complete user guides
- Technical documentation
- API reference
- Test results and benchmarks

## Running Commands

### From Project Root

```bash
# Initialize a config
bun run src/config-manager.ts init

# Validate
bun run src/config-manager.ts validate

# Or use npm scripts from package.json
bun run init
bun run validate
bun run help
bun run version
```

### Testing

```bash
# Run unit tests
bun test tests/unit/config-manager.test.ts

# Run benchmarks
bun tests/bench/config-manager.benchmark.ts

# Or use npm scripts
bun run test
bun run benchmark
```

## Configuration Files

### `package.json`
- Project metadata (name, version, description)
- npm/Bun scripts for common operations
- Dependencies and engines
- Entry points and bin scripts

### `bunfig.toml`
- Bun-specific runtime configuration
- Build settings
- Test configuration
- Development settings

### `.env.example`
- Template for environment variables
- Shows required credentials for R2
- Copy to `.env` or `.env.local` for local setup

### `.gitignore`
- Excludes build artifacts
- Ignores dependencies
- Excludes environment files
- Excludes test artifacts and temp files

## Project Statistics

```text
Source Code:
  - Main application: 561 lines (src/config-manager.ts)
  - Documentation: 2000+ lines across 5 documents
  - Tests: 384 lines (22 unit tests, all passing)
  - Benchmarks: 150+ lines (comprehensive performance testing)

Memory/Size:
  - Config files: 927 bytes (typical)
  - Application: < 1 MB
  - Dependencies: 0 (Bun built-ins only)

Performance:
  - Config validation: ~10,000 ops/sec
  - Config loading: ~38,000 ops/sec
  - Full workflow: ~3,500 ops/sec
```

## Development Workflow

### 1. Setup
```bash
cd toml-cli
bun install  # Install dependencies (none required)
```

### 2. Development
```bash
# Edit src/config-manager.ts
bun run src/config-manager.ts init  # Test changes
```

### 3. Testing
```bash
# Run all tests
bun test tests/unit/config-manager.test.ts

# Run benchmarks
bun tests/bench/config-manager.benchmark.ts
```

### 4. Documentation
- Edit docs in `docs/` directory
- Update examples in `examples/`
- Keep README.md current

### 5. Distribution
```bash
# Create archive
tar czf empire-pro-config-manager.tar.gz src/ tests/ docs/ examples/ package.json bunfig.toml README.md

# Or use Bun to build
bun build src/config-manager.ts --outdir dist/
```

## Key Design Decisions

1. **Single Source File**: All logic in `src/config-manager.ts` for simplicity
2. **No Dependencies**: Uses only Bun built-ins for portability
3. **TypeScript**: Full type safety with no compilation needed
4. **Organized Tests**: Separated unit tests and benchmarks
5. **Clear Documentation**: Guides for users and developers
6. **Examples**: Real-world configuration examples

## Extending the Project

### Adding New Commands
Edit `src/config-manager.ts`:
1. Add command case to main CLI handler
2. Implement command logic
3. Add tests in `tests/unit/`
4. Update documentation

### Adding Utilities
- Create new files in `src/` if related to core functionality
- Use `scripts/` for standalone utilities
- Add tests for any new code

### Documentation
- Update `docs/README.md` for user-facing changes
- Update `docs/IMPLEMENTATION.md` for technical changes
- Add test documentation in `docs/TEST_GUIDE.md`

## Version Control

The `.gitignore` excludes:
- Dependencies (`node_modules/`, `.bun/`)
- Environment files (`.env`, `.env.local`)
- Build artifacts (`dist/`, `build/`)
- Test artifacts (`test-*.toml`, `benchmark-temp*.toml`)
- Logs and temporary files

Commit to version control:
- Source code (`src/`)
- Tests (`tests/`)
- Documentation (`docs/`)
- Examples (`examples/`)
- Configuration files (`package.json`, `bunfig.toml`)

## Production Deployment

```bash
# 1. Extract source
tar xzf empire-pro-config-manager.tar.gz

# 2. Install Bun
curl -fsSL https://bun.sh/install | bash

# 3. Set environment
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="..."

# 4. Use the tool
bun run src/config-manager.ts init
bun run src/config-manager.ts upload -e prod
```

---

**Status**: ✅ Fully Organized | **Tests**: 22/22 passing | **Ready for Production**
