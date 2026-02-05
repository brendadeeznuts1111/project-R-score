# **Multi-Layer Graph System: Team Organization & Package Ownership**

Updated architecture with team leads and maintainers for each package in your private registry.

---

## **1. Mermaid Architecture: Team Structure**

```mermaid
C4Component
title Multi-Layer Graph: Team Leads & Package Maintainers

Person(team_lead_sports, "Alex Chen", "Team Lead - Sports Correlation\nOwns @graph/layer4, @graph/layer3")
Person(team_lead_markets, "Sarah Kumar", "Team Lead - Market Analytics\nOwns @graph/layer2, @graph/layer1")
Person(team_lead_platform, "Mike Rodriguez", "Team Lead - Platform & Tools\nOwns @graph/algorithms, @graph/storage, @graph/utils, @bench/*")

Person(dev_sports_1, "Jordan Lee", "Developer - Sports Layer\nMaintainer: @graph/layer4")
Person(dev_sports_2, "Priya Patel", "Developer - Event Patterns\nMaintainer: @graph/layer3")
Person(dev_markets_1, "Tom Wilson", "Developer - Market Correlation\nMaintainer: @graph/layer2")
Person(dev_markets_2, "Lisa Zhang", "Developer - Price Selections\nMaintainer: @graph/layer1")
Person(dev_platform_1, "David Kim", "Developer - Algorithms\nMaintainer: @graph/algorithms")
Person(dev_platform_2, "Emma Brown", "Developer - Storage & Streaming\nMaintainer: @graph/storage, @graph/streaming")
Person(dev_platform_3, "Ryan Gupta", "Developer - Benchmarking\nMaintainer: @bench/layer4, @bench/property")

Container_Boundary(private_registry, "Private Registry\nnpm.internal.yourcompany.com") {
  ContainerDb(registry_db, "Registry DB", "PostgreSQL", "Package metadata, versions, team ownership")
  Container(registry_api, "Registry API", "Bun + Elysia", "npm registry + team access control")
  Container(registry_ui, "Registry UI", "Bun + HTMX", "Package browsing, team assignments, benchmark results")
}

Container_Boundary(bun_workspace, "Bun Workspace Monorepo\ngit@github.com:yourorg/graph-engine") {
  Container(api_gateway, "API Gateway", "Bun + Elysia", "REST/WebSocket endpoints")
  Container(worker_service, "Worker Service", "Bun + BullMQ", "Background anomaly detection")
  Container(dashboard, "Developer Dashboard", "Bun + HTMX", "Real-time viz, benchmarks, team metrics")
  
  Container_Boundary(packages, "@graph/* Packages\nTeam: Sports Correlation") {
    Component(layer4, "@graph/layer4\nOwner: Alex Chen\nMaintainer: Jordan Lee", "Cross-Sport Anomaly Detection", "Detects anomalies between sports")
    Component(layer3, "@graph/layer3\nOwner: Alex Chen\nMaintainer: Priya Patel", "Cross-Event Patterns", "Temporal pattern detection")
  }
  
  Container_Boundary(packages_markets, "@graph/* Packages\nTeam: Market Analytics") {
    Component(layer2, "@graph/layer2\nOwner: Sarah Kumar\nMaintainer: Tom Wilson", "Cross-Market Analysis", "Intra-event market correlation")
    Component(layer1, "@graph/layer1\nOwner: Sarah Kumar\nMaintainer: Lisa Zhang", "Direct Selections", "Price correlation at selection level")
  }
  
  Container_Boundary(packages_platform, "@graph/* Packages\nTeam: Platform & Tools") {
    Component(algorithms, "@graph/algorithms\nOwner: Mike Rodriguez\nMaintainer: David Kim", "Detection Core", "Statistical models library")
    Component(storage, "@graph/storage\nOwner: Mike Rodriguez\nMaintainer: Emma Brown", "Graph State Manager", "SQLite + TimescaleDB persistence")
    Component(streaming, "@graph/streaming\nOwner: Mike Rodriguez\nMaintainer: Emma Brown", "Data Ingestion", "WebSocket bookmaker adapters")
    Component(utils, "@graph/utils\nOwner: Mike Rodriguez\nMaintainer: Mike Rodriguez", "Error Wrapper", "Defensive error handling")
  }
  
  Container_Boundary(benchmarks, "@bench/* Packages\nTeam: Platform & Tools") {
    Component(bench_layer4, "@bench/layer4\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Layer 4 Benchmarks", "Sport correlation property iteration")
    Component(bench_layer3, "@bench/layer3\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Layer 3 Benchmarks", "Event temporal benchmarks")
    Component(bench_layer2, "@bench/layer2\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Layer 2 Benchmarks", "Market efficiency benchmarks")
    Component(bench_layer1, "@bench/layer1\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Layer 1 Benchmarks", "Price correlation benchmarks")
    Component(bench_props, "@bench/property\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Property Iteration", "Fast property testing & optimization")
    Component(bench_stress, "@bench/stress\nOwner: Mike Rodriguez\nMaintainer: Ryan Gupta", "Stress Tests", "Load & scale validation")
  }
}

ContainerDb(timescaledb, "TimescaleDB", "Time-series: graph snapshots, correlation history, benchmark results")
ContainerDb(redis, "Redis", "Job queues (BullMQ), cache, pub/sub")
Container(otel, "OpenTelemetry", "Metrics & tracing (Prometheus/Grafana)")

# Team collaboration flows
Rel(team_lead_sports, registry_ui, "Review @graph/layer4 releases", "Browser")
Rel(team_lead_sports, layer4, "Approve changes", "GitHub PR review")
Rel(dev_sports_1, layer4, "Maintain & develop", "Code commits")
Rel(dev_sports_1, bench_layer4, "Run benchmarks", "CLI")
Rel(bench_layer4, layer4, "Test performance", "Function calls")
Rel(bench_layer4, timescaledb, "Store results", "SQL")

# Registry interaction
Rel(dev_sports_1, registry_api, "bun publish @graph/layer4", "npm protocol")
Rel(registry_api, registry_db, "Store @graph/layer4 metadata", "SQL")
Rel(registry_db, timescaledb, "Archive version history", "SQL")

# Cross-team dependencies
Rel(layer4, algorithms, "Use @graph/algorithms", "Function calls (team dependency)")
Rel(algorithms, team_lead_platform, "Request features", "GitHub issue")
Rel(dev_platform_1, algorithms, "Maintain", "Code commits")

# Monitoring
Rel(dashboard, otel, "View team metrics", "Grafana API")
Rel(dashboard, registry_ui, "View package versions", "Browser")
Rel(otel, timescaledb, "Store team performance", "SQL")

UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
UpdateElementStyle(packages, $bgColor="#e3f2fd", $fontColor="#0d47a1")
UpdateElementStyle(packages_markets, $bgColor="#f3e5f5", $fontColor="#4a148c")
UpdateElementStyle(packages_platform, $bgColor="#e8f5e9", $fontColor="#1b5e20")
UpdateElementStyle(benchmarks, $bgColor="#fff3e0", $fontColor="#e65100")
```

