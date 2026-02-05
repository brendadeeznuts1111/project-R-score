/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
// lib/documentation/constants/utils.ts
import { URLHandler, URLFragmentUtils } from '../../core/url-handler.ts';

export enum UtilsCategory {
  FILE_SYSTEM = 'file_system',
  NETWORKING = 'networking',
  PROCESS = 'process',
  STRING = 'string',
  ARRAY = 'array',
  OBJECT = 'object',
  VALIDATION = 'validation',
  CONVERSION = 'conversion',
  CRYPTOGRAPHY = 'cryptography',
  DATE = 'date',
  PERFORMANCE = 'performance'
}

/**
 * URL normalization utilities for consistent formatting
 */
export class URLNormalizer {
  private static readonly BASE_URL = 'https://bun.sh';
  
  /**
   * Normalizes a URL by handling edge cases:
   * - Removes multiple consecutive slashes
   * - Ensures proper protocol
   * - Handles trailing slashes
   * - Validates URL format
   */
  static normalize(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    // Remove leading/trailing whitespace
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = this.BASE_URL + (normalized.startsWith('/') ? '' : '/') + normalized;
    }
    
    // Remove multiple consecutive slashes after protocol
    const protocolEnd = normalized.indexOf('://') + 3;
    const protocol = normalized.substring(0, protocolEnd);
    const path = normalized.substring(protocolEnd);
    
    // Replace multiple slashes with single slash, but preserve protocol double slashes
    const normalizedPath = path.replace(/\/+/g, '/');
    
    normalized = protocol + normalizedPath;
    
    // Remove trailing slash unless it's the root path
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    // Validate URL format
    try {
      new URL(normalized);
    } catch (error) {
      throw new Error(`Invalid URL format: ${normalized}`);
    }
    
    return normalized;
  }
  
  /**
   * Creates a full documentation URL from a path
   */
  static createDocUrl(path: string): string {
    if (!path || typeof path !== 'string') {
      throw new Error('Path must be a non-empty string');
    }
    
    // Clean the path
    const cleanPath = path.trim().replace(/^\/+/, '');
    
    // Construct full URL
    const fullUrl = `${this.BASE_URL}/${cleanPath}`;
    
    return this.normalize(fullUrl);
  }
  
  /**
   * Validates that a URL points to the Bun documentation
   */
  static validateBunUrl(url: string): boolean {
    try {
      const normalized = this.normalize(url);
      return normalized.startsWith(this.BASE_URL);
    } catch {
      return false;
    }
  }
}

export interface BunUtility {
  id: string;
  name: string;
  category: UtilsCategory;
  docUrl: string;
  description: string;
  exampleCode: string;
  fragment?: Record<string, string>;
}

/**
 * Enhanced Utility factory with fragment support
 */
