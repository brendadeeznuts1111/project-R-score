/**
 * Geographic and Bookmaker Filter Component
 * Provides filtering by bookmaker, region, geographic zone, elevation, and latency
 */

export function renderGeographicFilter() {
  return `
    <div class="geographic-filter-bar" style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h3 style="color: #17a2b8; margin-top: 0;">🌍 Geographic & Bookmaker Filters</h3>
      
      <!-- Bookmaker Filter -->
      <div class="filter-group">
        <label>Bookmaker:</label>
        <select id="bookmaker-filter" onchange="applyGeographicFilter()">
          <option value="">All Bookmakers</option>
          <option value="bet365">Bet365 (UK) - Lat: 52.95°, Long: -1.15°, Elev: 45m</option>
          <option value="pinnacle">Pinnacle (Curacao) - Lat: 12.17°, Long: -68.99°, Elev: 0m</option>
          <option value="fanatics">Fanatics (US-East) - Lat: 40.71°, Long: -74.01°, Elev: 10m</option>
          <option value="draftkings">DraftKings (US-West) - Lat: 37.77°, Long: -122.42°, Elev: 16m</option>
          <option value="betfair-asia">Betfair Asia (Asia-Pacific) - Lat: -33.87°, Long: 151.21°, Elev: 58m</option>
        </select>
      </div>
      
      <!-- Region Filter -->
      <div class="filter-group">
        <label>Region:</label>
        <select id="region-filter" onchange="applyGeographicFilter()">
          <option value="">All Regions</option>
          <option value="UK">🇬🇧 United Kingdom</option>
          <option value="Curacao">🇨🇼 Curacao</option>
          <option value="US-East">🇺🇸 US East Coast</option>
          <option value="US-West">🇺🇸 US West Coast</option>
          <option value="Asia-Pacific">🌏 Asia-Pacific</option>
        </select>
      </div>
      
      <!-- Geographic Zone Filter -->
      <div class="filter-group">
        <label>Geographic Zone:</label>
        <select id="zone-filter" onchange="applyGeographicFilter()">
          <option value="">All Zones</option>
          <option value="northern">🌐 Northern Hemisphere (50°N-70°N)</option>
          <option value="tropical">🌴 Tropics (-23.5°S to 23.5°N)</option>
          <option value="southern">🐧 Southern Hemisphere (-70°S to -50°S)</option>
        </select>
      </div>
      
      <!-- Elevation Filter -->
      <div class="filter-group">
        <label>Elevation:</label>
        <select id="elevation-filter" onchange="applyGeographicFilter()">
          <option value="">All Elevations</option>
          <option value="sea-level">🏖️ Sea Level (-10m to 100m)</option>
          <option value="lowland">🏔️ Lowland (100m to 500m)</option>
          <option value="highland">⛰️ Highland (500m to 2000m)</option>
        </select>
      </div>
      
      <!-- Latency Filter -->
      <div class="filter-group">
        <label>Max Latency: <span id="latency-value">50ms</span></label>
        <input type="range" id="latency-filter" min="0" max="200" step="5" value="50" oninput="updateLatencyValue(this.value); applyGeographicFilter()" style="width: 200px;">
      </div>
      
      <button class="clear-geo-btn" onclick="clearGeographicFilters()" style="padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 5px; background: #dc3545; color: white;">Clear Geographic Filters</button>
      <button class="apply-geo-btn" onclick="applyGeographicFilter()" style="padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 5px; background: #17a2b8; color: white;">Apply Geographic Filters</button>
    </div>
  `;
}

export function renderMapVisualization() {
  return `
    <div id="map-visualization" class="map-container" style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h4 style="margin-top: 0; color: #17a2b8;">📍 Geographic Distribution</h4>
      
      <!-- Leaflet Map Container -->
      <div id="leaflet-map" style="height: 400px; width: 100%; border-radius: 8px; margin-bottom: 20px; background: #e9ecef;"></div>
      
      <!-- Location Cards Grid -->
      <div id="map-locations" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
        <!-- Populated by JavaScript -->
      </div>
      
      <!-- Leaflet CSS -->
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
            crossorigin=""/>
      <!-- Leaflet JS -->
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
              integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
              crossorigin=""></script>
    </div>
  `;
}