---

## **2. Team & Package Ownership Matrix**

| Package             | Team               | Team Lead      | Maintainer(s)  | Scope                         | Reviewers   | Telegram Handle | Supergroup/Topic |
| ------------------- | ------------------ | -------------- | -------------- | ----------------------------- | ----------- | --------------- | ---------------- |
| `@graph/layer4`     | Sports Correlation | Alex Chen      | Jordan Lee     | Cross-sport anomaly detection | Alex, Mike  | @alexchen       | #sports-correlation / Topic 2 (Live Alerts) |
| `@graph/layer3`     | Sports Correlation | Alex Chen      | Priya Patel    | Cross-event temporal patterns | Alex, Mike  | @alexchen       | #sports-correlation / Topic 2 (Live Alerts) |
| `@graph/layer2`     | Market Analytics   | Sarah Kumar    | Tom Wilson     | Cross-market correlation      | Sarah, Mike | @sarahkumar     | #market-analytics / Topic 3 (Arbitrage) |
| `@graph/layer1`     | Market Analytics   | Sarah Kumar    | Lisa Zhang     | Direct selection correlations | Sarah, Mike | @sarahkumar     | #market-analytics / Topic 3 (Arbitrage) |
| `@graph/algorithms` | Platform & Tools   | Mike Rodriguez | David Kim      | Statistical models library    | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@graph/storage`    | Platform & Tools   | Mike Rodriguez | Emma Brown     | Graph state persistence       | Mike        | @mikerodriguez  | #platform-tools / Topic 5 (System Status) |
| `@graph/streaming`  | Platform & Tools   | Mike Rodriguez | Emma Brown     | WebSocket data ingestion      | Mike        | @mikerodriguez  | #platform-tools / Topic 5 (System Status) |
| `@graph/utils`      | Platform & Tools   | Mike Rodriguez | Mike Rodriguez | Error wrapper & utilities     | Mike        | @mikerodriguez  | #platform-tools / Topic 5 (System Status) |
| `@bench/layer4`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Sport correlation benchmarks  | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@bench/layer3`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Event temporal benchmarks     | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@bench/layer2`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Market efficiency benchmarks  | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@bench/layer1`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Price correlation benchmarks  | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@bench/property`   | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Property iteration engine     | Mike        | @mikerodriguez  | #platform-tools / Topic 4 (Analytics) |
| `@bench/stress`     | Platform & Tools   | Mike Rodriguez | Ryan Gupta     | Load & scale tests            | Mike        | @mikerodriguez  | #platform-tools / Topic 5 (System Status) |

---

## **2.1. Telegram Integration**

Each team has dedicated Telegram supergroup topics for communication:

| Team               | Supergroup              | Primary Topic                    | Team Lead Handle | Maintainer Handles                    |
| ------------------ | ----------------------- | -------------------------------- | ---------------- | ------------------------------------- |
| Sports Correlation | `#sports-correlation`   | Topic 2: Live Alerts             | @alexchen        | @jordanlee, @priyapatel                |
| Market Analytics   | `#market-analytics`     | Topic 3: Arbitrage Opportunities | @sarahkumar      | @tomwilson, @lisazhang                |
| Platform & Tools   | `#platform-tools`       | Topic 4: Analytics & Stats       | @mikerodriguez   | @davidkim, @emmabrown, @ryangupta      |

