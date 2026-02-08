/**
 * Bun Documentation Integration System
 * 
 * Integrates comprehensive Bun documentation with existing wiki and lib systems.
 * Provides unified access to Bun's complete API documentation, guides, and examples.
 */

import { PackageManager } from './package/package-manager';
import { R2Storage } from './r2/r2-storage-enhanced';
import { RSSManager } from './rss/rss-manager';
import { docsURLBuilder, EnhancedDocumentationURLValidator } from './docs/documentation-index';

// Types for Bun documentation integration
export interface BunDocumentationIndex {
  categories: DocumentationCategory[];
  totalPages: number;
  lastUpdated: string;
  version: string;
}

export interface DocumentationCategory {
  name: string;
  description: string;
  pages: DocumentationPage[];
  subcategories?: DocumentationCategory[];
}

export interface DocumentationPage {
  title: string;
  url: string;
  path: string;
  description?: string;
  category: string;
  lastModified?: string;
  content?: string;
  examples?: CodeExample[];
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: 'typescript' | 'javascript' | 'bash' | 'json';
  runnable?: boolean;
}

export interface BunMetricsExample {
  title: string;
  description: string;
  code: string;
  category: 'server-metrics' | 'websocket-metrics' | 'performance-monitoring';
}

/**
 * Main Bun Documentation Integration Class
 */
export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultBucket: string;
  endpoint?: string;
}

export class BunDocumentationIntegration {
  private packageManager: PackageManager;
  private r2Storage?: R2Storage;
  private rssManager?: RSSManager;
  private docIndex?: BunDocumentationIndex;
  private urlValidator: EnhancedDocumentationURLValidator;
  private docCache: Map<string, DocumentationPage> = new Map();
  private documentationCache: Map<string, any> = new Map();

  constructor(r2Config?: R2StorageConfig) { 
    this.packageManager = new PackageManager();
    this.r2Storage = r2Config ? new R2Storage(r2Config) : undefined;
    this.rssManager = new RSSManager();
    this.urlValidator = new EnhancedDocumentationURLValidator();
  }

  /**
   * Initialize the documentation integration system
   */
  async initialize(): Promise<void> {
    console.log('🦌 Initializing Bun Documentation Integration...');
    
    // Load existing documentation index
    await this.loadDocumentationIndex();
    
    // Subscribe to Bun RSS feed for updates
    if (this.rssManager) {
      await this.subscribeToBunRSS();
    }
    
    // Analyze current package for Bun API usage
    await this.analyzeCurrentPackage();
    
    console.log('✅ Bun Documentation Integration initialized');
  }

