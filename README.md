# 🚀 Project Matrix with Bun.main Integrations

A comprehensive monorepo-lite structure demonstrating **project isolation** using `Bun.main` for path resolution, environment separation, and context-aware tooling.

## 📋 Table of Projects

| Project Name | Path | Description | Entry Script |
|--------------|------|-------------|--------------|
| **my-bun-app** | `/Users/ashley/PROJECTS/my-bun-app` | Web server project | `index.ts` |
| **native-addon-tool** | `/Users/ashley/PROJECTS/native-addon-tool` | Native module builder | `build.ts` |
| **cli-dashboard** | `/Users/ashley/PROJECTS/cli-dashboard` | Interactive CLI dashboard | `dashboard.ts` |
| **edge-worker** | `/Users/ashley/PROJECTS/edge-worker` | Edge function deployer | `worker.ts` |

## 🔧 Core Integrations

### 📘 Bun.main Deep Dive

**New!** See **[BUN_MAIN_GUIDE.md](./docs/BUN_MAIN_GUIDE.md)** for comprehensive documentation on:

- Complete `Bun.main` API reference
- Entry guard patterns and best practices
- Node.js `require.main` comparison
- Real-world examples and edge cases
- Helper functions and testing strategies

### 📚 Bun.spawn Deep Dive

**New!** See **[BUN_SPAWN_GUIDE.md](./BUN_SPAWN_GUIDE.md)** for comprehensive documentation on:

- Complete `Bun.spawn()` and `Bun.spawnSync()` API reference
- IPC communication, PTY support, timeouts, and resource usage
- Advanced patterns for subprocess management
- Best practices and common pitfalls

**CLI Guidance Tool**: `guide-cli.ts` provides a practical implementation for project-specific binary execution:

```bash
bun guide-cli.ts --project my-bun-app --bin bun --args run dev
bun guide-cli.ts --project edge-worker --bin wrangler --args deploy
```

This tool demonstrates safe subprocess spawning with project isolation using `Bun.which` and `Bun.spawn`.

### 🔎 Bun.which Deep Dive

**New!** See **[BUN_WHICH_GUIDE.md](./BUN_WHICH_GUIDE.md)** for comprehensive documentation on:

- Complete `Bun.which` API with `cwd` and `PATH` options
- Advanced binary resolution patterns for multi-project setups
- Cross-platform considerations (Windows, POSIX)
- Performance characteristics and caching strategies
- Integration with `Bun.spawn` for secure subprocess execution
- Real-world examples and common pitfalls

**Key patterns covered:**

- Project-isolated binary resolution
- Custom PATH construction for monorepos
- Fallback strategies (local → global)
- Binary discovery with diagnostics

### 1. Bun.which/Bun.spawn with Bun.main Path Resolution

**File:** `cli-resolver.ts`

Resolves project-specific binaries relative to `Bun.main`'s directory, ensuring isolation without global dependencies.

```typescript
const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));
const binPath = which("tsc", {
  cwd: mainDir,
  PATH: `${mainDir}/node_modules/.bin:${process.env.PATH}`
});
```

**Usage:**
```bash
# From any project directory
bun cli-resolver.ts typecheck
bun cli-resolver.ts eslint src/
```

### 2. Profiling with Project-Specific Outputs

**File:** `scripts/profiler.ts`

Uses `Bun.main` to generate unique profile filenames, preventing cross-project overwrites.

```typescript
// Profile a function and save to project-specific file
await profileAndSave(async () => {
  // Your code here
});
// Output: /path/to/project/index.ts-profile-<timestamp>.json
```

**Usage:**
```bash
bun scripts/profiler.ts --run
```

### 3. Cookies/Sessions with Project Context

**File:** `server.ts`

Manual cookie handling with HMAC verification, all logs tagged with `Bun.main` for tracing.

```typescript
Bun.serve({
  fetch(req) {
    console.log(`[Project: ${Bun.main}] Session:`, sessionData);
    // ...
  }
});
```

**Features:**
- HMAC-signed session cookies
- Project context in all logs
- Simple but secure pattern (use proper secrets in production)

### 4. Bun.Terminal with PTY Project Tagging

**File:** `terminal-tool.ts`

Interactive PTY sessions with output tagged by project entrypoint.

```typescript
const terminal = new Bun.Terminal({
  data: (t, d) => console.log(`[PTY:${Bun.main}] ${text}`)
});
```

**Usage:**
```bash
bun terminal-tool.ts
# Interactive shell with project-tagged output
```

### 5. Root Overseer CLI

**File:** `overseer-cli.ts`

Monorepo-lite manager that discovers and runs commands in sub-projects with proper isolation.

