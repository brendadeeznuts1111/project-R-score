/**
 * Advanced Bun.file API Showcase - File Descriptors & URLs
 * Demonstrating Bun.file with file descriptors, URLs, and import.meta.url
 */

interface Bun {
  file(path: string | number | URL, options?: { type?: string }): BunFile;
}

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

/**
 * Advanced Bun.file operations with file descriptors and URLs
 */
export class AdvancedBunFileDemo {
  private bun: Bun;

  constructor() {
    this.bun = (globalThis as any).Bun as Bun;
  }

  /**
   * Demonstrate all advanced Bun.file usage patterns
   */
  async demonstrateAdvancedFileOperations(): Promise<void> {
    console.log('🚀 Advanced Bun.file API Showcase');
    console.log('=' .repeat(50));

    // 1. File descriptor operations
    await this.demoFileDescriptorOperations();

    // 2. URL-based file operations
    await this.demoURLOperations();

    // 3. import.meta.url operations
    await this.demoImportMetaOperations();

    // 4. Advanced type detection
    await this.demoAdvancedTypeDetection();

    // 5. Performance comparison
    await this.demoPerformanceComparison();

    console.log('\n✅ All advanced Bun.file demonstrations completed!');
  }

  private async demoFileDescriptorOperations(): Promise<void> {
    console.log('\n📁 1. File Descriptor Operations');
    console.log('-'.repeat(35));

    try {
      // Create a test file and get its file descriptor
      const testContent = 'Hello from file descriptor!';
      await this.bun.write('fd-test.txt', testContent);

      // Open file using file descriptor (simulated)
      // Note: In real scenarios, you'd get FD from file operations
      console.log('📝 File Descriptor Operations:');
      console.log('   ✅ Created test file: fd-test.txt');
      
      // Read using standard path first
      const fileByPath = this.bun.file('fd-test.txt');
      const content = await fileByPath.text();
      console.log(`   📖 Content by path: "${content}"`);
      console.log(`   📏 Size: ${fileByPath.size} bytes`);
      console.log(`   🗂️  Type: ${fileByPath.type}`);

      // Demonstrate file descriptor concept
      console.log('   🔢 File Descriptor Concept:');
      console.log('      - FD 0: stdin (standard input)');
      console.log('      - FD 1: stdout (standard output)');
      console.log('      - FD 2: stderr (standard error)');
      console.log('      - FD 3+: Open files (like our test file)');

    } catch (error) {
      console.error('❌ File descriptor operations failed:', error);
    }
  }

  private async demoURLOperations(): Promise<void> {
    console.log('\n🌐 2. URL-Based File Operations');
    console.log('-'.repeat(35));

    try {
      // Create test files with different URL formats
      const testContent = { message: 'Hello from URL operations!', timestamp: new Date().toISOString() };
      await this.bun.write('url-test.json', JSON.stringify(testContent, null, 2));

      // File path URL
      const filePath = new URL('file://' + process.cwd() + '/url-test.json');
      console.log(`📍 File Path URL: ${filePath.href}`);
      
      const fileByURL = this.bun.file(filePath);
      const urlContent = await fileByURL.json();
      console.log(`   📊 JSON content: ${urlContent.message}`);
      console.log(`   📏 Size: ${fileByURL.size} bytes`);
      console.log(`   🗂️  Type: ${fileByURL.type}`);

      // Relative URL
      const relativeURL = new URL('./url-test.json', 'file://' + process.cwd() + '/');
      console.log(`📍 Relative URL: ${relativeURL.href}`);
      
      const relativeFile = this.bun.file(relativeURL);
      console.log(`   ✅ Relative URL works: ${await relativeFile.exists()}`);

      // URL with query parameters (for demonstration)
      const urlWithQuery = new URL('url-test.json?type=demo', 'file://' + process.cwd() + '/');
      console.log(`📍 URL with query: ${urlWithQuery.href}`);
      
      // Note: Bun.file ignores query parameters for file operations
      const queryFile = this.bun.file(urlWithQuery);
      console.log(`   ✅ URL with query works: ${await queryFile.exists()}`);

    } catch (error) {
      console.error('❌ URL operations failed:', error);
    }
  }

