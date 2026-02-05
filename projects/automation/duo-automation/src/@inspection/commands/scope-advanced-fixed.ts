/**
 * Advanced Scope Inspector with Enterprise-Grade Pattern Extraction
 * 
 * Ultimate inspection capabilities with JSONPath, JQ-like filtering,
 * smart regex, pattern extraction, and security analysis.
 */

import { jmespath } from 'jmespath';
import { JSONPath } from 'jsonpath-plus';

export class AdvancedScopeInspector {
  /**
   * Apply JSONPath with smart engine selection
   */
  static applyJsonPath(obj: any, path: string): any {
    // Heuristic: detect advanced JSONPath features
    if (/[@]|[.]{2}|==|>=|script:/.test(path)) {
      try {
        return JSONPath({ path, json: obj, wrap: false });
      } catch {}
    }

    try {
      return jmespath.search(obj, path);
    } catch {
      return JSONPath({ path, json: obj, wrap: false });
    }
  }

  /**
   * Apply JQ-like filtering
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
    if (filter === '.') return obj;
    
    if (filter.startsWith('.[]')) {
      const subFilter = filter.slice(3).trim();
      if (Array.isArray(obj)) {
        return obj.map(item => this.applySingleJqFilter(item, subFilter || '.'));
      }
      return obj;
    }
    
    if (filter.includes('select(')) {
      const match = filter.match(/select\((.*)\)/);
      if (match && Array.isArray(obj)) {
        return obj.filter(item => this.evaluateCondition(item, match[1]));
      }
    }

    if (filter.includes('map(')) {
      const match = filter.match(/map\((.*)\)/);
      if (match && Array.isArray(obj)) {
        return obj.map(item => this.applySingleJqFilter(item, match[1]));
      }
    }

    if (filter.includes('length')) {
      if (Array.isArray(obj) || typeof obj === 'string') {
        return obj.length;
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).length;
      }
      return 0;
    }

    if (filter.includes('keys')) {
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj);
      }
      return [];
    }

    if (filter.includes('values')) {
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj);
      }
      return [];
    }

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

    if (filter.includes('sum')) {
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + (Number(item) || 0), 0);
      }
      return 0;
    }
    
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
    
    if (filter.startsWith('.') && filter.length > 1) {
      const field = filter.slice(1);
      return obj?.[field];
    }
    
    if (filter.match(/\[\d+\]$/)) {
      const index = parseInt(filter.match(/\[(\d+)\]$/)![1]);
      return Array.isArray(obj) ? obj[index] : undefined;
    }

    return obj;
  }

  private static evaluateCondition(item: any, condition: string): boolean {
    if (condition.includes('>=')) {
      const [field, value] = condition.split('>=').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue >= compareValue;
    }

    if (condition.includes('==')) {
      const [field, value] = condition.split('==').map(s => s.trim());
      const itemValue = item[field];
      const compareValue = value.startsWith('"') ? value.slice(1, -1) : Number(value);
      return itemValue === compareValue;
    }
    
    if (condition.includes('>')) {
      const [field, value] = condition.split('>').map(s => s.trim());
      const itemValue = Number(item[field]);
      const compareValue = Number(value);
      return itemValue > compareValue;
    }

    return false;
  }

  /**
   * Smart regex filtering with context and highlighting
   */
  static smartRegexFilter(obj: any, searchRegex: RegExp, options: {
    includeKeys?: boolean;
    includeValues?: boolean;
    contextLines?: number;
    highlightMatches?: boolean;
  } = {}): any {
    const { includeKeys = true, includeValues = true, contextLines = 0, highlightMatches = false } = options;
    
    const filtered: any = Array.isArray(obj) ? [] : {};
    
    const traverse = (node: any, path: string = '', parent: any = null, key: string = '') => {
      if (node === null || node === undefined) return;
      
      let keyMatch = false;
      let valueMatch = false;
      let filteredKey = key;
      let filteredValue = node;
      
      // Check key match
      if (includeKeys && typeof key === 'string') {
        keyMatch = searchRegex.test(key);
        if (keyMatch && highlightMatches) {
          filteredKey = this.highlightMatches(key, searchRegex);
        }
      }
      
      // Check value match
      if (includeValues && value !== null && value !== undefined) {
        if (typeof node === 'string') {
          valueMatch = searchRegex.test(node);
          if (valueMatch && highlightMatches) {
            filteredValue = this.highlightMatches(node, searchRegex);
          }
        } else if (typeof node === 'number' || typeof node === 'boolean') {
          valueMatch = searchRegex.test(String(node));
        }
      }
      
      // Include if key or value matches
      if (keyMatch || valueMatch) {
        if (Array.isArray(parent)) {
          parent.push(filteredValue);
        } else if (parent && typeof parent === 'object') {
          parent[filteredKey] = filteredValue;
        } else {
          // Root level match
          if (Array.isArray(filtered)) {
            filtered.push(filteredValue);
          } else {
            filtered[filteredKey] = filteredValue;
          }
        }
      }
      
      // Recurse into objects/arrays
      if (typeof node === 'object' && node !== null) {
        const childContainer = Array.isArray(node) ? [] : {};
        
        if (keyMatch || valueMatch) {
          // If this node matches, include its children
          if (Array.isArray(parent)) {
            parent.push(childContainer);
          } else if (parent && typeof parent === 'object') {
            parent[filteredKey] = childContainer;
          }
        }
        
        if (Array.isArray(node)) {
          node.forEach((item, index) => {
            traverse(item, `${path}[${index}]`, childContainer, index.toString());
          });
        } else {
          Object.entries(node).forEach(([k, v]) => {
            traverse(v, path ? `${path}.${k}` : k, childContainer, k);
          });
        }
      }
    };
    
    traverse(obj);
    return filtered;
  }

