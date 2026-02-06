# T3-Lattice v3.3: Single-File Executable Mapping System

[![Bun](https://img.shields.io/badge/Bun-1.3.0+-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A comprehensive TypeScript implementation for cross-compiling Bun applications with full component registry integration, build-time constants, and platform-specific options.

> **🚀 Production-Ready System**: T3-Lattice v3.3 enables you to create single-file executables across 9 platforms with zero-collateral guarantees and full type safety.

## Overview

T3-Lattice v3.3 provides a complete system for creating single-file executables across multiple platforms using Bun's compilation features. It integrates with the `@scoped/lattice-registry` component system and provides type-safe configuration for all build options.

### Key Features

- ✅ **Cross-Platform Compilation**: Build for Linux, macOS, and Windows from any platform
- ✅ **Type-Safe Configuration**: Full TypeScript support with comprehensive validation
- ✅ **Component Registry Integration**: 24-component system for feature management
- ✅ **Build-Time Constants**: Inject values at compile time for optimization
- ✅ **Advanced Optimization**: Minification, bytecode compilation, code splitting
- ✅ **Full-Stack Support**: HTML/CSS/JS bundling, workers, file embedding
- ✅ **Platform-Specific Options**: Icons, code signing, console hiding
- ✅ **Plugin System**: Extensible build pipeline with lifecycle hooks

### When to Use T3-Lattice v3.3

- **CLI Tools**: Create portable command-line utilities
- **Desktop Apps**: Build cross-platform GUI applications
- **Microservices**: Deploy single-file server applications
- **Developer Tools**: Package development utilities
- **Embedded Systems**: Deploy to resource-constrained environments

## Quick Start

### Installation

```bash
# Method 1: Copy the executable file
cp t3-lattice-v3.3-executable.ts /your/project/src/

# Method 2: Use in existing Bun project
# Ensure you have Bun >= 1.3.0
bun --version  # Should be 1.3.0 or higher
```

### Prerequisites

```bash
# Verify Bun installation
bun --version  # >= 1.3.0 required

# Verify TypeScript (optional but recommended)
tsc --version

# Check available targets
bun build --help | grep target
```

### Your First Executable

```typescript
// 1. Import the factory function
import { createCLIExecutable } from './t3-lattice-v3.3-executable';

// 2. Create your executable configuration
const executable = createCLIExecutable('mycli', './src/cli.ts', {
  buildConstants: {
    BUILD_VERSION: '1.2.3',
    BUILD_TIME: new Date().toISOString(),
    'process.env.NODE_ENV': 'production'
  },
  minification: {
    enableAll: true,
    bytecode: true
  }
});

// 3. Generate build configuration
const { cliCommands, javascriptConfig, validationErrors } = executable.generateBuildConfig();

// 4. Check for configuration errors
if (validationErrors.length > 0) {
  console.error('Configuration errors:', validationErrors);
  process.exit(1);
}

// 5. Build the executable
const result = await executable.build();

if (result.success) {
  console.log('✅ Build successful!');
  console.log('Output:', result.output);
  if (result.warnings?.length) {
    console.log('Warnings:', result.warnings);
  }
} else {
  console.error('❌ Build failed:', result.errors);
  process.exit(1);
}
```

### Expected Output

```bash
# CLI Commands generated:
bun build ./src/cli.ts --compile \
  --define BUILD_VERSION='"1.2.3"' \
  --define BUILD_TIME='"2024-01-15T10:30:00Z"' \
  --define process.env.NODE_ENV='"production"' \
  --minify --bytecode \
  --outfile ./dist/mycli

# Build result:
✅ Build successful!
Output: ./dist/mycli
```

## Core Concepts

### Component Registry

The system uses a 24-component registry where each component represents a specific feature or capability. This enables fine-grained control over which features are enabled and ensures compatibility.

#### Active Components

| ID | Name | Color | Hex | Slot | Purpose |
|----|------|-------|-----|------|---------|
| 1 | TOML Config | teal | #4ECDC4 | /slots/config | TOML file parsing |
| 6 | SQLite | mint | #98D8C8 | /slots/sqlite | SQLite database embedding |
| 16 | Compile | gray | #7F8C8D | /slots/compile | Core compilation features |
| 22 | Env Exp | gold | #FFEAA7 | /slots/env | Environment variable export |
| 24 | Versioning | pink | #E91E63 | /slots/version | Version management |

#### Component Integration

```typescript
import { LatticeRegistry } from './t3-lattice-v3.3-executable';

const registry = LatticeRegistry.getInstance();

// Get specific component
const compileComponent = registry.getComponent(16);

// Get all components in a group
const configComponents = registry.getComponentsByGroup('config');

// Validate component compatibility
const isValid = registry.validateComponent(16, '3.3.0');
```

### Cross-Compilation Targets

T3-Lattice v3.3 supports 9 cross-compilation targets across 3 operating systems:

#### Linux Targets
| Target | Architecture | Libc | Use Case |
|--------|--------------|------|----------|
| `bun-linux-x64` | x86_64 | glibc | Modern servers |
| `bun-linux-x64` | x86_64 | glibc (baseline) | Older systems |
| `bun-linux-arm64` | ARM64 | glibc | ARM servers |
| `bun-linux-x64-musl` | x86_64 | musl | Alpine Linux |
| `bun-linux-x64-musl` | x86_64 | musl (baseline) | Alpine legacy |
| `bun-linux-arm64-musl` | ARM64 | musl | Alpine ARM |

#### Windows Targets
| Target | Architecture | Variant | Use Case |
|--------|--------------|---------|----------|
| `bun-windows-x64` | x86_64 | modern | Windows 10+ |
| `bun-windows-x64` | x86_64 | baseline | Windows 7+ |
| `bun-windows-x64-baseline` | x86_64 | baseline | Legacy support |

#### macOS Targets
| Target | Architecture | Use Case |
|--------|--------------|----------|
| `bun-darwin-x64` | x86_64 | Intel Macs |
| `bun-darwin-arm64` | ARM64 | Apple Silicon |

#### Target Selection Example

```typescript
const executable = new T3LatticeExecutable({
  name: 'myapp',
  entrypoint: './src/index.ts',
  crossCompilation: {
    targets: [
      // Development targets
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 },
      // Production targets
      { target: 'bun-linux-x64', os: 'Linux', arch: 'x64', libc: 'glibc', component: 16 },
      { target: 'bun-windows-x64', os: 'Windows', arch: 'x64', component: 16 }
    ],
    outputDir: './dist/releases',
    naming: {
      pattern: '{name}-{os}-{arch}-{version}',
      version: '1.0.0'
    }
  }
});
```

## Configuration Options

### 1. Cross-Compilation

```typescript
const executable = new T3LatticeExecutable({
  name: 'myapp',
  version: '1.0.0',
  entrypoint: './src/index.ts',
  crossCompilation: {
    targets: [
      { target: 'bun-linux-x64', os: 'Linux', arch: 'x64', libc: 'glibc', component: 16 },
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 },
      { target: 'bun-windows-x64', os: 'Windows', arch: 'x64', component: 16 }
    ],
    outputDir: './dist',
    naming: {
      pattern: 'myapp-{target}-{version}',
      version: '1.0.0'
    }
  }
});
```

### 2. Build-Time Constants

```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  buildConstants: {
    BUILD_VERSION: '1.2.3',
    BUILD_TIME: '2024-01-15T10:30:00Z',
    'process.env.NODE_ENV': 'production'
  }
});
```

**CLI Output:**
```bash
bun build ./src/cli.ts --compile \
  --define BUILD_VERSION='"1.2.3"' \
  --define BUILD_TIME='"2024-01-15T10:30:00Z"' \
  --define process.env.NODE_ENV='"production"' \
  --outfile ./dist/mycli
```

**JavaScript Output:**
```typescript
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

### 3. Minification & Optimization

```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  minification: {
    enableAll: true,      // --minify
    bytecode: true,       // --bytecode (2x faster startup)
    sourcemap: false,     // --sourcemap
    options: {
      whitespace: true,   // --minify-whitespace
      syntax: true,       // --minify-syntax
      identifiers: true   // --minify-identifiers
    }
  }
});
```

### 4. Config File Loading

```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  configLoading: {
    tsconfig: false,      // --compile-autoload-tsconfig
    packageJson: false,   // --compile-autoload-package-json
    dotenv: true,         // --no-compile-autoload-dotenv (default: enabled)
    bunfig: true          // --no-compile-autoload-bunfig (default: enabled)
  }
});
```

### 5. Full-Stack Features & MIME Management

T3-Lattice v3.3 includes a robust MIME type management system for its full-stack features, ensuring correct content-type headers for all bundled assets.

#### Configuration
```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  fullStack: {
    htmlBundling: true,
    cssBundling: true,
    jsBundling: true,
    staticAssetServing: true,
    mimeTypeManagement: {
      autoUpdate: true, // Uses generate-mime.ts to fetch latest db
      customMappings: {
        ".lattice": "application/x-t3-lattice"
      }
    }
  },
