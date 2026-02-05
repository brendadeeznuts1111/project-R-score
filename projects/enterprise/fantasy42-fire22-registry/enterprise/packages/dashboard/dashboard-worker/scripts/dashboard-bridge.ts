#!/usr/bin/env bun

/**
 * Fire22 Dashboard Bridge
 *
 * This script creates a real-time bridge between the HTML dashboard
 * and the DashboardIntegration class, enabling live data exchange
 * and actual build execution.
 */

import { DashboardIntegration } from './dashboard-integration';
import { Server } from 'bun';

interface DashboardMessage {
  type: 'get_packages' | 'start_build' | 'stop_build' | 'build_package' | 'refresh' | 'get_status';
  data?: any;
  id?: string;
}

interface DashboardResponse {
  type: string;
  data: any;
  success: boolean;
  message?: string;
  id?: string;
}

class DashboardBridge {
  private integration: DashboardIntegration;
  private server: Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private buildStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle';
  private currentBuild: any = null;

  constructor() {
    this.integration = new DashboardIntegration();
    this.startWebSocketServer();
  }

  private startWebSocketServer() {
    const port = process.env.DASHBOARD_PORT || 3001;

    this.server = Bun.serve({
      port: parseInt(port.toString()),
      fetch: (req, server) => {
        const url = new URL(req.url);

        if (url.pathname === '/dashboard') {
          const success = server.upgrade(req);
          if (success) {
            console.log('🔌 Dashboard client connected');
          }
          return success ? undefined : new Response('Upgrade failed', { status: 500 });
        }

        if (url.pathname === '/api/packages') {
          return this.handlePackagesAPI();
        }

        if (url.pathname === '/api/build') {
          return this.handleBuildAPI(req);
        }

        if (url.pathname === '/api/status') {
          return this.handleStatusAPI();
        }

        return new Response('Not found', { status: 404 });
      },
      websocket: {
        open: ws => {
          this.clients.add(ws);
          console.log('📱 Dashboard WebSocket connected');
          this.sendToClient(ws, {
            type: 'connected',
            data: { message: 'Connected to Fire22 Dashboard Bridge' },
          });
        },
        message: (ws, message) => {
          this.handleWebSocketMessage(ws, message);
        },
        close: ws => {
          this.clients.delete(ws);
          console.log('📱 Dashboard WebSocket disconnected');
        },
      },
    });

    console.log(`🚀 Dashboard Bridge running on port ${port}`);
    console.log(`📱 WebSocket: ws://localhost:${port}/dashboard`);
    console.log(`🌐 HTTP API: http://localhost:${port}/api/*`);
  }

