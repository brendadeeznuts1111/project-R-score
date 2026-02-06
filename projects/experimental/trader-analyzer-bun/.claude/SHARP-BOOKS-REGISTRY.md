# Sharp Books Registry - ORCA Ecosystem

**Live sharp book configurations and line movement tracking for professional sportsbook analysis.**

---

## 📚 Sharp Book Registry

### Book Classifications

| Book | Tier | Weight | Latency | Crypto | Limits Winners |
|------|------|--------|---------|--------|----------------|
| **Circa** | S+ | 9.8 | 180ms | ❌ | ❌ |
| **Pinnacle** | S | 9.5 | 90ms | ✅ | ❌ |
| **Crisp** | A+ | 8.5 | 120ms | ✅ | ✅ |
| **BetCRIS** | A | 7.5 | 400ms | ❌ | ✅ |
| **Bookmaker.eu** | A | 7.0 | 600ms | ✅ | ❌ |
| **Jazz Sports** | B+ | 6.0 | 1100ms | ✅ | ✅ |

### Tier Definitions

- **S+**: Highest tier (Circa) - Industry-leading sharpness
- **S**: Sharp tier (Pinnacle) - Professional-grade
- **A+**: Very sharp (Crisp) - Above average
- **A**: Sharp (BetCRIS, Bookmaker) - Good sharpness
- **B+**: Above average (Jazz) - Moderate sharpness

---

## 🔧 API Endpoints

### Get All Sharp Books
```bash
GET /orca/sharp-books
```

**Response**:
```json
{
  "books": [...],
  "total": 6,
  "connected": 6
}
```

### Get Books by Tier
```bash
GET /orca/sharp-books/tier/S+
```

**Response**:
```json
{
  "books": [circa],
  "tier": "S+"
}
```

### Get Books by Tag
```bash
GET /orca/sharp-books/tag/nba
```

**Response**:
```json
{
  "books": [circa, pinnacle, betcris, ...],
  "tag": "nba"
}
```

### Get Status Summary
```bash
GET /orca/sharp-books/status
```

**Response**:
```json
{
  "summary": {
    "circa": { "status": "connected", "latency": 180 },
    "pinnacle": { "status": "connected", "latency": 90 },
    ...
  },
  "timestamp": 1234567890
}
```

### Get Recent Line Moves
```bash
GET /orca/sharp-books/moves/:marketId?window=300000
```

**Response**:
```json
{
  "marketId": "market-uuid",
  "moves": [
    {
      "bookId": "circa",
      "marketId": "market-uuid",
      "timestamp": 1234567890,
      "direction": "up",
      "magnitude": 1.5,
      "oldLine": -3.5,
      "newLine": -5.0,
      "marketType": "spread"
    }
  ],
  "count": 5
}
```

### Check Circa First Move
```bash
GET /orca/sharp-books/circa-first/:marketId?window=300000
```

**Response**:
```json
{
  "marketId": "market-uuid",
  "circaFirst": true,
  "windowMs": 300000
}
```

**Indicator**: If Circa moves first, it's a strong sharp signal (S+ tier)

---

## 📊 Dashboard Integration

### Sharp Books Panel
- **Display**: Top 5 sharpest books (sorted by weight)
- **Information**: Tier, name, latency, status
- **Badges**: Crypto accepted (₿), limits winners (⚠)
- **Status**: Connection status indicator (●/○)

### Features
- **Real-time status**: Connection status per book
- **Latency tracking**: Benchmark latency per book
- **Tier visualization**: Color-coded tier display
- **Quick reference**: Top books at a glance

---

## 🎯 Use Cases

### 1. Line Movement Tracking
Track which books move lines first to identify sharp action:
```typescript
const moves = sharpBookRegistry.getRecentMoves(marketId);
const circaFirst = sharpBookRegistry.circaMovedFirst(marketId);
// If Circa (S+ tier) moves first → strong sharp signal
```

### 2. Sharp Signal Detection
Calculate composite signals from multiple books:
```typescript
const signal = calculateSharpSignal(moves);
// Confidence based on:
// - Number of sharp books agreeing
// - Magnitude of move
// - Total weight of books involved
```

### 3. Book Comparison
Compare books by tier, latency, or features:
```typescript
const sharpest = getBooksByWeight(); // Sorted by weight
const sTier = getBooksByTier("S+"); // Only S+ books
const nbaBooks = getBooksByTag("nba"); // NBA books
```

---

## 🔍 Missing Dimensions (Now Available)

### Per Bookmaker ✅
- **Available**: Sharp book registry with 6 books
- **Filter**: By tier, tag, status
- **Dashboard**: Sharp Books panel added

### Per Tier ✅
- **Available**: S+, S, A+, A, B+ classifications
- **Filter**: `getBooksByTier(tier)`
- **API**: `/orca/sharp-books/tier/:tier`

### Per Latency ✅
- **Available**: Latency benchmarks per book
- **Display**: Shown in dashboard panel
- **Range**: 90ms (Pinnacle) to 1100ms (Jazz)

### Per Feature ✅
- **Available**: Crypto acceptance, winner limits
- **Display**: Badges in dashboard
- **Filter**: Via book properties

---

## 📈 Integration Status

- ✅ Sharp Books Registry created
- ✅ API endpoints added
- ✅ Dashboard panel integrated
- ✅ Type definitions complete
- ✅ Line movement tracking ready
- ✅ Sharp signal calculation ready

---

**Status**: Sharp Books Registry integrated  
**Version**: v0.1.0  
**Books**: 6 configured (Circa, Pinnacle, Crisp, BetCRIS, Bookmaker, Jazz)  
**Features**: Tier classification, latency tracking, line movement analysis
