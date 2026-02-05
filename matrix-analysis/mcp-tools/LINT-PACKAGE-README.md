# Lint Configuration Package

## Files

- `.markdownlint.json` - Markdown formatting rules
- `.vale.ini` - Prose quality with BunDocs style
- `scripts/lint-md.ts` - Bun-native linter with Col-89 width checks
- `scripts/lint-md.sh` - Shell wrapper

## Usage

```bash
# Check all markdown files
./scripts/lint-md.sh docs/*.md README.md

# JSON output for CI
./scripts/lint-md.sh --json docs/*.md

# Direct TypeScript execution
bun run scripts/lint-md.ts --json PATHS-SETUP.md
```

## Features

- Runs markdownlint with professional configuration
- Validates line width (max 89 characters)
- Reports exact file:line:column locations
- Returns exit code 1 for any violations
- JSON output mode for CI integration
- No Node.js dependencies beyond markdownlint

## Configuration

The linter enforces:

- Consistent list markers (dashes)
- Proper heading spacing
- Language tags in code blocks
- No trailing spaces
- Line width ≤ 89 characters
- Banned hype phrases via Vale
