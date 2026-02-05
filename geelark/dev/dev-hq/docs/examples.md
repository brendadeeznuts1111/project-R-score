# Dev HQ Examples

This document provides practical examples and use cases for the Dev HQ automation suite.

## 📋 Table of Contents

- [🚀 Quick Start Examples](#-quick-start-examples)
  - [Basic API Server Usage](#basic-api-server-usage)
  - [Command Automation Examples](#command-automation-examples)
  - [Spawn Server Examples](#spawn-server-examples)
- [🔄 Advanced Patterns](#-advanced-patterns)
  - [Concurrent Processing](#concurrent-processing)
  - [Error Handling & Retries](#error-handling--retries)
  - [Memory Management](#memory-management)
- [🌐 Real-World Use Cases](#-real-world-use-cases)
  - [1. CI/CD Pipeline Automation](#1-cicd-pipeline-automation)
  - [2. Development Environment Manager](#2-development-environment-manager)
  - [3. Log Analysis & Monitoring](#3-log-analysis--monitoring)
- [🔧 Integration Examples](#-integration-examples)
  - [Docker Integration](#docker-integration)
  - [Kubernetes Integration](#kubernetes-integration)
- [🛡️ Security Best Practices](#️-security-best-practices)
- [⚡ Performance Optimization](#-performance-optimization)
- [🔍 Troubleshooting](#-troubleshooting)

## 🚀 Quick Start Examples

### Basic API Server Usage

```typescript
import { getServer } from '../servers/api-server.js';

// TypeScript interfaces for better type safety
interface ServerResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
}

// Start the server with proper error handling
async function startServer(): Promise<void> {
  try {
    const server = getServer();
    console.log(`🚀 Server running at: ${server.url.href}`);

    // Test all endpoints with proper typing
    const endpoints = ['health', 'secrets', 'mmap', 'plugin', 'glob'] as const;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${server.url.href}${endpoint}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ServerResponse = await response.json();
        console.log(`${endpoint}:`, data.success ? '✅' : '❌');

        // Additional logging for health checks
        if (endpoint === 'health' && data.success) {
          const health = data.data as HealthCheck;
          console.log(`  Status: ${health.status}, Uptime: ${health.uptime}s`);
        }
      } catch (error) {
        console.error(`❌ Failed to test ${endpoint}:`, error instanceof Error ? error.message : error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Execute with proper error handling
startServer().catch(console.error);
```

### Command Automation Examples

```typescript
import { AutomationService } from '../core/automation.js';

// Enhanced TypeScript interfaces with official Bun types
interface EnhancedExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: boolean;
  pid?: number;
  resourceUsage?: {
    contextSwitches: { voluntary: number; involuntary: number };
    cpuTime: { user: number; system: number; total: number };
    maxRSS: number;
    messages: { sent: number; received: number };
    ops: { in: number; out: number };
    shmSize: number;
    signalCount: number;
    swapCount: number;
  };
  executionTime?: number;
  signalCode?: "SIGABRT" | "SIGALRM" | "SIGBUS" | "SIGCHLD" | "SIGCONT" |
                  "SIGFPE" | "SIGHUP" | "SIGILL" | "SIGINT" | "SIGIO" |
                  "SIGIOT" | "SIGKILL" | "SIGPIPE" | "SIGPOLL" | "SIGPROF" |
                  "SIGPWR" | "SIGQUIT" | "SIGSEGV" | "SIGSTKFLT" | "SIGSTOP" |
                  "SIGSYS" | "SIGTERM" | "SIGTRAP" | "SIGTSTP" | "SIGTTIN" |
                  "SIGTTOU" | "SIGUNUSED" | "SIGURG" | "SIGUSR1" | "SIGUSR2" |
                  "SIGVTALRM" | "SIGWINCH" | "SIGXCPU" | "SIGXFSZ" | "SIGBREAK" |
                  "SIGLOST" | "SIGINFO" | null;
}

interface FileInfo {
  name: string;
  size: number;
  lines: number;
}

const automationService = new AutomationService();

// Example 1: Enhanced command execution with resource monitoring
async function executeCommandWithMonitoring(): Promise<void> {
  try {
    const result: EnhancedExecutionResult = await automationService.executeCommand('list-files', ['ls', '-la'], {
      workingDirectory: process.cwd(),
      timeout: 5000,
      onExit: (proc, exitCode, signalCode, error) => {
        console.log(`Process exited with code: ${exitCode}`);
        if (signalCode) console.log(`Signal received: ${signalCode}`);
        if (error) console.error('Exit error:', error);
      },
      killSignal: 'SIGTERM', // Graceful termination
    });

    if (result.exitCode === 0) {
      console.log('✅ Command executed successfully:');
      console.log(result.stdout);
      console.log(`📊 Execution time: ${result.executionTime}ms`);

      if (result.resourceUsage) {
        console.log(`🧠 Memory used: ${result.resourceUsage.maxRSS} bytes`);
        console.log(`⏱️ CPU time (user): ${result.resourceUsage.cpuTime.user}µs`);
        console.log(`⏱️ CPU time (system): ${result.resourceUsage.cpuTime.system}µs`);
        console.log(`📨 Messages sent: ${result.resourceUsage.messages.sent}`);
        console.log(`📬 Messages received: ${result.resourceUsage.messages.received}`);
        console.log(`🔄 Context switches (voluntary): ${result.resourceUsage.contextSwitches.voluntary}`);
        console.log(`🔄 Context switches (involuntary): ${result.resourceUsage.contextSwitches.involuntary}`);
      }
    } else {
      console.error('❌ Command failed:', result.stderr);
      if (result.signalCode) {
        console.log(`💀 Process terminated by signal: ${result.signalCode}`);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : error);
  }
}

// Example 2: Advanced signal handling and process control
async function demonstrateProcessControl(): Promise<void> {
  try {
    // Start a long-running process
    const process = await automationService.executeCommand('sleep-process', ['sleep', '30'], {
      stream: false,
      onExit: (proc, exitCode, signalCode, error) => {
        console.log(`🏁 Process exited with code: ${exitCode}, signal: ${signalCode}`);
        if (error) console.error('Exit error:', error);
      },
    });

    if (process && typeof process !== 'string' && 'pid' in process) {
      console.log(`🚀 Started process with PID: ${process.pid}`);

      // Wait 2 seconds, then send SIGTERM (graceful shutdown)
      setTimeout(async () => {
        console.log('📤 Sending SIGTERM for graceful shutdown...');
        const terminated = automationService.terminateProcess('sleep-process', 'SIGTERM');

        if (terminated) {
          console.log('✅ Process termination initiated');
        }
      }, 2000);

      // Wait for process to exit and get final stats
      await (process as any).exited;

      // Get final resource usage
      const stats = automationService.getResourceStatistics();
      console.log('📊 Final process statistics:', stats);
    }

  } catch (error) {
    console.error('❌ Process control demonstration failed:', error);
  }
}

// Example 3: Advanced stream handling with stdin/stdout
async function demonstrateStreamHandling(): Promise<void> {
  try {
    console.log('🌊 Demonstrating stream processing...');

    // Create a ReadableStream with test data
    const inputStream = new ReadableStream({
      start(controller) {
        controller.enqueue('Hello from stream!\n');
        controller.enqueue('This is line 2\n');
        controller.enqueue('Final line 3\n');
        controller.close();
      },
    });

    // Execute cat command with stream input
    const result = await automationService.executeCommandWithStreams(
      'stream-cat',
      ['cat'],
      inputStream,
      {
        timeout: 5000,
        onExit: (proc, exitCode, signalCode, error) => {
          console.log(`🏁 Stream process exited: code=${exitCode}`);
        },
      }
    );

    console.log('✅ Stream processing result:');
    console.log(result.stdout);

  } catch (error) {
    console.error('❌ Stream handling failed:', error);
  }
}

// Example 4: Incremental stdin writing
async function demonstrateIncrementalWriting(): Promise<void> {
  try {
    console.log('📝 Demonstrating incremental stdin writing...');

    // Start a cat process with pipe stdin
    const catProcess = await automationService.executeCommandWithStreams(
      'incremental-cat',
      ['cat'],
      'pipe', // Enable stdin for writing
      { stream: false }
    ) as any;

    if (catProcess && typeof catProcess !== 'string' && 'stdin' in catProcess) {
      // Write data incrementally
      await automationService.writeToProcessStdin('incremental-cat', 'First line\n', false);
      await automationService.writeToProcessStdin('incremental-cat', 'Second line\n', false);

      // Write binary data
      const encoder = new TextEncoder();
      await automationService.writeToProcessStdin('incremental-cat', encoder.encode('Binary data\n'), false);

      // Close stdin and wait for result
      await automationService.writeToProcessStdin('incremental-cat', '', true);

      await catProcess.exited;

      console.log('✅ Incremental writing completed');
    }

  } catch (error) {
    console.error('❌ Incremental writing failed:', error);
  }
}

// Example 5: Advanced timeout and signal handling
async function demonstrateTimeoutHandling(): Promise<void> {
  try {
    console.log('⏱️ Demonstrating timeout and signal handling...');

    // Execute a command that will timeout
    const result = await automationService.executeCommandWithTimeout(
      'timeout-test',
      ['sleep', '10'], // This will run for 10 seconds
      3000, // But we timeout after 3 seconds
      'SIGTERM', // Graceful termination
      {
        onExit: (proc, exitCode, signalCode, error) => {
          console.log(`🏁 Timeout test process exited: code=${exitCode}, signal=${signalCode}`);
        },
      }
    );

    console.log('✅ Timeout handling result:');
    console.log(`Exit code: ${result.exitCode}`);
    console.log(`Signal: ${result.signalCode}`);
    console.log(`Error: ${result.error}`);
    console.log(`Stderr: ${result.stderr}`);

  } catch (error) {
    console.error('❌ Timeout handling failed:', error);
  }
}

// Example 6: Process detachment and daemonization
async function demonstrateProcessDetachment(): Promise<void> {
  try {
    console.log('🔄 Demonstrating process detachment...');

    // Start a detached process that runs in background
    const detachedProcess = await automationService.executeDetachedCommand(
      'daemon-process',
      ['sleep', '30'], // Runs for 30 seconds in background
      {
        onExit: (proc, exitCode, signalCode, error) => {
          console.log(`🏁 Detached process exited: code=${exitCode}`);
        },
      }
    );

    console.log(`✅ Detached process started with PID: ${detachedProcess.pid}`);
    console.log('📝 The parent process can now exit without waiting for the child');

    // Demonstrate that parent can continue working
    setTimeout(() => {
      console.log('🏃 Parent process is still running and responsive!');
    }, 1000);

  } catch (error) {
    console.error('❌ Process detachment failed:', error);
  }
}

// Example 7: Resource usage monitoring
async function demonstrateResourceMonitoring(): Promise<void> {
  try {
    console.log('📊 Demonstrating resource usage monitoring...');

    // Execute a CPU-intensive command
    const result = await automationService.executeCommand('cpu-test', [
      'bash', '-c', 'for i in {1..1000}; do echo $i; done'
    ], {
      timeout: 10000,
      onExit: (proc, exitCode, signalCode, error) => {
        console.log(`🏁 CPU test process exited: code=${exitCode}`);
      },
    });

    if (result.resourceUsage) {
      console.log('✅ Resource usage statistics:');
      console.log(`🧠 Max RSS (memory): ${result.resourceUsage.maxRSS} bytes`);
      console.log(`⏱️ CPU time (user): ${result.resourceUsage.cpuTime.user}µs`);
      console.log(`⏱️ CPU time (system): ${result.resourceUsage.cpuTime.system}µs`);
      console.log(`⏱️ CPU time (total): ${result.resourceUsage.cpuTime.total}µs`);
      console.log(`🔄 Context switches (voluntary): ${result.resourceUsage.contextSwitches.voluntary}`);
      console.log(`🔄 Context switches (involuntary): ${result.resourceUsage.contextSwitches.involuntary}`);
      console.log(`📨 Messages sent: ${result.resourceUsage.messages.sent}`);
      console.log(`📬 Messages received: ${result.resourceUsage.messages.received}`);
      console.log(`💾 Shared memory size: ${result.resourceUsage.shmSize} bytes`);
      console.log(`🔢 Signal count: ${result.resourceUsage.signalCount}`);
      console.log(`🔄 Swap count: ${result.resourceUsage.swapCount}`);
      console.log(`📊 I/O operations (in): ${result.resourceUsage.ops.in}`);
      console.log(`📊 I/O operations (out): ${result.resourceUsage.ops.out}`);
    }

    console.log(`⏱️ Execution time: ${result.executionTime}ms`);

  } catch (error) {
    console.error('❌ Resource monitoring failed:', error);
  }
}

// Example 8: IPC communication between processes
async function demonstrateIPC(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('🔨 Starting build and test process...');

    // Clean previous build with error handling
    console.log('🧹 Cleaning previous build...');
    const cleanResult = await automation.runCommand('clean', ['rm', '-rf', 'dist']);
    // Don't fail if dist doesn't exist
    if (cleanResult.exitCode !== 0 && !cleanResult.stderr.includes('No such file')) {
      console.warn('⚠️ Clean failed, continuing:', cleanResult.stderr);
    }

    // Check package manager
    console.log('📦 Installing dependencies...');
    let installCommand: string[];

    // Try different package managers
    const packageManagers = [
      { cmd: ['bun', 'install'], name: 'Bun' },
      { cmd: ['npm', 'ci'], name: 'npm' },
      { cmd: ['yarn', 'install'], name: 'Yarn' }
    ];

    let installResult: CommandResult | null = null;
    let usedManager = '';

    for (const manager of packageManagers) {
      try {
        installResult = await automation.runCommand('install', manager.cmd);
        if (installResult.exitCode === 0) {
          usedManager = manager.name;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!installResult || installResult.exitCode !== 0) {
      throw new Error('Failed to install dependencies with any package manager');
    }

    console.log(`✅ Dependencies installed using ${usedManager}`);

    // Build project
    console.log('🏗️ Building project...');
    const buildCommands = [
      ['bun', 'build', './src/index.ts'],
      ['npm', 'run', 'build'],
      ['yarn', 'build']
    ];

    let buildResult: CommandResult | null = null;

    for (const cmd of buildCommands) {
      try {
        buildResult = await automation.runCommand('build', cmd);
        if (buildResult.exitCode === 0) {
          break;
        }
      } catch {
        continue;
      }
    }

    if (!buildResult || buildResult.exitCode !== 0) {
      console.error('❌ Build failed:');
      if (buildResult) {
        console.error('Stderr:', buildResult.stderr);
        console.error('Stdout:', buildResult.stdout);
      }
      return false;
    }

    console.log('✅ Build completed successfully');

    // Run tests
    console.log('🧪 Running tests...');
    const testCommands = [
      ['bun', 'test', '--coverage'],
      ['npm', 'test'],
      ['yarn', 'test']
    ];

    let testResult: CommandResult | null = null;

    for (const cmd of testCommands) {
      try {
        testResult = await automation.runCommand('test', cmd);
        if (testResult.exitCode === 0) {
          break;
        }
      } catch {
        continue;
      }
    }

    const executionTime = Date.now() - startTime;

    if (!testResult || testResult.exitCode !== 0) {
      console.error('❌ Tests failed after', Math.round(executionTime / 1000), 'seconds');
      if (testResult) {
        console.error('Test output:', testResult.stdout);
        console.error('Test errors:', testResult.stderr);
      }
      return false;
    }

    console.log(`✅ All tests passed in ${Math.round(executionTime / 1000)}s`);
    console.log('📊 Test coverage:', testResult.stdout.split('\n').find(line => line.includes('Coverage')) || 'Coverage info not available');

    return true;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Build and test failed after ${Math.round(executionTime / 1000)}s:`, error instanceof Error ? error.message : error);
    return false;
  }
}

// Usage examples with proper error handling
async function runExamples(): Promise<void> {
  console.log('🚀 Running Dev HQ automation examples...');

  try {
    // File processing example
    console.log('\n📁 Processing files...');
    const processedFiles = await processFiles();
    console.log(`Processed ${processedFiles.length} files successfully`);

    // Git operations example
    console.log('\n🔀 Checking git status...');
    await gitStatus();

    // Build and test example
    console.log('\n🏗️ Running build and test...');
    const buildSuccess = await buildAndTest();

    if (buildSuccess) {
      console.log('\n🎉 All examples completed successfully!');
    } else {
      console.log('\n⚠️ Some examples had issues. Check the logs above.');
    }
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Execute examples
runExamples();
```

### Spawn Server Examples

```typescript
import { EnhancedDevHQServer } from '../servers/spawn-server.js';

// TypeScript interfaces for server configuration and responses
interface ServerConfig {
  port: number;
  hostname: string;
  maxConnections: number;
  timeout: number;
  enableAuth: boolean;
  enableMetrics: boolean;
  enableWebSocket: boolean;
}

interface CommandRequest {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string>;
  stream?: boolean;
  timeout?: number;
  auth?: string;
}

interface CommandResponse {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface StreamMessage {
  type: 'output' | 'error' | 'done';
  data: string;
  timestamp: string;
}

// Example 1: Enhanced HTTP API with proper error handling
class DevHQHTTPServer {
  private server: EnhancedDevHQServer;
  private authToken: string;

  constructor(config: ServerConfig, authToken: string) {
    this.server = new EnhancedDevHQServer(config);
    this.authToken = authToken;
  }

  async start(): Promise<void> {
    try {
      this.server.start();
      console.log(`🚀 Enhanced Dev HQ Server started on port ${this.server.port}`);
      console.log(`📊 Metrics enabled: ${this.server.metricsEnabled}`);
      console.log(`🔐 Authentication enabled: ${this.server.authEnabled}`);
    } catch (error) {
      console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // Execute command via HTTP with comprehensive error handling
  async executeCommand(request: CommandRequest): Promise<CommandResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:${this.server.port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'User-Agent': 'DevHQ-Client/1.0'
        },
        body: JSON.stringify({
          cmd: request.cmd,
          timeout: request.timeout || 30000,
          cwd: request.cwd,
          env: request.env
        }),
        signal: AbortSignal.timeout(request.timeout || 30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: CommandResponse = await response.json();
      result.executionTime = Date.now() - startTime;

      console.log(`⚡ Command executed in ${result.executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Command failed after ${executionTime}ms:`, error instanceof Error ? error.message : error);

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  // Health check with detailed status
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.server.port}/health`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ Health check failed: HTTP ${response.status}`);
        return false;
      }

      const health = await response.json();
      console.log('🏥 Server health:', health);
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Health check error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      this.server.stop();
      console.log('🛑 Server stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping server:', error instanceof Error ? error.message : error);
    }
  }
}

// Example 2: WebSocket streaming with reconnection logic
class DevHQStreamClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private authToken: string;
  private serverUrl: string;

  constructor(serverUrl: string, authToken: string) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
  }

  // Connect with automatic reconnection
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.serverUrl}/stream?token=${encodeURIComponent(this.authToken)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: StreamMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      };
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private handleMessage(message: StreamMessage): void {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();

    switch (message.type) {
      case 'output':
        console.log(`[${timestamp}] 📤 ${message.data}`);
        break;
      case 'error':
        console.error(`[${timestamp}] ❌ ${message.data}`);
        break;
      case 'done':
        console.log(`[${timestamp}] ✅ Command completed`);
        break;
      default:
        console.warn(`[${timestamp}] ❓ Unknown message type: ${message.type}`);
    }
  }

  // Stream command execution
  streamCommand(command: string[], options: { cwd?: string; env?: Record<string, string> } = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');
      return;
    }

    const request = {
      cmd: command,
      stream: true,
      cwd: options.cwd,
      env: options.env
    };

    console.log(`🚀 Streaming command: ${command.join(' ')}`);
    this.ws.send(JSON.stringify(request));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('🔌 WebSocket disconnected manually');
    }
  }
}

// Usage examples with proper error handling
async function demonstrateSpawnServer(): Promise<void> {
  const authToken = process.env.DEV_HQ_TOKEN || 'your-auth-token';
  const serverConfig: ServerConfig = {
    port: 3001,
    enableAuth: true,
    enableMetrics: true,
    maxConnections: 100,
    timeout: 30000
  };

  // Initialize HTTP server
  const httpServer = new DevHQHTTPServer(serverConfig, authToken);

  try {
    // Start server
    await httpServer.start();

    // Health check
    const isHealthy = await httpServer.healthCheck();
    if (!isHealthy) {
      throw new Error('Server health check failed');
    }

    // Execute commands via HTTP
    console.log('\n📋 Testing HTTP command execution...');

    const commands: CommandRequest[] = [
      { cmd: ['echo', 'Hello from Dev HQ!'] },
      { cmd: ['pwd'] },
      { cmd: ['ls', '-la'], timeout: 5000 },
      { cmd: ['node', '--version'] }
    ];

    for (const command of commands) {
      console.log(`\n⚡ Executing: ${command.cmd.join(' ')}`);
      const result = await httpServer.executeCommand(command);

      if (result.success) {
        console.log(`✅ Success (${result.executionTime}ms)`);
        if (result.stdout.trim()) {
          console.log('📤 Output:', result.stdout.trim());
        }
      } else {
        console.log(`❌ Failed (${result.executionTime}ms)`);
        if (result.stderr.trim()) {
          console.log('📥 Error:', result.stderr.trim());
        }
      }
    }

    // Initialize WebSocket streaming
    console.log('\n🔗 Testing WebSocket streaming...');
    const streamClient = new DevHQStreamClient('ws://localhost:3001', authToken);

    await streamClient.connect();

    // Stream a long-running command
    streamClient.streamCommand(['tail', '-f', '/var/log/system.log'], { cwd: '/var/log' });

    // Wait a bit then disconnect
    setTimeout(() => {
      streamClient.disconnect();
      httpServer.stop();
    }, 10000);

  } catch (error) {
    console.error('❌ Spawn server demonstration failed:', error instanceof Error ? error.message : error);
    await httpServer.stop();
  }
}

// Execute demonstration
demonstrateSpawnServer().catch(console.error);
```

## 🔄 Advanced Patterns

### Concurrent Processing

```typescript
import { DevHQAutomation } from './automation.js';

// TypeScript interfaces for concurrent processing
interface ProcessingResult<T> {
  item: T;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
}

interface ConcurrentConfig {
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  progressCallback?: (completed: number, total: number) => void;
}

interface ProcessingMetrics {
  totalItems: number;
  successful: number;
  failed: number;
  totalTime: number;
  averageTime: number;
  errors: string[];
}

// Enhanced concurrent processing with proper error handling
class EnhancedConcurrentProcessor<T, R> {
  private queue: Array<{
    item: T;
    resolve: (result: ProcessingResult<T>) => void;
    reject: (error: Error) => void;
    attempt: number;
  }> = [];
  private running = 0;
  private metrics: ProcessingMetrics;
  private startTime = 0;

  constructor(
    private processor: (item: T) => Promise<R>,
    private config: ConcurrentConfig
  ) {
    this.metrics = {
      totalItems: 0,
      successful: 0,
      failed: 0,
      totalTime: 0,
      averageTime: 0,
      errors: []
    };
  }

  async process(items: T[]): Promise<ProcessingResult<T>[]> {
    console.log(`🚀 Starting concurrent processing of ${items.length} items`);
    console.log(`⚙️ Configuration: maxConcurrency=${this.config.maxConcurrency}, timeout=${this.config.timeout}ms`);

    this.startTime = Date.now();
    this.metrics.totalItems = items.length;

    const results: ProcessingResult<T>[] = [];
    const promises: Promise<ProcessingResult<T>>[] = [];

    // Create processing promises for all items
    for (const item of items) {
      const promise = new Promise<ProcessingResult<T>>((resolve, reject) => {
        this.queue.push({
          item,
          resolve,
          reject,
          attempt: 0
        });
        this.processQueue();
      });

      promises.push(promise);
    }

    // Wait for all processing to complete
    try {
      const resolvedResults = await Promise.allSettled(promises);

      // Extract results from settled promises
      for (const settled of resolvedResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          // Handle rejected promises
          console.error('❌ Processing promise rejected:', settled.reason);
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error during processing:', error);
    }

    // Calculate final metrics
    this.calculateMetrics(results);

    console.log('📊 Processing completed:', this.getMetricsSummary());
    return results;
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more items
    if (this.running >= this.config.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { item, resolve, reject, attempt } = this.queue.shift()!;
    const itemStartTime = Date.now();

    try {
      console.log(`🔄 Processing item (attempt ${attempt + 1}):`, item);

      // Process with timeout
      const result = await Promise.race([
        this.processor(item),
        new Promise<never>((_, timeoutReject) =>
          setTimeout(() => timeoutReject(new Error('Processing timeout')), this.config.timeout)
        )
      ]);

      const executionTime = Date.now() - itemStartTime;

      const processingResult: ProcessingResult<T> = {
        item,
        result,
        success: true,
        executionTime
      };

      this.metrics.successful++;
      this.notifyProgress();

      console.log(`✅ Item processed successfully in ${executionTime}ms`);
      resolve(processingResult);

    } catch (error) {
      const executionTime = Date.now() - itemStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.warn(`⚠️ Item processing failed in ${executionTime}ms:`, errorMessage);

      // Retry logic
      if (attempt < this.config.retryAttempts) {
        console.log(`🔄 Retrying item (attempt ${attempt + 2}/${this.config.retryAttempts + 1})`);

        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push({ item, resolve, reject, attempt: attempt + 1 });
          this.processQueue();
        }, this.config.retryDelay * (attempt + 1)); // Exponential backoff

        this.running--;
        return;
      }

      // Max retries reached, mark as failed
      const processingResult: ProcessingResult<T> = {
        item,
        result: null,
        success: false,
        error: errorMessage,
        executionTime
      };

      this.metrics.failed++;
      this.metrics.errors.push(`${item}: ${errorMessage}`);
      this.notifyProgress();

      console.error(`❌ Item failed after ${attempt + 1} attempts`);
      resolve(processingResult);

    } finally {
      this.running--;
      this.processQueue(); // Process next item in queue
    }
  }

  private notifyProgress(): void {
    if (this.config.progressCallback) {
      const completed = this.metrics.successful + this.metrics.failed;
      this.config.progressCallback(completed, this.metrics.totalItems);
    }
  }

  private calculateMetrics(results: ProcessingResult<T>[]): void {
    this.metrics.totalTime = Date.now() - this.startTime;

    if (results.length > 0) {
      const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
      this.metrics.averageTime = totalTime / results.length;
    }
  }

  private getMetricsSummary(): string {
    const successRate = this.metrics.totalItems > 0
      ? Math.round((this.metrics.successful / this.metrics.totalItems) * 100)
      : 0;

    return `${this.metrics.successful}/${this.metrics.totalItems} successful (${successRate}%), ` +
           `${this.metrics.failed} failed, ` +
           `${Math.round(this.metrics.totalTime / 1000)}s total, ` +
           `${Math.round(this.metrics.averageTime)}ms avg`;
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }
}

// Predefined configurations for different use cases
const CONCURRENT_CONFIGS = {
  IO_BOUND: {
    maxConcurrency: 20,
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  CPU_BOUND: {
    maxConcurrency: 4,
    timeout: 30000,
    retryAttempts: 2,
    retryDelay: 500
  },
  NETWORK_BOUND: {
    maxConcurrency: 10,
    timeout: 45000,
    retryAttempts: 5,
    retryDelay: 2000
  },
  CONSERVATIVE: {
    maxConcurrency: 2,
    timeout: 120000,
    retryAttempts: 1,
    retryDelay: 5000
  }
} as const;

// Utility function for simplified concurrent processing
async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: ConcurrentConfig = CONCURRENT_CONFIGS.IO_BOUND,
  progressCallback?: (completed: number, total: number) => void
): Promise<ProcessingResult<T>[]> {
  const processorInstance = new EnhancedConcurrentProcessor(processor, {
    ...config,
    progressCallback
  });

  return processorInstance.process(items);
}

// Example usage with file processing
async function demonstrateConcurrentProcessing(): Promise<void> {
  const automation = new DevHQAutomation();

  // Simulate a large list of files to process
  const files = Array.from({ length: 50 }, (_, i) => `file-${i + 1}.txt`);

  console.log(`📁 Processing ${files.length} files concurrently...`);

  // File processing function with error handling
  async function processFile(filename: string): Promise<{ name: string; size: number; lines: number }> {
    try {
      // Simulate file processing with random delays
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      // Simulate occasional failures (10% failure rate)
      if (Math.random() < 0.1) {
        throw new Error(`Simulated processing error for ${filename}`);
      }

      // Simulate processing results
      return {
        name: filename,
        size: Math.floor(Math.random() * 10000) + 100,
        lines: Math.floor(Math.random() * 1000) + 10
      };
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error);
      throw error;
    }
  }

  // Progress callback
  const progressCallback = (completed: number, total: number) => {
    const percentage = Math.round((completed / total) * 100);
    console.log(`📈 Progress: ${completed}/${total} (${percentage}%)`);
  };

  try {
    const results = await processConcurrently(
      files,
      processFile,
      CONCURRENT_CONFIGS.IO_BOUND,
      progressCallback
    );

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log('\n📊 Processing Results:');
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      const totalSize = successful.reduce((sum, r) => sum + (r.result as any).size, 0);
      const totalLines = successful.reduce((sum, r) => sum + (r.result as any).lines, 0);
      console.log(`📁 Total size processed: ${totalSize} bytes`);
      console.log(`📄 Total lines processed: ${totalLines}`);
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed items:');
      failed.forEach(f => console.log(`  - ${f.item}: ${f.error}`));
    }

  } catch (error) {
    console.error('❌ Concurrent processing failed:', error);
  }
}

// Execute demonstration
demonstrateConcurrentProcessing().catch(console.error);
```

### Error Handling & Retries

```typescript
import { DevHQAutomation } from './automation.js';

// TypeScript interfaces for error handling
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fibonacci';
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
}

interface ErrorContext {
  operation: string;
  attempt: number;
  timestamp: Date;
  error: Error;
  context?: Record<string, any>;
}

// Comprehensive error handling and retry system
class RobustCommandExecutor {
  private errorHistory: ErrorContext[] = [];
  private metrics = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    totalRetries: 0
  };

  constructor(
    private automation: DevHQAutomation,
    private defaultRetryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffStrategy: 'exponential',
      retryCondition: (error) => this.isRetryableError(error)
    }
  ) {}

  // Execute command with comprehensive retry logic
  async executeCommand(
    label: string,
    command: string[],
    options: {
      timeout?: number;
      retryConfig?: Partial<RetryConfig>;
      context?: Record<string, any>;
    } = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const retryConfig = { ...this.defaultRetryConfig, ...options.retryConfig };
    let lastError: Error | null = null;

    console.log(`🚀 Executing command: ${label}`);
    console.log(`📋 Command: ${command.join(' ')}`);
    console.log(`⚙️ Retry config: ${retryConfig.maxAttempts} attempts, ${retryConfig.backoffStrategy} backoff`);

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${retryConfig.maxAttempts}`);

        const result = await this.attemptCommand(label, command, options.timeout);

        // Success!
        const executionTime = Date.now() - startTime;
        console.log(`✅ Command succeeded in ${executionTime}ms (attempt ${attempt})`);

        this.metrics.totalCommands++;
        this.metrics.successfulCommands++;

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const executionTime = Date.now() - startTime;

        // Record error for analysis
        this.recordError(label, attempt, lastError, options.context);

        console.warn(`⚠️ Attempt ${attempt} failed in ${executionTime}ms:`, lastError.message);

        // Check if we should retry
        if (attempt === retryConfig.maxAttempts) {
          console.error(`❌ Max attempts reached for ${label}`);
          break;
        }

        if (!retryConfig.retryCondition || !retryConfig.retryCondition(lastError)) {
          console.error(`❌ Error not retryable for ${label}:`, lastError.message);
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, retryConfig);
        console.log(`⏳ Waiting ${delay}ms before retry...`);

        if (retryConfig.onRetry) {
          retryConfig.onRetry(attempt, lastError);
        }

        await this.sleep(delay);
        this.metrics.totalRetries++;
      }
    }

    // All attempts failed
    this.metrics.totalCommands++;
    this.metrics.failedCommands++;

    throw new Error(`Command failed after ${retryConfig.maxAttempts} attempts: ${lastError?.message}`);
  }

  private async attemptCommand(
    label: string,
    command: string[],
    timeout?: number
  ): Promise<CommandResult> {
    try {
      const result = await this.automation.runCommand(label, command, {
        timeout: timeout || 30000
      });

      if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
      }

      return result;

    } catch (error) {
      // Add context to the error
      if (error instanceof Error) {
        error.message = `${label}: ${error.message}`;
      }
      throw error;
    }
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.baseDelay * attempt;
        break;

      case 'exponential':
        delay = config.baseDelay * Math.pow(2, attempt - 1);
        break;

      case 'fibonacci':
        delay = config.baseDelay * this.fibonacci(attempt);
        break;

      default:
        delay = config.baseDelay;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;

    return Math.min(delay, config.maxDelay);
  }

  private fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  private isRetryableError(error: Error): boolean {
    // Define which errors are worth retrying
    const retryablePatterns = [
      /timeout/i,
      /connection refused/i,
      /network unreachable/i,
      /temporary failure/i,
      /rate limit/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private recordError(
    operation: string,
    attempt: number,
    error: Error,
    context?: Record<string, any>
  ): void {
    const errorContext: ErrorContext = {
      operation,
      attempt,
      timestamp: new Date(),
      error,
      context
    };

    this.errorHistory.push(errorContext);

    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get execution metrics
  getMetrics() {
    const successRate = this.metrics.totalCommands > 0
      ? Math.round((this.metrics.successfulCommands / this.metrics.totalCommands) * 100)
      : 0;

    return {
      ...this.metrics,
      successRate,
      averageRetries: this.metrics.totalCommands > 0
        ? this.metrics.totalRetries / this.metrics.totalCommands
        : 0
    };
  }

  // Get recent errors for debugging
  getRecentErrors(limit = 10): ErrorContext[] {
    return this.errorHistory.slice(-limit);
  }

  // Generate error report
  generateErrorReport(): string {
    const metrics = this.getMetrics();
    const recentErrors = this.getRecentErrors(5);

    const report = [
      '# Command Execution Error Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Metrics',
      `- Total Commands: ${metrics.totalCommands}`,
      `- Successful: ${metrics.successfulCommands} (${metrics.successRate}%)`,
      `- Failed: ${metrics.failedCommands}`,
      `- Total Retries: ${metrics.totalRetries}`,
      `- Average Retries per Command: ${metrics.averageRetries.toFixed(2)}`,
      '',
      '## Recent Errors',
      ...recentErrors.map(err =>
        `- ${err.operation} (attempt ${err.attempt}): ${err.error.message}`
      )
    ];

    return report.join('\n');
  }
}

// Circuit breaker pattern for external services
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log('✅ Circuit breaker reset to CLOSED state');
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log(`⚠️ Circuit breaker opened after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}

// Usage examples
async function demonstrateErrorHandling(): Promise<void> {
  const automation = new DevHQAutomation();
  const executor = new RobustCommandExecutor(automation);
  const circuitBreaker = new CircuitBreaker();

  console.log('🧪 Testing robust command execution...');

  // Example 1: Basic retry with exponential backoff
  try {
    const result = await executor.executeCommand('test-retry', ['echo', 'Hello World'], {
      timeout: 5000,
      retryConfig: {
        maxAttempts: 5,
        baseDelay: 500,
        backoffStrategy: 'exponential',
        onRetry: (attempt, error) => {
          console.log(`🔄 Retry ${attempt} due to: ${error.message}`);
        }
      }
    });

    console.log('✅ Command result:', result.stdout.trim());
  } catch (error) {
    console.error('❌ Command failed:', error);
  }

  // Example 2: Circuit breaker for external service
  try {
    await circuitBreaker.execute(async () => {
      return await executor.executeCommand('external-api', ['curl', '-f', 'https://api.example.com/health'], {
        retryConfig: {
          maxAttempts: 3,
          baseDelay: 1000
        }
      });
    });
  } catch (error) {
    console.error('❌ External service call failed:', error);
  }

  // Example 3: Batch operations with error handling
  const commands = [
    { label: 'cmd1', command: ['echo', 'Command 1'] },
    { label: 'cmd2', command: ['echo', 'Command 2'] },
    { label: 'cmd3', command: ['false'] }, // This will fail
    { label: 'cmd4', command: ['echo', 'Command 4'] }
  ];

  console.log('\n🔄 Executing batch commands...');

  for (const { label, command } of commands) {
    try {
      const result = await executor.executeCommand(label, command);
      console.log(`✅ ${label}: ${result.stdout.trim()}`);
    } catch (error) {
      console.error(`❌ ${label}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Show metrics
  console.log('\n📊 Execution Metrics:');
  console.log(executor.getMetrics());

  // Generate error report
  console.log('\n📄 Error Report:');
  console.log(executor.generateErrorReport());
}

// Execute demonstration
demonstrateErrorHandling().catch(console.error);
```

### Memory Management

```typescript
import { DevHQAutomation } from './automation.js';

// TypeScript interfaces for memory management
interface ResourceCleanup {
  resource: any;
  cleanup: () => void | Promise<void>;
  name: string;
  registeredAt: Date;
  priority: 'low' | 'medium' | 'high';
}

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

interface MemoryThresholds {
  warning: number;  // MB
  critical: number; // MB
  maximum: number;  // MB
}

interface MemoryManagerConfig {
  thresholds: MemoryThresholds;
  monitoringInterval: number; // ms
  enableAutoGC: boolean;
  enableResourceTracking: boolean;
}

// Advanced memory management system
class AdvancedMemoryManager {
  private resources: ResourceCleanup[] = [];
  private monitoringTimer: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private isShuttingDown = false;
  private metrics = {
    gcForced: 0,
    resourcesCleaned: 0,
    memoryWarnings: 0,
    memoryCriticals: 0
  };

  constructor(
    private config: MemoryManagerConfig = {
      thresholds: {
        warning: 500,   // 500MB
        critical: 800,  // 800MB
        maximum: 1200   // 1.2GB
      },
      monitoringInterval: 30000, // 30 seconds
      enableAutoGC: true,
      enableResourceTracking: true
    }
  ) {
    this.setupMonitoring();
    this.setupGracefulShutdown();
  }

  // Register a resource for automatic cleanup
  registerResource(
    resource: any,
    cleanup: () => void | Promise<void>,
    name: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    if (!resource || !cleanup) {
      throw new Error('Resource and cleanup function are required');
    }

    const resourceCleanup: ResourceCleanup = {
      resource,
      cleanup,
      name,
      registeredAt: new Date(),
      priority
    };

    this.resources.push(resourceCleanup);

    console.log(`📝 Registered resource: ${name} (${priority} priority)`);
    console.log(`📊 Total registered resources: ${this.resources.length}`);
  }

  // Unregister a specific resource
  unregisterResource(name: string): boolean {
    const index = this.resources.findIndex(r => r.name === name);
    if (index !== -1) {
      const removed = this.resources.splice(index, 1)[0];
      console.log(`🗑️ Unregistered resource: ${name}`);
      return true;
    }
    return false;
  }

  // Get current memory statistics
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
  }

  // Get memory usage percentage
  getMemoryUsagePercentage(): number {
    const stats = this.getMemoryStats();
    return Math.round((stats.heapUsed / this.config.thresholds.maximum) * 100);
  }

  // Force garbage collection if available
  forceGarbageCollection(): boolean {
    if (global.gc) {
      const beforeGC = this.getMemoryStats();
      global.gc();
      const afterGC = this.getMemoryStats();

      this.metrics.gcForced++;

      const freed = beforeGC.heapUsed - afterGC.heapUsed;
      console.log(`🧹 Forced garbage collection: freed ${freed}MB`);
      console.log(`📊 Memory after GC: ${afterGC.heapUsed}MB`);

      return true;
    } else {
      console.warn('⚠️ Garbage collection not available (run with --expose-gc)');
      return false;
    }
  }

  // Clean up all registered resources
  async cleanupResources(priority?: 'low' | 'medium' | 'high'): Promise<void> {
    let resourcesToClean = this.resources;

    if (priority) {
      resourcesToClean = this.resources.filter(r => r.priority === priority);
    }

    console.log(`🧹 Cleaning up ${resourcesToClean.length} resources${priority ? ` (${priority} priority)` : ''}...`);

    // Sort by priority (high first)
    resourcesToClean.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const resourceCleanup of resourcesToClean) {
      try {
        console.log(`🗑️ Cleaning up: ${resourceCleanup.name}`);
        await Promise.resolve(resourceCleanup.cleanup());
        this.metrics.resourcesCleaned++;
      } catch (error) {
        console.error(`❌ Failed to cleanup ${resourceCleanup.name}:`, error);
      }
    }

    // Remove cleaned resources
    if (priority) {
      this.resources = this.resources.filter(r => r.priority !== priority);
    } else {
      this.resources = [];
    }

    console.log(`✅ Cleanup completed. ${this.resources.length} resources remaining.`);
  }

  // Setup memory monitoring
  private setupMonitoring(): void {
    if (!this.config.enableResourceTracking) {
      return;
    }

    this.monitoringTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);

    console.log(`📊 Memory monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  // Check memory usage and take action if needed
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const usagePercentage = this.getMemoryUsagePercentage();

    // Record memory history
    this.memoryHistory.push({ ...stats });

    // Keep only last 100 entries
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }

    console.log(`📈 Memory usage: ${stats.heapUsed}MB (${usagePercentage}%)`);

    // Check thresholds and take action
    if (stats.heapUsed >= this.config.thresholds.maximum) {
      this.handleCriticalMemory(stats);
    } else if (stats.heapUsed >= this.config.thresholds.critical) {
      this.handleCriticalMemory(stats);
    } else if (stats.heapUsed >= this.config.thresholds.warning) {
      this.handleWarningMemory(stats);
    }
  }

  private handleWarningMemory(stats: MemoryStats): void {
    this.metrics.memoryWarnings++;
    console.warn(`⚠️ High memory usage detected: ${stats.heapUsed}MB`);

    if (this.config.enableAutoGC) {
      this.forceGarbageCollection();
    }
  }

  private handleCriticalMemory(stats: MemoryStats): void {
    this.metrics.memoryCriticals++;
    console.error(`🚨 Critical memory usage: ${stats.heapUsed}MB`);

    // Emergency cleanup
    this.cleanupResources('low').then(() => {
      if (this.config.enableAutoGC) {
        this.forceGarbageCollection();
      }

      const afterCleanup = this.getMemoryStats();
      console.log(`📊 Memory after emergency cleanup: ${afterCleanup.heapUsed}MB`);
    });
  }

  // Setup graceful shutdown handlers
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        console.log('🛑 Shutdown already in progress...');
        return;
      }

      this.isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      try {
        // Stop monitoring
        if (this.monitoringTimer) {
          clearInterval(this.monitoringTimer);
        }

        // Cleanup all resources
        await this.cleanupResources();

        // Final GC
        if (this.config.enableAutoGC) {
          this.forceGarbageCollection();
        }

        console.log('✅ Graceful shutdown completed');

        // Print final metrics
        this.printMetrics();

      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      } finally {
        process.exit(0);
      }
    };

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  // Print performance metrics
  printMetrics(): void {
    console.log('\n📊 Memory Manager Metrics:');
    console.log(`- GC forced: ${this.metrics.gcForced} times`);
    console.log(`- Resources cleaned: ${this.metrics.resourcesCleaned}`);
    console.log(`- Memory warnings: ${this.metrics.memoryWarnings}`);
    console.log(`- Memory criticals: ${this.metrics.memoryCriticals}`);
    console.log(`- Active resources: ${this.resources.length}`);

    if (this.memoryHistory.length > 0) {
      const latest = this.memoryHistory[this.memoryHistory.length - 1];
      const oldest = this.memoryHistory[0];
      const avgMemory = this.memoryHistory.reduce((sum, s) => sum + s.heapUsed, 0) / this.memoryHistory.length;

      console.log('\n📈 Memory Statistics:');
      console.log(`- Current: ${latest.heapUsed}MB`);
      console.log(`- Average: ${Math.round(avgMemory)}MB`);
      console.log(`- Peak: ${Math.max(...this.memoryHistory.map(s => s.heapUsed))}MB`);
      console.log(`- Minimum: ${Math.min(...this.memoryHistory.map(s => s.heapUsed))}MB`);
    }
  }

  // Get detailed memory report
  getMemoryReport(): string {
    const stats = this.getMemoryStats();
    const usagePercentage = this.getMemoryUsagePercentage();

    const report = [
      '# Memory Management Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Current Memory Usage',
      `- Heap Used: ${stats.heapUsed}MB (${usagePercentage}%)`,
      `- Heap Total: ${stats.heapTotal}MB`,
      `- External: ${stats.external}MB`,
      `- RSS: ${stats.rss}MB`,
      `- Array Buffers: ${stats.arrayBuffers}MB`,
      '',
      '## Configuration',
      `- Warning Threshold: ${this.config.thresholds.warning}MB`,
      `- Critical Threshold: ${this.config.thresholds.critical}MB`,
      `- Maximum Threshold: ${this.config.thresholds.maximum}MB`,
      `- Monitoring Interval: ${this.config.monitoringInterval}ms`,
      `- Auto GC: ${this.config.enableAutoGC ? 'Enabled' : 'Disabled'}`,
      '',
      '## Registered Resources',
      ...this.resources.map(r =>
        `- ${r.name} (${r.priority} priority, registered ${r.registeredAt.toISOString()})`
      ),
      '',
      '## Metrics',
      ...Object.entries(this.metrics).map(([key, value]) =>
        `- ${key}: ${value}`
      )
    ];

    return report.join('\n');
  }

  // Shutdown the memory manager
  shutdown(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    console.log('🛑 Memory manager shutdown');
  }
}

// Memory leak detection utility
class MemoryLeakDetector {
  private snapshots: MemoryStats[] = [];
  private检测间隔 = 60000; // 1 minute

  constructor(private threshold = 50) {} // 50MB growth threshold

  startDetection(): void {
    setInterval(() => {
      this.takeSnapshot();
    }, this.检测间隔);

    console.log('🔍 Memory leak detection started');
  }

  private takeSnapshot(): void {
    const stats = this.getCurrentStats();
    this.snapshots.push(stats);

    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }

    // Check for potential leaks
    if (this.snapshots.length >= 2) {
      const growth = this.calculateGrowth();
      if (growth > this.threshold) {
        console.warn(`🚨 Potential memory leak detected: ${growth}MB growth`);
        console.log('📊 Recent memory usage:', this.snapshots.map(s => s.heapUsed + 'MB'));
      }
    }
  }

  private getCurrentStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
  }

  private calculateGrowth(): number {
    if (this.snapshots.length < 2) return 0;

    const oldest = this.snapshots[0];
    const newest = this.snapshots[this.snapshots.length - 1];

    return newest.heapUsed - oldest.heapUsed;
  }
}

// Usage examples
async function demonstrateMemoryManagement(): Promise<void> {
  console.log('🧠 Demonstrating advanced memory management...');

  // Initialize memory manager
  const memoryManager = new AdvancedMemoryManager({
    thresholds: {
      warning: 300,
      critical: 500,
      maximum: 800
    },
    monitoringInterval: 10000, // 10 seconds for demo
    enableAutoGC: true,
    enableResourceTracking: true
  });

  // Initialize leak detector
  const leakDetector = new MemoryLeakDetector(30); // 30MB threshold
  leakDetector.startDetection();

  // Register various resources
  console.log('\n📝 Registering resources...');

  // Database connection simulation
  const dbConnection = {
    host: 'localhost',
    port: 5432,
    connected: true
  };

  memoryManager.registerResource(
    dbConnection,
    () => {
      dbConnection.connected = false;
      console.log('🔌 Database connection closed');
    },
    'database-connection',
    'high'
  );

  // File handle simulation
  const fileHandle = {
    path: '/tmp/test-file.txt',
    open: true
  };

  memoryManager.registerResource(
    fileHandle,
    () => {
      fileHandle.open = false;
      console.log('📁 File handle closed');
    },
    'file-handle',
    'medium'
  );

  // Cache simulation
  const cache = new Map<string, any>();
  for (let i = 0; i < 1000; i++) {
    cache.set(`key-${i}`, { data: `value-${i}`.repeat(100) });
  }

  memoryManager.registerResource(
    cache,
    () => {
      cache.clear();
      console.log('🧹 Cache cleared');
    },
    'memory-cache',
    'low'
  );

  // Simulate memory usage
  console.log('\n📈 Simulating memory usage...');
  const largeArrays: any[] = [];

  for (let i = 0; i < 5; i++) {
    console.log(`� Creating large array ${i + 1}/5...`);

    // Create memory pressure
    const largeArray = new Array(100000).fill(0).map((_, index) => ({
      id: index,
      data: Math.random().toString(36).repeat(10),
      timestamp: Date.now()
    }));

    largeArrays.push(largeArray);

    // Show current memory stats
    const stats = memoryManager.getMemoryStats();
    console.log(`💾 Memory usage: ${stats.heapUsed}MB (${memoryManager.getMemoryUsagePercentage()}%)`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test manual cleanup
  console.log('\n🧹 Testing manual cleanup...');
  await memoryManager.cleanupResources('low');

  // Force GC
  console.log('\n🗑️ Forcing garbage collection...');
  memoryManager.forceGarbageCollection();

  // Show final stats
  console.log('\n📊 Final memory statistics:');
  console.log(memoryManager.getMemoryStats());

  // Generate report
  console.log('\n📄 Memory management report:');
  console.log(memoryManager.getMemoryReport());

  // Print metrics
  memoryManager.printMetrics();

  // Cleanup demo
  console.log('\n🧹 Cleaning up demo resources...');
  await memoryManager.cleanupResources();

  console.log('✅ Memory management demonstration completed');
}

// Execute demonstration
demonstrateMemoryManagement().catch(console.error);
```

## 🌐 Real-World Use Cases

### 1. CI/CD Pipeline Automation

```typescript
class CIPipeline {
  constructor(automation) {
    this.automation = automation;
  }

  async runPipeline() {
    try {
      await this.setupEnvironment();
      await this.runTests();
      await this.buildArtifact();
      await this.deployToStaging();
      await this.runIntegrationTests();
      await this.deployToProduction();

      console.log('✅ Pipeline completed successfully');
    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);
      await this.notifyFailure(error);
      throw error;
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up environment...');
    await this.automation.runCommand('env-setup', ['npm', 'ci']);
    await this.automation.runCommand('env-config', ['cp', '.env.example', '.env']);
  }

  async runTests() {
    console.log('🧪 Running tests...');
    const result = await this.automation.runCommand('tests', ['npm', 'test', '--', '--coverage']);

    if (result.exitCode !== 0) {
      throw new Error('Tests failed');
    }
  }

  async buildArtifact() {
    console.log('📦 Building artifact...');
    const result = await this.automation.runCommand('build', ['npm', 'run', 'build']);

    if (result.exitCode !== 0) {
      throw new Error('Build failed');
    }
  }

  async deployToStaging() {
    console.log('🚀 Deploying to staging...');
    await this.automation.runCommand('deploy-staging', [
      'rsync', '-avz', 'dist/', 'user@staging-server:/app/'
    ]);
  }

  async runIntegrationTests() {
    console.log('🔍 Running integration tests...');
    const result = await this.automation.runCommand('integration-tests', [
      'curl', '-f', 'https://staging.example.com/health'
    ]);

    if (result.exitCode !== 0) {
      throw new Error('Integration tests failed');
    }
  }

  async deployToProduction() {
    console.log('🎉 Deploying to production...');
    await this.automation.runCommand('deploy-prod', [
      'rsync', '-avz', 'dist/', 'user@prod-server:/app/'
    ]);
  }

  async notifyFailure(error) {
    await this.automation.runCommand('notify', [
      'curl', '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({
        text: `❌ CI Pipeline Failed: ${error.message}`,
        channel: '#alerts'
      }),
      'https://hooks.slack.com/your-webhook-url'
    ]);
  }
}

// Usage:
const pipeline = new CIPipeline(automation);
await pipeline.runPipeline();
```

### 2. Development Environment Manager

```typescript
class DevEnvironment {
  constructor(automation) {
    this.automation = automation;
  }

  async startDevelopment() {
    console.log('🚀 Starting development environment...');

    // Start all services
    await this.startDatabase();
    await this.startRedis();
    await this.startBackend();
    await this.startFrontend();

    console.log('✅ Development environment ready');
    console.log('📊 Services:');
    console.log('  - Database: http://localhost:5432');
    console.log('  - Redis: http://localhost:6379');
    console.log('  - Backend: http://localhost:3000');
    console.log('  - Frontend: http://localhost:5173');
  }

  async startDatabase() {
    await this.automation.runCommand('database', ['docker', 'run', '-d',
      '--name', 'dev-db',
      '-e', 'POSTGRES_PASSWORD=dev',
      '-p', '5432:5432',
      'postgres:15'
    ], { stream: true });

    // Wait for database to be ready
    await this.waitForService('localhost:5432');
  }

  async startRedis() {
    await this.automation.runCommand('redis', ['docker', 'run', '-d',
      '--name', 'dev-redis',
      '-p', '6379:6379',
      'redis:7'
    ]);
  }

  async startBackend() {
    await this.automation.runCommand('backend', ['npm', 'run', 'dev'], {
      stream: true,
      cwd: './backend'
    });
  }

  async startFrontend() {
    await this.automation.runCommand('frontend', ['npm', 'run', 'dev'], {
      stream: true,
      cwd: './frontend'
    });
  }

  async waitForService(hostAndPort, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.automation.runCommand('check-service', [
          'nc', '-z', ...hostAndPort.split(':')
        ]);
        console.log(`✅ ${hostAndPort} is ready`);
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Service ${hostAndPort} failed to start`);
  }

  async stopDevelopment() {
    console.log('🛑 Stopping development environment...');

    await this.automation.runCommand('stop-db', ['docker', 'stop', 'dev-db']);
    await this.automation.runCommand('stop-redis', ['docker', 'stop', 'dev-redis']);
    await this.automation.runCommand('cleanup', ['docker', 'rm', 'dev-db', 'dev-redis']);

    console.log('✅ Development environment stopped');
  }
}

// Usage:
const devEnv = new DevEnvironment(automation);
await devEnv.startDevelopment();

// Stop when done
process.on('SIGINT', async () => {
  await devEnv.stopDevelopment();
  process.exit(0);
});
```

### 3. Log Analysis & Monitoring

```typescript
class LogAnalyzer {
  constructor(automation) {
    this.automation = automation;
  }

  async analyzeLogs(logFile, pattern) {
    console.log(`📊 Analyzing ${logFile} for pattern: ${pattern}`);

    // Extract matching lines
    const grep = await this.automation.runCommand('grep', [
      'grep', '-n', pattern, logFile
    ]);

    if (grep.exitCode !== 0) {
      console.log('No matches found');
      return [];
    }

    const lines = grep.stdout.split('\n').filter(line => line.trim());

    // Analyze patterns
    const analysis = {
      totalMatches: lines.length,
      timeDistribution: this.analyzeTimeDistribution(lines),
      topErrors: this.extractTopErrors(lines),
      severityBreakdown: this.categorizeBySeverity(lines)
    };

    console.log('📈 Analysis Results:');
    console.log(`  Total matches: ${analysis.totalMatches}`);
    console.log(`  Error breakdown:`, analysis.severityBreakdown);
    console.log(`  Top errors:`, analysis.topErrors.slice(0, 5));

    return analysis;
  }

  analyzeTimeDistribution(lines) {
    const hours = {};

    lines.forEach(line => {
      const timeMatch = line.match(/\d{2}:\d{2}:\d{2}/);
      if (timeMatch) {
        const hour = timeMatch[0].split(':')[0];
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });

    return hours;
  }

  extractTopErrors(lines) {
    const errorCounts = {};

    lines.forEach(line => {
      const errorMatch = line.match(/ERROR:\s*(.+)/);
      if (errorMatch) {
        const error = errorMatch[1].trim();
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      }
    });

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([error, count]) => ({ error, count }));
  }

  categorizeBySeverity(lines) {
    const categories = {
      ERROR: 0,
      WARN: 0,
      INFO: 0,
      DEBUG: 0
    };

    lines.forEach(line => {
      if (line.includes('ERROR')) categories.ERROR++;
      else if (line.includes('WARN')) categories.WARN++;
      else if (line.includes('INFO')) categories.INFO++;
      else if (line.includes('DEBUG')) categories.DEBUG++;
    });

    return categories;
  }

  async generateReport(analysis, outputFile) {
    const report = `
# Log Analysis Report

## Summary
- Total matches: ${analysis.totalMatches}
- Generated: ${new Date().toISOString()}

## Severity Breakdown
- ERROR: ${analysis.severityBreakdown.ERROR}
- WARN: ${analysis.severityBreakdown.WARN}
- INFO: ${analysis.severityBreakdown.INFO}
- DEBUG: ${analysis.severityBreakdown.DEBUG}

## Top Errors
${analysis.topErrors.map(({error, count}) => `- ${error} (${count} times)`).join('\n')}

## Time Distribution
${Object.entries(analysis.timeDistribution)
  .map(([hour, count]) => `- ${hour}:00 - ${count} occurrences`)
  .join('\n')}
`;

    await this.automation.runCommand('write-report', [
      'tee', outputFile
    ], { input: report });

    console.log(`📄 Report saved to ${outputFile}`);
  }
}

// Usage:
const analyzer = new LogAnalyzer(automation);
const analysis = await analyzer.analyzeLogs('/var/log/app.log', 'ERROR');
await analyzer.generateReport(analysis, 'log-analysis-report.md');
```

## 🔧 Integration Examples

### Docker Integration

```bash
# Dockerfile for Dev HQ
FROM oven/bun:1.3

WORKDIR /app
COPY package*.json ./
RUN bun install

COPY . .
RUN bun build ./dev-hq/api-server.ts --outdir=./dist

EXPOSE 3000 3001

CMD ["bun", "run", "./dev-hq/spawn-server.ts"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  dev-hq-api:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DEV_HQ_ENABLE_AUTH=true
      - DEV_HQ_SECRET_KEY=${DEV_HQ_SECRET_KEY}
    volumes:
      - ./logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
```

### Kubernetes Integration

```yaml
# dev-hq-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-hq
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dev-hq
  template:
    metadata:
      labels:
        app: dev-hq
    spec:
      containers:
      - name: dev-hq
        image: your-registry/dev-hq:latest
        ports:
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DEV_HQ_ENABLE_AUTH
          value: "true"
        - name: DEV_HQ_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: dev-hq-secrets
              key: secret-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: dev-hq-service
spec:
  selector:
    app: dev-hq
  ports:
  - name: api
    port: 3000
    targetPort: 3000
  - name: automation
    port: 3001
    targetPort: 3001
  type: LoadBalancer
```

These examples demonstrate the versatility and power of the Dev HQ automation suite across various development and deployment scenarios.

## 🛡️ Security Best Practices

### Authentication & Authorization

```typescript
import { createHash, randomBytes } from 'crypto';

// Secure token generation
interface SecurityConfig {
  tokenExpiry: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  allowedIPs: string[];
}

class DevHQSecurityManager {
  private failedAttempts: Map<string, number> = new Map();
  private lockoutUntil: Map<string, number> = new Map();

  constructor(private config: SecurityConfig) {}

  // Generate secure API tokens
  generateSecureToken(): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(32).toString('hex');
    const hash = createHash('sha256')
      .update(timestamp + random)
      .digest('hex');

    return `${timestamp}.${hash}`;
  }

  // Validate and sanitize inputs
  sanitizeCommand(command: string[]): string[] {
    return command
      .map(arg => arg.trim())
      .filter(arg => {
        // Remove dangerous characters
        const dangerous = /[;&|`$(){}[\]]/;
        return !dangerous.test(arg) && arg.length > 0;
      });
  }

  // Rate limiting and brute force protection
  canAttemptLogin(clientId: string): boolean {
    const now = Date.now();
    const lockout = this.lockoutUntil.get(clientId);

    if (lockout && now < lockout) {
      const remaining = Math.ceil((lockout - now) / 1000);
      console.warn(`🔒 Client ${clientId} locked out for ${remaining}s`);
      return false;
    }

    const attempts = this.failedAttempts.get(clientId) || 0;
    return attempts < this.config.maxLoginAttempts;
  }

  recordFailedAttempt(clientId: string): void {
    const attempts = (this.failedAttempts.get(clientId) || 0) + 1;
    this.failedAttempts.set(clientId, attempts);

    if (attempts >= this.config.maxLoginAttempts) {
      const lockoutUntil = Date.now() + this.config.lockoutDuration;
      this.lockoutUntil.set(clientId, lockoutUntil);
      console.warn(`🔒 Client ${clientId} locked out due to too many failed attempts`);
    }
  }

  clearFailedAttempts(clientId: string): void {
    this.failedAttempts.delete(clientId);
    this.lockoutUntil.delete(clientId);
  }

  // IP whitelist validation
  isIPAllowed(clientIP: string): boolean {
    if (this.config.allowedIPs.length === 0) {
      return true; // No IP restriction
    }

    return this.config.allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation support
        return this.isIPInCIDR(clientIP, allowedIP);
      }
      return clientIP === allowedIP;
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simplified CIDR check - in production, use a proper library
    const [network, prefix] = cidr.split('/');
    const prefixLength = parseInt(prefix, 10);

    // This is a simplified implementation
    // Use 'ip-cidr' or similar library for production
    return ip.startsWith(network.slice(0, -1));
  }
}

