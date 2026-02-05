#!/usr/bin/env bun

/**
 * Content Manager CLI
 * Manage blog posts, themes, and packages
 */

import shellUtils from '../src/cli/shellUtils';
import { blogService } from '../src/services/blogService';
import { metadataService } from '../src/services/metadataService';
import { publishingService } from '../src/services/publishingService';

const commands = {
  async createPost(title: string, author: string) {
    console.log(`📝 Creating blog post: ${title}`);

    const post = await blogService.createPost({
      title,
      author,
      content: `# ${title}\n\nYour content here...`,
      excerpt: `About ${title}`,
      topics: ['development'],
      tags: ['new'],
      categories: ['posts'],
      keywords: [title.toLowerCase()],
      status: 'draft',
      publishedAt: Date.now(),
      metaDescription: `Learn about ${title}`,
    });

    console.log(`✅ Post created: ${post.slug}`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Status: ${post.status}`);
  },

  async publishPost(postId: string) {
    console.log(`📤 Publishing post: ${postId}`);

    const post = await blogService.publishPost(postId);
    console.log(`✅ Post published: ${post.slug}`);
    console.log(`   URL: https://blog.duoplus.dev/${post.slug}`);
  },

  async listPosts(status: string = 'published') {
    console.log(`📚 Listing ${status} posts...`);

    const posts = await blogService.listPosts({ status, limit: 20 });
    console.log(`\nFound ${posts.length} posts:\n`);

    posts.forEach((post, i) => {
      console.log(`${i + 1}. ${post.title}`);
      console.log(`   Author: ${post.author}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Views: ${post.views}`);
      console.log(`   Slug: ${post.slug}\n`);
    });
  },

  async generateRSS() {
    console.log('📡 Generating RSS feed...');

    const feed = await blogService.generateRSSFeed();
    const feedPath = './data/blog-feed.xml';

    await Bun.write(feedPath, feed);
    console.log(`✅ RSS feed generated: ${feedPath}`);
  },

  async createMetadata(title: string, author: string) {
    console.log(`📋 Creating metadata: ${title}`);

    const meta = metadataService.createMetadata({
      title,
      description: `Metadata for ${title}`,
      author,
      version: '1.0.0',
      published: false,
      topics: ['development'],
      tags: ['new'],
      categories: ['content'],
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      keywords: [title.toLowerCase()],
      summary: `Summary of ${title}`,
      visibility: 'private',
      license: 'MIT',
      views: 0,
      downloads: 0,
      rating: 0,
      reviews: 0,
      relatedItems: [],
      dependencies: [],
    });

    console.log(`✅ Metadata created: ${meta.id}`);
  },

  async publishContent(title: string, author: string) {
    console.log(`📤 Publishing content: ${title}`);

    const meta = metadataService.createMetadata({
      title,
      description: `Content: ${title}`,
      author,
      version: '1.0.0',
      published: false,
      topics: ['development'],
      tags: [],
      categories: [],
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      keywords: [],
      summary: title,
      visibility: 'public',
      license: 'MIT',
      views: 0,
      downloads: 0,
      rating: 0,
      reviews: 0,
      relatedItems: [],
      dependencies: [],
    });

    const published = await publishingService.publishContent({
      title,
      description: `Content: ${title}`,
      content: `# ${title}\n\nContent here...`,
      author,
      topics: ['development'],
      tags: [],
      visibility: 'published',
      metadata: meta,
    });

    console.log(`✅ Content published: ${published.slug}`);
    console.log(`   URL: ${published.url}`);
  },

  async schedulePost(title: string, author: string, daysFromNow: number = 7) {
    console.log(`⏰ Scheduling post for ${daysFromNow} days from now...`);

    const meta = metadataService.createMetadata({
      title,
      description: title,
      author,
      version: '1.0.0',
      published: false,
      topics: [],
      tags: [],
      categories: [],
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      keywords: [],
      summary: title,
      visibility: 'public',
      license: 'MIT',
      views: 0,
      downloads: 0,
      rating: 0,
      reviews: 0,
      relatedItems: [],
      dependencies: [],
    });

    const scheduledFor = Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
    const url = await publishingService.schedulePublishing(
      {
        title,
        description: title,
        content: `# ${title}`,
        author,
        topics: [],
        tags: [],
        visibility: 'scheduled',
        metadata: meta,
      },
      scheduledFor
    );

    console.log(`✅ Post scheduled for ${new Date(scheduledFor).toISOString()}`);
  },

  async stats() {
    console.log('📊 Content Statistics:\n');

    const blogStats = await blogService.getBlogStats();
    console.log('Blog:');
    console.log(`  Total posts: ${blogStats.totalPosts}`);
    console.log(`  Published: ${blogStats.publishedPosts}`);
    console.log(`  Total views: ${blogStats.totalViews}`);
    console.log(`  Total likes: ${blogStats.totalLikes}\n`);

    const pubStats = await publishingService.getPublishingStats();
    console.log('Publishing:');
    console.log(`  Published content: ${pubStats.totalPublished}`);
    console.log(`  Scheduled: ${pubStats.totalScheduled}`);
    console.log(`  Total views: ${pubStats.totalViews}`);
    console.log(`  Total likes: ${pubStats.totalLikes}`);
  },

  async backup() {
    console.log('💾 Backing up content...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/content-${timestamp}`;

    await shellUtils.createDirectories([backupDir]);
    await shellUtils.copyFiles('./data', `${backupDir}/data`);

    console.log(`✅ Backup created: ${backupDir}`);
  },

  async help() {
    console.log(`
Content Manager CLI

Usage: bun run cli/content-manager.ts <command> [options]

Commands:
  createPost <title> <author>     Create a new blog post
  publishPost <postId>            Publish a blog post
  listPosts [status]              List posts (default: published)
  generateRSS                     Generate RSS feed
  createMetadata <title> <author> Create content metadata
  publishContent <title> <author> Publish content
  schedulePost <title> <author> [days] Schedule post for future
  stats                           Show content statistics
  backup                          Backup all content
  help                            Show this help message

Examples:
  bun run cli/content-manager.ts createPost "My Post" "author@example.com"
  bun run cli/content-manager.ts publishPost post_123
  bun run cli/content-manager.ts listPosts draft
  bun run cli/content-manager.ts generateRSS
  bun run cli/content-manager.ts schedulePost "Future Post" "author@example.com" 7
    `);
  },
};

async function main() {
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);

  if (command in commands) {
    try {
      await (commands as any)[command](...args);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${command}`);
    await commands.help();
    process.exit(1);
  }
}

main();

