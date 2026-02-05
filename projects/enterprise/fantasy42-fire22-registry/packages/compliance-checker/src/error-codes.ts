/**
 * Compliance Error Codes & Regulatory Frameworks
 *
 * Comprehensive compliance error codes with regulatory references,
 * remediation timelines, and compliance framework mappings.
 */

export interface ComplianceViolation {
  code: string;
  framework: string;
  requirement: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
  suggestions: string[];
  remediation: string;
  deadline: string;
  responsibleParty: string;
  reference: string;
  evidence?: string;
  detectedAt: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  regulatoryBody?: string;
  penalty?: string;
}

export const COMPLIANCE_ERROR_CODES: Record<
  string,
  Omit<ComplianceViolation, 'evidence' | 'detectedAt' | 'confidence'>
> = {
  // GDPR (GDPR-XXX)
  GDPR001: {
    code: 'GDPR001',
    framework: 'gdpr',
    requirement: 'consentMechanism',
    severity: 'CRITICAL',
    category: 'GDPR Compliance',
    title: 'Personal Data Processing Without Consent',
    description: 'Processing personal data without explicit, informed user consent',
    impact: 'Fines up to 4% of global turnover, processing bans, reputational damage',
    suggestions: [
      'Implement explicit consent mechanisms with clear opt-in/opt-out',
      'Document legal basis for each data processing activity',
      'Provide granular consent options for different data types',
      'Maintain comprehensive consent records with timestamps',
      'Regular consent validity reviews and renewals',
      'Implement consent withdrawal mechanisms',
    ],
    remediation: 'Implement consent management system within 30 days',
    deadline: '30 days',
    responsibleParty: 'Privacy Team',
    reference: 'Article 6 - Lawful Processing',
    regulatoryBody: 'National Data Protection Authorities',
    penalty: 'Up to 4% of global annual turnover',
  },

  GDPR002: {
    code: 'GDPR002',
    framework: 'gdpr',
    requirement: 'dataSubjectRights',
    severity: 'CRITICAL',
    category: 'GDPR Compliance',
    title: 'Data Subject Rights Not Implemented',
    description: 'Missing implementation of data subject access and control rights',
    impact: 'Legal penalties, loss of user trust, regulatory non-compliance',
    suggestions: [
      'Implement data access request processing system',
      'Create data portability export functionality',
      'Build data rectification and erasure mechanisms',
      'Establish processes for restricting/forgetting data',
      'Document all data subject right fulfillment procedures',
      'Implement automated response systems',
    ],
    remediation: 'Deploy data subject rights portal within 60 days',
    deadline: '60 days',
    responsibleParty: 'Customer Service & Legal',
    reference: 'Articles 15-22 - Data Subject Rights',
    regulatoryBody: 'National Data Protection Authorities',
    penalty: 'Up to 4% of global annual turnover',
  },

  GDPR003: {
    severity: 'HIGH',
    framework: 'gdpr',
    requirement: 'dataProtectionOfficer',
    severity: 'HIGH',
    category: 'GDPR Compliance',
    title: 'Data Protection Officer Not Designated',
    description: 'No designated Data Protection Officer for data processing activities',
    impact: 'Additional regulatory scrutiny, potential fines, compliance gaps',
    suggestions: [
      'Appoint qualified Data Protection Officer',
      'Provide DPO with necessary resources and authority',
      'Ensure DPO independence and reporting lines',
      'Train DPO on GDPR requirements and organizational processes',
      'Establish DPO contact information and communication channels',
      'Document DPO appointment with supervisory authority',
    ],
    remediation: 'Designate DPO and notify supervisory authority within 30 days',
    deadline: '30 days',
    responsibleParty: 'Executive Management',
    reference: 'Article 37 - Data Protection Officer',
    regulatoryBody: 'National Data Protection Authorities',
    penalty: 'Administrative fines up to €10 million or 2% of global turnover',
  },

  // PCI DSS (PCI-XXX)
  PCI001: {
    code: 'PCI001',
    framework: 'pci',
    requirement: 'cardholderDataEncryption',
    severity: 'CRITICAL',
    category: 'PCI DSS Compliance',
    title: 'Cardholder Data Not Encrypted',
    description: 'Payment card data stored or transmitted without proper encryption',
    impact: 'Complete loss of payment processing capability, massive fines',
    suggestions: [
      'Implement AES-256 encryption for all cardholder data at rest',
      'Use TLS 1.3 for all card data transmission',
      'Never store full card numbers unless absolutely necessary',
      'Implement tokenization for card data storage',
      'Regular encryption key rotation and management',
      'Conduct encryption implementation audit',
    ],
    remediation: 'Implement encryption within 30 days or cease card processing',
    deadline: '30 days',
    responsibleParty: 'Security Team',
    reference: 'PCI DSS Requirement 3 - Protect Stored Cardholder Data',
    regulatoryBody: 'Payment Card Industry Security Standards Council',
    penalty: 'Up to $100,000 per month for non-compliance',
  },

  PCI002: {
    code: 'PCI002',
    framework: 'pci',
    requirement: 'accessControls',
    severity: 'HIGH',
    category: 'PCI DSS Compliance',
    title: 'Weak Access Controls',
    description: 'Inadequate access controls for cardholder data environment',
    impact: 'Unauthorized access to payment data, compliance failure',
    suggestions: [
      'Implement role-based access control (RBAC)',
      'Apply principle of least privilege to all accounts',
      'Regular access rights reviews and audits',
      'Multi-factor authentication for privileged accounts',
      'Automatic account deactivation for inactive users',
      'Implement access logging and monitoring',
    ],
    remediation: 'Conduct access control audit and remediation within 45 days',
    deadline: '45 days',
    responsibleParty: 'IT Security',
    reference: 'PCI DSS Requirement 7 - Restrict Access to Cardholder Data',
    regulatoryBody: 'Payment Card Industry Security Standards Council',
    penalty: 'Up to $100,000 per month for non-compliance',
  },

  // AML/KYC (AML-XXX)
  AML001: {
    code: 'AML001',
    framework: 'aml',
    requirement: 'customerDueDiligence',
    severity: 'CRITICAL',
    category: 'AML/KYC Compliance',
    title: 'Customer Due Diligence Incomplete',
    description: 'Missing or inadequate customer identification and verification procedures',
    impact: 'Regulatory penalties, inability to process high-risk transactions',
    suggestions: [
      'Implement comprehensive KYC onboarding process',
      'Enhanced due diligence for high-risk customers',
      'Regular customer profile updates and reviews',
      'Document all customer identification procedures',
      'Train staff on CDD requirements and red flags',
      'Implement automated risk scoring systems',
    ],
    remediation: 'Complete CDD implementation within 60 days',
    deadline: '60 days',
    responsibleParty: 'Compliance Team',
    reference: 'CDD Guidelines - Customer Identification',
    regulatoryBody: 'Financial Action Task Force (FATF)',
    penalty: 'Civil penalties up to $1 million per violation',
  },

  AML002: {
    severity: 'HIGH',
    framework: 'aml',
    requirement: 'suspiciousActivityReporting',
    severity: 'HIGH',
    category: 'AML/KYC Compliance',
    title: 'Suspicious Activity Not Reported',
    description: 'No system for detecting and reporting suspicious transactions',
    impact: 'Regulatory penalties, increased risk of money laundering',
    suggestions: [
      'Implement transaction monitoring system',
      'Establish suspicious activity reporting procedures',
      'Train staff to identify red flag transactions',
      'Regular SAR filing with appropriate authorities',
      'Document all suspicious activity investigations',
      'Implement automated transaction scoring',
    ],
    remediation: 'Implement SAR system within 45 days',
    deadline: '45 days',
    responsibleParty: 'Financial Crime Team',
    reference: 'STR Requirements - Suspicious Transaction Reporting',
    regulatoryBody: 'Financial Action Task Force (FATF)',
    penalty: 'Civil penalties up to $1 million per violation',
  },

  // Responsible Gambling (RG-XXX)
  RG001: {
    severity: 'HIGH',
    framework: 'responsible-gaming',
    requirement: 'selfExclusion',
    severity: 'HIGH',
    category: 'Responsible Gambling',
    title: 'Self-Exclusion Not Implemented',
    description: 'No mechanism for customers to self-exclude from gambling activities',
    impact: 'Regulatory non-compliance, harm to vulnerable customers',
    suggestions: [
      'Implement comprehensive self-exclusion system',
      'Multi-channel exclusion options (online, phone, in-person)',
      'Permanent exclusion options for problem gamblers',
      'Regular exclusion list reviews and enforcement',
      'Support resources for excluded customers',
      'Document exclusion procedures and effectiveness',
    ],
    remediation: 'Deploy self-exclusion system within 60 days',
    deadline: '60 days',
    responsibleParty: 'Player Protection Team',
    reference: 'Responsible Gambling Standards - Self-Exclusion',
    regulatoryBody: 'Gambling Commission',
    penalty: 'Licensing penalties, fines up to £1 million',
  },

  RG002: {
    severity: 'MEDIUM',
    framework: 'responsible-gaming',
    requirement: 'realityChecks',
    severity: 'MEDIUM',
    category: 'Responsible Gambling',
    title: 'Reality Checks Missing',
    description: 'No reality check prompts during gambling sessions',
    impact: 'Increased risk of problem gambling behavior',
    suggestions: [
      'Implement configurable reality check intervals',
      'Display session time and loss information',
      'Allow users to customize reality check frequency',
      'Provide break suggestions and account reviews',
      'Document reality check effectiveness metrics',
      'Include responsible gambling resources',
    ],
    remediation: 'Implement reality checks within 30 days',
    deadline: '30 days',
    responsibleParty: 'UX/Product Team',
    reference: 'Responsible Gambling Standards - Reality Checks',
    regulatoryBody: 'Gambling Commission',
    penalty: 'Licensing penalties and improvement notices',
  },

  // Data Protection (DP-XXX)
  DP001: {
    severity: 'CRITICAL',
    framework: 'data-protection',
    requirement: 'encryptionAtRest',
    severity: 'CRITICAL',
    category: 'Data Protection',
    title: 'Data Encryption Not Implemented',
    description: 'Sensitive data not encrypted at rest',
    impact: 'Data breaches, legal penalties, loss of customer trust',
    suggestions: [
      'Implement AES-256 encryption for data at rest',
      'Use TLS 1.3 for all data in transit',
      'Implement proper key management and rotation',
      'Regular encryption key backup and recovery',
      'Document encryption procedures and standards',
      'Conduct encryption implementation audit',
    ],
    remediation: 'Implement encryption within 30 days',
    deadline: '30 days',
    responsibleParty: 'Security Team',
    reference: 'Data Protection Standards - Encryption Requirements',
    regulatoryBody: "Information Commissioner's Office (ICO)",
    penalty: 'Fines up to £17.5 million or 4% of global turnover',
  },

  DP002: {
    severity: 'HIGH',
    framework: 'data-protection',
    requirement: 'dataMinimization',
    severity: 'HIGH',
    category: 'Data Protection',
    title: 'Data Retention Policy Missing',
    description: 'No defined data retention and deletion policies',
    impact: 'Legal compliance issues, unnecessary data storage costs',
    suggestions: [
      'Define retention periods for all data types',
      'Implement automated data deletion processes',
      'Document data retention schedules',
      'Regular retention policy reviews',
      'Obtain legal review of retention policies',
      'Implement data minimization principles',
    ],
    remediation: 'Create and implement retention policy within 45 days',
    deadline: '45 days',
    responsibleParty: 'Data Governance Team',
    reference: 'Data Protection Standards - Data Retention',
    regulatoryBody: "Information Commissioner's Office (ICO)",
    penalty: 'Fines up to £17.5 million or 4% of global turnover',
  },
};

