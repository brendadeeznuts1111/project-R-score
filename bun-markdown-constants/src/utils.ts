/**
 * Utility Functions
 * 
 * Helper utilities for markdown processing
 */

import type { ValidationResult, SecurityScanResult, CacheStats } from './types';

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate markdown content
 * Checks for size limits, invalid patterns, and potential security issues
 */
export function validateMarkdown(content: string, options: {
  maxSize?: number;
  allowHtml?: boolean;
  checkScripts?: boolean;
} = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { maxSize = 1000000, allowHtml = true, checkScripts = true } = options;
  
  // Size check
  if (content.length > maxSize) {
    errors.push(`Content exceeds maximum size of ${maxSize} characters`);
  }
  
  // Script tag check
  if (checkScripts && /<script\b/i.test(content)) {
    errors.push('Content contains script tags');
  }
  
  // Event handler check
  if (checkScripts && /on\w+\s*=/i.test(content)) {
    warnings.push('Content may contain inline event handlers');
  }
  
  // Unclosed HTML check
  if (allowHtml) {
    const openTags = (content.match(/<[a-z][^>]*>/gi) || []).length;
    const closeTags = (content.match(/<\/[a-z][^>]*>/gi) || []).length;
    if (openTags !== closeTags) {
      warnings.push('Potentially unclosed HTML tags detected');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Scan markdown for security issues
 */
export function securityScan(content: string): SecurityScanResult {
  const issues: SecurityScanResult['issues'] = [];
  
  // Dangerous HTML patterns
  const dangerousPatterns = [
    { pattern: /<script\b/i, type: 'dangerous_html' as const, message: 'Script tag detected' },
    { pattern: /<iframe\b/i, type: 'dangerous_html' as const, message: 'Iframe tag detected' },
    { pattern: /<object\b/i, type: 'dangerous_html' as const, message: 'Object tag detected' },
    { pattern: /<embed\b/i, type: 'dangerous_html' as const, message: 'Embed tag detected' },
    { pattern: /javascript:/i, type: 'blacklisted_pattern' as const, message: 'JavaScript protocol detected' },
    { pattern: /data:text\/html/i, type: 'blacklisted_pattern' as const, message: 'Data URL with HTML detected' },
    { pattern: /on\w+\s*=/i, type: 'blacklisted_pattern' as const, message: 'Inline event handler detected' },
  ];
  
  for (const { pattern, type, message } of dangerousPatterns) {
    if (pattern.test(content)) {
      const position = content.search(pattern);
      issues.push({ type, message, position });
    }
  }
  
  return {
    safe: issues.length === 0,
    issues
  };
}

// ============================================================================
// Content Utilities
// ============================================================================

/**
 * Extract plain text from markdown
 * Removes all formatting and returns just the text content
 */
export function extractText(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove emphasis
    .replace(/(\*\*|__|\*|_)/g, '')
    // Remove headers
    .replace(/^#+\s*/gm, '')
    // Remove blockquotes
    .replace(/^>\s*/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    // Normalize whitespace
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Count words in markdown content
 */
export function countWords(markdown: string): number {
  const text = extractText(markdown);
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Estimate reading time
 * @param markdown - Markdown content
 * @param wordsPerMinute - Reading speed (default: 200)
 */
export function estimateReadingTime(markdown: string, wordsPerMinute = 200): {
  minutes: number;
  words: number;
  text: string;
} {
  const text = extractText(markdown);
  const words = countWords(markdown);
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return { minutes, words, text };
}

/**
 * Truncate markdown to a specific length
 * Preserves markdown structure when possible
 */
export function truncateMarkdown(markdown: string, maxLength: number, options: {
  ellipsis?: string;
  preserveWords?: boolean;
} = {}): string {
  const { ellipsis = '...', preserveWords = true } = options;
  
  if (markdown.length <= maxLength) {
    return markdown;
  }
  
  let truncated = markdown.slice(0, maxLength - ellipsis.length);
  
  if (preserveWords) {
    // Try to end at a word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      truncated = truncated.slice(0, lastSpace);
    }
  }
  
  return truncated + ellipsis;
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Calculate cache statistics
 */
export function calculateCacheStats(hits: number, misses: number): CacheStats {
  const total = hits + misses;
  return {
    hits,
    misses,
    size: total,
    hitRate: total > 0 ? hits / total : 0
  };
}

/**
 * Create a simple hash for caching
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Debounce function for performance-critical operations
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function for rate-limited operations
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure function execution time
 */
export function measureTime<T>(fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Run function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 100, onError } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      
      if (onError && error instanceof Error) {
        onError(error, attempt);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw new Error('Retry failed');
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Escape regex special characters
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Slugify a string for use in URLs
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
