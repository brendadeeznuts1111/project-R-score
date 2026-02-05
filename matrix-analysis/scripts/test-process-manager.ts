#!/usr/bin/env bun
/**
 * Test Process Manager
 *
 * Provides utilities for managing test processes with graceful and immediate termination.
 *
 * Usage:
 *   bun run scripts/test-process-manager.ts kill <pid> [--signal=SIGTERM|SIGKILL]
 *   bun run scripts/test-process-manager.ts list [--tests-only]
 *   bun run scripts/test-process-manager.ts monitor
 */

import { spawn } from 'bun';
import { exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

type Signal = 'SIGTERM' | 'SIGKILL' | 'SIGINT' | 'SIGHUP';

type KillResult =
  | { success: true; message: string }
  | { success: false; error: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'STILL_RUNNING' | 'UNKNOWN'; message: string };

interface ProcessInfo {
  pid: number;
  ppid: number;
  command: string;
  args: string[];
  isTest: boolean;
  startTime?: number; // Track when we first saw the process
}

class TestProcessManager {
  /**
   * Kill a process with specified signal using process tree tracking
   */
  static async kill(pid: number, signal: Signal = 'SIGTERM'): Promise<KillResult> {
    try {
      // Check if process exists and get its info
      const procInfo = await this.getProcessInfo(pid);
      if (!procInfo) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Process ${pid} not found`
        };
      }

      // Record the start time before sending signal
      const signalTime = Date.now();

      console.log(`🔪 Sending ${signal} to process ${pid} (${procInfo.command})`);

      // Send the signal
      process.kill(pid, signal);

      // Wait and verify termination
      if (signal === 'SIGTERM') {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if process still exists
        const stillExists = await this.getProcessInfo(pid);

        if (stillExists) {
          // Additional check: verify it's the same process by checking start time
          // AND verify the command matches to prevent PID reuse issues
          if (stillExists.command !== procInfo.command) {
            return {
              success: true,
              message: `Process ${pid} terminated successfully (PID was reused for different command)`
            };
          }

          // Also check start time if available
          const isSameProcess = await this.verifySameProcess(pid, procInfo.startTime);

          if (!isSameProcess) {
            return {
              success: true,
              message: `Process ${pid} terminated successfully (PID was reused)`
            };
          }
        }
      }

      return {
        success: true,
        message: `Process ${pid} terminated successfully`
      };
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Process ${pid} not found`
        };
      } else if (error.code === 'EPERM') {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: `Permission denied when trying to kill process ${pid}`
        };
      } else {
        return {
          success: false,
          error: 'UNKNOWN',
          message: `Failed to kill process ${pid}: ${error.message}`
        };
      }
    }
  }

  /**
   * Verify that a process with the same PID is actually the same process
   * by checking the start time
   */
  private static async verifySameProcess(pid: number, originalStartTime?: number): Promise<boolean> {
    if (!originalStartTime) return true; // Can't verify without original start time

    try {
      // Get process start time (platform-specific)
      let currentStartTime: number | undefined;

      if (process.platform === 'win32') {
        // Windows: use wmic to get process creation time
        const output = await execAsync(`wmic process where ProcessId=${pid} get CreationDate /value`);
        const stdout = typeof output === 'string' ? output : output.stdout;
        const match = stdout.match(/CreationDate=(.+)/);
        if (match) {
          // WMIC returns timestamp in format: 20240131123045.123456-480
          const wmicTime = match[1];
          const year = parseInt(wmicTime.substring(0, 4));
          const month = parseInt(wmicTime.substring(4, 6)) - 1; // JS months are 0-indexed
          const day = parseInt(wmicTime.substring(6, 8));
          const hour = parseInt(wmicTime.substring(8, 10));
          const minute = parseInt(wmicTime.substring(10, 12));
          const second = parseInt(wmicTime.substring(12, 14));
          currentStartTime = new Date(year, month, day, hour, minute, second).getTime();
        }
      } else if (process.platform === 'darwin') {
        // macOS: use ps -o lstart
        const output = await execAsync(`ps -p ${pid} -o lstart=`);
        const stdout = typeof output === 'string' ? output : output.stdout;
        if (stdout) {
          currentStartTime = new Date(stdout).getTime();
        }
      } else if (process.platform === 'linux') {
        // Linux: read from /proc/[pid]/stat
        const output = await execAsync(`cat /proc/${pid}/stat 2>/dev/null`);
        const stat = (typeof output === 'string' ? output : output.stdout).trim();
        if (stat) {
          // The 22nd field in stat is the start time in clock ticks
          const parts = stat.split(' ');
          if (parts.length >= 22) {
            const startTicks = parseInt(parts[21]);
            // Get clock tick count from system
            const tickOutput = await execAsync('getconf CLK_TCK');
            const ticksPerSecond = parseInt((typeof tickOutput === 'string' ? tickOutput : tickOutput.stdout).trim()) || 100;
            const msPerTick = 1000 / ticksPerSecond;
            currentStartTime = startTicks * msPerTick;
          }
        }
      }

      // If we can't determine the current start time, assume it's the same process
      if (!currentStartTime) return true;

      // Allow for small time differences (within 100ms)
      return Math.abs(currentStartTime - originalStartTime) < 100;
    } catch {
      // If we can't verify, assume it's not the same process
      return false;
    }
  }

  /**
   * Get process info safely
   */
  private static async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      // Use platform-specific method for better reliability
      if (process.platform === 'win32') {
        // Windows: use wmic to get process info
        const output = await execAsync(`wmic process where ProcessId=${pid} get ProcessId,ParentProcessId,CreationDate,CommandLine /value`);
        const stdout = typeof output === 'string' ? output : output.stdout;
        const lines = stdout.trim().split('\n');

        const info: any = {};
        for (const line of lines) {
          const match = line.match(/(.+)=(.+)/);
          if (match) {
            info[match[1]] = match[2];
          }
        }

        if (info.ProcessId && parseInt(info.ProcessId) === pid) {
          const startTime = info.CreationDate ? this.parseWMICDate(info.CreationDate).getTime() : undefined;
          const command = info.CommandLine || '';

          return {
            pid: parseInt(info.ProcessId),
            ppid: parseInt(info.ParentProcessId || '0'),
            command,
            args: this.parseCommandLine(command),
            isTest: this.isTestProcess(command),
            startTime
          };
        }
      } else if (process.platform === 'darwin') {
        const output = await execAsync(`ps -p ${pid} -o pid,ppid,lstart,command`);
        const stdout = typeof output === 'string' ? output : output.stdout;
        const lines = stdout.split('\n').slice(1);

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.trim().split(/\s+/);
          const procPid = parseInt(parts[0]);
          const procPpid = parseInt(parts[1]);

          // The start time can be multiple words, so find where command starts
          const dateParts = [];
          let commandStart = 2;
          for (let i = 2; i < parts.length; i++) {
            // Check if this looks like a time (HH:MM:SS)
            if (/^\d{2}:\d{2}:\d{2}$/.test(parts[i])) {
              dateParts.push(...parts.slice(2, i + 1));
              commandStart = i + 1;
              break;
            }
          }

          const startTimeStr = dateParts.join(' ');
          const command = parts.slice(commandStart).join(' ');
          const startTime = startTimeStr ? new Date(startTimeStr).getTime() : undefined;

          if (procPid === pid) {
            return {
              pid: procPid,
              ppid: procPpid,
              command,
              args: this.parseCommandLine(command),
              isTest: this.isTestProcess(command),
              startTime
            };
          }
        }
      } else if (process.platform === 'linux') {
        const output = await execAsync(`ps -p ${pid} -o pid,ppid,etimes,cmd --no-headers`);
        const stdout = typeof output === 'string' ? output : output.stdout;
        const parts = stdout.trim().split(/\s+/);

        if (parts.length >= 4 && parseInt(parts[0]) === pid) {
          const startTime = Date.now() - (parseInt(parts[2]) * 1000); // etimes is seconds since start
          const command = parts.slice(3).join(' ');
          return {
            pid: parseInt(parts[0]),
            ppid: parseInt(parts[1]),
            command,
            args: this.parseCommandLine(command),
            isTest: this.isTestProcess(command),
            startTime
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse command line arguments properly
   */
  private static parseCommandLine(command: string): string[] {
    // Simple but effective parsing for common cases
    // This handles quoted strings and spaces within quotes
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      const prevChar = i > 0 ? command[i - 1] : '';

      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  /**
   * Parse WMIC date format to JavaScript Date
   */
  private static parseWMICDate(wmicDate: string): Date {
    // WMIC returns timestamp in format: 20240131123045.123456-480
    const year = parseInt(wmicDate.substring(0, 4));
    const month = parseInt(wmicDate.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(wmicDate.substring(6, 8));
    const hour = parseInt(wmicDate.substring(8, 10));
    const minute = parseInt(wmicDate.substring(10, 12));
    const second = parseInt(wmicDate.substring(12, 14));

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Find test-related processes using platform-specific methods
   */
  static async findTestProcesses(): Promise<ProcessInfo[]> {
    try {
      let output: string;

      // Use platform-specific commands for better performance
      if (process.platform === 'win32') {
        // Windows: use wmic to get process list
        const execAsyncOutput = await execAsync('wmic process get ProcessId,ParentProcessId,CommandLine /value');
        const stdout = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
        const lines = stdout.split('\n').filter(line => line.trim());
        const testProcesses: ProcessInfo[] = [];

        let currentProcess: any = {};
        for (const line of lines) {
          if (line.includes('=')) {
            const [key, value] = line.split('=');
            currentProcess[key] = value;
          } else {
            // Empty line indicates end of process entry
            if (currentProcess.ProcessId && currentProcess.CommandLine) {
              const command = currentProcess.CommandLine;
              if (this.isTestProcess(command)) {
                testProcesses.push({
                  pid: parseInt(currentProcess.ProcessId),
                  ppid: parseInt(currentProcess.ParentProcessId || '0'),
                  command,
                  args: command.split(' '),
                  isTest: true
                });
              }
            }
            currentProcess = {};
          }
        }

        return testProcesses;
      } else if (process.platform === 'darwin') {
        const execAsyncOutput = await execAsync('ps aux');
        output = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
      } else if (process.platform === 'linux') {
        // More efficient on Linux - only get necessary columns
        const execAsyncOutput = await execAsync('ps -eo pid,ppid,cmd --no-headers');
        output = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
      } else {
        // Fallback for other platforms
        const execAsyncOutput = await execAsync('ps aux');
        output = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
      }

      const lines = output.split('\n');
      const testProcesses: ProcessInfo[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        let parts: string[];

        if (process.platform === 'linux' && !line.includes('USER')) {
          // Linux simplified format
          parts = line.trim().split(/\s+/);
        } else {
          // Standard ps aux format (macOS and others)
          parts = line.trim().split(/\s+/);
          if (parts.length < 11) continue;
          parts = parts.slice(1); // Skip USER column for ps aux
        }

        if (parts.length < 3) continue;

        const pid = parseInt(parts[0]);
        const ppid = parseInt(parts[1]);
        const command = parts.slice(2).join(' ');

        // Skip if not a valid PID
        if (isNaN(pid) || isNaN(ppid)) continue;

        // Check if it's a test process
        const isTest = this.isTestProcess(command);

        if (isTest) {
          testProcesses.push({
            pid,
            ppid,
            command,
            args: parts.slice(2),
            isTest
          });
        }
      }

      return testProcesses;
    } catch (error: any) {
      console.error(`❌ Failed to list processes: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a command is test-related
   */
  private static isTestProcess(command: string): boolean {
    const testPatterns = [
      'bun test',
      'bun.*test',
      'npm test',
      'yarn test',
      'pnpm test',
      'jest',
      'vitest',
      'mocha',
      'ava',
      'tap',
      'node.*test',
      'test.*js',
      'test.*ts'
    ];

    return testPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });
  }

  /**
   * List running processes
   */
  static async list(testsOnly: boolean = false): Promise<void> {
    try {
      let output: string;

      if (process.platform === 'win32') {
        const execAsyncOutput = await execAsync('wmic process get ProcessId,CommandLine /value');
        const stdout = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
        const lines = stdout.split('\n').filter(line => line.trim());
        const testProcesses: ProcessInfo[] = [];

        let currentProcess: any = {};
        for (const line of lines) {
          if (line.includes('=')) {
            const [key, value] = line.split('=');
            currentProcess[key] = value;
          } else {
            // Empty line indicates end of process entry
            if (currentProcess.ProcessId && currentProcess.CommandLine) {
              const command = currentProcess.CommandLine;
              if (this.isTestProcess(command)) {
                testProcesses.push({
                  pid: parseInt(currentProcess.ProcessId),
                  ppid: parseInt(currentProcess.ParentProcessId || '0'),
                  command,
                  args: command.split(' '),
                  isTest: true
                });
              }
            }
            currentProcess = {};
          }
        }

        if (testsOnly) {
          console.log('🧪 Test Processes:');
          testProcesses.forEach(p => {
            console.log(`   PID ${p.pid}: ${p.command}`);
          });
        } else {
          console.log('📄 All Processes:');
          testProcesses.forEach(p => {
            console.log(`   PID ${p.pid}: ${p.command}`);
          });
        }
      } else {
        const execAsyncOutput = await execAsync('ps aux');
        const stdout = typeof execAsyncOutput === 'string' ? execAsyncOutput : execAsyncOutput.stdout;
        const lines = stdout.split('\n');

        console.log();

        let foundAny = false;

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          const command = parts.slice(10).join(' ');

          const isTest = this.isTestProcess(command);

          if (!testsOnly || isTest) {
            const icon = isTest ? '🧪' : '📄';
            console.log(`${icon} PID: ${pid.padEnd(8)} ${command}`);
            foundAny = true;
          }
        }

        if (!foundAny) {
          if (testsOnly) {
            console.log('🧪 No test processes found');
          } else {
            console.log('📄 No processes found');
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to list processes:', error);
    }
  }

  /**
   * Monitor test processes
   */
  static async monitor(): Promise<void> {
    console.log('👀 Monitoring test processes... (Ctrl+C to stop)');
    console.log();

    const interval = setInterval(async () => {
      const testProcesses = await this.findTestProcesses();

      if (testProcesses.length === 0) {
        console.log('🧪 No test processes running');
      } else {
        console.log(`🧪 Found ${testProcesses.length} test process(es):`);
        testProcesses.forEach(p => {
          console.log(`   PID ${p.pid}: ${p.command}`);
        });
      }

      console.log('─'.repeat(50));
    }, 3000);

    // Handle Ctrl+C - use once to prevent memory leaks
    const handleSigInt = () => {
      clearInterval(interval);
      console.log('\n👋 Stopped monitoring');
      process.exit(0);
    };

    process.once('SIGINT', handleSigInt);
  }

  /**
   * Validate PID input
   */
  static validatePid(pid: any): number | null {
    const num = parseInt(pid);
    if (isNaN(num) || num <= 0 || num > 4294967295) {
      return null;
    }
    return num;
  }

  /**
   * Validate signal input
   */
  static validateSignal(signal: any): Signal | null {
    const validSignals: Signal[] = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'];
    if (validSignals.includes(signal)) {
      return signal;
    }
    return null;
  }

  /**
   * Graceful shutdown with timeout
   */
  static async gracefulShutdown(pid: number, timeout: number = 5000): Promise<KillResult> {
    console.log(`🔄 Attempting graceful shutdown of process ${pid} (timeout: ${timeout}ms)`);

    // Send SIGTERM
    const result = await this.kill(pid, 'SIGTERM');

    if (!result.success) {
      if (result.error === 'NOT_FOUND') {
        return {
          success: true,
          message: `Process ${pid} not found, assuming already terminated`
        };
      }
      return result;
    }

    console.log(`⏱️  Waiting ${timeout}ms for process to terminate...`);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        await execAsync(`kill -0 ${pid}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        return {
          success: true,
          message: `Process ${pid} terminated gracefully`
        };
      }
    }

    // Process didn't terminate, force kill
    console.log(`⚡ Process didn't terminate, forcing shutdown...`);
    return await this.kill(pid, 'SIGKILL');
  }

  /**
   * Kill all test processes
   */
  static async killAllTests(signal: Signal = 'SIGTERM'): Promise<void> {
    const testProcesses = await this.findTestProcesses();

    if (testProcesses.length === 0) {
      console.log('🧪 No test processes found');
      return;
    }

    console.log(`🧪 Found ${testProcesses.length} test process(es):`);
    testProcesses.forEach(p => console.log(`   PID ${p.pid}: ${p.command}`));
    console.log();

    for (const process of testProcesses) {
      await this.kill(process.pid, signal);
    }
  }
}

function printBanner() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Test Process Manager - Process Control for Tests              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log();
}

function printUsage() {
  console.log('Usage: bun run scripts/test-process-manager.ts <command> [options]');
  console.log();
  console.log('Commands:');
  console.log('  kill <pid> [--signal=<signal>]    Kill a specific process');
  console.log('  list [--tests-only]              List running processes');
  console.log('  monitor                          Monitor test processes continuously');
  console.log('  graceful <pid> [--timeout=<ms>]  Graceful shutdown with timeout');
  console.log('  kill-all [--signal=<signal>]     Kill all test processes');
  console.log();
  console.log('Signals:');
  console.log('  SIGTERM   (default)  Graceful termination');
  console.log('  SIGKILL               Immediate termination');
  console.log('  SIGINT                Interrupt (Ctrl+C)');
  console.log('  SIGHUP                Hang up signal');
  console.log();
  console.log('Examples:');
  console.log('  bun run scripts/test-process-manager.ts kill 12345');
  console.log('  bun run scripts/test-process-manager.ts kill 12345 --signal=SIGKILL');
  console.log('  bun run scripts/test-process-manager.ts list --tests-only');
  console.log('  bun run scripts/test-process-manager.ts graceful 12345 --timeout=3000');
  console.log('  bun run scripts/test-process-manager.ts kill-all --signal=SIGTERM');
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  printBanner();

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  switch (command) {
    case 'kill': {
      const pid = TestProcessManager.validatePid(args[1]);
      if (pid === null) {
        console.error('❌ Please provide a valid PID (positive integer)');
        process.exit(1);
      }

      const signalArg = args.find(arg => arg.startsWith('--signal=')) || '--signal=SIGTERM';
      const signalValue = signalArg.split('=')[1];
      const signal = TestProcessManager.validateSignal(signalValue);

      if (!signal) {
        console.error(`❌ Invalid signal: ${signalValue}. Valid signals: SIGTERM, SIGKILL, SIGINT, SIGHUP`);
        process.exit(1);
      }

      const result = await TestProcessManager.kill(pid, signal);

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const testsOnly = args.includes('--tests-only');
      await TestProcessManager.list(testsOnly);
      break;
    }

    case 'monitor': {
      await TestProcessManager.monitor();
      break;
    }

    case 'graceful': {
      const pid = TestProcessManager.validatePid(args[1]);
      if (pid === null) {
        console.error('❌ Please provide a valid PID (positive integer)');
        process.exit(1);
      }

      const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
      const timeout = timeoutArg ? parseInt(timeoutArg.split('=')[1]) : 5000;

      if (isNaN(timeout) || timeout < 0) {
        console.error('❌ Please provide a valid timeout (positive number of milliseconds)');
        process.exit(1);
      }

      const result = await TestProcessManager.gracefulShutdown(pid, timeout);

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'kill-all': {
      const signalArg = args.find(arg => arg.startsWith('--signal=')) || '--signal=SIGTERM';
      const signalValue = signalArg.split('=')[1];
      const signal = TestProcessManager.validateSignal(signalValue);

      if (!signal) {
        console.error(`❌ Invalid signal: ${signalValue}. Valid signals: SIGTERM, SIGKILL, SIGINT, SIGHUP`);
        process.exit(1);
      }

      await TestProcessManager.killAllTests(signal);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log();
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

// Export for testing
export { TestProcessManager };
