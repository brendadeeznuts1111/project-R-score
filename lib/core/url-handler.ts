#!/usr/bin/env bun

/**
 * 🔗 Advanced URL Handler with Fragment Support
 * 
 * Comprehensive URL parsing, validation, and fragment handling for the FactoryWager ecosystem
 */

import { handleError, ValidationError } from './error-handling.ts';
import { Validator } from './validation.ts';

/**
 * URL components interface
 */
export interface URLComponents {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
  search: string;
  fragment: string;
  searchParams: URLSearchParams;
  hash: string;
}

/**
 * URL validation options
 */
export interface URLValidationOptions {
  allowedProtocols?: string[];
  allowedHosts?: string[];
  requireHTTPS?: boolean;
  allowFragments?: boolean;
  maxLength?: number;
}

/**
 * Enhanced URL class with fragment support
 */
export class EnhancedURL {
  private components: URLComponents;
  private original: string;

  constructor(url: string, base?: string) {
    this.original = url;
    this.components = this.parseURL(url, base);
  }

  /**
   * Parse URL into components with fragment handling
   */
  private parseURL(url: string, base?: string): URLComponents {
    try {
      const fullURL = base ? new URL(url, base) : new URL(url);
      
      return {
        protocol: fullURL.protocol,
        hostname: fullURL.hostname,
        port: fullURL.port ? parseInt(fullURL.port) : undefined,
        pathname: fullURL.pathname,
        search: fullURL.search,
        fragment: fullURL.hash.slice(1), // Remove # prefix
        searchParams: fullURL.searchParams,
        hash: fullURL.hash
      };
    } catch (error) {
      handleError(error, 'EnhancedURL.parseURL', 'medium');
      throw new ValidationError(`Invalid URL: ${url}`);
    }
  }

  /**
   * Get protocol
   */
  get protocol(): string {
    return this.components.protocol;
  }

  /**
   * Get hostname
   */
  get hostname(): string {
    return this.components.hostname;
  }

  /**
   * Get port
   */
  get port(): number | undefined {
    return this.components.port;
  }

  /**
   * Get pathname
   */
  get pathname(): string {
    return this.components.pathname;
  }

  /**
   * Get search string
   */
  get search(): string {
    return this.components.search;
  }

  /**
   * Get fragment (without #)
   */
  get fragment(): string {
    return this.components.fragment;
  }

  /**
   * Get hash (with #)
   */
  get hash(): string {
    return this.components.hash;
  }

  /**
   * Get search parameters
   */
  get searchParams(): URLSearchParams {
    return this.components.searchParams;
  }

  /**
   * Check if URL has fragment
   */
  hasFragment(): boolean {
    return this.components.fragment.length > 0;
  }

  /**
   * Get full URL string
   */
  toString(): string {
    return this.original;
  }

  /**
   * Get URL without fragment
   */
  toStringWithoutFragment(): string {
    const url = new URL(this.original);
    url.hash = '';
    return url.toString();
  }

  /**
   * Get URL with new fragment
   */
  withFragment(fragment: string): EnhancedURL {
    const url = new URL(this.original);
    url.hash = fragment.startsWith('#') ? fragment : `#${fragment}`;
    return new EnhancedURL(url.toString());
  }

  /**
   * Get URL without fragment
   */
  withoutFragment(): EnhancedURL {
    return new EnhancedURL(this.toStringWithoutFragment());
  }

  /**
   * Add or update search parameter
   */
  withSearchParam(key: string, value: string): EnhancedURL {
    const url = new URL(this.original);
    url.searchParams.set(key, value);
    return new EnhancedURL(url.toString());
  }

  /**
   * Remove search parameter
   */
  withoutSearchParam(key: string): EnhancedURL {
    const url = new URL(this.original);
    url.searchParams.delete(key);
    return new EnhancedURL(url.toString());
  }

  /**
   * Get all components
   */
  getComponents(): URLComponents {
    return { ...this.components };
  }
}

/**
 * URL Handler class
 */
export class URLHandler {
  private static defaultOptions: URLValidationOptions = {
    allowedProtocols: ['http:', 'https:', 'ws:', 'wss:'],
    requireHTTPS: false,
    allowFragments: true,
    maxLength: 2048
  };

