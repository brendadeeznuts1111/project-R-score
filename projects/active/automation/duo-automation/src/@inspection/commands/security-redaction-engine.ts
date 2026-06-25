/**
 * Enhanced Security & Redaction Engine
 * 
 * Enterprise-grade PII masking, redaction, and compliance features
 * for fintech and security-heavy environments.
 */

export class SecurityRedactionEngine {
  // Enhanced pattern definitions for comprehensive PII detection
  private static readonly REDACTION_PATTERNS = {
    // Financial patterns
    creditCards: {
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: '****-****-****-****',
      category: 'financial',
      severity: 'high'
    },
    
    // Cryptocurrency addresses
    bitcoinAddresses: {
      pattern: /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g,
      replacement: '***BITCOIN_ADDRESS***',
      category: 'cryptocurrency',
      severity: 'medium'
    },
    
    ethereumAddresses: {
      pattern: /\b0x[a-fA-F0-9]{40}\b/g,
      replacement: '***ETHEREUM_ADDRESS***',
      category: 'cryptocurrency',
      severity: 'medium'
    },
    
    // Personal Identifiable Information
    ssn: {
      pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      replacement: '***-**-****',
      category: 'pii',
      severity: 'critical'
    },
    
    emails: {
      pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      replacement: '***@***.***',
      category: 'pii',
      severity: 'medium'
    },
    
    phones: {
      pattern: /(?:\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
      replacement: '***-***-****',
      category: 'pii',
      severity: 'medium'
    },
    
    // Security-sensitive patterns
    apiKeys: {
      pattern: /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
      replacement: (match: string, type: string, key: string) => `${type}: ${'*'.repeat(key.length)}`,
      category: 'security',
      severity: 'critical'
    },
    
    passwords: {
      pattern: /(password|pwd|pass)[:=]\s*['"]?([^\s'"]{6,})['"]?/gi,
      replacement: (match: string, type: string, pwd: string) => `${type}: ${'*'.repeat(pwd.length)}`,
      category: 'security',
      severity: 'critical'
    },
    
    jwtTokens: {
      pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      replacement: '***JWT_TOKEN***',
      category: 'security',
      severity: 'high'
    },
    
    // Banking and payment patterns
    routingNumbers: {
      pattern: /\b\d{9}\b/g,
      replacement: '*********',
      category: 'financial',
      severity: 'high'
    },
    
    accountNumbers: {
      pattern: /\b\d{8,17}\b/g,
      replacement: (match: string) => '*'.repeat(match.length),
      category: 'financial',
      severity: 'high'
    },
    
    // Location data
    addresses: {
      pattern: /\d+\s+[\w\s]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl)\s*,?\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}/gi,
      replacement: '*** ADDRESS ***',
      category: 'location',
      severity: 'medium'
    },
    
    // Data patterns
    base64Strings: {
      pattern: /(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)/g,
      replacement: '***BASE64***',
      category: 'data',
      severity: 'low'
    },
    
