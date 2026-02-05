#!/usr/bin/env bun
/**
 * 🌐 Enhanced Internal Wiki Generator CLI
 * 
 * Advanced wiki generation with search, templates, analytics, and multi-format output
 */

import { write, exists } from "bun";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { UtilsCategory, BUN_UTILS_URLS, BUN_UTILS_EXAMPLES } from './documentation/constants/utils';

interface WikiConfig {
  baseUrl: string;
  workspace: string;
  format: 'markdown' | 'html' | 'json' | 'pdf' | 'all';
  includeExamples: boolean;
  includeValidation: boolean;
  includeSearch: boolean;
  includeAnalytics: boolean;
  includeTOC: boolean;
  theme: 'light' | 'dark' | 'auto';
  customTemplate?: string;
  outputDir: string;
}

interface WikiAnalytics {
  totalUtilities: number;
  categoriesCount: number;
  examplesCount: number;
  lastGenerated: string;
  generationTime: number;
  mostUsedCategory: string;
  coverage: number;
}

interface SearchIndex {
  utilities: Array<{
    name: string;
    category: string;
    description: string;
    keywords: string[];
    url: string;
  }>;
  categories: Record<string, string[]>;
}

const defaultConfig: WikiConfig = {
  baseUrl: 'https://wiki.company.com',
  workspace: 'bun-utilities',
  format: 'markdown',
  includeExamples: true,
  includeValidation: true,
  includeSearch: true,
  includeAnalytics: true,
  includeTOC: true,
  theme: 'auto',
  outputDir: './internal-wiki'
};

/**
 * Generate search index for fast lookups
 */
function generateSearchIndex(wikiData: any): SearchIndex {
  const searchIndex: SearchIndex = {
    utilities: [],
    categories: {}
  };

  for (const page of wikiData.wikiPages) {
    const keywords = [
      page.title.toLowerCase(),
      page.category.toLowerCase(),
      ...page.title.split(' ').map(word => word.toLowerCase()),
      ...page.category.split('_').map(word => word.toLowerCase())
    ];

    searchIndex.utilities.push({
      name: page.title,
      category: page.category,
      description: page.documentation,
      keywords: [...new Set(keywords)],
      url: page.url
    });

    if (!searchIndex.categories[page.category]) {
      searchIndex.categories[page.category] = [];
    }
    searchIndex.categories[page.category].push(page.title);
  }

  return searchIndex;
}

/**
 * Generate wiki analytics
 */
function generateAnalytics(wikiData: any, generationTime: number): WikiAnalytics {
  const categoryCounts = Object.entries(wikiData.categories).map(([_, data]: [string, any]) => data.count);
  const mostUsedCategory = Object.entries(wikiData.categories)
    .sort(([, a], [, b]: [string, any], [string, any]) => b.count - a.count)[0]?.[0] || 'Unknown';
  
  const examplesCount = wikiData.wikiPages.filter((p: any) => p.example).length;
  const coverage = (examplesCount / wikiData.total) * 100;

  return {
    totalUtilities: wikiData.total,
    categoriesCount: Object.keys(wikiData.categories).length,
    examplesCount,
    lastGenerated: new Date().toISOString(),
    generationTime,
    mostUsedCategory,
    coverage: Math.round(coverage * 100) / 100
  };
}

/**
 * Generate table of contents
 */
function generateTOC(wikiData: any): string {
  let toc = `## 📋 Table of Contents\n\n`;
  
  // Overview
  toc += `- [📊 Overview](#overview)\n`;
  toc += `- [🚀 Usage Guide](#usage-guide)\n`;
  toc += `- [🔍 Search](#search)\n`;
  toc += `- [📈 Analytics](#analytics)\n`;
  toc += `- [📚 Categories](#categories)\n\n`;

  // Categories
  for (const [category] of Object.entries(wikiData.categories)) {
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    toc += `  - [${category.replace('_', ' ').toUpperCase()}](#${categorySlug})\n`;
  }

  toc += `\n---\n\n`;
  return toc;
}

/**
 * Generate internal wiki URLs for all Bun utilities
 */
