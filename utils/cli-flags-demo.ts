#!/usr/bin/env bun
// cli-flags-demo.ts - v2.8: Complete CLI Flags Integration Demonstration

import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';

interface CLIFlagResult {
  flag: string;
  description: string;
  exitCode: number;
  executionTime: number;
  output: string;
  features: string[];
}

class CLIFlagsDemo {
  private results: CLIFlagResult[] = [];

  // 🚀 Demonstrate all CLI flags
  async demonstrateAllFlags(): Promise<void> {
    console.log('🚀 Bun Test CLI Flags Integration Demo');
    console.log('==========================================');
    console.log('📋 Testing all available CLI flags...\n');

    // Create test files for demonstration
    await this.createTestFiles();

    // Test each CLI flag
    const flags = [
      { flag: '--watch', description: 'Watch mode for continuous testing' },
      { flag: '--coverage', description: 'Generate coverage report' },
      { flag: '--verbose', description: 'Verbose output with details' },
      { flag: '--bail', description: 'Stop on first failure' },
      { flag: '--run', description: 'Run tests (default behavior)' },
      { flag: '--preload', description: 'Preload files before tests' },
      { flag: '--timeout', description: 'Set test timeout', args: ['5000'] },
      { flag: '--test-name-pattern', description: 'Run tests matching pattern', args: ['basic'] },
      { flag: '--test-ignore-pattern', description: 'Ignore tests matching pattern', args: ['slow'] },
      { flag: '--config', description: 'Use custom config file', args: ['bun-test.config.ts'] }
    ];

    for (const { flag, description, args = [] } of flags) {
      await this.testFlag(flag, description, args);
    }

    // Generate comprehensive report
    this.generateReport();
  }

  // 📁 Create test files for demonstration
  private async createTestFiles(): Promise<void> {
    console.log('📁 Creating test files...');

    // Basic test file
    writeFileSync('tmp-basic.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Basic Tests', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  test('slow test', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
});
`);

    // Failing test file
    writeFileSync('tmp-failing.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Failing Tests', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });

  test('should fail', () => {
    expect(true).toBe(false);
  });
});
`);

    // Test with coverage targets
    writeFileSync('tmp-coverage.test.ts', `
import { test, expect } from 'bun:test';

export function helperFunction(value: number): number {
  return value * 2;
}

export class TestClass {
  getValue(): string {
    return 'test value';
  }
}

test('should test helper function', () => {
  expect(helperFunction(5)).toBe(10);
});

test('should test class', () => {
  const instance = new TestClass();
  expect(instance.getValue()).toBe('test value');
});
`);

