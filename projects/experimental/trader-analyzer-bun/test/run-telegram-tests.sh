#!/usr/bin/env bash
# Run all Telegram integration tests
# Tests: API endpoints, service functionality, routing, throttling, CLI, integration, UI, docs

set -euo pipefail

echo "🧪 Running Telegram Test Suite"
echo ""

# Check if credentials are configured
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    echo "⚠️  Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set"
    echo "   Some tests will be skipped"
    echo ""
fi

# API Tests
echo "📡 API Endpoint Tests (9.1.1.5.0.0.0)"
bun test test/api/telegram.test.ts
echo ""

# Service Tests
echo "🔧 Service Tests (9.1.1.3.5.0.0)"
bun test test/services/telegram-service.test.ts
echo ""

# Routing Tests
echo "🔀 Routing Tests"
echo "  - Bookmaker Routing (9.1.1.10.2.3.0)"
bun test test/services/telegram-router-bookmaker.test.ts
echo "  - Market Node Routing (9.1.1.10.2.4.0)"
bun test test/services/telegram-router-market-node.test.ts
echo "  - Priority Queuing (9.1.1.10.2.5.0)"
bun test test/services/telegram-router-priority.test.ts
echo ""

# Throttling Tests
echo "⚡ Throttling & Load Balancing Tests (9.1.1.10.3.0.0)"
bun test test/services/telegram-throttling.test.ts
echo ""

# CLI Tests
echo "💻 CLI Tests"
echo "  - Discover Topics (9.1.1.3.1.0.0)"
bun test test/cli/telegram-discover-topics.test.ts
echo "  - Send Messages (9.1.1.3.2.0.0)"
bun test test/cli/telegram-send.test.ts
echo ""

# Integration Tests
echo "🔗 Integration Tests (9.1.1.8.3.0.0)"
bun test test/integration/github-telegram-workflow.test.ts
echo ""

# UI Tests
echo "🖥️  UI Tests (9.1.3.1.0.0.0)"
bun test test/ui/telegram-status-widget.test.ts
echo ""

# Documentation Tests
echo "📚 Documentation Tests (9.1.2.2.0.0.0)"
bun test test/docs/cross-reference.test.ts
echo ""

echo "✅ All Telegram tests completed"
