/**
 * Scope Analytics and Statistics Engine
 * 
 * Enterprise-grade analytics for scope inspection with performance insights,
 * security analysis, and comprehensive reporting capabilities.
 */

import { AdvancedScopeInspector } from './scope-advanced.js';

export class ScopeAnalytics {
  /**
   * Generate comprehensive statistics report
   */
  static generateStats(obj: any): {
    summary: {
      totalKeys: number;
      totalValues: number;
      maxDepth: number;
      sizeInBytes: number;
      objectCount: number;
      arrayCount: number;
      primitiveCount: number;
      estimatedMemoryUsage: string;
      complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
    };
    typeBreakdown: Record<string, number>;
    sizeDistribution: {
      small: number;    // < 1KB
      medium: number;  // 1KB - 100KB
      large: number;   // 100KB - 1MB
      huge: number;    // > 1MB
    };
    depthDistribution: Record<number, number>;
    largestPaths: Array<{ path: string; size: number; depth: number; type: string }>;
    mostNestedPaths: Array<{ path: string; depth: number; complexity: string }>;
    potentialIssues: Array<{
      type: 'performance' | 'security' | 'structure' | 'memory';
      severity: 'low' | 'medium' | 'high' | 'critical';
      path: string;
      description: string;
      impact: string;
      recommendation: string;
    }>;
    patterns: {
      emails: number;
      phones: number;
      urls: number;
      secrets: number;
      pii: number;
      total: number;
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

    const typeCounts: Record<string, number> = {};
    const depthDistribution: Record<number, number> = {};
    const sizeDistribution = { small: 0, medium: 0, large: 0, huge: 0 };
    const largestPaths: Array<{ path: string; size: number; depth: number; type: string }> = [];
    const mostNestedPaths: Array<{ path: string; depth: number; complexity: string }> = [];
    const issues: any[] = [];

    const traverse = (node: any, path: string = '', depth: number = 0): number => {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;
      
      if (node === null) {
        typeCounts['null'] = (typeCounts['null'] || 0) + 1;
        stats.primitiveCount++;
        return 8; // null size approximation
      }
      
      const type = typeof node;
      
      if (type !== 'object') {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        stats.primitiveCount++;
        const size = Buffer.byteLength(String(node), 'utf8');
        stats.totalValues++;
        
        // Categorize by size
        if (size < 1024) sizeDistribution.small++;
        else if (size < 1024 * 100) sizeDistribution.medium++;
        else if (size < 1024 * 1024) sizeDistribution.large++;
        else sizeDistribution.huge++;
        
        return size;
      }
      
      if (Array.isArray(node)) {
        typeCounts['array'] = (typeCounts['array'] || 0) + 1;
        stats.arrayCount++;
        
        let totalSize = 0;
        node.forEach((item, index) => {
          totalSize += traverse(item, `${path}[${index}]`, depth + 1);
        });
        
        // Track large arrays
        if (node.length > 1000) {
          issues.push({
            type: 'performance',
            severity: node.length > 10000 ? 'high' : 'medium',
            path,
            description: `Large array with ${node.length.toLocaleString()} elements`,
            impact: 'May cause memory pressure and slow iteration',
            recommendation: 'Consider pagination, lazy loading, or data compression'
          });
        }
        
        // Track large array sizes
        if (totalSize > 1024 * 1024) {
          largestPaths.push({ path, size: totalSize, depth, type: 'array' });
        }
        
        return totalSize;
      }
      
      // Object
      typeCounts['object'] = (typeCounts['object'] || 0) + 1;
      stats.objectCount++;
      
      let totalSize = 0;
      const keys = Object.keys(node);
      stats.totalKeys += keys.length;
      
      // Check for object complexity
      if (keys.length > 100) {
        issues.push({
          type: 'structure',
          severity: keys.length > 500 ? 'high' : 'medium',
          path,
          description: `Object with ${keys.length} properties`,
          impact: 'May indicate poor data modeling or lack of normalization',
          recommendation: 'Consider splitting into smaller, focused objects'
        });
      }
      
      keys.forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        const size = traverse(node[key], newPath, depth + 1);
        totalSize += size;
        
        // Track large values
        if (size > 1024 * 1024) { // > 1MB
          largestPaths.push({ path: newPath, size, depth: depth + 1, type: 'object' });
        }
        
        // Track deeply nested
        if (depth > 15) {
          mostNestedPaths.push({ 
            path: newPath, 
            depth: depth + 1,
            complexity: depth > 25 ? 'extreme' : depth > 20 ? 'high' : 'moderate'
          });
          
          if (depth > 25) {
            issues.push({
              type: 'performance',
              severity: 'high',
              path: newPath,
              description: `Extremely deep nesting (${depth + 1} levels)`,
              impact: 'May cause stack overflow and performance issues',
              recommendation: 'Flatten structure or use references/IDs'
            });
          }
        }
        
        // Security checks
        if (key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('api') ||
            key.toLowerCase().includes('key')) {
          issues.push({
            type: 'security',
            severity: 'critical',
            path: newPath,
            description: `Potential sensitive data in key: ${key}`,
            impact: 'Security risk if exposed in logs or outputs',
            recommendation: 'Remove sensitive data or implement proper redaction'
          });
        }
        
        // Performance checks
        if (typeof node[key] === 'string' && size > 1024 * 100) { // > 100KB string
          issues.push({
            type: 'memory',
            severity: 'medium',
            path: newPath,
            description: `Large string (${(size / 1024).toFixed(1)}KB)`,
            impact: 'High memory usage for single property',
            recommendation: 'Consider compression or external storage'
          });
        }
      });
      
      return totalSize;
    };

