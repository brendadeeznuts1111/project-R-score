#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive demo of Bun-native utility APIs
 * @description Demonstrates Bun-native utility APIs including file operations, cryptographic hashing, high-precision timing, inspection utilities, glob patterns, and binary data handling. Shows zero-dependency Bun-native alternatives to Node.js patterns.
 * @module examples/demos/demo-bun-utils
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.2.0.0.0.0.0;instance-id=EXAMPLE-BUN-UTILS-001;version=6.2.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Bun Utils Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.2.0.0.0.0.0"}}]
 * [CLASS:BunUtilsDemo][#REF:v-6.2.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.2.0.0.0.0.0
 * Ripgrep Pattern: 6\.2\.0\.0\.0\.0\.0|EXAMPLE-BUN-UTILS-001|BP-EXAMPLE@6\.2\.0\.0\.0\.0\.0
 * 
 * Demonstrates:
 * - Binary Data - TypedArrays, ArrayBuffer, DataView (Web Standards)
 * - Bun.file() - File operations (read, write, exists, size, type)
 * - Bun.CryptoHasher - Cryptographic hashing (SHA-256, SHA-1, MD5)
 * - Bun.nanoseconds() - High-precision timing
 * - Bun.inspect() - Pretty printing and debugging
 * - Bun.Glob() - File pattern matching
 * - Bun.write() - File writing
 * - Integration with HTMLRewriter
 * 
 * @example 6.2.0.0.0.0.0.1: Bun.file() Usage
 * // Test Formula:
 * // 1. Create Bun.file() reference
 * // 2. Write content using Bun.write()
 * // 3. Read content using .text(), .json(), or .arrayBuffer()
 * // 4. Check file properties (.exists(), .size, .type)
 * // Expected Result: File operations complete successfully
 * //
 * // Snippet:
 * ```typescript
 * const file = Bun.file('/tmp/test.txt');
 * await Bun.write(file, 'Hello, Bun!');
 * const content = await file.text();
 * console.log(content); // "Hello, Bun!"
 * ```
 * 
 * @example 6.2.0.0.0.0.0.2: Bun.CryptoHasher Usage
 * // Test Formula:
 * // 1. Create CryptoHasher instance with algorithm
 * // 2. Update with data (can be called multiple times)
 * // 3. Get digest in hex or binary format
 * // Expected Result: Cryptographic hash generated successfully
 * //
 * // Snippet:
 * ```typescript
 * const hasher = new Bun.CryptoHasher('sha256');
 * hasher.update('Hello, Bun!');
 * const hash = hasher.digest('hex');
 * ```
 * 
 * @see {@link https://bun.com/docs/api/file-io Bun File I/O Documentation}
 * @see {@link https://bun.com/docs/api/crypto Bun Crypto Documentation}
 * @see {@link ../../docs/BUN-1.2.11-IMPROVEMENTS.md Bun v1.2.11 Crypto Improvements} - KeyObject hierarchy, structuredClone support, generatePrime return type fix
 * @see {@link ../../docs/BUN-TYPE-DEFINITION-FIXES.md Bun Type Definition Fixes} - TypeScript improvements
 * 
 * // Ripgrep: 6.2.0.0.0.0.0
 * // Ripgrep: EXAMPLE-BUN-UTILS-001
 * // Ripgrep: BP-EXAMPLE@6.2.0.0.0.0.0
 * 
 * Run: bun run scripts/demo-bun-utils.ts
 */

// Make this file a module to support top-level await
export { };

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.0 UTILITIES & HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * ANSI color codes for better output formatting
 */
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

/**
 * Helper function to run demos with error handling
 */
async function runDemo(
  name: string,
  description: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  console.log(`\n📋 ${name}`);
  console.log('-'.repeat(70));
  console.log(`💡 ${description}\n`);
  
  try {
    await fn();
    console.log(colors.green('✅ Success\n'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(colors.yellow(`⚠️  Error: ${message}\n`));
  }
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format nanoseconds to human-readable time
 */
function formatTime(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(3)} ms`;
  return `${(ns / 1_000_000_000).toFixed(3)} s`;
}

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.1 MAIN DEMO
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log(colors.bold('  Bun.utils Comprehensive Demo'));
console.log('═'.repeat(70) + '\n');
console.log(colors.dim('Demonstrating Bun-native utility APIs with zero dependencies\n'));

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.2 DEMO 1: Bun.file() - File Operations
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 1: Bun.file() - File Operations',
  'Bun-native file API - no fs imports needed!',
  async () => {
    // Create a temporary test file
    const testFile = Bun.file('/tmp/bun-utils-demo.txt');
    const testContent = 'Hello from Bun.utils!\nThis is a test file for demonstrating Bun-native APIs.\n\nFeatures:\n- Zero dependencies\n- Type-safe APIs\n- Better performance';
    
    // Write file using Bun.write()
    const bytesWritten = await Bun.write(testFile, testContent);
    console.log(`${colors.green('✅')} Bun.write() - Wrote ${colors.cyan(formatBytes(bytesWritten))}`);
    
    // Read file as text using Bun.file().text()
    const fileText = await testFile.text();
    console.log(`${colors.green('✅')} Bun.file().text() - Read file content:`);
    console.log(`   ${colors.dim(`"${fileText.substring(0, 60)}..."`)}`);
    
    // Check if file exists
    const exists = await testFile.exists();
    console.log(`${colors.green('✅')} Bun.file().exists() - File exists: ${colors.cyan(String(exists))}`);
    
    // Get file size
    const size = testFile.size;
    console.log(`${colors.green('✅')} Bun.file().size - File size: ${colors.cyan(formatBytes(size))}`);
    
    // Get file type (MIME)
    const type = testFile.type;
    console.log(`${colors.green('✅')} Bun.file().type - MIME type: ${colors.cyan(type)}`);
    
    // Read as JSON (create JSON file for demo)
    const jsonFile = Bun.file('/tmp/bun-utils-demo.json');
    const jsonData = { 
      name: 'Bun', 
      version: '1.4+', 
      native: true,
      features: ['HTMLRewriter', 'Bun.file', 'Bun.CryptoHasher'],
      timestamp: new Date().toISOString(),
    };
    await Bun.write(jsonFile, JSON.stringify(jsonData, null, 2));
    const parsedJson = await jsonFile.json();
    console.log(`${colors.green('✅')} Bun.file().json() - Read JSON:`);
    console.log(`   ${colors.dim(JSON.stringify(parsedJson, null, 2).split('\n').slice(0, 3).join('\n   '))}...`);
    
    // Read as ArrayBuffer
    const buffer = await testFile.arrayBuffer();
    console.log(`${colors.green('✅')} Bun.file().arrayBuffer() - Read as buffer: ${colors.cyan(formatBytes(buffer.byteLength))}`);
    
    // Cleanup
    try {
      await Bun.write(testFile, '');
      await Bun.write(jsonFile, '');
      console.log(`${colors.green('✅')} Cleanup complete`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.3 DEMO 2: Bun.CryptoHasher - Cryptographic Hashing
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 2: Bun.CryptoHasher - Cryptographic Hashing',
  'Bun-native crypto API - faster than Node.js crypto!',
  async () => {
    const testString = 'Hello, Bun! This is a test string for hashing.';
    
    // SHA-256 hashing (recommended)
    const sha256Hasher = new Bun.CryptoHasher('sha256');
    sha256Hasher.update(testString);
    const sha256Hash = sha256Hasher.digest('hex');
    console.log(`${colors.green('✅')} SHA-256 hash (recommended):`);
    console.log(`   ${colors.cyan(sha256Hash)}`);
    
    // SHA-1 hashing (legacy)
    const sha1Hasher = new Bun.CryptoHasher('sha1');
    sha1Hasher.update(testString);
    const sha1Hash = sha1Hasher.digest('hex');
    console.log(`${colors.green('✅')} SHA-1 hash (legacy):`);
    console.log(`   ${colors.dim(sha1Hash)}`);
    
    // MD5 hashing (legacy, not cryptographically secure)
    const md5Hasher = new Bun.CryptoHasher('md5');
    md5Hasher.update(testString);
    const md5Hash = md5Hasher.digest('hex');
    console.log(`${colors.green('✅')} MD5 hash (legacy, not secure):`);
    console.log(`   ${colors.dim(md5Hash)}`);
    
    // Binary digest
    const binaryHasher = new Bun.CryptoHasher('sha256');
    binaryHasher.update(testString);
    const binaryDigest = binaryHasher.digest();
    console.log(`${colors.green('✅')} Binary digest (Uint8Array): ${colors.cyan(formatBytes(binaryDigest.length))}`);
    
    // Streaming large data
    const streamHasher = new Bun.CryptoHasher('sha256');
    const chunks = ['chunk1', 'chunk2', 'chunk3'];
    for (const chunk of chunks) {
      streamHasher.update(chunk);
    }
    const streamHash = streamHasher.digest('hex');
    console.log(`${colors.green('✅')} Streaming hash (multiple updates):`);
    console.log(`   ${colors.cyan(streamHash.substring(0, 32))}...`);
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.4 DEMO 3: Bun.nanoseconds() - High-Precision Timing
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 3: Bun.nanoseconds() - High-Precision Timing',
  'Nanosecond precision timing - better than performance.now()!',
  async () => {
    // Measure operation time
    const startTime = Bun.nanoseconds();
    
    // Simulate some work
    await Bun.sleep(10); // Sleep for 10ms
    const endTime = Bun.nanoseconds();
    const durationNs = endTime - startTime;
    
    console.log(`${colors.green('✅')} Timing measurement:`);
    console.log(`   Start: ${colors.dim(String(startTime))} ns`);
    console.log(`   End: ${colors.dim(String(endTime))} ns`);
    console.log(`   Duration: ${colors.cyan(formatTime(durationNs))}`);
    
    // Compare with performance.now()
    const perfStart = performance.now();
    await Bun.sleep(10);
    const perfEnd = performance.now();
    const perfDuration = perfEnd - perfStart;
    
    console.log(`\n📊 Comparison:`);
    console.log(`   ${colors.cyan('Bun.nanoseconds()')}: ${formatTime(durationNs)}`);
    console.log(`   ${colors.dim('performance.now()')}: ${perfDuration.toFixed(3)} ms`);
    console.log(`   ${colors.green('Precision')}: Bun.nanoseconds() has nanosecond precision vs millisecond precision`);
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.5 DEMO 4: Bun.inspect() - Pretty Printing
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 4: Bun.inspect() - Pretty Printing',
  'Bun-native inspection - better than util.inspect()!',
  async () => {
    const complexObject = {
      name: 'Bun',
      version: '1.4+',
      features: ['HTMLRewriter', 'Bun.file', 'Bun.CryptoHasher', 'Bun.nanoseconds'],
      nested: {
        deep: {
          value: 42,
          array: [1, 2, 3, { nested: 'object' }],
        },
      },
      date: new Date(),
      regex: /test/gi,
      symbol: Symbol('test'),
      nullValue: null,
      undefinedValue: undefined,
    };
    
    // Default inspection
    console.log(`${colors.green('✅')} Bun.inspect() - Default (with colors):`);
    console.log(Bun.inspect(complexObject, { colors: true }));
    console.log();
    
    // With custom depth
    console.log(`${colors.green('✅')} Bun.inspect() - Limited depth (depth: 2):`);
    console.log(Bun.inspect(complexObject, { colors: true, depth: 2 }));
    console.log();
    
    // Compact mode
    console.log(`${colors.green('✅')} Bun.inspect() - Compact mode:`);
    console.log(Bun.inspect(complexObject, { compact: true }));
    console.log();
    
    // Sorted keys
    console.log(`${colors.green('✅')} Bun.inspect() - Sorted keys:`);
    console.log(Bun.inspect(complexObject, { sorted: true, colors: true }));
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.6 DEMO 5: Bun.Glob() - File Pattern Matching
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 5: Bun.Glob() - File Pattern Matching',
  'Bun-native glob patterns - faster than glob packages!',
  async () => {
    // Create test files for glob matching
    const testDir = '/tmp/bun-glob-test';
    const testFiles = [
      `${testDir}/file1.txt`,
      `${testDir}/file2.txt`,
      `${testDir}/file3.js`,
      `${testDir}/nested/file4.ts`,
      `${testDir}/nested/deep/file5.json`,
    ];
    
    // Create test files
    for (const filePath of testFiles) {
      await Bun.write(filePath, `test content for ${filePath}`);
    }
    
    // Match all .txt files
    const txtGlob = new Bun.Glob('*.txt');
    const txtFiles: string[] = [];
    for await (const file of txtGlob.scan(testDir)) {
      txtFiles.push(file);
    }
    console.log(`${colors.green('✅')} Bun.Glob('*.txt') - Found ${colors.cyan(String(txtFiles.length))} files:`);
    txtFiles.forEach(file => console.log(`   ${colors.dim(file)}`));
    
    // Match all .js files recursively
    const jsGlob = new Bun.Glob('**/*.js');
    const jsFiles: string[] = [];
    for await (const file of jsGlob.scan(testDir)) {
      jsFiles.push(file);
    }
    console.log(`\n${colors.green('✅')} Bun.Glob('**/*.js') - Found ${colors.cyan(String(jsFiles.length))} files:`);
    jsFiles.forEach(file => console.log(`   ${colors.dim(file)}`));
    
    // Match TypeScript files recursively
    const tsGlob = new Bun.Glob('**/*.ts');
    const tsFiles: string[] = [];
    for await (const file of tsGlob.scan(testDir)) {
      tsFiles.push(file);
    }
    console.log(`\n${colors.green('✅')} Bun.Glob('**/*.ts') - Found ${colors.cyan(String(tsFiles.length))} files:`);
    tsFiles.forEach(file => console.log(`   ${colors.dim(file)}`));
    
    // Cleanup
    try {
      for (const filePath of testFiles) {
        await Bun.write(filePath, '');
      }
      console.log(`\n${colors.green('✅')} Cleanup complete`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.7 DEMO 6: Integration with HTMLRewriter
// ═══════════════════════════════════════════════════════════════

const HTMLRewriter = (globalThis as any).HTMLRewriter;

if (HTMLRewriter) {
  await runDemo(
    'Demo 6: Bun.utils Integration with HTMLRewriter',
    'Combining Bun-native utilities with HTMLRewriter',
    async () => {
      // Create HTML content
      const htmlContent = `
        <html>
        <head><title>Bun Utils Demo</title></head>
        <body>
          <h1>Welcome</h1>
          <p>This content will be transformed using HTMLRewriter</p>
          <div data-hash="placeholder">Content to hash</div>
          <p data-timestamp="placeholder">This paragraph will get a timestamp</p>
        </body>
        </html>
      `;
      
      // Measure transformation time using Bun.nanoseconds()
      const transformStart = Bun.nanoseconds();
      
      // Transform HTML with HTMLRewriter
      const rewriter = new HTMLRewriter()
        .on('title', {
          element(el) {
            el.setInnerContent('Bun Utils + HTMLRewriter Demo');
          },
        })
        .on('h1', {
          element(el) {
            el.setAttribute('data-processed', 'true');
            el.setAttribute('style', 'color: #667eea;');
          },
        })
        .on('div[data-hash]', {
          element(el) {
            // Use Bun.CryptoHasher to hash content
            const content = el.textContent || '';
            const hasher = new Bun.CryptoHasher('sha256');
            hasher.update(content);
            const hash = hasher.digest('hex').substring(0, 16);
            el.setAttribute('data-hash', hash);
            el.setAttribute('title', `SHA-256 hash: ${hash}`);
          },
        })
        .on('p[data-timestamp]', {
          element(el) {
            // Use Bun.nanoseconds() for timestamp
            const timestamp = Bun.nanoseconds();
            el.setAttribute('data-timestamp', String(timestamp));
            el.setAttribute('title', `Processed at: ${formatTime(timestamp)}`);
          },
        });
      
      const transformed = rewriter.transform(new Response(htmlContent));
      const result = await transformed.text();
      
      const transformEnd = Bun.nanoseconds();
      const transformDuration = transformEnd - transformStart;
      
      console.log(`${colors.green('✅')} HTMLRewriter transformation (with Bun.utils):`);
      console.log(`   Duration: ${colors.cyan(formatTime(transformDuration))}`);
      console.log(`   Result preview: ${colors.dim(result.substring(0, 80).replace(/\s+/g, ' '))}...`);
      
      // Write transformed HTML to file using Bun.write()
      const outputFile = Bun.file('/tmp/bun-rewriter-output.html');
      await Bun.write(outputFile, result);
      console.log(`\n${colors.green('✅')} Written transformed HTML using Bun.write()`);
      console.log(`   File size: ${colors.cyan(formatBytes(outputFile.size))}`);
      console.log(`   File type: ${colors.cyan(outputFile.type)}`);
      
      // Cleanup
      try {
        await Bun.write(outputFile, '');
        console.log(`${colors.green('✅')} Cleanup complete`);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    },
  );
} else {
  console.log(`\n${colors.yellow('⚠️')}  HTMLRewriter not available - skipping integration demo\n`);
}

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.8 DEMO 7: Bun Globals
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 7: Bun Globals - Web APIs & Node.js Compatibility',
  'Bun implements comprehensive global objects from Web APIs and Node.js',
  async () => {
    // Web API Globals
    console.log(`${colors.green('✅')} Web API Globals:`);
    
    // Fetch API (global)
    console.log(`   ${colors.cyan('fetch')} - Available globally`);
    try {
      const response = await fetch('https://httpbin.org/json');
      const data = await response.json();
      console.log(`   ${colors.dim('   Fetched JSON:')} ${JSON.stringify(data).substring(0, 40)}...`);
    } catch (error) {
      console.log(`   ${colors.dim('   (Network request skipped in demo)')}`);
    }
    
    // URL API (global)
    const url = new URL('https://example.com/path?query=value');
    url.searchParams.set('new', 'param');
    console.log(`   ${colors.cyan('URL')} - ${colors.dim(url.toString())}`);
    
    // TextEncoder/Decoder (global)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const encoded = encoder.encode('Hello, Bun!');
    const decoded = decoder.decode(encoded);
    console.log(`   ${colors.cyan('TextEncoder/Decoder')} - ${colors.dim(`"${decoded}"`)}`);
    
    // Base64 encoding (global)
    const base64 = btoa('Hello, Bun!');
    const decodedBase64 = atob(base64);
    console.log(`   ${colors.cyan('btoa/atob')} - ${colors.dim(`"${decodedBase64}"`)}`);
    
    // FormData (global)
    const formData = new FormData();
    formData.append('name', 'Bun');
    formData.append('version', '1.4+');
    console.log(`   ${colors.cyan('FormData')} - ${colors.dim(`${formData.get('name')} ${formData.get('version')}`)}`);
    
    // Headers (global)
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('X-Custom', 'value');
    console.log(`   ${colors.cyan('Headers')} - ${colors.dim(`${headers.get('Content-Type')}, ${headers.get('X-Custom')}`)}`);
    
    // Crypto API (global)
    const uuid = crypto.randomUUID();
    console.log(`   ${colors.cyan('crypto.randomUUID()')} - ${colors.dim(uuid)}`);
    
    // Node.js Globals
    console.log(`\n${colors.green('✅')} Node.js Globals:`);
    console.log(`   ${colors.cyan('process')} - ${colors.dim(`Platform: ${process.platform}, Node: ${process.version}`)}`);
    console.log(`   ${colors.cyan('Buffer')} - ${colors.dim(`Available: ${typeof Buffer !== 'undefined'}`)}`);
    console.log(`   ${colors.cyan('__dirname')} - ${colors.dim(__dirname.substring(0, 50))}...`);
    console.log(`   ${colors.cyan('__filename')} - ${colors.dim(__filename.substring(0, 50))}...`);
    
    // Bun-Specific Globals
    console.log(`\n${colors.green('✅')} Bun-Specific Globals:`);
    console.log(`   ${colors.cyan('Bun')} - ${colors.dim('Available with all Bun APIs')}`);
    console.log(`   ${colors.cyan('HTMLRewriter')} - ${colors.dim(HTMLRewriter ? 'Available' : 'Not available')}`);
    
    // Timing Globals
    console.log(`\n${colors.green('✅')} Timing Globals:`);
    console.log(`   ${colors.cyan('setTimeout')} - Available globally`);
    console.log(`   ${colors.cyan('setInterval')} - Available globally`);
    // queueMicrotask - Improved error handling in Bun v1.2.11+
    // @see ../../docs/BUN-1.2.11-IMPROVEMENTS.md - queueMicrotask error handling fix
    console.log(`   ${colors.cyan('queueMicrotask')} - Available globally`);
    
    // Event API (global)
    console.log(`\n${colors.green('✅')} Event API (global):`);
    const eventTarget = new EventTarget();
    let eventReceived = false;
    eventTarget.addEventListener('test', () => {
      eventReceived = true;
    });
    eventTarget.dispatchEvent(new CustomEvent('test', { detail: { data: 'value' } }));
    console.log(`   ${colors.cyan('EventTarget')} - ${colors.dim(`Event received: ${eventReceived}`)}`);
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.9 DEMO 8: Performance Comparison
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 7: Performance Comparison',
  'Bun-native APIs vs Node.js patterns',
  async () => {
    const iterations = 1000;
    const testData = 'x'.repeat(1000);
    
    // Bun.CryptoHasher performance
    const bunHashStart = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(testData);
      hasher.digest('hex');
    }
    const bunHashEnd = Bun.nanoseconds();
    const bunHashDuration = bunHashEnd - bunHashStart;
    
    console.log(`${colors.green('✅')} Bun.CryptoHasher performance:`);
    console.log(`   ${colors.cyan(String(iterations))} iterations: ${colors.cyan(formatTime(bunHashDuration))}`);
    console.log(`   Average: ${colors.cyan(formatTime(bunHashDuration / iterations))} per hash`);
    
    // Bun.nanoseconds() precision demo
    console.log(`\n${colors.green('✅')} Bun.nanoseconds() precision (consecutive calls):`);
    const precisionMeasurements: number[] = [];
    for (let i = 0; i < 5; i++) {
      const ns1 = Bun.nanoseconds();
      const ns2 = Bun.nanoseconds();
      const diff = ns2 - ns1;
      precisionMeasurements.push(diff);
      console.log(`   Measurement ${i + 1}: ${colors.cyan(formatTime(diff))} difference`);
    }
    const avgPrecision = precisionMeasurements.reduce((a, b) => a + b, 0) / precisionMeasurements.length;
    console.log(`   Average precision: ${colors.cyan(formatTime(avgPrecision))}`);
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.10 DEMO 9: Binary Data & TypedArrays
// ═══════════════════════════════════════════════════════════════

await runDemo(
  'Demo 9: Binary Data & TypedArrays',
  'Web Standards binary data handling with TypedArrays, ArrayBuffer, and DataView',
  async () => {
    // TypedArrays
    console.log(`${colors.green('✅')} TypedArrays:`);
    const uint8 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    console.log(`   ${colors.cyan('Uint8Array')}: [${Array.from(uint8).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    
    const int32 = new Int32Array([-2147483648, 0, 2147483647]);
    console.log(`   ${colors.cyan('Int32Array')}: [${Array.from(int32).join(', ')}]`);
    
    const float64 = new Float64Array([Math.PI, Math.E]);
    console.log(`   ${colors.cyan('Float64Array')}: [${float64.map(f => f.toFixed(6)).join(', ')}]`);
    
    // ArrayBuffer
    console.log(`\n${colors.green('✅')} ArrayBuffer:`);
    const buffer = new ArrayBuffer(16);
    console.log(`   Buffer size: ${colors.cyan(formatBytes(buffer.byteLength))}`);
    
    // Multiple views of same buffer
    const uint8View = new Uint8Array(buffer);
    const int32View = new Int32Array(buffer);
    uint8View[0] = 0xFF;
    console.log(`   Shared buffer: uint8[0]=${uint8View[0]}, int32[0]=${int32View[0]}`);
    
    // DataView pattern (user's specific request)
    console.log(`\n${colors.green('✅')} DataView from TypedArray pattern:`);
    const arr: Uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    const valueLE = dv.getUint32(0, true); // little-endian
    const valueBE = dv.getUint32(0, false); // big-endian
    console.log(`   Original: [${Array.from(arr).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    console.log(`   Little-endian uint32: ${colors.cyan(`0x${valueLE.toString(16).padStart(8, '0')}`)}`);
    console.log(`   Big-endian uint32: ${colors.cyan(`0x${valueBE.toString(16).padStart(8, '0')}`)}`);
    
    // String conversion
    console.log(`\n${colors.green('✅')} String conversion:`);
    const encoder = new TextEncoder();
    const bytes = encoder.encode('Hello, Bun!');
    console.log(`   Encoded: [${Array.from(bytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    
    const decoder = new TextDecoder();
    const str = decoder.decode(bytes);
    console.log(`   Decoded: ${colors.cyan(`"${str}"`)}`);
    
    // DataView to string conversion
    console.log(`\n${colors.green('✅')} DataView to string conversion:`);
    const buffer2 = new ArrayBuffer(12);
    const dv2 = new DataView(buffer2);
    const textBytes = [0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x42, 0x75, 0x6E, 0x21]; // "Hello, Bun!"
    for (let i = 0; i < textBytes.length; i++) {
      dv2.setUint8(i, textBytes[i]);
    }
    const strFromDV = decoder.decode(new Uint8Array(buffer2)); // Convert DataView buffer to Uint8Array
    console.log(`   DataView bytes: [${Array.from(textBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    console.log(`   Decoded from DataView: ${colors.cyan(`"${strFromDV}"`)}`);
    
    // File operations with binary data
    console.log(`\n${colors.green('✅')} File operations with binary data:`);
    const testFile = Bun.file('/tmp/bun-binary-demo.bin');
    const testData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    await Bun.write(testFile, testData);
    console.log(`   Written: ${colors.cyan(formatBytes(testData.length))} bytes`);
    
    const fileBuffer = await testFile.arrayBuffer();
    const fileView = new Uint8Array(fileBuffer);
    console.log(`   Read back: [${Array.from(fileView).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
    
    // Crypto with binary data
    console.log(`\n${colors.green('✅')} Crypto with binary data:`);
    const hasher = new Bun.CryptoHasher('sha256');
    const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
    hasher.update(binaryData);
    const hash = hasher.digest(); // Returns Uint8Array
    console.log(`   Input: [${Array.from(binaryData).join(', ')}]`);
    console.log(`   Hash (Uint8Array): ${colors.cyan(formatBytes(hash.length))} bytes`);
    console.log(`   Hash (hex): ${colors.cyan(Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32))}...`);
    
    // Subarray vs slice
    console.log(`\n${colors.green('✅')} Subarray vs slice:`);
    const original = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const sub = original.subarray(2, 5); // Shares buffer
    const copy = original.slice(2, 5); // New buffer
    sub[0] = 99; // Modifies original
    copy[0] = 88; // Does NOT modify original
    console.log(`   Original: [${Array.from(original).join(', ')}]`);
    console.log(`   Subarray (shared): [${Array.from(sub).join(', ')}] - ${colors.dim('modifies original')}`);
    console.log(`   Slice (copy): [${Array.from(copy).join(', ')}] - ${colors.dim('independent')}`);
    
    // Cleanup
    try {
      await Bun.write(testFile, '');
      console.log(`\n${colors.green('✅')} Cleanup complete`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// 6.2.0.0.0.0.0.4.11 SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log(colors.bold('  Demo Complete!'));
console.log('═'.repeat(70));
console.log(`\n${colors.green('💡')} Key Takeaways:`);
console.log(`  ${colors.green('✅')} Bun Globals - Web APIs, Node.js, and Bun-specific APIs available`);
console.log(`  ${colors.green('✅')} Binary Data - TypedArrays, ArrayBuffer, DataView (Web Standards)`);
console.log(`  ${colors.green('✅')} Bun.file() - Zero-dependency file operations`);
console.log(`  ${colors.green('✅')} Bun.CryptoHasher - Fast cryptographic hashing`);
console.log(`  ${colors.green('✅')} Bun.nanoseconds() - Nanosecond precision timing`);
console.log(`  ${colors.green('✅')} Bun.inspect() - Better than util.inspect()`);
console.log(`  ${colors.green('✅')} Bun.Glob() - Fast file pattern matching`);
console.log(`  ${colors.green('✅')} Bun.write() - Simple file writing`);
console.log(`\n${colors.cyan('🚀')} Bun-Native Advantages:`);
console.log(`  ${colors.dim('•')} Comprehensive globals - Web APIs, Node.js, and Bun-specific`);
console.log(`  ${colors.dim('•')} Zero dependencies - no fs, crypto, util imports needed`);
console.log(`  ${colors.dim('•')} Better performance - optimized native implementations`);
console.log(`  ${colors.dim('•')} Hyper-Bun manifesto compliance`);
console.log(`  ${colors.dim('•')} Type-safe APIs with full TypeScript support`);
console.log(`  ${colors.dim('•')} Better error handling and edge case support`);
console.log(`  ${colors.dim('•')} Web standard compatibility - fetch, streams, crypto, etc.`);
console.log(`\n${colors.blue('📚')} Documentation:`);
console.log(`  ${colors.dim('https://bun.com/docs/api/file-io')}`);
console.log(`  ${colors.dim('https://bun.com/docs/api/crypto')}`);
console.log(`  ${colors.dim('https://bun.com/docs/api/utilities')}`);
console.log(`\n${colors.yellow('💻')} Run this demo: ${colors.cyan('bun run scripts/demo-bun-utils.ts')}`);
console.log();