// Secure command execution with validation
async function executeSecureCommand(
  automation: DevHQAutomation,
  command: string[],
  security: DevHQSecurityManager,
  clientId: string
): Promise<CommandResult> {
  // Validate client can attempt execution
  if (!security.canAttemptLogin(clientId)) {
    throw new Error('Client temporarily blocked due to failed attempts');
  }

  try {
    // Sanitize command
    const sanitizedCommand = security.sanitizeCommand(command);

    if (sanitizedCommand.length === 0) {
      throw new Error('Command contains invalid characters');
    }

    // Log security event
    console.log(`🔐 Executing sanitized command: ${sanitizedCommand.join(' ')}`);

    // Execute with timeout and resource limits
    const result = await automation.runCommand('secure-exec', sanitizedCommand, {
      timeout: 30000,
      maxMemory: '512M',
      maxCpu: '50%'
    });

    // Clear failed attempts on success
    security.clearFailedAttempts(clientId);

    return result;
  } catch (error) {
    security.recordFailedAttempt(clientId);
    throw error;
  }
}
```

### Environment & Secrets Management

```typescript
// Secure environment configuration
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  DEV_HQ_SECRET_KEY: string;
  DEV_HQ_DATABASE_URL: string;
  DEV_HQ_REDIS_URL: string;
  API_RATE_LIMIT: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

