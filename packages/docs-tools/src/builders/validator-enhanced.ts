// packages/docs-tools/src/builders/validator-enhanced.ts — Enhanced URL validation and normalization

import {
  DocumentationProvider,
  DocumentationCategory,
  DocumentationDomain,
  DocumentationURLType,
  DocumentationUserType,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
} from '../../../../lib/docs/constants/domains';

export interface DocumentationMetadata {
  provider?: DocumentationProvider;
  category?: DocumentationCategory;
  domain?: DocumentationDomain;
  path?: string;
  fragment?: string;
  queryParams?: Record<string, string>;
  isValid: boolean;
  urlType: DocumentationURLType;
  securityScore?: number; // 0-10, higher is better
  lastValidated?: Date;
}

export interface ValidationOptions {
  allowedProtocols?: string[];
  allowedHosts?: string[];
  allowedProviders?: DocumentationProvider[];
  allowedCategories?: DocumentationCategory[];
  requireHTTPS?: boolean;
  allowFragments?: boolean;
  allowQueryParams?: boolean;
  maxLength?: number;
  securityChecks?: boolean;
  validateExternals?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  metadata: DocumentationMetadata;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface SecurityValidationResult {
  isSecure: boolean;
  risks: Array<{
    type: 'protocol' | 'hostname' | 'path' | 'query' | 'fragment';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation?: string;
  }>;
  score: number; // 0-10
}

// Enhanced validator with comprehensive security and type checking
export class EnterpriseDocumentationURLValidator {
  // Known documentation domains for validation
  private static readonly KNOWN_DOMAINS = [
    'bun.sh',
    'bun.com',
    'bun.dev',
    'bun.io',
    'docs.bun.sh',
    'cdn.bun.sh',
    'developer.mozilla.org',
    'nodejs.org',
    'web.dev',
    'github.com',
  ];

  // Default validation options with security-first approach
  private static readonly DEFAULT_OPTIONS: ValidationOptions = {
    allowedProtocols: ['https:', 'http:'],
    allowedHosts: EnterpriseDocumentationURLValidator.KNOWN_DOMAINS,
    requireHTTPS: true,
    allowFragments: true,
    allowQueryParams: true,
    maxLength: 2048,
    securityChecks: true,
    validateExternals: false,
  };

  /**
   * Validate if a hostname is allowed (exact match or valid subdomain)
   */
  private static isValidHostname(hostname: string, allowedHosts: string[]): boolean {
    const lower = hostname.toLowerCase();
    return allowedHosts.some(domain => {
      // Exact match (case-insensitive per RFC 4343)
      if (lower === domain) {
        return true;
      }

      // Valid subdomain (e.g., docs.bun.sh for bun.sh)
      if (lower.endsWith(`.${domain}`)) {
        const subdomain = hostname.slice(0, -`.${domain}`.length);
        // Ensure subdomain is not empty and doesn't contain suspicious patterns
        return (
          subdomain.length > 0 &&
          !subdomain.includes('..') &&
          !/[^a-zA-Z0-9.-]/.test(subdomain) &&
          !subdomain.startsWith('.') &&
          !subdomain.endsWith('.')
        );
      }

      return false;
    });
  }

  /**
   * Comprehensive URL validation with security checks
   */
  public static validateURL(url: string, options?: Partial<ValidationOptions>): ValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const parsed = new URL(url);
      const metadata: DocumentationMetadata = {
        isValid: false,
        urlType: 'unknown',
        lastValidated: new Date(),
      };

      // Protocol validation
      if (opts.allowedProtocols && !opts.allowedProtocols.includes(parsed.protocol)) {
        errors.push(
          `Invalid protocol: ${parsed.protocol}. Allowed: ${opts.allowedProtocols.join(', ')}`
        );
      }

      // HTTPS requirement
      if (opts.requireHTTPS && parsed.protocol !== 'https:') {
        errors.push('HTTPS is required for secure documentation access');
        suggestions.push('Use HTTPS URLs for better security');
      }

      // Hostname validation with security checks
      if (parsed.hostname) {
        if (opts.allowedHosts && !this.isValidHostname(parsed.hostname, opts.allowedHosts)) {
          errors.push(`Invalid hostname: ${parsed.hostname}`);
        }

        // Detect suspicious patterns
        if (opts.securityChecks) {
          const securityResult = this.validateHostnameSecurity(parsed.hostname);
          if (!securityResult.isSecure) {
            warnings.push(...securityResult.risks.map(r => r.description));
            metadata.securityScore = securityResult.score;
          }
        }
      }

