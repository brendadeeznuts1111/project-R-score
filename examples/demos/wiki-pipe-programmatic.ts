#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Matrix - Programmatic Usage Example
 * 
 * Demonstrates how to use the wiki matrix pipe system programmatically
 * with TypeScript and Bun's stdin capabilities.
 */

import { spawn } from 'bun';

class WikiMatrixClient {
  private scriptPath: string;

  constructor() {
    this.scriptPath = './scripts/wiki-matrix-pipe.ts';
  }

  async executeCommand(action: string, params?: any, format: string = 'table'): Promise<string> {
    const command = {
      action,
      params,
      format
    };

    const process = spawn({
      cmd: ['bun', 'run', '-'],
      cwd: import.meta.dir + '/..',
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe'
    });

    // Write command to stdin
    const writer = process.stdin.getWriter();
    await writer.write(JSON.stringify(command));
    await writer.end();

    // Read output
    const output = await new Response(process.stdout).text();
    const error = await new Response(process.stderr).text();

    if (error && !output) {
      throw new Error(`Wiki matrix error: ${error}`);
    }

    return output;
  }

  async getMatrix(format: string = 'table'): Promise<any> {
    const output = await this.executeCommand('matrix', undefined, format);
    return format === 'json' ? JSON.parse(output) : output;
  }

  async getTemplateDetails(index: number, format: string = 'table'): Promise<any> {
    const output = await this.executeCommand('details', { index }, format);
    return format === 'json' ? JSON.parse(output) : output;
  }

  async getComparison(format: string = 'table'): Promise<any> {
    const output = await this.executeCommand('compare', undefined, format);
    return format === 'json' ? JSON.parse(output) : output;
  }

  async getStatistics(format: string = 'table'): Promise<any> {
    const output = await this.executeCommand('stats', undefined, format);
    return format === 'json' ? JSON.parse(output) : output;
  }

  async getTemplates(format: string = 'table'): Promise<any> {
    const output = await this.executeCommand('templates', undefined, format);
    return format === 'json' ? JSON.parse(output) : output;
  }