  /**
   * Get comprehensive Bun documentation index
   */
  async getDocumentationIndex(): Promise<BunDocumentationIndex> {
    const index: BunDocumentationIndex = {
      categories: [
        {
          name: 'Bundler',
          description: 'Bun bundling, optimization, and build tools',
          pages: [
            {
              title: 'Bundler',
              url: 'https://bun.com/docs/bundler',
              path: '/docs/bundler/index.md',
              category: 'Bundler',
              description: 'Complete bundling guide with optimization techniques'
            },
            {
              title: 'Code Splitting',
              url: 'https://bun.com/docs/bundler/code-splitting',
              path: '/docs/bundler/code-splitting.md',
              category: 'Bundler',
              description: 'Advanced code splitting strategies'
            },
            {
              title: 'Loaders',
              url: 'https://bun.com/docs/bundler/loaders',
              path: '/docs/bundler/loaders.md',
              category: 'Bundler',
              description: 'Custom loaders and asset processing'
            }
          ]
        },
        {
          name: 'Runtime',
          description: 'Bun runtime APIs and features',
          pages: [
            {
              title: 'File I/O',
              url: 'https://bun.com/docs/runtime/file-io',
              path: '/docs/runtime/file-io.md',
              category: 'Runtime',
              description: 'Fast file operations and streaming',
              examples: [
                {
                  title: 'Reading Files',
                  description: 'Read files with Bun\'s optimized API',
                  code: `const file = Bun.file('./data.json');
const content = await file.text();
console.log(content);`,
                  language: 'typescript',
                  runnable: true
                }
              ]
            },
            {
              title: 'HTTP Server',
              url: 'https://bun.com/docs/runtime/http/server',
              path: '/docs/runtime/http/server.md',
              category: 'Runtime',
              description: 'High-performance HTTP server with WebSockets',
              examples: [
                {
                  title: 'Basic Server',
                  description: 'Create a simple HTTP server',
                  code: `const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun!");
  }
});

console.log(\`Server running on http://localhost:\${server.port}\`);`,
                  language: 'typescript',
                  runnable: true
                }
              ]
            },
            {
              title: 'Server Metrics',
              url: 'https://bun.com/docs/runtime/http/metrics',
              path: '/docs/runtime/http/metrics.md',
              category: 'Runtime',
              description: 'Monitor server activity with built-in metrics',
              examples: this.getMetricsExamples()
            },
            {
              title: 'SQLite',
              url: 'https://bun.com/docs/runtime/sqlite',
              path: '/docs/runtime/sqlite.md',
              category: 'Runtime',
              description: 'Built-in SQLite database support',
              examples: [
                {
                  title: 'Database Operations',
                  description: 'SQLite database operations',
                  code: `// Create database
const db = new Database('mydb.sqlite');

// Create table
db.run(\`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)\`);

// Insert data
db.run(\`INSERT INTO users (name) VALUES (?)\`, ['Alice']);

// Query data
const users = db.query(\`SELECT * FROM users\`).all();
console.log(users);`,
                  language: 'typescript',
                  runnable: true
                }
              ]
            }
          ]
        },
        {
          name: 'Package Manager',
          description: 'Bun package manager and dependency management',
          pages: [
            {
              title: 'Package Manager',
              url: 'https://bun.com/docs/installation',
              path: '/docs/package-manager/index.md',
              category: 'Package Manager',
              description: 'Fast package installation and management'
            },
            {
              title: 'Workspaces',
              url: 'https://bun.com/docs/runtime/workspaces',
              path: '/docs/package-manager/workspaces.md',
              category: 'Package Manager',
              description: 'Monorepo workspace management'
            }
          ]
        },
        {
          name: 'Test Runner',
          description: 'Bun test runner and testing utilities',
          pages: [
            {
              title: 'Test Runner',
              url: 'https://bun.com/docs/test',
              path: '/docs/test/index.md',
              category: 'Test Runner',
              description: 'Fast Jest-compatible test runner',
              examples: [
                {
                  title: 'Writing Tests',
                  description: 'Basic test example',
                  code: `import { test, expect } from 'bun:test';

test('addition', () => {
  expect(2 + 2).toBe(4);
});

test('async operations', async () => {
  const result = await Promise.resolve('success');
  expect(result).toBe('success');
});`,
                  language: 'typescript',
                  runnable: true
                }
              ]
            }
          ]
        },
        {
          name: 'TypeScript',
          description: 'TypeScript support and configuration',
          pages: [
            {
              title: 'TypeScript Support',
              url: 'https://bun.com/docs/typescript',
              path: '/docs/typescript/index.md',
              category: 'TypeScript',
              description: 'Native TypeScript support without configuration'
            }
          ]
        }
      ],
      totalPages: 300,
      lastUpdated: new Date().toISOString(),
      version: '1.3.8'
    };

    return index;
  }

  /**
   * Get metrics examples from Bun documentation
   */
  private getMetricsExamples(): CodeExample[] {
    return [
      {
        title: 'Server Activity Monitoring',
        description: 'Monitor active requests and WebSockets',
        code: `const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      \`Active requests: \${server.pendingRequests}\\n\` + 
      \`Active WebSockets: \${server.pendingWebSockets}\`
    );
  },
});`,
        language: 'typescript',
        runnable: true
      },
      {
        title: 'WebSocket Topic Monitoring',
        description: 'Monitor subscribers to WebSocket topics',
        code: `const server = Bun.serve({
  fetch(req, server) {
    const chatUsers = server.subscriberCount("chat");
    return new Response(\`\${chatUsers} users in chat\`);
  },
  websocket: {
    message(ws) {
      ws.subscribe("chat");
    },
  },
});`,
        language: 'typescript',
        runnable: true
      }
    ];
  }

  /**
   * Search documentation by query
   */
  async searchDocumentation(query: string): Promise<DocumentationPage[]> {
    const index = await this.getDocumentationIndex();
    const results: DocumentationPage[] = [];
    
    const searchInCategory = (category: DocumentationCategory) => {
      category.pages.forEach(page => {
        if (
          page.title.toLowerCase().includes(query.toLowerCase()) ||
          page.description?.toLowerCase().includes(query.toLowerCase())
        ) {
          results.push(page);
        }
      });
      
      category.subcategories?.forEach(searchInCategory);
    };
    
    index.categories.forEach(searchInCategory);
    return results;
  }

