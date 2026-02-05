/**
 * Metadata Service
 * Manages content metadata, topics, and tags
 */

export interface ContentMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  created: number;
  updated: number;
  published: boolean;
  topics: string[];
  tags: string[];
  categories: string[];
  slug: string;
  keywords: string[];
  summary: string;
  thumbnail?: string;
  visibility: 'private' | 'internal' | 'public';
  license: string;
  repository?: string;
  views: number;
  downloads: number;
  rating: number;
  reviews: number;
  relatedItems: string[];
  dependencies: string[];
  customFields?: Record<string, any>;
}

export interface TagDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  itemCount: number;
  relatedTags: string[];
  metadata?: Record<string, any>;
}

export const TOPICS = {
  'development': { icon: '💻', color: '#3B82F6', description: 'Development tools and practices' },
  'testing': { icon: '🧪', color: '#8B5CF6', description: 'Testing frameworks and strategies' },
  'debugging': { icon: '🐛', color: '#EF4444', description: 'Debugging and troubleshooting' },
  'performance': { icon: '⚡', color: '#F59E0B', description: 'Performance optimization' },
  'lightning-network': { icon: '⚡', color: '#F7931A', description: 'Lightning Network integration' },
  'bitcoin': { icon: '₿', color: '#F7931A', description: 'Bitcoin protocol' },
  'blockchain': { icon: '🔗', color: '#0EA5E9', description: 'Blockchain technology' },
  'crypto': { icon: '🪙', color: '#10B981', description: 'Cryptocurrency' },
  'security': { icon: '🔒', color: '#EF4444', description: 'Security and compliance' },
  'authentication': { icon: '🔐', color: '#8B5CF6', description: 'Auth mechanisms' },
  'anomaly-detection': { icon: '⚠️', color: '#F59E0B', description: 'Anomaly detection' },
  'deployment': { icon: '🚀', color: '#10B981', description: 'Deployment strategies' },
  'infrastructure': { icon: '🏗️', color: '#6366F1', description: 'Infrastructure setup' },
  'monitoring': { icon: '📊', color: '#0EA5E9', description: 'Monitoring and observability' },
  'documentation': { icon: '📚', color: '#8B5CF6', description: 'Documentation' },
  'tutorial': { icon: '🎓', color: '#3B82F6', description: 'Tutorials and guides' },
  'api': { icon: '🔌', color: '#6366F1', description: 'API documentation' },
};

export class MetadataService {
  private metadata = new Map<string, ContentMetadata>();
  private tags = new Map<string, TagDefinition>();

  createMetadata(meta: Omit<ContentMetadata, 'id' | 'created' | 'updated'>): ContentMetadata {
    const id = `meta_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    
    const metadata: ContentMetadata = {
      ...meta,
      id,
      created: now,
      updated: now,
    };
    
    this.metadata.set(id, metadata);
    return metadata;
  }

  updateMetadata(id: string, updates: Partial<ContentMetadata>): ContentMetadata | null {
    const meta = this.metadata.get(id);
    if (!meta) return null;
    
    const updated = { ...meta, ...updates, updated: Date.now() };
    this.metadata.set(id, updated);
    return updated;
  }

  getMetadata(id: string): ContentMetadata | null {
    return this.metadata.get(id) || null;
  }

  searchMetadata(query: string): ContentMetadata[] {
    const q = query.toLowerCase();
    return Array.from(this.metadata.values())
      .filter(m => 
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.keywords.some(k => k.toLowerCase().includes(q))
      );
  }

  getByTopic(topic: string): ContentMetadata[] {
    return Array.from(this.metadata.values())
      .filter(m => m.topics.includes(topic));
  }

  getByTag(tag: string): ContentMetadata[] {
    return Array.from(this.metadata.values())
      .filter(m => m.tags.includes(tag));
  }

  createTag(tag: Omit<TagDefinition, 'id' | 'itemCount'>): TagDefinition {
    const id = `tag_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tagDef: TagDefinition = { ...tag, id, itemCount: 0 };
    this.tags.set(id, tagDef);
    return tagDef;
  }

  getTags(category?: string): TagDefinition[] {
    return Array.from(this.tags.values())
      .filter(t => !category || t.category === category)
      .sort((a, b) => b.itemCount - a.itemCount);
  }

  searchTags(query: string): TagDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.tags.values())
      .filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  getRelatedTags(tagId: string): TagDefinition[] {
    const tag = this.tags.get(tagId);
    if (!tag) return [];
    return tag.relatedTags
      .map(id => this.tags.get(id))
      .filter((t): t is TagDefinition => !!t);
  }

  incrementTagCount(tagId: string): void {
    const tag = this.tags.get(tagId);
    if (tag) tag.itemCount++;
  }

  decrementTagCount(tagId: string): void {
    const tag = this.tags.get(tagId);
    if (tag && tag.itemCount > 0) tag.itemCount--;
  }
}

export const metadataService = new MetadataService();

