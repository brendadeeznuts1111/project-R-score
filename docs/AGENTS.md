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

```
/Users/nolarose/Projects/          # $BUN_PLATFORM_HOME
├── Root-Level Tools (CLI)
│   ├── overseer-cli.ts           # Monorepo manager - discover and run commands in sub-projects
│   ├── guide-cli.ts              # Advanced binary resolution with Bun.which patterns
│   ├── server.ts                 # Example web server with session/cookie handling
│   ├── terminal-tool.ts          # Interactive PTY terminal with project context
│   ├── inspect-projects.ts       # Bun.inspect demo with tabular output
│   ├── inspect-demo.ts           # General Bun.inspect demonstrations
│   ├── keychain-naming.ts        # Keychain/credential naming utilities
│   ├── registry-color-channel-cli.ts  # Registry CLI with color channel support
│   └── ... (other .ts tools)
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
│   ├── BUN_SPAWN_GUIDE.md      # Bun.spawn() complete guide (root level)
│   ├── BUN_WHICH_GUIDE.md      # Bun.which() advanced patterns (root level)
│   ├── BUN_ESCAPEHTML_GUIDE.md # Bun.escapeHTML() XSS prevention guide
│   ├── BUN_MARKDOWN_HTML_GUIDE.md # Bun.markdown.html() options guide
│   └── bun-file-io-guide.md    # File I/O patterns
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
# Required environment variable
export BUN_PLATFORM_HOME="/Users/nolarose/Projects"
```

### Running Root-Level Tools
```bash
# List all projects
bun overseer-cli.ts

# Run command in specific project
bun overseer-cli.ts <project-name> <command> [args...]
bun overseer-cli.ts my-bun-app bun run dev

# Guide CLI - project-specific binary execution
bun guide-cli.ts --project my-bun-app --bin bun --args run dev
bun guide-cli.ts typecheck                    # Simple mode: run tsc --noEmit

# Start example server
bun server.ts

# Interactive terminal
bun terminal-tool.ts

# Profile a workload
bun scripts/profiler.ts --run

# Inspect projects table
bun inspect-projects.ts
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
bun guide-cli.ts typecheck

# With project specification
bun guide-cli.ts --project my-bun-app --bin tsc --args --noEmit
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
- Files: kebab-case.ts (e.g., `guide-cli.ts`, `entry-guard.ts`)
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Types/Interfaces: PascalCase

### Entry Guard Pattern (CRITICAL)
All CLI tools must include entry guards to prevent accidental import execution:

```typescript
#!/usr/bin/env bun
import { ensureDirectExecution } from "./shared/tools/entry-guard.ts";
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
bun test-guard-import.sh

# Manual test script
./manual-test.sh

# Test specific tools
bun overseer-cli.ts  # Should list projects
bun guide-cli.ts --help  # Should show help
```

### Testing Entry Guards
Create a test file that imports the tool:
```typescript
// test-import.ts
import "./overseer-cli.ts";  // Should exit immediately (code 0)
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
import { ensureDirectExecution } from "./shared/tools/entry-guard.ts";
```

### Documentation
- Major guides are in `docs/` and root-level `.md` files
- Inline JSDoc comments for functions
- Example usage in file headers

### Git Workflow
- Husky hooks configured in `.husky/`
- Git template in `.git-template/`
- No automated CI/CD visible

## Common Tasks

### Adding a New Sub-Project
1. Create directory: `mkdir new-project`
2. Add `package.json` with name, version, scripts
3. Add `bunfig.toml` for Bun-specific config
4. Create entrypoint (e.g., `index.ts`)
5. Run `bun install` in the directory

### Creating a New Root-Level CLI Tool
1. Create file: `touch my-tool.ts`
2. Add shebang: `#!/usr/bin/env bun`
3. Add entry guard as first import
4. Follow existing patterns in `guide-cli.ts`
5. Export nothing (CLI-only)

### Running Code in Specific Project Context
```bash
# Via overseer
bun overseer-cli.ts <project> bun run <script>

# Via guide-cli (more control)
bun guide-cli.ts --project <name> --bin <binary> --args <args...>
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

- [Bun Documentation](https://bun.sh/docs)
- [BUN_MAIN_GUIDE.md](./docs/BUN_MAIN_GUIDE.md) - Comprehensive Bun.main patterns
- [BUN_SPAWN_GUIDE.md](./BUN_SPAWN_GUIDE.md) - Complete Bun.spawn reference
- [BUN_WHICH_GUIDE.md](./BUN_WHICH_GUIDE.md) - Advanced binary resolution
- [BUN_ESCAPEHTML_GUIDE.md](./docs/BUN_ESCAPEHTML_GUIDE.md) - XSS prevention with Bun.escapeHTML()
- [BUN_MARKDOWN_HTML_GUIDE.md](./docs/BUN_MARKDOWN_HTML_GUIDE.md) - Bun.markdown.html() options reference
- [README.md](./README.md) - Project overview and quick start

---

**Note for AI Agents:** This codebase emphasizes `Bun.main` for project isolation. Always derive paths from the entrypoint rather than hardcoding or using `process.cwd()`. Follow the entry guard pattern strictly for all CLI tools.

**Kimi Shell Note:** When working with this codebase, you can use the MCP tools listed above to execute commands, check statuses, and manage profiles. Use `shell_execute` for project-specific commands with proper `workingDir` context.
