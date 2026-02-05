#!/usr/bin/env bun

/**
 * 🔐 Fantasy42 User-Agent Security Registry
 *
 * Centralized User-Agent management for Fantasy42 sports betting security packages
 * with Bun's --user-agent flag integration and enterprise compliance features.
 */

export const Fantasy42UserAgents = {
  // Core Security Packages
  FRAUD_DETECTION: 'Fantasy42-FraudDetector/3.1.0',
  PAYMENT_SECURITY: 'Fantasy42-PaymentSecure/4.2.0',
  COMPLIANCE_CORE: 'Fantasy42-Compliance/4.3.0',
  RISK_ASSESSMENT: 'Fantasy42-RiskEngine/2.8.0',
  AUDIT_LOGGER: 'Fantasy42-AuditLogger/2.7.0',

  // Betting Engine Packages
  WAGER_PROCESSOR: 'Fantasy42-WagerProcessor/2.1.0',
  ODDS_CALCULATOR: 'Fantasy42-OddsCalculator/3.2.0',
  BET_VALIDATION: 'Fantasy42-BetValidation/1.9.0',

  // Payment Processing Packages
  PAYMENT_GATEWAY: 'Fantasy42-PaymentGateway/4.2.0',
  CRYPTO_PROCESSOR: 'Fantasy42-CryptoProcessor/2.1.0',
  ESCROW_MANAGER: 'Fantasy42-EscrowManager/1.7.0',

  // Analytics Dashboard Packages
  ANALYTICS_DASHBOARD: 'Fantasy42-Analytics/2.7.0',
  REAL_TIME_METRICS: 'Fantasy42-Metrics/1.9.0',
  PERFORMANCE_MONITOR: 'Fantasy42-Performance/3.1.0',

  // User Management Packages
  USER_MANAGEMENT: 'Fantasy42-UserMgmt/3.6.0',
  KYC_VERIFICATION: 'Fantasy42-KYC/2.8.0',
  VIP_MANAGEMENT: 'Fantasy42-VIP/3.2.0',

  // Infrastructure Packages
  CLOUDFLARE_WORKER: 'Fantasy42-Cloudflare/2.3.0',
  DURABLE_OBJECTS: 'Fantasy42-DurableObj/1.8.0',
  EDGE_COMPUTING: 'Fantasy42-EdgeCompute/2.1.0',

  // Development Tools
  FIRE22_CLI: 'Fantasy42-CLI/1.9.0',
  TEST_SUITE: 'Fantasy42-TestSuite/2.4.0',

  // Environment-specific variants with enhanced security
  getEnvironmentAgent(
    packageName: string,
    environment: string,
    options?: {
      compliance?: boolean;
      buildVersion?: string;
      geoRegion?: string;
    }
  ): string {
    const baseAgent = this[packageName as keyof typeof Fantasy42UserAgents];
    if (!baseAgent) throw new Error(`Unknown package: ${packageName}`);

    const cleanEnv = environment.toLowerCase();
    let agent = `${baseAgent} (${cleanEnv})`;

    // Add compliance tags
    if (options?.compliance) {
      agent = this.withCompliance(agent);
    }

    // Add build version for tracking
    if (options?.buildVersion) {
      agent = this.withBuildVersion(agent, options.buildVersion);
    }

    // Add geographic region for compliance
    if (options?.geoRegion) {
      agent = this.withGeoRegion(agent, options.geoRegion);
    }

    return agent;
  },

  // Compliance tags for GDPR, PCI, AML compliance
  withCompliance(agent: string): string {
    return `${agent} (GDPR-Compliant PCI-DSS AML-Ready)`;
  },

  // Build version tracking
  withBuildVersion(agent: string, version: string): string {
    return `${agent} (Build:${version})`;
  },

  // Geographic region for jurisdiction compliance
  withGeoRegion(agent: string, region: string): string {
    const regions = {
      us: 'US-Market',
      eu: 'EU-GDPR',
      uk: 'UK-Gambling',
      asia: 'Asia-Pacific',
      global: 'Global-Compliance',
    };

    const regionTag = regions[region.toLowerCase() as keyof typeof regions] || region.toUpperCase();
    return `${agent} (${regionTag})`;
  },

  // Security level indicators
  withSecurityLevel(agent: string, level: 'standard' | 'enhanced' | 'maximum'): string {
    const levels = {
      standard: 'Sec:Standard',
      enhanced: 'Sec:Enhanced',
      maximum: 'Sec:Maximum',
    };

    return `${agent} (${levels[level]})`;
  },

  // Generate enterprise User-Agent with all compliance features
  generateEnterpriseAgent(
    packageName: string,
    options: {
      environment: string;
      buildVersion: string;
      geoRegion: string;
      securityLevel: 'standard' | 'enhanced' | 'maximum';
      compliance: boolean;
    }
  ): string {
    let agent = this.getEnvironmentAgent(packageName, options.environment);

    agent = this.withBuildVersion(agent, options.buildVersion);
    agent = this.withGeoRegion(agent, options.geoRegion);
    agent = this.withSecurityLevel(agent, options.securityLevel);

    if (options.compliance) {
      agent = this.withCompliance(agent);
    }

    return agent;
  },
};

