// lib/docs/patterns-enhanced.ts - Enhanced documentation pattern matching with secrets support
import { BUN_DOCS_URL_HELPERS as BUN_DOCS } from './url-builder';

export const DOC_PATTERNS = {
  // Secret URL detection
  isSecretsUrl: (url: string): boolean => url.includes('/runtime/secrets'),

  // Extract secret action from URL
  getSecretsAction: (url: string): string | null => {
    if (!url.includes('/runtime/secrets')) return null;

    const hash = url.split('#')[1];
    if (!hash) return 'overview';

    // Map hashes to human-readable actions
    const actionMap: Record<string, string> = {
      'bun-secrets-get-options': 'get',
      api: 'reference',
      examples: 'examples',
      permissions: 'permissions',
      security: 'security',
      'best-practices': 'best-practices',
      troubleshooting: 'troubleshooting',
    };

    return actionMap[hash] || hash;
  },

  // Get related documentation
  getRelatedDocs: (url: string): string[] => {
    if (url.includes('/runtime/secrets')) {
      return [
        BUN_DOCS.secrets.overview,
        BUN_DOCS.secrets.api,
        BUN_DOCS.secrets.getOptions,
        BUN_DOCS.runtime('binary-data'), // Related runtime API
        BUN_DOCS.runtime('typescript'), // Runtime context
      ];
    }

    if (url.includes('/runtime/binary-data')) {
      return [
        BUN_DOCS.runtime('binary-data'),
        BUN_DOCS.runtime('file-io'),
        BUN_DOCS.runtime('typescript'),
        BUN_DOCS.secrets.overview, // Secrets often use binary data
      ];
    }

    if (url.includes('/runtime/typescript')) {
      return [
        BUN_DOCS.runtime('typescript'),
        BUN_DOCS.runtime('transpiler'),
        BUN_DOCS.secrets.overview,
        BUN_DOCS.runtime('binary-data'),
      ];
    }

    return [];
  },

  // Generate markdown link with color
  toMarkdownLink: (url: string, text?: string): string => {
    const color = url.includes('/runtime/secrets')
      ? '🔐'
      : url.includes('/runtime/binary-data')
        ? '💾'
        : url.includes('/runtime/typescript')
          ? '📘'
          : '📚';
    return `[${color} ${text || url}](${url})`;
  },

  // Extract domain from URL
  getDomain: (url: string): 'sh' | 'com' | null => {
    const match = url.match(/bun\.(sh|com)/);
    return match ? (match[1] as 'sh' | 'com') : null;
  },

  // Check if URL is from stable (sh) or latest (com) domain
  getStability: (url: string): 'stable' | 'latest' | 'unknown' => {
    const domain = DOC_PATTERNS.getDomain(url);
    if (domain === 'sh') return 'stable';
    if (domain === 'com') return 'latest';
    return 'unknown';
  },

  // Generate URL with preferred domain
  withDomain: (url: string, domain: 'sh' | 'com'): string => {
    return url.replace(/bun\.(sh|com)/, `bun.${domain}`);
  },

  // Validate Bun docs URL
  isValidBunUrl: (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.startsWith('bun.') &&
        parsed.pathname.startsWith('/docs/') &&
        ['sh', 'com'].includes(parsed.hostname.split('.')[1])
      );
    } catch {
      return false;
    }
  },

  // Categorize documentation section
  categorizeSection: (url: string): string => {
    if (url.includes('/runtime/secrets')) return 'secrets';
    if (url.includes('/runtime/binary-data')) return 'binary-data';
    if (url.includes('/runtime/typescript')) return 'typescript';
    if (url.includes('/runtime/')) return 'runtime';
    if (url.includes('/bundler/')) return 'bundler';
    if (url.includes('/tester/')) return 'tester';
    if (url.includes('/cli/')) return 'cli';
    return 'other';
  },

  // Generate breadcrumb navigation
  generateBreadcrumbs: (url: string): Array<{ text: string; url: string }> => {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Add base
    breadcrumbs.push({
      text: 'Bun Docs',
      url: `${parsed.protocol}//${parsed.hostname}/docs`,
    });

    // Add path parts
    let currentPath = '/docs';
    for (const part of pathParts.slice(1)) {
      // Skip 'docs'
      currentPath += `/${part}`;
      breadcrumbs.push({
        text: part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: `${parsed.protocol}//${parsed.hostname}${currentPath}`,
      });
    }

    return breadcrumbs;
  },

  // Extract hash and clean it
  cleanHash: (hash: string): string => {
    return hash
      .replace(/^#/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
  },

  // Generate search keywords for URL
  generateKeywords: (url: string): string[] => {
    const keywords: string[] = [];
    const parsed = new URL(url);

    // Add domain
    keywords.push(parsed.hostname);

    // Add path parts
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    keywords.push(...pathParts);

    // Add hash
    if (parsed.hash) {
      keywords.push(DOC_PATTERNS.cleanHash(parsed.hash));
    }

    // Add category
    keywords.push(DOC_PATTERNS.categorizeSection(url));

    // Add action for secrets
    if (DOC_PATTERNS.isSecretsUrl(url)) {
      const action = DOC_PATTERNS.getSecretsAction(url);
      if (action) keywords.push(action);
    }

    return [...new Set(keywords)]; // Remove duplicates
  },
};

