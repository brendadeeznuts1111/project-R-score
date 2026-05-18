#!/usr/bin/env bun

/**
 * Enhanced FactoryWager CLI v4.0 - Matrix & Documentation Integration
 * 
 * Advanced CLI with cross-referenced matrix system, documentation links,
 * and integrated inspection capabilities with real-time navigation.
 */

import { Command } from 'commander';
import { EnhancedScopeMatrix } from '../@core/enhanced-matrix-system.js';
import { SuperchargedInspectionSystem } from '../@inspection/supercharged-cli.js';
import { InspectionMonitor } from '../../ecosystem/inspect-custom.ts';
import { TzdbIntegrityValidator, runTzdbValidation } from '../@core/timezone/tzdb-integrity-validator.js';

interface CLIOptions {
  verbose?: boolean;
  matrix?: boolean;
  docs?: boolean;
  interactive?: boolean;
  scope?: string;
  format?: 'table' | 'json' | 'markdown';
}

class EnhancedCLI {
  private matrix: EnhancedScopeMatrix;
  private inspection: SuperchargedInspectionSystem;
  private monitor: InspectionMonitor;

  constructor() {
    this.matrix = new EnhancedScopeMatrix();
    this.inspection = new SuperchargedInspectionSystem();
    this.monitor = new InspectionMonitor();
  }

  async run(): Promise<void> {
    const program = new Command();
    
    program
      .name('factory-wager-enhanced')
      .description('Enhanced FactoryWager CLI with Matrix & Documentation Integration')
      .version('4.0.0');

    // Matrix commands
    program
      .command('matrix')
      .description('View and interact with the enhanced scope matrix')
      .option('-s, --scope <scope>', 'Filter by scope (ENTERPRISE|DEVELOPMENT|LOCAL-SANDBOX)')
      .option('-p, --platform <platform>', 'Filter by platform')
      .option('-f, --format <format>', 'Output format (table|json|markdown)', 'table')
      .option('-v, --verbose', 'Verbose output')
      .action((options) => this.handleMatrixCommand(options));

    // Documentation commands
    program
      .command('docs')
      .description('Access cross-referenced documentation')
      .option('-t, --topic <topic>', 'Documentation topic')
      .option('-l, --links', 'Show related links')
      .option('-r, --related', 'Show related documentation')
      .action((options) => this.handleDocsCommand(options));

    // Inspection commands
    program
      .command('inspect')
      .description('Enhanced inspection with matrix context')
      .argument('[target]', 'Target to inspect')
      .option('-m, --matrix', 'Include matrix context')
      .option('-d, --docs', 'Include documentation links')
      .option('-v, --verbose', 'Verbose inspection')
      .action((target, options) => this.handleInspectCommand(target, options));

    // Cross-reference command
    program
      .command('xref')
      .description('Cross-reference matrix, docs, and inspection')
      .argument('<query>', 'Search query')
      .option('-t, --type <type>', 'Type: matrix|docs|inspection|all', 'all')
      .option('-f, --format <format>', 'Output format', 'table')
      .action((query, options) => this.handleXrefCommand(query, options));

    // Timezone validation command
    program
      .command('timezone')
      .description('Timezone database integrity validation')
      .option('-s, --server <server>', 'Validate on specific server')
      .option('-m, --monthly', 'Run monthly validation check')
      .option('-v, --verbose', 'Verbose output')
      .action((options) => this.handleTimezoneCommand(options));

    // Interactive mode
    program
      .command('interactive')
      .description('Start interactive CLI mode')
      .option('-v, --verbose', 'Verbose output')
      .action((options) => this.startInteractiveMode(options));

    await program.parseAsync();
  }

