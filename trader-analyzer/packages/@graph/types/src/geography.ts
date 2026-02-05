// Geographic and bookmaker location data for dashboard filtering

export type RegionType = 'UK' | 'Curacao' | 'US-East' | 'US-West' | 'Asia-Pacific';
export type SportType = 'soccer' | 'basketball' | 'tennis' | 'cricket' | 'baseball' | 'hockey' | 'american_football';
export type GeographicZone = 'northern' | 'tropical' | 'southern';
export type ElevationZone = 'sea-level' | 'lowland' | 'highland';

export interface BookmakerLocation {
  name: string;
  region: RegionType;
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

export interface RegionFilter {
  name: string;
  bookmakers: string[];
  timezone: string;
}

export interface GeographicZoneFilter {
  minLat: number;
  maxLat: number;
  name: string;
}

export const BOOKMAKER_LOCATIONS: Record<string, BookmakerLocation> = {
  'bet365': {
    name: 'Bet365',
    region: 'UK',
    country: 'GB',
    coordinates: { latitude: 52.9548, longitude: -1.1496, elevation: 45 },
    officeAddress: 'Stoke-on-Trent, UK',
    timezone: 'Europe/London',
    supportedSports: ['soccer', 'basketball', 'tennis', 'cricket'],
    latencyMs: 12
  },
  'pinnacle': {
    name: 'Pinnacle',
    region: 'Curacao',
    country: 'CW',
    coordinates: { latitude: 12.1696, longitude: -68.9900, elevation: 0 },
    officeAddress: 'Willemstad, Curacao',
    timezone: 'America/Curacao',
    supportedSports: ['soccer', 'basketball', 'baseball', 'hockey'],
    latencyMs: 85
  },
  'fanatics': {
    name: 'Fanatics',
    region: 'US-East',
    country: 'US',
    coordinates: { latitude: 40.7128, longitude: -74.0060, elevation: 10 },
    officeAddress: 'New York, NY, USA',
    timezone: 'America/New_York',
    supportedSports: ['basketball', 'american_football', 'baseball'],
    latencyMs: 5
  },
  'draftkings': {
    name: 'DraftKings',
    region: 'US-West',
    country: 'US',
    coordinates: { latitude: 37.7749, longitude: -122.4194, elevation: 16 },
    officeAddress: 'San Francisco, CA, USA',
    timezone: 'America/Los_Angeles',
    supportedSports: ['basketball', 'american_football', 'baseball', 'hockey'],
    latencyMs: 8
  },
  'betfair-asia': {
    name: 'Betfair Asia',
    region: 'Asia-Pacific',
    country: 'AU',
    coordinates: { latitude: -33.8688, longitude: 151.2093, elevation: 58 },
    officeAddress: 'Sydney, Australia',
    timezone: 'Australia/Sydney',
    supportedSports: ['soccer', 'cricket', 'tennis', 'basketball'],
    latencyMs: 120
  }
} as const;

export const REGION_FILTERS: Record<string, RegionFilter> = {
  'UK': { name: 'United Kingdom', bookmakers: ['bet365'], timezone: 'Europe/London' },
  'Curacao': { name: 'Curacao', bookmakers: ['pinnacle'], timezone: 'America/Curacao' },
  'US-East': { name: 'US East Coast', bookmakers: ['fanatics'], timezone: 'America/New_York' },
  'US-West': { name: 'US West Coast', bookmakers: ['draftkings'], timezone: 'America/Los_Angeles' },
  'Asia-Pacific': { name: 'Asia-Pacific', bookmakers: ['betfair-asia'], timezone: 'Australia/Sydney' }
} as const;

export const GEOGRAPHIC_ZONES: Record<GeographicZone, GeographicZoneFilter> = {
  'northern': { minLat: 50, maxLat: 70, name: 'Northern Hemisphere (50°N-70°N)' },
  'tropical': { minLat: -23.5, maxLat: 23.5, name: 'Tropics (-23.5°S to 23.5°N)' },
  'southern': { minLat: -70, maxLat: -50, name: 'Southern Hemisphere (-70°S to -50°S)' }
} as const;

export const ELEVATION_ZONES: Record<ElevationZone, { min: number; max: number; name: string }> = {
  'sea-level': { min: -10, max: 100, name: 'Sea Level (-10m to 100m)' },
  'lowland': { min: 100, max: 500, name: 'Lowland (100m to 500m)' },
  'highland': { min: 500, max: 2000, name: 'Highland (500m to 2000m)' }
} as const;

// Helper functions
export function getBookmakerLocation(bookmaker: string): BookmakerLocation | undefined {
  return BOOKMAKER_LOCATIONS[bookmaker];
}

export function getBookmakersByRegion(region: RegionType): string[] {
  return REGION_FILTERS[region]?.bookmakers || [];
}

export function getBookmakersByZone(zone: GeographicZone): string[] {
  const zoneFilter = GEOGRAPHIC_ZONES[zone];
  return Object.entries(BOOKMAKER_LOCATIONS)
    .filter(([_, loc]) => loc.coordinates.latitude >= zoneFilter.minLat && loc.coordinates.latitude <= zoneFilter.maxLat)
    .map(([name]) => name);
}

export function getBookmakersByElevation(elevationZone: ElevationZone): string[] {
  const elevationFilter = ELEVATION_ZONES[elevationZone];
  return Object.entries(BOOKMAKER_LOCATIONS)
    .filter(([_, loc]) => loc.coordinates.elevation >= elevationFilter.min && loc.coordinates.elevation <= elevationFilter.max)
    .map(([name]) => name);
}

export function getBookmakersByLatency(maxLatency: number): string[] {
  return Object.entries(BOOKMAKER_LOCATIONS)
    .filter(([_, loc]) => loc.latencyMs <= maxLatency)
    .map(([name]) => name);
}
