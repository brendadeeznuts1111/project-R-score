/**
 * Advanced Scope Inspector with JSONPath, JQ-like filtering, and Pattern Extraction
 * 
 * Enterprise-grade inspection capabilities with smart regex, pattern recognition,
 * and advanced querying features that would make any ACME engineer proud.
 */

import { jmespath } from 'jmespath';
import { JSONPath } from 'jsonpath-plus';

export class AdvancedScopeInspector {
  /**
   * Apply JMESPath/JSONPath query with intelligent fallback
   */
  static applyJsonPath(obj: any, path: string): any {
    try {
      // Try JMESPath first (more powerful for complex queries)
      if (path.includes('[') || path.includes('?') || path.includes('|')) {
        return jmespath.search(obj, path);
      }
      // Fallback to JSONPath for simple path navigation
      return JSONPath({ path, json: obj });
    } catch (error) {
      console.warn(`⚠️  JSONPath query failed: ${error.message}`);
      return obj;
    }
  }

  /**
   * Apply JQ-like filter with advanced features
   */
  static applyJqFilter(obj: any, filter: string): any {
    const filters = filter.split('|').map(f => f.trim());
    let result = obj;
    
    for (const f of filters) {
      result = this.applySingleJqFilter(result, f);
    }
    
    return result;
  }

  private static applySingleJqFilter(obj: any, filter: string): any {
    // Select all
    if (filter === '.') return obj;
    
    // Array iteration with mapping
    if (filter.startsWith('.[]')) {
      const subFilter = filter.slice(3).trim();
      if (Array.isArray(obj)) {
        return obj.map(item => this.applySingleJqFilter(item, subFilter || '.'));
      }
      return obj;
    }
    
    // Array filtering with conditions
    if (filter.includes('select(')) {
      const match = filter.match(/select\((.*)\)/);
      if (match && Array.isArray(obj)) {
        return obj.filter(item => this.evaluateCondition(item, match[1]));
      }
    }
    
    // Object/array iteration with flatten
    if (filter.includes('[]')) {
      if (Array.isArray(obj)) {
        return obj.flatMap(item => 
          Array.isArray(item) ? item : [item]
        );
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
    
    return obj;
  }

  /**
   * Evaluate simple conditions for select()
   */
  private static evaluateCondition(item: any, condition: string): boolean {
    // Simple string contains
    if (condition.includes('contains(')) {
      const match = condition.match(/contains\("([^"]+)"\)/);
      if (match && typeof item === 'string') {
        return item.includes(match[1]);
      }
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
    
    return false;
  }

  /**
   * Smart regex filtering with context and intelligence
   */
  static smartRegexFilter(obj: any, regex: RegExp, options: {
    includeKeys?: boolean;
    includeValues?: boolean;
    includeTypes?: string[];
    contextLines?: number;
    highlightMatches?: boolean;
    caseSensitive?: boolean;
  } = {}): any {
    const {
      includeKeys = true,
      includeValues = true,
      includeTypes = ['string', 'number'],
      contextLines = 0,
      highlightMatches = false,
      caseSensitive = false
    } = options;

    if (obj === null || obj === undefined) return undefined;

    // Adjust regex for case sensitivity
    const searchRegex = caseSensitive ? regex : new RegExp(regex.source, regex.flags + 'i');

    // Primitive value
    if (typeof obj !== 'object') {
      const strValue = String(obj);
      if (includeValues && includeTypes.includes(typeof obj) && searchRegex.test(strValue)) {
        return highlightMatches ? this.highlightMatches(strValue, searchRegex) : obj;
      }
      return undefined;
    }

    // Array handling with index preservation
    if (Array.isArray(obj)) {
      const result: any[] = [];
      let hasMatch = false;
      
      obj.forEach((item, index) => {
        const filtered = this.smartRegexFilter(item, searchRegex, options);
        if (filtered !== undefined) {
          result.push({
            index,
            value: filtered,
            ...(contextLines > 0 && { context: `Array index ${index}` })
          });
          hasMatch = true;
        }
      });
      
      return hasMatch ? result : undefined;
    }

    // Object handling with context
    const result: Record<string, any> = {};
    let hasMatch = false;

    for (const [key, value] of Object.entries(obj)) {
      const keyMatch = includeKeys && searchRegex.test(key);
      let valueMatch = false;
      let filteredValue = value;

      if (includeValues && value !== null && value !== undefined) {
        if (includeTypes.includes(typeof value)) {
          valueMatch = searchRegex.test(String(value));
          if (valueMatch && highlightMatches && typeof value === 'string') {
            filteredValue = this.highlightMatches(String(value), searchRegex);
          }
        } else {
          filteredValue = this.smartRegexFilter(value, searchRegex, options);
          valueMatch = filteredValue !== undefined;
        }
      }

      if (keyMatch || valueMatch) {
        result[key] = keyMatch ? value : filteredValue;
        
        // Add context information
        if (contextLines > 0) {
          result[`${key}_context`] = {
            matchType: keyMatch ? 'key' : 'value',
            ...(keyMatch && { matchedKey: key }),
            ...(valueMatch && typeof value === 'string' && { 
              valuePreview: String(value).substring(0, 100) 
            })
          };
        }
        
        hasMatch = true;
      }
    }

    return hasMatch ? result : undefined;
  }

  /**
   * Highlight regex matches in text
   */
  private static highlightMatches(text: string, regex: RegExp): string {
    return text.replace(regex, match => `🔍${match}🔍`);
  }

  /**
   * Extract patterns with enterprise-grade intelligence
   */
  static extractPatterns(obj: any): {
    emails: string[];
    phones: string[];
    urls: string[];
    ipAddresses: string[];
    bitcoinAddresses: string[];
    ethereumAddresses: string[];
    cashTags: string[];
    secrets: string[];
    apiKeys: string[];
    creditCards: string[];
    ssn: string[];
    base64Strings: string[];
    jsonReferences: string[];
  } {
    const result: any = {
      emails: [],
      phones: [],
      urls: [],
      ipAddresses: [],
      bitcoinAddresses: [],
      ethereumAddresses: [],
      cashTags: [],
      secrets: [],
      apiKeys: [],
      creditCards: [],
      ssn: [],
      base64Strings: [],
      jsonReferences: []
    };

    const patterns = {
      emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phones: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      urls: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
      ipAddresses: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      bitcoinAddresses: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|bc1[a-z0-9]{39,59}\b/g,
      ethereumAddresses: /\b0x[a-fA-F0-9]{40}\b/g,
      cashTags: /\$[A-Za-z][A-Za-z0-9]{1,4}\b/g,
      secrets: /(?:password|secret|key|token|api[_-]?key|auth[_-]?token)[\s:=]+["']?([^"'\s,;]+)["']?/gi,
      apiKeys: /(?:api[_-]?key|apikey|access[_-]?key|app[_-]?key)[\s:=]+["']?([^"'\s,;]+)["']?/gi,
      creditCards: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      ssn: /\b(?:\d{3}[-\s]?){2}\d{4}\b/g,
      base64Strings: /\b(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/g,
      jsonReferences: /\$\.?[\w.[\]]+/g
    };

    const traverse = (value: any, path: string = '$'): void => {
      if (value === null || value === undefined) {
        return;
      }

      const strValue = String(value);

      // Pattern matching
      Object.entries(patterns).forEach(([key, regex]) => {
        const matches = strValue.match(regex);
        if (matches) {
          result[key].push(...matches);
        }
      });

      // Recursive traversal
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            traverse(item, `${path}[${index}]`);
          });
        } else {
          Object.entries(value).forEach(([key, val]) => {
            traverse(val, `${path}.${key}`);
          });
        }
      }
    };

    traverse(obj);
    
    // Deduplicate and sort
    Object.keys(result).forEach(key => {
      result[key] = [...new Set(result[key])].sort();
    });

    return result;
  }

