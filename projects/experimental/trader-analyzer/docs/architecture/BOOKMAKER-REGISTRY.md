# Unified Bookmaker Registry

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

The Unified Bookmaker Registry combines data from multiple sources:
- **Sharp Books Registry**: Sharp tier rankings, endpoints, latency benchmarks
- **Geographic Data**: Coordinates, elevation, regions, timezones
- **Profile Data**: Endpoint configurations, profiling information

---

## Features

✅ **Unified Data**: Single source combining all bookmaker information  
✅ **Geographic Integration**: Location data for all bookmakers  
✅ **Sharp Tier Analysis**: Access to sharp book rankings  
✅ **Profile Integration**: Endpoint configuration data  
✅ **Query Methods**: Filter by region, zone, elevation, latency, tier  
✅ **Statistics**: Comprehensive registry statistics  

---

## API Endpoint

```text
GET /api/registry/bookmakers
```

### Response

```json
{
  "bookmakers": [
    {
      "id": "pinnacle",
      "name": "Pinnacle",
      "sharpTier": "S",
      "endpoints": {
        "rest": "https://api.pinnacle.com/v3",
        "ws": "wss://api.pinnacle.com/v1/stream",
        "odds": "https://api.pinnacle.com/v3/odds"
      },
      "latencyBenchmark": 90,
      "weight": 9.5,
      "tags": ["sports", "nba", "nfl", "soccer", "epl", "mma", "ufc"],
      "status": "connected",
      "rateLimit": 100,
      "limitsWinners": false,
      "cryptoAccepted": true,
      "geographic": {
        "region": "Curacao",
        "country": "CW",
        "coordinates": {
          "latitude": 12.1696,
          "longitude": -68.9900,
          "elevation": 0
        },
        "officeAddress": "Willemstad, Curacao",
        "timezone": "America/Curacao",
        "supportedSports": ["soccer", "basketball", "baseball", "hockey"],
        "latencyMs": 85
      }
    }
  ],
  "total": 10,
  "statistics": {
    "total": 10,
    "byTier": {
      "S+": 1,
      "S": 1,
      "A+": 1,
      "A": 2,
      "B+": 1
    },
    "byRegion": {
      "UK": 1,
      "Curacao": 1,
      "US-East": 1,
      "US-West": 1,
      "Asia-Pacific": 1
    },
    "connected": 6,
    "withGeographic": 5
  }
}
```

---

## Usage

### TypeScript

```typescript
import { getBookmakerRegistry } from "./orca/bookmakers";

const registry = getBookmakerRegistry();

// Get all bookmakers
const all = registry.getAll();

// Get by region
const ukBookmakers = registry.getByRegion("UK");

// Get by tier
const sTier = registry.getByTier("S");

// Get by max latency
const lowLatency = registry.getByMaxLatency(50);

// Get statistics
const stats = registry.getStatistics();
```

### API

```bash
# Get all bookmakers
curl http://localhost:3000/api/registry/bookmakers

# Filter by region (client-side)
curl http://localhost:3000/api/registry/bookmakers | jq '.bookmakers[] | select(.geographic.region == "UK")'
```

---

## Data Sources

### Sharp Books

- **Source**: `src/orca/sharp-books/registry.ts`
- **Data**: Tier rankings, endpoints, latency benchmarks, weight, tags, status

### Geographic Data

- **Source**: `packages/@graph/types/src/geography.ts`
- **Data**: Coordinates, elevation, regions, timezones, supported sports

### Profile Data

- **Source**: `src/logging/bookmaker-profile.ts` (SQLite database)
- **Data**: Endpoint configurations, profiling timestamps, URL encoding behavior

---

## Query Methods

### By Region

```typescript
const ukBookmakers = registry.getByRegion("UK");
const usEastBookmakers = registry.getByRegion("US-East");
```

### By Geographic Zone

```typescript
const northern = registry.getByZone("northern");
const tropical = registry.getByZone("tropical");
const southern = registry.getByZone("southern");
```

### By Elevation

```typescript
const seaLevel = registry.getByElevation("sea-level");
const lowland = registry.getByElevation("lowland");
const highland = registry.getByElevation("highland");
```

### By Latency

```typescript
const lowLatency = registry.getByMaxLatency(50); // <= 50ms
```

### By Tier

```typescript
const sTier = registry.getByTier("S");
const sPlusTier = registry.getByTier("S+");
```

### By Tag

```typescript
const nbaBookmakers = registry.getByTag("nba");
const cryptoBookmakers = registry.getByTag("crypto");
```

### Search

```typescript
const results = registry.searchByName("pinnacle");
```

---

## Statistics

```typescript
const stats = registry.getStatistics();
// {
//   total: 10,
//   byTier: { "S+": 1, "S": 1, "A+": 1, ... },
//   byRegion: { "UK": 1, "Curacao": 1, ... },
//   connected: 6,
//   withGeographic: 5
// }
```

---

## Related Documentation

- [`docs/architecture/GEOGRAPHIC-FILTERING.md`](./GEOGRAPHIC-FILTERING.md) - Geographic filtering guide
- [`src/orca/sharp-books/registry.ts`](../../src/orca/sharp-books/registry.ts) - Sharp books registry
- [`packages/@graph/types/src/geography.ts`](../../packages/@graph/types/src/geography.ts) - Geographic types

---

**Status**: ✅ **Unified Bookmaker Registry Implemented** - Single source for all bookmaker data