>>>>>>> SEARCH
**HTML Bundling Example:**
```typescript
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/": index,
    "/api/hello": { GET: () => Response.json({ message: "Hello from API" }) },
  },
});
```text
**HTML Bundling Example:**
```typescript
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/": index,
    "/api/hello": { GET: () => Response.json({ message: "Hello from API" }) },
  },
});
```text

#### MIME Type Generation
To update the internal MIME database, run the generation script:
```bash
bun run src/scripts/generate-mime.ts
```text
This script fetches the latest `mime-db`, adds TypeScript/Bun-specific extensions, and generates a optimized JSON mapping for the bundler.
  workers: {
    support: true,
    entrypoints: ['./src/worker.ts']
  },
  fileEmbedding: {
    genericFiles: true,
    sqlite: true,
    napiAddons: true
  }
});
```

**HTML Bundling Example:**
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

**File Embedding Example:**
```typescript
import icon from "./icon.png" with { type: "file" };
import db from "./my.db" with { type: "sqlite", embed: "true" };
import { file, embeddedFiles } from "bun";

const bytes = await file(icon).arrayBuffer();

for (const blob of embeddedFiles) {
  console.log(`${blob.name} - ${blob.size} bytes`);
}
```

### 6. Runtime Arguments

```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  runtimeArgv: {
    execArgv: ['--smol', '--user-agent=MyBot']
  },
  bunBeBun: {
    enabled: true,
    envVar: 'BUN_BE_BUN=1'
  }
});
```

**Build:**
```typescript
await Bun.build({
  entrypoints: ["./app.ts"],
  compile: {
    execArgv: ["--smol", "--user-agent=MyBot"],
    outfile: "./myapp",
  },
});
```

**Runtime:**
```typescript
console.log(process.execArgv); // ["--smol", "--user-agent=MyBot"]
```

### 7. Platform-Specific Options

#### Windows
```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  platform: {
    windows: {
      icon: './assets/icon.ico',
      hideConsole: true,
      title: 'MyApp',
      publisher: 'MyCompany',
      version: '1.0.0'
    }
  }
});
```

**CLI:**
```bash
bun build ./src/app.ts --compile \
  --windows-icon=./assets/icon.ico \
  --windows-hide-console \
  --outfile ./dist/myapp
