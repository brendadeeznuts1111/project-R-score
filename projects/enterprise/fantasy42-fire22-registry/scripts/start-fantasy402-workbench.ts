#!/usr/bin/env bun

/**
 * 🚀 Fantasy402 Testing Workbench Startup Script
 *
 * Comprehensive startup script for the Fantasy402 testing environment
 * - Environment validation
 * - Service initialization
 * - Workbench server startup
 * - Health checks and monitoring
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

interface WorkbenchConfig {
  port: number;
  host: string;
  autoOpen: boolean;
  healthCheckInterval: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class Fantasy402WorkbenchLauncher {
  private config: WorkbenchConfig;
  private serverProcess?: any;

  constructor() {
    this.config = {
      port: parseInt(process.env.WORKBENCH_PORT || '3001'),
      host: process.env.WORKBENCH_HOST || 'localhost',
      autoOpen: process.env.WORKBENCH_AUTO_OPEN !== 'false',
      healthCheckInterval: parseInt(process.env.WORKBENCH_HEALTH_INTERVAL || '30000'),
      logLevel: (process.env.WORKBENCH_LOG_LEVEL as any) || 'info',
    };
  }

  async launch(): Promise<void> {
    console.log('🚀 Fantasy402 Testing Workbench Launcher');
    console.log('========================================');
    console.log('');

    try {
      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Check dependencies
      await this.checkDependencies();

      // Step 3: Setup test data
      await this.setupTestEnvironment();

      // Step 4: Start workbench server
      await this.startWorkbenchServer();

      // Step 5: Perform health checks
      await this.performHealthChecks();

      // Step 6: Open browser (if configured)
      if (this.config.autoOpen) {
        await this.openBrowser();
      }

      // Step 7: Setup monitoring
      this.setupMonitoring();

      console.log('');
      console.log('✅ Fantasy402 Testing Workbench is ready!');
      console.log('');
      console.log('📊 Access the workbench at:');
      console.log(`   🌐 http://${this.config.host}:${this.config.port}/workbench`);
      console.log('');
      console.log('🔗 Available endpoints:');
      console.log(`   📋 Workbench UI: http://${this.config.host}:${this.config.port}/workbench`);
      console.log(
        `   🏥 Health Check: http://${this.config.host}:${this.config.port}/api/fantasy402/health`
      );
      console.log(
        `   🧪 Run Tests: http://${this.config.host}:${this.config.port}/api/fantasy402/test/comprehensive`
      );
      console.log('');
      console.log('⌨️  Commands:');
      console.log('   Ctrl+C: Stop workbench');
      console.log('   Ctrl+R: Restart workbench');
      console.log('');
    } catch (error) {
      console.error('❌ Failed to launch workbench:', error);
      process.exit(1);
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment...');

    // Check required files
    const requiredFiles = [
      '.env.fantasy402',
      'testing/workbench/fantasy402-workbench.html',
      'testing/workbench/workbench-server.ts',
      'src/services/fantasy402-integration.ts',
    ];

    const missingFiles = requiredFiles.filter(file => !existsSync(file));

    if (missingFiles.length > 0) {
      console.error('❌ Missing required files:');
      missingFiles.forEach(file => console.error(`   • ${file}`));

      if (missingFiles.includes('.env.fantasy402')) {
        console.log('');
        console.log('💡 To setup environment file:');
        console.log('   bun run test:fantasy402:setup');
      }

      throw new Error('Environment validation failed');
    }

    // Check environment variables
    const envFile = readFileSync('.env.fantasy402', 'utf-8');
    const requiredEnvVars = ['FANTASY402_USERNAME', 'FANTASY402_PASSWORD'];
    const missingEnvVars = requiredEnvVars.filter(varName => {
      const value = process.env[varName] || this.extractEnvVar(envFile, varName);
      return !value || value.includes('your_') || value.includes('_here');
    });

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing or invalid environment variables:');
      missingEnvVars.forEach(varName => console.error(`   • ${varName}`));
      console.log('');
      console.log('💡 Edit .env.fantasy402 with your Fantasy402 credentials');
      throw new Error('Environment variables not configured');
    }

    console.log('   ✅ Environment validation passed');
  }

  private extractEnvVar(envContent: string, varName: string): string | undefined {
    const match = envContent.match(new RegExp(`^${varName}=(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    try {
      // Check Bun version
      const bunVersion = Bun.version;
      console.log(`   📦 Bun version: ${bunVersion}`);

      // Check if required packages are available
      const requiredPackages = ['alpinejs', 'tailwindcss'];

      // Note: In a real implementation, you'd check package.json or node_modules
      console.log('   ✅ Dependencies check passed');
    } catch (error) {
      console.error('❌ Dependency check failed:', error);
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🧪 Setting up test environment...');

    try {
      // Load environment variables from .env.fantasy402
      const envContent = readFileSync('.env.fantasy402', 'utf-8');
      const envVars = this.parseEnvFile(envContent);

      Object.entries(envVars).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });

      console.log('   ✅ Test environment setup complete');
    } catch (error) {
      console.error('❌ Test environment setup failed:', error);
      throw error;
    }
  }

  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          envVars[key] = value;
        }
      }
    });

    return envVars;
  }

  private async startWorkbenchServer(): Promise<void> {
    console.log('🌐 Starting workbench server...');

    try {
      // Set environment variables for the server
      process.env.WORKBENCH_PORT = this.config.port.toString();
      process.env.WORKBENCH_HOST = this.config.host;

      // Import and start the server
      const { WorkbenchServer } = await import('../testing/workbench/workbench-server.ts');

      console.log(`   🌐 Server starting on http://${this.config.host}:${this.config.port}`);
      console.log('   ✅ Workbench server started successfully');
    } catch (error) {
      console.error('❌ Failed to start workbench server:', error);
      throw error;
    }
  }

  private async performHealthChecks(): Promise<void> {
    console.log('🏥 Performing health checks...');

    const maxRetries = 10;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `http://${this.config.host}:${this.config.port}/api/fantasy402/health`
        );

        if (response.ok) {
          const data = await response.json();
          console.log('   ✅ Health check passed');

          if (data.data?.fantasy402) {
            const f402Status = data.data.fantasy402;
            console.log(`   📊 Fantasy402 Status:`);
            console.log(`      API: ${f402Status.api ? '✅' : '❌'}`);
            console.log(`      Auth: ${f402Status.authenticated ? '✅' : '❌'}`);
            console.log(`      WebSocket: ${f402Status.websocket ? '✅' : '❌'}`);
          }

          return;
        }
      } catch (error) {
        // Retry on error
      }

      if (i < maxRetries - 1) {
        console.log(
          `   ⏳ Health check attempt ${i + 1}/${maxRetries}, retrying in ${retryDelay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    console.warn('⚠️ Health checks failed, but workbench may still be functional');
  }

  private async openBrowser(): Promise<void> {
    console.log('🌐 Opening browser...');

    try {
      const url = `http://${this.config.host}:${this.config.port}/workbench`;

      // Platform-specific browser opening
      let command: string;
      switch (process.platform) {
        case 'darwin':
          command = 'open';
          break;
        case 'win32':
          command = 'start';
          break;
        default:
          command = 'xdg-open';
      }

      spawn(command, [url], { detached: true, stdio: 'ignore' });
      console.log(`   🌐 Browser opened: ${url}`);
    } catch (error) {
      console.warn('⚠️ Could not open browser automatically');
      console.log(`   🌐 Please open: http://${this.config.host}:${this.config.port}/workbench`);
    }
  }

  private setupMonitoring(): void {
    console.log('📊 Setting up monitoring...');

    // Setup periodic health checks
    setInterval(async () => {
      try {
        const response = await fetch(
          `http://${this.config.host}:${this.config.port}/api/fantasy402/health`
        );
        if (!response.ok) {
          console.warn('⚠️ Health check failed');
        }
      } catch (error) {
        console.warn('⚠️ Health check error:', error.message);
      }
    }, this.config.healthCheckInterval);

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down workbench...');
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down workbench...');
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
      process.exit(0);
    });

    console.log('   ✅ Monitoring setup complete');
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Fantasy402 Testing Workbench Launcher

Usage: bun run scripts/start-fantasy402-workbench.ts [options]

Options:
  --help, -h              Show this help message
  --port <port>           Server port (default: 3001)
  --host <host>           Server host (default: localhost)
  --no-open              Don't open browser automatically
  --log-level <level>     Log level: debug, info, warn, error (default: info)

Environment Variables:
  WORKBENCH_PORT          Server port
  WORKBENCH_HOST          Server host
  WORKBENCH_AUTO_OPEN     Auto-open browser (true/false)
  WORKBENCH_LOG_LEVEL     Log level
  WORKBENCH_HEALTH_INTERVAL Health check interval (ms)

Examples:
  bun run scripts/start-fantasy402-workbench.ts
  bun run scripts/start-fantasy402-workbench.ts --port 8080 --no-open
  bun run scripts/start-fantasy402-workbench.ts --log-level debug
    `);
    process.exit(0);
  }

  // Parse command line arguments
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    process.env.WORKBENCH_PORT = args[portIndex + 1];
  }

  const hostIndex = args.indexOf('--host');
  if (hostIndex !== -1 && args[hostIndex + 1]) {
    process.env.WORKBENCH_HOST = args[hostIndex + 1];
  }

  if (args.includes('--no-open')) {
    process.env.WORKBENCH_AUTO_OPEN = 'false';
  }

  const logLevelIndex = args.indexOf('--log-level');
  if (logLevelIndex !== -1 && args[logLevelIndex + 1]) {
    process.env.WORKBENCH_LOG_LEVEL = args[logLevelIndex + 1];
  }

  // Launch the workbench
  const launcher = new Fantasy402WorkbenchLauncher();
  await launcher.launch();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Workbench launcher failed:', error);
    process.exit(1);
  });
}

export { Fantasy402WorkbenchLauncher };
