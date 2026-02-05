// src/core/enhanced-url-patterns.ts
/**
 * 🌐 Enhanced URL Patterns & Naming Conventions
 * 
 * RESTful API design with security-first principles and scalable architecture.
 */

export interface URLPattern {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  security: 'public' | 'authenticated' | 'admin';
  deprecated?: boolean;
  migration?: string;
}

export interface ResourceIdentifier {
  type: 'merchant' | 'evidence' | 'batch' | 'alert' | 'dispute';
  pattern: string;
  example: string;
}

export class EnhancedURLPatterns {
  private static readonly RESOURCE_PATTERNS: ResourceIdentifier[] = [
    {
      type: 'merchant',
      pattern: 'm_{year}_{8char}',
      example: 'm_2026_7hG9kL2p'
    },
    {
      type: 'evidence',
      pattern: 'ev_{year}_{8char}',
      example: 'ev_2026_xH7zK9qR'
    },
    {
      type: 'batch',
      pattern: 'batch_{date}_{6char}',
      example: 'batch_20260116_aB3xY9'
    },
    {
      type: 'alert',
      pattern: 'alert_{timestamp}_{4char}',
      example: 'alert_1705425600_Jk7L'
    },
    {
      type: 'dispute',
      pattern: 'disp_{year}_{8char}',
      example: 'disp_2026_9Km3nQ8r'
    }
  ];

  private static readonly V1_API_PATTERNS: Record<string, URLPattern[]> = {
    evidence: [
      {
        method: 'POST',
        path: '/v1/merchants/{merchantId}/evidence',
        description: 'Upload new evidence with integrity check',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/evidence/{evidenceId}',
        description: 'Retrieve evidence metadata',
        security: 'authenticated'
      },
      {
        method: 'POST',
        path: '/v1/evidence/{evidenceId}/verify',
        description: 'Verify evidence integrity (tamper detection)',
        security: 'authenticated'
      },
      {
        method: 'PUT',
        path: '/v1/evidence/{evidenceId}/monitor',
        description: 'Enable real-time tampering alerts',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/evidence/{evidenceId}/history',
        description: 'Get evidence modification history',
        security: 'authenticated'
      },
      {
        method: 'PATCH',
        path: '/v1/evidence/{evidenceId}/update',
        description: 'Update evidence metadata',
        security: 'authenticated'
      },
      {
        method: 'DELETE',
        path: '/v1/evidence/{evidenceId}',
        description: 'Delete evidence (audit logged)',
        security: 'admin'
      }
    ],
    
    merchants: [
      {
        method: 'GET',
        path: '/v1/merchants/{merchantId}',
        description: 'Get merchant profile',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/merchants/{merchantId}/evidence',
        description: 'List all merchant evidence',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/merchants/{merchantId}/disputes',
        description: 'List merchant disputes',
        security: 'authenticated'
      },
      {
        method: 'POST',
        path: '/v1/merchants/{merchantId}/disputes/batch',
        description: 'Submit disputes for batch processing',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/merchants/{merchantId}/analytics',
        description: 'Get merchant analytics',
        security: 'authenticated'
      }
    ],

    monitoring: [
      {
        method: 'GET',
        path: '/v1/monitoring/evidence/{evidenceId}/status',
        description: 'Get real-time evidence monitoring status',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/monitoring/merchants/{merchantId}/alerts',
        description: 'Get merchant security alerts',
        security: 'authenticated'
      },
      {
        method: 'POST',
        path: '/v1/monitoring/alerts/{alertId}/acknowledge',
        description: 'Acknowledge security alert',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/monitoring/system/health',
        description: 'Get system health metrics',
        security: 'public'
      }
    ],

    audit: [
      {
        method: 'GET',
        path: '/v1/audit/evidence/{evidenceId}',
        description: 'Get evidence audit trail',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/audit/batches',
        description: 'Retrieve batch processing history',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/audit/merchants/{merchantId}/activity',
        description: 'Get merchant activity log',
        security: 'authenticated'
      },
      {
        method: 'POST',
        path: '/v1/audit/export',
        description: 'Export audit data (admin only)',
        security: 'admin'
      }
    ],

    analytics: [
      {
        method: 'GET',
        path: '/v1/analytics/integrity-performance',
        description: 'Quantum hash performance metrics',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/analytics/merchants/{merchantId}/metrics',
        description: 'Merchant-specific performance metrics',
        security: 'authenticated'
      },
      {
        method: 'GET',
        path: '/v1/analytics/security/threats',
        description: 'Security threat analysis',
        security: 'admin'
      },
      {
        method: 'GET',
        path: '/v1/analytics/usage/statistics',
        description: 'API usage statistics',
        security: 'authenticated'
      }
    ]
  };

