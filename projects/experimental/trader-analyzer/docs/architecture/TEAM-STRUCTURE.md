# Team Structure & Package Ownership

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Team Overview

| Package             | Team               | Team Lead      | Maintainer(s)  | Scope                         | Reviewers   |
| ------------------- | ------------------ | -------------- | -------------- | ----------------------------- | ----------- |
| `@graph/layer4`     | Sports Correlation | Alex Chen      | Jordan Lee     | Cross-sport anomaly detection | Alex, Mike  |
| `@graph/layer3`     | Sports Correlation | Alex Chen      | Priya Patel    | Cross-event temporal patterns | Alex, Mike  |
| `@graph/layer2`     | Market Analytics   | Sarah Kumar    | Tom Wilson     | Cross-market correlation      | Sarah, Mike |
| `@graph/layer1`     | Market Analytics   | Sarah Kumar    | Lisa Zhang     | Direct selection correlations | Sarah, Mike |
| `@graph/algorithms` | Platform & Tools   | Mike Rodriguez | David Kim      | Statistical models library    | Mike        |
| `@graph/storage`    | Platform & Tools   | Mike Rodriguez | Emma Brown     | Graph state persistence       | Mike        |
| `@graph/streaming`  | Platform & Tools   | Mike Rodriguez | Emma Brown     | WebSocket data ingestion      | Mike        |
| `@graph/utils`      | Platform & Tools   | Mike Rodriguez | Mike Rodriguez | Error wrapper & utilities     | Mike        |
| `@bench/layer4`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Sport correlation benchmarks  | Mike        |
| `@bench/layer3`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Event temporal benchmarks     | Mike        |
| `@bench/layer2`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Market efficiency benchmarks  | Mike        |
| `@bench/layer1`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Price correlation benchmarks  | Mike        |
| `@bench/property`   | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Property iteration engine     | Mike        |
| `@bench/stress`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Load & scale tests            | Mike        |

---

## Team Details

### Sports Correlation Team

**Team Lead**: Alex Chen  
**Packages**: `@graph/layer4`, `@graph/layer3`  
**Reviewers**: Alex Chen, Mike Rodriguez

**Maintainers**:
- **Jordan Lee** - Maintainer for `@graph/layer4`
- **Priya Patel** - Maintainer for `@graph/layer3`

**Responsibilities**:
- Cross-sport anomaly detection
- Cross-event temporal pattern detection
- Sports correlation algorithms

---

### Market Analytics Team

**Team Lead**: Sarah Kumar  
**Packages**: `@graph/layer2`, `@graph/layer1`  
**Reviewers**: Sarah Kumar, Mike Rodriguez

**Maintainers**:
- **Tom Wilson** - Maintainer for `@graph/layer2`
- **Lisa Zhang** - Maintainer for `@graph/layer1`

**Responsibilities**:
- Cross-market correlation analysis
- Direct selection correlation detection
- Market efficiency detection

---

### Platform & Tools Team

**Team Lead**: Mike Rodriguez  
**Packages**: `@graph/algorithms`, `@graph/storage`, `@graph/streaming`, `@graph/utils`, `@bench/*`  
**Reviewer**: Mike Rodriguez

**Maintainers**:
- **David Kim** - Maintainer for `@graph/algorithms`
- **Emma Brown** - Maintainer for `@graph/storage`, `@graph/streaming`
- **Ryan Gupta** - Maintainer for all `@bench/*` packages
- **Mike Rodriguez** - Maintainer for `@graph/utils`

**Responsibilities**:
- Statistical models library
- Graph state persistence
- WebSocket data ingestion
- Error handling and utilities
- All benchmarking infrastructure

---

## Access Control

### Team Lead Permissions

- **Full Access**: Can publish, modify, and delete packages in their team
- **Review Rights**: Can review and approve PRs for their packages
- **Maintainer Management**: Can add/remove maintainers for their packages

### Maintainer Permissions

- **Read-Write Access**: Can develop and submit PRs
- **No Publish Rights**: Cannot publish without team lead approval
- **Code Review**: Can review PRs from contributors

### Reviewer Permissions

- **Read Access**: Can view package code and benchmarks
- **Review Rights**: Can review and comment on PRs
- **No Write Access**: Cannot modify packages directly

---

## Package Ownership Model

Each package has:
1. **Team Lead**: Owns versioning and publishing decisions
2. **Maintainer(s)**: Day-to-day development and code reviews
3. **Reviewer(s)**: Additional reviewers for quality assurance

---

## Related Documentation

- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`docs/architecture/TEAM-WORKFLOWS.md`](./TEAM-WORKFLOWS.md) - Team workflows
- [`docs/architecture/REGISTRY-DATABASE-SCHEMA.sql`](./REGISTRY-DATABASE-SCHEMA.sql) - Database schema
