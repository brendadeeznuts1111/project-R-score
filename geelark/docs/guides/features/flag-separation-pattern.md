# Flag Separation Pattern Documentation

## Overview

The Dev HQ CLI demonstrates a perfect flag separation pattern where Bun runtime flags are cleanly separated from CLI-specific flags. This ensures proper handling of different types of flags by their respective systems.

## Pattern Architecture

### Core Pattern
```
bun [bun-flags] dev-hq-cli.ts [command] [cli-flags]
```

### Flag Categories

#### 🟡 Bun Flags (Runtime)
Handled by Bun before the script executes:
- `--hot` - Hot reloading
- `--watch` - File watching
- `--smol` - Minimal runtime
- `--define <key=value>` - Define constants
- `--drop <identifier>` - Drop identifiers
- `--loader <ext:loader>` - Custom loaders
- `--filter <pattern>` - File filtering
- `--conditions <conditions>` - Export conditions
- `--no-clear-screen` - Preserve screen
- `--preserveWatchOutput` - Preserve watch output
- `--cwd <path>` - Working directory
- `--env-file <path>` - Environment file
- `--config <path>` - Configuration file
- `--help` - Show help
- `--version` - Show version

#### 🟢 CLI Flags (Application)
Handled by the Dev HQ CLI application:
- `--table` - Table format output
- `--json` - JSON format output
- `--verbose` - Verbose logging
- `--quiet` - Quiet mode
- `--timeout <ms>` - Command timeout
- `--output <path>` - Output file
- `--format <type>` - Custom format

#### 🔵 Commands
Available commands in the CLI:
- `insights` - Project insights and analysis
- `git` - Git repository information
- `cloc` - Code line counting
- `test` - Run tests
- `docker` - Docker container insights
- `health` - System health check
- `server` - Start automation server
- `run` - Execute arbitrary commands

## Implementation Details

### Flag Parsing Logic

The `parseArguments()` method separates flags using these steps:

1. **Identify Bun Flags**: Check against known Bun flag patterns
2. **Extract Values**: Handle flags that require values (like `--define KEY=VALUE`)
3. **Isolate Command**: First non-flag argument becomes the command
4. **Collect CLI Flags**: Remaining flags are CLI-specific

### Execution Flow

```typescript
// 1. Parse and separate flags
const { bunFlags, command, cliFlags } = this.parseArguments(argv);

// 2. Display flag analysis
console.log(`🟡 Bun flags: [${bunFlags.join(", ")}]`);
console.log(`🟢 CLI flags: [${cliFlags.join(", ")}]`);
console.log(`🔵 Command: ${command}`);

// 3. Execute command with CLI flags
return await this.executeCommand(command, cliFlags);
```

## Examples

### Basic Usage
```bash
bun dev-hq-cli.ts insights --table
```
Output:
```
🟡 Bun flags: []
🟢 CLI flags: [--table]
🔵 Command: insights
```

### Complex Flag Combination
```bash
bun --hot --watch --define NODE_ENV=prod dev-hq-cli.ts test --timeout 5000 --verbose
```
Output:
```
🟡 Bun flags: [--hot, --watch, --define, NODE_ENV=prod]
🟢 CLI flags: [--timeout, 5000, --verbose]
🔵 Command: test
```

### Runtime vs Application Flags
```bash
bun --smol --filter "*.ts" dev-hq-cli.ts git --json --quiet
```
- Bun handles: `--smol` (runtime optimization), `--filter "*.ts"` (file filtering)
- CLI handles: `--json` (output format), `--quiet` (logging level)

## Benefits

1. **Clear Separation**: Runtime vs application concerns are clearly divided
2. **No Conflicts**: Bun flags don't interfere with CLI functionality
3. **Predictable Behavior**: Each system handles only its intended flags
4. **Easy Testing**: Flag categories can be tested independently
5. **Documentation**: Clear help messages show which flags belong to which system

## Internal Flow

For a detailed explanation of how flags flow through the system, see [Flag Flow Diagram](./FLAG_FLOW_DIAGRAM.md), which covers:

- Step-by-step processing flow
- How Bun runtime handles flags before script execution
- How CLI applications should filter Bun flags from `process.argv`
- Two-phase parsing (Bun runtime → CLI application)
- Common pitfalls and best practices

## Testing Strategy

The pattern is thoroughly tested in multiple test files:

- `tests/pattern.test.ts` - General flag separation tests
- `tests/flag-flow-diagram.test.ts` - Internal flow and processing tests
- `tests/perfect-flag-pattern.test.ts` - Pattern demonstration tests
- `tests/pattern-simple.test.ts` - Simplified pattern tests

Test scenarios cover:
- Single and multiple Bun flags
- Single and multiple CLI flags
- Complex flag combinations
- Edge cases and error conditions
- Output format verification
- Internal flow and processing

Each test verifies that flags are correctly categorized and processed by their intended systems.
