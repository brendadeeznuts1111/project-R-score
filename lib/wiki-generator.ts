#!/usr/bin/env bun
/**
 * 🌐 Internal Wiki URL Generator CLI
 * 
 * Uses BUN_UTILS_URLS to create internal wiki references and ideas
 * for documentation, knowledge management, and team collaboration.
 */

if (import.meta.main) {
  main().catch(console.error);
} else {
  console.log('ℹ️  Wiki URL Generator imported, not executed directly');
}

import { write } from "bun";

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
  format: 'markdown' | 'html' | 'json';
  includeExamples: boolean;
  includeValidation: boolean;
}

class WikiURLGenerator {
  private static defaultConfig: WikiConfig = {
    baseUrl: 'https://wiki.company.com',
    workspace: 'bun-utilities',
    format: 'markdown',
    includeExamples: true,
    includeValidation: true
  };

  /**
   * Generate internal wiki URLs for all Bun utilities
   */
  static generateWikiURLs(config: Partial<WikiConfig> = {}): {
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
    const finalConfig = { ...this.defaultConfig, ...config };
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
   * Generate markdown wiki content
   */
  static generateMarkdownWiki(wikiData: any): string {
    console.log('\n📝 GENERATING MARKDOWN WIKI CONTENT...');

    let content = `# 🦌 Bun Utilities Internal Wiki

> Auto-generated internal wiki for Bun utilities documentation and examples.

## 📊 Overview

- **Total Utilities**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Last Updated**: ${new Date().toISOString()}

## 📚 Categories

`;

    // Generate category sections
    for (const [category, data] of Object.entries(wikiData.categories)) {
      const categoryData = data as any;
      content += `### ${category.replace('_', ' ').toUpperCase()}

${categoryData.count} utilities in this category.

| Utility | Internal Wiki | Official Documentation | Example |
|---------|---------------|----------------------|---------|
`;

      for (const page of categoryData.pages) {
        const exampleLink = page.example ? '[✅](#example)' : '[❌](#no-example)';
        content += `| ${page.title.split(':')[1]?.trim() || page.title} | [📝](${page.url}) | [📚](${page.documentation}) | ${exampleLink} |\n`;
      }

      content += '\n';
    }

    // Generate detailed pages section
    content += `## 📄 Detailed Pages

`;

    for (const page of wikiData.wikiPages) {
      content += `### ${page.title}

**Internal Wiki**: [${page.url}](${page.url})  
**Official Documentation**: [${page.documentation}](${page.documentation})

`;

      if (page.example) {
        content += `#### 💡 Code Example

\`\`\`typescript
${page.example}
\`\`\`

`;
      }

      content += `#### 🔗 Related Links

- [Category Overview](#${page.category.toLowerCase().replace('_', '-')})
- [All Utilities](#categories)
- [Bun Official Documentation](https://bun.sh/docs/api/utils)

---

`;
    }

    // Add usage guide
    content += `## 🚀 Usage Guide

### How to Use This Wiki

1. **Navigation**: Use the category overview to find utilities
2. **Internal Pages**: Click 📝 links for detailed internal documentation
3. **Official Docs**: Click 📚 links for official Bun documentation
4. **Examples**: Check ✅ links for ready-to-use code examples

### Contributing

To add new utilities or update examples:

1. Update \`lib/documentation/constants/utils.ts\`
2. Run this CLI tool to regenerate wiki pages
3. Review and commit the changes

### Integration

This wiki can be integrated with:
- **Confluence**: Import markdown pages
- **Notion**: Use API to create pages
- **GitHub Wiki**: Push to repository wiki
- **Internal Systems**: Use JSON output for API integration

---

*Generated by Bun Wiki URL Generator on ${new Date().toISOString()}*`;

    return content;
  }

  /**
   * Generate HTML wiki content
   */
  static generateHTMLWiki(wikiData: any): string {
    console.log('\n🌐 GENERATING HTML WIKI CONTENT...');

    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Utilities Internal Wiki</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #212529; font-size: 2.5em; margin: 0; }
        .subtitle { color: #6c757d; font-size: 1.1em; margin: 10px 0 0 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .category { margin: 30px 0; }
        .category-title { color: #495057; font-size: 1.5em; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        .utility-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .utility-table th, .utility-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .utility-table th { background: #f8f9fa; font-weight: 600; }
        .utility-table a { color: #007bff; text-decoration: none; }
        .utility-table a:hover { text-decoration: underline; }
        .example { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .example pre { margin: 0; overflow-x: auto; }
        .example code { background: #e9ecef; padding: 2px 4px; border-radius: 3px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🦌 Bun Utilities Internal Wiki</h1>
            <p class="subtitle">Auto-generated internal wiki for Bun utilities documentation and examples</p>
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
                <div class="stat-number">${wikiData.wikiPages.filter((p: any) => p.example).length}</div>
                <div class="stat-label">With Examples</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${new Date().toLocaleDateString()}</div>
                <div class="stat-label">Last Updated</div>
            </div>
        </div>

`;

    // Generate category sections
    for (const [category, data] of Object.entries(wikiData.categories)) {
      const categoryData = data as any;
      content += `        <div class="category">
            <h2 class="category-title">${category.replace('_', ' ').toUpperCase()}</h2>
            <p>${categoryData.count} utilities in this category.</p>
            
            <table class="utility-table">
                <thead>
                    <tr>
                        <th>Utility</th>
                        <th>Internal Wiki</th>
                        <th>Official Documentation</th>
                        <th>Example</th>
                    </tr>
                </thead>
                <tbody>
`;

      for (const page of categoryData.pages) {
        const exampleStatus = page.example ? '✅' : '❌';
        content += `                    <tr>
                        <td>${page.title.split(':')[1]?.trim() || page.title}</td>
                        <td><a href="${page.url}" target="_blank">📝 Wiki</a></td>
                        <td><a href="${page.documentation}" target="_blank">📚 Docs</a></td>
                        <td>${exampleStatus}</td>
                    </tr>
`;
      }

      content += `                </tbody>
            </table>
        </div>

`;
    }

    content += `        <div class="footer">
            <p>Generated by Bun Wiki URL Generator on ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;

    return content;
  }

  /**
   * Generate JSON wiki data for API integration
   */
  static generateJSONWiki(wikiData: any): string {
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
  static async createWikiFiles(config: Partial<WikiConfig> = {}): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    console.log('\n📁 CREATING WIKI FILES...');

    // Generate wiki data
    const wikiData = this.generateWikiURLs(config);

    // Create output directory
    const outputDir = './internal-wiki';
    try {
      await Bun.write(`${outputDir}/.gitkeep`, '');
    } catch (error) {
      // Directory might already exist
    }

    // Generate files based on format
    if (finalConfig.format === 'markdown' || finalConfig.format === 'all') {
      const markdownContent = this.generateMarkdownWiki(wikiData);
      await write(`${outputDir}/bun-utilities-wiki.md`, markdownContent);
      console.log('   ✅ Created: bun-utilities-wiki.md');
    }

    if (finalConfig.format === 'html' || finalConfig.format === 'all') {
      const htmlContent = this.generateHTMLWiki(wikiData);
      await write(`${outputDir}/bun-utilities-wiki.html`, htmlContent);
      console.log('   ✅ Created: bun-utilities-wiki.html');
    }

    if (finalConfig.format === 'json' || finalConfig.format === 'all') {
      const jsonContent = this.generateJSONWiki(wikiData);
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
Import into Confluence, Notion, or GitHub Wiki:

\`\`\`markdown
# Paste content from bun-utilities-wiki.md
\`\`\`

### HTML
Open directly in browser or embed in web applications:

\`\`\`html
<!-- Open bun-utilities-wiki.html -->
\`\`\`

### JSON
Use for API integration:

\`\`\`javascript
// Load and use the data
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

    console.log(`\n🎉 Wiki files created in '${outputDir}/' directory!`);
  }

  /**
   * Generate specific utility page
   */
  static generateUtilityPage(category: UtilsCategory, utility: string, config: Partial<WikiConfig> = {}): string {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (!BUN_UTILS_URLS[category] || !BUN_UTILS_URLS[category][utility]) {
      throw new Error(`Utility ${category}.${utility} not found`);
    }

    const path = BUN_UTILS_URLS[category][utility];
    const title = `${category.replace('_', ' ').toUpperCase()}: ${utility.replace('_', ' ').toUpperCase()}`;
    const wikiUrl = `${finalConfig.baseUrl}/${finalConfig.workspace}/${category.toLowerCase()}/${utility.toLowerCase()}`;
    const documentation = `https://bun.sh${path}`;
    
    let example = '';
    if (BUN_UTILS_EXAMPLES[category as keyof typeof BUN_UTILS_EXAMPLES]) {
      const categoryExamples = BUN_UTILS_EXAMPLES[category as keyof typeof BUN_UTILS_EXAMPLES];
      example = categoryExamples[utility as keyof typeof categoryExamples] || '';
    }

    return `# ${title}

**Internal Wiki**: ${wikiUrl}  
**Official Documentation**: ${documentation}

${example ? `## 💡 Code Example

\`\`\`typescript
${example}
\`\`\`

` : ''}## 🔗 Related Links

- [Category Overview](${finalConfig.baseUrl}/${finalConfig.workspace}/${category.toLowerCase()})
- [All Utilities](${finalConfig.baseUrl}/${finalConfig.workspace})
- [Bun Official Documentation](${documentation})

## 📝 Notes

Add your team's specific notes, best practices, and usage patterns here.

---

*Generated by Bun Wiki URL Generator*`;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

interface CLIOptions {
  format?: 'markdown' | 'html' | 'json' | 'all';
  baseUrl?: string;
  workspace?: string;
  category?: string;
  utility?: string;
  examples?: boolean;
  validation?: boolean;
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
      case '--help':
      case '-h':
        console.log(`
🌐 Bun Wiki URL Generator CLI

Usage: bun wiki-generator.ts [options]

Options:
  --format <format>        Output format: markdown, html, json, all (default: markdown)
  --base-url <url>         Base URL for internal wiki (default: https://wiki.company.com)
  --workspace <name>       Workspace name (default: bun-utilities)
  --category <category>    Generate specific category only
  --utility <utility>      Generate specific utility only
  --no-examples           Exclude code examples
  --no-validation         Exclude validation info
  --help, -h              Show this help

Examples:
  bun wiki-generator.ts                                    # Generate all wiki pages (markdown)
  bun wiki-generator.ts --format all                       # Generate all formats
  bun wiki-generator.ts --base-url https://internal.wiki.com --workspace dev
  bun wiki-generator.ts --category FILE_SYSTEM              # Generate file system utilities only
  bun wiki-generator.ts --format html --no-examples         # HTML without examples

Categories: ${Object.values(UtilsCategory).join(', ')}
        `);
        process.exit(0);
    }
  }

  return options;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('🌐 BUN WIKI URL GENERATOR CLI');
  console.log('Generate internal wiki pages for Bun utilities');
  console.log('=' .repeat(60));

  try {
    const options = parseCLIArgs();

    // Generate specific utility page
    if (options.category && options.utility) {
      console.log(`\n🎯 Generating specific utility page: ${options.category}.${options.utility}`);
      
      const pageContent = WikiURLGenerator.generateUtilityPage(
        options.category as UtilsCategory,
        options.utility,
        options
      );
      
      const fileName = `${options.category.toLowerCase()}-${options.utility.toLowerCase()}.md`;
      await write(`./internal-wiki/${fileName}`, pageContent);
      console.log(`✅ Created: ${fileName}`);
      
      return;
    }

    // Generate all wiki files
    await WikiURLGenerator.createWikiFiles(options);

    console.log('\n🎉 Wiki generation completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Review generated files in ./internal-wiki/');
    console.log('   2. Import markdown into your wiki system');
    console.log('   3. Share HTML version for quick reference');
    console.log('   4. Use JSON for API integration');
    console.log('   5. Customize base URL and workspace for your organization');

  } catch (error) {
    console.error('\n❌ Wiki generation failed:', error);
    process.exit(1);
  }
}

// Export for MCP integration
export { WikiURLGenerator };
