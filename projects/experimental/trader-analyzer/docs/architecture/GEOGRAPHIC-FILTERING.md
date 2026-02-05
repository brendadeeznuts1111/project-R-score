# Geographic & Bookmaker Filtering

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

Geographic and bookmaker filtering allows teams to optimize package selection based on data source locations, latency characteristics, and regional performance.

---

## Features

✅ **Bookmaker Filtering**: Filter by specific bookmaker (Bet365, Pinnacle, Fanatics, DraftKings, Betfair Asia)  
✅ **Region Filtering**: Filter by geographic region (UK, Curacao, US-East, US-West, Asia-Pacific)  
✅ **Geographic Zones**: Filter by latitude zones (Northern, Tropical, Southern Hemisphere)  
✅ **Elevation Filtering**: Filter by elevation zones (Sea Level, Lowland, Highland)  
✅ **Latency Filtering**: Filter by maximum latency threshold  
✅ **Map Visualization**: Visual display of bookmaker office locations  
✅ **Integrated Filtering**: Works with existing team/market/pattern filters  

---

## Data Structure

### Bookmaker Locations

```typescript
interface BookmakerLocation {
  name: string;
  region: 'UK' | 'Curacao' | 'US-East' | 'US-West' | 'Asia-Pacific';
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
    elevation: number; // in meters
  };
  officeAddress: string;
  timezone: string;
  supportedSports: SportType[];
  latencyMs: number;
}
```

### Supported Bookmakers

- **Bet365** (UK): Stoke-on-Trent, Lat: 52.95°, Long: -1.15°, Elev: 45m, Latency: 12ms
- **Pinnacle** (Curacao): Willemstad, Lat: 12.17°, Long: -68.99°, Elev: 0m, Latency: 85ms
- **Fanatics** (US-East): New York, Lat: 40.71°, Long: -74.01°, Elev: 10m, Latency: 5ms
- **DraftKings** (US-West): San Francisco, Lat: 37.77°, Long: -122.42°, Elev: 16m, Latency: 8ms
- **Betfair Asia** (Asia-Pacific): Sydney, Lat: -33.87°, Long: 151.21°, Elev: 58m, Latency: 120ms

---

## Usage

### Dashboard Filtering

1. **Select Bookmaker**: Choose a specific bookmaker from the dropdown
2. **Select Region**: Filter by geographic region
3. **Select Zone**: Filter by latitude zone (Northern, Tropical, Southern)
4. **Select Elevation**: Filter by elevation range
5. **Adjust Latency**: Use slider to set maximum latency threshold
6. **View Map**: See bookmaker locations on the map visualization

### Package Metadata

Packages include geographic metadata in `data-*` attributes:

```html
<div class="package-card"
     data-package="@graph/layer4"
     data-bookmakers="bet365,pinnacle"
     data-regions="UK,Curacao"
     data-min-latency="12"
     data-max-latency="85">
```

---

## Filter Logic

### Bookmaker Selection

- If bookmaker selected: Show only packages supporting that bookmaker
- If region selected: Show packages supporting bookmakers in that region
- If zone/elevation/latency selected: Show packages matching those criteria

### Combined Filtering

Filters work together:
- **Team Filter** → **Market Filter** → **Geographic Filter**
- All filters must match for a package to be visible
- Map visualization updates based on selected filters

---

## Implementation

### Component Files

- **`packages/@graph/types/src/geography.ts`**: Geographic data structures and constants
- **`apps/@registry-dashboard/src/components/geographic-filter.ts`**: Filter component and JavaScript
- **`apps/@registry-dashboard/src/pages/dashboard.ts`**: Dashboard integration

### Helper Functions

```typescript
// Get bookmaker location
getBookmakerLocation(bookmaker: string): BookmakerLocation | undefined

// Get bookmakers by region
getBookmakersByRegion(region: RegionType): string[]

// Get bookmakers by zone
getBookmakersByZone(zone: GeographicZone): string[]

// Get bookmakers by elevation
getBookmakersByElevation(elevationZone: ElevationZone): string[]

// Get bookmakers by latency
getBookmakersByLatency(maxLatency: number): string[]
```

---

## Examples

### Filter by Low Latency

```javascript
// Set latency filter to 20ms
document.getElementById('latency-filter').value = '20';
applyGeographicFilter();
// Shows: Bet365 (12ms), Fanatics (5ms), DraftKings (8ms)
```

### Filter by Region

```javascript
// Select US-East region
document.getElementById('region-filter').value = 'US-East';
applyGeographicFilter();
// Shows: Packages supporting Fanatics
```

### Filter by Geographic Zone

```javascript
// Select Northern Hemisphere
document.getElementById('zone-filter').value = 'northern';
applyGeographicFilter();
// Shows: Packages supporting Bet365 (52.95°N)
```

---

## Map Visualization

The map visualization displays:
- Bookmaker name
- Coordinates (latitude, longitude)
- Elevation
- Office address
- Latency
- Supported sports

Updates automatically based on selected filters.

---

## Related Documentation

- [`docs/architecture/MARKET-FILTERING.md`](./MARKET-FILTERING.md) - Market filtering guide
- [`docs/architecture/DASHBOARD-INTEGRATION.md`](./DASHBOARD-INTEGRATION.md) - Dashboard integration
- [`packages/@graph/types/src/geography.ts`](../../../packages/@graph/types/src/geography.ts) - Geographic types

---

**Status**: ✅ **Geographic Filtering Implemented** - Ready for use
