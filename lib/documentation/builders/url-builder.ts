#!/usr/bin/env bun

/**
 * 🔗 Enhanced Enterprise Documentation URL Builder
 * 
 * Advanced URL construction with domain-aware routing, intelligent
 * selection between bun.sh and bun.com, and enterprise-grade features.
 * 
 * @author Enterprise Documentation Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { 
  DocumentationProvider, 
  DocumentationCategory,
  DocumentationDomain,
  DocumentationURLType,
  DocumentationUserType,
  DocumentationURLConfig,
  DocumentationURLMapping,
  ProviderMetadata,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DOCUMENTATION_URL_MAPPINGS,
  DOMAIN_PREFERENCES,
  PROVIDER_METADATA,
  QUICK_REFERENCE_URLS
} from '../constants/domains.ts';
import { 
  ENTERPRISE_DOCUMENTATION_PATHS,
  IntelligentRouting
} from '../constants/categories.ts';
import { 
  ENTERPRISE_URL_FRAGMENTS,
  TEXT_FRAGMENT_SPEC,
  FRAGMENT_BUILDERS,
  FRAGMENT_VALIDATION
} from '../constants/fragments.ts';
import { URLHandler, URLFragmentUtils } from '../../core/url-handler.ts';

// Enhanced interface for URL building options
export interface DocumentationURLOptions {
  provider?: DocumentationProvider;
  category?: DocumentationCategory;
  path?: string;
  fragment?: string;
  queryParams?: Record<string, string | number | boolean>;
  userType?: DocumentationUserType;
  preferences?: {
    includeTracking?: boolean;
    preferHTTPS?: boolean;
    addTimestamp?: boolean;
    customHeaders?: Record<string, string>;
  };
}

export interface TypedArrayURLOptions extends Omit<DocumentationURLOptions, 'fragment'> {
  fragment: keyof typeof ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY;
}

export interface EnterpriseAPIURLOptions extends Omit<DocumentationURLOptions, 'path'> {
  version: string;
  endpoint: string;
}

export interface SyscallOptimizationURLOptions extends Omit<DocumentationURLOptions, 'fragment'> {
  operation?: string;
  platform?: string;
}

// Enhanced URL builder with comprehensive type safety
export class EnterpriseDocumentationURLBuilder {
  private static instance: EnterpriseDocumentationURLBuilder;
  private cache = new Map<string, string>();
  private accessLog: Array<{
    timestamp: Date; 
    url: string; 
    provider: DocumentationProvider; 
    userType?: DocumentationUserType;
    category?: DocumentationCategory;
  }> = [];
  
  public static getInstance(): EnterpriseDocumentationURLBuilder {
    if (!EnterpriseDocumentationURLBuilder.instance) {
      EnterpriseDocumentationURLBuilder.instance = new EnterpriseDocumentationURLBuilder();
    }
    return EnterpriseDocumentationURLBuilder.instance;
  }
  
  /**
   * Main URL construction with intelligent routing
   * Supports both new options-based signature and legacy positional arguments
   */
  public buildURL(
    providerOrOptions: DocumentationProvider | DocumentationURLOptions,
    category?: DocumentationCategory,
    path?: string,
    fragment?: string,
    userType?: DocumentationUserType,
    preferences?: DocumentationURLOptions['preferences']
  ): string {
    let options: DocumentationURLOptions;
    
    // If first argument is an options object, use it directly
    if (typeof providerOrOptions === 'object' && 'provider' in providerOrOptions) {
      options = providerOrOptions;
    } else {
      // Otherwise, use legacy signature
      options = {
        provider: providerOrOptions as DocumentationProvider,
        category,
        path,
        fragment,
        userType,
        preferences
      };
    }
    
    const {
      provider = DocumentationProvider.BUN_OFFICIAL,
      category: cat,
      path: pth,
      fragment: frag,
      queryParams,
      userType: ut = 'all_users',
      preferences: prefs = {}
    } = options;
    
    // Get base URL configuration
    const urlConfig = this.getURLConfig(provider);
    const baseURL = this.selectOptimalBaseURL(urlConfig, cat, ut);
    
    // Build full URL path
    const fullPath = this.buildPath(baseURL, pth, cat);
    
    // Add query parameters
    const finalURL = this.addQueryParams(fullPath, {
      ...queryParams,
      ...this.buildTrackingParams(prefs)
    });
    
    // Add fragment
    const urlWithFragment = frag ? this.addFragment(finalURL, frag) : finalURL;
    
    // Log access for analytics
    this.logAccess(urlWithFragment, provider, ut, cat);
    
    return urlWithFragment;
  }
  
  /**
   * Helper method to get URL configuration for a provider
   */
  private getURLConfig(provider: DocumentationProvider): DocumentationURLConfig {
    const config = ENTERPRISE_DOCUMENTATION_BASE_URLS[provider];
    if (!config) {
      throw new Error(`No URL configuration found for provider: ${provider}`);
    }
    return config;
  }
  
  /**
   * Select optimal base URL based on category and user type
   */
  private selectOptimalBaseURL(
    config: DocumentationURLConfig, 
    category?: DocumentationCategory, 
    userType?: DocumentationUserType
  ): string {
    // Priority order for URL selection
    if (category === DocumentationCategory.API_REFERENCE && config.API) {
      return config.API;
    }
    if (category === DocumentationCategory.RUNTIME_FEATURES && config.RUNTIME) {
      return config.RUNTIME;
    }
    if (category === DocumentationCategory.CLI_REFERENCE && config.CLI) {
      return config.CLI;
    }
    if (category === DocumentationCategory.TUTORIALS && config.EXAMPLES) {
      return config.EXAMPLES;
    }
    
    return config.BASE;
  }
  
  /**
   * Build full path from base URL and components
   */
  private buildPath(baseURL: string, path?: string, category?: DocumentationCategory): string {
    const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    
    if (!path) {
      return normalizedBase;
    }
    
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${normalizedBase}/${normalizedPath}`;
  }
  
  /**
   * Add query parameters to URL
   */
  private addQueryParams(
    url: string, 
    params: Record<string, string | number | boolean>
  ): string {
    const urlObj = new URL(url);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, String(value));
      }
    });
    
    return urlObj.toString();
  }
  
  /**
   * Add fragment to URL
   */
  private addFragment(url: string, fragment: string): string {
    const urlObj = new URL(url);
    urlObj.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    return urlObj.toString();
  }
  
  /**
   * Build tracking parameters
   */
  private buildTrackingParams(preferences: DocumentationURLOptions['preferences']): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (preferences?.includeTracking) {
      params.ref = 'enterprise_docs_system';
      params.version = '2.0.0';
      params.timestamp = Date.now().toString();
    }
    
    return params;
  }
  
  /**
   * Log URL access for analytics
   */
  private logAccess(
    url: string, 
    provider: DocumentationProvider, 
    userType?: DocumentationUserType,
    category?: DocumentationCategory
  ): void {
    this.accessLog.push({
      timestamp: new Date(),
      url,
      provider,
      userType,
      category
    });
    
    // Keep log size manageable
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }
  
  /**
   * Build specialized typed array documentation URL
   */
  public buildTypedArrayURL(options: TypedArrayURLOptions): string {
    // Runtime validation of fragment key
    if (!(options.fragment in ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY)) {
      throw new Error(`Invalid typed array fragment: ${options.fragment}. Valid fragments are: ${Object.keys(ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY).join(', ')}`);
    }
    
    return this.buildURL({
      provider: DocumentationProvider.BUN_OFFICIAL,
      category: DocumentationCategory.RUNTIME_FEATURES,
      path: '/runtime/binary-data',
      fragment: ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY[options.fragment],
      queryParams: options.queryParams,
      userType: options.userType,
      preferences: {
        ...options.preferences,
        includeTracking: true
      }
    });
  }
  
  /**
   * Build enterprise API URL for internal documentation
   */
  public buildEnterpriseAPIURL(options: EnterpriseAPIURLOptions): string {
    // Input validation
    if (!options.version || typeof options.version !== 'string') {
      throw new Error('Version must be a non-empty string');
    }
    if (!options.endpoint || typeof options.endpoint !== 'string') {
      throw new Error('Endpoint must be a non-empty string');
    }
    
    // Sanitize endpoint to prevent path traversal
    const sanitizedEndpoint = options.endpoint.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+/, '');
    
    return this.buildURL({
      provider: DocumentationProvider.INTERNAL_WIKI,
      category: DocumentationCategory.API_REFERENCE,
      path: `/api/${options.version}/${sanitizedEndpoint}`,
      fragment: options.fragment,
      queryParams: options.queryParams,
      userType: options.userType,
      preferences: {
        ...options.preferences,
        includeTracking: true
      }
    });
  }
  
  /**
   * Build fetch API documentation URL with enhanced fragment support
   */
  public buildFetchAPIDocsURL(options: Omit<DocumentationURLOptions, 'provider' | 'category' | 'path'> = {}): string {
    return this.buildURL({
      provider: DocumentationProvider.BUN_OFFICIAL,
      category: DocumentationCategory.RUNTIME_FEATURES,
      path: '/runtime/networking/fetch',
      fragment: options.fragment,
      queryParams: options.queryParams,
      userType: options.userType,
      preferences: {
        ...options.preferences,
        includeTracking: true
      }
    });
  }
  
  /**
   * Generate all typed array related URLs
   */
  public getAllTypedArrayURLs(): Record<string, string> {
    const urls: Record<string, string> = {};
    
    Object.entries(ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY).forEach(([key, fragment]) => {
      // Safe key casting with validation
      const fragmentKey = key as keyof typeof ENTERPRISE_URL_FRAGMENTS.TYPED_ARRAY;
      urls[key.toLowerCase()] = this.buildTypedArrayURL({
        fragment: fragmentKey,
        preferences: { includeTracking: true }
      });
    });
    
    return urls;
  }
  
  /**
   * Build syscall optimization documentation URL
   */
  public buildSyscallOptimizationURL(options: SyscallOptimizationURLOptions): string {
    const fragment = options.operation ? `#${options.operation}-optimization` : '#overview';
    const queryParams = options.platform ? { platform: options.platform } : undefined;
    
    return this.buildURL({
      provider: DocumentationProvider.BUN_OFFICIAL,
      category: DocumentationCategory.PERFORMANCE_OPTIMIZATION,
      path: '/runtime/syscall-optimization',
      fragment,
      queryParams,
      userType: options.userType,
      preferences: {
        ...options.preferences,
        includeTracking: true
      }
    });
  }

  /**
   * Build CLI documentation URL with fragment
   */
  public buildCLIDocumentationURL(
    subcommand: string,
    fragment?: string,
    options?: { includeExamples?: boolean }
  ): string {
    const baseURLs = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    let path = `/docs/cli/${subcommand.toLowerCase()}`;
    
    if (options?.includeExamples) {
      path += '?examples=true';
    }
    
    const url = new URL(path, baseURLs.DOCS);
    if (fragment) {
      url.hash = fragment;
    }
    
    return url.toString();
  }

  /**
   * Build Bun.utils documentation URL
   */
  public buildUtilsDocumentationURL(
    utilityFunction?: string,
    fragment?: string
  ): string {
    const baseURLs = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    let url = new URL('/docs/api/utils', baseURLs.API);
    
    if (utilityFunction) {
      url.hash = utilityFunction;
    } else if (fragment) {
      url.hash = fragment;
    }
    
    return url.toString();
  }

  /**
   * Get CLI fragment URLs
   */
  public getCLIFragmentURLs(): Record<string, string> {
    const base = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL].DOCS;
    
    return {
      run: `${base}/docs/cli/run#examples`,
      test: `${base}/docs/cli/test#configuration`,
      build: `${base}/docs/cli/build#options`,
      install: `${base}/docs/cli/install-command#dependencies`,
      add: `${base}/docs/cli/add#packages`
    };
  }

  /**
   * Build CLI command example
   */
  public buildCLICommandExample(
    command: string,
    options: Record<string, any> = {}
  ): string {
    let cmd = `bun ${command}`;
    
    // Add positional arguments
    if (options.script) {
      cmd += ` ${options.script}`;
    }
    if (options.package) {
      cmd += ` ${options.package}`;
      if (options.version) {
        cmd += `@${options.version}`;
      }
    }
    if (options.entry) {
      cmd += ` ${options.entry}`;
    }
    
    // Add flags
    Object.entries(options).forEach(([key, value]) => {
      if (!['script', 'package', 'version', 'entry'].includes(key)) {
        if (typeof value === 'boolean' && value) {
          cmd += ` --${key}`;
        } else if (typeof value !== 'boolean') {
          cmd += ` --${key}=${value}`;
        }
      }
    });
    
    return cmd;
  }

  /**
   * Get cheatsheet URLs
   */
  public getCheatsheetURLs(): any {
    const base = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
    
    return {
      cli: {
        main: `${base.CLI}`,
        commands: [
          {
            name: 'run',
            example: 'bun run dev',
            docs: `${base.CLI}/run`
          },
          {
            name: 'test',
            example: 'bun test --watch',
            docs: `${base.CLI}/test`
          },
          {
            name: 'build',
            example: 'bun build ./src/index.ts',
            docs: `${base.CLI}/build`
          }
        ]
      },
      utils: {
        main: `${base.API}/utils`,
        functions: [
          {
            name: 'readFile',
            example: "await readFile('file.txt', 'utf-8')",
            docs: `${base.API}/utils#readFile`
          },
          {
            name: 'isTypedArray',
            example: 'isTypedArray(new Uint8Array())',
            docs: `${base.API}/utils#isTypedArray`
          },
          {
            name: 'toBuffer',
            example: 'toBuffer("Hello")',
            docs: `${base.API}/utils#toBuffer`
          }
        ],
        validation: [
          {
            name: 'isTypedArray',
            test: 'new Uint8Array([1, 2, 3])',
            result: 'true'
          },
          {
            name: 'isString',
            test: '"Hello"',
            result: 'true'
          },
          {
            name: 'isArray',
            test: '[1, 2, 3]',
            result: 'true'
          }
        ]
      },
      api: {
        main: `${base.API}`,
        typedArray: `${base.RUNTIME}/binary-data#typedarray`,
        fetch: `${base.RUNTIME}/networking/fetch`
      }
    };
  }

  /**
   * Get example commit URL
   */
  public getExampleCommitURL(): string {
    return 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';
  }

  /**
   * Build GitHub raw URL
   */
  public buildGitHubRawURL(
    ref: string,
    path: string
  ): string {
    // Sanitize path to prevent path traversal
    const sanitizedPath = path.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+/, '');
    return `https://raw.githubusercontent.com/oven-sh/bun/${ref}/${sanitizedPath}`;
  }

  /**
   * Build GitHub commit URL
   */
  public buildGitHubCommitURL(
    owner: string,
    repo: string,
    commitHash: string,
    path: string,
    viewType: 'tree' | 'blob' = 'tree'
  ): string {
    const sanitizedPath = path.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+/, '');
    return `https://github.com/${owner}/${repo}/${viewType}/${commitHash}/${sanitizedPath}`;
  }

  /**
   * Get GitHub package URLs
   */
  public getGitHubPackageURLs(
    packageName: string,
    commitHash?: string
  ): Record<string, string> {
    const hash = commitHash || 'main';
    const basePath = `packages/${packageName}`;
    return {
      tree: this.buildGitHubCommitURL('oven-sh', 'bun', hash, basePath, 'tree'),
      blob: this.buildGitHubCommitURL('oven-sh', 'bun', hash, basePath, 'blob'),
      raw: this.buildGitHubRawURL(hash, basePath)
    };
  }

  /**
   * Build Bun types URL
   */
  public buildBunTypesURL(
    commitHash?: string,
    path?: string
  ): string {
    const hash = commitHash || 'main';
    const pth = path || 'packages/bun-types';
    return this.buildGitHubCommitURL('oven-sh', 'bun', hash, pth, 'tree');
  }

  /**
   * Build Bun reference URL with text fragment
   */
  public buildBunReferenceWithTextFragment(
    text: string,
    options?: {
      prefix?: string;
      suffix?: string;
      textStart?: string;
      textEnd?: string;
    }
  ): string {
    const baseURL = 'https://bun.com/reference';
    const fragment = TEXT_FRAGMENT_SPEC.build({
      textStart: options?.textStart || text,
      prefix: options?.prefix,
      suffix: options?.suffix,
      textEnd: options?.textEnd
    });
    return `${baseURL}${fragment}`;
  }

  /**
   * Get common text fragment URLs
   */
  public getCommonTextFragmentURLs(): Record<string, string> {
    return {
      nodeZlib: this.buildBunReferenceWithTextFragment('node:zlib'),
      bunAPIReference: this.buildBunReferenceWithTextFragment('Bun API Reference')
    };
  }

  /**
   * Get TypeScript definition file URLs
   */
  public getTypeDefinitionURLs(): Record<string, string> {
    const baseURLs = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_TYPES];

    return {
      npmPackage: baseURLs.NPM_PACKAGE,
      githubPackage: baseURLs.GITHUB_PACKAGE,
      latestTypes: baseURLs.LATEST_TYPES_COMMIT(),
      exampleCommit: this.getExampleCommitURL(),
      typescriptPlayground: baseURLs.TYPESCRIPT_PLAYGROUND
    };
  }

  /**
   * Build URL with text fragment (for bun.com/reference#:~:text=...)
   */
  public buildURLWithTextFragment(
    baseURL: string,
    textFragment: string,
    options?: {
      prefix?: string;
      suffix?: string;
      textStart?: string;
      textEnd?: string;
    }
  ): string {
    const url = new URL(baseURL);

    // Build text fragment according to spec: #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
    let fragment = ':~:text=';

    if (options?.prefix) {
      fragment += `${encodeURIComponent(options.prefix)}-`;
    }

    fragment += encodeURIComponent(options?.textStart || textFragment);

    if (options?.textEnd) {
      fragment += `,${encodeURIComponent(options.textEnd)}`;
    }

    if (options?.suffix) {
      fragment += `,-${encodeURIComponent(options.suffix)}`;
    }

    // Append to existing hash or create new
    if (url.hash && !url.hash.includes(':~:')) {
      url.hash = `${url.hash}${fragment}`;
    } else {
      url.hash = fragment;
    }

    return url.toString();
  }

}

// Export singleton instance for easy access
export const docsURLBuilder = EnterpriseDocumentationURLBuilder.getInstance();

// Export interfaces for type usage
export type {
  DocumentationURLOptions,
  TypedArrayURLOptions,
  EnterpriseAPIURLOptions,
  SyscallOptimizationURLOptions
};
