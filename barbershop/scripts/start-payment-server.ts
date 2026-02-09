#!/usr/bin/env bun
/**
 * Payment Server Startup Script
 * Automated startup with health checks and process management
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const PID_FILE = '/tmp/payment-server.pid';
const LOG_FILE = '/tmp/payment-server.log';
const HEALTH_CHECK_INTERVAL = 5000;
const MAX_RESTART_ATTEMPTS = 5;
const STARTUP_TIMEOUT = 30000;

interface ServerStatus {
  running: boolean;
  pid?: number;
  port?: number;
  uptime?: number;
  health?: 'healthy' | 'degraded' | 'unhealthy';
}

class PaymentServerManager {
  private process?: ChildProcess;
  private restartAttempts = 0;
  private healthCheckTimer?: NodeJS.Timer;
  private startTime = 0;

  async start(): Promise<void> {
    // Check if already running
    const existingStatus = this.getStatus();
    if (existingStatus.running) {
      console.log(`✓ Payment server already running (PID: ${existingStatus.pid})`);
      return;
    }

    console.log('🚀 Starting payment routing server...');

    return new Promise((resolve, reject) => {
      this.startTime = Date.now();
      
      // Start the server process
      this.process = spawn('bun', [
        'run',
        join(__dirname, '../src/payment/server.ts')
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        env: {
          ...process.env,
          PAYMENT_PORT: process.env.PAYMENT_PORT || '3001',
          PAYMENT_HOST: process.env.PAYMENT_HOST || '0.0.0.0',
          NODE_ENV: process.env.NODE_ENV || 'development',
        }
      });

      // Save PID
      if (this.process.pid) {
        writeFileSync(PID_FILE, String(this.process.pid));
      }

      // Handle output
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(output.trim());
      });

      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        console.error(output.trim());
      });

      // Wait for server to be ready
      const checkReady = setInterval(async () => {
        const elapsed = Date.now() - this.startTime;
        
        if (elapsed > STARTUP_TIMEOUT) {
          clearInterval(checkReady);
          this.stop();
          reject(new Error('Server startup timeout'));
          return;
        }

        try {
          const health = await this.checkHealth();
          if (health) {
            clearInterval(checkReady);
            this.restartAttempts = 0;
            this.startHealthChecks();
            console.log('✅ Payment server started successfully');
            console.log(`   Port: ${process.env.PAYMENT_PORT || 3001}`);
            console.log(`   PID: ${this.process?.pid}`);
            console.log(`   Logs: ${LOG_FILE}`);
            resolve();
          }
        } catch {
          // Not ready yet, continue waiting
        }
      }, 1000);

      // Handle process exit
      this.process.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ Server process exited with code ${code}`);
          this.handleCrash();
        }
      });
    });
  }

  stop(): void {
    console.log('🛑 Stopping payment server...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        this.process?.kill('SIGKILL');
      }, 5000);
    }

    // Clean up PID file
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    console.log('✓ Payment server stopped');
  }

  restart(): void {
    console.log('🔄 Restarting payment server...');
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  getStatus(): ServerStatus {
    try {
      if (!existsSync(PID_FILE)) {
        return { running: false };
      }

      const pid = parseInt(readFileSync(PID_FILE, 'utf-8'));
      
      // Check if process exists
      try {
        process.kill(pid, 0);
        return {
          running: true,
          pid,
          port: parseInt(process.env.PAYMENT_PORT || '3001'),
        };
      } catch {
        // Process doesn't exist
        unlinkSync(PID_FILE);
        return { running: false };
      }
    } catch {
      return { running: false };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const port = process.env.PAYMENT_PORT || '3001';
      const response = await fetch(`http://localhost:${port}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.checkHealth();
      
      if (!healthy) {
        console.error('⚠️ Health check failed');
        this.handleCrash();
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  private handleCrash(): void {
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error(`❌ Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Giving up.`);
      this.stop();
      process.exit(1);
    }

    this.restartAttempts++;
    console.log(`🔄 Restarting server (attempt ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
    
    setTimeout(() => {
      this.start().catch((err) => {
        console.error('Failed to restart:', err);
      });
    }, 2000);
  }
}

// CLI commands
const manager = new PaymentServerManager();

const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    manager.start().catch((err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
    break;

  case 'stop':
    manager.stop();
    break;

  case 'restart':
    manager.restart();
    break;

  case 'status':
    const status = manager.getStatus();
    if (status.running) {
      console.log('✅ Payment server is running');
      console.log(`   PID: ${status.pid}`);
      console.log(`   Port: ${status.port}`);
    } else {
      console.log('❌ Payment server is not running');
    }
    break;

  case 'health':
    manager.checkHealth().then((healthy) => {
      if (healthy) {
        console.log('✅ Server is healthy');
        process.exit(0);
      } else {
        console.log('❌ Server is unhealthy');
        process.exit(1);
      }
    });
    break;

  default:
    console.log(`
Usage: bun run scripts/start-payment-server.ts [command]

Commands:
  start    Start the payment server (default)
  stop     Stop the payment server
  restart  Restart the payment server
  status   Check server status
  health   Perform health check

Environment Variables:
  PAYMENT_PORT    Server port (default: 3001)
  PAYMENT_HOST    Server host (default: 0.0.0.0)
  REDIS_URL       Redis connection URL
  LOG_LEVEL       Logging level (debug|info|warn|error)
  NODE_ENV        Environment (development|production)
    `);
}

// Handle exit signals
process.on('SIGINT', () => {
  manager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  manager.stop();
  process.exit(0);
});