```

#### macOS
```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  platform: {
    macos: {
      codeSigning: {
        identity: 'Developer ID Application',
        deep: true,
        force: true,
        verbose: true
      },
      entitlements: './entitlements.plist'
    }
  }
});
```

**CLI:**
```bash
codesign --deep --force -vvvv --sign "Developer ID Application" ./dist/myapp
--entitlements ./entitlements.plist
```

### 8. Code Splitting, Plugins & Unicode Validation

T3-Lattice v3.3 provides advanced code analysis features, including ECMAScript-compliant Unicode identifier validation.

#### Configuration
```typescript
const executable = new T3LatticeExecutable({
  // ... other config
  codeSplitting: {
    enabled: true,
    dynamicImports: true,
    lazyLoading: true
  },
  codeAnalysis: {
    unicodeValidation: {
      enabled: true,
      version: "ESNext", // or "ES5"
      generateTables: true // Uses generate-unicode.ts
    }
  },
>>>>>>> SEARCH
**Plugin Example:**
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
```text
**Plugin Example:**
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
```text

#### Unicode Table Generation
To update the optimized Unicode lookup tables (Zig-compatible), run:
```bash
bun run src/scripts/generate-unicode.ts
```text
This script uses a two-stage lookup strategy for O(1) property checks, essential for high-performance lexing and transpilation.
  plugins: {
    plugins: [/* BunPlugin instances */],
    transformPlugins: []
  }
});
```

**Code Splitting Example:**
```typescript
// Build
await Bun.build({
  entrypoints: ["./index.ts"],
  compile: { outfile: "./myapp" },
  splitting: true,
});

