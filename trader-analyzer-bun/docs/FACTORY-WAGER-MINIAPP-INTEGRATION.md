# Factory Wager Mini App - Sportsbooks, Bets & Markets Integration

**Complete integration of Factory Wager Mini App for sportsbooks, betting markets, and bet management**

---

## Overview

The Factory Wager Mini App (`https://staging.factory-wager-miniapp.pages.dev`) is fully integrated into the NEXUS Platform with comprehensive sportsbook, betting market, and bet management capabilities:

- ✅ **Sportsbooks Integration** - Connect to multiple sportsbooks (Pinnacle, DraftKings, Betfair, etc.)
- ✅ **Betting Markets** - Real-time market data, odds comparison, and market discovery
- ✅ **Bet Management** - Place bets, track positions, and manage betting portfolio
- ✅ **Arbitrage Detection** - Find and execute arbitrage opportunities across bookmakers
- ✅ **Odds Comparison** - Compare odds across multiple sportsbooks in real-time
- ✅ **Betting Analytics** - Track performance, ROI, win rate, and profitability

---

## API Endpoints

### Sportsbooks

#### `GET /api/miniapp/sportsbooks`

Get all connected sportsbooks and their status.

**Response:**
```json
{
  "sportsbooks": [
    {
      "id": "pinnacle",
      "name": "Pinnacle",
      "status": "online",
      "responseTime": 90,
      "lastUpdate": 1704372000000,
      "availableMarkets": 1250,
      "activeBets": 5
    }
  ],
  "total": 1
}
```

#### `GET /api/miniapp/sportsbooks/:bookmaker`

Get status for a specific sportsbook.

**Parameters:**
- `bookmaker` - Sportsbook ID (e.g., `pinnacle`, `draftkings`, `betfair`)

**Response:**
```json
{
  "id": "pinnacle",
  "name": "Pinnacle",
  "status": "online",
  "responseTime": 90,
  "lastUpdate": 1704372000000,
  "availableMarkets": 1250,
  "activeBets": 5
}
```

---

### Betting Markets

#### `GET /api/miniapp/markets`

Get betting markets with optional filters.

**Query Parameters:**
- `sport` - Filter by sport (e.g., `NBA`, `NFL`, `soccer`)
- `league` - Filter by league (e.g., `NBA`, `EPL`)
- `marketType` - Filter by market type (`moneyline`, `spread`, `total`, `prop`, `future`, `live`)
- `bookmaker` - Filter by bookmaker
- `eventId` - Filter by specific event

**Response:**
```json
{
  "markets": [
    {
      "id": "market_abc123",
      "eventId": "event_xyz789",
      "eventDescription": "Lakers @ Celtics",
      "sport": "NBA",
      "league": "NBA",
      "marketType": "spread",
      "period": "full",
      "line": -3.5,
      "selections": [
        {
          "id": "selection_1",
          "name": "Lakers -3.5",
          "odds": {
            "pinnacle": -110,
            "draftkings": -108,
            "betfair": -109
          },
          "line": -3.5,
          "available": true
        }
      ],
      "bookmakers": ["pinnacle", "draftkings", "betfair"],
      "bestOdds": {
        "selection": "selection_1",
        "bookmaker": "draftkings",
        "odds": -108
      },
      "arbitrageOpportunity": {
        "edge": 1.2,
        "bookA": "pinnacle",
        "bookB": "draftkings"
      },
      "timestamp": 1704372000000
    }
  ],
  "total": 1
}
```

#### `GET /api/miniapp/markets/:marketId`

Get detailed information for a specific market.

**Response:**
```json
{
  "id": "market_abc123",
  "eventId": "event_xyz789",
  "eventDescription": "Lakers @ Celtics",
  "sport": "NBA",
  "league": "NBA",
  "marketType": "spread",
  "period": "full",
  "line": -3.5,
  "selections": [...],
  "bookmakers": ["pinnacle", "draftkings", "betfair"],
  "bestOdds": {...},
  "timestamp": 1704372000000
}
```

#### `GET /api/miniapp/markets/:marketId/compare`

Compare odds across all bookmakers for a market.

