/**
 * Documentation Reference Management System
 * 
 * Provides centralized URL management with URLPattern support
 * for consistent and maintainable documentation links.
 * Enhanced with fragment support for deep linking and state management.
 */

import { URLHandler, URLFragmentUtils } from './core/url-handler';
import { DocumentationURLHandler } from './core/documentation-url-handler';

// Base URLs as constants
export const DOCS = {
  BUN: {
    BASE: 'https://bun.sh',
    DOCS: 'https://bun.sh/docs/cli',
    API: 'https://bun.sh/docs/cli/api',
    RUNTIME: 'https://bun.sh/docs/cli/runtime',
    GUIDES: 'https://bun.sh/docs/cli/guides',
    CLI: 'https://bun.sh/docs/cli/cli',
    BLOG: 'https://bun.sh/blog'
  },
  RSYS: {
    BASE: 'https://github.com/oven-sh/bun',
    ISSUES: 'https://github.com/oven-sh/bun/issues',
    PULL_REQUESTS: 'https://github.com/oven-sh/bun/pulls'
  }
} as const;

// Specific documentation paths
export const DOC_PATHS = {
  // Core Bun documentation
  MAIN: '/docs',
  API_UTILS: '/docs/api/utils',
  RUNTIME_SHELL: '/docs/runtime/shell',
  CLI_BUNX: '/docs/cli/bunx',
  
  // R-Score optimization specific
  MEMORY_POOL: '/docs/runtime/binary-data#sharedarraybuffer',
  HTTP2_MULTIPLEXING: '/docs/api/http#multiplexing',
  HARDCODED_FETCH: '/docs/api/fetch#hardened',
  REDIRECT_HANDLING: '/docs/api/fetch#redirects',
  
  // Performance optimization
  PERFORMANCE: '/docs/guides/performance',
  ZERO_COPY: '/docs/runtime/binary-data#zero-copy',
  STREAMING: '/docs/api/streams#binary',
  
  // RSS and feeds
  RSS: '/rss.xml'
} as const;

// URLPattern definitions for validation and parsing
export const URL_PATTERNS = {
  // Bun documentation patterns
  BUN_DOCS: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs/:section/:subsection*'
  }),
  
  BUN_DOCS_BASE: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/docs'
  }),
  
  BUN_API: new URLPattern({
    protocol: 'https', 
    hostname: 'bun.sh',
    pathname: '/docs/api/:endpoint/:method*'
  }),
  
  BUN_RUNTIME: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh', 
    pathname: '/docs/runtime/:feature/:subfeature*'
  }),
  
  BUN_INSTALL: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/install'
  }),
  
  BUN_BLOG: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/blog'
  }),
  
  BUN_RSS: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/rss.xml'
  }),
  
  BUN_MAIN: new URLPattern({
    protocol: 'https',
    hostname: 'bun.sh',
    pathname: '/'
  }),
  
  // GitHub patterns
  GITHUB_ISSUE: new URLPattern({
    protocol: 'https',
    hostname: 'github.com',
    pathname: '/oven-sh/bun/issues/:id'
  }),
  
  GITHUB_PR: new URLPattern({
    protocol: 'https',
    hostname: 'github.com',
    pathname: '/oven-sh/bun/pull/:id'
  }),
  
  GITHUB_REPO: new URLPattern({
    protocol: 'https',
    hostname: 'github.com',
    pathname: '/oven-sh/bun'
  })
} as const;

/**
 * Documentation reference manager
 */
export class DocsReference {
  private static instance: DocsReference;
  private baseUrl: string;
  private patterns: Map<string, URLPattern>;
  private referenceMap: Map<string, string>;
  
  private constructor(baseUrl: string = DOCS.BUN.DOCS) {
    this.baseUrl = baseUrl;
    this.patterns = new Map();
    this.referenceMap = new Map();
    this.initPatterns();
    this.initReferenceMap();
  }
  
