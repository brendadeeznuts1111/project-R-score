# Access Guide: Registry.html, Documentation Files, and Telegram Setup

## Quick Fix

**Port 8080 is not running** (dashboard server). Use the **main API server** instead:

### ✅ Registry.html
**URL**: `http://localhost:3001/registry.html`

### ✅ Documentation Files
**URL**: `http://localhost:3001/docs/URL-PARSING-EDGE-CASE.md`

(Replace `URL-PARSING-EDGE-CASE.md` with any markdown file from the `docs/` directory)

### ✅ Telegram Setup
**Guide**: [Telegram Dev Setup](./TELEGRAM-DEV-SETUP.md) - Complete setup guide for Telegram integration

---

## Routes Added

The main API server now serves:

1. **`GET /registry.html`** - Registry browser page
2. **`GET /docs/:filename`** - Markdown documentation files (when filename ends with `.md`)
3. **`GET /telegram/topics`** - List Telegram topics (requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`)
4. **`POST /telegram/topics/:threadId/send`** - Send message to Telegram topic

---

## Port Information

- **Main API Server**: Port 3001 (or `PORT` env var)
- **Dashboard Server**: Port 8080 (requires `bun run dashboard:serve`)

---

## Telegram Quick Start

### 1. Configure Bot Token & Chat ID

```bash
# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="-1001234567890"

# Or use Bun.secrets
bun secret set TELEGRAM_BOT_TOKEN "your_bot_token"
bun secret set TELEGRAM_CHAT_ID "-1001234567890"
```

### 2. Test Telegram

```bash
# Discover topics
bun run telegram discover-topics

# Send test message
bun run telegram send "🧪 Test message" --topic 2
```

### 3. Full Setup Guide

See [Telegram Dev Setup Guide](./TELEGRAM-DEV-SETUP.md) for complete instructions.

---

## Verification

Test the routes:

```bash
# Test registry.html
curl http://localhost:3001/registry.html | head -20

# Test markdown docs
curl http://localhost:3001/docs/URL-PARSING-EDGE-CASE.md | head -20

# Test Telegram topics (requires configuration)
curl http://localhost:3001/telegram/topics
```

All should return content (HTML for registry.html, markdown text for .md files, JSON for Telegram API).

---

## Related Documentation

- **[Integration Guide](./INTEGRATION-GUIDE.md)** - Complete guide showing how PORT constants, CLI tools, HTMLRewriter, and Registry HTML access work together
- **[Registry HTML Access](./REGISTRY-HTML-ACCESS.md)** - Detailed guide to accessing registry.html with HTMLRewriter enhancements
- **[HTMLRewriter Quick Start](./guides/HTML-REWRITER-QUICK-START.md)** - Quick start guide for HTMLRewriter
