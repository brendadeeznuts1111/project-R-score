---
type: code-snippet
title: Registry Integration Examples
tags:
  - code-snippet
  - implementation
  - registry
  - integration
created: 2025-11-18T13:40:00Z
updated: 2025-11-18T13:40:00Z
author: system
---






# 🔧 Registry Integration Examples

## Overview
Practical code examples for integrating with the Bookmaker Registry System, including synthetic
    arbitrage

## Basic usage

### Creating opportunities with registry
```typescript
import { SyntheticArbitrageFactory } from './synthetic-arbitrage-factory';

// Default exchange (DraftKings)
const opportunity = SyntheticArbitrageFactory.create();
console.log(opportunity.rotationId); // "DK2123"

// Specific exchange
const fdOpportunity = SyntheticArbitrageFactory.create({
    primaryMarket: { exchange: 'fanduel' }
});
console.log(fdOpportunity.rotationId); // "FD3456"

// Custom exchange with validation
const mgmOpportunity = SyntheticArbitrageFactory.createWithZScore(
    -105, -100, 4.0, 'betmgm'
);
console.log(mgmOpportunity.rotationId); // "MGM12123"
```

### Registry direct access
```typescript
import { BookmakerRegistry } from './bookmaker-registry';

const registry = BookmakerRegistry.getInstance();

// Get bookmaker configuration
const draftkings = registry.getBookmaker('draftkings');
console.log(draftkings?.rateLimits?.requestsPerSecond); // 10

// Map exchange to bookmaker
const bookmaker = registry.getBookmakerByExchange('mgm');
console.log(bookmaker?.id); // 'betmgm'

// Generate rotation numbers
const rotationId = registry.generateRotationNumber('fanduel', 'NBA', 123);
console.log(rotationId); // "FD2123"

// Validate rotation numbers
const isValid = registry.validateRotationNumber('draftkings', 'DK2123');
console.log(isValid); // true

// Detect sport from rotation number
const sport = registry.getSportFromRotationNumber('draftkings', 'DK3456');
console.log(sport); // 'NFL'
```

## Advanced usage

### Custom bookmaker registration
```typescript
// Add new bookmaker
const customBookmaker: BookmakerConfig = {
    id: 'custom-exchange',
    name: 'Custom Exchange',
    displayName: 'Custom Sportsbook',
    rotationScheme: {
        ranges: { NBA: [50000, 50999] },
        prefix: 'CUSTOM',
        padding: 5
    },
    marketConvention: {
        name: 'custom-standard',
        oddsFormat: 'decimal',
        supportsLive: true,
        supportedSports: ['NBA', 'NFL'],
        marketTypes: ['moneyline', 'spread']
    }
};

registry.addBookmaker(customBookmaker);

// Add exchange mapping
registry.addExchangeMapping({
    exchangeId: 'custom',
    bookmakerId: 'custom-exchange',
    mappingType: 'direct'
});
```

### Batch processing with registry
```typescript
// Generate opportunities with unique rotation numbers
const opportunities = SyntheticArbitrageFactory.createBatch(10, {
    primaryMarket: { exchange: 'pointsbet' }
});

opportunities.forEach((opp, index) => {
    console.log(`Opportunity ${index}: ${opp.rotationId}`);
    // Expected: PB-2000, PB-2001, PB-2002, etc.
});

// Validate all rotation numbers
const allValid = opportunities.every(opp => 
    SyntheticArbitrageFactory.validateRotationNumber('pointsbet', opp.rotationId!)
);
console.log('All rotation numbers valid:', allValid);
```

## Error handling

### Graceful degradation
```typescript
// Handle unknown exchanges
const unknownOpportunity = SyntheticArbitrageFactory.create({
    primaryMarket: { exchange: 'unknown-exchange' }
});

if (!unknownOpportunity.rotationId) {
    console.warn('No rotation number generated for unknown exchange');
    // Fallback to manual ID generation
    unknownOpportunity.rotationId = `UNKNOWN-${Date.now()}`;
}
```

### Validation with feedback
```typescript
function validateAndReport(exchange: string, rotationId: string): void {
    const registry = BookmakerRegistry.getInstance();
    
    if (!registry.validateRotationNumber(exchange, rotationId)) {
        const bookmaker = registry.getBookmakerByExchange(exchange);
        if (!bookmaker) {
            console.error(`Unknown exchange: ${exchange}`);
        } else {
            const sport = registry.getSportFromRotationNumber(exchange, rotationId);
            console.error(`Invalid rotation number for ${sport || 'unknown sport'}`);
        }
    } else {
        console.log(`✅ Valid rotation number: ${rotationId}`);
    }
}
```

## Testing integration

### Test factory setup
```typescript
describe('Registry Integration Tests', () => {
    let registry: BookmakerRegistry;
    
    beforeEach(() => {
        registry = BookmakerRegistry.getInstance();
    });
    
    it('should generate consistent rotation numbers', () => {
        const opp1 = SyntheticArbitrageFactory.create();
        const opp2 = SyntheticArbitrageFactory.create();
        
        expect(opp1.rotationId).toMatch(/^DK\d{4}$/);
        expect(opp2.rotationId).toMatch(/^DK\d{4}$/);
        expect(opp1.rotationId).not.toBe(opp2.rotationId);
    });
});
```

---

**Tags**: `#development` `#code-snippets` `#registry-integration` `#examples` `#testing`
