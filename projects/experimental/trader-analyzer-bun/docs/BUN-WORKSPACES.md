# Bun Workspaces Configuration

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)

**📊 Related Dashboard**: [Workspace Dashboard](./../dashboard/workspace.html) - Interactive workspace management

**Quick Links**: [Workspace Dashboard](./../dashboard/workspace.html) | [Documentation Index](./DOCUMENTATION-INDEX.md) | [Quick Navigation](./QUICK-NAVIGATION.md)

## Overview

This project uses Bun workspaces to manage a monorepo structure with isolated package installations. The workspace configuration enables efficient dependency management and local package linking.

---

## Current Workspace Setup

### Root Workspace

The project root acts as the main workspace:

```json
{
  "name": "@nexus/trader-analyzer",
  "workspaces": [
    "bench"
  ]
}
```

### Workspace Packages

- **Root**: `@nexus/trader-analyzer` (main application)
- **Bench**: `bench/` (benchmarking suite with separate dependencies)

---

## Bun Workspace Features

### 1. Isolated Installs (Default)

Bun uses **isolated installs** by default for workspaces, preventing packages from accessing dependencies they don't declare.

**Configuration** (`config/bunfig.toml`):
```toml
[install]
linker = "isolated"  # Default for workspaces
```

**Benefits**:
- ✅ Prevents dependency leakage
- ✅ Better security (packages can't access undeclared deps)
- ✅ Clearer dependency boundaries
- ✅ Matches Bun v1.3+ best practices

**See**: [Bun Isolated Installs Documentation](./BUN-ISOLATED-INSTALLS.md) for complete details on isolated installs, migration guides, and troubleshooting.

### 2. Local Package Dependencies

Use the `workspace:` protocol to reference local packages:

```json
{
  "dependencies": {
    "@nexus/utils": "workspace:*"
  }
}
```

### 3. Catalog Dependencies (Bun 1.3+)

Define common dependency versions in root `package.json`:

```json
{
  "catalog": {
    "typescript": "^5.0.0",
    "@types/bun": "latest"
  },
  "workspaces": [
    "packages/*"
  ]
}
```

Then reference in workspace packages:

```json
{
  "dependencies": {
    "typescript": "catalog:"
  }
}
```

**See**: [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) for complete details on catalogs and workspace protocol version resolution.

### 4. Workspace Protocol Version Resolution

The `workspace:` protocol supports version resolution:

```json
{
  "dependencies": {
    "@nexus/utils": "workspace:*",        // Matches any version
    "@nexus/api": "workspace:^1.0.0",    // Semver range
    "@nexus/ui": "workspace:1.0.2"       // Exact version (resolves to 1.0.2 even if current is 1.0.1)
  }
}
```

**Important**: `workspace:1.0.2` resolves to `1.0.2` even if the current workspace package version is `1.0.1`. This allows you to specify the version you want to use when publishing.

**See**: [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) for complete workspace protocol documentation.

---

## Workspace Commands

### Install Dependencies

```bash
# Install for all workspaces
bun install

# Install for specific workspace
bun install --filter bench

# Install with workspace protocol
bun install --filter @nexus/trader-analyzer
```

### Add Dependencies

```bash
# Add to root workspace
bun add zod

# Add to specific workspace
bun add zod --filter bench

# Add local workspace dependency
bun add @nexus/utils --filter @nexus/api --workspace
```

### Run Scripts

```bash
# Run script in root
bun run dev

# Run script in specific workspace
bun run --filter bench test

# Run script in all workspaces
bun run --filter "*" test
```

---

## Integration with Developer Workspace

The developer workspace system (`src/workspace/devworkspace.ts`) can be extended to manage workspace-specific API keys:

### Workspace-Scoped Keys

```typescript
// Create key for specific workspace access
const key = await manager.createKey({
  email: "developer@example.com",
  purpose: "onboarding",
  metadata: {
    workspace: "bench",  // Limit to bench workspace
    allowedPackages: ["@nexus/utils"]
  }
});
```

### Workspace API Endpoints

```typescript
// Workspace-specific endpoints
GET /api/workspace/keys?workspace=bench
GET /api/workspace/workspaces
GET /api/workspace/workspaces/:name/packages
```

---

## Configuration Files

### Root `package.json`

```json
{
  "name": "@nexus/trader-analyzer",
  "workspaces": [
    "bench"
  ],
  "catalog": {
    "typescript": "^5.0.0"
  }
}
```

### `bunfig.toml`

```toml
[install]
linker = "isolated"  # Isolated installs for workspaces
auto = "fallback"
```

### `bun.lock`

```json
{
  "lockfileVersion": 1,
  "configVersion": 1,  # Modern workspace format
  "workspaces": {
    "": { ... },
    "bench": { ... }
  }
}
```

---

## Best Practices

### 1. Use Isolated Installs

Always use `linker = "isolated"` for workspaces to prevent dependency leakage.

### 2. Catalog Common Versions

Define common dependency versions in root `catalog` to ensure consistency:

```json
{
  "catalog": {
    "typescript": "^5.0.0",
    "@types/bun": "latest",
    "zod": "^4.1.13"
  }
}
```

### 3. Workspace Protocol for Local Packages

Always use `workspace:` protocol for local package dependencies:

```json
{
  "dependencies": {
    "@nexus/shared": "workspace:*"
  }
}
```

### 4. Filter Commands

Use `--filter` flag to target specific workspaces:

```bash
# Install only for bench workspace
bun install --filter bench

# Run tests in all workspaces
bun test --filter "*"
```

---

## Workspace Structure

```text
trader-analyzer/
├── package.json          # Root workspace config
├── bun.lock             # Workspace lockfile
├── bunfig.toml          # Bun configuration
├── src/                 # Main application
├── bench/               # Benchmark workspace
│   └── package.json    # Workspace package.json
└── packages/           # (Future) Additional workspaces
    ├── utils/
    └── api/
```

---

## Bun RSS Integration

The workspace module includes Bun RSS feed integration to track Bun runtime versions and release announcements.

### CLI Tools

```bash
# Fetch and display Bun RSS feed (latest 10 items)
bun run bun:rss

# Display specific number of items
bun run bun:rss 5

# Get latest Bun version number
bun run bun:version
```

### API Endpoints

**GET `/api/workspace/config`** — Includes Bun version information:

```json
{
  "config": {
    "runtime": {
      "bun": {
        "current": "1.3.4",
        "latest": "1.3.4",
        "isUpToDate": true,
        "rssFeed": "https://bun.com/rss.xml"
      }
    }
  }
}
```

**GET `/api/workspace/bun`** — Detailed Bun runtime information:

```json
{
  "bun": {
    "current": "1.3.4",
    "latest": "1.3.4",
    "isUpToDate": true,
    "rssFeed": "https://bun.com/rss.xml",
    "features": {
      "secrets": "Bun.secrets (v1.3+)",
      "csrf": "Bun.CSRF (v1.3+)",
      "securityScanner": "Bun.Security.Scanner (v1.3+)",
      "urlPattern": "URLPattern API (v1.3.4+)",
      "fakeTimers": "Fake Timers for bun:test (v1.3.4+)"
    },
    "documentation": {
      "releases": "https://bun.com/rss.xml",
      "docs": "https://bun.com/docs",
      "changelog": "https://bun.com/blog"
    }
  }
}
```

### Usage Examples

```bash
# Check Bun RSS feed
bun run bun:rss

# Get latest Bun version
bun run bun:version

# Access via API (when server is running)
curl http://localhost:3001/api/workspace/config
curl http://localhost:3001/api/workspace/bun
```

**See**: [Bun RSS Integration](./BUN-RSS-INTEGRATION.md) for complete documentation.

---

## Developer Workspace Integration

### Workspace-Scoped API Keys

Extend the developer workspace system to support workspace-specific access:

```typescript
// Create key with workspace restrictions
const key = await manager.createKey({
  email: "developer@example.com",
  purpose: "onboarding",
  metadata: {
    allowedWorkspaces: ["bench"],
    allowedPackages: ["@nexus/utils"],
    workspacePermissions: {
      "bench": ["read", "execute"],
      "packages/utils": ["read"]
    }
  }
});
```

### Workspace API Routes

```typescript
// List available workspaces
GET /api/workspace/workspaces

// Get workspace packages
GET /api/workspace/workspaces/:name/packages

// Check workspace access for key
GET /api/workspace/keys/:keyId/workspaces
```

---

## Troubleshooting

### Workspace Not Found

**Error**: `Workspace "bench" not found`

**Solution**: Ensure workspace is listed in root `package.json`:
```json
{
  "workspaces": ["bench"]
}
```

### Dependency Not Found

**Error**: `Cannot find module '@nexus/utils'`

**Solution**: Use `workspace:` protocol:
```json
{
  "dependencies": {
    "@nexus/utils": "workspace:*"
  }
}
```

### Isolated Install Issues

**Error**: Package can't access dependency

**Solution**: Add dependency to workspace's `package.json`:
```bash
bun add <package> --filter <workspace>
```

---

## Related Documentation

- [Bun Workspaces Official Docs](https://bun.com/docs/pm/workspaces)
- [Bun PM](./BUN-PM.md) — Package manager utilities (`bun pm ls`, `bun pm version`, `bun pm pkg`)
- [Bun RSS Integration](./BUN-RSS-INTEGRATION.md) — Bun RSS feed integration and version tracking
- [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) — Complete guide to catalogs and workspace protocol
- [Bun Isolated Installs](./BUN-ISOLATED-INSTALLS.md) — Complete guide to isolated installs
- [Bun Lockfile & Lifecycle Scripts](./BUN-LOCKFILE-LIFECYCLE.md) — Lockfile format and catalog tracking
- [Bunfig Configuration](./BUNFIG-CONFIGURATION.md)
- [Developer Workspace System](./WORKSPACE-BUN-V1.3.4-INTEGRATION.md)
- [Bun v1.2.11 Improvements](./BUN-1.2.11-IMPROVEMENTS.md)

---

## Search Commands

```bash
# Find workspace configuration
rg "workspaces" package.json

# Find workspace protocol usage
rg "workspace:" package.json

# Find catalog definitions
rg "catalog" package.json

# Find isolated install config
rg "isolated" config/bunfig.toml
```

---

**Status**: ✅ Configured (Auto-detected)  
**Linker**: `isolated` (default for workspaces)  
**Workspaces**: `bench/` (auto-detected from bun.lock)  
**Catalog**: Not yet configured (can be added)  
**Lockfile Version**: `configVersion: 1` (modern workspace format)

---

## Quick Reference

### Verify Workspace Setup

```bash
# List all workspaces
bun pm ls

# Check workspace dependencies
bun pm ls --filter bench

# Install all workspace dependencies
bun install
```

### Common Workspace Commands

```bash
# Add dependency to root
bun add zod

# Add dependency to bench workspace
bun add mitata --filter bench

# Run script in bench workspace
bun run --filter bench all

# Install dependencies for all workspaces
bun install
```
