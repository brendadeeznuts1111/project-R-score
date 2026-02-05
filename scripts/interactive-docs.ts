#!/usr/bin/env bun

/**
 * Interactive Documentation Workflow System
 * 
 * Advanced error diagnosis and learning system that combines:
 * - Bun documentation search
 * - FactoryWager audit trail analysis
 * - Context-aware fix generation
 * - Institutional knowledge storage
 */

import { BunMCPClient, SearchResult, Diagnosis } from '../lib/mcp/bun-mcp-client.ts';
import { SecretManager } from '../lib/security/secrets.ts';
import { styled, FW_COLORS, log, colorBar } from '../lib/theme/colors.ts';
import { r2MCPIntegration, DiagnosisEntry, AuditEntry } from '../lib/mcp/r2-integration.ts';

interface AuditTrail {
  id: string;
  timestamp: string;
  errorType: string;
  errorMessage: string;
  resolution?: string;
  successfulFix?: string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface DiagnosisOptions {
  includeAuditHistory?: boolean;
  storeDiagnosis?: boolean;
  generateFix?: boolean;
  context?: string;
}

interface FixGeneration {
  originalError: string;
  suggestedFix: string;
  confidence: number;
  references: string[];
  securityConsiderations: string[];
  performanceImplications: string[];
}

export class InteractiveDocs {
  constructor(
    private mcp: BunMCPClient,
    private secrets: SecretManager,
    private r2Integration = r2MCPIntegration
  ) {}

  /**
   * Comprehensive error diagnosis with Bun docs + FactoryWager audit integration
   */
  async diagnoseError(
    error: Error, 
    options: DiagnosisOptions = {}
  ): Promise<Diagnosis> {
    const {
      includeAuditHistory = true,
      storeDiagnosis = true,
      generateFix = true,
      context = 'general'
    } = options;

    log.section('🔍 Error Diagnosis Started', 'warning');
    log.metric('Error Type', error.name, 'error');
    log.metric('Context', context, 'accent');

    try {
      await this.mcp.connect();

      // 1. Search Bun docs for error patterns and solutions
      log.info('Searching Bun documentation...');
      const docsResults = await this.searchBunDocsForError(error);

      // 2. Check audit trail for similar past errors
      let auditResults: AuditTrail[] = [];
      if (includeAuditHistory) {
        log.info('Analyzing audit trail...');
        auditResults = await this.r2Integration.searchSimilarErrors(error.name, context, 10);
      }

      // 3. Generate comprehensive fix with FactoryWager patterns
      let fix = '';
      if (generateFix) {
        log.info('Generating FactoryWager fix...');
        fix = await this.generateFactoryWagerFix(error, docsResults, auditResults, context);
      }

      // 4. Calculate confidence score
      const confidence = this.calculateConfidence(docsResults, auditResults);

      // 5. Store diagnosis for future learning
      if (storeDiagnosis) {
        await this.storeDiagnosisInR2(error, fix, auditResults, docsResults, confidence, context);
      }

      const diagnosis: Diagnosis = {
        error: error.message,
        bunDocs: docsResults,
        similarPastIssues: auditResults,
        suggestedFix: fix,
        confidence
      };

      this.displayDiagnosis(diagnosis);
      return diagnosis;

    } catch (diagnosisError) {
      log.error(`Diagnosis failed: ${diagnosisError.message}`);
      throw diagnosisError;
    }
  }

