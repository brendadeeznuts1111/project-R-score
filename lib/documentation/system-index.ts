#!/usr/bin/env bun

/**
 * 📚 Enterprise Documentation System Index & Cross-Reference
 * 
 * Comprehensive cross-reference index for all documentation components,
 * ensuring proper location pointing and navigation across the system.
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
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DOCUMENTATION_URL_MAPPINGS
} from './constants/domains.ts';
import { ENTERPRISE_URL_FRAGMENTS } from './constants/fragments.ts';
import { ENTERPRISE_DOCUMENTATION_PATHS } from './constants/categories.ts';

export interface DocumentationIndexEntry {
  id: string;
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    section?: string;
  };
  url?: string;
  provider?: DocumentationProvider;
  category?: DocumentationCategory;
  domain?: DocumentationDomain;
  type: DocumentationURLType;
  audience: DocumentationUserType[];
  tags: string[];
  related: string[]; // IDs of related entries
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface CrossReferenceMap {
  [key: string]: {
    entries: DocumentationIndexEntry[];
    categories: Record<string, string[]>;
    providers: Record<string, string[]>;
    domains: Record<string, string[]>;
    tags: Record<string, string[]>;
  };
}

/**
 * Comprehensive documentation index with cross-references
 */
export class DocumentationSystemIndex {
  private static instance: DocumentationSystemIndex;
  private index: Map<string, DocumentationIndexEntry> = new Map();
  private crossRef: CrossReferenceMap = {
    main: {
      entries: [],
      categories: {},
      providers: {},
      domains: {},
      tags: {}
    }
  };

  public static getInstance(): DocumentationSystemIndex {
    if (!DocumentationSystemIndex.instance) {
      DocumentationSystemIndex.instance = new DocumentationSystemIndex();
    }
    return DocumentationSystemIndex.instance;
  }

  constructor() {
    this.buildIndex();
  }

  /**
   * Build comprehensive index of all documentation components
   */
  private buildIndex(): void {
    // Index domains
    this.indexDomains();
    
    // Index providers
    this.indexProviders();
    
    // Index categories
    this.indexCategories();
    
    // Index URL fragments
    this.indexFragments();
    
    // Index paths
    this.indexPaths();
    
    // Build cross-references
    this.buildCrossReferences();
  }

  /**
   * Index all documentation domains
   */
  private indexDomains(): void {
    const domains = [
      {
        id: 'domain-bun-sh',
        title: 'Bun.sh - Main Technical Documentation',
        description: 'Primary domain for Bun technical documentation, API reference, and runtime features',
        location: { file: '/lib/documentation/constants/domains.ts', line: 14 },
        url: 'https://bun.sh',
        domain: DocumentationDomain.BUN_SH,
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers', 'enterprise_admins'] as DocumentationUserType[],
        tags: ['main', 'technical', 'api', 'runtime']
      },
      {
        id: 'domain-bun-com',
        title: 'Bun.com - Reference Portal & Guides',
        description: 'Reference portal, tutorials, guides, and community resources',
        location: { file: '/lib/documentation/constants/domains.ts', line: 15 },
        url: 'https://bun.com',
        domain: DocumentationDomain.BUN_COM,
        type: 'tutorials' as DocumentationURLType,
        audience: ['beginners', 'educators', 'all_users'] as DocumentationUserType[],
        tags: ['reference', 'guides', 'tutorials', 'community']
      },
      {
        id: 'domain-bun-dev',
        title: 'Bun.dev - Development Focus',
        description: 'Development and API-focused documentation',
        location: { file: '/lib/documentation/constants/domains.ts', line: 16 },
        url: 'https://bun.dev',
        domain: DocumentationDomain.BUN_DEV,
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers'] as DocumentationUserType[],
        tags: ['development', 'api', 'focus']
      }
    ];

    domains.forEach(domain => {
      this.index.set(domain.id, domain);
    });
  }

  /**
   * Index all documentation providers
   */
  private indexProviders(): void {
    const providers = [
      {
        id: 'provider-bun-official',
        title: 'Bun Official Documentation',
        description: 'Official Bun technical documentation and API reference',
        location: { file: '/lib/documentation/constants/domains.ts', line: 24 },
        provider: DocumentationProvider.BUN_OFFICIAL,
        domain: DocumentationDomain.BUN_SH,
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers', 'enterprise_admins'] as DocumentationUserType[],
        tags: ['official', 'technical', 'api'],
        related: ['domain-bun-sh', 'category-api-reference', 'category-runtime-features']
      },
      {
        id: 'provider-bun-api-docs',
        title: 'Bun API Documentation',
        description: 'Comprehensive API documentation for Bun runtime',
        location: { file: '/lib/documentation/constants/domains.ts', line: 26 },
        provider: DocumentationProvider.BUN_API_DOCS,
        domain: DocumentationDomain.BUN_SH,
        type: 'api_reference' as DocumentationURLType,
        audience: ['developers'] as DocumentationUserType[],
        tags: ['api', 'reference', 'technical'],
        related: ['domain-bun-sh', 'category-api-reference', 'fragment-api']
      },
      {
        id: 'provider-bun-runtime-docs',
        title: 'Bun Runtime Documentation',
        description: 'Runtime features and optimization documentation',
        location: { file: '/lib/documentation/constants/domains.ts', line: 27 },
        provider: DocumentationProvider.BUN_RUNTIME_DOCS,
        domain: DocumentationDomain.BUN_SH,
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers', 'devops_engineers'] as DocumentationUserType[],
        tags: ['runtime', 'performance', 'optimization'],
        related: ['domain-bun-sh', 'category-runtime-features', 'category-performance-optimization']
      }
    ];

    providers.forEach(provider => {
      this.index.set(provider.id, provider);
    });
  }