  async searchTemplates(query: string): Promise<any[]> {
    const templates = await this.getTemplates('json');
    return templates.filter((template: any) => 
      template.name.toLowerCase().includes(query.toLowerCase()) ||
      template.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getTemplatesByFormat(format: string): Promise<any[]> {
    const templates = await this.getTemplates('json');
    return templates.filter((template: any) => template.format === format);
  }

  async exportToCSV(filename: string): Promise<void> {
    const csv = await this.executeCommand('matrix', undefined, 'csv');
    await Bun.write(filename, csv);
    console.info(`✅ Exported matrix to ${filename}`);
  }

  async generateReport(): Promise<void> {
    console.info('🎯 FactoryWager Wiki Matrix Report');
    console.info('==================================');
    console.info('');

    // Get statistics
    const stats = await this.getStatistics('json');
    console.info('📊 Statistics:');
    console.info(`   Total Templates: ${stats.total}`);
    console.info(`   With Examples: ${stats.withExamples}/${stats.total}`);
    console.info(`   Formats: ${Object.keys(stats.formats).join(', ')}`);
    console.info('');

    // Get templates by format
    const templates = await this.getTemplates('json');
    const formatCounts: Record<string, number> = {};
    templates.forEach((template: any) => {
      formatCounts[template.format] = (formatCounts[template.format] || 0) + 1;
    });

    console.info('📄 Format Distribution:');
    Object.entries(formatCounts).forEach(([format, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      console.info(`   ${format}: ${count} (${percentage}%)`);
    });
    console.info('');

    // Search examples
    console.info('🔍 Search Examples:');
    
    const confluenceTemplates = await this.searchTemplates('Confluence');
    if (confluenceTemplates.length > 0) {
      console.info(`   Confluence templates: ${confluenceTemplates.length}`);
      confluenceTemplates.forEach((template: any) => {
        console.info(`     - ${template.name}`);
      });
    }

    const markdownTemplates = await this.getTemplatesByFormat('markdown');
    console.info(`   Markdown templates: ${markdownTemplates.length}`);
    console.info('');
  }
}

// Example usage
async function demonstrateProgrammaticUsage() {
  const client = new WikiMatrixClient();

  try {
    console.info('🎯 Demonstrating Programmatic Wiki Matrix Usage');
    console.info('===============================================');
    console.info('');

    // 1. Get matrix as JSON
    console.info('1️⃣  Getting matrix as JSON...');
    const matrix = await client.getMatrix('json');
    console.info(`   Retrieved ${matrix.length} templates`);
    console.info('');

    // 2. Get template details
    console.info('2️⃣  Getting template details...');
    const details = await client.getTemplateDetails(1, 'json');
    console.info(`   Template: ${details.name}`);
    console.info(`   Format: ${details.format}`);
    console.info(`   Use Case: ${details.useCase}`);
    console.info('');

    // 3. Search for specific templates
    console.info('3️⃣  Searching for templates...');
    const confluenceResults = await client.searchTemplates('Confluence');
    console.info(`   Found ${confluenceResults.length} Confluence templates`);
    confluenceResults.forEach((template: any) => {
      console.info(`     - ${template.name}`);
    });
    console.info('');

    // 4. Get statistics
    console.info('4️⃣  Getting statistics...');
    const stats = await client.getStatistics('json');
    console.info(`   Total: ${stats.total}`);
    console.info(`   Formats: ${Object.keys(stats.formats).join(', ')}`);
    console.info('');

    // 5. Export to CSV
    console.info('5️⃣  Exporting to CSV...');
    await client.exportToCSV('wiki-matrix-export.csv');
    console.info('');

    // 6. Generate report
    console.info('6️⃣  Generating report...');
    await client.generateReport();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Advanced usage examples
async function advancedExamples() {
  const client = new WikiMatrixClient();

  console.info('🚀 Advanced Usage Examples');
  console.info('==========================');
  console.info('');

  // Pipeline example: Get templates → filter → process
  console.info('📋 Pipeline: Get markdown templates → process names');
  const markdownTemplates = await client.getTemplatesByFormat('markdown');
  const templateNames = markdownTemplates.map((t: any) => t.name);
  console.info('   Markdown template names:', templateNames);
  console.info('');

  // Batch processing
  console.info('🔄 Batch processing: Get details for all templates');
  const allTemplates = await client.getTemplates('json');
  const detailsPromises = allTemplates.map((_, index) => 
    client.getTemplateDetails(index + 1, 'json')
  );
  const allDetails = await Promise.all(detailsPromises);
  console.info(`   Retrieved details for ${allDetails.length} templates`);
  console.info('');

  // Custom analysis
  console.info('📊 Custom analysis: Complexity distribution');
  const complexities = allDetails.map((detail: any) => detail.complexity);
  const complexityCount: Record<string, number> = {};
  complexities.forEach(complexity => {
    complexityCount[complexity] = (complexityCount[complexity] || 0) + 1;
  });
  console.info('   Complexity distribution:', complexityCount);
  console.info('');
}

// CLI execution
if (import.meta.main) {
  const command = Bun.argv[2];
  
  switch (command) {
    case 'demo':
      await demonstrateProgrammaticUsage();
      break;
    case 'advanced':
      await advancedExamples();
      break;
    case 'help':
    default:
      console.info('🎯 Wiki Matrix Programmatic Usage');
      console.info('=================================');
      console.info('');
      console.info('Commands:');
      console.info('  demo     - Basic programmatic usage examples');
      console.info('  advanced - Advanced usage examples');
      console.info('  help     - Show this help');
      console.info('');
      console.info('Usage:');
      console.info('  bun run examples/wiki-pipe-programmatic.ts demo');
      console.info('  bun run examples/wiki-pipe-programmatic.ts advanced');
      break;
  }
}