// Runtime lazy loading
const module = await import("./lazy.ts");
```

**Plugin Example:**
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

## Factory Functions

### createCLIExecutable

Create a CLI tool with sensible defaults for cross-compilation and optimization.

```typescript
export function createCLIExecutable(
  name: string,
  entrypoint: string,
  options: Partial<Lattice.LatticeExecutableConfig> = {}
): T3LatticeExecutable
```

**Example:**
```typescript
const executable = createCLIExecutable('mycli', './src/cli.ts', {
  buildConstants: {
    BUILD_VERSION: '1.2.3',
    BUILD_TIME: '2024-01-15T10:30:00Z',
    'process.env.NODE_ENV': 'production'
  }
});
```

### createFullStackExecutable

Create a full-stack application with HTML/CSS/JS bundling, workers, and file embedding.

```typescript
export function createFullStackExecutable(
  name: string,
  entrypoint: string,
  options: Partial<Lattice.LatticeExecutableConfig> = {}
): T3LatticeExecutable
```

**Example:**
```typescript
const executable = createFullStackExecutable('myapp', './src/index.ts', {
  workers: {
    entrypoints: ['./src/worker.ts']
  },
  platform: {
    windows: {
      icon: './assets/icon.ico',
      hideConsole: true
    },
    macos: {
      entitlements: './entitlements.plist'
    }
  }
});
```

### createPluginExecutable

Create a plugin-based application with code splitting.

```typescript
export function createPluginExecutable(
  name: string,
  entrypoint: string,
  plugins: any[],
  options: Partial<Lattice.LatticeExecutableConfig> = {}
): T3LatticeExecutable
```

**Example:**
```typescript
const envPlugin = {
  name: 'env-loader',
  setup(build) {
    build.onLoad({ filter: /\.env\.json$/ }, async args => {
      const env = await Bun.file(args.path).json();
      return {
        contents: `export default ${JSON.stringify(env)};`,
        loader: 'js'
      };
    });
  }
};

const executable = createPluginExecutable('tool', './src/cli.ts', [envPlugin], {
  minification: {
    enableAll: true,
    bytecode: true,
    sourcemap: true
  }
});
```

## API Reference

### T3LatticeExecutable Class

#### Constructor
```typescript
constructor(config: Lattice.LatticeExecutableConfig)
```

#### Methods

**generateBuildConfig()**
```typescript
generateBuildConfig(): {
  cliCommands: string[];
  javascriptConfig: string;
  validationErrors: string[];
  complianceReport: Lattice.ComplianceReport;
}
```

**build()**
```typescript
async build(): Promise<{
  success: boolean;
  output?: string;
  errors?: string[];
  warnings?: string[];
}>
```

**generateDocumentation()**
```typescript
generateDocumentation(): string
```

**generateSummary()**
```typescript
generateSummary(): string
```

**getComponent()**
```typescript
getComponent(id: Lattice.ComponentID): Lattice.Component
```

**getComponentsByGroup()**
```typescript
getComponentsByGroup(group: keyof Lattice.ComponentGroup): Lattice.Component[]
```

### LatticeRegistry

#### Static Methods
```typescript
LatticeRegistry.getInstance(): LatticeRegistry
```

#### Instance Methods
```typescript
getComponent(id: Lattice.ComponentID): Lattice.Component
getComponentByName(name: string): Lattice.Component | undefined
getComponentsByGroup(group: keyof Lattice.ComponentGroup): Lattice.Component[]
getComponentsByView(view: keyof Lattice.ComponentView): Lattice.Component[]
getComponentBySlot(slot: Lattice.SlotPath): Lattice.Component | undefined
getComponentByProtocol(protocol: Lattice.Protocol): Lattice.Component[]
validateComponent(id: Lattice.ComponentID, version?: string): boolean
generateComplianceReport(): Lattice.ComplianceReport
```

## Compliance & Validation

The system includes built-in validation for all configuration options:

```typescript
const executable = new T3LatticeExecutable(config);
const { validationErrors, complianceReport } = executable.generateBuildConfig();

if (validationErrors.length > 0) {
  console.error('Configuration errors:', validationErrors);
} else {
  console.log('Compliance report:', complianceReport);
}
```

### Validation Checks
- ✅ Cross-compilation targets
- ✅ Build-time constants
- ✅ Minification options
- ✅ Config file loading
- ✅ Platform-specific options

## Real-World Examples

### Example 1: Development CLI Tool

```typescript
import { createCLIExecutable } from './t3-lattice-v3.3-executable';

// Create a development tool with hot-reload capabilities
const executable = createCLIExecutable('devtool', './src/cli.ts', {
  buildConstants: {
    BUILD_VERSION: '0.1.0-dev',
    BUILD_TIME: new Date().toISOString(),
    'process.env.NODE_ENV': 'development',
    'process.env.DEBUG': 'true'
  },
  minification: {
    enableAll: false,  // Keep readable for debugging
    bytecode: false,
    sourcemap: true
  },
  crossCompilation: {
    targets: [
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 }
    ],
    outputDir: './bin'
  }
});

