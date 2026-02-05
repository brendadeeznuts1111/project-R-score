/**
 * Configuration loading utilities
 * 
 * Handles loading configuration from JSON files and merging with defaults
 * Uses Bun's native JSON reading for optimal performance
 */

import { join } from 'path';
import type { SystemConfig } from '../types/config.js';
import { loadConfig } from '../types/config.js';

/**
 * Load configuration from a JSON file, merging with defaults
 * 
 * @param configPath - Path to the configuration file (defaults to config/default.json)
 * @param overrides - Additional configuration overrides
 * @returns Merged system configuration
 */
export async function loadConfigFromFile(
  configPath?: string,
  overrides?: Partial<SystemConfig>
): Promise<SystemConfig> {
  const defaultPath = configPath || join(process.cwd(), 'config', 'default.json');
  
  try {
    const file = Bun.file(defaultPath);
    
    // Check if file exists
    if (!await file.exists()) {
      // File doesn't exist, use defaults only
      return loadConfig(overrides);
    }
    
    // Use Bun's native JSON reading
    const fileConfig = await file.json() as Partial<SystemConfig>;
    
    return loadConfig({ ...fileConfig, ...overrides });
  } catch (error) {
    throw new Error(
      `Failed to load config from ${defaultPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load configuration from environment variables
 * Supports prefix-based loading (e.g., NBA_SWARM_*)
 * 
 * @param prefix - Environment variable prefix (default: 'NBA_SWARM_')
 * @returns Partial configuration object
 */
export function loadConfigFromEnv(prefix: string = 'NBA_SWARM_'): Partial<SystemConfig> {
  const config: Partial<SystemConfig> = {};
  
  // Example: NBA_SWARM_RADAR_PORT -> radar.port
  // This is a simplified implementation - extend as needed
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      const configKey = key.slice(prefix.length).toLowerCase();
      // Simple mapping - extend for nested config
      if (configKey === 'radar_port') {
        config.radar = { ...config.radar, port: parseInt(value || '3333', 10) } as SystemConfig['radar'];
      }
      // Add more mappings as needed
    }
  }
  
  return config;
}

