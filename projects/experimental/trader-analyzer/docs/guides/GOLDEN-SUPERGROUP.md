# Golden Supergroup Configuration

**Standardized Telegram supergroup setup for NEXUS trading platform**

---

## Overview

The Golden Supergroup is a reference configuration for Telegram supergroups used in the NEXUS trading platform. It provides:

- ✅ Standardized topic structure (7 topics including Changelog and CI/CD)
- ✅ Bot permission verification
- ✅ Automated logging setup
- ✅ Rate limiting configuration
- ✅ Best practices implementation
- ✅ **Telegram Mini App (TMA) integration** - Full-featured trading UI embedded in Telegram
- ✅ **Deep-link integration** - RFC 001 compliant deep-links in all alerts

---

## Quick Start

```bash
# Setup golden supergroup
bun run golden-supergroup setup

# Verify configuration
bun run golden-supergroup verify
```

---

## Standard Topic Structure

The golden supergroup includes these standard topics:

| Thread ID | Name | Category | Auto-Pin | Description |
|-----------|------|----------|----------|-------------|
| 1 | General | general | No | General discussion and announcements |
| 2 | Live Alerts | live | Yes | Real-time trading alerts and signals |
| 3 | Arbitrage Opportunities | alerts | Yes | Cross-market arbitrage opportunities |
| 4 | Analytics & Stats | analytics | No | Trading statistics and performance metrics |
| 5 | System Status | general | Yes | Bot status, health checks, and system updates |
| 6 | Changelog | general | No | Git commit changelog and release notes |
| 7 | CI/CD & RSS Feed | general | Yes | CI/CD pipeline updates, deployments, and RSS feed notifications |

---

## Configuration

### Environment Variables

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="-1001234567890"
```

### Bun.secrets (Alternative)

```typescript
await Bun.secrets.set({
  service: "nexus",
  name: "telegram.botToken",
  value: "your_bot_token",
});

await Bun.secrets.set({
  service: "nexus",
  name: "telegram.chatId",
  value: "-1001234567890",
});
```

---

## Bot Permissions Required

The bot needs these permissions:

- ✅ **canSendMessages** - Send messages to topics
- ✅ **canPinMessages** - Pin important messages
- ✅ **canManageTopics** - Create/edit/delete topics
- ✅ **canDeleteMessages** - Clean up test messages (optional)
- ❌ **canRestrictMembers** - Not required for golden config

---

## Setup Process

### 1. Verify Bot Permissions

```bash
bun run golden-supergroup verify
```

This checks:
- Can send messages
- Can pin messages
- Can manage topics

### 2. Setup Topics

```bash
bun run golden-supergroup setup
```

This will:
- Create all standard topics
- Set topic icons and colors
- Send description messages to each topic
- Setup logging directory
- Send welcome message

### 3. Verify Configuration

```bash
bun run golden-supergroup verify
```

---

## Customization

### Modify Topic Structure

Edit `src/telegram/constants.ts`:

```typescript
export const GOLDEN_SUPERGROUP_CONFIG: GoldenSupergroupConfig = {
  // ... other config
  topics: [
    {
      threadId: 1,
      name: "Your Custom Topic",
      description: "Custom description",
      iconColor: 0,
      category: "general",
      autoPin: false,
    },
    // ... more topics
  ],
};
```

### Adjust Rate Limits

```typescript
rateLimits: {
  messagesPerSecond: 1,
  messagesPerMinute: 20,
  messagesPerHour: 1000,
},
```

### Configure Logging

```typescript
logging: {
  enabled: true,
  directory: "data/telegram-logs",
  retentionDays: 30,
},
```

---

## Usage Examples

### Send to Standard Topics

```bash
# Live alerts (topic 2)
bun run telegram send "Alert: Arbitrage opportunity detected" --topic 2 --pin

# System status (topic 5)
bun run telegram send "✅ System healthy" --topic 5 --pin

# Analytics (topic 4)
bun run telegram send "📊 Daily stats: +5.2% ROI" --topic 4
```

### View Topic History

```bash
# View live alerts history
bun run telegram history --topic=2 --limit=20

