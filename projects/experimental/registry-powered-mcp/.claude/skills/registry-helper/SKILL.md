---
name: registry-helper
description: MCP registry package lookup and version resolution. Use when looking up packages, resolving versions, checking dependencies, querying the registry API, or getting package metadata.
---

# Registry Helper

Package lookup and version resolution for the MCP registry.

## API Endpoints

### Package Lookup

```bash
# Look up a package by name
curl "http://localhost:3333/mcp/skills/registry/lookup?name=@mcp/core"
```

**Response:**
```json
{
  "name": "@mcp/core",
  "versions": ["1.0.0", "1.1.0", "2.0.0"],
  "latest": "2.0.0",
  "description": "Package @mcp/core from MCP registry",
  "registry": "mcp-registry-core"
}
```

### Version Resolution

```bash
# Resolve a specific package version
curl "http://localhost:3333/mcp/skills/registry/resolve/@mcp/core"
```

**Response:**
```json
{
  "name": "@mcp/core",
  "resolved": "2.0.0",
  "integrity": "sha256-abc123...",
  "dependencies": {
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {}
}
```

## Core Registry Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/registry/:scope?/:name` | Resolve package by scope/name |
| `GET /mcp/health` | Registry health check |
| `GET /mcp/metrics` | Registry performance metrics |

## Examples

```bash
# Check registry health
curl http://localhost:3333/mcp/health

# Get registry metrics
curl http://localhost:3333/mcp/metrics

# Look up scoped package
curl http://localhost:3333/mcp/registry/@mcp/core

# Look up unscoped package
curl http://localhost:3333/mcp/registry/my-package
```

## Performance

- Version resolution: O(1) via `Bun.semver` (20x faster than node-semver)
- Integrity verification: SHA-256 via `Bun.CryptoHasher`
- Route matching: <1ms via native URLPattern
