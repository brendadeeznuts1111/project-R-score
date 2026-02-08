/**
 * Bun Wiki Integration System
 * 
 * Integrates Bun documentation with the existing wiki system,
 * providing seamless access to Bun's comprehensive API documentation.
 */

import { BunDocumentationIntegration, type DocumentationPage, type DocumentationCategory, type CodeExample } from '../bun-documentation-integration';
import { R2Storage } from '../r2/r2-storage-enhanced';
import { withCircuitBreaker } from '../core/circuit-breaker';
import { CacheManager } from '../core/cache-manager';
import { Mutex } from '../core/safe-concurrency';
import { crc32 } from '../core/crc32';

// Constants
const SYNC_MULTIPLIER = 60 * 1000; // Convert minutes to milliseconds
const DEFAULT_SYNC_INTERVAL = 30; // Default sync interval in minutes

// Error logging utility
const logError = (context: string, error: any): void => {
  console.error(`[WikiIntegration:${context}]`, error);
};

const logWarning = (context: string, message: string): void => {
  console.warn(`[WikiIntegration:${context}]`, message);
};

const logInfo = (context: string, message: string): void => {
  console.log(`[WikiIntegration:${context}]`, message);
};

// Wiki integration types
export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastModified: string;
  url?: string;
  examples?: CodeExample[];
}

export interface WikiCategory {
  name: string;
  description: string;
  pages: WikiPage[];
  subcategories?: WikiCategory[];
}

export interface WikiConfig {
  baseUrl: string;
  storage?: any; // R2Storage instance
  autoSync: boolean;
  syncInterval: number; // minutes
}

/**
 * Bun Wiki Integration Class
 */
export class BunWikiIntegration {
  private docIntegration: BunDocumentationIntegration;
  private config: WikiConfig;
  private wikiCache: CacheManager = new CacheManager({ defaultTTL: 1800000, maxSize: 500 });
  private pageIds: Set<string> = new Set();
  private syncTimer?: NodeJS.Timeout;
  private syncMutex = new Mutex();