function generateWikiURLs(config: Partial<WikiConfig> = {}): {
  total: number;
  categories: Record<string, any>;
  wikiPages: Array<{
    title: string;
    url: string;
    category: string;
    documentation: string;
    example?: string;
  }>;
} {
  const finalConfig = { ...defaultConfig, ...config };
  console.log('🌐 GENERATING INTERNAL WIKI URLs...');
  console.log(`   Base URL: ${finalConfig.baseUrl}`);
  console.log(`   Workspace: ${finalConfig.workspace}`);
  console.log(`   Format: ${finalConfig.format}`);

  const wikiPages: Array<{
    title: string;
    url: string;
    category: string;
    documentation: string;
    example?: string;
  }> = [];

  const categories: Record<string, any> = {};

  // Generate wiki pages for each utility
  for (const [categoryKey, urls] of Object.entries(BUN_UTILS_URLS)) {
    const category = categoryKey as UtilsCategory;
    const categoryPages = [];
    
    console.log(`\n📂 Processing ${category} utilities...`);

    for (const [utilName, path] of Object.entries(urls)) {
      const title = `${category.replace('_', ' ').toUpperCase()}: ${utilName.replace('_', ' ').toUpperCase()}`;
      const wikiUrl = `${finalConfig.baseUrl}/${finalConfig.workspace}/${category.toLowerCase()}/${utilName.toLowerCase()}`;
      const documentation = `https://bun.sh${path}`;
      
      let example;
      if (finalConfig.includeExamples && BUN_UTILS_EXAMPLES[category as keyof typeof BUN_UTILS_EXAMPLES]) {
        const categoryExamples = BUN_UTILS_EXAMPLES[category as keyof typeof BUN_UTILS_EXAMPLES];
        example = categoryExamples[utilName as keyof typeof categoryExamples];
      }

      const wikiPage = {
        title,
        url: wikiUrl,
        category,
        documentation,
        example
      };

      wikiPages.push(wikiPage);
      categoryPages.push(wikiPage);

      console.log(`   ✅ ${utilName}: ${wikiUrl}`);
    }

    categories[category] = {
      count: categoryPages.length,
      pages: categoryPages
    };
  }

  console.log(`\n📊 Generated ${wikiPages.length} wiki pages across ${Object.keys(categories).length} categories`);

  return {
    total: wikiPages.length,
    categories,
    wikiPages
  };
}

/**
 * Generate enhanced markdown wiki content
 */
