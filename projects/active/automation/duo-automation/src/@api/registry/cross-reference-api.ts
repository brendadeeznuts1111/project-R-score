/**
 * 🔗 Empire Pro Registry Cross-Reference API
 * Provides cross-reference functionality for registry items
 */

import { CatalogViewer, RegistryItem } from './catalog-viewer';

/**
 * 🔗 Cross-Reference Interface
 */
export interface CrossReference {
  itemId: string;
  crossReferences: CrossReferenceItem[];
  relatedBy: 'dependency' | 'similar' | 'category' | 'tag' | 'usage';
  strength: number; // 0-100 relevance score
  metadata: {
    sharedTags: string[];
    sharedCategory: boolean;
    dependencyChain: string[];
    usagePatterns: string[];
    compatibility: number;
  };
}

/**
 * 📋 Cross-Reference Item Interface
 */
export interface CrossReferenceItem {
  id: string;
  name: string;
  version: string;
  category: string;
  type: string;
  relevanceScore: number;
  relationship: string;
  description: string;
  tags: string[];
  metrics: {
    downloads: number;
    stars: number;
    compatibility: number;
    usage: number;
  };
}

/**
 * 🔗 Cross-Reference API Class
 */
export class CrossReferenceAPI {
  private catalog: CatalogViewer;

  constructor() {
    this.catalog = new CatalogViewer();
  }

