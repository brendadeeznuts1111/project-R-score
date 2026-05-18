/**
 * JSONC Utilities - Bun Native JSON with Comments Support
 * 
 * Uses Bun.JSONC natively (Bun native always)
 * Benefits from Jan 17, 2026 fix: prevent stack overflow in JSONC parser (commit: 1344151)
 */

/**
 * Parse JSONC (JSON with Comments) natively using Bun.JSONC
 * Supports single-line (//) and block comments
 */
export function parseJSONC<T = unknown>(jsonc: string): T {
  // Bun.JSONC natively handles comments and prevents stack overflow on deeply nested input
  return Bun.JSONC.parse(jsonc) as T;
}

/**
 * Parse JSONC from a file
 */
export async function parseJSONCFile<T = unknown>(path: string): Promise<T> {
  const file = Bun.file(path);
  const content = await file.text();
  return parseJSONC<T>(content);
}

/**
 * Safe JSONC parse with error handling
 */
export function tryParseJSONC<T = unknown>(jsonc: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = Bun.JSONC.parse(jsonc) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
