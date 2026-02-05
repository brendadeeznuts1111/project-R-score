# T3-Lattice v3.3 Quick Reference

## Command Generation

### Basic CLI
```typescript
import { createCLIExecutable } from './t3-lattice-v3.3-executable';

const exe = createCLIExecutable('mycli', './src/cli.ts', {
  buildConstants: { BUILD_VERSION: '1.2.3' }
});

const { cliCommands } = exe.generateBuildConfig();
// Result: bun build ./src/cli.ts --compile --define BUILD_VERSION='"1.2.3"' --outfile ./dist/mycli
```

### Cross-Compilation
```typescript
const exe = createCLIExecutable('mycli', './src/cli.ts', {
  crossCompilation: {
    targets: [
      { target: 'bun-linux-x64', os: 'Linux', arch: 'x64', libc: 'glibc', component: 16 },
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 },
      { target: 'bun-windows-x64', os: 'Windows', arch: 'x64', component: 16 }
    ]
  }
});

// Generates 3 separate build commands, one per target
```

### Full-Stack App
```typescript
import { createFullStackExecutable } from './t3-lattice-v3.3-executable';

const exe = createFullStackExecutable('myapp', './src/index.ts', {
  workers: { entrypoints: ['./src/worker.ts'] },
  platform: {
    windows: { icon: './assets/icon.ico', hideConsole: true },
    macos: { entitlements: './entitlements.plist' }
  }
});
```

### Plugin-Based Tool
```typescript
import { createPluginExecutable } from './t3-lattice-v3.3-executable';

const envPlugin = {
  name: 'env-loader',
  setup(build) {
    build.onLoad({ filter: /\.env\.json$/ }, async args => {
      const env = await Bun.file(args.path).json();
      return { contents: `export default ${JSON.stringify(env)};`, loader: 'js' };
    });
  }
};

const exe = createPluginExecutable('tool', './src/cli.ts', [envPlugin], {
  minification: { enableAll: true, bytecode: true }
});
```

## Component Mapping

| Feature | Component | Hex | Slot |
|---------|-----------|-----|------|
| Cross-compilation | Compile | #7F8C8D | /slots/compile |
| Build constants | Compile | #7F8C8D | /slots/compile |
| Minification | Compile | #7F8C8D | /slots/compile |
| Runtime execArgv | Env Exp | #FFEAA7 | /slots/env |
| Full-stack HTML | Dashboard | #4ECDC4 | /slots/dashboard |
| Worker support | V8 APIs | #7F8C8D | /slots/native |
| SQLite embed | SQLite | #98D8C8 | /slots/sqlite |
| File embedding | Proxy | #7F8C8D | /slots/proxy |
| BUN_BE_BUN | Versioning | #E91E63 | /slots/version |

## Target Matrix

| Target | OS | Arch | Libc | Modern | Baseline |
|--------|----|------|------|--------|----------|
| bun-linux-x64 | Linux | x64 | glibc | ✅ | ✅ |
| bun-linux-arm64 | Linux | arm64 | glibc | ✅ | N/A |
| bun-linux-x64-musl | Linux | x64 | musl | ✅ | ✅ |
| bun-linux-arm64-musl | Linux | arm64 | musl | ✅ | N/A |
| bun-windows-x64 | Windows | x64 | — | ✅ | ✅ |
| bun-windows-x64-baseline | Windows | x64 | — | ❌ | ✅ |
| bun-windows-x64-modern | Windows | x64 | — | ✅ | ❌ |
| bun-darwin-x64 | macOS | x64 | — | ✅ | ✅ |
| bun-darwin-arm64 | macOS | arm64 | — | ✅ | N/A |

## Build Constants

```typescript
// CLI
bun build ./src/cli.ts --compile \
  --define BUILD_VERSION='"1.2.3"' \
  --define BUILD_TIME='"2024-01-15T10:30:00Z"' \
  --define process.env.NODE_ENV='"production"'

// JavaScript
await Bun.build({
  entrypoints: ["./src/cli.ts"],
  compile: { outfile: "./mycli" },
  define: {
    BUILD_VERSION: JSON.stringify("1.2.3"),
    BUILD_TIME: JSON.stringify("2024-01-15T10:30:00Z"),
    'process.env.NODE_ENV': JSON.stringify("production")
  }
});
```

## Minification Options

| Flag | Description |
|------|-------------|
| `--minify` | Enable all minification |
| `--bytecode` | Bytecode compilation (2x faster startup) |
| `--sourcemap` | Generate source maps |
| `--minify-whitespace` | Remove whitespace |
| `--minify-syntax` | Compress syntax |
| `--minify-identifiers` | Shorten identifiers |

## Config Loading

