# Geographic & Bookmaker Filtering

**Status**: ✅ **Implemented**

---

## Overview

Geographic and bookmaker filtering enables location-aware package analysis based on data source locations, latency characteristics, and regional performance.

---

## Quick Features

✅ **Bookmaker Filtering**: Filter by Bet365, Pinnacle, Fanatics, DraftKings, Betfair Asia  
✅ **Region Filtering**: UK, Curacao, US-East, US-West, Asia-Pacific  
✅ **Geographic Zones**: Northern, Tropical, Southern Hemisphere  
✅ **Elevation Filtering**: Sea Level, Lowland, Highland  
✅ **Latency Filtering**: Filter by maximum latency threshold  
✅ **Map Visualization**: Visual display of bookmaker office locations  

---

## Usage

### Dashboard

Access geographic filters in the Registry Dashboard:

```bash
# Start dashboard
cd apps/@registry-dashboard
bun run dev

# Open in browser
open http://localhost:4000/dashboard
```

### Filter Options

1. **Bookmaker**: Select specific bookmaker (Bet365, Pinnacle, etc.)
2. **Region**: Filter by geographic region
3. **Geographic Zone**: Filter by latitude zone
4. **Elevation**: Filter by elevation range
5. **Latency**: Adjust maximum latency threshold (0-200ms)

---

## Bookmaker Locations

| Bookmaker | Region | Location | Coordinates | Elevation | Latency |
|-----------|--------|----------|-------------|-----------|---------|
| Bet365 | UK | Stoke-on-Trent | 52.95°N, -1.15°E | 45m | 12ms |
| Pinnacle | Curacao | Willemstad | 12.17°N, -68.99°W | 0m | 85ms |
| Fanatics | US-East | New York | 40.71°N, -74.01°W | 10m | 5ms |
| DraftKings | US-West | San Francisco | 37.77°N, -122.42°W | 16m | 8ms |
| Betfair Asia | Asia-Pacific | Sydney | -33.87°S, 151.21°E | 58m | 120ms |

---

## Package Metadata

Packages include geographic metadata:

```html
<div class="package-card"
     data-package="@graph/layer4"
     data-bookmakers="bet365,pinnacle"
     data-regions="UK,Curacao"
     data-min-latency="12"
     data-max-latency="85">
```

---

## Filter Combinations

### Low Latency Packages

```javascript
// Set latency to 20ms
document.getElementById('latency-filter').value = '20';
applyGeographicFilter();
// Shows: Bet365 (12ms), Fanatics (5ms), DraftKings (8ms)
```

### Regional Optimization

```javascript
// US-East region
document.getElementById('region-filter').value = 'US-East';
applyGeographicFilter();
// Shows: Packages supporting Fanatics
```

### Geographic Zone

```javascript
// Northern Hemisphere
document.getElementById('zone-filter').value = 'northern';
applyGeographicFilter();
// Shows: Packages supporting Bet365 (52.95°N)
```

---

## Integration

Geographic filters work with:
- **Team Filters**: Sports Correlation, Market Analytics, Platform & Tools
- **Market Filters**: Market type, sub-market, pattern, confidence
- **Combined Filtering**: All filters must match for visibility

---

## Related Documentation

- [`docs/architecture/GEOGRAPHIC-FILTERING.md`](./docs/architecture/GEOGRAPHIC-FILTERING.md) - Complete guide
- [`packages/@graph/types/src/geography.ts`](./packages/@graph/types/src/geography.ts) - Geographic types
- [`apps/@registry-dashboard/src/components/geographic-filter.ts`](./apps/@registry-dashboard/src/components/geographic-filter.ts) - Filter component

---

**Status**: ✅ **Geographic Filtering Ready** - Use filters to optimize package selection by location
