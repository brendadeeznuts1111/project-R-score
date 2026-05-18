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
  console.info('=== Example 1: Basic MIME Type Detection ===\n');

  const files = [
    './package.json',
    './README.md',
    './tsconfig.json',
  ];

  for (const path of files) {
    try {
      const file = Bun.file(path);
      console.info(`File: ${path}`);
      console.info(`  MIME type: ${file.type || 'unknown'}`);
      console.info(`  Size: ${file.size} bytes`);
      console.info();
    } catch (error) {
      console.info(`  ❌ Error reading ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 2: Common file types
 */
async function example2_CommonFileTypes() {
  console.info('=== Example 2: Common File Types ===\n');

  // Create test files with different extensions
  const testFiles = [
    { path: '/tmp/test.json', content: '{"test": true}', expectedType: 'application/json' },
    { path: '/tmp/test.html', content: '<html><body>Hello</body></html>', expectedType: 'text/html' },
    { path: '/tmp/test.txt', content: 'Hello, World!', expectedType: 'text/plain' },
    { path: '/tmp/test.js', content: 'console.info("Hello");', expectedType: 'application/javascript' },
    { path: '/tmp/test.ts', content: 'console.info("Hello");', expectedType: 'application/typescript' },
  ];

  for (const { path, content, expectedType } of testFiles) {
    await Bun.write(path, content);
    const file = Bun.file(path);

    console.info(`File: ${path}`);
    console.info(`  Detected: ${file.type || 'unknown'}`);
    console.info(`  Expected: ${expectedType}`);
    console.info(`  Match: ${file.type === expectedType ? '✅' : '❌'}`);
    console.info();
  }
}

/**
 * Example 3: MIME type-based file processing
 */
async function example3_MimeTypeProcessing() {
  console.info('=== Example 3: MIME Type-Based Processing ===\n');

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
      console.info(`${path}: ${result}`);
    } catch (error) {
      console.info(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.info();
}

/**
 * Example 4: MIME type validation
 */
async function example4_MimeTypeValidation() {
  console.info('=== Example 4: MIME Type Validation ===\n');

  function validateMimeType(file: BunFile, allowedTypes: string[]): boolean {
    const mimeType = file.type || 'application/octet-stream';
    return allowedTypes.some(allowed => mimeType.includes(allowed));
  }

  const jsonFile = Bun.file('./package.json');
  const mdFile = Bun.file('./README.md');

  console.info('JSON file validation:');
  console.info(`  Type: ${jsonFile.type}`);
  console.info(`  Allowed: ['json', 'text']`);
  console.info(`  Valid: ${validateMimeType(jsonFile, ['json', 'text']) ? '✅' : '❌'}`);

  console.info('\nMarkdown file validation:');
  console.info(`  Type: ${mdFile.type || 'unknown'}`);
  console.info(`  Allowed: ['text', 'markdown']`);
  console.info(`  Valid: ${validateMimeType(mdFile, ['text', 'markdown']) ? '✅' : '❌'}`);
  console.info();
}

/**
 * Example 5: File type categorization
 */
async function example5_FileCategorization() {
  console.info('=== Example 5: File Type Categorization ===\n');

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
      console.info(`${path}:`);
      console.info(`  MIME: ${file.type || 'unknown'}`);
      console.info(`  Category: ${category}`);
      console.info();
    } catch (error) {
      console.info(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 6: Content-Type header generation
 */
async function example6_ContentTypeHeaders() {
  console.info('=== Example 6: Content-Type Header Generation ===\n');

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

  console.info('JSON file response:');
  console.info(`  Content-Type: ${jsonResponse.headers.get('Content-Type')}`);
  console.info(`  Content-Length: ${jsonResponse.headers.get('Content-Length')}`);
  console.info();
}

/**
 * Example 7: MIME type mapping and extension detection
 */
async function example7_MimeTypeMapping() {
  console.info('=== Example 7: MIME Type Mapping ===\n');

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
      console.info(`${path}:`);
      console.info(`  MIME: ${file.type || 'unknown'}`);
      console.info(`  Description: ${description}`);
      console.info();
    } catch (error) {
      console.info(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Example 8: File filtering by MIME type
 */
async function example8_FileFiltering() {
  console.info('=== Example 8: File Filtering by MIME Type ===\n');

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

  console.info('Filtering for JSON/text files:');
  const jsonFiles = await filterFilesByType(testFiles, ['json', 'text']);

  for (const { path, type } of jsonFiles) {
    console.info(`  ✅ ${path} (${type})`);
  }
  console.info();
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

    console.info('✅ All examples completed!');
    console.info('\n💡 Key Points:');
    console.info('  • file.type returns the MIME type as a string');
    console.info('  • Returns null/undefined for unknown types');
    console.info('  • Useful for content-type headers and file processing');
    console.info('  • Based on file extension and content analysis');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

