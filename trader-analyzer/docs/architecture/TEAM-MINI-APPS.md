# Team Mini-Apps Architecture

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

Each team has a dedicated Telegram Mini-App that provides instant access to their packages, benchmarks, demos, and team workflows.

---

## Mini-Apps by Team

| Team | Mini-App | Telegram Topic | URL | Features |
|------|----------|----------------|-----|----------|
| Sports Correlation | `@mini/sports-correlation` | #1 @graph/layer4 | `/mini-apps/sports-correlation` | Layer 4 & 3 demos, benchmarks, RFC submit |
| Market Analytics | `@mini/market-analytics` | #3 @graph/layer2 | `/mini-apps/market-analytics` | Layer 2 & 1 demos, market metrics, arbitrage viz |
| Platform & Tools | `@mini/platform-tools` | #5 @graph/algorithms | `/mini-apps/platform-tools` | Algorithm demos, storage metrics, error logs |

---

## Sports Correlation Mini-App

### Features

- **Live Demos**: Run Layer4 and Layer3 detection demos in real-time
- **Benchmark Integration**: Trigger benchmarks directly from the UI
- **Team Metrics**: View real-time team performance metrics
- **Telegram Integration**: Direct access via Telegram topic button
- **RFC Submission**: Submit RFCs directly from the mini-app
- **Package Publishing**: Quick publish workflow

### Access

1. **Via Telegram**: Click "Open Web App" button in topic #1
2. **Via Browser**: `https://mini-apps.graph-engine.yourcompany.com/sports-correlation`
3. **Via Bot Command**: `/sports_correlation`

### Team Members

- **Team Lead**: Alex Chen
- **Maintainers**: Jordan Lee, Priya Patel
- **Reviewers**: Alex Chen, Mike Rodriguez

---

## Telegram Bot Commands

```bash
/sports_correlation - 🏀 Open Sports Correlation Mini-App
/market_analytics   - 📊 Open Market Analytics Mini-App
/platform_tools     - 🔧 Open Platform Tools Mini-App
/publish            - 📤 Quick publish wizard
/benchmark          - 🏃 Run benchmark
/rfc                - 📝 Submit RFC
```

---

## Team Workflow with Mini-Apps

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
# Changes reflected in real-time on http://localhost:4001

# 5. Run benchmark from mini-app UI
# Click "Run Benchmark" → results posted to Telegram

# 6. When ready, publish from mini-app
# Click "Publish" → triggers publish workflow
```

---

## Security

### Authentication

Mini-apps use Telegram Web App authentication:

1. User opens mini-app from Telegram
2. Telegram provides `initData` with user info
3. Server validates signature and checks team membership
4. Access granted if user is team lead or maintainer

### Authorization

- **Team Leads**: Full access (publish, benchmarks, RFCs)
- **Maintainers**: Read-write access (demos, benchmarks, view metrics)
- **Reviewers**: Read-only access (view demos, metrics)

---

## Setup

### Initial Setup

```bash
# Install dependencies
cd apps/@mini/sports-correlation
bun install

# Configure Telegram bot
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_SUPERGROUP_ID="your-group-id"
bun run telegram:setup

# Start development server
bun run dev
```

### Production Deployment

```bash
# Build mini-app
bun run build

# Deploy to hosting (e.g., Cloudflare Pages, Vercel)
# Update MINI_APP_URL in environment variables
```

---

## Related Documentation

- [`apps/@mini/sports-correlation/package.json`](../../apps/@mini/sports-correlation/package.json) - Mini-app configuration
- [`apps/@mini/sports-correlation/src/index.ts`](../../apps/@mini/sports-correlation/src/index.ts) - Main application
- [`apps/@mini/sports-correlation/src/auth.ts`](../../apps/@mini/sports-correlation/src/auth.ts) - Authentication
- [`docs/architecture/TEAM-WORKFLOWS.md`](./TEAM-WORKFLOWS.md) - Team workflows

---

**Status**: ✅ **Mini-Apps Implemented** - Ready for use
