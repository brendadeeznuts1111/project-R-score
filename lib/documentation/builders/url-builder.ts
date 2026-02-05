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
   */
  public buildURL(options: DocumentationURLOptions): string {
    const {
      provider = DocumentationProvider.BUN_OFFICIAL,
      category,
      path,
      fragment,
      queryParams,
      userType = 'all_users',
      preferences = {}
    } = options;
    
    // Get base URL configuration
    const urlConfig = this.getURLConfig(provider);
    const baseURL = this.selectOptimalBaseURL(urlConfig, category, userType);
    
    // Build full URL path
    const fullPath = this.buildPath(baseURL, path, category);
    
    // Add query parameters
    const finalURL = this.addQueryParams(fullPath, {
      ...queryParams,
      ...this.buildTrackingParams(preferences)
    });
    
    // Add fragment
    const urlWithFragment = fragment ? this.addFragment(finalURL, fragment) : finalURL;
    
    // Log access for analytics
    this.logAccess(urlWithFragment, provider, userType, category);
    
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
