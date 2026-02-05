# Syndicate Analysis System

Advanced syndicate group analysis with pattern recognition and real-time monitoring.

## Database Schema

### Tables

1. **syndicate_groups** - Main syndicate group information
2. **syndicate_members** - Many-to-many relationship between groups and members
3. **syndicate_bets** - All bets placed by syndicates
4. **syndicate_patterns** - Detected betting patterns per syndicate
5. **platform_activities** - Platform-specific activity tracking
6. **activity_records** - Detailed activity log
7. **emerging_patterns** - Cross-syndicate pattern detection
8. **pattern_syndicates** - Many-to-many relationship between patterns and syndicates

## Type Mappings

### Core Entities

- `SyndicateGroup` - Group information with members and funds
- `SyndicateBet` - Individual bet records with platform/OS tracking
- `SyndicatePattern` - Detected patterns with strength/confidence scores
- `PlatformActivity` - Platform-specific betting activity
- `EmergingPattern` - Cross-syndicate pattern emergence

### Pattern Types

- `betting_frequency` - Betting frequency patterns
- `game_selection` - Game selection preferences
- `bet_type_preference` - Preferred bet types
- `real_time_frequency` - Real-time frequency analysis
- `real_time_game_selection` - Real-time game selection

## Usage

```typescript
import { SyndicateDatabase } from './database';
import type { SyndicateGroup, SyndicateBet } from './types';

// Initialize database
const db = new SyndicateDatabase('syndicates.db');

// Create syndicate group
const group: SyndicateGroup = {
  id: 'syndicate-001',
  name: 'Elite Betting Group',
  members: ['member-1', 'member-2', 'member-3'],
  membersCount: 3,
  totalFunds: 100000,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

db.createSyndicateGroup(group);

// Record a bet
const bet: SyndicateBet = {
  id: 'bet-001',
  syndicateId: 'syndicate-001',
  game: 'NBA: Lakers vs Warriors',
  betType: 'moneyline',
  amount: 5000,
  odds: 2.5,
  timestamp: Date.now(),
  result: 'pending',
  platform: 'web',
  os: 'macos'
};

db.recordSyndicateBet(bet);

// Get syndicate stats
const stats = db.getSyndicateStats('syndicate-001');
console.log(stats);
```

## Features

- ✅ Complete database schema with relationships
- ✅ Type-safe mappings between database and application
- ✅ Pattern detection and storage
- ✅ Platform/OS tracking
- ✅ Emerging pattern detection
- ✅ Analytics and statistics
- ✅ Indexed for performance

## Database Relationships

```
syndicate_groups (1) ──< (many) syndicate_members
syndicate_groups (1) ──< (many) syndicate_bets
syndicate_groups (1) ──< (many) syndicate_patterns
syndicate_groups (1) ──< (many) platform_activities
platform_activities (1) ──< (many) activity_records
emerging_patterns (1) ──< (many) pattern_syndicates ──> (many) syndicate_groups
```