  static getInstance(): DocsReference {
    if (!this.instance) {
      this.instance = new DocsReference();
    }
    return this.instance;
  }
  
  private initPatterns(): void {
    // Register all URL patterns
    Object.entries(URL_PATTERNS).forEach(([name, pattern]) => {
      this.patterns.set(name, pattern);
    });
  }
  
  private initReferenceMap(): void {
    // Initialize reference mappings
    Object.entries(DOC_PATHS).forEach(([key, path]) => {
      this.referenceMap.set(key, new URL(path, DOCS.BUN.BASE).toString());
    });
  }
  
  /**
   * Build a URL from path and optional hash with fragment support
   */
  buildUrl(path: string, hash?: string, baseUrl?: string, fragment?: Record<string, string>): string {
    const base = baseUrl || DOCS.BUN.BASE;
    const url = new URL(path, base);
    
    if (hash) url.hash = hash;
    
    // Add fragment parameters if provided
    if (fragment && Object.keys(fragment).length > 0) {
      const fragmentString = URLFragmentUtils.buildFragment(fragment);
      if (hash) {
        url.hash = hash + '&' + fragmentString.replace('#', '');
      } else {
        url.hash = fragmentString;
      }
    }
    
    return url.toString();
  }
  
  /**
   * Get specific documentation URL by key with optional fragment
   */
  getUrl(key: keyof typeof DOC_PATHS, fragment?: Record<string, string>): string {
    const path = DOC_PATHS[key];
    return this.buildUrl(path, undefined, undefined, fragment);
  }

  /**
   * Get URL with enhanced fragment support
   */
  getUrlWithFragment(
    key: keyof typeof DOC_PATHS, 
    fragment: Record<string, string>
  ): string {
    return this.getUrl(key, fragment);
  }

  /**
   * Parse documentation URL with fragment extraction
   */
  parseUrlWithFragments(url: string): {
    pattern?: string;
    groups?: Record<string, string>;
    valid: boolean;
    fragment?: Record<string, string>;
    anchor?: string;
  } {
    const basicParse = this.parseUrl(url);
    
    // Extract fragment data
    const parsed = URLHandler.parse(url);
    const fragment = parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {};
    
    // Extract anchor if present
    const anchor = fragment.anchor || undefined;
    delete fragment.anchor;

    return {
      ...basicParse,
      fragment: Object.keys(fragment).length > 0 ? fragment : undefined,
      anchor
    };
  }
  
  /**
   * Get typed array related URLs with fragment support
   */
  getTypedArrayUrls(fragment?: Record<string, string>): {
    base: string;
    methods: string;
    performance: string;
    zeroCopy: string;
    sharedArrayBuffer: string;
  } {
    return {
      base: this.buildUrl('/docs/runtime/binary-data', 'typedarray', undefined, fragment),
      methods: this.buildUrl('/docs/runtime/binary-data', 'methods', undefined, fragment),
      performance: this.buildUrl('/docs/runtime/binary-data', 'performance', undefined, fragment),
      zeroCopy: this.buildUrl('/docs/runtime/binary-data', 'zero-copy', undefined, fragment),
      sharedArrayBuffer: this.buildUrl('/docs/runtime/binary-data', 'sharedarraybuffer', undefined, fragment)
    };
  }
  
  /**
   * Get R-Score optimization URLs with fragment support
   */
  getRSysUrls(fragment?: Record<string, string>): {
    memoryPool: string;
    http2Multiplexing: string;
    hardenedFetch: string;
    redirectHandling: string;
    performance: string;
  } {
    return {
      memoryPool: this.getUrl('MEMORY_POOL', fragment),
      http2Multiplexing: this.getUrl('HTTP2_MULTIPLEXING', fragment),
      hardenedFetch: this.getUrl('HARDCODED_FETCH', fragment),
      redirectHandling: this.getUrl('REDIRECT_HANDLING', fragment),
      performance: this.getUrl('PERFORMANCE', fragment)
    };
  }
  
