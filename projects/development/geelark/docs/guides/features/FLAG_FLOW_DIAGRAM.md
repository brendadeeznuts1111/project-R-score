# 🎯 Bun Flags + Dev-HQ Flags Flow Diagram

This document illustrates the internal flow of how Bun flags and CLI flags are separated and processed.

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          BUN FLAGS + DEV-HQ FLAGS FLOW DIAGRAM                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  $ bun --hot --inspect --smol dev-hq insights --table --json                               │
│           │         │         │       │       │      │     │                              │
│           │         │         │       │       │      │     └─► dev-hq command flags      │
│           │         │         │       │       │      │          --table                   │
│           │         │         │       │       │      │          --json                    │
│           │         │         │       │       │      │                                        │
│           │         │         │       │       │      └─► Script: insights                  │
│           │         │         │       │       │                                              │
│           │         │         │       │       └─► Subcommand: dev-hq                        │
│           │         │         │       │                                                    │
│           │         │         │       └─► Bun Native Flags (handled by Bun runtime)        │
│           │         │         │            --hot, --inspect, --smol                        │
│           │         │         │                                                         │
│           │         │         └─► Parsed & Applied by Bun Runtime                          │
│           │         │              - Sets development mode                                 │
│           │         │              - Enables inspector on port 9229                        │
│           │         │              - Configures smaller heap size                          │
│           │         │                                                               │
│           │         └─► process.argv.slice(2)                                             │
│           │              ["--hot", "--inspect", "--smol", "dev-hq", "insights", "--table"] │
│           │                                                                                 │
│           └─► Bun executable                                                               │
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Bun Runtime handles --hot, --inspect, --smol internally                             │   │
│  │ process.argv contains: [bun, script.ts, ...args]                                    │   │
│  │ dev-hq CLI receives: process.argv.slice(2) = ["--hot", "--inspect", "--smol",       │   │
│  │                                                "dev-hq", "insights", "--table",      │   │
│  │                                                "--json"]                             │   │
│  │                                                                                       │   │
│  │ Commander.js parses:                                                                 │   │
│  │   program.parse(["dev-hq", "insights", "--table", "--json"])                         │   │
│  │                                                                                       │   │
│  │ Result:                                                                              │   │
│  │   Bun Runtime: development=true, inspector=true, heap=smol                           │   │
│  │   dev-hq Command: insights with table=true, json=true                                │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Step-by-Step Flow

### Step 1: Command Input
```bash
$ bun --hot --inspect --smol dev-hq insights --table --json
```

### Step 2: Bun Executable Parsing
The Bun executable receives the full command line:

```
Arguments:
  [0] "bun"              # Executable name
  [1] "--hot"            # Bun runtime flag
  [2] "--inspect"        # Bun runtime flag
  [3] "--smol"           # Bun runtime flag
  [4] "dev-hq"           # Script name / command
  [5] "insights"         # Subcommand
  [6] "--table"          # CLI flag
  [7] "--json"           # CLI flag
```

### Step 3: Bun Runtime Processing

Bun runtime identifies and processes its flags:

```typescript
// Internal Bun processing (happens before script execution)
Bun Runtime:
  --hot    → Sets development mode, enables hot reloading
  --inspect → Enables inspector protocol on port 9229
  --smol   → Configures smaller heap size, more frequent GC
```

**Important**: Bun flags are consumed by Bun runtime and applied to the runtime environment.

### Step 4: Script Arguments

After Bun processes its flags, `process.argv` contains:

```typescript
process.argv = [
  "/path/to/bun",                    // Executable path
  "/path/to/dev-hq-cli.ts",          // Script path
  "--hot",                            // ⚠️ Still in argv!
  "--inspect",                        // ⚠️ Still in argv!
  "--smol",                           // ⚠️ Still in argv!
  "dev-hq",                           // Command
  "insights",                         // Subcommand
  "--table",                          // CLI flag
  "--json"                            // CLI flag
]

// Application receives:
process.argv.slice(2) = [
  "--hot",
  "--inspect",
  "--smol",
  "dev-hq",
  "insights",
  "--table",
  "--json"
]
```

**Note**: Bun flags may still appear in `process.argv` even though they've been processed. The application should filter them out.

### Step 5: CLI Flag Parsing

The dev-hq CLI receives `process.argv.slice(2)` and needs to separate:

1. **Bun flags** (already processed, but still in argv)
2. **Command** (e.g., "dev-hq", "insights")
3. **CLI flags** (e.g., "--table", "--json")

```typescript
function parseArguments(argv: string[]) {
  const knownBunFlags = [
    "--hot",
    "--inspect",
    "--smol",
    "--watch",
    "--define",
    // ... more Bun flags
  ];

  const bunFlags: string[] = [];
  const cliFlags: string[] = [];
  let command: string | null = null;
  let subcommand: string | null = null;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    // Check if it's a known Bun flag
    if (knownBunFlags.includes(arg) || arg.startsWith("--inspect")) {
      bunFlags.push(arg);

      // Handle flags with values
      if (arg === "--inspect" || arg.startsWith("--inspect=")) {
        // --inspect or --inspect=9229
        if (arg.includes("=")) {
          // Already has value
        } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
          // Next arg is the value
          bunFlags.push(argv[++i]);
        }
      }
    } else if (arg.startsWith("--") && !command) {
      // CLI flag before command
      cliFlags.push(arg);

      // Handle CLI flags with values
      if (arg === "--timeout" || arg === "--output") {
        if (i + 1 < argv.length) {
          cliFlags.push(argv[++i]);
        }
      }
    } else if (!command) {
      // First non-flag is the command
      command = arg;
    } else if (!subcommand && !arg.startsWith("--")) {
      // Second non-flag is the subcommand
      subcommand = arg;
    } else {
      // CLI flag or argument after command
      cliFlags.push(arg);
    }

    i++;
  }

  return { bunFlags, command, subcommand, cliFlags };
}
```

