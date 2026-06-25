// examples/wiki-template-cli.ts - Command-line interface for wiki template system

#!/usr/bin/env bun

import { MCPWikiGenerator, WikiTemplate, WikiGenerationRequest } from '../lib/mcp/wiki-generator-mcp';
import { DocumentationProvider } from '../lib/docs/constants/enums';
import { MultiThreadedWikiGenerator } from '../lib/mcp/multi-threaded-wiki-generator';
import { AdvancedCacheManager } from '../lib/utils/advanced-cache-manager';
import { R2WikiStorage } from '../lib/mcp/r2-wiki-storage';

interface CLIOptions {
  action: 'list' | 'register' | 'generate' | 'score' | 'benchmark' | 'analytics' | 'clear';
  template?: string;
  format?: 'markdown' | 'html' | 'json' | 'all';
  workspace?: string;
  provider?: string;
  output?: string;
  concurrent?: number;
  verbose?: boolean;
}

class WikiTemplateCLI {
  private generator: MultiThreadedWikiGenerator;
  private cacheManager: AdvancedCacheManager;
  private r2Storage: R2WikiStorage;

  constructor() {
    this.generator = new MultiThreadedWikiGenerator({
      minWorkers: 2,
      maxWorkers: 4,
      workerScript: new URL('../lib/mcp/wiki-worker.ts', import.meta.url).href,
      taskTimeout: 30000,
      maxRetries: 3
    });

    this.cacheManager = new AdvancedCacheManager({
      maxSize: 100,
      defaultTTL: 300000,
      enableCompression: true
    });

    this.r2Storage = new R2WikiStorage({
      bucket: 'wiki-templates',
      prefix: 'cli-generated',
      enableVersioning: true,
      enableCompression: true
    });
  }

  async shutdown() {
    await this.generator.shutdown();
  }

