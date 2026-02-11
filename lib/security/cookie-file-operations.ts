#!/usr/bin/env bun

/**
 * Cookie File Operations v1.3.1 Integration
 * 
 * Leveraging Bun v1.3.1's FileHandle.readLines() for efficient
 * cookie logging, audit trail processing, and batch analysis.
 */

import { open } from 'node:fs/promises';
import { Cookie, CookieInspector, LeadSpecProfile } from './cookie-security';
import { JuniorRunnerCookieProfiler } from './junior-runner';

// 📁 COOKIE FILE OPERATIONS
export interface CookieLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  sessionId?: string;
  userId?: string;
  cookieName: string;
  action: 'parse' | 'validate' | 'create' | 'delete' | 'inspect';
  result: 'success' | 'failure';
  details: string;
  securityScore?: number;
  processingTime?: number;
}

export interface CookieBatchAnalysis {
  totalEntries: number;
  timeRange: { start: string; end: string };
  securityMetrics: {
    averageScore: number;
    failedValidations: number;
    criticalIssues: string[];
  };
  performanceMetrics: {
    averageProcessingTime: number;
    slowestOperation: string;
    fastestOperation: string;
  };
  topCookies: Array<{ name: string; count: number; avgScore: number }>;
  recommendations: string[];
}

// 📊 COOKIE FILE LOGGER - Using FileHandle.readLines()
export class CookieFileLogger {
  private logPath: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB

  constructor(logPath: string = './cookie-security.log') {
    this.logPath = logPath;
  }

  /**
   * Log cookie operation with structured format
   * Uses FileHandle for efficient async writing
   */
  async log(entry: Omit<CookieLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: CookieLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      const file = await open(this.logPath, 'a');
      try {
        await file.write(logLine);
      } finally {
        await file.close();
      }
    } catch (error) {
      console.error('Failed to write to cookie log:', error);
    }

