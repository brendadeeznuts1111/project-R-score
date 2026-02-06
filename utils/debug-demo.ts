#!/usr/bin/env bun
// debug-demo.ts - v2.8: Complete Test Debugging Demonstration

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

interface DebugTestResult {
  testName: string;
  description: string;
  debugFlag: string;
  port: number;
  breakOnStart: boolean;
  output: string;
  debugSession: boolean;
  breakpoints: number;
  recommendations: string[];
}

class DebugDemo {
  private results: DebugTestResult[] = [];
  private debugPort = 9229;

  // 🐛 Demonstrate all debugging scenarios
  async demonstrateDebugging(): Promise<void> {
    console.log('🐛 Bun Test Debugging Demonstration');
    console.log('===================================');
    console.log('🔍 Exploring --inspect and --inspect-brk capabilities...\n');

    // Create test files for debugging scenarios
    await this.createDebugTestFiles();

    // Test different debugging scenarios
    const debugTests = [
      {
        name: 'basic-debug',
        description: 'Basic debugging with --inspect',
        flag: '--inspect',
        file: 'debug-basic.test.ts',
        breakOnStart: false
      },
      {
        name: 'breakpoint-debug',
        description: 'Breakpoint debugging with --inspect-brk',
        flag: '--inspect-brk',
        file: 'debug-breakpoint.test.ts',
        breakOnStart: true
      },
      {
        name: 'async-debug',
        description: 'Async operation debugging',
        flag: '--inspect-brk',
        file: 'debug-async.test.ts',
        breakOnStart: true
      },
      {
        name: 'error-debug',
        description: 'Error scenario debugging',
        flag: '--inspect-brk',
        file: 'debug-error.test.ts',
        breakOnStart: true
      },
      {
        name: 'performance-debug',
        description: 'Performance debugging',
        flag: '--inspect',
        file: 'debug-performance.test.ts',
        breakOnStart: false
      }
    ];

    for (const test of debugTests) {
      await this.runDebugTest(test.name, test.description, test.flag, test.file, test.breakOnStart);
    }

    // Generate comprehensive debugging guide
    this.generateDebuggingGuide();
  }