  private async handleMatrixCommand(options: any): Promise<void> {
    console.info('🔍 Enhanced Scope Matrix System');
    console.info('=====================================\n');

    const matrix = await this.matrix.getMatrixData();
    
    let filteredMatrix = matrix;
    
    if (options.scope) {
      filteredMatrix = filteredMatrix.filter(row => 
        row.detectedScope === options.scope.toUpperCase()
      );
    }
    
    if (options.platform) {
      filteredMatrix = filteredMatrix.filter(row => 
        row.platform.toLowerCase() === options.platform.toLowerCase()
      );
    }

    if (options.format === 'json') {
      console.info(JSON.stringify(filteredMatrix, null, 2));
    } else if (options.format === 'markdown') {
      this.outputMatrixAsMarkdown(filteredMatrix, options.verbose);
    } else {
      this.outputMatrixAsTable(filteredMatrix, options.verbose);
    }

    // Show related documentation links
    console.info('\n📚 Related Documentation:');
    console.info('- [Advanced Custom Inspection System](./docs/Advanced%20Custom%20Inspection%20System%20for%20Du.md)');
    console.info('- [Enhanced Inspection System V2](./docs/ENHANCED_INSPECTION_SYSTEM_V2.md)');
    console.info('- [Enterprise Overview](./docs/ENTERPRISE_OVERVIEW.md)');
  }

  private async handleDocsCommand(options: any): Promise<void> {
    console.info('📚 Documentation System');
    console.info('========================\n');

    const docs = {
      'inspection': {
        title: 'Advanced Custom Inspection System',
        file: './docs/Advanced Custom Inspection System for Du.md',
        description: 'Comprehensive inspection system with real-time monitoring'
      },
      'enhanced': {
        title: 'Enhanced Inspection System V2',
        file: './docs/ENHANCED_INSPECTION_SYSTEM_V2.md',
        description: 'Latest inspection features and enhancements'
      },
      'enterprise': {
        title: 'Enterprise Overview',
        file: './docs/ENTERPRISE_OVERVIEW.md',
        description: 'Platform overview and architecture'
      },
      'matrix': {
        title: 'URL Organization Matrix',
        file: './docs/URL_ORGANIZATION_MATRIX.md',
        description: 'Complete URL system matrix'
      },
      'security': {
        title: 'Security Implementation',
        file: './docs/PRODUCTION_HARDENED_COMPLETE.md',
        description: 'Security features and compliance'
      }
    };

    if (options.topic) {
      const doc = docs[options.topic.toLowerCase()];
      if (doc) {
        console.info(`📖 ${doc.title}`);
        console.info(`📁 File: ${doc.file}`);
        console.info(`📝 ${doc.description}\n`);
        
        if (options.links) {
          console.info('🔗 Related Links:');
          console.info('- [Documentation Index](./docs/DOCUMENTATION_INDEX.md)');
          console.info('- [Project Structure](./docs/PROJECT_STRUCTURE.md)');
          console.info('- [Deployment Guide](./docs/DEPLOYMENT_COMPLETE.md)');
        }
      } else {
        console.info(`❌ Documentation topic '${options.topic}' not found`);
        console.info('Available topics:', Object.keys(docs).join(', '));
      }
    } else {
      console.info('Available Documentation:');
      Object.entries(docs).forEach(([key, doc]) => {
        console.info(`  ${key}: ${doc.title}`);
        console.info(`      ${doc.description}`);
      });
    }
  }

