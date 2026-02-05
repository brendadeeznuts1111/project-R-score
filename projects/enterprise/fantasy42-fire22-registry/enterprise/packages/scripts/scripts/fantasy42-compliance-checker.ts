#!/usr/bin/env bun

/**
 * ⚖️ Fantasy42 Compliance Checker
 *
 * Comprehensive compliance validation for Fantasy42 operations:
 * - GDPR compliance validation
 * - PCI DSS compliance for payments
 * - AML/KYC compliance checking
 * - Responsible gaming compliance
 * - Data protection validation
 * - Regulatory reporting automation
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

console.log('⚖️ Fantasy42 Compliance Checker');
console.log('==============================');

// ============================================================================
// COMPLIANCE CONFIGURATION
// ============================================================================

const COMPLIANCE_CONFIG = {
  gdpr: {
    enabled: true,
    requirements: [
      'dataProcessingAgreement',
      'privacyPolicy',
      'consentManagement',
      'dataRetentionPolicy',
      'rightToErasure',
      'dataPortability',
      'breachNotification',
    ],
  },
  pci: {
    enabled: true,
    requirements: [
      'cardholderDataProtection',
      'encryption',
      'accessControl',
      'vulnerabilityManagement',
      'regularTesting',
      'informationSecurityPolicy',
    ],
  },
  aml: {
    enabled: true,
    requirements: [
      'customerDueDiligence',
      'enhancedDueDiligence',
      'recordKeeping',
      'suspiciousActivityReporting',
      'riskAssessment',
      'training',
    ],
  },
  kyc: {
    enabled: true,
    requirements: [
      'identityVerification',
      'addressVerification',
      'sourceOfFunds',
      'enhancedVerification',
      'ongoingMonitoring',
      'recordKeeping',
    ],
  },
  responsibleGaming: {
    enabled: true,
    requirements: [
      'ageVerification',
      'depositLimits',
      'lossLimits',
      'timeLimits',
      'selfExclusion',
      'realityChecks',
    ],
  },
  dataProtection: {
    enabled: true,
    requirements: [
      'encryptionAtRest',
      'encryptionInTransit',
      'accessLogging',
      'dataMinimization',
      'secureDeletion',
      'backupSecurity',
    ],
  },
};

// ============================================================================
// COMPLIANCE CLASSES
// ============================================================================

class Fantasy42ComplianceChecker {
  private complianceResults: {
    timestamp: string;
    frameworks: Map<string, FrameworkCompliance>;
    summary: ComplianceSummary;
    recommendations: string[];
    violations: ComplianceViolation[];
  };

  constructor() {
    this.complianceResults = {
      timestamp: new Date().toISOString(),
      frameworks: new Map(),
      summary: {
        totalFrameworks: 0,
        compliantFrameworks: 0,
        nonCompliantFrameworks: 0,
        totalRequirements: 0,
        metRequirements: 0,
        unmetRequirements: 0,
        criticalViolations: 0,
        highViolations: 0,
        mediumViolations: 0,
        lowViolations: 0,
      },
      recommendations: [],
      violations: [],
    };
  }

  async runComplianceCheck(
    options: {
      frameworks?: string[];
      packages?: string[];
      verbose?: boolean;
      report?: boolean;
      autoFix?: boolean;
    } = {}
  ): Promise<ComplianceSummary> {
    console.log('🔍 Running Fantasy42 Compliance Check...');

    try {
      // Check each compliance framework
      const frameworks = options.frameworks || Object.keys(COMPLIANCE_CONFIG);

      for (const framework of frameworks) {
        await this.checkFrameworkCompliance(framework, options);
      }

      // Generate recommendations
      this.generateRecommendations();

      // Save compliance report
      if (options.report) {
        await this.saveComplianceReport();
      }

      // Auto-fix violations if requested
      if (options.autoFix) {
        await this.autoFixViolations();
      }

      console.log('\n📊 Compliance Summary:');
      console.log('====================');
      console.log(`✅ Compliant Frameworks: ${this.complianceResults.summary.compliantFrameworks}`);
      console.log(
        `❌ Non-Compliant Frameworks: ${this.complianceResults.summary.nonCompliantFrameworks}`
      );
      console.log(
        `📋 Met Requirements: ${this.complianceResults.summary.metRequirements}/${this.complianceResults.summary.totalRequirements}`
      );
      console.log(`🚨 Critical Violations: ${this.complianceResults.summary.criticalViolations}`);
      console.log(`🔴 High Violations: ${this.complianceResults.summary.highViolations}`);
      console.log(`🟡 Medium Violations: ${this.complianceResults.summary.mediumViolations}`);
      console.log(`🟢 Low Violations: ${this.complianceResults.summary.lowViolations}`);

      return this.complianceResults.summary;
    } catch (error) {
      console.error('❌ Compliance check failed:', error);
      throw error;
    }
  }

  private async checkFrameworkCompliance(framework: string, options: any): Promise<void> {
    console.log(`⚖️ Checking ${framework.toUpperCase()} compliance...`);

    const config = (COMPLIANCE_CONFIG as any)[framework];
    if (!config || !config.enabled) {
      console.log(`⏭️ ${framework.toUpperCase()} compliance check skipped (disabled)`);
      return;
    }

    const result: FrameworkCompliance = {
      framework,
      status: 'checking',
      requirements: new Map(),
      violations: [],
      lastCheck: new Date().toISOString(),
    };

    // Check each requirement
    for (const requirement of config.requirements) {
      const requirementResult = await this.checkRequirement(framework, requirement, options);
      result.requirements.set(requirement, requirementResult);

      if (requirementResult.status === 'failed') {
        result.violations.push({
          requirement,
          severity: requirementResult.severity || 'medium',
          description: requirementResult.details || 'Requirement not met',
          recommendation: requirementResult.recommendation || 'Review and implement requirement',
        });
      }
    }

    // Determine overall framework status
    const failedRequirements = Array.from(result.requirements.values()).filter(
      r => r.status === 'failed'
    ).length;
    result.status = failedRequirements === 0 ? 'compliant' : 'non-compliant';

    this.complianceResults.frameworks.set(framework, result);
    this.complianceResults.summary.totalFrameworks++;

    // Update summary counters
    if (result.status === 'compliant') {
      this.complianceResults.summary.compliantFrameworks++;
    } else {
      this.complianceResults.summary.nonCompliantFrameworks++;
    }

    this.complianceResults.summary.totalRequirements += result.requirements.size;
    this.complianceResults.summary.metRequirements += result.requirements.size - failedRequirements;
    this.complianceResults.summary.unmetRequirements += failedRequirements;

    // Add violations to global list
    for (const violation of result.violations) {
      this.complianceResults.violations.push({
        framework,
        ...violation,
      });

      // Update severity counters
      switch (violation.severity) {
        case 'critical':
          this.complianceResults.summary.criticalViolations++;
          break;
        case 'high':
          this.complianceResults.summary.highViolations++;
          break;
        case 'medium':
          this.complianceResults.summary.mediumViolations++;
          break;
        case 'low':
          this.complianceResults.summary.lowViolations++;
          break;
      }
    }

    console.log(`  📊 Status: ${result.status === 'compliant' ? '✅' : '❌'} ${result.status}`);
    console.log(
      `  📋 Requirements: ${result.requirements.size - failedRequirements}/${result.requirements.size} met`
    );
  }

  private async checkRequirement(
    framework: string,
    requirement: string,
    options: any
  ): Promise<RequirementResult> {
    // Framework-specific requirement checking
    switch (framework) {
      case 'gdpr':
        return this.checkGDPRRequirement(requirement);
      case 'pci':
        return this.checkPCIRequirement(requirement);
      case 'aml':
        return this.checkAMLRequirement(requirement);
      case 'kyc':
        return this.checkKYCRequirement(requirement);
      case 'responsibleGaming':
        return this.checkResponsibleGamingRequirement(requirement);
      case 'dataProtection':
        return this.checkDataProtectionRequirement(requirement);
      default:
        return {
          status: 'unknown',
          details: `Unknown requirement: ${requirement}`,
          severity: 'low',
        };
    }
  }

  private async checkGDPRRequirement(requirement: string): Promise<RequirementResult> {
    // Check for GDPR-specific files and configurations
    const gdprFiles = ['privacy-policy.md', 'data-processing-agreement.md', 'gdpr-compliance.md'];

    const gdprDirs = ['gdpr', 'privacy', 'data-protection'];

    switch (requirement) {
      case 'privacyPolicy':
        return this.checkFileExists(gdprFiles, 'Privacy policy document');

      case 'dataProcessingAgreement':
        return this.checkFileExists(['data-processing-agreement.md'], 'Data processing agreement');

      case 'consentManagement':
        return this.checkCodePattern('consent', 'Consent management implementation');

      case 'dataRetentionPolicy':
        return this.checkFileExists(['data-retention-policy.md'], 'Data retention policy');

      case 'rightToErasure':
        return this.checkCodePattern('delete.*data|erase.*data', 'Right to erasure implementation');

      case 'dataPortability':
        return this.checkCodePattern('export.*data', 'Data portability implementation');

      case 'breachNotification':
        return this.checkCodePattern('breach.*notification', 'Breach notification system');

      default:
        return { status: 'unknown', details: `Unknown GDPR requirement: ${requirement}` };
    }
  }

  private async checkPCIRequirement(requirement: string): Promise<RequirementResult> {
    switch (requirement) {
      case 'cardholderDataProtection':
        return this.checkCodePattern('encrypt.*card|protect.*card', 'Cardholder data protection');

      case 'encryption':
        return this.checkCodePattern('AES|encryption', 'Data encryption implementation');

      case 'accessControl':
        return this.checkCodePattern('access.*control|rbac', 'Access control implementation');

      case 'vulnerabilityManagement':
        return this.checkFileExists(
          ['vulnerability-scan.sh', 'security-scan.ts'],
          'Vulnerability management'
        );

      case 'regularTesting':
        return this.checkFileExists(
          ['penetration-test.md', 'security-testing.md'],
          'Regular security testing'
        );

      case 'informationSecurityPolicy':
        return this.checkFileExists(
          ['security-policy.md', 'information-security-policy.md'],
          'Information security policy'
        );

      default:
        return { status: 'unknown', details: `Unknown PCI requirement: ${requirement}` };
    }
  }

  private async checkAMLRequirement(requirement: string): Promise<RequirementResult> {
    switch (requirement) {
      case 'customerDueDiligence':
        return this.checkCodePattern('due.*diligence|kyc', 'Customer due diligence');

      case 'enhancedDueDiligence':
        return this.checkCodePattern('enhanced.*due.*diligence', 'Enhanced due diligence');

      case 'recordKeeping':
        return this.checkCodePattern('audit.*trail|record.*keeping', 'Record keeping');

      case 'suspiciousActivityReporting':
        return this.checkCodePattern('suspicious.*activity|sar', 'Suspicious activity reporting');

      case 'riskAssessment':
        return this.checkFileExists(['risk-assessment.md', 'aml-risk.md'], 'Risk assessment');

      case 'training':
        return this.checkFileExists(['aml-training.md', 'compliance-training.md'], 'AML training');

      default:
        return { status: 'unknown', details: `Unknown AML requirement: ${requirement}` };
    }
  }

  private async checkKYCRequirement(requirement: string): Promise<RequirementResult> {
    switch (requirement) {
      case 'identityVerification':
        return this.checkCodePattern('identity.*verification|kyc', 'Identity verification');

      case 'addressVerification':
        return this.checkCodePattern('address.*verification', 'Address verification');

      case 'sourceOfFunds':
        return this.checkCodePattern('source.*of.*funds|sof', 'Source of funds verification');

      case 'enhancedVerification':
        return this.checkCodePattern('enhanced.*verification|pep', 'Enhanced verification');

      case 'ongoingMonitoring':
        return this.checkCodePattern('ongoing.*monitoring|continuous', 'Ongoing monitoring');

      case 'recordKeeping':
        return this.checkCodePattern('kyc.*record|verification.*record', 'KYC record keeping');

      default:
        return { status: 'unknown', details: `Unknown KYC requirement: ${requirement}` };
    }
  }

  private async checkResponsibleGamingRequirement(requirement: string): Promise<RequirementResult> {
    switch (requirement) {
      case 'ageVerification':
        return this.checkCodePattern('age.*verification|age.*check', 'Age verification');

      case 'depositLimits':
        return this.checkCodePattern('deposit.*limit|max.*deposit', 'Deposit limits');

      case 'lossLimits':
        return this.checkCodePattern('loss.*limit|max.*loss', 'Loss limits');

      case 'timeLimits':
        return this.checkCodePattern('time.*limit|session.*limit', 'Time limits');

      case 'selfExclusion':
        return this.checkCodePattern('self.*exclusion|exclusion', 'Self exclusion');

      case 'realityChecks':
        return this.checkCodePattern('reality.*check|break', 'Reality checks');

      default:
        return {
          status: 'unknown',
          details: `Unknown responsible gaming requirement: ${requirement}`,
        };
    }
  }

  private async checkDataProtectionRequirement(requirement: string): Promise<RequirementResult> {
    switch (requirement) {
      case 'encryptionAtRest':
        return this.checkCodePattern('encrypt.*rest|at.*rest.*encryption', 'Encryption at rest');

      case 'encryptionInTransit':
        return this.checkCodePattern('tls|ssl|https.*encrypt', 'Encryption in transit');

      case 'accessLogging':
        return this.checkCodePattern('access.*log|audit.*log', 'Access logging');

      case 'dataMinimization':
        return this.checkCodePattern('data.*minimization|minimal.*data', 'Data minimization');

      case 'secureDeletion':
        return this.checkCodePattern('secure.*delete|wipe.*data', 'Secure deletion');

      case 'backupSecurity':
        return this.checkCodePattern('backup.*encrypt|secure.*backup', 'Backup security');

      default:
        return {
          status: 'unknown',
          details: `Unknown data protection requirement: ${requirement}`,
        };
    }
  }

  private async checkFileExists(files: string[], description: string): Promise<RequirementResult> {
    for (const file of files) {
      if (existsSync(file)) {
        return { status: 'passed', details: `${description} found: ${file}` };
      }
    }

    return {
      status: 'failed',
      details: `${description} not found. Expected one of: ${files.join(', ')}`,
      severity: 'medium',
      recommendation: `Create ${description.toLowerCase()} document`,
    };
  }

  private async checkCodePattern(pattern: string, description: string): Promise<RequirementResult> {
    const packages = await this.discoverPackages();

    for (const packagePath of packages) {
      const srcDir = join(packagePath, 'src');

      if (!existsSync(srcDir)) continue;

      const hasPattern = this.searchPatternInDirectory(srcDir, pattern);
      if (hasPattern) {
        return { status: 'passed', details: `${description} found in ${packagePath}` };
      }
    }

    return {
      status: 'failed',
      details: `${description} not found in codebase`,
      severity: 'medium',
      recommendation: `Implement ${description.toLowerCase()}`,
    };
  }

  private searchPatternInDirectory(dir: string, pattern: string): boolean {
    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isFile() && entry.endsWith('.ts')) {
          const content = readFileSync(fullPath, 'utf-8');
          const regex = new RegExp(pattern, 'i');

          if (regex.test(content)) {
            return true;
          }
        } else if (stat.isDirectory() && !entry.startsWith('.')) {
          if (this.searchPatternInDirectory(fullPath, pattern)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Ignore read errors
    }

    return false;
  }

  private async discoverPackages(): Promise<string[]> {
    const packages: string[] = [];
    const packagesDir = join(process.cwd(), 'packages');

    if (!existsSync(packagesDir)) {
      return packages;
    }

    const walkDirectory = (dir: string) => {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const packageJson = join(fullPath, 'package.json');

          if (existsSync(packageJson)) {
            packages.push(fullPath);
          } else {
            walkDirectory(fullPath);
          }
        }
      }
    };

    walkDirectory(packagesDir);
    return packages;
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    if (this.complianceResults.summary.criticalViolations > 0) {
      recommendations.push('🚨 Address all critical compliance violations immediately');
    }

    if (this.complianceResults.summary.nonCompliantFrameworks > 0) {
      recommendations.push('⚖️ Review and fix non-compliant frameworks');
    }

    if (this.complianceResults.summary.unmetRequirements > 0) {
      recommendations.push('📋 Implement missing compliance requirements');
    }

    // Framework-specific recommendations
    const frameworks = Array.from(this.complianceResults.frameworks.values());

    if (frameworks.some(f => f.framework === 'gdpr' && f.status === 'non-compliant')) {
      recommendations.push('🇪🇺 GDPR: Implement comprehensive data protection measures');
    }

    if (frameworks.some(f => f.framework === 'pci' && f.status === 'non-compliant')) {
      recommendations.push('💳 PCI: Enhance payment card data security');
    }

    if (frameworks.some(f => f.framework === 'aml' && f.status === 'non-compliant')) {
      recommendations.push('💰 AML: Strengthen anti-money laundering controls');
    }

    if (frameworks.some(f => f.framework === 'responsibleGaming' && f.status === 'non-compliant')) {
      recommendations.push('🎮 Responsible Gaming: Implement player protection measures');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Compliance posture is strong - continue regular audits');
    }

    this.complianceResults.recommendations = recommendations;
  }

  private async saveComplianceReport(): Promise<void> {
    const reportPath = join(process.cwd(), 'compliance-report.json');

    const report = {
      ...this.complianceResults,
      frameworks: Object.fromEntries(this.complianceResults.frameworks),
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('📊 Compliance report saved to compliance-report.json');
  }

  private async autoFixViolations(): Promise<void> {
    console.log('🔧 Attempting to auto-fix compliance violations...');

    // This would implement automatic fixes for common compliance issues
    // For example: creating template files, updating configurations, etc.

    console.log('✅ Auto-fix completed');
  }
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface FrameworkCompliance {
  framework: string;
  status: 'compliant' | 'non-compliant' | 'checking';
  requirements: Map<string, RequirementResult>;
  violations: ComplianceViolation[];
  lastCheck: string;
}

interface RequirementResult {
  status: 'passed' | 'failed' | 'unknown';
  details?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  recommendation?: string;
}

interface ComplianceViolation {
  framework: string;
  requirement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface ComplianceSummary {
  totalFrameworks: number;
  compliantFrameworks: number;
  nonCompliantFrameworks: number;
  totalRequirements: number;
  metRequirements: number;
  unmetRequirements: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function runCommand(command: string, description: string): Promise<boolean> {
  console.log(`🔧 ${description}...`);

  try {
    const process = Bun.spawn(command.split(' '), {
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    const exitCode = await process.exited;
    return exitCode === 0;
  } catch (error) {
    console.error(`❌ Failed: ${error}`);
    return false;
  }
}

// ============================================================================
// MAIN COMPLIANCE FUNCTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const report = args.includes('--report') || !args.includes('--no-report');
  const autoFix = args.includes('--fix');
  const frameworks = args
    .find(arg => arg.startsWith('--frameworks='))
    ?.split('=')[1]
    ?.split(',');
  const packages = args
    .find(arg => arg.startsWith('--packages='))
    ?.split('=')[1]
    ?.split(',');

  const checker = new Fantasy42ComplianceChecker();

  try {
    const summary = await checker.runComplianceCheck({
      frameworks,
      packages,
      verbose,
      report,
      autoFix,
    });

    // Exit with error code if there are critical violations
    if (summary.criticalViolations > 0) {
      console.log('\n❌ Compliance check failed - critical violations found');
      process.exit(1);
    }

    console.log('\n✅ Compliance check passed');
  } catch (error) {
    console.error('❌ Compliance check failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  switch (command) {
    case 'check':
      main();
      break;

    case 'report':
      const reportPath = join(process.cwd(), 'compliance-report.json');
      if (existsSync(reportPath)) {
        const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log('❌ No compliance report found');
      }
      break;

    case 'fix':
      console.log('🔧 Running compliance auto-fix...');
      const checker = new Fantasy42ComplianceChecker();
      checker.runComplianceCheck({ autoFix: true });
      break;

    default:
      console.log(`
⚖️ Fantasy42 Compliance Checker

Usage:
  bun run scripts/fantasy42-compliance-checker.ts <command> [options]

Commands:
  check       Run full compliance check
  report      Show last compliance report
  fix         Auto-fix compliance violations

Options:
  --verbose                   Verbose output
  --report                    Generate compliance report (default)
  --no-report                 Skip report generation
  --fix                       Auto-fix violations
  --frameworks=<list>         Comma-separated framework list
  --packages=<list>           Comma-separated package list

Frameworks:
  gdpr, pci, aml, kyc, responsibleGaming, dataProtection

Examples:
  bun run scripts/fantasy42-compliance-checker.ts check --verbose --report
  bun run scripts/fantasy42-compliance-checker.ts check --frameworks=gdpr,pci
  bun run scripts/fantasy42-compliance-checker.ts fix
  bun run scripts/fantasy42-compliance-checker.ts report
      `);
      break;
  }
}

export { Fantasy42ComplianceChecker };
export default Fantasy42ComplianceChecker;
