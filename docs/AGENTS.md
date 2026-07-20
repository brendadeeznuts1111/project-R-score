<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# AGENTS.md - AI Coding Agent Guide

> This file contains essential information for AI coding agents working on this project.
> Last updated: 2026-02-04

## Project Overview

This is a **Bun-based monorepo-lite platform** demonstrating project isolation using `Bun.main` for path resolution, environment separation, and context-aware tooling. The project serves as both a working platform and a comprehensive educational reference for Bun runtime patterns.

**Key Characteristics:**
- Runtime: Bun v1.3.8+
- Language: TypeScript (ES2022)
- Architecture: Monorepo-lite with project isolation
- Total sub-projects: ~50 directories
- Total TypeScript files: ~200+

## Technology Stack

### Core Runtime
- **Bun** (v1.3.8+) - JavaScript/TypeScript runtime, bundler, test runner
- **TypeScript** - Primary language with ES2022 target
- **bun:fs** - File system operations
- **bun:jsc** - JavaScriptCore profiling APIs

### Key APIs Used
- `Bun.main` - Entrypoint path resolution (core pattern)
- `Bun.spawn()` / `Bun.spawnSync()` - Child process spawning
- `Bun.which()` - Binary resolution with custom PATH
- `Bun.serve()` - HTTP server
- `Bun.Terminal` - PTY terminal interaction
- `Bun.inspect()` - Structured data visualization
- `Bun.escapeHTML()` - XSS prevention for HTML generation
- `Bun.markdown.html()` - Markdown to HTML conversion with GFM support
- `Bun.hash` - Cryptographic hashing
- `import.meta.path` - Module path detection

### Module System
- ES Modules (`"module": "ESNext"`)
- Import maps via `bunfig.toml` files
- Cross-project imports via relative paths

## Project Structure

```text
/Users/nolarose/Projects/          # $BUN_PLATFORM_HOME
├── tools/                        # Root tooling CLIs and utilities
│   ├── overseer-cli.ts           # Monorepo manager - discover and run commands in sub-projects
│   ├── scan.ts                   # Tier-1380 scan CLI
│   ├── secret-helper.ts          # Versioned secret helpers
│   ├── cookie-scanner.ts         # Cookie scanner CLI
│   ├── inspect-demo.ts           # General Bun.inspect demonstrations
│   └── ... (other .ts tools)
│
├── utils/                        # Root utility CLIs
│   ├── guide-cli.ts              # Advanced binary resolution with Bun.which patterns
│   ├── terminal-tool.ts          # Interactive PTY terminal with project context
│   ├── keychain-naming.ts        # Keychain/credential naming utilities
│   └── registry-color-channel-cli.ts  # Registry CLI with color channel support
│
├── shared/                       # Shared utilities
│   ├── tools/
│   │   └── entry-guard.ts       # Prevents CLI tools from being imported accidentally
│   ├── package.json             # Shared dependencies config
│   └── bunfig.toml              # Shared Bun configuration
│
├── scripts/                      # Utility scripts
│   ├── profiler.ts              # CPU profiling with project-specific outputs
│   ├── r2-cli.ts               # R2 (Cloudflare) CLI operations
│   └── *.sh                    # Shell cleanup/maintenance scripts
│
├── docs/                         # Documentation
│   ├── BUN_MAIN_GUIDE.md       # Comprehensive Bun.main reference
│   ├── guides/
│   │   ├── BUN_SPAWN_GUIDE.md  # Bun.spawn() complete guide
│   │   └── BUN_WHICH_GUIDE.md  # Bun.which() advanced patterns
│   ├── BUN_ESCAPEHTML_GUIDE.md # Bun.escapeHTML() XSS prevention guide
│   ├── BUN_MARKDOWN_HTML_GUIDE.md # Bun.markdown.html() options guide
│   ├── bun-file-io-guide.md    # File I/O patterns
│   └── archives/               # Historical reports (read-only)
│
├── Kimi Shell Integration (MCP)
│   ├── AGENTS.md               # This file - AI agent guide with MCP tool reference
│   └── (MCP tools provided via unified-shell-bridge in matrix-analysis/)
│
├── Sub-Projects (each with isolated node_modules)
│   ├── my-bun-app/             # Web server demo (port 3000)
│   ├── cli-dashboard/          # Interactive CLI dashboard
│   ├── edge-worker/            # Edge function deployer
│   ├── native-addon-tool/      # Native module builder
│   ├── fantasy42-fire22-registry/  # Large registry project
│   ├── trader-analyzer/        # Trading analysis tools
│   ├── matrix-analysis/        # Matrix data analysis
│   ├── duo-automation/         # Automation tools
│   ├── clawdbot/               # Bot implementation
│   └── [45+ other projects...]
│
└── Configuration Files
    ├── package.json             # Root dependencies (@types/bun)
    ├── tsconfig.json           # TypeScript configuration
    ├── bun.lock                # Bun lockfile
    └── registry-color-channel.toml  # Registry configuration
```

