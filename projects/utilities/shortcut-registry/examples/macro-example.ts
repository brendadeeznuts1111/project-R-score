/**
 * Example: Using Bun Macros with ShortcutRegistry
 * 
 * This file demonstrates how to use Bun macros to embed shortcuts
 * and build information at bundle-time.
 * 
 * To build this example:
 *   bun build examples/macro-example.ts --outdir dist
 */

// Import macros using the import attribute syntax
import { getDefaultShortcuts, getShortcutIds } from '../src/macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getGitCommitHash, getShortCommitHash } from '../src/macros/getGitCommitHash.ts' with { type: 'macro' };
import { validateShortcuts, getShortcutStats } from '../src/macros/validateShortcuts.ts' with { type: 'macro' };
import { getBuildInfo, getBuildVersion } from '../src/macros/getBuildInfo.ts' with { type: 'macro' };

// These values are computed at build-time and inlined into the bundle
// Note: Bun automatically awaits async macros
const shortcuts = getDefaultShortcuts();
const shortcutIds = getShortcutIds();
const commitHash = getGitCommitHash();
const shortCommit = getShortCommitHash();
const buildInfo = await getBuildInfo();
const buildVersion = await getBuildVersion();
const stats = getShortcutStats();

// Example: Fetch from API at build-time (uncomment to test)
// Note: API must be running at build time for this to work
// import { fetchShortcutsFromAPI } from '../src/macros/fetchShortcuts.ts' with { type: 'macro' };
// const apiShortcuts = await fetchShortcutsFromAPI('http://localhost:3000/api/shortcuts');

// Example: Extract meta tags using HTMLRewriter (commented out by default)
// Uncomment to test HTML parsing at build-time:
// import { extractMetaTags } from '../src/macros/extractMetaTags.ts' with { type: 'macro' };
// const pageMeta = await extractMetaTags('https://example.com');

// Validate shortcuts at build-time and handle result
const validationResult = validateShortcuts();
if (!validationResult.valid) {
  console.error('Shortcut validation failed:', validationResult.errors);
  // In a real build, you might want to throw here or handle differently
}

// Export build-time information
export const BUILD_INFO = {
  version: buildInfo.version,
  buildTime: buildInfo.buildTime,
  commit: shortCommit,
  platform: buildInfo.platform,
};

// Export embedded shortcuts
export const EMBEDDED_SHORTCUTS = shortcuts;

// Export shortcut statistics
export const SHORTCUT_STATS = stats;

// Example function that uses the embedded data
export function displayBuildInfo() {
  console.log('=== ShortcutRegistry Build Info ===');
  console.log(`Version: ${BUILD_INFO.version}`);
  console.log(`Build Time: ${BUILD_INFO.buildTime}`);
  console.log(`Git Commit: ${BUILD_INFO.commit}`);
  console.log(`Platform: ${BUILD_INFO.platform}`);
  console.log('');
  console.log('=== Shortcut Statistics ===');
  console.log(`Total Shortcuts: ${SHORTCUT_STATS.total}`);
  console.log(`By Category:`, SHORTCUT_STATS.byCategory);
  console.log(`By Scope:`, SHORTCUT_STATS.byScope);
  console.log('');
  console.log('=== Available Shortcuts ===');
  shortcutIds.forEach(id => {
    const shortcut = shortcuts.find(s => s.id === id);
    if (shortcut) {
      console.log(`  ${id}: ${shortcut.description} (${shortcut.default.primary})`);
    }
  });
}

// Run if executed directly
if (import.meta.main) {
  displayBuildInfo();
}
