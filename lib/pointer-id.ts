/**
 * Pointer ID Generation - Stable, deterministic ID generation for pointers
 * 
 * Fixes NaN ID issues by providing deterministic ID generation:
 * - file:// or local paths: CRC32 hash for stable ID
 * - HTTP(S) pointers: Sequential IDs starting at 1000
 */

/**
 * Generate a deterministic ID for a pointer
 * @param url The URL or file path
 * @param index The index in the array (for HTTP ordering)
 * @returns Deterministic numeric ID
 */
export const generatePointerId = (url: string, index: number): number => {
  if (url.startsWith('file://') || url.startsWith('/')) {
    // CRC32 hash of normalized path for stable, deterministic ID
    const normalized = url.replace(/^file:\/\//, '').replace(/\/+/g, '/');
    return (Bun.hash.crc32(new TextEncoder().encode(normalized)) >>> 0) % 100000;
  }
  // HTTP pointers use sequential IDs starting at 1000
  return 1000 + index;
};

/**
 * Map a URL/path to a conceptual label
 * @param url The URL or file path
 * @returns Conceptual label string
 */
export const getConceptual = (url: string): string => {
  const mappings: [RegExp, string][] = [
    [/blog/, 'Bun blog'],
    [/docs\/api\/utils/, 'Bun deep equals utility'],
    [/docs\/cli\/bunx/, 'Bun package manager'],
    [/docs\/runtime\/shell/, 'Bun shell runtime'],
    [/docs/, 'Bun documentation'],
    [/\.md$/, 'Documentation source'],
    [/cli\.ts$/, 'CLI tooling'],
    [/server\.ts$/, 'Server runtime'],
    [/guide.*\.ts$/, 'Guide utility'],
    [/overseer.*\.ts$/, 'Overseer daemon'],
    [/entry-guard/, 'Entry guard'],
    [/terminal.*\.ts$/, 'Terminal tool'],
  ];

  for (const [regex, conceptual] of mappings) {
    if (regex.test(url)) return conceptual;
  }
  return 'System resource';
};
