import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { Server } from 'http';
import { config } from '../config/api-config';
import { errorHandler } from '../middleware/error-handler';
import { requestLogger } from '../middleware/request-logger';
import { setupSwagger } from '../docs/swagger-setup';
import { apiRouter } from '../routes/api-router';
import { databaseService } from '../../database/services/database-service';

export class BettingWorkflowAPIServer {
  private app: express.Application;
  private server: Server | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupDocumentation();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: config.rateLimit.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/api/', limiter);

    // Request logging
    this.app.use(requestLogger);

    // Health checks
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await databaseService.healthCheck();

        const health = {
          status: (dbHealth.connected && dbHealth.redis.connected) ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          version: config.version,
          uptime: process.uptime(),
          database: {
            connected: dbHealth.connected,
            migrations: dbHealth.migrations,
            status: dbHealth.status
          },
          redis: {
            connected: dbHealth.redis.connected,
            status: dbHealth.redis.status
          }
        };

        res.status(dbHealth.connected ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: config.version,
          uptime: process.uptime(),
          error: 'Health check failed'
        });
      }
    });

    // Database stats endpoint (admin only)
    this.app.get('/admin/stats', async (req, res) => {
      try {
        const stats = await databaseService.getStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'STATS_ERROR',
            message: 'Failed to retrieve database statistics'
          },
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private setupRoutes(): void {
    // API versioning with authentication middleware
    this.app.use('/api/v1', (req, res, next) => {
      // Placeholder for authentication middleware mounting
      next();
    }, apiRouter);

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Betting Platform Workflow API',
        version: 'v1',
        documentation: '/api-docs',
        health: '/health'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: [
          'GET /api/v1/workflows',
          'POST /api/v1/workflows',
          'GET /api/v1/workflows/:id',
          'POST /api/v1/workflows/:id/approve',
          'POST /api/v1/workflows/:id/reject'
        ]
      });
    });
  }

  private setupDocumentation(): void {
    const swaggerSpec = setupSwagger();
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Betting Workflow API Documentation'
    }));
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await databaseService.initialize();

      // Run migrations if needed (in development)
      if (config.environment === 'development') {
        try {
          await databaseService.runMigrations();
          console.log('🗃️ Database migrations completed');
        } catch (error) {
          console.warn('⚠️ Migration warning (may already exist):', error instanceof Error ? error.message : String(error));
        }
      }

      return new Promise((resolve, reject) => {
        this.server = this.app.listen(config.port, config.host, () => {
          console.log(`🚀 Betting Workflow API Server running on ${config.host}:${config.port}`);
          console.log(`📚 API Documentation: http://${config.host}:${config.port}/api-docs`);
          console.log(`❤️  Health Check: http://${config.host}:${config.port}/health`);
          console.log(`📊 Admin Stats: http://${config.host}:${config.port}/admin/stats`);
          resolve();
        });

        this.server.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
