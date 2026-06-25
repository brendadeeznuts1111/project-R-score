#!/usr/bin/env bun

/**
 * Unified Observatory Launcher
 * 
 * Launches all services with Bun API Secrets alignment:
 * - Dashboard Server (Port 3000)
 * - TOML Editor & Optimizer (Port 3001) 
 * - Bun Secrets Service (Port 3002)
 * 
 * @see https://bun.sh/docs/api/secrets
 * @see https://github.com/oven-sh/bun
 */

import { spawn } from 'bun';

interface ServiceConfig {
  name: string;
  port: number;
  file: string;
  description: string;
  url: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  process?: any;
}

class UnifiedObservatoryLauncher {
  private services: Map<string, ServiceConfig> = new Map();
  private startupOrder: string[] = [];
  
  constructor() {
    this.initializeServices();
  }
  
  private initializeServices() {
    const serviceConfigs: ServiceConfig[] = [
      {
        name: 'dashboard',
        port: 3000,
        file: 'dashboard-server.ts',
        description: 'Security Dashboard with TOML Cards',
        url: 'http://localhost:3000',
        status: 'stopped'
      },
      {
        name: 'editor',
        port: 3001,
        file: 'toml-editor-optimizer.ts',
        description: 'TOML Editor & Optimizer',
        url: 'http://localhost:3001',
        status: 'stopped'
      },
      {
        name: 'secrets',
        port: 3002,
        file: 'bun-secrets-service.ts',
        description: 'Bun Secrets Service - API Aligned',
        url: 'http://localhost:3002',
        status: 'stopped'
      }
    ];
    
    for (const config of serviceConfigs) {
      this.services.set(config.name, config);
    }
    
    // Define startup order (dependencies)
    this.startupOrder = ['dashboard', 'editor', 'secrets'];
  }
  
  async startAllServices() {
    console.info(`🚀 Unified Observatory Launcher`);
    console.info(`================================`);
    console.info(`🔐 Bun API Secrets Aligned Services`);
    console.info(`⏰ Started at ${new Date().toLocaleString()}`);
    console.info(``);
    
    for (const serviceName of this.startupOrder) {
      await this.startService(serviceName);
      // Small delay between services
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.displayServiceStatus();
    this.setupGracefulShutdown();
  }
  
  private async startService(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service) {
      console.error(`❌ Service '${serviceName}' not found`);
      return;
    }
    
    console.info(`🔄 Starting ${service.name} service...`);
    service.status = 'starting';
    
    try {
      const proc = spawn(['bun', 'run', service.file], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'development',
          BUN_SECRETS_API_KEY: 'dev-api-key-unified',
          BUN_SECRETS_JWT_SECRET: 'dev-jwt-secret-unified',
          BUN_SECRETS_ENCRYPTION_KEY: 'dev-encryption-key-unified'
        }
      });
      
      service.process = proc;
      