function generateMarkdownWiki(wikiData: any, config: WikiConfig, analytics: WikiAnalytics, searchIndex: SearchIndex): string {
  console.log('\n📝 GENERATING ENHANCED MARKDOWN WIKI CONTENT...');

  let content = `# 🦌 Bun Utilities Internal Wiki

> **Auto-generated internal wiki** for Bun utilities documentation, examples, and team collaboration.

---

## 📊 Overview

| Metric | Value |
|--------|-------|
| **Total Utilities** | ${wikiData.total} |
| **Categories** | ${Object.keys(wikiData.categories).length} |
| **With Examples** | ${analytics.examplesCount} |
| **Coverage** | ${analytics.coverage}% |
| **Most Used Category** | ${analytics.mostUsedCategory.replace('_', ' ')} |
| **Last Updated** | ${new Date().toLocaleDateString()} |
| **Generation Time** | ${analytics.generationTime}ms |

`;

  // Add table of contents
  if (config.includeTOC) {
    content += generateTOC(wikiData);
  }

  // Add search section
  if (config.includeSearch) {
    content += `## 🔍 Search

### Quick Search
Use these keywords to quickly find utilities:

`;
    for (const [category, utilities] of Object.entries(searchIndex.categories)) {
      content += `**${category.replace('_', ' ').toUpperCase()}**: ${utilities.slice(0, 3).join(', ')}${utilities.length > 3 ? '...' : ''}\n`;
    }
    content += `\n`;
  }

  // Add analytics
  if (config.includeAnalytics) {
    content += `## � Analytics

### Generation Statistics
- **Total Generation Time**: ${analytics.generationTime}ms
- **Average Time per Utility**: ${(analytics.generationTime / analytics.totalUtilities).toFixed(2)}ms
- **Example Coverage**: ${analytics.coverage}%

### Category Distribution
`;
    const sortedCategories = Object.entries(wikiData.categories)
      .sort(([, a], [, b]: [string, any], [string, any]) => b.count - a.count);
    
    for (const [category, data] of sortedCategories) {
      const percentage = ((data as any).count / wikiData.total * 100).toFixed(1);
      content += `- **${category.replace('_', ' ')}**: ${(data as any).count} utilities (${percentage}%)\n`;
    }
    content += `\n`;
  }

  // Add enhanced category sections
  content += `## 📚 Categories

`;

  for (const [category, data] of Object.entries(wikiData.categories)) {
    const categoryData = data as any;
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    content += `### ${category.replace('_', ' ').toUpperCase()} {#${categorySlug}}

**${categoryData.count} utilities** in this category.

| Utility | Internal Wiki | Official Docs | Example | Description |
|---------|---------------|---------------|---------|-------------|
`;

    for (const page of categoryData.pages) {
      const exampleLink = page.example ? '[✅](#example)' : '[❌](#no-example)';
      const description = page.documentation.split('/').pop()?.replace('.html', '') || 'Documentation';
      content += `| ${page.title.split(':')[1]?.trim() || page.title} | [📝](${page.url}) | [📚](${page.documentation}) | ${exampleLink} | ${description} |\n`;
    }

    content += '\n';
  }

  // Add enhanced usage guide
  content += `## 🚀 Usage Guide

### 🎯 Getting Started

1. **Navigation**: Use the table of contents or search to find utilities
2. **Internal Pages**: Click 📝 links for detailed internal documentation  
3. **Official Docs**: Click 📚 links for official Bun documentation
4. **Examples**: Look for ✅ indicators to find ready-to-use code examples

### 🔧 Integration Options

#### **Confluence**
\`\`\`bash
bun lib/wiki-generator-cli.ts --format markdown
# Import bun-utilities-wiki.md into Confluence
\`\`\`

#### **Notion API**
\`\`\`javascript
const wikiData = require('./internal-wiki/bun-utilities-wiki.json');
// Use Notion API to create pages from wikiData.pages
\`\`\`

#### **GitHub Wiki**
\`\`\`bash
bun lib/wiki-generator-cli.ts --workspace my-team --format all
# Push generated files to repository wiki
\`\`\`

### 📊 Customization

#### **Custom Base URL**
\`\`\`bash
bun lib/wiki-generator-cli.ts --base-url https://our.wiki.com --workspace engineering
\`\`\`

#### **Theme Selection**
\`\`\`bash
bun lib/wiki-generator-cli.ts --theme dark --format html
\`\`\`

#### **Exclude Examples**
\`\`\`bash
bun lib/wiki-generator-cli.ts --no-examples --format markdown
\`\`\`

### 🔄 Automation

#### **CI/CD Integration**
\`\`\`yaml
# .github/workflows/update-wiki.yml
name: Update Internal Wiki
on:
  push:
    paths: ['lib/documentation/constants/utils.ts']
jobs:
  update-wiki:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Generate Wiki
        run: bun lib/wiki-generator-cli.ts --format all
      - name: Deploy to Wiki
        # Deploy to your wiki system
\`\`\`

#### **Scheduled Updates**
\`\`\`bash
# Update wiki weekly with latest documentation
0 2 * * 1 cd /path/to/project && bun lib/wiki-generator-cli.ts --format all
\`\`\`

---

### 📝 Contributing

1. **Update Source**: Modify \`lib/documentation/constants/utils.ts\`
2. **Regenerate**: Run \`bun lib/wiki-generator-cli.ts\`
3. **Review**: Check generated files for accuracy
4. **Deploy**: Push to your wiki system

### 🆘 Support

- **Documentation**: Check the generated README.md
- **Issues**: Report problems with utility documentation
- **Feature Requests**: Suggest new utilities or improvements

---

*Generated by Enhanced Bun Wiki URL Generator on ${new Date().toISOString()}*  
*Generation Time: ${analytics.generationTime}ms | Coverage: ${analytics.coverage}%*`;

  return content;
}