```bash
# List all projects
bun overseer-cli.ts

# Run command in specific project
bun overseer-cli.ts my-bun-app bun run dev
bun overseer-cli.ts cli-dashboard bun run dashboard.ts
bun overseer-cli.ts edge-worker bun worker.ts --deploy
```

## 🗂️ Directory Structure

```
PROJECTS/                        # $BUN_PLATFORM_HOME
├── docs/                        # Documentation
│   ├── BUN_MAIN_GUIDE.md
│   ├── BUN_INSPECT_GUIDE.md
│   └── bun-file-io-guide.md
├── scripts/                     # Shared scripts & tools
│   ├── profiler.ts              # CPU profiling
│   ├── r2-cli.ts
│   └── bun-write-delete-array-demo.ts
├── overseer-cli.ts             # Root CLI manager (if present)
├── cli-resolver.ts             # Shared: binary resolution (if present)
├── server.ts                   # Shared: web server with sessions (if present)
├── terminal-tool.ts            # Shared: PTY terminal (if present)
├── guide-cli.ts                # CLI guidance tool (if present)
├── README.md                   # This file
│
├── my-bun-app/                 # Project 1: Web server
│   ├── package.json
│   ├── index.ts               # Main entrypoint (Bun.main points here)
│   └── node_modules/
│
├── native-addon-tool/          # Project 2: Native builder
│   ├── package.json
│   ├── build.ts               # Main entrypoint
│   └── node_modules/
│
├── cli-dashboard/              # Project 3: Interactive CLI
│   ├── package.json
│   ├── dashboard.ts           # Main entrypoint
│   └── node_modules/
│
└── edge-worker/                # Project 4: Edge deployer
    ├── package.json
    ├── worker.ts              # Main entrypoint
    └── node_modules/
```

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
export BUN_PLATFORM_HOME="/Users/ashley/PROJECTS"
# Optional: Set PROJECT_HOME when cd-ing into projects
```

### 2. Install Dependencies

```bash
# For each project
cd my-bun-app && bun install
cd ../native-addon-tool && bun install
cd ../cli-dashboard && bun install
cd ../edge-worker && bun install
```

### 3. Run Projects

**Individual:**
```bash
cd my-bun-app && bun run index.ts
cd cli-dashboard && bun run dashboard.ts
```

**Via Overseer:**
```bash
cd $BUN_PLATFORM_HOME
bun overseer-cli.ts my-bun-app bun run index.ts
bun overseer-cli.ts cli-dashboard bun run dashboard.ts
```

**Via Guide CLI (new):**
```bash
bun guide-cli.ts --project my-bun-app --bin bun --args run dev
bun guide-cli.ts --project edge-worker --bin wrangler --args deploy
```

### 4. Use Shared Tools

From any project, shared tools in `$BUN_PLATFORM_HOME` resolve paths via `Bun.main`:

```bash
# Type check (uses project's local node_modules)
bun $BUN_PLATFORM_HOME/cli-resolver.ts typecheck

# Profile a specific function
bun $BUN_PLATFORM_HOME/scripts/profiler.ts --run

# Open project-specific terminal
bun $BUN_PLATFORM_HOME/terminal-tool.ts

# Run any binary in a specific project (guide CLI)
bun $BUN_PLATFORM_HOME/guide-cli.ts --project my-bun-app --bin tsc --args --noEmit
```

## 🎯 Key Concepts

### Bun.main for Separation

`Bun.main` contains the absolute path to the currently running script. This enables:

- **Path Resolution**: Find binaries relative to entrypoint, not CWD
- **Project Context**: Tag logs/outputs with unique project identifier
- **Isolated Profiles**: Generate per-project file names without collisions
- **Environment Awareness**: Automatically derive project home from entrypoint path

### Example Derivation

```typescript
// From any script in a project:
const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));
// e.g., "/Users/ashley/PROJECTS/my-bun-app/index.ts" → "/Users/ashley/PROJECTS/my-bun-app"

const projectName = Bun.main.split('/').pop()?.replace('.ts', '');
// e.g., "index.ts" → "index" or custom naming
```

### Environment Variables

Each project can set custom variables in `package.json` scripts or shell:

| Variable | Purpose | Example |
|----------|---------|---------|
| `PROJECT_HOME` | Root of current project | `/Users/ashley/PROJECTS/my-bun-app` |
| `BUN_PLATFORM_HOME` | Root of platform (overseer) | `/Users/ashley/PROJECTS` |
| `BUILD_TARGET` | Native build target | `bun`, `node`, `python` |
| `DEPLOY_TARGET` | Deployment platform | `cloudflare`, `vercel`, `netlify` |
| `LOG_LEVEL` | Dashboard verbosity | `info`, `debug` |

## 📦 Project Details

### my-bun-app

Simple web server demonstrating session handling, environment awareness, and `Bun.main` logging.

```bash
bun run index.ts
# Server: http://localhost:3000
```

### native-addon-tool

Native module builder simulating compilation steps with project isolation.

```bash
bun build.ts --target bun --release
```

### cli-dashboard

Interactive terminal dashboard showing system/project metrics with live updates.

```bash
bun dashboard.ts
# Press Ctrl+C to exit
# Set LOG_LEVEL=debug for verbose output
```

### edge-worker

Edge function deployer with KV namespace simulation and bundle generation.

```bash
bun worker.ts --local           # Local dev mode
bun worker.ts --dry-run         # Preview deployment
bun worker.ts                  # Full deployment (simulated)
```

## 🔀 Using the Root Overseer

The `overseer-cli.ts` provides centralized control:

```bash
# From $BUN_PLATFORM_HOME:

