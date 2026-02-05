# Bun Type Fixes - Dedicated PATH Setup

## Overview

This project uses a dedicated PATH to ensure proper isolation and environment configuration.

## Directory Structure

```text
/Users/nolarose/bun-type-fixes/
├── bin/                    # Dedicated binaries directory
│   └── bun-type-fixes     # Main executable
├── src/                    # Source code
├── scripts/               # Setup scripts
├── cli.ts                 # CLI entry point
└── package.json           # Project configuration
```

## Dedicated PATH Configuration

### Environment Variables

- `BUN_TYPE_FIXES_ROOT`: Project root directory
- `BUN_TYPE_FIXES_BIN`: Dedicated bin directory
- `PATH`: Modified to include dedicated bin first

### Setup Methods

#### 1. Manual Setup (Recommended)

```bash
# Add to your ~/.bashrc or ~/.zshrc
export BUN_TYPE_FIXES_ROOT="/Users/nolarose/bun-type-fixes"
export BUN_TYPE_FIXES_BIN="/Users/nolarose/bun-type-fixes/bin"
export PATH="/Users/nolarose/bun-type-fixes/bin:$PATH"
```

#### 2. Using the Shell Wrapper

```bash
# Use the provided shell script
./bun-type-fixes.sh [command] [options]

# Examples:
./bun-type-fixes.sh verify --all
./bun-type-fixes.sh verify --sqlite -v
```

#### 3. Direct Execution

```bash
# Navigate to project directory
cd /Users/nolarose/bun-type-fixes

# Run with dedicated PATH
BUN_TYPE_FIXES_ROOT="/Users/nolarose/bun-type-fixes" \
BUN_TYPE_FIXES_BIN="/Users/nolarose/bun-type-fixes/bin" \
PATH="/Users/nolarose/bun-type-fixes/bin:$PATH" \
bun run cli.ts [command] [options]
```

## Usage Examples

### With Dedicated PATH

```bash
# Verify all type fixes
bun-type-fixes verify --all

# Verify specific fixes
bun-type-fixes verify --autoload
bun-type-fixes verify --sqlite
bun-type-fixes verify --filesink
bun-type-fixes verify --integration

# Verbose output
bun-type-fixes verify --all -v
```

### Without Dedicated PATH

```bash
# From project directory
bun run cli.ts verify --all

# Using npm scripts
bun run verify
bun run verify:sqlite
bun run verify:filesink
```

## Benefits of Dedicated PATH

1. **Isolation**: Prevents conflicts with other tools
2. **Consistency**: Ensures the correct version is always used
3. **Portability**: Works across different environments
4. **Safety**: Avoids system-wide PATH pollution

## Troubleshooting

### Command Not Found

```bash
# Ensure the dedicated PATH is set
echo $BUN_TYPE_FIXES_BIN
echo $PATH | grep bun-type-fixes

# Re-source your shell profile
source ~/.bashrc  # or ~/.zshrc
```

### Permission Denied

```bash
# Make scripts executable
chmod +x /Users/nolarose/bun-type-fixes/bin/bun-type-fixes
chmod +x /Users/nolarose/bun-type-fixes/bun-type-fixes.sh
```

### Environment Issues

```bash
# Check environment variables
env | grep BUN_TYPE_FIXES

# Reset environment
unset BUN_TYPE_FIXES_ROOT
unset BUN_TYPE_FIXES_BIN
```

## Integration with Thuis Profile

The dedicated PATH works seamlessly with the "thuis" terminal profile:

1. Activate the thuis profile:

   ```bash
   bun run src/cli.ts profile:use thuis --force
   ```

2. Navigate to the project:

   ```bash
   cd /Users/nolarose/bun-type-fixes
   ```

3. Run with dedicated PATH:

   ```bash
   ./bun-type-fixes.sh verify --all
   ```

## Best Practices

1. Always use the dedicated PATH for consistency
2. Keep the bin directory minimal - only project-specific executables
3. Document any additional tools in the bin directory
4. Test in different environments to ensure portability
5. Use the shell wrapper for complex operations
