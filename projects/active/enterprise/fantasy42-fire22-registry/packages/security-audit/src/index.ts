/**
 * @fire22/security-audit - Enterprise Security Audit Package
 *
 * Dedicated package for comprehensive security auditing with detailed error codes,
 * actionable recommendations, and enterprise-grade vulnerability detection.
 */

export { EnhancedFantasy42SecurityAuditor } from './auditor';
export { SecurityErrorCodes, type SecurityIssue } from './error-codes';
export type { PackageAuditResult, AuditSummary, Vulnerability } from './types';

// Re-export for convenience
export { runSecurityAudit } from './cli';