  /**
   * Parse URL with enhanced features
   */
  static parse(url: string, base?: string): EnhancedURL {
    const validation = Validator.string({
      required: true,
      maxLength: this.defaultOptions.maxLength,
      sanitize: true
    });

    const result = validation(url);
    if (!result.isValid) {
      throw new ValidationError(`Invalid URL string: ${result.errors.join(', ')}`);
    }

    return new EnhancedURL(result.data, base);
  }

  /**
   * Validate URL against options
   */
  static validate(url: string, options: URLValidationOptions = {}): boolean {
    try {
      const enhancedURL = new EnhancedURL(url);
      const opts = { ...this.defaultOptions, ...options };

      // Check protocol
      if (opts.allowedProtocols && !opts.allowedProtocols.includes(enhancedURL.protocol)) {
        return false;
      }

      // Check HTTPS requirement
      if (opts.requireHTTPS && enhancedURL.protocol !== 'https:') {
        return false;
      }

      // Check allowed hosts
      if (opts.allowedHosts && !opts.allowedHosts.includes(enhancedURL.hostname)) {
        return false;
      }

      // Check fragment allowance
      if (!opts.allowFragments && enhancedURL.hasFragment()) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract fragment from URL
   */
  static getFragment(url: string): string {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.fragment;
    } catch {
      return '';
    }
  }

  /**
   * Remove fragment from URL
   */
  static removeFragment(url: string): string {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.toStringWithoutFragment();
    } catch {
      return url;
    }
  }

  /**
   * Add fragment to URL
   */
  static addFragment(url: string, fragment: string): string {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.withFragment(fragment).toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if URL has fragment
   */
  static hasFragment(url: string): boolean {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.hasFragment();
    } catch {
      return false;
    }
  }