  /**
   * Parse a URL to extract structured data
   */
  parseUrl(url: string): {
    pattern?: string;
    groups?: Record<string, string>;
    valid: boolean;
  } {
    for (const [name, pattern] of this.patterns) {
      const match = pattern.exec(url);
      if (match) {
        return {
          pattern: name,
          groups: { 
            ...match.pathname.groups, 
            ...match.search.groups, 
            ...match.hash.groups 
          },
          valid: true
        };
      }
    }
    return { valid: false };
  }
  
  /**
   * Validate if URL matches known patterns
   */
  validateUrl(url: string): boolean {
    return this.parseUrl(url).valid;
  }
  
  /**
   * Get all available references
   */
  getAllReferences(): Array<{ key: string; url: string; description?: string }> {
    const references: Array<{ key: string; url: string; description?: string }> = [];
    
    // Add documentation paths
    Object.entries(DOC_PATHS).forEach(([key, path]) => {
      references.push({
        key,
        url: this.buildUrl(path),
        description: this.getDescription(key)
      });
    });
    
    return references;
  }
  
  /**
   * Get description for a reference key
   */
  private getDescription(key: string): string {
    const descriptions: Record<string, string> = {
      MAIN: 'Main Bun documentation',
      API_UTILS: 'Bun utility APIs',
      RUNTIME_SHELL: 'Bun shell runtime',
      CLI_BUNX: 'Bun package manager (bunx)',
      MEMORY_POOL: 'SharedArrayBuffer memory pool optimization',
      HTTP2_MULTIPLEXING: 'HTTP/2 multiplexing for performance',
      HARDCODED_FETCH: 'Hardened fetch with TLS verification',
      REDIRECT_HANDLING: 'Automatic redirect handling',
      PERFORMANCE: 'Performance optimization guide',
      ZERO_COPY: 'Zero-copy operations',
      STREAMING: 'Binary data streaming',
      RSS: 'Bun RSS feed'
    };
    
    return descriptions[key] || 'Documentation reference';
  }
  
  /**
   * Generate markdown reference table with fragment support
   */
  generateMarkdownTable(title: string = 'Documentation References', includeFragments: boolean = false): string {
    const refs = this.getAllReferences();
    
    let markdown = `## ${title}\n\n`;
    markdown += '| Key | URL | Description |\n';
    markdown += '|-----|-----|-------------|\n';
    
    refs.forEach(ref => {
      let url = ref.url;
      if (includeFragments) {
        // Add example fragment for demonstration
        url = this.buildUrl(ref.url.replace(DOCS.BUN.BASE, ''), undefined, DOCS.BUN.BASE, {
          example: 'true',
          interactive: 'true'
        });
      }
      markdown += `| \`${ref.key}\` | [${url}](${url}) | ${ref.description} |\n`;
    });
    
    return markdown;
  }

  /**
   * Generate interactive documentation links
   */
  generateInteractiveLinks(): Array<{
    name: string;
    url: string;
    fragment: Record<string, string>;
    description: string;
  }> {
    const interactiveFragment = {
      interactive: 'true',
      theme: 'auto',
      editable: 'false'
    };

    return [
      {
        name: 'Interactive Utils Demo',
        url: this.buildUrl('/docs/api/utils', undefined, undefined, interactiveFragment),
        fragment: interactiveFragment,
        description: 'Interactive Bun utilities demonstration'
      },
      {
        name: 'Performance Testing',
        url: this.buildUrl('/docs/guides/performance', undefined, undefined, {
          ...interactiveFragment,
          test: 'benchmark'
        }),
        fragment: { ...interactiveFragment, test: 'benchmark' },
        description: 'Performance testing and benchmarking'
      },
      {
        name: 'CLI Tutorial',
        url: this.buildUrl('/docs/cli', undefined, undefined, {
          ...interactiveFragment,
          tutorial: 'beginner'
        }),
        fragment: { ...interactiveFragment, tutorial: 'beginner' },
        description: 'Interactive CLI tutorial for beginners'
      }
    ];
  }
}