### Step 6: Commander.js Parsing

Commander.js receives the filtered arguments:

```typescript
// After filtering Bun flags
const { command, subcommand, cliFlags } = parseArguments(process.argv.slice(2));

// Commander.js parses only CLI flags
program
  .command("insights")
  .option("--table", "Table format")
  .option("--json", "JSON format")
  .action((options) => {
    // options.table = true
    // options.json = true
  });

// Parse only the CLI-relevant portion
program.parse([command, subcommand, ...cliFlags]);
// Which is: ["dev-hq", "insights", "--table", "--json"]
```

### Step 7: Final Result

```typescript
// Bun Runtime State (already applied)
{
  development: true,      // from --hot
  inspector: {
    enabled: true,
    port: 9229            // from --inspect
  },
  memory: {
    heapSize: "smol"      // from --smol
  }
}

// CLI Command State (from Commander.js)
{
  command: "insights",
  options: {
    table: true,          // from --table
    json: true            // from --json
  }
}
```

## 🎯 Key Insights

### 1. Bun Flags Are Consumed Early
Bun flags are processed by Bun runtime **before** your script executes, but they may still appear in `process.argv`. Your application should filter them out.

### 2. process.argv Contains Everything
`process.argv` includes all arguments, including Bun flags that have already been processed:

```typescript
// Even though --hot is processed, it's still in argv
process.argv = ["bun", "script.ts", "--hot", "--watch", "command", "--flag"]
```

### 3. Filtering Required
Your CLI must filter out Bun flags to avoid conflicts:

```typescript
const bunFlags = ["--hot", "--watch", "--smol", "--inspect", ...];
const filtered = process.argv.slice(2).filter(arg => !bunFlags.includes(arg));
// Now Commander.js can parse correctly
```

### 4. Two-Phase Parsing
- **Phase 1**: Bun runtime processes Bun flags (happens automatically)
- **Phase 2**: Your CLI processes CLI flags (requires filtering)

## 📝 Implementation Example

```typescript
#!/usr/bin/env bun

import { Command } from "commander";

// Known Bun flags (may still appear in process.argv)
const BUN_FLAGS = [
  "--hot",
  "--watch",
  "--smol",
  "--inspect",
  "--inspect-brk",
  "--define",
  "--drop",
  "--loader",
  "--filter",
  "--conditions",
  "--no-clear-screen",
  "--cwd",
  "--env-file",
  "--config",
];

function filterBunFlags(argv: string[]): string[] {
  const filtered: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    // Check if it's a Bun flag
    const isBunFlag = BUN_FLAGS.some(flag =>
      arg === flag ||
      arg.startsWith(`${flag}=`) ||
      arg.startsWith(`${flag}:`)
    );

    if (isBunFlag) {
      // Skip the flag and its value if present
      if (!arg.includes("=") && i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        // Check if next arg is a value (not another flag)
        i++; // Skip the value
      }
    } else {
      filtered.push(arg);
    }

    i++;
  }

  return filtered;
}

// Filter Bun flags from process.argv
const filteredArgs = filterBunFlags(process.argv.slice(2));

// Now parse with Commander.js
const program = new Command();

program
  .name("dev-hq")
  .command("insights")
  .option("--table", "Table format")
  .option("--json", "JSON format")
  .action((options) => {
    console.log("Command: insights");
    console.log("Options:", options);
  });

// Parse only filtered arguments
program.parse(filteredArgs);
```

## 🔍 Testing the Flow

### Test Case: Full Command
```bash
$ bun --hot --inspect --smol dev-hq-cli.ts insights --table --json
```

**Expected Behavior:**
1. Bun runtime:
   - Enables hot reloading (`--hot`)
   - Starts inspector on port 9229 (`--inspect`)
   - Uses smaller heap (`--smol`)

2. CLI application:
   - Receives: `["--hot", "--inspect", "--smol", "dev-hq", "insights", "--table", "--json"]`
   - Filters out: `["--hot", "--inspect", "--smol"]`
   - Parses: `["dev-hq", "insights", "--table", "--json"]`
   - Executes: `insights` command with `{ table: true, json: true }`

## 🚨 Common Pitfalls

### 1. Not Filtering Bun Flags
```typescript
// ❌ Wrong: Commander.js tries to parse Bun flags
program.parse(process.argv.slice(2));
// Error: unknown option '--hot'
```

### 2. Filtering Too Aggressively
```typescript
// ❌ Wrong: Removes --table if it matches a Bun flag pattern
const filtered = argv.filter(arg => !arg.includes("--table"));
```

### 3. Assuming Bun Flags Are Removed
```typescript
// ❌ Wrong: Bun flags may still be in process.argv
// They're processed but not always removed
```

## ✅ Best Practices

1. **Always Filter Bun Flags**: Even though they're processed, they may still be in `process.argv`
2. **Use a Known List**: Maintain a list of known Bun flags for accurate filtering
3. **Handle Flag Values**: Some Bun flags take values (`--inspect=9229`, `--define KEY=VALUE`)
4. **Test Both Phases**: Test with Bun flags to ensure proper filtering
5. **Document Flag Separation**: Make it clear which flags are handled by which system

## 🔗 Related Documentation

- [Flag Separation Pattern](./flag-separation-pattern.md)
- [Flags Reference](../api/flags-reference.md)
- [Testing Alignment](../guides/testing/TESTING_ALIGNMENT.md)
- [Bun Runtime Features](../runtime/BUN_RUNTIME_FEATURES.md)