  private static readonly DASHBOARD_PATTERNS = {
    merchants: [
      '/merchants/{merchantId}/evidence',
      '/merchants/{merchantId}/evidence/live-monitor',
      '/merchants/{merchantId}/batches',
      '/merchants/{merchantId}/disputes',
      '/merchants/{merchantId}/analytics'
    ],
    security: [
      '/security/alerts',
      '/security/threats',
      '/security/compliance',
      '/security/audit-log'
    ],
    analytics: [
      '/analytics/integrity-performance',
      '/analytics/usage-statistics',
      '/analytics/security-metrics',
      '/analytics/performance-insights'
    ],
    admin: [
      '/admin/system-health',
      '/admin/user-management',
      '/admin/configuration',
      '/admin/audit-logs'
    ]
  };

  // Legacy patterns for migration
  private static readonly LEGACY_PATTERNS = [
    {
      old: '/evidence',
      new: '/v1/merchants/{merchantId}/evidence',
      method: 'GET',
      migration: '301-redirect'
    },
    {
      old: '/evidence/verify',
      new: '/v1/evidence/{evidenceId}/verify',
      method: 'POST',
      migration: '301-redirect'
    },
    {
      old: '/monitoring',
      new: '/v1/monitoring/evidence/{evidenceId}/status',
      method: 'GET',
      migration: '301-redirect'
    }
  ];

  // Generate secure resource identifiers
  static generateResourceId(type: ResourceIdentifier['type']): string {
    const pattern = this.RESOURCE_PATTERNS.find(p => p.type === type);
    if (!pattern) {
      throw new Error(`Unknown resource type: ${type}`);
    }

    const year = new Date().getFullYear().toString();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    let randomPart = '';
    const length = type === 'batch' ? 6 : type === 'alert' ? 4 : 8;
    
    for (let i = 0; i < length; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (type === 'batch') {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `batch_${date}_${randomPart}`;
    }

    if (type === 'alert') {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      return `alert_${timestamp}_${randomPart}`;
    }

    const prefix = type === 'merchant' ? 'm' : type === 'evidence' ? 'ev' : 'disp';
    return `${prefix}_${year}_${randomPart}`;
  }

  // Validate resource identifier format
  static validateResourceId(type: ResourceIdentifier['type'], id: string): boolean {
    const pattern = this.RESOURCE_PATTERNS.find(p => p.type === type);
    if (!pattern) return false;

    const regex = new RegExp(
      pattern.pattern
        .replace('{year}', '\\d{4}')
        .replace('{date}', '\\d{8}')
        .replace('{timestamp}', '\\d{10}')
        .replace('{8char}', '[A-Za-z0-9]{8}')
        .replace('{6char}', '[A-Za-z0-9]{6}')
        .replace('{4char}', '[A-Za-z0-9]{4}')
    );

    return regex.test(id);
  }

  // Get API patterns by category
  static getAPIPatterns(category: keyof typeof this.V1_API_PATTERNS): URLPattern[] {
    return this.V1_API_PATTERNS[category] || [];
  }

  // Get all API patterns
  static getAllAPIPatterns(): Record<string, URLPattern[]> {
    return this.V1_API_PATTERNS;
  }

  // Get dashboard patterns by category
  static getDashboardPatterns(category: keyof typeof this.DASHBOARD_PATTERNS): string[] {
    return this.DASHBOARD_PATTERNS[category] || [];
  }

  // Get migration mappings
  static getMigrationMappings(): typeof this.LEGACY_PATTERNS {
    return this.LEGACY_PATTERNS;
  }

  // Build secure URL with parameters
  static buildURL(pattern: string, params: Record<string, string>): string {
    let url = pattern;
    
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });

    return url;
  }

  // Validate URL security (no filesystem paths)
  static validateURLSecurity(url: string): {
    isValid: boolean;
    risks: string[];
  } {
    const risks: string[] = [];

    // Check for path traversal attempts
    if (url.includes('../') || url.includes('..\\')) {
      risks.push('Path traversal detected');
    }

    // Check for filesystem paths
    if (url.includes('/') && url.includes('.')) {
      const parts = url.split('/');
      parts.forEach(part => {
        if (part.includes('.') && !part.includes('{') && !part.includes('ev_') && !part.includes('m_')) {
          risks.push('Potential filesystem path exposure');
        }
      });
    }

    // Check for sequential IDs (should use opaque identifiers)
    if (/\d{1,6}$/.test(url) && !url.includes('ev_') && !url.includes('m_') && !url.includes('batch_')) {
      risks.push('Sequential ID detected - use opaque identifiers');
    }

    return {
      isValid: risks.length === 0,
      risks
    };
  }

  // Generate migration plan
  static generateMigrationPlan(): string {
    let plan = '🚀 URL MIGRATION PLAN\n';
    plan += '='.repeat(50) + '\n\n';

    plan += '📊 LEGACY PATTERNS TO MIGRATE:\n';
    plan += '-'.repeat(35) + '\n';
    
    this.LEGACY_PATTERNS.forEach((mapping, index) => {
      plan += `${index + 1}. ${mapping.old} → ${mapping.new}\n`;
      plan += `   Method: ${mapping.method}\n`;
      plan += `   Migration: ${mapping.migration}\n\n`;
    });

    plan += '🔧 IMPLEMENTATION STEPS:\n';
    plan += '-'.repeat(25) + '\n';
    plan += '1. Deploy new URL patterns with feature flag\n';
    plan += '2. Implement 301 redirects for legacy patterns\n';
    plan += '3. Update API documentation\n';
    plan += '4. Migrate client applications\n';
    plan += '5. Deprecate legacy patterns\n\n';

    plan += '⚠️  SECURITY IMPROVEMENTS:\n';
    plan += '-'.repeat(30) + '\n';
    plan += '• Eliminated filesystem path exposure\n';
    plan += '• Implemented opaque identifiers\n';
    plan += '• Resource-scoped endpoints\n';
    plan += '• Action isolation for sensitive operations\n';

    return plan;
  }

  // Get resource identifier patterns
  static getResourcePatterns(): ResourceIdentifier[] {
    return this.RESOURCE_PATTERNS;
  }
}

// Export convenience functions
export const generateMerchantId = () => EnhancedURLPatterns.generateResourceId('merchant');
export const generateEvidenceId = () => EnhancedURLPatterns.generateResourceId('evidence');
export const generateBatchId = () => EnhancedURLPatterns.generateResourceId('batch');
export const generateAlertId = () => EnhancedURLPatterns.generateResourceId('alert');
export const generateDisputeId = () => EnhancedURLPatterns.generateResourceId('dispute');

export const validateMerchantId = (id: string) => EnhancedURLPatterns.validateResourceId('merchant', id);
export const validateEvidenceId = (id: string) => EnhancedURLPatterns.validateResourceId('evidence', id);

// Run demo if this is the main module
if (import.meta.main) {
  console.log('🌐 ENHANCED URL PATTERNS DEMO');
  console.log('='.repeat(40));
  
  console.log('\n🔧 Generated Resource IDs:');
  console.log(`Merchant ID: ${generateMerchantId()}`);
  console.log(`Evidence ID: ${generateEvidenceId()}`);
  console.log(`Batch ID: ${generateBatchId()}`);
  console.log(`Alert ID: ${generateAlertId()}`);
  console.log(`Dispute ID: ${generateDisputeId()}`);

  console.log('\n🔗 Example API URLs:');
  const merchantId = generateMerchantId();
  const evidenceId = generateEvidenceId();
  
  console.log(EnhancedURLPatterns.buildURL('/v1/merchants/{merchantId}/evidence', { merchantId }));
  console.log(EnhancedURLPatterns.buildURL('/v1/evidence/{evidenceId}/verify', { evidenceId }));
  console.log(EnhancedURLPatterns.buildURL('/v1/merchants/{merchantId}/evidence/live-monitor', { merchantId }));

  console.log('\n🛡️ Security Validation:');
  const secureURL = '/v1/evidence/ev_2026_xH7zK9qR/verify';
  const insecureURL = '/evidence?file=../../etc/passwd';
  
  console.log(`Secure URL: ${secureURL}`);
  console.log(`Validation: ${JSON.stringify(EnhancedURLPatterns.validateURLSecurity(secureURL))}`);
  
  console.log(`\nInsecure URL: ${insecureURL}`);
  console.log(`Validation: ${JSON.stringify(EnhancedURLPatterns.validateURLSecurity(insecureURL))}`);

  console.log('\n📋 Migration Plan:');
  console.log(EnhancedURLPatterns.generateMigrationPlan());
}
