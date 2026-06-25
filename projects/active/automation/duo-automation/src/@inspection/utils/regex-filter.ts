/**
 * Enhanced Filtering with Regex and Path Support
 * 
 * Extends the filtering system to support regex-based filtering and
 * field-specific path exclusions with Bun-native, zero-dependency implementation.
 */

import { validateFilterKeyword } from "./filter.js";

/**
 * Filter inspection tree using regex pattern matching
 */
export function filterInspectionTreeWithRegex(obj: any, regex: RegExp): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    // Keep if matches regex
    return regex.test(String(obj)) ? obj : undefined;
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj
      .map(item => filterInspectionTreeWithRegex(item, regex))
      .filter(item => item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  
  // Object case
  const result: Record<string, any> = {};
  let hasMatch = false;
  
  for (const [key, value] of Object.entries(obj)) {
    // Check key or recurse into value
    const keyMatch = regex.test(key);
    const filteredValue = filterInspectionTreeWithRegex(value, regex);
    const valueMatch = filteredValue !== undefined;
    
    if (keyMatch || valueMatch) {
      result[key] = keyMatch ? value : filteredValue;
      hasMatch = true;
    }
  }
  
  return hasMatch ? result : undefined;
}

/**
 * Exclude specific paths from inspection tree
 */
export function excludePathsFromInspectionTree(obj: any, paths: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Create a deep copy to avoid mutating original
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const path of paths) {
    excludePathFromObject(result, path.split('.'));
  }
  
  return result;
}

/**
 * Remove a specific path from an object
 */
function excludePathFromObject(obj: any, pathParts: string[]): void {
  if (pathParts.length === 0 || !obj || typeof obj !== 'object') return;
  
  const [current, ...rest] = pathParts;
  
  // Handle array indices (e.g., "payments.0.amount")
  if (Array.isArray(obj) && /^\d+$/.test(current)) {
    const index = parseInt(current, 10);
    if (index < obj.length) {
      if (rest.length === 0) {
        // Remove array element
        obj.splice(index, 1);
      } else {
        excludePathFromObject(obj[index], rest);
      }
    }
  }
  // Handle object keys
  else if (obj.hasOwnProperty(current)) {
    if (rest.length === 0) {
      // Remove the key
      delete obj[current];
    } else {
      excludePathFromObject(obj[current], rest);
    }
  }
}

/**
 * Validate exclude path for safety
 */
export function validateExcludePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /__proto__/i,  // Prototype pollution
    /constructor/i,  // Constructor access
    /prototype/i,  // Prototype access
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      return { valid: false, error: `Path contains dangerous pattern: ${pattern}` };
    }
  }
  
  // Check for valid path format (dot notation)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(path)) {
    return { valid: false, error: 'Path must use valid dot notation (e.g., user.email)' };
  }
  
  return { valid: true };
}

/**
 * Validate regex pattern for safety
 */