  // 📁 Create debug test files
  private async createDebugTestFiles(): Promise<void> {
    console.log('📁 Creating debug test files...');

    // Basic debugging test
    writeFileSync('debug-basic.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Basic Debugging', () => {
  test('debuggable function', () => {
    console.log('🐛 Starting basic debug test');
    
    const data = {
      id: 1,
      name: 'Debug Test',
      items: ['item1', 'item2', 'item3']
    };
    
    // Debug point: inspect data structure
    console.log('🔍 Data structure:', JSON.stringify(data, null, 2));
    
    const result = processData(data);
    expect(result).toBe('processed: Debug Test');
    
    console.log('✅ Basic debug test completed');
  });
  
  test('loop debugging', () => {
    console.log('🐛 Starting loop debug test');
    
    const numbers = [1, 2, 3, 4, 5];
    let sum = 0;
    
    for (let i = 0; i < numbers.length; i++) {
      // Debug point: inspect each iteration
      console.log(\`🔍 Iteration \${i}: number=\${numbers[i]}, sum=\${sum}\`);
      sum += numbers[i];
    }
    
    expect(sum).toBe(15);
    console.log('✅ Loop debug test completed');
  });
});

function processData(data: any): string {
  // Debug point: inspect processing
  console.log('🔍 Processing data:', data.name);
  return \`processed: \${data.name}\`;
}
`);

    // Breakpoint debugging test
    writeFileSync('debug-breakpoint.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Breakpoint Debugging', () => {
  test('step-through debugging', () => {
    console.log('🐛 Starting step-through debug test');
    
    const calculator = {
      value: 0,
      
      add(num: number) {
        // Breakpoint: Step into this method
        this.value += num;
        return this.value;
      },
      
      multiply(num: number) {
        // Breakpoint: Step into this method
        this.value *= num;
        return this.value;
      },
      
      reset() {
        // Breakpoint: Step into this method
        this.value = 0;
        return this.value;
      }
    };
    
    // Breakpoint: Inspect initial state
    console.log('🔍 Initial calculator state:', calculator.value);
    
    const result1 = calculator.add(5);  // Breakpoint here
    console.log('🔍 After add(5):', calculator.value);
    
    const result2 = calculator.multiply(2);  // Breakpoint here
    console.log('🔍 After multiply(2):', calculator.value);
    
    const result3 = calculator.reset();  // Breakpoint here
    console.log('🔍 After reset():', calculator.value);
    
    expect(result3).toBe(0);
    console.log('✅ Step-through debug test completed');
  });
  
  test('conditional breakpoint', () => {
    console.log('🐛 Starting conditional breakpoint test');
    
    const users = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true }
    ];
    
    const activeUsers = users.filter(user => {
      // Conditional breakpoint: Only break when user.active is true
      if (user.active) {
        console.log('🔍 Active user found:', user.name);
      }
      return user.active;
    });
    
    expect(activeUsers.length).toBe(2);
    console.log('✅ Conditional breakpoint test completed');
  });
});
`);

    // Async debugging test
    writeFileSync('debug-async.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Async Debugging', () => {
  test('async/await debugging', async () => {
    console.log('🐛 Starting async debug test');
    
    try {
      // Breakpoint: Before async operation
      console.log('🔍 About to start async operation');
      
      const result = await asyncOperation();
      
      // Breakpoint: After async operation completes
      console.log('🔍 Async operation result:', result);
      
      expect(result).toBe('async success');
    } catch (error) {
      console.error('🔍 Async error caught:', error);
      throw error;
    }
    
    console.log('✅ Async debug test completed');
  });
  
  test('promise chaining debugging', async () => {
    console.log('🐛 Starting promise chain debug test');
    
    const result = await Promise.resolve('initial')
      .then(value => {
        // Breakpoint: First then block
        console.log('🔍 First then block:', value);
        return value + '-modified';
      })
      .then(value => {
        // Breakpoint: Second then block
        console.log('🔍 Second then block:', value);
        return value + '-final';
      })
      .catch(error => {
        // Breakpoint: Error handling
        console.error('🔍 Promise chain error:', error);
        throw error;
      });
    
    expect(result).toBe('initial-modified-final');
    console.log('✅ Promise chain debug test completed');
  });
  
  test('concurrent async debugging', async () => {
    console.log('🐛 Starting concurrent async debug test');
    
    const operations = [
      asyncOperation('op1', 100),
      asyncOperation('op2', 200),
      asyncOperation('op3', 150)
    ];
    
    // Breakpoint: Before Promise.all
    console.log('🔍 Starting concurrent operations');
    
    const results = await Promise.all(operations);
    
    // Breakpoint: After all operations complete
    console.log('🔍 All operations completed:', results);
    
    expect(results).toHaveLength(3);
    console.log('✅ Concurrent async debug test completed');
  });
});

async function asyncOperation(name: string = 'default', delay: number = 50): Promise<string> {
  // Breakpoint: Inside async function
  console.log(\`🔍 Async operation '\${name}' starting\`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const result = \`async success: \${name}\`;
  console.log(\`🔍 Async operation '\${name}' completed\`);
  
  return result;
}
`);

    // Error debugging test
    writeFileSync('debug-error.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Error Debugging', () => {
  test('debugging thrown errors', () => {
    console.log('🐛 Starting error debug test');
    
    try {
      // Breakpoint: Before error occurs
      console.log('🔍 About to trigger error');
      
      riskyOperation();
      
      // This line should not be reached
      console.log('🔍 This should not appear');
    } catch (error) {
      // Breakpoint: In error handler
      console.log('🔍 Error caught:', error.message);
      console.log('🔍 Error stack:', error.stack);
      
      expect(error.message).toBe('Intentional error for debugging');
    }
    
    console.log('✅ Error debug test completed');
  });
  
  test('debugging assertion failures', () => {
    console.log('🐛 Starting assertion failure debug test');
    
    const data = { value: 42 };
    
    // Breakpoint: Before assertion
    console.log('🔍 About to check assertion');
    console.log('🔍 Data value:', data.value);
    
    // This assertion will fail - good for debugging
    expect(data.value).toBe(100);  // This will fail
    
    console.log('🔍 This should not appear');
  });
  
  test('debugging async errors', async () => {
    console.log('🐛 Starting async error debug test');
    
    try {
      // Breakpoint: Before async error
      console.log('🔍 About to trigger async error');
      
      await asyncErrorOperation();
      
      console.log('🔍 This should not appear');
    } catch (error) {
      // Breakpoint: In async error handler
      console.log('🔍 Async error caught:', error.message);
      
      expect(error.message).toBe('Async error for debugging');
    }
    
    console.log('✅ Async error debug test completed');
  });
});

function riskyOperation(): never {
  // Breakpoint: Inside function that throws
  console.log('🔍 Inside risky operation');
  throw new Error('Intentional error for debugging');
}

async function asyncErrorOperation(): Promise<never> {
  // Breakpoint: Inside async function that throws
  console.log('🔍 Inside async error operation');
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  throw new Error('Async error for debugging');
}
`);

    // Performance debugging test
    writeFileSync('debug-performance.test.ts', `
import { test, describe, expect } from 'bun:test';

describe('Performance Debugging', () => {
  test('debugging slow operations', () => {
    console.log('🐛 Starting performance debug test');
    
    const startTime = performance.now();
    
    // Breakpoint: Before slow operation
    console.log('🔍 Starting slow operation');
    
    slowOperation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Breakpoint: After slow operation
    console.log(\`🔍 Slow operation completed in \${duration.toFixed(2)}ms\`);
    
    expect(duration).toBeGreaterThan(50);
    console.log('✅ Performance debug test completed');
  });
  
  test('debugging memory usage', () => {
    console.log('🐛 Starting memory debug test');
    
    // Breakpoint: Before memory allocation
    const initialMemory = process.memoryUsage();
    console.log('🔍 Initial memory:', {
      rss: Math.round(initialMemory.rss / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024 * 100) / 100
    });
    
    // Allocate memory
    const largeArray = new Array(10000).fill(0).map((_, i) => ({
      id: i,
      data: 'x'.repeat(100),
      timestamp: Date.now()
    }));
    
    // Breakpoint: After memory allocation
    const afterMemory = process.memoryUsage();
    console.log('🔍 After allocation memory:', {
      rss: Math.round(afterMemory.rss / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(afterMemory.heapUsed / 1024 / 1024 * 100) / 100
    });
    
    const memoryGrowth = afterMemory.heapUsed - initialMemory.heapUsed;
    console.log(\`🔍 Memory growth: \${Math.round(memoryGrowth / 1024 / 1024 * 100) / 100}MB\`);
    
    expect(largeArray.length).toBe(10000);
    console.log('✅ Memory debug test completed');
  });
  
  test('debugging function calls', () => {
    console.log('🐛 Starting function call debug test');
    
    const tracer = new FunctionTracer();
    
    // Breakpoint: Before function calls
    console.log('🔍 Starting traced function calls');
    
    const result1 = tracer.traceFunction('func1', () => 'result1');
    const result2 = tracer.traceFunction('func2', () => 'result2');
    const result3 = tracer.traceFunction('func3', () => {
      return tracer.traceFunction('nested', () => 'nested-result');
    });
    
    // Breakpoint: After function calls
    console.log('🔍 Function call trace:', tracer.getTrace());
    
    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(result3).toBe('nested-result');
    console.log('✅ Function call debug test completed');
  });
});

function slowOperation(): void {
  // Breakpoint: Inside slow operation
  console.log('🔍 Inside slow operation - simulating work');
  
  // Simulate CPU-intensive work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += Math.random();
  }
  
  console.log('🔍 Slow operation completed, sum:', sum);
}

class FunctionTracer {
  private trace: string[] = [];
  
  traceFunction(name: string, fn: () => string): string {
    // Breakpoint: Function entry
    this.trace.push(\`Entering \${name}\`);
    console.log(\`🔍 Entering function: \${name}\`);
    
    const result = fn();
    
    // Breakpoint: Function exit
    this.trace.push(\`Exiting \${name} with result: \${result}\`);
    console.log(\`🔍 Exiting function: \${name} with result: \${result}\`);
    
    return result;
  }
  
  getTrace(): string[] {
    return this.trace;
  }
}
`);

    console.log('✅ Debug test files created\n');
  }

  // 🧪 Run individual debug test
  private async runDebugTest(
    testName: string, 
    description: string, 
    debugFlag: string, 
    testFile: string, 
    breakOnStart: boolean
  ): Promise<void> {
    console.log(`🧪 Testing ${testName}: ${description}`);
    console.log(`   Flag: ${debugFlag}`);
    console.log(`   Break on start: ${breakOnStart}`);

    return new Promise((resolve) => {
      const port = this.debugPort++;
      const testArgs = ['test', debugFlag, `--inspect-port=${port}`, testFile];
      
      const testProcess = spawn('bun', testArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let output = '';
      let debugSession = false;
      let breakpoints = 0;

      // Capture output
      testProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Detect debug session indicators
        if (text.includes('Debugger listening') || text.includes('ws://')) {
          debugSession = true;
        }
        
        if (text.includes('Breakpoint') || text.includes('Paused')) {
          breakpoints++;
        }
      });

      testProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      // Handle process completion
      testProcess.on('close', (code, signal) => {
        const recommendations = this.generateDebugRecommendations(debugFlag, breakOnStart, output);
        
        this.results.push({
          testName,
          description,
          debugFlag,
          port,
          breakOnStart,
          output: output.slice(0, 500),
          debugSession,
          breakpoints,
          recommendations
        });

        console.log(`   Debug Session: ${debugSession ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   Breakpoints Detected: ${breakpoints}`);
        console.log('');

        resolve();
      });

      // Safety timeout - debug sessions can hang
      setTimeout(() => {
        if (!testProcess.killed) {
          console.log(`   ⏰ Timeout reached for ${testName}`);
          testProcess.kill('SIGTERM');
        }
      }, breakOnStart ? 5000 : 10000);
    });
  }

  // 💡 Generate debugging recommendations
  private generateDebugRecommendations(debugFlag: string, breakOnStart: boolean, output: string): string[] {
    const recommendations: string[] = [];
    
    if (debugFlag === '--inspect') {
      recommendations.push('Use --inspect for non-blocking debugging');
      recommendations.push('Connect debugger to ws://localhost:9229');
      recommendations.push('Tests will run immediately - set breakpoints manually');
    }
    
    if (debugFlag === '--inspect-brk') {
      recommendations.push('Use --inspect-brk to break on first line');
      recommendations.push('Perfect for step-through debugging');
      recommendations.push('Connect debugger before tests start');
    }
    
    if (breakOnStart) {
      recommendations.push('Ideal for debugging test setup and initialization');
      recommendations.push('Set breakpoints in test code before running');
    }
    
    if (output.includes('Debugger listening')) {
      recommendations.push('✅ Debug server started successfully');
      recommendations.push('Use Chrome DevTools or VS Code to connect');
    } else {
      recommendations.push('⚠️ Debug server may not have started');
      recommendations.push('Check if port is available');
    }
    
    if (output.includes('error') || output.includes('Error')) {
      recommendations.push('🔍 Use debugger to inspect error conditions');
      recommendations.push('Set breakpoints before error locations');
    }
    
    return recommendations;
  }

  // 📚 Generate comprehensive debugging guide
  private generateDebuggingGuide(): void {
    console.log('📚 Debugging Capabilities Analysis');
    console.log('===================================');

    // Summary table
    console.log('\n📋 Debug Test Summary:');
    console.table(this.results.map(r => ({
      Test: r.testName,
      Flag: r.debugFlag,
      Port: r.port,
      'Break on Start': r.breakOnStart ? 'Yes' : 'No',
      'Debug Session': r.debugSession ? '✅' : '❌',
      Breakpoints: r.breakpoints
    })));

    // Detailed analysis
    console.log('\n🔍 Detailed Analysis:');
    
    this.results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  Description: ${result.description}`);
      console.log(`  Debug Flag: ${result.debugFlag}`);
      console.log(`  Port: ${result.port}`);
      console.log(`  Break on Start: ${result.breakOnStart}`);
      console.log(`  Debug Session: ${result.debugSession ? 'Active' : 'Inactive'}`);
      console.log(`  Breakpoints Detected: ${result.breakpoints}`);
      
      if (result.recommendations.length > 0) {
        console.log(`  Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`    • ${rec}`);
        });
      }
    });

