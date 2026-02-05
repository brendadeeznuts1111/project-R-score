#!/usr/bin/env bun

/**
 * 📚 Documentation URL Handler with Fragment Support
 * 
 * Enhanced URL handling system specifically for documentation references
 * with fragment support, validation, and integration with existing constants
 */

import { DOCS, DOC_PATHS, URL_PATTERNS } from '../docs-reference';
import { BUN_UTILS_URLS, UtilsCategory } from '../documentation/constants/utils';
import { CLI_DOCUMENTATION_URLS, CLICategory } from '../documentation/constants/cli';
import { URLHandler, URLFragmentUtils, FactoryWagerURLUtils } from './url-handler';
import { handleError } from './error-handling';

/**
 * Documentation URL types
 */
export type DocumentationType = 'bun' | 'utils' | 'cli' | 'github' | 'custom';

/**
 * Enhanced documentation URL configuration
 */
export interface DocumentationURLConfig {
  type: DocumentationType;
  category?: string;
  page?: string;
  fragment?: Record<string, string>;
  anchor?: string;
  search?: Record<string, string>;
  validation?: {
    allowedHosts?: string[];
    requireHTTPS?: boolean;
    allowFragments?: boolean;
  };
}

/**
 * Documentation URL Handler
 */
export class DocumentationURLHandler {
  private static readonly BASE_URLS = {
    bun: DOCS.BUN.BASE,
    utils: DOCS.BUN.BASE,
    cli: DOCS.BUN.BASE,
    github: DOCS.RSYS.BASE,
    custom: ''
  } as const;

  /**
   * Generate documentation URL with enhanced fragment support
   */
  static generateDocumentationURL(config: DocumentationURLConfig): string {
    try {
      const baseUrl = this.BASE_URLS[config.type];
      if (!baseUrl && config.type !== 'custom') {
        throw new Error(`Unknown documentation type: ${config.type}`);
      }

      let url = baseUrl;

      // Build path based on type and category
      switch (config.type) {
        case 'bun':
          url = this.buildBunURL(config, baseUrl);
          break;
        case 'utils':
          url = this.buildUtilsURL(config, baseUrl);
          break;
        case 'cli':
          url = this.buildCLIURL(config, baseUrl);
          break;
        case 'github':
          url = this.buildGitHubURL(config, baseUrl);
          break;
        case 'custom':
          url = config.category || baseUrl;
          break;
      }

      // Add search parameters
      if (config.search) {
        const searchParams = new URLSearchParams(config.search);
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
      }

      // Add fragment
      if (config.fragment || config.anchor) {
        const fragmentData = { ...config.fragment };
        if (config.anchor) {
          fragmentData.anchor = config.anchor;
        }
        
        const fragment = URLFragmentUtils.buildFragment(fragmentData);
        url = URLHandler.addFragment(url, fragment);
      }

      return url;

    } catch (error) {
      handleError(error, 'DocumentationURLHandler.generateDocumentationURL', 'medium');
      return this.BASE_URLS.bun;
    }
  }

  /**
   * Build Bun documentation URL
   */
  private static buildBunURL(config: DocumentationURLConfig, baseUrl: string): string {
    if (config.page && Object.values(DOC_PATHS).includes(config.page as any)) {
      return new URL(config.page, baseUrl).toString();
    }

    if (config.category) {
      return new URL(`/docs/${config.category}`, baseUrl).toString();
    }

    return new URL('/docs', baseUrl).toString();
  }

  /**
   * Build utilities documentation URL
   */
  private static buildUtilsURL(config: DocumentationURLConfig, baseUrl: string): string {
    const category = config.category as UtilsCategory;
    
    if (category && BUN_UTILS_URLS[category]) {
      const categoryUrls = BUN_UTILS_URLS[category];
      const page = config.page?.toUpperCase();
      
      if (page && categoryUrls[page as keyof typeof categoryUrls]) {
        return new URL(categoryUrls[page as keyof typeof categoryUrls], baseUrl).toString();
      }
      
      return new URL(categoryUrls.MAIN, baseUrl).toString();
    }

    return new URL('/docs/api/utils', baseUrl).toString();
  }

  /**
   * Build CLI documentation URL
   */
  private static buildCLIURL(config: DocumentationURLConfig, baseUrl: string): string {
    const category = config.category as CLICategory;
    
    if (category && CLI_DOCUMENTATION_URLS[category]) {
      const categoryUrls = CLI_DOCUMENTATION_URLS[category];
      const page = config.page?.toUpperCase();
      
      if (page && categoryUrls[page as keyof typeof categoryUrls]) {
        return new URL(categoryUrls[page as keyof typeof categoryUrls], baseUrl).toString();
      }
      
      return new URL(categoryUrls.MAIN, baseUrl).toString();
    }

    return new URL('/docs/cli', baseUrl).toString();
  }

