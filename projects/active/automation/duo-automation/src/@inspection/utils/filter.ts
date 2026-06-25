/**
 * Inspection Tree Filter
 * 
 * Recursive filtering function for inspection trees with keyword matching.
 * Case-insensitive, works with objects, arrays, and primitive values.
 */

/**
 * Enhanced Filtering with Regex and Path Support
 * 
 * Extends the filtering system to support regex-based filtering and
 * field-specific path exclusions with Bun-native, zero-dependency implementation.
 */

import { validateFilterKeyword } from "./filter.js";
import { 
  filterInspectionTreeWithRegex, 
  excludePathsFromInspectionTree, 
  validateExcludePath, 
  validateRegexPattern, 
  createExcludePathsSummary 
} from "./regex-filter.js";

// Re-export all existing functions
export * from "./filter.js";

// Re-export new regex and path functions
export {
  filterInspectionTreeWithRegex,
  excludePathsFromInspectionTree,
  validateExcludePath,
  validateRegexPattern,
  createExcludePathsSummary
};

/**
 * Filter inspection tree by keyword
 */
export function filterInspectionTree(obj: any, keyword: string): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    // Check if primitive value contains keyword
    return String(obj).toLowerCase().includes(keyword) ? obj : undefined;
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj
      .map(item => filterInspectionTree(item, keyword))
      .filter(item => item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  
  // Object case
  const result: Record<string, any> = {};
  let hasMatch = false;
  
  for (const [key, value] of Object.entries(obj)) {
    // Check key or recurse into value
    const keyMatch = key.toLowerCase().includes(keyword);
    const filteredValue = filterInspectionTree(value, keyword);
    const valueMatch = filteredValue !== undefined;
    
    if (keyMatch || valueMatch) {
      result[key] = keyMatch ? value : filteredValue;
      hasMatch = true;
    }
  }
  
  return hasMatch ? result : undefined;
}

/**
 * Exclude from inspection tree by keyword
 */
export function excludeFromInspectionTree(obj: any, keyword: string): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    // Keep primitive values (exclusion only applies to keys/structure)
    return obj;
  }
  
  if (Array.isArray(obj)) {
    // Filter out array items that contain the keyword in their string representation
    return obj
      .map(item => excludeFromInspectionTree(item, keyword))
      .filter(item => {
        if (item === undefined) return false;
        return !String(item).toLowerCase().includes(keyword);
      });
  }
  
  // Object case - remove keys and prune values
  const result: Record<string, any> = {};
  let hasRemaining = false;
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys that match exclude keyword
    if (key.toLowerCase().includes(keyword)) {
      continue;
    }
    
    // Recursively process value
    const processedValue = excludeFromInspectionTree(value, keyword);
    
    // Only include if value isn't undefined and doesn't contain keyword in string form
    if (processedValue !== undefined) {
      const valueStr = String(processedValue).toLowerCase();
      if (!valueStr.includes(keyword)) {
        result[key] = processedValue;
        hasRemaining = true;
      }
    }
  }
  
  return hasRemaining ? result : undefined;
}

/**
 * Shell formatter for filtered objects
 */
export function formatShellFromObject(obj: any, prefix = "FACTORY_WAGER"): string {
  const lines: string[] = [];
  const seen = new Set();
  
  const flatten = (current: any, currentPrefix: string, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 5 || seen.has(current)) return;
    seen.add(current);
    
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        flatten(value, `${currentPrefix}_${key.toUpperCase()}`, depth + 1);
      }
    } else {
      const safeValue = sanitizeShellValue(current);
      lines.push(`export ${currentPrefix}="${safeValue}"`);
    }
  };
  
  flatten(obj, prefix);
  return lines.join("\n");
}

/**
 * Sanitize value for shell export
 */
function sanitizeShellValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  
  return String(value)
    .replace(/"/g, '\\"')  // Escape quotes
    .replace(/\n/g, '\\n')  // Escape newlines
    .replace(/\r/g, '\\r')  // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Get filter statistics
 */
export function getFilterStatistics(original: any, filtered: any): {
  originalNodes: number;
  filteredNodes: number;
  reduction: number;
  filterMatched: boolean;
} {
  const originalCount = countNodes(original);
  const filteredCount = countNodes(filtered);
  
  return {
    originalNodes: originalCount,
    filteredNodes: filteredCount,
    reduction: originalCount > 0 ? Math.round((1 - filteredCount / originalCount) * 100) : 0,
    filterMatched: filteredCount > 0
  };
}

/**
 * Get exclude statistics
 */
export function getExcludeStatistics(original: any, excluded: any): {
  originalNodes: number;
  excludedNodes: number;
  remainingNodes: number;
  reduction: number;
  exclusionApplied: boolean;
} {
  const originalCount = countNodes(original);
  const remainingCount = countNodes(excluded);
  const excludedCount = originalCount - remainingCount;
  
  return {
    originalNodes: originalCount,
    excludedNodes: excludedCount,
    remainingNodes: remainingCount,
    reduction: originalCount > 0 ? Math.round((excludedCount / originalCount) * 100) : 0,
    exclusionApplied: excludedCount > 0
  };
}

/**
 * Count nodes in object tree
 */
function countNodes(obj: any, visited = new Set()): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj !== "object") return 1;
  
  if (visited.has(obj)) return 0;
  visited.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countNodes(item, visited), 0);
  }
  
  return Object.values(obj).reduce((sum, value) => sum + countNodes(value, visited), 0);
}

/**
 * Validate filter keyword
 */
export function validateFilterKeyword(keyword: string): {
  valid: boolean;
  error?: string;
} {
  if (!keyword || typeof keyword !== "string") {
    return { valid: false, error: "Filter keyword cannot be empty" };
  }
  
  if (keyword.length > 100) {
    return { valid: false, error: "Filter keyword too long (max 100 characters)" };
  }
  
  if (keyword.includes('\n') || keyword.includes('\r')) {
    return { valid: false, error: "Filter keyword cannot contain newlines" };
  }
  
  return { valid: true };
}

/**
 * Get filter suggestions based on available keys
 */
export function getFilterSuggestions(obj: any): string[] {
  const suggestions = new Set<string>();
  
  const extractKeys = (current: any, path = "") => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        // Add the key itself
        suggestions.add(key.toLowerCase());
        
        // Add meaningful parts of the key
        const parts = key.toLowerCase().split(/[_\-\s]+/);
        parts.forEach(part => {
          if (part.length > 2) {
            suggestions.add(part);
          }
        });
        
        // Recurse into nested objects
        if (typeof value === "object" && value !== null && path.length < 3) {
          extractKeys(value, `${path}.${key}`);
        }
      }
    }
  };
  
  extractKeys(obj);
  return Array.from(suggestions).sort();
}

/**
 * Highlight filter matches in output
 */
export function highlightMatches(text: string, keyword: string): string {
  if (!keyword) return text;
  
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '\x1b[31m$1\x1b[0m'); // Red highlighting
}

/**
 * Create filter summary
 */
export function createFilterSummary(
  keyword: string, 
  original: any, 
  filtered: any
): string {
  const stats = getFilterStatistics(original, filtered);
  
  if (!stats.filterMatched) {
    return `🔍 No matches found for "${keyword}"`;
  }
  
  return `🔍 Filter "${keyword}": ${stats.filteredNodes} nodes shown (${stats.reduction}% reduction)`;
}

/**
 * Create exclude summary
 */
export function createExcludeSummary(
  keyword: string, 
  original: any, 
  remaining: any
): string {
  const stats = getExcludeStatistics(original, remaining);
  
  if (!stats.exclusionApplied) {
    return `🚫 No content excluded by "${keyword}"`;
  }
  
  return `🚫 Exclude "${keyword}": ${stats.excludedNodes} nodes removed (${stats.reduction}% reduction)`;
}

export default {
  filterInspectionTree,
  excludeFromInspectionTree,
  formatShellFromObject,
  getFilterStatistics,
  getExcludeStatistics,
  validateFilterKeyword,
  getFilterSuggestions,
  highlightMatches,
  createFilterSummary,
  createExcludeSummary
};
