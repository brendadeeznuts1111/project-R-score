#!/usr/bin/env bun

/**
 * 📝 Wiki Mirror System
 * Mirrors GitHub wiki content to static pages
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { marked } from 'marked';

interface WikiPage {
  title: string;
  slug: string;
  content: string;
  lastModified: Date;
  category: string;
}

class WikiMirrorSystem {
  private readonly wikiDir = join(process.cwd(), 'wiki');
  private readonly distDir = join(process.cwd(), 'dist', 'pages', 'wiki');
  private pages: WikiPage[] = [];

  constructor() {
    this.setupDirectories();
  }

  private setupDirectories(): void {
    if (!existsSync(this.distDir)) {
      mkdirSync(this.distDir, { recursive: true });
    }
  }

  public async mirror(): Promise<void> {
    console.log('📝 Wiki Mirror System');
    console.log('!==!==!=====');

    try {
      // Scan for wiki pages
      await this.scanWikiPages();

      // Generate HTML pages
      await this.generateHtmlPages();

      // Generate wiki index
      await this.generateWikiIndex();

      // Generate search index
      await this.generateSearchIndex();

      console.log(`✅ Mirrored ${this.pages.length} wiki pages successfully`);
    } catch (error) {
      console.error('❌ Wiki mirror failed:', error);
      process.exit(1);
    }
  }

  private async scanWikiPages(): Promise<void> {
    console.log('🔍 Scanning for wiki pages...');

    // Check if wiki directory exists
    if (!existsSync(this.wikiDir)) {
      console.log('⚠️ Wiki directory not found, creating default structure...');
      this.createDefaultWikiStructure();
    }

    // Scan all markdown files
    this.scanDirectory(this.wikiDir);

    console.log(`📚 Found ${this.pages.length} wiki pages`);
  }

  private scanDirectory(dir: string, category: string = 'general'): void {
    const files = readdirSync(dir);

    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        this.scanDirectory(fullPath, file);
      } else if (extname(file) === '.md') {
        // Process markdown file
        const content = readFileSync(fullPath, 'utf-8');
        const title = this.extractTitle(content, file);
        const slug = basename(file, '.md');

        this.pages.push({
          title,
          slug,
          content,
          lastModified: stat.mtime,
          category,
        });
      }
    }
  }

  private extractTitle(content: string, filename: string): string {
    // Try to extract title from first heading
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1];
    }

    // Fall back to filename
    return basename(filename, '.md')
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private async generateHtmlPages(): Promise<void> {
    console.log('🎨 Generating HTML pages...');

    for (const page of this.pages) {
      await this.generateHtmlPage(page);
    }
  }

  private async generateHtmlPage(page: WikiPage): Promise<void> {
    // Convert markdown to HTML
    const contentHtml = marked(page.content);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} - Fire22 Wiki</title>
    <link rel="stylesheet" href="/assets/wiki.css">
    <link rel="stylesheet" href="/assets/highlight.css">
    <style>
        .wiki-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .wiki-nav {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .wiki-content {
            line-height: 1.6;
        }
        .wiki-content h1, .wiki-content h2, .wiki-content h3 {
            margin-top: 30px;
        }
        .wiki-content code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .wiki-content pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .wiki-metadata {
            color: #666;
            font-size: 0.9em;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <header>
        <nav class="wiki-nav">
            <a href="/">Home</a> |
            <a href="/wiki">Wiki Index</a> |
            <a href="/wiki/categories">Categories</a> |
            <a href="/wiki/search">Search</a>
        </nav>
    </header>
    
    <main class="wiki-container">
        <article class="wiki-content">
            ${contentHtml}
        </article>
        
        <div class="wiki-metadata">
            <p>📁 Category: <a href="/wiki/categories/${page.category}">${page.category}</a></p>
            <p>📅 Last modified: ${page.lastModified.toLocaleDateString()}</p>
            <p>📝 <a href="https://github.com/brendadeeznuts1111/fire22-dashboard-worker/wiki/${page.slug}">Edit on GitHub</a></p>
        </div>
    </main>
    
    <footer>
        <p>&copy; 2024 Fire22 Wiki. All rights reserved.</p>
    </footer>
</body>
</html>`;

    // Create category directory if needed
    const categoryDir = join(this.distDir, page.category);
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }

    // Write HTML file
    writeFileSync(join(categoryDir, `${page.slug}.html`), html);
    console.log(`✅ Generated: ${page.category}/${page.slug}.html`);
  }

  private async generateWikiIndex(): Promise<void> {
    console.log('📚 Generating wiki index...');

    // Group pages by category
    const categories = new Map<string, WikiPage[]>();
    for (const page of this.pages) {
      if (!categories.has(page.category)) {
        categories.set(page.category, []);
      }
      categories.get(page.category)!.push(page);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki Index - Fire22</title>
    <link rel="stylesheet" href="/assets/wiki.css">
    <style>
        .wiki-index {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .category-section {
            margin-bottom: 40px;
        }
        .category-title {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
        }
        .page-list {
            list-style: none;
            padding: 0;
        }
        .page-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
        }
        .page-item:hover {
            background: #f9f9f9;
        }
        .page-date {
            color: #666;
            font-size: 0.9em;
        }
        .stats {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <header>
        <h1>📚 Fire22 Wiki</h1>
        <nav>
            <a href="/">Home</a> |
            <a href="/departments">Departments</a> |
            <a href="/wiki/search">Search Wiki</a>
        </nav>
    </header>
    
    <main class="wiki-index">
        <div class="stats">
            <h2>📊 Wiki Statistics</h2>
            <ul>
                <li>Total Pages: ${this.pages.length}</li>
                <li>Categories: ${categories.size}</li>
                <li>Last Updated: ${new Date().toLocaleDateString()}</li>
            </ul>
        </div>
        
        ${Array.from(categories.entries())
          .map(
            ([category, pages]) => `
        <div class="category-section">
            <h2 class="category-title">📁 ${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
            <ul class="page-list">
                ${pages
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map(
                    page => `
                <li class="page-item">
                    <a href="/wiki/${category}/${page.slug}.html">${page.title}</a>
                    <span class="page-date">${page.lastModified.toLocaleDateString()}</span>
                </li>
                `
                  )
                  .join('')}
            </ul>
        </div>
        `
          )
          .join('')}
    </main>
    
    <footer>
        <p>&copy; 2024 Fire22. All rights reserved.</p>
    </footer>
</body>
</html>`;

    writeFileSync(join(this.distDir, 'index.html'), html);
    console.log('✅ Generated wiki index');
  }

  private async generateSearchIndex(): Promise<void> {
    console.log('🔍 Generating search index...');

    const searchData = this.pages.map(page => ({
      title: page.title,
      category: page.category,
      slug: page.slug,
      url: `/wiki/${page.category}/${page.slug}.html`,
      content: page.content.substring(0, 200), // First 200 chars for preview
    }));

    // Write search index as JSON
    writeFileSync(join(this.distDir, 'search-index.json'), JSON.stringify(searchData, null, 2));

    // Generate search page
    const searchHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Wiki - Fire22</title>
    <link rel="stylesheet" href="/assets/wiki.css">
    <style>
        .search-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .search-box {
            width: 100%;
            padding: 15px;
            font-size: 1.1em;
            border: 2px solid #ddd;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .search-results {
            list-style: none;
            padding: 0;
        }
        .result-item {
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        .result-item:hover {
            background: #f9f9f9;
        }
        .result-title {
            font-size: 1.2em;
            margin-bottom: 5px;
        }
        .result-preview {
            color: #666;
            font-size: 0.9em;
        }
        .result-category {
            display: inline-block;
            background: #e8f4f8;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <header>
        <h1>🔍 Search Wiki</h1>
        <nav>
            <a href="/">Home</a> |
            <a href="/wiki">Wiki Index</a> |
            <a href="/departments">Departments</a>
        </nav>
    </header>
    
    <main class="search-container">
        <input type="text" 
               class="search-box" 
               id="searchInput"
               placeholder="Search wiki pages..."
               autocomplete="off">
        
        <div id="searchResults">
            <p>Start typing to search...</p>
        </div>
    </main>
    
    <script>
        let searchIndex = [];
        
        // Load search index
        fetch('/wiki/search-index.json')
            .then(res => res.json())
            .then(data => {
                searchIndex = data;
            });
        
        // Search function
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            if (query.length < 2) {
                searchResults.innerHTML = '<p>Start typing to search...</p>';
                return;
            }
            
            const results = searchIndex.filter(page => 
                page.title.toLowerCase().includes(query) ||
                page.content.toLowerCase().includes(query) ||
                page.category.toLowerCase().includes(query)
            );
            
            if (results.length === 0) {
                searchResults.innerHTML = '<p>No results found.</p>';
                return;
            }
            
            searchResults.innerHTML = '<ul class="search-results">' +
                results.map(result => \`
                    <li class="result-item">
                        <div class="result-title">
                            <a href="\${result.url}">\${result.title}</a>
                        </div>
                        <div class="result-preview">\${result.content}...</div>
                        <span class="result-category">\${result.category}</span>
                    </li>
                \`).join('') +
                '</ul>';
        });
    </script>
    
    <footer>
        <p>&copy; 2024 Fire22. All rights reserved.</p>
    </footer>
</body>
</html>`;

    writeFileSync(join(this.distDir, 'search.html'), searchHtml);
    console.log('✅ Generated search page and index');
  }

  private createDefaultWikiStructure(): void {
    console.log('📁 Creating default wiki structure...');

    // Create wiki directory
    mkdirSync(this.wikiDir, { recursive: true });

    // Create default pages
    const defaultPages = [
      {
        file: 'Home.md',
        content: `# Fire22 Wiki

Welcome to the Fire22 Dashboard Wiki!

## Quick Links

- [Getting Started](Getting-Started.md)
- [Departments](departments/)
- [API Documentation](api/)
- [Configuration](configuration/)

## About

This wiki contains comprehensive documentation for the Fire22 Dashboard system.

Last updated: ${new Date().toISOString()}`,
      },
      {
        file: 'Getting-Started.md',
        content: `# Getting Started

## Installation

\`\`\`bash
bun install --frozen-lockfile
\`\`\`

## Development

\`\`\`bash
bun run dev
\`\`\`

## Building

\`\`\`bash
bun run build
\`\`\`

## Deployment

\`\`\`bash
bun run deploy
\`\`\``,
      },
    ];

    for (const page of defaultPages) {
      writeFileSync(join(this.wikiDir, page.file), page.content);
    }

    // Create department wiki directory
    const deptWikiDir = join(this.wikiDir, 'departments');
    mkdirSync(deptWikiDir, { recursive: true });

    console.log('✅ Created default wiki structure');
  }
}

// Run mirror
const mirror = new WikiMirrorSystem();
mirror.mirror().catch(console.error);