/**
 * Convenience functions for common operations
 */
export const docs = DocsReference.getInstance();

/**
   * Quick URL builders with fragment support
   */
export const buildDocsUrl = (path: string, hash?: string, fragment?: Record<string, string>) => 
  docs.buildUrl(path, hash, undefined, fragment);
export const getTypedArrayDocs = (fragment?: Record<string, string>) => docs.getTypedArrayUrls(fragment);
export const getRSysDocs = (fragment?: Record<string, string>) => docs.getRSysUrls(fragment);
export const validateDocUrl = (url: string) => docs.validateUrl(url);

/**
   * Enhanced URL builders with fragment support
   */
export const buildInteractiveDocsUrl = (path: string, options?: {
  theme?: 'light' | 'dark' | 'auto';
  editable?: boolean;
  example?: string;
}) => {
  const fragment = {
    interactive: 'true',
    theme: options?.theme || 'auto',
    editable: options?.editable ? 'true' : 'false',
    ...options
  };
  return docs.buildUrl(path, undefined, undefined, fragment);
};

export const buildExampleDocsUrl = (path: string, example: string, language?: string) => {
  const fragment = {
    example,
    language: language || 'typescript',
    highlight: 'true',
    runnable: 'true'
  };
  return docs.buildUrl(path, undefined, undefined, fragment);
};

/**
   * Type-safe reference resolver with fragment support
   */
export class DocReferenceResolver {
  private static readonly REFERENCE_MAP = {
    'bun.docs': '/docs',
    'bun.api.utils': '/docs/api/utils',
    'bun.runtime.shell': '/docs/runtime/shell',
    'bun.cli.bunx': '/docs/cli/bunx',
    'bun.memory.pool': '/docs/runtime/binary-data#sharedarraybuffer',
    'bun.http2.multiplex': '/docs/api/http#multiplexing',
    'bun.fetch.hardened': '/docs/api/fetch#hardened',
    'bun.fetch.redirects': '/docs/api/fetch#redirects',
    'bun.performance': '/docs/guides/performance',
    'bun.zero.copy': '/docs/runtime/binary-data#zero-copy',
    'bun.streams.binary': '/docs/api/streams#binary',
    'bun.rss': '/rss.xml'
  } as const;
  
  static resolve(reference: keyof typeof this.REFERENCE_MAP, fragment?: Record<string, string>): string {
    const path = this.REFERENCE_MAP[reference];
    const baseUrl = DOCS.BUN.BASE;
    
    if (fragment && Object.keys(fragment).length > 0) {
      return docs.buildUrl(path, undefined, baseUrl, fragment);
    }
    
    return new URL(path, baseUrl).toString();
  }
  
  static resolveWithFragment(
    reference: keyof typeof this.REFERENCE_MAP, 
    fragment: Record<string, string>
  ): string {
    return this.resolve(reference, fragment);
  }
  
  static getAllReferences(): Array<{ key: string; url: string }> {
    return Object.entries(this.REFERENCE_MAP).map(([key, path]) => ({
      key,
      url: new URL(path, DOCS.BUN.BASE).toString()
    }));
  }

  /**
   * Generate interactive reference URLs
   */
  static generateInteractiveReferences(): Array<{
    key: string;
    url: string;
    interactiveUrl: string;
    description: string;
  }> {
    const interactiveFragment = {
      interactive: 'true',
      theme: 'auto',
      runnable: 'true'
    };

    return Object.entries(this.REFERENCE_MAP).map(([key, path]) => ({
      key,
      url: new URL(path, DOCS.BUN.BASE).toString(),
      interactiveUrl: this.resolve(key as keyof typeof this.REFERENCE_MAP, interactiveFragment),
      description: `${key.replace(/\./g, ' ')} documentation`
    }));
  }
}
