# Telegram Bot Setup Guide

**Complete guide for setting up Telegram bot commands and menu buttons for team mini-apps**

---

## Quick Start

```bash
# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_SUPERGROUP_ID="your_group_id"  # Optional
export MINI_APP_BASE_URL="https://mini-apps.graph-engine.yourcompany.com"  # Optional

# Run complete setup
bun run scripts/setup-telegram-complete.ts
```

---

## Setup Scripts

### 1. Complete Setup (`scripts/setup-telegram-complete.ts`)

Runs all setup scripts in sequence:
- Bot commands configuration
- Menu buttons configuration

**Usage:**
```bash
bun run scripts/setup-telegram-complete.ts
```

---

### 2. Bot Commands Setup (`scripts/setup-telegram-bot-commands.ts`)

Configures all Telegram bot commands globally:

**Commands Configured:**
- `/sports_correlation` - 🏀 Open Sports Correlation Mini-App
- `/market_analytics` - 📊 Open Market Analytics Mini-App
- `/platform_tools` - 🔧 Open Platform Tools Mini-App
- `/publish` - 📤 Quick publish wizard
- `/benchmark` - 🏃 Run benchmark
- `/rfc` - 📝 Submit RFC
- `/benchmark_layer4` - 🏃 Run @graph/layer4 benchmark
- `/rfc_layer4` - 📝 Submit RFC for @graph/layer4
- `/benchmark_layer2` - 🏃 Run @graph/layer2 benchmark
- `/rfc_layer2` - 📝 Submit RFC for @graph/layer2
- `/benchmark_algorithms` - 🏃 Run @graph/algorithms benchmark
- `/rfc_algorithms` - 📝 Submit RFC for @graph/algorithms
- `/metrics` - 📊 View team metrics

**Usage:**
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
bun run scripts/setup-telegram-bot-commands.ts
```

---

### 3. Menu Buttons Setup (`scripts/setup-telegram-menu-buttons.ts`)

Configures menu buttons for all team mini-apps in the Telegram supergroup.

**Note:** Only one menu button can be active per chat. Consider using commands or inline keyboards for multiple options.

**Usage:**
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_SUPERGROUP_ID="your_group_id"  # Optional, uses default from topics.ts
bun run scripts/setup-telegram-menu-buttons.ts
```

---

### 4. Team-Specific Setup (`apps/@mini/*/scripts/setup-telegram.ts`)

Each team mini-app has its own setup script for team-specific configuration.

**Usage:**
```bash
cd apps/@mini/sports-correlation
export TELEGRAM_BOT_TOKEN="your_token"
export MINI_APP_URL="https://mini-apps.graph-engine.yourcompany.com/sports-correlation"
bun run telegram:setup
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | - | Telegram bot token from @BotFather |
| `TELEGRAM_SUPERGROUP_ID` | ❌ No | From `topics.ts` | Telegram supergroup ID |
| `MINI_APP_BASE_URL` | ❌ No | `https://mini-apps.graph-engine.yourcompany.com` | Base URL for mini-apps |
| `MINI_APP_URL` | ❌ No | Team-specific default | Full URL for specific mini-app |

---

## Verification

### Test Bot Commands

1. Open Telegram and find your bot
2. Type `/help` to see all available commands
3. Test a command: `/sports_correlation`

### Test Menu Buttons

1. Open the Telegram supergroup
2. Look for menu button (bottom left)
3. Click to open mini-app

---

## Troubleshooting

### Bot Commands Not Appearing

- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot is added to supergroup
- Run setup script again

### Menu Button Not Working

- Verify `TELEGRAM_SUPERGROUP_ID` is correct
- Check bot has admin permissions in supergroup
- Only one menu button can be active per chat

### Mini-App Not Loading

- Verify `MINI_APP_URL` is accessible
- Check HTTPS certificate is valid
- Verify CORS headers are configured

---

## Related Documentation

- [Team Mini-Apps](./TEAM-MINI-APPS.md) - Mini-apps overview
- [Telegram Integration](./TELEGRAM-RFC-INTEGRATION.md) - Telegram integration details
- [Team Organization](./TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md) - Team structure

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
