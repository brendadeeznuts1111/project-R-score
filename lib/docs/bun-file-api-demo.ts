/**
 * Official Bun.file API Showcase - Complete Type-Safe Operations
 * Demonstrating all official Bun.file methods with proper TypeScript typing
 */

import { writeFile } from 'fs/promises';

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
  file(path: string | URL): BunFile;
  write(path: string | URL, data: string | Uint8Array | ReadableStream): Promise<number>;
}

/**
 * Comprehensive Bun.file API demonstration
 */
export class BunFileAPIDemo {
  private bun: Bun;

  constructor() {
    this.bun = (globalThis as any).Bun as Bun;
  }

  /**
   * Demonstrate all official Bun.file methods
   */
  async demonstrateAllFileMethods(): Promise<void> {
    console.log('🚀 Official Bun.file API Complete Showcase');
    console.log('=' .repeat(60));

    // Create test files for demonstration
    await this.createTestFiles();

    // 1. Basic file creation and text reading
    await this.demoTextOperations();

    // 2. JSON operations with type safety
    await this.demoJSONOperations();

    // 3. Stream operations for large files
    await this.demoStreamOperations();

    // 4. Binary operations with ArrayBuffer
    await this.demoBinaryOperations();

    // 5. File metadata and existence checking
    await this.demoMetadataOperations();

    // 6. Advanced type-safe operations
    await this.demoAdvancedOperations();

    console.log('\n✅ All Bun.file API demonstrations completed!');
  }