# View all recent messages
bun run telegram history --limit=50
```

---

## Best Practices

### 1. Use Appropriate Topics

- **Live Alerts (2)**: Time-sensitive trading signals with TMA deep-links
- **Arbitrage (3)**: Cross-market opportunities with one-click trading via TMA
- **Analytics (4)**: Daily/weekly statistics and balance updates
- **System Status (5)**: Bot health, TMA status, and system updates
- **Changelog (6)**: Git commit changelog and release notes
- **CI/CD & RSS Feed (7)**: Deployment notifications and RSS feed updates

### 2. Pin Important Messages

Use `--pin` flag for:
- Critical alerts
- System status updates
- Important announcements

### 3. Rate Limiting

Respect rate limits:
- Max 1 message per second
- Max 20 messages per minute
- Max 1000 messages per hour

### 4. Logging

All messages are automatically logged to:
- `data/telegram-logs/telegram-YYYY-MM-DD.jsonl`

---

## Troubleshooting

### "Cannot send messages"

**Solution:** Ensure bot has `canSendMessages` permission in supergroup settings.

### "Cannot pin messages"

**Solution:** Grant `canPinMessages` permission to the bot.

### "Cannot manage topics"

**Solution:** 
1. Ensure supergroup has topics enabled
2. Grant `canManageTopics` permission to the bot
3. Bot must be admin or have topic management rights

### Topics Already Exist

**Solution:** The setup script will skip existing topics. To recreate:
1. Delete topics manually in Telegram
2. Run setup again

---

## Integration with CLI

The golden supergroup works seamlessly with the Telegram CLI:

```bash
# List topics
bun run telegram list-topics

# Discover valid topics
bun run telegram discover-topics --max=10

# Send to golden supergroup topics
bun run telegram send "Message" --topic 2 --pin
```

---

## Telegram Mini App (TMA) Integration

The Golden Supergroup integrates with the **Telegram Mini App (TMA)** for in-Telegram trading control (`9.1.1.11.0.0.0`).

### TMA Entry Points

The TMA can be accessed from the golden supergroup via:

1. **Menu Button**: Configured bot menu button opens TMA directly
2. **Inline Keyboard**: Buttons in alert messages link to TMA trading interface
3. **Deep-Links**: RFC 001 compliant deep-links in alerts open TMA with pre-filled bet slips

### TMA Configuration

**Staging URL**: `https://staging.factory-wager-miniapp.pages.dev`  
**Production URL**: `https://factory-wager-miniapp.pages.dev`

**Menu Button Setup**:
```typescript
// Configure menu button to open TMA
await telegramBot.setMenuButton({
  type: 'web_app',
  text: 'Open Trading UI',
  web_app: {
    url: 'https://staging.factory-wager-miniapp.pages.dev'
  }
});
```

### TMA Features in Golden Supergroup Context

- **Alert-to-Trade Flow**: Alerts posted to topics (2, 3) include deep-links that open TMA with pre-filled trading opportunities
- **Balance Notifications**: TMA balance updates can trigger notifications to topic 4 (Analytics & Stats)
- **Trade Confirmations**: Successful trades executed via TMA are logged to topic 2 (Live Alerts) or topic 3 (Arbitrage Opportunities)
- **System Integration**: TMA status and health checks appear in topic 5 (System Status)

### Deep-Link Integration

All alerts in the golden supergroup include RFC 001 compliant deep-links (`9.1.1.9.1.0.0`) that:
- Open TMA directly to the relevant opportunity
- Pre-fill bet slip with market node, bookmaker, and odds
- Enable one-click trading from alert to execution

**Example Alert with Deep-Link**:
```
🚨 CRITICAL Covert Steam Alert!

Event: NFL-2025-001
Bookmaker: DraftKings
Severity: 9.5

[View Details & Trade](https://staging.factory-wager-miniapp.pages.dev/alert/covert-steam/?id=NFL-2025-001-1704556800000&type=covert-steam&ts=1704556800000&bm=DraftKings)
```

### TMA Deployment

Deploy TMA updates to staging:
```bash
bun run deploy:miniapp:staging
```

Deploy to production:
```bash
bun run deploy:miniapp:production
```

**See Also**: `docs/FACTORY-WAGER-MINIAPP-INTEGRATION.md` for complete TMA integration guide.

---

## See Also

- `TELEGRAM-CLI.md` - CLI tool documentation
- `TELEGRAM-NAMING-STANDARD.md` - Naming conventions
- `docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md` - Complete Telegram integration documentation (Section 9.1.1.11.0.0.0: TMA)
- `docs/FACTORY-WAGER-MINIAPP-INTEGRATION.md` - Factory Wager Mini App integration guide
- `docs/rfc/001-telegram-deeplink-standard.md` - RFC 001: Deep-Link Standard
- `src/telegram/constants.ts` - Configuration constants
- `src/telegram/golden-supergroup.ts` - Setup script
