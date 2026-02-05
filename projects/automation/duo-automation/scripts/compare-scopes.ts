#!/usr/bin/env bun

/**
 * Scope Comparison Script
 * 
 * Compares two scope snapshots and shows detailed differences
 * Usage: bun run scripts/compare-scopes.ts scope-before.json scope-after.json
 */

import { join } from 'path';

interface ScopeData {
  users?: any[];
  system?: any;
  [key: string]: any;
}

interface ComparisonResult {
  summary: {
    totalChanges: number;
    additions: number;
    modifications: number;
    deletions: number;
    unchanged: number;
  };
  changes: {
    added: Array<{
      path: string;
      value: any;
      type: string;
    }>;
    modified: Array<{
      path: string;
      oldValue: any;
      newValue: any;
      type: string;
    }>;
    deleted: Array<{
      path: string;
      oldValue: any;
      type: string;
    }>;
  };
  statistics: {
    beforeSize: number;
    afterSize: number;
    sizeDifference: number;
    processingTime: number;
  };
}

class ScopeComparator {
  private static readonly IGNORE_PATHS = ['last_updated', 'timestamp', 'processingTime'];
  
  static async compareScopes(beforePath: string, afterPath: string): Promise<ComparisonResult> {
    const startTime = Date.now();
    
    console.log(`🔍 COMPARING SCOPES`);
    console.log(`═════════════════════════════════════════════════════`);
    console.log(`Before: ${beforePath}`);
    console.log(`After:  ${afterPath}`);
    console.log(``);
    
    // Load scope data
    const beforeData = this.loadScopeData(beforePath);
    const afterData = this.loadScopeData(afterPath);
    
    // Perform comparison
    const result = this.performComparison(beforeData, afterData);
    
    // Add statistics
    result.statistics = {
      beforeSize: JSON.stringify(beforeData).length,
      afterSize: JSON.stringify(afterData).length,
      sizeDifference: JSON.stringify(afterData).length - JSON.stringify(beforeData).length,
      processingTime: Date.now() - startTime
    };
    
    return result;
  }
  
