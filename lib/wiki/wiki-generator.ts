#!/usr/bin/env bun
/**
 * Internal Wiki URL Generator CLI
 *
 * Uses BUN_UTILS_URLS to create internal wiki references and ideas
 * for documentation, knowledge management, and team collaboration.
 */

import { UtilsCategory, BUN_UTILS_URLS, BUN_UTILS_EXAMPLES } from '../docs/constants/utils';

// ============================================================================
// TYPES
// ============================================================================

type OutputFormat = 'markdown' | 'html' | 'json' | 'all';

interface WikiConfig {
  baseUrl: string;
  workspace: string;
  format: OutputFormat;
  includeExamples: boolean;
  includeValidation: boolean;
}

interface WikiPage {
  title: string;
  url: string;
  category: string;
  documentation: string;
  example?: string;
}

interface CategoryData {
  count: number;
  pages: WikiPage[];
}

interface WikiData {
  total: number;
  categories: Record<string, CategoryData>;
  wikiPages: WikiPage[];
}

interface CLIOptions {
  format?: OutputFormat;
  baseUrl?: string;
  workspace?: string;
  category?: string;
  utility?: string;
  examples?: boolean;
  validation?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCategoryName(category: string): string {
  return category.replace(/_/g, ' ').toUpperCase();
}

function formatUtilityName(name: string): string {
  return name.replace(/_/g, ' ').toUpperCase();
}

function getExample(category: UtilsCategory, utilName: string): string | undefined {
  // Safe type mapping - ensure all enum values have corresponding examples
  const categoryKey = category.toUpperCase() as keyof typeof BUN_UTILS_EXAMPLES;
  const categoryExamples = BUN_UTILS_EXAMPLES[categoryKey];

  if (!categoryExamples) {
    console.warn(`No examples found for category: ${category}`);
    return undefined;
  }

  const example = categoryExamples[utilName as keyof typeof categoryExamples];
  return example || undefined;
}

function buildWikiUrl(config: WikiConfig, category: string, utilName: string): string {
  return `${config.baseUrl}/${config.workspace}/${category.toLowerCase()}/${utilName.toLowerCase()}`;
}

// ============================================================================
// WIKI GENERATOR
// ============================================================================

const DEFAULT_CONFIG: WikiConfig = {
  baseUrl: 'https://wiki.company.com',
  workspace: 'bun-utilities',
  format: 'markdown',
  includeExamples: true,
  includeValidation: true,
};

function generateWikiURLs(config: Partial<WikiConfig> = {}): WikiData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const wikiPages: WikiPage[] = [];
  const categories: Record<string, CategoryData> = {};

  for (const [categoryKey, urls] of Object.entries(BUN_UTILS_URLS)) {
    const category = categoryKey as UtilsCategory;
    const categoryPages: WikiPage[] = [];

    for (const [utilName, path] of Object.entries(urls)) {
      const title = `${formatCategoryName(category)}: ${formatUtilityName(utilName)}`;
      const wikiUrl = buildWikiUrl(finalConfig, category, utilName);
      const documentation = `https://bun.sh${path}`;
      const example = finalConfig.includeExamples ? getExample(category, utilName) : undefined;

      const wikiPage: WikiPage = { title, url: wikiUrl, category, documentation, example };
      wikiPages.push(wikiPage);
      categoryPages.push(wikiPage);
    }

    categories[category] = { count: categoryPages.length, pages: categoryPages };
  }

  return { total: wikiPages.length, categories, wikiPages };
}

// ============================================================================
// MARKDOWN GENERATION
// ============================================================================

