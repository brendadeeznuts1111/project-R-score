# 🎯 @fire22/queue-system

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2.20-f472b6.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Advanced P2P transaction matching and withdrawal queue management system with
intelligent scoring algorithms.

## 📦 Installation

```bash
bun add @fire22/queue-system
```

## 🚀 Features

- **Intelligent Matching**: Advanced scoring algorithm for optimal P2P matches
- **Real-time Processing**: Automatic queue processing and matching
- **Priority Management**: 5-level priority system for queue items
- **Payment Type Support**: Multiple payment methods (bank, crypto, cards, etc.)
- **Database Integration**: SQLite and Cloudflare D1 support
- **Performance Optimized**: Sub-50ms matching for typical operations

## 📖 Quick Start

```typescript
import { WithdrawalQueueSystem } from '@fire22/queue-system';

// Initialize queue system
const queueSystem = new WithdrawalQueueSystem(env);

// Add withdrawal to queue
const withdrawalId = await queueSystem.addToQueue({
  type: 'withdrawal',
  customerId: 'customer123',
  amount: 1000,
  paymentType: 'bank_transfer',
  paymentDetails: 'account_info',
  priority: 3, // HIGH priority
});

// Add deposit for matching
const depositId = await queueSystem.addDepositToQueue({
  customerId: 'customer456',
  amount: 1200,
  paymentType: 'bank_transfer',
  paymentDetails: 'account_info',
  priority: 2,
});

// Process matches
await queueSystem.processMatchedItems();

// Get statistics
const stats = queueSystem.getQueueStats();
console.log(`Matched pairs: ${stats.matchedPairs}`);
```

## 🔧 Configuration

### Queue Configuration

```typescript
const QUEUE_CONFIG = {
  MAX_RETRIES: 3,
  MATCH_TIMEOUT: 300000, // 5 minutes
  CLEANUP_INTERVAL: 3600000, // 1 hour
  MAX_AGE: 604800000, // 7 days

  PRIORITY_LEVELS: {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4,
    CRITICAL: 5,
  },

  PAYMENT_TYPES: {
    BANK_TRANSFER: 'bank_transfer',
    CREDIT_CARD: 'credit_card',
    CRYPTO: 'cryptocurrency',
    PAYPAL: 'paypal',
    SKRILL: 'skrill',
    NETELLER: 'neteller',
  },
};
```

## 📊 Matching Algorithm

The P2P matching algorithm considers multiple factors:

### Scoring Components

1. **Amount Match** (40% weight)

   - Closer amounts receive higher scores
   - Exact matches get maximum points

2. **Payment Type** (20% bonus)

   - Same payment type adds bonus points
   - Ensures compatibility

3. **Wait Time** (20% bonus)

   - Longer waiting items get priority
   - Prevents starvation

4. **Priority Level** (20% weight)
   - Higher priority items matched first
   - Critical items fast-tracked

### Match Score Formula

```typescript
score =
  baseScore * 0.4 +
  amountScore * 0.4 +
  (paymentTypeMatch ? 20 : 0) +
  min(20, waitTimeMinutes) +
  priorityBonus;
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Test matching algorithm
bun test:matching

# Integration tests
bun test:integration

# Performance benchmarks
bun run benchmark
bun run benchmark:matching
```

## 📈 Performance Metrics

- **Match Speed**: < 50ms for 1000 items
- **Throughput**: 1000+ matches/second
- **Memory Usage**: O(n) for n queue items
- **Database Operations**: Batched for efficiency

## 🗃️ Database Schema

### Queue Items Table

```sql
CREATE TABLE queue_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_type TEXT,
  payment_details TEXT,
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  matched_with TEXT,
  notes TEXT
);
```

### Queue Matches Table

```sql
CREATE TABLE queue_matches (
  id TEXT PRIMARY KEY,
  withdrawal_id TEXT NOT NULL,
  deposit_id TEXT NOT NULL,
  amount REAL NOT NULL,
  match_score INTEGER,
  processing_time INTEGER,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

## 📄 API Reference

### Classes

#### `WithdrawalQueueSystem`

Main queue management class.

### Methods

#### `addToQueue(item)`

Add withdrawal to processing queue.

#### `addDepositToQueue(item)`

Add deposit for matching.

#### `processMatchedItems()`

Process all matched pairs.

#### `getQueueStats()`

Get current queue statistics.

#### `completeMatch(matchId, notes?)`

Complete a matched transaction.

#### `cleanupOldItems(maxAge?)`

Remove old completed items.

## 🔗 Dependencies

- `@fire22/api-client` - Fire22 API integration

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📝 License

MIT © Fire22 Team

## 🔗 Related Packages

- [@fire22/telegram-bot](../fire22-telegram-bot) - Telegram bot integration
- [@fire22/telegram-workflows](../fire22-telegram-workflows) - Workflow system
- [@fire22/telegram-benchmarks](../fire22-telegram-benchmarks) - Performance
  testing

## 📞 Support

For issues and feature requests, please open an issue on GitHub.