  private static loadScopeData(filePath: string): ScopeData {
    try {
      const content = Bun.file(filePath).text();
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load scope data from ${filePath}: ${error.message}`);
      process.exit(1);
    }
  }
  
  private static performComparison(before: ScopeData, after: ScopeData): Omit<ComparisonResult, 'statistics'> {
    const result: Omit<ComparisonResult, 'statistics'> = {
      summary: {
        totalChanges: 0,
        additions: 0,
        modifications: 0,
        deletions: 0,
        unchanged: 0
      },
      changes: {
        added: [],
        modified: [],
        deleted: []
      }
    };
    
    // Compare all paths
    const allPaths = new Set<string>();
    this.collectAllPaths(before, '', allPaths);
    this.collectAllPaths(after, '', allPaths);
    
    for (const path of allPaths) {
      if (this.shouldIgnorePath(path)) continue;
      
      const beforeValue = this.getValueAtPath(before, path);
      const afterValue = this.getValueAtPath(after, path);
      
      if (beforeValue === undefined && afterValue !== undefined) {
        // Added
        result.changes.added.push({
          path,
          value: afterValue,
          type: this.getValueType(afterValue)
        });
        result.summary.additions++;
      } else if (beforeValue !== undefined && afterValue === undefined) {
        // Deleted
        result.changes.deleted.push({
          path,
          oldValue: beforeValue,
          type: this.getValueType(beforeValue)
        });
        result.summary.deletions++;
      } else if (beforeValue !== undefined && afterValue !== undefined) {
        // Compare values
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          result.changes.modified.push({
            path,
            oldValue: beforeValue,
            newValue: afterValue,
            type: this.getValueType(afterValue)
          });
          result.summary.modifications++;
        } else {
          result.summary.unchanged++;
        }
      }
    }
    
    result.summary.totalChanges = result.summary.additions + result.summary.modifications + result.summary.deletions;
    
    return result;
  }
  
  private static collectAllPaths(obj: any, prefix: string, paths: Set<string>): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
        paths.add(path);
        this.collectAllPaths(item, path, paths);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.add(path);
        this.collectAllPaths(value, path, paths);
      });
    }
  }
  
  private static getValueAtPath(obj: any, path: string): any {
    const parts = this.parsePath(path);
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      if (Array.isArray(current) && typeof part.index === 'number') {
        current = current[part.index];
      } else if (typeof current === 'object' && typeof part.property === 'string') {
        current = current[part.property];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  private static parsePath(path: string): Array<{ property?: string; index?: number }> {
    const parts: Array<{ property?: string; index?: number }> = [];
    const regex = /\.?([^.\[\]]+)|\[(\d+)\]/g;
    let match;
    
    while ((match = regex.exec(path)) !== null) {
      if (match[1]) {
        parts.push({ property: match[1] });
      } else if (match[2]) {
        parts.push({ index: parseInt(match[2]) });
      }
    }
    
    return parts;
  }
  
  private static shouldIgnorePath(path: string): boolean {
    return this.IGNORE_PATHS.some(ignore => path.includes(ignore));
  }
  
  private static getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
  
  static formatResults(result: ComparisonResult): void {
    console.log(`📊 COMPARISON RESULTS`);
    console.log(`═════════════════════════════════════════════════════`);
    console.log(``);
    
    // Summary
    console.log(`📋 SUMMARY`);
    console.log(`───────────────────────────────────────────────────`);
    console.log(`Total Changes: ${result.summary.totalChanges}`);
    console.log(`Additions:    ${result.summary.additions}`);
    console.log(`Modifications: ${result.summary.modifications}`);
    console.log(`Deletions:    ${result.summary.deletions}`);
    console.log(`Unchanged:    ${result.summary.unchanged}`);
    console.log(``);
    
    // Statistics
    console.log(`📈 STATISTICS`);
    console.log(`───────────────────────────────────────────────────`);
    console.log(`Before Size:  ${result.statistics.beforeSize} bytes`);
    console.log(`After Size:   ${result.statistics.afterSize} bytes`);
    console.log(`Size Change:  ${result.statistics.sizeDifference > 0 ? '+' : ''}${result.statistics.sizeDifference} bytes`);
    console.log(`Processing:   ${result.statistics.processingTime}ms`);
    console.log(``);
    
    // Changes
    if (result.changes.added.length > 0) {
      console.log(`➕ ADDED (${result.changes.added.length})`);
      console.log(`───────────────────────────────────────────────────`);
      result.changes.added.forEach(change => {
        console.log(`+ ${change.path} (${change.type})`);
        if (typeof change.value !== 'object') {
          console.log(`  Value: ${JSON.stringify(change.value)}`);
        } else {
          console.log(`  Value: [${change.type}]`);
        }
      });
      console.log(``);
    }
    
    if (result.changes.modified.length > 0) {
      console.log(`🔄 MODIFIED (${result.changes.modified.length})`);
      console.log(`───────────────────────────────────────────────────`);
      result.changes.modified.forEach(change => {
        console.log(`~ ${change.path} (${change.type})`);
        if (typeof change.oldValue !== 'object' && typeof change.newValue !== 'object') {
          console.log(`  Before: ${JSON.stringify(change.oldValue)}`);
          console.log(`  After:  ${JSON.stringify(change.newValue)}`);
        } else {
          console.log(`  Before: [${change.type}]`);
          console.log(`  After:  [${change.type}]`);
        }
      });
      console.log(``);
    }
    
    if (result.changes.deleted.length > 0) {
      console.log(`➖ DELETED (${result.changes.deleted.length})`);
      console.log(`───────────────────────────────────────────────────`);
      result.changes.deleted.forEach(change => {
        console.log(`- ${change.path} (${change.type})`);
        if (typeof change.oldValue !== 'object') {
          console.log(`  Value: ${JSON.stringify(change.oldValue)}`);
        } else {
          console.log(`  Value: [${change.type}]`);
        }
      });
      console.log(``);
    }
    
    if (result.summary.totalChanges === 0) {
      console.log(`✅ NO CHANGES DETECTED`);
      console.log(`The scopes are identical!`);
    }
    
    console.log(``);
    console.log(`🎯 SCOPE COMPARISON COMPLETE`);
    console.log(`═════════════════════════════════════════════════════`);
  }
  
  static generateDiffReport(result: ComparisonResult): string {
    const lines: string[] = [];
    
    lines.push('# Scope Comparison Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Changes:** ${result.summary.totalChanges}`);
    lines.push(`- **Additions:** ${result.summary.additions}`);
    lines.push(`- **Modifications:** ${result.summary.modifications}`);
    lines.push(`- **Deletions:** ${result.summary.deletions}`);
    lines.push(`- **Unchanged:** ${result.summary.unchanged}`);
    lines.push('');
    
    // Statistics
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- **Before Size:** ${result.statistics.beforeSize} bytes`);
    lines.push(`- **After Size:** ${result.statistics.afterSize} bytes`);
    lines.push(`- **Size Change:** ${result.statistics.sizeDifference > 0 ? '+' : ''}${result.statistics.sizeDifference} bytes`);
    lines.push(`- **Processing Time:** ${result.statistics.processingTime}ms`);
    lines.push('');
    
    // Changes
    if (result.changes.added.length > 0) {
      lines.push('## Added Items');
      lines.push('');
      result.changes.added.forEach(change => {
        lines.push(`- **${change.path}** (${change.type})`);
        if (typeof change.value !== 'object') {
          lines.push(`  - Value: \`${JSON.stringify(change.value)}\``);
        }
      });
      lines.push('');
    }
    
    if (result.changes.modified.length > 0) {
      lines.push('## Modified Items');
      lines.push('');
      result.changes.modified.forEach(change => {
        lines.push(`- **${change.path}** (${change.type})`);
        if (typeof change.oldValue !== 'object' && typeof change.newValue !== 'object') {
          lines.push(`  - Before: \`${JSON.stringify(change.oldValue)}\``);
          lines.push(`  - After: \`${JSON.stringify(change.newValue)}\``);
        }
      });
      lines.push('');
    }
    
    if (result.changes.deleted.length > 0) {
      lines.push('## Deleted Items');
      lines.push('');
      result.changes.deleted.forEach(change => {
        lines.push(`- **${change.path}** (${change.type})`);
        if (typeof change.oldValue !== 'object') {
          lines.push(`  - Value: \`${JSON.stringify(change.oldValue)}\``);
        }
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('*Generated by DuoPlus Scope Comparator*');
    
    return lines.join('\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error(`
❌ ERROR: Invalid number of arguments

USAGE:
  bun run scripts/compare-scopes.ts <before.json> <after.json>

EXAMPLE:
  bun run scripts/compare-scopes.ts scope-before.json scope-after.json
`);
    process.exit(1);
  }
  
  const [beforePath, afterPath] = args;
  
  try {
    const result = await ScopeComparator.compareScopes(beforePath, afterPath);
    
    // Display results
    ScopeComparator.formatResults(result);
    
    // Generate markdown report
    const report = ScopeComparator.generateDiffReport(result);
    const reportPath = 'scope-comparison-report.md';
    
    await Bun.write(reportPath, report);
    console.log(`📄 Markdown report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { ScopeComparator, type ComparisonResult };