    // Rotate log if too large
    await this.rotateLogIfNeeded();
  }

  /**
   * Parse cookie and log the operation
   */
  async logParse(header: string, sessionId?: string): Promise<Cookie | null> {
    const startTime = performance.now();
    
    try {
      const cookie = Cookie.parse(header);
      const processingTime = performance.now() - startTime;
      
      const validation = CookieInspector.validate(cookie);
      
      await this.log({
        level: validation.valid ? 'info' : 'warn',
        sessionId,
        cookieName: cookie.name,
        action: 'parse',
        result: 'success',
        details: `Parsed successfully with score ${validation.score}/100`,
        securityScore: validation.score,
        processingTime
      });

      return cookie;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      await this.log({
        level: 'error',
        sessionId,
        cookieName: 'unknown',
        action: 'parse',
        result: 'failure',
        details: `Parse failed: ${error}`,
        processingTime
      });

      return null;
    }
  }

  /**
   * Validate cookie and log the operation
   */
  async logValidation(cookie: Cookie, sessionId?: string): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const validation = CookieInspector.validate(cookie);
      const processingTime = performance.now() - startTime;
      
      await this.log({
        level: validation.valid ? 'info' : 'warn',
        sessionId,
        cookieName: cookie.name,
        action: 'validate',
        result: validation.valid ? 'success' : 'failure',
        details: `Validation score: ${validation.score}/100. Issues: ${validation.issues.join(', ')}`,
        securityScore: validation.score,
        processingTime
      });

      return validation.valid;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      await this.log({
        level: 'error',
        sessionId,
        cookieName: cookie.name,
        action: 'validate',
        result: 'failure',
        details: `Validation failed: ${error}`,
        processingTime
      });

      return false;
    }
  }

  /**
   * Read and analyze log file using FileHandle.readLines()
   * This is the key feature leveraging Bun v1.3.1
   */
  async analyzeLogFile(limit?: number): Promise<CookieBatchAnalysis> {
    const entries: CookieLogEntry[] = [];
    let lineCount = 0;

    try {
      const file = await open(this.logPath, 'r');
      
      try {
        // 🚀 Using Bun v1.3.1's FileHandle.readLines() for efficient iteration
        for await (const line of file.readLines({ encoding: 'utf8' })) {
          if (limit && lineCount >= limit) break;
          
          try {
            const entry = JSON.parse(line) as CookieLogEntry;
            entries.push(entry);
            lineCount++;
          } catch {
            // Skip malformed lines
            continue;
          }
        }
      } finally {
        await file.close();
      }
    } catch (error) {
      console.error('Failed to read log file:', error);
      return this.createEmptyAnalysis();
    }

    return this.analyzeEntries(entries);
  }

  /**
   * Real-time log monitoring with FileHandle.readLines()
   */
  async monitorLogFile(callback: (entry: CookieLogEntry) => void): Promise<void> {
    let lastPosition = 0;
    
    // Get current file size
    try {
      const file = await open(this.logPath, 'r');
      try {
        const stats = await file.stat();
        lastPosition = stats.size;
      } finally {
        await file.close();
      }
    } catch {
      // File doesn't exist yet
      lastPosition = 0;
    }

    // Monitor for new lines
    const monitor = async () => {
      try {
        const file = await open(this.logPath, 'r');
        
        try {
          await file.read(lastPosition, new Uint8Array(0)); // Seek to position
          
          for await (const line of file.readLines({ encoding: 'utf8' })) {
            try {
              const entry = JSON.parse(line) as CookieLogEntry;
              callback(entry);
              lastPosition += Buffer.byteLength(line + '\n');
            } catch {
              continue;
            }
          }
        } finally {
          await file.close();
        }
      } catch {
        // File might not exist or be locked
      }
    };

    // Check for new entries every second
    setInterval(monitor, 1000);
  }

  /**
   * Export logs to different formats
   */
  async exportLogs(format: 'json' | 'csv' | 'markdown' = 'json'): Promise<string> {
    const entries: CookieLogEntry[] = [];
    
    try {
      const file = await open(this.logPath, 'r');
      
      try {
        for await (const line of file.readLines({ encoding: 'utf8' })) {
          try {
            const entry = JSON.parse(line) as CookieLogEntry;
            entries.push(entry);
          } catch {
            continue;
          }
        }
      } finally {
        await file.close();
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '';
    }

    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2);
      
      case 'csv':
        const headers = ['timestamp', 'level', 'sessionId', 'userId', 'cookieName', 'action', 'result', 'details', 'securityScore', 'processingTime'];
        const csvRows = [
          headers.join(','),
          ...entries.map(entry => [
            entry.timestamp,
            entry.level,
            entry.sessionId || '',
            entry.userId || '',
            entry.cookieName,
            entry.action,
            entry.result,
            `"${entry.details.replace(/"/g, '""')}"`,
            entry.securityScore || '',
            entry.processingTime || ''
          ].join(','))
        ];
        return csvRows.join('\n');
      
      case 'markdown':
        const mdLines = [
          '# Cookie Security Log',
          '',
          '| Timestamp | Level | Cookie | Action | Result | Score | Time |',
          '|-----------|-------|--------|--------|--------|-------|------|',
          ...entries.map(entry => 
            `| ${entry.timestamp} | ${entry.level} | ${entry.cookieName} | ${entry.action} | ${entry.result} | ${entry.securityScore || 'N/A'} | ${entry.processingTime || 'N/A'}ms |`
          )
        ];
        return mdLines.join('\n');
      
      default:
        return '';
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const file = await open(this.logPath, 'r');
      
      try {
        const stats = await file.stat();
        if (stats.size > this.maxFileSize) {
          await file.close();
          
          // Rotate log
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedPath = `${this.logPath}.${timestamp}`;
          await Bun.write(rotatedPath, await Bun.file(this.logPath).arrayBuffer());
          await Bun.write(this.logPath, '');
        }
      } finally {
        await file.close();
      }
    } catch {
      // Ignore rotation errors
    }
  }

  private analyzeEntries(entries: CookieLogEntry[]): CookieBatchAnalysis {
    if (entries.length === 0) {
      return this.createEmptyAnalysis();
    }

    const timestamps = entries.map(e => new Date(e.timestamp).getTime());
    const timeRange = {
      start: new Date(Math.min(...timestamps)).toISOString(),
      end: new Date(Math.max(...timestamps)).toISOString()
    };

    const securityScores = entries
      .filter(e => e.securityScore !== undefined)
      .map(e => e.securityScore!);
    
    const averageScore = securityScores.length > 0 
      ? securityScores.reduce((sum, score) => sum + score, 0) / securityScores.length
      : 0;

    const failedValidations = entries.filter(e => e.result === 'failure').length;
    
    const processingTimes = entries
      .filter(e => e.processingTime !== undefined)
      .map(e => e.processingTime!);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Cookie frequency analysis
    const cookieStats = new Map<string, { count: number; scores: number[] }>();
    
    for (const entry of entries) {
      if (!cookieStats.has(entry.cookieName)) {
        cookieStats.set(entry.cookieName, { count: 0, scores: [] });
      }
      const stats = cookieStats.get(entry.cookieName)!;
      stats.count++;
      if (entry.securityScore) {
        stats.scores.push(entry.securityScore);
      }
    }

    const topCookies = Array.from(cookieStats.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgScore: stats.scores.length > 0 
          ? stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const criticalIssues = entries
      .filter(e => e.level === 'error')
      .map(e => e.details)
      .filter((detail, index, arr) => arr.indexOf(detail) === index) // Unique
      .slice(0, 5);

    const recommendations = this.generateRecommendations(averageScore, failedValidations, entries.length, criticalIssues);

    return {
      totalEntries: entries.length,
      timeRange,
      securityMetrics: {
        averageScore,
        failedValidations,
        criticalIssues
      },
      performanceMetrics: {
        averageProcessingTime,
        slowestOperation: processingTimes.length > 0 ? 'unknown' : 'N/A',
        fastestOperation: processingTimes.length > 0 ? 'unknown' : 'N/A'
      },
      topCookies,
      recommendations
    };
  }

  private generateRecommendations(avgScore: number, failures: number, totalEntries: number, issues: string[]): string[] {
    const recommendations: string[] = [];

    if (avgScore < 80) {
      recommendations.push('Improve overall cookie security configuration');
    }

    if (failures > totalEntries * 0.1) {
      recommendations.push('High failure rate detected - review cookie formats');
    }

    if (issues.length > 0) {
      recommendations.push(`Address critical issues: ${issues.slice(0, 3).join(', ')}`);
    }

    return recommendations;
  }

  private createEmptyAnalysis(): CookieBatchAnalysis {
    return {
      totalEntries: 0,
      timeRange: { start: '', end: '' },
      securityMetrics: {
        averageScore: 0,
        failedValidations: 0,
        criticalIssues: []
      },
      performanceMetrics: {
        averageProcessingTime: 0,
        slowestOperation: 'N/A',
        fastestOperation: 'N/A'
      },
      topCookies: [],
      recommendations: []
    };
  }
}

