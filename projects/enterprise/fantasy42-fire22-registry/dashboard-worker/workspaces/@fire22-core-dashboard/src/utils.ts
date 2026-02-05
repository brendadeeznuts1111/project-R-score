/**
 * 🛠️ Centralized Utilities
 * Common utility functions used across the entire project
 * Ensures consistency and reduces code duplication
 */

import { COLORS, SYSTEM_CONFIG, STATUS, VALIDATION } from './globals';

// 🔄 Async Utilities
export const asyncUtils = {
  /**
   * Delay execution for specified milliseconds
   */
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Retry async operation with exponential backoff
   */
  retry: async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = SYSTEM_CONFIG.api.retryAttempts,
    baseDelay: number = SYSTEM_CONFIG.api.retryDelay
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await asyncUtils.delay(delay);
      }
    }

    throw lastError!;
  },

  /**
   * Execute multiple async operations with concurrency limit
   */
  concurrent: async <T>(
    operations: (() => Promise<T>)[],
    maxConcurrent: number = SYSTEM_CONFIG.api.maxConcurrentRequests
  ): Promise<T[]> => {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const operation of operations) {
      const promise = operation().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  },

  /**
   * Timeout wrapper for async operations
   */
  withTimeout: <T>(
    operation: Promise<T>,
    timeoutMs: number = SYSTEM_CONFIG.api.timeout
  ): Promise<T> => {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ]);
  },
};

