# Root Directory Organization

This document describes the organization of the root directory and where different types of files should be placed.

## Root Directory Structure

The root directory should contain only essential project files:

### Essential Files (Stay in Root)
- `README.md` - Project overview and documentation
- `CLAUDE.md` - Claude Code assistant guidelines
- `package.json` - Node.js/Bun package configuration
- `bun.lock` - Dependency lock file

### Configuration Files (in `/config/` directory)
- `config/tsconfig.json` - TypeScript configuration
- `config/bunfig.toml` - Bun configuration
- `config/nexus.toml` - Nexus configuration
- `config/wrangler.toml` - Cloudflare Workers configuration

### Runtime Files (Gitignored)
- `*.db` - SQLite database files (runtime)
- `*.log` - Log files (runtime)
- `*.db-wal` - SQLite WAL files (runtime)

## Directory Organization

### `/docs/root-docs/`
Documentation files that were previously in the root directory:
- Project summaries and reviews
- Integration guides
- Implementation notes
- Session summaries

### `/scripts/root-scripts/`
Utility scripts and helper files that were previously in the root:
- Runtime utilities
- Demo scripts
- Test utilities
- Helper scripts

### `/data/`
Data files and imports:
- CSV files (e.g., `bitmex_executions.csv`)
- Database WAL files
- Other data imports

### Other Standard Directories
- `/src/` - Source code
- `/test/` - Test files
- `/scripts/` - Build and utility scripts
- `/examples/` - Example code
- `/docs/` - Documentation
- `/config/` - Configuration files
- `/dashboard/` - Dashboard HTML/JS files
- `/public/` - Public assets
- `/deploy/` - Deployment configurations
- `/bench/` - Benchmark files
- `/commands/` - CLI command documentation

## File References Updated

The following import paths were updated to reflect the new organization:

1. `src/utils/bun.ts` - Updated import from `../../bun-runtime-utils` to `../../scripts/bun-runtime-utils`
2. `test/integration-test.ts` - Updated import from `./bun-runtime-utils` to `../scripts/bun-runtime-utils`
3. `README.md` - Updated example imports to use `./scripts/bun-runtime-utils`

## Best Practices

1. **Keep root clean** - Only essential configuration and documentation files should be in root
2. **Use appropriate directories** - Place files in their logical directories (docs, scripts, data, etc.)
3. **Update imports** - When moving files, update all import references
4. **Document changes** - Update this file when reorganizing

## Maintenance

When adding new files to the project:
- Documentation → `/docs/` or `/docs/root-docs/` if project-level
- Scripts → `/scripts/` or `/scripts/root-scripts/` if utility scripts
- Data files → `/data/`
- Source code → `/src/`
- Tests → `/test/`
- Examples → `/examples/`