**Topic Structure** (from Golden Supergroup):
- **Topic 1**: General - General discussion and announcements
- **Topic 2**: Live Alerts - Real-time trading alerts and signals (Sports Correlation)
- **Topic 3**: Arbitrage Opportunities - Cross-market arbitrage opportunities (Market Analytics)
- **Topic 4**: Analytics & Stats - Trading statistics and performance metrics (Platform & Tools)
- **Topic 5**: System Status - Bot status, health checks, and system updates (Platform & Tools)
- **Topic 6**: Changelog - Git commit changelog and release notes
- **Topic 7**: CI/CD & RSS Feed - CI/CD pipeline updates, deployments, and RSS feed notifications

**Usage**:
```bash
# Notify team via Telegram
slack-notify "#sports-correlation" "✅ @graph/layer4 v1.4.0-beta.4 published"

# Send to specific topic (threadId)
telegram-send --topic=2 --message="Performance improvement: 8.5% faster"
```

---

## **3. Private Registry: Team Access Control**

### **Registry API: Team-Based Permissions**

**Implementation**: [`src/api/registry-team-access.ts`](../src/api/registry-team-access.ts)

Complete implementation with:
- ✅ Team package ownership mapping (14 packages)
- ✅ Team lead and maintainer verification
- ✅ Package publishing authorization
- ✅ Maintainer management endpoints
- ✅ Publication history tracking
- ✅ Database schema initialization

**Usage**:

```typescript
import { Elysia } from 'elysia';
import { createTeamAccessRoutes } from './api/registry-team-access';

const app = new Elysia();
app.use(createTeamAccessRoutes);
```

**Endpoints**:

- `POST /api/v1/publish/:package` - Publish package (requires team lead or maintainer)
- `GET /api/v1/packages/:package/maintainers` - Get package maintainers
- `GET /api/v1/teams/:team/packages` - Get all packages for a team
- `GET /api/v1/packages/:package/publications` - Get publication history

**Team Configuration**:

```typescript
// Team-based package ownership
const TEAM_PACKAGES = {
  'sports-correlation': ['@graph/layer4', '@graph/layer3'],
  'market-analytics': ['@graph/layer2', '@graph/layer1'],
  'platform-tools': [
    '@graph/algorithms',
    '@graph/storage',
    '@graph/streaming',
    '@graph/utils',
    '@bench/layer4',
    '@bench/layer3',
    '@bench/layer2',
    '@bench/layer1',
    '@bench/property',
    '@bench/stress',
  ],
};

const TEAM_LEADS = {
  'sports-correlation': 'alex.chen@yourcompany.com',
  'market-analytics': 'sarah.kumar@yourcompany.com',
  'platform-tools': 'mike.rodriguez@yourcompany.com',
};
```

---

## **4. Maintainer Workflow: Fast Property Iteration**

### **Automated Workflow Script**

**Implementation**: [`scripts/maintainer-workflow.ts`](../scripts/maintainer-workflow.ts)

Automated workflow script that handles all 10 steps of the maintainer process.

**Quick Start**:

```bash
# Property iteration workflow (steps 1-5)
bun run scripts/maintainer-workflow.ts \
  --package=@graph/layer4 \
  --property=threshold \
  --values=0.7,0.75,0.8,0.85

# Full workflow (steps 1-7)
bun run scripts/maintainer-workflow.ts \
  --package=@graph/layer4 \
  --workflow=full

# Publish workflow (step 10)
bun run scripts/maintainer-workflow.ts \
  --package=@graph/layer4 \
  --workflow=publish \
  --registry=https://npm.internal.yourcompany.com
```

**Manual Workflow** (Jordan Lee @graph/layer4 maintainer - Daily Workflow):

```bash
# 1. Pull latest
git pull origin main

# 2. Start development
cd packages/@graph/layer4
bun run dev

# 3. Modify property in src/config.ts
# threshold: 0.75 → 0.8

# 4. Run benchmark for this property only
bun run @bench/layer4 --property=threshold --values=0.7,0.75,0.8,0.85

# 5. View results (auto-saved to registry)
bun run meta:layer4

# 6. If improvement, run full benchmark suite
bun run bench:layer4

# 7. Test integration
bun test --repeats=5

# 8. Commit with benchmark results
git add .
git commit -m "perf(layer4): increase threshold to 0.8

Benchmark results:
- detection time: 42.1ms → 38.5ms (-8.5%)
- anomaly count: 8.2 → 7.1 (-13%)
- confidence: 0.91 → 0.93 (+2%)"

# 9. Create PR (Alex Chen reviews)
gh pr create --title "perf(layer4): optimize threshold" \
  --body "Benchmark results show 8.5% improvement..." \
  --reviewer alex.chen

# 10. After approval, publish to registry
bun version patch  # 1.4.0-beta.3 → 1.4.0-beta.4
bun publish --registry https://npm.internal.yourcompany.com
```

**Workflow Options**:

- `--package` - Package name (required)
- `--property` - Property name for iteration
- `--values` - Comma-separated values to test
- `--workflow` - `property` | `full` | `publish` (default: `property`)
- `--skip-tests` - Skip test integration step
- `--skip-benchmark` - Skip full benchmark suite
- `--auto-commit` - Automatically commit and create PR
- `--reviewer` - PR reviewer (defaults to team lead)
- `--registry` - Registry URL for publishing

---

## **5. Team Lead Review Process**

### **Automated Review Script**

**Implementation**: [`scripts/team-lead-review.ts`](../scripts/team-lead-review.ts)

Automated workflow script for team leads to review PRs, verify benchmarks, and merge.

**Quick Start**:

```bash
# List PRs for review
bun run scripts/team-lead-review.ts \
  --list \
  --team=sports-correlation \
  --assignee=alex.chen

# Review PR with benchmark verification
bun run scripts/team-lead-review.ts \
  --pr=42 \
  --team=sports-correlation \
  --verify-benchmark

# Approve and auto-merge
bun run scripts/team-lead-review.ts \
  --pr=42 \
  --team=sports-correlation \
  --action=approve \
  --auto-merge
```

**Manual Workflow** (Alex Chen - Sports Correlation Team Lead):

```bash
# Review PR for @graph/layer4
gh pr list --repo yourorg/graph-engine --assignee alex.chen --label "team:sports-correlation"

# Check benchmark results
gh pr view 42 --json body | jq -r '.body' | rg -A 20 "Benchmark results:"

# Run benchmark locally to verify
gh pr checkout 42
bun run bench:layer4

# If approved, merge
gh pr merge 42 --squash --delete-branch

# Notify team
slack-notify "#sports-correlation" "✅ @graph/layer4 v1.4.0-beta.4 published with 8.5% performance improvement"
```

**Review Options**:

- `--list` - List PRs for review
- `--pr` - PR number to review
- `--team` - Team name (sports-correlation, market-analytics, platform-tools)
- `--assignee` - GitHub username
- `--action` - `approve` | `request-changes` | `comment`
- `--verify-benchmark` - Run benchmark locally to verify (default: true)
- `--auto-merge` - Automatically merge after approval
- `--notify-channel` - Slack channel for notifications
- `--repo` - GitHub repository (default: yourorg/graph-engine)

---

## **6. Maintainer Responsibility Matrix**

| Responsibility         | Team Lead                | Maintainer                 | Notes                                   |
| ---------------------- | ------------------------ | -------------------------- | --------------------------------------- |
| **Package Review**     | Required for all changes | Required for major changes | All PRs need team lead approval         |
| **Version Bumping**    | Required                 | Can patch for hotfixes     | Team lead decides version strategy      |
| **Publishing**         | Required                 | Can publish patches        | Main publishing done by team lead       |
| **Benchmark Review**   | Required                 | Runs benchmarks            | Team lead validates results             |
| **Property Iteration** | Approves decisions       | Executes iterations        | Maintainer proposes changes             |
| **Documentation**      | Reviews                  | Writes                     | Maintainer documents their work         |
| **Incident Response**  | Leads response           | First responder            | Maintainer fixes, team lead coordinates  |

