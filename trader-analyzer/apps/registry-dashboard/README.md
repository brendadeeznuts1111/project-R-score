# Registry Dashboard

**Team-aware private npm registry dashboard with benchmarks and version history**

---

## Overview

The Registry Dashboard provides a complete view of packages in your private registry, including:
- 📦 Package metadata and versions
- 👥 Team ownership (Team Lead, Maintainer)
- 📊 Benchmark results with interactive charts
- 📜 Version history with publish tracking
- 💬 Telegram integration (handles, supergroups, topics)

---

## Quick Start

### Start the Dashboard

```bash
# From project root
bun run apps/registry-dashboard/src/index.ts

# Or if you have a start script
bun run registry:dashboard
```

### Access Package Pages

```bash
# Open in browser
open http://localhost:4000/package/@graph/layer4
open http://localhost:4000/package/@graph/layer3
open http://localhost:4000/package/@bench/layer4
```

---

## Database Setup

### Initialize Database

```bash
# Create database with schema
sqlite3 registry.db < apps/registry-dashboard/registry.db.schema.sql

# Or use Bun
bun run apps/registry-dashboard/scripts/init-db.ts
```

---

## API Endpoints

### Package Detail Page

```
GET /package/:name
```

Returns HTML page with:
- Package info and version
- Team ownership card
- Latest benchmark results (chart)
- Version history table
- Action buttons (run benchmark, publish)

### Run Benchmark

```
POST /api/benchmarks/run
Body: { "package": "@graph/layer4" }
```

Queues a benchmark job for the package.

### Download Package

```
GET /api/packages/:name/:version/tarball
```

Downloads the package tarball.

### Assign Team

```
POST /api/team/assign
Body: {
  "package": "@graph/layer4",
  "team": "Sports Correlation",
  "lead": "alex.chen@yourcompany.com",
  "maintainer": "jordan.lee@yourcompany.com"
}
```

Assigns or updates team ownership for a package.

---

## Features

### Team Ownership Display

Each package shows:
- **Team**: Sports Correlation, Market Analytics, or Platform & Tools
- **Team Lead**: Email and Telegram handle
- **Maintainer**: Email
- **Telegram**: Supergroup and topic assignment

### Benchmark Visualization

- Interactive Chart.js line chart
- Property iteration results
- Performance metrics over time
- Comparison across versions

### Version History

- All published versions
- Publish timestamp and publisher
- Benchmark status per version
- Download links for each version

---

## Team Integration

The dashboard integrates with the team organization system:

- Uses `PACKAGE_TEAMS` mapping from team organization docs
- Shows Telegram handles and supergroup/topic info
- Links to team lead Telegram profiles
- Displays team-specific communication channels

---

## Usage Examples

### Programmatic Access

```typescript
// Fetch package details
const res = await fetch('http://localhost:4000/api/packages/@graph/layer4');
const pkg = await res.json();

// Get benchmark data
const benchmarks = await fetch(
  'http://localhost:4000/api/benchmarks/@graph/layer4/1.4.0-beta.3'
).then(r => r.json());
```

### Run Benchmark from Dashboard

1. Navigate to package page
2. Click "🏃 Run Benchmark" button
3. Benchmark job is queued
4. Results appear when complete

### Publish New Version

1. Navigate to package page
2. Click "📤 Publish New Version" button
3. Version is bumped and published
4. New version appears in history

---

## Related Documentation

- [Team Organization](../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md) - Team structure and ownership
- [Registry Team Access](../src/api/registry-team-access.ts) - Access control API
- [Maintainer Workflow](../scripts/maintainer-workflow.ts) - Maintainer automation
- [Team Lead Review](../scripts/team-lead-review.ts) - Review workflow

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