    stats.sizeInBytes = traverse(obj);
    
    // Extract pattern counts
    const patterns = AdvancedScopeInspector.extractPatterns(obj);
    const patternCounts = {
      emails: patterns.emails.length,
      phones: patterns.phones.length,
      urls: patterns.urls.length,
      secrets: patterns.secrets.length + patterns.apiKeys.length,
      pii: patterns.creditCards.length + patterns.ssn.length + patterns.emails.length,
      total: Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0)
    };
    
    // Calculate complexity
    let complexity: 'simple' | 'moderate' | 'complex' | 'extreme' = 'simple';
    if (stats.maxDepth > 20 || stats.sizeInBytes > 10 * 1024 * 1024) complexity = 'extreme';
    else if (stats.maxDepth > 10 || stats.sizeInBytes > 1024 * 1024) complexity = 'complex';
    else if (stats.maxDepth > 5 || stats.sizeInBytes > 100 * 1024) complexity = 'moderate';
    
    // Sort and limit results
    largestPaths.sort((a, b) => b.size - a.size).splice(10);
    mostNestedPaths.sort((a, b) => b.depth - a.depth).splice(10);
    issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }).splice(20);

    return {
      summary: {
        ...stats,
        estimatedMemoryUsage: this.formatBytes(stats.sizeInBytes),
        complexity
      },
      typeBreakdown: typeCounts,
      sizeDistribution,
      depthDistribution,
      largestPaths,
      mostNestedPaths,
      potentialIssues: issues,
      patterns: patternCounts
    };
  }

  /**
   * Compare two scope snapshots with detailed diff analysis
   */
  static compareScopes(before: any, after: any): {
    summary: {
      added: number;
      removed: number;
      modified: number;
      unchanged: number;
      sizeDiff: string;
      changePercentage: number;
    };
    changes: {
      added: Array<{ path: string; value: any; type: string }>;
      removed: Array<{ path: string; value: any; type: string }>;
      modified: Array<{ path: string; before: any; after: any; changeType: string }>;
    };
    analysis: {
      largestChange: { path: string; sizeDiff: number };
      mostModified: { path: string; modifications: number };
      structuralChanges: Array<{ type: string; path: string; description: string }>;
    };
    insights: string[];
  } {
    const result = {
      added: [] as Array<{ path: string; value: any; type: string }>,
      removed: [] as Array<{ path: string; value: any; type: string }>,
      modified: [] as Array<{ path: string; before: any; after: any; changeType: string }>
    };

    const pathModifications = new Map<string, number>();
    const structuralChanges: any[] = [];

    const getValueType = (value: any): string => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    };

    const getValueSize = (value: any): number => {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    };

    const traverse = (obj1: any, obj2: any, path: string = ''): void => {
      const keys1 = new Set(Object.keys(obj1 || {}));
      const keys2 = new Set(Object.keys(obj2 || {}));

      // Find added keys
      for (const key of keys2) {
        if (!keys1.has(key)) {
          const newPath = path ? `${path}.${key}` : key;
          result.added.push({
            path: newPath,
            value: obj2[key],
            type: getValueType(obj2[key])
          });
        }
      }

      // Find removed keys
      for (const key of keys1) {
        if (!keys2.has(key)) {
          const newPath = path ? `${path}.${key}` : key;
          result.removed.push({
            path: newPath,
            value: obj1[key],
            type: getValueType(obj1[key])
          });
        }
      }

      // Check modified values
      for (const key of keys1) {
        if (keys2.has(key)) {
          const newPath = path ? `${path}.${key}` : key;
          const val1 = obj1[key];
          const val2 = obj2[key];
          
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            const type1 = getValueType(val1);
            const type2 = getValueType(val2);
            let changeType = 'value_change';
            
            if (type1 !== type2) {
              changeType = 'type_change';
              structuralChanges.push({
                type: 'type_change',
                path: newPath,
                description: `Changed from ${type1} to ${type2}`
              });
            }
            
            if (Array.isArray(val1) !== Array.isArray(val2)) {
              changeType = 'structure_change';
              structuralChanges.push({
                type: 'array_change',
                path: newPath,
                description: Array.isArray(val2) ? 'Changed to array' : 'Changed from array'
              });
            }
            
            result.modified.push({
              path: newPath,
              before: val1,
              after: val2,
              changeType
            });
            
            pathModifications.set(newPath, (pathModifications.get(newPath) || 0) + 1);
          }
          
          // Recurse if both are objects
          if (val1 && val2 && 
              typeof val1 === 'object' && 
              typeof val2 === 'object') {
            traverse(val1, val2, newPath);
          }
        }
      }
    };

    traverse(before, after);
    
    // Calculate size differences
    const size1 = getValueSize(before);
    const size2 = getValueSize(after);
    const sizeDiff = size2 - size1;
    const changePercentage = size1 > 0 ? (sizeDiff / size1) * 100 : 0;
    
    // Find largest change
    let largestChange = { path: '', sizeDiff: 0 };
    result.modified.forEach(mod => {
      const diff = getValueSize(mod.after) - getValueSize(mod.before);
      if (Math.abs(diff) > Math.abs(largestChange.sizeDiff)) {
        largestChange = { path: mod.path, sizeDiff: diff };
      }
    });
    
    // Find most modified path
    let mostModified = { path: '', modifications: 0 };
    pathModifications.forEach((count, path) => {
      if (count > mostModified.modifications) {
        mostModified = { path, modifications: count };
      }
    });
    
    // Generate insights
    const insights: string[] = [];
    
    if (result.added.length > result.removed.length) {
      insights.push(`Data grew by ${result.added.length - result.removed.length} properties`);
    } else if (result.removed.length > result.added.length) {
      insights.push(`Data shrank by ${result.removed.length - result.added.length} properties`);
    }
    
    if (Math.abs(changePercentage) > 50) {
      insights.push(`Significant size change: ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%`);
    }
    
    if (structuralChanges.length > 0) {
      insights.push(`${structuralChanges.length} structural changes detected`);
    }
    
    if (result.modified.length > 10) {
      insights.push('High modification activity - consider data versioning');
    }

    return {
      summary: {
        added: result.added.length,
        removed: result.removed.length,
        modified: result.modified.length,
        unchanged: 0, // Would need more complex tracking
        sizeDiff: this.formatBytes(sizeDiff),
        changePercentage
      },
      changes: result,
      analysis: {
        largestChange,
        mostModified,
        structuralChanges
      },
      insights
    };
  }

  /**
   * Generate performance recommendations
   */
  static generateRecommendations(stats: any): {
    performance: Array<{
      priority: 'high' | 'medium' | 'low';
      category: 'memory' | 'speed' | 'structure' | 'security';
      recommendation: string;
      impact: string;
      implementation: string;
    }>;
    quickWins: string[];
    longTerm: string[];
  } {
    const recommendations: any[] = [];
    const quickWins: string[] = [];
    const longTerm: string[] = [];
    
    // Memory recommendations
    if (stats.summary.sizeInBytes > 10 * 1024 * 1024) { // > 10MB
      recommendations.push({
        priority: 'high',
        category: 'memory',
        recommendation: 'Implement data pagination or lazy loading',
        impact: 'Reduce memory usage by 60-80%',
        implementation: 'Split large datasets into chunks, load on demand'
      });
      longTerm.push('Consider database or file-based storage for large datasets');
    }
    
    // Structure recommendations
    if (stats.summary.maxDepth > 15) {
      recommendations.push({
        priority: 'high',
        category: 'structure',
        recommendation: 'Flatten deeply nested structures',
        impact: 'Improve performance and prevent stack overflow',
        implementation: 'Use references/IDs instead of deep nesting'
      });
      quickWins.push('Extract frequently accessed nested properties to root level');
    }
    
    // Performance recommendations
    if (stats.largestPaths.length > 0 && stats.largestPaths[0].size > 1024 * 1024) {
      recommendations.push({
        priority: 'medium',
        category: 'speed',
        recommendation: 'Optimize large data structures',
        impact: 'Faster processing and reduced memory footprint',
        implementation: 'Compress large strings, use efficient data types'
      });
      quickWins.push('Remove unused properties from large objects');
    }
    
    // Security recommendations
    const securityIssues = stats.potentialIssues.filter((i: any) => i.type === 'security');
    if (securityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        recommendation: 'Implement data redaction and sanitization',
        impact: 'Prevent sensitive data exposure',
        implementation: 'Add redaction rules for secrets, PII, and sensitive patterns'
      });
      quickWins.push('Remove or redact sensitive keys before logging/exporting');
    }
    
    // Array optimization
    if (stats.summary.arrayCount > stats.summary.objectCount * 2) {
      recommendations.push({
        priority: 'medium',
        category: 'speed',
        recommendation: 'Optimize array operations',
        impact: 'Faster iteration and reduced memory usage',
        implementation: 'Use typed arrays where appropriate, consider streaming'
      });
      quickWins.push('Filter empty or null values from arrays');
    }
    
    return {
      performance: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      quickWins,
      longTerm
    };
  }

  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Math.abs(bytes);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    const sign = bytes < 0 ? '-' : '+';
    return `${sign}${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate visual analytics report
   */
  static generateVisualReport(stats: any): string {
    const { summary, typeBreakdown, sizeDistribution, depthDistribution, patterns } = stats;
    
    let report = `
