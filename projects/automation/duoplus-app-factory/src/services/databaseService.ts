/**
 * Database Service
 * SQLite database for persistent storage of metadata, blog posts, and content
 */

import { Database } from 'bun:sqlite';
import { ContentMetadata } from './metadataService';
import { BlogPost } from './blogService';

export class DatabaseService {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = './data/duoplus.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initializeTables();
    console.log(`✅ Database initialized: ${dbPath}`);
  }

  private initializeTables(): void {
    // Metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        author TEXT,
        version TEXT,
        created INTEGER,
        updated INTEGER,
        published BOOLEAN,
        topics TEXT,
        tags TEXT,
        categories TEXT,
        slug TEXT UNIQUE,
        keywords TEXT,
        summary TEXT,
        thumbnail TEXT,
        visibility TEXT,
        license TEXT,
        repository TEXT,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviews INTEGER DEFAULT 0,
        relatedItems TEXT,
        dependencies TEXT,
        customFields TEXT
      )
    `);

    // Blog posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        thumbnail TEXT,
        topics TEXT,
        tags TEXT,
        categories TEXT,
        keywords TEXT,
        status TEXT,
        publishedAt INTEGER,
        updatedAt INTEGER,
        scheduledFor INTEGER,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        metaDescription TEXT,
        metaImage TEXT,
        canonicalUrl TEXT,
        relatedPosts TEXT,
        series TEXT,
        seriesOrder INTEGER
      )
    `);

    // Published content table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS published_content (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        content TEXT,
        topics TEXT,
        tags TEXT,
        visibility TEXT,
        publishedAt INTEGER,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        url TEXT
      )
    `);

    // Scheduled publishing table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_publishing (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        author TEXT,
        topics TEXT,
        tags TEXT,
        scheduledFor INTEGER,
        created INTEGER
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metadata_author ON metadata(author);
      CREATE INDEX IF NOT EXISTS idx_metadata_topics ON metadata(topics);
      CREATE INDEX IF NOT EXISTS idx_blog_author ON blog_posts(author);
      CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status);
      CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(publishedAt);
      CREATE INDEX IF NOT EXISTS idx_published_author ON published_content(author);
      CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduled_publishing(scheduledFor);
    `);

    console.log(`📊 Database tables initialized`);
  }

  // Metadata operations
  saveMetadata(meta: ContentMetadata): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (
        id, title, description, author, version, created, updated, published,
        topics, tags, categories, slug, keywords, summary, thumbnail, visibility,
        license, repository, views, downloads, rating, reviews, relatedItems, dependencies, customFields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      meta.id, meta.title, meta.description, meta.author, meta.version,
      meta.created, meta.updated, meta.published ? 1 : 0,
      JSON.stringify(meta.topics), JSON.stringify(meta.tags), JSON.stringify(meta.categories),
      meta.slug, JSON.stringify(meta.keywords), meta.summary, meta.thumbnail,
      meta.visibility, meta.license, meta.repository, meta.views, meta.downloads,
      meta.rating, meta.reviews, JSON.stringify(meta.relatedItems),
      JSON.stringify(meta.dependencies), JSON.stringify(meta.customFields || {})
    );
  }

  getMetadata(id: string): ContentMetadata | null {
    const stmt = this.db.prepare('SELECT * FROM metadata WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToMetadata(row) : null;
  }

  getMetadataBySlug(slug: string): ContentMetadata | null {
    const stmt = this.db.prepare('SELECT * FROM metadata WHERE slug = ?');
    const row = stmt.get(slug) as any;
    return row ? this.rowToMetadata(row) : null;
  }

  getAllMetadata(): ContentMetadata[] {
    const stmt = this.db.prepare('SELECT * FROM metadata ORDER BY updated DESC');
    return stmt.all() as any[];
  }

  searchMetadata(query: string): ContentMetadata[] {
    const q = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM metadata 
      WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ?
      ORDER BY updated DESC
    `);
    return stmt.all(q, q, q) as any[];
  }

  deleteMetadata(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM metadata WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes || 0) > 0;
  }

  // Blog operations
  saveBlogPost(post: BlogPost): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO blog_posts (
        id, title, slug, author, content, excerpt, thumbnail, topics, tags,
        categories, keywords, status, publishedAt, updatedAt, scheduledFor,
        views, likes, comments, shares, metaDescription, metaImage, canonicalUrl,
        relatedPosts, series, seriesOrder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      post.id, post.title, post.slug, post.author, post.content, post.excerpt,
      post.thumbnail, JSON.stringify(post.topics), JSON.stringify(post.tags),
      JSON.stringify(post.categories), JSON.stringify(post.keywords), post.status,
      post.publishedAt, post.updatedAt, post.scheduledFor || null,
      post.views, post.likes, post.comments, post.shares, post.metaDescription,
      post.metaImage, post.canonicalUrl, JSON.stringify(post.relatedPosts),
      post.series, post.seriesOrder || null
    );
  }

  getBlogPost(id: string): BlogPost | null {
    const stmt = this.db.prepare('SELECT * FROM blog_posts WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToBlogPost(row) : null;
  }

  getBlogPostBySlug(slug: string): BlogPost | null {
    const stmt = this.db.prepare('SELECT * FROM blog_posts WHERE slug = ?');
    const row = stmt.get(slug) as any;
    return row ? this.rowToBlogPost(row) : null;
  }

  getAllBlogPosts(status?: string): BlogPost[] {
    let query = 'SELECT * FROM blog_posts';
    if (status) {
      query += ` WHERE status = '${status}'`;
    }
    query += ' ORDER BY publishedAt DESC';
    const stmt = this.db.prepare(query);
    return stmt.all() as any[];
  }

  searchBlogPosts(query: string): BlogPost[] {
    const q = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM blog_posts 
      WHERE title LIKE ? OR content LIKE ? OR excerpt LIKE ?
      ORDER BY publishedAt DESC
    `);
    return stmt.all(q, q, q) as any[];
  }

  deleteBlogPost(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM blog_posts WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes || 0) > 0;
  }

  // Utility methods
  close(): void {
    this.db.close();
    console.log(`🔌 Database connection closed`);
  }

  backup(backupPath: string): void {
    const fs = require('fs');
    const data = this.db.serialize();
    fs.writeFileSync(backupPath, data);
    console.log(`💾 Database backed up to ${backupPath}`);
  }

  private rowToMetadata(row: any): ContentMetadata {
    return {
      ...row,
      published: row.published === 1,
      topics: JSON.parse(row.topics || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      categories: JSON.parse(row.categories || '[]'),
      keywords: JSON.parse(row.keywords || '[]'),
      relatedItems: JSON.parse(row.relatedItems || '[]'),
      dependencies: JSON.parse(row.dependencies || '[]'),
      customFields: JSON.parse(row.customFields || '{}'),
    };
  }

  private rowToBlogPost(row: any): BlogPost {
    return {
      ...row,
      topics: JSON.parse(row.topics || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      categories: JSON.parse(row.categories || '[]'),
      keywords: JSON.parse(row.keywords || '[]'),
      relatedPosts: JSON.parse(row.relatedPosts || '[]'),
    };
  }
}

export const database = new DatabaseService();