**Response:**
```json
{
  "market": {...},
  "bestOdds": {
    "selection_1": {
      "bookmaker": "draftkings",
      "odds": -108
    },
    "selection_2": {
      "bookmaker": "pinnacle",
      "odds": -105
    }
  },
  "arbitrageOpportunities": [
    {
      "id": "arb_123",
      "eventId": "event_xyz789",
      "eventDescription": "Lakers @ Celtics",
      "marketType": "spread",
      "edge": 1.2,
      "bookA": {
        "bookmaker": "pinnacle",
        "selection": "Lakers -3.5",
        "odds": -110,
        "stake": 50
      },
      "bookB": {
        "bookmaker": "draftkings",
        "selection": "Celtics +3.5",
        "odds": +108,
        "stake": 50
      },
      "guaranteedProfit": 1.20,
      "roi": 1.2,
      "detectedAt": 1704372000000
    }
  ]
}
```

---

### Arbitrage Opportunities

#### `GET /api/miniapp/arbitrage`

Get arbitrage opportunities with optional filters.

**Query Parameters:**
- `minEdge` - Minimum edge percentage (e.g., `1.0` for 1%)
- `eventId` - Filter by event ID
- `marketType` - Filter by market type
- `bookmaker` - Filter by bookmaker

**Response:**
```json
{
  "opportunities": [
    {
      "id": "arb_123",
      "eventId": "event_xyz789",
      "eventDescription": "Lakers @ Celtics",
      "marketType": "spread",
      "edge": 1.2,
      "bookA": {
        "bookmaker": "pinnacle",
        "selection": "Lakers -3.5",
        "odds": -110,
        "stake": 50
      },
      "bookB": {
        "bookmaker": "draftkings",
        "selection": "Celtics +3.5",
        "odds": +108,
        "stake": 50
      },
      "guaranteedProfit": 1.20,
      "roi": 1.2,
      "detectedAt": 1704372000000,
      "expiresAt": 1704375600000
    }
  ],
  "total": 1
}
```

#### `POST /api/miniapp/arbitrage/:opportunityId/execute`

Execute an arbitrage opportunity (requires authentication).

**Request Body:**
```json
{
  "totalStake": 100
}
```

**Response:**
```json
{
  "success": true,
  "bets": [
    {
      "id": "bet_abc123",
      "marketId": "market_abc123",
      "selectionId": "selection_1",
      "bookmaker": "pinnacle",
      "stake": 50,
      "odds": -110,
      "potentialPayout": 95.45,
      "status": "placed",
      "placedAt": 1704372000000
    },
    {
      "id": "bet_def456",
      "marketId": "market_abc123",
      "selectionId": "selection_2",
      "bookmaker": "draftkings",
      "stake": 50,
      "odds": +108,
      "potentialPayout": 104,
      "status": "placed",
      "placedAt": 1704372000000
    }
  ],
  "profit": 1.20
}
```

---

### Bet Management

#### `POST /api/miniapp/bets`

Place a bet (requires authentication).

**Request Body:**
```json
{
  "marketId": "market_abc123",
  "selectionId": "selection_1",
  "bookmaker": "pinnacle",
  "stake": 100,
  "odds": -110,
  "notes": "Lakers spread bet"
}
```

**Response:**
```json
{
  "id": "bet_abc123",
  "marketId": "market_abc123",
  "selectionId": "selection_1",
  "bookmaker": "pinnacle",
  "stake": 100,
  "odds": -110,
  "potentialPayout": 190.91,
  "status": "placed",
  "placedAt": 1704372000000,
  "notes": "Lakers spread bet"
}
```

#### `GET /api/miniapp/bets`

Get all bets with optional filters (requires authentication).

**Query Parameters:**
- `status` - Filter by status (`pending`, `placed`, `won`, `lost`, `cancelled`, `void`)
- `bookmaker` - Filter by bookmaker
- `marketId` - Filter by market ID
- `limit` - Limit results (default: 100)

**Response:**
```json
{
  "bets": [
    {
      "id": "bet_abc123",
      "marketId": "market_abc123",
      "selectionId": "selection_1",
      "bookmaker": "pinnacle",
      "stake": 100,
      "odds": -110,
      "potentialPayout": 190.91,
      "status": "placed",
      "placedAt": 1704372000000
    }
  ],
  "total": 1
}
```

