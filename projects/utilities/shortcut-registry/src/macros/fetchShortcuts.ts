/**
 * Bun Macro: Fetch shortcuts from API at bundle-time
 * 
 * This macro demonstrates using fetch() in macros to make HTTP requests
 * during bundling. The response is inlined into your bundle.
 * 
 * @example
 * ```ts
 * import { fetchShortcutsFromAPI } from './macros/fetchShortcuts.ts' with { type: 'macro' };
 * 
 * // This fetch happens at build-time, not runtime
 * const shortcuts = await fetchShortcutsFromAPI('http://localhost:3000/api/shortcuts');
 * ```
 */

import type { ShortcutConfig } from '../types';

/**
 * Fetch shortcuts from the ShortcutRegistry API at bundle-time
 * 
 * The URL must be statically known (a string literal or result of another macro).
 * The fetch happens during bundling and the result is inlined.
 * 
 * @param url - API endpoint URL (must be statically known)
 * @returns Array of shortcuts from the API
 */
export async function fetchShortcutsFromAPI(url: string): Promise<ShortcutConfig[]> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const shortcuts = await response.json() as ShortcutConfig[];
    return shortcuts;
  } catch (error) {
    // If fetch fails at build-time, return empty array
    // This allows the build to continue even if API is not available
    console.warn(`Failed to fetch shortcuts from ${url}:`, error);
    return [];
  }
}

/**
 * Fetch API metadata at bundle-time
 * 
 * Fetches information about the API server, including available endpoints
 * and seed modes.
 */
export async function fetchAPIMetadata(baseUrl: string = 'http://localhost:3000'): Promise<{
  seedAvailable: boolean;
  seedHeader: string;
  seedModes: string[];
  endpoints: string[];
}> {
  try {
    // Fetch any endpoint to get headers
    const response = await fetch(`${baseUrl}/api/shortcuts`);
    
    const seedAvailable = response.headers.get('X-Seed-Available') === 'true';
    const seedHeader = response.headers.get('X-Seed-Header') || 'X-Seed-Data';
    const seedModes = response.headers.get('X-Seed-Modes')?.split(',') || [];
    
    return {
      seedAvailable,
      seedHeader,
      seedModes,
      endpoints: [
        '/api/shortcuts',
        '/api/profiles',
        '/api/conflicts',
        '/api/stats/usage',
      ],
    };
  } catch (error) {
    // Return default metadata if API is not available
    return {
      seedAvailable: false,
      seedHeader: 'X-Seed-Data',
      seedModes: ['default', 'clear', 'test', 'full'],
      endpoints: [],
    };
  }
}

/**
 * Fetch shortcut statistics from API at bundle-time
 */
export async function fetchShortcutStats(
  baseUrl: string = 'http://localhost:3000',
  days: number = 30
): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/stats/usage?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch stats from ${baseUrl}:`, error);
    return { error: 'Stats unavailable at build time' };
  }
}