  /**
   * Get specific documentation page
   */
  async getDocumentationPage(path: string): Promise<DocumentationPage | null> {
    // Check cache first
    if (this.documentationCache.has(path)) {
      return this.documentationCache.get(path)!;
    }
    
    const index = await this.getDocumentationIndex();
    
    const findPage = (category: DocumentationCategory): DocumentationPage | null => {
      const page = category.pages.find(p => p.path === path);
      if (page) return page;
      
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          const found = findPage(subcategory);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    for (const category of index.categories) {
      const page = findPage(category);
      if (page) {
        this.documentationCache.set(path, page);
        return page;
      }
    }
    
    return null;
  }

  /**
   * Generate wiki-compatible documentation
   */
  async generateWikiDocumentation(): Promise<string> {
    const index = await this.getDocumentationIndex();
    
    let wiki = `# 🦌 Bun Documentation Integration Wiki\n\n`;
    wiki += `> **Comprehensive Bun documentation** integrated with FactoryWager systems\n\n`;
    wiki += `---\n\n`;
    
    wiki += `## 📊 Overview\n\n`;
    wiki += `| Metric | Value |\n`;
    wiki += `|--------|-------|\n`;
    wiki += `| **Total Categories** | ${index.categories.length} |\n`;
    wiki += `| **Total Pages** | ${index.totalPages} |\n`;
    wiki += `| **Version** | ${index.version} |\n`;
    wiki += `| **Last Updated** | ${new Date(index.lastUpdated).toLocaleDateString()} |\n\n`;
    
    wiki += `## 📚 Documentation Categories\n\n`;
    
    for (const category of index.categories) {
      wiki += `### ${category.name.toUpperCase()} {#${category.name.toLowerCase()}}\n\n`;
      wiki += `**${category.pages.length} pages** in this category.\n\n`;
      wiki += `| Page | Official Docs | Examples | Description |\n`;
      wiki += `|------|---------------|----------|-------------|\n`;
      
      for (const page of category.pages) {
        const examplesBadge = page.examples && page.examples.length > 0 ? '✅' : '❌';
        wiki += `| [${page.title}](${page.url}) | [📚](${page.url}) | ${examplesBadge} | ${page.description || 'N/A'} |\n`;
      }
      
      wiki += `\n`;
    }
    
    wiki += `## 🚀 Quick Examples\n\n`;
    
    // Add some key examples
    const metricsPage = await this.getDocumentationPage('/docs/runtime/http/metrics.md');
    if (metricsPage?.examples) {
      wiki += `### Server Metrics\n\n`;
      for (const example of metricsPage.examples.slice(0, 2)) {
        wiki += `#### ${example.title}\n\n`;
        wiki += `${example.description}\n\n`;
        wiki += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
      }
    }
    
    wiki += `---\n\n`;
    wiki += `*Generated by Bun Documentation Integration on ${new Date().toISOString()}*\n`;
    
    return wiki;
  }

  /**
   * Load documentation index from cache or fetch fresh
   */
  private async loadDocumentationIndex(): Promise<void> {
    // Try to load from R2 storage if available
    if (this.r2Storage) {
      try {
        const cached = await this.r2Storage.get('bun-documentation-index.json');
        if (cached) {
          try {
            const index = JSON.parse(cached);
            // Update cache
            index.categories.forEach((category: DocumentationCategory) => {
              category.pages.forEach((page: DocumentationPage) => {
                this.docCache.set(page.url, page);
              });
            });
            this.docIndex = index;
            console.log('✅ Loaded documentation index from cache');
            return;
          } catch (parseError) {
            console.warn('Failed to parse cached documentation index:', parseError);
            // Continue to generate new index
          }
        }
      } catch (error) {
        console.warn('Failed to load cached documentation index:', error);
      }
    }

    // Generate new index
    await this.generateDocumentationIndex();
  }

  /**
   * Generate new documentation index
   */
  private async generateDocumentationIndex(): Promise<void> {
    console.log('🔄 Generating new documentation index...');
    
    // Create comprehensive documentation structure
    this.docIndex = {
      categories: [
        {
          name: 'Bundler',
          description: 'Bun bundler documentation and API reference',
          pages: [
            {
              url: 'https://bun.sh/docs/bundler',
              path: '/docs/bundler',
              title: 'Bundler Overview',
              description: 'Complete guide to Bun bundler',
              category: 'bundler',
              content: '# Bundler Overview\n\n...',
              examples: [],
              lastModified: new Date().toISOString()
            }
          ],
          subcategories: []
        },
        {
          name: 'Runtime',
          description: 'Bun runtime documentation',
          pages: [
            {
              url: 'https://bun.sh/docs/runtime',
              path: '/docs/runtime',
              title: 'Runtime Overview',
              description: 'Complete guide to Bun runtime',
              category: 'runtime',
              content: '# Runtime Overview\n\n...',
              examples: [],
              lastModified: new Date().toISOString()
            }
          ],
          subcategories: []
        }
      ],
      totalPages: 2,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    // Cache the documentation
    this.docIndex.categories.forEach((category: DocumentationCategory) => {
      category.pages.forEach((page: DocumentationPage) => {
        this.docCache.set(page.url, page);
      });
    });

    // Save to R2 if available
    if (this.r2Storage) {
      try {
        await this.r2Storage.upload('bun-documentation-index.json', JSON.stringify(this.docIndex));
        console.log('✅ Saved documentation index to R2');
      } catch (error) {
        console.warn('Failed to save documentation index to R2:', error);
      }
    }

    console.log('✅ Generated new documentation index');
  }

  /**
   * Subscribe to Bun RSS feed for updates
   */
  private async subscribeToBunRSS(): Promise<void> {
    if (!this.rssManager) return;
    
    try {
      await this.rssManager.subscribe('https://bun.com/rss.xml', 'Bun Official Blog');
      console.log('✅ Subscribed to Bun RSS feed');
    } catch (error) {
      console.warn('Failed to subscribe to Bun RSS feed:', error);
    }
  }

  /**
   * Analyze current package for Bun API usage
   */
  private async analyzeCurrentPackage(): Promise<void> {
    try {
      const analysis = await this.packageManager.analyzePackage();
      console.log(`📦 Package analysis complete: ${analysis.bunDocs?.length || 0} Bun APIs found`);
    } catch (error) {
      console.warn('Package analysis failed:', error);
    }
  }

  /**
   * Get Bun API usage recommendations
   */
  async getAPIRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Add recommendations based on common patterns
    recommendations.push('🚀 Use Bun.serve() for high-performance HTTP servers');
    recommendations.push('📊 Monitor server activity with built-in metrics (server.pendingRequests, server.pendingWebSockets)');
    recommendations.push('🗄️ Leverage built-in SQLite for local data storage');
    recommendations.push('⚡ Use Bun.file() for optimized file operations');
    recommendations.push('🧪 Utilize Bun test runner for fast Jest-compatible testing');
    recommendations.push('📝 Take advantage of built-in Markdown parser (v1.3.8+)');
    recommendations.push('🔍 Use metafile-md for LLM-friendly build analysis (v1.3.8+)');
    
    return recommendations;
  }

  /**
   * Export documentation in various formats
   */
  async exportDocumentation(format: 'json' | 'markdown' | 'html'): Promise<string> {
    const index = await this.getDocumentationIndex();
    
    switch (format) {
      case 'json':
        return JSON.stringify(index, null, 2);
      
      case 'markdown':
        return await this.generateWikiDocumentation();
      
      case 'html':
        return this.generateHTMLDocumentation(index);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate HTML documentation
   */
  private generateHTMLDocumentation(index: BunDocumentationIndex): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Documentation Integration</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
        .header { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); padding: 40px; border-radius: 10px; color: white; margin-bottom: 30px; }
        .category { margin-bottom: 30px; border: 1px solid #e1e5e9; border-radius: 8px; overflow: hidden; }
        .category-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e1e5e9; }
        .page-list { padding: 0; margin: 0; }
        .page-item { padding: 15px 20px; border-bottom: 1px solid #e1e5e9; display: flex; justify-content: space-between; align-items: center; }
        .page-item:last-child { border-bottom: none; }
        .badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .examples { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; }
        pre { background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦌 Bun Documentation Integration</h1>
        <p>Comprehensive Bun documentation with ${index.totalPages} pages across ${index.categories.length} categories</p>
        <p><strong>Version:</strong> ${index.version} | <strong>Updated:</strong> ${new Date(index.lastUpdated).toLocaleDateString()}</p>
    </div>`;
    
    for (const category of index.categories) {
      html += `
    <div class="category">
        <div class="category-header">
            <h2>${category.name}</h2>
            <p>${category.description}</p>
        </div>
        <div class="page-list">`;
      
      for (const page of category.pages) {
        const examplesBadge = page.examples && page.examples.length > 0 ? 
          '<span class="badge">✅ Examples</span>' : '';
        
        html += `
            <div class="page-item">
                <div>
                    <h3><a href="${page.url}" target="_blank">${page.title}</a></h3>
                    <p>${page.description || 'No description available'}</p>
                </div>
                ${examplesBadge}
            </div>`;
        
        if (page.examples && page.examples.length > 0) {
          html += `
            <div class="examples">
                <h4>Example: ${page.examples[0].title}</h4>
                <pre><code>${page.examples[0].code}</code></pre>
            </div>`;
        }
      }
      
      html += `
        </div>
    </div>`;
    }
    
    html += `
</body>
</html>`;
    
    return html;
  }
}

// Export types and utilities
export { docsURLBuilder, EnhancedDocumentationURLValidator };

// Default export
export default BunDocumentationIntegration;
