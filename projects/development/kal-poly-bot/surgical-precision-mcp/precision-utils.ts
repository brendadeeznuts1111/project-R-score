import { Decimal } from 'decimal.js';

// Configure precision to exceed 6-decimal minimum by 22 places (28 total)
Decimal.set({ precision: 28 });

/**
 * Bun v1.3.5+ V8 Type Checking APIs
 * Enhanced type validation with native performance
 * Reference: https://bun.com/blog/bun-v1.3.5
 */
const BunTypes = {
  /**
   * Check if value is a TypedArray (Int8Array, Uint8Array, Float64Array, etc.)
   * Uses native V8 type checking for maximum performance
   */
  isTypedArray: (value: unknown): value is ArrayBufferView => {
    if (typeof globalThis.Bun !== 'undefined' && 'isTypedArray' in globalThis.Bun) {
      return (globalThis.Bun as any).isTypedArray(value);
    }
    // Fallback for non-Bun environments
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
  },

  /**
   * Check if value is a Date object
   * Uses native V8 type checking - faster than instanceof
   */
  isDate: (value: unknown): value is Date => {
    if (typeof globalThis.Bun !== 'undefined' && 'isDate' in globalThis.Bun) {
      return (globalThis.Bun as any).isDate(value);
    }
    return value instanceof Date && !isNaN(value.getTime());
  },

  /**
   * Check if value is a Map
   */
  isMap: (value: unknown): value is Map<unknown, unknown> => {
    if (typeof globalThis.Bun !== 'undefined' && 'isMap' in globalThis.Bun) {
      return (globalThis.Bun as any).isMap(value);
    }
    return value instanceof Map;
  },

  /**
   * Check if value is a Set
   */
  isSet: (value: unknown): value is Set<unknown> => {
    if (typeof globalThis.Bun !== 'undefined' && 'isSet' in globalThis.Bun) {
      return (globalThis.Bun as any).isSet(value);
    }
    return value instanceof Set;
  },

  /**
   * Check if value is a Promise
   */
  isPromise: (value: unknown): value is Promise<unknown> => {
    if (typeof globalThis.Bun !== 'undefined' && 'isPromise' in globalThis.Bun) {
      return (globalThis.Bun as any).isPromise(value);
    }
    return value instanceof Promise;
  },

  /**
   * Check if value is an ArrayBuffer
   */
  isArrayBuffer: (value: unknown): value is ArrayBuffer => {
    if (typeof globalThis.Bun !== 'undefined' && 'isArrayBuffer' in globalThis.Bun) {
      return (globalThis.Bun as any).isArrayBuffer(value);
    }
    return value instanceof ArrayBuffer;
  },

  /**
   * Check if value is a SharedArrayBuffer
   */
  isSharedArrayBuffer: (value: unknown): value is SharedArrayBuffer => {
    if (typeof globalThis.Bun !== 'undefined' && 'isSharedArrayBuffer' in globalThis.Bun) {
      return (globalThis.Bun as any).isSharedArrayBuffer(value);
    }
    return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer;
  },

  /**
   * Check if value is a RegExp
   */
  isRegExp: (value: unknown): value is RegExp => {
    if (typeof globalThis.Bun !== 'undefined' && 'isRegExp' in globalThis.Bun) {
      return (globalThis.Bun as any).isRegExp(value);
    }
    return value instanceof RegExp;
  },

  /**
   * Check if value is an Error
   */
  isError: (value: unknown): value is Error => {
    if (typeof globalThis.Bun !== 'undefined' && 'isError' in globalThis.Bun) {
      return (globalThis.Bun as any).isError(value);
    }
    return value instanceof Error;
  }
};

// Export V8 type checking utilities
export { BunTypes };

/**
 * Custom exceptions for Operation Surgical Precision
 */
export class SurgicalPrecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SurgicalPrecisionError';
  }
}

export class TargetValidationError extends SurgicalPrecisionError {
  constructor(targetId: string, errors: string[]) {
    super(`Target ${targetId} failed: ${errors.join(', ')}`);
    this.name = 'TargetValidationError';
  }
}

export class ContainmentBreachError extends SurgicalPrecisionError {
  constructor(message: string, public readonly breachMagnitude: Decimal) {
    super(`Operational failure: Non-zero collateral detected - ${breachMagnitude}`);
    this.name = 'ContainmentBreachError';
  }
}

/**
 * Lockdown status enumeration
 */
export enum LockdownStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

/**
 * Utility functions for precision operations
 */
