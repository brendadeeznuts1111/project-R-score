/**
 * @fileoverview @[policy-schema.ts] Enhanced Policy Configuration Schema
 * @description Enterprise-grade policy validation with versioning, approval workflows, compliance tracking, and tension-based governance integration
 * @author Odds Protocol Development Team
 * @version 1.01.1
 * @since 1.0.0
 * 
 * [#REF] POLICY_SCHEMA_DEFINITION_ENHANCED
 * [#REF] ENTERPRISE_POLICY_VALIDATION_COMPLETE
 * [#REF] TENSION_BASED_POLICY_GOVERNANCE
 * 
 * @tags policy-schema, validation, governance, compliance, tension-analysis, enterprise-grade
 * @category governance
 * @type schema
 * @priority critical
 * 
 * Usage:
 * @example
 * // Import policy validation types
 * import { PolicyValidationError, ERROR_CODES, PolicyErrorUtils } from './policy-schema';
 * 
 * @example
 * // Create policy validation error
 * const error = PolicyErrorUtils.createValidationError('POL-001', 'field', 'message');
 * 
 * Maintenance:
 * @update 2025-11-20 - Enhanced with comprehensive JSDoc documentation
 * @update 2025-11-20 - Added tension-based governance integration
 * @update 2025-11-20 - Integrated enterprise-grade validation patterns
 * 
 * Standards:
 * @standard TypeScript strict mode for all development
 * @standard Enterprise-grade policy validation
 * @standard Comprehensive error handling and categorization
 */

export interface PolicyIdentifier {
  policy_number: string;           // Format: POL-YYYY-NNN (e.g., POL-2025-001)
  policy_version: string;          // Semantic versioning (e.g., 1.2.3)
  policy_revision: number;         // Sequential revision number
  policy_id: string;               // Unique UUID for internal tracking
}

/**
 * @interface PolicyMetadata
 * @description Enhanced policy metadata interface with tension-based categorization, hierarchical governance integration, and comprehensive compliance tracking
 * 
 * @tags policy-metadata, governance-compliance, tension-analysis, hierarchical-governance
 * @category governance
 * @type interface
 * @priority critical
 * 
 * Features:
 * @feature Comprehensive policy categorization with tension metrics
 * @feature Hierarchical governance integration and department mapping
 * @feature Multi-framework compliance tracking (SOC2, ISO27001, GDPR)
 * @feature Dynamic scope and domain classification
 * @feature Tension-based severity assessment and risk evaluation
 * @feature Automated tag generation and metadata optimization
 * 
 * Usage:
 * @example const metadata: PolicyMetadata = {
 *   title: 'API Security Policy',
 *   description: 'Comprehensive API security and access control framework',
 *   category: PolicyCategory.SECURITY,
 *   severity: PolicySeverity.HIGH,
 *   department: 'Engineering',
 *   domain: 'api-gateway',
 *   scope: PolicyScope.ENTERPRISE,
 *   compliance_frameworks: ['SOC2', 'ISO27001'],
 *   tags: ['security', 'api', 'access-control']
 * };
 */
export interface PolicyMetadata {
  title: string;                           // Policy title with tension-based classification
  description: string;                    // Comprehensive policy description and purpose
  category: PolicyCategory;               // Policy category with tension weighting
  severity: PolicySeverity;               // Severity level with tension-based assessment
  department: string;                     // Department ownership and governance mapping
  domain: string;                         // Technical domain and system classification
  scope: PolicyScope;                     // Policy scope with hierarchical impact assessment
  compliance_frameworks: string[];        // SOC2, ISO27001, GDPR, etc. with tension mapping
  tags: string[];                         // Dynamic tags for searchability and categorization
  created_at: Date;                       // Creation timestamp with temporal tension tracking
  updated_at: Date;                       // Last update timestamp with change frequency
  effective_date: Date;                   // Policy effective date with implementation timeline
  review_date: Date;                      // Next review date with tension-based scheduling
  tension_score: number;                  // Tension complexity score (0-100) for risk assessment
  hierarchical_level: number;             // Governance hierarchy level (1-5) for escalation
  dependencies: string[];                 // Policy dependencies with tension impact analysis
  risk_factors: PolicyRiskFactor[];       // Risk factors with tension-based weighting
  performance_metrics: PolicyMetrics;     // Performance tracking with tension optimization
}

