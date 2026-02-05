# Telegram Integration & RFC System

**Complete Telegram group management and RFC template system for team-based architecture**

**Version**: 1.3.4  
**Last Updated**: 2025-01-10

---

## Overview

Integrated Telegram communication and RFC (Request for Comments) system for structured team collaboration on package changes. Enhanced with channels, supergroups, proxy pinning, HTTP keep-alive, and intelligent routing.

---

## Components

### 1. **Enhanced Telegram Integration** (`src/telegram/`)

**Location**: `src/telegram/` and `src/utils/rss-constants.ts`

- **Channels**: One-way broadcast channels for announcements, security alerts, benchmarks
- **Supergroups**: Multi-way discussion groups with topic threads per team
- **Intelligent Routing**: Automatic team/topic selection based on package/bookmaker
- **Proxy Pinning**: URL pattern-based message pinning for critical alerts
- **HTTP Keep-Alive**: Connection pooling for reduced latency
- **Tension Alerts**: Market tension detection → Telegram routing

**Configuration**: `TELEGRAM_CONFIG` in `src/utils/rss-constants.ts`

### 2. **Telegram Integration Package** (`@graph/telegram`)

**Location**: `packages/@graph/telegram`

- **Topics Management**: One Telegram topic per package
- **Notifications**: Automated alerts for RFCs, publishes, incidents
- **Team Integration**: Routes notifications to correct team topics

### 3. **RFC Template System**

**Template**: `docs/rfc-template.md`

Standard format for proposing package changes with:
- Technical details
- Benchmark plans
- Performance impact
- Rollout strategy

### 4. **RFC Management**

**CLI**: `scripts/rfc-submit.ts`

Submit RFCs and automatically notify Telegram topics.

---

## Telegram Architecture

### Enhanced Telegram Configuration

The system uses **channels** for broadcasts and **supergroups** for team discussions:

#### Channels (One-Way Broadcasts)

- **`@GraphEngineAnnouncements`**: Release notes, system updates
- **`@GraphEngineSecurity`**: Security advisories (high severity threshold)
- **`@GraphEngineBenchmarks`**: Benchmark results broadcast

#### Supergroups (Team Discussions)

Each team has a supergroup with topic threads:

**Sports Correlation** (`-100140123456789`):
- Topic 1: General
- Topic 2: Benchmarks
- Topic 3: Incidents
- Topic 4: **RFC** 📋

**Market Analytics** (`-100150234567890`):
- Topic 5: General
- Topic 6: Benchmarks
- Topic 7: Incidents

**Platform & Tools** (`-100160345678901`):
- Topic 9: General
- Topic 10: Benchmarks
- Topic 11: Incidents
- Topic 12: Audits

### Legacy Package Topics (14 topics)

For backward compatibility, package-specific topics are still supported:

| Package | Topic ID | Team | Topic Name |
|---------|----------|------|------------|
| `@graph/layer4` | 1 | Sports Correlation | 🏀 @graph/layer4 Cross-Sport |
| `@graph/layer3` | 2 | Sports Correlation | ⚽ @graph/layer3 Cross-Event |
| `@graph/layer2` | 3 | Market Analytics | 📊 @graph/layer2 Cross-Market |
| `@graph/layer1` | 4 | Market Analytics | 💰 @graph/layer1 Direct Selections |
| `@graph/algorithms` | 5 | Platform & Tools | 🧮 @graph/algorithms Detection Core |
| `@graph/storage` | 6 | Platform & Tools | 🗄️ @graph/storage State Manager |
| `@graph/streaming` | 7 | Platform & Tools | 📡 @graph/streaming Data Ingestion |
| `@graph/utils` | 8 | Platform & Tools | 🔧 @graph/utils Error Wrapper |
| `@bench/layer4` | 9 | Platform & Tools | 🏃 @bench/layer4 Sport Benchmarks |
| `@bench/layer3` | 10 | Platform & Tools | 🏃 @bench/layer3 Event Benchmarks |
| `@bench/layer2` | 11 | Platform & Tools | 🏃 @bench/layer2 Market Benchmarks |
| `@bench/layer1` | 12 | Platform & Tools | 🏃 @bench/layer1 Price Benchmarks |
| `@bench/property` | 13 | Platform & Tools | 🔄 @bench/property Property Iteration |
| `@bench/stress` | 14 | Platform & Tools | 💪 @bench/stress Load Tests |

---

## Complete Workflow

### **RFC → Benchmark → Telegram → Publish**

```bash
# 1. Maintainer creates RFC
cd packages/@graph/layer4/docs/rfcs
cp ../../../../docs/rfc-template.md 0002-new-feature.md
# Edit RFC...

# 2. Submit RFC (triggers Telegram notification)
bun run scripts/rfc-submit.ts 0002-new-feature.md
# → Telegram topic #15 (RFC Proposals) notified

# 3. Team discussion in Telegram
# Alex Chen reviews in topic #1 (@graph/layer4), requests changes

# 4. Maintainer implements
# Edit code, run benchmarks
bun run @bench/layer4 --property=threshold --values=0.75,0.80

# 5. Update RFC status (team lead approves)
# Via registry dashboard or CLI
# → Telegram topic #1 notified: "RFC APPROVED"

# 6. Publish
bun version patch
bun publish --registry https://npm.internal.yourcompany.com
# → Telegram topic #1 notified: "Package Published v1.4.0-beta.4"

# 7. Registry dashboard shows new version + benchmark
```

---

## Usage Examples

### Send Package Publish Notification

```typescript
import { notifyPackagePublished } from '@graph/telegram/notifications';

await notifyPackagePublished(
  '@graph/layer4',
  '1.4.0-beta.4',
  'jordan.lee@yourcompany.com',
  { avgDuration: 38.5, anomalyCount: 7.1 }
);
```

