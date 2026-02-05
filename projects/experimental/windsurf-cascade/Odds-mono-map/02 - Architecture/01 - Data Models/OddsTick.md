---
type: data-model
title: OddsTick Interface
tags:
  - data-model
  - interface
  - odds
  - tick-data
created: 2025-11-18T20:30:00Z
updated: 2025-11-18T20:30:00Z
author: system
---





# 📊 OddsTick Interface

## Overview
Core data structure representing odds tick data from sports betting exchanges with standardized
    format

## Interface definition

```typescript
interface OddsTick {
  // Core identifiers
  exchange: string;           // Exchange identifier (draftkings, fanduel, betmgm, etc.)
  rotationId: string;         // Unique rotation number for the event
  sport: string;             // Sport category (NBA, NFL, MLB, etc.)
  event: string;             // Event description
  
  // Odds data
  odds: {
    american: number;        // American odds format (+110, -105, etc.)
    decimal: number;         // Decimal odds format (2.10, 1.95, etc.)
    fractional?: string;     // Fractional odds format (21/20, 20/21, etc.)
  };
  
  // Market information
  market: {
    type: string;            // Market type (moneyline, spread, total, etc.)
    side: 'home' | 'away' | 'over' | 'under';  // Market side
    handicap?: number;       // Point spread or total line
  };
  
  // Timing and metadata
  timestamp: number;         // Unix timestamp in milliseconds
  lastUpdate: number;        // Last update timestamp
  confidence: number;        // Data confidence score (0-1)
  
  // Bookkeeper information
  bookmaker: {
    id: string;              // Bookmaker identifier
    name: string;            // Bookmaker display name
    limits?: {               // Betting limits (if available)
      min: number;
      max: number;
    };
  };
  
  // Validation flags
  isValid: boolean;          // Data validation status
  errors?: string[];         // Validation errors (if any)
}
```

## Usage examples

### Creating a new oddstick
```typescript
const oddsTick: OddsTick = {
  exchange: 'draftkings',
  rotationId: 'DK2123',
  sport: 'NBA',
  event: 'Lakers vs Celtics',
  odds: {
    american: +110,
    decimal: 2.10,
    fractional: '21/20'
  },
  market: {
    type: 'moneyline',
    side: 'home'
  },
  timestamp: Date.now(),
  lastUpdate: Date.now(),
  confidence: 0.95,
  bookmaker: {
    id: 'draftkings',
    name: 'DraftKings',
    limits: {
      min: 10,
      max: 10000
    }
  },
  isValid: true
};
```

### Validating oddstick
```typescript
function validateOddsTick(tick: OddsTick): boolean {
  // Required fields validation
  if (!tick.exchange || !tick.rotationId || !tick.sport) {
    return false;
  }
  
  // Odds format validation
  if (!tick.odds || !tick.odds.american || !tick.odds.decimal) {
    return false;
  }
  
  // Timestamp validation
  if (tick.timestamp <= 0 || tick.lastUpdate <= 0) {
    return false;
  }
  
  return true;
}
```

## Data flow

1. **Ingestion**: Raw odds data from exchange APIs
2. **Normalization**: Convert to OddsTick format
3. **Validation**: Ensure data integrity and compliance
4. **Processing**: Feed into arbitrage algorithms
5. **Storage**: Persist for historical analysis

## Integration points

- [[Bookmaker Registry System]] - For rotation number validation
- [[SyntheticArbitrageFactory]] - For opportunity creation
- [[Stream Processor]] - For real-time data handling

## Considerations

- **Performance**: Optimized for high-frequency updates
- **Memory**: Efficient serialization for large datasets
- **Validation**: Strict type checking ensures data quality
- **Extensibility**: Optional fields allow for future enhancements

## Future enhancements

- Add support for additional odds formats
- Include market depth information
- Add historical price tracking
- Implement data compression for storage

---

**Tags**: `#data-model` `#interface` `#odds` `#tick-data`

**Related**: [[Bookmaker Registry System]] | [[SyntheticArbitrageFactory]] | [[Stream Processor]]