📊 SCOPE ANALYTICS REPORT
═══════════════════════════

📈 SUMMARY STATISTICS
───────────────────────
🔑 Total Keys: ${summary.totalKeys.toLocaleString()}
📦 Total Values: ${summary.totalValues.toLocaleString()}
📊 Max Depth: ${summary.maxDepth} levels
💾 Size: ${summary.estimatedMemoryUsage}
🏗️  Structure: ${summary.objectCount} objects, ${summary.arrayCount} arrays
🎯 Complexity: ${summary.complexity.toUpperCase()}

📋 TYPE BREAKDOWN
──────────────────`;
    
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      const percentage = ((count as number) / summary.totalValues * 100).toFixed(1);
      report += `\n  ${type}: ${count.toLocaleString()} (${percentage}%)`;
    });
    
    report += `
📏 SIZE DISTRIBUTION
─────────────────────
  Small (< 1KB): ${sizeDistribution.small}
  Medium (1KB-100KB): ${sizeDistribution.medium}
  Large (100KB-1MB): ${sizeDistribution.large}
  Huge (> 1MB): ${sizeDistribution.huge}

🔍 PATTERNS DETECTED
────────────────────`;
    
    Object.entries(patterns).forEach(([pattern, count]) => {
      if (count > 0) {
        report += `\n  ${pattern}: ${count}`;
      }
    });
    
    if (stats.potentialIssues.length > 0) {
      report += `
