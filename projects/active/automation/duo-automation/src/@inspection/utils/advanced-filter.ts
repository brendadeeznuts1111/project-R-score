/**
 * Enhanced Filtering with Regex Support
 * 
 * Extends the filtering system to support regular expressions,
 * field-specific filtering, and advanced pattern matching.
 */

/**
 * Filter configuration types
 */
export type FilterType = 'keyword' | 'regex' | 'field' | 'path';

export interface FilterConfig {
  type: FilterType;
  value: string;
  flags?: string; // For regex
  field?: string; // For field-specific filtering
  path?: string; // For path-based filtering
  caseSensitive?: boolean;
}

/**
 * Regex-based filtering
 */
export function filterWithRegex(obj: any, pattern: string, flags = 'i'): any {
  try {
    const regex = new RegExp(pattern, flags);
    return filterInspectionTreeWithMatcher(obj, (key, value) => {
      const keyMatch = regex.test(key);
      const valueMatch = typeof value === 'string' && regex.test(value);
      return keyMatch || valueMatch;
    });
  } catch (error) {
    console.error(`Invalid regex pattern: ${pattern}`, error);
    return obj;
  }
}

/**
 * Field-specific filtering
 */
export function filterByField(obj: any, fieldName: string, valuePattern?: string): any {
  const filterValue = valuePattern ? valuePattern.toLowerCase() : '';
  
  return filterInspectionTreeWithMatcher(obj, (key, value) => {
    // Check if the key matches the field name
    if (key.toLowerCase() === fieldName.toLowerCase()) {
      // If no value pattern, include all values for this field
      if (!filterValue) return true;
      
      // If value pattern provided, match against value
      if (typeof value === 'string') {
        return value.toLowerCase().includes(filterValue);
      }
      
      return true;
    }
    
    // Also include values that contain the field name in their key
    return key.toLowerCase().includes(fieldName.toLowerCase());
  });
}

/**
 * Path-based filtering (JSONPath-like)
 */
export function filterByPath(obj: any, pathPattern: string): any {
  const pathRegex = pathPatternToRegex(pathPattern);
  
  return filterInspectionTreeWithPathMatcher(obj, (path, value) => {
    return pathRegex.test(path.join('.'));
  });
}

/**
 * Convert path pattern to regex
 */
function pathPatternToRegex(pattern: string): RegExp {
  // Convert simple path patterns to regex
  // Supports: user.paymentApps.*, *.status, user.*.venmo
  let regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '[^.]*'); // Convert * to [^.]*
  
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Advanced filter with custom matcher
 */
function filterInspectionTreeWithMatcher(
  obj: any,
  matcher: (key: string, value: any) => boolean
): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    return obj; // Keep primitive values
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj
      .map(item => filterInspectionTreeWithMatcher(item, matcher))
      .filter(item => item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  
  const result: Record<string, any> = {};
  let hasMatch = false;
  
  for (const [key, value] of Object.entries(obj)) {
    const shouldInclude = matcher(key, value);
    
    if (shouldInclude) {
      result[key] = value;
      hasMatch = true;
    } else if (typeof value === "object" && value !== null) {
      const filteredValue = filterInspectionTreeWithMatcher(value, matcher);
      if (filteredValue !== undefined) {
        result[key] = filteredValue;
        hasMatch = true;
      }
    }
  }
  
  return hasMatch ? result : undefined;
}

/**
 * Path-based filter with custom matcher
 */
function filterInspectionTreeWithPathMatcher(
  obj: any,
  matcher: (path: string[], value: any) => boolean,
  currentPath: string[] = []
): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    return matcher(currentPath, obj) ? obj : undefined;
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj
      .map((item, index) => filterInspectionTreeWithPathMatcher(item, matcher, [...currentPath, `[${index}]`]))
      .filter(item => item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  
  const result: Record<string, any> = {};
  let hasMatch = false;
  
  for (const [key, value] of Object.entries(obj)) {
    const newPath = [...currentPath, key];
    
    if (matcher(newPath, value)) {
      result[key] = value;
      hasMatch = true;
    } else if (typeof value === "object" && value !== null) {
      const filteredValue = filterInspectionTreeWithPathMatcher(value, matcher, newPath);
      if (filteredValue !== undefined) {
        result[key] = filteredValue;
        hasMatch = true;
      }
    }
  }
  
  return hasMatch ? result : undefined;
}