// 🔄 BATCH COOKIE PROCESSOR
export class CookieBatchProcessor {
  private logger: CookieFileLogger;

  constructor(logger?: CookieFileLogger) {
    this.logger = logger || new CookieFileLogger();
  }

  /**
   * Process multiple cookie headers from file
   */
  async processCookieHeaders(filePath: string, sessionId?: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{ header: string; cookie?: Cookie; valid?: boolean; error?: string }>;
  }> {
    const results: Array<{ header: string; cookie?: Cookie; valid?: boolean; error?: string }> = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      const file = await open(filePath, 'r');
      
      try {
        // 🚀 Using Bun v1.3.1's FileHandle.readLines() for batch processing
        for await (const line of file.readLines({ encoding: 'utf8' })) {
          const header = line.trim();
          if (!header) continue;

          processed++;
          
          try {
            const cookie = await this.logger.logParse(header, sessionId);
            if (cookie) {
              const isValid = await this.logger.logValidation(cookie, sessionId);
              results.push({ header, cookie, valid: isValid });
              successful++;
            } else {
              results.push({ header, error: 'Parse failed' });
              failed++;
            }
          } catch (error) {
            results.push({ header, error: String(error) });
            failed++;
          }
        }
      } finally {
        await file.close();
      }
    } catch (error) {
      console.error('Failed to process cookie file:', error);
    }