// 🎨 Styling Utilities
export const styleUtils = {
  /**
   * Generate CSS custom properties string
   */
  generateCSSVariables: (): string => {
    const variables = Object.entries(COLORS).flatMap(([category, colors]) =>
      Object.entries(colors).map(([name, value]) => `--color-${category}-${name}: ${value};`)
    );

    return `:root {\n  ${variables.join('\n  ')}\n}`;
  },

  /**
   * Generate responsive CSS classes
   */
  generateResponsiveClasses: (): string => {
    const breakpoints = {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    };

    return Object.entries(breakpoints)
      .map(
        ([name, width]) =>
          `@media (min-width: ${width}) {\n  .${name}\\:hidden { display: none; }\n  .${name}\\:block { display: block; }\n}`
      )
      .join('\n\n');
  },

  /**
   * Generate animation keyframes
   */
  generateAnimations: (): string => `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,

  /**
   * Generate utility classes
   */
  generateUtilityClasses: (): string => `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    
    .font-bold { font-weight: bold; }
    .font-normal { font-weight: normal; }
    .font-light { font-weight: 300; }
    
    .rounded { border-radius: 0.25rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 1rem; }
    
    .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  `,
};

// 📊 Data Utilities
export const dataUtils = {
  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as T;
    if (obj instanceof Array) return obj.map(item => dataUtils.deepClone(item)) as T;
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = dataUtils.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  },

  /**
   * Merge objects deeply
   */
  deepMerge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target;

    const source = sources.shift();
    if (source === undefined) return target;

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return deepMerge(target, ...sources);
  },

  /**
   * Generate unique ID
   */
  generateId: (prefix = ''): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * Format bytes to human readable format
   */
  formatBytes: (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Format time ago
   */
  formatTimeAgo: (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  },

  /**
   * Calculate percentage
   */
  calculatePercentage: (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  /**
   * Round to specified decimal places
   */
  roundTo: (value: number, decimals: number): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
};

// 🔐 Security Utilities
export const securityUtils = {
  /**
   * Generate random string
   */
  generateRandomString: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Hash string using Bun's built-in crypto
   */
  async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength: (
    password: string
  ): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= VALIDATION.limits.minBet) {
      score += 1;
    } else {
      feedback.push(`Password must be at least ${VALIDATION.limits.minBet} characters long`);
    }

    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const isValid = score >= 3;

    if (!isValid) {
      if (score < 2) feedback.push('Password is too weak');
      if (score < 3) feedback.push('Consider adding numbers and special characters');
    }

    return { isValid, score, feedback };
  },
};

// 📝 String Utilities
export const stringUtils = {
  /**
   * Capitalize first letter
   */
  capitalize: (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),

  /**
   * Convert to kebab case
   */
  toKebabCase: (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),

  /**
   * Convert to camel case
   */
  toCamelCase: (str: string): string =>
    str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),

  /**
   * Convert to snake case
   */
  toSnakeCase: (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),

  /**
   * Convert to title case
   */
  toTitleCase: (str: string): string =>
    str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),

  /**
   * Truncate string with ellipsis
   */
  truncate: (str: string, maxLength: number): string =>
    str.length > maxLength ? str.substring(0, maxLength) + '...' : str,

  /**
   * Remove HTML tags
   */
  stripHtml: (html: string): string => html.replace(/<[^>]*>/g, ''),

  /**
   * Escape HTML entities
   */
  escapeHtml: (str: string): string =>
    str.replace(/[&<>"']/g, char => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    }),
};

// 🔍 Validation Utilities
export const validationUtils = {
  /**
   * Check if value is empty
   */
  isEmpty: (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Check if value is a valid number
   */
  isValidNumber: (value: any): boolean => {
    if (typeof value === 'number') return !isNaN(value) && isFinite(value);
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num);
    }
    return false;
  },

  /**
   * Check if value is a valid date
   */
  isValidDate: (value: any): boolean => {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  },

  /**
   * Validate required fields
   */
  validateRequired: (
    data: Record<string, any>,
    requiredFields: string[]
  ): {
    isValid: boolean;
    missingFields: string[];
  } => {
    const missingFields = requiredFields.filter(field => validationUtils.isEmpty(data[field]));

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  },

  /**
   * Validate field length
   */
  validateLength: (value: string, min: number, max: number): boolean => {
    if (typeof value !== 'string') return false;
    return value.length >= min && value.length <= max;
  },

  /**
   * Validate field range
   */
  validateRange: (value: number, min: number, max: number): boolean => {
    if (!validationUtils.isValidNumber(value)) return false;
    return value >= min && value <= max;
  },
};

// 🎯 Status Utilities
export const statusUtils = {
  /**
   * Get status color
   */
  getStatusColor: (status: string): string => {
    switch (status.toLowerCase()) {
      case STATUS.health.ok.toLowerCase():
      case STATUS.build.completed:
      case STATUS.queue.completed:
        return COLORS.accent.success;

      case STATUS.health.warning.toLowerCase():
      case STATUS.build.running:
      case STATUS.queue.processing:
        return COLORS.accent.warning;

      case STATUS.health.error.toLowerCase():
      case STATUS.build.failed:
      case STATUS.queue.failed:
        return COLORS.accent.error;

      case STATUS.build.pending:
      case STATUS.queue.pending:
        return COLORS.accent.info;

      default:
        return COLORS.text.muted;
    }
  },

  /**
   * Get status icon
   */
  getStatusIcon: (status: string): string => {
    switch (status.toLowerCase()) {
      case STATUS.health.ok.toLowerCase():
      case STATUS.build.completed:
      case STATUS.queue.completed:
        return '✅';

      case STATUS.health.warning.toLowerCase():
      case STATUS.build.running:
      case STATUS.queue.processing:
        return '⏳';

      case STATUS.health.error.toLowerCase():
      case STATUS.build.failed:
      case STATUS.queue.failed:
        return '❌';

      case STATUS.build.pending:
      case STATUS.queue.pending:
        return '⏸️';

      default:
        return '❓';
    }
  },

  /**
   * Check if status is active
   */
  isActiveStatus: (status: string): boolean => {
    const activeStatuses = [STATUS.build.running, STATUS.queue.processing];
    return activeStatuses.includes(status as any);
  },
};

// Bun-specific utilities
export const bunUtils = {
  /**
   * Import HTML file as text using Bun's type: "text" import
   * @param path - Path to HTML file
   * @returns Promise<string> - HTML content as text
   */
  async importHTML(path: string): Promise<string> {
    try {
      // Dynamic import with type: "text" for Bun
      const html = await import(path, { assert: { type: 'text' } });
      return html.default;
    } catch (error) {
      throw new Error(`Failed to import HTML file ${path}: ${error}`);
    }
  },

  /**
   * Import multiple HTML files and return as object
   * @param paths - Array of HTML file paths
   * @returns Promise<Record<string, string>> - Object with filename as key and HTML content as value
   */
  async importMultipleHTML(paths: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const path of paths) {
      try {
        const filename = path.split('/').pop()?.replace('.html', '') || 'unknown';
        results[filename] = await bunUtils.importHTML(path);
      } catch (error) {
        console.warn(`Failed to import ${path}: ${error}`);
      }
    }

    return results;
  },

  /**
   * Watch HTML file for changes and reload
   * @param path - Path to HTML file
   * @param callback - Function to call when file changes
   * @returns Function - Unwatch function
   */
  watchHTML(path: string, callback: (content: string) => void): () => void {
    // This leverages Bun's built-in watch mode
    // The import will automatically reload when the file changes
    let currentContent = '';

    const checkForChanges = async () => {
      try {
        const newContent = await bunUtils.importHTML(path);
        if (newContent !== currentContent) {
          currentContent = newContent;
          callback(newContent);
        }
      } catch (error) {
        console.warn(`Failed to watch ${path}: ${error}`);
      }
    };

    // Initial load
    checkForChanges();

    // Return unwatch function
    return () => {
      // In a real implementation, you might want to use Bun's file watcher
      // For now, this is a placeholder for cleanup
    };
  },

  /**
   * Parse HTML content and extract specific elements
   * @param html - HTML content as string
   * @param selector - CSS selector to find elements
   * @returns HTMLElement[] - Array of found elements
   */
  parseHTML(html: string, selector?: string): HTMLElement[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (selector) {
      return Array.from(doc.querySelectorAll(selector));
    }

    return [doc.body];
  },

  /**
   * Extract metadata from HTML content
   * @param html - HTML content as string
   * @returns Record<string, string> - Object with metadata
   */
  extractHTMLMetadata(html: string): Record<string, string> {
    const metadata: Record<string, string> = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1];

    // Extract meta tags
    const metaMatches = html.matchAll(
      /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    );
    for (const match of metaMatches) {
      metadata[match[1]] = match[2];
    }

    // Extract CSS links
    const cssMatches = html.matchAll(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi);
    metadata.cssFiles = Array.from(cssMatches, m => m[1]).join(',');

    // Extract script tags
    const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
    metadata.scriptFiles = Array.from(scriptMatches, m => m[1]).join(',');

    return metadata;
  },

  /**
   * Validate HTML structure and standardization compliance
   * @param html - HTML content as string
   * @returns Record<string, any> - Validation results
   */
  validateHTMLStandardization(html: string): Record<string, any> {
    const results = {
      hasDoctype: false,
      hasTitle: false,
      hasMetaDescription: false,
      hasFrameworkCSS: false,
      hasInlineStyles: false,
      usesCSSVariables: false,
      hasSemanticHTML: false,
      accessibilityScore: 0,
      standardizationScore: 0,
      recommendations: [] as string[],
    };

    // Check basic HTML structure
    results.hasDoctype = html.includes('<!DOCTYPE html>');
    results.hasTitle = html.includes('<title>');
    results.hasMetaDescription = html.includes('name="description"');

    // Check CSS framework usage
    results.hasFrameworkCSS = html.includes('framework.css');
    results.hasInlineStyles = html.includes('<style>') || html.includes('style=');
    results.usesCSSVariables = html.includes('var(--');

    // Check semantic HTML
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    results.hasSemanticHTML = semanticTags.some(tag => html.includes(`<${tag}`));

    // Calculate accessibility score
    let accessibilityScore = 0;
    if (results.hasTitle) accessibilityScore += 20;
    if (results.hasMetaDescription) accessibilityScore += 20;
    if (results.hasSemanticHTML) accessibilityScore += 30;
    if (html.includes('alt=')) accessibilityScore += 15;
    if (html.includes('aria-')) accessibilityScore += 15;
    results.accessibilityScore = accessibilityScore;

    // Calculate standardization score
    let standardizationScore = 0;
    if (results.hasFrameworkCSS) standardizationScore += 30;
    if (!results.hasInlineStyles) standardizationScore += 25;
    if (results.usesCSSVariables) standardizationScore += 20;
    if (results.hasDoctype) standardizationScore += 10;
    if (results.hasTitle) standardizationScore += 10;
    if (results.hasMetaDescription) standardizationScore += 5;
    results.standardizationScore = standardizationScore;

    // Generate recommendations
    if (!results.hasFrameworkCSS) {
      results.recommendations.push('Add framework.css import for consistent styling');
    }
    if (results.hasInlineStyles) {
      results.recommendations.push('Convert inline styles to CSS classes');
    }
    if (!results.usesCSSVariables) {
      results.recommendations.push('Use CSS custom properties for theming');
    }
    if (!results.hasSemanticHTML) {
      results.recommendations.push('Use semantic HTML tags for better accessibility');
    }

    return results;
  },

  /**
   * Transform HTML content to use standardized framework
   * @param html - Original HTML content
   * @returns string - Transformed HTML with standardized classes
   */
  transformToStandardizedHTML(html: string): string {
    let transformed = html;

    // Replace common inline styles with utility classes
    const styleReplacements = [
      { pattern: /style="color:\s*#[a-fA-F0-9]{3,6}"/g, replacement: 'class="text-primary"' },
      {
        pattern: /style="background-color:\s*#[a-fA-F0-9]{3,6}"/g,
        replacement: 'class="bg-primary"',
      },
      { pattern: /style="padding:\s*\d+px"/g, replacement: 'class="p-3"' },
      { pattern: /style="margin:\s*\d+px"/g, replacement: 'class="m-3"' },
      { pattern: /style="text-align:\s*center"/g, replacement: 'class="text-center"' },
      { pattern: /style="font-size:\s*\d+px"/g, replacement: 'class="text-base"' },
    ];

    for (const replacement of styleReplacements) {
      transformed = transformed.replace(replacement.pattern, replacement.replacement);
    }

    // Add framework CSS link if not present
    if (!transformed.includes('framework.css')) {
      transformed = transformed.replace(
        '</head>',
        '    <link rel="stylesheet" href="../src/styles/framework.css">\n  </head>'
      );
    }

    return transformed;
  },
};

// 🔧 Helper Functions
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (source === undefined) return target;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

// Export all utilities
export default {
  asyncUtils,
  styleUtils,
  dataUtils,
  securityUtils,
  stringUtils,
  validationUtils,
  statusUtils,
  bunUtils,
};