/**
 * Parse filter configuration from command line argument
 */
export function parseFilterConfig(filterArg: string): FilterConfig {
  // Regex pattern: /pattern/flags
  if (filterArg.startsWith('/') && filterArg.endsWith('/')) {
    const match = filterArg.match(/^\/(.*)\/([a-z]*)$/);
    if (match) {
      return {
        type: 'regex',
        value: match[1],
        flags: match[2] || 'i'
      };
    }
  }
  
  // Field-specific: field=value
  if (filterArg.includes('=')) {
    const [field, value] = filterArg.split('=', 2);
    return {
      type: 'field',
      value: value,
      field: field
    };
  }
  
  // Path-based: path.to.field or path.with.*
  if (filterArg.includes('.')) {
    return {
      type: 'path',
      value: filterArg,
      path: filterArg
    };
  }
  
  // Default keyword filter
  return {
    type: 'keyword',
    value: filterArg
  };
}

/**
 * Apply filter based on configuration
 */
export function applyFilterConfig(obj: any, config: FilterConfig): any {
  switch (config.type) {
    case 'regex':
      return filterWithRegex(obj, config.value, config.flags);
    
    case 'field':
      return filterByField(obj, config.field!, config.value);
    
    case 'path':
      return filterByPath(obj, config.path!);
    
    case 'keyword':
    default:
      // Use existing keyword filter
      const { filterInspectionTree } = require('./filter.js');
      return filterInspectionTree(obj, config.value.toLowerCase());
  }
}

/**
 * Multiple filter support
 */
export function applyMultipleFilters(obj: any, configs: FilterConfig[]): any {
  let result = obj;
  
  for (const config of configs) {
    result = applyFilterConfig(result, config);
    if (!result) break; // Early termination if result is empty
  }
  
  return result;
}

/**
 * Filter validation
 */
export function validateFilterConfig(config: FilterConfig): {
  valid: boolean;
  error?: string;
} {
  switch (config.type) {
    case 'regex':
      try {
        new RegExp(config.value, config.flags);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: `Invalid regex: ${error}` };
      }
    
    case 'field':
      if (!config.field) {
        return { valid: false, error: 'Field name is required for field filtering' };
      }
      break;
    
    case 'path':
      if (!config.path) {
        return { valid: false, error: 'Path is required for path filtering' };
      }
      break;
    
    case 'keyword':
      if (!config.value) {
        return { valid: false, error: 'Keyword is required for keyword filtering' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Enhanced filter suggestions
 */
export function getAdvancedFilterSuggestions(obj: any): {
  keywords: string[];
  fields: string[];
  paths: string[];
} {
  const keywords = new Set<string>();
  const fields = new Set<string>();
  const paths = new Set<string>();
  
  const extractInfo = (current: any, path: string[] = []) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        // Add field name
        fields.add(key);
        
        // Add path
        paths.add([...path, key].join('.'));
        
        // Add keyword parts
        const parts = key.toLowerCase().split(/[_\-\s]+/);
        parts.forEach(part => {
          if (part.length > 2) {
            keywords.add(part);
          }
        });
        
        // Recurse
        if (typeof value === "object" && value !== null && path.length < 3) {
          extractInfo(value, [...path, key]);
        }
      }
    }
  };
  
  extractInfo(obj);
  
  return {
    keywords: Array.from(keywords).sort(),
    fields: Array.from(fields).sort(),
    paths: Array.from(paths).sort()
  };
}

export default {
  filterWithRegex,
  filterByField,
  filterByPath,
  parseFilterConfig,
  applyFilterConfig,
  applyMultipleFilters,
  validateFilterConfig,
  getAdvancedFilterSuggestions
};
