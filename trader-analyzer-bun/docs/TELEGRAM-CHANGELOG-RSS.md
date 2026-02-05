# Telegram Changelog & RSS Feed Integration

**Automated changelog and CI/CD RSS feed posting to Telegram golden supergroup**

---

## Overview

The Telegram integration now includes dedicated topics for:
- **Changelog** (Topic 6) - Git commit changelog and release notes
- **CI/CD & RSS Feed** (Topic 7) - CI/CD pipeline updates, deployments, and RSS feed notifications

---

## Setup

### 1. Create Topics in Golden Supergroup

Run the golden supergroup setup to create the new topics:

```bash
bun run golden-supergroup setup
```

This will create:
- Topic 6: **Changelog** - Git commit changelog and release notes
- Topic 7: **CI/CD & RSS Feed** - CI/CD pipeline updates and RSS feed notifications

---

## Manual Posting

### Post Changelog

Post recent changelog entries to Telegram:

```bash
# Post last 5 commits (default)
bun run telegram:changelog

# Post last 10 commits to topic 6
bun run telegram:changelog 10 6

# Post to custom topic
bun run telegram:changelog 5 8
```

**Format:**
- Each commit includes category emoji, hash, message, author, and date
- Links to GitHub commit page
- Formatted with MarkdownV2

### Post RSS Feed

Post RSS feed items to Telegram:

```bash
# Post last 5 RSS items (default)
bun run telegram:rss

# Post last 10 RSS items to topic 7
bun run telegram:rss 10 7

# Filter by category (e.g., CI/CD)
bun run telegram:rss 5 7 ci

# Post only development-related items
bun run telegram:rss 5 7 development
```

**Format:**
- Each item includes category emoji, title, description, link, and date
- HTML stripped for Telegram compatibility
- Links to source URLs

---

## Automated Monitoring

### Start Feed Monitor Service

Run the feed monitor service to automatically post updates:

```bash
# Start monitoring service
bun run feed-monitor start

# Or use alias
bun run telegram:monitor
```

**Configuration:**
- **Changelog**: Checks every 60 minutes (configurable)
- **RSS Feed**: Checks every 30 minutes (configurable)
- Only posts new entries (tracks last hash/pubDate)

**Default Settings:**
```typescript
{
  changelog: {
    enabled: true,
    intervalMinutes: 60,
    limit: 5,
    topicId: 6,
  },
  rss: {
    enabled: true,
    intervalMinutes: 30,
    limit: 5,
    topicId: 7,
  }
}
```

### One-Time Posting via Monitor

```bash
# Post changelog once
bun run feed-monitor changelog 10 6

# Post RSS feed once
bun run feed-monitor rss 5 7 ci
```

---

## Changelog Format

Each changelog entry includes:

```
✨ **FEAT**

`abc1234` Add new feature by @author

_2024-01-15_
```

**Category Emojis:**
- ✨ `feat` - New features
- 🐛 `fix` - Bug fixes
- 📚 `docs` - Documentation
- ♻️ `refactor` - Code refactoring
- 🔧 `chore` - Maintenance tasks
- 🧪 `test` - Tests
- ⚡ `perf` - Performance improvements
- 🔒 `security` - Security updates
- 💅 `style` - Code style
- 🚀 `ci`/`cd` - CI/CD changes
- 🏗️ `build` - Build system
- ⏪ `revert` - Reverts
- 📝 `other` - Other changes

---

## RSS Feed Format

Each RSS feed item includes:

```
🚀 **CI/CD Pipeline Update** by author@nexus.trading

Description text (truncated to 200 chars)...

[Read More](https://link-to-source)
_2024-01-15_
```

**Category Emojis:**
- ⚙️ `system` - System updates
- 📚 `documentation` - Documentation
- 📋 `registry` - Registry updates
- 👥 `team` - Team updates
- 🔄 `process` - Process changes
- 🏢 `organization` - Organization
- 🔧 `tooling` - Tooling updates
- ✨ `feature` - New features
- 💻 `development` - Development updates
- 🚀 `ci`/`cd`/`deployment` - CI/CD and deployments
- 📢 `other` - Other updates

---

## Integration with CI/CD

### GitHub Actions Example

Add to your `.github/workflows/deploy.yml`:

```yaml
- name: Post RSS Feed to Telegram
  run: |
    bun run telegram:rss 5 7 ci
  env:
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

### Post-Deployment Hook

```bash
#!/bin/bash
# Post deployment notification
bun run telegram:rss 1 7 deployment
```

---

## Environment Variables

Required:
- `TELEGRAM_BOT_TOKEN` - Bot token
- `TELEGRAM_CHAT_ID` - Chat/supergroup ID

Optional:
- `API_URL` - API base URL (default: `http://localhost:3001`)

---

## Related Documentation

- [Telegram CLI](./TELEGRAM-CLI.md) - Telegram CLI commands
- [Golden Supergroup](./src/telegram/golden-supergroup.ts) - Supergroup setup
- [RSS Feed API](../src/api/routes.ts#L8118) - RSS feed endpoint
- [Changelog CLI](../scripts/changelog-cli.ts) - Changelog CLI tool

---

## Troubleshooting

### Topics Not Found

If topics don't exist, run:
```bash
bun run golden-supergroup setup
```

### RSS Feed Not Available

Ensure API server is running:
```bash
bun run dev
```

### No New Entries

The monitor service tracks the last posted hash/pubDate. To force posting:
```bash
# Clear tracking and post manually
bun run telegram:changelog 10 6
bun run telegram:rss 5 7
```

---

## Future Enhancements

Planned features:
- [ ] Webhook integration for real-time updates
- [ ] Custom formatting templates
- [ ] Multi-topic routing based on category
- [ ] Scheduled posting (cron-like)
- [ ] Notification preferences per user
- [ ] RSS feed aggregation from multiple sources