class SecureEnvironmentManager {
  private config: EnvironmentConfig;
  private secrets: Map<string, string> = new Map();

  constructor() {
    this.validateEnvironment();
    this.config = this.loadConfiguration();
  }

  private validateEnvironment(): void {
    const required = [
      'DEV_HQ_SECRET_KEY',
      'NODE_ENV'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate secret key strength
    const secretKey = process.env.DEV_HQ_SECRET_KEY!;
    if (secretKey.length < 32) {
      throw new Error('DEV_HQ_SECRET_KEY must be at least 32 characters long');
    }
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      DEV_HQ_SECRET_KEY: process.env.DEV_HQ_SECRET_KEY!,
      DEV_HQ_DATABASE_URL: process.env.DEV_HQ_DATABASE_URL || '',
      DEV_HQ_REDIS_URL: process.env.DEV_HQ_REDIS_URL || '',
      API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100', 10),
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info'
    };
  }

  // Secure secret retrieval
  getSecret(key: string): string {
    const secret = this.secrets.get(key) || process.env[key];

    if (!secret) {
      throw new Error(`Secret not found: ${key}`);
    }

    // Log access for audit
    console.log(`🔑 Secret accessed: ${key} at ${new Date().toISOString()}`);

    return secret;
  }

  // Rotate secrets
  rotateSecret(key: string): string {
    const newSecret = randomBytes(64).toString('hex');
    this.secrets.set(key, newSecret);

    console.log(`🔄 Secret rotated: ${key} at ${new Date().toISOString()}`);

    return newSecret;
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }
}
```

## ⚡ Performance Optimization

### Memory Management & Resource Optimization

```typescript
// Advanced memory management
class PerformanceOptimizer {
  private memoryThreshold = 500 * 1024 * 1024; // 500MB
  private gcInterval = 30000; // 30 seconds
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();

      // Check memory usage
      if (memUsage.heapUsed > this.memoryThreshold) {
        console.warn('⚠️ High memory usage detected:', {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        });

        this.performOptimization();
      }

      // Record metrics
      this.recordMetric('memory.heapUsed', memUsage.heapUsed);
      this.recordMetric('memory.heapTotal', memUsage.heapTotal);
    }, this.gcInterval);
  }

  private performOptimization(): void {
    console.log('🧹 Performing memory optimization...');

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('✅ Garbage collection forced');
    }

    // Clear caches
    this.clearCaches();

    // Log optimization results
    const afterGC = process.memoryUsage();
    console.log('📊 Memory after optimization:', {
      heapUsed: Math.round(afterGC.heapUsed / 1024 / 1024) + 'MB',
      reduction: Math.round((process.memoryUsage().heapUsed - afterGC.heapUsed) / 1024 / 1024) + 'MB'
    });
  }

  private clearCaches(): void {
    // Clear LRU caches, temp data, etc.
    if (typeof global.clearCache === 'function') {
      global.clearCache();
    }
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  // Performance metrics
  getMetrics(): Record<string, { avg: number; min: number; max: number }> {
    const result: Record<string, { avg: number; min: number; max: number }> = {};

    for (const [name, values] of this.metrics) {
      if (values.length > 0) {
        result[name] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }

    return result;
  }
}

// Optimized concurrent processing
class OptimizedConcurrentProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  private running = 0;
  private metrics = { processed: 0; errors: 0; totalTime: 0 };

  constructor(
    private processor: (item: T) => Promise<R>,
    private concurrency: number = 5
  ) {}

  async process(items: T[]): Promise<R[]> {
    const startTime = Date.now();
    const results: R[] = [];
    const promises: Promise<R>[] = [];

    for (const item of items) {
      const promise = new Promise<R>((resolve, reject) => {
        this.queue.push({ item, resolve, reject });
        this.processQueue();
      });

      promises.push(promise);
    }

    try {
      const resolvedResults = await Promise.all(promises);
      results.push(...resolvedResults);
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }

    this.metrics.processed = items.length;
    this.metrics.totalTime = Date.now() - startTime;

    console.log(`📊 Processing completed:`, {
      items: items.length,
      time: `${this.metrics.totalTime}ms`,
      avgTime: `${Math.round(this.metrics.totalTime / items.length)}ms/item`,
      errors: this.metrics.errors
    });

    return results;
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { item, resolve, reject } = this.queue.shift()!;

    try {
      const result = await this.processor(item);
      resolve(result);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      this.processQueue(); // Process next item
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Usage example
const optimizer = new PerformanceOptimizer();
const processor = new OptimizedConcurrentProcessor(
  async (file: string) => {
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    return `processed-${file}`;
  },
  10 // Process 10 files concurrently
);

const files = ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', 'file5.txt'];
processor.process(files).then(results => {
  console.log('✅ Files processed:', results);
});
```

## 🔍 Troubleshooting

### Common Issues & Solutions

```typescript
// Comprehensive error handling and diagnostics
class DevHQDiagnostics {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();

  constructor() {
    this.registerHealthChecks();
  }

  private registerHealthChecks(): void {
    // File system health
    this.healthChecks.set('filesystem', async () => {
      try {
        await fs.access('/tmp', fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    });

    // Network connectivity
    this.healthChecks.set('network', async () => {
      try {
        const response = await fetch('http://localhost:3000/health', {
          signal: AbortSignal.timeout(5000)
        });
        return response.ok;
      } catch {
        return false;
      }
    });

    // Memory availability
    this.healthChecks.set('memory', async () => {
      const usage = process.memoryUsage();
      const available = require('os').freemem();
      return usage.heapUsed < available * 0.8; // Use less than 80% of available memory
    });
  }

  // Run comprehensive diagnostics
  async runDiagnostics(): Promise<void> {
    console.log('🔍 Running Dev HQ diagnostics...\n');

    const results: Record<string, boolean> = {};

    for (const [name, check] of this.healthChecks) {
      try {
        console.log(`🔎 Checking ${name}...`);
        results[name] = await check();
        console.log(`${results[name] ? '✅' : '❌'} ${name}: ${results[name] ? 'OK' : 'FAILED'}`);
      } catch (error) {
        results[name] = false;
        console.log(`❌ ${name}: ERROR - ${error instanceof Error ? error.message : error}`);
      }
    }

    // Summary
    const failed = Object.entries(results).filter(([, passed]) => !passed);
    if (failed.length === 0) {
      console.log('\n🎉 All systems operational!');
    } else {
      console.log(`\n⚠️ ${failed.length} system(s) need attention:`);
      failed.forEach(([name]) => console.log(`  - ${name}`));
    }
  }

  // Troubleshoot specific issues
  async troubleshoot(issue: string): Promise<string[]> {
    const solutions: string[] = [];

    switch (issue.toLowerCase()) {
      case 'connection refused':
        solutions.push(
          'Check if the Dev HQ server is running',
          'Verify the port configuration (default: 3000)',
          'Check firewall settings',
          'Ensure the server process has proper permissions'
        );
        break;

      case 'timeout':
        solutions.push(
          'Increase timeout values in configuration',
          'Check system resources (CPU, memory)',
          'Verify network connectivity',
          'Consider reducing concurrent operations'
        );
        break;

      case 'permission denied':
        solutions.push(
          'Check file/directory permissions',
          'Run with appropriate user privileges',
          'Verify SELinux/AppArmor settings',
          'Check file system mount options'
        );
        break;

      case 'out of memory':
        solutions.push(
          'Increase available memory',
          'Enable memory optimization features',
          'Reduce concurrent processing limits',
          'Check for memory leaks in custom code'
        );
        break;

      default:
        solutions.push(
          'Check system logs for detailed error information',
          'Verify configuration files are correct',
          'Ensure all dependencies are installed',
          'Try restarting the Dev HQ services'
        );
    }

    return solutions;
  }

  // Generate system report
  async generateReport(): Promise<string> {
    const os = require('os');
    const fs = require('fs').promises;

    const report = [
      '# Dev HQ System Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## System Information',
      `- Platform: ${os.platform()}`,
      `- Architecture: ${os.arch()}`,
      `- Node.js: ${process.version}`,
      `- Memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB total, ${Math.round(os.freemem() / 1024 / 1024)}MB free`,
      `- CPUs: ${os.cpus().length} cores`,
      '',
      '## Process Information',
      `- PID: ${process.pid}`,
      `- Uptime: ${Math.round(process.uptime())}s`,
      `- Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      ''
    ];

    // Add health check results
    report.push('## Health Check Results');
    for (const [name, check] of this.healthChecks) {
      try {
        const status = await check();
        report.push(`- ${name}: ${status ? '✅ PASS' : '❌ FAIL'}`);
      } catch (error) {
        report.push(`- ${name}: ❌ ERROR - ${error instanceof Error ? error.message : error}`);
      }
    }

    return report.join('\n');
  }
}

// Usage example
const diagnostics = new DevHQDiagnostics();

// Run full diagnostics
diagnostics.runDiagnostics();

// Troubleshoot specific issue
const solutions = await diagnostics.troubleshoot('connection refused');
console.log('💡 Suggested solutions:');
solutions.forEach(solution => console.log(`  • ${solution}`));

// Generate detailed report
const report = await diagnostics.generateReport();
console.log('\n📄 System Report:');
console.log(report);
```

### Debug Mode & Logging

```typescript
// Enhanced logging and debugging
class DevHQLogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private logFile: string;

  constructor(logLevel?: string, logFile?: string) {
    this.logLevel = (logLevel as any) || process.env.LOG_LEVEL || 'info';
    this.logFile = logFile || './logs/dev-hq.log';
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${pid}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  async writeLog(level: string, message: string, meta?: any): Promise<void> {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output
    console.log(formattedMessage);

    // File output
    try {
      await fs.appendFile(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  debug(message: string, meta?: any): void {
    this.writeLog('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.writeLog('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.writeLog('warn', message, meta);
  }

  error(message: string, meta?: any): void {
    this.writeLog('error', message, meta);
  }
}

// Debug mode wrapper
class DebugModeDevHQ {
  private logger: DevHQLogger;
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode || process.env.DEBUG === 'true';
    this.logger = new DevHQLogger(
      this.debugMode ? 'debug' : 'info',
      './logs/dev-hq-debug.log'
    );
  }

  async executeWithDebug<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    this.logger.debug(`Starting operation: ${operation}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.logger.info(`Operation completed: ${operation}`, {
        duration: `${duration}ms`,
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`Operation failed: ${operation}`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
        stack: this.debugMode && error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
}

// Example 9: maxBuffer demonstration with output limiting
async function demonstrateMaxBuffer(): Promise<void> {
  try {
    console.log('🔄 Demonstrating maxBuffer with output limiting...');

    // Execute a command that generates lots of output
    const result = automationService.executeCommandSync(
      'buffer-test',
      ['yes'], // This command outputs 'y' infinitely
      100 // Kill after 100 bytes of output
    );

    console.log('✅ maxBuffer test result:');
    console.log(`Exit code: ${result.exitCode}`);
    console.log(`Success: ${result.success}`);
    console.log(`Stdout length: ${result.stdout.length} bytes`);
    console.log(`Stderr: ${result.stderr}`);

    // Show truncated output
    if (result.stdout) {
      console.log(`Output (first 50 chars): ${result.stdout.substring(0, 50)}...`);
    }

  } catch (error) {
    console.error('❌ maxBuffer demonstration failed:', error);
  }
}

// Example 10: Real-time resource monitoring with thresholds
async function demonstrateRealTimeMonitoring(): Promise<void> {
  try {
    console.log('📊 Demonstrating real-time resource monitoring...');

    // Start several resource-intensive processes
    const processes = [];

    // CPU-intensive process
    processes.push(
      automationService.executeCommand('cpu-intensive', [
        'bash', '-c', 'for i in {1..100}; do echo $i; sleep 0.1; done'
      ], { timeout: 15000 })
    );

    // Memory-intensive process (simulated)
    processes.push(
      automationService.executeCommand('memory-intensive', [
        'bash', '-c', 'dd if=/dev/zero of=/tmp/testfile bs=1M count=50; rm /tmp/testfile'
      ], { timeout: 10000 })
    );

    // I/O-intensive process
    processes.push(
      automationService.executeCommand('io-intensive', [
        'bash', '-c', 'find / -name "*.log" 2>/dev/null | head -20'
      ], { timeout: 12000 })
    );

    // Start real-time monitoring with custom thresholds
    automationService.monitorResourcesWithThresholds(
      2000, // Check every 2 seconds
      10 * 1024 * 1024, // 10MB memory threshold
      500000 // 0.5 second CPU threshold
    );

    // Wait for all processes to complete
    const results = await Promise.all(processes);

    console.log('✅ Real-time monitoring demonstration completed');
    console.log(`📊 Monitored ${results.length} processes with resource thresholds`);

  } catch (error) {
    console.error('❌ Real-time monitoring demonstration failed:', error);
  }
}

// Example 11: Post-execution performance analysis
async function demonstratePerformanceAnalysis(): Promise<void> {
  try {
    console.log('📈 Demonstrating post-execution performance analysis...');

    // Execute a variety of commands for analysis
    const commands = [
      { name: 'quick-cmd', cmd: ['echo', 'Hello World'] },
      { name: 'cpu-cmd', cmd: ['bash', '-c', 'for i in {1..1000}; do echo $i; done'] },
      { name: 'io-cmd', cmd: ['bash', '-c', 'ls -la /usr/bin | head -100'] },
      { name: 'memory-cmd', cmd: ['bash', '-c', 'cat /dev/urandom | head -c 1000'] },
      { name: 'network-cmd', cmd: ['bash', '-c', 'curl -s https://httpbin.org/json > /dev/null'] },
    ];

    const results: EnhancedExecutionResult[] = [];

    for (const { name, cmd } of commands) {
      console.log(`🏃 Executing ${name}...`);
      const result = await automationService.executeCommand(name, cmd, {
        timeout: 10000,
      }) as EnhancedExecutionResult;

      results.push(result);
    }

    // Analyze performance results
    const analysis = automationService.analyzePerformanceResults(results);

    console.log('📊 Performance Analysis Results:');
    console.log(`⏱️ Total execution time: ${analysis.totalExecutionTime}ms`);
    console.log(`⏱️ Average execution time: ${analysis.averageExecutionTime.toFixed(2)}ms`);
    console.log(`🧠 Total memory used: ${(analysis.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🧠 Average memory used: ${(analysis.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`⚡ Total CPU time: ${analysis.totalCpuTime}µs`);
    console.log(`⚡ Average CPU time: ${analysis.averageCpuTime.toFixed(2)}µs`);
    console.log(`📈 Efficiency: ${analysis.efficiency.toFixed(2)}%`);

    console.log('\n💡 Performance Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  ${rec}`));

    // Detailed breakdown by command
    console.log('\n📋 Detailed Command Breakdown:');
    results.forEach((result, index) => {
      const cmd = commands[index];
      console.log(`\n🔧 ${cmd.name}:`);
      console.log(`  Execution time: ${result.executionTime}ms`);
      console.log(`  Memory: ${result.resourceUsage ? `${(result.resourceUsage.maxRSS / 1024).toFixed(2)}KB` : 'N/A'}`);
      console.log(`  CPU: ${result.resourceUsage ? `${result.resourceUsage.cpuTime.total}µs` : 'N/A'}`);
      console.log(`  Context switches: ${result.resourceUsage ?
        result.resourceUsage.contextSwitches.voluntary + result.resourceUsage.contextSwitches.involuntary : 'N/A'}`);
      console.log(`  Exit code: ${result.exitCode}`);
    });

    console.log('✅ Performance analysis demonstration completed');

  } catch (error) {
    console.error('❌ Performance analysis demonstration failed:', error);
  }
}

// Example 13: Advanced timeout and signal handling scenarios
async function demonstrateTimeoutAndSignals(): Promise<void> {
  try {
    console.log('🧪 Demonstrating advanced timeout and signal handling...');

    // Scenario 1: Default SIGTERM timeout
    console.log('\n⏰ Scenario 1: Default SIGTERM timeout (3 seconds)');
    const result1 = await automationService.executeCommandWithTimeout(
      'sigterm-timeout',
      ['sleep', '10'], // Runs for 10 seconds, but timeout is 3
      3000, // 3 second timeout
      'SIGTERM' // Default graceful termination
    );

    console.log('SIGTERM timeout result:');
    console.log(`  Exit code: ${result1.exitCode}`);
    console.log(`  Signal: ${result1.signalCode}`);
    console.log(`  Error: ${result1.error}`);
    console.log(`  Stderr: ${result1.stderr}`);

    // Scenario 2: Forceful SIGKILL timeout
    console.log('\n⚡ Scenario 2: Forceful SIGKILL timeout (2 seconds)');
    const result2 = await automationService.executeCommandWithTimeout(
      'sigkill-timeout',
      ['sleep', '10'], // Runs for 10 seconds, but timeout is 2
      2000, // 2 second timeout
      'SIGKILL' // Forceful termination
    );

    console.log('SIGKILL timeout result:');
    console.log(`  Exit code: ${result2.exitCode}`);
    console.log(`  Signal: ${result2.signalCode}`);
    console.log(`  Error: ${result2.error}`);
    console.log(`  Stderr: ${result2.stderr}`);

    // Scenario 3: Custom signal (SIGINT) with signal handling
    console.log('\n🛑 Scenario 3: SIGINT timeout with signal handling (1.5 seconds)');
    const result3 = await automationService.executeCommandWithTimeout(
      'sigint-timeout',
      ['bash', '-c', 'trap "echo SIGINT received; exit 130" SIGINT; sleep 10'], // Handles SIGINT
      1500, // 1.5 second timeout
      'SIGINT' // Interrupt signal
    );

    console.log('SIGINT timeout result:');
    console.log(`  Exit code: ${result3.exitCode}`);
    console.log(`  Signal: ${result3.signalCode}`);
    console.log(`  Error: ${result3.error}`);
    console.log(`  Stderr: ${result3.stderr}`);

    // Scenario 4: AbortSignal vs timeout comparison
    console.log('\n🚫 Scenario 4: AbortSignal vs timeout comparison');

    // Test with AbortController (triggers first)
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000); // Abort after 1 second

    const result4 = await automationService.executeCommand('abort-test', ['sleep', '5'], {
      signal: controller.signal,
      timeout: 3000, // 3 second timeout (longer than abort)
      killSignal: 'SIGTERM',
      onExit: (proc, exitCode, signalCode, error) => {
        console.log(`  Abort test exited: code=${exitCode}, signal=${signalCode}`);
      },
    }) as EnhancedExecutionResult;

    console.log('AbortSignal result:');
    console.log(`  Exit code: ${result4.exitCode}`);
    console.log(`  Signal: ${result4.signalCode}`);
    console.log(`  Error: ${result4.error}`);

    // Scenario 5: Multiple timeout strategies comparison
    console.log('\n📊 Scenario 5: Multiple timeout strategies comparison');

    const strategies = [
      { name: 'Quick SIGTERM', timeout: 500, signal: 'SIGTERM' as const },
      { name: 'Medium SIGTERM', timeout: 1000, signal: 'SIGTERM' as const },
      { name: 'Slow SIGKILL', timeout: 2000, signal: 'SIGKILL' as const },
    ];

    for (const strategy of strategies) {
      const startTime = Date.now();
      const result = await automationService.executeCommandWithTimeout(
        `${strategy.name.toLowerCase().replace(' ', '-')}`,
        ['sleep', '5'],
        strategy.timeout,
        strategy.signal
      );

      const actualTime = Date.now() - startTime;
      console.log(`  ${strategy.name}: ${actualTime}ms, signal=${result.signalCode}, exit=${result.exitCode}`);
    }

    // Scenario 6: Real-world timeout scenarios
    console.log('\n🌍 Scenario 6: Real-world timeout scenarios');

    // Network operation with long timeout
    console.log('  Testing network operation (30s timeout)...');
    const networkResult = await automationService.executeCommand('network-test', [
      'curl', '-s', '--max-time', '20', 'https://httpbin.org/delay/5'
    ], {
      timeout: 30000, // 30 seconds for network
      killSignal: 'SIGTERM',
    }) as EnhancedExecutionResult;

    console.log(`  Network result: ${networkResult.exitCode === 0 ? 'Success' : 'Failed'} (${networkResult.executionTime}ms)`);

    // Build operation with medium timeout
    console.log('  Testing build operation (10s timeout)...');
    const buildResult = await automationService.executeCommand('build-test', [
      'bash', '-c', 'echo "Building..."; sleep 2; echo "Build complete"'
    ], {
      timeout: 10000, // 10 seconds for build
      killSignal: 'SIGTERM',
    }) as EnhancedExecutionResult;

    console.log(`  Build result: ${buildResult.exitCode === 0 ? 'Success' : 'Failed'} (${buildResult.executionTime}ms)`);

    console.log('\n✅ Advanced timeout and signal scenarios completed');

  } catch (error) {
    console.error('❌ Timeout and signal demonstration failed:', error);
  }
}

// Example 14: Smart timeout adaptation based on command type
async function demonstrateSmartTimeouts(): Promise<void> {
  try {
    console.log('🧠 Demonstrating smart timeout adaptation...');

    // Test different command types with smart timeouts
    const commandTests = [
      { name: 'Network operation', cmd: ['curl', '-s', 'https://httpbin.org/json'] },
      { name: 'Sleep operation', cmd: ['sleep', '2'] },
      { name: 'File operation', cmd: ['bash', '-c', 'find /etc -name "*.conf" | head -5'] },
      { name: 'Process operation', cmd: ['bash', '-c', 'ps aux | head -10'] },
    ];

    for (const test of commandTests) {
      console.log(`\n🔧 Testing ${test.name}...`);

      // Use smart timeout (this would be implemented in the automation service)
      const result = await automationService.executeCommand(
        test.name.toLowerCase().replace(' ', '-'),
        test.cmd,
        {
          timeout: 10000, // Default 10s, smart logic would adjust this
          killSignal: 'SIGTERM',
          onExit: (proc, exitCode, signalCode, error) => {
            if (error || signalCode) {
              console.log(`  ⚠️ ${test.name} had issues: signal=${signalCode}`);
            }
          },
        }
      ) as EnhancedExecutionResult;

      console.log(`  ✅ ${test.name}: ${result.exitCode === 0 ? 'Success' : 'Failed'} (${result.executionTime}ms)`);
      if (result.resourceUsage) {
        console.log(`  📊 Memory: ${(result.resourceUsage.maxRSS / 1024).toFixed(2)}KB, CPU: ${result.resourceUsage.cpuTime.total}µs`);
      }
    }

    console.log('\n✅ Smart timeout adaptation demonstration completed');

  } catch (error) {
    console.error('❌ Smart timeout demonstration failed:', error);
  }
}

// Example 15: Bun.serve secure HTTP server with TLS
async function demonstrateSecureServer(): Promise<void> {
  try {
    console.log('🌐 Demonstrating secure server with Bun.serve...');

    // Create HTTP server
    const httpServer = await automationService.createSecureServer({
      port: 3000,
      hostname: 'localhost',
      cors: true,
    });

    console.log('✅ HTTP server created successfully');

    // Create HTTPS server with TLS
    const httpsServer = await automationService.createSecureServer({
      port: 3443,
      hostname: 'localhost',
      tls: true,
      cors: true,
    });

    console.log('✅ HTTPS server created with TLS');

    // Test API endpoints
    console.log('🧪 Testing API endpoints...');

    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();

    console.log('📊 Health check:', {
      status: healthData.status,
      uptime: healthData.uptime,
      memory: Math.round(healthData.memory.heapUsed / 1024 / 1024) + 'MB',
    });

    // Test insights endpoint
    const insightsResponse = await fetch('http://localhost:3000/api/insights');
    const insightsData = await insightsResponse.json();

    console.log('📈 Insights API:', {
      totalFiles: insightsData.stats?.totalFiles,
      healthScore: insightsData.stats?.healthScore,
    });

    // Cleanup servers
    httpServer.stop();
    httpsServer.stop();

    console.log('✅ Secure server demonstration completed');

  } catch (error) {
    console.error('❌ Secure server demonstration failed:', error);
  }
}

// Example 16: IPv4/IPv6 networking configuration
async function demonstrateNetworking(): Promise<void> {
  try {
    console.log('🌍 Demonstrating IPv4/IPv6 networking...');

    // Test IPv4 preference
    console.log('\n📡 Testing IPv4 preference...');
    const ipv4Config = await automationService.configureNetworking(false);

    console.log('IPv4 connectivity results:', {
      ipv4: ipv4Config.ipv4 ? '✅' : '❌',
      ipv6: ipv4Config.ipv6 ? '✅' : '❌',
      dns: ipv4Config.dns ? '✅' : '❌',
    });

    // Test IPv6 preference
    console.log('\n📡 Testing IPv6 preference...');
    const ipv6Config = await automationService.configureNetworking(true);

    console.log('IPv6 connectivity results:', {
      ipv4: ipv6Config.ipv4 ? '✅' : '❌',
      ipv6: ipv6Config.ipv6 ? '✅' : '❌',
      dns: ipv6Config.dns ? '✅' : '❌',
    });

    // Network summary
    const summary = {
      ipv4Available: ipv4Config.ipv4 || ipv6Config.ipv4,
      ipv6Available: ipv4Config.ipv6 || ipv6Config.ipv6,
      dnsWorking: ipv4Config.dns && ipv6Config.dns,
      recommendedConfig: ipv6Config.ipv6 ? 'IPv6' : 'IPv4',
    };

    console.log('\n🌐 Network summary:', summary);
    console.log('✅ Networking demonstration completed');

  } catch (error) {
    console.error('❌ Networking demonstration failed:', error);
  }
}

// Example 17: Security hardening and Redis integration
async function demonstrateSecurityAndRedis(): Promise<void> {
  try {
    console.log('🔒 Demonstrating security hardening and Redis integration...');

    // Apply security hardening
    console.log('\n🛡️ Applying security hardening...');
    const securityHeaders = await automationService.hardenSecurity();

    console.log('Security headers configured:');
    Object.entries(securityHeaders).forEach(([header, value]) => {
      console.log(`  ${header}: ${value}`);
    });

    // Test Redis integration
    console.log('\n🔗 Testing Redis integration...');
    const redisPool = await automationService.createRedisPool();

    console.log('Redis pool status:', {
      url: redisPool.url,
      status: redisPool.status,
      pool: redisPool.pool ? `${redisPool.pool.min}-${redisPool.pool.max} connections` : 'N/A',
      fallback: redisPool.fallback || 'none',
    });

    // Test secure server with security headers
    console.log('\n🌐 Creating secure server with security headers...');
    const secureServer = await automationService.createSecureServer({
      port: 8443,
      hostname: 'localhost',
      tls: true,
      cors: true,
    });

    // Test CORS functionality
    const corsResponse = await fetch('http://localhost:3000/api/health', {
      method: 'OPTIONS',
    });

    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
    });

    // Cleanup
    secureServer.stop();

    console.log('✅ Security and Redis demonstration completed');

  } catch (error) {
    console.error('❌ Security and Redis demonstration failed:', error);
  }
}

// Example 18: Advanced networking with connection pooling
async function demonstrateAdvancedNetworking(): Promise<void> {
  try {
    console.log('🚀 Demonstrating advanced networking features...');

    // Create multiple servers with different configurations
    const servers = [];

    // HTTP server with rate limiting simulation
    const httpServer = await automationService.createSecureServer({
      port: 3001,
      hostname: 'localhost',
      cors: true,
    });
    servers.push(httpServer);

    // HTTPS server with custom TLS
    const httpsServer = await automationService.createSecureServer({
      port: 3444,
      hostname: 'localhost',
      tls: true,
      cors: true,
    });
    servers.push(httpsServer);

    // Test concurrent requests
    console.log('\n⚡ Testing concurrent requests...');
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      fetch(`http://localhost:3001/api/health`)
        .then(res => res.json())
        .then(data => ({ id: i, status: data.status, timestamp: data.timestamp }))
    );

    const results = await Promise.all(concurrentRequests);

    console.log('Concurrent request results:', {
      total: results.length,
      successful: results.filter(r => r.status === 'healthy').length,
      averageResponseTime: 'fast', // Bun.serve is optimized for speed
    });

    // Test network resilience
    console.log('\n🔒 Testing network resilience...');
    const connectivity = await automationService.configureNetworking(true);

    const resilienceScore = {
      ipv4Support: connectivity.ipv4 ? 25 : 0,
      ipv6Support: connectivity.ipv6 ? 25 : 0,
      dnsResolution: connectivity.dns ? 25 : 0,
      tlsSupport: 25, // Always available with our implementation
    };

    const totalScore = Object.values(resilienceScore).reduce((sum, score) => sum + score, 0);

    console.log('Network resilience score:', {
      ...resilienceScore,
      total: totalScore,
      grade: totalScore >= 75 ? 'A' : totalScore >= 50 ? 'B' : 'C',
    });

    // Cleanup all servers
    servers.forEach(server => server.stop());

    console.log('✅ Advanced networking demonstration completed');

  } catch (error) {
    console.error('❌ Advanced networking demonstration failed:', error);
  }
}

// Example 19: Bun Configuration Management
async function demonstrateBunConfigurationManagement() {
  console.log('🔧 Demonstrating Bun Configuration Management...');

  try {
    const automation = new AutomationService();

    // 📖 Read bunfig.toml configuration
    console.log('\n📖 Reading bunfig.toml...');
    const bunfig = await automation.readBunfig();
    console.log('Bun configuration:', {
      installCache: bunfig.install?.cache,
      runShell: bunfig.run?.shell,
      testCoverage: bunfig.test?.coverage,
      buildTarget: bunfig.build?.target,
    });

    // 📦 Read enhanced package.json
    console.log('\n📦 Reading package.json...');
    const packageInfo = await automation.readPackageJson();
    console.log('Package information:', {
      name: packageInfo.name,
      version: packageInfo.version,
      scripts: Object.keys(packageInfo.bun.scripts),
      hasBunLock: packageInfo.bun.hasBunLock,
      hasTsConfig: packageInfo.bun.hasTsConfig,
      dependencyCount: Object.keys(packageInfo.bun.dependencies).length,
    });

    // 📝 Read TypeScript configuration
    console.log('\n📝 Reading TypeScript configuration...');
    const tsConfig = await automation.readTsConfig();
    if (tsConfig) {
      console.log('TypeScript configuration:', {
        target: tsConfig.compilerOptions?.target,
        module: tsConfig.compilerOptions?.module,
        jsx: tsConfig.compilerOptions?.jsx,
        strict: tsConfig.compilerOptions?.strict,
        esModuleInterop: tsConfig.compilerOptions?.esModuleInterop,
      });
    } else {
      console.log('⚠️ No tsconfig.json found');
    }

    // 🎯 Comprehensive configuration analysis
    console.log('\n🎯 Running comprehensive configuration analysis...');
    const analysis = await automation.analyzeConfiguration();

    console.log('📊 Complete project analysis:');
    console.log('  🍔 Bun Features:', {
      hasLockFile: analysis.files.hasBunLock,
      hasBunfig: analysis.files.hasBunfig,
      bunVersion: analysis.environment.bunVersion,
    });

    console.log('  📦 Project Structure:', {
      hasPackageJson: analysis.files.hasPackageJson,
      hasTsConfig: analysis.files.hasTsConfig,
      nodeEnv: analysis.environment.nodeEnv,
      platform: analysis.environment.platform,
    });

    console.log('  ⚙️ Configuration Summary:', {
      bunfigSections: Object.keys(analysis.bunfig),
      packageScripts: Object.keys(analysis.package.bun.scripts),
      tsConfigPresent: !!analysis.tsconfig,
    });

    // 🔍 Configuration validation
    console.log('\n🔍 Configuration validation:');

    // Check if this is a Bun-native project
    if (analysis.files.hasBunLock && analysis.files.hasBunfig) {
      console.log('✅ This is a Bun-native project!');
    } else if (analysis.files.hasBunLock) {
      console.log('🔄 This project uses Bun but may have default configuration');
    } else {
      console.log('⚠️ This project doesn\'t appear to use Bun lock files');
    }

    // Check TypeScript setup
    if (analysis.files.hasTsConfig) {
      console.log('✅ TypeScript configuration found');
      if (analysis.tsconfig?.compilerOptions?.strict) {
        console.log('🔒 Strict TypeScript mode enabled');
      }
    } else {
      console.log('ℹ️ No TypeScript configuration - using JavaScript');
    }

    // Check build configuration
    if (analysis.bunfig.build?.target === 'bun') {
      console.log('🎯 Optimized for Bun build target');
    }

    if (analysis.bunfig.install?.cache) {
      console.log('💾 Package caching enabled');
    }

    console.log('✅ Bun Configuration Management demonstration completed');

    return analysis;

  } catch (error) {
    console.error('❌ Configuration management demonstration failed:', error);
    throw error;
  }
}

// Example 20: Advanced Configuration Scenarios
async function demonstrateAdvancedConfigurationScenarios() {
  console.log('🔬 Demonstrating Advanced Configuration Scenarios...');

  try {
    const automation = new AutomationService();

    // 🧪 Test different bunfig.toml scenarios
    console.log('\n🧪 Testing configuration scenarios...');

    // Scenario 1: Default configuration
    console.log('\n📋 Scenario 1: Default configuration');
    const defaultBunfig = await automation.readBunfig('./non-existent-bunfig.toml');
    console.log('Default bunfig:', defaultBunfig);

    // Scenario 2: Custom configuration paths
    console.log('\n📂 Scenario 2: Custom configuration paths');

    // Create a custom bunfig for testing
    const customBunfigContent = `
[install]
cache = false
optional = false

[run]
shell = "/bin/zsh"

[build]
target = "node"
minify = false
sourcemap = "inline"
`;

    // Write custom bunfig
    // @ts-ignore - Bun.write is available at runtime
    await Bun.write('./test-bunfig.toml', customBunfigContent);

    const customBunfig = await automation.readBunfig('./test-bunfig.toml');
    console.log('Custom bunfig:', {
      installCache: customBunfig.install?.cache,
      runShell: customBunfig.run?.shell,
      buildTarget: customBunfig.build?.target,
      sourcemapType: customBunfig.build?.sourcemap,
    });

    // Scenario 3: Configuration comparison
    console.log('\n🔍 Scenario 3: Configuration comparison');
    const packageAnalysis = await automation.analyzeConfiguration();

    // Compare different configurations
    const configComparison = {
      default: defaultBunfig,
      custom: customBunfig,
      actual: packageAnalysis.bunfig,
    };

    console.log('Configuration differences:');
    Object.entries(configComparison).forEach(([name, config]) => {
      console.log(`  ${name}:`, {
        cache: config.install?.cache,
        target: config.build?.target,
        shell: config.run?.shell,
      });
    });

    // Scenario 4: Environment-specific configuration
    console.log('\n🌍 Scenario 4: Environment-specific analysis');
    const envAnalysis = {
      isDevelopment: packageAnalysis.environment.nodeEnv === 'development',
      isProduction: packageAnalysis.environment.nodeEnv === 'production',
      platform: packageAnalysis.environment.platform,
      hasBunFeatures: packageAnalysis.files.hasBunLock && packageAnalysis.files.hasBunfig,
    };

    console.log('Environment analysis:', envAnalysis);

    // Scenario 5: Configuration recommendations
    console.log('\n💡 Scenario 5: Configuration recommendations');
    const recommendations = [];

    if (!packageAnalysis.files.hasBunLock) {
      recommendations.push('Consider using `bun install` to generate bun.lockb for faster installs');
    }

    if (!packageAnalysis.files.hasBunfig) {
      recommendations.push('Create bunfig.toml to customize Bun behavior');
    }

    if (!packageAnalysis.files.hasTsConfig && packageAnalysis.package.bun.dependencies.some((dep: string) => dep.includes('@types'))) {
      recommendations.push('Add tsconfig.json for better TypeScript support');
    }

    if (packageAnalysis.bunfig.build?.target !== 'bun') {
      recommendations.push('Set build target to "bun" for optimal performance');
    }

    if (recommendations.length > 0) {
      console.log('💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    } else {
      console.log('✅ Configuration looks optimal!');
    }

    // Cleanup test file
    try {
      // @ts-ignore - Bun.file is available at runtime
      const testFile = Bun.file('./test-bunfig.toml');
      if (await testFile.exists()) {
        // @ts-ignore - Bun.remove is available at runtime
        await Bun.remove('./test-bunfig.toml');
        console.log('🧹 Cleaned up test files');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up test files:', cleanupError);
    }

    console.log('✅ Advanced Configuration Scenarios demonstration completed');

  } catch (error) {
    console.error('❌ Advanced configuration scenarios failed:', error);
    throw error;
  }
}
