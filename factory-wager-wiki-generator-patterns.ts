#!/usr/bin/env bun
// Factory-Wager Wiki Generator with Pattern-Enhanced One-Liners Integration
// Integrates pattern tags, code blocks, and LLM-optimized context with wiki generation

import { FactoryWagerPatternOneliners, OneLinerPattern } from './factory-wager-oneliners-patterns-v38';

// ============================================================================
// TYPES
// ============================================================================

type OutputFormat = 'markdown' | 'html' | 'json' | 'all';

interface WikiConfig {
  baseUrl: string;
  workspace: string;
  format: OutputFormat;
  includePatterns: boolean;
  includeCodeBlocks: boolean;
  includePerformance: boolean;
  includeLLMContext: boolean;
}

interface PatternWikiPage {
  title: string;
  url: string;
  category: string;
  tags: string[];
  complexity: string;
  command: string;
  template: string;
  variables: string[];
  useCase: string;
  dependencies: string[];
  performance: {
    avgTime: number;
    opsPerSec: number;
    reliability: string;
  };
  patterns: string[];
  codeBlock: {
    type: string;
    template: string;
    variables: string[];
  };
}

interface PatternCategoryData {
  count: number;
  patterns: PatternWikiPage[];
  avgPerformance: number;
  complexities: Record<string, number>;
  codeTypes: Record<string, number>;
}

interface PatternWikiData {
  total: number;
  categories: Record<string, PatternCategoryData>;
  patterns: PatternWikiPage[];
  metadata: {
    totalTags: number;
    uniqueTags: string[];
    codeTypes: string[];
    complexityDistribution: Record<string, number>;
    performanceMetrics: {
      peakOpsPerSec: number;
      avgOpsPerSec: number;
      fastestPattern: string;
      slowestPattern: string;
    };
  };
}

interface CLIOptions {
  format?: OutputFormat;
  baseUrl?: string;
  workspace?: string;
  category?: string;
  pattern?: string;
  tags?: string;
  complexity?: string;
  codeType?: string;
  'no-patterns'?: boolean;
  'no-codeblocks'?: boolean;
  'no-performance'?: boolean;
  'no-llm-context'?: boolean;
  'max-patterns'?: number;
}

// ============================================================================
// PATTERN WIKI GENERATOR
// ============================================================================

const DEFAULT_CONFIG: WikiConfig = {
  baseUrl: 'https://wiki.factory-wager.com',
  workspace: 'factory-wager-patterns',
  format: 'markdown',
  includePatterns: true,
  includeCodeBlocks: true,
  includePerformance: true,
  includeLLMContext: true,
};

class FactoryWagerPatternWikiGenerator {
  private patternSystem: FactoryWagerPatternOneliners;

  constructor() {
    this.patternSystem = new FactoryWagerPatternOneliners();
  }