// Client-side JavaScript functions (injected into dashboard)
export const GEOGRAPHIC_FILTER_JS = `
// Geographic filter data (simplified client-side version)
const BOOKMAKER_LOCATIONS = {
  'bet365': {
    name: 'Bet365',
    region: 'UK',
    coordinates: { latitude: 52.9548, longitude: -1.1496, elevation: 45 },
    officeAddress: 'Stoke-on-Trent, UK',
    latencyMs: 12,
    supportedSports: ['soccer', 'basketball', 'tennis', 'cricket']
  },
  'pinnacle': {
    name: 'Pinnacle',
    region: 'Curacao',
    coordinates: { latitude: 12.1696, longitude: -68.9900, elevation: 0 },
    officeAddress: 'Willemstad, Curacao',
    latencyMs: 85,
    supportedSports: ['soccer', 'basketball', 'baseball', 'hockey']
  },
  'fanatics': {
    name: 'Fanatics',
    region: 'US-East',
    coordinates: { latitude: 40.7128, longitude: -74.0060, elevation: 10 },
    officeAddress: 'New York, NY, USA',
    latencyMs: 5,
    supportedSports: ['basketball', 'american_football', 'baseball']
  },
  'draftkings': {
    name: 'DraftKings',
    region: 'US-West',
    coordinates: { latitude: 37.7749, longitude: -122.4194, elevation: 16 },
    officeAddress: 'San Francisco, CA, USA',
    latencyMs: 8,
    supportedSports: ['basketball', 'american_football', 'baseball', 'hockey']
  },
  'betfair-asia': {
    name: 'Betfair Asia',
    region: 'Asia-Pacific',
    coordinates: { latitude: -33.8688, longitude: 151.2093, elevation: 58 },
    officeAddress: 'Sydney, Australia',
    latencyMs: 120,
    supportedSports: ['soccer', 'cricket', 'tennis', 'basketball']
  }
};

const REGION_FILTERS = {
  'UK': { name: 'United Kingdom', bookmakers: ['bet365'] },
  'Curacao': { name: 'Curacao', bookmakers: ['pinnacle'] },
  'US-East': { name: 'US East Coast', bookmakers: ['fanatics'] },
  'US-West': { name: 'US West Coast', bookmakers: ['draftkings'] },
  'Asia-Pacific': { name: 'Asia-Pacific', bookmakers: ['betfair-asia'] }
};

function updateLatencyValue(value) {
  document.getElementById('latency-value').textContent = value + 'ms';
}

function applyGeographicFilter() {
  const bookmaker = document.getElementById('bookmaker-filter').value;
  const region = document.getElementById('region-filter').value;
  const zone = document.getElementById('zone-filter').value;
  const elevation = document.getElementById('elevation-filter').value;
  const maxLatency = parseInt(document.getElementById('latency-filter').value);
  
  // Get matching bookmakers
  let matchingBookmakers = [];
  
  if (bookmaker) {
    matchingBookmakers = [bookmaker];
  } else if (region) {
    matchingBookmakers = REGION_FILTERS[region]?.bookmakers || [];
  } else {
    // Apply zone, elevation, and latency filters
    matchingBookmakers = Object.keys(BOOKMAKER_LOCATIONS);
    
    if (zone) {
      const zoneFilters = {
        'northern': (lat) => lat >= 50 && lat <= 70,
        'tropical': (lat) => lat >= -23.5 && lat <= 23.5,
        'southern': (lat) => lat >= -70 && lat <= -50
      };
      const zoneFilter = zoneFilters[zone];
      if (zoneFilter) {
        matchingBookmakers = matchingBookmakers.filter(bm => {
          const loc = BOOKMAKER_LOCATIONS[bm];
          return loc && zoneFilter(loc.coordinates.latitude);
        });
      }
    }
    
    if (elevation) {
      const elevationFilters = {
        'sea-level': (elev) => elev >= -10 && elev <= 100,
        'lowland': (elev) => elev >= 100 && elev <= 500,
        'highland': (elev) => elev >= 500 && elev <= 2000
      };
      const elevationFilter = elevationFilters[elevation];
      if (elevationFilter) {
        matchingBookmakers = matchingBookmakers.filter(bm => {
          const loc = BOOKMAKER_LOCATIONS[bm];
          return loc && elevationFilter(loc.coordinates.elevation);
        });
      }
    }
    
    // Apply latency filter
    matchingBookmakers = matchingBookmakers.filter(bm => {
      const loc = BOOKMAKER_LOCATIONS[bm];
      return loc && loc.latencyMs <= maxLatency;
    });
  }
  
  // Filter package cards (only process cards that are not hidden by team/market filters)
  // Cards must have both 'visible' class (from market filter) AND not have 'hidden' class (from team filter)
  const packageCards = document.querySelectorAll('.package-card');
  let visibleCount = 0;
  
  packageCards.forEach(card => {
    // Skip if already hidden by team filter
    if (card.classList.contains('hidden')) {
      card.classList.remove('visible');
      card.style.display = 'none';
      return;
    }
    
    const cardBookmakers = card.getAttribute('data-bookmakers') || '';
    const cardRegions = card.getAttribute('data-regions') || '';
    const cardMinLatency = parseInt(card.getAttribute('data-min-latency') || '999');
    const cardMaxLatency = parseInt(card.getAttribute('data-max-latency') || '0');
    
    let matches = false;
    
    // If no geographic filters applied, show card (if it passed team/market filters)
    if (matchingBookmakers.length === 0 && !zone && !elevation && maxLatency >= 200) {
      matches = true; // No geographic filter applied
    } else {
      // Check if card supports any matching bookmaker
      if (matchingBookmakers.length > 0) {
        matches = matchingBookmakers.some(bm => cardBookmakers.includes(bm));
      } else {
        matches = true; // No bookmaker filter, check other criteria
      }
      
      // Check latency if no specific bookmaker/region selected
      if (matches && (!bookmaker && !region)) {
        matches = cardMaxLatency <= maxLatency;
      }
      
      // Also check if card has geographic metadata
      if (matches && !cardBookmakers && !cardRegions) {
        // Card has no geographic metadata, show it if no specific geographic filter
        matches = !bookmaker && !region;
      }
    }
    
    if (matches) {
      card.classList.add('visible');
      card.style.display = '';
      visibleCount++;
    } else {
      card.classList.remove('visible');
      card.style.display = 'none';
    }
  });
  
  // Update map visualization
  updateMapVisualization(bookmaker, region, matchingBookmakers);
  
  // Update results count
  const resultsEl = document.getElementById('filter-results-count');
  if (resultsEl) {
    resultsEl.textContent = visibleCount + ' packages visible (team + market + geographic)';
  }
}

function clearGeographicFilters() {
  document.getElementById('bookmaker-filter').value = '';
  document.getElementById('region-filter').value = '';
  document.getElementById('zone-filter').value = '';
  document.getElementById('elevation-filter').value = '';
  document.getElementById('latency-filter').value = '50';
  updateLatencyValue('50');
  
  // Show all cards
  document.querySelectorAll('.package-card').forEach(card => {
    card.classList.add('visible');
    card.style.display = '';
  });
  
  // Reset map to show all locations
  updateMapVisualization('', '', []);
  
  // Update results
  const visibleCount = document.querySelectorAll('.package-card.visible').length;
  const resultsEl = document.getElementById('filter-results-count');
  if (resultsEl) {
    resultsEl.textContent = visibleCount + ' packages visible';
  }
}

// Leaflet map instance (global)
let leafletMap = null;
let mapMarkers = [];

function initializeLeafletMap() {
  // Initialize map if not already created
  if (!leafletMap && typeof L !== 'undefined') {
    // Center map on average of all bookmaker locations
    const allLocations = Object.values(BOOKMAKER_LOCATIONS);
    if (allLocations.length > 0) {
      const avgLat = allLocations.reduce((sum, loc) => sum + loc.coordinates.latitude, 0) / allLocations.length;
      const avgLng = allLocations.reduce((sum, loc) => sum + loc.coordinates.longitude, 0) / allLocations.length;
      
      leafletMap = L.map('leaflet-map').setView([avgLat, avgLng], 2);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(leafletMap);
    }
  }
}

function updateMapVisualization(selectedBookmaker, selectedRegion, matchingBookmakers) {
  const locations = [];
  
  if (selectedBookmaker && BOOKMAKER_LOCATIONS[selectedBookmaker]) {
    locations.push(BOOKMAKER_LOCATIONS[selectedBookmaker]);
  } else if (selectedRegion && REGION_FILTERS[selectedRegion]) {
    REGION_FILTERS[selectedRegion].bookmakers.forEach(bm => {
      if (BOOKMAKER_LOCATIONS[bm]) {
        locations.push(BOOKMAKER_LOCATIONS[bm]);
      }
    });
  } else if (matchingBookmakers && matchingBookmakers.length > 0) {
    matchingBookmakers.forEach(bm => {
      if (BOOKMAKER_LOCATIONS[bm]) {
        locations.push(BOOKMAKER_LOCATIONS[bm]);
      }
    });
  } else {
    // Show all locations if no filter
    locations.push(...Object.values(BOOKMAKER_LOCATIONS));
  }
  
  // Update Leaflet map
  if (typeof L !== 'undefined') {
    initializeLeafletMap();
    
    if (leafletMap) {
      // Clear existing markers
      mapMarkers.forEach(marker => leafletMap.removeLayer(marker));
      mapMarkers = [];
      
      // Add markers for each location
      locations.forEach(loc => {
        const popupContent = \`
          <div style="min-width: 200px;">
            <strong>\${loc.name}</strong><br/>
            📍 \${loc.coordinates.latitude.toFixed(2)}°, \${loc.coordinates.longitude.toFixed(2)}°<br/>
            ⛰️ \${loc.coordinates.elevation}m elevation<br/>
            🏙️ \${loc.officeAddress}<br/>
            ⏱️ Latency: \${loc.latencyMs}ms<br/>
            🏆 Sports: \${loc.supportedSports.join(', ')}
          </div>
        \`;
        
        const marker = L.marker([loc.coordinates.latitude, loc.coordinates.longitude])
          .addTo(leafletMap)
          .bindPopup(popupContent);
        
        mapMarkers.push(marker);
      });
      
      // Fit map to show all markers
      if (locations.length > 0) {
        const bounds = L.latLngBounds(locations.map(loc => [loc.coordinates.latitude, loc.coordinates.longitude]));
        leafletMap.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }
  
  // Update location cards grid
  const locationsHtml = locations.map(loc => \`
    <div class="location-pin" style="border-left: 4px solid #17a2b8; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;" 
         onclick="if (leafletMap) { leafletMap.setView([\${loc.coordinates.latitude}, \${loc.coordinates.longitude}], 6); mapMarkers.forEach(m => { if (m.getLatLng().lat === \${loc.coordinates.latitude} && m.getLatLng().lng === \${loc.coordinates.longitude}) m.openPopup(); }); }">
      <strong>\${loc.name}</strong><br/>
      📍 \${loc.coordinates.latitude.toFixed(2)}°, \${loc.coordinates.longitude.toFixed(2)}°<br/>
      ⛰️ \${loc.coordinates.elevation}m elevation<br/>
      🏙️ \${loc.officeAddress}<br/>
      ⏱️ Latency: \${loc.latencyMs}ms<br/>
      🏆 Sports: \${loc.supportedSports.join(', ')}
    </div>
  \`).join('');
  
  document.getElementById('map-locations').innerHTML = locationsHtml || '<p style="color: #666;">No locations match current filters.</p>';
  
  // Initialize map on first load
  if (typeof L !== 'undefined' && !leafletMap) {
    setTimeout(initializeLeafletMap, 100);
  }
}
`;