  private async demoImportMetaOperations(): Promise<void> {
    console.log('\n📦 3. import.meta.url Operations');
    console.log('-'.repeat(35));

    try {
      // Get current file reference
      const currentFileURL = new URL(import.meta.url);
      console.log(`📍 Current file URL: ${currentFileURL.href}`);
      
      const currentFile = this.bun.file(currentFileURL);
      console.log(`   📁 Current file: ${currentFile.name}`);
      console.log(`   📏 Size: ${currentFile.size} bytes`);
      console.log(`   🗂️  Type: ${currentFile.type}`);
      console.log(`   🕒 Modified: ${new Date(currentFile.lastModified).toISOString()}`);

      // Read current file content
      const currentContent = await currentFile.text();
      const lines = currentContent.split('\n').length;
      console.log(`   📖 Lines of code: ${lines}`);

      // Get directory of current file
      const currentDir = new URL('.', import.meta.url);
      console.log(`📂 Current directory: ${currentDir.href}`);

      // Reference sibling files
      const siblingFile = new URL('./enhanced-stream-search.ts', import.meta.url);
      const siblingExists = await this.bun.file(siblingFile).exists();
      console.log(`   👥 Sibling file exists: ${siblingExists}`);

      if (siblingExists) {
        const siblingFileObj = this.bun.file(siblingFile);
        console.log(`   📊 Sibling size: ${siblingFileObj.size} bytes`);
        console.log(`   🗂️  Sibling type: ${siblingFileObj.type}`);
      }

      // Reference parent directory files
      const parentFile = new URL('../type-safe-zen-dashboard-with-tables.ts', import.meta.url);
      const parentExists = await this.bun.file(parentFile).exists();
      console.log(`   👆 Parent file exists: ${parentExists}`);

    } catch (error) {
      console.error('❌ import.meta.url operations failed:', error);
    }
  }

  private async demoAdvancedTypeDetection(): Promise<void> {
    console.log('\n🔍 4. Advanced Type Detection');
    console.log('-'.repeat(35));

    const testFiles = [
      { name: 'type-test.json', content: '{"type": "json"}', expected: 'application/json' },
      { name: 'type-test.html', content: '<html><body>Test</body></html>', expected: 'text/html' },
      { name: 'type-test.js', content: 'console.log("test");', expected: 'application/javascript' },
      { name: 'type-test.css', content: 'body { color: red; }', expected: 'text/css' },
      { name: 'type-test.txt', content: 'Plain text content', expected: 'text/plain' },
      { name: 'type-test.xml', content: '<?xml version="1.0"?><root>test</root>', expected: 'text/xml' },
      { name: 'type-test.md', content: '# Markdown Test', expected: 'text/markdown' }
    ];

    for (const { name, content, expected } of testFiles) {
      try {
        // Create test file
        await this.bun.write(name, content);
        
        // Get file info
        const file = this.bun.file(name);
        const detectedType = file.type;
        
        console.log(`📄 ${name}:`);
        console.log(`   🎯 Expected: ${expected}`);
        console.log(`   🔍 Detected: ${detectedType}`);
        console.log(`   ✅ Match: ${detectedType.includes(expected.split('/')[1]) || detectedType === expected ? 'YES' : 'NO'}`);
        console.log(`   📏 Size: ${file.size} bytes`);

      } catch (error) {
        console.error(`   ❌ Error with ${name}:`, error.message);
      }
    }
  }

  private async demoPerformanceComparison(): Promise<void> {
    console.log('\n⚡ 5. Performance Comparison');
    console.log('-'.repeat(35));

    const testFile = 'url-test.json';
    const iterations = 100;

    const methods = [
      { 
        name: 'String Path', 
        method: async () => {
          const file = this.bun.file(testFile);
          return await file.text();
        }
      },
      { 
        name: 'File URL', 
        method: async () => {
          const url = new URL('file://' + process.cwd() + '/' + testFile);
          const file = this.bun.file(url);
          return await file.text();
        }
      },
      { 
        name: 'Relative URL', 
        method: async () => {
          const url = new URL('./' + testFile, 'file://' + process.cwd() + '/');
          const file = this.bun.file(url);
          return await file.text();
        }
      },
      { 
        name: 'import.meta URL', 
        method: async () => {
          const url = new URL('./' + testFile, import.meta.url);
          const file = this.bun.file(url);
          return await file.text();
        }
      }
    ];

    for (const { name, method } of methods) {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await method();
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      console.log(`📊 ${name.padEnd(16)}: ${avgTime.toFixed(3)}ms avg (${iterations} iterations)`);
    }
  }

  /**
   * Cleanup demo files
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up demo files...');
    
    const files = [
      'fd-test.txt',
      'url-test.json',
      'type-test.json',
      'type-test.html',
      'type-test.js',
      'type-test.css',
      'type-test.txt',
      'type-test.xml',
      'type-test.md'
    ];

    for (const file of files) {
      try {
        await this.bun.write(file, '');
        console.log(`   ✅ Cleaned: ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clean ${file}: ${error.message}`);
      }
    }
  }
}

/**
 * Run the advanced demonstration
 */
export async function runAdvancedBunFileDemo(): Promise<void> {
  const demo = new AdvancedBunFileDemo();
  
  try {
    await demo.demonstrateAdvancedFileOperations();
  } finally {
    await demo.cleanup();
  }
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdvancedBunFileDemo().catch(console.error);
}
