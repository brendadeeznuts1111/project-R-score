#!/usr/bin/env bun

/**
 * FactoryWager CLI v3.0+ - Supercharged Inspection System
 * Enterprise-grade CLI with JSONPath, JQ-like filtering, interactive TUI, and analytics
 */

import { Command } from 'commander';
import boxen from 'boxen';
import ora from 'ora';
import inquirer from 'inquirer';
import { Table } from 'cli-table3';
import { JSONPath } from 'jsonpath-plus';
import jp from 'jmespath';
import { YAML } from "bun";
import { marked } from 'marked';
import hljs from 'highlight.js';

// Import our existing inspection systems
import { ProductionUriInspector } from '../../cli/production-uri-inspector';
import { AdvancedUriInspector } from '../../cli/advanced-uri-inspector';

const program = new Command();

interface InspectionOptions {
  interactive?: boolean;
  analytics?: boolean;
  security?: boolean;
  patterns?: boolean;
  format?: string;
  output?: string;
  tree?: boolean;
  jsonpath?: string;
  jq?: string;
  verbose?: boolean;
}

interface InspectionResult {
  timestamp: string;
  uri: string;
  status: string;
  category: string;
  message: string;
  decodedUri?: string;
  zeroWidthAnalysis: any;
  encodingAnomalies: string[];
  securityRisk: string;
  displayWidth: number;
  processingTime: number;
  metadata?: Record<string, any>;
}

class SuperchargedInspectionSystem {
  private uriInspector: ProductionUriInspector;
  private advancedInspector: AdvancedUriInspector;
  private results: InspectionResult[] = [];
  
  constructor() {
    this.uriInspector = new ProductionUriInspector();
    this.advancedInspector = new AdvancedUriInspector();
  }
  
  /**
   * Interactive TUI mode
   */
  async runInteractive(): Promise<void> {
    console.clear();
    
    const welcomeBox = boxen(
      console.log('\u001b[36m\u001b[1m🚀 FactoryWager Supercharged Inspection System\u001b[0m' + '\n\n' +
      '\u001b[90mEnterprise-grade URI security inspection with advanced analytics\u001b[0m'),
      {
        title: 'Welcome',
        titleAlignment: 'center',
        padding: 1,
        borderStyle: 'double',
        borderColor: 'cyan'
      }
    );
    
    console.log(welcomeBox);
    console.log();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Inspect Single URI', value: 'single' },
          { name: '📁 Batch Inspection from File', value: 'batch' },
          { name: '🛡️ Security Analysis', value: 'security' },
          { name: '📊 Analytics Dashboard', value: 'analytics' },
          { name: '🎯 Pattern Matching', value: 'patterns' },
          { name: '🌳 Tree View', value: 'tree' },
          { name: '📤 Export Results', value: 'export' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);
    
    switch (action) {
      case 'single':
        await this.interactiveSingleInspection();
        break;
      case 'batch':
        await this.interactiveBatchInspection();
        break;
      case 'security':
        await this.interactiveSecurityAnalysis();
        break;
      case 'analytics':
        await this.showAnalyticsDashboard();
        break;
      case 'patterns':
        await this.interactivePatternMatching();
        break;
      case 'tree':
        await this.showTreeView();
        break;
      case 'export':
        await this.interactiveExport();
        break;
      case 'exit':
        console.log('\u001b[32m👋 Goodbye!\u001b[0m');
        process.exit(0);
    }
  }
  
  /**
   * Interactive single URI inspection
   */
  async interactiveSingleInspection(): Promise<void> {
    const { uri } = await inquirer.prompt([
      {
        type: 'input',
        name: 'uri',
        message: 'Enter URI to inspect:',
        validate: (input) => input.trim() !== '' || 'URI is required'
      }
    ]);
    
    const spinner = ora('Inspecting URI...').start();
    
    try {
      const result = this.uriInspector.inspectUri(uri);
      this.results.push(this.formatResult(result));
      
      spinner.succeed('Inspection complete');
      
      this.displayDetailedResult(result);
    } catch (error) {
      spinner.fail('Inspection failed');
      console.error(`\u001b[31mError: ${error}\u001b[0m`);
    }
    
    await this.promptContinue();
  }
  
  /**
   * Format result for consistent storage
   */
  private formatResult(result: any): InspectionResult {
    return {
      timestamp: new Date().toISOString(),
      uri: result.uri,
      status: result.status,
      category: result.category,
      message: result.message,
      decodedUri: result.decodedUri,
      zeroWidthAnalysis: result.zeroWidthAnalysis,
      encodingAnomalies: result.encodingAnomalies,
      securityRisk: result.securityRisk,
      displayWidth: result.displayWidth,
      processingTime: result.processingTime
    };
  }
  
  /**
   * Display detailed inspection result
   */
  private displayDetailedResult(result: any): void {
    console.log('\n' + '='.repeat(60));
    console.log(`\u001b[36mURI:\u001b[0m ${result.uri}`);
    console.log(`\u001b[36mStatus:\u001b[0m ${result.status}`);
    console.log(`\u001b[36mCategory:\u001b[0m ${result.category}`);
    console.log(`\u001b[36mSecurity Risk:\u001b[0m ${result.securityRisk}`);
    console.log(`\u001b[36mMessage:\u001b[0m ${result.message}`);
    console.log(`\u001b[36mProcessing Time:\u001b[0m ${result.processingTime.toFixed(2)}ms`);
    console.log('='.repeat(60) + '\n');
    
    if (result.zeroWidthAnalysis.has) {
      console.log('\n⚠️  Zero-Width Characters:');
      result.zeroWidthAnalysis.positions.forEach((pos: number, i: number) => {
        console.log(`   ${i + 1}. Position ${pos}: ${result.zeroWidthAnalysis.types[i]}`);
      });
    }
    
    if (result.encodingAnomalies.length > 0) {
      console.log('\n🚨 Encoding Anomalies:');
      result.encodingAnomalies.forEach((anomaly: string, i: number) => {
        console.log(`   ${i + 1}. ${anomaly}`);
      });
    }
  }
  
  /**
   * Get status color
   */
  private getStatusColor(status: string): Function {
    return (text: string) => text;
  }
  
  /**
   * Get risk color
   */
  private getRiskColor(risk: string): Function {
    return (text: string) => text;
  }
  
  /**
   * Prompt to continue
   */
  private async promptContinue(): Promise<void> {
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Continue?',
        default: true
      }
    ]);
    
    if (shouldContinue) {
      await this.runInteractive();
    }
  }
}

// Initialize and configure CLI program
program
  .name('factory-wager-inspect')
  .description('Supercharged FactoryWager CLI Inspection System')
  .version('2.0.0');

// Main inspection command
program
  .command('inspect')
  .description('Inspect URIs with advanced analysis')
  .option('-i, --interactive', 'Run in interactive TUI mode')
  .option('-a, --analytics', 'Show analytics dashboard')
  .option('-s, --security', 'Focus on security analysis')
  .option('-p, --patterns', 'Enable pattern matching')
  .option('-f, --format <format>', 'Output format (json, csv, markdown, html)', 'table')
  .option('-o, --output <file>', 'Output file path')
  .option('-t, --tree', 'Show tree view')
  .option('--jsonpath <pattern>', 'Apply JSONPath filter')
  .option('--jq <pattern>', 'Apply JMESPath (JQ-like) filter')
  .option('-v, --verbose', 'Verbose output')
  .argument('[uri]', 'URI to inspect')
  .action(async (uri, options) => {
    const system = new SuperchargedInspectionSystem();
    
    if (options.interactive) {
      await system.runInteractive();
      return;
    }
    
    if (uri) {
      // Single URI inspection
      const result = system['uriInspector'].inspectUri(uri);
      console.log(result[Symbol.for('Bun.inspect.custom')]());
      
      if (options.verbose) {
        console.log('\n📊 Detailed Analysis:');
        console.log(`   Raw URI: ${result.uri}`);
        console.log(`   Decoded URI: ${result.decodedUri || 'N/A'}`);
        console.log(`   Security Risk: ${result.securityRisk}`);
        console.log(`   Processing Time: ${result.processingTime.toFixed(2)}ms`);
      }
    } else {
      console.log('\u001b[33mPlease provide a URI or use --interactive mode\u001b[0m');
    }
  });

// Parse command line arguments
program.parse();

// Export for programmatic use
export { SuperchargedInspectionSystem, InspectionResult, InspectionOptions };