const result = await executable.build();
console.log(result.success ? '✅ Dev build complete' : '❌ Build failed');
```

### Example 2: Production Microservice

```typescript
import { createFullStackExecutable } from './t3-lattice-v3.3-executable';

// Create a production-ready API server
const executable = createFullStackExecutable('api-server', './src/server.ts', {
  buildConstants: {
    BUILD_VERSION: '1.0.0',
    BUILD_TIME: new Date().toISOString(),
    'process.env.NODE_ENV': 'production',
    'process.env.API_PORT': '3000'
  },
  minification: {
    enableAll: true,
    bytecode: true,
    sourcemap: false
  },
  workers: {
    support: true,
    entrypoints: ['./src/worker.ts']
  },
  fileEmbedding: {
    sqlite: true,
    genericFiles: true
  },
  crossCompilation: {
    targets: [
      { target: 'bun-linux-x64', os: 'Linux', arch: 'x64', libc: 'glibc', component: 16 },
      { target: 'bun-linux-x64-musl', os: 'Linux', arch: 'x64', libc: 'musl', component: 16 }
    ],
    outputDir: './dist/releases'
  }
});

const result = await executable.build();
if (result.success) {
  console.log('Production builds ready:', result.output);
}
```

### Example 3: Cross-Platform Desktop App

```typescript
import { createFullStackExecutable } from './t3-lattice-v3.3-executable';

// Create a desktop application
const executable = createFullStackExecutable('myapp', './src/main.ts', {
  buildConstants: {
    BUILD_VERSION: '2.1.5',
    BUILD_TIME: new Date().toISOString(),
    'process.env.NODE_ENV': 'production'
  },
  minification: {
    enableAll: true,
    bytecode: true
  },
  fullStack: {
    htmlBundling: true,
    cssBundling: true,
    jsBundling: true,
    staticAssetServing: true
  },
  platform: {
    windows: {
      icon: './assets/icon.ico',
      hideConsole: true,
      title: 'MyApp',
      publisher: 'MyCompany',
      version: '2.1.5'
    },
    macos: {
      codeSigning: {
        identity: 'Developer ID Application: MyCompany (TEAM123)',
        deep: true,
        force: true,
        verbose: true
      },
      entitlements: './entitlements.plist'
    }
  },
  crossCompilation: {
    targets: [
      { target: 'bun-windows-x64', os: 'Windows', arch: 'x64', component: 16 },
      { target: 'bun-darwin-x64', os: 'macOS', arch: 'x64', component: 16 },
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 }
    ],
    outputDir: './dist',
    naming: {
      pattern: '{name}-{os}-{arch}-v{version}',
      version: '2.1.5'
    }
  }
});

const result = await executable.build();
if (result.success) {
  console.log('Desktop apps ready for distribution!');
}
```

### Example 4: Plugin-Based Data Processor

```typescript
import { createPluginExecutable } from './t3-lattice-v3.3-executable';

// Custom YAML loader plugin
const yamlPlugin: BunPlugin = {
  name: 'yaml-loader',
  setup(build) {
    build.onLoad({ filter: /\.yaml$/ }, async args => {
      const yaml = await import('js-yaml');
      const content = await Bun.file(args.path).text();
      const data = yaml.load(content);
      return {
        contents: `export default ${JSON.stringify(data)};`,
        loader: 'js'
      };
    });
  }
};

// JSON schema validator plugin
const schemaPlugin: BunPlugin = {
  name: 'schema-validator',
  setup(build) {
    build.onResolve({ filter: /\.schema\.json$/ }, args => {
      return { path: args.path, namespace: 'schema' };
    });
    build.onLoad({ filter: /.*/, namespace: 'schema' }, async args => {
      const schema = await Bun.file(args.path).json();
      return {
        contents: `export default ${JSON.stringify(schema)};`,
        loader: 'js'
      };
    });
  }
};

const executable = createPluginExecutable(
  'data-processor',
  './src/processor.ts',
  [yamlPlugin, schemaPlugin],
  {
    buildConstants: {
      BUILD_VERSION: '1.0.0',
      'process.env.NODE_ENV': 'production'
    },
    minification: {
      enableAll: true,
      bytecode: true
    },
    codeSplitting: {
      enabled: true,
      dynamicImports: true,
      lazyLoading: true
    }
  }
);