      // Wait a moment to see if service starts successfully
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if process is still running
      if (proc.exited !== undefined && proc.exited !== false) {
        service.status = 'error';
        console.error(`❌ ${service.name} failed to start`);
        
        // Try to get error output
        try {
          const stderr = await new Response(proc.stderr as any).text();
          if (stderr) {
            console.error(`   Error: ${stderr.trim()}`);
          }
        } catch (e) {
          console.error(`   Error: Unable to read stderr`);
        }
      } else {
        service.status = 'running';
        console.info(`✅ ${service.name} started successfully`);
        console.info(`   📊 Dashboard: ${service.url}`);
        
        // Setup output handlers
        this.setupServiceOutputHandlers(service);
      }
    } catch (error) {
      service.status = 'error';
      console.error(`❌ Failed to start ${service.name}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Setup output handlers for service processes
   */
  private setupServiceOutputHandlers(service: ServiceConfig) {
    if (!service.process) return;
    
    // Handle stdout
    service.process.stdout?.then(async (stdout: any) => {
      const reader = stdout.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.trim().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            console.info(`[${service.name.toUpperCase()}] ${line}`);
          }
        }
      }
    });
    
    // Handle stderr
    service.process.stderr?.then(async (stderr: any) => {
      const reader = stderr.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.trim().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            console.error(`[${service.name.toUpperCase()} ERROR] ${line}`);
          }
        }
      }
    });
  }
  
  private displayServiceStatus() {
    console.info(``);
    console.info(`📊 Service Status Summary`);
    console.info(`========================`);
    
    for (const service of this.services.values()) {
      const statusIcon = this.getStatusIcon(service.status);
      console.info(`${statusIcon} ${service.name.padEnd(10)} (${service.port}) - ${service.description}`);
      console.info(`   🌐 ${service.url}`);
    }
    
    console.info(``);
    console.info(`🎯 All Services Available:`);
    console.info(`   📈 Security Dashboard: http://localhost:3000`);
    console.info(`   📝 TOML Editor: http://localhost:3001`);
    console.info(`   🔐 Secrets Service: http://localhost:3002`);
    console.info(``);
    console.info(`🔥 Unified URLPattern Observatory v1.3.6+ is fully operational!`);
  }
  
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'running': return '✅';
      case 'starting': return '🔄';
      case 'error': return '❌';
      default: return '⏸️';
    }
  }
  
  private setupGracefulShutdown() {
    const shutdown = async () => {
      console.info(`\n🛑 Shutting down all services...`);
      
      for (const serviceName of this.startupOrder.reverse()) {
        await this.stopService(serviceName);
      }
      
      console.info(`👋 All services stopped. Goodbye!`);
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
  
  private async stopService(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service || !service.process) return;
    
    console.info(`🛑 Stopping ${service.name}...`);
    
    try {
      // Try graceful shutdown first
      process.kill(service.process.pid, 'SIGTERM');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      if (!service.process.exited) {
        process.kill(service.process.pid, 'SIGKILL');
      }
      
      console.info(`✅ ${service.name} stopped`);
    } catch (error) {
      console.error(`❌ Error stopping ${service.name}: ${(error as Error).message}`);
    }
  }
  
  async restartService(serviceName: string) {
    console.info(`🔄 Restarting ${serviceName} service...`);
    
    await this.stopService(serviceName);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startService(serviceName);
  }
  
  getServiceStatus(): Array<{ name: string; status: string; url: string; port: number }> {
    return Array.from(this.services.values()).map(service => ({
      name: service.name,
      status: service.status,
      url: service.url,
      port: service.port
    }));
  }
}

// CLI Interface
async function main() {
  const launcher = new UnifiedObservatoryLauncher();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      await launcher.startAllServices();
      break;
      
    case 'status':
      const status = launcher.getServiceStatus();
      console.info('📊 Service Status:');
      status.forEach(service => {
        const icon = service.status === 'running' ? '✅' : '❌';
        console.info(`${icon} ${service.name}: ${service.status} (${service.url})`);
      });
      break;
      
    case 'restart':
      const serviceName = process.argv[3];
      if (serviceName) {
        await launcher.restartService(serviceName);
      } else {
        console.error('❌ Please specify a service name to restart');
        process.exit(1);
      }
      break;
      
    default:
      console.info(`🚀 Unified Observatory Launcher`);
      console.info(`================================`);
      console.info(``);
      console.info(`Usage:`);
      console.info(`  bun run unified-observatory-launcher.ts start     Start all services`);
      console.info(`  bun run unified-observatory-launcher.ts status    Show service status`);
      console.info(`  bun run unified-observatory-launcher.ts restart <service> Restart specific service`);
      console.info(``);
      console.info(`Available services:`);
      console.info(`  - dashboard: Security Dashboard (Port 3000)`);
      console.info(`  - editor: TOML Editor & Optimizer (Port 3001)`);
      console.info(`  - secrets: Bun Secrets Service (Port 3002)`);
      console.info(``);
      console.info(`🔥 All services are aligned with Bun API Secrets naming conventions!`);
      break;
  }
}

// Run the launcher
if (import.meta.main) {
  main().catch(console.error);
}

export { UnifiedObservatoryLauncher };