export function validateRegexPattern(pattern: string): { valid: boolean; error?: string } {
  if (!pattern || typeof pattern !== 'string') {
    return { valid: false, error: 'Pattern must be a non-empty string' };
  }
  
  // Check for dangerous regex patterns that could cause ReDoS
  const dangerousPatterns = [
    /\(\?=<.*>/,  // Lookahead with nested groups
    /\(\?<=.*>/,  // Lookbehind with nested groups
    /\(\?\!\=.*>/, // Negative lookahead with nested groups
    /\(\?\!<=.*>/, // Negative lookbehind with nested groups
    /\*{2,}/,  // Excessive nesting
    /\+{2,}/,  // Excessive repetition
  ];
  
  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return { valid: false, error: 'Pattern contains potentially dangerous regex' };
    }
  }
  
  try {
    // Test if regex compiles
    new RegExp(pattern, 'i');
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid regex: ${error}` };
  }
}

/**
 * Create summary for path exclusions
 */
export function createExcludePathsSummary(paths: string[], originalObj: any, resultObj: any): string {
  const originalCount = countNodes(originalObj);
  const resultCount = countNodes(resultObj);
  const removedCount = originalCount - resultCount;
  const reductionPercent = originalCount > 0 ? ((removedCount / originalCount) * 100).toFixed(1) : '0.0';
  
  return `🚫 Path Exclusion Summary:
  Excluded paths: ${paths.join(', ')}
  Nodes removed: ${removedCount} (${reductionPercent}% reduction)
  Remaining nodes: ${resultCount}`;
}

/**
 * Count nodes in object tree
 */
function countNodes(obj: any): number {
  if (obj === null || obj === undefined) return 0;
  
  if (typeof obj !== 'object') return 1;
  
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countNodes(item), 0);
  }
  
  return Object.values(obj).reduce((sum, value) => sum + countNodes(value), 0);
}

/**
 * Get regex pattern suggestions based on object content
 */
export function getRegexSuggestions(obj: any): string[] {
  const suggestions: string[] = [];
  const patterns = new Set<string>();
  
  const extractPatterns = (current: any, path: string[] = []) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        // Add key patterns
        if (typeof key === 'string') {
          // Email pattern
          if (key.includes('email') || key.includes('mail')) {
            patterns.add('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b');
          }
          
          // Phone pattern
          if (key.includes('phone') || key.includes('tel')) {
            patterns.add('\\b\\+?1?[\\s-]?\\(?[0-9]{3}\\)?[\\s-]?[0-9]{3}[\\s-]?[0-9]{4}\\b');
          }
          
          // ID pattern
          if (key.includes('id') || key.includes('Id')) {
            patterns.add('\\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\b');
          }
          
          // Bitcoin address pattern
          if (key.includes('bitcoin') || key.includes('btc')) {
            patterns.add('\\bbc1[a-z0-9]{25,39}\\b');
          }
          
          // Ethereum address pattern
          if (key.includes('ethereum') || key.includes('eth')) {
            patterns.add('\\b0x[a-fA-F0-9]{40}\\b');
          }
          
          // Cashtag pattern
          if (key.includes('cashapp') || key.includes('cashtag')) {
            patterns.add('\\$[a-zA-Z0-9_]{1,20}');
          }
        }
        
        // Extract value patterns
        if (typeof value === 'string') {
          // Find URLs
          if (value.startsWith('http')) {
            patterns.add('https?://[^\\s]+');
          }
          
          // Find JSON paths
          if (value.includes('.json')) {
            patterns.add('[^/]+\\.json');
          }
        }
        
        // Recurse
        if (typeof value === 'object' && value !== null && path.length < 3) {
          extractPatterns(value, [...path, key]);
        }
      }
    }
  };
  
  extractPatterns(obj);
  
  return Array.from(patterns);
}

/**
 * Get path suggestions based on object structure
 */
export function getPathSuggestions(obj: any): string[] {
  const paths: string[] = [];
  
  const extractPaths = (current: any, currentPath: string[] = []) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        const fullPath = [...currentPath, key].join('.');
        
        // Add current path
        paths.push(fullPath);
        
        // Add specific field suggestions
        if (key.includes('email') || key.includes('mail')) {
          paths.push(fullPath);
        }
        
        if (key.includes('phone') || key.includes('tel')) {
          paths.push(fullPath);
        }
        
        if (key.includes('token') || key.includes('secret') || key.includes('key')) {
          paths.push(fullPath);
        }
        
        if (key.includes('password') || key.includes('pass')) {
          paths.push(fullPath);
        }
        
        // Recurse with depth limit
        if (typeof value === 'object' && value !== null && currentPath.length < 3) {
          extractPaths(value, [...currentPath, key]);
        }
      }
    }
  };
  
  extractPaths(obj);
  
  // Remove duplicates and sort
  return [...new Set(paths)].sort();
}

export default {
  filterInspectionTreeWithRegex,
  excludePathsFromInspectionTree,
  validateExcludePath,
  validateRegexPattern,
  createExcludePathsSummary,
  getRegexSuggestions,
  getPathSuggestions
};