      // Length validation
      if (opts.maxLength && url.length > opts.maxLength) {
        errors.push(`URL too long: ${url.length} characters (max: ${opts.maxLength})`);
      }

      // Fragment validation
      if (!opts.allowFragments && parsed.hash) {
        errors.push('URL fragments are not allowed');
      }

      // Query parameter validation
      if (!opts.allowQueryParams && parsed.search) {
        errors.push('Query parameters are not allowed');
      }

      // Extract metadata
      const extractedMetadata = this.extractDocumentationMetadata(url);
      Object.assign(metadata, extractedMetadata);

      // Provider/category validation
      if (
        opts.allowedProviders &&
        metadata.provider &&
        !opts.allowedProviders.includes(metadata.provider)
      ) {
        errors.push(`Provider not allowed: ${metadata.provider}`);
      }

      if (
        opts.allowedCategories &&
        metadata.category &&
        !opts.allowedCategories.includes(metadata.category)
      ) {
        errors.push(`Category not allowed: ${metadata.category}`);
      }

      // Final validation result
      metadata.isValid = errors.length === 0;

      return {
        isValid: metadata.isValid,
        metadata,
        errors,
        warnings,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      // Enhanced error logging
      console.error('URL validation error:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return {
        isValid: false,
        metadata: {
          isValid: false,
          urlType: 'unknown',
          lastValidated: new Date(),
        },
        errors: ['Invalid URL format'],
        warnings: [],
      };
    }
  }

  /**
   * Validate hostname security
   */
  private static validateHostnameSecurity(hostname: string): SecurityValidationResult {
    const risks: SecurityValidationResult['risks'] = [];
    let score = 10; // Start with perfect score

    // Check for suspicious patterns
    if (hostname.includes('..')) {
      risks.push({
        type: 'hostname',
        severity: 'critical',
        description: 'Hostname contains path traversal pattern',
        recommendation: 'Use a valid hostname without path traversal',
      });
      score -= 5;
    }

    if (/[^a-zA-Z0-9.-]/.test(hostname)) {
      risks.push({
        type: 'hostname',
        severity: 'high',
        description: 'Hostname contains invalid characters',
        recommendation: 'Use only alphanumeric characters, dots, and hyphens',
      });
      score -= 3;
    }

    if (hostname.length > 253) {
      risks.push({
        type: 'hostname',
        severity: 'medium',
        description: 'Hostname exceeds maximum length',
        recommendation: 'Use a shorter hostname',
      });
      score -= 2;
    }

    return {
      isSecure: risks.filter(r => r.severity === 'critical' || r.severity === 'high').length === 0,
      risks,
      score: Math.max(0, score),
    };
  }