| Config File | Default | CLI Flag |
|-------------|---------|----------|
| tsconfig.json | disabled | `--compile-autoload-tsconfig` |
| package.json | disabled | `--compile-autoload-package-json` |
| .env | enabled | `--no-compile-autoload-dotenv` |
| bunfig.toml | enabled | `--no-compile-autoload-bunfig` |

## Platform Options

### Windows
```bash
--windows-icon=./assets/icon.ico
--windows-hide-console
```

### macOS
```bash
codesign --deep --force -vvvv --sign "Developer ID Application" ./dist/myapp
--entitlements ./entitlements.plist
```

## Runtime Arguments

```typescript
// Build
await Bun.build({
  entrypoints: ["./app.ts"],
  compile: {
    execArgv: ["--smol", "--user-agent=MyBot"],
    outfile: "./myapp",
  },
});

// Runtime
console.log(process.execArgv); // ["--smol", "--user-agent=MyBot"]
```

## File Embedding

```typescript
import icon from "./icon.png" with { type: "file" };
import db from "./my.db" with { type: "sqlite", embed: "true" };
import { file, embeddedFiles } from "bun";

const bytes = await file(icon).arrayBuffer();

for (const blob of embeddedFiles) {
  console.log(`${blob.name} - ${blob.size} bytes`);
}
```

## Worker Support

```typescript
// Build
await Bun.build({
  entrypoints: ["./index.ts", "./my-worker.ts"],
  compile: { outfile: "./myapp" },
});

// Runtime
new Worker("./my-worker.ts");
```

## HTML/CSS Bundling

```typescript
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/": index,
    "/api/hello": { GET: () => Response.json({ message: "Hello from API" }) },
  },
});
```

## Code Splitting

```typescript
// Build
await Bun.build({
  entrypoints: ["./index.ts"],
  compile: { outfile: "./myapp" },
  splitting: true,
});

// Runtime
const module = await import("./lazy.ts");
```

## Plugin System

```typescript
const envPlugin: BunPlugin = {
  name: "env-loader",
  setup(build) {
    build.onLoad({ filter: /\.env\.json$/ }, async args => {
      const env = await Bun.file(args.path).json();
      return {
        contents: `export default ${JSON.stringify(env)};`,
        loader: "js",
      };
    });
  },
};

await Bun.build({
  entrypoints: ["./cli.ts"],
  compile: { outfile: "./mycli" },
  plugins: [envPlugin],
});
```

## Compliance Validation

```typescript
const executable = new T3LatticeExecutable(config);
const { validationErrors, complianceReport } = executable.generateBuildConfig();

if (validationErrors.length > 0) {
  console.error('Errors:', validationErrors);
} else {
  console.log('Compliance:', complianceReport);
}
```

## API Methods

### T3LatticeExecutable
- `generateBuildConfig()` → CLI commands, JS config, validation errors, compliance report
- `build()` → Execute build with warnings/errors
- `generateDocumentation()` → Full markdown documentation
- `generateSummary()` → Project summary
- `getComponent(id)` → Get component info
- `getComponentsByGroup(group)` → Get components by group

### LatticeRegistry
- `getInstance()` → Singleton instance
- `getComponent(id)` → Component by ID
- `getComponentByName(name)` → Component by name
- `getComponentsByGroup(group)` → Components in group
- `getComponentsByView(view)` → Components in view
- `validateComponent(id, version)` → Version compatibility check
- `generateComplianceReport()` → Full compliance report

## Factory Functions

| Function | Use Case | Default Features |
|----------|----------|------------------|
| `createCLIExecutable` | CLI tools | Cross-compilation, minification, constants |
| `createFullStackExecutable` | Web apps | HTML/CSS/JS bundling, workers, file embedding |
| `createPluginExecutable` | Plugin tools | Code splitting, plugins, minification |

## Version Requirements

- **Bun**: >= 1.3.0
- **TypeScript**: Any (for type checking)
- **Registry**: @scoped/lattice-registry v3.3.0

## Quick Commands

```bash
# Generate CLI executable
bun run generate-cli.ts

# Build for all platforms
bun run build-all.ts

# Validate configuration
bun run validate.ts

# Generate documentation
bun run docs.ts
```

## Error Handling

```typescript
const result = await executable.build();

if (!result.success) {
  console.error('Build failed:', result.errors);
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('Build warnings:', result.warnings);
}

console.log('Build successful:', result.output);
```

## Summary

T3-Lattice v3.3 provides a complete, type-safe system for creating cross-platform Bun executables with:
- ✅ 9 cross-compilation targets
- ✅ Build-time constants
- ✅ Minification & bytecode optimization
- ✅ Full-stack features (HTML/CSS/JS)
- ✅ Worker support
- ✅ File embedding (generic, SQLite, N-API)
- ✅ Runtime arguments
- ✅ Platform-specific options (Windows/macOS)
- ✅ Code splitting
- ✅ Plugin system
- ✅ Compliance validation

All integrated with the @scoped/lattice-registry component system.
