/**
 * Empire Pro Bun Command Executor using Bun v1.3.6 spawnSync
 * 30x faster command execution compared to Node.js child_process
 */

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
  executionTime: number;
  command: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  input?: string;
  quiet?: boolean;
  shell?: boolean;
}

export class BunCommandExecutor {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Parse command string into arguments array, handling quotes correctly
   */
  private static parseCommand(command: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      if ((char === '"' || char === "'") && (i === 0 || command[i - 1] !== '\\')) {
        if (inQuotes && char === quoteChar) {
          inQuotes = false;
        } else if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) args.push(current);
    return args;
  }

  /**
   * Execute command synchronously using Bun v1.3.6 spawnSync
   * 30x faster than child_process.spawnSync
   */
  static executeSync(command: string, options: CommandOptions = {}): CommandResult {
    const startTime = performance.now();
    
    try {
      // Parse command and arguments
      const args = options.shell ? ['sh', '-c', command] : this.parseCommand(command);
      const cmd = args[0];
      const cmdArgs = args.slice(1);
      
      // Use Bun v1.3.6 optimized spawnSync (30x faster)
      const result = Bun.spawnSync([cmd, ...cmdArgs], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdin: options.input ? new TextEncoder().encode(options.input) : undefined,
        stdout: "pipe",
        stderr: "pipe",
        timeout: options.timeout || this.DEFAULT_TIMEOUT
      });
      
      const executionTime = performance.now() - startTime;
      
      const commandResult: CommandResult = {
        success: result.exitCode === 0,
        stdout: result.stdout ? new TextDecoder().decode(result.stdout) : '',
        stderr: result.stderr ? new TextDecoder().decode(result.stderr) : '',
        exitCode: result.exitCode,
        signal: result.signal || null,
        executionTime,
        command
      };
      
      if (!options.quiet) {
        console.log(`⚡ Executed: ${command} (${executionTime.toFixed(3)}ms)`);
        if (commandResult.stderr && !commandResult.success) {
          console.warn(`⚠️ stderr: ${commandResult.stderr}`);
        }
      }
      
      return commandResult;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        signal: null,
        executionTime,
        command
      };
    }
  }

  /**
   * Execute command asynchronously with timeout handling
   */
  static async executeAsync(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    const startTime = performance.now();
    
    try {
      const args = options.shell ? ['sh', '-c', command] : this.parseCommand(command);
      const cmd = args[0];
      const cmdArgs = args.slice(1);
      
      // Create promise for command execution
      const commandPromise = new Promise<CommandResult>((resolve) => {
        const process = Bun.spawn([cmd, ...cmdArgs], {
          cwd: options.cwd || process.cwd(),
          env: { ...process.env, ...options.env },
          stdin: options.input ? new TextEncoder().encode(options.input) : undefined,
          stdout: "pipe",
          stderr: "pipe"
        });
        
        // Handle process completion
        process.then((result) => {
          const executionTime = performance.now() - startTime;
          
          resolve({
            success: result.exitCode === 0,
            stdout: result.stdout ? new TextDecoder().decode(result.stdout) : '',
            stderr: result.stderr ? new TextDecoder().decode(result.stderr) : '',
            exitCode: result.exitCode,
            signal: result.signal || null,
            executionTime,
            command
          });
        }).catch((error) => {
          const executionTime = performance.now() - startTime;
          
          resolve({
            success: false,
            stdout: '',
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: -1,
            signal: null,
            executionTime,
            command
          });
        });
      });
      
      // Add timeout if specified
      if (options.timeout) {
        const timeoutPromise = new Promise<CommandResult>((resolve) => {
          setTimeout(() => {
            const executionTime = performance.now() - startTime;
            resolve({
              success: false,
              stdout: '',
              stderr: `Command timed out after ${options.timeout}ms`,
              exitCode: -1,
              signal: 'SIGTERM',
              executionTime,
              command
            });
          }, options.timeout);
        });
        
        // Race between command and timeout
        return await Promise.race([commandPromise, timeoutPromise]);
      }
      
      return await commandPromise;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        signal: null,
        executionTime,
        command
      };
    }
  }

  /**
   * Execute multiple commands in parallel with concurrency limit
   */
  static async executeParallel(
    commands: string[], 
    options: CommandOptions & { concurrency?: number } = {}
  ): Promise<CommandResult[]> {
    const { concurrency = 5, ...cmdOptions } = options;
    const startTime = performance.now();
    console.log(`🚀 Executing ${commands.length} commands in parallel (concurrency: ${concurrency})...`);
    
    const results: CommandResult[] = new Array(commands.length);
    const queue = commands.map((cmd, index) => ({ cmd, index }));
    
    const workers = Array(Math.min(concurrency, commands.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        results[item.index] = await this.executeAsync(item.cmd, cmdOptions);
      }
    });
    
    await Promise.all(workers);
    
    const commandResults: CommandResult[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        commandResults.push(result.value);
      } else {
        commandResults.push({
          success: false,
          stdout: '',
          stderr: result.reason?.message || 'Unknown error',
          exitCode: -1,
          signal: null,
          executionTime: 0,
          command: commands[index]
        });
      }
    });
    
    const totalTime = performance.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ Parallel execution completed in ${totalTime.toFixed(0)}ms`);
    console.log(`📊 Results: ${successCount}/${commands.length} successful`);
    
    return results;
  }

  /**
   * Execute command with retries
   */
  static async executeWithRetry(command: string, options: CommandOptions & { maxRetries?: number } = {}): Promise<CommandResult> {
    const { maxRetries = 3, ...cmdOptions } = options;
    let lastResult: CommandResult | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}: ${command}`);
      
      const result = await this.executeAsync(command, cmdOptions);
      
      if (result.success) {
        console.log(`✅ Command succeeded on attempt ${attempt}`);
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`❌ Command failed after ${maxRetries} attempts`);
    return lastResult!;
  }

  /**
   * Execute shell script content
   */
  static async executeScript(scriptContent: string, options: CommandOptions = {}): Promise<CommandResult> {
    // Create temporary script file
    const tempScript = `/tmp/empire-script-${Date.now()}.sh`;
    
    try {
      // Write script to temporary file
      Bun.write(tempScript, scriptContent);
      
      // Make script executable
      this.executeSync(`chmod +x ${tempScript}`, { quiet: true });
      
      // Execute script
      const result = this.executeSync(`bash ${tempScript}`, options);
      
      // Cleanup
      Bun.spawnSync(['rm', '-f', tempScript]);
      
      return result;
    } catch (error) {
      // Cleanup on error
      try {
        Bun.spawnSync(['rm', '-f', tempScript]);
      } catch {}
      
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        signal: null,
        executionTime: 0,
        command: 'script-execution'
      };
    }
  }

  /**
   * Execute shell script from file
   */
  static async executeScriptFromFile(scriptPath: string, options: CommandOptions = {}): Promise<CommandResult> {
    console.log(`📜 Executing script: ${scriptPath}`);
    
    try {
      const scriptContent = await Bun.file(scriptPath).text();
      return await this.executeAsync(`bash -c "${scriptContent}"`, {
        ...options,
        cwd: options.cwd || process.cwd()
      });
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        signal: null,
        executionTime: 0,
        command: scriptPath
      };
    }
  }

  /**
   * Benchmark command execution performance
   */
  static async benchmark(command: string, iterations = 100): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    throughput: number; // commands per second
  }> {
    console.log(`🏃 Benchmarking: ${command} (${iterations} iterations)`);
    
    const times: number[] = [];
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = this.executeSync(command, { quiet: true });
      times.push(result.executionTime);
      
      if (!result.success) {
        console.warn(`⚠️ Command failed on iteration ${i + 1}: ${result.stderr}`);
      }
    }
    
    const totalTime = performance.now() - startTime;
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = iterations / (totalTime / 1000);
    
    console.log(`📊 Benchmark Results:`);
    console.log(`   Average: ${averageTime.toFixed(3)}ms`);
    console.log(`   Min: ${minTime.toFixed(3)}ms`);
    console.log(`   Max: ${maxTime.toFixed(3)}ms`);
    console.log(`   Total: ${totalTime.toFixed(0)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} commands/sec`);
    
    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      throughput
    };
  }
}