  /**
   * 🔍 Get cross-references for an item
   */
  getCrossReferences(itemId: string, options: {
    includeDependencies?: boolean;
    includeSimilar?: boolean;
    includeCategory?: boolean;
    includeTagBased?: boolean;
    maxResults?: number;
    minStrength?: number;
  } = {}): CrossReference {
    const {
      includeDependencies = true,
      includeSimilar = true,
      includeCategory = true,
      includeTagBased = true,
      maxResults = 10,
      minStrength = 30
    } = options;

    const item = this.catalog.getItem(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const crossReferences: CrossReferenceItem[] = [];
    const allItems = this.catalog.search({ limit: 1000 });

    // Find cross-references by different criteria
    if (includeDependencies) {
      const dependencyRefs = this.findDependencyReferences(item, allItems);
      crossReferences.push(...dependencyRefs);
    }

    if (includeSimilar) {
      const similarRefs = this.findSimilarReferences(item, allItems);
      crossReferences.push(...similarRefs);
    }

    if (includeCategory) {
      const categoryRefs = this.findCategoryReferences(item, allItems);
      crossReferences.push(...categoryRefs);
    }

    if (includeTagBased) {
      const tagRefs = this.findTagReferences(item, allItems);
      crossReferences.push(...tagRefs);
    }

    // Remove duplicates and sort by relevance
    const uniqueRefs = this.deduplicateReferences(crossReferences);
    const filteredRefs = uniqueRefs.filter(ref => ref.relevanceScore >= minStrength);
    const sortedRefs = filteredRefs.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const finalRefs = sortedRefs.slice(0, maxResults);

    return {
      itemId,
      crossReferences: finalRefs,
      relatedBy: this.getPrimaryRelationship(finalRefs),
      strength: this.calculateOverallStrength(finalRefs),
      metadata: this.generateCrossReferenceMetadata(item, finalRefs)
    };
  }

  /**
   * 🔗 Find dependency-based references
   */
  private findDependencyReferences(item: RegistryItem, allItems: RegistryItem[]): CrossReferenceItem[] {
    const references: CrossReferenceItem[] = [];

    // Find items that depend on this item
    allItems.forEach(otherItem => {
      if (otherItem.id !== item.id && otherItem.dependencies.includes(item.id)) {
        references.push({
          id: otherItem.id,
          name: otherItem.name,
          version: otherItem.version,
          category: otherItem.category,
          type: otherItem.type,
          relevanceScore: 85, // High relevance for direct dependencies
          relationship: 'dependent',
          description: otherItem.description,
          tags: otherItem.tags,
          metrics: {
            downloads: otherItem.metrics.downloads,
            stars: otherItem.metrics.stars,
            compatibility: this.calculateCompatibility(item, otherItem),
            usage: otherItem.metrics.downloads
          }
        });
      }
    });

    // Find items this item depends on
    item.dependencies.forEach(depId => {
      const depItem = allItems.find(i => i.id === depId);
      if (depItem) {
        references.push({
          id: depItem.id,
          name: depItem.name,
          version: depItem.version,
          category: depItem.category,
          type: depItem.type,
          relevanceScore: 80,
          relationship: 'dependency',
          description: depItem.description,
          tags: depItem.tags,
          metrics: {
            downloads: depItem.metrics.downloads,
            stars: depItem.metrics.stars,
            compatibility: this.calculateCompatibility(item, depItem),
            usage: depItem.metrics.downloads
          }
        });
      }
    });

    return references;
  }

  /**
   * 🔍 Find similar references
   */
  private findSimilarReferences(item: RegistryItem, allItems: RegistryItem[]): CrossReferenceItem[] {
    const references: CrossReferenceItem[] = [];

    allItems.forEach(otherItem => {
      if (otherItem.id !== item.id) {
        const similarity = this.calculateSimilarity(item, otherItem);
        if (similarity > 40) { // Threshold for similarity
          references.push({
            id: otherItem.id,
            name: otherItem.name,
            version: otherItem.version,
            category: otherItem.category,
            type: otherItem.type,
            relevanceScore: similarity,
            relationship: 'similar',
            description: otherItem.description,
            tags: otherItem.tags,
            metrics: {
              downloads: otherItem.metrics.downloads,
              stars: otherItem.metrics.stars,
              compatibility: this.calculateCompatibility(item, otherItem),
              usage: otherItem.metrics.downloads
            }
          });
        }
      }
    });

    return references;
  }

  /**
   * 📂 Find category-based references
   */
  private findCategoryReferences(item: RegistryItem, allItems: RegistryItem[]): CrossReferenceItem[] {
    const references: CrossReferenceItem[] = [];

    allItems.forEach(otherItem => {
      if (otherItem.id !== item.id && otherItem.category === item.category) {
        references.push({
          id: otherItem.id,
          name: otherItem.name,
          version: otherItem.version,
          category: otherItem.category,
          type: otherItem.type,
          relevanceScore: 60, // Medium relevance for same category
          relationship: 'category',
          description: otherItem.description,
          tags: otherItem.tags,
          metrics: {
            downloads: otherItem.metrics.downloads,
            stars: otherItem.metrics.stars,
            compatibility: this.calculateCompatibility(item, otherItem),
            usage: otherItem.metrics.downloads
          }
        });
      }
    });

    return references;
  }

  /**
   * 🏷️ Find tag-based references
   */
  private findTagReferences(item: RegistryItem, allItems: RegistryItem[]): CrossReferenceItem[] {
    const references: CrossReferenceItem[] = [];

    allItems.forEach(otherItem => {
      if (otherItem.id !== item.id) {
        const sharedTags = item.tags.filter(tag => otherItem.tags.includes(tag));
        if (sharedTags.length > 0) {
          const tagSimilarity = (sharedTags.length / Math.max(item.tags.length, otherItem.tags.length)) * 100;
          
          references.push({
            id: otherItem.id,
            name: otherItem.name,
            version: otherItem.version,
            category: otherItem.category,
            type: otherItem.type,
            relevanceScore: Math.round(tagSimilarity * 0.7), // Lower weight for tag-only matches
            relationship: 'tag-based',
            description: otherItem.description,
            tags: otherItem.tags,
            metrics: {
              downloads: otherItem.metrics.downloads,
              stars: otherItem.metrics.stars,
              compatibility: this.calculateCompatibility(item, otherItem),
              usage: otherItem.metrics.downloads
            }
          });
        }
      }
    });

    return references;
  }

  /**
   * 📊 Calculate similarity between items
   */
  private calculateSimilarity(item1: RegistryItem, item2: RegistryItem): number {
    let score = 0;

    // Tag similarity (40% weight)
    const sharedTags = item1.tags.filter(tag => item2.tags.includes(tag));
    const tagSimilarity = sharedTags.length / Math.max(item1.tags.length, item2.tags.length);
    score += tagSimilarity * 40;

    // Type similarity (30% weight)
    if (item1.type === item2.type) {
      score += 30;
    }

    // Description similarity (20% weight)
    const descSimilarity = this.calculateTextSimilarity(item1.description, item2.description);
    score += descSimilarity * 20;

    // Category similarity (10% weight)
    if (item1.category === item2.category) {
      score += 10;
    }

    return Math.round(score);
  }

  /**
   * 🔗 Calculate compatibility between items
   */
  private calculateCompatibility(item1: RegistryItem, item2: RegistryItem): number {
    let compatibility = 100;

    // License compatibility
    if (item1.license !== item2.license) {
      compatibility -= 20;
    }

    // Version compatibility
    const v1 = this.parseVersion(item1.version);
    const v2 = this.parseVersion(item2.version);
    if (Math.abs(v1.major - v2.major) > 1) {
      compatibility -= 30;
    }

    // Category compatibility
    if (item1.category !== item2.category) {
      compatibility -= 10;
    }

    return Math.max(0, compatibility);
  }

  /**
   * 📝 Parse version string
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(p => parseInt(p) || 0);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  /**
   * 📊 Calculate text similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * 🔄 Remove duplicate references
   */
  private deduplicateReferences(references: CrossReferenceItem[]): CrossReferenceItem[] {
    const seen = new Set<string>();
    return references.filter(ref => {
      const key = `${ref.id}-${ref.relationship}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 🎯 Get primary relationship type
   */
  private getPrimaryRelationship(references: CrossReferenceItem[]): 'dependency' | 'similar' | 'category' | 'tag' | 'usage' {
    if (references.length === 0) return 'similar';

    const relationshipCounts = references.reduce((counts, ref) => {
      counts[ref.relationship] = (counts[ref.relationship] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.keys(relationshipCounts).reduce((a, b) => 
      relationshipCounts[a] > relationshipCounts[b] ? a : b
    ) as any;
  }

  /**
   * 💪 Calculate overall strength
   */
  private calculateOverallStrength(references: CrossReferenceItem[]): number {
    if (references.length === 0) return 0;
    
    const totalStrength = references.reduce((sum, ref) => sum + ref.relevanceScore, 0);
    return Math.round(totalStrength / references.length);
  }

  /**
   * 📋 Generate cross-reference metadata
   */
  private generateCrossReferenceMetadata(item: RegistryItem, references: CrossReferenceItem[]): CrossReference['metadata'] {
    const allTags = new Set<string>();
    const sharedCategories = new Set<string>();
    const dependencyChain: string[] = [];
    const usagePatterns: string[] = [];

    references.forEach(ref => {
      ref.tags.forEach(tag => allTags.add(tag));
      if (ref.category === item.category) {
        sharedCategories.add(ref.category);
      }
      if (ref.relationship === 'dependency' || ref.relationship === 'dependent') {
        dependencyChain.push(ref.id);
      }
      if (ref.metrics.usage > 0) {
        usagePatterns.push(`${ref.id}: ${ref.metrics.usage} downloads`);
      }
    });

    return {
      sharedTags: Array.from(allTags),
      sharedCategory: sharedCategories.size > 0,
      dependencyChain,
      usagePatterns,
      compatibility: references.length > 0 
        ? Math.round(references.reduce((sum, ref) => sum + ref.metrics.compatibility, 0) / references.length)
        : 100
    };
  }

  /**
   * 🌐 Get cross-reference matrix for multiple items
   */
  getCrossReferenceMatrix(itemIds: string[]): Record<string, CrossReference> {
    const matrix: Record<string, CrossReference> = {};
    
    itemIds.forEach(id => {
      try {
        matrix[id] = this.getCrossReferences(id);
      } catch (error) {
        console.warn(`Failed to get cross-references for ${id}:`, error);
      }
    });

    return matrix;
  }

  /**
   * 📊 Get cross-reference statistics
   */
  getCrossReferenceStats(): {
    totalItems: number;
    totalRelationships: number;
    averageReferences: number;
    strongestRelationship: string;
    mostConnected: string;
  } {
    const allItems = this.catalog.search({ limit: 1000 });
    let totalRelationships = 0;
    let maxReferences = 0;
    let mostConnected = '';
    let strongestRelationship = '';
    let maxStrength = 0;

    allItems.forEach(item => {
      try {
        const crossRef = this.getCrossReferences(item.id);
        totalRelationships += crossRef.crossReferences.length;
        
        if (crossRef.crossReferences.length > maxReferences) {
          maxReferences = crossRef.crossReferences.length;
          mostConnected = item.id;
        }
        
        if (crossRef.strength > maxStrength) {
          maxStrength = crossRef.strength;
          strongestRelationship = item.id;
        }
      } catch (error) {
        // Skip items that can't be processed
      }
    });

    return {
      totalItems: allItems.length,
      totalRelationships,
      averageReferences: Math.round(totalRelationships / allItems.length),
      strongestRelationship,
      mostConnected
    };
  }
}

/**
 * 🚀 Create cross-reference API instance
 */
export function createCrossReferenceAPI(): CrossReferenceAPI {
  return new CrossReferenceAPI();
}

/**
 * 🔍 Bun API endpoint for cross-references
 */
export async function getCrossReferences(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const itemId = url.pathname.split('/').pop();
    const includeDeps = url.searchParams.get('includeDependencies') !== 'false';
    const includeSimilar = url.searchParams.get('includeSimilar') !== 'false';
    const includeCategory = url.searchParams.get('includeCategory') !== 'false';
    const includeTags = url.searchParams.get('includeTagBased') !== 'false';
    const maxResults = parseInt(url.searchParams.get('maxResults') || '10');
    const minStrength = parseInt(url.searchParams.get('minStrength') || '30');

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Item ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const api = createCrossReferenceAPI();
    const crossReferences = api.getCrossReferences(itemId, {
      includeDependencies: includeDeps,
      includeSimilar: includeSimilar,
      includeCategory: includeCategory,
      includeTagBased: includeTags,
      maxResults,
      minStrength
    });

    return new Response(JSON.stringify(crossReferences, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 📊 Get cross-reference statistics endpoint
 */
export async function getCrossReferenceStats(request: Request): Promise<Response> {
  try {
    const api = createCrossReferenceAPI();
    const stats = api.getCrossReferenceStats();

    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default CrossReferenceAPI;