  /**
   * Index all documentation categories
   */
  private indexCategories(): void {
    const categories = [
      {
        id: 'category-api-reference',
        title: 'API Reference',
        description: 'Complete API reference documentation for all Bun APIs',
        location: { file: '/lib/documentation/constants/domains.ts', line: 61 },
        category: DocumentationCategory.API_REFERENCE,
        type: 'api_reference' as DocumentationURLType,
        audience: ['developers', 'educators'] as DocumentationUserType[],
        tags: ['api', 'reference', 'complete'],
        related: ['provider-bun-api-docs', 'provider-bun-reference', 'fragment-api']
      },
      {
        id: 'category-runtime-features',
        title: 'Runtime Features',
        description: 'Runtime features, performance optimizations, and internals',
        location: { file: '/lib/documentation/constants/domains.ts', line: 62 },
        category: DocumentationCategory.RUNTIME_FEATURES,
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers', 'devops_engineers'] as DocumentationUserType[],
        tags: ['runtime', 'features', 'performance'],
        related: ['provider-bun-runtime-docs', 'fragment-typed-array', 'fragment-networking']
      },
      {
        id: 'category-performance-optimization',
        title: 'Performance Optimization',
        description: 'Performance tuning, optimization techniques, and best practices',
        location: { file: '/lib/documentation/constants/domains.ts', line: 81 },
        category: DocumentationCategory.PERFORMANCE_OPTIMIZATION,
        type: 'performance' as DocumentationURLType,
        audience: ['developers', 'devops_engineers'] as DocumentationUserType[],
        tags: ['performance', 'optimization', 'tuning'],
        related: ['provider-bun-runtime-docs', 'fragment-performance', 'syscall-optimization']
      }
    ];

    categories.forEach(category => {
      this.index.set(category.id, category);
    });
  }

  /**
   * Index all URL fragments
   */
  private indexFragments(): void {
    const fragments = [
      {
        id: 'fragment-typed-array-overview',
        title: 'Typed Array Overview',
        description: 'Overview of typed arrays and binary data handling in Bun',
        location: { file: '/lib/documentation/constants/fragments.ts', line: 53 },
        url: '#typedarray',
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers'] as DocumentationUserType[],
        tags: ['typed-array', 'binary', 'overview'],
        related: ['category-runtime-features', 'typed-array-methods', 'typed-array-conversion']
      },
      {
        id: 'fragment-networking-fetch',
        title: 'Fetch API Documentation',
        description: 'Fetch API implementation and usage in Bun',
        location: { file: '/lib/documentation/constants/fragments.ts', line: 65 },
        url: '#fetch',
        type: 'api_reference' as DocumentationURLType,
        audience: ['developers'] as DocumentationUserType[],
        tags: ['networking', 'fetch', 'api'],
        related: ['category-runtime-features', 'fragment-networking-websocket']
      }
    ];

    fragments.forEach(fragment => {
      this.index.set(fragment.id, fragment);
    });
  }

  /**
   * Index all documentation paths
   */
  private indexPaths(): void {
    const paths = [
      {
        id: 'path-runtime-binary-data',
        title: 'Runtime Binary Data',
        description: 'Binary data handling, typed arrays, and buffer operations',
        location: { file: '/lib/documentation/constants/categories.ts', section: 'RUNTIME_FEATURES' },
        url: '/runtime/binary-data',
        type: 'technical_docs' as DocumentationURLType,
        audience: ['developers'] as DocumentationUserType[],
        tags: ['runtime', 'binary', 'typed-array'],
        related: ['category-runtime-features', 'fragment-typed-array-overview']
      },
      {
        id: 'path-runtime-syscall-optimization',
        title: 'Syscall Optimization',
        description: 'Low-level syscall optimization and performance tuning',
        location: { file: '/lib/documentation/constants/categories.ts', section: 'PERFORMANCE_OPTIMIZATION' },
        url: '/runtime/syscall-optimization',
        type: 'performance' as DocumentationURLType,
        audience: ['developers', 'devops_engineers'] as DocumentationUserType[],
        tags: ['runtime', 'syscall', 'optimization'],
        related: ['category-performance-optimization', 'syscall-optimization']
      }
    ];

    paths.forEach(path => {
      this.index.set(path.id, path);
    });
  }

