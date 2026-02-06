/**
 * JSON Loader - Safe JSON file loading with defaults using Bun.file()
 * 
 * Provides a clean pattern for loading JSON files with type specification,
 * existence checks, and default value creation.
 */

import { StatusOutput } from './output-helpers';


/**
 * Load JSON file with default fallback
 * 
 * @param filePath - Path to JSON file
 * @param defaultValue - Default value if file doesn't exist
 * @param options - Optional file options (type, etc.)
 * @returns Parsed JSON data or default value
 */
export async function loadJSON<T = any>(
  filePath: string,
  defaultValue: T,
  options?: { type?: string; createIfMissing?: boolean }
): Promise<T> {
  const file = Bun.file(filePath, { type: options?.type || 'application/json' });
  
  if (!(await file.exists())) {
    if (options?.createIfMissing !== false) {
      StatusOutput.warning(`File missing—creating default: ${filePath}`);
      await Bun.write(file, JSON.stringify(defaultValue, null, 2));
    }
    return defaultValue;
  }

  try {
    const data = await file.json() as T;
    StatusOutput.success(`Loaded: ${filePath}`);
    return data;
  } catch (error) {
    StatusOutput.error(`Failed to parse JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    // Return default on parse error
    if (options?.createIfMissing !== false) {
      StatusOutput.warning(`Using default value due to parse error`);
    }
    return defaultValue;
  }
}

/**
 * Save JSON file
 * 
 * @param filePath - Path to save JSON file
 * @param data - Data to save
 * @param options - Optional file options (type, etc.)
 */
export async function saveJSON<T = any>(
  filePath: string,
  data: T,
  options?: { type?: string; pretty?: boolean }
): Promise<void> {
  const file = Bun.file(filePath, { type: options?.type || 'application/json' });
  const content = options?.pretty !== false 
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  
  await Bun.write(file, content);
  StatusOutput.success(`Saved: ${filePath}`);
}

/**
 * Load JSON file without creating defaults (throws if missing)
 * 
 * @param filePath - Path to JSON file
 * @param options - Optional file options (type, etc.)
 * @returns Parsed JSON data
 * @throws Error if file doesn't exist or can't be parsed
 */
export async function loadJSONRequired<T = any>(
  filePath: string,
  options?: { type?: string }
): Promise<T> {
  const file = Bun.file(filePath, { type: options?.type || 'application/json' });
  
  if (!(await file.exists())) {
    throw new Error(`Required file missing: ${filePath}`);
  }

  try {
    const data = await file.json() as T;
    StatusOutput.success(`Loaded: ${filePath}`);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