  /**
   * Generate security analysis report
   */
  static securityAnalysis(obj: any): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    findings: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      path: string;
      description: string;
      recommendation: string;
    }>;
    summary: {
      totalSecrets: number;
      totalPII: number;
      suspiciousPatterns: number;
    };
  } {
    const patterns = this.extractPatterns(obj);
    const findings: any[] = [];
    
    // Check for secrets
    patterns.secrets.forEach(secret => {
      findings.push({
        type: 'secret',
        severity: 'critical',
        path: secret,
        description: 'Potential secret or credential found',
        recommendation: 'Remove or encrypt sensitive data'
      });
    });
    
    patterns.apiKeys.forEach(apiKey => {
      findings.push({
        type: 'api_key',
        severity: 'high',
        path: apiKey,
        description: 'API key detected',
        recommendation: 'Rotate API key and use environment variables'
      });
    });
    
    // Check for PII
    patterns.creditCards.forEach(cc => {
      findings.push({
        type: 'pii',
        severity: 'high',
        path: cc,
        description: 'Credit card number detected',
        recommendation: 'Remove or redact credit card information'
      });
    });
    
    patterns.ssn.forEach(ssn => {
      findings.push({
        type: 'pii',
        severity: 'critical',
        path: ssn,
        description: 'Social Security Number detected',
        recommendation: 'Remove or redact SSN information'
      });
    });
    
    patterns.emails.forEach(email => {
      findings.push({
        type: 'pii',
        severity: 'medium',
        path: email,
        description: 'Email address detected',
        recommendation: 'Consider redacting email addresses'
      });
    });
    
    // Check for suspicious patterns
    patterns.bitcoinAddresses.forEach(addr => {
      findings.push({
        type: 'cryptocurrency',
        severity: 'medium',
        path: addr,
        description: 'Bitcoin address detected',
        recommendation: 'Verify if cryptocurrency data should be exposed'
      });
    });
    
    // Calculate risk level
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 2) riskLevel = 'high';
    else if (highCount > 0 || findings.length > 5) riskLevel = 'medium';
    
    return {
      riskLevel,
      findings: findings.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      summary: {
        totalSecrets: patterns.secrets.length + patterns.apiKeys.length,
        totalPII: patterns.creditCards.length + patterns.ssn.length + patterns.emails.length,
        suspiciousPatterns: patterns.bitcoinAddresses.length + patterns.base64Strings.length
      }
    };
  }

  /**
   * Performance analysis for large objects
   */
  static performanceAnalysis(obj: any): {
    summary: {
      totalKeys: number;
      totalValues: number;
      maxDepth: number;
      sizeInBytes: number;
      objectCount: number;
      arrayCount: number;
      primitiveCount: number;
      estimatedMemoryUsage: string;
    };
    bottlenecks: Array<{
      type: 'large_array' | 'deep_nesting' | 'large_string' | 'redundant_data';
      path: string;
      size: number;
      impact: string;
      recommendation: string;
    }>;
    optimization: {
      potentialSavings: string;
      recommendations: string[];
    };
  } {
    const stats = {
      totalKeys: 0,
      totalValues: 0,
      maxDepth: 0,
      sizeInBytes: 0,
      objectCount: 0,
      arrayCount: 0,
      primitiveCount: 0
    };

    const bottlenecks: any[] = [];
    const largeArrays: any[] = [];
    const deepPaths: any[] = [];
    const largeStrings: any[] = [];

    const traverse = (node: any, path: string = '', depth: number = 0): number => {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      if (node === null) {
        stats.primitiveCount++;
        return 8; // null size approximation
      }
      
      const type = typeof node;
      
      if (type !== 'object') {
        stats.primitiveCount++;
        const size = Buffer.byteLength(String(node), 'utf8');
        
        // Track large strings
        if (type === 'string' && size > 1024 * 100) { // > 100KB
          largeStrings.push({ path, size });
        }
        
        return size;
      }
      
      if (Array.isArray(node)) {
        stats.arrayCount++;
        
        // Track large arrays
        if (node.length > 1000) {
          largeArrays.push({ path, length: node.length, size: node.length * 8 });
        }
        
        let totalSize = 0;
        node.forEach((item, index) => {
          totalSize += traverse(item, `${path}[${index}]`, depth + 1);
        });
        
        return totalSize;
      }
      
      // Object
      stats.objectCount++;
      
      let totalSize = 0;
      const keys = Object.keys(node);
      stats.totalKeys += keys.length;
      
      keys.forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        const size = traverse(node[key], newPath, depth + 1);
        totalSize += size;
        
        // Track deep nesting
        if (depth > 15) {
          deepPaths.push({ path: newPath, depth: depth + 1 });
        }
      });
      
      return totalSize;
    };

    stats.sizeInBytes = traverse(obj);
    
    // Generate bottleneck findings
    largeArrays.forEach(arr => {
      bottlenecks.push({
        type: 'large_array',
        path: arr.path,
        size: arr.size,
        impact: `Array with ${arr.length} elements may impact performance`,
        recommendation: 'Consider pagination or lazy loading'
      });
    });
    
    deepPaths.forEach(path => {
      bottlenecks.push({
        type: 'deep_nesting',
        path: path.path,
        size: path.depth * 100,
        impact: `Deep nesting (${path.depth} levels) may cause stack overflow`,
        recommendation: 'Flatten object structure or use references'
      });
    });
    
    largeStrings.forEach(str => {
      bottlenecks.push({
        type: 'large_string',
        path: str.path,
        size: str.size,
        impact: `Large string (${(str.size / 1024).toFixed(1)}KB) uses excessive memory`,
        recommendation: 'Consider compression or external storage'
      });
    });
    
    // Calculate optimization potential
    const potentialSavings = largeArrays.reduce((sum, arr) => sum + arr.size * 0.5, 0) +
                            largeStrings.reduce((sum, str) => sum + str.size * 0.3, 0);
    
    return {
      summary: {
        ...stats,
        estimatedMemoryUsage: this.formatBytes(stats.sizeInBytes)
      },
      bottlenecks: bottlenecks.sort((a, b) => b.size - a.size).slice(0, 10),
      optimization: {
        potentialSavings: this.formatBytes(potentialSavings),
        recommendations: [
          'Remove unused properties to reduce memory footprint',
          'Use references instead of nested objects for large datasets',
          'Implement lazy loading for large arrays',
          'Compress large strings or move to external storage'
        ]
      }
    };
  }

  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export default AdvancedScopeInspector;