  private async createTestFiles(): Promise<void> {
    console.log('\n📝 Creating test files...');

    // Create a text file
    await writeFile('demo-text.txt', 'Hello, Bun.file() API!\nThis is a test file for text operations.');
    
    // Create a JSON file
    const jsonData = {
      name: 'Bun File API Demo',
      version: '1.0.0',
      features: ['text', 'json', 'stream', 'arrayBuffer', 'bytes'],
      metadata: {
        created: new Date().toISOString(),
        author: 'Enhanced Zen Dashboard'
      }
    };
    await writeFile('demo-data.json', JSON.stringify(jsonData, null, 2));

    // Create a binary file
    const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64]);
    await writeFile('demo-binary.bin', binaryData);

    console.log('   ✅ Test files created: demo-text.txt, demo-data.json, demo-binary.bin');
  }

  private async demoTextOperations(): Promise<void> {
    console.log('\n📄 1. Text Operations');
    console.log('-'.repeat(30));

    try {
      // Official Bun.file API - text reading
      const textFile: BunFile = this.bun.file('demo-text.txt');
      
      console.log(`📁 File: ${textFile.name}`);
      console.log(`📏 Size: ${textFile.size} bytes`);
      console.log(`🗂️  Type: ${textFile.type}`);
      console.log(`🕒 Last Modified: ${new Date(textFile.lastModified).toISOString()}`);

      // Check if file exists
      const exists = await textFile.exists();
      console.log(`✅ Exists: ${exists}`);

      if (exists) {
        // Read as string
        const content = await textFile.text();
        console.log(`📖 Content: "${content.trim()}"`);
      }

    } catch (error) {
      console.error('❌ Text operations failed:', error);
    }
  }

  private async demoJSONOperations(): Promise<void> {
    console.log('\n📋 2. JSON Operations (Type-Safe)');
    console.log('-'.repeat(30));

    try {
      // Official Bun.file API - JSON reading with type safety
      const jsonFile: BunFile = this.bun.file('demo-data.json');
      
      interface DemoData {
        name: string;
        version: string;
        features: string[];
        metadata: {
          created: string;
          author: string;
        };
      }

      // Type-safe JSON parsing
      const data: DemoData = await jsonFile.json<DemoData>();
      
      console.log(`📊 Name: ${data.name}`);
      console.log(`🔢 Version: ${data.version}`);
      console.log(`⚡ Features: ${data.features.join(', ')}`);
      console.log(`👤 Author: ${data.metadata.author}`);
      console.log(`📅 Created: ${data.metadata.created}`);

    } catch (error) {
      console.error('❌ JSON operations failed:', error);
    }
  }

  private async demoStreamOperations(): Promise<void> {
    console.log('\n🌊 3. Stream Operations');
    console.log('-'.repeat(30));

    try {
      // Official Bun.file API - stream reading
      const textFile: BunFile = this.bun.file('demo-text.txt');
      const stream: ReadableStream<Uint8Array> = textFile.stream();

      console.log('🔄 Reading file as stream...');
      
      // Process stream chunks
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        console.log(`   📦 Chunk received: ${value.length} bytes`);
      }

      console.log(`✅ Stream complete: "${result.trim()}"`);

    } catch (error) {
      console.error('❌ Stream operations failed:', error);
    }
  }

  private async demoBinaryOperations(): Promise<void> {
    console.log('\n🔢 4. Binary Operations');
    console.log('-'.repeat(30));

    try {
      // Official Bun.file API - binary operations
      const binaryFile: BunFile = this.bun.file('demo-binary.bin');

      // Read as ArrayBuffer
      const arrayBuffer: ArrayBuffer = await binaryFile.arrayBuffer();
      console.log(`📊 ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
      
      // Read as Uint8Array
      const uint8Array: Uint8Array = await binaryFile.bytes();
      console.log(`🔢 Uint8Array: ${uint8Array.length} bytes`);
      console.log(`📝 Hex: ${Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

      // Convert to string for demonstration
      const text = new TextDecoder().decode(uint8Array);
      console.log(`📖 As text: "${text}"`);

    } catch (error) {
      console.error('❌ Binary operations failed:', error);
    }
  }

  private async demoMetadataOperations(): Promise<void> {
    console.log('\n📊 5. Metadata Operations');
    console.log('-'.repeat(30));

    const files = ['demo-text.txt', 'demo-data.json', 'demo-binary.bin', 'nonexistent.txt'];

    for (const filename of files) {
      try {
        const file: BunFile = this.bun.file(filename);
        const exists = await file.exists();
        
        console.log(`\n📁 ${filename}:`);
        console.log(`   ✅ Exists: ${exists}`);
        console.log(`   📏 Size: ${file.size} bytes`);
        console.log(`   🗂️  Type: ${file.type || 'unknown'}`);
        console.log(`   🕒 Modified: ${file.lastModified ? new Date(file.lastModified).toISOString() : 'N/A'}`);

        if (!exists) {
          console.log(`   ⚠️  File does not exist - showing default values`);
        }

      } catch (error) {
        console.error(`   ❌ Error checking ${filename}:`, error.message);
      }
    }
  }

  private async demoAdvancedOperations(): Promise<void> {
    console.log('\n🚀 6. Advanced Type-Safe Operations');
    console.log('-'.repeat(30));

    try {
      // Demonstrate type-safe file writing with Bun.write
      const advancedData = {
        timestamp: new Date().toISOString(),
        operations: ['text', 'json', 'stream', 'binary'],
        typeSafe: true,
        performance: {
          readSpeed: 'fast',
          memoryUsage: 'efficient'
        }
      };

      // Write using Bun.write
      const written = await this.bun.write('demo-advanced.json', JSON.stringify(advancedData, null, 2));
      console.log(`✅ Written ${written} bytes to demo-advanced.json`);

      // Read back and verify with type safety
      const advancedFile: BunFile = this.bun.file('demo-advanced.json');
      const readData: typeof advancedData = await advancedFile.json<typeof advancedData>();
      
      console.log(`🔍 Verification:`);
      console.log(`   📅 Timestamp: ${readData.timestamp}`);
      console.log(`   ⚡ Operations: ${readData.operations.join(', ')}`);
      console.log(`   🛡️  Type-safe: ${readData.typeSafe}`);
      console.log(`   📊 Read speed: ${readData.performance.readSpeed}`);

      // Demonstrate streaming large data
      console.log(`\n🌊 Streaming large data demonstration:`);
      const largeContent = 'A'.repeat(10000); // 10KB of data
      await this.bun.write('demo-large.txt', largeContent);
      
      const largeFile: BunFile = this.bun.file('demo-large.txt');
      const stream = largeFile.stream();
      
      let totalBytes = 0;
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
      }
      
      console.log(`   📊 Streamed ${totalBytes} bytes efficiently`);

    } catch (error) {
      console.error('❌ Advanced operations failed:', error);
    }
  }

  /**
   * Performance comparison of different read methods
   */
  async performanceComparison(): Promise<void> {
    console.log('\n⚡ Performance Comparison');
    console.log('-'.repeat(30));

    const testFile = 'demo-data.json';
    const iterations = 100;

    const methods = [
      { name: 'text()', method: async () => (await this.bun.file(testFile).text()) },
      { name: 'json()', method: async () => (await this.bun.file(testFile).json()) },
      { name: 'bytes()', method: async () => (await this.bun.file(testFile).bytes()) },
      { name: 'arrayBuffer()', method: async () => (await this.bun.file(testFile).arrayBuffer()) }
    ];

    for (const { name, method } of methods) {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await method();
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      console.log(`📊 ${name.padEnd(15)}: ${avgTime.toFixed(3)}ms avg (${iterations} iterations)`);
    }
  }

  /**
   * Cleanup demo files
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up demo files...');
    
    const files = [
      'demo-text.txt',
      'demo-data.json', 
      'demo-binary.bin',
      'demo-advanced.json',
      'demo-large.txt'
    ];

    for (const file of files) {
      try {
        await this.bun.write(file, ''); // Truncate file
        console.log(`   ✅ Cleaned: ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clean ${file}: ${error.message}`);
      }
    }
  }
}

/**
 * Run the complete demonstration
 */
export async function runBunFileAPIDemo(): Promise<void> {
  const demo = new BunFileAPIDemo();
  
  try {
    await demo.demonstrateAllFileMethods();
    await demo.performanceComparison();
  } finally {
    await demo.cleanup();
  }
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBunFileAPIDemo().catch(console.error);
}