export class UtilityFactory {
  /**
   * Creates a new utility with automatic URL normalization, validation, and fragment support
   */
  static create(config: {
    id: string;
    name: string;
    category: UtilsCategory;
    docUrl: string;
    description: string;
    exampleCode: string;
    fragment?: Record<string, string>;
  }): BunUtility {
    // Validate required fields
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('Utility ID is required and must be a string');
    }
    
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Utility name is required and must be a string');
    }
    
    if (!config.description || typeof config.description !== 'string') {
      throw new Error('Description is required and must be a string');
    }
    
    if (!config.exampleCode || typeof config.exampleCode !== 'string') {
      throw new Error('Example code is required and must be a string');
    }
    
    // Validate ID format (alphanumeric with underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(config.id)) {
      throw new Error(`Invalid utility ID format: ${config.id}. Must start with letter and contain only letters, numbers, and underscores`);
    }
    
    // Validate category
    if (!Object.values(UtilsCategory).includes(config.category)) {
      throw new Error(`Invalid category: ${config.category}`);
    }
    
    // Normalize and validate URL
    const normalizedUrl = URLNormalizer.normalize(config.docUrl);
    
    if (!URLNormalizer.validateBunUrl(normalizedUrl)) {
      console.warn(`Warning: URL does not point to Bun documentation: ${normalizedUrl}`);
    }

    // Add fragment to URL if provided
    let finalUrl = normalizedUrl;
    if (config.fragment && Object.keys(config.fragment).length > 0) {
      const fragmentString = URLFragmentUtils.buildFragment(config.fragment);
      finalUrl = URLHandler.addFragment(normalizedUrl, fragmentString);
    }
    
    // Validate example code (basic syntax check)
    if (config.exampleCode.includes('eval(') || config.exampleCode.includes('Function(')) {
      throw new Error('Example code contains potentially unsafe functions');
    }
    
    return {
      id: config.id.toLowerCase(),
      name: config.name.trim(),
      category: config.category,
      docUrl: finalUrl,
      description: config.description.trim(),
      exampleCode: config.exampleCode.trim(),
      fragment: config.fragment
    };
  }

  /**
   * Create utility with interactive fragment
   */
  static createInteractive(config: {
    id: string;
    name: string;
    category: UtilsCategory;
    docUrl: string;
    description: string;
    exampleCode: string;
    options?: {
      runnable?: boolean;
      editable?: boolean;
      theme?: 'light' | 'dark' | 'auto';
    };
  }): BunUtility {
    const interactiveFragment = {
      interactive: 'true',
      runnable: config.options?.runnable ? 'true' : 'false',
      editable: config.options?.editable ? 'true' : 'false',
      theme: config.options?.theme || 'auto',
      utility: config.id
    };

    return this.create({
      ...config,
      fragment: interactiveFragment
    });
  }

  /**
   * Create utility with example highlighting
   */
  static createWithExample(config: {
    id: string;
    name: string;
    category: UtilsCategory;
    docUrl: string;
    description: string;
    exampleCode: string;
    exampleName: string;
    language?: string;
  }): BunUtility {
    const exampleFragment = {
      example: config.exampleName,
      language: config.language || 'typescript',
      highlight: 'true',
      utility: config.id
    };

    return this.create({
      ...config,
      fragment: exampleFragment
    });
  }
  
  /**
   * Creates multiple utilities with validation
   */
  static createMany(configs: Array<{
    id: string;
    name: string;
    category: UtilsCategory;
    docUrl: string;
    description: string;
    exampleCode: string;
  }>): BunUtility[] {
    const utilities: BunUtility[] = [];
    const errors: string[] = [];
    
    for (const config of configs) {
      try {
        const utility = this.create(config);
        utilities.push(utility);
      } catch (error) {
        errors.push(`Failed to create utility '${config.id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn('Utility creation warnings:');
      errors.forEach(error => console.warn(`  - ${error}`));
    }
    
    if (utilities.length === 0) {
      throw new Error('No valid utilities were created');
    }
    
    return utilities;
  }
}

export const UTILITIES: BunUtility[] = UtilityFactory.createMany([
  // File System Utilities
  {
    id: 'read_file',
    name: 'Read File',
    category: UtilsCategory.FILE_SYSTEM,
    docUrl: 'https://bun.sh/docs/api/utils#readfile',
    description: 'Asynchronously read file contents with encoding support',
    exampleCode: `import { readFile } from 'bun';
const content = await readFile('package.json', 'utf-8');
console.log(content);`
  },
  {
    id: 'write_file',
    name: 'Write File',
    category: UtilsCategory.FILE_SYSTEM,
    docUrl: 'https://bun.sh/docs/api/utils#writefile',
    description: 'Write data to files with automatic directory creation',
    exampleCode: `import { writeFile } from 'bun';
await writeFile('output.txt', 'Hello, Bun!');
console.log('File written successfully');`
  },
  {
    id: 'file_exists',
    name: 'File Exists',
    category: UtilsCategory.FILE_SYSTEM,
    docUrl: 'https://bun.sh/docs/api/utils#fileexists',
    description: 'Check if a file or directory exists',
    exampleCode: `import { exists } from 'bun';
const fileExists = await exists('package.json');
console.log('File exists:', fileExists);`
  },
  
  // Networking Utilities
  {
    id: 'fetch_utility',
    name: 'Fetch',
    category: UtilsCategory.NETWORKING,
    docUrl: 'https://bun.sh/docs/api/utils#fetch-utility',
    description: 'High-performance HTTP client with automatic retries',
    exampleCode: `import { fetch } from 'bun';
const response = // 🚀 Prefetch hint: Consider preconnecting to 'https://api.example.com/data' domain
 await fetch('https://api.example.com/data');
const data = await response.json();`
  },
  {
    id: 'serve',
    name: 'Serve',
    category: UtilsCategory.NETWORKING,
    docUrl: 'https://bun.sh/docs/api/utils#serve',
    description: 'Create HTTP servers with WebSocket support',
    exampleCode: `import { serve } from 'bun';
const server = serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello World!');
  }
});`
  },
  
  // Validation Utilities
  {
    id: 'is_string',
    name: 'Is String',
    category: UtilsCategory.VALIDATION,
    docUrl: 'https://bun.sh/docs/api/utils#isstring',
    description: 'Type guard to check if value is a string',
    exampleCode: `import { isString } from 'bun';
const value = 'hello';
if (isString(value)) {
  console.log(value.toUpperCase()); // TypeScript knows it's a string
}`
  },
  {
    id: 'is_typed_array',
    name: 'Is Typed Array',
    category: UtilsCategory.VALIDATION,
    docUrl: 'https://bun.sh/docs/api/utils#istypedarray',
    description: 'Check if value is a typed array instance',
    exampleCode: `import { isTypedArray } from 'bun';
const arr = new Uint8Array([1, 2, 3]);
console.log(isTypedArray(arr)); // true`
  },
  
  // Conversion Utilities
  {
    id: 'to_buffer',
    name: 'To Buffer',
    category: UtilsCategory.CONVERSION,
    docUrl: 'https://bun.sh/docs/api/utils#tobuffer',
    description: 'Convert various data types to Buffer',
    exampleCode: `import { toBuffer } from 'bun';
const buffer = toBuffer('Hello');
console.log(buffer instanceof Buffer); // true`
  },
  
  // Performance Utilities
  {
    id: 'gc',
    name: 'Garbage Collection',
    category: UtilsCategory.PERFORMANCE,
    docUrl: 'https://bun.sh/docs/api/gc',
    description: 'Manual garbage collection trigger for memory management',
    exampleCode: `import { gc } from 'bun';
// Force garbage collection
gc();
console.log('Garbage collection completed');`
  },
  {
    id: 'performance_now',
    name: 'Performance Now',
    category: UtilsCategory.PERFORMANCE,
    docUrl: 'https://bun.sh/docs/api/performance',
    description: 'High-precision timing for performance measurement',
    exampleCode: `import { performance } from 'bun';
const start = performance.now();
// ... some operation
const end = performance.now();
console.log(\`Operation took \${end - start}ms\`);`
  }
]);

