# @graph/telegram

**Telegram Integration Package for Team Communication**

---

## Overview

Telegram integration for team-based package management, RFC submissions, and notifications.

---

## Features

- 📱 **Topic Management**: One Telegram topic per package
- 📋 **RFC Notifications**: Automated RFC submission alerts
- 🚀 **Release Announcements**: Package publish notifications
- 🚨 **Incident Alerts**: Critical issue notifications
- 📊 **Benchmark Alerts**: Performance regression detection

---

## Quick Start

### Setup

```bash
# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_SUPERGROUP_ID="-1001234567890"
```

### Send Notification

```typescript
import { notifyTopic } from '@graph/telegram/notifications';
import { getTopicId } from '@graph/telegram/topics';

// Send to package topic
const topicId = getTopicId('@graph/layer4');
await notifyTopic(topicId, '🚀 Package published!');
```

---

## Package Topics

Each package has a dedicated Telegram topic:

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
| `@bench/property` | 13 | Platform & Tools | 🔄 @bench/property Property Iteration |

---

## Usage Examples

### Package Published

```typescript
import { notifyPackagePublished } from '@graph/telegram/notifications';

await notifyPackagePublished(
  '@graph/layer4',
  '1.4.0-beta.4',
  'jordan.lee@yourcompany.com',
  { avgDuration: 38.5, anomalyCount: 7.1 }
);
```

### RFC Submission

```typescript
import { submitRFC } from '@graph/telegram/rfc';

const rfcId = await submitRFC('@graph/layer4', {
  title: 'Increase threshold to 0.80',
  author: 'Jordan Lee',
  description: 'Reduce false positives...'
});
```

### Incident Alert

```typescript
import { notifyIncident } from '@graph/telegram/notifications';

await notifyIncident('@graph/layer4', {
  severity: 'critical',
  description: 'Null pointer exception in correlation',
  action: 'Hotfix deployed, monitoring'
});
```

---

## Related Documentation

- [Team Organization](../../../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md)
- [RFC Template](../../../docs/rfc-template.md)
- [Telegram Setup Guide](../../../docs/guides/GOLDEN-SUPERGROUP.md)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