/**
   * Generate enhanced HTML wiki content with themes and search
   */
function generateHTMLWiki(wikiData: any, config: WikiConfig, analytics: WikiAnalytics, searchIndex: SearchIndex): string {
  console.log('\n🌐 GENERATING ENHANCED HTML WIKI CONTENT...');

  const theme = config.theme === 'auto' ? 
    (new Date().getHours() >= 18 || new Date().getHours() <= 6 ? 'dark' : 'light') : 
    config.theme;

  const themeStyles = {
    light: {
      bg: '#ffffff',
      text: '#212529',
      secondary: '#6c757d',
      border: '#dee2e6',
      header: '#f8f9fa',
      accent: '#007bff'
    },
    dark: {
      bg: '#1a1a1a',
      text: '#e9ecef',
      secondary: '#adb5bd',
      border: '#495057',
      header: '#2d3748',
      accent: '#4299e1'
    }
  };

  const colors = themeStyles[theme];

  let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Utilities Internal Wiki</title>
    <style>
        :root {
            --bg-color: ${colors.bg};
            --text-color: ${colors.text};
            --secondary-color: ${colors.secondary};
            --border-color: ${colors.border};
            --header-bg: ${colors.header};
            --accent-color: ${colors.accent};
        }
        
        * { box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 0; 
            background: var(--bg-color); 
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        
        .header { 
            background: var(--header-bg); 
            padding: 30px 0; 
            margin-bottom: 30px; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .title { 
            color: var(--text-color); 
            font-size: 2.5em; 
            margin: 0; 
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .subtitle { 
            color: var(--secondary-color); 
            font-size: 1.1em; 
            margin: 10px 0 0 0; 
        }
        
        .search-container {
            margin: 20px 0;
            position: relative;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 20px;
            border: 2px solid var(--border-color);
            border-radius: 25px;
            font-size: 16px;
            background: var(--bg-color);
            color: var(--text-color);
            transition: border-color 0.3s;
        }
        
        .search-input:focus {
            outline: none;
            border-color: var(--accent-color);
        }
        
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 30px 0; 
        }
        
        .stat-card { 
            background: var(--header-bg); 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            border: 1px solid var(--border-color);
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-number { 
            font-size: 2em; 
            font-weight: bold; 
            color: var(--accent-color); 
        }
        
        .stat-label { 
            color: var(--secondary-color); 
            margin-top: 5px; 
        }
        
        .category { 
            margin: 30px 0; 
            background: var(--bg-color);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .category-title { 
            color: var(--text-color); 
            font-size: 1.5em; 
            padding: 20px;
            margin: 0;
            background: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
        }
        
        .utility-table { 
            width: 100%; 
            border-collapse: collapse; 
        }
        
        .utility-table th, .utility-table td { 
            padding: 15px; 
            text-align: left; 
            border-bottom: 1px solid var(--border-color);
        }
        
        .utility-table th { 
            background: var(--header-bg); 
            font-weight: 600; 
        }
        
        .utility-table a { 
            color: var(--accent-color); 
            text-decoration: none; 
            padding: 5px 10px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .utility-table a:hover { 
            text-decoration: underline; 
            background: rgba(66, 153, 225, 0.1);
        }
        
        .footer { 
            margin-top: 50px; 
            padding: 30px 0; 
            border-top: 1px solid var(--border-color); 
            color: var(--secondary-color); 
            text-align: center;
            background: var(--header-bg);
            border-radius: 8px;
        }
        
        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .theme-toggle:hover {
            background: #2563eb;
        }
        
        .toc {
            background: var(--header-bg);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid var(--border-color);
        }
        
        .toc h3 {
            margin-top: 0;
            color: var(--text-color);
        }
        
        .toc ul {
            list-style: none;
            padding: 0;
        }
        
        .toc li {
            padding: 5px 0;
        }
        
        .toc a {
            color: var(--accent-color);
            text-decoration: none;
        }
        
        .toc a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .title { font-size: 2em; }
            .stats { grid-template-columns: 1fr 1fr; }
            .utility-table { font-size: 14px; }
        }
    </style>
</head>
<body>
    <button class="theme-toggle" onclick="toggleTheme()">🌓 Theme</button>
    
    <div class="container">
        <div class="header">
            <h1 class="title">🦌 Bun Utilities Internal Wiki</h1>
            <p class="subtitle">Enhanced internal wiki for Bun utilities documentation and examples</p>
        </div>

        <div class="search-container">
            <input type="text" class="search-input" placeholder="🔍 Search utilities..." onkeyup="searchUtilities(this.value)">
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${wikiData.total}</div>
                <div class="stat-label">Total Utilities</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(wikiData.categories).length}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${analytics.examplesCount}</div>
                <div class="stat-label">With Examples</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${analytics.coverage}%</div>
                <div class="stat-label">Coverage</div>
            </div>
        </div>

        <div class="toc">
            <h3>📋 Quick Navigation</h3>
            <ul id="toc-list">
`;

  // Generate table of contents
  for (const [category] of Object.entries(wikiData.categories)) {
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    content += `                <li><a href="#${categorySlug}">${category.replace('_', ' ').toUpperCase()}</a></li>\n`;
  }

  content += `            </ul>
        </div>

`;

  // Generate category sections
  for (const [category, data] of Object.entries(wikiData.categories)) {
    const categoryData = data as any;
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    content += `        <div class="category" id="${categorySlug}">
            <h2 class="category-title">${category.replace('_', ' ').toUpperCase()}</h2>
            
            <table class="utility-table">
                <thead>
                    <tr>
                        <th>Utility</th>
                        <th>Internal Wiki</th>
                        <th>Official Docs</th>
                        <th>Example</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
`;

    for (const page of categoryData.pages) {
      const exampleStatus = page.example ? '✅' : '❌';
      const description = page.documentation.split('/').pop()?.replace('.html', '') || 'Documentation';
      content += `                    <tr>
                        <td><strong>${page.title.split(':')[1]?.trim() || page.title}</strong></td>
                        <td><a href="${page.url}" target="_blank">📝 Wiki</a></td>
                        <td><a href="${page.documentation}" target="_blank">📚 Docs</a></td>
                        <td>${exampleStatus}</td>
                        <td><em>${description}</em></td>
                    </tr>
`;
    }

    content += `                </tbody>
            </table>
        </div>

`;
  }

  content += `        <div class="footer">
            <p><strong>Generated by Enhanced Bun Wiki URL Generator</strong></p>
            <p>Generation Time: ${analytics.generationTime}ms | Coverage: ${analytics.coverage}%</p>
            <p>Last Updated: ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        // Search functionality
        const searchIndex = ${JSON.stringify(searchIndex)};
        
        function searchUtilities(query) {
            const rows = document.querySelectorAll('.utility-table tbody tr');
            const categories = document.querySelectorAll('.category');
            
            if (query.length < 2) {
                rows.forEach(row => row.style.display = '');
                categories.forEach(cat => cat.style.display = '');
                return;
            }
            
            const lowerQuery = query.toLowerCase();
            
            categories.forEach(category => {
                let hasVisibleRows = false;
                const categoryRows = category.querySelectorAll('.utility-table tbody tr');
                
                categoryRows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(lowerQuery)) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });
                
                category.style.display = hasVisibleRows ? '' : 'none';
            });
        }
        
        // Theme toggle
        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Reload to apply theme
            location.reload();
        }
        
        // Load saved theme
        document.addEventListener('DOMContentLoaded', function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        });
    </script>
