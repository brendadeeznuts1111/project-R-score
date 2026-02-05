#!/usr/bin/env bun

/**
 * 🏗️ Build Wiki Pages
 * Generates static HTML pages from wiki markdown files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, extname } from 'path';
import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

interface WikiBuildOptions {
  source?: string;
  output?: string;
  theme?: 'light' | 'dark' | 'auto';
  verbose?: boolean;
}

class WikiPageBuilder {
  private source: string;
  private output: string;
  private options: WikiBuildOptions;
  private pages: Map<string, string> = new Map();

  constructor(options: WikiBuildOptions = {}) {
    this.source = options.source || 'wiki';
    this.output = options.output || join('dist', 'pages', 'wiki');
    this.options = options;
  }

  async build(): Promise<void> {
    console.log('🏗️ Building Wiki Pages');
    console.log('!==!==!==!==');
    console.log(`📂 Source: ${this.source}`);
    console.log(`📂 Output: ${this.output}`);

    try {
      // Setup output directory
      this.setupOutputDirectory();

      // Process all wiki files
      await this.processWikiFiles();

      // Generate navigation
      await this.generateNavigation();

      // Copy assets
      await this.copyAssets();

      // Generate sitemap
      await this.generateSitemap();

      console.log(`\n✅ Built ${this.pages.size} wiki pages successfully!`);
    } catch (error) {
      console.error('❌ Wiki build failed:', error);
      process.exit(1);
    }
  }

  private setupOutputDirectory(): void {
    if (!existsSync(this.output)) {
      mkdirSync(this.output, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['departments', 'api', 'development', 'architecture', 'operations', 'assets'];
    for (const dir of subdirs) {
      const path = join(this.output, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    }
  }

  private async processWikiFiles(): Promise<void> {
    console.log('\n📄 Processing wiki files...');

    if (!existsSync(this.source)) {
      console.error(`❌ Source directory not found: ${this.source}`);
      return;
    }

    this.processDirectory(this.source);
  }

  private processDirectory(dir: string, subdir: string = ''): void {
    const files = readdirSync(dir);

    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        this.processDirectory(fullPath, join(subdir, file));
      } else if (extname(file) === '.md') {
        this.processMarkdownFile(fullPath, subdir);
      }
    }
  }

  private processMarkdownFile(filePath: string, subdir: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const filename = basename(filePath, '.md');
    const outputPath = join(subdir, `${filename}.html`);

    if (this.options.verbose) {
      console.log(`  📝 Processing: ${join(subdir, filename)}.md`);
    }

    // Parse metadata and content
    const { metadata, markdown } = this.parseMarkdown(content);

    // Convert markdown to HTML
    const contentHtml = marked(markdown);

    // Generate full HTML page
    const html = this.generateHtmlPage({
      title: metadata.title || this.titleFromFilename(filename),
      content: contentHtml,
      metadata,
      path: outputPath,
      filename,
    });

    // Save to output
    const outputFullPath = join(this.output, outputPath);
    const outputDir = dirname(outputFullPath);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputFullPath, html);
    this.pages.set(outputPath, metadata.title || this.titleFromFilename(filename));
  }

  private parseMarkdown(content: string): { metadata: any; markdown: string } {
    const metadata: any = {};
    let markdown = content;

    // Parse front matter if present
    if (content.startsWith('---')) {
      const endIndex = content.indexOf('---', 3);
      if (endIndex !== -1) {
        const frontMatter = content.substring(3, endIndex);
        markdown = content.substring(endIndex + 3).trim();

        // Parse YAML-like front matter
        frontMatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            metadata[key.trim()] = valueParts.join(':').trim();
          }
        });
      }
    }

    return { metadata, markdown };
  }

  private titleFromFilename(filename: string): string {
    return filename
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private generateHtmlPage(options: {
    title: string;
    content: string;
    metadata: any;
    path: string;
    filename: string;
  }): string {
    const theme = this.options.theme || 'auto';

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title} - Fire22 Wiki</title>
    <meta name="description" content="${options.metadata.description || 'Fire22 Dashboard Wiki Documentation'}">
    <link rel="stylesheet" href="/assets/wiki.css">
    <link rel="stylesheet" href="/assets/highlight.css">
    <style>
        :root {
            --primary-color: #ff6b35;
            --secondary-color: #f7931e;
            --text-color: #333;
            --bg-color: #fff;
            --code-bg: #f6f8fa;
            --border-color: #e1e4e8;
        }

        [data-theme="dark"] {
            --text-color: #e1e4e8;
            --bg-color: #0d1117;
            --code-bg: #161b22;
            --border-color: #30363d;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: var(--bg-color);
            margin: 0;
            padding: 0;
        }

        .wiki-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .wiki-nav {
            display: flex;
            gap: 1rem;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
        }

        .wiki-nav a {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .wiki-nav a:hover {
            background: rgba(255,255,255,0.1);
        }

        .wiki-container {
            max-width: 900px;
            margin: 2rem auto;
            padding: 0 1rem;
        }

        .wiki-content {
            background: var(--bg-color);
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .wiki-content h1 {
            color: var(--primary-color);
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 0.5rem;
        }

        .wiki-content h2 {
            color: var(--secondary-color);
            margin-top: 2rem;
        }

        .wiki-content code {
            background: var(--code-bg);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        .wiki-content pre {
            background: var(--code-bg);
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid var(--border-color);
        }

        .wiki-content pre code {
            background: none;
            padding: 0;
        }

        .wiki-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        .wiki-content th,
        .wiki-content td {
            border: 1px solid var(--border-color);
            padding: 0.5rem;
            text-align: left;
        }

        .wiki-content th {
            background: var(--code-bg);
        }

        .wiki-sidebar {
            position: fixed;
            left: 0;
            top: 60px;
            width: 250px;
            height: calc(100vh - 60px);
            background: var(--code-bg);
            border-right: 1px solid var(--border-color);
            overflow-y: auto;
            padding: 1rem;
        }

        .wiki-footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border-color);
            color: #666;
            font-size: 0.9rem;
        }

        .breadcrumb {
            padding: 1rem 0;
            font-size: 0.9rem;
        }

        .breadcrumb a {
            color: var(--primary-color);
            text-decoration: none;
        }

        .breadcrumb a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            .wiki-sidebar {
                display: none;
            }
        }
    </style>
</head>
<body>
    <header class="wiki-header">
        <nav class="wiki-nav">
            <a href="/">🏠 Home</a>
            <a href="/wiki">📚 Wiki</a>
            <a href="/departments">🏢 Departments</a>
            <a href="/api">🔌 API</a>
            <a href="/wiki/search">🔍 Search</a>
        </nav>
    </header>

    <main class="wiki-container">
        <div class="breadcrumb">
            <a href="/wiki">Wiki</a> / 
            ${options.path
              .split('/')
              .slice(0, -1)
              .map((part, i, arr) => `<a href="/wiki/${arr.slice(0, i + 1).join('/')}">${part}</a>`)
              .join(' / ')}
            ${options.path.split('/').length > 1 ? ' / ' : ''}
            <span>${options.title}</span>
        </div>

        <article class="wiki-content">
            ${options.content}
        </article>

        <footer class="wiki-footer">
            <p>
                📅 Last updated: ${options.metadata.last_updated || new Date().toISOString()}<br>
                📝 <a href="https://github.com/brendadeeznuts1111/fire22-dashboard-worker/wiki/${options.filename}">Edit on GitHub</a> |
                🐛 <a href="https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues">Report Issue</a>
            </p>
            <p>&copy; 2024 Fire22. All rights reserved.</p>
        </footer>
    </main>

    <script>
        // Theme toggle
        const theme = localStorage.getItem('wiki-theme') || 'auto';
        if (theme !== 'auto') {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // Add copy buttons to code blocks
        document.querySelectorAll('pre').forEach(pre => {
            const button = document.createElement('button');
            button.textContent = '📋 Copy';
            button.style.cssText = 'position:absolute;top:5px;right:5px;padding:5px 10px;background:#fff;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:12px;';
            button.onclick = () => {
                navigator.clipboard.writeText(pre.textContent);
                button.textContent = '✅ Copied!';
                setTimeout(() => button.textContent = '📋 Copy', 2000);
            };
            pre.style.position = 'relative';
            pre.appendChild(button);
        });
    </script>
</body>
</html>`;
  }

  private async generateNavigation(): Promise<void> {
    console.log('\n🧭 Generating navigation...');

    const nav = {
      sections: [
        { title: 'Getting Started', path: '/', pages: [] },
        { title: 'Departments', path: '/departments', pages: [] },
        { title: 'API', path: '/api', pages: [] },
        { title: 'Development', path: '/development', pages: [] },
        { title: 'Architecture', path: '/architecture', pages: [] },
        { title: 'Operations', path: '/operations', pages: [] },
      ],
    };

    // Populate navigation from pages
    this.pages.forEach((title, path) => {
      const section = nav.sections.find(s => path.startsWith(s.path.substring(1)));
      if (section) {
        section.pages.push({ title, path: `/wiki/${path}` });
      }
    });

    // Save navigation JSON
    writeFileSync(join(this.output, 'navigation.json'), JSON.stringify(nav, null, 2));

    console.log('✅ Navigation generated');
  }

  private async copyAssets(): Promise<void> {
    console.log('\n📦 Copying assets...');

    // Create CSS files
    const wikiCss = `
/* Wiki Styles */
.hljs { display: block; overflow-x: auto; padding: 0.5em; }
.hljs-keyword { color: #d73a49; }
.hljs-string { color: #032f62; }
.hljs-comment { color: #6a737d; }
.hljs-number { color: #005cc5; }
.hljs-function { color: #6f42c1; }
`;

    writeFileSync(join(this.output, 'assets', 'wiki.css'), wikiCss);

    // Create highlight.css
    const highlightCss = `
/* Highlight.js Theme */
.hljs{display:block;overflow-x:auto;padding:.5em;color:#333;background:#f8f8f8}
.hljs-comment,.hljs-quote{color:#998;font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-subst{color:#333;font-weight:700}
.hljs-literal,.hljs-number,.hljs-tag .hljs-attr,.hljs-template-variable,.hljs-variable{color:teal}
.hljs-doctag,.hljs-string{color:#d14}
.hljs-section,.hljs-selector-id,.hljs-title{color:#900;font-weight:700}
.hljs-subst{font-weight:400}
.hljs-class .hljs-title,.hljs-type{color:#458;font-weight:700}
.hljs-attribute,.hljs-name,.hljs-tag{color:navy;font-weight:400}
.hljs-link,.hljs-regexp{color:#009926}
.hljs-bullet,.hljs-symbol{color:#990073}
.hljs-built_in,.hljs-builtin-name{color:#0086b3}
.hljs-meta{color:#999;font-weight:700}
.hljs-deletion{background:#fdd}
.hljs-addition{background:#dfd}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:700}
`;

    writeFileSync(join(this.output, 'assets', 'highlight.css'), highlightCss);

    console.log('✅ Assets copied');
  }

  private async generateSitemap(): Promise<void> {
    console.log('\n🗺️ Generating sitemap...');

    const baseUrl = 'https://brendadeeznuts1111.github.io/fire22-dashboard-worker';
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(this.pages.entries())
  .map(
    ([path, title]) => `  <url>
    <loc>${baseUrl}/wiki/${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    writeFileSync(join(this.output, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: WikiBuildOptions = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--source':
      options.source = args[++i];
      break;
    case '--output':
      options.output = args[++i];
      break;
    case '--theme':
      options.theme = args[++i] as 'light' | 'dark' | 'auto';
      break;
    case '--verbose':
      options.verbose = true;
      break;
  }
}

// Run build
const builder = new WikiPageBuilder(options);
builder.build().catch(console.error);