// Documentation validation utilities
export const DOC_VALIDATION = {
  // Check if all required secret documentation exists
  validateSecretsDocs: (
    domain: 'sh' | 'com' = 'com'
  ): {
    valid: boolean;
    missing: string[];
    urls: Record<string, string>;
  } => {
    const required = [
      'secrets-overview',
      'secrets-api',
      'secrets-get-options',
      'examples',
      'security',
    ];

    const urls: Record<string, string> = {};
    const missing: string[] = [];

    required.forEach(doc => {
      const url = BUN_DOCS.runtime('secrets', doc, domain);
      urls[doc] = url;
      // In real implementation, you would check if URL is accessible
      // For now, assume all are valid
    });

    return {
      valid: missing.length === 0,
      missing,
      urls,
    };
  },

  // Check URL accessibility (mock implementation)
  checkUrlAccessibility: async (url: string): Promise<boolean> => {
    try {
      // In real implementation, you would make HTTP request
      // const response = await fetch(url, { method: 'HEAD' });
      // return response.ok;

      // For now, just check if URL is well-formed
      return DOC_PATTERNS.isValidBunUrl(url);
    } catch {
      return false;
    }
  },

  // Validate all documentation links
  validateAllLinks: async (
    urls: string[]
  ): Promise<{
    valid: string[];
    invalid: string[];
    summary: { total: number; valid: number; invalid: number };
  }> => {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
      const isAccessible = await DOC_VALIDATION.checkUrlAccessibility(url);
      if (isAccessible) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: urls.length,
        valid: valid.length,
        invalid: invalid.length,
      },
    };
  },
};

// Documentation analytics
export const DOC_ANALYTICS = {
  // Generate usage statistics
  generateUsageStats: (accessLog: Array<{ url: string; timestamp: string; count: number }>) => {
    const stats = {
      totalAccess: 0,
      uniqueUrls: new Set<string>(),
      categories: {} as Record<string, number>,
      domains: {} as Record<string, number>,
      topUrls: [] as Array<{ url: string; count: number }>,
      actions: {} as Record<string, number>,
    };

    accessLog.forEach(entry => {
      stats.totalAccess += entry.count;
      stats.uniqueUrls.add(entry.url);

      // Category stats
      const category = DOC_PATTERNS.categorizeSection(entry.url);
      stats.categories[category] = (stats.categories[category] || 0) + entry.count;

      // Domain stats
      const domain = DOC_PATTERNS.getDomain(entry.url);
      if (domain) {
        stats.domains[domain] = (stats.domains[domain] || 0) + entry.count;
      }

      // Action stats for secrets
      if (DOC_PATTERNS.isSecretsUrl(entry.url)) {
        const action = DOC_PATTERNS.getSecretsAction(entry.url);
        if (action) {
          stats.actions[action] = (stats.actions[action] || 0) + entry.count;
        }
      }
    });

    // Top URLs
    stats.topUrls = accessLog
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(entry => ({ url: entry.url, count: entry.count }));

    return {
      ...stats,
      uniqueUrls: stats.uniqueUrls.size,
    };
  },

  // Generate recommendations based on usage
  generateRecommendations: (stats: ReturnType<typeof DOC_ANALYTICS.generateUsageStats>) => {
    const recommendations = [];

    // Check for high error rates (mock)
    if (stats.categories.secrets && stats.categories.secrets > 100) {
      recommendations.push({
        type: 'optimization',
        message: 'High secrets documentation usage - consider implementing caching',
        priority: 'medium',
      });
    }

    // Check for domain preference
    if (stats.domains.com > (stats.domains.sh || 0)) {
      recommendations.push({
        type: 'preference',
        message: 'Users prefer latest documentation (bun.com)',
        priority: 'low',
      });
    }

    // Check for action patterns
    if (stats.actions['get'] && stats.actions['get'] > 50) {
      recommendations.push({
        type: 'feature',
        message: 'High usage of get() options - consider expanding examples',
        priority: 'high',
      });
    }

    return recommendations;
  },
};