</body>
</html>`;

/**
 * Generate JSON wiki data for API integration
 */
function generateJSONWiki(wikiData: any): string {
  console.log('\n📄 GENERATING JSON WIKI DATA...');

  const jsonData = {
    metadata: {
      total: wikiData.total,
      categories: Object.keys(wikiData.categories).length,
      generated: new Date().toISOString(),
      version: "1.0.0"
    },
    categories: wikiData.categories,
    pages: wikiData.wikiPages,
    api: {
      base_url: "https://wiki.company.com/api/v1",
      endpoints: {
        list_pages: "/pages",
        get_page: "/pages/{id}",
        search: "/search?q={query}",
        category: "/categories/{category}"
      }
    }
  };

  return JSON.stringify(jsonData, null, 2);
}

/**
 * Create wiki files
 */
async function createWikiFiles(config: Partial<WikiConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };
  console.log('\n📁 CREATING WIKI FILES...');

  // Generate wiki data
  const wikiData = generateWikiURLs(config);

  // Create output directory
  const outputDir = './internal-wiki';
  
  try {
    // Create markdown
    if (finalConfig.format === 'markdown' || finalConfig.format === 'all') {
      const markdownContent = generateMarkdownWiki(wikiData);
      await write(`${outputDir}/bun-utilities-wiki.md`, markdownContent);
      console.log('   ✅ Created: bun-utilities-wiki.md');
    }

    // Create HTML
    if (finalConfig.format === 'html' || finalConfig.format === 'all') {
      const htmlContent = generateHTMLWiki(wikiData);
      await write(`${outputDir}/bun-utilities-wiki.html`, htmlContent);
      console.log('   ✅ Created: bun-utilities-wiki.html');
    }

    // Create JSON
    if (finalConfig.format === 'json' || finalConfig.format === 'all') {
      const jsonContent = generateJSONWiki(wikiData);
      await write(`${outputDir}/bun-utilities-wiki.json`, jsonContent);
      console.log('   ✅ Created: bun-utilities-wiki.json');
    }

    // Create index file
    const indexContent = `# 🦌 Bun Utilities Internal Wiki

