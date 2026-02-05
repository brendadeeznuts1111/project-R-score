/**
 * Pattern Detection Scanner for Bun-Native Skills
 * Automatically detects anti-patterns and generates annotations
 */

import type { ParsedAnnotation } from '../annotations/schema';

export interface DetectionResult {
  line: number;
  column: number;
  pattern: string;
  annotation: ParsedAnnotation;
  suggestion: string;
}

export interface ScanReport {
  file: string;
  detections: DetectionResult[];
  summary: {
    total: number;
    byDomain: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export class PatternDetector {
  private patterns = new Map<string, PatternRule>();
  
  constructor() {
    this.initializePatterns();
  }
  
  /**
   * Initialize all detection patterns
   */
  private initializePatterns(): void {
    // Synchronous I/O patterns
    this.addPattern({
      name: 'syncIO',
      regex: /(?:readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync)\s*\(/g,
      severity: 'critical',
      domain: 'PERF',
      type: 'SYNC_IO',
      generateAnnotation: (match) => ({
        domain: 'PERF',
        scope: 'GLOBAL',
        type: 'SYNC_IO',
        meta: {
          fix: 'Replace with Bun.file() and async/await',
          severity: 'critical',
          complexity: 'simple',
          estimatedTime: '2min'
        },
        ref: ['#REF:skills-file-io'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Use Bun.file().text() for reading and Bun.write() for writing operations'
    });
    
    // Dangling promise patterns
    this.addPattern({
      name: 'danglingPromise',
      regex: /fetch\s*\(|Bun\.spawn\s*\(/g,
      severity: 'critical',
      domain: 'ERROR',
      type: 'DANGLING_PROMISE',
      condition: (code, match) => {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(code.length, match.index + 200);
        const context = code.substring(start, end);
        return !context.includes('await') && !context.includes('.catch(') && !context.includes('try');
      },
      generateAnnotation: (match) => ({
        domain: 'ERROR',
        scope: 'GLOBAL',
        type: 'DANGLING_PROMISE',
        meta: {
          fix: 'Add proper await and try/catch error handling',
          severity: 'critical',
          complexity: 'moderate',
          estimatedTime: '5min'
        },
        ref: ['#REF:skills-concurrency'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Always await async operations and handle errors with try/catch'
    });
    
    // Slow hashing patterns
    this.addPattern({
      name: 'slowHash',
      regex: /(?:createHash|crypto\.subtle\.digest)\s*\(/g,
      severity: 'high',
      domain: 'PERF',
      type: 'SLOW_HASH',
      generateAnnotation: (match) => ({
        domain: 'PERF',
        scope: 'GLOBAL',
        type: 'SLOW_HASH',
        meta: {
          fix: 'Use Bun.hash.xxHash3() for 7x faster hashing',
          speedup: '7x',
          severity: 'high',
          complexity: 'simple',
          estimatedTime: '1min'
        },
        ref: ['#REF:skills-performance'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Replace with Bun.hash.xxHash3() for significantly better performance'
    });
    
    // Node.js crypto import
    this.addPattern({
      name: 'nodeCrypto',
      regex: /import.*crypto.*from\s+['"]crypto['"]/g,
      severity: 'medium',
      domain: 'PERF',
      type: 'BUN_OPTIMIZATION',
      generateAnnotation: (match) => ({
        domain: 'PERF',
        scope: 'GLOBAL',
        type: 'BUN_OPTIMIZATION',
        meta: {
          fix: 'Use Bun built-in crypto utilities',
          severity: 'medium',
          complexity: 'moderate',
          estimatedTime: '10min'
        },
        ref: ['#REF:skills-performance'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Replace Node.js crypto with Bun.hash, Bun.password, etc.'
    });
    
    // Buffer usage patterns
    this.addPattern({
      name: 'bufferUsage',
      regex: /Buffer\.from\s*\(|new Buffer\s*\(/g,
      severity: 'medium',
      domain: 'PERF',
      type: 'BUN_OPTIMIZATION',
      generateAnnotation: (match) => ({
        domain: 'PERF',
        scope: 'GLOBAL',
        type: 'BUN_OPTIMIZATION',
        meta: {
          fix: 'Use Bun.file() or TypedArray alternatives',
          severity: 'medium',
          complexity: 'simple',
          estimatedTime: '2min'
        },
        ref: ['#REF:skills-performance'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Use Bun.file().arrayBuffer() or new Uint8Array() instead'
    });
    
    // Memory leak patterns
    this.addPattern({
      name: 'memoryLeak',
      regex: /setInterval\s*\([^,]+,\s*0\s*\)|setTimeout\s*\([^,]+,\s*0\s*\)/g,
      severity: 'high',
      domain: 'ERROR',
      type: 'MEMORY_LEAK',
      generateAnnotation: (match) => ({
        domain: 'ERROR',
        scope: 'GLOBAL',
        type: 'MEMORY_LEAK',
        meta: {
          fix: 'Use proper cleanup or Bun.serve() for servers',
          severity: 'high',
          complexity: 'moderate',
          estimatedTime: '5min'
        },
        ref: ['#REF:skills-concurrency'],
        context: {
          function: this.extractFunctionName('', 0)
        }
      }),
      suggestion: 'Zero-interval timers cause memory leaks; use proper event loops'
    });
  }
  
  /**
   * Add a detection pattern
   */
  private addPattern(pattern: PatternRule): void {
    this.patterns.set(pattern.name, pattern);
  }
  
  /**
   * Scan a file for patterns and generate annotations
   */
  async scanFile(filePath: string): Promise<ScanReport> {
    const file = Bun.file(filePath);
    const code = await file.text();
    const lines = code.split('\\n');
    
    const detections: DetectionResult[] = [];
    const summary = {
      total: 0,
      byDomain: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };
    
    for (const pattern of Array.from(this.patterns.values())) {
      let match;
      while ((match = pattern.regex.exec(code)) !== null) {
        // Check condition if present
        if (pattern.condition && !pattern.condition(code, match)) {
          continue;
        }
        
        const lineNum = this.getLineNumber(code, match.index);
        const lineText = lines[lineNum - 1] || '';
        const column = this.getColumnNumber(lineText, match.index);
        
        const annotation = pattern.generateAnnotation(match);
        const detection: DetectionResult = {
          line: lineNum,
          column,
          pattern: pattern.name,
          annotation,
          suggestion: pattern.suggestion
        };
        
        detections.push(detection);
        
        // Update summary
        summary.total++;
        summary.byDomain[annotation.domain] = (summary.byDomain[annotation.domain] || 0) + 1;
        summary.bySeverity[annotation.meta.severity] = (summary.bySeverity[annotation.meta.severity] || 0) + 1;
      }
    }
    
    return {
      file: filePath,
      detections,
      summary
    };
  }
  
  /**
   * Scan multiple files
   */
  async scanFiles(filePaths: string[]): Promise<ScanReport[]> {
    const reports: ScanReport[] = [];
    
    for (const filePath of filePaths) {
      try {
        const report = await this.scanFile(filePath);
        reports.push(report);
      } catch (error) {
        console.error(`Failed to scan ${filePath}:`, error);
      }
    }
    
    return reports;
  }
  
  /**
   * Get line number from character index
   */
  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\\n').length;
  }
  
  /**
   * Get column number from line text
   */
  private getColumnNumber(_line: string, _indexInFile: number): number {
    return 1; // Simplified column detection
  }
  
  /**
   * Extract function name from context
   */
  private extractFunctionName(_line: string, _column: number): string | undefined {
    return undefined; // Simplified for now
  }
}

// Pattern rule interface
interface PatternRule {
  name: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  domain: string;
  type: string;
  condition?: (code: string, match: RegExpExecArray) => boolean;
  generateAnnotation: (match: RegExpExecArray) => ParsedAnnotation;
  suggestion: string;
}

// Export singleton instance
export const patternDetector = new PatternDetector();
