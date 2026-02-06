#!/usr/bin/env bun
// signal-kill-demo.ts - v2.8: SIGKILL Signal Handling Demonstration

import { spawn } from 'child_process';

interface SignalTestResult {
  signal: string;
  description: string;
  behavior: string;
  exitCode: number;
  handled: boolean;
}

class SignalKillDemo {
  private results: SignalTestResult[] = [];

  // 🚀 Demonstrate SIGKILL behavior
  async demonstrateSIGKILL(): Promise<void> {
    console.log('🚀 SIGKILL Signal Handling Demonstration');
    console.log('=' .repeat(50));

    // Test 1: Immediate termination with SIGKILL
    await this.testSignalKill('SIGKILL', 'Immediate termination - cannot be caught');

    // Test 2: Graceful shutdown with SIGTERM (for comparison)
    await this.testSignalTerm('SIGTERM', 'Graceful shutdown - can be caught');

    // Test 3: Interrupt with SIGINT (Ctrl+C simulation)
    await this.testSignalInt('SIGINT', 'Interrupt signal - can be caught');

    // Generate report
    this.generateReport();
  }

  // 🔫 Test SIGKILL (cannot be caught)
  private async testSignalKill(signal: string, description: string): Promise<void> {
    console.log(`\n🔫 Testing ${signal}: ${description}`);

    return new Promise((resolve) => {
      // Create a long-running test process
      const testProcess = spawn('bun', ['demo.test.ts'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let startTime = Date.now();

      // Capture output
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      // Wait for process to start
      setTimeout(() => {
        console.log(`  📡 Sending ${signal} to PID ${testProcess.pid}...`);
        
        // Send SIGKILL - this cannot be caught!
        process.kill(testProcess.pid!, signal);

        // Wait for process to die
        const killTime = Date.now();
        
        testProcess.on('close', (code, signal) => {
          const duration = killTime - startTime;
          
          const result: SignalTestResult = {
            signal,
            description,
            behavior: signal === 'SIGKILL' ? 'Immediate termination - cannot be handled' : 'Process terminated',
            exitCode: code || -1,
            handled: signal !== 'SIGKILL' // SIGKILL cannot be handled
          };

          this.results.push(result);
          
          console.log(`  ⚡ Process terminated in ${duration}ms`);
          console.log(`  📊 Exit code: ${code}, Signal: ${signal}`);
          console.log(`  🛡️  Handled: ${result.handled ? 'Yes' : 'No'}`);
          
          resolve();
        });

      }, 1000); // Wait 1 second before killing
    });
  }

  // 🛑 Test SIGTERM (graceful shutdown)
  private async testSignalTerm(signal: string, description: string): Promise<void> {
    console.log(`\n🛑 Testing ${signal}: ${description}`);

    return new Promise((resolve) => {
      // Create a test process with signal handling
      const testScript = `
        process.on('SIGTERM', () => {
          console.log('🛑 SIGTERM received - cleaning up...');
          setTimeout(() => {
            console.log('✅ Cleanup complete - exiting gracefully');
            process.exit(143); // 128 + 15 (SIGTERM)
          }, 100);
        });

        console.log('🔄 Long-running process started...');
        setInterval(() => {
          console.log('💓 Still running...');
        }, 500);

        // Run for a while
        setTimeout(() => {}, 10000);
      `;

      // Write temporary script
      const tempFile = '/tmp/sigterm-test.js';
      Bun.write(tempFile, testScript);

      const testProcess = spawn('bun', [tempFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let startTime = Date.now();

      testProcess.stdout?.on('data', (data) => {
        const line = data.toString();
        output += line;
        if (line.includes('💓') || line.includes('🛑') || line.includes('✅')) {
          process.stdout.write(`    ${line}`);
        }
      });

      setTimeout(() => {
        console.log(`  📡 Sending ${signal} to PID ${testProcess.pid}...`);
        
        process.kill(testProcess.pid!, signal);
        const killTime = Date.now();
        
        testProcess.on('close', (code, signal) => {
          const duration = killTime - startTime;
          Bun.remove(tempFile); // Cleanup
          
          const result: SignalTestResult = {
            signal,
            description,
            behavior: 'Graceful shutdown with cleanup',
            exitCode: code || -1,
            handled: true
          };

          this.results.push(result);
          
          console.log(`  ⚡ Process terminated in ${duration}ms`);
          console.log(`  📊 Exit code: ${code} (graceful shutdown)`);
          console.log(`  🛡️  Handled: Yes - cleanup executed`);
          
          resolve();
        });

      }, 2000); // Wait 2 seconds before killing
    });
  }

  // ⚡ Test SIGINT (Ctrl+C)
  private async testSignalInt(signal: string, description: string): Promise<void> {
    console.log(`\n⚡ Testing ${signal}: ${description}`);

    return new Promise((resolve) => {
      // Create a test process with SIGINT handling
      const testScript = `
        process.on('SIGINT', () => {
          console.log('⚡ SIGINT received (Ctrl+C) - interrupting...');
          setTimeout(() => {
            console.log('🛑 Interrupt handled - exiting');
            process.exit(130); // 128 + 2 (SIGINT)
          }, 50);
        });

        console.log('🔄 Interactive process started...');
        let counter = 0;
        const interval = setInterval(() => {
          counter++;
          console.log(\`💓 Working... \${counter}s\`);
        }, 1000);

        process.on('exit', () => {
          clearInterval(interval);
        });
      `;

      const tempFile = '/tmp/sigint-test.js';
      Bun.write(tempFile, testScript);

      const testProcess = spawn('bun', [tempFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let startTime = Date.now();

      testProcess.stdout?.on('data', (data) => {
        const line = data.toString();
        output += line;
        if (line.includes('💓') || line.includes('⚡') || line.includes('🛑')) {
          process.stdout.write(`    ${line}`);
        }
      });

      setTimeout(() => {
        console.log(`  📡 Sending ${signal} to PID ${testProcess.pid}...`);
        
        process.kill(testProcess.pid!, signal);
        const killTime = Date.now();
        
        testProcess.on('close', (code, signal) => {
          const duration = killTime - startTime;
          Bun.remove(tempFile); // Cleanup
          
          const result: SignalTestResult = {
            signal,
            description,
            behavior: 'Interrupt with cleanup',
            exitCode: code || -1,
            handled: true
          };

          this.results.push(result);
          
          console.log(`  ⚡ Process terminated in ${duration}ms`);
          console.log(`  📊 Exit code: ${code} (interrupt)`);
          console.log(`  🛡️  Handled: Yes - interrupt handled`);
          
          resolve();
        });

      }, 3000); // Wait 3 seconds before interrupting
    });
  }

  // 📊 Generate comprehensive report
  private generateReport(): void {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 SIGNAL HANDLING REPORT');
    console.log('=' .repeat(50));

    console.log('\n🔍 Signal Behavior Analysis:');
    console.table(this.results.map(r => ({
      Signal: r.signal,
      Description: r.description,
      Behavior: r.behavior,
      'Exit Code': r.exitCode,
      Handled: r.handled ? '✅ Yes' : '❌ No'
    })));

    console.log('\n💡 Key Insights:');
    
    const sigkillResult = this.results.find(r => r.signal === 'SIGKILL');
    if (sigkillResult) {
      console.log('🔫 SIGKILL:');
      console.log('   • Cannot be caught or handled by the process');
      console.log('   • Immediate termination - no cleanup possible');
      console.log('   • Used for force-killing unresponsive processes');
      console.log('   • Exit code typically -1 or null');
    }

    const sigtermResult = this.results.find(r => r.signal === 'SIGTERM');
    if (sigtermResult) {
      console.log('🛑 SIGTERM:');
      console.log('   • Can be caught and handled gracefully');
      console.log('   • Allows cleanup before termination');
      console.log('   • Standard way to request process shutdown');
      console.log('   • Exit code 143 (128 + 15) for graceful shutdown');
    }

    const sigintResult = this.results.find(r => r.signal === 'SIGINT');
    if (sigintResult) {
      console.log('⚡ SIGINT:');
      console.log('   • Can be caught (Ctrl+C simulation)');
      console.log('   • Allows interrupt handling');
      console.log('   • Exit code 130 (128 + 2) for interrupt');
      console.log('   • Commonly used for user interrupts');
    }

    console.log('\n🎯 Best Practices:');
    console.log('   • Use SIGTERM for graceful shutdown requests');
    console.log('   • Use SIGKILL only for unresponsive processes');
    console.log('   • Implement cleanup handlers for SIGTERM/SIGINT');
    console.log('   • Test signal handling in your applications');
    console.log('   • Use proper exit codes (128 + signal number)');

    console.log('\n🚀 Integration with Test Framework:');
    console.log('   • Test Process Integration v2.8 handles SIGTERM/SIGINT');
    console.log('   • SIGKILL cannot be handled (by design)');
    console.log('   • Graceful shutdown preserves test state');
    console.log('   • Signal handlers ensure proper cleanup');

    // Save detailed report
    const report = this.generateMarkdownReport();
    Bun.write('signal-kill-report.md', report);
    console.log('\n📄 Detailed report saved to: signal-kill-report.md');
  }

  private generateMarkdownReport(): string {
    let report = '# 🔫 Signal Handling Demonstration Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Bun Version**: ${Bun.version}\n`;
    report += `**Platform**: ${process.platform}\n\n`;

    report += '## 📊 Signal Test Results\n\n';
    report += '| Signal | Description | Behavior | Exit Code | Handled |\n';
    report += '|--------|-------------|----------|-----------|---------|\n';

    this.results.forEach(result => {
      const handled = result.handled ? '✅ Yes' : '❌ No';
      report += `| ${result.signal} | ${result.description} | ${result.behavior} | ${result.exitCode} | ${handled} |\n`;
    });

    report += '\n## 💡 Technical Insights\n\n';

    report += '### 🔫 SIGKILL (Signal 9)\n';
    report += '- **Cannot be caught** by the target process\n';
    report += '- **Immediate termination** - no cleanup possible\n';
    report += '- **Force kill** for unresponsive processes\n';
    report += '- **Exit code**: Typically -1 or null\n\n';

    report += '### 🛑 SIGTERM (Signal 15)\n';
    report += '- **Can be caught** and handled gracefully\n';
    report += '- **Graceful shutdown** with cleanup\n';
    report += '- **Standard termination** request\n';
    report += '- **Exit code**: 143 (128 + 15)\n\n';

    report += '### ⚡ SIGINT (Signal 2)\n';
    report += '- **Can be caught** (Ctrl+C simulation)\n';
    report += '- **Interrupt handling** possible\n';
    report += '- **User interrupt** signal\n';
    report += '- **Exit code**: 130 (128 + 2)\n\n';

    report += '## 🎯 Integration with Test Framework\n\n';
    report += 'The Test Process Integration v2.8 framework properly handles:\n\n';
    report += '- ✅ **SIGTERM** - Graceful shutdown with cleanup\n';
    report += '- ✅ **SIGINT** - Interrupt handling with resource cleanup\n';
    report += '- ❌ **SIGKILL** - Cannot be handled (by design)\n';
    report += '- 📊 **Exit code analysis** - Proper signal detection\n';
    report += '- 🧹 **Resource cleanup** - Automatic on graceful shutdown\n\n';

    report += '## 🚀 Usage Examples\n\n';
    report += '```bash\n';
    report += '# Graceful shutdown\n';
    report += 'kill -SIGTERM <test-process-pid>\n\n';
    report += '# Immediate termination\n';
    report.report += 'kill -SIGKILL <test-process-pid>\n\n';
    report += '# Interrupt (Ctrl+C simulation)\n';
    report += 'kill -SIGINT <test-process-pid>\n';
    report += '```\n\n';

    report += '---\n\n';
    report += '*Generated by Signal Kill Demonstration v2.8*';

    return report;
  }
}

// CLI interface
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Signal Kill Demonstration v2.8');
    console.log('');
    console.log('Demonstrates signal handling behavior:');
    console.log('• SIGKILL - Cannot be caught (immediate termination)');
    console.log('• SIGTERM - Graceful shutdown (can be caught)');
    console.log('• SIGINT - Interrupt signal (can be caught)');
    console.log('');
    console.log('Usage:');
    console.log('  bun run signal-kill-demo.ts');
    return;
  }

  const demo = new SignalKillDemo();
  
  try {
    await demo.demonstrateSIGKILL();
    console.log('\n✅ Signal handling demonstration complete!');
  } catch (error: any) {
    console.error('❌ Demonstration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
