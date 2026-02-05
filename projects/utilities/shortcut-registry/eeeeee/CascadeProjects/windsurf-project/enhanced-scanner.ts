#!/usr/bin/env bun

/**
 * Enhanced Enterprise Scanner with Codepoint Analysis
 * 
 * Integrates the enterprise scanner with advanced codepoint analysis
 * for comprehensive security and quality analysis.
 */

import type { CodepointAnalysis } from './codepoint-analyzer';
import { CodepointAnalyzer } from './codepoint-analyzer';
import type { AnnotationRule } from './enterprise-scanner';
import { EnterpriseScanner } from './enterprise-scanner';

interface EnhancedAnalysisResult {
  enterpriseAnnotations: {
    annotatedCode: string;
    appliedRules: AnnotationRule[];
    summary: {
      totalAnnotations: number;
      byDomain: Record<string, number>;
      bySeverity: Record<string, number>;
    };
  };
  codepointAnalysis: CodepointAnalysis;
  combinedSecurityScore: number;
  criticalIssues: string[];
  recommendations: string[];
  summary: {
    totalIssues: number;
    criticalSecurityIssues: number;
    characterSecurityIssues: number;
    performanceIssues: number;
    qualityIssues: number;
  };
}

interface CodepointSecurityIssue {
  severity: string;
  description: string;
  position: number;
  character: string;
}

class EnhancedEnterpriseScanner {
  private enterpriseScanner: EnterpriseScanner;
  private codepointAnalyzer: CodepointAnalyzer;

  constructor() {
    this.enterpriseScanner = new EnterpriseScanner();
    this.codepointAnalyzer = new CodepointAnalyzer();
  }

  async analyze(sourceCode: string, customRules: AnnotationRule[] = []): Promise<EnhancedAnalysisResult> {
    // Run enterprise scanner
    const enterpriseResult = this.enterpriseScanner.suggestAnnotations(sourceCode, customRules);
    
    // Run codepoint analysis
    const codepointResult = this.codepointAnalyzer.analyzeCodepoints(sourceCode);
    
    // Calculate combined security score
    const securityScore = this.calculateSecurityScore(enterpriseResult, codepointResult);
    
    // Extract critical issues
    const criticalIssues = this.extractCriticalIssues(enterpriseResult, codepointResult);
    
    // Generate combined recommendations
    const recommendations = this.generateCombinedRecommendations(enterpriseResult, codepointResult);
    
    // Create summary
    const summary = this.createSummary(enterpriseResult, codepointResult);

    return {
      enterpriseAnnotations: enterpriseResult,
      codepointAnalysis: codepointResult,
      combinedSecurityScore: securityScore,
      criticalIssues,
      recommendations,
      summary
    };
  }

