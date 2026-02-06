# Golden Channel & Supergroup Setup Example

This example demonstrates how to create and configure a Telegram supergroup following the **Golden Supergroup** configuration standard.

## Overview

The Golden Supergroup configuration provides:
- ✅ **Standardized topic structure** (7 topics: General, Live Alerts, Arbitrage, Analytics, System Status, Changelog, CI/CD)
- ✅ **RFC 001 compliant deep-links** in all alert messages
- ✅ **Bot permission verification** before setup
- ✅ **Automatic topic creation** with descriptions
- ✅ **Example alert messages** demonstrating deep-link formatting

## Prerequisites

1. **Create a Telegram Supergroup**:
   - Open Telegram
   - Create a new supergroup
   - Enable "Topics" (Forum mode) in group settings
   - Add your bot as an admin with these permissions:
     - ✅ Can send messages
     - ✅ Can pin messages
     - ✅ Can manage topics
     - ✅ Can delete messages

2. **Get Chat ID**:
   ```bash
   # Option 1: Add @userinfobot to your group
   # Option 2: Use API call
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates"
   # Look for "chat":{"id":-1001234567890} - that's your chat ID
   ```

3. **Configure Credentials**:
   ```bash
   # Option A: Environment variables
   export TELEGRAM_BOT_TOKEN="your_bot_token_here"
   export TELEGRAM_CHAT_ID="-1001234567890"
   
   # Option B: Bun.secrets (Recommended)
   bun secret set telegram.botToken "your_bot_token_here"
   bun secret set telegram.chatId "-1001234567890"
   ```

## Usage

### Setup Golden Supergroup

Creates all topics from the Golden Supergroup configuration:

```bash
bun run golden-setup setup
```

**What it does**:
1. Verifies bot permissions
2. Creates 7 topics:
   - General (ID: 1)
   - Live Alerts (ID: 2)
   - Arbitrage Opportunities (ID: 3)
   - Analytics & Stats (ID: 4)
   - System Status (ID: 5)
   - Changelog (ID: 6)
   - CI/CD & RSS Feed (ID: 7)
3. Sends description messages to each topic
4. Sends welcome message to General topic

**Output**:
```text
🏗️  Setting up Golden Supergroup

   Chat ID: -1001234567890
   Topics to create: 7

🔍 Verifying bot permissions...
  ✅ Can send messages
  ✅ Can pin messages
  ✅ Can manage topics

📋 Setting up topics...
  Creating topic: General (Logical ID: 1)
    ✅ Created (Thread ID: 89)
  Creating topic: Live Alerts (Logical ID: 2)
    ✅ Created (Thread ID: 99)
  ...

📊 Topic Mapping (Logical ID → Actual Thread ID):
  1 → 89 (General)
  2 → 99 (Live Alerts)
  ...
```

### Verify Configuration

Check bot permissions and existing topics:

```bash
bun run golden-setup verify
```

**Output**:
```text
🔍 Verifying Golden Supergroup Configuration

   Chat ID: -1001234567890

🔍 Verifying bot permissions...
  ✅ Can send messages
  ✅ Can pin messages
  ✅ Can manage topics

🔍 Verifying existing topics...
Found 7 topics:
  📌 General
     Thread ID: 89
     ✅ Matches Golden Config (Logical ID: 1)
  ...
```

### Send Example Alert

Send an example alert message with RFC 001 compliant deep-link:

```bash
# Send to general chat
bun run golden-setup example-message

# Send to specific topic (use actual thread ID from verify output)
bun run golden-setup example-message --thread-id=99
```

**Example Alert Format**:
```text
🚨 CRITICAL Covert Steam Alert!

Event: `NFL-2025-001`
Bookmaker: `DraftKings`
Severity: `9.5` (Threshold: `8.0`)
Move: `0.5` points in Q1 (Lag: `45s`)
Status: `Confirmed Sharp Money` / `Potential Arbitrage`

Deep-Link: [View Details on Dashboard](http://localhost:8080/alert/covert-steam/?id=...)
```

## Topic Structure

| Logical ID | Name | Category | Auto-Pin | Description |
|------------|------|----------|----------|-------------|
| 1 | General | general | No | General discussion and announcements |
| 2 | Live Alerts | live | Yes | Real-time trading alerts and signals |
| 3 | Arbitrage Opportunities | alerts | Yes | Cross-market arbitrage opportunities |
| 4 | Analytics & Stats | analytics | No | Trading statistics and performance metrics |
| 5 | System Status | general | Yes | Bot status, health checks, and system updates |
| 6 | Changelog | general | No | Git commit changelog and release notes |
| 7 | CI/CD & RSS Feed | general | Yes | CI/CD pipeline updates, deployments, and RSS feed notifications |

## Deep-Link Integration

All alert messages include RFC 001 compliant deep-links:

- **Format**: `BASE_URL/path?param1=value1&param2=value2`
- **Base URL**: `http://localhost:8080` (dev) or `https://dashboard.hyperbun.com` (prod)
- **Required Parameters**: `id`, `type`, `ts`
- **Optional Parameters**: `bm`, `ev`, `node`, `severity`, `source`

**Example Deep-Link**:
```text
http://localhost:8080/alert/covert-steam/?id=NFL-2025-001-1704556800000&type=covert-steam&ts=1704556800000&bm=DraftKings&ev=NFL-2025-001&node=node_abc123&severity=9.5
```

## Next Steps

After setup:

1. **Update Topic Mapping**:
   ```typescript
   // src/telegram/topic-mapping.ts
   export const TOPIC_MAPPING = {
     1: 89,  // General (actual thread ID from setup)
     2: 99,  // Live Alerts
     // ...
   };
   ```

2. **Test Alert Sending**:
   ```bash
   bun run telegram send "Test alert" --thread-id=99
   ```

3. **Start Feed Monitor**:
   ```bash
   bun run feed-monitor start
   ```

## Troubleshooting

### "Bot token not found"
- Set `TELEGRAM_BOT_TOKEN` environment variable or use `bun secret set telegram.botToken`

### "Chat ID not found"
- Set `TELEGRAM_CHAT_ID` environment variable or use `bun secret set telegram.chatId`

### "Cannot send messages"
- Ensure bot is added as admin with "Can send messages" permission

### "Cannot manage topics"
- Ensure bot has "Can manage topics" permission
- Verify supergroup has Topics (Forum mode) enabled

### Topic already exists
- Use `verify` command to see existing topics
- Topics are not recreated if they already exist (safe to run multiple times)

## Related Documentation

- **RFC 001**: `docs/rfc/001-telegram-deeplink-standard.md`
- **Golden Supergroup Config**: `src/telegram/constants.ts` (`GOLDEN_SUPERGROUP_CONFIG`)
- **Telegram CLI**: `TELEGRAM-CLI.md`
- **Telegram Dev Setup**: `docs/TELEGRAM-DEV-SETUP.md`
- **Communication Subsystem**: `docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md`

## Code Reference

- **Example Script**: `examples/telegram-golden-setup.ts`
- **Golden Supergroup Setup**: `src/telegram/golden-supergroup.ts`
- **Deep-Link Generator**: `src/utils/deeplink-generator.ts`
- **Telegram Bot API**: `src/api/telegram-ws.ts`
