# Complete RSS Integration: Team Architecture & Feed System

**Unified RSS feed system connecting team management, test automation, benchmarks, and geographic data**

---

## Overview

The RSS integration system provides a centralized hub for all team communications, benchmarks, and updates through RSS feeds and Telegram notifications.

---

## Architecture Components

### 1. **Centralized Constants Hub** (`src/utils/rss-constants.ts`)

Master integration file containing:

- **Team RSS Feeds**: Sports Correlation, Market Analytics, Platform & Tools
- **Package-Specific Feeds**: `@graph/layer4`, `@graph/layer3`, `@bench/layer4`, etc.
- **Geographic Feeds**: UK, US East, Curacao bookmakers
- **Event Feeds**: Releases, incidents, RFC updates
- **User Agents**: Team bot, benchmark bot, monitoring bot, CI/CD
- **Regex Patterns**: Team mentions, package mentions, benchmark results, RFC status, incident severity
- **Team Categories**: Extended team architecture with Telegram topic mapping

### 2. **RSS Integrator Package** (`packages/@graph/rss-integrator`)

Team feed integration utilities:

- `getTeamFeed()`: Fetch and parse team feeds with metadata enrichment
- `subscribeToPackageFeed()`: Real-time package feed updates
- `getAllTeamFeeds()`: Fetch all team feeds in parallel
- Automatic item type detection (benchmark, RFC, release, incident)

### 3. **Benchmark Publisher** (`scripts/benchmark-publisher.ts`)

Publishes benchmark results to RSS:

- Saves to registry database
- Sends Telegram notifications
- Refreshes RSS feed cache
- Integrated with test runner

### 4. **Mini-App Integration**

RSS feed panels in team mini-apps:

- Sports Correlation Mini-App (`apps/@mini/sports-correlation`)
- Market Analytics Mini-App (planned)
- Platform Tools Mini-App (planned)

---

## Usage Examples

### Get Team Feed

```typescript
import { getTeamFeed } from '@graph/rss-integrator/team-feed';

const sportsFeed = await getTeamFeed('sports_correlation');

console.log(sportsFeed.teamName); // "Sports Correlation Team"
console.log(sportsFeed.telegramTopic); // 1
console.log(sportsFeed.packages); // ["@graph/layer4", "@graph/layer3"]
```

### Subscribe to Package Updates

```typescript
import { subscribeToPackageFeed } from '@graph/rss-integrator/team-feed';

const unsubscribe = subscribeToPackageFeed('@graph/layer4', (update) => {
  if (update.type === 'benchmark') {
    console.log(`Layer 4 benchmark: ${update.avgDuration}ms`);
  }
});

// Later, unsubscribe
unsubscribe();
```

### Publish Benchmark Results

```typescript
import { publishBenchmarkToRSS } from './scripts/benchmark-publisher';

await publishBenchmarkToRSS('@graph/layer4', {
  packageName: '@graph/layer4',
  avgDuration: 1200.45,
  stdDev: 25.34,
  repeats: 50,
  passed: 50,
  failed: 0,
  minDuration: 1150.12,
  maxDuration: 1250.89,
  timestamp: Date.now(),
});
```

### Test Runner Integration

The test runner automatically publishes benchmark results:

```bash
# Benchmark results are automatically published to RSS
bun run test:benchmark

# Results are:
# 1. Saved to SQLite database
# 2. Published to RSS feed
# 3. Sent to Telegram topic
```

---

## RSS Feed Structure

### Team Feeds

Each team has three feed types:

1. **Main Feed**: General team updates
2. **Announcements**: Important announcements
3. **Benchmarks**: Performance benchmark results

### Package Feeds

Individual packages have dedicated feeds:

- `@graph/layer4` → `https://t.me/s/GraphEngineLayer4`
- `@graph/layer3` → `https://t.me/s/GraphEngineLayer3`
- `@bench/layer4` → `https://t.me/s/GraphEngineBenchLayer4`

### Geographic Feeds

Bookmaker location feeds:

- UK Bookmakers → `https://t.me/s/GraphEngineUK`
- US East Bookmakers → `https://t.me/s/GraphEngineUSEast`
- Curacao Bookmakers → `https://t.me/s/GraphEngineCuracao`

### Event Feeds

System-wide event feeds:

- Releases → `https://t.me/s/GraphEngineReleases`
- Incidents → `https://t.me/s/GraphEngineIncidents`
- RFC Updates → `https://t.me/s/GraphEngineRFC`

---

## Integration Checklist

### ✅ **Completed Components**:

- [x] **RSS Constants**: Extended with team feeds, geographic feeds, event feeds
- [x] **Team Architecture**: Each team has RSS feed + Telegram topic mapping
- [x] **Test Automation**: Results published to RSS + Telegram notifications
- [x] **Benchmarks**: Auto-published to RSS with team attribution
- [x] **RSS Integrator**: Package for team feed fetching and subscription
- [x] **Benchmark Publisher**: Script for publishing benchmark results
- [x] **Mini-App Integration**: RSS feed panels in team mini-apps
- [x] **Test Runner Integration**: Automatic RSS publishing for benchmarks

### 🔄 **In Progress**:

- [ ] **Registry Dashboard**: Full RSS integration with feed display
- [ ] **Geographic Filters**: Map visualization with RSS-enriched data
- [ ] **Market Analytics Mini-App**: RSS feed integration
- [ ] **Platform Tools Mini-App**: RSS feed integration

---

## Quick Reference: RSS Integration Commands

```bash
# Get all RSS feeds for sports team
rg "sports_correlation" src/utils/rss-constants.ts

# Find package RSS feeds
rg "@graph/layer4" src/utils/rss-constants.ts

# Check benchmark patterns
rg "benchmark_results" src/utils/rss-constants.ts

# Find geographic RSS feeds
rg "geographic" src/utils/rss-constants.ts

# Find team categories
rg "RSS_TEAM_CATEGORIES" src/utils/rss-constants.ts
```

---

## Related Documentation

- [`docs/TEST-RUNNER.md`](./TEST-RUNNER.md) - Test automation with RSS integration
- [`docs/RSS-TEAM-INTEGRATION.md`](./RSS-TEAM-INTEGRATION.md) - RSS feed testing and dashboard integration
- [`docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md`](./TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md) - Team structure
- [`packages/@graph/telegram/README.md`](../packages/@graph/telegram/README.md) - Telegram integration
- [`src/utils/rss-constants.ts`](../src/utils/rss-constants.ts) - Centralized RSS constants

---

## Next Steps

1. **Registry Dashboard Integration**: Add RSS feed panels to registry dashboard
2. **Geographic Visualization**: Map bookmaker locations with RSS-enriched data
3. **Market Analytics Mini-App**: Implement RSS feed integration
4. **Platform Tools Mini-App**: Implement RSS feed integration
5. **Feed Aggregation**: Create aggregated feed combining all team feeds
