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
    console.log(`✅ Exported matrix to ${filename}`);
  }

  async generateReport(): Promise<void> {
    console.log('🎯 FactoryWager Wiki Matrix Report');
    console.log('==================================');
    console.log('');

    // Get statistics
    const stats = await this.getStatistics('json');
    console.log('📊 Statistics:');
    console.log(`   Total Templates: ${stats.total}`);
    console.log(`   With Examples: ${stats.withExamples}/${stats.total}`);
    console.log(`   Formats: ${Object.keys(stats.formats).join(', ')}`);
    console.log('');

    // Get templates by format
    const templates = await this.getTemplates('json');
    const formatCounts: Record<string, number> = {};
    templates.forEach((template: any) => {
      formatCounts[template.format] = (formatCounts[template.format] || 0) + 1;
    });

    console.log('📄 Format Distribution:');
    Object.entries(formatCounts).forEach(([format, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      console.log(`   ${format}: ${count} (${percentage}%)`);
    });
    console.log('');

    // Search examples
    console.log('🔍 Search Examples:');
    
    const confluenceTemplates = await this.searchTemplates('Confluence');
    if (confluenceTemplates.length > 0) {
      console.log(`   Confluence templates: ${confluenceTemplates.length}`);
      confluenceTemplates.forEach((template: any) => {
        console.log(`     - ${template.name}`);
      });
    }

    const markdownTemplates = await this.getTemplatesByFormat('markdown');
    console.log(`   Markdown templates: ${markdownTemplates.length}`);
    console.log('');
  }
}

// Example usage
async function demonstrateProgrammaticUsage() {
  const client = new WikiMatrixClient();

  try {
    console.log('🎯 Demonstrating Programmatic Wiki Matrix Usage');
    console.log('===============================================');
    console.log('');

    // 1. Get matrix as JSON
    console.log('1️⃣  Getting matrix as JSON...');
    const matrix = await client.getMatrix('json');
    console.log(`   Retrieved ${matrix.length} templates`);
    console.log('');

    // 2. Get template details
    console.log('2️⃣  Getting template details...');
    const details = await client.getTemplateDetails(1, 'json');
    console.log(`   Template: ${details.name}`);
    console.log(`   Format: ${details.format}`);
    console.log(`   Use Case: ${details.useCase}`);
    console.log('');

    // 3. Search for specific templates
    console.log('3️⃣  Searching for templates...');
    const confluenceResults = await client.searchTemplates('Confluence');
    console.log(`   Found ${confluenceResults.length} Confluence templates`);
    confluenceResults.forEach((template: any) => {
      console.log(`     - ${template.name}`);
    });
    console.log('');

    // 4. Get statistics
    console.log('4️⃣  Getting statistics...');
    const stats = await client.getStatistics('json');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Formats: ${Object.keys(stats.formats).join(', ')}`);
    console.log('');

    // 5. Export to CSV
    console.log('5️⃣  Exporting to CSV...');
    await client.exportToCSV('wiki-matrix-export.csv');
    console.log('');

    // 6. Generate report
    console.log('6️⃣  Generating report...');
    await client.generateReport();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Advanced usage examples
async function advancedExamples() {
  const client = new WikiMatrixClient();

  console.log('🚀 Advanced Usage Examples');
  console.log('==========================');
  console.log('');

  // Pipeline example: Get templates → filter → process
  console.log('📋 Pipeline: Get markdown templates → process names');
  const markdownTemplates = await client.getTemplatesByFormat('markdown');
  const templateNames = markdownTemplates.map((t: any) => t.name);
  console.log('   Markdown template names:', templateNames);
  console.log('');

  // Batch processing
  console.log('🔄 Batch processing: Get details for all templates');
  const allTemplates = await client.getTemplates('json');
  const detailsPromises = allTemplates.map((_, index) => 
    client.getTemplateDetails(index + 1, 'json')
  );
  const allDetails = await Promise.all(detailsPromises);
  console.log(`   Retrieved details for ${allDetails.length} templates`);
  console.log('');

  // Custom analysis
  console.log('📊 Custom analysis: Complexity distribution');
  const complexities = allDetails.map((detail: any) => detail.complexity);
  const complexityCount: Record<string, number> = {};
  complexities.forEach(complexity => {
    complexityCount[complexity] = (complexityCount[complexity] || 0) + 1;
  });
  console.log('   Complexity distribution:', complexityCount);
  console.log('');
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
      console.log('🎯 Wiki Matrix Programmatic Usage');
      console.log('=================================');
      console.log('');
      console.log('Commands:');
      console.log('  demo     - Basic programmatic usage examples');
      console.log('  advanced - Advanced usage examples');
      console.log('  help     - Show this help');
      console.log('');
      console.log('Usage:');
      console.log('  bun run examples/wiki-pipe-programmatic.ts demo');
      console.log('  bun run examples/wiki-pipe-programmatic.ts advanced');
      break;
  }
}