  /**
   * Generate pattern-enhanced wiki data
   */
  generatePatternWikiData(config: Partial<WikiConfig> = {}): PatternWikiData {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const allPatterns = this.patternSystem['patterns'] as OneLinerPattern[];
    
    // Apply filters
    let filteredPatterns = allPatterns;
    
    if (config.category) {
      filteredPatterns = filteredPatterns.filter(p => p.category === config.category);
    }
    
    if (config.codeType) {
      filteredPatterns = filteredPatterns.filter(p => p.codeBlocks.type === config.codeType);
    }
    
    if (config.complexity) {
      filteredPatterns = filteredPatterns.filter(p => p.context.complexity === config.complexity);
    }

    // Convert to wiki pages
    const patternPages: PatternWikiPage[] = filteredPatterns.map(pattern => ({
      title: pattern.name,
      url: `${finalConfig.baseUrl}/${finalConfig.workspace}/${pattern.category.toLowerCase()}/${pattern.id}`,
      category: pattern.category,
      tags: pattern.tags,
      complexity: pattern.context.complexity,
      command: pattern.command,
      template: pattern.codeBlocks.template,
      variables: pattern.codeBlocks.variables,
      useCase: pattern.context.useCase,
      dependencies: pattern.context.dependencies,
      performance: pattern.performance,
      patterns: pattern.patterns,
      codeBlock: {
        type: pattern.codeBlocks.type,
        template: pattern.codeBlocks.template,
        variables: pattern.codeBlocks.variables,
      },
    }));

    // Group by categories
    const categories: Record<string, PatternCategoryData> = {};
    const allTags = new Set<string>();
    const codeTypes = new Set<string>();
    const complexityDistribution: Record<string, number> = {};

    patternPages.forEach(page => {
      // Track tags
      page.tags.forEach(tag => allTags.add(tag));
      codeTypes.add(page.codeBlock.type);
      
      // Track complexity
      complexityDistribution[page.complexity] = (complexityDistribution[page.complexity] || 0) + 1;

      // Group by category
      if (!categories[page.category]) {
        categories[page.category] = {
          count: 0,
          patterns: [],
          avgPerformance: 0,
          complexities: {},
          codeTypes: {},
        };
      }

      categories[page.category].count++;
      categories[page.category].patterns.push(page);
      categories[page.category].complexities[page.complexity] = 
        (categories[page.category].complexities[page.complexity] || 0) + 1;
      categories[page.category].codeTypes[page.codeBlock.type] = 
        (categories[page.category].codeTypes[page.codeBlock.type] || 0) + 1;
    });

    // Calculate average performance per category
    Object.values(categories).forEach(category => {
      const totalOps = category.patterns.reduce((sum, p) => sum + p.performance.opsPerSec, 0);
      category.avgPerformance = Math.round(totalOps / category.patterns.length);
    });

    // Calculate overall performance metrics
    const allOpsPerSec = patternPages.map(p => p.performance.opsPerSec);
    const performanceMetrics = {
      peakOpsPerSec: Math.max(...allOpsPerSec),
      avgOpsPerSec: Math.round(allOpsPerSec.reduce((sum, ops) => sum + ops, 0) / allOpsPerSec.length),
      fastestPattern: patternPages.find(p => p.performance.opsPerSec === Math.max(...allOpsPerSec))?.title || '',
      slowestPattern: patternPages.find(p => p.performance.opsPerSec === Math.min(...allOpsPerSec))?.title || '',
    };

    return {
      total: patternPages.length,
      categories,
      patterns: patternPages,
      metadata: {
        totalTags: allTags.size,
        uniqueTags: Array.from(allTags).sort(),
        codeTypes: Array.from(codeTypes),
        complexityDistribution,
        performanceMetrics,
      },
    };
  }

  /**
   * Generate LLM-optimized context for wiki
   */
  generateLLMContext(wikiData: PatternWikiData): string {
    return this.patternSystem.generateLLMContext({
      includePatterns: true,
      includeCodeBlocks: true,
      maxPatterns: wikiData.total,
    });
  }

  /**
   * Generate pattern matching guide
   */
  generatePatternMatchingGuide(wikiData: PatternWikiData): string {
    let guide = `# Factory-Wager Pattern Matching Guide\n\n`;
    
    guide += `## Pattern Categories\n\n`;
    
    Object.entries(wikiData.categories).forEach(([category, data]) => {
      guide += `### ${category.toUpperCase()}\n`;
      guide += `- **Count**: ${data.count} patterns\n`;
      guide += `- **Avg Performance**: ${data.avgPerformance.toLocaleString()} ops/s\n`;
      guide += `- **Complexities**: ${Object.entries(data.complexities).map(([c, count]) => `${c} (${count})`).join(', ')}\n`;
      guide += `- **Code Types**: ${Object.keys(data.codeTypes).join(', ')}\n\n`;
    });

    guide += `## Pattern Recognition Matrix\n\n`;
    guide += `| Use Case | Pattern Template | Complexity | Code Type | Performance |\n`;
    guide += `|----------|------------------|------------|-----------|-------------|\n`;
    
    wikiData.patterns.forEach(pattern => {
      const template = pattern.patterns[0]?.replace(/\{[^}]+\}/g, '{}') || '';
      guide += `| ${pattern.useCase} | \`${template}\` | ${pattern.complexity} | ${pattern.codeBlock.type} | ${pattern.performance.opsPerSec.toLocaleString()} ops/s |\n`;
    });

    guide += `\n## Tag-Based Filtering\n\n`;
    guide += `### Available Tags (${wikiData.metadata.totalTags})\n`;
    guide += wikiData.metadata.uniqueTags.map(tag => `- \`${tag}\``).join('\n');

    guide += `\n\n### Popular Tag Combinations\n`;
    const tagCombinations = [
      ['ab-testing', 'cookie'],
      ['r2', 'upload'],
      ['performance', 'benchmark'],
      ['s3', 'presign'],
      ['subdomain', 'routing']
    ];