    return { processed, successful, failed, results };
  }

  /**
   * Generate security report from log analysis
   */
  async generateSecurityReport(): Promise<string> {
    const analysis = await this.logger.analyzeLogFile();
    
    return `
# Cookie Security Report

## Summary
- **Total Entries**: ${analysis.totalEntries}
- **Time Range**: ${analysis.timeRange.start} to ${analysis.timeRange.end}
- **Average Security Score**: ${analysis.securityMetrics.averageScore.toFixed(1)}/100
- **Failed Validations**: ${analysis.securityMetrics.failedValidations}
- **Average Processing Time**: ${analysis.performanceMetrics.averageProcessingTime.toFixed(2)}ms

## Top Cookies
${analysis.topCookies.map(cookie => 
  `- **${cookie.name}**: ${cookie.count} occurrences (avg score: ${cookie.avgScore.toFixed(1)})`
).join('\n')}

## Critical Issues
${analysis.securityMetrics.criticalIssues.length > 0 
  ? analysis.securityMetrics.criticalIssues.map(issue => `- ${issue}`).join('\n')
  : 'No critical issues detected'
}

## Recommendations
${analysis.recommendations.length > 0
  ? analysis.recommendations.map(rec => `- ${rec}`).join('\n')
  : 'No recommendations at this time'
}

---
*Report generated using Bun v1.3.1 FileHandle.readLines()*
    `.trim();
  }
}

// 🚀 DEMO FUNCTIONS
export async function demonstrateFileHandleReadLines() {
  console.log('🚀 Demonstrating Bun v1.3.1 FileHandle.readLines() for Cookie Security');
  
  const logger = new CookieFileLogger('./demo-cookie.log');
  
  // Create some sample log entries
  await logger.log({
    level: 'info',
    sessionId: 'demo-session-123',
    cookieName: 'session',
    action: 'parse',
    result: 'success',
    details: 'Successfully parsed session cookie',
    securityScore: 95,
    processingTime: 0.5
  });

  await logger.log({
    level: 'warn',
    sessionId: 'demo-session-123',
    cookieName: 'analytics',
    action: 'validate',
    result: 'failure',
    details: 'Missing secure flag on analytics cookie',
    securityScore: 65,
    processingTime: 0.3
  });

  // Analyze the log using FileHandle.readLines()
  console.log('\n📊 Analyzing log file with FileHandle.readLines():');
  const analysis = await logger.analyzeLogFile();
  
  console.log(`Total entries: ${analysis.totalEntries}`);
  console.log(`Average security score: ${analysis.securityMetrics.averageScore.toFixed(1)}/100`);
  console.log(`Failed validations: ${analysis.securityMetrics.failedValidations}`);
  
  // Export to different formats
  console.log('\n📄 Exporting logs:');
  const jsonExport = await logger.exportLogs('json');
  console.log('JSON export length:', jsonExport.length);
  
  const csvExport = await logger.exportLogs('csv');
  console.log('CSV export length:', csvExport.length);
  
  const mdExport = await logger.exportLogs('markdown');
  console.log('Markdown export length:', mdExport.length);
  
  console.log('\n✅ FileHandle.readLines() demo completed successfully!');
}

// 🚀 RUN DEMO IF EXECUTED DIRECTLY
if (import.meta.main) {
  demonstrateFileHandleReadLines();
}

export default {
  CookieFileLogger,
  CookieBatchProcessor,
  demonstrateFileHandleReadLines
};