const summary = executable.generateSummary();
console.log(summary);
```

### Example 5: Embedded System Deployment

```typescript
import { createCLIExecutable } from './t3-lattice-v3.3-executable';

// Create a lightweight embedded system tool
const executable = createCLIExecutable('sensor-daemon', './src/daemon.ts', {
  buildConstants: {
    BUILD_VERSION: '0.0.1',
    BUILD_TIME: new Date().toISOString(),
    'process.env.NODE_ENV': 'production',
    'process.env.EMBEDDED': 'true'
  },
  minification: {
    enableAll: true,
    bytecode: true,
    options: {
      whitespace: true,
      syntax: true,
      identifiers: true
    }
  },
  runtimeArgv: {
    execArgv: ['--smol']  // Reduced memory footprint
  },
  crossCompilation: {
    targets: [
      { target: 'bun-linux-arm64-musl', os: 'Linux', arch: 'arm64', libc: 'musl', component: 16 },
      { target: 'bun-linux-x64-musl', os: 'Linux', arch: 'x64', libc: 'musl', component: 16 }
    ],
    outputDir: './deploy'
  }
});

const result = await executable.build();
if (result.success) {
  console.log('Embedded builds ready for deployment');
}
```

## Feature-to-Component Mapping

| Feature | Component ID | Component Name | Hex | Slot |
|---------|--------------|----------------|-----|------|
| Cross-compilation | 16 | Compile | #7F8C8D | /slots/compile |
| Build-time constants | 16 | Compile | #7F8C8D | /slots/compile |
| Minification | 16 | Compile | #7F8C8D | /slots/compile |
| Bytecode compilation | 16 | Compile | #7F8C8D | /slots/compile |
| Runtime execArgv | 22 | Env Exp | #FFEAA7 | /slots/env |
| Config autoload | 16 | Compile | #7F8C8D | /slots/compile |
| Full-stack HTML | 11 | Dashboard | #4ECDC4 | /slots/dashboard |
| Worker support | 20 | V8 APIs | #7F8C8D | /slots/native |
| SQLite embed | 6 | SQLite | #98D8C8 | /slots/sqlite |
| File embedding | 10 | Proxy | #7F8C8D | /slots/proxy |
| Code splitting | 16 | Compile | #7F8C8D | /slots/compile |
| Plugins | 16 | Compile | #7F8C8D | /slots/compile |
| BUN_BE_BUN mode | 24 | Versioning | #E91E63 | /slots/version |

## Requirements

- **Bun**: >= 1.3.0
- **TypeScript**: >= 5.0 (for type checking)
- **Target platforms**: Must be supported by Bun
- **Memory**: Minimum 2GB RAM for cross-compilation
- **Disk Space**: ~500MB for multiple target builds

## Version Information

- **Version**: 3.3.0
- **Bun Version**: >=1.3.0
- **Registry**: @scoped/lattice-registry
- **Last Updated**: 2025-12-29
- **Specification**: T3-Lattice v3.3

## Troubleshooting

### Common Issues & Solutions

#### 1. Cross-compilation fails

**Symptoms**: Build fails with "target not supported" error

**Solutions**:
```bash
# Check Bun version
bun --version  # Must be >= 1.3.0

# Verify target support
bun build --help | grep target

# Update Bun if needed
curl -fsSL https://bun.sh/install | bash
```

**Code fix**:
```typescript
// Ensure target is valid
const validTargets = [
  'bun-linux-x64', 'bun-linux-arm64', 
  'bun-linux-x64-musl', 'bun-linux-arm64-musl',
  'bun-windows-x64', 'bun-windows-x64-baseline',
  'bun-darwin-x64', 'bun-darwin-arm64'
];

if (!validTargets.includes(target)) {
  throw new Error(`Invalid target: ${target}`);
}
```

#### 2. Build constants not working

**Symptoms**: Constants are undefined at runtime

**Solutions**:
```typescript
// ❌ Wrong - values must be strings
buildConstants: {
  BUILD_VERSION: 1.2.3,  // Number
  BUILD_TIME: new Date()  // Object
}

// ✅ Correct - use strings
buildConstants: {
  BUILD_VERSION: '1.2.3',  // String
  BUILD_TIME: new Date().toISOString()  // ISO string
}

