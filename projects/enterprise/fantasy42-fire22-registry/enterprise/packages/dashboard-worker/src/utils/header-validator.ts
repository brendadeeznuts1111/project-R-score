#!/usr/bin/env bun

/**
 * 🔍 Fire22 Header Validator - Comprehensive Header Testing & Validation
 * Tests security headers, CORS compliance, and system header standards
 */

import { HeaderValidator as BaseValidator } from './header-manager';

export interface HeaderValidationResult {
  url: string;
  timestamp: string;
  overallScore: number;
  securityScore: number;
  corsScore: number;
  systemScore: number;
  compliant: boolean;
  issues: string[];
  recommendations: string[];
  detailedResults: {
    security: SecurityHeaderResult;
    cors: CORSHeaderResult;
    system: SystemHeaderResult;
  };
}

export interface SecurityHeaderResult {
  score: number;
  compliant: boolean;
  issues: string[];
  recommendations: string[];
  headers: Record<string, string>;
}

export interface CORSHeaderResult {
  score: number;
  valid: boolean;
  issues: string[];
  recommendations: string[];
  headers: Record<string, string>;
}

export interface SystemHeaderResult {
  score: number;
  compliant: boolean;
  issues: string[];
  recommendations: string[];
  headers: Record<string, string>;
}

/**
 * 🔍 Enhanced Header Validator
 * Extends base validator with comprehensive testing capabilities
 */
export class EnhancedHeaderValidator extends BaseValidator {
  private testResults: HeaderValidationResult[] = [];

  constructor() {
    super();
  }