  /**
   * Interactive learning session for new APIs
   */
  async learnAPI(apiName: string, context: string = 'general'): Promise<void> {
    log.section(`🎓 Learning: ${apiName}`, 'success');
    log.metric('API', apiName, 'accent');
    log.metric('Context', context, 'info');

    try {
      await this.mcp.connect();

      // 1. Get comprehensive documentation
      const docsResults = await this.mcp.searchBunDocs(apiName, {
        generateExample: true,
        context: 'learning'
      });

      // 2. Generate FactoryWager-style example
      const example = await this.mcp.generateFactoryWagerExample(apiName, context);

      // 3. Get related security considerations
      const securityNotes = this.extractSecurityConsiderations(docsResults);

      // 4. Performance tips
      const performanceTips = this.extractPerformanceTips(docsResults);

      this.displayLearningSession(apiName, context, docsResults, example, securityNotes, performanceTips);

    } catch (error) {
      log.error(`Learning session failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Real-time code validation with suggestions
   */
  async validateCodeWithLearning(
    code: string, 
    context: string = 'general'
  ): Promise<any> {
    log.section('🔍 Code Validation & Learning', 'primary');

    try {
      await this.mcp.connect();

      // 1. Basic validation
      const validation = await this.mcp.validateCode(code);

      // 2. FactoryWager pattern validation
      const patternValidation = this.validateFactoryWagerPatterns(code, context);

      // 3. Learning suggestions
      const suggestions = await this.generateLearningSuggestions(code, context, validation);

      // 4. Security review
      const securityReview = await this.performSecurityReview(code, context);

      const result = {
        valid: validation.valid && patternValidation.valid,
        validation,
        patternValidation,
        suggestions,
        securityReview,
        overallScore: this.calculateOverallScore(validation, patternValidation, securityReview)
      };

      this.displayValidationResults(result);
      return result;

    } catch (error) {
      log.error(`Validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search Bun docs for error-specific information
   */
  private async searchBunDocsForError(error: Error): Promise<SearchResult[]> {
    const searchQueries = [
      error.message,
      error.name,
      error.constructor.name,
      ...this.extractKeywordsFromError(error)
    ];

    const allResults: SearchResult[] = [];

    for (const query of searchQueries) {
      try {
        const results = await this.mcp.searchBunDocs(query, {
          codeOnly: true,
          generateExample: true
        });
        allResults.push(...results);
      } catch (searchError) {
        log.warning(`Search failed for query: ${query}`);
      }
    }

    // Deduplicate and sort by relevance
    return this.deduplicateResults(allResults)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5); // Top 5 results
  }

  /**
   * Generate FactoryWager-specific fix with context
   */
  private async generateFactoryWagerFix(
    error: Error,
    docs: SearchResult[],
    audits: AuditTrail[],
    context: string
  ): Promise<string> {
    const baseFix = docs[0]?.content || '';
    const fwPattern = audits[0]?.successfulFix || '';
    const securityContext = await this.getSecurityContext(context);

    const fix = `
// 🔧 FactoryWager Auto-Fix v5.0
// Generated: ${new Date().toISOString()}
// Error: ${error.name}
// Context: ${context}
// Confidence: ${this.calculateConfidence(docs, audits)}%

${this.applyFactoryWagerPattern(baseFix, fwPattern)}

// 📚 Documentation References:
${docs.map(doc => `// - ${doc.links[0] || 'No link available'}`).join('\n')}

// 🛡️ Security Considerations:
${securityContext}

// 📊 Performance Notes:
${this.getPerformanceNotes(context, error)}

// 🏛️ FactoryWager Pattern Applied:
${this.explainAppliedPattern(fwPattern)}

// 📋 Audit History:
${audits.length > 0 ? 
  `✓ Found ${audits.length} similar issues in audit trail\n` +
  `✓ Most recent resolution: ${audits[0].resolution}` : 
  '⚠ No similar issues found in audit trail'
}

// 🔄 Next Steps:
${this.generateNextSteps(error, docs, audits)}
    `.trim();

    return fix;
  }

  /**
   * Store diagnosis in R2 for institutional learning
   */
  private async storeDiagnosisInR2(
    error: Error,
    fix: string,
    audits: AuditTrail[],
    docs: SearchResult[],
    confidence: number,
    context: string
  ): Promise<void> {
    const diagnosisEntry: DiagnosisEntry = {
      id: `diagnosis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      fix,
      relatedAudits: audits.map(a => a.id),
      relatedDocs: docs.map(d => d.links[0] || ''),
      confidence,
      context,
      metadata: {
        bunDocsCount: docs.length,
        auditHistoryCount: audits.length,
        hasSecurityNotes: docs.some(d => d.content.toLowerCase().includes('security')),
        factorywagerContext: context !== 'general',
      },
    };

    try {
      await this.r2Integration.storeDiagnosis(diagnosisEntry);
      log.success('Diagnosis stored in R2 for institutional learning');
    } catch (storageError) {
      log.warning(`Failed to store diagnosis in R2: ${storageError.message}`);
    }
  }

  /**
   * Display comprehensive diagnosis results
   */
  private displayDiagnosis(diagnosis: Diagnosis): void {
    console.log('\n' + colorBar('success', 50));
    console.log(styled('🎯 DIAGNOSIS COMPLETE', 'success'));
    console.log(colorBar('success', 50));

    // Error summary
    console.log(styled('\n🚨 Error Summary:', 'error'));
    console.log(styled(`   ${diagnosis.error}`, 'muted'));

    // Confidence score
    const confidenceColor = diagnosis.confidence > 0.8 ? 'success' : 
                           diagnosis.confidence > 0.6 ? 'warning' : 'error';
    console.log(styled('\n📊 Confidence Score:', 'accent'));
    console.log(styled(`   ${Math.round(diagnosis.confidence * 100)}%`, confidenceColor));

    // Documentation results
    if (diagnosis.bunDocs.length > 0) {
      console.log(styled('\n📚 Relevant Documentation:', 'primary'));
      diagnosis.bunDocs.slice(0, 3).forEach((doc, i) => {
        console.log(styled(`   ${i + 1}. ${doc.title}`, 'info'));
        if (doc.links[0]) {
          console.log(styled(`      🔗 ${doc.links[0]}`, 'muted'));
        }
      });
    }

    // Audit history
    if (diagnosis.similarPastIssues.length > 0) {
      console.log(styled('\n📋 Audit History:', 'warning'));
      console.log(styled(`   ✓ Found ${diagnosis.similarPastIssues.length} similar issues`, 'success'));
      diagnosis.similarPastIssues.slice(0, 2).forEach(audit => {
        console.log(styled(`   • ${audit.resolution}`, 'muted'));
      });
    }

    // Suggested fix
    if (diagnosis.suggestedFix) {
      console.log(styled('\n🔧 Suggested Fix:', 'success'));
      console.log(styled(diagnosis.suggestedFix, 'background', 'primary'));
    }

    console.log('\n' + colorBar('muted', 50));
  }

  /**
   * Display learning session results
   */
  private displayLearningSession(
    apiName: string,
    context: string,
    docs: SearchResult[],
    example: string,
    securityNotes: string[],
    performanceTips: string[]
  ): void {
    console.log('\n' + colorBar('accent', 60));
    console.log(styled(`🎓 LEARNING SESSION: ${apiName}`, 'accent'));
    console.log(styled(`Context: ${context}`, 'muted'));
    console.log(colorBar('accent', 60));

    // Documentation
    console.log(styled('\n📚 Official Documentation:', 'primary'));
    docs.slice(0, 2).forEach((doc, i) => {
      console.log(styled(`\n${i + 1}. ${doc.title}`, 'info'));
      console.log(styled(doc.content.slice(0, 200) + '...', 'text'));
    });

    // FactoryWager example
    console.log(styled('\n🔧 FactoryWager Example:', 'success'));
    console.log(styled(example, 'background', 'primary'));

    // Security considerations
    if (securityNotes.length > 0) {
      console.log(styled('\n🛡️ Security Considerations:', 'warning'));
      securityNotes.forEach(note => {
        console.log(styled(`   • ${note}`, 'warning'));
      });
    }

    // Performance tips
    if (performanceTips.length > 0) {
      console.log(styled('\n📊 Performance Tips:', 'info'));
      performanceTips.forEach(tip => {
        console.log(styled(`   • ${tip}`, 'info'));
      });
    }

    console.log(styled('\n💡 Next Steps:', 'success'));
    console.log(styled('   • Try the example in your code', 'muted'));
    console.log(styled('   • Experiment with different options', 'muted'));
    console.log(styled('   • Check official docs for complete reference', 'muted'));

    console.log('\n' + colorBar('muted', 60));
  }

  /**
   * Display validation results
   */
  private displayValidationResults(result: any): void {
    console.log('\n' + colorBar('primary', 50));
    
    const statusColor = result.valid ? 'success' : 'error';
    const statusText = result.valid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED';
    console.log(styled(statusText, statusColor));
    
    console.log(styled(`Overall Score: ${result.overallScore}/100`, 'accent'));
    console.log(colorBar('primary', 50));

    // Suggestions
    if (result.suggestions.length > 0) {
      console.log(styled('\n💡 Suggestions:', 'info'));
      result.suggestions.forEach((suggestion: string) => {
        console.log(styled(`   • ${suggestion}`, 'info'));
      });
    }

    // Security review
    if (result.securityReview.issues.length > 0) {
      console.log(styled('\n🛡️ Security Issues:', 'warning'));
      result.securityReview.issues.forEach((issue: string) => {
        console.log(styled(`   • ${issue}`, 'warning'));
      });
    }
  }

  // Helper methods
  private extractKeywordsFromError(error: Error): string[] {
    const message = error.message.toLowerCase();
    const keywords: string[] = [];
    
    // Common error patterns
    if (message.includes('timeout')) keywords.push('timeout');
    if (message.includes('permission')) keywords.push('permission');
    if (message.includes('network')) keywords.push('network');
    if (message.includes('file')) keywords.push('file');
    if (message.includes('memory')) keywords.push('memory');
    
    return keywords;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.title + result.content.slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateConfidence(docs: SearchResult[], audits: AuditTrail[]): number {
    let confidence = 0.3; // Base confidence
    
    if (docs.length > 0) confidence += 0.4;
    if (docs.length > 2) confidence += 0.1;
    if (audits.length > 0) confidence += 0.2;
    if (audits.some(audit => audit.successfulFix)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private applyFactoryWagerPattern(baseFix: string, fwPattern: string): string {
    if (!fwPattern) return baseFix || '// No specific pattern available';
    
    return `${baseFix}

// FactoryWager Pattern Applied:
${fwPattern}`;
  }

  private async getSecurityContext(context: string): Promise<string> {
    const contexts = {
      scanner: '• Validate all input URLs\n• Implement rate limiting\n• Log all scanning activities',
      secrets: '• Use secure storage mechanisms\n• Implement access controls\n• Audit all secret access',
      r2: '• Validate file types and sizes\n• Use secure upload mechanisms\n• Implement proper permissions',
      general: '• Follow principle of least privilege\n• Validate all inputs\n• Implement proper error handling'
    };
    
    return contexts[context] || contexts.general;
  }

  private getPerformanceNotes(context: string, error: Error): string {
    return `• Consider implementing retry logic for transient errors\n• Monitor performance metrics\n• Use caching where appropriate`;
  }

  private explainAppliedPattern(pattern: string): string {
    if (!pattern) return 'No specific pattern applied';
    return `Applied proven FactoryWager resolution pattern from audit history`;
  }

  private generateNextSteps(error: Error, docs: SearchResult[], audits: AuditTrail[]): string {
    const steps = ['1. Apply the suggested fix above'];
    
    if (docs.length > 0) {
      steps.push('2. Review the documentation links for deeper understanding');
    }
    
    if (audits.length > 0) {
      steps.push('3. Monitor for similar issues in the future');
    }
    
    steps.push('4. Test the fix in a development environment');
    steps.push('5. Update error handling if needed');
    
    return steps.join('\n');
  }

  private extractSecurityConsiderations(docs: SearchResult[]): string[] {
    const considerations: string[] = [];
    
    docs.forEach(doc => {
      if (doc.content.toLowerCase().includes('security')) {
        considerations.push('Review security implications');
      }
      if (doc.content.toLowerCase().includes('authentication')) {
        considerations.push('Ensure proper authentication');
      }
      if (doc.content.toLowerCase().includes('encryption')) {
        considerations.push('Consider encryption for sensitive data');
      }
    });
    
    return considerations.length > 0 ? considerations : ['Follow general security best practices'];
  }

  private extractPerformanceTips(docs: SearchResult[]): string[] {
    const tips: string[] = [];
    
    docs.forEach(doc => {
      if (doc.content.toLowerCase().includes('performance')) {
        tips.push('Monitor performance metrics');
      }
      if (doc.content.toLowerCase().includes('cache')) {
        tips.push('Consider caching for better performance');
      }
      if (doc.content.toLowerCase().includes('async')) {
        tips.push('Use async/await for non-blocking operations');
      }
    });
    
    return tips.length > 0 ? tips : ['Profile your code for performance bottlenecks'];
  }

  private validateFactoryWagerPatterns(code: string, context: string): any {
    // Mock pattern validation
    const issues = [];
    
    if (!code.includes('try') && !code.includes('catch')) {
      issues.push('Consider adding error handling');
    }
    
    if (context === 'scanner' && !code.includes('validate')) {
      issues.push('Scanner code should include input validation');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions: ['Add comprehensive error handling', 'Include input validation']
    };
  }

  private async generateLearningSuggestions(code: string, context: string, validation: any): Promise<string[]> {
    const suggestions = [];
    
    if (!validation.valid) {
      suggestions.push('Fix validation errors first');
    }
    
    suggestions.push('Consider adding TypeScript types for better safety');
    suggestions.push('Write unit tests for your code');
    suggestions.push('Document your code with JSDoc comments');
    
    return suggestions;
  }

  private async performSecurityReview(code: string, context: string): Promise<any> {
    const issues = [];
    
    if (code.includes('eval(')) {
      issues.push('Avoid using eval() - security risk');
    }
    
    if (code.includes('password') || code.includes('secret')) {
      issues.push('Ensure secrets are properly secured');
    }
    
    return {
      safe: issues.length === 0,
      issues,
      recommendations: ['Use environment variables for secrets', 'Validate all user inputs']
    };
  }

  private calculateOverallScore(validation: any, patternValidation: any, securityReview: any): number {
    let score = 50; // Base score
    
    if (validation.valid) score += 20;
    if (patternValidation.valid) score += 20;
    if (securityReview.safe) score += 10;
    
    return Math.min(score, 100);
  }
}

// CLI interface for interactive docs
if (import.meta.main) {
  const mcp = new BunMCPClient();
  const secrets = new SecretManager();
  const interactiveDocs = new InteractiveDocs(mcp, secrets);

  const command = Bun.argv[2];
  const args = Bun.argv.slice(3);

  try {
    switch (command) {
      case 'diagnose':
        // Simulate error diagnosis
        const error = new Error(args[0] || 'Sample error for demonstration');
        await interactiveDocs.diagnoseError(error, {
          context: args[1] || 'general',
          includeAuditHistory: true,
          storeDiagnosis: true
        });
        break;
        
      case 'learn':
        await interactiveDocs.learnAPI(args[0] || 'Bun.file', args[1] || 'general');
        break;
        
      case 'validate':
        const code = await Bun.file(args[0]).text();
        await interactiveDocs.validateCodeWithLearning(code, args[1] || 'general');
        break;
        
      default:
        console.log(styled('Interactive Documentation System', 'accent'));
        console.log(styled('Usage:', 'muted'));
        console.log(styled('  bun interactive-docs diagnose "error message" [context]', 'info'));
        console.log(styled('  bun interactive-docs learn "API name" [context]', 'info'));
        console.log(styled('  bun interactive-docs validate ./file.ts [context]', 'info'));
    }
  } catch (error) {
    log.error(`Command failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mcp.disconnect();
  }
}