/**
 * Utility lookup and validation functions
 */
export class UtilityRegistry {
  private static readonly utilitiesById = new Map<string, BunUtility>();
  private static readonly utilitiesByCategory = new Map<UtilsCategory, BunUtility[]>();
  
  static {
    // Initialize registries
    for (const utility of UTILITIES) {
      this.utilitiesById.set(utility.id, utility);
      
      if (!this.utilitiesByCategory.has(utility.category)) {
        this.utilitiesByCategory.set(utility.category, []);
      }
      this.utilitiesByCategory.get(utility.category)!.push(utility);
    }
  }
  
  /**
   * Find utility by ID with error handling
   */
  static findById(id: string): BunUtility | null {
    if (!id || typeof id !== 'string') {
      return null;
    }
    
    return this.utilitiesById.get(id.toLowerCase()) || null;
  }
  
  /**
   * Get all utilities in a category
   */
  static findByCategory(category: UtilsCategory): BunUtility[] {
    return this.utilitiesByCategory.get(category) || [];
  }
  
  /**
   * Search utilities by name or description
   */
  static search(query: string): BunUtility[] {
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    return UTILITIES.filter(utility => 
      utility.name.toLowerCase().includes(lowerQuery) ||
      utility.description.toLowerCase().includes(lowerQuery) ||
      utility.id.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Validate all utility URLs
   */
  static validateAllUrls(): { valid: string[]; invalid: { url: string; id: string; error: string }[] } {
    const valid: string[] = [];
    const invalid: { url: string; id: string; error: string }[] = [];
    
    for (const utility of UTILITIES) {
      try {
        const normalized = URLNormalizer.normalize(utility.docUrl);
        if (URLNormalizer.validateBunUrl(normalized)) {
          valid.push(utility.docUrl);
        } else {
          invalid.push({
            url: utility.docUrl,
            id: utility.id,
            error: 'URL does not point to Bun documentation'
          });
        }
      } catch (error) {
        invalid.push({
          url: utility.docUrl,
          id: utility.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { valid, invalid };
  }
  
  /**
   * Get statistics about the utility registry
   */
  static getStats(): {
    total: number;
    byCategory: Record<string, number>;
    urlValidation: { valid: number; invalid: number };
  } {
    const byCategory: Record<string, number> = {};
    
    for (const category of Object.values(UtilsCategory)) {
      byCategory[category] = this.findByCategory(category).length;
    }
    
    const urlValidation = this.validateAllUrls();
    
    return {
      total: UTILITIES.length,
      byCategory,
      urlValidation: {
        valid: urlValidation.valid.length,
        invalid: urlValidation.invalid.length
      }
    };
  }
}

export const BUN_UTILS_URLS = {
  // bun.sh/utils documentation
  [UtilsCategory.FILE_SYSTEM]: {
    MAIN: '/docs/api/utils#file-system',
    READ_FILE: '/docs/api/utils#readfile',
    WRITE_FILE: '/docs/api/utils#writefile',
    READ_DIR: '/docs/api/utils#readdir',
    STAT: '/docs/api/utils#stat',
    COPY_FILE: '/docs/api/utils#copyfile',
    MOVE_FILE: '/docs/api/utils#movefile',
    DELETE_FILE: '/docs/api/utils#deletefile',
    FILE_EXISTS: '/docs/api/utils#fileexists'
  },
  
  [UtilsCategory.NETWORKING]: {
    MAIN: '/docs/api/utils#networking',
    FETCH: '/docs/api/utils#fetch-utility',
    SERVE: '/docs/api/utils#serve',
    WEBSOCKET: '/docs/api/utils#websocket',
    TCP: '/docs/api/utils#tcp',
    UDP: '/docs/api/utils#udp',
    DNS: '/docs/api/utils#dns'
  },
  
  [UtilsCategory.PROCESS]: {
    MAIN: '/docs/api/utils#process',
    SPAWN: '/docs/api/utils#spawn',
    EXEC: '/docs/api/utils#exec',
    FORK: '/docs/api/utils#fork',
    KILL: '/docs/api/utils#kill',
    PID: '/docs/api/utils#pid',
    SIGNALS: '/docs/api/utils#signals'
  },
  
  [UtilsCategory.VALIDATION]: {
    MAIN: '/docs/api/utils#validation',
    IS_STRING: '/docs/api/utils#isstring',
    IS_NUMBER: '/docs/api/utils#isnumber',
    IS_BOOLEAN: '/docs/api/utils#isboolean',
    IS_ARRAY: '/docs/api/utils#isarray',
    IS_OBJECT: '/docs/api/utils#isobject',
    IS_FUNCTION: '/docs/api/utils#isfunction',
    IS_PROMISE: '/docs/api/utils#ispromise',
    IS_BUFFER: '/docs/api/utils#isbuffer',
    IS_TYPED_ARRAY: '/docs/api/utils#istypedarray'
  },
  
  [UtilsCategory.CONVERSION]: {
    MAIN: '/docs/api/utils#conversion',
    TO_BUFFER: '/docs/api/utils#tobuffer',
    TO_STRING: '/docs/api/utils#tostring',
    TO_NUMBER: '/docs/api/utils#tonumber',
    TO_BOOLEAN: '/docs/api/utils#toboolean',
    TO_ARRAY: '/docs/api/utils#toarray',
    TO_OBJECT: '/docs/api/utils#toobject',
    JSON_PARSE: '/docs/api/utils#jsonparse',
    JSON_STRINGIFY: '/docs/api/utils#jsonstringify'
  },
  
  [UtilsCategory.PERFORMANCE]: {
    MAIN: '/docs/api/performance',
    GC: '/docs/api/gc',
    PERFORMANCE_NOW: '/docs/api/performance',
    MEMORY_USAGE: '/docs/api/performance'
  }
} as const;

// Common Bun.utils examples
export const BUN_UTILS_EXAMPLES = {
  FILE_SYSTEM: {
    READ_FILE: `import { readFile } from 'bun';
const content = await readFile('package.json', 'utf-8');`,
    
    WRITE_FILE: `import { writeFile } from 'bun';
await writeFile('output.txt', 'Hello, Bun!');`,
    
    FILE_EXISTS: `import { exists } from 'bun';
const fileExists = await exists('package.json');`
  },
  
  VALIDATION: {
    IS_TYPED_ARRAY: `import { isTypedArray } from 'bun';
const arr = new Uint8Array([1, 2, 3]);
console.log(isTypedArray(arr)); // true`,
    
    IS_BUFFER: `import { isBuffer } from 'bun';
const buf = Buffer.from('hello');
console.log(isBuffer(buf)); // true`
  },
  
  CONVERSION: {
    TO_BUFFER: `import { toBuffer } from 'bun';
const buffer = toBuffer('Hello'); // Convert string to Buffer`
  }
} as const;

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */