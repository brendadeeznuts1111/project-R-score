# Telegram Test Suite Documentation

**Version**: 9.0.0.0.0.0.0  
**Status**: ✅ Complete  
**Last Updated**: 2025-01-XX

---

## Overview

Comprehensive test suite for Telegram channels, groups, topic management, message sending/receiving, routing, throttling, and integration functionality. All tests follow the `// Test Formula:` and `// Expected Result:` standard with explicit cross-references to documentation sections.

## Test Files Created

### API Tests
- **`test/api/telegram.test.ts`** - Telegram API endpoint tests (9.1.1.5.0.0.0)
  - Topic management (getForumTopics, createForumTopic, editForumTopic, closeForumTopic, reopenForumTopic)
  - Message sending (sendMessage to chat/topic, formatted messages)
  - Message pinning (pinMessage, unpinMessage, sendAndPin)
  - Error handling
  - Bot status checks

### Service Tests
- **`test/services/telegram-service.test.ts`** - Service functionality tests (9.1.1.3.5.0.0)
  - Message pinning service
  - Message unpinning service
  - Topic management service
  - Message formatting service

### Routing Tests
- **`test/services/telegram-router-bookmaker.test.ts`** - Bookmaker-specific routing (9.1.1.10.2.3.0)
  - Route DraftKings alerts to dedicated topic
  - Route Betfair alerts to Betfair topic
  - Handle unknown bookmakers
  - Skip disabled bookmakers
  - Case-insensitive matching

- **`test/services/telegram-router-market-node.test.ts`** - Market node-specific routing (9.1.1.10.2.4.0)
  - Create topic for new market node
  - Reuse existing topic for same market node
  - Create separate topics for different markets/events
  - Handle nodeId parsing

- **`test/services/telegram-router-priority.test.ts`** - Priority queuing (9.1.1.10.2.5.0)
  - Process high-priority messages first
  - Maintain priority order with concurrent enqueues
  - Handle empty queue gracefully

### Throttling & Load Balancing Tests
- **`test/services/telegram-throttling.test.ts`** - Throttling and load balancing (9.1.1.10.3.0.0)
  - Prioritized dropping (9.1.1.10.3.3.0)
  - Rate limiting (9.1.1.10.3.1.0)
  - Backpressure management (9.1.1.10.3.2.0)

### CLI Tests
- **`test/cli/telegram-discover-topics.test.ts`** - CLI topic discovery (9.1.1.3.1.0.0)
  - Discover topics with full details
  - Store topic IDs for runtime lookup
  - Filter topics by category

- **`test/cli/telegram-send.test.ts`** - CLI message sending (9.1.1.3.2.0.0)
  - Send message with thread ID
  - Send message with pin flag
  - Send message with bookmaker context
  - Send high-priority message

### Integration Tests
- **`test/integration/github-telegram-workflow.test.ts`** - GitHub-Telegram integration (9.1.1.8.3.0.0)
  - End-to-end performance regression workflow (9.1.1.8.3.1.0)
  - CI/CD notification workflow (9.1.1.8.2.1.1)
  - PR notification workflow (9.1.1.8.2.2.1)

### UI Tests
- **`test/ui/telegram-status-widget.test.ts`** - UI status widget (9.1.3.1.0.0.0)
  - Update queue size in real-time
  - Track dropped messages when throttling active
  - Update rate limit usage
  - Track error rate
  - Display connection status

### Documentation Tests
- **`test/docs/cross-reference.test.ts`** - Cross-reference validation (9.1.2.2.0.0.0)
  - Verify cross-referenced documentation files exist
  - Verify cross-referenced source files exist
  - Verify config files referenced exist or are documented
  - Verify section numbering references are valid
  - Verify ripgrep patterns are valid

## Running Tests

### Run All Telegram Tests
```bash
bun test:telegram:all
# or
bash test/run-telegram-tests.sh
```

### Run Specific Test Suites
```bash
# API tests only
bun test test/api/telegram.test.ts

# Routing tests only
bun test test/services/telegram-router-*.test.ts

# CLI tests only
bun test test/cli/telegram-*.test.ts

# Integration tests only
bun test test/integration/github-telegram-workflow.test.ts
```

### Run Individual Test Files
```bash
bun test test/services/telegram-router-bookmaker.test.ts
bun test test/services/telegram-throttling.test.ts
bun test test/ui/telegram-status-widget.test.ts
```

## Test Results Summary

✅ **All Tests Passing**:
- Bookmaker Routing: 5/5 tests pass
- Market Node Routing: 5/5 tests pass
- Priority Queuing: 3/3 tests pass
- Throttling & Load Balancing: 6/6 tests pass
- GitHub Integration: 3/3 tests pass
- UI Status Widget: 5/5 tests pass
- Cross-Reference Validation: 5/5 tests pass

**Total**: 32+ tests across 11 test files

## Test Formulas & Expected Results

All tests include explicit test formulas following the standard:

```typescript
// Test Formula: 1. [Action]. 2. [Verification].
// Expected Result: [Expected outcome]
```

Examples:
- **9.1.1.10.2.3.3**: Configure bookmaker map → Dispatch notification → Verify Telegram topic
- **9.1.1.10.2.4.3**: Trigger alert for event/market → Verify topic created
- **9.1.1.10.3.3.0**: Configure aggressive throttling → Send messages → Verify drops

## Benchmarks

**`bench/telegram.ts`** - Performance benchmarks for Telegram operations:
- API operations (sendMessage, getForumTopics, createForumTopic)
- Routing performance (bookmaker lookup, severity resolution, node ID parsing)
- Queue operations (enqueue, dequeue, size checks)
- Rate limiting (token bucket checks, token consumption)

Run benchmarks:
```bash
cd bench && bun run telegram
# or
bun bench:telegram
```

## Configuration

Tests automatically skip if credentials are not configured:
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Supergroup chat ID

Tests use `test.skipIf(shouldSkip)` to gracefully handle missing credentials.

## Cross-References

All tests include cross-references to documentation sections:
- `9.1.1.5.0.0.0` - API Endpoints Reference
- `9.1.1.10.2.3.0` - Bookmaker-Specific Routing
- `9.1.1.10.3.0.0` - Load Balancing & Throttling
- `9.1.3.1.0.0.0` - UI Status Display
- And many more...

## Related Documentation

- [Communication & Notification Subsystem](./9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md) - Complete documentation
- [Telegram Dev Setup Guide](./TELEGRAM-DEV-SETUP.md) - Setup instructions
- [Telegram Integration Guide](../TELEGRAM-INTEGRATION.md) - Integration details

## Ripgrep Patterns

Find all Telegram tests:
```bash
rg "telegram.*test|9\.1\.1\.3\.0\.0\.0|9\.1\.3\.2\.0\.0\.0" test/
```

Find test formulas:
```bash
rg "Test Formula:|Expected Result:" test/
```

Find cross-references in tests:
```bash
rg "Cross-reference|9\.1\." test/
```