function generateMarkdownWiki(wikiData: WikiData): string {
  const header = `# Bun Utilities Internal Wiki

> Auto-generated internal wiki for Bun utilities documentation and examples.

## Overview

- **Total Utilities**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Last Updated**: ${new Date().toISOString()}

## Categories

`;

  const categorySections = Object.entries(wikiData.categories)
    .map(([category, data]) => {
      const tableHeader = `### ${formatCategoryName(category)}

${data.count} utilities in this category.

| Utility | Internal Wiki | Official Documentation | Example |
|---------|---------------|----------------------|---------|
`;
      const tableRows = data.pages
        .map(page => {
          const utilName = page.title.split(':')[1]?.trim() || page.title;
          const exampleLink = page.example ? '[Yes](#example)' : 'No';
          return `| ${utilName} | [Wiki](${page.url}) | [Docs](${page.documentation}) | ${exampleLink} |`;
        })
        .join('\n');

      return tableHeader + tableRows + '\n';
    })
    .join('\n');

  const detailedPages = wikiData.wikiPages
    .map(page => {
      let section = `### ${page.title}

**Internal Wiki**: [${page.url}](${page.url})
**Official Documentation**: [${page.documentation}](${page.documentation})

`;
      if (page.example) {
        section += `#### Code Example

\`\`\`typescript
${page.example}
\`\`\`

`;
      }
      section += `#### Related Links

- [Category Overview](#${page.category.toLowerCase().replace(/_/g, '-')})
- [All Utilities](#categories)
- [Bun Official Documentation](https://bun.sh/docs/api/utils)

---

`;
      return section;
    })
    .join('');

  const usageGuide = `## Usage Guide

### How to Use This Wiki

1. **Navigation**: Use the category overview to find utilities
2. **Internal Pages**: Click Wiki links for detailed internal documentation
3. **Official Docs**: Click Docs links for official Bun documentation
4. **Examples**: Check Yes links for ready-to-use code examples

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

  return header + categorySections + '\n## Detailed Pages\n\n' + detailedPages + usageGuide;
}

// ============================================================================
// HTML GENERATION
// ============================================================================

const HTML_STYLES = `
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
.footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center; }
`.trim();

function generateHTMLWiki(wikiData: WikiData): string {
  const withExamples = wikiData.wikiPages.filter(p => p.example).length;

  const categorySections = Object.entries(wikiData.categories)
    .map(([category, data]) => {
      const rows = data.pages
        .map(page => {
          const utilName = page.title.split(':')[1]?.trim() || page.title;
          return `          <tr>
            <td>${utilName}</td>
            <td><a href="${page.url}" target="_blank">Wiki</a></td>
            <td><a href="${page.documentation}" target="_blank">Docs</a></td>
            <td>${page.example ? 'Yes' : 'No'}</td>
          </tr>`;
        })
        .join('\n');

      return `    <div class="category">
      <h2 class="category-title">${formatCategoryName(category)}</h2>
      <p>${data.count} utilities in this category.</p>
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
${rows}
        </tbody>
      </table>
    </div>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bun Utilities Internal Wiki</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Bun Utilities Internal Wiki</h1>
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
        <div class="stat-number">${withExamples}</div>
        <div class="stat-label">With Examples</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${new Date().toLocaleDateString()}</div>
        <div class="stat-label">Last Updated</div>
      </div>
    </div>

${categorySections}

    <div class="footer">
      <p>Generated by Bun Wiki URL Generator on ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// JSON GENERATION
// ============================================================================

function generateJSONWiki(wikiData: WikiData): string {
  const jsonData = {
    metadata: {
      total: wikiData.total,
      categories: Object.keys(wikiData.categories).length,
      generated: new Date().toISOString(),
      version: '1.0.0',
    },
    categories: wikiData.categories,
    pages: wikiData.wikiPages,
    api: {
      base_url: 'https://wiki.company.com/api/v1',
      endpoints: {
        list_pages: '/pages',
        get_page: '/pages/{id}',
        search: '/search?q={query}',
        category: '/categories/{category}',
      },
    },
  };

  return JSON.stringify(jsonData, null, 2);
}

// ============================================================================
// FILE CREATION
// ============================================================================

async function createWikiFiles(config: Partial<WikiConfig> = {}): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const outputDir = './internal-wiki';
  const wikiData = generateWikiURLs(config);

  console.log('Generating wiki files...');
  console.log(`  Base URL: ${finalConfig.baseUrl}`);
  console.log(`  Workspace: ${finalConfig.workspace}`);
  console.log(`  Format: ${finalConfig.format}`);

  // Ensure output directory exists
  await Bun.write(`${outputDir}/.gitkeep`, '');

  const shouldWrite = (fmt: OutputFormat) =>
    finalConfig.format === fmt || finalConfig.format === 'all';

  if (shouldWrite('markdown')) {
    await Bun.write(`${outputDir}/bun-utilities-wiki.md`, generateMarkdownWiki(wikiData));
    console.log('  Created: bun-utilities-wiki.md');
  }

  if (shouldWrite('html')) {
    await Bun.write(`${outputDir}/bun-utilities-wiki.html`, generateHTMLWiki(wikiData));
    console.log('  Created: bun-utilities-wiki.html');
  }

  if (shouldWrite('json')) {
    await Bun.write(`${outputDir}/bun-utilities-wiki.json`, generateJSONWiki(wikiData));
    console.log('  Created: bun-utilities-wiki.json');
  }

  // Create README
  const readmeContent = `# Bun Utilities Internal Wiki

## Generated Files

- **bun-utilities-wiki.md** - Markdown format for documentation systems
- **bun-utilities-wiki.html** - HTML format for web viewing
- **bun-utilities-wiki.json** - JSON format for API integration

## Statistics

- **Total Utilities**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Generated**: ${new Date().toISOString()}

---

*Generated by Bun Wiki URL Generator*`;

  await Bun.write(`${outputDir}/README.md`, readmeContent);
  console.log('  Created: README.md');
  console.log(`\nWiki files created in '${outputDir}/'`);
}

