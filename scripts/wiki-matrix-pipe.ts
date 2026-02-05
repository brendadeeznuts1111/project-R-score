#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Matrix - Pipe-Friendly Version
 * 
 * Supports stdin input for programmatic usage and pipeline integration.
 * Uses Bun's stringWidth and custom table formatting.
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';
import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';
import { EXIT_CODES, exitWithCode } from '../lib/utils/exit-codes.ts';

interface PipeCommand {
  action: 'matrix' | 'details' | 'compare' | 'stats' | 'templates';
  params?: Record<string, any>;
  format?: 'table' | 'json' | 'csv';
}

class WikiMatrixPipe {
  private templates = MCPWikiGenerator.getWikiTemplates();

  // Safe JSON parsing with validation
  private safeJsonParse(input: string): PipeCommand | null {
    try {
      const parsed = JSON.parse(input);
      
      // Validate structure
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.action || typeof parsed.action !== 'string') return null;
      if (!['matrix', 'details', 'compare', 'stats', 'templates'].includes(parsed.action)) return null;
      
      // Validate params if present
      if (parsed.params) {
        if (typeof parsed.params !== 'object') return null;
        // Validate index parameter for details action
        if (parsed.action === 'details' && 'index' in parsed.params) {
          const index = parsed.params.index;
          if (typeof index !== 'number' || index < 1) return null;
        }
      }
      
      // Validate format if present
      if (parsed.format && !['table', 'json', 'csv'].includes(parsed.format)) {
        return null;
      }
      
      return parsed as PipeCommand;
    } catch {
      return null;
    }
  }

  async processStdin(): Promise<void> {
    try {
      // Read from stdin
      const stdin = await Bun.stdin.text();
      
      if (!stdin.trim()) {
        console.log(styled('📋 Available pipe commands:', 'info'));
        console.log(styled('  {"action": "matrix"}', 'muted'));
        console.log(styled('  {"action": "details", "params": {"index": 1}}', 'muted'));
        console.log(styled('  {"action": "compare"}', 'muted'));
        console.log(styled('  {"action": "stats"}', 'muted'));
        console.log(styled('  {"action": "templates"}', 'muted'));
        console.log('');
        console.log(styled('Example usage:', 'primary'));
        console.log(styled('  echo \'{"action": "matrix"}\' | bun run scripts/wiki-matrix-pipe.ts', 'muted'));
        console.log(styled('  echo \'{"action": "details", "params": {"index": 2}}\' | bun run scripts/wiki-matrix-pipe.ts', 'muted'));
        return;
      }

      // Parse JSON command from stdin safely
      const command = this.safeJsonParse(stdin);
      if (!command) {
        console.error(styled('❌ Invalid command format or malicious input detected', 'error'));
        console.error(styled('Please check your JSON command format', 'muted'));
        exitWithCode(EXIT_CODES.INVALID_INPUT);
      }
      
      // Execute command
      await this.executeCommand(command);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(styled(`❌ Error processing stdin: ${message}`, 'error'));
      exitWithCode(EXIT_CODES.SYSTEM_ERROR);
    }
  }

  private async executeCommand(command: PipeCommand): Promise<void> {
    switch (command.action) {
      case 'matrix':
        await this.displayMatrix(command.format);
        break;
      case 'details':
        const index = command.params?.index ?? 1;
        if (typeof index !== 'number' || index < 1) {
          console.error(styled('❌ Invalid index parameter for details command', 'error'));
          process.exit(1);
        }
        await this.displayDetails(index, command.format);
        break;
      case 'compare':
        await this.displayComparison(command.format);
        break;
      case 'stats':
        await this.displayStats(command.format);
        break;
      case 'templates':
        await this.displayTemplates(command.format);
        break;
      default:
        console.error(styled(`❌ Unknown action: ${command.action}`, 'error'));
    }
  }

  private async displayMatrix(format: string = 'table'): Promise<void> {
    const matrixData = this.templates.map((template, index) => ({
      id: index + 1,
      name: template.name,
      format: template.format,
      useCase: this.determineUseCase(template.name),
      complexity: this.determineComplexity(template),
      examples: template.includeExamples,
      baseUrl: template.baseUrl,
      workspace: template.workspace
    }));

    if (format === 'json') {
      console.log(JSON.stringify(matrixData, null, 2));
    } else if (format === 'csv') {
      this.outputCSV(matrixData);
    } else {
      this.displayTable(matrixData);
    }
  }

  private async displayDetails(index: number, format: string = 'table'): Promise<void> {
    if (index < 1 || index > this.templates.length) {
      console.error(styled(`❌ Invalid template index: ${index}`, 'error'));
      return;
    }

    const template = this.templates[index - 1];
    const details = {
      name: template.name,
      description: template.description,
      baseUrl: template.baseUrl,
      workspace: template.workspace,
      format: template.format,
      useCase: this.determineUseCase(template.name),
      complexity: this.determineComplexity(template),
      examples: template.includeExamples,
      customSections: template.customSections?.length || 0,
      integration: this.determineIntegration(template.format)
    };

    if (format === 'json') {
      console.log(JSON.stringify(details, null, 2));
    } else if (format === 'csv') {
      this.outputCSV([details]);
    } else {
      this.displayDetailsTable(details);
    }
  }

  private async displayComparison(format: string = 'table'): Promise<void> {
    const features = ['Examples', 'Custom Sections', 'API Ready', 'Easy Import', 'Enterprise Ready'];
    const comparisonData = features.map(feature => {
      const row: any = { feature };
      
      this.templates.forEach(template => {
        let hasFeature = false;
        
        switch (feature) {
          case 'Examples':
            hasFeature = template.includeExamples;
            break;
          case 'Custom Sections':
            hasFeature = (template.customSections?.length || 0) > 0;
            break;
          case 'API Ready':
            hasFeature = template.format === 'json';
            break;
          case 'Easy Import':
            hasFeature = template.format === 'markdown';
            break;
          case 'Enterprise Ready':
            hasFeature = template.baseUrl.includes('atlassian') || template.name.includes('Enterprise');
            break;
        }
        
        row[template.name.substring(0, 12)] = hasFeature;
      });
      
      return row;
    });

    if (format === 'json') {
      console.log(JSON.stringify(comparisonData, null, 2));
    } else if (format === 'csv') {
      this.outputCSV(comparisonData);
    } else {
      this.displayComparisonTable(comparisonData);
    }
  }

  private async displayStats(format: string = 'table'): Promise<void> {
    const stats = {
      total: this.templates.length,
      formats: {} as Record<string, number>,
      complexities: {} as Record<string, number>,
      withExamples: this.templates.filter(t => t.includeExamples).length,
      withCustomSections: this.templates.filter(t => t.customSections && t.customSections.length > 0).length
    };

    this.templates.forEach(template => {
      stats.formats[template.format] = (stats.formats[template.format] || 0) + 1;
      stats.complexities[this.determineComplexity(template)] = (stats.complexities[this.determineComplexity(template)] || 0) + 1;
    });

    if (format === 'json') {
      console.log(JSON.stringify(stats, null, 2));
    } else if (format === 'csv') {
      const flatStats = [
        { metric: 'Total Templates', value: stats.total },
        { metric: 'With Examples', value: stats.withExamples },
        { metric: 'With Custom Sections', value: stats.withCustomSections },
        { metric: 'Markdown Format', value: stats.formats.markdown || 0 },
        { metric: 'HTML Format', value: stats.formats.html || 0 },
        { metric: 'JSON Format', value: stats.formats.json || 0 },
        { metric: 'Simple Complexity', value: stats.complexities.Simple || 0 },
        { metric: 'Medium Complexity', value: stats.complexities.Medium || 0 },
        { metric: 'Advanced Complexity', value: stats.complexities.Advanced || 0 }
      ];
      this.outputCSV(flatStats);
    } else {
      this.displayStatsTable(stats);
    }
  }

  private async displayTemplates(format: string = 'table'): Promise<void> {
    if (format === 'json') {
      console.log(JSON.stringify(this.templates, null, 2));
    } else if (format === 'csv') {
      this.outputCSV(this.templates);
    } else {
      this.displayTemplatesTable();
    }
  }

  private displayTable(data: any[]): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const colWidths: number[] = [];
    
    // Calculate column widths using Bun.stringWidth
    headers.forEach((header, i) => {
      let maxWidth = Bun.stringWidth(header);
      data.forEach(row => {
        const value = String(row[header] || '');
        const width = Bun.stringWidth(value);
        if (width > maxWidth) maxWidth = width;
      });
      colWidths[i] = Math.min(maxWidth + 2, 20);
    });

    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const headerSeparator = createSeparator('├', '┼', '┤', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.log(styled(topBorder, 'muted'));
    
    // Header row
    let headerRow = '│';
    headers.forEach((header, i) => {
      const paddedHeader = header.padEnd(colWidths[i]);
      headerRow += ` ${styled(paddedHeader, 'accent')} │`;
    });
    console.log(headerRow);
    
    console.log(styled(headerSeparator, 'muted'));

    // Data rows
    data.forEach((row, rowIndex) => {
      let dataRow = '│';
      headers.forEach((header, colIndex) => {
        let value = String(row[header] || '');
        let color = 'muted';

        // Apply color coding
        if (header === 'id') color = 'primary';
        else if (header === 'format') {
          color = value === 'markdown' ? 'success' : value === 'html' ? 'warning' : 'error';
        } else if (header === 'complexity') {
          color = value === 'Simple' ? 'success' : value === 'Medium' ? 'warning' : 'error';
        } else if (header === 'examples') {
          color = value === 'true' ? 'success' : 'error';
        }

        const paddedValue = value.padEnd(colWidths[colIndex]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.log(dataRow);
      
      if (rowIndex < data.length - 1) {
        console.log(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(bottomBorder, 'muted'));
  }

  private outputCSV(data: any[]): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    
    // Output CSV header
    console.log(headers.join(','));
    
    // Output CSV rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      console.log(values.join(','));
    });
  }

  private displayDetailsTable(details: any): void {
    console.log(styled(`\n🔍 ${details.name}`, 'accent'));
    console.log(colorBar('accent', 50));

    const entries = Object.entries(details);
    const colWidths = [15, 50];

    const createSeparator = (left: string, right: string, middle: string) => {
      return left + '─'.repeat(colWidths[0]) + middle + '─'.repeat(colWidths[1]) + right;
    };

    console.log(styled(createSeparator('┌', '┐', '┬'), 'muted'));
    
    entries.forEach(([key, value], index) => {
      const keyStr = key.padEnd(colWidths[0]);
      const valueStr = String(value).padEnd(colWidths[1]);
      console.log(`│ ${styled(keyStr, 'primary')} │ ${styled(valueStr, 'info')} │`);
      
      if (index < entries.length - 1) {
        console.log(styled(createSeparator('├', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(createSeparator('└', '┘', '┴'), 'muted'));
  }

  private displayComparisonTable(data: any[]): void {
    const headers = Object.keys(data[0]);
    const colWidths: number[] = [];
    
    headers.forEach((header, i) => {
      let maxWidth = Bun.stringWidth(header);
      data.forEach(row => {
        const value = String(row[header] || '');
        const width = Bun.stringWidth(value);
        if (width > maxWidth) maxWidth = width;
      });
      colWidths[i] = Math.min(maxWidth + 2, 12);
    });

    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const headerSeparator = createSeparator('├', '┼', '┤', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.log(styled(topBorder, 'muted'));
    
    // Header
    let headerRow = '│';
    headers.forEach((header, i) => {
      const color = header === 'feature' ? 'primary' : 'accent';
      const paddedHeader = header.padEnd(colWidths[i]);
      headerRow += ` ${styled(paddedHeader, color)} │`;
    });
    console.log(headerRow);
    
    console.log(styled(headerSeparator, 'muted'));

    // Data rows
    data.forEach((row, rowIndex) => {
      let dataRow = '│';
      headers.forEach((header, colIndex) => {
        let value = String(row[header] || '');
        let color = header === 'feature' ? 'primary' : 'muted';
        
        if (header !== 'feature') {
          color = value === 'true' ? 'success' : value === 'false' ? 'error' : 'muted';
          value = value === 'true' ? '✅' : value === 'false' ? '❌' : value;
        }
        
        const paddedValue = value.padEnd(colWidths[colIndex]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.log(dataRow);
      
      if (rowIndex < data.length - 1) {
        console.log(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(bottomBorder, 'muted'));
  }

  private displayStatsTable(stats: any): void {
    console.log(styled('\n📊 Wiki Template Statistics', 'primary'));
    console.log(colorBar('primary', 40));

    const entries = [
      ['Total Templates', stats.total.toString()],
      ['With Examples', `${stats.withExamples}/${stats.total}`],
      ['Markdown Format', (stats.formats.markdown || 0).toString()],
      ['HTML Format', (stats.formats.html || 0).toString()],
      ['JSON Format', (stats.formats.json || 0).toString()],
      ['Simple Complexity', (stats.complexities.Simple || 0).toString()],
      ['Medium Complexity', (stats.complexities.Medium || 0).toString()],
      ['Advanced Complexity', (stats.complexities.Advanced || 0).toString()]
    ];

    const colWidths = [20, 10];

    const createSeparator = (left: string, right: string, middle: string) => {
      return left + '─'.repeat(colWidths[0]) + middle + '─'.repeat(colWidths[1]) + right;
    };

    console.log(styled(createSeparator('┌', '┐', '┬'), 'muted'));
    
    entries.forEach(([key, value], index) => {
      const keyStr = key.padEnd(colWidths[0]);
      const valueStr = value.padEnd(colWidths[1]);
      console.log(`│ ${styled(keyStr, 'accent')} │ ${styled(valueStr, 'primary')} │`);
      
      if (index < entries.length - 1) {
        console.log(styled(createSeparator('├', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(createSeparator('└', '┘', '┴'), 'muted'));
  }

  private displayTemplatesTable(): void {
    console.log(styled('\n📋 Available Wiki Templates', 'info'));
    console.log(colorBar('info', 50));

    this.templates.forEach((template, index) => {
      console.log(styled(`\n${index + 1}. ${template.name}`, 'accent'));
      console.log(styled(`   ${template.description}`, 'muted'));
      console.log(styled(`   Format: ${template.format} | Workspace: ${template.workspace}`, 'info'));
    });
  }

  // Helper methods
  private determineUseCase(name: string): string {
    if (name.includes('Confluence')) return 'Enterprise Wiki';
    if (name.includes('Notion')) return 'Team Collaboration';
    if (name.includes('GitHub')) return 'Open Source';
    if (name.includes('Internal')) return 'Company Portal';
    if (name.includes('API')) return 'Developer Docs';
    return 'General Purpose';
  }

  private determineComplexity(template: any): string {
    let score = 0;
    if (template.customSections?.length > 2) score += 2;
    if (template.format === 'json') score += 1;
    if (!template.includeExamples) score += 1;
    if (template.baseUrl.includes('atlassian')) score += 1;
    
    if (score <= 1) return 'Simple';
    if (score <= 3) return 'Medium';
    return 'Advanced';
  }

  private determineIntegration(format: string): string {
    switch (format) {
      case 'markdown': return 'Direct Import';
      case 'html': return 'Embed/IFrame';
      case 'json': return 'API Integration';
      default: return 'Manual';
    }
  }
}

// CLI execution
if (import.meta.main) {
  const pipe = new WikiMatrixPipe();
  await pipe.processStdin();
}