  private log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m'     // Yellow
    };
    const reset = '\x1b[0m';
    
    console.info(`${colors[level]}${message}${reset}`);
  }

  private async parseOptions(): Promise<CLIOptions> {
    const args = process.argv.slice(2);
    const options: Partial<CLIOptions> = {};

    // Parse action
    const action = args[0];
    if (!action || !['list', 'register', 'generate', 'score', 'benchmark', 'analytics', 'clear'].includes(action)) {
      this.showUsage();
      process.exit(1);
    }
    options.action = action as any;

    // Parse flags
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      if (arg.startsWith('--')) {
        const flag = arg.slice(2);
        
        switch (flag) {
          case 'template':
            options.template = nextArg;
            i++;
            break;
          case 'format':
            options.format = nextArg as any;
            i++;
            break;
          case 'workspace':
            options.workspace = nextArg;
            i++;
            break;
          case 'provider':
            options.provider = nextArg;
            i++;
            break;
          case 'output':
            options.output = nextArg;
            i++;
            break;
          case 'concurrent':
            options.concurrent = parseInt(nextArg);
            i++;
            break;
          case 'verbose':
            options.verbose = true;
            break;
          case 'help':
            this.showUsage();
            process.exit(0);
            break;
        }
      }
    }

    return options as CLIOptions;
  }

  private showUsage() {
    console.info(`
Wiki Template System CLI

Usage: bun run examples/wiki-template-cli.ts <action> [options]

Actions:
  list                    List all registered templates
  register                Register a new template (interactive)
  generate                Generate wiki content from a template
  score                   Calculate scores for a template
  benchmark              Run performance benchmarks
  analytics              Show system analytics
  clear                  Clear all caches

Options:
  --template <name>       Template name (for generate, score)
  --format <format>       Output format: markdown, html, json, all
  --workspace <path>      Workspace path
  --provider <provider>   Documentation provider
  --output <file>         Output file path
  --concurrent <number>   Number of concurrent operations (for benchmark)
  --verbose               Enable verbose logging
  --help                  Show this help message

Examples:
  # List all templates
  bun run examples/wiki-template-cli.ts list

  # Generate content from a template
  bun run examples/wiki-template-cli.ts generate --template "My Template" --format markdown --output ./output.md

  # Run benchmarks
  bun run examples/wiki-template-cli.ts benchmark --concurrent 10 --verbose

  # Calculate template scores
  bun run examples/wiki-template-cli.ts score --template "My Template"

  # Show analytics
  bun run examples/wiki-template-cli.ts analytics
    `);
  }

  async listTemplates() {
    const templates = MCPWikiGenerator.getWikiTemplates();
    const analytics = MCPWikiGenerator.getTemplateAnalytics();

    this.log(`\n📋 Registered Templates (${templates.length})`, 'info');
    this.log('─'.repeat(60), 'info');

    templates.forEach(template => {
      const metrics = template.performanceMetrics;
      const usage = metrics?.usageCount || 0;
      const successRate = metrics?.successRate ? `${Math.round(metrics.successRate * 100)}%` : 'N/A';
      
      console.info(`
\033[1m${template.name}\033[0m
  Description: ${template.description}
  Provider: ${template.provider}
  Format: ${template.format}
  Category: ${template.category}
  Priority: ${template.priority}
  Workspace: ${template.workspace}
  Usage: ${usage} times
  Success Rate: ${successRate}
  ${template.tags ? `Tags: ${template.tags.join(', ')}` : ''}
      `);
    });

    this.log(`\n📊 Analytics Summary`, 'info');
    this.log(`Total Templates: ${analytics.totalTemplates}`, 'info');
    this.log(`Custom Templates: ${analytics.customTemplates}`, 'info');
    this.log(`Default Templates: ${analytics.defaultTemplates}`, 'info');
  }

  async registerTemplate() {
    this.log('\n📝 Register New Template (Interactive)', 'info');

    // Simple interactive template registration
    const questions = [
      { key: 'name', prompt: 'Template name:', required: true },
      { key: 'description', prompt: 'Description:', required: true },
      { key: 'provider', prompt: 'Provider (CONFLUENCE/GITBOOK/NOTION/SLACK):', required: true },
      { key: 'workspace', prompt: 'Workspace path:', required: true },
      { key: 'format', prompt: 'Format (markdown/html/json/all):', required: true },
      { key: 'category', prompt: 'Category (api/documentation/tutorial/reference/guide):', required: false },
      { key: 'priority', prompt: 'Priority (low/medium/high/critical):', required: false },
      { key: 'tags', prompt: 'Tags (comma-separated):', required: false }
    ];

    const templateData: any = {};

    for (const question of questions) {
      // In a real CLI, you'd use a proper prompt library
      // For now, we'll use environment variables or defaults
      const envKey = `WIKI_TEMPLATE_${question.key.toUpperCase()}`;
      const value = process.env[envKey] || this.getDefaultValue(question.key);
      
      if (question.required && !value) {
        this.log(`Error: ${question.prompt} is required. Set environment variable ${envKey}`, 'error');
        process.exit(1);
      }
      
      templateData[question.key] = value;
    }

    // Parse arrays and enums
    if (templateData.tags) {
      templateData.tags = templateData.tags.split(',').map((t: string) => t.trim());
    }

    if (templateData.provider) {
      const provider = templateData.provider.toUpperCase();
      if (!Object.values(DocumentationProvider).includes(provider as any)) {
        this.log(`Error: Invalid provider "${provider}"`, 'error');
        process.exit(1);
      }
      templateData.provider = provider as DocumentationProvider;
    }

    const template: WikiTemplate = {
      name: templateData.name,
      description: templateData.description,
      provider: templateData.provider,
      workspace: templateData.workspace,
      format: templateData.format,
      includeExamples: true,
      category: templateData.category || 'custom',
      priority: templateData.priority || 'medium',
      tags: templateData.tags || [],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      MCPWikiGenerator.registerCustomTemplate(template);
      this.log(`✅ Template "${template.name}" registered successfully!`, 'success');
    } catch (error) {
      this.log(`❌ Failed to register template: ${(error as Error).message}`, 'error');
    }
  }

  private getDefaultValue(key: string): string {
    const defaults = {
      name: 'CLI Template',
      description: 'Template created via CLI',
      provider: 'CONFLUENCE',
      workspace: 'cli/workspace',
      format: 'markdown',
      category: 'custom',
      priority: 'medium',
      tags: 'cli, generated'
    };
    return defaults[key as keyof typeof defaults] || '';
  }

  async generateContent(options: CLIOptions) {
    if (!options.template) {
      this.log('Error: --template is required for generate action', 'error');
      process.exit(1);
    }

    this.log(`\n🚀 Generating content from template: ${options.template}`, 'info');

    try {
      const request: WikiGenerationRequest = {
        format: options.format || 'markdown',
        workspace: options.workspace,
        includeExamples: true,
        context: 'Generated via CLI'
      };

      const startTime = Date.now();
      const result = await MCPWikiGenerator.generateWikiContent(options.template, request);
      const endTime = Date.now();

      if (result.success) {
        this.log(`✅ Content generated successfully in ${endTime - startTime}ms`, 'success');
        
        // Output to file if specified
        if (options.output) {
          const content = result.files[request.format] || result.files.markdown;
          await Bun.write(options.output, content || '');
          this.log(`📄 Content saved to: ${options.output}`, 'info');
        } else {
          // Output to console
          const content = result.files[request.format] || result.files.markdown;
          console.info('\n--- Generated Content ---');
          console.info(content);
          console.info('--- End Content ---\n');
        }

        // Show metadata
        this.log('\n📊 Generation Metadata:', 'info');
        console.info(`  Total sections: ${result.metadata.total}`);
        console.info(`  Categories: ${result.metadata.categories}`);
        console.info(`  Generated: ${result.metadata.generated}`);
      } else {
        this.log(`❌ Generation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error generating content: ${(error as Error).message}`, 'error');
    }
  }

  async calculateScores(options: CLIOptions) {
    if (!options.template) {
      this.log('Error: --template is required for score action', 'error');
      process.exit(1);
    }

    this.log(`\n📈 Calculating scores for template: ${options.template}`, 'info');

    try {
      const startTime = Date.now();
      const scores = await MCPWikiGenerator.scoreCrossReferences(options.template);
      const endTime = Date.now();

      this.log(`✅ Scores calculated in ${endTime - startTime}ms`, 'success');

      // Display scores
      console.info('\n--- Template Scores ---');
      console.info(`Overall Relevance: ${Math.round((scores.overallScore?.relevanceScore || 0) * 100)}%`);
      console.info(`Content Quality: ${Math.round((scores.overallScore?.contentQualityScore || 0) * 100)}%`);
      console.info(`Performance Score: ${Math.round((scores.overallScore?.performanceScore || 0) * 100)}%`);
      console.info(`Combined Score: ${Math.round((scores.overallScore?.combinedScore || 0) * 100)}%`);

      if (scores.rssFeedItems.length > 0) {
        console.info(`\n📡 RSS Feed Items (${scores.rssFeedItems.length}):`);
        scores.rssFeedItems.slice(0, 5).forEach((item: any, index: number) => {
          console.info(`  ${index + 1}. ${item.title} (${Math.round(item.relevanceScore * 100)}% relevance)`);
        });
      }

      if (scores.relatedTemplates.length > 0) {
        console.info(`\n🔗 Related Templates (${scores.relatedTemplates.length}):`);
        scores.relatedTemplates.forEach((template: any, index: number) => {
          console.info(`  ${index + 1}. ${template.templateName} (${Math.round(template.similarityScore * 100)}% similar)`);
        });
      }

      console.info('--- End Scores ---\n');
    } catch (error) {
      this.log(`❌ Error calculating scores: ${(error as Error).message}`, 'error');
    }
  }

  async runBenchmark(options: CLIOptions) {
    const concurrent = options.concurrent || 10;
    this.log(`\n⚡ Running benchmark with ${concurrent} concurrent operations`, 'info');

    try {
      const templates = MCPWikiGenerator.getWikiTemplates();
      if (templates.length === 0) {
        this.log('No templates available for benchmarking', 'warn');
        return;
      }

      // Sequential benchmark
      this.log('Running sequential benchmark...', 'info');
      const sequentialStart = Date.now();
      for (let i = 0; i < concurrent; i++) {
        const template = templates[i % templates.length];
        await MCPWikiGenerator.generateWikiContent(template.name, {
          format: 'markdown',
          workspace: `benchmark/sequential-${i}`
        });
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Concurrent benchmark
      this.log('Running concurrent benchmark...', 'info');
      const concurrentStart = Date.now();
      const concurrentPromises = Array.from({ length: concurrent }, (_, i) => {
        const template = templates[i % templates.length];
        return this.generator.generateWikiContent(template, {
          format: 'markdown',
          workspace: `benchmark/concurrent-${i}`
        });
      });

      const concurrentResults = await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStart;

      // Calculate results
      const speedup = sequentialTime / concurrentTime;
      const successRate = concurrentResults.filter(r => r.success).length / concurrentResults.length;
      const stats = this.generator.getStats();

      this.log('✅ Benchmark completed', 'success');
      console.info('\n--- Benchmark Results ---');
      console.info(`Sequential Time: ${sequentialTime}ms`);
      console.info(`Concurrent Time: ${concurrentTime}ms`);
      console.info(`Speedup: ${speedup.toFixed(2)}x`);
      console.info(`Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.info(`Throughput: ${stats.throughputPerSecond.toFixed(2)} tasks/sec`);
      console.info(`Active Workers: ${stats.activeWorkers}/${stats.totalWorkers}`);
      console.info('--- End Results ---\n');

      if (options.verbose) {
        console.info('\n--- Detailed Stats ---');
        console.info(JSON.stringify(stats, null, 2));
        console.info('--- End Stats ---\n');
      }
    } catch (error) {
      this.log(`❌ Benchmark failed: ${(error as Error).message}`, 'error');
    }
  }

  async showAnalytics() {
    this.log('\n📊 System Analytics', 'info');

    try {
      const analytics = MCPWikiGenerator.getTemplateAnalytics();
      const cacheStats = this.cacheManager.getStats();
      const generatorStats = this.generator.getStats();

      console.info('\n--- Template Analytics ---');
      console.info(`Total Templates: ${analytics.totalTemplates}`);
      console.info(`Custom Templates: ${analytics.customTemplates}`);
      console.info(`Default Templates: ${analytics.defaultTemplates}`);

      console.info('\n--- Categories ---');
      Object.entries(analytics.categories).forEach(([category, count]) => {
        console.info(`${category}: ${count}`);
      });

      console.info('\n--- Providers ---');
      Object.entries(analytics.providers).forEach(([provider, count]) => {
        console.info(`${provider}: ${count}`);
      });

      console.info('\n--- Cache Statistics ---');
      console.info(`Hits: ${cacheStats.hits}`);
      console.info(`Misses: ${cacheStats.misses}`);
      console.info(`Sets: ${cacheStats.sets}`);
      console.info(`Hit Rate: ${cacheStats.hits > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) : 0}%`);
      console.info(`Memory Usage: ${(cacheStats.memoryUsage / 1024).toFixed(2)} KB`);

      console.info('\n--- Generator Statistics ---');
      console.info(`Total Workers: ${generatorStats.totalWorkers}`);
      console.info(`Active Workers: ${generatorStats.activeWorkers}`);
      console.info(`Completed Tasks: ${generatorStats.completedTasks}`);
      console.info(`Failed Tasks: ${generatorStats.failedTasks}`);
      console.info(`Throughput: ${generatorStats.throughputPerSecond.toFixed(2)} tasks/sec`);
      console.info('--- End Analytics ---\n');
    } catch (error) {
      this.log(`❌ Failed to get analytics: ${(error as Error).message}`, 'error');
    }
  }

  async clearCaches() {
    this.log('\n🧹 Clearing all caches...', 'info');

    try {
      MCPWikiGenerator.clearCache();
      await this.cacheManager.clear();
      
      this.log('✅ All caches cleared successfully!', 'success');
    } catch (error) {
      this.log(`❌ Failed to clear caches: ${(error as Error).message}`, 'error');
    }
  }

  async run() {
    try {
      const options = await this.parseOptions();

      switch (options.action) {
        case 'list':
          await this.listTemplates();
          break;
        case 'register':
          await this.registerTemplate();
          break;
        case 'generate':
          await this.generateContent(options);
          break;
        case 'score':
          await this.calculateScores(options);
          break;
        case 'benchmark':
          await this.runBenchmark(options);
          break;
        case 'analytics':
          await this.showAnalytics();
          break;
        case 'clear':
          await this.clearCaches();
          break;
      }
    } catch (error) {
      this.log(`❌ CLI Error: ${(error as Error).message}`, 'error');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const cli = new WikiTemplateCLI();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.info('\n👋 Shutting down gracefully...');
    await cli.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.info('\n👋 Shutting down gracefully...');
    await cli.shutdown();
    process.exit(0);
  });

  await cli.run();
  await cli.shutdown();
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
