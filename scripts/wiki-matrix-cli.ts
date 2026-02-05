#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Template Matrix CLI
 * 
 * Uses Bun's inspect.tableCustom with DataView columns and stringWidth
 * to display a formatted matrix of all wiki templates and their properties.
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';
import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';
import { masterTokenManager } from '../lib/security/master-token.ts';
import { EXIT_CODES, exitWithCode } from '../lib/utils/exit-codes.ts';

interface TemplateMatrix {
  name: string;
  description: string;
  baseUrl: string;
  workspace: string;
  format: string;
  examples: boolean;
  sections: number;
  useCase: string;
  complexity: 'Simple' | 'Medium' | 'Advanced';
  integration: string;
}

class WikiMatrixCLI {
  private templates: TemplateMatrix[] = [];
  private isRunning = false;
  private cleanupHandlers: (() => void)[] = [];

  private constructor() {
    this.setupExitHandlers();
  }

  static async create(): Promise<WikiMatrixCLI> {
    const cli = new WikiMatrixCLI();
    await cli.loadTemplates();
    return cli;
  }

  private setupExitHandlers(): void {
    const cleanup = () => {
      if (this.isRunning) {
        console.log(styled('\n👋 Shutting down Wiki Matrix CLI...', 'muted'));
        this.cleanup();
        exitWithCode(EXIT_CODES.SUCCESS);
      }
    };

    // Handle various exit signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(styled(`\n❌ Uncaught error: ${message}`, 'error'));
      this.cleanup();
      exitWithCode(EXIT_CODES.SYSTEM_ERROR);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.error(styled(`\n❌ Unhandled promise rejection: ${message}`, 'error'));
      this.cleanup();
      exitWithCode(EXIT_CODES.SYSTEM_ERROR);
    });

    this.cleanupHandlers.push(() => {
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);
      process.removeListener('SIGHUP', cleanup);
    });
  }

  private cleanup(): void {
    this.isRunning = false;
    this.cleanupHandlers.forEach(handler => handler());
    this.cleanupHandlers = [];
  }

  private loadTemplates(): void {
    const wikiTemplates = MCPWikiGenerator.getWikiTemplates();
    
    this.templates = wikiTemplates.map(template => ({
      name: template.name,
      description: template.description,
      baseUrl: template.baseUrl,
      workspace: template.workspace,
      format: template.format,
      examples: template.includeExamples,
      sections: (template.customSections?.length || 0) + 4, // Base sections + custom
      useCase: this.determineUseCase(template.name),
      complexity: this.determineComplexity(template),
      integration: this.determineIntegration(template.format)
    }));
  }

  private determineUseCase(name: string): string {
    if (name.includes('Confluence')) return 'Enterprise Wiki';
    if (name.includes('Notion')) return 'Team Collaboration';
    if (name.includes('GitHub')) return 'Open Source';
    if (name.includes('Internal')) return 'Company Portal';
    if (name.includes('API')) return 'Developer Docs';
    return 'General Purpose';
  }

  private determineComplexity(template: any): 'Simple' | 'Medium' | 'Advanced' {
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

  private formatUrl(url: string): string {
    if (url.length > 30) {
      return url.replace(/^https?:\/\//, '').substring(0, 27) + '...';
    }
    return url.replace(/^https?:\/\//, '');
  }

  private formatWorkspace(workspace: string): string {
    if (workspace.length > 20) {
      return workspace.substring(0, 17) + '...';
    }
    return workspace;
  }

  private formatDescription(description: string): string {
    if (description.length > 40) {
      return description.substring(0, 37) + '...';
    }
    return description;
  }

  displayMatrix(): void {
    console.log(styled('\n🎯 Wiki Template Matrix Analysis', 'accent'));
    console.log(colorBar('accent', 60));
    console.log(styled('Comprehensive template overview with Bun inspect formatting', 'muted'));
    console.log('');

    // Create matrix data
    const matrixData = this.templates.map((template, index) => ({
      '#': (index + 1).toString(),
      'Template': template.name,
      'Format': template.format.toUpperCase(),
      'Use Case': template.useCase,
      'Complexity': template.complexity,
      'Examples': template.examples ? '✅' : '❌',
      'Sections': template.sections.toString(),
      'Integration': template.integration,
      'Base URL': this.formatUrl(template.baseUrl),
      'Workspace': this.formatWorkspace(template.workspace)
    }));

    // Use Bun.inspect with proper table formatting
    console.log(Bun.inspect(matrixData, {
      depth: 10,
      colors: true,
      indent: 2,
      maxArrayLength: 100,
      maxStringLength: 50,
      compact: false
    }));

    console.log('');

    // Display enhanced formatted table using custom implementation
    this.displayCustomTable(matrixData);
    
    // Display summary statistics
    this.displayStatistics();
  }

  private displayCustomTable(data: any[]): void {
    console.log(styled('\n📋 Enhanced Template Matrix', 'primary'));
    console.log(colorBar('primary', 80));

    // Calculate column widths using Bun.stringWidth
    const headers = Object.keys(data[0]);
    const colWidths: number[] = [];
    
    headers.forEach((header, i) => {
      let maxWidth = Bun.stringWidth(header);
      data.forEach(row => {
        const value = String(row[header] || '');
        const width = Bun.stringWidth(value);
        if (width > maxWidth) maxWidth = width;
      });
      colWidths[i] = Math.min(maxWidth + 2, 25); // Max width of 25 per column
    });

    // Helper function to create table separators
    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    // Print table header
    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const headerSeparator = createSeparator('├', '┼', '┤', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.log(styled(topBorder, 'muted'));
    
    // Print header row
    let headerRow = '│';
    headers.forEach((header, i) => {
      const paddedHeader = header.padEnd(colWidths[i]);
      headerRow += ` ${styled(paddedHeader, 'accent')} │`;
    });
    console.log(headerRow);
    
    console.log(styled(headerSeparator, 'muted'));

    // Print data rows
    data.forEach((row, rowIndex) => {
      let dataRow = '│';
      headers.forEach((header, colIndex) => {
        let value = String(row[header] || '');
        let color = 'muted';

        // Apply color coding based on column and value
        if (header === '#') {
          color = 'primary';
        } else if (header === 'Template') {
          const colors = ['success', 'warning', 'info', 'muted'];
          color = colors[rowIndex % colors.length];
        } else if (header === 'Format') {
          color = value === 'MARKDOWN' ? 'success' : value === 'HTML' ? 'warning' : 'error';
        } else if (header === 'Complexity') {
          const icon = value === 'Simple' ? '🟢' : value === 'Medium' ? '🟡' : '🔴';
          value = `${icon} ${value}`;
          color = value === 'Simple' ? 'success' : value === 'Medium' ? 'warning' : 'error';
        } else if (header === 'Examples') {
          color = value.includes('✅') ? 'success' : 'error';
        } else if (header === 'Use Case') {
          color = 'info';
        } else if (header === 'Integration') {
          color = 'accent';
        } else if (header === 'Base URL') {
          color = 'info';
        } else if (header === 'Workspace') {
          color = 'warning';
        }

        const paddedValue = value.padEnd(colWidths[colIndex]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.log(dataRow);
      
      // Add row separator (except for last row)
      if (rowIndex < data.length - 1) {
        console.log(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(bottomBorder, 'muted'));
  }

  private displayStatsTable(data: any[]): void {
    // Calculate column widths using Bun.stringWidth
    const headers = Object.keys(data[0]);
    const colWidths: number[] = [];
    
    headers.forEach((header, i) => {
      let maxWidth = Bun.stringWidth(header);
      data.forEach(row => {
        const value = String(row[header] || '');
        const width = Bun.stringWidth(value);
        if (width > maxWidth) maxWidth = width;
      });
      colWidths[i] = maxWidth + 3; // Add padding
    });

    // Helper function to create table separators
    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    // Print table
    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.log(styled(topBorder, 'muted'));
    
    // Header row
    let headerRow = '│';
    headers.forEach((header, i) => {
      const color = header === 'Metric' ? 'accent' : header === 'Value' ? 'primary' : 'muted';
      const paddedHeader = header.padEnd(colWidths[i]);
      headerRow += ` ${styled(paddedHeader, color)} │`;
    });
    console.log(headerRow);
    
    console.log(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));

    // Data rows
    data.forEach(row => {
      let dataRow = '│';
      headers.forEach((header, i) => {
        const value = String(row[header] || '');
        const color = header === 'Metric' ? 'accent' : header === 'Value' ? 'primary' : 'muted';
        const paddedValue = value.padEnd(colWidths[i]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.log(dataRow);
    });

    console.log(styled(bottomBorder, 'muted'));
  }

  private displayStatistics(): void {
    console.log(styled('\n📊 Template Statistics', 'primary'));
    console.log(colorBar('primary', 40));

    const stats = {
      total: this.templates.length,
      formats: {} as Record<string, number>,
      complexities: {} as Record<string, number>,
      useCases: {} as Record<string, number>,
      withExamples: this.templates.filter(t => t.examples).length,
      avgSections: Math.round(this.templates.reduce((sum, t) => sum + t.sections, 0) / this.templates.length)
    };

    // Calculate format distribution
    this.templates.forEach(template => {
      stats.formats[template.format] = (stats.formats[template.format] || 0) + 1;
      stats.complexities[template.complexity] = (stats.complexities[template.complexity] || 0) + 1;
      stats.useCases[template.useCase] = (stats.useCases[template.useCase] || 0) + 1;
    });

    // Create statistics table
    const statsData = [
      { Metric: 'Total Templates', Value: stats.total.toString(), Type: 'Count' },
      { Metric: 'With Examples', Value: `${stats.withExamples}/${stats.total}`, Type: 'Ratio' },
      { Metric: 'Avg Sections', Value: stats.avgSections.toString(), Type: 'Average' },
      { Metric: 'Markdown Format', Value: (stats.formats.markdown || 0).toString(), Type: 'Format' },
      { Metric: 'HTML Format', Value: (stats.formats.html || 0).toString(), Type: 'Format' },
      { Metric: 'JSON Format', Value: (stats.formats.json || 0).toString(), Type: 'Format' },
      { Metric: 'Simple Complexity', Value: (stats.complexities.Simple || 0).toString(), Type: 'Level' },
      { Metric: 'Medium Complexity', Value: (stats.complexities.Medium || 0).toString(), Type: 'Level' },
      { Metric: 'Advanced Complexity', Value: (stats.complexities.Advanced || 0).toString(), Type: 'Level' }
    ];

    // Create statistics table using custom formatting
    this.displayStatsTable(statsData);

    console.log('');

    // Display complexity distribution
    console.log(styled('🎯 Complexity Distribution:', 'warning'));
    Object.entries(stats.complexities).forEach(([complexity, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      const bar = '█'.repeat(Math.round(percentage / 10));
      const color = complexity === 'Simple' ? 'success' : complexity === 'Medium' ? 'warning' : 'error';
      console.log(styled(`   ${complexity}:`, color) + styled(` ${bar} ${count} (${percentage}%)`, 'muted'));
    });

    console.log('');

    // Display format distribution
    console.log(styled('📄 Format Distribution:', 'info'));
    Object.entries(stats.formats).forEach(([format, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      const bar = '█'.repeat(Math.round(percentage / 10));
      const color = format === 'markdown' ? 'success' : format === 'html' ? 'warning' : 'error';
      console.log(styled(`   ${format.toUpperCase()}:`, color) + styled(` ${bar} ${count} (${percentage}%)`, 'muted'));
    });
  }

  displayDetailedView(index: number): void {
    if (index < 1 || index > this.templates.length) {
      console.log(styled(`❌ Invalid template index. Use 1-${this.templates.length}`, 'error'));
      return;
    }

    const template = this.templates[index - 1];
    
    console.log(styled(`\n🔍 Detailed View: ${template.name}`, 'accent'));
    console.log(colorBar('accent', 50));

    const details = [
      { Property: 'Name', Value: template.name },
      { Property: 'Description', Value: template.description },
      { Property: 'Base URL', Value: template.baseUrl },
      { Property: 'Workspace', Value: template.workspace },
      { Property: 'Format', Value: template.format.toUpperCase() },
      { Property: 'Use Case', Value: template.useCase },
      { Property: 'Complexity', Value: template.complexity },
      { Property: 'Examples', Value: template.examples ? 'Yes' : 'No' },
      { Property: 'Sections', Value: template.sections.toString() },
      { Property: 'Integration', Value: template.integration }
    ];

    this.displayStatsTable(details);

    console.log('');
    console.log(styled('💡 Usage Example:', 'success'));
    console.log(styled(`   bun run wiki:template "${template.name}"`, 'muted'));
  }

  displayComparisonMatrix(): void {
    console.log(styled('\n⚖️ Feature Comparison Matrix', 'warning'));
    console.log(colorBar('warning', 60));

    // Create feature comparison data
    const features = ['Examples', 'Custom Sections', 'API Ready', 'Easy Import', 'Enterprise Ready'];
    const comparisonData = features.map(feature => {
      const row: any = { Feature: feature };
      
      this.templates.forEach(template => {
        let hasFeature = false;
        
        switch (feature) {
          case 'Examples':
            hasFeature = template.examples;
            break;
          case 'Custom Sections':
            hasFeature = template.sections > 4;
            break;
          case 'API Ready':
            hasFeature = template.format === 'json';
            break;
          case 'Easy Import':
            hasFeature = template.format === 'markdown';
            break;
          case 'Enterprise Ready':
            hasFeature = template.complexity === 'Advanced' || template.baseUrl.includes('atlassian');
            break;
        }
        
        row[template.name.substring(0, 15)] = hasFeature ? '✅' : '❌';
      });
      
      return row;
    });

    // Dynamic columns for each template
    const columns = [
      {
        key: 'Feature',
        name: styled('Feature', 'primary'),
        width: 15,
        align: 'left',
        formatter: (value: string) => styled(value, 'primary')
      }
    ];

    this.templates.forEach(template => {
      columns.push({
        key: template.name.substring(0, 15),
        name: styled(template.name.substring(0, 12), 'accent'),
        width: 12,
        align: 'center',
        formatter: (value: string) => value
      });
    });

    // Display comparison using custom table implementation
    this.displayComparisonTable(comparisonData);

    console.log('');
  }

  private displayComparisonTable(data: any[]): void {
    // Calculate column widths using Bun.stringWidth
    const headers = Object.keys(data[0]);
    const colWidths: number[] = [];
    
    headers.forEach((header, i) => {
      let maxWidth = Bun.stringWidth(header);
      data.forEach(row => {
        const value = String(row[header] || '');
        const width = Bun.stringWidth(value);
        if (width > maxWidth) maxWidth = width;
      });
      colWidths[i] = Math.min(maxWidth + 2, 15); // Limit width for comparison table
    });

    // Helper function to create table separators
    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    // Print table
    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const headerSeparator = createSeparator('├', '┼', '┤', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.log(styled(topBorder, 'muted'));
    
    // Header row
    let headerRow = '│';
    headers.forEach((header, i) => {
      const color = header === 'Feature' ? 'primary' : 'accent';
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
        let color = header === 'Feature' ? 'primary' : 'muted';
        
        // Color code the checkmarks
        if (header !== 'Feature') {
          color = value === '✅' ? 'success' : value === '❌' ? 'error' : 'muted';
        }
        
        const paddedValue = value.padEnd(colWidths[colIndex]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.log(dataRow);
      
      // Add row separator (except for last row)
      if (rowIndex < data.length - 1) {
        console.log(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));
      }
    });

    console.log(styled(bottomBorder, 'muted'));
  }

  async run(): Promise<void> {
    this.isRunning = true;
    const args = Bun.argv.slice(2);
    const command = args[0];

    try {
      await this.executeCommand(command, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(styled(`❌ Error: ${message}`, 'error'));
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  private async executeCommand(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'matrix':
      case undefined:
        await this.displayMatrix();
        break;

      case 'details':
        const index = parseInt(args[1]) || 1;
        await this.displayDetailedView(index);
        break;

      case 'compare':
        await this.displayComparisonMatrix();
        break;

      case 'stats':
        await this.displayStatistics();
        break;

      case 'interactive':
        await this.runInteractiveMode();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;

      default:
        console.log(styled(`❌ Unknown command: ${command}`, 'error'));
        this.showHelp();
    }
  }

  private async runInteractiveMode(): Promise<void> {
    console.log(styled('\n🎮 Interactive Wiki Matrix Mode', 'accent'));
    console.log(colorBar('accent', 50));
    console.log(styled('Type "help" for commands, "exit" to quit', 'muted'));
    console.log('');

    // Create readline interface for interactive input
    const readline = await import('node:readline/promises');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      while (this.isRunning) {
        const command = await rl.question(styled('wiki-matrix> ', 'primary'));
        
        if (!this.isRunning) break;
        
        const trimmedCommand = command.trim().toLowerCase();
        
        if (trimmedCommand === 'exit' || trimmedCommand === 'quit') {
          console.log(styled('👋 Goodbye!', 'success'));
          break;
        } else if (trimmedCommand === 'help') {
          this.showInteractiveHelp();
        } else if (trimmedCommand === 'matrix') {
          await this.displayMatrix();
        } else if (trimmedCommand.startsWith('details ')) {
          const index = parseInt(trimmedCommand.split(' ')[1]) || 1;
          await this.displayDetailedView(index);
        } else if (trimmedCommand === 'compare') {
          await this.displayComparisonMatrix();
        } else if (trimmedCommand === 'stats') {
          await this.displayStatistics();
        } else if (trimmedCommand === 'clear') {
          console.clear();
        } else if (trimmedCommand === '') {
          continue;
        } else {
          console.log(styled(`❌ Unknown command: ${command}`, 'error'));
          console.log(styled('Type "help" for available commands', 'muted'));
        }
      }
    } finally {
      rl.close();
    }
  }

  private showInteractiveHelp(): void {
    console.log(styled('\n📚 Interactive Commands:', 'info'));
    console.log(styled('  matrix     - Show complete template matrix', 'muted'));
    console.log(styled('  details N  - Show details for template N', 'muted'));
    console.log(styled('  compare    - Show feature comparison', 'muted'));
    console.log(styled('  stats      - Show statistics only', 'muted'));
    console.log(styled('  clear      - Clear screen', 'muted'));
    console.log(styled('  help       - Show this help', 'muted'));
    console.log(styled('  exit       - Exit interactive mode', 'muted'));
    console.log('');
  }

  private showHelp(): void {
    console.log(styled('\n🎯 Wiki Template Matrix CLI', 'accent'));
    console.log(styled('================================', 'accent'));
    console.log('');
    console.log(styled('Commands:', 'primary'));
    console.log(styled('  matrix                    - Display complete template matrix', 'info'));
    console.log(styled('  details <index>           - Show detailed view of template', 'info'));
    console.log(styled('  compare                   - Show feature comparison matrix', 'info'));
    console.log(styled('  stats                     - Display statistics only', 'info'));
    console.log(styled('  interactive               - Start interactive mode', 'info'));
    console.log(styled('  help                      - Show this help', 'info'));
    console.log('');
    console.log(styled('Examples:', 'primary'));
    console.log(styled('  bun run scripts/wiki-matrix-cli.ts', 'muted'));
    console.log(styled('  bun run scripts/wiki-matrix-cli.ts details 2', 'muted'));
    console.log(styled('  bun run scripts/wiki-matrix-cli.ts compare', 'muted'));
    console.log(styled('  bun run scripts/wiki-matrix-cli.ts interactive', 'muted'));
    console.log('');
    console.log(styled('Features:', 'primary'));
    console.log(styled('  • Bun.stringWidth for proper column sizing', 'success'));
    console.log(styled('  • Custom table formatting with Unicode borders', 'success'));
    console.log(styled('  • Color-coded complexity and format indicators', 'success'));
    console.log(styled('  • Statistical analysis and distribution charts', 'success'));
    console.log(styled('  • Feature comparison matrix', 'success'));
    console.log(styled('  • Interactive console mode', 'success'));
    console.log(styled('  • Proper exit handling and cleanup', 'success'));
  }
}

// CLI execution
if (import.meta.main) {
  const cli = new WikiMatrixCLI();
  await cli.run();
}
