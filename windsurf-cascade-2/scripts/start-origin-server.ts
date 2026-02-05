#!/usr/bin/env bun
// Origin Server Launcher - Single Point of Entry
// Starts the unified dashboard system with all components

import { unifiedAPI } from './src/core/orchestration/unified-api';
import { dashboardOrchestrator } from './src/core/orchestration/dashboard-orchestrator';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ServerConfig {
    port: number;
    host: string;
    enableCors: boolean;
    enableAuth: boolean;
    authToken: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class OriginServer {
    private config: ServerConfig;
    private isRunning: boolean = false;

    constructor(config: Partial<ServerConfig> = {}) {
        this.config = this.getDefaultConfig(config);
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️  Origin Server is already running');
            return;
        }

        try {
            console.log('🚀 Starting Origin Server...');
            console.log(`📊 Port: ${this.config.port}`);
            console.log(`🌐 Host: ${this.config.host}`);
            console.log(`🔐 Authentication: ${this.config.enableAuth ? 'Enabled' : 'Disabled'}`);
            console.log(`🌍 CORS: ${this.config.enableCors ? 'Enabled' : 'Disabled'}`);

            // Initialize dashboard orchestrator
            console.log('🔧 Initializing dashboard orchestrator...');
            await dashboardOrchestrator.initialize({
                theme: 'origin',
                refreshInterval: 2000,
                enableAI: true,
                enableLatencyTracking: true,
                enablePatternAnalysis: true,
                enableCaching: true
            });

            // Start unified API
            console.log('🌐 Starting unified API...');
            await unifiedAPI.start({
                port: this.config.port,
                cors: this.config.enableCors,
                rateLimit: {
                    enabled: true,
                    requests: 100,
                    window: 60000
                },
                authentication: {
                    enabled: this.config.enableAuth,
                    token: this.config.authToken
                }
            });

            this.isRunning = true;
            this.displayStartupInfo();

        } catch (error) {
            console.error('❌ Failed to start Origin Server:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            console.log('⚠️  Origin Server is not running');
            return;
        }

        try {
            console.log('🛑 Stopping Origin Server...');
            
            // Stop unified API
            await unifiedAPI.stop();
            
            // Cleanup dashboard orchestrator
            dashboardOrchestrator.cleanup();
            
            this.isRunning = false;
            console.log('✅ Origin Server stopped successfully');
            
        } catch (error) {
            console.error('❌ Error stopping Origin Server:', error);
        }
    }

    public async restart(): Promise<void> {
        console.log('🔄 Restarting Origin Server...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.start();
    }

    public getStatus(): void {
        const status = unifiedAPI.getStatus();
        
        console.log('📊 Origin Server Status:');
        console.log(`   Running: ${status.data?.running ? '✅ Yes' : '❌ No'}`);
        console.log(`   Port: ${status.data?.port || 'N/A'}`);
        console.log(`   Uptime: ${status.data?.uptime ? `${Math.floor(status.data.uptime)}s` : 'N/A'}`);
        console.log(`   Requests: ${status.data?.requests || 0}`);
        console.log(`   Endpoints: ${status.data?.endpoints?.length || 0}`);
    }

    private displayStartupInfo(): void {
        console.log('');
        console.log('🎉 Origin Server started successfully!');
        console.log('');
        console.log('📊 Dashboard URLs:');
        console.log(`   • Main Dashboard: http://${this.config.host}:${this.config.port}`);
        console.log(`   • Origin Dashboard: http://${this.config.host}:${this.config.port}/origin-dashboard.html`);
        console.log(`   • API Documentation: http://${this.config.host}:${this.config.port}/api`);
        console.log('');
        console.log('🔗 Available Endpoints:');
        console.log('   • GET  /dashboard              - Main dashboard data');
        console.log('   • GET  /dashboard/metrics       - System metrics');
        console.log('   • GET  /config                 - Configuration');
        console.log('   • POST /config                 - Update configuration');
        console.log('   • GET  /latency                - Latency data');
        console.log('   • GET  /patterns               - Pattern analysis');
        console.log('   • GET  /ai                     - AI analysis');
        console.log('   • GET  /system/status          - System status');
        console.log('   • GET  /system/health          - Health check');
        console.log('');
        console.log('🛠️  Management Commands:');
        console.log('   • status                       - Show server status');
        console.log('   • restart                      - Restart server');
        console.log('   • stop                         - Stop server');
        console.log('   • help                         - Show this help');
        console.log('');
        console.log('📝 Logs will appear below:');
        console.log('─'.repeat(50));
    }

    private getDefaultConfig(overrides: Partial<ServerConfig>): ServerConfig {
        return {
            port: 3000,
            host: 'localhost',
            enableCors: true,
            enableAuth: false,
            authToken: 'origin-token-2024',
            logLevel: 'info',
            ...overrides
        };
    }
}

// CLI handling
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const server = new OriginServer();

    switch (command) {
        case 'start':
            await server.start();
            
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.log('\n🛑 Received SIGINT, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            // Keep process alive
            process.stdin.resume();
            break;

        case 'stop':
            await server.stop();
            break;

        case 'restart':
            await server.restart();
            break;

        case 'status':
            server.getStatus();
            break;

        case 'help':
            console.log('🚀 Origin Server - Single Point of Entry');
            console.log('');
            console.log('Usage: bun start-origin-server.ts [command]');
            console.log('');
            console.log('Commands:');
            console.log('   start    - Start the Origin Server (default)');
            console.log('   stop     - Stop the Origin Server');
            console.log('   restart  - Restart the Origin Server');
            console.log('   status   - Show server status');
            console.log('   help     - Show this help message');
            console.log('');
            console.log('Environment Variables:');
            console.log('   PORT           - Server port (default: 3000)');
            console.log('   HOST           - Server host (default: localhost)');
            console.log('   ENABLE_CORS    - Enable CORS (default: true)');
            console.log('   ENABLE_AUTH    - Enable authentication (default: false)');
            console.log('   AUTH_TOKEN     - Authentication token');
            console.log('   LOG_LEVEL      - Log level (debug, info, warn, error)');
            console.log('');
            break;

        default:
            if (command && !command.startsWith('-')) {
                console.log(`❌ Unknown command: ${command}`);
                console.log('Run "bun start-origin-server.ts help" for available commands');
                process.exit(1);
            }
            
            // Default to start
            await server.start();
            
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.log('\n🛑 Received SIGINT, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            // Keep process alive
            process.stdin.resume();
            break;
    }
}

// Export for programmatic use
export { OriginServer };

// Run CLI if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ Origin Server error:', error);
        process.exit(1);
    });
}
