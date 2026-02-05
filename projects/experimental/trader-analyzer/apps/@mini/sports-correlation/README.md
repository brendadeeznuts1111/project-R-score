# Sports Correlation Mini-App

**Team**: Sports Correlation  
**Team Lead**: Alex Chen  
**Maintainers**: Jordan Lee, Priya Patel  
**Reviewers**: Alex Chen, Mike Rodriguez

---

## Overview

Telegram Mini-App for the Sports Correlation team, providing instant access to `@graph/layer4` and `@graph/layer3` packages.

---

## Features

- 🎮 **Live Demos**: Run Layer4 and Layer3 detection demos in real-time
- 📊 **Benchmark Integration**: Trigger benchmarks directly from the UI
- 📈 **Team Metrics**: View real-time team performance metrics
- 💬 **Telegram Integration**: Direct access via Telegram topic button
- 📝 **RFC Submission**: Submit RFCs directly from the mini-app
- 📤 **Package Publishing**: Quick publish workflow

---

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev  # http://localhost:4001

# Setup Telegram bot (use centralized setup from project root)
cd ../../..
export TELEGRAM_BOT_TOKEN="your-bot-token"
bun run telegram:setup

# Or use team-specific setup
cd apps/@mini/sports-correlation
export TELEGRAM_BOT_TOKEN="your-bot-token"
export MINI_APP_URL="https://mini-apps.graph-engine.yourcompany.com/sports-correlation"
bun run telegram:setup

# Build for production
bun run build
```

---

## Access Methods

1. **Via Telegram**: Click "Open Web App" button in topic #1
2. **Via Browser**: `http://localhost:4001` (dev) or production URL
3. **Via Bot Command**: `/sports_correlation`

---

## Team Workflow

### Daily Development

```bash
# 1. Start mini-app
bun run dev

# 2. Open in Telegram
# Click "Open Web App" in topic #1

# 3. Make changes to packages
cd ../../packages/@graph/layer4
# Edit code...

# 4. See changes in real-time
# Mini-app reflects updates automatically

# 5. Run benchmark from UI
# Click "Run Benchmark" → results posted to Telegram

# 6. Publish when ready
# Click "Publish" → triggers team-publish.ts workflow
```

---

## API Endpoints

- `GET /` - Main mini-app UI
- `GET /api/demo/layer4` - Run Layer4 live demo
- `POST /api/benchmark/run` - Trigger benchmark job

---

## Related Documentation

- [`docs/TEAM-MINI-APPS.md`](../../../docs/TEAM-MINI-APPS.md) - Mini-apps guide
- [`docs/TELEGRAM-BOT-SETUP.md`](../../../docs/TELEGRAM-BOT-SETUP.md) - Telegram bot setup guide
- [`docs/TELEGRAM-RFC-INTEGRATION.md`](../../../docs/TELEGRAM-RFC-INTEGRATION.md) - Telegram integration details

---

**Status**: ✅ **Ready** - Start with `bun run dev`