/**
 * @interface PolicyRiskFactor
 * @description Risk factor interface with tension-based weighting and impact assessment for policy risk evaluation
 * 
 * @tags policy-risk-factor, tension-analysis, risk-assessment, governance
 * @category governance
 * @type interface
 * @priority high
 */
export interface PolicyRiskFactor {
  id: string;                              // Unique risk factor identifier
  name: string;                            // Risk factor name and description
  category: string;                        // Risk category (technical, operational, compliance)
  severity: PolicySeverity;                // Risk severity level
  probability: number;                     // Probability score (0-100)
  impact: number;                          // Impact score (0-100)
  tension_weight: number;                  // Tension-based weight for risk calculation
  mitigation: string;                      // Mitigation strategy and approach
  dependencies: string[];                  // Dependencies on other risk factors
}

/**
 * @interface PolicyMetrics
 * @description Performance metrics interface for policy tracking with tension-based optimization and compliance monitoring
 * 
 * @tags policy-metrics, performance-tracking, tension-optimization, compliance-monitoring
 * @category governance
 * @type interface
 * @priority high
 */
export interface PolicyMetrics {
  compliance_score: number;                // Overall compliance score (0-100)
  implementation_progress: number;         // Implementation progress percentage
  risk_reduction: number;                  // Risk reduction achieved
  tension_efficiency: number;              // Tension-based efficiency score
  audit_results: AuditResult[];            // Historical audit results
  performance_trends: PerformanceTrend[];  // Performance trend analysis
  kpi_metrics: KPIMetric[];                // Key performance indicators
  last_updated: Date;                      // Last metrics update timestamp
}

/**
 * @interface AuditResult
 * @description Audit result interface for tracking policy compliance audits with tension-based scoring
 * 
 * @tags audit-result, compliance-tracking, tension-scoring, governance
 * @category governance
 * @type interface
 * @priority medium
 */
export interface AuditResult {
  audit_id: string;                         // Unique audit identifier
  audit_date: Date;                         // Audit completion date
  auditor: string;                          // Auditor name or team
  compliance_score: number;                 // Compliance score (0-100)
  tension_score: number;                    // Tension-based risk score
  findings: AuditFinding[];                 // Detailed audit findings
  recommendations: string[];                // Improvement recommendations
  status: 'passed' | 'failed' | 'warning';  // Overall audit status
}

/**
 * @interface PerformanceTrend
 * @description Performance trend interface for tracking policy performance over time with tension analysis
 * 
 * @tags performance-trend, tension-analysis, performance-tracking, governance
 * @category governance
 * @type interface
 * @priority medium
 */
export interface PerformanceTrend {
  metric_name: string;                      // Name of the tracked metric
  timestamp: Date;                          // Measurement timestamp
  value: number;                            // Metric value
  tension_impact: number;                   // Tension impact score
  trend_direction: 'improving' | 'declining' | 'stable'; // Trend direction
  forecast: number;                         // Forecasted value
}

/**
 * @interface KPIMetric
 * @description Key Performance Indicator interface for policy management with tension-based optimization
 * 
 * @tags kpi-metric, performance-indicator, tension-optimization, governance
 * @category governance
 * @type interface
 * @priority medium
 */
export interface KPIMetric {
  kpi_id: string;                           // Unique KPI identifier
  name: string;                             // KPI name and description
  target_value: number;                     // Target value for the KPI
  current_value: number;                    // Current measured value
  tension_weight: number;                   // Tension-based weight for prioritization
  measurement_frequency: string;            // How often this KPI is measured
  trend: PerformanceTrend[];                // Historical trend data
}

/**
 * @interface AuditFinding
 * @description Individual audit finding interface for detailed compliance issue tracking with tension assessment
 * 
 * @tags audit-finding, compliance-issue, tension-assessment, governance
 * @category governance
 * @type interface
 * @priority medium
 */
export interface AuditFinding {
  finding_id: string;                       // Unique finding identifier
  severity: PolicySeverity;                 // Finding severity level
  description: string;                      // Detailed finding description
  tension_impact: number;                   // Tension-based impact score
  recommendation: string;                   // Specific recommendation for resolution
  due_date: Date;                           // Resolution due date
  status: 'open' | 'in-progress' | 'resolved'; // Finding status
}