  private async handleInspectCommand(target: string, options: any): Promise<void> {
    console.info('🔍 Enhanced Inspection System');
    console.info('==============================\n');

    if (!target) {
      console.info('❌ Please provide a target to inspect');
      return;
    }

    // Perform inspection
    const result = await this.inspection.inspectUri(target);
    
    console.info('Inspection Results:');
    console.info(JSON.stringify(result, null, 2));

    // Add matrix context if requested
    if (options.matrix) {
      console.info('\n🔗 Matrix Context:');
      const matrixData = await this.matrix.getMatrixData();
      const scope = result.scope || 'LOCAL-SANDBOX';
      const scopeData = matrixData.filter(row => row.detectedScope === scope);
      
      if (scopeData.length > 0) {
        console.info(`Scope Configuration for ${scope}:`);
        console.info(`- Platform: ${scopeData[0].platform}`);
        console.info(`- Storage Path: ${scopeData[0].storagePathPrefix}`);
        console.info(`- Secrets Backend: ${scopeData[0].secretsBackend}`);
      }
    }

    // Add documentation links if requested
    if (options.docs) {
      console.info('\n📚 Related Documentation:');
      console.info('- [Security WebAPI Enhancement](./SECURITY_WEBAPI_COMPLETE.md)');
      console.info('- [URI Security Validation](./URI_SECURITY_VALIDATION_COMPLETE.md)');
      console.info('- [Production URI Inspection](./PRODUCTION_URI_INSPECTION_SYSTEM_COMPLETE.md)');
    }
  }

  private async handleXrefCommand(query: string, options: any): Promise<void> {
    console.info(`🔗 Cross-Reference Search: "${query}"`);
    console.info('=====================================\n');

    const results: any[] = [];

    // Search in matrix
    if (options.type === 'all' || options.type === 'matrix') {
      const matrixData = await this.matrix.getMatrixData();
      const matrixMatches = matrixData.filter(row => 
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase())
      );
      
      if (matrixMatches.length > 0) {
        results.push({
          type: 'Matrix',
          count: matrixMatches.length,
          items: matrixMatches.slice(0, 3) // Show first 3
        });
      }
    }

    // Search in documentation
    if (options.type === 'all' || options.type === 'docs') {
      const docFiles = [
        'Advanced Custom Inspection System for Du.md',
        'ENHANCED_INSPECTION_SYSTEM_V2.md',
        'ENTERPRISE_OVERVIEW.md',
        'URL_ORGANIZATION_MATRIX.md'
      ];
      
      results.push({
        type: 'Documentation',
        count: docFiles.length,
        items: docFiles.map(doc => ({ file: `./docs/${doc}` }))
      });
    }

