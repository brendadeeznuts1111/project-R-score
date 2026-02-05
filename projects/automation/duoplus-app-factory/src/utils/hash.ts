/**
 * Hash utility functions
 *
 * @version 3.6.0
 * @author DuoPlus Team
 * @license MIT
 */

/**
 * Generate a simple hash from a string
 */
export function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