export interface PolicyOwnership {
  maintainer: {
    name: string;
    email: string;
    department: string;
    role: string;
    employee_id: string;
  };
  reviewers: PolicyReviewer[];
  approvers: PolicyApprover[];
  stewards: PolicySteward[];
}

export interface PolicyReviewer {
  name: string;
  email: string;
  department: string;
  role: string;
  employee_id: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  review_date?: Date;
  review_comments?: string;
  review_round: number;
  required: boolean;                // Whether this reviewer is required for approval
}

export interface PolicyApprover {
  name: string;
  email: string;
  department: string;
  role: string;
  employee_id: string;
  approval_level: number;           // 1=Manager, 2=Director, 3=VP, 4=C-Suite
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_date?: Date;
  approval_comments?: string;
  delegation_enabled: boolean;
  delegate?: PolicyApprover;        // Temporary delegation information
}

export interface PolicySteward {
  name: string;
  email: string;
  department: string;
  role: string;
  employee_id: string;
  stewardship_type: 'operational' | 'strategic' | 'compliance';
  responsibilities: string[];
  contact_preferences: {
    email: boolean;
    slack: boolean;
    phone: boolean;
  };
}

export interface PolicyValidation {
  validation_id: string;
  policy_number: string;
  policy_version: string;
  validation_status: ValidationStatus;
  validation_score: number;         // 0-100 compliance score
  validation_date: Date;
  validator: string;
  validation_type: ValidationType;
  findings: PolicyFinding[];
  recommendations: PolicyRecommendation[];
  next_review_date: Date;
  certification_required: boolean;
  certification_expiry?: Date;
}

export interface PolicyFinding {
  finding_id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  description: string;
  impact_assessment: string;
  remediation_required: boolean;
  remediation_deadline?: Date;
  remediation_owner?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  discovered_date: Date;
}

export interface PolicyRecommendation {
  recommendation_id: string;
  priority: RecommendationPriority;
  description: string;
  rationale: string;
  implementation_effort: 'low' | 'medium' | 'high';
  expected_benefit: string;
  target_completion_date?: Date;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
}

export interface PolicyVersion {
  version_number: string;
  version_type: 'major' | 'minor' | 'patch' | 'draft';
  changelog: string;
  migration_required: boolean;
  migration_guide?: string;
  breaking_changes: boolean;
  compatibility_matrix: {
    previous_versions: string[];
    next_versions: string[];
  };
  release_notes: string;
  release_date: Date;
  released_by: string;
}

export interface PolicyCompliance {
  compliance_id: string;
  policy_number: string;
  policy_version: string;
  compliance_framework: string;
  compliance_status: ComplianceStatus;
  compliance_score: number;
  last_assessment: Date;
  next_assessment: Date;
  assessor: string;
  evidence_requirements: string[];
  audit_trail: ComplianceAuditEntry[];
}

export interface ComplianceAuditEntry {
  entry_id: string;
  timestamp: Date;
  action: string;
  performed_by: string;
  details: string;
  evidence_attached: boolean;
  peer_reviewed: boolean;
}

export interface PolicyWorkflow {
  workflow_id: string;
  policy_number: string;
  current_stage: WorkflowStage;
  workflow_status: WorkflowStatus;
  initiated_by: string;
  initiated_date: Date;
  stages: WorkflowStage[];
  approvals_required: number;
  approvals_received: number;
  rejections: number;
  estimated_completion: Date;
  actual_completion?: Date;
  priority: WorkflowPriority;
}

export interface PolicyNotification {
  notification_id: string;
  policy_number: string;
  recipient_type: 'maintainer' | 'reviewer' | 'approver' | 'steward' | 'department';
  recipients: string[];
  notification_type: NotificationType;
  subject: string;
  message: string;
  urgency: NotificationUrgency;
  scheduled_date?: Date;
  sent_date?: Date;
  acknowledged_date?: Date;
  response_required: boolean;
  response_deadline?: Date;
}

// Enums for type safety
export enum PolicyCategory {
  SECURITY = 'security',
  PRIVACY = 'privacy',
  COMPLIANCE = 'compliance',
  OPERATIONS = 'operations',
  DEVELOPMENT = 'development',
  GOVERNANCE = 'governance',
  RISK_MANAGEMENT = 'risk_management',
  QUALITY = 'quality'
}

export enum PolicySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFORMATIONAL = 'informational'
}

