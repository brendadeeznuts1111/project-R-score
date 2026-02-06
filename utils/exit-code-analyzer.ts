#!/usr/bin/env bun
// exit-code-analyzer.ts - v2.8: Comprehensive Exit Code Analysis

import { spawn } from 'child_process';

interface ExitCodeAnalysis {
  exitCode: number;
  meaning: string;
  testResults: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
  };
  unhandledErrors: number;
  executionTime: number;
  recommendations: string[];
}

class ExitCodeAnalyzer {
  
  // 🚀 Run test and analyze exit code
  async analyzeExitCode(testFile: string): Promise<ExitCodeAnalysis> {
    console.log('🔍 Exit Code Analysis');
    console.log('==================');
    console.log(`📁 Test File: ${testFile}`);
    console.log('');

    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const testProcess = spawn('bun', ['test', testFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let errorOutput = '';
      let testResults = { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 };
      let unhandledErrors = 0;

      // Capture stdout
      testProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
        
        // Parse test results from output
        this.parseTestResults(text, testResults);
      });

      // Capture stderr
      testProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
        
        // Count unhandled errors
        if (text.includes('Unhandled') || text.includes('uncaught') || text.includes('unhandled')) {
          unhandledErrors++;
        }
      });

      // Handle process completion
      testProcess.on('close', (code, signal) => {
        const executionTime = performance.now() - startTime;
        const exitCode = code || 0;
        
        console.log('');
        console.log('📊 Exit Code Analysis Results');
        console.log('============================');
        
        const analysis = this.generateAnalysis(exitCode, testResults, unhandledErrors, executionTime, output, errorOutput);
        
        this.displayAnalysis(analysis);
        this.generateRecommendations(analysis);
        
        resolve(analysis);
      });

      // Safety timeout
      setTimeout(() => {
        if (!testProcess.killed) {
          console.log('⏰ Test timeout - killing process');
          testProcess.kill('SIGKILL');
        }
      }, 30000);
    });
  }

  // 📊 Parse test results from output
  private parseTestResults(output: string, results: any): void {
    // Look for test result patterns
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Bun test output patterns
      if (line.includes('pass') || line.includes('✓')) {
        const match = line.match(/(\d+)\s+pass/);
        if (match) results.passed = parseInt(match[1]);
      }
      
      if (line.includes('fail') || line.includes('✗')) {
        const match = line.match(/(\d+)\s+fail/);
        if (match) results.failed = parseInt(match[1]);
      }
      
      if (line.includes('error')) {
        const match = line.match(/(\d+)\s+error/);
        if (match) results.errors = parseInt(match[1]);
      }
      
      if (line.includes('skip')) {
        const match = line.match(/(\d+)\s+skip/);
        if (match) results.skipped = parseInt(match[1]);
      }
    });
    
    results.total = results.passed + results.failed + results.errors + results.skipped;
  }

  // 🎯 Generate comprehensive analysis
  private generateAnalysis(
    exitCode: number, 
    testResults: any, 
    unhandledErrors: number,
    executionTime: number,
    output: string,
    errorOutput: string
  ): ExitCodeAnalysis {
    
    let meaning: string;
    let recommendations: string[] = [];
    
    // Determine exit code meaning
    if (exitCode === 0) {
      meaning = 'SUCCESS: All tests passed, no unhandled errors';
      recommendations.push('✅ Perfect test execution');
      recommendations.push('🚀 Ready for deployment');
    } else if (exitCode === 1) {
      meaning = 'TEST FAILURES: One or more tests failed';
      recommendations.push('🔍 Review failing test assertions');
      recommendations.push('📝 Check test logic and expectations');
      recommendations.push('🐛 Debug failing test cases');
    } else if (exitCode > 1) {
      meaning = `UNHANDLED ERRORS: ${exitCode} unhandled errors occurred`;
      recommendations.push('🚨 Critical: Fix unhandled errors first');
      recommendations.push('🔧 Add proper error handling');
      recommendations.push('🛡️ Implement try-catch blocks');
      recommendations.push('📊 Check promise rejections');
    } else {
      meaning = `SIGNAL TERMINATION: Process killed by signal ${Math.abs(exitCode)}`;
      recommendations.push('⚡ Process was terminated externally');
      recommendations.push('🔍 Check for system interruptions');
    }

    // Add specific recommendations based on results
    if (testResults.failed > 0) {
      recommendations.push(`📊 ${testResults.failed} test(s) failed - review assertions`);
    }
    
    if (unhandledErrors > 0) {
      recommendations.push(`🚨 ${unhandledErrors} unhandled error(s) - add error handling`);
    }
    
    if (executionTime > 10000) {
      recommendations.push('⏱️ Slow execution - consider test optimization');
    }

    return {
      exitCode,
      meaning,
      testResults,
      unhandledErrors,
      executionTime,
      recommendations
    };
  }

  // 📋 Display analysis results
  private displayAnalysis(analysis: ExitCodeAnalysis): void {
    console.log(`🎯 Exit Code: ${analysis.exitCode}`);
    console.log(`📝 Meaning: ${analysis.meaning}`);
    console.log(`⏱️  Execution Time: ${analysis.executionTime.toFixed(2)}ms`);
    console.log('');
    
    console.log('📊 Test Results:');
    console.log(`   Total Tests: ${analysis.testResults.total}`);
    console.log(`   ✅ Passed: ${analysis.testResults.passed}`);
    console.log(`   ❌ Failed: ${analysis.testResults.failed}`);
    console.log(`   🚨 Errors: ${analysis.testResults.errors}`);
    console.log(`   ⏭️  Skipped: ${analysis.testResults.skipped}`);
    console.log(`   🚫 Unhandled: ${analysis.unhandledErrors}`);
    console.log('');
  }

  // 💡 Generate and display recommendations
  private generateRecommendations(analysis: ExitCodeAnalysis): void {
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }

  // 📄 Generate detailed report
  generateMarkdownReport(analysis: ExitCodeAnalysis, testFile: string): string {
    let report = '# 📊 Exit Code Analysis Report\n\n';
    report += `**Test File**: ${testFile}\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Bun Version**: ${Bun.version}\n\n`;

    report += '## 🎯 Exit Code Results\n\n';
    report += '| Metric | Value |\n';
    report += '|--------|-------|\n';
    report += `| Exit Code | ${analysis.exitCode} |\n`;
    report += `| Meaning | ${analysis.meaning} |\n`;
    report += `| Execution Time | ${analysis.executionTime.toFixed(2)}ms |\n\n`;

    report += '## 📊 Test Breakdown\n\n';
    report += '| Category | Count |\n';
    report += '|----------|-------|\n';
    report += `| Total Tests | ${analysis.testResults.total} |\n`;
    report += `| ✅ Passed | ${analysis.testResults.passed} |\n`;
    report += `| ❌ Failed | ${analysis.testResults.failed} |\n`;
    report += `| 🚨 Errors | ${analysis.testResults.errors} |\n`;
    report += `| ⏭️ Skipped | ${analysis.testResults.skipped} |\n`;
    report += `| 🚫 Unhandled | ${analysis.unhandledErrors} |\n\n`;

    report += '## 💡 Recommendations\n\n';
    analysis.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    report += '\n';

    report += '## 🔍 Exit Code Reference\n\n';
    report += '| Exit Code | Meaning | Action Required |\n';
    report += '|-----------|---------|-----------------|\n';
    report += '| 0 | All tests passed, no errors | ✅ None - ready for deployment |\n';
    report += '| 1 | Test failures occurred | 🔍 Fix failing tests |\n';
    report += '| >1 | Unhandled errors | 🚨 Fix critical errors first |\n';
    report += '| <0 | Killed by signal | ⚡ Check external factors |\n\n';

    report += '## 🚀 Integration with Test Process Integration v2.8\n\n';
    report += 'The framework provides:\n\n';
    report += '- ✅ **Exit Code Analysis** - Automatic detection and reporting\n';
    report += '- 📊 **Test Statistics** - Detailed breakdown of results\n';
    report += '- 💡 **Smart Recommendations** - Context-aware suggestions\n';
    report += '- 📄 **Report Generation** - Markdown and JSON outputs\n';
    report += '- 🔄 **CI Integration** - Proper exit code handling\n\n';

    report += '---\n\n';
    report += '*Generated by Exit Code Analyzer v2.8*';

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Exit Code Analyzer v2.8');
    console.log('');
    console.log('Analyzes Bun test exit codes and provides detailed insights:');
    console.log('• Exit Code 0: All tests passed, no unhandled errors');
    console.log('• Exit Code 1: Test failures occurred');
    console.log('• Exit Code >1: Number of unhandled errors');
    console.log('');
    console.log('Usage:');
    console.log('  bun run exit-code-analyzer.ts <test-file>');
    console.log('');
    console.log('Examples:');
    console.log('  bun run exit-code-analyzer.ts utils/exit-code-demo.ts');
    return;
  }

  const testFile = args[0] || 'utils/exit-code-demo.ts';
  
  const analyzer = new ExitCodeAnalyzer();
  
  try {
    console.log('🚀 Starting exit code analysis...\n');
    
    const analysis = await analyzer.analyzeExitCode(testFile);
    
    // Generate and save report
    const report = analyzer.generateMarkdownReport(analysis, testFile);
    const reportFile = 'exit-code-analysis-report.md';
    await Bun.write(reportFile, report);
    console.log(`📄 Detailed report saved to: ${reportFile}`);
    
    // Save JSON data
    const jsonFile = 'exit-code-analysis-results.json';
    await Bun.write(jsonFile, JSON.stringify(analysis, null, 2));
    console.log(`📊 JSON data saved to: ${jsonFile}`);
    
    console.log('\n✅ Exit code analysis complete!');
    
    // Exit with same code as analyzed test for demonstration
    process.exit(analysis.exitCode);
    
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