export const PrecisionUtils = {
  /**
   * Get current timestamp in ISO format
   */
  timestamp(): string {
    return new Date().toISOString();
  },

  /**
   * Create zero decimal value
   */
  zero(): Decimal {
    return new Decimal('0.000000');
  },

  /**
   * Validate decimal precision (>= 6 places after decimal)
   */
  validatePrecision(value: Decimal): boolean {
    const decimalPlaces = value.decimalPlaces();
    return decimalPlaces >= 6;
  },

  /**
   * Format decimal with fixed precision
   */
  format(value: Decimal, decimals = 6): string {
    return value.toFixed(decimals);
  }
};

/**
 * Mock classes for lockdown system (simulated)
 */
export const ExecutionFreeze = {
  enable: () => {
    // In real implementation, this would freeze execution threads
    console.error('EXECUTION FREEZE ACTIVATED');
  }
};

export const MemorySanitization = {
  purgeSensitiveData: () => {
    // In real implementation, this would sanitize memory
    console.error('SENSITIVE DATA PURGED');
  }
};

export const ExternalInterface = {
  maintainNormalStatus: () => {
    // In real implementation, this would maintain normal appearance
    console.error('MAINTAINING EXTERNAL FACADE');
  }
};

/**
 * Bun HTMLRewriter Utilities
 * Reference: https://bun.sh/guides/html-rewriter/extract-links
 * 
 * Bun's streaming HTML parser/modifier based on Cloudflare's HTMLRewriter API
 * Zero-copy parsing for high performance surgical HTML operations
 */

/**
 * Extracted link with metadata for surgical precision analysis
 */
export interface ExtractedLink {
  /** Original href attribute value */
  href: string;
  /** Absolute URL after conversion */
  absoluteUrl: string;
  /** Link text content (anchor text) */
  text: string;
  /** Element type (a, link, script, img, etc.) */
  elementType: string;
  /** Additional attributes */
  attributes: Record<string, string>;
  /** Whether the original URL was relative */
  wasRelative: boolean;
  /** Link category for compliance classification */
  category: 'navigation' | 'resource' | 'external' | 'internal' | 'anchor';
}

/**
 * Result of HTML link extraction operation
 */
export interface LinkExtractionResult {
  /** Total links found */
  totalLinks: number;
  /** Successfully extracted links */
  links: ExtractedLink[];
  /** Extraction timestamp */
  timestamp: string;
  /** Base URL used for relative URL conversion */
  baseUrl: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Links by category for compliance analysis */
  categorySummary: Record<string, number>;
  /** Any errors encountered during extraction */
  errors: string[];
}

/**
 * HTMLRewriter utilities for surgical precision link extraction
 * Using Bun's native HTMLRewriter API for zero-copy streaming parsing
 */