#### `GET /api/miniapp/bets/:betId`

Get bet details by ID (requires authentication).

**Response:**
```json
{
  "id": "bet_abc123",
  "marketId": "market_abc123",
  "selectionId": "selection_1",
  "bookmaker": "pinnacle",
  "stake": 100,
  "odds": -110,
  "potentialPayout": 190.91,
  "status": "won",
  "placedAt": 1704372000000,
  "resolvedAt": 1704375600000,
  "payout": 190.91,
  "notes": "Lakers spread bet"
}
```

#### `GET /api/miniapp/bets/stats`

Get betting statistics (requires authentication).

**Response:**
```json
{
  "totalBets": 150,
  "activeBets": 12,
  "totalStaked": 15000,
  "totalPayout": 15250,
  "profit": 250,
  "roi": 1.67,
  "winRate": 0.58,
  "byBookmaker": {
    "pinnacle": {
      "bets": 50,
      "staked": 5000,
      "payout": 5100,
      "profit": 100
    },
    "draftkings": {
      "bets": 100,
      "staked": 10000,
      "payout": 10150,
      "profit": 150
    }
  }
}
```

---

## Implementation Details

### Core Module: `src/utils/sportsbook-miniapp.ts`

The `SportsbookMiniappIntegration` class provides:

- **Sportsbook Management** - Connect to and monitor multiple sportsbooks
- **Market Discovery** - Find and filter betting markets
- **Odds Comparison** - Compare odds across bookmakers
- **Arbitrage Detection** - Find guaranteed profit opportunities
- **Bet Placement** - Place bets through integrated sportsbooks
- **Bet Tracking** - Track all bets and their status
- **Performance Analytics** - Calculate ROI, win rate, and profitability

**Key Features:**
- Enterprise-grade caching (30s for sportsbooks, 10s for markets, 5s for arbitrage)
- Circuit breaker pattern for reliability
- Retry logic with exponential backoff
- Fallback to local registry if Mini App unavailable
- Type-safe interfaces for all operations

### API Routes: `src/api/routes.ts`

All endpoints are registered under `/api/miniapp/*`:

- Sportsbooks: `/api/miniapp/sportsbooks`
- Markets: `/api/miniapp/markets`
- Arbitrage: `/api/miniapp/arbitrage`
- Bets: `/api/miniapp/bets`

**Authentication:**
- Public endpoints: Sportsbooks, Markets, Arbitrage (read-only)
- Protected endpoints: Bet placement, Bet management, Statistics (require authentication)

---

## Supported Sportsbooks

### Sharp Books (S+ Tier)
- **Circa Sports** - S+ tier, NBA, NFL, NCAAB, NCAAF, MLB
- **Pinnacle** - S tier, NBA, NFL, Soccer, EPL, MMA, UFC

### Sharp Books (A+ Tier)
- **Crisp** - A+ tier, Crypto sports, Prediction markets

### Sharp Books (A Tier)
- **BetCRIS** - A tier, NBA, NFL, MLB, NCAAB
- **Bookmaker.eu** - A tier, NBA, NFL, NCAAB, NCAAF, MMA

### Sharp Books (B+ Tier)
- **Jazz Sports** - B+ tier, NBA, NFL, Prediction markets

### Soft Books
- **DraftKings** - US legal sportsbook
- **FanDuel** - US legal sportsbook
- **BetMGM** - US legal sportsbook
- **Caesars** - US legal sportsbook

### Exchanges
- **Betfair** - Betting exchange
- **Matchbook** - Betting exchange

---

## Market Types

### Moneyline
Bet on which team/participant will win.

### Spread (Point Spread)
Bet on the margin of victory with a handicap (e.g., Lakers -3.5).

### Total (Over/Under)
Bet on whether combined score is over or under a number (e.g., Over 220.5).

### Prop (Proposition Bet)
Bet on specific events within a game (player props, team props, game props).

### Future
Bet on future outcomes (championship winner, MVP, etc.).

### Live (In-Play)
Bets placed during a live event.

---

## Usage Examples

### Get All Sportsbooks

```bash
curl http://localhost:3000/api/miniapp/sportsbooks
```

### Get Markets for NBA