export enum PolicyScope {
  GLOBAL = 'global',
  REGIONAL = 'regional',
  DEPARTMENTAL = 'departmental',
  TEAM = 'team',
  PROJECT = 'project',
  SYSTEM = 'system'
}

export enum ValidationStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  PENDING_VALIDATION = 'pending_validation',
  EXEMPTED = 'exempted'
}

export enum ValidationType {
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  PEER_REVIEW = 'peer_review',
  EXTERNAL_AUDIT = 'external_audit',
  SELF_ASSESSMENT = 'self_assessment'
}

export enum FindingSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum FindingCategory {
  SECURITY = 'security',
  PRIVACY = 'privacy',
  COMPLIANCE = 'compliance',
  OPERATIONAL = 'operational',
  DOCUMENTATION = 'documentation',
  TECHNICAL = 'technical'
}

export enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING = 'pending',
  NOT_APPLICABLE = 'not_applicable'
}

export enum WorkflowStage {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVAL = 'approval',
  IMPLEMENTATION = 'implementation',
  VALIDATION = 'validation',
  PUBLICATION = 'publication',
  ARCHIVAL = 'archival'
}

export enum WorkflowStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked'
}

export enum WorkflowPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum NotificationType {
  REVIEW_REQUIRED = 'review_required',
  APPROVAL_REQUIRED = 'approval_required',
  POLICY_UPDATED = 'policy_updated',
  COMPLIANCE_DUE = 'compliance_due',
  EXPIRY_WARNING = 'expiry_warning',
  FINDING_REPORTED = 'finding_reported',
  WORKFLOW_UPDATE = 'workflow_update'
}