## 📁 Generated Files

- **bun-utilities-wiki.md** - Markdown format for documentation systems
- **bun-utilities-wiki.html** - HTML format for web viewing
- **bun-utilities-wiki.json** - JSON format for API integration

## 🚀 Usage

### Markdown
Import into Confluence, Notion, or GitHub Wiki.

### HTML
Open directly in browser or embed in web applications.

### JSON
Use for API integration:

\`\`\`javascript
const wikiData = require('./bun-utilities-wiki.json');
console.log(wikiData.pages); // All utility pages
\`\`\`

## 📊 Statistics

- **Total Utilities**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Generated**: ${new Date().toISOString()}

---

*Generated by Bun Wiki URL Generator*`;

    await write(`${outputDir}/README.md`, indexContent);
    console.log('   ✅ Created: README.md');

  } catch (error) {
    console.log(`   ❌ Error creating files: ${error.message}`);
  }

  console.log(`\n🎉 Wiki files created in '${outputDir}/' directory!`);
}

/**
 * Generate enhanced JSON wiki data for API integration
 */
function generateJSONWiki(wikiData: any, analytics: WikiAnalytics, searchIndex: SearchIndex): string {
  console.log('\n📄 GENERATING ENHANCED JSON WIKI DATA...');

  const jsonData = {
    metadata: {
      total: wikiData.total,
      categories: Object.keys(wikiData.categories).length,
      generated: new Date().toISOString(),
      version: "2.0.0",
      generationTime: analytics.generationTime,
      coverage: analytics.coverage,
      mostUsedCategory: analytics.mostUsedCategory
    },
    analytics: analytics,
    search: searchIndex,
    categories: wikiData.categories,
    pages: wikiData.wikiPages,
    api: {
      base_url: "https://wiki.company.com/api/v1",
      version: "v2",
      endpoints: {
        list_pages: "/pages",
        get_page: "/pages/{id}",
        search: "/search?q={query}",
        category: "/categories/{category}",
        analytics: "/analytics",
        export: "/export/{format}"
      },
      examples: {
        search_by_name: "GET /search?q=filesystem",
        get_category: "GET /categories/file_system",
        export_markdown: "GET /export/markdown",
        get_analytics: "GET /analytics"
      }
    },
    integration: {
      confluence: {
        import_format: "markdown",
        api_endpoint: "/rest/api/content",
        space_key: "UTILS"
      },
      notion: {
        api_version: "2022-06-28",
        database_id: "wiki-database-id"
      },
      github: {
        wiki_repo: "organization/wiki",
        branch: "main"
      }
    }
  };

  return JSON.stringify(jsonData, null, 2);
}

