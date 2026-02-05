#!/usr/bin/env bun

/**
 * Bun.file().type - MIME Type Detection Examples
 *
 * Demonstrates getting MIME types from files using Bun.file().type
 *
 * Reference: https://bun.sh/docs/api/file-io
 */

/**
 * Example 1: Basic MIME type detection
 */
async function example1_BasicMimeTypes() {
  console.log('=== Example 1: Basic MIME Type Detection ===\n');

  const files = [
    './package.json',
    './README.md',
    './tsconfig.json',
  ];

  for (const path of files) {
    try {
      const file = Bun.file(path);
      console.log(`File: ${path}`);
      console.log(`  MIME type: ${file.type || 'unknown'}`);
      console.log(`  Size: ${file.size} bytes`);
      console.log();
    } catch (error) {
      console.log(`  ❌ Error reading ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 2: Common file types
 */
async function example2_CommonFileTypes() {
  console.log('=== Example 2: Common File Types ===\n');

  // Create test files with different extensions
  const testFiles = [
    { path: '/tmp/test.json', content: '{"test": true}', expectedType: 'application/json' },
    { path: '/tmp/test.html', content: '<html><body>Hello</body></html>', expectedType: 'text/html' },
    { path: '/tmp/test.txt', content: 'Hello, World!', expectedType: 'text/plain' },
    { path: '/tmp/test.js', content: 'console.log("Hello");', expectedType: 'application/javascript' },
    { path: '/tmp/test.ts', content: 'console.log("Hello");', expectedType: 'application/typescript' },
  ];

  for (const { path, content, expectedType } of testFiles) {
    await Bun.write(path, content);
    const file = Bun.file(path);

    console.log(`File: ${path}`);
    console.log(`  Detected: ${file.type || 'unknown'}`);
    console.log(`  Expected: ${expectedType}`);
    console.log(`  Match: ${file.type === expectedType ? '✅' : '❌'}`);
    console.log();
  }
}

/**
 * Example 3: MIME type-based file processing
 */
async function example3_MimeTypeProcessing() {
  console.log('=== Example 3: MIME Type-Based Processing ===\n');

  class FileProcessor {
    async process(file: BunFile): Promise<string> {
      const mimeType = file.type || 'application/octet-stream';

      if (mimeType.startsWith('text/')) {
        const text = await file.text();
        return `Text file (${mimeType}): ${text.substring(0, 50)}...`;
      } else if (mimeType.startsWith('application/json')) {
        const json = await file.json();
        return `JSON file: ${JSON.stringify(json).substring(0, 50)}...`;
      } else if (mimeType.startsWith('image/')) {
        const bytes = await file.bytes();
        return `Image file (${mimeType}): ${bytes.length} bytes`;
      } else if (mimeType.startsWith('application/javascript') || mimeType.startsWith('application/typescript')) {
        const text = await file.text();
        const lines = text.split('\n').length;
        return `Code file (${mimeType}): ${lines} lines`;
      } else {
        return `Unknown type (${mimeType}): ${file.size} bytes`;
      }
    }
  }

  const processor = new FileProcessor();
  const testFiles = [
    './package.json',
    './README.md',
  ];

  for (const path of testFiles) {
    try {
      const file = Bun.file(path);
      const result = await processor.process(file);
      console.log(`${path}: ${result}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log();
}

/**
 * Example 4: MIME type validation
 */
async function example4_MimeTypeValidation() {
  console.log('=== Example 4: MIME Type Validation ===\n');

  function validateMimeType(file: BunFile, allowedTypes: string[]): boolean {
    const mimeType = file.type || 'application/octet-stream';
    return allowedTypes.some(allowed => mimeType.includes(allowed));
  }

  const jsonFile = Bun.file('./package.json');
  const mdFile = Bun.file('./README.md');

  console.log('JSON file validation:');
  console.log(`  Type: ${jsonFile.type}`);
  console.log(`  Allowed: ['json', 'text']`);
  console.log(`  Valid: ${validateMimeType(jsonFile, ['json', 'text']) ? '✅' : '❌'}`);

  console.log('\nMarkdown file validation:');
  console.log(`  Type: ${mdFile.type || 'unknown'}`);
  console.log(`  Allowed: ['text', 'markdown']`);
  console.log(`  Valid: ${validateMimeType(mdFile, ['text', 'markdown']) ? '✅' : '❌'}`);
  console.log();
}

/**
 * Example 5: File type categorization
 */
async function example5_FileCategorization() {
  console.log('=== Example 5: File Type Categorization ===\n');

  function categorizeFile(file: BunFile): string {
    const mimeType = file.type || 'application/octet-stream';

    if (mimeType.startsWith('text/')) {
      return 'text';
    } else if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.startsWith('application/')) {
      if (mimeType.includes('json')) return 'data';
      if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'code';
      return 'application';
    } else {
      return 'other';
    }
  }

  const files = [
    './package.json',
    './README.md',
    './tsconfig.json',
  ];

  for (const path of files) {
    try {
      const file = Bun.file(path);
      const category = categorizeFile(file);
      console.log(`${path}:`);
      console.log(`  MIME: ${file.type || 'unknown'}`);
      console.log(`  Category: ${category}`);
      console.log();
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 6: Content-Type header generation
 */
async function example6_ContentTypeHeaders() {
  console.log('=== Example 6: Content-Type Header Generation ===\n');

  function createResponse(file: BunFile, content: string | Uint8Array): Response {
    const contentType = file.type || 'application/octet-stream';

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size || 0),
      },
    });
  }

  const jsonFile = Bun.file('./package.json');
  const jsonContent = await jsonFile.text();
  const jsonResponse = createResponse(jsonFile, jsonContent);

  console.log('JSON file response:');
  console.log(`  Content-Type: ${jsonResponse.headers.get('Content-Type')}`);
  console.log(`  Content-Length: ${jsonResponse.headers.get('Content-Length')}`);
  console.log();
}

/**
 * Example 7: MIME type mapping and extension detection
 */
async function example7_MimeTypeMapping() {
  console.log('=== Example 7: MIME Type Mapping ===\n');

  // Common MIME type mappings
  const mimeTypeMap: Record<string, string> = {
    'application/json': 'JSON',
    'text/html': 'HTML',
    'text/plain': 'Plain Text',
    'application/javascript': 'JavaScript',
    'application/typescript': 'TypeScript',
    'text/css': 'CSS',
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'image/gif': 'GIF Image',
  };

  function getFileTypeDescription(file: BunFile): string {
    const mimeType = file.type || 'application/octet-stream';
    return mimeTypeMap[mimeType] || `Unknown (${mimeType})`;
  }

  const files = [
    './package.json',
    './README.md',
  ];

  for (const path of files) {
    try {
      const file = Bun.file(path);
      const description = getFileTypeDescription(file);
      console.log(`${path}:`);
      console.log(`  MIME: ${file.type || 'unknown'}`);
      console.log(`  Description: ${description}`);
      console.log();
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 8: File filtering by MIME type
 */
async function example8_FileFiltering() {
  console.log('=== Example 8: File Filtering by MIME Type ===\n');

  async function filterFilesByType(
    filePaths: string[],
    allowedTypes: string[]
  ): Promise<Array<{ path: string; type: string }>> {
    const results: Array<{ path: string; type: string }> = [];

    for (const path of filePaths) {
      try {
        const file = Bun.file(path);
        const mimeType = file.type || 'application/octet-stream';

        if (allowedTypes.some(allowed => mimeType.includes(allowed))) {
          results.push({ path, type: mimeType });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return results;
  }

  const testFiles = [
    './package.json',
    './tsconfig.json',
    './README.md',
  ];

  console.log('Filtering for JSON/text files:');
  const jsonFiles = await filterFilesByType(testFiles, ['json', 'text']);

  for (const { path, type } of jsonFiles) {
    console.log(`  ✅ ${path} (${type})`);
  }
  console.log();
}

// Run all examples
async function main() {
  try {
    await example1_BasicMimeTypes();
    await example2_CommonFileTypes();
    await example3_MimeTypeProcessing();
    await example4_MimeTypeValidation();
    await example5_FileCategorization();
    await example6_ContentTypeHeaders();
    await example7_MimeTypeMapping();
    await example8_FileFiltering();

    console.log('✅ All examples completed!');
    console.log('\n💡 Key Points:');
    console.log('  • file.type returns the MIME type as a string');
    console.log('  • Returns null/undefined for unknown types');
    console.log('  • Useful for content-type headers and file processing');
    console.log('  • Based on file extension and content analysis');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

