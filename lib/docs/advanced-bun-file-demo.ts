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
    console.info('🚀 Advanced Bun.file API Showcase');
    console.info('=' .repeat(50));

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

    console.info('\n✅ All advanced Bun.file demonstrations completed!');
  }

  private async demoFileDescriptorOperations(): Promise<void> {
    console.info('\n📁 1. File Descriptor Operations');
    console.info('-'.repeat(35));

    try {
      // Create a test file and get its file descriptor
      const testContent = 'Hello from file descriptor!';
      await this.bun.write('fd-test.txt', testContent);

      // Open file using file descriptor (simulated)
      // Note: In real scenarios, you'd get FD from file operations
      console.info('📝 File Descriptor Operations:');
      console.info('   ✅ Created test file: fd-test.txt');
      
      // Read using standard path first
      const fileByPath = this.bun.file('fd-test.txt');
      const content = await fileByPath.text();
      console.info(`   📖 Content by path: "${content}"`);
      console.info(`   📏 Size: ${fileByPath.size} bytes`);
      console.info(`   🗂️  Type: ${fileByPath.type}`);

      // Demonstrate file descriptor concept
      console.info('   🔢 File Descriptor Concept:');
      console.info('      - FD 0: stdin (standard input)');
      console.info('      - FD 1: stdout (standard output)');
      console.info('      - FD 2: stderr (standard error)');
      console.info('      - FD 3+: Open files (like our test file)');

    } catch (error) {
      console.error('❌ File descriptor operations failed:', error);
    }
  }

  private async demoURLOperations(): Promise<void> {
    console.info('\n🌐 2. URL-Based File Operations');
    console.info('-'.repeat(35));

    try {
      // Create test files with different URL formats
      const testContent = { message: 'Hello from URL operations!', timestamp: new Date().toISOString() };
      await this.bun.write('url-test.json', JSON.stringify(testContent, null, 2));

      // File path URL
      const filePath = new URL('file://' + process.cwd() + '/url-test.json');
      console.info(`📍 File Path URL: ${filePath.href}`);
      
      const fileByURL = this.bun.file(filePath);
      const urlContent = await fileByURL.json();
      console.info(`   📊 JSON content: ${urlContent.message}`);
      console.info(`   📏 Size: ${fileByURL.size} bytes`);
      console.info(`   🗂️  Type: ${fileByURL.type}`);

      // Relative URL
      const relativeURL = new URL('./url-test.json', 'file://' + process.cwd() + '/');
      console.info(`📍 Relative URL: ${relativeURL.href}`);
      
      const relativeFile = this.bun.file(relativeURL);
      console.info(`   ✅ Relative URL works: ${await relativeFile.exists()}`);

      // URL with query parameters (for demonstration)
      const urlWithQuery = new URL('url-test.json?type=demo', 'file://' + process.cwd() + '/');
      console.info(`📍 URL with query: ${urlWithQuery.href}`);
      
      // Note: Bun.file ignores query parameters for file operations
      const queryFile = this.bun.file(urlWithQuery);
      console.info(`   ✅ URL with query works: ${await queryFile.exists()}`);

    } catch (error) {
      console.error('❌ URL operations failed:', error);
    }
  }

  private async demoImportMetaOperations(): Promise<void> {
    console.info('\n📦 3. import.meta.url Operations');
    console.info('-'.repeat(35));

    try {
      // Get current file reference
      const currentFileURL = new URL(import.meta.url);
      console.info(`📍 Current file URL: ${currentFileURL.href}`);
      
      const currentFile = this.bun.file(currentFileURL);
      console.info(`   📁 Current file: ${currentFile.name}`);
      console.info(`   📏 Size: ${currentFile.size} bytes`);
      console.info(`   🗂️  Type: ${currentFile.type}`);
      console.info(`   🕒 Modified: ${new Date(currentFile.lastModified).toISOString()}`);

      // Read current file content
      const currentContent = await currentFile.text();
      const lines = currentContent.split('\n').length;
      console.info(`   📖 Lines of code: ${lines}`);

      // Get directory of current file
      const currentDir = new URL('.', import.meta.url);
      console.info(`📂 Current directory: ${currentDir.href}`);

      // Reference sibling files
      const siblingFile = new URL('./enhanced-stream-search.ts', import.meta.url);
      const siblingExists = await this.bun.file(siblingFile).exists();
      console.info(`   👥 Sibling file exists: ${siblingExists}`);

      if (siblingExists) {
        const siblingFileObj = this.bun.file(siblingFile);
        console.info(`   📊 Sibling size: ${siblingFileObj.size} bytes`);
        console.info(`   🗂️  Sibling type: ${siblingFileObj.type}`);
      }

      // Reference parent directory files
      const parentFile = new URL('../type-safe-zen-dashboard-with-tables.ts', import.meta.url);
      const parentExists = await this.bun.file(parentFile).exists();
      console.info(`   👆 Parent file exists: ${parentExists}`);

    } catch (error) {
      console.error('❌ import.meta.url operations failed:', error);
    }
  }

  private async demoAdvancedTypeDetection(): Promise<void> {
    console.info('\n🔍 4. Advanced Type Detection');
    console.info('-'.repeat(35));

    const testFiles = [
      { name: 'type-test.json', content: '{"type": "json"}', expected: 'application/json' },
      { name: 'type-test.html', content: '<html><body>Test</body></html>', expected: 'text/html' },
      { name: 'type-test.js', content: 'console.info("test");', expected: 'application/javascript' },
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
        
        console.info(`📄 ${name}:`);
        console.info(`   🎯 Expected: ${expected}`);
        console.info(`   🔍 Detected: ${detectedType}`);
        console.info(`   ✅ Match: ${detectedType.includes(expected.split('/')[1]) || detectedType === expected ? 'YES' : 'NO'}`);
        console.info(`   📏 Size: ${file.size} bytes`);

      } catch (error) {
        console.error(`   ❌ Error with ${name}:`, error.message);
      }
    }
  }

  private async demoPerformanceComparison(): Promise<void> {
    console.info('\n⚡ 5. Performance Comparison');
    console.info('-'.repeat(35));

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
      
      console.info(`📊 ${name.padEnd(16)}: ${avgTime.toFixed(3)}ms avg (${iterations} iterations)`);
    }
  }

  /**
   * Cleanup demo files
   */
  async cleanup(): Promise<void> {
    console.info('\n🧹 Cleaning up demo files...');
    
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
        console.info(`   ✅ Cleaned: ${file}`);
      } catch (error) {
        console.info(`   ⚠️  Could not clean ${file}: ${error.message}`);
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
