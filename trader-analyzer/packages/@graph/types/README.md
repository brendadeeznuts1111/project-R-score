# @graph/types

**Type definitions for @graph/* packages**

---

## Overview

Centralized TypeScript type definitions for the multi-layer graph system, including market filters, pattern types, and layer-specific schemas.

---

## Exports

### Market Types (`./market`)

- `MarketType` - Market types for Layer 2
- `SportType` - Sport types for filtering
- `PatternType` - Pattern types for Layer 4
- `MarketFilter` - Filter interface for querying across layers
- `MARKET_FILTERS` - Filter constants with layer and package mappings

---

## Usage

```typescript
import { MarketFilter, MARKET_FILTERS, getPackagesForFilter } from '@graph/types';

// Create a filter
const filter: MarketFilter = {
  marketType: 'moneyline',
  sport: 'basketball',
  league: 'nba',
  patternTypes: ['volume_spike', 'odds_flip'],
  minConfidence: 0.8
};

// Get packages for filter
const packages = getPackagesForFilter(filter);
// Returns: ['@graph/layer2', '@graph/layer3', '@graph/layer4']
```

---

## Related Packages

- `@graph/layer2` - Cross-market analysis
- `@graph/layer3` - Cross-event patterns
- `@graph/layer4` - Cross-sport anomaly detection

---

**Version**: 1.0.0