## Build and Run Commands

### Environment Setup
```bash
# Optional: Set platform root (defaults to $HOME/Projects or auto-detected)
export BUN_PLATFORM_HOME="${BUN_PLATFORM_HOME:-$HOME/Projects}"

# Or use a custom path
export BUN_PLATFORM_HOME="/path/to/your/projects"
```

### Running Root-Level Tools
```bash
# List all projects
bun tools/overseer-cli.ts

# Run command in specific project
bun tools/overseer-cli.ts <project-name> <command> [args...]
bun tools/overseer-cli.ts my-bun-app bun run dev

# Guide CLI - project-specific binary execution
bun utils/guide-cli.ts --project my-bun-app --bin bun --args run dev
bun utils/guide-cli.ts typecheck                    # Simple mode: run tsc --noEmit

# Start example server
bun tools/server.ts

# Interactive terminal
bun utils/terminal-tool.ts

# Profile a workload
bun scripts/profiler.ts --run

```

### Running Sub-Projects
```bash
# Direct execution
cd my-bun-app && bun run dev
cd cli-dashboard && bun run dashboard.ts

# Via npm scripts (where available)
cd <project> && bun run <script>
```

### Type Checking
```bash
# Simple mode - type check relative to Bun.main
bun utils/guide-cli.ts typecheck

# With project specification
bun utils/guide-cli.ts --project my-bun-app --bin tsc --args --noEmit
```

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: ESNext
- Module Resolution: bundler
- Strict mode: **OFF** (`"strict": false`)
- `noImplicitAny`: false (permissive typing allowed)
- `skipLibCheck`: true

### Naming Conventions
- Files: kebab-case.ts (e.g., `tools/overseer-cli.ts`, `utils/guide-cli.ts`)
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Types/Interfaces: PascalCase

### Entry Guard Pattern (CRITICAL)
All CLI tools must include entry guards to prevent accidental import execution:

```typescript
#!/usr/bin/env bun
import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";
ensureDirectExecution();  // MUST be first after imports

// ... rest of CLI code
```

Alternative inline guard:
```typescript
if (import.meta.path !== Bun.main) {
  process.exit(0);
}
```

### Bun.main Patterns
```typescript
// Get project directory from entrypoint
const projectDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

// Get entry name
const entryName = Bun.main.split('/').pop()?.replace(/\.ts$/, '');

// Context-aware logging
console.log(`[${Bun.main}] Operation started`);
```

### Import Order
1. Entry guard import (if CLI tool)
2. Bun built-in modules (`bun`, `bun:fs`)
3. Third-party imports
4. Local/shared imports

## Testing Instructions

### No Formal Test Suite
This project does **not** have a formal test framework configured. Testing is manual:

```bash
# Test entry guards
bun scripts/test-guard-import.sh

# Manual test script
./scripts/manual-test.sh

# Test specific tools
bun tools/overseer-cli.ts  # Should list projects
bun utils/guide-cli.ts --help  # Should show help
```

### Testing Entry Guards
Create a test file that imports the tool:
```typescript
// test-import.ts
import "./tools/overseer-cli.ts";  // Should exit immediately (code 0)
console.log("This should never print");
```

Run: `bun test-import.ts && echo $?`  # Should print 0

## Security Considerations

### Entry Guards
- **Always** use entry guards for CLI tools to prevent code execution on accidental imports
- Guards should exit with code 0 (silent) to not break importers

### Environment Variables
Sensitive variables that may be present:
- `PROJECT_HOME` - Current project root
- `BUN_PLATFORM_HOME` - Platform root
- `SESSION_SECRET` - For cookie signing (in sub-projects)
- `DB_URL` - Database connections
- R2 credentials (in some projects)

### Path Resolution
- Use `Bun.which()` with explicit `cwd` and `PATH` for binary resolution
- Never trust `process.cwd()` for project-relative paths
- Always derive from `Bun.main` for isolation

### Cookie/Session Handling
The `server.ts` example uses HMAC-signed cookies:
- Uses `Bun.hash.sha256()` for HMAC
- Demo key is `'project-secret-key'` - **Change in production**
- Sets `HttpOnly`, `Secure`, `Path=/` flags

## Development Conventions

### Project Isolation
Each sub-project should:
1. Have its own `package.json`
2. Have its own `node_modules`
3. Use `Bun.main` for path resolution, not hardcoded paths
4. Write outputs to project-specific locations

### Root Hygiene (Required)
To reduce root-level bloat and path confusion:
- Keep the root for configuration, entrypoints, and top-level docs only.
- Do not add new one-off files in the root. Place them in the appropriate directory.
- Prefer relative paths derived from `Bun.main` or `BUN_PLATFORM_HOME`, never hardcode `/Users/nolarose/Projects`.
- Generated outputs must go to `build/`, `dist/`, `logs/`, or a project-local `artifacts/` folder.

