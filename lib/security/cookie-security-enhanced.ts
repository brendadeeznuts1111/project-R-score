#!/usr/bin/env bun

/**
 * Cookie Security System v3.25 - Enhanced with Bun v1.3.1 FileHandle.readLines()
 * 
 * This enhanced version integrates Bun v1.3.1's FileHandle.readLines() for:
 * - Efficient log file processing and analysis
 * - Batch cookie validation from files
 * - Real-time log monitoring with async iteration
 * - Performance-optimized audit trail processing
 */

import { open } from 'node:fs/promises';
import { Cookie, CookieInspector, CSRFProtection, ABTestingVariant, JuniorRunnerCookieIntegration } from './cookie-security';
import { CookieFileLogger, CookieBatchProcessor, type CookieLogEntry } from './cookie-file-operations';

// 🚀 ENHANCED COOKIE SECURITY WITH FILEHANDLE.READLINES()
export class EnhancedCookieSecurity {
  private fileLogger: CookieFileLogger;
  private batchProcessor: CookieBatchProcessor;

  constructor(logPath?: string) {
    this.fileLogger = new CookieFileLogger(logPath);
    this.batchProcessor = new CookieBatchProcessor(this.fileLogger);
  }

  /**
   * Parse cookie with FileHandle-enhanced logging
   */
  async parseWithLogging(header: string, sessionId?: string): Promise<Cookie | null> {
    return await this.fileLogger.logParse(header, sessionId);
  }

  /**
   * Validate cookie with FileHandle-enhanced logging
   */
  async validateWithLogging(cookie: Cookie, sessionId?: string): Promise<boolean> {
    return await this.fileLogger.logValidation(cookie, sessionId);
  }

  /**
   * Process cookie audit trail using FileHandle.readLines()
   * This is the key enhancement leveraging Bun v1.3.1
   */
  async processAuditTrail(auditFilePath: string, options: {
    dateRange?: { start: string; end: string };
    cookieFilter?: string[];
    severityFilter?: ('info' | 'warn' | 'error' | 'debug')[];
    limit?: number;
  } = {}): Promise<{
    totalEntries: number;
    filteredEntries: CookieLogEntry[];
    securitySummary: {
      averageScore: number;
      criticalIssues: number;
      recommendations: string[];
    };
    performanceMetrics: {
      averageProcessingTime: number;
      slowestOperations: Array<{ operation: string; time: number; cookie: string }>;
    };
  }> {
    const entries: CookieLogEntry[] = [];
    let processedCount = 0;

    try {
      const file = await open(auditFilePath, 'r');
      
      try {
        // 🚀 Using Bun v1.3.1's FileHandle.readLines() for efficient audit processing
        for await (const line of file.readLines({ encoding: 'utf8' })) {
          if (options.limit && processedCount >= options.limit) break;
          
          try {
            const entry = JSON.parse(line) as CookieLogEntry;
            
            // Apply filters
            if (this.passesFilters(entry, options)) {
              entries.push(entry);
            }
            
            processedCount++;
          } catch {
            // Skip malformed lines
            continue;
          }
        }
      } finally {
        await file.close();
      }
    } catch (error) {
      console.error('Failed to process audit trail:', error);
      return {
        totalEntries: 0,
        filteredEntries: [],
        securitySummary: { averageScore: 0, criticalIssues: 0, recommendations: [] },
        performanceMetrics: { averageProcessingTime: 0, slowestOperations: [] }
      };
    }

    // Generate summary
    const securitySummary = this.generateSecuritySummary(entries);
    const performanceMetrics = this.generatePerformanceMetrics(entries);

    return {
      totalEntries: processedCount,
      filteredEntries: entries,
      securitySummary,
      performanceMetrics
    };
  }

  /**
   * Real-time monitoring using FileHandle.readLines()
   */
  async startRealTimeMonitoring(callback: (entry: CookieLogEntry) => void): Promise<void> {
    console.log('🔍 Starting real-time cookie security monitoring...');
    
    await this.fileLogger.monitorLogFile((entry) => {
      // Enhanced callback with real-time analysis
      if (entry.level === 'error' || entry.securityScore < 50) {
        console.warn(`🚨 Security Alert: ${entry.details} (Cookie: ${entry.cookieName})`);
      }
      
      callback(entry);
    });
  }

