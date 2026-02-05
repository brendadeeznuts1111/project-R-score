/**
 * Health Check Integration Example
 * Shows how to integrate the comprehensive health check system into an Express application
 */

import express from 'express';
import { healthService } from '../services/health/health.service';
import healthRouter from './health-router';

// Example Express application with health checks integrated
export class HealthIntegratedApp {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthMonitoring();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Add health monitoring middleware
    this.app.use(this.healthMonitoringMiddleware());
  }

  private setupRoutes(): void {
    // Mount health check routes
    this.app.use('/api/health', healthRouter);

    // Example API routes with health monitoring
    this.app.get('/api/users', this.handleUsers);
    this.app.post('/api/users', this.handleCreateUser);
    this.app.get('/api/orders', this.handleOrders);

    // Main application routes
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Crystal Clear Architecture API',
        health: '/api/health',
        docs: '/api/health/comprehensive',
      });
    });
  }

  private setupHealthMonitoring(): void {
    // Periodic health checks
    setInterval(async () => {
      try {
        const health = await healthService.getBasicHealth();
        if (health.status !== 'healthy') {
          console.warn(`Health check warning: ${health.message}`);
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, performing graceful shutdown...');
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, performing graceful shutdown...');
      await this.gracefulShutdown();
    });
  }

  // Health monitoring middleware
  private healthMonitoringMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const startTime = Date.now();

      // Add response monitoring
      const originalSend = res.send;
      res.send = function (data: any) {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Record performance metrics
        healthService.recordPerformanceMetrics(responseTime, success);

        // Call original send method
        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Example route handlers with health monitoring
  private async handleUsers(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Simulate user data retrieval
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ];

      res.json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
      });
    }
  }

  private async handleCreateUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        res.status(400).json({
          success: false,
          error: 'Name and email are required',
        });
        return;
      }

      // Simulate user creation
      const newUser = {
        id: Date.now(),
        name,
        email,
        createdAt: new Date().toISOString(),
      };

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }

  private async handleOrders(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Simulate orders data
      const orders = [
        { id: 1, userId: 1, amount: 99.99, status: 'completed' },
        { id: 2, userId: 2, amount: 149.99, status: 'pending' },
      ];

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve orders',
      });
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('Performing health checks before shutdown...');

    try {
      const health = await healthService.getComprehensiveHealth();

      if (health.status === 'critical') {
        console.error('Critical health issues detected during shutdown!');
        console.error('Alerts:', health.alerts);
      } else {
        console.log('Health checks passed, proceeding with shutdown');
      }
    } catch (error) {
      console.error('Health check failed during shutdown:', error);
    }

    // Close database connections, etc.
    console.log('Shutdown complete');
    process.exit(0);
  }

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 Crystal Clear API server running on port ${port}`);
      console.log(`📊 Health checks available at http://localhost:${port}/api/health`);
      console.log(
        `📋 Comprehensive health report at http://localhost:${port}/api/health/comprehensive`
      );
      console.log(`📈 Prometheus metrics at http://localhost:${port}/api/health/metrics`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Usage example
if (require.main === module) {
  const app = new HealthIntegratedApp();
  app.start(3000);
}

export default HealthIntegratedApp;