export const HTMLRewriterUtils = {
  /**
   * Determine if a URL is relative
   */
  isRelativeUrl(url: string): boolean {
    // Check for protocol-relative URLs
    if (url.startsWith('//')) return false;
    // Check for absolute URLs with protocol
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false;
    // Check for data URLs
    if (url.startsWith('data:')) return false;
    // Check for mailto/tel links
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return false;
    // Everything else is relative
    return true;
  },

  /**
   * Categorize a link based on its URL pattern
   */
  categorizeLink(url: string, baseUrl: string): 'navigation' | 'resource' | 'external' | 'internal' | 'anchor' {
    // Anchor links
    if (url.startsWith('#')) return 'anchor';
    
    try {
      const parsedUrl = new URL(url, baseUrl);
      const parsedBase = new URL(baseUrl);
      
      // Check for resource patterns
      const resourceExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
      if (resourceExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext))) {
        return 'resource';
      }
      
      // Check if external domain
      if (parsedUrl.hostname !== parsedBase.hostname) {
        return 'external';
      }
      
      // Internal navigation links
      if (parsedUrl.pathname !== parsedBase.pathname) {
        return 'navigation';
      }
      
      return 'internal';
    } catch {
      return 'internal';
    }
  },

  /**
   * Convert relative URL to absolute URL
   * Following Bun HTMLRewriter guide patterns
   */
  toAbsoluteUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      // Return original if conversion fails
      return href;
    }
  },

  /**
   * Extract all links from HTML content using Bun's HTMLRewriter
   * Zero-copy streaming parser for maximum performance
   * 
   * @param html - HTML content to parse
   * @param baseUrl - Base URL for converting relative URLs
   * @returns Promise<LinkExtractionResult> - Extracted links with metadata
   */
  async extractLinks(html: string, baseUrl: string): Promise<LinkExtractionResult> {
    const startTime = performance.now();
    const links: ExtractedLink[] = [];
    const errors: string[] = [];
    const categorySummary: Record<string, number> = {
      navigation: 0,
      resource: 0,
      external: 0,
      internal: 0,
      anchor: 0,
    };

    // Determine environment and use appropriate HTMLRewriter
    const hasNativeHTMLRewriter = typeof HTMLRewriter !== 'undefined';

    if (hasNativeHTMLRewriter) {
      // Use Bun's native HTMLRewriter (streaming, zero-copy)
      try {
        const textCollector = new Map<number, string>();
        let linkIndex = 0;

        const rewriter = new HTMLRewriter()
          // Extract <a> links
          .on('a[href]', {
            element(el) {
              const href = el.getAttribute('href');
              if (!href) return;

              const currentIndex = linkIndex++;
              const wasRelative = HTMLRewriterUtils.isRelativeUrl(href);
              const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(href, baseUrl);
              const category = HTMLRewriterUtils.categorizeLink(href, baseUrl);

              const attributes: Record<string, string> = {};
              for (const [name, value] of [
                ['href', href],
                ['target', el.getAttribute('target') || ''],
                ['rel', el.getAttribute('rel') || ''],
                ['title', el.getAttribute('title') || ''],
                ['class', el.getAttribute('class') || ''],
              ]) {
                if (value) attributes[name] = value;
              }

              textCollector.set(currentIndex, '');
              
              links.push({
                href,
                absoluteUrl,
                text: '', // Will be populated via text handler
                elementType: 'a',
                attributes,
                wasRelative,
                category,
              });

              categorySummary[category]++;
            },
            text(text) {
              // Collect text content for anchor tags
              if (links.length > 0 && text.text) {
                links[links.length - 1].text += text.text.trim();
              }
            },
          })
          // Extract <link> elements (stylesheets, preload, etc.)
          .on('link[href]', {
            element(el) {
              const href = el.getAttribute('href');
              if (!href) return;

              const wasRelative = HTMLRewriterUtils.isRelativeUrl(href);
              const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(href, baseUrl);
              const category: ExtractedLink['category'] = 'resource';

              const attributes: Record<string, string> = {};
              for (const [name, value] of [
                ['href', href],
                ['rel', el.getAttribute('rel') || ''],
                ['type', el.getAttribute('type') || ''],
                ['media', el.getAttribute('media') || ''],
              ]) {
                if (value) attributes[name] = value;
              }

              links.push({
                href,
                absoluteUrl,
                text: el.getAttribute('rel') || 'link',
                elementType: 'link',
                attributes,
                wasRelative,
                category,
              });

              categorySummary[category]++;
            },
          })
          // Extract <script> src
          .on('script[src]', {
            element(el) {
              const src = el.getAttribute('src');
              if (!src) return;

              const wasRelative = HTMLRewriterUtils.isRelativeUrl(src);
              const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(src, baseUrl);
              const category: ExtractedLink['category'] = 'resource';

              links.push({
                href: src,
                absoluteUrl,
                text: 'script',
                elementType: 'script',
                attributes: { src },
                wasRelative,
                category,
              });

              categorySummary[category]++;
            },
          })
          // Extract <img> src
          .on('img[src]', {
            element(el) {
              const src = el.getAttribute('src');
              if (!src) return;

              const wasRelative = HTMLRewriterUtils.isRelativeUrl(src);
              const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(src, baseUrl);
              const category: ExtractedLink['category'] = 'resource';

              links.push({
                href: src,
                absoluteUrl,
                text: el.getAttribute('alt') || 'image',
                elementType: 'img',
                attributes: { 
                  src, 
                  alt: el.getAttribute('alt') || '',
                  width: el.getAttribute('width') || '',
                  height: el.getAttribute('height') || '',
                },
                wasRelative,
                category,
              });

              categorySummary[category]++;
            },
          });

        // Transform the HTML (this triggers the parsing)
        await rewriter.transform(new Response(html)).text();

      } catch (error) {
        errors.push(`HTMLRewriter error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Fallback: Use regex parsing for non-Bun environments
      errors.push('Native HTMLRewriter not available - using regex fallback (reduced precision)');
      
      // Extract <a> links with regex (less precise but functional)
      const anchorRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = anchorRegex.exec(html)) !== null) {
        const href = match[1] ?? '';
        const text = (match[2] ?? '').trim();
        if (!href) continue;
        
        const wasRelative = HTMLRewriterUtils.isRelativeUrl(href);
        const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(href, baseUrl);
        const category = HTMLRewriterUtils.categorizeLink(href, baseUrl);

        links.push({
          href,
          absoluteUrl,
          text,
          elementType: 'a',
          attributes: { href },
          wasRelative,
          category,
        });

        categorySummary[category] = (categorySummary[category] ?? 0) + 1;
      }

      // Extract <link> elements
      const linkRegex = /<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1] ?? '';
        if (!href) continue;
        
        const wasRelative = HTMLRewriterUtils.isRelativeUrl(href);
        const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(href, baseUrl);

        links.push({
          href,
          absoluteUrl,
          text: 'link',
          elementType: 'link',
          attributes: { href },
          wasRelative,
          category: 'resource',
        });

        categorySummary['resource'] = (categorySummary['resource'] ?? 0) + 1;
      }

      // Extract <script> src
      const scriptRegex = /<script\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
      while ((match = scriptRegex.exec(html)) !== null) {
        const src = match[1] ?? '';
        if (!src) continue;
        
        const wasRelative = HTMLRewriterUtils.isRelativeUrl(src);
        const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(src, baseUrl);

        links.push({
          href: src,
          absoluteUrl,
          text: 'script',
          elementType: 'script',
          attributes: { src },
          wasRelative,
          category: 'resource',
        });

        categorySummary['resource'] = (categorySummary['resource'] ?? 0) + 1;
      }

      // Extract <img> src
      const imgRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
      while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1] ?? '';
        if (!src) continue;
        
        const wasRelative = HTMLRewriterUtils.isRelativeUrl(src);
        const absoluteUrl = HTMLRewriterUtils.toAbsoluteUrl(src, baseUrl);

        links.push({
          href: src,
          absoluteUrl,
          text: 'image',
          elementType: 'img',
          attributes: { src },
          wasRelative,
          category: 'resource',
        });

        categorySummary['resource'] = (categorySummary['resource'] ?? 0) + 1;
      }
    }

    const processingTimeMs = performance.now() - startTime;

    return {
      totalLinks: links.length,
      links,
      timestamp: PrecisionUtils.timestamp(),
      baseUrl,
      processingTimeMs,
      categorySummary,
      errors,
    };
  },

  /**
   * Extract links from a URL by fetching and parsing
   * @param url - URL to fetch and extract links from
   * @returns Promise<LinkExtractionResult>
   */
  async extractLinksFromUrl(url: string): Promise<LinkExtractionResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          totalLinks: 0,
          links: [],
          timestamp: PrecisionUtils.timestamp(),
          baseUrl: url,
          processingTimeMs: 0,
          categorySummary: { navigation: 0, resource: 0, external: 0, internal: 0, anchor: 0 },
          errors: [`Failed to fetch URL: ${response.status} ${response.statusText}`],
        };
      }

      const html = await response.text();
      return this.extractLinks(html, url);
    } catch (error) {
      return {
        totalLinks: 0,
        links: [],
        timestamp: PrecisionUtils.timestamp(),
        baseUrl: url,
        processingTimeMs: 0,
        categorySummary: { navigation: 0, resource: 0, external: 0, internal: 0, anchor: 0 },
        errors: [`Fetch error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  },

  /**
   * Format extraction result for display
   */
  formatExtractionResult(result: LinkExtractionResult): string {
    const lines: string[] = [
      `✅ SURGICAL LINK EXTRACTION COMPLETE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Base URL: ${result.baseUrl}`,
      `Timestamp: ${result.timestamp}`,
      `Processing Time: ${result.processingTimeMs.toFixed(2)}ms`,
      `Total Links: ${result.totalLinks}`,
      ``,
      `📊 CATEGORY SUMMARY:`,
    ];

    for (const [category, count] of Object.entries(result.categorySummary)) {
      if (count > 0) {
        lines.push(`  • ${category}: ${count}`);
      }
    }

    if (result.errors.length > 0) {
      lines.push(``, `⚠️ WARNINGS:`);
      result.errors.forEach(err => lines.push(`  • ${err}`));
    }

    lines.push(``, `🔗 EXTRACTED LINKS:`);
    result.links.forEach((link, idx) => {
      lines.push(`  ${idx + 1}. [${link.elementType}] ${link.absoluteUrl}`);
      if (link.text && link.text !== link.elementType) {
        lines.push(`      Text: "${link.text}"`);
      }
      lines.push(`      Category: ${link.category} | Relative: ${link.wasRelative ? 'yes' : 'no'}`);
    });

    return lines.join('\n');
  },
};

/**
 * HTMLRewriter Type Reference
 * Bun provides HTMLRewriter globally - see https://bun.sh/docs/api/html-rewriter
 * 
 * Key interfaces (provided by Bun's type definitions):
 * - HTMLRewriter: Main class for streaming HTML parsing/modification
 * - Element: DOM element with getAttribute, setAttribute, etc.
 * - Text: Text node handler with text content
 * - Comment: Comment node handler
 * - ContentOptions: Options for content insertion (html: boolean)
 */

/**
 * Table Formatting Utilities using Bun.stringWidth
 * Correctly handles emoji, ANSI colors, and CJK characters
 * Reference: https://bun.com/blog/bun-v1.3.5#bunstringwidth-now-handles-more-edge-cases
 */
export const TableUtils = {
  /**
   * Get visual width of a string using Bun.stringWidth
   * Correctly handles emoji, ANSI escape codes, and multi-byte characters
   */
  getWidth(str: string): number {
    if (typeof Bun !== 'undefined' && 'stringWidth' in Bun) {
      return (Bun as any).stringWidth(str);
    }
    // Fallback: strip ANSI codes and estimate width
    const stripped = str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    return stripped.length;
  },

  /**
   * Pad a string to a specific visual width
   * Works correctly with emoji and ANSI colors
   */
  padEnd(str: string, targetWidth: number, padChar = ' '): string {
    const currentWidth = this.getWidth(str);
    const padding = targetWidth - currentWidth;
    if (padding <= 0) return str;
    return str + padChar.repeat(padding);
  },

  /**
   * Pad a string at the start to a specific visual width
   */
  padStart(str: string, targetWidth: number, padChar = ' '): string {
    const currentWidth = this.getWidth(str);
    const padding = targetWidth - currentWidth;
    if (padding <= 0) return str;
    return padChar.repeat(padding) + str;
  },

  /**
   * Format a 2D array as a properly aligned table
   * Works correctly with emoji and ANSI colors
   * 
   * @example
   * const table = [
   *   ["Name", "Status", "Value"],
   *   ["✅ Project", "\x1b[32mActive\x1b[0m", "$100"],
   *   ["⚠️ Alert", "\x1b[33mWarning\x1b[0m", "$50"],
   *   ["🇺🇸 US", "\x1b[31mStopped\x1b[0m", "$0"],
   * ];
   * console.log(TableUtils.formatTable(table));
   */
  formatTable(rows: string[][], separator = '  '): string {
    if (rows.length === 0) return '';
    
    // Calculate max width for each column
    const numCols = Math.max(...rows.map(row => row.length));
    const colWidths: number[] = [];
    
    for (let i = 0; i < numCols; i++) {
      colWidths[i] = Math.max(...rows.map(row => this.getWidth(row[i] || '')));
    }

    // Format each row
    return rows.map(row =>
      row.map((cell, i) => this.padEnd(cell || '', colWidths[i]!)).join(separator)
    ).join('\n');
  },

  /**
   * Format table with header separator
   */
  formatTableWithHeader(header: string[], rows: string[][], separator = '  '): string {
    const allRows = [header, ...rows];
    const numCols = header.length;
    
    // Calculate max width for each column
    const colWidths: number[] = [];
    for (let i = 0; i < numCols; i++) {
      colWidths[i] = Math.max(...allRows.map(row => this.getWidth(row[i] || '')));
    }

    // Create separator line
    const separatorLine = colWidths.map(w => '─'.repeat(w)).join('──');

    // Format header
    const headerLine = header.map((cell, i) => this.padEnd(cell, colWidths[i]!)).join(separator);
    
    // Format body rows
    const bodyLines = rows.map(row =>
      row.map((cell, i) => this.padEnd(cell || '', colWidths[i]!)).join(separator)
    );

    return [headerLine, separatorLine, ...bodyLines].join('\n');
  },

  /**
   * Strip ANSI escape codes from a string
   */
  stripAnsi(str: string): string {
    return str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  },

  /**
   * Apply ANSI color to text
   */
  color: {
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    white: (text: string) => `\x1b[37m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
    // Team role color coding system for collaborative interfaces/dashboards
    // Alice: #00CED1 → bright cyan
    alice: (text: string) => `\x1b[96m${text}\x1b[0m`,
    // Bob: #FFD700 → bright yellow/gold
    bob: (text: string) => `\x1b[93m${text}\x1b[0m`,
    // Carol: #FF69B4 → magenta/hotpink
    carol: (text: string) => `\x1b[95m${text}\x1b[0m`,
    // Dave: #00FF7F → bright green/springgreen
    dave: (text: string) => `\x1b[92m${text}\x1b[0m`,
  },
};

// Export TableUtils for easy import
export { TableUtils as Table };
