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
    console.log('🔍 Enhanced Scope Matrix System');
    console.log('=====================================\n');

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
      console.log(JSON.stringify(filteredMatrix, null, 2));
    } else if (options.format === 'markdown') {
      this.outputMatrixAsMarkdown(filteredMatrix, options.verbose);
    } else {
      this.outputMatrixAsTable(filteredMatrix, options.verbose);
    }

    // Show related documentation links
    console.log('\n📚 Related Documentation:');
    console.log('- [Advanced Custom Inspection System](./docs/Advanced%20Custom%20Inspection%20System%20for%20Du.md)');
    console.log('- [Enhanced Inspection System V2](./docs/ENHANCED_INSPECTION_SYSTEM_V2.md)');
    console.log('- [Enterprise Overview](./docs/ENTERPRISE_OVERVIEW.md)');
  }

  private async handleDocsCommand(options: any): Promise<void> {
    console.log('📚 Documentation System');
    console.log('========================\n');

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
        console.log(`📖 ${doc.title}`);
        console.log(`📁 File: ${doc.file}`);
        console.log(`📝 ${doc.description}\n`);
        
        if (options.links) {
          console.log('🔗 Related Links:');
          console.log('- [Documentation Index](./docs/DOCUMENTATION_INDEX.md)');
          console.log('- [Project Structure](./docs/PROJECT_STRUCTURE.md)');
          console.log('- [Deployment Guide](./docs/DEPLOYMENT_COMPLETE.md)');
        }
      } else {
        console.log(`❌ Documentation topic '${options.topic}' not found`);
        console.log('Available topics:', Object.keys(docs).join(', '));
      }
    } else {
      console.log('Available Documentation:');
      Object.entries(docs).forEach(([key, doc]) => {
        console.log(`  ${key}: ${doc.title}`);
        console.log(`      ${doc.description}`);
      });
    }
  }

  private async handleInspectCommand(target: string, options: any): Promise<void> {
    console.log('🔍 Enhanced Inspection System');
    console.log('==============================\n');

    if (!target) {
      console.log('❌ Please provide a target to inspect');
      return;
    }

    // Perform inspection
    const result = await this.inspection.inspectUri(target);
    
    console.log('Inspection Results:');
    console.log(JSON.stringify(result, null, 2));

    // Add matrix context if requested
    if (options.matrix) {
      console.log('\n🔗 Matrix Context:');
      const matrixData = await this.matrix.getMatrixData();
      const scope = result.scope || 'LOCAL-SANDBOX';
      const scopeData = matrixData.filter(row => row.detectedScope === scope);
      
      if (scopeData.length > 0) {
        console.log(`Scope Configuration for ${scope}:`);
        console.log(`- Platform: ${scopeData[0].platform}`);
        console.log(`- Storage Path: ${scopeData[0].storagePathPrefix}`);
        console.log(`- Secrets Backend: ${scopeData[0].secretsBackend}`);
      }
    }

    // Add documentation links if requested
    if (options.docs) {
      console.log('\n📚 Related Documentation:');
      console.log('- [Security WebAPI Enhancement](./SECURITY_WEBAPI_COMPLETE.md)');
      console.log('- [URI Security Validation](./URI_SECURITY_VALIDATION_COMPLETE.md)');
      console.log('- [Production URI Inspection](./PRODUCTION_URI_INSPECTION_SYSTEM_COMPLETE.md)');
    }
  }

  private async handleXrefCommand(query: string, options: any): Promise<void> {
    console.log(`🔗 Cross-Reference Search: "${query}"`);
    console.log('=====================================\n');

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
        console.log(`📂 ${result.type} (${result.count} results):`);
        result.items.forEach((item: any, index: number) => {
          if (result.type === 'Matrix') {
            console.log(`  ${index + 1}. ${item.detectedScope} - ${item.platform}`);
          } else {
            console.log(`  ${index + 1}. ${item.file}`);
          }
        });
        console.log();
      });
    } else {
      console.log('❌ No results found');
    }
  }

  private async handleTimezoneCommand(options: any): Promise<void> {
    console.log('🕐 Timezone Database Integrity Validation');
    console.log('==========================================\n');
    
    const validator = new TzdbIntegrityValidator();
    
    if (options.monthly) {
      console.log('📅 Running monthly validation check...');
      console.log(`💡 Pro Tip: ${validator.getMonthlyValidationCommand()}\n`);
    }
    
    // Validate critical zones
    const servers = options.server ? [options.server] : undefined;
    const report = await validator.validateCriticalZones(servers);
    
    // Display results
    console.log('📊 Validation Results:');
    console.log(`Total Zones Checked: ${report.totalZones}`);
    console.log(`Valid Zones: ${report.validZones}`);
    console.log(`Invalid Zones: ${report.invalidZones}`);
    console.log(`Canonical Zones: ${report.canonicalZoneCount}`);
    console.log(`Link Zones: ${report.linkZoneCount}`);
    console.log(`Integrity Status: ${report.integrityStatus}\n`);
    
    // Show detailed results if verbose
    if (options.verbose && report.validationResults.length > 0) {
      console.log('🔍 Detailed Results:');
      report.validationResults.forEach(result => {
        const status = result.isValid ? '✅' : '❌';
        const server = result.server ? ` (${result.server})` : '';
        console.log(`${status} ${result.zone}${server} - ${result.integrityCheck}`);
        
        if (!result.isValid) {
          console.log(`   Error: ${(result as any).error}`);
        }
      });
      console.log();
    }
    
    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`• ${rec}`);
      });
      console.log();
    }
    
    // Show related documentation
    console.log('📚 Related Documentation:');
    console.log('- [Timezone Matrix v3.7](./tests/timezones/timezone-matrix.test.ts)');
    console.log('- [Enterprise Overview](./docs/ENTERPRISE_OVERVIEW.md)');
    console.log('- [Integration Matrix](./docs/INTEGRATION_MATRIX_COMPLETE.md)');
  }

  private async startInteractiveMode(options: any): Promise<void> {
    console.log('🎮 Interactive Enhanced CLI Mode');
    console.log('=================================\n');
    console.log('Available commands: matrix, docs, inspect, xref, timezone, exit');
    
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
            console.log('Unknown command. Available: matrix, docs, inspect, xref, timezone, exit');
        }
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    rl.close();
    console.log('\n👋 Goodbye!');
  }

  private outputMatrixAsTable(matrix: any[], verbose: boolean = false): void {
    console.log('┌─────────────────────┬─────────────┬──────────┬─────────────────┐');
    console.log('│ Scope              │ Platform    │ Storage  │ Secrets        │');
    console.log('├─────────────────────┼─────────────┼──────────┼─────────────────┤');
    
    matrix.forEach(row => {
      console.log(`│ ${row.detectedScope.padEnd(19)} │ ${row.platform.padEnd(11)} │ ${row.storagePathPrefix.padEnd(8)} │ ${row.secretsBackend.padEnd(15)} │`);
    });
    
    console.log('└─────────────────────┴─────────────┴──────────┴─────────────────┘');
    
    if (verbose) {
      console.log('\n📊 Matrix Statistics:');
      console.log(`Total Entries: ${matrix.length}`);
      console.log(`Scopes: ${[...new Set(matrix.map(r => r.detectedScope))].join(', ')}`);
      console.log(`Platforms: ${[...new Set(matrix.map(r => r.platform))].join(', ')}`);
    }
  }

  private outputMatrixAsMarkdown(matrix: any[], verbose: boolean = false): void {
    console.log('# Enhanced Scope Matrix\n');
    console.log('| Scope | Platform | Storage | Secrets |');
    console.log('|-------|----------|---------|---------|');
    
    matrix.forEach(row => {
      console.log(`| ${row.detectedScope} | ${row.platform} | ${row.storagePathPrefix} | ${row.secretsBackend} |`);
    });
    
    if (verbose) {
      console.log('\n## Statistics\n');
      console.log(`- **Total Entries**: ${matrix.length}`);
      console.log(`- **Scopes**: ${[...new Set(matrix.map(r => r.detectedScope))].join(', ')}`);
      console.log(`- **Platforms**: ${[...new Set(matrix.map(r => r.platform))].join(', ')}`);
    }
  }
}

// Auto-start if run directly
if (import.meta.main) {
  const cli = new EnhancedCLI();
  cli.run().catch(console.error);
}

export { EnhancedCLI };
