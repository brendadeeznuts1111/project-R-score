// lib/docs/builders/validator.ts — Documentation URL validation

import { URL } from 'url';
import {
  DocumentationProvider,
  DocumentationCategory,
  DocumentationDomain,
  DocumentationURLType,
  DOCUMENTATION_URL_MAPPINGS,
  DOMAIN_PREFERENCES,
  PROVIDER_METADATA,
} from '../../../../lib/docs/constants/domains';
import { GITHUB_URL_PATTERNS, FRAGMENT_PARSERS, FRAGMENT_VALIDATION } from '../../../../lib/docs/constants/fragments';
import { IntelligentRouting, ENTERPRISE_DOCUMENTATION_PATHS } from '../../../../lib/docs/constants/categories';

export class EnhancedDocumentationURLValidator {
  /**
   * Validate documentation URL with comprehensive checks
   */
  public static validateDocumentationURL(
    url: string,
    options?: {
      allowedProviders?: DocumentationProvider[];
      allowedDomains?: DocumentationDomain[];
      requireHTTPS?: boolean;
      allowFragments?: boolean;
      checkAccessibility?: boolean;
      validateRouting?: boolean;
    }
  ): {
    isValid: boolean;
    provider?: DocumentationProvider;
    domain?: DocumentationDomain;
    category?: DocumentationCategory;
    errors: string[];
    warnings: string[];
    metadata?: Record<string, any>;
    routing?: {
      isOptimal: boolean;
      suggestedRoute?: {
        provider: DocumentationProvider;
        category: DocumentationCategory;
        path: string;
        reasoning: string;
      };
      alternatives: Array<{
        provider: DocumentationProvider;
        category: DocumentationCategory;
        path: string;
        type: 'secondary' | 'fallback';
        reasoning: string;
      }>;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let provider: DocumentationProvider | undefined;
    let domain: DocumentationDomain | undefined;
    let category: DocumentationCategory | undefined;
    let metadata: Record<string, any> = {};
    let routing: any = undefined;

    try {
      const parsed = new URL(url);

      // Basic URL validation
      if (options?.requireHTTPS && parsed.protocol !== 'https:') {
        errors.push('URL must use HTTPS protocol');
      }

      // Identify domain and provider
      domain = this.identifyDomain(url);
      provider = this.identifyProvider(url, domain);

      if (!provider) {
        errors.push('Unknown documentation provider');
      } else {
        // Check if provider is allowed
        if (options?.allowedProviders && !options.allowedProviders.includes(provider)) {
          errors.push(`Provider ${provider} is not in allowed list`);
        }

        // Check if domain is allowed
        if (options?.allowedDomains && domain && !options.allowedDomains.includes(domain)) {
          errors.push(`Domain ${domain} is not in allowed list`);
        }

        // Identify category from path
        category = this.identifyCategory(url, provider);

        // Validate provider-specific patterns
        const providerValidation = this.validateProviderSpecific(url, provider, domain);
        if (!providerValidation.isValid) {
          errors.push(...providerValidation.errors);
        }
        warnings.push(...providerValidation.warnings);
        metadata = { ...metadata, ...providerValidation.metadata };

        // Validate routing if requested
        if (options?.validateRouting && provider && category) {
          routing = this.validateRouting(url, provider, category);
          if (!routing.isOptimal) {
            warnings.push('URL routing may not be optimal for this content');
          }
        }
      }

      // Validate fragments
      if (parsed.hash) {
        const fragmentValidation = this.validateFragment(
          parsed.hash,
          options?.allowFragments !== false
        );
        if (!fragmentValidation.isValid) {
          errors.push(...fragmentValidation.errors);
        }
        warnings.push(...fragmentValidation.warnings);
        metadata.fragment = fragmentValidation.metadata;
      }

      // Check accessibility (optional)
      if (options?.checkAccessibility) {
        // This would be an async check in real implementation
        warnings.push('Accessibility check not implemented in synchronous validation');
      }
    } catch (error) {
      errors.push(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      provider,
      domain,
      category,
      errors,
      warnings,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      routing,
    };
  }

  /**
   * Identify documentation domain from URL
   */
  public static identifyDomain(url: string): DocumentationDomain | undefined {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Check specific subdomains before their parent domains
      if (hostname === 'docs.bun.sh') {
        return DocumentationDomain.BUN_DOCS;
      } else if (hostname === 'cdn.bun.sh') {
        return DocumentationDomain.BUN_CDN;
      } else if (hostname === 'bun.sh' || hostname.endsWith('.bun.sh')) {
        return DocumentationDomain.BUN_SH;
      } else if (hostname === 'bun.com' || hostname.endsWith('.bun.com')) {
        return DocumentationDomain.BUN_COM;
      } else if (hostname === 'bun.dev' || hostname.endsWith('.bun.dev')) {
        return DocumentationDomain.BUN_DEV;
      } else if (hostname === 'bun.io' || hostname.endsWith('.bun.io')) {
        return DocumentationDomain.BUN_IO;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  /**
   * Identify documentation provider from URL and domain
   */
  public static identifyProvider(
    url: string,
    domain?: DocumentationDomain
  ): DocumentationProvider | undefined {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();

      // Check URL mappings first
      for (const [pattern, metadata] of Object.entries(DOCUMENTATION_URL_MAPPINGS)) {
        if (url.includes(pattern)) {
          return metadata.provider;
        }
      }

      // Domain-based identification
      if (domain === DocumentationDomain.BUN_SH) {
        if (pathname.includes('/docs/api')) {
          return DocumentationProvider.BUN_API_DOCS;
        } else if (pathname.includes('/docs/runtime')) {
          return DocumentationProvider.BUN_RUNTIME_DOCS;
        } else if (pathname.includes('/docs/cli')) {
          return DocumentationProvider.BUN_OFFICIAL;
        } else if (pathname.includes('/docs/')) {
          return DocumentationProvider.BUN_OFFICIAL;
        } else if (pathname.endsWith('.xml')) {
          return DocumentationProvider.BUN_RSS;
        }
      } else if (domain === DocumentationDomain.BUN_COM) {
        if (pathname.includes('/reference/')) {
          return DocumentationProvider.BUN_REFERENCE;
        } else if (pathname.includes('/guides/')) {
          return DocumentationProvider.BUN_GUIDES;
        } else if (pathname.includes('/tutorials/')) {
          return DocumentationProvider.BUN_TUTORIALS;
        } else if (pathname.includes('/examples/')) {
          return DocumentationProvider.BUN_EXAMPLES;
        } else if (pathname === '/reference' || pathname === '/reference/') {
          return DocumentationProvider.BUN_REFERENCE;
        } else if (pathname === '/guides' || pathname === '/guides/') {
          return DocumentationProvider.BUN_GUIDES;
        } else if (pathname.endsWith('.xml')) {
          return DocumentationProvider.BUN_RSS;
        }
      }

      // Check for GitHub
      if (parsed.hostname === 'github.com' || parsed.hostname.endsWith('.github.com')) {
        return DocumentationProvider.GITHUB_PUBLIC;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  /**
   * Identify documentation category from URL
   */
  public static identifyCategory(
    url: string,
    provider: DocumentationProvider
  ): DocumentationCategory | undefined {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();

      // Check path patterns for different categories
      if (pathname.includes('/api') || pathname.includes('fetch') || pathname.includes('http')) {
        return DocumentationCategory.API_REFERENCE;
      } else if (
        pathname.includes('/runtime') ||
        pathname.includes('binary-data') ||
        pathname.includes('filesystem')
      ) {
        return DocumentationCategory.RUNTIME_FEATURES;
      } else if (pathname.includes('/cli') || pathname.includes('commands')) {
        return DocumentationCategory.CLI_REFERENCE;
      } else if (
        pathname.includes('/guides') ||
        pathname.includes('/tutorials') ||
        pathname.includes('/getting-started')
      ) {
        return DocumentationCategory.GETTING_STARTED;
      } else if (
        pathname.includes('/examples') ||
        pathname.includes('/samples') ||
        pathname.includes('/demo')
      ) {
        return DocumentationCategory.EXAMPLES_TUTORIALS;
      } else if (
        pathname.includes('/troubleshooting') ||
        pathname.includes('/faq') ||
        pathname.includes('/errors')
      ) {
        return DocumentationCategory.TROUBLESHOOTING;
      } else if (pathname.includes('/migration') || pathname.includes('/migrate')) {
        return DocumentationCategory.MIGRATION_GUIDES;
      } else if (pathname.includes('/performance') || pathname.includes('/benchmarks')) {
        return DocumentationCategory.PERFORMANCE;
      } else if (pathname.includes('/security')) {
        return DocumentationCategory.SECURITY;
      } else if (pathname.includes('/rss') || pathname.endsWith('.xml')) {
        return DocumentationCategory.RSS_FEEDS;
      } else if (pathname.includes('/installation') || pathname.includes('/install')) {
        return DocumentationCategory.INSTALLATION;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  /**
   * Validate URL fragment
   */
  public static validateFragment(
    fragment: string,
    allowFragments: boolean = true
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: Record<string, any>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    if (!allowFragments) {
      errors.push('Fragments are not allowed');
      return { isValid: false, errors, warnings };
    }

    try {
      // Check for text fragment
      if (fragment.includes(':~:text=')) {
        const textFragment = FRAGMENT_PARSERS.parseTextFragment(fragment);
        if (textFragment) {
          metadata.textFragment = textFragment;
          metadata.hasTextFragment = true;
        } else {
          errors.push('Invalid text fragment format');
        }
      }

      // Parse mixed fragments (standard + text)
      const parsed = FRAGMENT_PARSERS.parseMixed(fragment);
      metadata.standardFragment = parsed.standard;

      // Validate standard fragment parameters
      for (const [name, value] of Object.entries(parsed.standard)) {
        if (!FRAGMENT_VALIDATION.isValidParam(name, value)) {
          warnings.push(`Potentially invalid fragment parameter: ${name}=${value}`);
        }
      }

      // Check for suspicious fragment content
      if (fragment.includes('javascript:') || fragment.includes('data:')) {
        errors.push('Potentially dangerous fragment content detected');
      }
    } catch (error) {
      errors.push(
        `Fragment parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Validate provider-specific URL patterns
   */
  private static validateProviderSpecific(
    url: string,
    provider: DocumentationProvider,
    domain?: DocumentationDomain
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: Record<string, any>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    switch (provider) {
      case DocumentationProvider.GITHUB_PUBLIC:
        const githubParsed = this.parseGitHubURL(url);
        if (!githubParsed.isValid) {
          errors.push('Invalid GitHub URL structure');
        } else {
          metadata.github = githubParsed;

          // Check for common issues
          if (githubParsed.type === 'unknown') {
            warnings.push('Unrecognized GitHub URL pattern');
          }

          // Warn about very long paths
          if (githubParsed.path && githubParsed.path.length > 200) {
            warnings.push('Very long file path in GitHub URL');
          }
        }
        break;

      case DocumentationProvider.BUN_REFERENCE:
        if (!url.includes('bun.com/reference')) {
          errors.push('Bun Reference URLs should point to bun.com/reference');
        }
        break;

      case DocumentationProvider.BUN_GUIDES:
        if (!url.includes('bun.com/guides')) {
          errors.push('Bun Guides URLs should point to bun.com/guides');
        }
        break;

      case DocumentationProvider.BUN_OFFICIAL:
        if (!url.includes('bun.sh')) {
          errors.push('Bun Official URLs should point to bun.sh');
        }
        break;

      case DocumentationProvider.BUN_RSS:
        if (!url.includes('bun.com') && !url.includes('bun.sh')) {
          errors.push('Bun RSS URLs should point to bun.com or bun.sh');
        }
        if (!url.endsWith('.xml')) {
          warnings.push('RSS URLs typically end with .xml');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Parse GitHub URL into structured data
   */
  public static parseGitHubURL(url: string): {
    isValid: boolean;
    type?:
      | 'tree'
      | 'blob'
      | 'commit'
      | 'issue'
      | 'pull'
      | 'release'
      | 'discussion'
      | 'actions'
      | 'unknown';
    owner?: string;
    repo?: string;
    commitHash?: string;
    branch?: string;
    tag?: string;
    path?: string;
    file?: string;
    lineNumber?: number;
    issueNumber?: number;
    pullNumber?: number;
    discussionNumber?: number;
    actionRunId?: string;
    metadata?: Record<string, any>;
  } {
    try {
      const parsed = new URL(url);

      if (parsed.hostname !== 'github.com' && !parsed.hostname.endsWith('.github.com')) {
        return { isValid: false };
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean);

      // Check for different GitHub URL patterns
      for (const [type, pattern] of Object.entries(GITHUB_URL_PATTERNS)) {
        const match = url.match(pattern);
        if (match) {
          switch (type) {
            case 'TREE_VIEW':
              const treeResult: any = {
                isValid: true,
                type: 'tree' as const,
                owner: match[1],
                repo: match[2],
                commitHash: match[3],
                path: match[4] || '',
                file: match[4]?.split('/').pop(),
                metadata: {
                  isBranch: !/^[a-f0-9]{40}$/.test(match[3]),
                  isTag: match[3].startsWith('v') || match[3].startsWith('release-'),
                },
              };

              // Determine if it's a branch, tag, or commit
              if (/^[a-f0-9]{40}$/.test(match[3])) {
                treeResult.commitHash = match[3];
              } else if (match[3].startsWith('v') || match[3].startsWith('release-')) {
                treeResult.tag = match[3];
              } else {
                treeResult.branch = match[3];
              }

              return treeResult;

            case 'BLOB_VIEW':
              const blobResult: any = {
                isValid: true,
                type: 'blob' as const,
                owner: match[1],
                repo: match[2],
                commitHash: match[3],
                path: match[4] || '',
                file: match[4]?.split('/').pop(),
                metadata: {
                  isBranch: !/^[a-f0-9]{40}$/.test(match[3]),
                  isTag: match[3].startsWith('v') || match[3].startsWith('release-'),
                },
              };

              // Determine if it's a branch, tag, or commit
              if (/^[a-f0-9]{40}$/.test(match[3])) {
                blobResult.commitHash = match[3];
              } else if (match[3].startsWith('v') || match[3].startsWith('release-')) {
                blobResult.tag = match[3];
              } else {
                blobResult.branch = match[3];
              }

              // Check for line number in hash
              if (parsed.hash && parsed.hash.startsWith('#L')) {
                const lineMatch = parsed.hash.match(/#L(\d+)(?:-L(\d+))?/);
                if (lineMatch) {
                  blobResult.lineNumber = parseInt(lineMatch[1], 10);
                  blobResult.metadata.lineRange = {
                    start: parseInt(lineMatch[1], 10),
                    end: lineMatch[2] ? parseInt(lineMatch[2], 10) : undefined,
                  };
                }
              }

              return blobResult;

            case 'COMMIT_VIEW':
              return {
                isValid: true,
                type: 'commit' as const,
                owner: match[1],
                repo: match[2],
                commitHash: match[3],
              };

            case 'ISSUE_VIEW':
              return {
                isValid: true,
                type: 'issue' as const,
                owner: match[1],
                repo: match[2],
                issueNumber: parseInt(match[3], 10),
              };

            case 'PULL_REQUEST_VIEW':
              return {
                isValid: true,
                type: 'pull' as const,
                owner: match[1],
                repo: match[2],
                pullNumber: parseInt(match[3], 10),
              };

            case 'RELEASE_TAG_VIEW':
              return {
                isValid: true,
                type: 'release' as const,
                owner: match[1],
                repo: match[2],
                tag: match[3],
              };

            case 'DISCUSSION_VIEW':
              return {
                isValid: true,
                type: 'discussion' as const,
                owner: match[1],
                repo: match[2],
                discussionNumber: parseInt(match[3], 10),
              };

            case 'ACTIONS_RUN_VIEW':
              return {
                isValid: true,
                type: 'actions' as const,
                owner: match[1],
                repo: match[2],
                actionRunId: match[3],
              };
          }
        }
      }

      // Check for repository root
      if (pathParts.length === 2) {
        return {
          isValid: true,
          type: 'tree' as const,
          owner: pathParts[0],
          repo: pathParts[1],
          branch: 'main',
          path: '',
          metadata: { isRepositoryRoot: true },
        };
      }

      return { isValid: true, type: 'unknown' };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Validate URL routing and suggest improvements
   */
  private static validateRouting(
    url: string,
    provider: DocumentationProvider,
    category: DocumentationCategory
  ): {
    isOptimal: boolean;
    suggestedRoute?: {
      provider: DocumentationProvider;
      category: DocumentationCategory;
      path: string;
      reasoning: string;
    };
    alternatives: Array<{
      provider: DocumentationProvider;
      category: DocumentationCategory;
      path: string;
      type: 'secondary' | 'fallback';
      reasoning: string;
    }>;
  } {
    const alternatives: Array<{
      provider: DocumentationProvider;
      category: DocumentationCategory;
      path: string;
      type: 'secondary' | 'fallback';
      reasoning: string;
    }> = [];

    let isOptimal = true;
    let suggestedRoute: any = undefined;

    // Check if the URL matches the best routing for its content
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Extract potential topic from path
    const pathParts = pathname.split('/').filter(Boolean);
    const potentialTopic = pathParts[pathParts.length - 1];

    if (potentialTopic && IntelligentRouting.hasSpecializedRouting(potentialTopic)) {
      const allRoutes = IntelligentRouting.getAllRoutesForTopic(potentialTopic);

      // Check if current provider matches the best route for developers
      const developerRoute = allRoutes.developers?.primary;
      if (developerRoute && developerRoute.provider !== provider) {
        isOptimal = false;
        suggestedRoute = {
          ...developerRoute,
          reasoning: `Better routing for topic "${potentialTopic}" for developers`,
        };

        // Add alternatives
        if (allRoutes.developers?.alternatives) {
          alternatives.push(...allRoutes.developers.alternatives);
        }
      }
    }

    // Check for domain-specific routing issues
    const domain = this.identifyDomain(url);
    if (
      domain === DocumentationDomain.BUN_SH &&
      category === DocumentationCategory.GETTING_STARTED
    ) {
      isOptimal = false;
      suggestedRoute = {
        provider: DocumentationProvider.BUN_GUIDES,
        category: DocumentationCategory.GETTING_STARTED,
        path: 'OVERVIEW',
        reasoning: 'Getting started content is better served by bun.com/guides',
      };
    }

    if (
      domain === DocumentationDomain.BUN_COM &&
      category === DocumentationCategory.API_REFERENCE
    ) {
      // This might be optimal if it's the reference portal
      if (!url.includes('/reference/api')) {
        isOptimal = false;
        suggestedRoute = {
          provider: DocumentationProvider.BUN_REFERENCE,
          category: DocumentationCategory.API_REFERENCE,
          path: 'API_OVERVIEW',
          reasoning: 'API reference content is better served by bun.com/reference/api',
        };
      }
    }

    return {
      isOptimal,
      suggestedRoute,
      alternatives,
    };
  }

  /**
   * Determine the best documentation source for a given topic
   */
  public static getBestDocumentationSource(
    topic: string,
    userType: 'developers' | 'beginners' | 'educators' | 'all_users' = 'developers'
  ): {
    provider: DocumentationProvider;
    url: string;
    description: string;
    reasoning: string;
    alternatives: Array<{
      provider: DocumentationProvider;
      url: string;
      description: string;
      type: 'secondary' | 'fallback';
    }>;
  } {
    const route = IntelligentRouting.getBestRoute(topic, userType);

    // Build URL for the best route
    const baseURLs = {
      [DocumentationProvider.BUN_OFFICIAL]: 'https://bun.sh/docs',
      [DocumentationProvider.BUN_REFERENCE]: 'https://bun.com/reference',
      [DocumentationProvider.BUN_GUIDES]: 'https://bun.com/guides',
      [DocumentationProvider.BUN_TUTORIALS]: 'https://bun.com/tutorials',
      [DocumentationProvider.BUN_EXAMPLES]: 'https://bun.com/examples',
      [DocumentationProvider.GITHUB_PUBLIC]: 'https://github.com/oven-sh/bun',
    } as Record<DocumentationProvider, string>;

    const baseUrl = baseURLs[route.provider] || 'https://bun.sh/docs';
    const path = IntelligentRouting.getPath(route.provider, route.category, route.path);
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;

    // Get alternatives
    const alternativeRoutes = IntelligentRouting.getAlternativeRoutes(topic, userType);
    const alternatives = alternativeRoutes.map(alt => ({
      provider: alt.provider,
      url: `${baseURLs[alt.provider] || 'https://bun.sh/docs'}${IntelligentRouting.getPath(alt.provider, alt.category, alt.path)}`,
      description: `${alt.provider} - ${alt.reasoning}`,
      type: alt.type as 'secondary' | 'fallback',
    }));

    return {
      provider: route.provider,
      url,
      description: `${route.provider} - ${route.reasoning}`,
      reasoning: route.reasoning,
      alternatives,
    };
  }

  /**
   * Check if URL needs updating (e.g., from old format to new)
   */
  public static needsMigration(url: string): {
    needsUpdate: boolean;
    currentFormat?: string;
    recommendedFormat?: string;
    migrationPath?: string;
    reasoning?: string;
  } {
    const parsed = new URL(url);
    const domain = this.identifyDomain(url);
    const provider = this.identifyProvider(url, domain);

    // Check for old patterns that should be migrated
    if (domain === DocumentationDomain.BUN_SH && parsed.pathname.startsWith('/docs/')) {
      const path = parsed.pathname;

      // API references might be better on bun.com/reference
      if (path.includes('/api/') || path.includes('/runtime/')) {
        return {
          needsUpdate: true,
          currentFormat: 'technical_docs',
          recommendedFormat: 'interactive_reference',
          migrationPath: url.replace('bun.sh/docs', 'bun.com/reference'),
          reasoning: 'API and runtime documentation is enhanced on bun.com/reference',
        };
      }

      // Guides might be better on bun.com/guides
      if (path.includes('/guides/')) {
        return {
          needsUpdate: true,
          currentFormat: 'technical_guide',
          recommendedFormat: 'tutorial_guide',
          migrationPath: url.replace('bun.sh/docs/guides', 'bun.com/guides'),
          reasoning: 'Tutorial content is enhanced on bun.com/guides',
        };
      }
    }

    // Check for missing text fragments on reference portal
    if (provider === DocumentationProvider.BUN_REFERENCE && !parsed.hash) {
      return {
        needsUpdate: true,
        currentFormat: 'basic_reference',
        recommendedFormat: 'enhanced_reference_with_fragments',
        reasoning: 'Consider adding text fragments for better navigation',
      };
    }

    return { needsUpdate: false };
  }

  /**
   * Batch validate multiple URLs
   */
  public static validateBatch(
    urls: string[],
    options?: {
      allowedProviders?: DocumentationProvider[];
      requireHTTPS?: boolean;
      allowFragments?: boolean;
      validateRouting?: boolean;
    }
  ): Array<{
    url: string;
    result: ReturnType<typeof EnhancedDocumentationURLValidator.validateDocumentationURL>;
  }> {
    return urls.map(url => ({
      url,
      result: this.validateDocumentationURL(url, options),
    }));
  }

  /**
   * Get validation statistics for a batch of URLs
   */
  public static getValidationStats(
    batchResult: Array<{
      url: string;
      result: ReturnType<typeof EnhancedDocumentationURLValidator.validateDocumentationURL>;
    }>
  ): {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    byProvider: Record<string, { total: number; valid: number; invalid: number }>;
    byDomain: Record<string, { total: number; valid: number; invalid: number }>;
    byCategory: Record<string, { total: number; valid: number; invalid: number }>;
    routingStats: {
      optimal: number;
      suboptimal: number;
      withSuggestions: number;
    };
    commonErrors: Array<{ error: string; count: number }>;
    commonWarnings: Array<{ warning: string; count: number }>;
  } {
    const stats = {
      total: batchResult.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      byProvider: {} as Record<string, { total: number; valid: number; invalid: number }>,
      byDomain: {} as Record<string, { total: number; valid: number; invalid: number }>,
      byCategory: {} as Record<string, { total: number; valid: number; invalid: number }>,
      routingStats: {
        optimal: 0,
        suboptimal: 0,
        withSuggestions: 0,
      },
      commonErrors: [] as Array<{ error: string; count: number }>,
      commonWarnings: [] as Array<{ warning: string; count: number }>,
    };

    const errorCounts = new Map<string, number>();
    const warningCounts = new Map<string, number>();

    for (const { url, result } of batchResult) {
      if (result.isValid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      stats.warnings += result.warnings.length;

      // Count by provider
      const provider = result.provider || 'unknown';
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { total: 0, valid: 0, invalid: 0 };
      }
      stats.byProvider[provider].total++;
      if (result.isValid) {
        stats.byProvider[provider].valid++;
      } else {
        stats.byProvider[provider].invalid++;
      }

      // Count by domain
      const domain = result.domain || 'unknown';
      if (!stats.byDomain[domain]) {
        stats.byDomain[domain] = { total: 0, valid: 0, invalid: 0 };
      }
      stats.byDomain[domain].total++;
      if (result.isValid) {
        stats.byDomain[domain].valid++;
      } else {
        stats.byDomain[domain].invalid++;
      }

      // Count by category
      const category = result.category || 'unknown';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = { total: 0, valid: 0, invalid: 0 };
      }
      stats.byCategory[category].total++;
      if (result.isValid) {
        stats.byCategory[category].valid++;
      } else {
        stats.byCategory[category].invalid++;
      }

      // Routing stats
      if (result.routing) {
        if (result.routing.isOptimal) {
          stats.routingStats.optimal++;
        } else {
          stats.routingStats.suboptimal++;
        }

        if (result.routing.suggestedRoute) {
          stats.routingStats.withSuggestions++;
        }
      }

      // Count errors and warnings
      result.errors.forEach(error => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });

      result.warnings.forEach(warning => {
        warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
      });
    }

    // Get most common errors and warnings
    stats.commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.commonWarnings = Array.from(warningCounts.entries())
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  /**
   * Extract text fragment from URL
   */
  public static extractTextFragment(url: string): {
    hasTextFragment: boolean;
    rawFragment?: string;
    decodedText?: string;
    components?: {
      prefix?: string;
      textStart?: string;
      textEnd?: string;
      suffix?: string;
    };
  } {
    try {
      const parsed = new URL(url);
      const hash = parsed.hash;

      if (!hash.includes(':~:text=')) {
        return { hasTextFragment: false };
      }

      const textFragment = FRAGMENT_PARSERS.parseTextFragment(hash);
      if (!textFragment) {
        return { hasTextFragment: false };
      }

      return {
        hasTextFragment: true,
        rawFragment: textFragment.raw,
        decodedText: textFragment.decoded,
        components: textFragment.components,
      };
    } catch {
      return { hasTextFragment: false };
    }
  }

  /**
   * Check if URL is a specific commit reference
   */
  public static isSpecificCommitURL(url: string): boolean {
    const parsed = this.parseGitHubURL(url);
    return (
      parsed.isValid &&
      (parsed.type === 'tree' || parsed.type === 'blob') &&
      !!parsed.commitHash &&
      /^[a-f0-9]{40}$/.test(parsed.commitHash)
    );
  }

  /**
   * Get commit hash from GitHub URL
   */
  public static extractCommitHash(url: string): string | null {
    const parsed = this.parseGitHubURL(url);
    return parsed.commitHash || null;
  }

  /**
   * Check if URL is a bun-types reference
   */
  public static isBunTypesURL(url: string): boolean {
    const parsed = this.parseGitHubURL(url);
    return (
      parsed.isValid &&
      parsed.repo === 'bun' &&
      parsed.path?.includes('packages/bun-types') === true
    );
  }

  /**
   * Validate a CLI command
   */
  public static validateCLICommand(command: string): {
    isValid: boolean;
    command?: string;
    args?: string[];
    options?: Record<string, string | boolean>;
    errors?: string[];
  } {
    if (!command.startsWith('bun')) {
      return {
        isValid: false,
        errors: ['Command must start with "bun"'],
      };
    }

    const parts = command.split(' ');
    const cmd = parts[0];
    const subcommand = parts[1];

    // Basic validation for common commands
    const validCommands = [
      'run',
      'test',
      'build',
      'install',
      'add',
      'remove',
      'x',
      'create',
      'upgrade',
      'init',
      'dev',
      'pm',
    ];

    if (!validCommands.includes(subcommand)) {
      return {
        isValid: false,
        command: subcommand,
        errors: [`Unknown subcommand: ${subcommand}`],
      };
    }

    // Extract arguments and options
    const args: string[] = [];
    const options: Record<string, string | boolean> = {};

    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith('--')) {
        // Option
        const [key, value] = part.slice(2).split('=');
        options[key] = value !== undefined ? value : true;
      } else if (part.startsWith('-')) {
        // Short option
        options[part.slice(1)] = true;
      } else {
        // Argument
        args.push(part);
      }
    }

    return {
      isValid: true,
      command: subcommand,
      args: args.length > 0 ? args : undefined,
      options: Object.keys(options).length > 0 ? options : undefined,
    };
  }

  /**
   * Check if a command is a valid CLI command (simple boolean check)
   */
  public static isValidCLICommand(command: string): boolean {
    return this.validateCLICommand(command).isValid;
  }

  /**
   * Validate if a URL is a Bun.utils documentation URL
   */
  public static isBunUtilsURL(url: string): boolean {
    const validation = this.validateBunDocumentationURL(url);
    return (
      validation.isValid &&
      validation.type === 'technical_docs' &&
      validation.path?.includes('/api/utils') === true
    );
  }

  /**
   * Validate if a URL is a CLI documentation URL
   */
  public static isCLIDocumentationURL(url: string): boolean {
    const validation = this.validateBunDocumentationURL(url);
    return (
      validation.isValid &&
      (validation.path?.includes('/cli') === true ||
        validation.path?.includes('/reference/cli') === true)
    );
  }

  /**
   * Extract utility function name from URL
   */
  public static extractUtilityFunction(url: string): string | null {
    if (!this.isBunUtilsURL(url)) {
      return null;
    }

    const fragment = new URL(url).hash.slice(1);
    if (fragment.startsWith('is') || fragment.startsWith('to')) {
      return fragment;
    }

    return null;
  }

  /**
   * Validate Bun documentation URL (alias for validateDocumentationURL with Bun-specific defaults)
   */
  public static validateBunDocumentationURL(url: string): {
    isValid: boolean;
    provider?: DocumentationProvider;
    type?: DocumentationURLType;
    path?: string;
    fragment?: string;
    errors?: string[];
  } {
    const result = this.validateDocumentationURL(url, {
      allowedProviders: [
        DocumentationProvider.BUN_OFFICIAL,
        DocumentationProvider.BUN_REFERENCE,
        DocumentationProvider.BUN_TECHNICAL,
        DocumentationProvider.BUN_API_DOCS,
        DocumentationProvider.BUN_RUNTIME_DOCS,
      ],
      requireHTTPS: true,
      allowFragments: true,
    });

    return {
      isValid: result.isValid,
      provider: result.provider,
      type: result.category ? this.mapCategoryToType(result.category) : undefined,
      path: result.metadata?.path as string | undefined,
      fragment: result.metadata?.fragment as string | undefined,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };
  }

  /**
   * Map category to URL type
   */
  private static mapCategoryToType(category: DocumentationCategory): DocumentationURLType {
    switch (category) {
      case DocumentationCategory.API_REFERENCE:
        return 'api_reference';
      case DocumentationCategory.RUNTIME_FEATURES:
        return 'technical_docs';
      case DocumentationCategory.TUTORIALS:
      case DocumentationCategory.EXAMPLES_TUTORIALS:
        return 'tutorials';
      case DocumentationCategory.RSS_FEEDS:
      case DocumentationCategory.BLOG_POSTS:
        return 'rss';
      case DocumentationCategory.SECURITY:
      case DocumentationCategory.SECURITY_GUIDELINES:
        return 'security';
      case DocumentationCategory.PERFORMANCE:
      case DocumentationCategory.PERFORMANCE_OPTIMIZATION:
        return 'performance';
      default:
        return 'unknown';
    }
  }
}
