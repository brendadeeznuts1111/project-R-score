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
            console.info('⚠️  Origin Server is already running');
            return;
        }

        try {
            console.info('🚀 Starting Origin Server...');
            console.info(`📊 Port: ${this.config.port}`);
            console.info(`🌐 Host: ${this.config.host}`);
            console.info(`🔐 Authentication: ${this.config.enableAuth ? 'Enabled' : 'Disabled'}`);
            console.info(`🌍 CORS: ${this.config.enableCors ? 'Enabled' : 'Disabled'}`);

            // Initialize dashboard orchestrator
            console.info('🔧 Initializing dashboard orchestrator...');
            await dashboardOrchestrator.initialize({
                theme: 'origin',
                refreshInterval: 2000,
                enableAI: true,
                enableLatencyTracking: true,
                enablePatternAnalysis: true,
                enableCaching: true
            });

            // Start unified API
            console.info('🌐 Starting unified API...');
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
            console.info('⚠️  Origin Server is not running');
            return;
        }

        try {
            console.info('🛑 Stopping Origin Server...');
            
            // Stop unified API
            await unifiedAPI.stop();
            
            // Cleanup dashboard orchestrator
            dashboardOrchestrator.cleanup();
            
            this.isRunning = false;
            console.info('✅ Origin Server stopped successfully');
            
        } catch (error) {
            console.error('❌ Error stopping Origin Server:', error);
        }
    }

    public async restart(): Promise<void> {
        console.info('🔄 Restarting Origin Server...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.start();
    }

    public getStatus(): void {
        const status = unifiedAPI.getStatus();
        
        console.info('📊 Origin Server Status:');
        console.info(`   Running: ${status.data?.running ? '✅ Yes' : '❌ No'}`);
        console.info(`   Port: ${status.data?.port || 'N/A'}`);
        console.info(`   Uptime: ${status.data?.uptime ? `${Math.floor(status.data.uptime)}s` : 'N/A'}`);
        console.info(`   Requests: ${status.data?.requests || 0}`);
        console.info(`   Endpoints: ${status.data?.endpoints?.length || 0}`);
    }

    private displayStartupInfo(): void {
        console.info('');
        console.info('🎉 Origin Server started successfully!');
        console.info('');
        console.info('📊 Dashboard URLs:');
        console.info(`   • Main Dashboard: http://${this.config.host}:${this.config.port}`);
        console.info(`   • Origin Dashboard: http://${this.config.host}:${this.config.port}/origin-dashboard.html`);
        console.info(`   • API Documentation: http://${this.config.host}:${this.config.port}/api`);
        console.info('');
        console.info('🔗 Available Endpoints:');
        console.info('   • GET  /dashboard              - Main dashboard data');
        console.info('   • GET  /dashboard/metrics       - System metrics');
        console.info('   • GET  /config                 - Configuration');
        console.info('   • POST /config                 - Update configuration');
        console.info('   • GET  /latency                - Latency data');
        console.info('   • GET  /patterns               - Pattern analysis');
        console.info('   • GET  /ai                     - AI analysis');
        console.info('   • GET  /system/status          - System status');
        console.info('   • GET  /system/health          - Health check');
        console.info('');
        console.info('🛠️  Management Commands:');
        console.info('   • status                       - Show server status');
        console.info('   • restart                      - Restart server');
        console.info('   • stop                         - Stop server');
        console.info('   • help                         - Show this help');
        console.info('');
        console.info('📝 Logs will appear below:');
        console.info('─'.repeat(50));
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
                console.info('\n🛑 Received SIGINT, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.info('\n🛑 Received SIGTERM, shutting down gracefully...');
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
            console.info('🚀 Origin Server - Single Point of Entry');
            console.info('');
            console.info('Usage: bun start-origin-server.ts [command]');
            console.info('');
            console.info('Commands:');
            console.info('   start    - Start the Origin Server (default)');
            console.info('   stop     - Stop the Origin Server');
            console.info('   restart  - Restart the Origin Server');
            console.info('   status   - Show server status');
            console.info('   help     - Show this help message');
            console.info('');
            console.info('Environment Variables:');
            console.info('   PORT           - Server port (default: 3000)');
            console.info('   HOST           - Server host (default: localhost)');
            console.info('   ENABLE_CORS    - Enable CORS (default: true)');
            console.info('   ENABLE_AUTH    - Enable authentication (default: false)');
            console.info('   AUTH_TOKEN     - Authentication token');
            console.info('   LOG_LEVEL      - Log level (debug, info, warn, error)');
            console.info('');
            break;

        default:
            if (command && !command.startsWith('-')) {
                console.info(`❌ Unknown command: ${command}`);
                console.info('Run "bun start-origin-server.ts help" for available commands');
                process.exit(1);
            }
            
            // Default to start
            await server.start();
            
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.info('\n🛑 Received SIGINT, shutting down gracefully...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.info('\n🛑 Received SIGTERM, shutting down gracefully...');
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