  /**
   * Generate comprehensive security report using FileHandle.readLines()
   */
  async generateComprehensiveReport(): Promise<{
    summary: any;
    recentActivity: CookieLogEntry[];
    securityTrends: {
      scoreTrend: Array<{ timestamp: string; score: number }>;
      failureRate: number;
      topIssues: Array<{ issue: string; count: number }>;
    };
    recommendations: string[];
  }> {
    // Get recent activity using FileHandle.readLines()
    const recentEntries: CookieLogEntry[] = [];
    
    try {
      const file = await open(this.fileLogger['logPath'], 'r');
      
      try {
        for await (const line of file.readLines({ encoding: 'utf8' })) {
          try {
            const entry = JSON.parse(line) as CookieLogEntry;
            recentEntries.push(entry);
            
            // Get last 100 entries
            if (recentEntries.length >= 100) break;
          } catch {
            continue;
          }
        }
      } finally {
        await file.close();
      }
    } catch {
      // File might not exist
    }

    const analysis = await this.fileLogger.analyzeLogFile();
    
    // Calculate trends
    const scoreTrend = recentEntries
      .filter(e => e.securityScore)
      .map(e => ({ timestamp: e.timestamp, score: e.securityScore! }))
      .slice(-20); // Last 20 entries

    const failureRate = recentEntries.length > 0 
      ? (recentEntries.filter(e => e.result === 'failure').length / recentEntries.length) * 100
      : 0;

    const issueCounts = new Map<string, number>();
    recentEntries.forEach(entry => {
      if (entry.level === 'error') {
        issueCounts.set(entry.details, (issueCounts.get(entry.details) || 0) + 1);
      }
    });

    const topIssues = Array.from(issueCounts.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recommendations = this.generateAdvancedRecommendations(analysis, failureRate, topIssues);

    return {
      summary: analysis,
      recentActivity: recentEntries.slice(0, 10),
      securityTrends: {
        scoreTrend,
        failureRate,
        topIssues
      },
      recommendations
    };
  }

  /**
   * Batch process cookies from file using FileHandle.readLines()
   */
  async batchProcessFromFile(filePath: string, sessionId?: string): Promise<{
    results: any;
    report: string;
  }> {
    const results = await this.batchProcessor.processCookieHeaders(filePath, sessionId);
    const report = await this.batchProcessor.generateSecurityReport();
    
    return { results, report };
  }

  private passesFilters(entry: CookieLogEntry, options: any): boolean {
    // Date range filter
    if (options.dateRange) {
      const entryTime = new Date(entry.timestamp).getTime();
      const startTime = new Date(options.dateRange.start).getTime();
      const endTime = new Date(options.dateRange.end).getTime();
      
      if (entryTime < startTime || entryTime > endTime) {
        return false;
      }
    }

    // Cookie name filter
    if (options.cookieFilter && options.cookieFilter.length > 0) {
      if (!options.cookieFilter.includes(entry.cookieName)) {
        return false;
      }
    }

    // Severity filter
    if (options.severityFilter && options.severityFilter.length > 0) {
      if (!options.severityFilter.includes(entry.level)) {
        return false;
      }
    }

    return true;
  }

  private generateSecuritySummary(entries: CookieLogEntry[]): any {
    const securityScores = entries
      .filter(e => e.securityScore !== undefined)
      .map(e => e.securityScore!);
    
    const averageScore = securityScores.length > 0 
      ? securityScores.reduce((sum, score) => sum + score, 0) / securityScores.length
      : 0;

    const criticalIssues = entries.filter(e => e.level === 'error').length;

    const recommendations = [];
    if (averageScore < 80) recommendations.push('Improve overall cookie security');
    if (criticalIssues > entries.length * 0.1) recommendations.push('Address critical security issues');

    return { averageScore, criticalIssues, recommendations };
  }

  private generatePerformanceMetrics(entries: CookieLogEntry[]): any {
    const processingTimes = entries
      .filter(e => e.processingTime !== undefined)
      .map(e => e.processingTime!);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const slowestOperations = entries
      .filter(e => e.processingTime && e.processingTime > 1.0)
      .map(e => ({
        operation: e.action,
        time: e.processingTime!,
        cookie: e.cookieName
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    return { averageProcessingTime, slowestOperations };
  }

  private generateAdvancedRecommendations(analysis: any, failureRate: number, topIssues: any[]): string[] {
    const recommendations: string[] = [];

    if (analysis.securityMetrics.averageScore < 80) {
      recommendations.push('🔒 Implement stronger cookie security policies');
    }

    if (failureRate > 10) {
      recommendations.push('⚠️ High failure rate detected - review cookie formats and validation logic');
    }

    if (topIssues.length > 0) {
      recommendations.push(`🚨 Address top issues: ${topIssues.slice(0, 3).map(i => i.issue).join(', ')}`);
    }

    if (analysis.performanceMetrics.averageProcessingTime > 5.0) {
      recommendations.push('⚡ Optimize cookie processing performance');
    }

    return recommendations;
  }
}

// 🚀 DEMO: FileHandle.readLines() Integration
export async function demonstrateFileHandleIntegration() {
  console.log('🚀 Demonstrating Enhanced Cookie Security with Bun v1.3.1 FileHandle.readLines()');
  
  const enhancedSecurity = new EnhancedCookieSecurity('./enhanced-cookie-security.log');

  // Test batch processing
  console.log('\n📦 Testing batch cookie processing...');
  const batchResults = await enhancedSecurity.batchProcessFromFile('./test-cookies.txt', 'demo-session-enhanced');
  
  console.log(`Processed: ${batchResults.results.processed} cookies`);
  console.log(`Success rate: ${((batchResults.results.successful / batchResults.results.processed) * 100).toFixed(1)}%`);

  // Test audit trail processing
  console.log('\n📋 Testing audit trail processing...');
  const auditResults = await enhancedSecurity.processAuditTrail('./enhanced-cookie-security.log', {
    limit: 50,
    severityFilter: ['warn', 'error']
  });
  
  console.log(`Audit entries processed: ${auditResults.totalEntries}`);
  console.log(`Filtered entries: ${auditResults.filteredEntries.length}`);
  console.log(`Average security score: ${auditResults.securitySummary.averageScore.toFixed(1)}/100`);

  // Generate comprehensive report
  console.log('\n📊 Generating comprehensive security report...');
  const report = await enhancedSecurity.generateComprehensiveReport();
  
  console.log(`Security score trend: ${report.securityTrends.scoreTrend.length} data points`);
  console.log(`Failure rate: ${report.securityTrends.failureRate.toFixed(1)}%`);
  console.log(`Recommendations: ${report.recommendations.length}`);

  // Test real-time monitoring (brief demo)
  console.log('\n🔍 Starting real-time monitoring demo (5 seconds)...');
  
  let monitoringCount = 0;
  await enhancedSecurity.startRealTimeMonitoring((entry) => {
    monitoringCount++;
    if (monitoringCount <= 3) { // Show first few entries
      console.log(`  📝 ${entry.level.toUpperCase()}: ${entry.cookieName} - ${entry.action}`);
    }
  });

  // Wait a bit to show monitoring
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ FileHandle.readLines() integration demo completed successfully!');
  console.log('🎯 Key benefits demonstrated:');
  console.log('  - Efficient log file processing with async iteration');
  console.log('  - Real-time monitoring with backpressure-aware streaming');
  console.log('  - Batch processing with performance optimization');
  console.log('  - Comprehensive audit trail analysis');
}

// 🚀 RUN DEMO IF EXECUTED DIRECTLY
if (import.meta.main) {
  demonstrateFileHandleIntegration();
}

export default {
  EnhancedCookieSecurity,
  demonstrateFileHandleIntegration
};
