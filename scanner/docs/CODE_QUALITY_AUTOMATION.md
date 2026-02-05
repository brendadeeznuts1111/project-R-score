# Code Quality Automation

This document describes the automated linting, formatting, and code quality checks configured for the scanner project.

## Overview

The project uses automated code quality checks to ensure consistent code style and catch issues early:

- **Prettier**: Automatic code formatting
- **ESLint**: Linting with TypeScript-specific rules and auto-fix capabilities
- **Pre-commit hooks**: Automatic formatting and linting before commits

## Quick Start

### Before Committing

The pre-commit hook automatically runs when you commit. It will:

1. Format staged TypeScript files with Prettier
2. Auto-fix ESLint issues where possible
3. Check for remaining errors (warnings are allowed)

If errors remain, the commit will be blocked. Fix them and try again.

### Manual Checks

```bash
# Check formatting and linting (read-only)
bun run check

# Auto-fix formatting and linting issues
bun run fix

# Run pre-commit checks manually
bun run precommit

# Use the quality checker script
bun run quality          # Check only
bun run quality:fix      # Check and auto-fix
```

## Available Scripts

| Script                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `bun run format`       | Format all files with Prettier                  |
| `bun run format:check` | Check formatting without making changes         |
| `bun run lint`         | Check for linting issues                        |
| `bun run lint:fix`     | Auto-fix linting issues                         |
| `bun run fix`          | Format + auto-fix linting (convenience script)  |
| `bun run check`        | Check formatting + linting (convenience script) |
| `bun run precommit`    | Run same checks as pre-commit hook              |
| `bun run quality`      | Interactive quality checker (check only)        |
| `bun run quality:fix`  | Interactive quality checker (auto-fix)          |

## Pre-commit Hook

The `.husky/pre-commit` hook automatically:

1. **Formats** staged `.ts` files (excluding test files)
2. **Auto-fixes** ESLint issues in staged files
3. **Re-stages** formatted/fixed files
4. **Checks** for remaining errors

### What Gets Checked

- Only staged TypeScript files (`.ts`)
- Excludes test files (`.test.ts`, `.spec.ts`)
- Only checks files you're actually committing

### Bypassing the Hook

If you need to bypass the hook (not recommended):

```bash
git commit --no-verify -m "message"
```

## Configuration Files

### ESLint (`eslint.config.mjs`)

- TypeScript-specific rules
- Custom Bun-specific rules (e.g., `BUN_` prefix requirement)
- Strict type safety checks
- More lenient rules for test files

### Prettier (`.prettierrc`)

- Single quotes
- Tabs for indentation
- 120 character line width
- Trailing commas
- Semicolons required

### Ignore Files

- `.eslintignore` - Files excluded from linting
- `.prettierignore` - Files excluded from formatting

## Common Workflows

### Before Committing

```bash
# Option 1: Let the hook handle it (recommended)
git add .
git commit -m "message"  # Hook runs automatically

# Option 2: Fix issues manually first
bun run fix
git add .
git commit -m "message"
```

### Fixing All Files

```bash
# Format and fix everything
bun run fix

# Or use the quality checker
bun run quality:fix
```

### CI/CD Checks

```bash
# Check without fixing (for CI)
bun run check
```

## Troubleshooting

### Hook Runs Slowly

The hook only processes staged files, so it should be fast. If it's slow:

1. Check if you're staging too many files
2. Ensure `node_modules` is in `.gitignore`
3. Consider using `lint-staged` for better performance (not currently configured)

### Hook Fails but Code Looks Fine

1. Run `bun run lint` to see all issues
2. Some ESLint rules may be warnings in config but errors in hook
3. Check for TypeScript type errors

### Formatting Conflicts

If Prettier and ESLint conflict:

1. Prettier handles formatting (spacing, quotes, etc.)
2. ESLint handles code quality (types, logic, etc.)
3. They should work together - if not, check configs

### Test Files Not Checked

Test files are excluded from pre-commit checks but can be checked manually:

```bash
bunx eslint "**/*.test.ts"
```

## Best Practices

1. **Let the hook do its job** - Don't bypass unless necessary
2. **Fix issues incrementally** - Don't let them accumulate
3. **Run checks before pushing** - Use `bun run check` before `git push`
4. **Keep configs in sync** - Update both ESLint and Prettier configs together

## Advanced Usage

### Check Specific Files

```bash
# Format specific files
bunx prettier --write path/to/file.ts

# Lint specific files
bunx eslint path/to/file.ts --fix
```

### Check Only Modified Files

```bash
# Get modified files
git diff --name-only | grep '\.ts$' | xargs bunx prettier --write
git diff --name-only | grep '\.ts$' | xargs bunx eslint --fix
```

### Integration with Editors

Most editors can be configured to run Prettier/ESLint on save:

- **VS Code**: Install Prettier and ESLint extensions
- **Cursor**: Same as VS Code
- **WebStorm**: Enable Prettier and ESLint in settings

## See Also

- [ESLint Configuration](./CUSTOM_ESLINT_RULES.md) - Custom rules documentation
- [Contributing Guide](../CONTRIBUTING.md) - General contribution guidelines