  private static highlightMatches(text: string, regex: RegExp): string {
    return text.replace(regex, (match) => `🔴${match}🔴`);
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
    creditCards: string[];
    ssn: string[];
    dates: string[];
    timestamps: string[];
    filePaths: string[];
    base64Strings: string[];
    jsonReferences: string[];
    apiKeys: string[];
  } {
    const patterns = {
      emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phones: /(?:\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
      urls: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
      ipAddresses: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      bitcoinAddresses: /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g,
      ethereumAddresses: /\b0x[a-fA-F0-9]{40}\b/g,
      cashTags: /\$\w+/g,
      secrets: /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|password|pwd|pass)[:=]\s*['"]?[\w\-_=+/]{8,}['"]?/gi,
      creditCards: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      dates: /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,
      timestamps: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?\b/g,
      filePaths: /\/[^\s<>"{}|\\^`[\]]+|\w:[\\][^\s<>"{}|\\^`[\]]+/g,
      base64Strings: /(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)/g,
      jsonReferences: /\[#REF:\d+\]/g,
      apiKeys: /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi
    };

    const result: Record<string, string[]> = {
      emails: [],
      phones: [],
      urls: [],
      ipAddresses: [],
      bitcoinAddresses: [],
      ethereumAddresses: [],
      cashTags: [],
      secrets: [],
      creditCards: [],
      ssn: [],
      dates: [],
      timestamps: [],
      filePaths: [],
      base64Strings: [],
      jsonReferences: [],
      apiKeys: []
    };

    const traverse = (node: any, path: string = '') => {
      if (node === null || node === undefined) return;

      if (typeof node === 'string') {
        for (const [patternName, regex] of Object.entries(patterns)) {
          const matches = node.match(regex);
          if (matches) {
            result[patternName].push(...matches.map(m => `${path}: ${m}`));
          }
        }
      } else if (typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          const newPath = path ? `${path}.${key}` : key;
          traverse(value, newPath);
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
    if (patterns.secrets.length > 0) {
      findings.push({
        type: 'secrets',
        severity: 'critical',
        path: 'multiple',
        description: `Found ${patterns.secrets.length} potential secrets`,
        recommendation: 'Remove or encrypt sensitive data'
      });
    }
    
    // Check for PII
    const piiCount = patterns.emails.length + patterns.phones.length + patterns.ssn.length;
    if (piiCount > 0) {
      findings.push({
        type: 'pii',
        severity: 'medium',
        path: 'multiple',
        description: `Found ${piiCount} PII items`,
        recommendation: 'Implement data minimization and access controls'
      });
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (patterns.secrets.length > 0) riskLevel = 'critical';
    else if (piiCount > 5) riskLevel = 'high';
    else if (piiCount > 0) riskLevel = 'medium';
    
    return {
      riskLevel,
      findings,
      summary: {
        totalSecrets: patterns.secrets.length,
        totalPII: piiCount,
        suspiciousPatterns: patterns.apiKeys.length + patterns.base64Strings.length
      }
    };
  }

  /**
   * Generate performance analysis
   */
  static performanceAnalysis(obj: any): {
    summary: {
      totalKeys: number;
      totalValues: number;
      maxDepth: number;
      estimatedMemoryUsage: string;
      objectCount: number;
      arrayCount: number;
      primitiveCount: number;
    };
    bottlenecks: Array<{
      type: string;
      path: string;
      impact: string;
      recommendation: string;
    }>;
    optimization: {
      recommendations: string[];
      potentialSavings: string;
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
    
    const traverse = (node: any, depth: number = 0, path: string = ''): number => {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      if (node === null) return 8;
      
      const type = typeof node;
      
      if (type !== 'object') {
        stats.primitiveCount++;
        const size = Buffer.byteLength(String(node), 'utf8');
        stats.totalValues++;
        return size;
      }
      
      if (Array.isArray(node)) {
        stats.arrayCount++;
        let totalSize = 0;
        node.forEach((item, index) => {
          totalSize += traverse(item, depth + 1, `${path}[${index}]`);
        });
        
        if (node.length > 1000) {
          bottlenecks.push({
            type: 'large_array',
            path,
            impact: 'High memory usage',
            recommendation: 'Consider pagination or lazy loading'
          });
        }
        
        return totalSize;
      }
      
      const keys = Object.keys(node);
      stats.objectCount++;
      stats.totalKeys += keys.length;
      
      let totalSize = 0;
      keys.forEach(key => {
        totalSize += traverse(node[key], depth + 1, path ? `${path}.${key}` : key);
      });
      
      if (keys.length > 100) {
        bottlenecks.push({
          type: 'large_object',
          path,
          impact: 'Slow property access',
          recommendation: 'Consider splitting into smaller objects'
        });
      }
      
      return totalSize;
    };

    stats.sizeInBytes = traverse(obj);
    
    const recommendations: string[] = [];
    if (stats.maxDepth > 10) {
      recommendations.push('Flatten deeply nested structures');
    }
    if (stats.arrayCount > stats.objectCount * 2) {
      recommendations.push('Optimize array operations');
    }
    if (bottlenecks.length > 0) {
      recommendations.push('Address performance bottlenecks');
    }
    
    return {
      summary: {
        ...stats,
        estimatedMemoryUsage: this.formatBytes(stats.sizeInBytes)
      },
      bottlenecks: bottlenecks.slice(0, 5),
      optimization: {
        recommendations,
        potentialSavings: this.formatBytes(stats.sizeInBytes * 0.3)
      }
    };
  }

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
