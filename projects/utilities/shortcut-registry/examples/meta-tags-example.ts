/**
 * Example: Using extractMetaTags macro with HTMLRewriter
 * 
 * This demonstrates the HTMLRewriter pattern from Bun's documentation
 * for extracting meta tags at bundle-time.
 * 
 * To build this example:
 *   bun build examples/meta-tags-example.ts --outdir dist
 */

import { extractMetaTags, extractOpenGraphTags } from '../src/macros/extractMetaTags.ts' with { type: 'macro' };

// These fetch and parse operations happen at build-time
// The results are inlined into the bundle
const meta = await extractMetaTags('https://example.com');
const ogTags = await extractOpenGraphTags('https://example.com');

export const PAGE_META = meta;
export const OPEN_GRAPH_TAGS = ogTags;

export function displayMetaInfo() {
  console.info('=== Page Meta Tags ===');
  console.info(`Title: ${PAGE_META.title}`);
  if (PAGE_META.description) {
    console.info(`Description: ${PAGE_META.description}`);
  }
  if (PAGE_META.viewport) {
    console.info(`Viewport: ${PAGE_META.viewport}`);
  }
  
  console.info('\n=== Open Graph Tags ===');
  Object.entries(OPEN_GRAPH_TAGS).forEach(([key, value]) => {
    console.info(`${key}: ${value}`);
  });
}

// Run if executed directly
if (import.meta.main) {
  displayMetaInfo();
}
