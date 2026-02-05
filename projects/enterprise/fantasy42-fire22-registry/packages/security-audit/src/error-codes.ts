/**
 * Security Error Codes & Classifications
 *
 * Comprehensive security error codes with detailed descriptions,
 * impact analysis, and actionable remediation steps.
 */

export interface SecurityIssue {
  code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
  suggestions: string[];
  remediation: string;
  evidence?: string;
  cwe?: string;
  owasp?: string;
  references?: string[];
}

export interface Vulnerability {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  cve?: string;
  remediation: string;
  affectedVersions?: string[];
  published?: string;
  cvss?: number;
}

export const SECURITY_ERROR_CODES: Record<string, Omit<SecurityIssue, 'evidence'>> = {
  // Package Security (PKG-XXX)
  PKG001: {
    code: 'PKG001',
    severity: 'CRITICAL',
    category: 'Package Security',
    title: 'Vulnerable Package Dependency',
    description:
      'Package contains known security vulnerabilities that could compromise the application',
    impact:
      'High risk of exploitation, data breaches, and unauthorized access to sensitive systems',
    suggestions: [
      'Update package to latest secure version immediately',
      'Review vulnerability details and exploit vectors',
      'Consider package alternatives if updates unavailable',
      'Implement temporary mitigation if immediate update impossible',
      'Monitor vulnerability databases for new disclosures',
    ],
    remediation: 'Update vulnerable packages within 7 days or implement compensating controls',
    cwe: 'CWE-937',
    owasp: 'A06:2021-Vulnerable Components',
    references: [
      'https://cwe.mitre.org/data/definitions/937.html',
      'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
    ],
  },

  PKG002: {
    severity: 'HIGH',
    category: 'Package Security',
    title: 'Outdated Package Version',
    description: 'Package version is significantly behind the latest release',
    impact: 'Missed security patches, bug fixes, and feature updates',
    suggestions: [
      'Update to latest stable version',
      'Check changelog for breaking changes',
      'Test thoroughly after update in staging environment',
      'Update package-lock.json/bun.lock',
      'Consider gradual rollout to production',
    ],
    remediation: 'Update packages within 30 days or document risk acceptance',
    cwe: 'CWE-1104',
    owasp: 'A06:2021-Vulnerable Components',
  },

  PKG003: {
    severity: 'MEDIUM',
    category: 'Package Security',
    title: 'Unmaintained Package',
    description: 'Package has not been updated in 6+ months',
    impact: 'No security updates, bug fixes, or community support',
    suggestions: [
      'Evaluate package necessity and usage frequency',
      'Find actively maintained alternative packages',
      'Consider forking and maintaining internally',
      'Implement additional security monitoring',
      'Document technical debt for future refactoring',
    ],
    remediation: 'Replace unmaintained packages within 90 days or accept documented risk',
    cwe: 'CWE-1104',
    owasp: 'A06:2021-Vulnerable Components',
  },

  // Code Security (COD-XXX)
  COD001: {
    severity: 'CRITICAL',
    category: 'Code Security',
    title: 'SQL Injection Vulnerability',
    description: 'Unsanitized user input in SQL queries allowing malicious SQL execution',
    impact: 'Complete database compromise, data theft, or destruction',
    suggestions: [
      'Use parameterized queries or prepared statements',
      'Implement input sanitization and validation',
      'Use ORM with built-in SQL injection protection',
      'Conduct security code review',
      'Implement Web Application Firewall (WAF)',
      'Add SQL injection detection in monitoring',
    ],
    remediation: 'Fix SQL injection vulnerabilities within 24 hours',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    references: [
      'https://cwe.mitre.org/data/definitions/89.html',
      'https://owasp.org/Top10/A03_2021-Injection/',
    ],
  },

  COD002: {
    severity: 'HIGH',
    category: 'Code Security',
    title: 'Cross-Site Scripting (XSS)',
    description: 'Unsanitized user input in HTML output allowing script injection',
    impact: 'Client-side code execution, session hijacking, data theft',
    suggestions: [
      'Escape all user input in HTML templates',
      'Use Content Security Policy (CSP)',
      'Implement input validation and sanitization',
      'Use template engines with XSS protection',
      'Implement output encoding for user content',
      'Add XSS detection in monitoring',
    ],
    remediation: 'Fix XSS vulnerabilities within 7 days',
    cwe: 'CWE-79',
    owasp: 'A03:2021-Injection',
    references: [
      'https://cwe.mitre.org/data/definitions/79.html',
      'https://owasp.org/Top10/A03_2021-Injection/',
    ],
  },

  COD003: {
    severity: 'HIGH',
    category: 'Code Security',
    title: 'Broken Authentication',
    description: 'Weak or improperly implemented authentication mechanisms',
    impact: 'Unauthorized access to user accounts and sensitive data',
    suggestions: [
      'Implement multi-factor authentication (MFA)',
      'Use secure session management',
      'Implement proper password policies',
      'Regular security audits of auth mechanisms',
      'Use established authentication frameworks',
      'Implement account lockout policies',
    ],
    remediation: 'Strengthen authentication within 14 days',
    cwe: 'CWE-287',
    owasp: 'A07:2021-Identification and Authentication',
    references: [
      'https://cwe.mitre.org/data/definitions/287.html',
      'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
    ],
  },

  COD004: {
    severity: 'CRITICAL',
    category: 'Code Security',
    title: 'Command Injection',
    description: 'Unsanitized user input in system commands allowing arbitrary command execution',
    impact: 'Complete system compromise, privilege escalation, data destruction',
    suggestions: [
      'Use safe APIs instead of command execution',
      'Implement strict input validation and sanitization',
      'Use allowlists for allowed commands/parameters',
      'Run commands with minimal privileges',
      'Implement command injection detection',
      'Use containerization with seccomp profiles',
    ],
    remediation: 'Fix command injection within 24 hours',
    cwe: 'CWE-78',
    owasp: 'A03:2021-Injection',
    references: [
      'https://cwe.mitre.org/data/definitions/78.html',
      'https://owasp.org/Top10/A03_2021-Injection/',
    ],
  },

  // Configuration Security (CFG-XXX)
  CFG001: {
    severity: 'CRITICAL',
    category: 'Configuration Security',
    title: 'Hardcoded Secrets',
    description: 'API keys, passwords, or tokens stored in source code',
    impact: 'Credential exposure, unauthorized access, data breaches',
    suggestions: [
      'Move secrets to environment variables',
      'Use secret management service (Vault, AWS Secrets Manager)',
      'Implement secret rotation policies',
      'Conduct code review for credential exposure',
      'Use encrypted configuration files',
      'Implement secret scanning in CI/CD',
    ],
    remediation: 'Remove hardcoded secrets within 24 hours',
    cwe: 'CWE-798',
    owasp: 'A05:2021-Security Misconfiguration',
    references: [
      'https://cwe.mitre.org/data/definitions/798.html',
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
    ],
  },

  CFG002: {
    severity: 'HIGH',
    category: 'Configuration Security',
    title: 'Weak Encryption',
    description: 'Using deprecated or weak encryption algorithms',
    impact: 'Data confidentiality and integrity compromised',
    suggestions: [
      'Use AES-256-GCM for symmetric encryption',
      'Use RSA-4096 or ECDSA for asymmetric encryption',
      'Implement proper key management and rotation',
      'Regular cryptographic algorithm updates',
      'Use established cryptographic libraries',
      'Implement encryption key backup and recovery',
    ],
    remediation: 'Upgrade encryption within 30 days',
    cwe: 'CWE-327',
    owasp: 'A02:2021-Cryptographic Failures',
    references: [
      'https://cwe.mitre.org/data/definitions/327.html',
      'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
    ],
  },

  CFG003: {
    severity: 'MEDIUM',
    category: 'Configuration Security',
    title: 'Debug Mode Enabled',
    description: 'Debug mode active in production environment',
    impact: 'Information disclosure, performance issues, security leaks',
    suggestions: [
      'Disable debug mode in production',
      'Use environment-specific configuration',
      'Implement production logging levels',
      'Regular environment configuration audits',
      'Use configuration management tools',
      'Implement configuration drift detection',
    ],
    remediation: 'Disable debug mode in production within 7 days',
    cwe: 'CWE-489',
    owasp: 'A05:2021-Security Misconfiguration',
    references: [
      'https://cwe.mitre.org/data/definitions/489.html',
      'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
    ],
  },

  // Infrastructure Security (INF-XXX)
  INF001: {
    severity: 'CRITICAL',
    category: 'Infrastructure Security',
    title: 'Unpatched System Components',
    description: 'Operating system or runtime with known vulnerabilities',
    impact: 'System compromise, lateral movement, data exfiltration',
    suggestions: [
      'Apply latest security patches immediately',
      'Implement automated patching system',
      'Regular vulnerability scanning',
      'Isolate vulnerable systems until patched',
      'Implement change management procedures',
      'Monitor patch compliance',
    ],
    remediation: 'Apply security patches within 7 days',
    cwe: 'CWE-1035',
    owasp: 'A06:2021-Vulnerable Components',
    references: [
      'https://cwe.mitre.org/data/definitions/1035.html',
      'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
    ],
  },

  INF002: {
    severity: 'HIGH',
    category: 'Infrastructure Security',
    title: 'Weak Network Security',
    description: 'Missing firewall rules, insecure network configuration',
    impact: 'Unauthorized network access, data exfiltration, lateral movement',
    suggestions: [
      'Implement least privilege network access',
      'Configure Web Application Firewall (WAF)',
      'Enable network segmentation',
      'Regular network security audits',
      'Implement network monitoring',
      'Use VPN for remote access',
    ],
    remediation: 'Strengthen network security within 14 days',
    cwe: 'CWE-284',
    owasp: 'A01:2021-Broken Access Control',
    references: [
      'https://cwe.mitre.org/data/definitions/284.html',
      'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
    ],
  },

  INF003: {
    severity: 'MEDIUM',
    category: 'Infrastructure Security',
    title: 'Missing HTTPS/TLS',
    description: 'Plaintext communication without encryption',
    impact: 'Man-in-the-middle attacks, data interception, credential theft',
    suggestions: [
      'Implement HTTPS with TLS 1.3',
      'Obtain certificate from trusted CA',
      'Configure HSTS headers',
      'Redirect all HTTP traffic to HTTPS',
      'Implement certificate monitoring',
      'Use strong cipher suites',
    ],
    remediation: 'Implement HTTPS within 30 days',
    cwe: 'CWE-319',
    owasp: 'A02:2021-Cryptographic Failures',
    references: [
      'https://cwe.mitre.org/data/definitions/319.html',
      'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
    ],
  },
};

/**
 * Get security issue details by error code
 */
export function getSecurityIssue(code: string): SecurityIssue | null {
  const issue = SECURITY_ERROR_CODES[code];
  if (!issue) return null;

  return {
    ...issue,
    evidence: undefined, // Will be populated when issue is detected
  };
}

/**
 * Get all security issues by severity
 */
export function getSecurityIssuesBySeverity(severity: SecurityIssue['severity']): SecurityIssue[] {
  return Object.values(SECURITY_ERROR_CODES)
    .filter(issue => issue.severity === severity)
    .map(issue => ({
      ...issue,
      evidence: undefined,
    }));
}

/**
 * Get all security issues by category
 */
export function getSecurityIssuesByCategory(category: string): SecurityIssue[] {
  return Object.values(SECURITY_ERROR_CODES)
    .filter(issue => issue.category === category)
    .map(issue => ({
      ...issue,
      evidence: undefined,
    }));
}
