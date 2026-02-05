/**
 * Enhanced Query Engine with Smart JSONPath/JMESPath Selection
 * 
 * Implements intelligent query engine selection based on expression complexity,
 * preferring jsonpath-plus for advanced features and JMESPath for simple projections.
 */

import { jmespath } from 'jmespath';
import { JSONPath } from 'jsonpath-plus';

export class EnhancedQueryEngine {
  /**
   * Smart query engine selection based on expression complexity
   */
  static applyJsonPath(obj: any, path: string): any {
    // Heuristic: detect advanced JSONPath features that JMESPath doesn't handle well
    if (this.isAdvancedJSONPath(path)) {
      try {
        const result = JSONPath({ path, json: obj, wrap: false });
        return this.normalizeResult(result);
      } catch (error) {
        console.warn(`⚠️  Advanced JSONPath failed, falling back: ${error.message}`);
      }
    }

    // Default to JMESPath for simple projections and filters
    try {
      return jmespath.search(obj, path);
    } catch (error) {
      console.warn(`⚠️  JMESPath failed, trying JSONPath fallback: ${error.message}`);
      try {
        const result = JSONPath({ path, json: obj, wrap: false });
        return this.normalizeResult(result);
      } catch (fallbackError) {
        console.error(`❌ All query engines failed for path: ${path}`);
        return obj; // Return original as last resort
      }
    }
  }

  /**
   * Detect if path uses advanced JSONPath features
   */
  private static isAdvancedJSONPath(path: string): boolean {
    // Features that JMESPath doesn't handle well:
    // - Parent reference (@)
    // - Recursive descent (..)
    // - Script expressions (==, >=, <=, !=)
    // - Conditional filtering with complex logic
    // - Union operators with complex expressions
    const advancedPatterns = [
      /@/,                    // Parent reference
      /\.\./,                 // Recursive descent
      /[=!><]=/,             // Comparison operators
      /script:/,             // Script expressions
      /\?\(/,                // Conditional expressions
      /\[.*\?.*\]/,          // Complex filtering
      /\[.*&&.*\]/,          // Logical AND in filter
      /\[.*\|\|.*\]/,        // Logical OR in filter
      /\[.*like.*\]/i,       // Like operator
      /\[.*regex.*\]/i,      // Regex in filter
      /\$\..*\[\*\].*\[\*\]/ // Multiple array traversals
    ];

    return advancedPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Normalize JSONPath result to match JMESPath expectations
   */
  private static normalizeResult(result: any): any {
    // JSONPath can return single values or arrays, normalize to consistent format
    if (Array.isArray(result)) {
      if (result.length === 0) return null;
      if (result.length === 1) return result[0];
      return result;
    }
    return result;
  }

  /**
   * Enhanced JQ-like implementation with extended syntax
   */
  static applyJqFilter(obj: any, filter: string): any {
    // Try full jq if available (optional dependency)
    if (this.hasFullJQ()) {
      try {
        return this.applyFullJQ(obj, filter);
      } catch (error) {
        console.warn(`⚠️  Full JQ failed, using lite implementation: ${error.message}`);
      }
    }

    // Fall back to lite implementation
    return this.applyJqLite(obj, filter);
  }

  /**
   * Check if full JQ is available
   */
  private static hasFullJQ(): boolean {
    try {
      // Check if jq-web or similar is available
      import('jq-web');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply full JQ if available
   */
  private static applyFullJQ(obj: any, filter: string): any {
    // This would use a full JQ implementation
    // For now, fall back to lite
    return this.applyJqLite(obj, filter);
  }

  /**
   * Enhanced JQ-lite with more operators and functions
   */
  static applyJqLite(obj: any, filter: string): any {
    const filters = filter.split('|').map(f => f.trim());
    let result = obj;
    
    for (const f of filters) {
      result = this.applySingleJqFilter(result, f);
    }
    
    return result;
  }

  private static applySingleJqFilter(obj: any, filter: string): any {
    // Enhanced parsing with more operators
    if (filter === '.') return obj;
    
    // Array iteration with mapping
    if (filter.startsWith('.[]')) {
      const subFilter = filter.slice(3).trim();
      if (Array.isArray(obj)) {
        return obj.map(item => this.applySingleJqFilter(item, subFilter || '.'));
      }
      return obj;
    }
    
    // Enhanced array filtering
    if (filter.includes('select(')) {
      const match = filter.match(/select\((.*)\)/);
      if (match && Array.isArray(obj)) {
        return obj.filter(item => this.evaluateCondition(item, match[1]));
      }
    }

    // Map operation
    if (filter.includes('map(')) {
      const match = filter.match(/map\((.*)\)/);
      if (match && Array.isArray(obj)) {
        return obj.map(item => this.applySingleJqFilter(item, match[1]));
      }
    }

    // Length operation
    if (filter.includes('length')) {
      if (Array.isArray(obj) || typeof obj === 'string') {
        return obj.length;
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).length;
      }
      return 0;
    }

    // Keys operation
    if (filter.includes('keys')) {
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj);
      }
      return [];
    }

    // Values operation
    if (filter.includes('values')) {
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj);
      }
      return [];
    }

