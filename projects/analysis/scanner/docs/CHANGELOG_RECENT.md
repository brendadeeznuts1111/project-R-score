# Recent Changes

## 2026-02-04

### Added

#### Code Quality Automation

- **Pre-commit hook**: Automatically formats and fixes linting issues before commits
    - Formats staged TypeScript files with Prettier
    - Auto-fixes ESLint issues where possible
    - Silent mode for fast commits (warnings allowed)
- **Convenience scripts**:
    - `bun run fix` - Format + auto-fix linting
    - `bun run check` - Check formatting + linting (read-only)
    - `bun run precommit` - Run pre-commit checks manually
    - `bun run quality` - Interactive quality checker
    - `bun run quality:fix` - Interactive quality checker with auto-fix
- **Documentation**: [Code Quality Automation](./CODE_QUALITY_AUTOMATION.md)

#### Bun v1.3.7 Features Integration

- **`Bun.wrapAnsi()` demo**: `scripts/demo-wrap-ansi.ts`
    - Demonstrates ANSI-aware text wrapping
    - Shows performance benefits (33-88x faster)
    - Examples for colors, hyperlinks, Unicode, emoji
- **CLI utilities**: `src/cli-utils.ts`
    - `wrapAnsiText()` - ANSI-aware text wrapping utility
    - `wrapErrorMessage()` - Wrap error messages with colors
    - `wrapHelpText()` - Wrap help text with colors
    - `wrapToTerminal()` - Wrap to terminal width
- **Documentation**: [Bun v1.3.7 Features](./BUN_V1.3.7_FEATURES.md)

#### Profiling Enhancements

- **Example script**: `scripts/profile-example.ts`
    - Demonstrates CPU and heap profiling
    - Includes CPU-intensive and memory-intensive operations
    - Shows async operations
- **Quick reference**: [Profiling Quick Reference](./PROFILING_QUICK_REFERENCE.md)
    - Command reference for all profiling options
    - Analysis commands (grep patterns)
    - Package script usage
- **Package script**: `bun run profile:example`
    - Runs both CPU and heap profiling in markdown format

### Fixed

#### Linting Issues

- Fixed 53 lint warnings across three scripts:
    - `scripts/extract-bun-constants.ts` (3 warnings)
    - `scripts/index-docs-topics.ts` (3 warnings)
    - `scripts/validate-docs-links.ts` (47 warnings)
- Improvements:
    - Added proper TypeScript types
    - Fixed unsafe `any` usage
    - Added return type annotations
    - Fixed nullable boolean expressions
    - Removed non-null assertions

### Improved

#### Pre-commit Hook Performance

- Optimized for speed:
    - Silent mode (no output unless errors)
    - Only processes staged files
    - Format + auto-fix only (no blocking checks)
    - Warnings allowed (errors still block)

### Documentation

- Added comprehensive guides:
    - [Code Quality Automation](./CODE_QUALITY_AUTOMATION.md)
    - [Bun v1.3.7 Features](./BUN_V1.3.7_FEATURES.md)
    - [Profiling Quick Reference](./PROFILING_QUICK_REFERENCE.md)
    - [Recent Changes](./CHANGELOG_RECENT.md) (this file)

## See Also

- [README](../README.md) - Project overview
- [Contributing](../CONTRIBUTING.md) - Contribution guidelines