---

## **7. Emergency Hotfix Process**

### **Scenario: Critical bug in @graph/layer4**

```bash
# 1. Maintainer (Jordan Lee) creates hotfix branch
git checkout -b hotfix/layer4-critical

# 2. Fix bug + run tests
bun test --repeats=10

# 3. Create hotfix PR (bypass normal review for speed)
gh pr create --title "HOTFIX: @graph/layer4 critical bug" \
  --body "Fixes crash on null correlation. Tests pass." \
  --label "hotfix" \
  --reviewer alex.chen

# 4. Team lead (Alex Chen) reviews within 30 min
gh pr review 45 --approve

# 5. Maintainer publishes patch
cd packages/@graph/layer4
bun version patch  # 1.4.0 → 1.4.1
bun publish --registry https://npm.internal.yourcompany.com

# 6. Deploy to production
git tag v1.4.1-layer4-hotfix
git push origin v1.4.1-layer4-hotfix
```

---

## **8. Registry UI: Team Dashboard**

### **`apps/@registry-dashboard/src/pages/package/[name].tsx`**

```typescript
// Show team ownership and maintainer info
export default function PackagePage({ params }: { params: { name: string } }) {
  const pkg = usePackage(params.name);
  
  return (
    <div>
      <h1>{pkg.name} v{pkg.version}</h1>
      
      <section>
        <h2>👥 Team Ownership</h2>
        <p>Team: {pkg.team}</p>
        <p>Team Lead: {pkg.teamLead}</p>
        <p>Maintainer: {pkg.maintainer}</p>
      </section>
      
      <section>
        <h2>📊 Latest Benchmarks</h2>
        <BenchmarkChart data={pkg.benchmarks} />
      </section>
      
      <section>
        <h2>📦 Versions</h2>
        <VersionHistory versions={pkg.versions} />
      </section>
    </div>
  );
}
```

---

## **Summary: Team-Based Architecture**

✅ **Clear Ownership**: Every package has a team lead and maintainer  
✅ **Fast Iteration**: Maintainers run benchmarks, team leads approve  
✅ **Private Registry**: Team-based access control & metadata storage  
✅ **Modular Benchmarks**: `@bench/*` packages for each layer  
✅ **Emergency Process**: Hotfix bypass for critical issues  
✅ **Accountability**: Registry tracks who publishes what  

This structure enables **10+ iterations per day per maintainer** while maintaining clear ownership and quality gates through team lead reviews.

---

## **9. Telegram Integration & RFC System**

### **Telegram Package**

**Implementation**: [`packages/@graph/telegram`](../packages/@graph/telegram)

Complete Telegram integration for team communication:
- ✅ One Telegram topic per package (14 topics)
- ✅ RFC proposal notifications
- ✅ Package publish announcements
- ✅ Incident/hotfix alerts
- ✅ Benchmark regression detection

**Usage**:

```typescript
import { notifyPackagePublished } from '@graph/telegram/notifications';
import { getTopicId } from '@graph/telegram/topics';

// Notify package publish
await notifyPackagePublished('@graph/layer4', '1.4.0-beta.4', 'jordan.lee@yourcompany.com');
```

### **RFC Template System**

**Template**: [`docs/rfc-template.md`](./rfc-template.md)

Standard RFC format for proposing package changes:
- 📋 Summary and motivation
- 🔧 Technical details with before/after code
- 📊 Expected performance impact
- 🧪 Test plan and acceptance criteria
- 🚀 Rollout and rollback plans

**Submit RFC**:

```bash
# Create RFC from template
cp docs/rfc-template.md packages/@graph/layer4/docs/rfcs/0002-new-feature.md

# Edit RFC...

# Submit and notify Telegram
bun run scripts/rfc-submit.ts packages/@graph/layer4/docs/rfcs/0002-new-feature.md
```

### **Integrated Workflow**

1. **Maintainer creates RFC** → Notifies Telegram RFC topic
2. **Team discussion** → In package-specific Telegram topic
3. **Team lead reviews** → Approves/rejects via registry dashboard
4. **Implementation** → Maintainer implements changes
5. **Benchmarking** → Run benchmarks, compare results
6. **Publish** → Notifies package Telegram topic

See [`packages/@graph/telegram/README.md`](../packages/@graph/telegram/README.md) for complete documentation.