    console.log('✅ Test files created\n');
  }

  // 🧪 Test individual CLI flag
  private async testFlag(flag: string, description: string, args: string[] = []): Promise<void> {
    console.log(`🧪 Testing ${flag}: ${description}`);

    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const testArgs = ['test', ...args, 'tmp-basic.test.ts'];
      
      // Special handling for certain flags
      if (flag === '--coverage') {
        testArgs.push('tmp-coverage.test.ts');
      } else if (flag === '--bail') {
        testArgs.push('tmp-failing.test.ts');
      }

      const testProcess = spawn('bun', testArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let features: string[] = [];

      // Capture output
      testProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Detect features based on output
        if (text.includes('coverage')) features.push('Coverage report generated');
        if (text.includes('verbose')) features.push('Verbose output enabled');
        if (text.includes('bail')) features.push('Bail on first failure');
        if (text.includes('watch')) features.push('Watch mode active');
        if (text.includes('timeout')) features.push('Custom timeout applied');
        if (text.includes('pattern')) features.push('Pattern matching applied');
      });

      testProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      // Handle process completion
      testProcess.on('close', (code, signal) => {
        const executionTime = performance.now() - startTime;
        
        const result: CLIFlagResult = {
          flag,
          description,
          exitCode: code || 0,
          executionTime,
          output: output.slice(0, 500), // Limit output length
          features
        };

        this.results.push(result);
        
        console.log(`   Exit Code: ${code}`);
        console.log(`   Time: ${executionTime.toFixed(2)}ms`);
        if (features.length > 0) {
          console.log(`   Features: ${features.join(', ')}`);
        }
        console.log('');

        resolve();
      });

      // Safety timeout for long-running processes
      const timeout = flag === '--watch' ? 3000 : 10000;
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill('SIGTERM');
        }
      }, timeout);
    });
  }

  // 📊 Generate comprehensive report
  private generateReport(): void {
    console.log('📊 CLI Flags Integration Report');
    console.log('===============================');

    // Summary table
    console.log('\n📋 Flag Summary:');
    console.table(this.results.map(r => ({
      Flag: r.flag,
      Description: r.description,
      'Exit Code': r.exitCode,
      'Time (ms)': r.executionTime.toFixed(2),
      Features: r.features.join(', ') || 'None'
    })));

    // Detailed analysis
    console.log('\n🔍 Detailed Analysis:');
    
    this.results.forEach(result => {
      console.log(`\n${result.flag}:`);
      console.log(`  Description: ${result.description}`);
      console.log(`  Exit Code: ${result.exitCode}`);
      console.log(`  Execution Time: ${result.executionTime.toFixed(2)}ms`);
      
      if (result.features.length > 0) {
        console.log(`  Detected Features:`);
        result.features.forEach(feature => {
          console.log(`    • ${feature}`);
        });
      }
      
      // Show sample output
      if (result.output.length > 0) {
        const preview = result.output.split('\n').slice(0, 3).join('\n');
        console.log(`  Output Preview:`);
        console.log(`    ${preview.replace(/\n/g, '\n    ')}`);
      }
    });

    // Performance analysis
    console.log('\n⚡ Performance Analysis:');
    const avgTime = this.results.reduce((sum, r) => sum + r.executionTime, 0) / this.results.length;
    const fastest = this.results.reduce((min, r) => r.executionTime < min.executionTime ? r : min);
    const slowest = this.results.reduce((max, r) => r.executionTime > max.executionTime ? r : max);
    
    console.log(`  Average Time: ${avgTime.toFixed(2)}ms`);
    console.log(`  Fastest: ${fastest.flag} (${fastest.executionTime.toFixed(2)}ms)`);
    console.log(`  Slowest: ${slowest.flag} (${slowest.executionTime.toFixed(2)}ms)`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    const coverageResult = this.results.find(r => r.flag === '--coverage');
    if (coverageResult && coverageResult.exitCode === 0) {
      console.log('  ✅ Use --coverage for code quality analysis');
    }
    
    const bailResult = this.results.find(r => r.flag === '--bail');
    if (bailResult && bailResult.exitCode !== 0) {
      console.log('  ✅ Use --bail for faster CI feedback');
    }
    
    const verboseResult = this.results.find(r => r.flag === '--verbose');
    if (verboseResult) {
      console.log('  ✅ Use --verbose for detailed debugging');
    }

    // Save detailed report
    this.saveMarkdownReport();
  }

  // 📄 Save markdown report
  private saveMarkdownReport(): void {
    let report = '# 🚀 Bun Test CLI Flags Integration Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Bun Version**: ${Bun.version}\n\n`;

    report += '## 📋 CLI Flags Tested\n\n';
    report += '| Flag | Description | Exit Code | Time (ms) | Features |\n';
    report += '|------|-------------|-----------|-----------|----------|\n';

    this.results.forEach(result => {
      const features = result.features.join(', ') || 'None';
      report += `| ${result.flag} | ${result.description} | ${result.exitCode} | ${result.executionTime.toFixed(2)} | ${features} |\n`;
    });

    report += '\n## 🔍 Detailed Results\n\n';

    this.results.forEach(result => {
      report += `### ${result.flag}\n\n`;
      report += `**Description**: ${result.description}\n\n`;
      report += `**Exit Code**: ${result.exitCode}\n\n`;
      report += `**Execution Time**: ${result.executionTime.toFixed(2)}ms\n\n`;
      
      if (result.features.length > 0) {
        report += '**Detected Features**:\n\n';
        result.features.forEach(feature => {
          report += `- ${feature}\n`;
        });
        report += '\n';
      }
      
      if (result.output.length > 0) {
        report += '**Output Preview**:\n\n';
        report += '```\n';
        report += result.output.slice(0, 300) + (result.output.length > 300 ? '...' : '');
        report += '\n```\n\n';
      }
    });

    report += '## ⚡ Performance Analysis\n\n';
    const avgTime = this.results.reduce((sum, r) => sum + r.executionTime, 0) / this.results.length;
    const fastest = this.results.reduce((min, r) => r.executionTime < min.executionTime ? r : min);
    const slowest = this.results.reduce((max, r) => r.executionTime > max.executionTime ? r : max);
    
    report += `- **Average Time**: ${avgTime.toFixed(2)}ms\n`;
    report += `- **Fastest**: ${fastest.flag} (${fastest.executionTime.toFixed(2)}ms)\n`;
    report += `- **Slowest**: ${slowest.flag} (${slowest.executionTime.toFixed(2)}ms)\n\n`;

    report += '## 💡 Usage Recommendations\n\n';
    report += '- **--coverage**: Use for code quality analysis and test coverage\n';
    report += '- **--bail**: Use in CI for faster feedback on first failure\n';
    report += '- **--verbose**: Use for detailed debugging and test analysis\n';
    report += '- **--watch**: Use during development for continuous testing\n';
    report += '- **--timeout**: Use for tests that need custom time limits\n';
    report += '- **--test-name-pattern**: Use to run specific test subsets\n\n';

    report += '## 🚀 Integration Examples\n\n';
    report += '```bash\n';
    report += '# Basic test run\n';
    report += 'bun test\n\n';
    report += '# With coverage\n';
    report += 'bun test --coverage\n\n';
    report += '# CI-friendly with bail\n';
    report += 'bun test --bail --coverage\n\n';
    report += '# Development with watch\n';
    report += 'bun test --watch --verbose\n\n';
    report += '# Specific test pattern\n';
    report += 'bun test --test-name-pattern "integration"\n';
    report += '```\n\n';

    report += '---\n\n';
    report += '*Generated by CLI Flags Integration Demo v2.8*';

    Bun.write('cli-flags-integration-report.md', report);
    console.log('📄 Detailed report saved to: cli-flags-integration-report.md');
  }

  // 🧹 Cleanup test files
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test files...');
    
    const files = ['tmp-basic.test.ts', 'tmp-failing.test.ts', 'tmp-coverage.test.ts'];
    
    for (const file of files) {
      if (existsSync(file)) {
        await Bun.remove(file);
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('CLI Flags Integration Demo v2.8');
    console.log('');
    console.log('Demonstrates all Bun test CLI flags and their effects:');
    console.log('• --watch, --coverage, --verbose, --bail');
    console.log('• --run, --preload, --timeout');
    console.log('• --test-name-pattern, --test-ignore-pattern');
    console.log('• --config and more');
    console.log('');
    console.log('Usage:');
    console.log('  bun run cli-flags-demo.ts');
    return;
  }

  const demo = new CLIFlagsDemo();
  
  try {
    await demo.demonstrateAllFlags();
    await demo.cleanup();
    console.log('\n✅ CLI flags integration demonstration complete!');
  } catch (error: any) {
    console.error('❌ Demonstration failed:', error.message);
    await demo.cleanup();
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