  /**
   * Extract comprehensive metadata from a documentation URL
   */
  public static extractDocumentationMetadata(url: string): DocumentationMetadata {
    try {
      const parsed = new URL(url);

      // Determine provider based on hostname
      let provider: DocumentationProvider | undefined;
      let urlType: DocumentationURLType = 'unknown';
      let domain: DocumentationDomain | undefined;

      const host = parsed.hostname ?? '';
      const hostIs = (d: string) => host === d || host.endsWith('.' + d);

      if (hostIs('bun.sh')) {
        domain = DocumentationDomain.BUN_SH;
        if (parsed.pathname.includes('/docs/api')) {
          provider = DocumentationProvider.BUN_API_DOCS;
          urlType = 'api_reference';
        } else if (parsed.pathname.includes('/docs/runtime')) {
          provider = DocumentationProvider.BUN_RUNTIME_DOCS;
          urlType = 'technical_docs';
        } else if (parsed.pathname.includes('/docs/cli')) {
          provider = DocumentationProvider.BUN_OFFICIAL;
          urlType = 'technical_docs';
        } else if (parsed.pathname.includes('/docs/security')) {
          provider = DocumentationProvider.BUN_OFFICIAL;
          urlType = 'security';
        } else if (parsed.pathname.includes('/docs/performance')) {
          provider = DocumentationProvider.BUN_OFFICIAL;
          urlType = 'performance';
        } else {
          provider = DocumentationProvider.BUN_OFFICIAL;
          urlType = 'technical_docs';
        }
      } else if (hostIs('bun.com')) {
        domain = DocumentationDomain.BUN_COM;
        if (parsed.pathname.includes('/reference')) {
          provider = DocumentationProvider.BUN_REFERENCE;
          urlType = 'api_reference';
        } else if (parsed.pathname.includes('/guides')) {
          provider = DocumentationProvider.BUN_GUIDES;
          urlType = 'tutorials';
        } else if (parsed.pathname.includes('/tutorials')) {
          provider = DocumentationProvider.BUN_TUTORIALS;
          urlType = 'tutorials';
        } else if (parsed.pathname.includes('/examples')) {
          provider = DocumentationProvider.BUN_EXAMPLES;
          urlType = 'tutorials';
        } else if (parsed.pathname.includes('/rss') || parsed.href.includes('.xml')) {
          provider = DocumentationProvider.BUN_RSS;
          urlType = 'rss';
        } else {
          provider = DocumentationProvider.BUN_REFERENCE;
          urlType = 'unknown';
        }
      } else if (host === 'developer.mozilla.org') {
        provider = DocumentationProvider.MDN_WEB_DOCS;
        urlType = 'technical_docs';
      } else if (hostIs('nodejs.org')) {
        provider = DocumentationProvider.NODE_JS;
        urlType = 'technical_docs';
      } else if (hostIs('github.com')) {
        provider = DocumentationProvider.GITHUB_PUBLIC;
        urlType = 'technical_docs';
      }

      // Extract query parameters
      const queryParams: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      return {
        provider,
        domain,
        path: parsed.pathname,
        fragment: parsed.hash.slice(1), // Remove #
        queryParams,
        isValid: true,
        urlType,
        lastValidated: new Date(),
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return {
        isValid: false,
        urlType: 'unknown',
        lastValidated: new Date(),
      };
    }
  }

  /**
   * Normalize URL to standard format
   */
  public static normalizeURL(url: string): string {
    try {
      const parsed = new URL(url);

      // Ensure HTTPS for documentation URLs
      if (
        parsed.protocol === 'http:' &&
        this.KNOWN_DOMAINS.some(
          domain => parsed.hostname === domain || parsed.hostname?.endsWith('.' + domain)
        )
      ) {
        parsed.protocol = 'https:';
      }

      // Normalize hostname to lowercase
      if (parsed.hostname) {
        parsed.hostname = parsed.hostname.toLowerCase();
      }

      // Remove trailing slash from path (except for root)
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      // Sort query parameters for consistency
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams();
      Array.from(params.keys())
        .sort()
        .forEach(key => {
          const value = params.get(key);
          if (value !== null) {
            sortedParams.set(key, value);
          }
        });
      parsed.search = sortedParams.toString();

      return parsed.toString();
    } catch (error) {
      console.error('URL normalization error:', error);
      return url; // Return original URL if normalization fails
    }
  }

  /**
   * Check if URL is a typed array documentation URL
   */
  public static isTypedArrayURL(url: string): boolean {
    const metadata = this.extractDocumentationMetadata(url);
    return metadata.path?.includes('/runtime/binary-data') || false;
  }

  /**
   * Check if URL is a fetch API documentation URL
   */
  public static isFetchAPIURL(url: string): boolean {
    const metadata = this.extractDocumentationMetadata(url);
    return metadata.path?.includes('/runtime/networking/fetch') || false;
  }

  /**
   * Check if URL is an RSS feed
   */
  public static isRSSFeedURL(url: string): boolean {
    const metadata = this.extractDocumentationMetadata(url);
    return metadata.urlType === 'rss' || url.includes('.xml') || url.includes('/rss');
  }

  /**
   * Get security score for a URL
   */
  public static getSecurityScore(url: string): number {
    const validation = this.validateURL(url, { securityChecks: true });
    return validation.metadata.securityScore || 0;
  }
}

// Export the enhanced validator for backward compatibility
export { EnterpriseDocumentationURLValidator as DocumentationURLValidator };

// Export interfaces for type usage
export type {
  DocumentationMetadata,
  ValidationOptions,
  ValidationResult,
  SecurityValidationResult,
};