/**
 * Get compliance violation details by error code
 */
export function getComplianceViolation(code: string): ComplianceViolation | null {
  const violation = COMPLIANCE_ERROR_CODES[code];
  if (!violation) return null;

  return {
    ...violation,
    evidence: undefined,
    detectedAt: new Date().toISOString(),
    confidence: 'HIGH',
  };
}

/**
 * Get all compliance violations by framework
 */
export function getComplianceViolationsByFramework(framework: string): ComplianceViolation[] {
  return Object.values(COMPLIANCE_ERROR_CODES)
    .filter(violation => violation.framework === framework)
    .map(violation => ({
      ...violation,
      evidence: undefined,
      detectedAt: new Date().toISOString(),
      confidence: 'HIGH',
    }));
}

/**
 * Get all compliance violations by severity
 */
export function getComplianceViolationsBySeverity(
  severity: ComplianceViolation['severity']
): ComplianceViolation[] {
  return Object.values(COMPLIANCE_ERROR_CODES)
    .filter(violation => violation.severity === severity)
    .map(violation => ({
      ...violation,
      evidence: undefined,
      detectedAt: new Date().toISOString(),
      confidence: 'HIGH',
    }));
}

/**
 * Calculate violation deadline from detection date
 */
export function calculateViolationDeadline(code: string, detectedAt: string): string {
  const violation = COMPLIANCE_ERROR_CODES[code];
  if (!violation) return '';

  const detectionDate = new Date(detectedAt);
  const deadlineDays = parseInt(violation.deadline.split(' ')[0]);
  const deadlineDate = new Date(detectionDate);
  deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

  return deadlineDate.toISOString().slice(0, 10);
}