  private calculateSecurityScore(enterpriseResult: EnhancedAnalysisResult['enterpriseAnnotations'], codepointResult: CodepointAnalysis): number {
    let score = 100;
    
    // Deduct points for enterprise scanner issues
    const criticalEnterprise = enterpriseResult.appliedRules.filter((r: AnnotationRule) => 
      r.meta.severity === 'critical').length;
    const highEnterprise = enterpriseResult.appliedRules.filter((r: AnnotationRule) => 
      r.meta.severity === 'high').length;
    
    score -= criticalEnterprise * 25;
    score -= highEnterprise * 15;
    
    // Deduct points for codepoint security issues
    const criticalCodepoint = codepointResult.securityIssues.filter((i: CodepointSecurityIssue) => 
      i.severity === 'critical').length;
    const highCodepoint = codepointResult.securityIssues.filter((i: CodepointSecurityIssue) => 
      i.severity === 'high').length;
    
    score -= criticalCodepoint * 30;
    score -= highCodepoint * 20;
    
    // Deduct points for problematic sequences
    score -= codepointResult.problematicSequences.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private extractCriticalIssues(enterpriseResult: EnhancedAnalysisResult['enterpriseAnnotations'], codepointResult: CodepointAnalysis): string[] {
    const issues: string[] = [];
    
    // Enterprise scanner critical issues
    enterpriseResult.appliedRules.forEach((rule: AnnotationRule) => {
      if (rule.meta.severity === 'critical') {
        issues.push(`🔴 ${rule.domain}: ${rule.meta.fix} (Line ${rule.line})`);
      }
    });
    
    // Codepoint critical issues
    codepointResult.securityIssues.forEach((issue: CodepointSecurityIssue) => {
      if (issue.severity === 'critical') {
        issues.push(`🔴 Character Security: ${issue.description} (Position ${issue.position})`);
      }
    });
    
    return issues;
  }

  private generateCombinedRecommendations(enterpriseResult: EnhancedAnalysisResult['enterpriseAnnotations'], codepointResult: CodepointAnalysis): string[] {
    const recommendations: string[] = [];
    
    // Enterprise scanner recommendations
    const enterpriseCritical = enterpriseResult.appliedRules.filter((r: AnnotationRule) => 
      r.meta.severity === 'critical').length;
    const enterpriseHigh = enterpriseResult.appliedRules.filter((r: AnnotationRule) => 
      r.meta.severity === 'high').length;
    
    if (enterpriseCritical > 0) {
      recommendations.push(`🚨 Fix ${enterpriseCritical} critical code issues immediately`);
    }
    if (enterpriseHigh > 0) {
      recommendations.push(`⚠️  Address ${enterpriseHigh} high-priority code issues`);
    }
    
    // Codepoint recommendations
    const codepointCritical = codepointResult.securityIssues.filter((i: CodepointSecurityIssue) => 
      i.severity === 'critical').length;
    const codepointHigh = codepointResult.securityIssues.filter((i: CodepointSecurityIssue) => 
      i.severity === 'high').length;
    
    if (codepointCritical > 0) {
      recommendations.push(`🔒 Resolve ${codepointCritical} critical character security issues`);
    }
    if (codepointHigh > 0) {
      recommendations.push(`👻 Fix ${codepointHigh} invisible character issues`);
    }
    
    // Combined recommendations
    if (codepointResult.problematicSequences.length > 0) {
      recommendations.push(`🔗 Investigate ${codepointResult.problematicSequences.length} suspicious character sequences`);
    }
    
    const totalIssues = enterpriseResult.appliedRules.length + codepointResult.securityIssues.length;
    if (totalIssues > 10) {
      recommendations.push(`📊 High issue density (${totalIssues} total). Consider comprehensive code review`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Excellent code quality and security posture');
    }
    
    return recommendations;
  }

  private createSummary(enterpriseResult: EnhancedAnalysisResult['enterpriseAnnotations'], codepointResult: CodepointAnalysis): EnhancedAnalysisResult['summary'] {
    return {
      totalIssues: enterpriseResult.appliedRules.length + codepointResult.securityIssues.length,
      criticalSecurityIssues: 
        enterpriseResult.appliedRules.filter((r: AnnotationRule) => r.meta.severity === 'critical').length +
        codepointResult.securityIssues.filter((i: CodepointSecurityIssue) => i.severity === 'critical').length,
      characterSecurityIssues: codepointResult.securityIssues.length,
      performanceIssues: enterpriseResult.appliedRules.filter((r: AnnotationRule) => r.domain === 'PERF').length,
      qualityIssues: enterpriseResult.appliedRules.filter((r: AnnotationRule) => r.domain === 'QUAL').length
    };
  }

  generateEnhancedReport(result: EnhancedAnalysisResult): string {
    let report = `🔍 ENHANCED ENTERPRISE ANALYSIS REPORT\n`;
    report += `═══════════════════════════════════════════\n\n`;

    // Security Score
    const scoreColor = result.combinedSecurityScore >= 80 ? '🟢' : 
                      result.combinedSecurityScore >= 60 ? '🟡' : '🔴';
    report += `${scoreColor} Overall Security Score: ${result.combinedSecurityScore}/100\n\n`;

    // Summary
    report += `📊 Analysis Summary:\n`;
    report += `   Total Issues: ${result.summary.totalIssues}\n`;
    report += `   Critical Security Issues: ${result.summary.criticalSecurityIssues}\n`;
    report += `   Character Security Issues: ${result.summary.characterSecurityIssues}\n`;
    report += `   Performance Issues: ${result.summary.performanceIssues}\n`;
    report += `   Quality Issues: ${result.summary.qualityIssues}\n\n`;

    // Critical Issues
    if (result.criticalIssues.length > 0) {
      report += `🚨 Critical Issues (${result.criticalIssues.length}):\n`;
      result.criticalIssues.forEach((issue, index) => {
        report += `   ${index + 1}. ${issue}\n`;
      });
      report += '\n';
    }

    // Enterprise Annotations Summary
    report += `🏢 Enterprise Scanner Results:\n`;
    report += `   Annotations Applied: ${result.enterpriseAnnotations.appliedRules.length}\n`;
    report += `   By Domain: ${Object.entries(result.enterpriseAnnotations.summary.byDomain).map(([d, c]) => `${d}(${c})`).join(', ')}\n`;
    report += `   By Severity: ${Object.entries(result.enterpriseAnnotations.summary.bySeverity).map(([s, c]) => `${s}(${c})`).join(', ')}\n\n`;

    // Codepoint Analysis Summary
    report += `🔤 Codepoint Analysis Results:\n`;
    report += `   Characters Analyzed: ${result.codepointAnalysis.totalCharacters}\n`;
    report += `   Unique Characters: ${result.codepointAnalysis.uniqueCharacters}\n`;
    report += `   Security Issues: ${result.codepointAnalysis.securityIssues.length}\n`;
    report += `   Problematic Sequences: ${result.codepointAnalysis.problematicSequences.length}\n`;
    report += `   Encoding: ${result.codepointAnalysis.encodingConfidence.detected}\n\n`;

    // Top Security Issues
    const topSecurityIssues = result.codepointAnalysis.securityIssues
      .filter((i: CodepointSecurityIssue) => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 3);
    
    if (topSecurityIssues.length > 0) {
      report += `🔒 Top Character Security Issues:\n`;
      topSecurityIssues.forEach((issue: CodepointSecurityIssue, index: number) => {
        const severityIcon = issue.severity === 'critical' ? '🔴' : '🟠';
        report += `   ${index + 1}. ${severityIcon} ${issue.description}\n`;
        report += `      Position: ${issue.position}, Character: '${issue.character}'\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += `💡 Recommendations:\n`;
    result.recommendations.forEach((rec, index) => {
      report += `   ${index + 1}. ${rec}\n`;
    });

    return report;
  }

  exportJSON(result: EnhancedAnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  generateCodepointReport(codepointAnalysis: CodepointAnalysis): string {
    return this.codepointAnalyzer.generateReport(codepointAnalysis);
  }

  generateEnterpriseReport(enterpriseAnnotations: EnhancedAnalysisResult['enterpriseAnnotations']): string {
    return this.enterpriseScanner.generateReport(enterpriseAnnotations);
  }
}

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 && process.stdin.isTTY || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Enhanced Enterprise Scanner with Codepoint Analysis

Usage:
  bun enhanced-scanner.ts <file> [options]
  cat <file> | bun enhanced-scanner.ts [options]

Options:
  --format <type>    Output format: report (default), json
  --security         Focus on security issues only
  --codepoints       Show detailed codepoint analysis
  --enterprise       Show enterprise annotations only
  --help, -h        Show this help

Examples:
  bun enhanced-scanner.ts source.ts
  bun enhanced-scanner.ts source.ts --format json
  bun enhanced-scanner.ts source.ts --security
  cat suspicious.ts | bun enhanced-scanner.ts --codepoints
    `);
    process.exit(0);
  }

  const scanner = new EnhancedEnterpriseScanner();
  const formatIndex = args.indexOf('--format');
  const format = formatIndex !== -1 && args[formatIndex + 1] === 'json' ? 'json' : 'report';
  const securityOnly = args.includes('--security');
  const codepointsOnly = args.includes('--codepoints');
  const enterpriseOnly = args.includes('--enterprise');

  // Read input
  let sourceCode = '';
  const fileArg = args.find(arg => !arg.startsWith('--'));
  
  if (fileArg && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    sourceCode = Buffer.concat(chunks).toString();
  } else if (fileArg) {
    try {
      sourceCode = await Bun.file(fileArg).text();
    } catch (error) {
      console.error(`❌ Error reading file: ${(error as Error).message}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    sourceCode = Buffer.concat(chunks).toString();
  } else {
    console.error('❌ No input file provided and no data on stdin');
    process.exit(1);
  }

  // Analyze
  const result = await scanner.analyze(sourceCode);

  // Filter output if requested
  if (securityOnly) {
    result.recommendations = result.recommendations.filter(r => 
      r.includes('security') || r.includes('critical') || r.includes('🔒') || r.includes('🚨')
    );
  }

  // Output
  switch (format) {
    case 'json':
      console.log(scanner.exportJSON(result));
      break;
    default:
      if (codepointsOnly) {
        console.log(scanner.generateCodepointReport(result.codepointAnalysis));
      } else if (enterpriseOnly) {
        console.log(scanner.generateEnterpriseReport(result.enterpriseAnnotations));
      } else {
        console.log(scanner.generateEnhancedReport(result));
      }
      break;
  }

  // Exit with error code if critical issues found
  if (result.criticalIssues.length > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { EnhancedEnterpriseScanner };
export type { EnhancedAnalysisResult };