    tagCombinations.forEach(combo => {
      const matchingPatterns = wikiData.patterns.filter(p => 
        combo.every(tag => p.tags.includes(tag))
      );
      if (matchingPatterns.length > 0) {
        guide += `- **${combo.join(' + ')}**: ${matchingPatterns.length} patterns\n`;
      }
    });

    return guide;
  }

  /**
   * Generate markdown wiki
   */
  generateMarkdownWiki(wikiData: PatternWikiData): string {
    const header = `# Factory-Wager Pattern-Enhanced Wiki

> Auto-generated wiki for Factory-Wager one-liners with pattern tags, code blocks, and LLM-optimized context.

## Overview

- **Total Patterns**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Unique Tags**: ${wikiData.metadata.totalTags}
- **Code Types**: ${wikiData.metadata.codeTypes.length}
- **Last Updated**: ${new Date().toISOString()}

## Performance Metrics

- **Peak Performance**: ${wikiData.metadata.performanceMetrics.peakOpsPerSec.toLocaleString()} ops/s
- **Average Performance**: ${wikiData.metadata.performanceMetrics.avgOpsPerSec.toLocaleString()} ops/s
- **Fastest Pattern**: ${wikiData.metadata.performanceMetrics.fastestPattern}
- **Slowest Pattern**: ${wikiData.metadata.performanceMetrics.slowestPattern}

## Complexity Distribution

${Object.entries(wikiData.metadata.complexityDistribution)
  .map(([complexity, count]) => `- **${complexity}**: ${count} patterns`)
  .join('\n')}

## Categories

`;

    const categorySections = Object.entries(wikiData.categories)
      .map(([category, data]) => {
        const tableHeader = `### ${category.toUpperCase()}

${data.count} patterns in this category.

**Average Performance**: ${data.avgPerformance.toLocaleString()} ops/s

**Complexities**: ${Object.entries(data.complexities).map(([c, count]) => `${c} (${count})`).join(', ')}

**Code Types**: ${Object.keys(data.codeTypes).join(', ')}

| Pattern | Tags | Complexity | Code Type | Performance | Use Case |
|---------|------|------------|-----------|-------------|----------|
`;
        const tableRows = data.patterns
          .map(pattern => {
            const tags = pattern.tags.slice(0, 3).map(t => `\`${t}\``).join(', ');
            const moreTags = pattern.tags.length > 3 ? ` +${pattern.tags.length - 3}` : '';
            return `| ${pattern.name} | ${tags}${moreTags} | ${pattern.complexity} | ${pattern.codeBlock.type} | ${pattern.performance.opsPerSec.toLocaleString()} ops/s | ${pattern.useCase} |`;
          })
          .join('\n');

        return tableHeader + tableRows + '\n';
      })
      .join('\n');

    const detailedPatterns = wikiData.patterns
      .map(pattern => {
        let section = `### ${pattern.name}

**ID**: \`${pattern.title.split(' ').pop().replace(')', '')}\`
**Category**: \`${pattern.category}\`
**Complexity**: \`${pattern.complexity}\`
**Tags**: ${pattern.tags.map(tag => `\`${tag}\``).join(', ')}
**Use Case**: ${pattern.useCase}
**Dependencies**: ${pattern.dependencies.join(', ')}

#### Command

\`\`\`bash
${pattern.command}
\`\`\`

#### Pattern Template

\`\`\`${pattern.codeBlock.type}
${pattern.codeBlock.template}
\`\`\`
**Variables**: ${pattern.codeBlock.variables.map(v => `\`${v}\``).join(', ')}

#### Patterns

${pattern.patterns.map(p => `- \`${p}\``).join('\n')}

#### Performance

- **Average Time**: ${pattern.performance.avgTime}ms
- **Operations/sec**: ${pattern.performance.opsPerSec.toLocaleString()}
- **Reliability**: ${pattern.performance.reliability}

---

`;
        return section;
      })
      .join('');

    const llmContextSection = DEFAULT_CONFIG.includeLLMContext ? `
## LLM-Optimized Context

${this.generateLLMContext(wikiData)}
` : '';

    const patternGuideSection = `
## Pattern Matching Guide

${this.generatePatternMatchingGuide(wikiData)}
`;

    const usageGuide = `## Usage Guide

### How to Use This Wiki

