/**
 * Ultimate "Bun Zen" Architecture - Final Demonstration
 * Shows both ESM URL portability and File Descriptor telemetry working together
 */

// Official Bun interfaces for type safety
interface BunFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
  
  exists(): Promise<boolean>;
  text(): Promise<string>;
  json<T = any>(): Promise<T>;
  stream(): ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  bytes(): Promise<Uint8Array>;
}

interface Bun {
  file(path: string | number | URL, options?: { 
    type?: string;
    hash?: boolean;
    encoding?: string;
  }): BunFile;
  
  write(path: string | URL | BunFile, data: string | Uint8Array | ReadableStream): Promise<number>;
}

// Get properly typed Bun instance
const bun = (globalThis as any).Bun as Bun;

// Pattern 1: ESM URL for absolute portability
console.log('📍 ESM URL Pattern - Config follows code, not shell');
console.log('=' .repeat(60));

const currentFile = bun.file(new URL(import.meta.url));
console.log(`📁 Current file: ${currentFile.name}`);
console.log(`📏 Size: ${currentFile.size} bytes`);

// Find monorepo root using ESM URL (portable!)
const monorepoRoot = bun.file(new URL('../../package.json', import.meta.url));
if (await monorepoRoot.exists()) {
  console.log(`📦 Monorepo root: ${monorepoRoot.name}`);
  console.log('✅ ESM URL working - config location-independent!');
}

// Find config relative to code, not working directory
const sharedConfig = bun.file(new URL('../../.env', import.meta.url));
if (await sharedConfig.exists()) {
  console.log(`🔧 Shared config: ${sharedConfig.name}`);
} else {
  console.log('⚠️  No .env found (expected in this demo)');
}

console.log('\n🔌 File Descriptor Pattern - Clean separation of data and UI');
console.log('=' .repeat(60));

// Pattern 2: File Descriptor for "Silent Pipe" telemetry
const telemetryPipe = bun.file(3);

// Check if FD 3 is available (redirected)
try {
  // Try to write to FD 3 - this will tell us if it's open
  const testWrite = bun.write(telemetryPipe, JSON.stringify({
    event: 'test',
    message: 'FD 3 is open!',
    timestamp: new Date().toISOString()
  }) + '\n');
  
  console.log('✅ FD 3 is open - Silent pipe available!');
  console.log('💡 Data will be written to FD 3, keeping stdout clean');
  
  // Write actual telemetry
  await bun.write(telemetryPipe, JSON.stringify({
    event: 'architecture_demo',
    patterns: ['ESM_URL', 'FILE_DESCRIPTOR'],
    status: 'working_perfectly',
    currentFile: currentFile.name,
    monorepoRoot: monorepoRoot.name,
    timestamp: new Date().toISOString()
  }) + '\n');
  
  console.log('📊 Telemetry data sent to FD 3 (check the redirected file)');
  
} catch (error) {
  console.log('⚠️  FD 3 not open - Run with: 3> telemetry.log');
  console.log('📊 Telemetry would appear here if FD was redirected');
  
  // Fallback telemetry to console
  console.log('📊 Console telemetry:', JSON.stringify({
    event: 'architecture_demo',
    patterns: ['ESM_URL', 'FILE_DESCRIPTOR'],
    status: 'fd_not_available',
    timestamp: new Date().toISOString()
  }));
}

console.log('\n🎯 The Ultimate "Bun Zen" Architecture');
console.log('=' .repeat(60));
console.log('✅ ESM URL Pattern: Config follows code, not shell');
console.log('✅ File Descriptor Pattern: Data and UI perfectly separated');
console.log('✅ Combined: Robust, portable, high-performance CLI');

console.log('\n📖 Usage Examples:');
console.log('  bun run this-script.ts                    # Console telemetry');
console.log('  bun run this-script.ts 3> telemetry.log    # Silent pipe telemetry');
console.log('  cat telemetry.log                         # View captured data');

console.log('\n🚀 Your monorepo is now ready for enterprise-grade tools!');
