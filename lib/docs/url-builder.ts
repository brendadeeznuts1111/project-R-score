// lib/docs/url-builder.ts - Enhanced with secrets support
export type BunDomain = 'sh' | 'com';

export class DocsUrlBuilder {
  constructor(private domain: BunDomain = 'sh') {}

  build(path: string, hash?: string): string {
    const base = `https://bun.${this.domain}/docs${path}`;
    return hash ? `${base}#${hash}` : base;
  }

  // Convenience methods for common paths
  runtime(section: 'SECRETS' | 'BINARY' | 'TYPESCRIPT', hash?: string) {
    const paths = {
      SECRETS: '/runtime/secrets',
      BINARY: '/runtime/binary-data',
      TYPESCRIPT: '/runtime/typescript',
    };
    return this.build(paths[section], hash);
  }

  // Generate both domain versions
  dual(path: string, hash?: string) {
    return {
      sh: new DocsUrlBuilder('sh').build(path, hash),
      com: new DocsUrlBuilder('com').build(path, hash),
    };
  }

  // Convert between domains
  static convertUrl(url: string, toDomain: BunDomain): string {
    return url.replace(/bun\.(sh|com)/, `bun.${toDomain}`);
  }

  // Extract path and hash from URL
  static parseUrl(url: string): { path: string; hash?: string; domain: BunDomain } {
    const match = url.match(/https:\/\/bun\.(sh|com)(\/docs\/[^#]+)(?:#(.+))?/);
    if (!match) throw new Error(`Invalid Bun docs URL: ${url}`);

    return {
      domain: match[1] as BunDomain,
      path: match[2],
      hash: match[3],
    };
  }

  // Generate markdown link with icon
  toMarkdownLink(url: string, text?: string): string {
    const icon = url.includes('/runtime/secrets') ? '🔐' : '📚';
    return `[${icon} ${text || url}](${url})`;
  }

  // Check if URL is secrets-related
  static isSecretsUrl(url: string): boolean {
    return url.includes('/runtime/secrets');
  }

  // Get secrets action from URL
  static getSecretsAction(url: string): string | null {
    if (!this.isSecretsUrl(url)) return null;

    const { hash } = this.parseUrl(url);
    if (!hash) return 'overview';

    const actionMap: Record<string, string> = {
      'bun-secrets-get-options': 'get',
      api: 'reference',
      examples: 'examples',
      permissions: 'permissions',
      security: 'security',
      'best-practices': 'best-practices',
    };

    return actionMap[hash] || hash;
  }
}

// Enhanced BUN_DOCS URL helpers with secrets support
export const BUN_DOCS_URL_HELPERS = {
  // Base domains
  domains: {
    sh: 'https://bun.sh',
    com: 'https://bun.com',
  },

  // Runtime APIs
  runtime: (section: string, hash?: string, domain: BunDomain = 'sh') =>
    `${BUN_DOCS_URL_HELPERS.domains[domain]}/docs/runtime/${section}${hash ? `#${hash}` : ''}`,
} as const;

// Add secrets API after BUN_DOCS is defined
BUN_DOCS_URL_HELPERS.secrets = {
  // All variations
  overview: BUN_DOCS_URL_HELPERS.runtime('secrets'),
  api: BUN_DOCS_URL_HELPERS.runtime('secrets', 'api'),
  getOptions: BUN_DOCS_URL_HELPERS.runtime('secrets', 'bun-secrets-get-options'),

  // Domain-specific
  com: {
    overview: BUN_DOCS_URL_HELPERS.runtime('secrets', undefined, 'com'),
    api: BUN_DOCS_URL_HELPERS.runtime('secrets', 'api', 'com'),
    getOptions: BUN_DOCS_URL_HELPERS.runtime('secrets', 'bun-secrets-get-options', 'com'),
  },

  // Helper function
  ref: (hash?: string, domain: BunDomain = 'sh') =>
    BUN_DOCS_URL_HELPERS.runtime('secrets', hash, domain),
};

// Add conversion methods
BUN_DOCS_URL_HELPERS.toCom = (shUrl: string): string => DocsUrlBuilder.convertUrl(shUrl, 'com');
BUN_DOCS_URL_HELPERS.toSh = (comUrl: string): string => DocsUrlBuilder.convertUrl(comUrl, 'sh');

// Add pattern matching helpers
BUN_DOCS_URL_HELPERS.patterns = {
  isSecretsUrl: DocsUrlBuilder.isSecretsUrl,
  getSecretsAction: DocsUrlBuilder.getSecretsAction,
  parseUrl: DocsUrlBuilder.parseUrl,
  convertUrl: DocsUrlBuilder.convertUrl,
};

// Reference manager for documentation
export class ReferenceManager {
  private builder = new DocsUrlBuilder('com');

  get(doc: string, domain: BunDomain = 'com'): { url: string } | null {
    try {
      const url = this.builder.build(`/runtime/secrets#${doc}`);
      return { url: domain === 'com' ? url : DocsUrlBuilder.convertUrl(url, domain) };
    } catch {
      return null;
    }
  }

  // Get all secrets documentation URLs
  getSecretsDocs(domain: BunDomain = 'com') {
    return {
      overview: this.get('secrets-overview', domain),
      api: this.get('secrets-api', domain),
      getOptions: this.get('secrets-get-options', domain),
      examples: this.get('examples', domain),
      security: this.get('security', domain),
    };
  }

  // Generate related documentation
  getRelatedDocs(currentUrl: string): string[] {
    const { path, domain } = DocsUrlBuilder.parseUrl(currentUrl);

    if (DocsUrlBuilder.isSecretsUrl(currentUrl)) {
      return [
        BUN_DOCS_URL_HELPERS.runtime('secrets', undefined, domain),
        BUN_DOCS_URL_HELPERS.runtime('secrets', 'api', domain),
        BUN_DOCS_URL_HELPERS.runtime('secrets', 'bun-secrets-get-options', domain),
        BUN_DOCS_URL_HELPERS.runtime('binary-data', undefined, domain),
        BUN_DOCS_URL_HELPERS.runtime('typescript', undefined, domain),
      ];
    }

    return [];
  }
}
