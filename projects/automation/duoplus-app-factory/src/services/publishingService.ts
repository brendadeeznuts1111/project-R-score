/**
 * Publishing Service
 * Content publishing pipeline with scheduling and versioning
 */

import { R2Storage } from './r2StorageService';
import { ContentMetadata } from './metadataService';

export interface PublishingConfig {
  title: string;
  description: string;
  content: string;
  author: string;
  topics: string[];
  tags: string[];
  visibility: 'draft' | 'scheduled' | 'published' | 'archived';
  publishedAt?: number;
  scheduledFor?: number;
  metadata: ContentMetadata;
}

export interface PublishedContent {
  id: string;
  slug: string;
  config: PublishingConfig;
  url: string;
  publishedAt: number;
  views: number;
  likes: number;
}

export class PublishingService {
  private r2Storage: R2Storage;
  private published = new Map<string, PublishedContent>();
  private scheduled = new Map<string, PublishingConfig>();

  constructor(r2Storage: R2Storage) {
    this.r2Storage = r2Storage;
  }

  async publishContent(config: PublishingConfig): Promise<PublishedContent> {
    this.validateContent(config);
    
    const slug = this.generateSlug(config.title);
    const id = `pub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const publishMeta = {
      ...config.metadata,
      slug,
      published: true,
      publishedAt: config.publishedAt || Date.now(),
      visibility: config.visibility,
    };
    
    const contentBuffer = Buffer.from(JSON.stringify({
      ...config,
      metadata: publishMeta,
    }));
    
    const contentUrl = await this.r2Storage.uploadFile(
      `content/${publishMeta.id}/${slug}.json`,
      contentBuffer,
      {
        author: config.author,
        topics: config.topics.join(','),
        tags: config.tags.join(','),
        visibility: config.visibility,
      }
    );
    
    const published: PublishedContent = {
      id,
      slug,
      config,
      url: contentUrl,
      publishedAt: Date.now(),
      views: 0,
      likes: 0,
    };
    
    this.published.set(id, published);
    console.log(`📝 Published content: ${config.title} (${slug})`);
    
    return published;
  }

  async schedulePublishing(config: PublishingConfig, scheduledFor: number): Promise<string> {
    config.visibility = 'scheduled';
    config.scheduledFor = scheduledFor;
    
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.scheduled.set(scheduleId, config);
    
    const scheduleBuffer = Buffer.from(JSON.stringify(config));
    const url = await this.r2Storage.uploadFile(
      `scheduled/${scheduledFor}_${scheduleId}.json`,
      scheduleBuffer
    );
    
    console.log(`⏰ Scheduled publishing: ${config.title} for ${new Date(scheduledFor).toISOString()}`);
    return url;
  }

  async publishTheme(theme: any): Promise<string> {
    const themeBuffer = Buffer.from(JSON.stringify(theme));
    return await this.r2Storage.uploadFile(
      `themes/${theme.id}/${theme.version}.json`,
      themeBuffer,
      {
        author: theme.author,
        category: theme.category,
        version: theme.version,
      }
    );
  }

  async getPublished(id: string): Promise<PublishedContent | null> {
    return this.published.get(id) || null;
  }

  async listPublished(limit = 10): Promise<PublishedContent[]> {
    return Array.from(this.published.values())
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, limit);
  }

  async getScheduled(): Promise<PublishingConfig[]> {
    return Array.from(this.scheduled.values())
      .sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0));
  }

  async incrementViews(id: string): Promise<void> {
    const content = this.published.get(id);
    if (content) {
      content.views++;
    }
  }

  async likeContent(id: string): Promise<void> {
    const content = this.published.get(id);
    if (content) {
      content.likes++;
    }
  }

  async archiveContent(id: string): Promise<void> {
    const content = this.published.get(id);
    if (content) {
      content.config.visibility = 'archived';
    }
  }

  async getPublishingStats(): Promise<{
    totalPublished: number;
    totalScheduled: number;
    totalViews: number;
    totalLikes: number;
    topContent: PublishedContent[];
  }> {
    const published = Array.from(this.published.values());
    const totalViews = published.reduce((sum, c) => sum + c.views, 0);
    const totalLikes = published.reduce((sum, c) => sum + c.likes, 0);
    const topContent = published.sort((a, b) => b.views - a.views).slice(0, 5);
    
    return {
      totalPublished: published.length,
      totalScheduled: this.scheduled.size,
      totalViews,
      totalLikes,
      topContent,
    };
  }

  private validateContent(config: PublishingConfig): void {
    if (!config.title || config.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!config.content || config.content.trim().length === 0) {
      throw new Error('Content is required');
    }
    if (!config.author || config.author.trim().length === 0) {
      throw new Error('Author is required');
    }
    if (config.topics.length === 0) {
      throw new Error('At least one topic is required');
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

export const publishingService = new PublishingService(require('./r2StorageService').r2Storage);