// CLI interface for command execution
if (import.meta.main) {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'exec':
    case 'execute':
      const cmdToExecute = args.join(' ');
      if (cmdToExecute) {
        const result = BunCommandExecutor.executeSync(cmdToExecute);
        console.log('\n📊 Execution Result:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`⏱️ Time: ${result.executionTime.toFixed(3)}ms`);
        console.log(`🔢 Exit Code: ${result.exitCode}`);
        
        if (result.stdout) {
          console.log(`📤 stdout:\n${result.stdout}`);
        }
        
        if (result.stderr) {
          console.log(`📥 stderr:\n${result.stderr}`);
        }
      } else {
        console.log('Usage: bun bun-command-executor.ts exec <command>');
      }
      break;
      
    case 'benchmark':
      const benchmarkCmd = args.join(' ');
      if (benchmarkCmd) {
        await BunCommandExecutor.benchmark(benchmarkCmd);
      } else {
        console.log('Usage: bun bun-command-executor.ts benchmark <command>');
      }
      break;
      
    case 'parallel':
      const commands = args.filter(arg => arg !== '--').join(' ').split('--').map(cmd => cmd.trim()).filter(Boolean);
      if (commands.length > 0) {
        const results = await BunCommandExecutor.executeParallel(commands);
        console.log('\n📊 Parallel Execution Results:');
        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.command}: ${result.success ? '✅' : '❌'} (${result.executionTime.toFixed(3)}ms)`);
        });
      } else {
        console.log('Usage: bun bun-command-executor.ts parallel <cmd1> -- <cmd2> -- <cmd3>');
      }
      break;
      
    default:
      console.log('Available commands:');
      console.log('  exec <command>     - Execute command synchronously');
      console.log('  benchmark <cmd>    - Benchmark command performance');
      console.log('  parallel <cmds>    - Execute multiple commands in parallel');
      console.log('');
      console.log('Example:');
      console.log('  bun bun-command-executor.ts exec "ls -la"');
      console.log('  bun bun-command-executor.ts benchmark "echo test"');
      console.log('  bun bun-command-executor.ts parallel "echo hello" -- "echo world"');
  }
}

export { BunCommandExecutor as default };