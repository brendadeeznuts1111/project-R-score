# Team Mini-Apps: Feature Showcases

**Dedicated mini-apps for each team to showcase packages, benchmarks, and features**

---

## Overview

Team-specific mini-apps provide instant access to package features, benchmarks, and team metrics via Telegram integration.

---

## Mini-App Architecture

### Teams & Mini-Apps

| Team | Mini-App | Port | Telegram Topic | Features |
|------|----------|------|----------------|----------|
| **Sports Correlation** | `@mini/sports-correlation` | 4001 | #1 @graph/layer4 | Layer 4 & 3 demos, benchmarks, RFC submit |
| **Market Analytics** | `@mini/market-analytics` | 4002 | #3 @graph/layer2 | Layer 2 & 1 demos, market metrics, arbitrage viz |
| **Platform & Tools** | `@mini/platform-tools` | 4003 | #5 @graph/algorithms | Algorithm demos, storage metrics, error logs |

---

## Sports Correlation Mini-App

### Quick Start

```bash
cd apps/@mini/sports-correlation
bun run dev
# Opens at http://localhost:4001
```

### Features

- **Package Showcases**:
  - `@graph/layer4` - Cross-sport anomaly detection
  - `@graph/layer3` - Cross-event temporal patterns

- **Live Demos**: Run feature demos directly in browser
- **Benchmark Runner**: Execute benchmarks from UI
- **Telegram Integration**: Direct links to team topics
- **RFC Submission**: Submit RFCs for team packages

### Telegram Access

- **Bot Command**: `/sports_correlation`
- **Menu Button**: "🏀 Sports App" (in supergroup)
- **Web App URL**: `https://mini-apps.graph-engine.yourcompany.com/sports-correlation`

---

## Team Workflow

### Jordan Lee's Daily Workflow

```bash
# 1. Start mini-app for live development
cd apps/@mini/sports-correlation
bun run dev  # Starts on http://localhost:4001

# 2. Open in Telegram
# Click "Open Web App" button in topic #1
# See live metrics, run demos

# 3. Make changes to @graph/layer4
cd packages/@graph/layer4
# Edit src/config.ts

# 4. Immediate feedback in mini-app
# Changes reflected in real-time

# 5. Run benchmark from mini-app UI
# Click "Run Benchmark" → results posted to Telegram

# 6. When ready, publish from mini-app
# Click "Publish" → triggers publish workflow
```

---

## Telegram Bot Commands

### All Available Commands

```
# Team Mini-Apps
/sports_correlation - 🏀 Open Sports Correlation Mini-App
/market_analytics - 📊 Open Market Analytics Mini-App
/platform_tools - 🔧 Open Platform Tools Mini-App

# Shared Commands
/publish - 📤 Quick publish wizard
/benchmark - 🏃 Run benchmark
/rfc - 📝 Submit RFC

# Team-Specific Shortcuts
/benchmark_layer4 - 🏃 Run @graph/layer4 benchmark
/rfc_layer4 - 📝 Submit RFC for @graph/layer4
/benchmark_layer2 - 🏃 Run @graph/layer2 benchmark
/rfc_layer2 - 📝 Submit RFC for @graph/layer2
/benchmark_algorithms - 🏃 Run @graph/algorithms benchmark
/rfc_algorithms - 📝 Submit RFC for @graph/algorithms
/metrics - 📊 View team metrics
```

---

## Telegram Bot Setup

### Complete Setup (Recommended)

Set up all bot commands and menu buttons at once:

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_SUPERGROUP_ID="your_group_id"  # Optional, uses default from topics.ts
export MINI_APP_BASE_URL="https://mini-apps.graph-engine.yourcompany.com"  # Optional

# Run complete setup
bun run scripts/setup-telegram-complete.ts
```

### Individual Setup Scripts

#### 1. Bot Commands Only

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
bun run scripts/setup-telegram-bot-commands.ts
```

#### 2. Menu Buttons Only

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_SUPERGROUP_ID="your_group_id"
bun run scripts/setup-telegram-menu-buttons.ts
```

#### 3. Team-Specific Setup

```bash
cd apps/@mini/sports-correlation
export TELEGRAM_BOT_TOKEN="your_token"
export MINI_APP_URL="https://mini-apps.graph-engine.yourcompany.com/sports-correlation"
bun run telegram:setup
```

---

## Mini-App Setup

### 1. Create Mini-App

```bash
# Copy template
cp -r apps/@mini/sports-correlation apps/@mini/market-analytics

# Update package.json with team info
# Update src/index.ts with team packages
```

### 2. Configure Telegram (After Creating Mini-App)

Use the centralized setup scripts (see above) or team-specific setup:

```bash
cd apps/@mini/sports-correlation
export TELEGRAM_BOT_TOKEN="your_token"
bun run telegram:setup
```

### 3. Deploy

```bash
# Build for production
bun run build

# Deploy to mini-apps server
# Configure Telegram web_app URL
```

---

## Security

Mini-apps use Telegram authentication:

- Only team members can access
- Telegram user verification required
- Team-specific permissions enforced

---

## Related Documentation

- [Team Organization](./TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md)
- [Telegram Integration](./TELEGRAM-RFC-INTEGRATION.md)
- [Registry Dashboard](../apps/registry-dashboard/README.md)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