// ✅ Or use JSON.stringify for complex values
buildConstants: {
  'process.env.CONFIG': JSON.stringify({ debug: true })
}
```

#### 3. Platform-specific options ignored

**Symptoms**: Icons, signing, or console hiding not working

**Solutions**:
```typescript
// ✅ Correct structure
const executable = new T3LatticeExecutable({
  platform: {
    windows: {
      icon: './assets/icon.ico',  // Must be .ico
      hideConsole: true
    },
    macos: {
      codeSigning: {
        identity: 'Developer ID Application',
        deep: true
      },
      entitlements: './entitlements.plist'
    }
  }
});

// Verify file paths exist
import { existsSync } from 'fs';
if (!existsSync('./assets/icon.ico')) {
  console.error('Icon file not found!');
}
```

#### 4. Plugin loading failures

**Symptoms**: Plugins not executing or throwing errors

**Solutions**:
```typescript
// ✅ Proper plugin structure
const myPlugin: BunPlugin = {
  name: 'my-plugin',
  setup(build) {
    // Always check if filter matches
    build.onLoad({ filter: /\.custom$/ }, async args => {
      try {
        const content = await Bun.file(args.path).text();
        // Process content
        return {
          contents: `export default ${JSON.stringify(content)};`,
          loader: 'js'
        };
      } catch (error) {
        // Return null to let other plugins handle it
        return null;
      }
    });
  }
};
```

#### 5. Memory issues during cross-compilation

**Symptoms**: Build crashes or hangs with multiple targets

**Solutions**:
```typescript
// Build targets sequentially instead of parallel
const executable = new T3LatticeExecutable({
  crossCompilation: {
    targets: [
      { target: 'bun-darwin-arm64', os: 'macOS', arch: 'arm64', component: 16 }
    ],
    // Build one at a time
    parallel: false
  },
  minification: {
    enableAll: true,
    bytecode: false,  // Disable bytecode for memory-constrained systems
    sourcemap: false
  }
});
```

### Debug Mode

Enable comprehensive logging:

```typescript
const executable = new T3LatticeExecutable({
  // ... config
  compliance: {
    generateReport: true,
    strict: true,
    verbose: true  // Enable detailed logging
  }
});

const result = await executable.build();

if (result.warnings?.length) {
  console.warn('Build warnings:', result.warnings);
}

if (result.errors?.length) {
  console.error('Build errors:', result.errors);
  process.exit(1);
}
```

### Performance Diagnostics

```typescript
// Generate performance report
const start = Date.now();
const result = await executable.build();
const duration = Date.now() - start;

console.log(`Build time: ${duration}ms`);
console.log(`Output size: ${result.output ? (await Bun.file(result.output).size()) : 0} bytes`);

// Compare with and without optimization
const optimized = createCLIExecutable('app', './src/index.ts', {
  minification: { enableAll: true, bytecode: true }
});

const unoptimized = createCLIExecutable('app', './src/index.ts', {
  minification: { enableAll: false, bytecode: false }
});
```

## Migration from v3.2

### Breaking Changes

#### 1. Config Loading Flag
```typescript
// v3.2
configLoading: {
  dotenv: true  // ❌ Old name
}

// v3.3
configLoading: {
  dotenv: true  // ✅ Same name, different behavior
}
```

#### 2. Runtime Arguments
```typescript
// v3.2
const executable = new T3LatticeExecutable({
  execArgv: ['--smol']  // ❌ Root level
});

// v3.3
const executable = new T3LatticeExecutable({
  runtimeArgv: {
    execArgv: ['--smol']  // ✅ Nested
  }
});
```

#### 3. macOS Code Signing
```typescript
// v3.2
platform: {
  macos: {
    signing: {  // ❌ Old name
      identity: 'Developer ID'
    }
  }
}