    // Debugging best practices
    console.log('\n💡 Debugging Best Practices:');
    console.log('  • Use --inspect-brk for step-through debugging');
    console.log('  • Use --inspect for non-blocking debugging');
    console.log('  • Connect Chrome DevTools to ws://localhost:9229');
    console.log('  • Set breakpoints in test code before running');
    console.log('  • Use console.log for quick debugging');
    console.log('  • Inspect variables in the debugger');
    console.log('  • Use call stack to trace execution flow');

    // Save detailed guide
    this.saveDebuggingGuide();
  }

  // 📄 Save comprehensive debugging guide
  private saveDebuggingGuide(): void {
    let guide = '# 🐛 Bun Test Debugging Complete Guide v2.8\n\n';
    guide += `**Generated**: ${new Date().toISOString()}\n`;
    guide += `**Bun Version**: ${Bun.version}\n\n`;

    guide += '## 🔍 Debugging Flags Overview\n\n';
    guide += '| Flag | Description | Break on Start | Use Case |\n';
    guide += '|------|-------------|---------------|----------|\n';
    guide += '| `--inspect` | Start debugger server | No | Non-blocking debugging |\n';
    guide += '| `--inspect-brk` | Start debugger and break | Yes | Step-through debugging |\n\n';

    guide += '## 📊 Debug Test Results\n\n';
    guide += '| Test | Flag | Port | Debug Session | Breakpoints |\n';
    guide += '|------|------|------|---------------|-------------|\n';

    this.results.forEach(result => {
      const session = result.debugSession ? '✅ Active' : '❌ Inactive';
      guide += `| ${result.testName} | ${result.debugFlag} | ${result.port} | ${session} | ${result.breakpoints} |\n`;
    });

    guide += '\n## 🚀 Getting Started with Debugging\n\n';
    guide += '### Basic Debugging\n\n';
    guide += '```bash\n';
    guide += '# Start debugger (non-blocking)\n';
    guide += 'bun test --inspect\n\n';
    guide += '# Start debugger and break on start\n';
    guide += 'bun test --inspect-brk\n';
    guide += '```\n\n';

    guide += '### Custom Port\n\n';
    guide += '```bash\n';
    guide += '# Use custom debug port\n';
    guide += 'bun test --inspect --inspect-port=9230\n';
    guide += '```\n\n';

    guide += '## 🔗 Connecting to Debugger\n\n';
    guide += '### Chrome DevTools\n\n';
    guide += '1. Run `bun test --inspect-brk`\n';
    guide += '2. Open Chrome\n';
    guide += '3. Navigate to `chrome://inspect`\n';
    guide += '4. Click "Open dedicated DevTools for Node"\n';
    guide += '5. Start debugging!\n\n';

    guide += '### VS Code\n\n';
    guide += 'Create `.vscode/launch.json`:\n\n';
    guide += '```json\n';
    guide += '{\n';
    guide += '  "version": "0.2.0",\n';
    guide += '  "configurations": [\n';
    guide += '    {\n';
    guide += '      "name": "Debug Bun Tests",\n';
    guide += '      "type": "node",\n';
    guide += '      "request": "attach",\n';
    guide += '      "port": 9229,\n';
    guide += '      "localRoot": "${workspaceFolder}",\n';
    guide += '      "remoteRoot": "${workspaceFolder}",\n';
    guide += '      "skipFiles": ["<node_internals>/**"]\n';
    guide += '    }\n';
    guide += '  ]\n';
    guide += '}\n';
    guide += '```\n\n';

    guide += '## 🎯 Debugging Scenarios\n\n';
    guide += '### 1. Step-Through Debugging\n\n';
    guide += '```bash\n';
    guide += 'bun test --inspect-brk debug-breakpoint.test.ts\n';
    guide += '```\n\n';
    guide += '- Break on first line\n';
    guide += '- Step through each function call\n';
    guide += '- Inspect variables at each step\n\n';

    guide += '### 2. Async Operation Debugging\n\n';
    guide += '```bash\n';
    guide += 'bun test --inspect-brk debug-async.test.ts\n';
    guide += '```\n\n';
    guide += '- Debug Promise chains\n';
    guide += '- Inspect async/await flow\n';
    guide += '- Handle async errors properly\n\n';

    guide += '### 3. Error Debugging\n\n';
    guide += '```bash\n';
    guide += 'bun test --inspect-brk debug-error.test.ts\n';
    guide += '```\n\n';
    guide += '- Catch errors at breakpoint\n';
    guide += '- Inspect error stack traces\n';
    guide += '- Debug assertion failures\n\n';

    guide += '### 4. Performance Debugging\n\n';
    guide += '```bash\n';
    guide += 'bun test --inspect debug-performance.test.ts\n';
    guide += '```\n\n';
    guide += '- Profile slow operations\n';
    guide += '- Monitor memory usage\n';
    guide += '- Trace function calls\n\n';

    guide += '## 💡 Debugging Tips\n\n';
    guide += '### Breakpoints\n\n';
    guide += '- Use `debugger;` statement in code\n';
    guide += '- Set breakpoints in DevTools\n';
    guide += '- Use conditional breakpoints\n';
    guide += '- Break on caught exceptions\n\n';

    guide += '### Variable Inspection\n\n';
    guide += '- Watch expressions for variables\n';
    guide += '- Inspect scope and closure variables\n';
    guide += '- Modify variables during debugging\n';
    guide += '- Use console.log for quick checks\n\n';

    guide += '### Call Stack Navigation\n\n';
    guide += '- Step over (F10) - Skip function calls\n';
    guide += '- Step into (F11) - Enter function calls\n';
    guide += '- Step out (Shift+F11) - Exit current function\n';
    guide += '- Continue (F8) - Run to next breakpoint\n\n';

    guide += '## 🛠️ Advanced Debugging\n\n';
    guide += '### Remote Debugging\n\n';
    guide += '```bash\n';
    guide += '# On remote machine\n';
    guide += 'bun test --inspect --inspect-port=0.0.0.0:9229\n\n';
    guide += '# Connect from local machine\n';
    guide += '# Use SSH tunnel or direct connection\n';
    guide += '```\n\n';

    guide += '### Debug Configuration\n\n';
    guide += '```typescript\n';
    guide += '// bun-test.config.ts\n';
    guide += 'export default {\n';
    guide += '  // Debug-specific settings\n';
    guide += '  timeout: 30000, // Longer timeout for debugging\n';
    guide += '  concurrency: 1, // Single-threaded for easier debugging\n';
    guide += '};\n';
    guide += '```\n\n';

    guide += '## 🔧 Troubleshooting\n\n';
    guide += '### Common Issues\n\n';
    guide += '- **Port already in use**: Use `--inspect-port` with different port\n';
    guide += '- **Debugger not connecting**: Check firewall and network settings\n';
    guide +=('- **Tests not stopping**: Use --inspect-brk instead of --inspect\n');
    guide +=('- **Breakpoints not hitting**: Ensure source maps are enabled\n\n');

    guide += '### Performance Impact\n\n';
    guide += '- Debugging slows down test execution\n';
    guide += '- Use --inspect for minimal impact\n';
    guide += '- Use --inspect-brk only when needed\n';
    guide += '- Remove debugger statements in production\n\n';

    guide += '---\n\n';
    guide += '*Generated by Bun Test Debugging Demo v2.8*';

    Bun.write('bun-test-debugging-guide.md', guide);
    console.log('\n📄 Comprehensive debugging guide saved to: bun-test-debugging-guide.md');
  }

  // 🧹 Cleanup test files
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up debug test files...');
    
    const files = [
      'debug-basic.test.ts',
      'debug-breakpoint.test.ts',
      'debug-async.test.ts',
      'debug-error.test.ts',
      'debug-performance.test.ts'
    ];
    
    for (const file of files) {
      try {
        await Bun.file(file).delete();
      } catch (error) {
        // Ignore file not found errors
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Bun Test Debugging Demo v2.8');
    console.log('');
    console.log('Demonstrates Bun test debugging capabilities:');
    console.log('• --inspect flag for non-blocking debugging');
    console.log('• --inspect-brk flag for step-through debugging');
    console.log('• Chrome DevTools integration');
    console.log('• VS Code debugging setup');
    console.log('• Error and performance debugging scenarios');
    console.log('');
    console.log('Usage:');
    console.log('  bun run debug-demo.ts');
    return;
  }

  const demo = new DebugDemo();
  
  try {
    await demo.demonstrateDebugging();
    await demo.cleanup();
    console.log('\n✅ Debugging demonstration complete!');
    console.log('\n🔗 To try debugging yourself:');
    console.log('  bun test --inspect-brk your-test-file.ts');
    console.log('  Then open Chrome and go to chrome://inspect');
  } catch (error: any) {
    console.error('❌ Demonstration failed:', error.message);
    await demo.cleanup();
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
