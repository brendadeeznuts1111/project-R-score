#!/usr/bin/env bun
//! Package Search and Advanced Filtering for Enhanced Registry
//! Full-text search with indexing, filtering, and sorting capabilities

import { serve } from "bun";
import { readFile, writeFile } from "fs/promises";

// Package index structure
interface PackageIndex {
  packages: Map<string, PackageMetadata>;
  searchIndex: Map<string, Set<string>>; // term -> package names
  tags: Map<string, Set<string>>; // tag -> package names
  authors: Map<string, Set<string>>; // author -> package names
  lastUpdated: number;
}

// Enhanced package metadata
interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  keywords: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  published: number;
  updated: number;
  downloads: number;
  size: number;
  license: string;
  repository?: string;
  homepage?: string;
  readme?: string;
  maintainers: string[];
  score: number; // Search relevance score
}

// Search filters
interface SearchFilters {
  author?: string;
  tag?: string;
  license?: string;
  keyword?: string;
  dateFrom?: number;
  dateTo?: number;
  minDownloads?: number;
  maxDownloads?: number;
  minSize?: number;
  maxSize?: number;
  hasDependencies?: boolean;
  maintainers?: string[];
}

// Sort options
type SortOption = 'relevance' | 'name' | 'updated' | 'published' | 'downloads' | 'size';
type SortOrder = 'asc' | 'desc';

// Search results
interface SearchResult {
  packages: PackageMetadata[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    authors: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    licenses: Array<{ name: string; count: number }>;
  };
  suggestions?: string[];
}

class PackageSearchEngine {
  private index: PackageIndex;
  private indexPath: string;
  private stopWords: Set<string>;

  constructor(indexPath = './package-index.json') {
    this.indexPath = indexPath;
    this.index = {
      packages: new Map(),
      searchIndex: new Map(),
      tags: new Map(),
      authors: new Map(),
      lastUpdated: 0
    };
    
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    this.loadIndex();
  }

  // Load existing index from disk
  private async loadIndex() {
    try {
      const data = await readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.index = {
        packages: new Map(parsed.packages || []),
        searchIndex: new Map(parsed.searchIndex || []),
        tags: new Map(parsed.tags || []),
        authors: new Map(parsed.authors || []),
        lastUpdated: parsed.lastUpdated || 0
      };
      
      console.log(`📚 Loaded ${this.index.packages.size} packages from index`);
    } catch (error) {
      console.log('📚 No existing index found, starting fresh');
      this.index.lastUpdated = Date.now();
    }
  }