```bash
curl "http://localhost:3000/api/miniapp/markets?sport=NBA&marketType=spread"
```

### Compare Odds for a Market

```bash
curl http://localhost:3000/api/miniapp/markets/market_abc123/compare
```

### Find Arbitrage Opportunities

```bash
curl "http://localhost:3000/api/miniapp/arbitrage?minEdge=1.0"
```

### Place a Bet (with auth token)

```bash
curl -X POST http://localhost:3000/api/miniapp/bets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "market_abc123",
    "selectionId": "selection_1",
    "bookmaker": "pinnacle",
    "stake": 100,
    "odds": -110
  }'
```

### Get Betting Statistics

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/miniapp/bets/stats
```

---

## JavaScript/TypeScript Examples

### Get Markets and Compare Odds

```typescript
// Get NBA spread markets
const response = await fetch('/api/miniapp/markets?sport=NBA&marketType=spread');
const { markets } = await response.json();

// Compare odds for first market
const market = markets[0];
const compareResponse = await fetch(`/api/miniapp/markets/${market.id}/compare`);
const comparison = await compareResponse.json();

console.log('Best odds:', comparison.bestOdds);
console.log('Arbitrage opportunities:', comparison.arbitrageOpportunities);
```

### Find and Execute Arbitrage

```typescript
// Find arbitrage opportunities with at least 1% edge
const arbResponse = await fetch('/api/miniapp/arbitrage?minEdge=1.0');
const { opportunities } = await arbResponse.json();

if (opportunities.length > 0) {
  const opportunity = opportunities[0];
  
  // Execute arbitrage with $100 total stake
  const executeResponse = await fetch(
    `/api/miniapp/arbitrage/${opportunity.id}/execute`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ totalStake: 100 }),
    }
  );
  
  const result = await executeResponse.json();
  console.log('Arbitrage executed:', result.success);
  console.log('Guaranteed profit:', result.profit);
}
```

### Place Bet and Track

```typescript
// Place a bet
const betResponse = await fetch('/api/miniapp/bets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    marketId: 'market_abc123',
    selectionId: 'selection_1',
    bookmaker: 'pinnacle',
    stake: 100,
    odds: -110,
    notes: 'Lakers spread bet',
  }),
});

const bet = await betResponse.json();
console.log('Bet placed:', bet.id);

// Get all active bets
const betsResponse = await fetch('/api/miniapp/bets?status=placed', {
  headers: { 'Authorization': `Bearer ${token}` },
});
const { bets } = await betsResponse.json();
console.log('Active bets:', bets);
```

---

## Dashboard Integration

### Web Dashboard (`dashboard/index.html`)

The Factory Wager Mini App integration displays:

- **Sportsbooks Status** - Real-time status of all connected sportsbooks
- **Active Markets** - Top betting markets with best odds highlighted
- **Arbitrage Opportunities** - Live arbitrage opportunities with edge percentages
- **Betting Portfolio** - Active bets, P&L, and performance metrics
- **Odds Comparison** - Side-by-side odds comparison across bookmakers

**Location:** Dashboard → Factory Wager Mini App card

**Auto-refresh:** Updates every 5 seconds

---

## Error Handling

### API Errors

All endpoints return consistent error format:

```json
{
  "error": true,
  "message": "Failed to get markets",
  "code": "NX-500"
}
```

### Common Error Codes

- `NX-404` - Resource not found (sportsbook, market, bet)
- `NX-500` - Internal server error
- `NX-401` - Authentication required
- `NX-403` - Insufficient permissions

---

## Related Documentation

- [ORCA Arbitrage Integration](./api/ORCA-ARBITRAGE-INTEGRATION.md) - Arbitrage detection system
- [Sharp Books Registry](../src/orca/sharp-books/registry.ts) - Sportsbook configurations
- [Market Taxonomy](../src/orca/taxonomy/market.ts) - Market type definitions
- [Sportsbook Integration](../src/utils/sportsbook-miniapp.ts) - Core implementation

---

## Status

✅ **Complete** - All endpoints, integration, and documentation implemented.

**Last Updated**: 2025-01-27  
**Status**: ✅ Production Ready

**Focus**: Sportsbooks, Betting Markets, and Bet Management
