# Dev HQ Examples

This directory contains practical examples demonstrating Bun's capabilities and Dev HQ features.

## 📁 Directory Structure

```text
examples/
├── README.md                    # This file
├── bun-runtime/                 # Bun runtime API examples
│   ├── BunRuntimeFeatures.ts  # Main Bun features demo
│   ├── env-vars.ts             # Environment variables
│   ├── stdin-reading.ts        # Stdin I/O examples
│   └── timezone.ts             # Timezone configuration
├── feature-flags/              # Feature flag examples (from src/examples/)
│   ├── architectural-patterns.ts
│   ├── debugging-tools.ts
│   ├── feature-flag-pro-tips.ts
│   ├── feature-gated-imports.ts
│   ├── fetch-proxy-example.ts
│   ├── http-agent-example.ts
│   ├── platform-specific-elimination.ts
│   ├── pure-annotations-demo.ts
│   ├── runtime-vs-compile-time.ts
│   └── testing-strategies.ts
├── processes/                  # Process spawning examples
│   ├── basic-spawn.ts
│   ├── process-config.ts
│   ├── stdout-stderr.ts
│   └── ... (8 more files)
├── system/                     # System integration examples
│   ├── file-operations.ts
│   ├── environment-vars.ts
│   └── working-directory.ts
├── shell/                      # Shell command execution
│   └── index.ts
└── cli-args/                   # CLI argument parsing
    └── index.ts
```

## 🚀 Bun Runtime Examples (`bun-runtime/`)

Examples demonstrating Bun's core runtime features:

### `BunRuntimeFeatures.ts`
Comprehensive demo of Bun runtime capabilities:
- Global Configuration & Context (`Bun.main`, `Bun.env`, `Bun.file`)
- Networking & Security (`Bun.serve`, security headers, TLS)
- Decorators for HTTP endpoints
- Config loading with `Bun.file()`

**Run:**
```bash
bun run examples/bun-runtime/BunRuntimeFeatures.ts
```

### `env-vars.ts`
Environment variable management:
- Accessing variables with `Bun.env` and `process.env`
- Automatic `.env` file loading
- Environment-based configuration patterns

### `stdin-reading.ts`
Reading from stdin:
- `console` as AsyncIterable for line-by-line input
- `Bun.stdin.stream()` for chunked data reading
- Handling piped vs interactive stdin

### `timezone.ts`
Timezone configuration:
- Setting timezone programmatically with `process.env.TZ`
- Demonstrating timezone effects on Date instances
- Command-line timezone specification

## 🎯 Feature Flag Examples (`feature-flags/`)

Advanced examples demonstrating Dev HQ's feature flag system:

### `feature-flag-pro-tips.ts`
Best practices and patterns for using feature flags:
- Compile-time dead code elimination
- Runtime feature gating
- Feature dependencies and conflicts

### `architectural-patterns.ts`
Architectural patterns using feature flags:
- Service factory patterns
- Dependency injection with features
- Plugin systems

### `platform-specific-elimination.ts`
Platform-specific code elimination:
- Android/iOS specific features
- Web/Desktop platform targeting
- Conditional compilation

### `runtime-vs-compile-time.ts`
Understanding compile-time vs runtime features:
- When to use each approach
- Performance implications
- Bundle size optimization

### `pure-annotations-demo.ts`
Using `/*@__PURE__*/` annotations:
- Marking pure functions
- Enabling better tree-shaking
- Optimization techniques

### `feature-gated-imports.ts`
Conditional imports based on features:
- Dynamic imports
- Feature-based module loading
- Lazy loading patterns

### `testing-strategies.ts`
Testing strategies for feature flags:
- Unit testing with features
- Integration testing
- Feature flag mocking

### `debugging-tools.ts`
Debugging feature flags:
- Feature flag inspection
- Bundle analysis
- Dead code detection

### `fetch-proxy-example.ts` & `http-agent-example.ts`
Network examples with feature flags:
- HTTP client configuration
- Proxy setup
- Agent configuration

## 🔧 Process Examples (`processes/`)