Recommended placement:
- Documentation: `docs/` (use subfolders like `docs/notes/` and `docs/architecture/`)
- Historical reports only: `docs/archives/`
- Tools/CLIs and scripts: `scripts/` (shell) or `tools/` (TypeScript utilities)
- Examples and demos: `examples/`
- Data snapshots and diagnostics: `data/` or `docs/data/` (if documentation-facing)
- Project-specific assets: inside the owning project folder

### Documentation Hygiene (Required)
- Ban new docs with these markers: `summary`, `final`, `complete`, `final-complete`, `quantum`, `quantaum`, `enhance-[docname]`.
- Progress updates and reporting must go into `CHANGELOG.md` using versioned entries.
- Historical reports are kept only in `docs/archives/` and should not be extended.

### Binary Resolution Pattern
```typescript
import { which, spawn } from "bun";

const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));
const binPath = which("tsc", {
  cwd: mainDir,
  PATH: `${mainDir}/node_modules/.bin:${process.env.PATH || ""}`
});

if (binPath) {
  const proc = spawn([binPath, "--noEmit"], {
    cwd: mainDir,
    stdio: "inherit",
    env: { ...process.env, PROJECT_HOME: mainDir }
  });
  await proc.exited;
}
```

### Shared Tool Usage
Import from shared using relative paths:
```typescript
import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";
```

### Documentation
- Major guides are in `docs/` and root-level `.md` files
- Inline JSDoc comments for functions
- Example usage in file headers

### Git Workflow
- Husky hooks configured in `.husky/`
- Git template in `.git-template/`
- No automated CI/CD visible

## Bun install policy (machine + workspace)

**Canonical reference:** [`docs/UNIFIED.md`](./UNIFIED.md)

| Layer | Location | Owns |
| --- | --- | --- |
| Machine | `~/.bunfig.toml` | `linker = "isolated"`, `globalStore = true`, absolute `[install.cache].dir` |
| Monorepo root | `bunfig.toml` | `exact`, `frozenLockfile`, `minimumReleaseAge`, `@factorywager` scopes, `[test]` defaults |
| Workspace | `<project>/bunfig.toml` | Project-only overrides — **never** duplicate machine keys |

**Do not** set `BUN_INSTALL_CACHE_DIR` in shell or VS Code terminal env; use `~/.bunfig.toml` instead (`kimi-doctor --gate bunfig-policy` treats it as a risky override).

**`./~` drift:** Unexpanded `~` in project `bunfig.toml` or env creates literal `./~` cache dirs. Use absolute paths at machine level; CI uses `scripts/with-bun-cache-env.ts`.

### Verification tooling

| Command | Purpose |
| --- | --- |
| `bun run install:verify` | Cache, global store, tilde drift, lockfile layout |
| `bun run audit:bunfig` | Workspace `bunfig.toml` redundancy scan |
| `bash scripts/audit-bunfig.sh --doctor` | `kimi-doctor --gate bunfig-policy` when available |
| `kimi-doctor --gate bunfig-policy` | Hardened policy + root redundancy vs `~/.bunfig.toml` |
| `bun run install:pm:health` | `bun pm` cache + hash + trust + bin checks (JSON) |
| `bun run audit:bunfig` | Bunfig redundancy + `bun pm pkg get` + `bun pm untrusted` |

See [`docs/UNIFIED.md`](./UNIFIED.md) for the full install matrix, `bun pm` command matrix, intentional overrides, and CI notes.

## Common Tasks

### Adding a New Sub-Project
1. Create directory: `mkdir new-project`
2. Add `package.json` with name, version, scripts
3. Add `bunfig.toml` for project-specific config only (see [`docs/UNIFIED.md`](./UNIFIED.md) template)
4. Create entrypoint (e.g., `index.ts`)
5. Run `bun install` in the directory

### Creating a New Tooling CLI
1. Create file: `touch tools/my-tool.ts`
2. Add shebang: `#!/usr/bin/env bun`
3. Add entry guard as first import
4. Follow existing patterns in `utils/guide-cli.ts`
5. Export nothing (CLI-only)

### Root Cleanup Workflow
1. Inventory loose files:
   - `find . -maxdepth 1 -type f -print`
2. Classify by purpose (docs, tools, configs, data, reports).
3. Move files into target folders and update references.
4. Confirm no hardcoded absolute paths remain.

Useful commands:
```bash
# Show loose files only
find . -maxdepth 1 -type f -print

# Search for hardcoded root paths
rg -n "/Users/nolarose/Projects" -g "*"
```