  /**
   * Extract search parameters
   */
  static getSearchParams(url: string): URLSearchParams | null {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.searchParams;
    } catch {
      return null;
    }
  }

  /**
   * Get search parameter value
   */
  static getSearchParam(url: string, key: string): string | null {
    try {
      const params = this.getSearchParams(url);
      return params?.get(key) || null;
    } catch {
      return null;
    }
  }

  /**
   * Build URL from components
   */
  static build(components: Partial<URLComponents>): string {
    const DEFAULT_HOST = process.env.SERVER_HOST || process.env.HOST || 'localhost';
    const url = new URL(`http://${DEFAULT_HOST}`);

    if (components.protocol) {
      url.protocol = components.protocol;
    }

    if (components.hostname) {
      url.hostname = components.hostname;
    }

    if (components.port) {
      url.port = components.port.toString();
    }

    if (components.pathname) {
      url.pathname = components.pathname;
    }

    if (components.search) {
      url.search = components.search;
    }

    if (components.fragment) {
      url.hash = `#${components.fragment}`;
    }

    return url.toString();
  }

  /**
   * Normalize URL
   */
  static normalize(url: string): string {
    try {
      const enhancedURL = new EnhancedURL(url);
      
      // Normalize hostname to lowercase
      if (enhancedURL.hostname) {
        enhancedURL.components.hostname = enhancedURL.hostname.toLowerCase();
      }

      // Remove trailing slash from pathname unless it's root
      if (enhancedURL.pathname.length > 1 && enhancedURL.pathname.endsWith('/')) {
        enhancedURL.components.pathname = enhancedURL.pathname.slice(0, -1);
      }

      // Sort search parameters
      if (enhancedURL.searchParams.toString()) {
        const params = new URLSearchParams();
        const keys = Array.from(enhancedURL.searchParams.keys()).sort();
        
        for (const key of keys) {
          const values = enhancedURL.searchParams.getAll(key);
          for (const value of values) {
            params.append(key, value);
          }
        }
        
        enhancedURL.components.search = params.toString();
      }

      return this.build(enhancedURL.components);
    } catch {
      return url;
    }
  }

  /**
   * Compare two URLs (ignoring fragment)
   */
  static compareWithoutFragment(url1: string, url2: string): boolean {
    try {
      const normalized1 = this.normalize(this.removeFragment(url1));
      const normalized2 = this.normalize(this.removeFragment(url2));
      return normalized1 === normalized2;
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  static getDomain(url: string): string {
    try {
      const enhancedURL = new EnhancedURL(url);
      return enhancedURL.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if URL is absolute
   */
  static isAbsolute(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve relative URL against base
   */
  static resolve(base: string, relative: string): string {
    try {
      return new URL(relative, base).toString();
    } catch {
      return relative;
    }
  }
}

/**
 * URL Fragment Utilities
 */
export class URLFragmentUtils {
  /**
   * Parse fragment into key-value pairs
   */
  static parseFragment(fragment: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!fragment) {
      return params;
    }

    // Remove # if present
    const cleanFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
    
    // Parse key=value pairs separated by &
    const pairs = cleanFragment.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
    
    return params;
  }

  /**
   * Build fragment from key-value pairs
   */
  static buildFragment(params: Record<string, string>): string {
    const pairs = Object.entries(params)
      .filter(([key]) => key.length > 0)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return pairs.length > 0 ? `#${pairs.join('&')}` : '';
  }

  /**
   * Get fragment parameter value
   */
  static getFragmentParam(url: string, key: string): string | null {
    const fragment = URLHandler.getFragment(url);
    const params = this.parseFragment(fragment);
    return params[key] || null;
  }

  /**
   * Set fragment parameter
   */
  static setFragmentParam(url: string, key: string, value: string): string {
    const fragment = URLHandler.getFragment(url);
    const params = this.parseFragment(fragment);
    params[key] = value;
    return URLHandler.addFragment(url, this.buildFragment(params).slice(1));
  }

  /**
   * Remove fragment parameter
   */
  static removeFragmentParam(url: string, key: string): string {
    const fragment = URLHandler.getFragment(url);
    const params = this.parseFragment(fragment);
    delete params[key];
    
    if (Object.keys(params).length === 0) {
      return URLHandler.removeFragment(url);
    }
    
    return URLHandler.addFragment(url, this.buildFragment(params).slice(1));
  }

  /**
   * Check if fragment has parameters
   */
  static hasFragmentParams(url: string): boolean {
    const fragment = URLHandler.getFragment(url);
    const params = this.parseFragment(fragment);
    return Object.keys(params).length > 0;
  }
}

/**
 * FactoryWager URL Utilities
 */
export class FactoryWagerURLUtils {
  private static readonly BASE_URL = 'https://factory-wager.com';
  private static readonly ALLOWED_HOSTS = [
    'factory-wager.com',
    'duoplus.com',
    'dashboard.factory-wager.com',
    'r2.factory-wager.com',
    'api.factory-wager.com',
    'wiki.factory-wager.com'
  ];

  /**
   * Create FactoryWager API URL
   */
  static createAPIURL(path: string, params?: Record<string, string>): string {
    let url = `${this.BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }

  /**
   * Create dashboard URL with fragment
   */
  static createDashboardURL(section?: string, fragment?: Record<string, string>): string {
    let url = 'https://dashboard.factory-wager.com';
    
    if (section) {
      url += `/${section}`;
    }
    
    if (fragment) {
      url += URLFragmentUtils.buildFragment(fragment);
    }
    
    return url;
  }

  /**
   * Create R2 browser URL with fragment
   */
  static createR2BrowserURL(category?: string, fragment?: Record<string, string>): string {
    let url = 'https://r2.factory-wager.com';
    
    if (category) {
      url += `/${category}`;
    }
    
    if (fragment) {
      url += URLFragmentUtils.buildFragment(fragment);
    }
    
    return url;
  }

  /**
   * Validate FactoryWager URL
   */
  static validateFactoryWagerURL(url: string): boolean {
    return URLHandler.validate(url, {
      allowedHosts: this.ALLOWED_HOSTS,
      requireHTTPS: true,
      allowFragments: true
    });
  }

  /**
   * Extract FactoryWager service from URL
   */
  static extractService(url: string): string {
    try {
      const enhancedURL = URLHandler.parse(url);
      const hostname = enhancedURL.hostname;
      
      if (hostname.includes('dashboard')) return 'dashboard';
      if (hostname.includes('r2')) return 'r2';
      if (hostname.includes('api')) return 'api';
      if (hostname.includes('wiki')) return 'wiki';
      if (hostname.includes('duoplus')) return 'duoplus';
      
      return 'main';
    } catch {
      return 'unknown';
    }
  }
}

// Export default URL handler
export default URLHandler;