    // URLs with potential sensitive info
    urls: {
      pattern: /https?:\/\/[^\s<>"{}|\\^`[\]]*token=[^\s<>"{}|\\^`[\]]*/gi,
      replacement: (match: string) => {
        const url = new URL(match);
        url.searchParams.set('token', '***');
        return url.toString();
      },
      category: 'security',
      severity: 'medium'
    }
  };

  /**
   * Apply redaction based on specified categories
   */
  static applyRedaction(obj: any, options: {
    categories?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    preserveStructure?: boolean;
    customPatterns?: Array<{
      name: string;
      pattern: RegExp;
      replacement: string | ((match: string, ...args: any[]) => string);
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  } = {}): {
    redacted: any;
    summary: {
      totalRedactions: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
      patterns: Array<{
        pattern: string;
        category: string;
        severity: string;
        count: number;
      }>;
    };
  } {
    const {
      categories = Object.keys(this.REDACTION_PATTERNS),
      severity = 'low',
      preserveStructure = true,
      customPatterns = []
    } = options;

    const summary = {
      totalRedactions: 0,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      patterns: [] as Array<{
        pattern: string;
        category: string;
        severity: string;
        count: number;
      }>
    };

    // Combine built-in and custom patterns
    const allPatterns = { ...this.REDACTION_PATTERNS };
    customPatterns.forEach(pattern => {
      allPatterns[pattern.name] = {
        pattern: pattern.pattern,
        replacement: pattern.replacement,
        category: pattern.category,
        severity: pattern.severity
      };
    });

    // Filter patterns by category and severity
    const activePatterns = Object.entries(allPatterns).filter(([name, config]) => {
      const categoryMatch = categories.includes(config.category);
      const severityMatch = this.severityMeetsThreshold(config.severity, severity);
      return categoryMatch && severityMatch;
    });

    const redacted = this.deepRedact(obj, activePatterns, summary);

    return { redacted, summary };
  }

  /**
   * Deep redaction through object structure
   */
  private static deepRedact(obj: any, patterns: Array<[string, any]>, summary: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redactString(obj, patterns, summary);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepRedact(item, patterns, summary));
    }

    if (typeof obj === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        redacted[key] = this.deepRedact(value, patterns, summary);
      }
      return redacted;
    }

    return obj;
  }

  /**
   * Apply redaction to string values
   */
  private static redactString(str: string, patterns: Array<[string, any]>, summary: any): string {
    let result = str;

    for (const [name, config] of patterns) {
      const matches = result.match(config.pattern);
      if (matches) {
        const beforeLength = result.length;
        
        if (typeof config.replacement === 'function') {
          result = result.replace(config.pattern, config.replacement);
        } else {
          result = result.replace(config.pattern, config.replacement);
        }

        // Update summary
        const redactionCount = matches.length;
        summary.totalRedactions += redactionCount;
        summary.byCategory[config.category] = (summary.byCategory[config.category] || 0) + redactionCount;
        summary.bySeverity[config.severity] = (summary.bySeverity[config.severity] || 0) + redactionCount;

        summary.patterns.push({
          pattern: name,
          category: config.category,
          severity: config.severity,
          count: redactionCount
        });
      }
    }

    return result;
  }

  /**
   * Check if severity meets threshold
   */
  private static severityMeetsThreshold(patternSeverity: string, threshold: string): boolean {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[patternSeverity as keyof typeof levels] >= levels[threshold as keyof typeof levels];
  }

  /**
   * Generate compliance report
   */
  static generateComplianceReport(redactionSummary: any): {
    compliance: 'compliant' | 'warning' | 'non-compliant';
    risks: string[];
    recommendations: string[];
    score: number;
  } {
    const { totalRedactions, byCategory, bySeverity } = redactionSummary;
    
    let compliance: 'compliant' | 'warning' | 'non-compliant' = 'compliant';
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    // Check for critical security issues
    if (bySeverity.critical > 0) {
      compliance = 'non-compliant';
      risks.push(`Found ${bySeverity.critical} critical security items`);
      recommendations.push('Immediately remove or encrypt all critical security data');
    }
    
    // Check for high severity issues
    if (bySeverity.high > 5) {
      if (compliance === 'compliant') compliance = 'warning';
      risks.push(`Found ${bySeverity.high} high-severity items`);
      recommendations.push('Review and secure high-severity data');
    }
    
    // Check for PII exposure
    if (byCategory.pii > 10) {
      if (compliance === 'compliant') compliance = 'warning';
      risks.push(`Found ${byCategory.pii} PII items`);
      recommendations.push('Implement data minimization and access controls');
    }
    
    // Check for financial data exposure
    if (byCategory.financial > 0) {
      if (compliance === 'compliant') compliance = 'warning';
      risks.push(`Found ${byCategory.financial} financial items`);
      recommendations.push('Ensure PCI DSS compliance for financial data');
    }
    
    // Calculate compliance score
    let score = 100;
    score -= (bySeverity.critical * 25);
    score -= (bySeverity.high * 10);
    score -= (bySeverity.medium * 5);
    score -= (bySeverity.low * 1);
    score = Math.max(0, score);
    
    return {
      compliance,
      risks,
      recommendations,
      score
    };
  }

  /**
   * Create redaction policy
   */
  static createPolicy(options: {
    environment?: 'development' | 'staging' | 'production';
    dataClassifications?: string[];
    regions?: string[];
    customRules?: any[];
  } = {}): {
    patterns: string[];
    severity: string;
    categories: string[];
    metadata: any;
  } {
    const { environment = 'production', dataClassifications = [], regions = [] } = options;
    
    let severity = 'medium';
    let categories = ['security', 'pii', 'financial'];
    
    // Adjust based on environment
    if (environment === 'production') {
      severity = 'low';
      categories = ['security', 'pii', 'financial', 'cryptocurrency', 'location'];
    } else if (environment === 'development') {
      severity = 'high';
      categories = ['security'];
    }
    
    // Adjust based on data classifications
    if (dataClassifications.includes('pci')) {
      categories.push('financial');
    }
    
    if (dataClassifications.includes('hipaa')) {
      categories.push('pii', 'location');
    }
    
    // Adjust based on regions
    if (regions.some(r => ['gdpr', 'eu'].includes(r.toLowerCase()))) {
      categories.push('pii', 'location');
    }
    
    return {
      patterns: Object.keys(this.REDACTION_PATTERNS).filter(name => 
        categories.includes(this.REDACTION_PATTERNS[name as keyof typeof this.REDACTION_PATTERNS].category)
      ),
      severity,
      categories,
      metadata: {
        environment,
        dataClassifications,
        regions,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Validate redaction effectiveness
   */
  static validateRedaction(original: any, redacted: any): {
    effectiveness: number;
    remainingRisks: string[];
    validation: 'passed' | 'warning' | 'failed';
  } {
    const originalStr = JSON.stringify(original);
    const redactedStr = JSON.stringify(redacted);
    
    // Check for remaining sensitive patterns
    const remainingRisks: string[] = [];
    
    // Check for emails
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(redactedStr)) {
      remainingRisks.push('Email addresses still present');
    }
    
    // Check for phone numbers
    if (/(?:\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/.test(redactedStr)) {
      remainingRisks.push('Phone numbers still present');
    }
    
    // Check for credit cards
    if (/\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b/.test(redactedStr)) {
      remainingRisks.push('Credit card numbers still present');
    }
    
    // Check for API keys
    if (/(api[_-]?key|secret[_-]?key|access[_-]?token)[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/.test(redactedStr)) {
      remainingRisks.push('API keys or tokens still present');
    }
    
    // Calculate effectiveness
    const originalSensitive = this.countSensitivePatterns(originalStr);
    const redactedSensitive = this.countSensitivePatterns(redactedStr);
    const effectiveness = originalSensitive > 0 ? 
      ((originalSensitive - redactedSensitive) / originalSensitive) * 100 : 100;
    
    let validation: 'passed' | 'warning' | 'failed' = 'passed';
    if (remainingRisks.length > 3) validation = 'failed';
    else if (remainingRisks.length > 0) validation = 'warning';
    
    return {
      effectiveness: Math.round(effectiveness),
      remainingRisks,
      validation
    };
  }

  /**
   * Count sensitive patterns in string
   */
  private static countSensitivePatterns(str: string): number {
    let count = 0;
    
    Object.values(this.REDACTION_PATTERNS).forEach(config => {
      const matches = str.match(config.pattern);
      if (matches) count += matches.length;
    });
    
    return count;
  }

  /**
   * Get available redaction categories
   */
  static getCategories(): Array<{
    name: string;
    description: string;
    severity: string;
    examples: string[];
  }> {
    return [
      {
        name: 'security',
        description: 'API keys, tokens, passwords, JWT tokens',
        severity: 'critical',
        examples: ['api_key: sk_live_123456', 'password: secret123', 'eyJhbGciOiJIUzI1NiIs']
      },
      {
        name: 'pii',
        description: 'Personal Identifiable Information',
        severity: 'medium',
        examples: ['user@example.com', '555-123-4567', '123-45-6789']
      },
      {
        name: 'financial',
        description: 'Credit cards, account numbers, routing numbers',
        severity: 'high',
        examples: ['4111-1111-1111-1111', '123456789', '987654321']
      },
      {
        name: 'cryptocurrency',
        description: 'Bitcoin and Ethereum addresses',
        severity: 'medium',
        examples: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45']
      },
      {
        name: 'location',
        description: 'Physical addresses and location data',
        severity: 'medium',
        examples: ['123 Main St, City, ST 12345', '456 Oak Ave, Town, State 67890']
      },
      {
        name: 'data',
        description: 'Base64 strings and encoded data',
        severity: 'low',
        examples: ['SGVsbG8gV29ybGQ=', 'eyJ0ZXN0IjoidmFsdWUifQ==']
      }
    ];
  }
}

export default SecurityRedactionEngine;