  /**
   * Comprehensive header validation for any endpoint
   */
  async validateEndpoint(url: string): Promise<HeaderValidationResult> {
    console.log(`🔍 Validating headers for: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Fire22-Header-Validator/3.0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const headers = response.headers;
      const timestamp = new Date().toISOString();

      // Validate security headers
      const securityResult = this.validateSecurityHeaders(headers);

      // Validate CORS headers
      const corsResult = this.validateCORSHeaders(headers);

      // Validate system headers
      const systemResult = this.validateSystemHeaders(headers);

      // Calculate overall score
      const overallScore = Math.round(
        (securityResult.score + corsResult.score + systemResult.score) / 3
      );

      // Determine overall compliance
      const compliant = securityResult.compliant && corsResult.valid && systemResult.compliant;

      // Collect all issues and recommendations
      const allIssues = [...securityResult.issues, ...corsResult.issues, ...systemResult.issues];

      const allRecommendations = [
        ...securityResult.recommendations,
        ...corsResult.recommendations,
        ...systemResult.recommendations,
      ];

      const result: HeaderValidationResult = {
        url,
        timestamp,
        overallScore,
        securityScore: securityResult.score,
        corsScore: corsResult.score,
        systemScore: systemResult.score,
        compliant,
        issues: allIssues,
        recommendations: allRecommendations,
        detailedResults: {
          security: securityResult,
          cors: corsResult,
          system: systemResult,
        },
      };

      // Store result
      this.testResults.push(result);

      console.log(`✅ Validation completed for ${url}`);
      console.log(`📊 Overall Score: ${overallScore}/100`);
      console.log(`🔐 Security: ${securityResult.score}/100`);
      console.log(`🌐 CORS: ${corsResult.score}/100`);
      console.log(`🏷️ System: ${systemResult.score}/100`);

      return result;
    } catch (error) {
      console.error(`❌ Failed to validate ${url}:`, error);

      return {
        url,
        timestamp: new Date().toISOString(),
        overallScore: 0,
        securityScore: 0,
        corsScore: 0,
        systemScore: 0,
        compliant: false,
        issues: [`Failed to connect: ${error.message}`],
        recommendations: ['Check if the endpoint is accessible and responding'],
        detailedResults: {
          security: { score: 0, compliant: false, issues: [], recommendations: [], headers: {} },
          cors: { score: 0, valid: false, issues: [], recommendations: [], headers: {} },
          system: { score: 0, compliant: false, issues: [], recommendations: [], headers: {} },
        },
      };
    }
  }

  /**
   * Enhanced system header validation
   */
  validateSystemHeaders(headers: Headers): SystemHeaderResult {
    const requiredSystemHeaders = [
      'X-Fire22-Version',
      'X-Fire22-Build',
      'X-Fire22-Environment',
      'X-Fire22-Security',
    ];

    const recommendedSystemHeaders = [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Trace-ID',
      'X-API-Version',
      'X-API-Endpoint',
      'X-API-Method',
    ];

    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];
    const headerValues: Record<string, string> = {};

    // Check required headers
    requiredSystemHeaders.forEach(header => {
      const value = headers.get(header);
      headerValues[header] = value || '';

      if (value) {
        score += 25; // 25 points per required header
      } else {
        issues.push(`Missing required system header: ${header}`);
        recommendations.push(`Add ${header} header for system identification`);
      }
    });

    // Check recommended headers
    recommendedSystemHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        headerValues[header] = value;
        score = Math.min(score + 5, 100); // 5 points per recommended header
      } else {
        recommendations.push(`Consider adding ${header} header for enhanced tracking`);
      }
    });

    // Validate header values
    const version = headers.get('X-Fire22-Version');
    if (version && !this.isValidVersion(version)) {
      issues.push('Invalid version format in X-Fire22-Version');
      recommendations.push('Use semantic versioning format (e.g., 3.0.9)');
    }

    const environment = headers.get('X-Fire22-Environment');
    if (environment && !['development', 'staging', 'production'].includes(environment)) {
      issues.push('Invalid environment value in X-Fire22-Environment');
      recommendations.push('Use valid environment: development, staging, or production');
    }

    return {
      score: Math.min(score, 100),
      compliant: score >= 80,
      issues,
      recommendations,
      headers: headerValues,
    };
  }

  /**
   * Enhanced CORS header validation with scoring
   */
  validateCORSHeaders(headers: Headers): CORSHeaderResult {
    const requiredCORSHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
    ];

    const recommendedCORSHeaders = [
      'Access-Control-Allow-Credentials',
      'Access-Control-Max-Age',
      'Access-Control-Expose-Headers',
    ];

    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];
    const headerValues: Record<string, string> = {};

    // Check required CORS headers
    requiredCORSHeaders.forEach(header => {
      const value = headers.get(header);
      headerValues[header] = value || '';

      if (value) {
        score += 30; // 30 points per required header
      } else {
        issues.push(`Missing required CORS header: ${header}`);
        recommendations.push(`Add ${header} header for CORS compliance`);
      }
    });

    // Check recommended CORS headers
    recommendedCORSHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        headerValues[header] = value;
        score = Math.min(score + 10, 100); // 10 points per recommended header
      } else {
        recommendations.push(`Consider adding ${header} header for enhanced CORS support`);
      }
    });

    // Validate specific header values
    const origin = headers.get('Access-Control-Allow-Origin');
    if (origin === '*') {
      issues.push('Wildcard CORS origin may pose security risks in production');
      recommendations.push('Restrict CORS origin to specific domains in production');
    }

    const methods = headers.get('Access-Control-Allow-Methods');
    if (methods && methods.includes('DELETE') && !methods.includes('OPTIONS')) {
      issues.push('DELETE method requires OPTIONS method for preflight requests');
      recommendations.push('Include OPTIONS method when DELETE is allowed');
    }

    const credentials = headers.get('Access-Control-Allow-Credentials');
    if (credentials === 'true' && origin === '*') {
      issues.push('Credentials cannot be true with wildcard origin');
      recommendations.push('Set specific origin when allowing credentials');
    }

    return {
      score: Math.min(score, 100),
      valid: score >= 60,
      issues,
      recommendations,
      headers: headerValues,
    };
  }

  /**
   * Enhanced security header validation with detailed scoring
   */
  validateSecurityHeaders(headers: Headers): SecurityHeaderResult {
    const mandatoryHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
    ];

    const additionalHeaders = [
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Permitted-Cross-Domain-Policies',
      'X-Download-Options',
      'X-DNS-Prefetch-Control',
    ];

    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];
    const headerValues: Record<string, string> = {};

    // Check mandatory security headers
    mandatoryHeaders.forEach(header => {
      const value = headers.get(header);
      headerValues[header] = value || '';

      if (value) {
        score += 20; // 20 points per mandatory header

        // Validate header values
        const validation = this.validateSecurityHeaderValue(header, value);
        if (!validation.valid) {
          issues.push(`Invalid ${header} value: ${validation.issue}`);
          recommendations.push(validation.recommendation);
        }
      } else {
        issues.push(`Missing mandatory security header: ${header}`);
        recommendations.push(`Add ${header} header for security compliance`);
      }
    });

    // Check additional security headers
    additionalHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        headerValues[header] = value;
        score = Math.min(score + 10, 100); // 10 points per additional header

        // Validate header values
        const validation = this.validateSecurityHeaderValue(header, value);
        if (!validation.valid) {
          issues.push(`Invalid ${header} value: ${validation.issue}`);
          recommendations.push(validation.recommendation);
        }
      } else {
        recommendations.push(`Consider adding ${header} header for enhanced security`);
      }
    });

    return {
      score: Math.min(score, 100),
      compliant: score >= 80,
      issues,
      recommendations,
      headers: headerValues,
    };
  }

  /**
   * Validate specific security header values
   */
  private validateSecurityHeaderValue(
    header: string,
    value: string
  ): {
    valid: boolean;
    issue?: string;
    recommendation?: string;
  } {
    switch (header) {
      case 'Strict-Transport-Security':
        if (!value.includes('max-age=')) {
          return {
            valid: false,
            issue: 'Missing max-age directive',
            recommendation: 'Include max-age directive (e.g., max-age=31536000)',
          };
        }
        break;

      case 'Content-Security-Policy':
        if (!value.includes('default-src')) {
          return {
            valid: false,
            issue: 'Missing default-src directive',
            recommendation: 'Include default-src directive for CSP compliance',
          };
        }
        break;

      case 'X-Frame-Options':
        if (!['DENY', 'SAMEORIGIN'].includes(value) && !value.startsWith('ALLOW-FROM')) {
          return {
            valid: false,
            issue: 'Invalid X-Frame-Options value',
            recommendation: 'Use DENY, SAMEORIGIN, or ALLOW-FROM directive',
          };
        }
        break;

      case 'X-XSS-Protection':
        if (!value.includes('1') && !value.includes('0')) {
          return {
            valid: false,
            issue: 'Invalid X-XSS-Protection value',
            recommendation: 'Use 1 or 0 value for X-XSS-Protection',
          };
        }
        break;

      case 'Referrer-Policy':
        const validPolicies = [
          'no-referrer',
          'no-referrer-when-downgrade',
          'origin',
          'origin-when-cross-origin',
          'same-origin',
          'strict-origin',
          'strict-origin-when-cross-origin',
          'unsafe-url',
        ];
        if (!validPolicies.includes(value)) {
          return {
            valid: false,
            issue: 'Invalid Referrer-Policy value',
            recommendation: `Use valid policy: ${validPolicies.join(', ')}`,
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validate version format
   */
  private isValidVersion(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport(): string {
    if (this.testResults.length === 0) {
      return 'No validation results available. Run validateEndpoint() first.';
    }

    let report = `# 🔍 Fire22 Header Validation Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Total Endpoints Tested**: ${this.testResults.length}\n\n`;

    // Summary statistics
    const avgScore = Math.round(
      this.testResults.reduce((sum, result) => sum + result.overallScore, 0) /
        this.testResults.length
    );

    const compliantCount = this.testResults.filter(result => result.compliant).length;
    const complianceRate = Math.round((compliantCount / this.testResults.length) * 100);

    report += `## 📊 Summary Statistics\n\n`;
    report += `- **Average Overall Score**: ${avgScore}/100\n`;
    report += `- **Compliance Rate**: ${complianceRate}% (${compliantCount}/${this.testResults.length})\n`;
    report += `- **Total Issues Found**: ${this.testResults.reduce((sum, result) => sum + result.issues.length, 0)}\n`;
    report += `- **Total Recommendations**: ${this.testResults.reduce((sum, result) => sum + result.recommendations.length, 0)}\n\n`;

    // Detailed results for each endpoint
    report += `## 🔍 Detailed Results\n\n`;

    this.testResults.forEach((result, index) => {
      report += `### ${index + 1}. ${result.url}\n\n`;
      report += `- **Overall Score**: ${result.overallScore}/100\n`;
      report += `- **Security Score**: ${result.securityScore}/100\n`;
      report += `- **CORS Score**: ${result.corsScore}/100\n`;
      report += `- **System Score**: ${result.systemScore}/100\n`;
      report += `- **Compliant**: ${result.compliant ? '✅ Yes' : '❌ No'}\n`;
      report += `- **Timestamp**: ${result.timestamp}\n\n`;

      if (result.issues.length > 0) {
        report += `#### 🚨 Issues Found\n\n`;
        result.issues.forEach(issue => {
          report += `- ❌ ${issue}\n`;
        });
        report += `\n`;
      }

      if (result.recommendations.length > 0) {
        report += `#### 💡 Recommendations\n\n`;
        result.recommendations.forEach(rec => {
          report += `- 💡 ${rec}\n`;
        });
        report += `\n`;
      }

      report += `---\n\n`;
    });

    // Top recommendations
    const allRecommendations = this.testResults.flatMap(result => result.recommendations);
    const recommendationCounts = allRecommendations.reduce(
      (counts, rec) => {
        counts[rec] = (counts[rec] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topRecommendations.length > 0) {
      report += `## 🎯 Top Recommendations\n\n`;
      topRecommendations.forEach(([rec, count]) => {
        report += `- 💡 ${rec} (${count} endpoints)\n`;
      });
      report += `\n`;
    }

    return report;
  }

  /**
   * Export validation results to JSON
   */
  exportResultsToJSON(): string {
    return JSON.stringify(
      {
        metadata: {
          generated: new Date().toISOString(),
          validator: 'Fire22-Header-Validator/3.0.9',
          totalEndpoints: this.testResults.length,
        },
        results: this.testResults,
      },
      null,
      2
    );
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
    console.log('🧹 Test results cleared');
  }

  /**
   * Get test results
   */
  getResults(): HeaderValidationResult[] {
    return [...this.testResults];
  }
}

/**
 * 🚀 Header Validator Factory
 * Creates validators with specific configurations
 */
export class HeaderValidatorFactory {
  /**
   * Create validator for production environments
   */
  static createProductionValidator(): EnhancedHeaderValidator {
    const validator = new EnhancedHeaderValidator();
    // Production-specific configuration can be added here
    return validator;
  }

  /**
   * Create validator for development environments
   */
  static createDevelopmentValidator(): EnhancedHeaderValidator {
    const validator = new EnhancedHeaderValidator();
    // Development-specific configuration can be added here
    return validator;
  }

  /**
   * Create validator for security audits
   */
  static createSecurityAuditValidator(): EnhancedHeaderValidator {
    const validator = new EnhancedHeaderValidator();
    // Security audit-specific configuration can be added here
    return validator;
  }
}

// Export default instance
export default new EnhancedHeaderValidator();