    // Sort operation
    if (filter.includes('sort')) {
      if (Array.isArray(obj)) {
        return [...obj].sort((a, b) => {
          if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
          }
          return a - b;
        });
      }
      return obj;
    }

    // Unique operation
    if (filter.includes('unique')) {
      if (Array.isArray(obj)) {
        return [...new Set(obj)];
      }
      return obj;
    }

    // Reverse operation
    if (filter.includes('reverse')) {
      if (Array.isArray(obj)) {
        return [...obj].reverse();
      }
      return obj;
    }
    
    // Array indexing with ranges
    if (filter.match(/\[\d+:\d+\]$/)) {
      const match = filter.match(/\[(\d+):(\d+)\]$/);
      if (match && Array.isArray(obj)) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        return obj.slice(start, end);
      }
    }

    // Array slicing from start
    if (filter.match(/\[\d+:\]$/)) {
      const match = filter.match(/\[(\d+):]$/);
      if (match && Array.isArray(obj)) {
        const start = parseInt(match[1]);
        return obj.slice(start);
      }
    }

    // Array slicing to end
    if (filter.match(/\[:\d+\]$/)) {
      const match = filter.match(/\[:(\d+)\]$/);
      if (match && Array.isArray(obj)) {
        const end = parseInt(match[1]);
        return obj.slice(0, end);
      }
    }
    
    // Field selection with nested paths
    if (filter.startsWith('.') && filter.includes('.')) {
      const parts = filter.split('.').filter(p => p);
      let current = obj;
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }
    
    // Simple field access
    if (filter.startsWith('.') && filter.length > 1) {
      const field = filter.slice(1);
      return obj?.[field];
    }
    
    // Array indexing
    if (filter.match(/\[\d+\]$/)) {
      const index = parseInt(filter.match(/\[(\d+)\]$/)![1]);
      return Array.isArray(obj) ? obj[index] : undefined;
    }

    // String operations
    if (filter.includes('split(')) {
      const match = filter.match(/split\("([^"]+)"\)/);
      if (match && typeof obj === 'string') {
        return obj.split(match[1]);
      }
    }

    if (filter.includes('join(')) {
      const match = filter.match(/join\("([^"]+)"\)/);
      if (match && Array.isArray(obj)) {
        return obj.join(match[1]);
      }
    }

    if (filter.includes('toupper')) {
      if (typeof obj === 'string') {
        return obj.toUpperCase();
      }
      return obj;
    }

    if (filter.includes('tolower')) {
      if (typeof obj === 'string') {
        return obj.toLowerCase();
      }
      return obj;
    }

    // Math operations
    if (filter.includes('sum')) {
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + (Number(item) || 0), 0);
      }
      return 0;
    }

    if (filter.includes('avg')) {
      if (Array.isArray(obj) && obj.length > 0) {
        const sum = obj.reduce((sum, item) => sum + (Number(item) || 0), 0);
        return sum / obj.length;
      }
      return 0;
    }

    if (filter.includes('min')) {
      if (Array.isArray(obj)) {
        return Math.min(...obj.map(item => Number(item) || 0));
      }
      return obj;
    }

    if (filter.includes('max')) {
      if (Array.isArray(obj)) {
        return Math.max(...obj.map(item => Number(item) || 0));
      }
      return obj;
    }
    
    return obj;
  }

  /**
   * Enhanced condition evaluation with more operators
   */
  private static evaluateCondition(item: any, condition: string): boolean {
    // Enhanced string operations
    if (condition.includes('contains(')) {
      const match = condition.match(/contains\("([^"]+)"\)/);
      if (match && typeof item === 'string') {
        return item.includes(match[1]);
      }
    }

    if (condition.includes('startswith(')) {
      const match = condition.match(/startswith\("([^"]+)"\)/);
      if (match && typeof item === 'string') {
        return item.startsWith(match[1]);
      }
    }

    if (condition.includes('endswith(')) {
      const match = condition.match(/endswith\("([^"]+)"\)/);
      if (match && typeof item === 'string') {
        return item.endsWith(match[1]);
      }
    }

    if (condition.includes('matches(')) {
      const match = condition.match(/matches\("([^"]+)"\)/);
      if (match && typeof item === 'string') {
        const regex = new RegExp(match[1]);
        return regex.test(item);
      }
    }

    // Enhanced numeric comparisons
    if (condition.includes('>=')) {
      const [field, value] = condition.split('>=').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue >= compareValue;
    }

    if (condition.includes('<=')) {
      const [field, value] = condition.split('<=').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue <= compareValue;
    }

    if (condition.includes('!=')) {
      const [field, value] = condition.split('!=').map(s => s.trim());
      const itemValue = item[field];
      const compareValue = value.startsWith('"') ? value.slice(1, -1) : Number(value);
      return itemValue !== compareValue;
    }

    // Simple equals
    if (condition.includes('==')) {
      const [field, value] = condition.split('==').map(s => s.trim());
      const itemValue = item[field];
      const compareValue = value.startsWith('"') ? value.slice(1, -1) : value;
      return itemValue === compareValue;
    }
    
    // Simple greater than
    if (condition.includes('>')) {
      const [field, value] = condition.split('>').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue > compareValue;
    }

    // Simple less than
    if (condition.includes('<')) {
      const [field, value] = condition.split('<').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue < compareValue;
    }

    // Type checks
    if (condition.includes('type(')) {
      const match = condition.match(/type\("([^"]+)"\)/);
      if (match) {
        return typeof item === match[1];
      }
    }

    if (condition.includes('has(')) {
      const match = condition.match(/has\("([^"]+)"\)/);
      if (match && typeof item === 'object' && item !== null) {
        return match[1] in item;
      }
    }

    // Length checks
    if (condition.includes('length >')) {
      const match = condition.match(/length > (\d+)/);
      if (match) {
        const length = Array.isArray(item) ? item.length : 
                      typeof item === 'string' ? item.length : 
                      typeof item === 'object' ? Object.keys(item).length : 0;
        return length > parseInt(match[1]);
      }
    }

    if (condition.includes('length <')) {
      const match = condition.match(/length < (\d+)/);
      if (match) {
        const length = Array.isArray(item) ? item.length : 
                      typeof item === 'string' ? item.length : 
                      typeof item === 'object' ? Object.keys(item).length : 0;
        return length < parseInt(match[1]);
      }
    }

    return false;
  }

  /**
   * Get supported JQ-lite patterns
   */
  static getSupportedPatterns(): {
    basic: string[];
    advanced: string[];
    array: string[];
    string: string[];
    math: string[];
  } {
    return {
      basic: [
        '.field',
        '.field.subfield',
        '.',
        '.[]'
      ],
      advanced: [
        '.[] | select(.amount > 100)',
        '.[] | map(.amount)',
        '.transactions | select(.status == "completed")',
        '.users[] | select(.email contains "@example")'
      ],
      array: [
        '.[0]',
        '.[-1]',
        '.[2:5]',
        '.[10:]',
        '.[:10]',
        '.[] | length',
        '.[] | sort',
        '.[] | unique',
        '.[] | reverse'
      ],
      string: [
        '.[] | split(",")',
        '.[] | join(",")',
        '.[] | toupper',
        '.[] | tolower',
        '.[] | contains("test")',
        '.[] | startswith("prefix")',
        '.[] | endswith("suffix")',
        '.[] | matches("\\d+")'
      ],
      math: [
        '.[] | sum',
        '.[] | avg',
        '.[] | min',
        '.[] | max',
        '.[] | select(.amount > 100)'
      ]
    };
  }

  /**
   * Validate JQ-lite syntax
   */
  static validateJQLite(filter: string): {
    valid: boolean;
    error?: string;
    suggestions?: string[];
  } {
    try {
      // Test on simple object
      this.applyJqLite({}, filter);
      return { valid: true };
    } catch (error: any) {
      const suggestions = this.getSuggestions(filter);
      return {
        valid: false,
        error: error.message,
        suggestions
      };
    }
  }

  /**
   * Get syntax suggestions based on input
   */
  private static getSuggestions(filter: string): string[] {
    const suggestions: string[] = [];
    
    if (filter.includes('select')) {
      suggestions.push('Try: .[] | select(.amount > 100)');
      suggestions.push('Try: .[] | select(.status == "completed")');
    }
    
    if (filter.includes('map')) {
      suggestions.push('Try: .[] | map(.amount)');
      suggestions.push('Try: .[] | map(.user.email)');
    }
    
    if (filter.includes('[') && !filter.includes(']')) {
      suggestions.push('Try: .[0] for first item');
      suggestions.push('Try: .[2:5] for slice');
      suggestions.push('Try: .[-1] for last item');
    }
    
    return suggestions;
  }
}

export default EnhancedQueryEngine;
