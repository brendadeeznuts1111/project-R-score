# Telegram Mini-Apps for Team Packages

**Status**: ✅ **Implemented**

---

## Overview

Each team has a dedicated Telegram Mini-App that provides instant access to their packages, live demos, benchmarks, and team workflows.

---

## Quick Start

### Sports Correlation Mini-App

```bash
# Start development server
cd apps/@mini/sports-correlation
bun run dev

# Setup Telegram bot
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_SUPERGROUP_ID="your-group-id"
bun run telegram:setup

# Access via:
# - Browser: http://localhost:4001
# - Telegram: Click "Open Web App" button in topic #1
# - Bot command: /sports_correlation
```

---

## Mini-Apps by Team

| Team | Mini-App | Port | Telegram Topic | Features |
|------|----------|------|----------------|----------|
| **Sports Correlation** | `@mini/sports-correlation` | 4001 | #1 @graph/layer4 | Layer 4 & 3 demos, benchmarks, RFC submit |
| **Market Analytics** | `@mini/market-analytics` | 4002 | #3 @graph/layer2 | Layer 2 & 1 demos, market metrics |
| **Platform & Tools** | `@mini/platform-tools` | 4003 | #5 @graph/algorithms | Algorithm demos, storage metrics |

---

## Features

### ✅ Live Demos
- Run package features in real-time
- See immediate results and metrics
- Interactive code examples

### ✅ Benchmark Integration
- Trigger benchmarks from UI
- View results in real-time
- Results posted to Telegram topics

### ✅ Team Metrics
- Real-time performance metrics
- Active anomalies count
- Detection time averages

### ✅ Telegram Integration
- Direct access via Telegram topic buttons
- Bot commands for quick access
- Menu buttons for easy navigation

### ✅ RFC Submission
- Submit RFCs directly from mini-app
- Pre-filled with package context
- Instant team notifications

### ✅ Package Publishing
- Quick publish workflow
- Ownership validation
- Benchmark verification

---

## Team Workflow Example

### Jordan Lee (Sports Team Maintainer)

```bash
# 1. Start mini-app
sports-mini  # or: cd apps/@mini/sports-correlation && bun run dev

# 2. Open in Telegram
# Click "Open Web App" in topic #1

# 3. Make changes to @graph/layer4
cd-sports
# Edit code...

# 4. See changes in real-time
# Mini-app reflects updates automatically

# 5. Run benchmark from UI
# Click "Run Benchmark" → results posted to Telegram

# 6. Publish when ready
# Click "Publish" → triggers team-publish.ts workflow
```

---

## Telegram Bot Commands

```bash
/sports_correlation - 🏀 Open Sports Correlation Mini-App
/market_analytics   - 📊 Open Market Analytics Mini-App
/platform_tools     - 🔧 Open Platform Tools Mini-App
/publish            - 📤 Quick publish wizard
/benchmark          - 🏃 Run benchmark
/rfc                - 📝 Submit RFC
/metrics            - 📊 View team metrics
```

---

## Security

### Authentication

- Telegram Web App authentication
- Team membership validation
- Role-based access control

### Authorization

- **Team Leads**: Full access (publish, benchmarks, RFCs)
- **Maintainers**: Read-write access (demos, benchmarks)
- **Reviewers**: Read-only access (view demos, metrics)

---

## Setup

### Prerequisites

```bash
# Environment variables
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_SUPERGROUP_ID="your-group-id"
export MINI_APP_URL="https://mini-apps.graph-engine.yourcompany.com/sports-correlation"
```

### Initial Setup

```bash
# Install dependencies
cd apps/@mini/sports-correlation
bun install

# Setup Telegram bot
bun run telegram:setup

# Start development
bun run dev
```

---

## Related Documentation

- [`docs/architecture/TEAM-MINI-APPS.md`](./docs/architecture/TEAM-MINI-APPS.md) - Complete mini-apps guide
- [`docs/architecture/TEAM-WORKFLOWS.md`](./docs/architecture/TEAM-WORKFLOWS.md) - Team workflows
- [`apps/@mini/sports-correlation/`](./apps/@mini/sports-correlation/) - Sports mini-app source

---

**Status**: ✅ **Mini-Apps Ready** - Start with `sports-mini`, `markets-mini`, or `platform-mini`