  constructor(docIntegration: BunDocumentationIntegration, config?: Partial<WikiConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'https://wiki.factorywager.com',
      storage: config?.storage,
      autoSync: config?.autoSync ?? true,
      syncInterval: config?.syncInterval || DEFAULT_SYNC_INTERVAL,
    };
    this.docIntegration = docIntegration;
  }

  /**
   * Initialize the wiki integration
   */
  async initialize(): Promise<void> {
    console.log('📚 Initializing Bun Wiki Integration...');
    
    // Initialize documentation integration
    await this.docIntegration.initialize();
    
    // Start auto-sync if enabled
    if (this.config.autoSync) {
      this.startAutoSync();
    }
    
    // Generate initial wiki pages
    await this.generateWikiPages();
    
    console.log('✅ Bun Wiki Integration initialized');
  }

  /**
   * Generate wiki pages from Bun documentation
   */
  async generateWikiPages(): Promise<WikiCategory[]> {
    const docIndex = await this.docIntegration.getDocumentationIndex();
    
    // Validate documentation index
    if (!docIndex) {
      throw new Error('Failed to get documentation index');
    }
    
    if (!Array.isArray(docIndex.categories) || docIndex.categories.length === 0) {
      logWarning('generateWikiPages', 'No categories found in documentation index');
      return [];
    }
    
    const wikiCategories: WikiCategory[] = [];

    for (const docCategory of docIndex.categories) {
      // Validate category structure
      if (!docCategory || !docCategory.name) {
        logWarning('generateWikiPages', `Invalid category found, skipping: ${JSON.stringify(docCategory)}`);
        continue;
      }
      
      const wikiCategory = await this.convertToWikiCategory(docCategory);
      if (wikiCategory) {
        wikiCategories.push(wikiCategory);
      }
    }

    return wikiCategories;
  }

  /**
   * Convert documentation category to wiki category
   */
  private async convertToWikiCategory(docCategory: DocumentationCategory): Promise<WikiCategory | null> {
    // Validate input
    if (!docCategory || !docCategory.name) {
      console.warn('Invalid documentation category:', docCategory);
      return null;
    }
    
    const wikiPages: WikiPage[] = [];

    if (Array.isArray(docCategory.pages)) {
      for (const docPage of docCategory.pages) {
        // Validate page structure
        if (!docPage || !docPage.title) {
          console.warn('Invalid documentation page found, skipping:', docPage);
          continue;
        }
        
        const wikiPage = await this.convertToWikiPage(docPage);
        if (wikiPage) {
          wikiPages.push(wikiPage);
        }
      }
    }

    return {
      name: docCategory.name,
      description: docCategory.description || `Documentation for ${docCategory.name}`,
      pages: wikiPages,
      subcategories: docCategory.subcategories ? await this.convertSubcategories(docCategory.subcategories) : []
    };
  }

  /**
   * Convert documentation subcategories to wiki subcategories
   */
  private async convertSubcategories(docSubcategories: DocumentationCategory[]): Promise<WikiCategory[]> {
    const wikiSubcategories: WikiCategory[] = [];
    
    for (const docSubcategory of docSubcategories) {
      const wikiSubcategory = await this.convertToWikiCategory(docSubcategory);
      if (wikiSubcategory) {
        wikiSubcategories.push(wikiSubcategory);
      }
    }
    
    return wikiSubcategories;
  }

  /**
   * Extract tags from documentation page
   */
  private extractTags(docPage: DocumentationPage): string[] {
    const tags: string[] = [];
    
    // Add category as a tag
    if (docPage.category) {
      tags.push(docPage.category);
    }
    
    // Extract tags from examples
    if (docPage.examples) {
      for (const example of docPage.examples) {
        if (example.language) {
          tags.push(example.language);
        }
      }
    }
    
    // Extract keywords from title and description
    const text = `${docPage.title} ${docPage.description || ''}`.toLowerCase();
    const keywords = ['bun', 'api', 'runtime', 'bundler', 'test', 'typescript', 'javascript'];
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }

  /**
   * Convert documentation page to wiki page
   */
  private async convertToWikiPage(docPage: DocumentationPage): Promise<WikiPage | null> {
    // Validate input
    if (!docPage || !docPage.title) {
      console.warn('Invalid documentation page:', docPage);
      return null;
    }
    
    const content = await this.generateWikiContent(docPage);
    
    const wikiPage: WikiPage = {
      id: docPage.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      title: docPage.title,
      content: content || 'Content not available',
      category: docPage.category || 'uncategorized',
      tags: this.extractTags(docPage),
      lastModified: docPage.lastModified || new Date().toISOString(),
      url: docPage.url,
      examples: docPage.examples || []
    };

    // Cache the page
    await this.wikiCache.set(wikiPage.id, wikiPage, { tags: ['wiki', wikiPage.category] });
    this.pageIds.add(wikiPage.id);

    return wikiPage;
  }

  /**
   * Generate wiki content from documentation page
   */
  private async generateWikiContent(docPage: DocumentationPage): Promise<string> {
    let content = `# ${docPage.title}\n\n`;
    
    if (docPage.description) {
      content += `${docPage.description}\n\n`;
    }

    if (docPage.url) {
      content += `**Official Documentation:** [View Original](${docPage.url})\n\n`;
    }

    // Add examples if available
    if (docPage.examples && docPage.examples.length > 0) {
      content += `## Examples\n\n`;
      
      for (const example of docPage.examples) {
        content += `### ${example.title}\n\n`;
        content += `${example.description}\n\n`;
        content += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
        
        if (example.runnable) {
          content += `> ✅ **Runnable Example** - This code can be executed directly\n\n`;
        }
      }
    }

    // Add metadata
    content += `---\n\n`;
    content += `**Metadata:**\n`;
    content += `- Category: ${docPage.category}\n`;
    content += `- Path: ${docPage.path}\n`;
    content += `- Last Updated: ${new Date(docPage.lastModified || Date.now()).toLocaleDateString()}\n`;
    
    if (docPage.examples) {
      content += `- Examples: ${docPage.examples.length}\n`;
    }

    return content;
  }

  /**
   * Generate wiki ID from path
   */
  private generateWikiId(path: string): string {
    return path
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Search wiki pages
   */
  async searchWiki(query: string): Promise<WikiPage[]> {
    const results: WikiPage[] = [];
    const lowerQuery = query.toLowerCase();

    for (const id of this.pageIds) {
      const page = await this.wikiCache.get<WikiPage>(id);
      if (page && (
        page.title.toLowerCase().includes(lowerQuery) ||
        page.content.toLowerCase().includes(lowerQuery) ||
        page.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )) {
        results.push(page);
      }
    }

    return results;
  }

  /**
   * Get wiki page by ID
   */
  async getWikiPage(id: string): Promise<WikiPage | null> {
    return await this.wikiCache.get<WikiPage>(id) ?? null;
  }

  /**
   * Get all wiki categories
   */
  async getWikiCategories(): Promise<WikiCategory[]> {
    return await this.generateWikiPages();
  }

  /**
   * Export wiki in various formats
   */
  async exportWiki(format: 'json' | 'markdown' | 'html'): Promise<string> {
    const categories = await this.generateWikiPages();
    
    switch (format) {
      case 'json':
        return JSON.stringify(categories, null, 2);
      
      case 'markdown':
        return this.generateMarkdownWiki(categories);
      
      case 'html':
        return this.generateHTMLWiki(categories);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate markdown wiki
   */
  private generateMarkdownWiki(categories: WikiCategory[]): string {
    let markdown = `# 🦌 Bun Documentation Wiki\n\n`;
    markdown += `> **Complete Bun documentation** integrated into wiki format\n\n`;
    markdown += `---\n\n`;

    // Table of contents
    markdown += `## 📋 Table of Contents\n\n`;
    for (const category of categories) {
      markdown += `- [${category.name}](#${category.name.toLowerCase().replace(/ /g, '-')})\n`;
    }
    markdown += `\n`;

    // Categories and pages
    for (const category of categories) {
      markdown += `## ${category.name}\n\n`;
      markdown += `${category.description}\n\n`;
      
      for (const page of category.pages) {
        markdown += `### ${page.title}\n\n`;
        markdown += `${page.content}\n\n`;
        
        if (page.tags.length > 0) {
          markdown += `**Tags:** ${page.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
        }
        
        markdown += `---\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate HTML wiki
   */
  private generateHTMLWiki(categories: WikiCategory[]): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Documentation Wiki</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; }
        .toc { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .toc ul { list-style: none; padding: 0; }
        .toc li { margin: 5px 0; }
        .category { margin-bottom: 40px; }
        .page { background: white; border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .tags { margin-top: 15px; }
        .tag { background: #e9ecef; color: #495057; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px; }
        .example { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; }
        pre { background: #f1f3f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦌 Bun Documentation Wiki</h1>
        <p>Complete Bun documentation integrated into wiki format</p>
    </div>
    
    <div class="toc">
        <h2>📋 Table of Contents</h2>
        <ul>`;
    
    for (const category of categories) {
      html += `<li><a href="#${category.name.toLowerCase().replace(/ /g, '-')}">${category.name}</a></li>`;
    }
    
    html += `</ul>
    </div>`;
    
    for (const category of categories) {
      html += `
    <div class="category" id="${category.name.toLowerCase().replace(/ /g, '-')}">
        <h2>${category.name}</h2>
        <p>${category.description}</p>`;
      
      for (const page of category.pages) {
        html += `
        <div class="page">
            <h3>${page.title}</h3>
            <div>${page.content}</div>`;
        
        if (page.tags.length > 0) {
          html += `
            <div class="tags">
                ${page.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>`;
        }
        
        html += `</div>`;
      }
      
      html += `</div>`;
    }
    
    html += `
</body>
</html>`;
    
    return html;
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    const intervalMs = this.config.syncInterval * SYNC_MULTIPLIER;

    this.syncTimer = setInterval(async () => {
      await this.syncMutex.withLock(async () => {
        try {
          console.log('🔄 Auto-syncing wiki documentation...');
          await this.generateWikiPages();
          console.log('✅ Wiki documentation synced');
        } catch (error) {
          console.error('❌ Wiki sync failed:', error);
        }
      });
    }, intervalMs);
  }

  /**
   * Cleanup method to prevent resource leaks
   */
  async cleanup(): Promise<void> {
    this.stopAutoSync();
    await this.wikiCache.clear();
    this.pageIds.clear();
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Save wiki to storage
   */
  async saveWiki(): Promise<void> {
    if (!this.config.storage) {
      throw new Error('Storage not configured');
    }

    const categories = await this.generateWikiPages();
    const wikiData = {
      categories,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    const jsonPayload = JSON.stringify(wikiData, null, 2);
    const checksum = crc32(jsonPayload);
    console.log(`   CRC32 checksum for wiki data: ${checksum.hex}`);

    await withCircuitBreaker('wiki-r2-storage', () =>
      this.config.storage.upload('bun-wiki.json', jsonPayload)
    );

    // Also save markdown version
    const markdownWiki = this.generateMarkdownWiki(categories);
    await withCircuitBreaker('wiki-r2-storage', () =>
      this.config.storage.upload('bun-wiki.md', markdownWiki)
    );

    console.log('💾 Wiki saved to storage');
  }

  /**
   * Load wiki from storage
   */
  async loadWiki(): Promise<void> {
    if (!this.config.storage) {
      throw new Error('Storage not configured');
    }

    try {
      const wikiData = await withCircuitBreaker('wiki-r2-storage', () =>
        this.config.storage.get('bun-wiki.json')
      );
      if (wikiData) {
        try {
          const parsed = JSON.parse(wikiData);

          // Clear existing cache to prevent stale data
          await this.wikiCache.clear();
          this.pageIds.clear();

          // Rebuild cache with consistent keys (use id as primary key)
          for (const category of parsed.categories) {
            for (const page of category.pages) {
              await this.wikiCache.set(page.id, page, { tags: ['wiki', page.category] });
              this.pageIds.add(page.id);
            }
          }

          console.log('✅ Loaded wiki data from cache');
        } catch (parseError) {
          console.warn('Failed to parse cached wiki data:', parseError);
          // Continue with empty cache
        }
      }
    } catch (error) {
      console.warn('Failed to load cached wiki data:', error);
    }
  }

  /**
   * Get wiki statistics
   */
  async getWikiStats(): Promise<{
    totalCategories: number;
    totalPages: number;
    totalExamples: number;
    lastSync: string;
  }> {
    const categories = new Set<string>();
    let totalExamples = 0;

    for (const id of this.pageIds) {
      const page = await this.wikiCache.get<WikiPage>(id);
      if (page) {
        categories.add(page.category);
        totalExamples += page.examples?.length || 0;
      }
    }

    return {
      totalCategories: categories.size,
      totalPages: this.pageIds.size,
      totalExamples,
      lastSync: new Date().toISOString()
    };
  }
}

// Default export
export default BunWikiIntegration;