// v3.3
platform: {
  macos: {
    codeSigning: {  // ✅ New name
      identity: 'Developer ID'
    }
  }
}
```

### New Features in v3.3

#### 1. onBeforeParse Hook
```typescript
const plugin: BunPlugin = {
  name: 'tsx-transform',
  setup(build) {
    build.onBeforeParse(
      { filter: /\.tsx$/, namespace: 'file' },
      { napiModule: myNativeAddon, symbol: 'transform_tsx' }
    );
  }
};
```

#### 2. Deferred Loading
```typescript
build.onLoad({ filter: /stats\.json$/ }, async args => {
  await args.defer();  // Wait for all modules
  return { contents: '{}', loader: 'json' };
});
```

#### 3. Enhanced Compliance Reporting
```typescript
const { complianceReport } = executable.generateBuildConfig();
console.log(complianceReport.summary);
console.log(complianceReport.security);
```

## Performance Benchmarks & Testing

### Build Performance (Typical)

| Configuration | Target | Time | Size |
|---------------|--------|------|------|
| Basic CLI | darwin-arm64 | 1.2s | 15MB |
| Minified CLI | darwin-arm64 | 1.8s | 8MB |
| Bytecode CLI | darwin-arm64 | 2.1s | 12MB |
| Full-Stack | linux-x64 | 3.5s | 25MB |
| Cross-Platform (3x) | All | 8.2s | 45MB total |

### Runtime Performance

| Feature | Startup Time | Memory | Use Case |
|---------|--------------|--------|----------|
| Standard | 100ms | 50MB | Development |
| Minified | 80ms | 40MB | Production |
| Bytecode | 50ms | 35MB | High-performance |
| Smol Mode | 40ms | 25MB | Embedded |

### Benchmarking & Regression Tracking

T3-Lattice v3.3 includes a dedicated benchmark harness to track performance and prevent regressions.

#### Running Benchmarks
```bash
# Run the performance harness
bun run benchmarks/harness.ts
```

The harness monitors:
- **Build Time**: Duration of the compilation process.
- **Binary Size**: Final executable size in MB.
- **Regression Tracking**: Compares results against `bun.lock` and `package.json` versions.

#### Benchmark Harness Example
```typescript
// benchmarks/harness.ts
import { spawnSync } from "bun";
// ... (see benchmarks/harness.ts for full implementation)

// Analysis output:
// 📊 Regression Analysis:
// ✅ Build time stable (0.05s change)
// ✅ Binary size stable (0.02MB change)
```

### Automated Testing Strategy

T3-Lattice v3.3 supports comprehensive testing of the generated executables:

```typescript
import { test, expect } from "bun:test";
import { spawnSync } from "bun";

test("Generated CLI returns correct version", async () => {
  const executable = createCLIExecutable('test-app', './src/index.ts', {
    buildConstants: { BUILD_VERSION: '1.2.3' }
  });
  
  const { output } = await executable.build();
  
  const result = spawnSync([output!, "--version"]);
  expect(result.stdout.toString()).toContain("1.2.3");
});

test("Embedded SQLite database is accessible", async () => {
  const result = spawnSync(["./dist/test-app", "--check-db"]);
  expect(result.status).toBe(0);
});
```

## Security Best Practices

### 1. Code Signing
```bash
# macOS - Always sign production builds
codesign --deep --force --sign "Developer ID" \
  --entitlements ./entitlements.plist \
  --options runtime \
  ./dist/myapp

# Verify signature
codesign -vvv --deep --strict ./dist/myapp
```

### 2. Entitlements Management
```xml
<!-- entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-only</key>
    <true/>
</dict>
</plist>
```

### 3. Environment Security
```typescript
// ❌ Never hardcode secrets
buildConstants: {
  'process.env.API_KEY': 'secret123'  // DANGEROUS
}

// ✅ Use runtime environment variables
buildConstants: {
  'process.env.NODE_ENV': 'production'
}
// Then read API_KEY from process.env at runtime
```

### 4. Embedded File Validation
```typescript
import { file } from "bun";

// Validate embedded files
const db = await file('./my.db').arrayBuffer();

// Check magic bytes
const magic = new Uint8Array(db.slice(0, 4));
if (magic[0] !== 0x53 || magic[1] !== 0x51 || magic[2] !== 0x4C || magic[3] !== 0x69) {
  throw new Error('Invalid SQLite file');
}
```

## Community & Resources

### Official Documentation
- **Bun Documentation**: https://bun.sh/docs
- **Bun API Reference**: https://bun.sh/docs/api
- **Bun Plugins**: https://bun.sh/docs/plugins
- **Bun Compilation**: https://bun.sh/docs/bun-build#compile

### T3-Lattice Resources
- **Specification**: Internal T3-Lattice v3.3
- **Component Registry**: @scoped/lattice-registry
- **Type Definitions**: See t3-lattice-v3.3-executable.ts

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join Bun community for real-time help
- **Stack Overflow**: Tag questions with `bun` and `t3-lattice`

### Related Tools
- **Bun Dev Server**: For development workflows
- **Bun Test**: For testing compiled executables
- **Bun Bake**: For build optimization

---

*This documentation is auto-generated and reflects T3-Lattice v3.3 specification with Bun API compatibility. Last updated: 2025-12-29*