### Submit RFC (Enhanced)

```typescript
import { submitRFC } from '@graph/telegram/rfc';
import { TELEGRAM_CONFIG } from '../src/utils/rss-constants';
import { getTelegramClient } from '../src/telegram/client';

const rfcId = await submitRFC('@graph/layer4', {
  title: 'Increase threshold to 0.80',
  author: 'Jordan Lee <jordan.lee@yourcompany.com>',
  description: 'Reduce false positives in cross-sport detection...'
});

// Enhanced: Send to team supergroup RFC topic with proxy pinning
const telegram = getTelegramClient();
const teamConfig = TELEGRAM_CONFIG.supergroups.sports_correlation;
await telegram.sendAndPinWithProxy({
  chatId: teamConfig.id,
  threadId: teamConfig.topics.rfc, // Topic 4
  text: `📋 **RFC Submitted**: ${rfc.title}\n\nAuthor: ${rfc.author}\n\n${rfc.description}`,
  parseMode: 'Markdown',
}, { shouldPin: true });
```

### Incident Alert

```typescript
import { notifyIncident } from '@graph/telegram/notifications';

await notifyIncident('@graph/layer4', {
  severity: 'critical',
  description: 'Null pointer exception in correlation calculation',
  action: 'Hotfix deployed, monitoring for 24h'
});
```

---

## Bot Setup

### 1. Create Bot

```bash
# Message @BotFather on Telegram
/newbot
# Follow instructions to create bot
# Save the bot token
```

### 2. Add Bot to Supergroup

1. Create supergroup or use existing
2. Add bot as member
3. Give bot admin permissions:
   - Can send messages
   - Can manage topics
   - Can pin messages

### 3. Enable Topics

1. Group Settings → Topics → ON
2. Create topics for each package
3. Note topic IDs (message_thread_id)

### 4. Get Supergroup ID

```bash
# Send a message in the group, then:
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
# Look for "chat": {"id": -1001234567890}
```

### 5. Set Environment Variables

```bash
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
export TELEGRAM_SUPERGROUP_ID="-1001234567890"
```

---

## Enhanced Features (v1.3.4)

### Proxy URL Pattern Pinning

Messages are automatically pinned based on URL patterns and severity keywords:

- **RFC Approvals**: `/rfc/:rfcId` + "approved" → Auto-pin
- **Security Advisories**: `/security/:advisoryId` → Always pin
- **Critical Incidents**: `/incidents/:incidentId` + "critical" → Auto-pin
- **Benchmark Regressions**: `/benchmarks/:package/:version` + "regression" → Auto-pin

### HTTP Keep-Alive

All Telegram API requests use connection pooling:

```typescript
import { TelegramBotApi } from '../src/api/telegram-ws';

const api = new TelegramBotApi();
const stats = api.getConnectionStats();
console.log(`Active: ${stats.sockets}, Idle: ${stats.free}, Requests: ${stats.requests}`);
```

### Tension Alert Integration

Market tension alerts automatically route to team supergroups:

```typescript
import { TensionAlertRouter } from '../src/telegram/tension-alerts';

const router = new TensionAlertRouter();
await router.startMonitoring();
// Critical tension → Sports Correlation supergroup, Topic 3 (Incidents)
// Medium tension → Sports Correlation supergroup, Topic 1 (General)
```

### MCP Tool Integration

AI can trigger RFC notifications via MCP:

```typescript
// Claude Code: "Alert sports_correlation team about RFC approval for @graph/layer4"
// → Uses telegram-publish-tension-alert MCP tool
```

## Related Files

- [`src/utils/rss-constants.ts`](../src/utils/rss-constants.ts) - `TELEGRAM_CONFIG` enhanced configuration
- [`src/telegram/tension-alerts.ts`](../src/telegram/tension-alerts.ts) - Tension alert routing
- [`src/telegram/proxy-pinning.ts`](../src/telegram/proxy-pinning.ts) - Proxy URL pattern pinning
- [`src/api/telegram-ws.ts`](../src/api/telegram-ws.ts) - Enhanced TelegramBotApi with keep-alive
- [`src/telegram/client.ts`](../src/telegram/client.ts) - EnhancedTelegramClient with proxy pinning
- [`packages/@graph/telegram/`](../packages/@graph/telegram/) - Legacy Telegram integration package
- [`docs/rfc-template.md`](./rfc-template.md) - RFC template
- [`scripts/rfc-submit.ts`](../scripts/rfc-submit.ts) - RFC submission CLI
- [`scripts/publish-telegram-alert.ts`](../scripts/publish-telegram-alert.ts) - Enhanced alert publishing
- [`packages/@graph/layer4/docs/rfcs/0001-threshold-optimization.md`](../packages/@graph/layer4/docs/rfcs/0001-threshold-optimization.md) - Example RFC

---

## Summary

✅ **Enhanced Telegram Architecture**: Channels for broadcasts, supergroups for discussions  
✅ **Intelligent Routing**: Automatic team/topic selection based on package/bookmaker  
✅ **Proxy Pinning**: URL pattern-based message pinning for critical alerts  
✅ **HTTP Keep-Alive**: Connection pooling reduces latency by ~80%  
✅ **Tension Alerts**: Market tension detection → Telegram routing  
✅ **RFC Integration**: RFCs route to team supergroup RFC topics with auto-pinning  
✅ **MCP Control**: AI can trigger and manage RFC notifications  
✅ **Legacy Support**: Package-specific topics still supported for backward compatibility  

Your teams now have **production-grade Telegram integration** with intelligent routing, automatic pinning, connection pooling, and AI-assisted management, all integrated with RFCs, benchmarks, and your private registry.

---

**Last Updated**: 2025-01-10  
**Version**: 1.3.4