### Running Code in Specific Project Context
```bash
# Via overseer
bun tools/overseer-cli.ts <project> bun run <script>

# Via guide-cli (more control)
bun utils/guide-cli.ts --project <name> --bin <binary> --args <args...>
```

## Troubleshooting

### "Command not found" errors
- Check `BUN_PLATFORM_HOME` is set correctly
- Ensure `bun install` was run in the target project
- Use `--diagnostics` flag with guide-cli to see search paths

### Import errors
- Verify entry guard is not preventing execution
- Check that import paths use `.ts` extension
- Ensure `bunfig.toml` has correct import maps

### Port conflicts
- Default port is 3000, set `PORT` env var to change
- Check `lsof -i :3000` for existing listeners

## Kimi Shell Integration

This project is integrated with **Kimi Shell** through MCP (Model Context Protocol) tools. The following tools are available for AI agents:

### Available MCP Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `shell_execute` | Execute commands with profile/OpenClaw context | `shell_execute({command: "bun --version"})` |
| `openclaw_status` | Check OpenClaw gateway status | `openclaw_status()` |
| `openclaw_gateway_restart` | Restart OpenClaw gateway | `openclaw_gateway_restart()` |
| `profile_list` | List available Matrix profiles | `profile_list()` |
| `profile_bind` | Bind current directory to profile | `profile_bind({profile: "dev"})` |
| `profile_switch` | Switch to different profile | `profile_switch({profile: "prod"})` |
| `profile_status` | Show profile-terminal binding status | `profile_status()` |
| `matrix_agent_status` | Check Matrix Agent status | `matrix_agent_status()` |
| `cron_list` | List configured cron jobs | `cron_list()` |
| `r2_status` | Check R2 (Cloudflare) connection | `r2_status()` |
| `r2_upload` | Upload file to R2 | `r2_upload({localPath: "./file.txt", r2Key: "path/in/bucket"})` |
| `r2_download` | Download file from R2 | `r2_download({r2Key: "path/in/bucket"})` |
| `registry_check` | Check OMEGA registry connection | `registry_check()` |
| `kimi_shell_status` | Check Kimi shell integration status | `kimi_shell_status()` |
| `matrix_bridge_status` | Check Matrix↔OpenClaw bridge status | `matrix_bridge_status()` |
| `matrix_bridge_proxy` | Proxy command through bridge | `matrix_bridge_proxy({target: "matrix", command: "status"})` |

### Working Directory Context

When using `shell_execute`, you can specify the working directory:

```typescript
// Execute in a specific project
shell_execute({
  command: "bun run dev",
  workingDir: "/Users/nolarose/Projects/my-bun-app"
})

// Execute with profile context
shell_execute({
  command: "deploy",
  profile: "production",
  openclaw: true
})
```

### Project-Specific Shell Operations

```bash
# Check which profile is bound to current directory
profile_status()

# Bind current project to a profile
profile_bind({profile: "fantasy42"})

# List all available profiles
profile_list()
```

### Environment Variables

The following environment variables are used by Kimi Shell integration:

- `MATRIX_PROFILES_DIR` - Directory containing profile configurations
- `OPENCLAW_GATEWAY_TOKEN` - Token for OpenClaw gateway access
- `BUN_PLATFORM_HOME` - Platform root directory
- `KIMI_SHELL_MODE` - Set to "unified" for integrated mode

### Related Documentation

- Matrix Analysis project has detailed integration docs: `matrix-analysis/scripts/kimi-shell-integration/`
- Unified Shell Bridge: `matrix-analysis/scripts/kimi-shell-integration/unified-shell-bridge.ts`

## Resources

- [Bun Documentation 🌐](https://bun.sh/docs)
- [BUN_MAIN_GUIDE.md](./docs/BUN_MAIN_GUIDE.md) - Comprehensive Bun.main patterns
- [BUN_SPAWN_GUIDE.md](./guides/BUN_SPAWN_GUIDE.md) - Complete Bun.spawn reference
- [BUN_WHICH_GUIDE.md](./guides/BUN_WHICH_GUIDE.md) - Advanced binary resolution
- [BUN_ESCAPEHTML_GUIDE.md](./docs/BUN_ESCAPEHTML_GUIDE.md) - XSS prevention with Bun.escapeHTML()
- [BUN_MARKDOWN_HTML_GUIDE.md](./docs/BUN_MARKDOWN_HTML_GUIDE.md) - Bun.markdown.html() options reference
- [README.md](./README.md) - Project overview and quick start

---

**Note for AI Agents:** This codebase emphasizes `Bun.main` for project isolation. Always derive paths from the entrypoint rather than hardcoding or using `process.cwd()`. Follow the entry guard pattern strictly for all CLI tools.

**Kimi Shell Note:** When working with this codebase, you can use the MCP tools listed above to execute commands, check statuses, and manage profiles. Use `shell_execute` for project-specific commands with proper `workingDir` context.
