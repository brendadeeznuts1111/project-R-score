# GitHub Topics & Categories Guide

## Overview

GitHub topics help organize and discover issues, PRs, and discussions. This guide defines the topic structure for the NEXUS Trading Platform.

---

## Topic Categories

### 🏷️ Component Topics

| Topic | Description | Color | Department |
|-------|-------------|-------|------------|
| `api` | API routes and endpoints | `#00d4ff` | API & Routes |
| `arbitrage` | Cross-market arbitrage detection | `#ff1744` | Arbitrage & Trading |
| `orca` | Sports betting normalization | `#9c27b0` | ORCA & Sports Betting |
| `dashboard` | Dashboard and UI components | `#667eea` | Dashboard & UI |
| `registry` | Registry system and MCP tools | `#ff00ff` | Registry & MCP Tools |
| `security` | Security and RBAC | `#ff6b00` | Security |
| `cache` | Caching and performance | `#00ff88` | Performance & Caching |
| `docs` | Documentation | `#00ff88` | Documentation & DX |

### 🏷️ Type Topics

| Topic | Description | Use Case |
|-------|-------------|----------|
| `bug` | Bug reports | Issues with bugs |
| `enhancement` | Feature requests | New features |
| `documentation` | Documentation updates | Docs changes |
| `refactoring` | Code refactoring | Code cleanup |
| `performance` | Performance improvements | Optimization |
| `security` | Security fixes | Security patches |

### 🏷️ Status Topics

| Topic | Description | Use Case |
|-------|-------------|----------|
| `ready-for-review` | PR ready for review | PRs ready |
| `needs-testing` | Requires testing | PRs needing tests |
| `blocked` | Blocked by dependencies | Blocked items |
| `triage` | Needs triage | New issues |
| `discussion` | Discussion topic | Discussions |

### 🏷️ Priority Topics

| Topic | Description | Use Case |
|-------|-------------|----------|
| `priority-high` | High priority | Urgent items |
| `priority-medium` | Medium priority | Normal items |
| `priority-low` | Low priority | Nice-to-have |

### 🏷️ Integration Topics

| Topic | Description | Use Case |
|-------|-------------|----------|
| `telegram` | Telegram integration | Telegram features |
| `mcp-tools` | MCP tools | MCP integration |
| `exchange-integration` | Exchange connectors | Exchange features |
| `venue-integration` | Venue integration | Venue features |
| `bun-typescript` | Bun TypeScript type updates | TypeScript type changes, breaking changes |
| `bun-breaking-changes` | Bun breaking changes | Migration guides, breaking change documentation |

---

## Topic Combinations

### Common Combinations

**Bug Reports**:
- `bug` + component topic (e.g., `bug`, `api`)
- `bug` + `triage` (for new bugs)

**Feature Requests**:
- `enhancement` + component topic (e.g., `enhancement`, `orca`)
- `enhancement` + priority topic (e.g., `enhancement`, `priority-high`)

**PRs**:
- Component topic + `ready-for-review` (e.g., `api`, `ready-for-review`)
- Component topic + `needs-testing` (e.g., `dashboard`, `needs-testing`)

**Discussions**:
- `discussion` + component topic (e.g., `discussion`, `arbitrage`)
- `discussion` + integration topic (e.g., `discussion`, `telegram`)

---

## Topic Usage Guidelines

### For Issues

1. **Always include**: Component topic + Type topic
2. **Optional**: Priority topic, Status topic
3. **Example**: `bug`, `api`, `triage`, `priority-high`

### For PRs

1. **Always include**: Component topic + Type topic
2. **Optional**: Status topic, Priority topic
3. **Example**: `enhancement`, `orca`, `ready-for-review`

### For Discussions

1. **Always include**: `discussion` + Component topic
2. **Optional**: Integration topic
3. **Example**: `discussion`, `registry`, `mcp-tools`

---

## Topic Colors

Topics use the same color scheme as departments:

| Topic Category | Color | Hex |
|----------------|-------|-----|
| API | Cyan | `#00d4ff` |
| Arbitrage | Red | `#ff1744` |
| ORCA | Purple | `#9c27b0` |
| Dashboard | Indigo | `#667eea` |
| Registry | Magenta | `#ff00ff` |
| Security | Orange | `#ff6b00` |
| Cache/Performance | Green | `#00ff88` |
| Documentation | Green | `#00ff88` |

---

## Topic Search Examples

### GitHub Search Queries

```bash
# Find all API-related bugs
is:issue label:bug label:api

# Find enhancement PRs ready for review
is:pr label:enhancement label:ready-for-review

# Find high-priority security issues
is:issue label:security label:priority-high

# Find ORCA discussions
is:discussion label:discussion label:orca

# Exclude bugs from search
is:pr -label:bug
```

---

## Topic Maintenance

### Adding New Topics

1. Update this file with topic definition
2. Add topic to `.github/labels.json`
3. Document in relevant department section
4. Update search examples if needed

### Deprecating Topics

1. Mark as deprecated in this file
2. Remove from `.github/labels.json`
3. Migrate existing items to new topics
4. Update documentation

---

## Related

- [Team Structure](TEAM.md) - Department organization
- [PR Labels](PR-LABELS.md) - Label color guide
- [PR Review](pull_request_review.md) - Review process

---

**Last Updated**: 2025-01-XX  
**Version**: 1.1.0

## Recent Updates

### Bun TypeScript Breaking Changes (2025-01-XX)

Added topics for tracking Bun TypeScript type updates:
- `bun-typescript` - TypeScript type changes and improvements
- `bun-breaking-changes` - Breaking changes and migration guides

**Related Documentation**:
- [Bun Latest Breaking Changes](../docs/BUN-LATEST-BREAKING-CHANGES.md) - Complete migration guide
- [Bun.serve() TypeScript Types](https://bun.sh/docs/api/http-server) - Official documentation

**Key Changes**:
- `Bun.serve<T>()` - Generic type parameter for WebSocket data
- `Bun.ServeOptions` deprecated → `Bun.Serve.Options<T>`
- 17+ breaking changes documented with migration guides