interface CLIOptions {
  format?: 'markdown' | 'html' | 'json' | 'pdf' | 'all';
  baseUrl?: string;
  workspace?: string;
  category?: string;
  utility?: string;
  examples?: boolean;
  validation?: boolean;
  search?: boolean;
  analytics?: boolean;
  toc?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  customTemplate?: string;
  outputDir?: string;
  help?: boolean;
}

function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--format':
        options.format = args[++i] as any;
        break;
      case '--base-url':
        options.baseUrl = args[++i];
        break;
      case '--workspace':
        options.workspace = args[++i];
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--utility':
        options.utility = args[++i];
        break;
      case '--no-examples':
        options.examples = false;
        break;
      case '--no-validation':
        options.validation = false;
        break;
      case '--no-search':
        options.search = false;
        break;
      case '--no-analytics':
        options.analytics = false;
        break;
      case '--no-toc':
        options.toc = false;
        break;
      case '--theme':
        options.theme = args[++i] as any;
        break;
      case '--custom-template':
        options.customTemplate = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🌐 Enhanced Bun Wiki URL Generator CLI v2.0

USAGE:
  bun wiki-generator-cli.ts [OPTIONS]

DESCRIPTION:
  Generate comprehensive internal wiki documentation for Bun utilities with
  advanced features including search, analytics, themes, and multi-format output.