  private async handleWebSocketMessage(ws: WebSocket, message: string | Buffer) {
    try {
      const data: DashboardMessage = JSON.parse(message.toString());
      console.log('📨 Received message:', data.type);

      switch (data.type) {
        case 'get_packages':
          await this.handleGetPackages(ws, data);
          break;
        case 'start_build':
          await this.handleStartBuild(ws, data);
          break;
        case 'stop_build':
          await this.handleStopBuild(ws, data);
          break;
        case 'build_package':
          await this.handleBuildPackage(ws, data);
          break;
        case 'refresh':
          await this.handleRefresh(ws, data);
          break;
        case 'get_status':
          await this.handleGetStatus(ws, data);
          break;
        default:
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Unknown message type' },
            success: false,
            id: data.id,
          });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Invalid message format' },
        success: false,
      });
    }
  }

  private async handleGetPackages(ws: WebSocket, message: DashboardMessage) {
    try {
      const packages = await this.integration.getPackages();
      const stats = await this.integration.getPackageStatistics();

      this.sendToClient(ws, {
        type: 'packages_data',
        data: { packages, statistics: stats },
        success: true,
        id: message.id,
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: `Failed to get packages: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private async handleStartBuild(ws: WebSocket, message: DashboardMessage) {
    if (this.buildStatus === 'running') {
      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: 'Build already running' },
        success: false,
        id: message.id,
      });
      return;
    }

    try {
      this.buildStatus = 'running';
      this.currentBuild = {
        id: Date.now(),
        startTime: new Date(),
        steps: [],
      };

      // Broadcast build started
      this.broadcast({
        type: 'build_started',
        data: { buildId: this.currentBuild.id, startTime: this.currentBuild.startTime },
      });

      // Start the actual build process
      await this.executeRealBuild(ws, message.id);
    } catch (error) {
      this.buildStatus = 'error';
      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: `Build failed: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private async executeRealBuild(ws: WebSocket, messageId?: string) {
    try {
      const buildSteps = [
        { name: 'Pre-build Validation', action: () => this.integration.validateBuild() },
        { name: 'Version Management', action: () => this.integration.manageVersions() },
        { name: 'Dependency Analysis', action: () => this.integration.analyzeDependencies() },
        { name: 'Package Building', action: () => this.integration.buildPackages() },
        {
          name: 'Documentation Generation',
          action: () => this.integration.generateDocumentation(),
        },
        { name: 'Quality Checks', action: () => this.integration.runQualityChecks() },
        { name: 'Final Assembly', action: () => this.integration.assembleBuild() },
      ];

      for (let i = 0; i < buildSteps.length; i++) {
        const step = buildSteps[i];

        // Broadcast step started
        this.broadcast({
          type: 'build_step_started',
          data: {
            step: step.name,
            stepNumber: i + 1,
            totalSteps: buildSteps.length,
            buildId: this.currentBuild.id,
          },
        });

        // Execute the actual step
        await step.action();

        // Broadcast step completed
        this.broadcast({
          type: 'build_step_completed',
          data: {
            step: step.name,
            stepNumber: i + 1,
            totalSteps: buildSteps.length,
            buildId: this.currentBuild.id,
          },
        });

        // Update progress
        const progress = ((i + 1) / buildSteps.length) * 100;
        this.broadcast({
          type: 'build_progress',
          data: { progress, currentStep: step.name, buildId: this.currentBuild.id },
        });
      }

      // Build completed
      this.buildStatus = 'completed';
      this.currentBuild.endTime = new Date();
      this.currentBuild.duration =
        this.currentBuild.endTime.getTime() - this.currentBuild.startTime.getTime();

      this.broadcast({
        type: 'build_completed',
        data: {
          buildId: this.currentBuild.id,
          duration: this.currentBuild.duration,
          success: true,
        },
      });

      // Send final response to original client
      this.sendToClient(ws, {
        type: 'build_response',
        data: {
          message: 'Build completed successfully',
          buildId: this.currentBuild.id,
          duration: this.currentBuild.duration,
        },
        success: true,
        id: messageId,
      });
    } catch (error) {
      this.buildStatus = 'error';
      this.currentBuild.error = error.message;

      this.broadcast({
        type: 'build_error',
        data: {
          buildId: this.currentBuild.id,
          error: error.message,
        },
      });

      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: `Build failed: ${error.message}` },
        success: false,
        id: messageId,
      });
    }
  }

  private async handleStopBuild(ws: WebSocket, message: DashboardMessage) {
    if (this.buildStatus !== 'running') {
      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: 'No build running' },
        success: false,
        id: message.id,
      });
      return;
    }

    try {
      // Stop the build
      this.buildStatus = 'stopped';
      this.currentBuild.endTime = new Date();
      this.currentBuild.stopped = true;

      this.broadcast({
        type: 'build_stopped',
        data: { buildId: this.currentBuild.id },
      });

      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: 'Build stopped successfully' },
        success: true,
        id: message.id,
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'build_response',
        data: { message: `Failed to stop build: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private async handleBuildPackage(ws: WebSocket, message: DashboardMessage) {
    try {
      const { packageName } = message.data;

      this.broadcast({
        type: 'package_build_started',
        data: { packageName },
      });

      // Execute package build
      await this.integration.buildPackage(packageName);

      this.broadcast({
        type: 'package_build_completed',
        data: { packageName, success: true },
      });

      this.sendToClient(ws, {
        type: 'package_build_response',
        data: { message: `Package ${packageName} built successfully` },
        success: true,
        id: message.id,
      });
    } catch (error) {
      this.broadcast({
        type: 'package_build_error',
        data: { packageName: message.data.packageName, error: error.message },
      });

      this.sendToClient(ws, {
        type: 'package_build_response',
        data: { message: `Package build failed: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private async handleRefresh(ws: WebSocket, message: DashboardMessage) {
    try {
      // Refresh all data
      const packages = await this.integration.getPackages();
      const stats = await this.integration.getPackageStatistics();
      const status = await this.integration.getBuildStatus();

      this.sendToClient(ws, {
        type: 'refresh_response',
        data: { packages, statistics: stats, buildStatus: status },
        success: true,
        id: message.id,
      });

      // Broadcast refresh to all clients
      this.broadcast({
        type: 'data_refreshed',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: `Refresh failed: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private async handleGetStatus(ws: WebSocket, message: DashboardMessage) {
    try {
      const status = {
        buildStatus: this.buildStatus,
        currentBuild: this.currentBuild,
        integrationStatus: 'connected',
        timestamp: new Date().toISOString(),
      };

      this.sendToClient(ws, {
        type: 'status_response',
        data: status,
        success: true,
        id: message.id,
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: `Failed to get status: ${error.message}` },
        success: false,
        id: message.id,
      });
    }
  }

  private handlePackagesAPI(): Response {
    return new Response(
      JSON.stringify({
        message: 'Use WebSocket for real-time updates or GET /api/packages for static data',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private handleBuildAPI(req: Request): Response {
    return new Response(
      JSON.stringify({
        message: 'Use WebSocket for real-time build control',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private handleStatusAPI(): Response {
    return new Response(
      JSON.stringify({
        buildStatus: this.buildStatus,
        currentBuild: this.currentBuild,
        integrationStatus: 'connected',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private sendToClient(ws: WebSocket, message: DashboardResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: DashboardResponse) {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  // Public methods for external access
  public async getPackages() {
    return await this.integration.getPackages();
  }

  public async getPackageStatistics() {
    return await this.integration.getPackageStatistics();
  }

  public async getBuildStatus() {
    return {
      status: this.buildStatus,
      currentBuild: this.currentBuild,
    };
  }

  public async startBuild() {
    if (this.buildStatus === 'running') {
      throw new Error('Build already running');
    }

    this.buildStatus = 'running';
    this.currentBuild = {
      id: Date.now(),
      startTime: new Date(),
      steps: [],
    };

    // Start build in background
    this.executeRealBuild(null);
    return { buildId: this.currentBuild.id, startTime: this.currentBuild.startTime };
  }

  public async stopBuild() {
    if (this.buildStatus !== 'running') {
      throw new Error('No build running');
    }

    this.buildStatus = 'stopped';
    this.currentBuild.endTime = new Date();
    this.currentBuild.stopped = true;

    return { message: 'Build stopped successfully' };
  }
}

// Start the bridge if this script is run directly
if (import.meta.main) {
  console.log('🔥 Starting Fire22 Dashboard Bridge...');

  const bridge = new DashboardBridge();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Dashboard Bridge...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Dashboard Bridge...');
    process.exit(0);
  });

  console.log('✅ Dashboard Bridge is running and ready for connections');
}

export { DashboardBridge };