export enum NotificationUrgency {
  IMMEDIATE = 'immediate',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Main Policy Configuration Interface
export interface PolicyConfiguration {
  identifier: PolicyIdentifier;
  metadata: PolicyMetadata;
  ownership: PolicyOwnership;
  validation: PolicyValidation;
  versions: PolicyVersion[];
  compliance: PolicyCompliance[];
  workflows: PolicyWorkflow[];
  notifications: PolicyNotification[];
}

// Policy Registry for managing multiple policies
export interface PolicyRegistry {
  policies: Record<string, PolicyConfiguration>;
  last_updated: Date;
  total_policies: number;
  active_policies: number;
  pending_review: number;
  expired_policies: number;
  compliance_overview: {
    compliant_policies: number;
    non_compliant_policies: number;
    overall_compliance_score: number;
  };
}

// Validation Result Interface
export interface PolicyValidationResult {
  valid: boolean;
  policy_number: string;
  policy_version: string;
  validation_errors: PolicyValidationError[];
  validation_warnings: PolicyValidationWarning[];
  compliance_score: number;
  recommendations: string[];
  next_review_date: Date;
  validator_info: {
    name: string;
    role: string;
    department: string;
  };
}

export interface PolicyValidationError {
  error_code: ErrorCode;               // Strongly typed error identifier
  field: string;                       // Specific policy field that failed validation
  message: string;                     // Human-readable error description
  severity: PolicySeverity;            // Impact severity classification using enum
  fix_required: boolean;               // Whether immediate fix is mandatory
  suggested_fix?: string;              // Optional remediation guidance
  category?: PolicyErrorCategory;      // Error category for classification
  timestamp?: Date;                    // When the error was detected
  validator_id?: string;                // ID of the validator that detected the error
}

export interface PolicyValidationWarning {
  warning_code: string;
  field: string;
  message: string;
  recommendation: string;
  impact_assessment: string;
}

// Standardized Error Codes for Policy Validation
export const ERROR_CODES = {
  POLICY_MISSING: 'POL-001',
  VERSION_CONFLICT: 'POL-002', 
  APPROVAL_MISSING: 'POL-003',
  COMPLIANCE_FAILURE: 'POL-004',
  SECURITY_VIOLATION: 'POL-005',
  ACCESS_DENIED: 'POL-006',
  DOCUMENTATION_INCOMPLETE: 'POL-007',
  EXPIRED_POLICY: 'POL-008',
  SCOPE_VIOLATION: 'POL-009',
  SIGNATURE_INVALID: 'POL-010',
  REVIEW_OVERDUE: 'POL-011',
  THRESHOLD_EXCEEDED: 'POL-012',
  DEPENDENCY_MISSING: 'POL-013',
  CONFIGURATION_INVALID: 'POL-014',
  AUDIT_TRAIL_MISSING: 'POL-015'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Error Code Categories for Classification
export const ERROR_CATEGORIES = {
  POLICY: ['POL-001', 'POL-002', 'POL-008', 'POL-009', 'POL-011'] as const,
  APPROVAL: ['POL-003', 'POL-010'] as const,
  COMPLIANCE: ['POL-004', 'POL-012', 'POL-014'] as const,
  SECURITY: ['POL-005', 'POL-006'] as const,
  DOCUMENTATION: ['POL-007', 'POL-013', 'POL-015'] as const,
  OPERATIONAL: ['POL-009', 'POL-014'] as const
} as const;

// Utility Functions for Error Code Management
export class PolicyErrorUtils {
  /**
   * Validate if an error code is valid
   */
  static isValidErrorCode(code: string): code is ErrorCode {
    return Object.values(ERROR_CODES).includes(code as ErrorCode);
  }

  /**
   * Get category for an error code
   */
  static getErrorCodeCategory(errorCode: ErrorCode): PolicyErrorCategory | undefined {
    const categories: Record<string, readonly string[]> = ERROR_CATEGORIES;
    for (const [category, codes] of Object.entries(categories)) {
      if (codes.includes(errorCode)) {
        return category as PolicyErrorCategory;
      }
    }
    return undefined;
  }

  /**
   * Get human-readable description for error code
   */
  static getErrorCodeDescription(errorCode: ErrorCode): string {
    const descriptions: Record<ErrorCode, string> = {
      'POL-001': 'Required policy is missing or not found',
      'POL-002': 'Policy version conflicts with existing requirements',
      'POL-003': 'Required approval is missing or invalid',
      'POL-004': 'Compliance requirements not met',
      'POL-005': 'Security policy violation detected',
      'POL-006': 'Access denied due to insufficient permissions',
      'POL-007': 'Required documentation is incomplete or missing',
      'POL-008': 'Policy has expired and needs renewal',
      'POL-009': 'Policy scope violation detected',
      'POL-010': 'Digital signature is invalid or missing',
      'POL-011': 'Policy review is overdue',
      'POL-012': 'Operational threshold exceeded',
      'POL-013': 'Required dependency is missing',
      'POL-014': 'Configuration is invalid or non-compliant',
      'POL-015': 'Audit trail is missing or incomplete'
    };
    return descriptions[errorCode] || 'Unknown error code';
  }

  /**
   * Create a standardized policy validation error
   */
  static createValidationError(
    errorCode: ErrorCode,
    field: string,
    message?: string,
    severity: PolicySeverity = PolicySeverity.MEDIUM
  ): PolicyValidationError {
    return {
      error_code: errorCode,
      field,
      message: message || this.getErrorCodeDescription(errorCode),
      severity,
      fix_required: severity === PolicySeverity.CRITICAL || severity === PolicySeverity.HIGH,
      category: this.getErrorCodeCategory(errorCode),
      timestamp: new Date(),
      suggested_fix: this.getSuggestedFix(errorCode)
    };
  }

  /**
   * Get suggested fix for error code
   */
  private static getSuggestedFix(errorCode: ErrorCode): string {
    const fixes: Record<ErrorCode, string> = {
      'POL-001': 'Create and implement the missing policy',
      'POL-002': 'Update policy to compatible version',
      'POL-003': 'Obtain required approvals from designated authorities',
      'POL-004': 'Address compliance gaps and update documentation',
      'POL-005': 'Remediate security violation and update controls',
      'POL-006': 'Request appropriate permissions or access rights',
      'POL-007': 'Complete missing documentation requirements',
      'POL-008': 'Renew expired policy with updated terms',
      'POL-009': 'Ensure policy actions remain within defined scope',
      'POL-010': 'Obtain valid digital signature for policy',
      'POL-011': 'Schedule and complete overdue policy review',
      'POL-012': 'Reduce operations within defined thresholds',
      'POL-013': 'Install and configure required dependencies',
      'POL-014': 'Update configuration to meet requirements',
      'POL-015': 'Enable audit trail and restore missing logs'
    };
    return fixes[errorCode] || 'Contact policy administrator for guidance';
  }
}

// Type for error categories
export type PolicyErrorCategory = keyof typeof ERROR_CATEGORIES;