  /**
   * Build GitHub URL
   */
  private static buildGitHubURL(config: DocumentationURLConfig, baseUrl: string): string {
    const path = config.category || '';
    return new URL(path, baseUrl).toString();
  }

  /**
   * Parse documentation URL with fragment support
   */
  static parseDocumentationURL(url: string): {
    valid: boolean;
    type?: DocumentationType;
    category?: string;
    page?: string;
    fragment?: Record<string, string>;
    anchor?: string;
    search?: Record<string, string>;
    pattern?: string;
    groups?: Record<string, string>;
  } {
    try {
      const parsed = URLHandler.parse(url);
      const fragment = parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {};
      
      // Extract search parameters
      const search: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        search[key] = value;
      });

      // Determine documentation type
      let type: DocumentationType | undefined;
      let category: string | undefined;
      let page: string | undefined;

      if (parsed.hostname === 'bun.sh') {
        type = 'bun';
        
        // Check for utils documentation
        if (parsed.pathname.includes('/docs/api/utils')) {
          type = 'utils';
          // Extract category from path
          const utilsMatch = parsed.pathname.match(/\/docs\/api\/utils#([a-z_]+)/);
          if (utilsMatch) {
            category = Object.values(UtilsCategory).find(cat => 
              BUN_UTILS_URLS[cat as UtilsCategory]?.MAIN.includes(utilsMatch[1])
            );
          }
        }
        
        // Check for CLI documentation
        if (parsed.pathname.includes('/docs/cli')) {
          type = 'cli';
          // Extract category from path
          const cliMatch = parsed.pathname.match(/\/docs\/cli\/([a-z]+)/);
          if (cliMatch) {
            category = Object.values(CLICategory).find(cat => 
              CLI_DOCUMENTATION_URLS[cat as CLICategory]?.MAIN.includes(cliMatch[1])
            );
          }
        }
      } else if (parsed.hostname === 'github.com') {
        type = 'github';
        category = parsed.pathname.replace('/oven-sh/bun', '');
      }

      // Extract anchor from fragment
      const anchor = fragment.anchor || undefined;
      delete fragment.anchor;

      // Try to match URL patterns
      let pattern: string | undefined;
      let groups: Record<string, string> | undefined;
      
      for (const [patternName, urlPattern] of Object.entries(URL_PATTERNS)) {
        const match = urlPattern.exec(url);
        if (match) {
          pattern = patternName;
          groups = { 
            ...match.pathname.groups, 
            ...match.search.groups, 
            ...match.hash.groups 
          };
          break;
        }
      }

      return {
        valid: true,
        type,
        category,
        page,
        fragment: Object.keys(fragment).length > 0 ? fragment : undefined,
        anchor,
        search: Object.keys(search).length > 0 ? search : undefined,
        pattern,
        groups
      };

    } catch (error) {
      handleError(error, 'DocumentationURLHandler.parseDocumentationURL', 'medium');
      return { valid: false };
    }
  }

  /**
   * Validate documentation URL
   */
  static validateDocumentationURL(url: string, config?: DocumentationURLConfig['validation']): boolean {
    try {
      const validationOptions = {
        allowedHosts: ['bun.sh', 'github.com'],
        requireHTTPS: true,
        allowFragments: true,
        ...config
      };

      return URLHandler.validate(url, validationOptions);

    } catch {
      return false;
    }
  }

  /**
   * Generate shareable documentation link
   */
  static generateShareableLink(
    config: DocumentationURLConfig,
    expiresIn?: number
  ): string {
    const fragment = {
      ...config.fragment,
      shareable: 'true',
      timestamp: new Date().toISOString()
    };

    if (expiresIn) {
      fragment.expires = new Date(Date.now() + expiresIn * 1000).toISOString();
    }

    return this.generateDocumentationURL({
      ...config,
      fragment
    });
  }

  /**
   * Generate navigation breadcrumbs for documentation
   */
  static generateBreadcrumbs(url: string): Array<{
    name: string;
    url: string;
    type: DocumentationType;
  }> {
    try {
      const parsed = this.parseDocumentationURL(url);
      if (!parsed.valid) {
        return [{ name: 'Documentation', url: 'https://bun.sh/docs', type: 'bun' }];
      }

      const breadcrumbs: Array<{ name: string; url: string; type: DocumentationType }> = [];

      // Base documentation
      breadcrumbs.push({ 
        name: 'Documentation', 
        url: 'https://bun.sh/docs', 
        type: parsed.type || 'bun' 
      });

      // Type-specific breadcrumb
      if (parsed.type && parsed.type !== 'bun') {
        const typeUrl = this.BASE_URLS[parsed.type];
        breadcrumbs.push({ 
          name: parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1), 
          url: typeUrl, 
          type: parsed.type 
        });
      }

      // Category breadcrumb
      if (parsed.category) {
        const categoryUrl = this.generateDocumentationURL({
          type: parsed.type || 'bun',
          category: parsed.category
        });
        breadcrumbs.push({ 
          name: parsed.category.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          url: categoryUrl, 
          type: parsed.type || 'bun' 
        });
      }

      // Page breadcrumb
      if (parsed.page) {
        const pageUrl = this.generateDocumentationURL({
          type: parsed.type || 'bun',
          category: parsed.category,
          page: parsed.page
        });
        breadcrumbs.push({ 
          name: parsed.page.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
          url: pageUrl, 
          type: parsed.type || 'bun' 
        });
      }

      return breadcrumbs;

    } catch (error) {
      handleError(error, 'DocumentationURLHandler.generateBreadcrumbs', 'medium');
      return [{ name: 'Documentation', url: 'https://bun.sh/docs', type: 'bun' }];
    }
  }

  /**
   * Generate documentation search URL
   */
  static generateSearchURL(
    query: string,
    type?: DocumentationType,
    options?: {
      category?: string;
      fragment?: Record<string, string>;
    }
  ): string {
    const searchFragment = {
      ...options?.fragment,
      search: query,
      type: 'documentation-search'
    };

    if (type) {
      searchFragment.docType = type;
    }

    if (options?.category) {
      searchFragment.category = options.category;
    }

    return this.generateDocumentationURL({
      type: type || 'bun',
      fragment: searchFragment
    });
  }

  /**
   * Generate example URL with syntax highlighting
   */
  static generateExampleURL(
    config: DocumentationURLConfig & {
      example: string;
      language?: string;
      highlight?: boolean;
    }
  ): string {
    const exampleFragment = {
      ...config.fragment,
      example: config.example,
      language: config.language || 'typescript',
      highlight: config.highlight ? 'true' : 'false',
      type: 'code-example'
    };

    return this.generateDocumentationURL({
      ...config,
      fragment: exampleFragment
    });
  }

  /**
   * Generate comparison URL
   */
  static generateComparisonURL(
    configs: Array<{
      name: string;
      url: string;
      type: DocumentationType;
    }>,
    fragment?: Record<string, string>
  ): string {
    const comparisonFragment = {
      ...fragment,
      type: 'comparison',
      items: configs.map(c => `${c.name}:${c.type}`).join(','),
      count: configs.length.toString()
    };

    return this.generateDocumentationURL({
      type: 'bun',
      fragment: comparisonFragment
    });
  }

  /**
   * Get all available documentation categories
   */
  static getAvailableCategories(type?: DocumentationType): Array<{
    type: DocumentationType;
    category: string;
    url: string;
    description?: string;
  }> {
    const categories: Array<{
      type: DocumentationType;
      category: string;
      url: string;
      description?: string;
    }> = [];

    switch (type) {
      case 'utils':
        Object.values(UtilsCategory).forEach(category => {
          categories.push({
            type: 'utils',
            category,
            url: this.generateDocumentationURL({ type: 'utils', category }),
            description: `${category} utilities documentation`
          });
        });
        break;

      case 'cli':
        Object.values(CLICategory).forEach(category => {
          categories.push({
            type: 'cli',
            category,
            url: this.generateDocumentationURL({ type: 'cli', category }),
            description: `${category} CLI documentation`
          });
        });
        break;

      default:
        // Include all types
        categories.push(...this.getAvailableCategories('utils'));
        categories.push(...this.getAvailableCategories('cli'));
        break;
    }

    return categories;
  }

  /**
   * Generate quick reference URLs
   */
  static generateQuickReferenceURLs(): Record<string, string> {
    return {
      // Bun documentation
      bunMain: this.generateDocumentationURL({ type: 'bun' }),
      bunAPI: this.generateDocumentationURL({ type: 'bun', category: 'api' }),
      bunRuntime: this.generateDocumentationURL({ type: 'bun', category: 'runtime' }),
      bunCLI: this.generateDocumentationURL({ type: 'cli' }),
      
      // Utilities documentation
      utilsMain: this.generateDocumentationURL({ type: 'utils' }),
      utilsFileSystem: this.generateDocumentationURL({ 
        type: 'utils', 
        category: UtilsCategory.FILE_SYSTEM 
      }),
      utilsNetworking: this.generateDocumentationURL({ 
        type: 'utils', 
        category: UtilsCategory.NETWORKING 
      }),
      utilsValidation: this.generateDocumentationURL({ 
        type: 'utils', 
        category: UtilsCategory.VALIDATION 
      }),
      
      // GitHub repository
      githubRepo: this.generateDocumentationURL({ 
        type: 'github', 
        category: '' 
      }),
      githubIssues: this.generateDocumentationURL({ 
        type: 'github', 
        category: 'issues' 
      }),
      
      // Search and examples
      search: this.generateSearchURL('documentation'),
      examples: this.generateDocumentationURL({ 
        type: 'bun', 
        fragment: { type: 'examples' } 
      })
    };
  }
}

// Export default handler
export default DocumentationURLHandler;