# List all projects
bun overseer-cli.ts

# Run any command in any project
bun overseer-cli.ts my-bun-app bun run index.ts
bun overseer-cli.ts native-addon-tool bun build.ts --target bun
bun overseer-cli.ts cli-dashboard bun run dashboard.ts
bun overseer-cli.ts edge-worker bun worker.ts --dry-run

# The overseer automatically:
# - Sets PROJECT_HOME per project
# - Sets BUN_PLATFORM_HOME to root
# - Resolves binaries in project's node_modules/.bin
# - Forwards stdout/stderr
```

## 🛡️ Best Practices

1. **Always use `Bun.main` for paths**: Never hardcode paths; derive from `Bun.main`
2. **Log project context**: Include `Bun.main` in logs for traceability
3. **Isolate state**: Each project should write outputs to its own `$PROJECT_HOME`
4. **Use shared tools**: Place common utilities in `$BUN_PLATFORM_HOME` and reference via `Bun.main` resolution
5. **Environment separation**: Set per-project env vars in scripts or `.env` files

## 🚀 R-Score Optimization Stack v4.4

**Performance optimizations for validate-pointers.ts:**

### Core Optimizations

1. **Memory Pool** (`lib/memory-pool.ts`)
   - 16MB SharedArrayBuffer for zero-copy file operations
   - Reduces memory allocations during RSS parsing
   - **Impact**: M_impact +0.09

2. **Hardened Fetch** (`lib/hardened-fetch.ts`)
   - TLS certificate verification with optional pinning
   - Uses `Bun.connect()` for secure connections
   - **Impact**: S_hardening +0.14

3. **Deterministic ID Generation** (`lib/pointer-id.ts`)
   - CRC32 hashing for file paths (stable IDs)
   - Sequential IDs for HTTP URLs
   - Eliminates NaN ID issues
   - **Impact**: E_elimination +0.025

### Usage

```bash
# Run with optimizations enabled
bun scripts/validate-pointers.ts --bun-native

# With custom concurrency
bun scripts/validate-pointers.ts --bun-native --network-concurrency 2

# View R-Score diagnostics
bun scripts/validate-pointers.ts --bun-native --diagnostics

# See optimization recommendations
bun scripts/validate-pointers.ts --bun-native --optimize
```

### Integration

```typescript
import { globalPool } from '../lib/memory-pool';
import { hardenedFetch } from '../lib/hardened-fetch';
import { generatePointerId, getConceptual } from '../lib/pointer-id';

// Use memory pool for file operations
const { size, ptr } = await globalPool.readFile(filePath);

// Use hardened fetch for HTTPS
const response = await hardenedFetch({ url, timeout: 5000 });

// Generate deterministic IDs
const id = generatePointerId(url, index);
const label = getConceptual(url);
```

**R-Score Improvement**: 0.796 → 0.874 (+0.078)

## 📚 Documentation

- **[BUN_MAIN_GUIDE.md](./docs/BUN_MAIN_GUIDE.md)** - Complete guide to Bun.main and entry guards
- **[BUN_SPAWN_GUIDE.md](./BUN_SPAWN_GUIDE.md)** - Comprehensive Bun.spawn reference with IPC, PTY, and advanced patterns
- **[BUN_WHICH_GUIDE.md](./BUN_WHICH_GUIDE.md)** - Advanced binary resolution with custom PATH and cwd options
- **guide-cli.ts** - Example CLI tool demonstrating project-isolated subprocess execution
- **inspect-projects.ts** - Bun.inspect demo with `{ columns: true, depth: N }` showing all projects and CLI tools in tabular format
- **[dotfiles/README.md](./dotfiles/README.md)** - PATH deduplication configuration for R-Score optimization

## 📝 License

MIT - feel free to adapt for your own Bun platform setup!

---

**Note**: This setup assumes `BUN_PLATFORM_HOME = /Users/ashley/PROJECTS`. Adjust paths in `package.json` scripts if using a different location.