// Environment presets with enterprise configurations
export const EnvironmentConfig = {
  production: {
    userAgent: (pkg: string, options?: any) =>
      Fantasy42UserAgents.getEnvironmentAgent(pkg, 'production', {
        compliance: true,
        geoRegion: options?.geoRegion || 'global',
        buildVersion: options?.buildVersion,
        ...options,
      }),
    timeout: 5000,
    retryAttempts: 3,
    securityLevel: 'maximum' as const,
    monitoring: true,
    compliance: true,
  },
  staging: {
    userAgent: (pkg: string, options?: any) =>
      Fantasy42UserAgents.getEnvironmentAgent(pkg, 'staging', {
        compliance: true,
        geoRegion: options?.geoRegion || 'us',
        buildVersion: options?.buildVersion,
        ...options,
      }),
    timeout: 10000,
    retryAttempts: 2,
    securityLevel: 'enhanced' as const,
    monitoring: true,
    compliance: true,
  },
  development: {
    userAgent: (pkg: string, options?: any) =>
      Fantasy42UserAgents.getEnvironmentAgent(pkg, 'development', {
        compliance: false,
        geoRegion: options?.geoRegion || 'us',
        buildVersion: options?.buildVersion || 'dev',
        ...options,
      }),
    timeout: 30000,
    retryAttempts: 1,
    securityLevel: 'standard' as const,
    monitoring: false,
    compliance: false,
  },
  enterprise: {
    userAgent: (pkg: string, options?: any) =>
      Fantasy42UserAgents.generateEnterpriseAgent(pkg, {
        environment: 'enterprise',
        buildVersion: options?.buildVersion || 'enterprise',
        geoRegion: options?.geoRegion || 'global',
        securityLevel: 'maximum',
        compliance: true,
        ...options,
      }),
    timeout: 3000,
    retryAttempts: 5,
    securityLevel: 'maximum' as const,
    monitoring: true,
    compliance: true,
    auditTrails: true,
  },
};

// Geographic compliance configurations
export const GeographicCompliance = {
  us: {
    regulations: ['CCPA', 'GLBA'],
    restrictions: ['age-21', 'state-licensing'],
    userAgent: (agent: string) => `${agent} (US-Compliance)`,
  },
  eu: {
    regulations: ['GDPR', 'PSD2'],
    restrictions: ['age-18', 'gdpr-consent'],
    userAgent: (agent: string) => `${agent} (EU-GDPR)`,
  },
  uk: {
    regulations: ['UK-Gambling', 'GDPR'],
    restrictions: ['age-18', 'gbc-license'],
    userAgent: (agent: string) => `${agent} (UK-Gambling)`,
  },
  asia: {
    regulations: ['APAC-Gambling', 'PDPA'],
    restrictions: ['age-21', 'regional-licensing'],
    userAgent: (agent: string) => `${agent} (Asia-Pacific)`,
  },
};

// Security monitoring and anomaly detection
export class UserAgentMonitor {
  private static agentUsage = new Map<string, number>();
  private static suspiciousPatterns = [
    'curl',
    'wget',
    'python-requests',
    'postman',
    'burp',
    'nikto',
    'sqlmap',
    'nmap',
    'metasploit',
    'unknown',
    'bot',
    'spider',
    'crawler',
  ];
  private static blockedAgents = new Set<string>();

  static trackAgent(agent: string): void {
    this.agentUsage.set(agent, (this.agentUsage.get(agent) || 0) + 1);

    // Check for suspicious patterns
    if (this.isSuspicious(agent)) {
      console.warn(`🚨 Suspicious User-Agent detected: ${agent}`);
      this.blockedAgents.add(agent);
    }
  }

  static isSuspicious(agent: string): boolean {
    const lowerAgent = agent.toLowerCase();
    return this.suspiciousPatterns.some(pattern => lowerAgent.includes(pattern.toLowerCase()));
  }

  static isBlocked(agent: string): boolean {
    return this.blockedAgents.has(agent);
  }

  static getAgentUsage(): Record<string, number> {
    return Object.fromEntries(this.agentUsage);
  }

  static getBlockedAgents(): string[] {
    return Array.from(this.blockedAgents);
  }

  static generateSecurityReport(): string {
    const usage = this.getAgentUsage();
    const blocked = this.getBlockedAgents();
    const suspicious = Array.from(this.agentUsage.keys()).filter(agent => this.isSuspicious(agent));

    const report = {
      timestamp: new Date().toISOString(),
      totalAgents: this.agentUsage.size,
      totalRequests: Array.from(this.agentUsage.values()).reduce((a, b) => a + b, 0),
      blockedAgents: blocked.length,
      suspiciousAgents: suspicious.length,
      compliance: {
        gdpr: true,
        pci: true,
        security: true,
      },
      recommendations: [
        blocked.length > 0 ? 'Review blocked agents for security threats' : null,
        suspicious.length > 0 ? 'Investigate suspicious User-Agent patterns' : null,
        'Monitor User-Agent usage for anomalies',
      ].filter(Boolean),
    };

    return JSON.stringify(report, null, 2);
  }

  static clearTracking(): void {
    this.agentUsage.clear();
    this.blockedAgents.clear();
  }
}

// Export everything for use across packages
export default Fantasy42UserAgents;
