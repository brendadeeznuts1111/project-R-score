# ShortcutRegistry CLI

A command-line interface showcasing Bun macros for build-time data embedding in the ShortcutRegistry system.

## Overview

The CLI demonstrates how Bun macros execute at bundle-time, embedding data directly into your application bundle. All macro results are computed during the build process and inlined into the final bundle.

## Installation

The CLI is included in the project. No additional installation needed.

## Usage

```bash
# Show help
bun run cli

# Or directly
bun run src/cli/index.ts [command]
```

## Commands

### `info`

Display build information including version, build time, Git commit hash, and platform details.

```bash
bun run cli info
```

**Output:**
```
📦 ShortcutRegistry Build Information

  Version:      1.0.0
  Build Time:   2026-01-22T20:14:46.570Z
  Git Commit:   426894410d120659c3c34d589568d905c52a265d
  Short Commit: 4268944
  Platform:     darwin
  Node Env:      development
  Build Version: 1.0.0-4268944
```

### `shortcuts`

List all available shortcuts with their key bindings and descriptions.

```bash
bun run cli shortcuts
```

**Output:**
```
⌨️  Available Shortcuts (10 total)

   1. file.save            Cmd+S           Save file
   2. file.open            Cmd+O           Open file
   ...
```

### `stats`

Display shortcut statistics including totals, breakdown by category, and breakdown by scope.

```bash
bun run cli stats
```

**Output:**
```
📊 Shortcut Statistics

  Total Shortcuts: 10

  By Category:
    general         10

  By Scope:
    global          10
```

### `git`

Display Git commit information including full hash, short hash, and timestamp.

```bash
bun run cli git
```

**Output:**
```
🔀 Git Commit Information

  Full Hash:    426894410d120659c3c34d589568d905c52a265d
  Short Hash:   4268944
  Timestamp:    1705958400
```

### `validate`

Validate shortcuts configuration at build-time. This will fail the build if any shortcuts are invalid.

```bash
bun run cli validate
```

**Output:**
```
✅ Validating Shortcuts...

  ✓ All shortcuts are valid!
  ✓ No conflicts detected
  ✓ 10 shortcuts validated
```

### `search <keyword>`

Search shortcuts by keyword. Searches in shortcut ID, description, and action fields.

```bash
bun run cli search save
```

**Output:**
```
🔍 Search Results for "save" (1 found)

  file.save            Cmd+S           Save file
```

### `category <category>`

List shortcuts filtered by category.

```bash
bun run cli category general
```

**Available categories:**
- `general`
- `theme`
- `telemetry`
- `emulator`
- `compliance`
- `logs`
- `ui`
- `developer`
- `accessibility`
- `data`
- `payment`
- `custom`

**Output:**
```
📁 Shortcuts in "general" category (10 total)

  file.save            Cmd+S           Save file
  file.open            Cmd+O           Open file
  ...
```

### `all`

Display all information (combines info, shortcuts, stats, git, and validate).

```bash
bun run cli all
```

## How It Works

The CLI uses Bun macros that execute at bundle-time:

1. **`getDefaultShortcuts`** - Embeds default shortcuts into the bundle
2. **`getGitCommitHash`** - Extracts Git commit information during build
3. **`getBuildInfo`** - Collects build-time metadata (version, platform, etc.)
4. **`validateShortcuts`** - Validates shortcuts during build (fails build if invalid)
5. **`getShortcutStats`** - Computes statistics at build-time

When you run `bun run cli`, Bun:
1. Executes all macro functions during bundling
2. Inlines their return values into the bundle
3. Runs the CLI with the embedded data

This means:
- ✅ No runtime file I/O for shortcuts
- ✅ Git commit hash is embedded (no git command at runtime)
- ✅ Build info is computed once at build-time
- ✅ Validation happens before deployment
- ✅ Smaller runtime footprint

## Examples

### Display build version

```bash
bun run cli info | grep "Build Version"
```

### Find all file-related shortcuts

```bash
bun run cli search file
```

### Check shortcut statistics

```bash
bun run cli stats
```

### Validate before deployment

```bash
bun run cli validate && echo "✓ Ready to deploy"
```

## Integration with Build Process

The CLI can be integrated into your build process:

```json
{
  "scripts": {
    "prebuild": "bun run cli validate",
    "build": "bun build src/index.ts --outdir dist",
    "postbuild": "bun run cli info"
  }
}
```

## Macros Used

### `getDefaultShortcuts.ts`
- `getDefaultShortcuts()` - Returns all default shortcuts
- `getShortcutIds()` - Returns shortcut IDs array
- `getShortcutsByCategory(category)` - Filters by category (static values only)

### `getGitCommitHash.ts`
- `getGitCommitHash()` - Full commit hash
- `getShortCommitHash()` - Short hash (7 chars)
- `getCommitInfo()` - Complete commit info with timestamp

### `getBuildInfo.ts`
- `getBuildInfo()` - Comprehensive build information (async)
- `getBuildVersion()` - Version string with commit hash (async)

### `validateShortcuts.ts`
- `validateShortcuts()` - Validates all shortcuts (throws if invalid)
- `getShortcutStats()` - Returns statistics object

### `extractMetaTags.ts` (not used in CLI, but available)
- `extractMetaTags(url)` - Extract meta tags from HTML (async)
- `extractOpenGraphTags(url)` - Extract Open Graph tags (async)
- `extractStructuredData(url)` - Extract JSON-LD data (async)

## See Also

- [Macros Documentation](../macros/README.md)
- [Bun Macros Documentation](https://bun.sh/docs/bundler/macros)
- [Main README](../../README.md)
