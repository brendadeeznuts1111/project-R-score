#!/usr/bin/env bun
/**
 * Performance CLI - Unified command interface for all performance tools
 */

import { ProfileAnalyzer } from '../src/performance/profile-analyzer';
import { OptimizationRecommender } from '../src/performance/optimization-recommender';
import { PerformanceTester } from '../src/performance/performance-tester';
import { PerformanceDashboard } from '../src/performance/performance-dashboard';

interface CLICommand {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
  usage: string;
}

class PerformanceCLI {
  private commands: Map<string, CLICommand> = new Map();

  constructor() {
    this.registerCommands();
  }

  private registerCommands() {
    // Profile Analysis
    this.commands.set('analyze-profiles', {
      name: 'analyze-profiles',
      description: 'Analyze CPU profiles and identify bottlenecks',
      usage: 'bun run tools/performance-cli.ts analyze-profiles [profile-dir]',
      handler: async (args) => {
        const analyzer = new ProfileAnalyzer();
        const results = await analyzer.analyzeAllProfiles();
        analyzer.printAnalysis(results);
      }
    });

    // Code Analysis
    this.commands.set('analyze-code', {
      name: 'analyze-code',
      description: 'Scan codebase for performance anti-patterns',
      usage: 'bun run tools/performance-cli.ts analyze-code [source-dir]',
      handler: async (args) => {
        const recommender = new OptimizationRecommender();
        const sourceDir = args[0] || '.';
        const report = await recommender.analyzeCodebase(sourceDir);
        recommender.printReport(report);
      }
    });

    // Performance Tests
    this.commands.set('test', {
      name: 'test',
      description: 'Run performance test suite',
      usage: 'bun run tools/performance-cli.ts test',
      handler: async () => {
        const tester = new PerformanceTester();
        const results = await tester.runTests();
        tester.printResults(results);
      }
    });

    // Dashboard
    this.commands.set('dashboard', {
      name: 'dashboard',
      description: 'Start performance dashboard',
      usage: 'bun run tools/performance-cli.ts dashboard [port]',
      handler: async (args) => {
        const dashboard = new PerformanceDashboard();
        const port = parseInt(args[0] || '3001');
        await dashboard.start(port);
      }
    });

    // Full Analysis
    this.commands.set('full-analysis', {
      name: 'full-analysis',
      description: 'Run complete performance analysis pipeline',
      usage: 'bun run tools/performance-cli.ts full-analysis',
      handler: async () => {
        console.log('🚀 Running Full Performance Analysis Pipeline');
        console.log('='.repeat(50));

        // 1. Analyze profiles
        console.log('\n📊 Step 1: Analyzing CPU Profiles...');
        const analyzer = new ProfileAnalyzer();
        const profiles = await analyzer.analyzeAllProfiles();
        analyzer.printAnalysis(profiles);

        // 2. Analyze code
        console.log('\n🔍 Step 2: Analyzing Codebase...');
        const recommender = new OptimizationRecommender();
        const report = await recommender.analyzeCodebase();
        recommender.printReport(report);

        // 3. Run tests
        console.log('\n🧪 Step 3: Running Performance Tests...');
        const tester = new PerformanceTester();
        const results = await tester.runTests();
        tester.printResults(results);

        console.log('\n✅ Full Analysis Complete!');
      }
    });

    // Monitor
    this.commands.set('monitor', {
      name: 'monitor',
      description: 'Start continuous monitoring',
      usage: 'bun run tools/performance-cli.ts monitor [interval-minutes]',
      handler: async (args) => {
        const tester = new PerformanceTester();
        const interval = parseInt(args[0] || '60');
        await tester.runContinuousMonitoring(interval);
      }
    });

    // Generate Report
    this.commands.set('report', {
      name: 'report',
      description: 'Generate comprehensive performance report',
      usage: 'bun run tools/performance-cli.ts report',
      handler: async () => {
        const fs = require('fs');
        const path = require('path');

        console.log('📄 Generating Performance Report...');
        
        // Collect data from all tools
        const analyzer = new ProfileAnalyzer();
        const profiles = await analyzer.analyzeAllProfiles();
        
        const recommender = new OptimizationRecommender();
        const report = await recommender.analyzeCodebase();
        
        const tester = new PerformanceTester();
        const testResults = await tester.runTests();

        // Generate markdown report
        const markdown = `# Performance Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

### Test Results
- Total Tests: ${testResults.summary.total}
- Passed: ${testResults.summary.passed}
- Failed: ${testResults.summary.failed}
- Regressions: ${testResults.summary.regressions.length}

### Code Analysis
- Files Analyzed: ${report.summary.totalFiles}
- Issues Found: ${report.summary.totalIssues}
- High Priority: ${report.summary.highPriority}
- Medium Priority: ${report.summary.mediumPriority}
- Low Priority: ${report.summary.lowPriority}

### CPU Profiles
- Profiles Analyzed: ${profiles.size}
- Total Bottlenecks: ${Array.from(profiles.values()).reduce((sum, p) => sum + (p.bottlenecks?.length || 0), 0)}
- Optimization Opportunities: ${Array.from(profiles.values()).reduce((sum, p) => sum + (p.optimizationOpportunities?.length || 0), 0)}

## Recommendations

### Critical Actions
${report.recommendations.filter(r => r.severity === 'high').map(r => `- **${r.issue}** (${r.file}:${r.line})`).join('\n')}

### Important Actions
${report.recommendations.filter(r => r.severity === 'medium').slice(0, 10).map(r => `- ${r.issue} (${r.file}:${r.line})`).join('\n')}

## Next Steps
1. Address critical issues immediately
2. Implement high-priority optimizations
3. Re-run analysis after changes
4. Monitor for regressions

---

*Report generated by Performance Analysis Toolkit*
`;

        const reportPath = path.join(process.cwd(), 'performance-report.md');
        fs.writeFileSync(reportPath, markdown);
        console.log(`✅ Report saved to: ${reportPath}`);
      }
    });

    // Help
    this.commands.set('help', {
      name: 'help',
      description: 'Show this help message',
      usage: 'bun run tools/performance-cli.ts help',
      handler: async () => {
        this.showHelp();
      }
    });
  }

  private showHelp() {
    console.log('🚀 Performance Analysis CLI');
    console.log('='.repeat(50));
    console.log('\nAvailable Commands:\n');

    for (const [name, cmd] of this.commands) {
      console.log(`  ${name}`);
      console.log(`    ${cmd.description}`);
      console.log(`    Usage: ${cmd.usage}`);
      console.log('');
    }

    console.log('Examples:');
    console.log('  bun run tools/performance-cli.ts analyze-profiles');
    console.log('  bun run tools/performance-cli.ts analyze-code ./src');
    console.log('  bun run tools/performance-cli.ts test');
    console.log('  bun run tools/performance-cli.ts dashboard 3001');
    console.log('  bun run tools/performance-cli.ts full-analysis');
    console.log('  bun run tools/performance-cli.ts monitor 60');
    console.log('  bun run tools/performance-cli.ts report');
  }

  async run(args: string[]) {
    const command = args[0] || 'help';

    if (!this.commands.has(command)) {
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nUse "help" to see available commands');
      process.exit(1);
    }

    const cmd = this.commands.get(command)!;
    const cmdArgs = args.slice(1);

    try {
      await cmd.handler(cmdArgs);
    } catch (error) {
      console.error(`❌ Error executing command "${command}":`, error);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const cli = new PerformanceCLI();
  const args = process.argv.slice(2);
  await cli.run(args);
}

// Export for use as module
export { PerformanceCLI };

// Run if called directly
if (import.meta.main) {
  main();
}