    // Display results
    if (results.length > 0) {
      results.forEach(result => {
        console.info(`📂 ${result.type} (${result.count} results):`);
        result.items.forEach((item: any, index: number) => {
          if (result.type === 'Matrix') {
            console.info(`  ${index + 1}. ${item.detectedScope} - ${item.platform}`);
          } else {
            console.info(`  ${index + 1}. ${item.file}`);
          }
        });
        console.info();
      });
    } else {
      console.info('❌ No results found');
    }
  }

  private async handleTimezoneCommand(options: any): Promise<void> {
    console.info('🕐 Timezone Database Integrity Validation');
    console.info('==========================================\n');
    
    const validator = new TzdbIntegrityValidator();
    
    if (options.monthly) {
      console.info('📅 Running monthly validation check...');
      console.info(`💡 Pro Tip: ${validator.getMonthlyValidationCommand()}\n`);
    }
    
    // Validate critical zones
    const servers = options.server ? [options.server] : undefined;
    const report = await validator.validateCriticalZones(servers);
    
    // Display results
    console.info('📊 Validation Results:');
    console.info(`Total Zones Checked: ${report.totalZones}`);
    console.info(`Valid Zones: ${report.validZones}`);
    console.info(`Invalid Zones: ${report.invalidZones}`);
    console.info(`Canonical Zones: ${report.canonicalZoneCount}`);
    console.info(`Link Zones: ${report.linkZoneCount}`);
    console.info(`Integrity Status: ${report.integrityStatus}\n`);
    
    // Show detailed results if verbose
    if (options.verbose && report.validationResults.length > 0) {
      console.info('🔍 Detailed Results:');
      report.validationResults.forEach(result => {
        const status = result.isValid ? '✅' : '❌';
        const server = result.server ? ` (${result.server})` : '';
        console.info(`${status} ${result.zone}${server} - ${result.integrityCheck}`);
        
        if (!result.isValid) {
          console.info(`   Error: ${(result as any).error}`);
        }
      });
      console.info();
    }
    
    // Show recommendations
    if (report.recommendations.length > 0) {
      console.info('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.info(`• ${rec}`);
      });
      console.info();
    }
    
    // Show related documentation
    console.info('📚 Related Documentation:');
    console.info('- [Timezone Matrix v3.7](./tests/timezones/timezone-matrix.test.ts)');
    console.info('- [Enterprise Overview](./docs/ENTERPRISE_OVERVIEW.md)');
    console.info('- [Integration Matrix](./docs/INTEGRATION_MATRIX_COMPLETE.md)');
  }

  private async startInteractiveMode(options: any): Promise<void> {
    console.info('🎮 Interactive Enhanced CLI Mode');
    console.info('=================================\n');
    console.info('Available commands: matrix, docs, inspect, xref, timezone, exit');
    
    // Simple interactive loop
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    while (true) {
      const input = await askQuestion('factory-wager> ');
      const args = input.trim().split(' ');
      const command = args[0];

      if (command === 'exit' || command === 'quit') {
        break;
      }

      try {
        switch (command) {
          case 'matrix':
            await this.handleMatrixCommand({ format: 'table', verbose: options.verbose });
            break;
          case 'docs':
            await this.handleDocsCommand({});
            break;
          case 'inspect':
            await this.handleInspectCommand(args[1], { matrix: true, docs: true });
            break;
          case 'xref':
            await this.handleXrefCommand(args.slice(1).join(' '), { type: 'all' });
            break;
          case 'timezone':
            await this.handleTimezoneCommand({ monthly: true, verbose: options.verbose });
            break;
          default:
            console.info('Unknown command. Available: matrix, docs, inspect, xref, timezone, exit');
        }
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.info('\n👋 Goodbye!');
  }

  private outputMatrixAsTable(matrix: any[], verbose: boolean = false): void {
    console.info('┌─────────────────────┬─────────────┬──────────┬─────────────────┐');
    console.info('│ Scope              │ Platform    │ Storage  │ Secrets        │');
    console.info('├─────────────────────┼─────────────┼──────────┼─────────────────┤');
    
    matrix.forEach(row => {
      console.info(`│ ${row.detectedScope.padEnd(19)} │ ${row.platform.padEnd(11)} │ ${row.storagePathPrefix.padEnd(8)} │ ${row.secretsBackend.padEnd(15)} │`);
    });
    
    console.info('└─────────────────────┴─────────────┴──────────┴─────────────────┘');
    
    if (verbose) {
      console.info('\n📊 Matrix Statistics:');
      console.info(`Total Entries: ${matrix.length}`);
      console.info(`Scopes: ${[...new Set(matrix.map(r => r.detectedScope))].join(', ')}`);
      console.info(`Platforms: ${[...new Set(matrix.map(r => r.platform))].join(', ')}`);
    }
  }

  private outputMatrixAsMarkdown(matrix: any[], verbose: boolean = false): void {
    console.info('# Enhanced Scope Matrix\n');
    console.info('| Scope | Platform | Storage | Secrets |');
    console.info('|-------|----------|---------|---------|');
    
    matrix.forEach(row => {
      console.info(`| ${row.detectedScope} | ${row.platform} | ${row.storagePathPrefix} | ${row.secretsBackend} |`);
    });
    
    if (verbose) {
      console.info('\n## Statistics\n');
      console.info(`- **Total Entries**: ${matrix.length}`);
      console.info(`- **Scopes**: ${[...new Set(matrix.map(r => r.detectedScope))].join(', ')}`);
      console.info(`- **Platforms**: ${[...new Set(matrix.map(r => r.platform))].join(', ')}`);
    }
  }
}

// Auto-start if run directly
if (import.meta.main) {
  const cli = new EnhancedCLI();
  cli.run().catch(console.error);
}

export { EnhancedCLI };
