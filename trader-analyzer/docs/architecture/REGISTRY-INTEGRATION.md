# Private Registry Integration Guide

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

This guide covers integration with the private npm registry (`npm.internal.yourcompany.com`) for scoped packages (`@graph`, `@bench`, `@dev`).

---

## Configuration

### bunfig.toml

```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"

[install.scopes."@bench"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"

[install.scopes."@dev"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

### Environment Variables

```bash
export GRAPH_NPM_TOKEN="your-token-here"
```

Or use Bun.secrets:

```typescript
// Load from Bun.secrets
const token = Bun.secrets.GRAPH_NPM_TOKEN;
```

---

## Package Metadata

Each package includes team and ownership metadata:

```json
{
  "metadata": {
    "team": {
      "lead": "team-lead@company.com",
      "maintainers": ["maintainer@company.com"],
      "owners": ["owner@company.com"]
    },
    "ownership": {
      "scope": "@graph",
      "team": "layer4-team",
      "repository": "github.com/company/monorepo/packages/graph/layer4"
    }
  }
}
```

---

## Registry API

### Upload Benchmark Results

```typescript
POST /api/v1/benchmarks
Authorization: Bearer {token}
Content-Type: application/json

{
  "package": "@graph/layer4",
  "version": "1.2.3",
  "timestamp": 1234567890,
  "results": [...]
}
```

### Get Package Metadata

```typescript
GET /api/v1/packages/{scope}/{name}/metadata
Authorization: Bearer {token}
```

### Update Team

```typescript
PUT /api/v1/packages/{scope}/{name}/team
Authorization: Bearer {token}
Content-Type: application/json

{
  "lead": "new-lead@company.com",
  "maintainers": ["maintainer@company.com"]
}
```

---

## Publishing

```bash
# Publish to private registry
bun publish --registry=https://npm.internal.yourcompany.com

# Verify ownership
bun run @dev/registry verify-ownership
```

---

## Access Control

| Role | Permissions |
|------|-------------|
| Team Lead | Read, Write, Publish (own scope) |
| Maintainer | Read, Write (assigned packages) |
| Owner | Read, Write, Publish, Delete |

---

## Related Documentation

- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`bunfig.toml`](../../bunfig.toml) - Bun configuration