⚠️  POTENTIAL ISSUES
───────────────────`;
      
      stats.potentialIssues.slice(0, 5).forEach((issue: any, i: number) => {
        const severityIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
        report += `\n  ${i + 1}. ${severityIcon} ${issue.type.toUpperCase()}: ${issue.description}`;
        report += `\n     Path: ${issue.path}`;
        report += `\n     Impact: ${issue.impact}`;
      });
      
      if (stats.potentialIssues.length > 5) {
        report += `\n  ... and ${stats.potentialIssues.length - 5} more issues`;
      }
    }
    
    return report;
  }

  /**
   * Export analytics to JSON
   */
  static exportToJSON(stats: any, filename: string = 'scope-analytics.json'): void {
    Bun.write(filename, JSON.stringify(stats, null, 2));
  }

  /**
   * Export analytics to CSV
   */
  static exportToCSV(stats: any, filename: string = 'scope-analytics.csv'): void {
    let csv = 'Metric,Value,Type\n';
    
    // Summary stats
    Object.entries(stats.summary).forEach(([key, value]) => {
      csv += `${key},${value},summary\n`;
    });
    
    // Type breakdown
    Object.entries(stats.typeBreakdown).forEach(([type, count]) => {
      csv += `${type},${count},type\n`;
    });
    
    // Patterns
    Object.entries(stats.patterns).forEach(([pattern, count]) => {
      csv += `${pattern},${count},pattern\n`;
    });
    
    Bun.write(filename, csv);
  }
}

export default ScopeAnalytics;