  /**
   * Build cross-reference maps
   */
  private buildCrossReferences(): void {
    const mainRef = this.crossRef.main;
    
    // Build category mappings
    mainRef.categories = {
      'api': ['provider-bun-api-docs', 'provider-bun-reference', 'category-api-reference'],
      'runtime': ['provider-bun-runtime-docs', 'category-runtime-features', 'path-runtime-binary-data'],
      'performance': ['category-performance-optimization', 'fragment-performance-optimization'],
      'networking': ['fragment-networking-fetch', 'path-runtime-networking'],
      'binary-data': ['fragment-typed-array-overview', 'path-runtime-binary-data'],
      'optimization': ['category-performance-optimization', 'syscall-optimization']
    };

    // Build provider mappings
    mainRef.providers = {
      'bun-official': ['provider-bun-official', 'domain-bun-sh'],
      'bun-api': ['provider-bun-api-docs', 'category-api-reference'],
      'bun-runtime': ['provider-bun-runtime-docs', 'category-runtime-features']
    };

    // Build domain mappings
    mainRef.domains = {
      'bun.sh': ['domain-bun-sh', 'provider-bun-official', 'provider-bun-api-docs'],
      'bun.com': ['domain-bun-com', 'provider-bun-reference', 'provider-bun-guides'],
      'bun.dev': ['domain-bun-dev']
    };

    // Build tag mappings
    mainRef.tags = {
      'api': ['provider-bun-api-docs', 'category-api-reference', 'fragment-api'],
      'runtime': ['provider-bun-runtime-docs', 'category-runtime-features'],
      'performance': ['category-performance-optimization', 'fragment-performance-optimization'],
      'typed-array': ['fragment-typed-array-overview', 'fragment-typed-array-methods'],
      'networking': ['fragment-networking-fetch', 'path-runtime-networking'],
      'optimization': ['category-performance-optimization', 'syscall-optimization']
    };

    // Store all entries
    mainRef.entries = Array.from(this.index.values());
  }

  /**
   * Search the documentation index
   */
  public search(query: string, options?: {
    type?: DocumentationURLType;
    audience?: DocumentationUserType;
    provider?: DocumentationProvider;
    category?: DocumentationCategory;
    tags?: string[];
  }): DocumentationIndexEntry[] {
    const results: DocumentationIndexEntry[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.index.values()) {
      // Skip deprecated entries unless specifically requested
      if (entry.deprecated && !options?.tags?.includes('deprecated')) {
        continue;
      }

      // Apply filters
      if (options?.type && entry.type !== options.type) continue;
      if (options?.audience && !entry.audience.includes(options.audience)) continue;
      if (options?.provider && entry.provider !== options.provider) continue;
      if (options?.category && entry.category !== options.category) continue;
      if (options?.tags && !options.tags.some(tag => entry.tags.includes(tag))) continue;

      // Search in title, description, and tags
      const searchText = `${entry.title} ${entry.description} ${entry.tags.join(' ')}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => {
      // Prioritize exact title matches
      if (a.title.toLowerCase() === lowerQuery) return -1;
      if (b.title.toLowerCase() === lowerQuery) return 1;
      
      // Then prioritize title contains
      const aTitleContains = a.title.toLowerCase().includes(lowerQuery);
      const bTitleContains = b.title.toLowerCase().includes(lowerQuery);
      if (aTitleContains && !bTitleContains) return -1;
      if (!aTitleContains && bTitleContains) return 1;
      
      return 0;
    });
  }

  /**
   * Get entry by ID
   */
  public getEntry(id: string): DocumentationIndexEntry | undefined {
    return this.index.get(id);
  }

  /**
   * Get related entries
   */
  public getRelated(id: string): DocumentationIndexEntry[] {
    const entry = this.index.get(id);
    if (!entry) return [];

    return entry.related
      .map(relatedId => this.index.get(relatedId))
      .filter((related): related is DocumentationIndexEntry => related !== undefined);
  }

  /**
   * Get entries by category
   */
  public getByCategory(category: string): DocumentationIndexEntry[] {
    return this.crossRef.main.categories[category] || [];
  }

  /**
   * Get entries by provider
   */
  public getByProvider(provider: string): DocumentationIndexEntry[] {
    return this.crossRef.main.providers[provider] || [];
  }

  /**
   * Get entries by domain
   */
  public getByDomain(domain: string): DocumentationIndexEntry[] {
    return this.crossRef.main.domains[domain] || [];
  }

  /**
   * Get entries by tag
   */
  public getByTag(tag: string): DocumentationIndexEntry[] {
    return this.crossRef.main.tags[tag] || [];
  }

  /**
   * Get all entries
   */
  public getAllEntries(): DocumentationIndexEntry[] {
    return this.crossRef.main.entries;
  }

  /**
   * Generate sitemap
   */
  public generateSitemap(): Array<{
    url: string;
    title: string;
    description: string;
    lastModified: string;
  }> {
    return this.crossRef.main.entries
      .filter(entry => entry.url && !entry.deprecated)
      .map(entry => ({
        url: entry.url!,
        title: entry.title,
        description: entry.description,
        lastModified: new Date().toISOString()
      }));
  }
}

// Export singleton instance
export const documentationIndex = DocumentationSystemIndex.getInstance();
