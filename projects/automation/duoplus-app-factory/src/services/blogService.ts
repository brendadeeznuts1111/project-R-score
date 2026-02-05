/**
 * Blog Service
 * Complete blog management system with RSS feed generation
 */

import { R2Storage } from './r2StorageService';
import { TagManager } from './metadataService';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  content: string;
  excerpt: string;
  thumbnail?: string;
  topics: string[];
  tags: string[];
  categories: string[];
  keywords: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: number;
  updatedAt: number;
  scheduledFor?: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  metaDescription: string;
  metaImage?: string;
  canonicalUrl?: string;
  relatedPosts: string[];
  series?: string;
  seriesOrder?: number;
}

export class BlogService {
  private posts = new Map<string, BlogPost>();
  private r2Storage: R2Storage;

  constructor(r2Storage: R2Storage) {
    this.r2Storage = r2Storage;
  }

  async createPost(post: Omit<BlogPost, 'id' | 'slug' | 'views' | 'likes' | 'comments' | 'shares' | 'updatedAt'>): Promise<BlogPost> {
    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const slug = this.generateSlug(post.title);

    const blogPost: BlogPost = {
      ...post,
      id,
      slug,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      updatedAt: Date.now(),
    };

    this.posts.set(id, blogPost);

    // Try to upload to R2, but continue if it fails (for local development)
    try {
      await this.r2Storage.uploadFile(
        `blog/${slug}.json`,
        Buffer.from(JSON.stringify(blogPost)),
        {
          author: post.author,
          topics: post.topics.join(','),
          tags: post.tags.join(','),
          status: post.status,
        }
      );
      console.log(`📝 Created blog post: ${post.title} (uploaded to R2)`);
    } catch (error) {
      console.log(`📝 Created blog post: ${post.title} (local storage - R2 unavailable)`);
      // Save to local storage as fallback
      await this.savePostLocally(blogPost);
    }

    return blogPost;
  }

  async publishPost(postId: string): Promise<BlogPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    post.status = 'published';
    post.publishedAt = Date.now();
    post.updatedAt = Date.now();

    // Try to upload to R2, but continue if it fails (for local development)
    try {
      await this.r2Storage.uploadFile(
        `blog/${post.slug}.json`,
        Buffer.from(JSON.stringify(post))
      );
      console.log(`✅ Published blog post: ${post.title} (uploaded to R2)`);
    } catch (error) {
      console.log(`✅ Published blog post: ${post.title} (local storage - R2 unavailable)`);
      // Save to local storage as fallback
      await this.savePostLocally(post);
    }

    return post;
  }

  async getPost(slugOrId: string): Promise<BlogPost | null> {
    let post = this.posts.get(slugOrId);
    if (post) {
      post.views++;
      return post;
    }
    
    for (const p of this.posts.values()) {
      if (p.slug === slugOrId) {
        p.views++;
        return p;
      }
    }
    
    return null;
  }

  async listPosts(filters?: {
    author?: string;
    topic?: string;
    tag?: string;
    status?: string;
    limit?: number;
  }): Promise<BlogPost[]> {
    let posts = Array.from(this.posts.values());
    
    if (filters?.author) {
      posts = posts.filter(p => p.author === filters.author);
    }
    if (filters?.topic) {
      posts = posts.filter(p => p.topics.includes(filters.topic!));
    }
    if (filters?.tag) {
      posts = posts.filter(p => p.tags.includes(filters.tag!));
    }
    if (filters?.status) {
      posts = posts.filter(p => p.status === filters.status);
    }
    
    posts.sort((a, b) => b.publishedAt - a.publishedAt);
    return posts.slice(0, filters?.limit || 10);
  }

  async searchPosts(query: string): Promise<BlogPost[]> {
    const q = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.keywords.some(k => k.toLowerCase().includes(q))
      )
      .sort((a, b) => b.views - a.views);
  }

  async getRelatedPosts(postId: string, limit = 5): Promise<BlogPost[]> {
    const post = this.posts.get(postId);
    if (!post) return [];
    
    const related = Array.from(this.posts.values())
      .filter(p => p.id !== postId && p.status === 'published')
      .map(p => ({
        post: p,
        score: this.calculateRelevance(post, p),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.post);
    
    return related;
  }

  async likePost(postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (post) post.likes++;
  }

  async sharePost(postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (post) post.shares++;
  }

  async getBlogStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    totalViews: number;
    totalLikes: number;
    topPosts: BlogPost[];
  }> {
    const posts = Array.from(this.posts.values());
    const published = posts.filter(p => p.status === 'published');
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const topPosts = published.sort((a, b) => b.views - a.views).slice(0, 5);
    
    return {
      totalPosts: posts.length,
      publishedPosts: published.length,
      totalViews,
      totalLikes,
      topPosts,
    };
  }

  async generateRSSFeed(): Promise<string> {
    const posts = await this.listPosts({ status: 'published', limit: 20 });
    
    const rssItems = posts.map(post => `
    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>https://blog.duoplus.dev/${post.slug}</link>
      <guid>https://blog.duoplus.dev/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>${this.escapeXml(post.author)}</author>
      <description>${this.escapeXml(post.excerpt)}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <category>${post.topics.join(', ')}</category>
      ${post.thumbnail ? `<image><url>${post.thumbnail}</url></image>` : ''}
    </item>
  `).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>DuoPlus Blog</title>
    <link>https://blog.duoplus.dev</link>
    <description>Latest updates and insights from DuoPlus</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;
  }

  private calculateRelevance(post1: BlogPost, post2: BlogPost): number {
    let score = 0;
    const topicMatches = post1.topics.filter(t => post2.topics.includes(t)).length;
    score += topicMatches * 3;
    const tagMatches = post1.tags.filter(t => post2.tags.includes(t)).length;
    score += tagMatches * 2;
    const categoryMatches = post1.categories.filter(c => post2.categories.includes(c)).length;
    score += categoryMatches * 2;
    const keywordMatches = post1.keywords.filter(k => post2.keywords.includes(k)).length;
    score += keywordMatches;
    return score;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async savePostLocally(post: BlogPost): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data', 'blog');

      // Create directory if it doesn't exist
      await fs.mkdir(dataDir, { recursive: true });

      // Save post as JSON file
      const filePath = path.join(dataDir, `${post.slug}.json`);
      await fs.writeFile(filePath, JSON.stringify(post, null, 2));
    } catch (error) {
      console.warn(`⚠️  Could not save post locally:`, error);
    }
  }
}

export const blogService = new BlogService(require('./r2StorageService').r2Storage);