Child process management using `Bun.spawn()`:

- **`basic-spawn.ts`** - Fundamental process spawning operations
- **`process-config.ts`** - Configuration options (environment, working directory, exit handlers)
- **`stdout-stderr.ts`** - Working with process output streams as `ReadableStream`
- **`process-lifecycle-demo.ts`** - Process lifecycle management
- **`nanoseconds-timing-demo.ts`** - High-precision timing
- **`signal-comparison-demo.ts`** - Signal handling
- **`sigint-demo.ts`** - SIGINT handling
- **`edge-cases-demo.ts`** - Edge cases and error handling

## 🖥️ System Examples (`system/`)

System integration and file operations:

- **`file-operations.ts`** - File reading/writing with `Bun.write()` and `Bun.read()`
- **`working-directory.ts`** - Directory management and path resolution
- **`environment-vars.ts`** - System environment variable access

## 🐚 Shell Examples (`shell/`)

Shell command execution using the `$` tagged template function:

- **`index.ts`** - Basic command execution with `$` template literals
- Capturing output as text
- Processing line-by-line
- Async/await integration

## 📝 CLI Examples (`cli-args/`)

Command-line argument parsing:

- Basic `Bun.argv` access and manual parsing
- Structured argument parsing with `util.parseArgs`
- Building complete CLI tools with help and version flags

## 🏃 Running Examples

All examples are executable TypeScript files:

```bash
# Bun runtime examples
bun run examples/bun-runtime/BunRuntimeFeatures.ts
bun run examples/bun-runtime/env-vars.ts
bun run examples/bun-runtime/stdin-reading.ts
bun run examples/bun-runtime/timezone.ts

# Feature flag examples
bun run examples/feature-flags/feature-flag-pro-tips.ts
bun run examples/feature-flags/architectural-patterns.ts

# Process examples
bun run examples/processes/basic-spawn.ts
bun run examples/processes/process-config.ts

# System examples
bun run examples/system/file-operations.ts
bun run examples/system/working-directory.ts

# Shell examples
bun run examples/shell/index.ts

# CLI examples
bun run examples/cli-args/index.ts
```

## 📚 Key Features Demonstrated

### Bun Runtime Features
```ts
// Global context
console.log(Bun.main);        // Entry point file
console.log(Bun.env.API_KEY); // Environment variables

// File operations
const file = Bun.file("config.json");
const content = await file.json();

// HTTP server
Bun.serve({
  fetch(req) { return new Response("Hello"); },
  port: 3000
});
```

### Feature Flags
```ts
import { feature } from "bun:bundle";

// Compile-time feature check
if (feature("FEAT_PREMIUM")) {
  // This code is eliminated if FEAT_PREMIUM is false
  enablePremiumFeatures();
}
```

### Process Spawning
```ts
// Basic spawning
const proc = Bun.spawn(["echo", "hello"]);
await proc.exited;

// With configuration
const proc = Bun.spawn(["command"], {
  cwd: "/tmp",
  env: { CUSTOM_VAR: "value" },
  onExit(proc, exitCode, signalCode, error) {
    // exit handler
  },
});

// Reading output
const output = await proc.stdout.text(); // "hello\n"
```

### Shell Commands
```ts
// Basic command execution
await $`echo Hello, world!`; // => "Hello, world!"

// Capturing output
const output = await $`ls -l`.text();

// Processing line-by-line
for await (const line of $`ls -l`.lines()) {
  console.log(line);
}
```

## 🔗 Related Documentation

- [Bun Runtime Documentation](https://bun.sh/docs/runtime)
- [Bun.spawn() - Child Processes](https://bun.sh/docs/runtime/child-process)
- [Dev HQ Feature Flags Guide](../docs/guides/FEATURE_FLAGS_PRO_TIPS.md)
- [Dev HQ Architecture](../docs/architecture/ARCHITECTURE.md)

## 📝 Contributing

When adding new examples:
1. Place them in the appropriate subdirectory
2. Add a description to this README
3. Include runnable code with clear comments
4. Update the directory structure above