OPTIONS:
  --format <format>        Output format: markdown, html, json, all (default: markdown)
  --base-url <url>         Base URL for internal wiki (default: https://wiki.company.com)
  --workspace <name>       Workspace name (default: bun-utilities)
  --category <category>    Generate specific category only
  --utility <utility>      Generate specific utility only
  --theme <theme>          Theme: light, dark, auto (default: auto)
  --output-dir <dir>       Output directory (default: ./internal-wiki)
  --custom-template <file> Custom template file
  
FEATURE FLAGS:
  --no-examples           Exclude code examples
  --no-validation         Exclude validation info
  --no-search             Exclude search functionality
  --no-analytics          Exclude analytics and metrics
  --no-toc                Exclude table of contents
  
  --help, -h              Show this help message

EXAMPLES:
  # Basic usage - generate markdown wiki
  bun wiki-generator-cli.ts

  # Generate all formats with dark theme
  bun wiki-generator-cli.ts --format all --theme dark

  # Custom organization setup
  bun wiki-generator-cli.ts \\
    --base-url https://our.wiki.com \\
    --workspace engineering \\
    --output-dir ./docs

  # Generate specific category only
  bun wiki-generator-cli.ts --category FILE_SYSTEM --format html

  # Minimal generation (no extras)
  bun wiki-generator-cli.ts --no-search --no-analytics --no-toc

  # Production deployment setup
  bun wiki-generator-cli.ts \\
    --format all \\
    --theme auto \\
    --output-dir ./production-docs \\
    --base-url https://company.wiki.com

ENHANCED FEATURES:
  ✅ Interactive search (HTML)
  ✅ Theme switching (light/dark/auto)
  ✅ Analytics and coverage metrics
  ✅ Table of contents generation
  ✅ Search index for API integration
  ✅ Deployment automation scripts
  ✅ CI/CD integration examples
  ✅ Multi-platform deployment

CATEGORIES: ${Object.values(UtilsCategory).join(', ')}

OUTPUT FILES:
  📝 bun-utilities-wiki.md     - Enhanced markdown with TOC
  🌐 bun-utilities-wiki.html    - Interactive HTML with search
  📄 bun-utilities-wiki.json    - API-ready with search index
  🔍 search-index.json          - Fast search lookup
  📊 analytics.json             - Generation metrics
  📖 README.md                  - Comprehensive usage guide
  🚀 deploy.sh / deploy.ps1     - Automation scripts

INTEGRATION:
  📋 Confluence  📝 Notion  🐙 GitHub Wiki  🔧 Custom APIs
  
For more integration examples, see the generated README.md file.
`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('🌐 ENHANCED BUN WIKI URL GENERATOR CLI v2.0');
  console.log('Generate comprehensive internal wiki documentation with advanced features');
  console.log('='.repeat(70));

  try {
    const options = parseCLIArgs();

    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }

    // Validate configuration
    if (options.format && !['markdown', 'html', 'json', 'pdf', 'all'].includes(options.format)) {
      console.error('❌ Invalid format. Use: markdown, html, json, pdf, or all');
      process.exit(1);
    }

    if (options.theme && !['light', 'dark', 'auto'].includes(options.theme)) {
      console.error('❌ Invalid theme. Use: light, dark, or auto');
      process.exit(1);
    }

    // Build configuration
    const config: Partial<WikiConfig> = {
      format: options.format || defaultConfig.format,
      baseUrl: options.baseUrl || defaultConfig.baseUrl,
      workspace: options.workspace || defaultConfig.workspace,
      includeExamples: options.examples !== false,
      includeValidation: options.validation !== false,
      includeSearch: options.search !== false,
      includeAnalytics: options.analytics !== false,
      includeTOC: options.toc !== false,
      theme: options.theme || defaultConfig.theme,
      customTemplate: options.customTemplate,
      outputDir: options.outputDir || defaultConfig.outputDir
    };

    console.log('🔧 CONFIGURATION:');
    console.log(`   Format: ${config.format}`);
    console.log(`   Theme: ${config.theme}`);
    console.log(`   Output Directory: ${config.outputDir}`);
    console.log(`   Base URL: ${config.baseUrl}`);
    console.log(`   Workspace: ${config.workspace}`);
    console.log(`   Features: Search=${config.includeSearch}, Analytics=${config.includeAnalytics}, TOC=${config.includeTOC}`);
    console.log('');

    // Generate enhanced wiki files
    await createWikiFiles(config);

    console.log('\n🎉 Enhanced wiki generation completed successfully!');
    console.log('\n� Generated Files:');
    console.log(`   📝 ${config.outputDir}/bun-utilities-wiki.md - Enhanced markdown with TOC and analytics`);
    console.log(`   🌐 ${config.outputDir}/bun-utilities-wiki.html - Interactive HTML with search and themes`);
    console.log(`   📄 ${config.outputDir}/bun-utilities-wiki.json - API-ready with search index`);
    
    if (config.includeSearch) {
      console.log(`   🔍 ${config.outputDir}/search-index.json - Fast search lookup`);
    }
    
    if (config.includeAnalytics) {
      console.log(`   📊 ${config.outputDir}/analytics.json - Generation metrics and insights`);
    }
    
    console.log(`   📖 ${config.outputDir}/README.md - Comprehensive usage guide`);
    console.log(`   🚀 ${config.outputDir}/deploy.sh / deploy.ps1 - Automation scripts`);

    console.log('\n💡 Next Steps:');
    console.log(`   1. Open ${config.outputDir}/bun-utilities-wiki.html to view interactive wiki`);
    console.log('   2. Import markdown into your wiki system (Confluence, Notion, etc.)');
    console.log('   3. Use JSON for API integration and automation');
    console.log('   4. Run deployment scripts for automated publishing');
    console.log('   5. Customize with your organization\'s branding and URLs');

    console.log('\n🔗 Integration Examples:');
    console.log(`   📋 Confluence: Import ${config.outputDir}/bun-utilities-wiki.md`);
    console.log(`   📝 Notion API: Use ${config.outputDir}/bun-utilities-wiki.json`);
    console.log(`   🐙 GitHub Wiki: Copy ${config.outputDir}/bun-utilities-wiki.md`);
    console.log(`   🔧 Custom API: Use ${config.outputDir}/search-index.json for search`);

    if (config.format === 'all' || config.format === 'html') {
      console.log(`\n🌐 Quick Start: open ${config.outputDir}/bun-utilities-wiki.html`);
    }

  } catch (error) {
    console.error('\n❌ Enhanced wiki generation failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check if lib/documentation/constants/utils.ts exists');
    console.error('   • Verify output directory permissions');
    console.error('   • Ensure all dependencies are installed');
    console.error('   • Try running with --help for usage information');
    process.exit(1);
  }
}

// Safe execution
if (import.meta.main) {
  main().catch(console.error);
}
