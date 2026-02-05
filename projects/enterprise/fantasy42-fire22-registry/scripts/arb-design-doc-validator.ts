#!/usr/bin/env bun

/**
 * 🏛️ ARB Design Document Validator
 *
 * Validates that PRs requiring ARB approval have proper design documentation.
 * Checks for ARB-Design-Doc tags and validates design document completeness.
 *
 * Usage:
 *   bun run scripts/arb-design-doc-validator.ts --pr <number> --repo <owner/repo>
 *   bun run scripts/arb-design-doc-validator.ts --validate <design-doc-path>
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations
import * as fs from 'fs';
import { join } from 'path';

interface ARBDesignDoc {
  version: string;
  title: string;
  author: string;
  reviewers: string[];
  arbTicket: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpact: {
    users: number;
    performance: string;
    security: string;
    cost: string;
  };
  architecturalChanges: {
    newServices: string[];
    modifiedServices: string[];
    deprecatedServices: string[];
    databaseChanges: string[];
    apiChanges: string[];
  };
  complianceRequirements: {
    gdpr: boolean;
    securityAudit: boolean;
    performanceReview: boolean;
    costAnalysis: boolean;
  };
  implementation: {
    timeline: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    rollbackPlan: string;
    testingStrategy: string;
  };
  playbookCompliance: {
    tenets: string[];
    lenses: string[];
    exceptions: string[];
  };
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

interface ValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'structure' | 'content' | 'compliance' | 'implementation';
  field: string;
  message: string;
  suggestion: string;
}

class ARBDesignDocValidator {
  private requiredFields = [
    'version',
    'title',
    'author',
    'arbTicket',
    'priority',
    'architecturalChanges',
    'complianceRequirements',
    'implementation',
    'playbookCompliance',
  ];

  private requiredSections = [
    'estimatedImpact',
    'architecturalChanges',
    'complianceRequirements',
    'implementation',
    'playbookCompliance',
  ];

  async validateDesignDoc(designDocPath: string): Promise<ValidationResult> {
    console.log(`🔍 Validating ARB Design Document: ${designDocPath}`);

    const result: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      recommendations: [],
    };

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      if (!(await Bun.file(designDocPath).exists())) {
        result.issues.push({
          severity: 'ERROR',
          category: 'structure',
          field: 'file',
          message: 'ARB Design Document file does not exist',
          suggestion: 'Create design document in docs/arb-design-docs/ directory',
        });
        result.isValid = false;
        result.score = 0;
        return result;
      }

      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const content = await Bun.file(designDocPath).text();
      const designDoc = this.parseDesignDoc(content);

      // Validate structure
      this.validateStructure(designDoc, result);

      // Validate content completeness
      this.validateContent(designDoc, result);

      // Validate compliance
      this.validateCompliance(designDoc, result);

      // Calculate final score
      result.score = this.calculateScore(result.issues);

      console.log(`✅ Design document validation complete (Score: ${result.score}%)`);

      return result;
    } catch (error) {
      console.error('❌ Design document validation failed:', error);
      result.issues.push({
        severity: 'ERROR',
        category: 'structure',
        field: 'parsing',
        message: 'Failed to parse design document',
        suggestion: 'Ensure document is valid JSON or YAML format',
      });
      result.isValid = false;
      result.score = 0;
      return result;
    }
  }

  private parseDesignDoc(content: string): ARBDesignDoc {
    try {
      // Try JSON first
      return JSON.parse(content);
    } catch {
      // Try YAML if JSON fails
      // For now, return empty object - would need yaml parser
      throw new Error('Design document must be valid JSON format');
    }
  }

  private validateStructure(designDoc: ARBDesignDoc, result: ValidationResult): void {
    // Check required fields
    for (const field of this.requiredFields) {
      if (!(field in designDoc)) {
        result.issues.push({
          severity: 'ERROR',
          category: 'structure',
          field,
          message: `Required field '${field}' is missing`,
          suggestion: `Add '${field}' field to design document`,
        });
        result.isValid = false;
      }
    }

    // Check required sections
    for (const section of this.requiredSections) {
      if (!(section in designDoc)) {
        result.issues.push({
          severity: 'ERROR',
          category: 'structure',
          field: section,
          message: `Required section '${section}' is missing`,
          suggestion: `Add '${section}' section to design document`,
        });
        result.isValid = false;
      }
    }
  }

  private validateContent(designDoc: ARBDesignDoc, result: ValidationResult): void {
    // Validate title
    if (!designDoc.title || designDoc.title.length < 10) {
      result.issues.push({
        severity: 'WARNING',
        category: 'content',
        field: 'title',
        message: 'Title is too short or missing',
        suggestion: 'Provide descriptive title (minimum 10 characters)',
      });
    }

    // Validate ARB ticket format
    if (!designDoc.arbTicket || !designDoc.arbTicket.match(/^ARB-\d{4}-\d{3}$/)) {
      result.issues.push({
        severity: 'ERROR',
        category: 'content',
        field: 'arbTicket',
        message: 'Invalid ARB ticket format',
        suggestion: 'Use format: ARB-YYYY-NNN (e.g., ARB-2025-001)',
      });
      result.isValid = false;
    }

    // Validate reviewers
    if (!designDoc.reviewers || designDoc.reviewers.length < 2) {
      result.issues.push({
        severity: 'WARNING',
        category: 'content',
        field: 'reviewers',
        message: 'Insufficient reviewers listed',
        suggestion: 'Include at least 2 reviewers (ARB members preferred)',
      });
    }

    // Validate architectural changes
    if (designDoc.architecturalChanges) {
      const changes = designDoc.architecturalChanges;
      const totalChanges =
        (changes.newServices?.length || 0) +
        (changes.modifiedServices?.length || 0) +
        (changes.deprecatedServices?.length || 0);

      if (totalChanges === 0) {
        result.issues.push({
          severity: 'WARNING',
          category: 'content',
          field: 'architecturalChanges',
          message: 'No architectural changes documented',
          suggestion: 'Document all services affected by this change',
        });
      }
    }

    // Validate implementation details
    if (designDoc.implementation) {
      if (!designDoc.implementation.timeline || designDoc.implementation.timeline.length < 5) {
        result.issues.push({
          severity: 'WARNING',
          category: 'implementation',
          field: 'timeline',
          message: 'Implementation timeline is insufficient',
          suggestion: 'Provide detailed timeline with milestones',
        });
      }

      if (
        !designDoc.implementation.rollbackPlan ||
        designDoc.implementation.rollbackPlan.length < 20
      ) {
        result.issues.push({
          severity: 'ERROR',
          category: 'implementation',
          field: 'rollbackPlan',
          message: 'Rollback plan is inadequate',
          suggestion: 'Provide comprehensive rollback strategy',
        });
        result.isValid = false;
      }
    }
  }

  private validateCompliance(designDoc: ARBDesignDoc, result: ValidationResult): void {
    // Validate playbook compliance
    if (designDoc.playbookCompliance) {
      const compliance = designDoc.playbookCompliance;

      // Check tenets alignment
      if (!compliance.tenets || compliance.tenets.length < 3) {
        result.issues.push({
          severity: 'WARNING',
          category: 'compliance',
          field: 'tenets',
          message: 'Insufficient tenets alignment documented',
          suggestion: 'Map design to at least 3 of the 3 supreme tenets',
        });
      }

      // Check decision lenses
      if (!compliance.lenses || compliance.lenses.length < 2) {
        result.issues.push({
          severity: 'WARNING',
          category: 'compliance',
          field: 'lenses',
          message: 'Limited decision lens evaluation',
          suggestion: 'Evaluate design through at least 2 of the 3 lenses',
        });
      }

      // Check for exceptions
      if (compliance.exceptions && compliance.exceptions.length > 0) {
        result.issues.push({
          severity: 'INFO',
          category: 'compliance',
          field: 'exceptions',
          message: 'Playbook exceptions requested',
          suggestion: 'Ensure ARB approval for all exceptions',
        });
      }
    }

    // Validate compliance requirements
    if (designDoc.complianceRequirements) {
      const compliance = designDoc.complianceRequirements;

      if (compliance.gdpr && !designDoc.implementation?.testingStrategy?.includes('GDPR')) {
        result.issues.push({
          severity: 'WARNING',
          category: 'compliance',
          field: 'gdpr',
          message: 'GDPR compliance required but testing strategy incomplete',
          suggestion: 'Include GDPR compliance testing in implementation plan',
        });
      }

      if (
        compliance.securityAudit &&
        !designDoc.implementation?.testingStrategy?.includes('security')
      ) {
        result.issues.push({
          severity: 'WARNING',
          category: 'compliance',
          field: 'securityAudit',
          message: 'Security audit required but testing strategy incomplete',
          suggestion: 'Include security testing in implementation plan',
        });
      }
    }
  }

  private calculateScore(issues: ValidationIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'ERROR':
          score -= 20;
          break;
        case 'WARNING':
          score -= 10;
          break;
        case 'INFO':
          score -= 2;
          break;
      }
    }

    return Math.max(0, score);
  }

  async validatePR(prNumber: number, repo: string): Promise<ValidationResult> {
    console.log(`🔍 Validating PR #${prNumber} in ${repo}`);

    const result: ValidationResult = {
      isValid: false,
      score: 0,
      issues: [],
      recommendations: [],
    };

    try {
      // This would integrate with GitHub API to check PR content
      // For now, we'll check local ARB design docs
      const designDocPath = `docs/arb-design-docs/pr-${prNumber}.json`;

      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      if (!(await Bun.file(designDocPath).exists())) {
        result.issues.push({
          severity: 'ERROR',
          category: 'structure',
          field: 'arbDesignDoc',
          message: 'ARB Design Document not found for PR',
          suggestion:
            'Create ARB design document and reference it in PR description with ARB-Design-Doc: tag',
        });
        result.isValid = false;
        return result;
      }

      // Validate the design document
      return await this.validateDesignDoc(designDocPath);
    } catch (error) {
      console.error('❌ PR validation failed:', error);
      result.issues.push({
        severity: 'ERROR',
        category: 'structure',
        field: 'validation',
        message: 'Failed to validate PR',
        suggestion: 'Check PR format and ensure ARB design document exists',
      });
      return result;
    }
  }

  generateReport(
    result: ValidationResult,
    format: 'console' | 'json' | 'markdown' = 'console'
  ): string {
    switch (format) {
      case 'console':
        return this.generateConsoleReport(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'markdown':
        return this.generateMarkdownReport(result);
      default:
        return this.generateConsoleReport(result);
    }
  }

  private generateConsoleReport(result: ValidationResult): string {
    let report = '\n🏛️ ARB Design Document Validation Report\n';
    report += '='.repeat(50) + '\n\n';

    report += `📊 Overall Score: ${result.score}/100\n`;
    report += `✅ Valid: ${result.isValid ? 'Yes' : 'No'}\n\n`;

    if (result.issues.length > 0) {
      report += '🚨 Issues Found:\n\n';

      const errors = result.issues.filter(i => i.severity === 'ERROR');
      const warnings = result.issues.filter(i => i.severity === 'WARNING');
      const infos = result.issues.filter(i => i.severity === 'INFO');

      if (errors.length > 0) {
        report += '🔴 ERRORS:\n';
        errors.forEach(issue => {
          report += `  • ${issue.field}: ${issue.message}\n`;
          report += `    💡 ${issue.suggestion}\n\n`;
        });
      }

      if (warnings.length > 0) {
        report += '🟡 WARNINGS:\n';
        warnings.forEach(issue => {
          report += `  • ${issue.field}: ${issue.message}\n`;
          report += `    💡 ${issue.suggestion}\n\n`;
        });
      }

      if (infos.length > 0) {
        report += 'ℹ️  INFO:\n';
        infos.forEach(issue => {
          report += `  • ${issue.field}: ${issue.message}\n`;
          report += `    💡 ${issue.suggestion}\n\n`;
        });
      }
    }

    if (result.recommendations.length > 0) {
      report += '💡 Recommendations:\n';
      result.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }

    if (result.isValid && result.score >= 80) {
      report += '✅ Design document validation PASSED\n';
    } else {
      report += '❌ Design document validation FAILED\n';
    }

    return report;
  }

  private generateMarkdownReport(result: ValidationResult): string {
    let report = '# 🏛️ ARB Design Document Validation Report\n\n';

    report += `**Overall Score:** ${result.score}/100\n\n`;
    report += `**Valid:** ${result.isValid ? '✅ Yes' : '❌ No'}\n\n`;

    if (result.issues.length > 0) {
      report += '## 🚨 Issues Found\n\n';

      const errors = result.issues.filter(i => i.severity === 'ERROR');
      const warnings = result.issues.filter(i => i.severity === 'WARNING');

      if (errors.length > 0) {
        report += '### 🔴 Errors\n\n';
        errors.forEach(issue => {
          report += `- **${issue.field}:** ${issue.message}\n`;
          report += `  - *Suggestion:* ${issue.suggestion}\n\n`;
        });
      }

      if (warnings.length > 0) {
        report += '### 🟡 Warnings\n\n';
        warnings.forEach(issue => {
          report += `- **${issue.field}:** ${issue.message}\n`;
          report += `  - *Suggestion:* ${issue.suggestion}\n\n`;
        });
      }
    }

    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🏛️ ARB Design Document Validator

Usage:
  bun run scripts/arb-design-doc-validator.ts --validate <design-doc-path>
  bun run scripts/arb-design-doc-validator.ts --pr <number> --repo <owner/repo>

Examples:
  bun run scripts/arb-design-doc-validator.ts --validate docs/arb-design-docs/feature-x.json
  bun run scripts/arb-design-doc-validator.ts --pr 123 --repo fantasy42/fire22
    `);
    process.exit(0);
  }

  const validator = new ARBDesignDocValidator();

  try {
    let result: ValidationResult;

    if (args[0] === '--validate' && args[1]) {
      result = await validator.validateDesignDoc(args[1]);
    } else if (args[0] === '--pr' && args[2] === '--repo') {
      const prNumber = parseInt(args[1]);
      const repo = args[3];
      result = await validator.validatePR(prNumber, repo);
    } else {
      console.error('❌ Invalid arguments');
      process.exit(1);
    }

    // Output result
    const report = validator.generateReport(result, 'console');
    console.log(report);

    // Exit with appropriate code
    if (result.isValid && result.score >= 80) {
      console.log('✅ ARB Design Document validation PASSED');
      process.exit(0);
    } else {
      console.log('❌ ARB Design Document validation FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ ARB Design Document Validator failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