function generateUtilityPage(
  category: UtilsCategory,
  utility: string,
  config: Partial<WikiConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!BUN_UTILS_URLS[category]?.[utility]) {
    throw new Error(`Utility ${category}.${utility} not found`);
  }

  const path = BUN_UTILS_URLS[category][utility];
  const title = `${formatCategoryName(category)}: ${formatUtilityName(utility)}`;
  const wikiUrl = buildWikiUrl(finalConfig, category, utility);
  const documentation = `https://bun.sh${path}`;
  const example = getExample(category, utility);

  let content = `# ${title}

**Internal Wiki**: ${wikiUrl}
**Official Documentation**: ${documentation}

`;

  if (example) {
    content += `## Code Example

\`\`\`typescript
${example}
\`\`\`

`;
  }

  content += `## Related Links

- [Category Overview](${finalConfig.baseUrl}/${finalConfig.workspace}/${category.toLowerCase()})
- [All Utilities](${finalConfig.baseUrl}/${finalConfig.workspace})
- [Bun Official Documentation](${documentation})

## Notes

Add your team's specific notes, best practices, and usage patterns here.

---

*Generated by Bun Wiki URL Generator*`;

  return content;
}

// ============================================================================
// CLI
// ============================================================================

function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--format':
        options.format = args[++i] as OutputFormat;
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
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Bun Wiki URL Generator CLI

Usage: bun wiki-generator.ts [options]

Options:
  --format <format>        Output format: markdown, html, json, all (default: markdown)
  --base-url <url>         Base URL for internal wiki (default: https://wiki.company.com)
  --workspace <name>       Workspace name (default: bun-utilities)
  --category <category>    Generate specific category only
  --utility <utility>      Generate specific utility only
  --no-examples            Exclude code examples
  --no-validation          Exclude validation info
  --help, -h               Show this help

Examples:
  bun wiki-generator.ts                          # Generate all wiki pages (markdown)
  bun wiki-generator.ts --format all             # Generate all formats
  bun wiki-generator.ts --base-url https://internal.wiki.com --workspace dev
  bun wiki-generator.ts --category FILE_SYSTEM   # Generate file system utilities only
  bun wiki-generator.ts --format html --no-examples

Categories: ${Object.values(UtilsCategory).join(', ')}
`);
}

async function main(): Promise<void> {
  console.log('Bun Wiki URL Generator');
  console.log('='.repeat(50));

  const options = parseCLIArgs();

  if (options.category && options.utility) {
    console.log(`Generating utility page: ${options.category}.${options.utility}`);

    const pageContent = generateUtilityPage(
      options.category as UtilsCategory,
      options.utility,
      options
    );

    const fileName = `${options.category.toLowerCase()}-${options.utility.toLowerCase()}.md`;
    await Bun.write(`./internal-wiki/${fileName}`, pageContent);
    console.log(`Created: ${fileName}`);
    return;
  }

  await createWikiFiles(options);
  console.log('\nDone.');
}

// ============================================================================
// EXPORTS & ENTRY
// ============================================================================

export {
  WikiURLGenerator,
  generateWikiURLs,
  generateMarkdownWiki,
  generateHTMLWiki,
  generateJSONWiki,
  createWikiFiles,
  generateUtilityPage,
};

// Backwards compatibility - class wrapper for existing imports
const WikiURLGenerator = {
  generateWikiURLs,
  generateMarkdownWiki,
  generateHTMLWiki,
  generateJSONWiki,
  createWikiFiles,
  generateUtilityPage,
};

if (import.meta.main) {
  main().catch(err => {
    console.error('Wiki generation failed:', err);
    process.exit(1);
  });
}