  // Save index to disk
  private async saveIndex() {
    try {
      const data = {
        packages: Array.from(this.index.packages.entries()),
        searchIndex: Array.from(this.index.searchIndex.entries()),
        tags: Array.from(this.index.tags.entries()),
        authors: Array.from(this.index.authors.entries()),
        lastUpdated: this.index.lastUpdated
      };
      
      await writeFile(this.indexPath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved index with ${this.index.packages.size} packages`);
    } catch (error) {
      console.error('❌ Failed to save index:', error);
    }
  }

  // Add or update package in index
  public async indexPackage(packageData: Partial<PackageMetadata>) {
    const metadata: PackageMetadata = {
      name: packageData.name || '',
      version: packageData.version || '1.0.0',
      description: packageData.description || '',
      author: packageData.author || 'Unknown',
      tags: packageData.tags || [],
      keywords: packageData.keywords || [],
      dependencies: packageData.dependencies || {},
      devDependencies: packageData.devDependencies || {},
      published: packageData.published || Date.now(),
      updated: packageData.updated || Date.now(),
      downloads: packageData.downloads || 0,
      size: packageData.size || 0,
      license: packageData.license || 'MIT',
      repository: packageData.repository,
      homepage: packageData.homepage,
      readme: packageData.readme,
      maintainers: packageData.maintainers || [],
      score: 0
    };

    // Remove old index entries if package exists
    const existing = this.index.packages.get(metadata.name);
    if (existing) {
      this.removeFromIndex(existing);
    }

    // Add to packages map
    this.index.packages.set(metadata.name, metadata);

    // Index searchable terms
    this.indexSearchTerms(metadata);

    // Index tags
    metadata.tags.forEach(tag => {
      if (!this.index.tags.has(tag)) {
        this.index.tags.set(tag, new Set());
      }
      this.index.tags.get(tag)!.add(metadata.name);
    });

    // Index authors
    if (!this.index.authors.has(metadata.author)) {
      this.index.authors.set(metadata.author, new Set());
    }
    this.index.authors.get(metadata.author)!.add(metadata.name);

    // Index maintainers
    metadata.maintainers.forEach(maintainer => {
      if (!this.index.authors.has(maintainer)) {
        this.index.authors.set(maintainer, new Set());
      }
      this.index.authors.get(maintainer)!.add(metadata.name);
    });

    this.index.lastUpdated = Date.now();
    await this.saveIndex();
    
    console.log(`📦 Indexed package: ${metadata.name}@${metadata.version}`);
  }

  // Remove package from search indices
  private removeFromIndex(metadata: PackageMetadata) {
    // Remove from search index
    const terms = this.extractTerms(metadata);
    terms.forEach(term => {
      const packages = this.index.searchIndex.get(term);
      if (packages) {
        packages.delete(metadata.name);
        if (packages.size === 0) {
          this.index.searchIndex.delete(term);
        }
      }
    });

    // Remove from tags
    metadata.tags.forEach(tag => {
      const packages = this.index.tags.get(tag);
      if (packages) {
        packages.delete(metadata.name);
        if (packages.size === 0) {
          this.index.tags.delete(tag);
        }
      }
    });

    // Remove from authors
    [metadata.author, ...metadata.maintainers].forEach(author => {
      const packages = this.index.authors.get(author);
      if (packages) {
        packages.delete(metadata.name);
        if (packages.size === 0) {
          this.index.authors.delete(author);
        }
      }
    });
  }

  // Extract searchable terms from package metadata
  private extractTerms(metadata: PackageMetadata): string[] {
    const terms = new Set<string>();
    
    // Add name terms
    metadata.name.split(/[-_]/).forEach(term => {
      if (term.length > 2) terms.add(term.toLowerCase());
    });

    // Add description terms
    if (metadata.description) {
      metadata.description.toLowerCase().split(/\W+/).forEach(term => {
        if (term.length > 2 && !this.stopWords.has(term)) {
          terms.add(term);
        }
      });
    }

    // Add keywords
    metadata.keywords.forEach(keyword => {
      if (keyword.length > 2) {
        terms.add(keyword.toLowerCase());
      }
    });

    // Add tags
    metadata.tags.forEach(tag => {
      if (tag.length > 2) {
        terms.add(tag.toLowerCase());
      }
    });

    return Array.from(terms);
  }

  // Index searchable terms for a package
  private indexSearchTerms(metadata: PackageMetadata) {
    const terms = this.extractTerms(metadata);
    
    terms.forEach(term => {
      if (!this.index.searchIndex.has(term)) {
        this.index.searchIndex.set(term, new Set());
      }
      this.index.searchIndex.get(term)!.add(metadata.name);
    });
  }

  // Search packages with filters and sorting
  public search(
    query: string = '',
    filters: SearchFilters = {},
    sort: SortOption = 'relevance',
    order: SortOrder = 'desc',
    page: number = 1,
    pageSize: number = 20
  ): SearchResult {
    let candidates = Array.from(this.index.packages.values());

    // Apply text search
    if (query.trim()) {
      const queryTerms = query.toLowerCase().split(/\W+/).filter(term => 
        term.length > 2 && !this.stopWords.has(term)
      );
      
      if (queryTerms.length > 0) {
        const matchingPackages = new Set<string>();
        
        queryTerms.forEach(term => {
          const packages = this.index.searchIndex.get(term);
          if (packages) {
            packages.forEach(pkgName => matchingPackages.add(pkgName));
          }
        });

        // Calculate relevance scores
        candidates = candidates.filter(pkg => matchingPackages.has(pkg.name));
        candidates.forEach(pkg => {
          pkg.score = this.calculateRelevanceScore(pkg, queryTerms);
        });
      }
    }

    // Apply filters
    candidates = this.applyFilters(candidates, filters);

    // Sort results
    candidates = this.sortResults(candidates, sort, order);

    // Paginate
    const total = candidates.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = candidates.slice(startIndex, endIndex);

    // Generate facets
    const facets = this.generateFacets(candidates);

    // Generate suggestions
    const suggestions = query.trim() ? this.generateSuggestions(query) : undefined;

    return {
      packages: paginatedResults,
      total,
      page,
      pageSize,
      facets,
      suggestions
    };
  }

  // Calculate relevance score for a package
  private calculateRelevanceScore(pkg: PackageMetadata, queryTerms: string[]): number {
    let score = 0;
    const name = pkg.name.toLowerCase();
    const description = pkg.description.toLowerCase();
    const keywords = pkg.keywords.map(k => k.toLowerCase());
    const tags = pkg.tags.map(t => t.toLowerCase());

    queryTerms.forEach(term => {
      // Exact name match gets highest score
      if (name === term) score += 100;
      else if (name.includes(term)) score += 50;
      
      // Description matches
      const descriptionMatches = (description.match(new RegExp(term, 'g')) || []).length;
      score += descriptionMatches * 10;
      
      // Keyword matches
      if (keywords.includes(term)) score += 30;
      
      // Tag matches
      if (tags.includes(term)) score += 20;
      
      // Boost for recent updates
      const daysSinceUpdate = (Date.now() - pkg.updated) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) score += 5;
      else if (daysSinceUpdate < 90) score += 2;
      
      // Boost for download count
      if (pkg.downloads > 10000) score += 10;
      else if (pkg.downloads > 1000) score += 5;
      else if (pkg.downloads > 100) score += 2;
    });

    return score;
  }

  // Apply filters to candidate packages
  private applyFilters(candidates: PackageMetadata[], filters: SearchFilters): PackageMetadata[] {
    return candidates.filter(pkg => {
      if (filters.author && pkg.author !== filters.author && !pkg.maintainers.includes(filters.author)) {
        return false;
      }

      if (filters.tag && !pkg.tags.includes(filters.tag)) {
        return false;
      }

      if (filters.license && pkg.license !== filters.license) {
        return false;
      }

      if (filters.keyword && !pkg.keywords.includes(filters.keyword)) {
        return false;
      }

      if (filters.dateFrom && pkg.published < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && pkg.published > filters.dateTo) {
        return false;
      }

      if (filters.minDownloads && pkg.downloads < filters.minDownloads) {
        return false;
      }

      if (filters.maxDownloads && pkg.downloads > filters.maxDownloads) {
        return false;
      }

      if (filters.minSize && pkg.size < filters.minSize) {
        return false;
      }

      if (filters.maxSize && pkg.size > filters.maxSize) {
        return false;
      }

      if (filters.hasDependencies !== undefined) {
        const hasDeps = Object.keys(pkg.dependencies).length > 0;
        if (filters.hasDependencies !== hasDeps) {
          return false;
        }
      }

      if (filters.maintainers && !filters.maintainers.some(m => pkg.maintainers.includes(m))) {
        return false;
      }

      return true;
    });
  }

  // Sort search results
  private sortResults(candidates: PackageMetadata[], sort: SortOption, order: SortOrder): PackageMetadata[] {
    const multiplier = order === 'asc' ? 1 : -1;
    
    return candidates.sort((a, b) => {
      let comparison = 0;
      
      switch (sort) {
        case 'relevance':
          comparison = a.score - b.score;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = a.updated - b.updated;
          break;
        case 'published':
          comparison = a.published - b.published;
          break;
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      
      return comparison * multiplier;
    });
  }

  // Generate search facets for filtering
  private generateFacets(candidates: PackageMetadata[]) {
    const authors = new Map<string, number>();
    const tags = new Map<string, number>();
    const licenses = new Map<string, number>();

    candidates.forEach(pkg => {
      // Count authors
      const count = authors.get(pkg.author) || 0;
      authors.set(pkg.author, count + 1);

      // Count tags
      pkg.tags.forEach(tag => {
        const tagCount = tags.get(tag) || 0;
        tags.set(tag, tagCount + 1);
      });

      // Count licenses
      const licenseCount = licenses.get(pkg.license) || 0;
      licenses.set(pkg.license, licenseCount + 1);
    });

    return {
      authors: Array.from(authors.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      tags: Array.from(tags.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      licenses: Array.from(licenses.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  // Generate search suggestions
  private generateSuggestions(query: string): string[] {
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // Find similar terms in search index
    this.index.searchIndex.forEach((packages, term) => {
      if (term.includes(queryLower) || queryLower.includes(term)) {
        suggestions.add(term);
      }
      
      // Levenshtein distance for fuzzy matching (simplified)
      if (this.levenshteinDistance(term, queryLower) <= 2) {
        suggestions.add(term);
      }
    });

    // Find similar package names
    this.index.packages.forEach((pkg, name) => {
      if (name.toLowerCase().includes(queryLower)) {
        suggestions.add(name);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  // Simple Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Get package details
  public getPackage(name: string): PackageMetadata | null {
    return this.index.packages.get(name) || null;
  }

  // Get popular packages
  public getPopular(limit: number = 10): PackageMetadata[] {
    return Array.from(this.index.packages.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  // Get recently updated packages
  public getRecent(limit: number = 10): PackageMetadata[] {
    return Array.from(this.index.packages.values())
      .sort((a, b) => b.updated - a.updated)
      .slice(0, limit);
  }

  // Get statistics
  public getStatistics() {
    const packages = Array.from(this.index.packages.values());
    const totalDownloads = packages.reduce((sum, pkg) => sum + pkg.downloads, 0);
    const totalSize = packages.reduce((sum, pkg) => sum + pkg.size, 0);
    
    return {
      totalPackages: packages.length,
      totalDownloads,
      totalSize,
      averageDownloads: totalDownloads / packages.length,
      averageSize: totalSize / packages.length,
      uniqueAuthors: this.index.authors.size,
      uniqueTags: this.index.tags.size,
      lastUpdated: this.index.lastUpdated
    };
  }

  // Rebuild entire index
  public async rebuildIndex(packages: PackageMetadata[]) {
    console.log('🔄 Rebuilding search index...');
    
    this.index = {
      packages: new Map(),
      searchIndex: new Map(),
      tags: new Map(),
      authors: new Map(),
      lastUpdated: Date.now()
    };

    for (const pkg of packages) {
      await this.indexPackage(pkg);
    }

    console.log(`✅ Rebuilt index with ${packages.length} packages`);
  }
}

// Export singleton instance
export const packageSearch = new PackageSearchEngine();
export type { PackageMetadata, SearchFilters, SearchResult, SortOption, SortOrder };