1. **Pattern Discovery**: Use categories to find relevant patterns
2. **Tag-Based Filtering**: Search by tags for specific use cases
3. **Complexity Selection**: Choose patterns based on skill level
4. **Performance Considerations**: Review ops/sec for optimization needs
5. **Template Usage**: Use variables \`\${variable}\` for customization

### Integration with Development

1. **Code Templates**: Copy pattern templates for quick implementation
2. **Performance Benchmarking**: Use provided metrics for optimization
3. **LLM Integration**: Use LLM context for AI-assisted development
4. **Documentation**: Link specific patterns to internal documentation

### Contributing

To add new patterns:

1. Update \`factory-wager-oneliners-patterns-v38.ts\`
2. Run this generator to update wiki pages
3. Review and commit the changes

---

*Generated by Factory-Wager Pattern Wiki Generator on ${new Date().toISOString()}*`;

    return header + categorySections + '\n## Detailed Patterns\n\n' + detailedPatterns + llmContextSection + patternGuideSection + usageGuide;
  }

  /**
   * Generate HTML wiki
   */
  generateHTMLWiki(wikiData: PatternWikiData): string {
    const HTML_STYLES = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
.container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
.title { color: #212529; font-size: 2.5em; margin: 0; }
.subtitle { color: #6c757d; font-size: 1.1em; margin: 10px 0 0 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
.stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
.stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
.stat-label { color: #6c757d; margin-top: 5px; }
.category { margin: 30px 0; }
.category-title { color: #495057; font-size: 1.5em; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
.pattern-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
.pattern-table th, .pattern-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
.pattern-table th { background: #f8f9fa; font-weight: 600; }
.pattern-table a { color: #007bff; text-decoration: none; }
.pattern-table a:hover { text-decoration: underline; }
.tag { background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-right: 4px; }
.complexity-simple { color: #28a745; font-weight: bold; }
.complexity-intermediate { color: #ffc107; font-weight: bold; }
.complexity-advanced { color: #dc3545; font-weight: bold; }
.performance { font-family: monospace; color: #6c757d; }
.pattern-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
.command { background: #212529; color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
.template { background: #e9ecef; padding: 15px; border-radius: 4px; font-family: monospace; }
.footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center; }
`.trim();

    const categorySections = Object.entries(wikiData.categories)
      .map(([category, data]) => {
        const rows = data.patterns
          .map(pattern => {
            const tags = pattern.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('');
            const moreTags = pattern.tags.length > 3 ? `<span class="tag">+${pattern.tags.length - 3}</span>` : '';
            const complexityClass = `complexity-${pattern.complexity}`;
            return `          <tr>
            <td>${pattern.name}</td>
            <td>${tags}${moreTags}</td>
            <td><span class="${complexityClass}">${pattern.complexity}</span></td>
            <td>${pattern.codeBlock.type}</td>
            <td><span class="performance">${pattern.performance.opsPerSec.toLocaleString()} ops/s</span></td>
            <td>${pattern.useCase}</td>
          </tr>`;
          })
          .join('\n');

        return `    <div class="category">
      <h2 class="category-title">${category.toUpperCase()}</h2>
      <p>${data.count} patterns • Average performance: <strong>${data.avgPerformance.toLocaleString()} ops/s</strong></p>
      <table class="pattern-table">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Tags</th>
            <th>Complexity</th>
            <th>Code Type</th>
            <th>Performance</th>
            <th>Use Case</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>`;
      })
      .join('\n\n');

    const detailedPatterns = wikiData.patterns
      .map(pattern => `
    <div class="pattern-details">
      <h3>${pattern.name}</h3>
      <p><strong>Category:</strong> ${pattern.category} | <strong>Complexity:</strong> <span class="complexity-${pattern.complexity}">${pattern.complexity}</span> | <strong>Performance:</strong> <span class="performance">${pattern.performance.opsPerSec.toLocaleString()} ops/s</span></p>
      
      <h4>Command</h4>
      <div class="command">${pattern.command}</div>
      
      <h4>Template</h4>
      <div class="template">${pattern.codeBlock.template}</div>
      <p><strong>Variables:</strong> ${pattern.codeBlock.variables.map(v => `<code>${v}</code>`).join(', ')}</p>
      
      <p><strong>Use Case:</strong> ${pattern.useCase}</p>
      <p><strong>Tags:</strong> ${pattern.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
    </div>
      `).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factory-Wager Pattern Wiki</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Factory-Wager Pattern Wiki</h1>
      <p class="subtitle">Pattern-enhanced one-liners with tags, code blocks, and LLM-optimized context</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${wikiData.total}</div>
        <div class="stat-label">Total Patterns</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${Object.keys(wikiData.categories).length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${wikiData.metadata.totalTags}</div>
        <div class="stat-label">Unique Tags</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${wikiData.metadata.performanceMetrics.peakOpsPerSec.toLocaleString()}</div>
        <div class="stat-label">Peak Ops/sec</div>
      </div>
    </div>

${categorySections}

    <h2>Detailed Patterns</h2>
${detailedPatterns}

    <div class="footer">
      <p>Generated by Factory-Wager Pattern Wiki Generator on ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate JSON wiki
   */
  generateJSONWiki(wikiData: PatternWikiData): string {
    const jsonData = {
      metadata: {
        total: wikiData.total,
        categories: Object.keys(wikiData.categories).length,
        tags: wikiData.metadata.totalTags,
        codeTypes: wikiData.metadata.codeTypes.length,
        generated: new Date().toISOString(),
        version: '3.8.0',
        performance: wikiData.metadata.performanceMetrics,
      },
      categories: wikiData.categories,
      patterns: wikiData.patterns,
      llm_context: DEFAULT_CONFIG.includeLLMContext ? this.generateLLMContext(wikiData) : undefined,
      pattern_matching_guide: this.generatePatternMatchingGuide(wikiData),
      api: {
        base_url: 'https://wiki.factory-wager.com/api/v1',
        endpoints: {
          list_patterns: '/patterns',
          get_pattern: '/patterns/{id}',
          search_patterns: '/search?q={query}',
          category: '/categories/{category}',
          tags: '/tags/{tag}',
          complexity: '/complexity/{level}',
        },
      },
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Create all wiki files
   */
  async createWikiFiles(config: Partial<WikiConfig> = {}): Promise<void> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const outputDir = './factory-wager-pattern-wiki';
    const wikiData = this.generatePatternWikiData(config);

    console.log('🏷️ Generating Factory-Wager Pattern Wiki files...');
    console.log(`  Base URL: ${finalConfig.baseUrl}`);
    console.log(`  Workspace: ${finalConfig.workspace}`);
    console.log(`  Format: ${finalConfig.format}`);
    console.log(`  Patterns: ${wikiData.total}`);

    // Ensure output directory exists
    await Bun.write(`${outputDir}/.gitkeep`, '');

    const shouldWrite = (fmt: OutputFormat) =>
      finalConfig.format === fmt || finalConfig.format === 'all';

    if (shouldWrite('markdown')) {
      await Bun.write(`${outputDir}/factory-wager-patterns-wiki.md`, this.generateMarkdownWiki(wikiData));
      console.log('  Created: factory-wager-patterns-wiki.md');
    }

    if (shouldWrite('html')) {
      await Bun.write(`${outputDir}/factory-wager-patterns-wiki.html`, this.generateHTMLWiki(wikiData));
      console.log('  Created: factory-wager-patterns-wiki.html');
    }

    if (shouldWrite('json')) {
      await Bun.write(`${outputDir}/factory-wager-patterns-wiki.json`, this.generateJSONWiki(wikiData));
      console.log('  Created: factory-wager-patterns-wiki.json');
    }

    // Create LLM-specific files
    if (finalConfig.includeLLMContext) {
      await Bun.write(`${outputDir}/llm-optimized-context.md`, this.generateLLMContext(wikiData));
      console.log('  Created: llm-optimized-context.md');
    }

    await Bun.write(`${outputDir}/pattern-matching-guide.md`, this.generatePatternMatchingGuide(wikiData));
    console.log('  Created: pattern-matching-guide.md');

    // Create README
    const readmeContent = `# Factory-Wager Pattern Wiki

## Generated Files

- **factory-wager-patterns-wiki.md** - Markdown format for documentation systems
- **factory-wager-patterns-wiki.html** - HTML format for web viewing
- **factory-wager-patterns-wiki.json** - JSON format for API integration
- **llm-optimized-context.md** - LLM-optimized context for AI consumption
- **pattern-matching-guide.md** - Pattern recognition and matching guide

## Statistics

- **Total Patterns**: ${wikiData.total}
- **Categories**: ${Object.keys(wikiData.categories).length}
- **Unique Tags**: ${wikiData.metadata.totalTags}
- **Peak Performance**: ${wikiData.metadata.performanceMetrics.peakOpsPerSec.toLocaleString()} ops/s
- **Generated**: ${new Date().toISOString()}

## Features

- **Pattern Tags**: Rich categorization with 37+ unique tags
- **Code Templates**: Reusable templates with variable substitution
- **Performance Metrics**: Detailed performance benchmarking
- **LLM Optimization**: Context optimized for AI consumption
- **Complexity Levels**: Progressive difficulty (simple → intermediate → advanced)
- **Multiple Formats**: Markdown, HTML, JSON for different use cases

## Usage

### Development Integration
- Use pattern templates for quick implementation
- Reference performance metrics for optimization
- Apply tag-based filtering for pattern discovery
- Leverage LLM context for AI-assisted development

### Documentation Systems
- Import markdown files into Confluence, Notion, or similar
- Use HTML files for web-based documentation
- Integrate JSON files via API for custom solutions

---

*Generated by Factory-Wager Pattern Wiki Generator*`;

    await Bun.write(`${outputDir}/README.md`, readmeContent);
    console.log('  Created: README.md');
    console.log(`\n🎉 Pattern Wiki files created in '${outputDir}/'`);
  }
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
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '--tags':
        options.tags = args[++i];
        break;
      case '--complexity':
        options.complexity = args[++i];
        break;
      case '--code-type':
        options.codeType = args[++i];
        break;
      case '--no-patterns':
        options['no-patterns'] = true;
        break;
      case '--no-codeblocks':
        options['no-codeblocks'] = true;
        break;
      case '--no-performance':
        options['no-performance'] = true;
        break;
      case '--no-llm-context':
        options['no-llm-context'] = true;
        break;
      case '--max-patterns':
        options['max-patterns'] = parseInt(args[++i]);
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
🏷️ Factory-Wager Pattern Wiki Generator CLI

Usage: bun factory-wager-wiki-generator-patterns.ts [options]

Options:
  --format <format>        Output format: markdown, html, json, all (default: markdown)
  --base-url <url>         Base URL for wiki (default: https://wiki.factory-wager.com)
  --workspace <name>       Workspace name (default: factory-wager-patterns)
  --category <category>    Generate specific category only
  --pattern <pattern>      Generate specific pattern only
  --tags <tags>            Filter by tags (comma-separated)
  --complexity <level>     Filter by complexity: simple, intermediate, advanced
  --code-type <type>       Filter by code type: curl, bun-e, r2, s3, crypto, fetch
  --no-patterns            Exclude pattern templates
  --no-codeblocks          Exclude code block templates
  --no-performance         Exclude performance metrics
  --no-llm-context         Exclude LLM-optimized context
  --max-patterns <num>     Limit number of patterns
  --help, -h               Show this help

Examples:
  bun factory-wager-wiki-generator-patterns.ts                          # Generate all pattern wiki (markdown)
  bun factory-wager-wiki-generator-patterns.ts --format all             # Generate all formats
  bun factory-wager-wiki-generator-patterns.ts --category s3-presign    # Generate S3 presign patterns only
  bun factory-wager-wiki-generator-patterns.ts --tags "s3,presign"     # Generate patterns with specific tags
  bun factory-wager-wiki-generator-patterns.ts --complexity advanced   # Generate advanced patterns only

Categories: cookies, r2, cdn, subdomains, profiling, s3-presign, performance
Code Types: curl, bun-e, r2, s3, crypto, fetch
Complexity Levels: simple, intermediate, advanced
`);
}

async function main(): Promise<void> {
  console.log('🏷️ Factory-Wager Pattern Wiki Generator');
  console.log('='.repeat(60));

  const options = parseCLIArgs();
  const generator = new FactoryWagerPatternWikiGenerator();

  // Build config from CLI options
  const config: Partial<WikiConfig> = {
    format: options.format,
    baseUrl: options.baseUrl,
    workspace: options.workspace,
    includePatterns: !options['no-patterns'],
    includeCodeBlocks: !options['no-codeblocks'],
    includePerformance: !options['no-performance'],
    includeLLMContext: !options['no-llm-context'],
  };

  // Apply filters
  if (options.category) config.category = options.category;
  if (options.codeType) config.codeType = options.codeType;
  if (options.complexity) config.complexity = options.complexity;

  await generator.createWikiFiles(config);
  console.log('\n✅ Done.');
}

// ============================================================================
// EXPORTS & ENTRY
// ============================================================================

export {
  FactoryWagerPatternWikiGenerator,
};

if (import.meta.main) {
  main().catch(err => {
    console.error('Pattern wiki generation failed:', err);
    process.exit(1);
  });
}
