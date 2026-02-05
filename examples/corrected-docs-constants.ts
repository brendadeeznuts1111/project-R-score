/**
 * Corrected Documentation Constants Example
 * 
 * This shows the proper way to define documentation constants
 * that match our established reference system.
 */

// ✅ CORRECT: Use bun.sh (the actual Bun documentation domain)
const DOCS = {
  BASE: 'https://bun.sh/docs',  // Fixed domain
  TYPED_ARRAY: '/runtime/binary-data#typedarray',
  GUIDES: {
    READ_FILE: '/guides/read-file',
    STREAMS: '/api/streams',
    SERVE: '/api/serve'
  }
} as const;

/**
 * Build URL with proper base and hash handling
 */
function buildUrl(path: string, section?: string): string {
  const url = new URL(path, DOCS.BASE);
  if (section) url.hash = section;
  return url.toString();
}

/**
 * Typed array URLs with proper structure
 */
const TYPED_ARRAY_URLS = {
  BASE: buildUrl(DOCS.TYPED_ARRAY),
  METHODS: buildUrl(DOCS.TYPED_ARRAY, 'methods'),
  CONVERSION: buildUrl(DOCS.TYPED_ARRAY, 'conversion'),
  PERFORMANCE: buildUrl(DOCS.TYPED_ARRAY, 'performance'),
  FILE_READING: {
    ARRAYBUFFER: buildUrl(DOCS.GUIDES.READ_FILE + '/arraybuffer'),
    UINT8ARRAY: buildUrl(DOCS.GUIDES.READ_FILE + '/uint8array'),
    DATAVIEW: buildUrl(DOCS.GUIDES.READ_FILE + '/dataview')
  }
} as const;

// ✅ ALTERNATIVE: Use our established reference system
import { docs, buildDocsUrl } from '../lib/docs-reference.ts';

const SYSTEM_TYPED_ARRAY_URLS = docs.getTypedArrayUrls();

/**
 * Comparison of approaches
 */
console.log('=== Manual Build vs Reference System ===');
console.log('Manual BASE:', TYPED_ARRAY_URLS.BASE);
console.log('System BASE:', SYSTEM_TYPED_ARRAY_URLS.base);
console.log('Manual METHODS:', TYPED_ARRAY_URLS.METHODS);
console.log('System METHODS:', SYSTEM_TYPED_ARRAY_URLS.methods);

/**
 * Usage examples with corrected URLs
 */
function demonstrateUsage() {
  // Your pattern with corrected URLs
  const comment = `For more information on typed array methods, see [Methods](${TYPED_ARRAY_URLS.METHODS}).`;
  console.log(comment);
  
  // Using the reference system (recommended)
  const systemComment = `For performance considerations, see [Performance](${SYSTEM_TYPED_ARRAY_URLS.performance}).`;
  console.log(systemComment);
}

// Test the URLs
console.log('\n=== Generated URLs ===');
console.log('BASE:', TYPED_ARRAY_URLS.BASE);
console.log('METHODS:', TYPED_ARRAY_URLS.METHODS);
console.log('CONVERSION:', TYPED_ARRAY_URLS.CONVERSION);
console.log('PERFORMANCE:', TYPED_ARRAY_URLS.PERFORMANCE);
console.log('FILE_READING.ARRAYBUFFER:', TYPED_ARRAY_URLS.FILE_READING.ARRAYBUFFER);

demonstrateUsage();

/**
 * Benefits of using the reference system:
 * 
 * 1. ✅ Single source of truth
 * 2. ✅ Type safety with TypeScript
 * 3. ✅ Automated validation
 * 4. ✅ Consistent formatting
 * 5. ✅ Easy maintenance
 * 6. ✅ IDE support with snippets
 */
