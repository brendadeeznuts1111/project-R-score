# 🚀 **API WRAPPER DESIGN FOR BETTING PLATFORM WORKFLOW SYSTEM**

I'll help you build a comprehensive API wrapper around your betting platform workflow system. Let's start with the foundational architecture and build it step by step.

## 🏗️ **API Architecture Foundation**

```typescript
// api/core/api-server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config/api-config';
import { errorHandler } from '../middleware/error-handler';
import { requestLogger } from '../middleware/request-logger';
import { authMiddleware } from '../middleware/auth-middleware';
import { apiRouter } from '../routes/api-router';
import { setupSwagger } from '../docs/swagger-setup';

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

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.version,
        uptime: process.uptime()
      });
    });
  }

  private setupRoutes(): void {
    // API versioning
    this.app.use('/api/v1', authMiddleware, apiRouter);
    
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
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, config.host, () => {
        console.log(`🚀 Betting Workflow API Server running on ${config.host}:${config.port}`);
        console.log(`📚 API Documentation: http://${config.host}:${config.port}/api-docs`);
        console.log(`❤️  Health Check: http://${config.host}:${config.port}/health`);
        resolve();
      });

      this.server.on('error', reject);
    });
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
```

## 📋 **API Configuration & Environment Setup**

```typescript
// api/config/api-config.ts
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  // Server configuration
  port: parseInt(process.env.API_PORT || '3000'),
  host: process.env.API_HOST || '0.0.0.0',
  version: process.env.API_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  // Security configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  apiKeySecret: process.env.API_KEY_SECRET || 'api-key-secret',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000')
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'betting_workflows',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },

  // External API configuration
  bettingPlatform: {
    baseUrl: process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro',
    apiKey: process.env.BETTING_API_KEY || '',
    timeout: parseInt(process.env.BETTING_API_TIMEOUT || '30000')
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
  }
};
```

## 🔐 **Authentication & Authorization**

```typescript
// api/middleware/auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/api-config';
import { ApiKeyService } from '../services/api-key-service';
import { RateLimiterService } from '../services/rate-limiter-service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header required'
      });
    }

    // Handle Bearer token (JWT)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          permissions: decoded.permissions
        };
        
        // Check rate limit for user
        const rateLimitOK = await RateLimiterService.checkUserLimit(decoded.userId);
        if (!rateLimitOK) {
          return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: 'Too many requests for this user'
          });
        }
        
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid Token',
          message: 'Token is invalid or expired'
        });
      }
    }
    
    // Handle API Key
    else if (authHeader.startsWith('ApiKey ')) {
      const apiKey = authHeader.substring(7);
      
      const keyValidation = await ApiKeyService.validateApiKey(apiKey);
      if (!keyValidation.isValid) {
        return res.status(401).json({
          error: 'Invalid API Key',
          message: 'API key is invalid or expired'
        });
      }
      
      req.apiKey = keyValidation.apiKey;
      
      // Check rate limit for API key
      const rateLimitOK = await RateLimiterService.checkApiKeyLimit(keyValidation.apiKey.id);
      if (!rateLimitOK) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests for this API key'
        });
      }
    }
    
    else {
      return res.status(401).json({
        error: 'Invalid Authorization',
        message: 'Authorization header must be Bearer token or ApiKey'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service unavailable'
    });
  }
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient Privileges',
        message: `Role ${req.user.role} is not authorized for this operation`
      });
    }

    next();
  };
}

// Permission-based authorization middleware
export function requirePermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];
    
    const hasPermission = permissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: `Missing required permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
}
```

## 🎯 **Core API Routes**

```typescript
// api/routes/workflow-routes.ts
import { Router } from 'express';
import { AuthenticatedRequest, requireRole, requirePermission } from '../middleware/auth-middleware';
import { WorkflowController } from '../controllers/workflow-controller';
import { validateWorkflowCreation, validateWorkflowUpdate } from '../validation/workflow-validation';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const workflowController = new WorkflowController();

// Workflow management routes
router.post(
  '/workflows',
  requirePermission(['workflows:create']),
  validateWorkflowCreation,
  asyncHandler(workflowController.createWorkflow)
);

router.get(
  '/workflows',
  requirePermission(['workflows:read']),
  asyncHandler(workflowController.getWorkflows)
);

router.get(
  '/workflows/:id',
  requirePermission(['workflows:read']),
  asyncHandler(workflowController.getWorkflowById)
);

router.put(
  '/workflows/:id',
  requirePermission(['workflows:update']),
  validateWorkflowUpdate,
  asyncHandler(workflowController.updateWorkflow)
);

router.delete(
  '/workflows/:id',
  requireRole(['admin', 'manager']),
  requirePermission(['workflows:delete']),
  asyncHandler(workflowController.deleteWorkflow)
);

// Workflow action routes
router.post(
  '/workflows/:id/start',
  requirePermission(['workflows:execute']),
  asyncHandler(workflowController.startWorkflow)
);

router.post(
  '/workflows/:id/approve',
  requirePermission(['workflows:approve']),
  asyncHandler(workflowController.approveStep)
);

router.post(
  '/workflows/:id/reject',
  requirePermission(['workflows:reject']),
  asyncHandler(workflowController.rejectStep)
);

router.post(
  '/workflows/:id/cancel',
  requirePermission(['workflows:cancel']),
  asyncHandler(workflowController.cancelWorkflow)
);

// Workflow monitoring routes
router.get(
  '/workflows/:id/status',
  requirePermission(['workflows:monitor']),
  asyncHandler(workflowController.getWorkflowStatus)
);

router.get(
  '/workflows/:id/history',
  requirePermission(['workflows:audit']),
  asyncHandler(workflowController.getWorkflowHistory)
);

router.get(
  '/workflows/:id/audit',
  requireRole(['admin', 'auditor']),
  requirePermission(['workflows:audit']),
  asyncHandler(workflowController.getAuditTrail)
);

// Bulk operations
router.post(
  '/workflows/bulk/approve',
  requirePermission(['workflows:approve']),
  asyncHandler(workflowController.bulkApprove)
);

router.post(
  '/workflows/bulk/export',
  requirePermission(['workflows:export']),
  asyncHandler(workflowController.exportWorkflows)
);

export default router;
```

## 📊 **Advanced Controller Implementation**

```typescript
// api/controllers/workflow-controller.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { WorkflowManager } from '../../modules/workflow-manager';
import { BettingPlatformWorkflowIntegration } from '../../modules/betting-platform-integration';
import { ApiResponse, WorkflowResponse, ErrorResponse } from '../types/api-types';
import { logger } from '../utils/logger';

export class WorkflowController {
  private workflowManager: WorkflowManager;
  private bettingIntegration: BettingPlatformWorkflowIntegration;

  constructor() {
    this.workflowManager = new WorkflowManager();
    this.bettingIntegration = new BettingPlatformWorkflowIntegration({
      baseUrl: process.env.BETTING_API_URL!,
      authToken: process.env.BETTING_API_KEY!
    });
  }

  // Create new workflow
  async createWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowType, data, priority = 'medium' } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Creating workflow', { workflowType, userId, priority });

      // Use betting platform integration if workflow type matches
      let instance;
      if (this.isBettingPlatformWorkflow(workflowType)) {
        instance = await this.bettingIntegration.handleContentSubmission({
          ...data,
          submittedBy: userId,
          priority
        });
      } else {
        instance = await this.workflowManager.startWorkflow(workflowType, userId, data);
      }

      const response: ApiResponse<WorkflowResponse> = {
        success: true,
        data: this.formatWorkflowResponse(instance),
        message: 'Workflow created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create workflow', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Get workflows with filtering and pagination
  async getWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        priority,
        startDate,
        endDate,
        assignee
      } = req.query;

      const filters = {
        status: status as string,
        type: type as string,
        priority: priority as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        assignee: assignee as string
      };

      const result = await this.workflowManager.getWorkflows({
        page: Number(page),
        limit: Number(limit),
        filters
      });

      const response: ApiResponse<PaginatedResponse<WorkflowResponse>> = {
        success: true,
        data: {
          items: result.items.map(this.formatWorkflowResponse),
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(result.total / Number(limit))
        },
        message: 'Workflows retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get workflows', { error, query: req.query });
      this.handleError(error, res);
    }
  }

  // Approve workflow step
  async approveStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comments, stepId = 'current' } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Approving workflow step', { workflowId: id, userId, stepId });

      await this.workflowManager.handleApproval(id, stepId, userId, 'approved', comments);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Workflow step approved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to approve workflow step', { error, workflowId: req.params.id });
      this.handleError(error, res);
    }
  }

  // Bulk operations
  async bulkApprove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowIds, comments } = req.body;
      const userId = req.user?.id || req.apiKey?.id || 'system';

      logger.info('Bulk approving workflows', { workflowIds, userId });

      const results = await Promise.allSettled(
        workflowIds.map((id: string) => 
          this.workflowManager.handleApproval(id, 'current', userId, 'approved', comments)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const response: ApiResponse<BulkOperationResult> = {
        success: failed === 0,
        data: {
          successful,
          failed,
          total: workflowIds.length
        },
        message: `Bulk operation completed: ${successful} successful, ${failed} failed`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to bulk approve workflows', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Export workflows
  async exportWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { format = 'json', filters = {} } = req.body;

      logger.info('Exporting workflows', { format, filters });

      const workflows = await this.workflowManager.getWorkflowsForExport(filters);
      let exportData: Buffer | string;

      switch (format) {
        case 'csv':
          exportData = await this.exportToCSV(workflows);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="workflows.csv"');
          break;
        
        case 'xlsx':
          exportData = await this.exportToExcel(workflows);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="workflows.xlsx"');
          break;
        
        case 'json':
        default:
          exportData = JSON.stringify(workflows, null, 2);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="workflows.json"');
          break;
      }

      res.send(exportData);
    } catch (error) {
      logger.error('Failed to export workflows', { error, body: req.body });
      this.handleError(error, res);
    }
  }

  // Helper methods
  private formatWorkflowResponse(instance: WorkflowInstance): WorkflowResponse {
    return {
      id: instance.id,
      workflowId: instance.workflowId,
      status: instance.status,
      currentStep: instance.currentStep,
      createdBy: instance.createdBy,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
      data: instance.data,
      progress: this.calculateProgress(instance),
      estimatedCompletion: this.estimateCompletion(instance),
      approvals: Array.from(instance.approvals.entries()).map(([key, approval]) => ({
        stepId: approval.stepId,
        approver: approval.approver,
        status: approval.status,
        comments: approval.comments,
        decidedAt: approval.decidedAt?.toISOString()
      }))
    };
  }

  private calculateProgress(instance: WorkflowInstance): number {
    const totalSteps = this.workflowManager.getTotalSteps(instance.workflowId);
    const currentStepIndex = this.workflowManager.getCurrentStepIndex(instance);
    return totalSteps > 0 ? Math.round((currentStepIndex / totalSteps) * 100) : 0;
  }

  private estimateCompletion(instance: WorkflowInstance): string | null {
    // Implementation for completion estimation
    return null;
  }

  private handleError(error: any, res: Response): void {
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An internal error occurred',
        details: error.details || null
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(errorResponse);
  }
}
```

## 📚 **API Documentation (OpenAPI/Swagger)**

```yaml
# api/docs/swagger.yaml
openapi: 3.0.0
info:
  title: Betting Platform Workflow API
  description: Enterprise-grade API for managing betting platform workflows with AI-powered approvals
  version: 1.0.0
  contact:
    name: API Support
    email: api@bettingplatform.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000/api/v1
    description: Development server
  - url: https://api.bettingplatform.com/v1
    description: Production server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  /workflows:
    get:
      summary: Get workflows with filtering
      description: Retrieve workflows with pagination and filtering options
      tags:
        - Workflows
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
          description: Page number for pagination
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
            maximum: 100
          description: Number of items per page
        - in: query
          name: status
          schema:
            type: string
            enum: [pending, in_progress, completed, rejected, cancelled]
          description: Filter by workflow status
        - in: query
          name: type
          schema:
            type: string
          description: Filter by workflow type
        - in: query
          name: priority
          schema:
            type: string
            enum: [low, medium, high, critical]
          description: Filter by priority level
        - in: query
          name: startDate
          schema:
            type: string
            format: date-time
          description: Filter workflows created after this date
        - in: query
          name: endDate
          schema:
            type: string
            format: date-time
          description: Filter workflows created before this date
      responses:
        '200':
          description: Successfully retrieved workflows
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkflowListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: Create new workflow
      description: Create a new workflow instance with specified type and data
      tags:
        - Workflows
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWorkflowRequest'
      responses:
        '201':
          description: Workflow created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkflowResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /workflows/{id}:
    get:
      summary: Get workflow by ID
      description: Retrieve detailed information about a specific workflow
      tags:
        - Workflows
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
          description: Workflow instance ID
      responses:
        '200':
          description: Workflow found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkflowResponse'
        '404':
          $ref: '#/components/responses/NotFound'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /workflows/{id}/approve:
    post:
      summary: Approve workflow step
      description: Approve the current step in a workflow
      tags:
        - Workflow Actions
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
          description: Workflow instance ID
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                comments:
                  type: string
                  description: Approval comments
                stepId:
                  type: string
                  description: Specific step ID (optional, defaults to current step)
      responses:
        '200':
          description: Approval successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: Authorization
      description: Use format "ApiKey your-api-key-here"

  schemas:
    WorkflowResponse:
      type: object
      properties:
        id:
          type: string
          description: Workflow instance ID
        workflowId:
          type: string
          description: Workflow type ID
        status:
          type: string
          enum: [pending, in_progress, completed, rejected, cancelled]
        currentStep:
          type: string
          description: Current step ID
        createdBy:
          type: string
          description: User who created the workflow
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        data:
          type: object
          description: Workflow-specific data
        progress:
          type: integer
          description: Progress percentage (0-100)
        approvals:
          type: array
          items:
            $ref: '#/components/schemas/Approval'
```

## 🚀 **Getting Started Guide**

### **Step 1: Installation & Setup**
```bash
# Create project directory
mkdir betting-workflow-api
cd betting-workflow-api

# Initialize npm project
npm init -y

# Install dependencies
npm install express cors helmet compression dotenv winston jsonwebtoken bcryptjs
npm install --save-dev typescript @types/express @types/node nodemon ts-node

# Install additional dependencies
npm install swagger-ui-express swagger-jsdoc
npm install rate-limit-redis express-rate-limit
npm install pg redis
npm install joi celebrate
npm install uuid
```

### **Step 2: Environment Configuration**
```bash
# Create .env file
cat > .env << EOL
# Server Configuration
NODE_ENV=development
API_PORT=3000
API_HOST=0.0.0.0
API_VERSION=1.0.0

# Security
JWT_SECRET=your-super-secret-jwt-key
API_KEY_SECRET=your-api-key-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=betting_workflows
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Betting Platform Integration
BETTING_API_URL=https://plive.sportswidgets.pro
BETTING_API_KEY=your-betting-platform-api-key
BETTING_API_TIMEOUT=30000

# Monitoring
MONITORING_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
EOL
```

### **Step 3: Package.json Scripts**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/api/server.ts",
    "build": "tsc",
    "start": "node dist/api/server.js",
    "start:prod": "NODE_ENV=production node dist/api/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "docs": "swagger-jsdoc -d swaggerDef.js src/routes/*.ts -o swagger.json"
  }
}
```

### **Step 4: Basic API Usage Examples**

```typescript
// examples/api-usage.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authentication interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example 1: Create a content publishing workflow
async function createContentWorkflow() {
  try {
    const response = await api.post('/workflows', {
      workflowType: 'content_publishing',
      priority: 'high',
      data: {
        title: 'New Featured Bets for Premier League',
        contentType: 'featured_bets',
        jurisdiction: 'UK',
        financialImpact: 50000,
        contentId: 'featured-bets-pl-2024',
        markets: ['match_winner', 'over_under', 'both_teams_to_score']
      }
    });

    console.log('Workflow created:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create workflow:', error.response?.data);
    throw error;
  }
}

// Example 2: Approve a workflow step
async function approveWorkflow(workflowId: string, comments: string) {
  try {
    const response = await api.post(`/workflows/${workflowId}/approve`, {
      comments: comments || 'Approved after review'
    });

    console.log('Workflow approved:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to approve workflow:', error.response?.data);
    throw error;
  }
}

// Example 3: Get workflows with filtering
async function getWorkflows(status = 'in_progress', limit = 20) {
  try {
    const response = await api.get('/workflows', {
      params: {
        status,
        limit,
        page: 1,
        priority: 'high'
      }
    });

    console.log(`Found ${response.data.data.total} workflows`);
    return response.data.data.items;
  } catch (error) {
    console.error('Failed to get workflows:', error.response?.data);
    throw error;
  }
}

// Example 4: Handle betting platform integration
async function createLineChangeWorkflow(lineData: any) {
  try {
    const response = await api.post('/workflows', {
      workflowType: 'line_change_approval',
      priority: 'critical',
      data: {
        lineId: lineData.lineId,
        eventName: lineData.eventName,
        oldOdds: lineData.oldOdds,
        newOdds: lineData.newOdds,
        marketType: lineData.marketType,
        financialImpact: lineData.financialImpact,
        requestedBy: 'live-betting-system'
      }
    });

    console.log('Line change workflow created:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create line change workflow:', error.response?.data);
    throw error;
  }
}

// Example usage
async function runExamples() {
  try {
    // Create a content workflow
    const workflow = await createContentWorkflow();
    console.log('Created workflow with ID:', workflow.id);

    // Get all active workflows
    const activeWorkflows = await getWorkflows('in_progress');
    console.log(`Found ${activeWorkflows.length} active workflows`);

    // Approve the workflow
    await approveWorkflow(workflow.id, 'Content reviewed and approved for publication');

    // Create a line change workflow (simulating live betting)
    await createLineChangeWorkflow({
      lineId: 'line-12345',
      eventName: 'Manchester United vs Liverpool',
      oldOdds: '2.50',
      newOdds: '2.20',
      marketType: 'match_winner',
      financialImpact: 75000
    });

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples
runExamples();
```

# 📋 **Next Steps for Full Implementation**

## 🗃️ **DATABASE INTEGRATION - POSTGRESQL & REDIS SETUP**

Let's implement a complete database layer for your betting platform API with PostgreSQL for persistent storage and Redis for caching and session management!

## 🗄️ **PostgreSQL Database Schema Design**

```sql
-- Create database
CREATE DATABASE betting_workflows;
\c betting_workflows;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys for service-to-service authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow definitions (templates)
CREATE TABLE workflow_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow instances
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_definition_id VARCHAR(100) REFERENCES workflow_definitions(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_step_id VARCHAR(100),
    created_by UUID REFERENCES users(id),
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium',
    topic_id BIGINT,
    pinned_message_id BIGINT,
    timeout_minutes INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow approvals
CREATE TABLE workflow_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    approver_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    comments TEXT,
    decided_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow timeline/audit trail
CREATE TABLE workflow_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    step_id VARCHAR(100),
    user_id UUID REFERENCES users(id),
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Betting platform specific tables
CREATE TABLE betting_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    jurisdiction VARCHAR(50),
    financial_impact DECIMAL(15,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE betting_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    line_id VARCHAR(255) NOT NULL,
    event_name VARCHAR(500) NOT NULL,
    sport VARCHAR(100),
    league VARCHAR(200),
    market_type VARCHAR(100),
    old_odds VARCHAR(50),
    new_odds VARCHAR(50),
    odds_change_percentage DECIMAL(5,2),
    total_exposure DECIMAL(15,2) DEFAULT 0,
    risk_level VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management for Redis fallback
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_created_by ON workflow_instances(created_by);
CREATE INDEX idx_workflow_instances_priority ON workflow_instances(priority);
CREATE INDEX idx_workflow_instances_created_at ON workflow_instances(created_at);
CREATE INDEX idx_workflow_approvals_workflow_id ON workflow_approvals(workflow_instance_id);
CREATE INDEX idx_workflow_approvals_approver ON workflow_approvals(approver_id);
CREATE INDEX idx_workflow_timeline_workflow_id ON workflow_timeline(workflow_instance_id);
CREATE INDEX idx_workflow_timeline_event_type ON workflow_timeline(event_type);
CREATE INDEX idx_workflow_timeline_created_at ON workflow_timeline(created_at);
CREATE INDEX idx_betting_content_workflow_id ON betting_content(workflow_instance_id);
CREATE INDEX idx_betting_content_content_id ON betting_content(content_id);
CREATE INDEX idx_betting_lines_workflow_id ON betting_lines(workflow_instance_id);
CREATE INDEX idx_betting_lines_line_id ON betting_lines(line_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_betting_content_updated_at BEFORE UPDATE ON betting_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_betting_lines_updated_at BEFORE UPDATE ON betting_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔌 **Database Connection & Models**

```typescript
// database/connection.ts
import { Pool, PoolConfig } from 'pg';
import { config } from '../config/database-config';
import { logger } from '../utils/logger';

export class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
      ssl: config.ssl.enabled ? {
        rejectUnauthorized: config.ssl.rejectUnauthorized
      } : false
    };

    this.pool = new Pool(poolConfig);

    // Connection event handlers
    this.pool.on('connect', (client) => {
      logger.info('New database connection established');
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error', err);
    });

    this.pool.on('remove', (client) => {
      logger.info('Database connection removed');
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;
      
      logger.debug('Database query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      logger.error('Database query failed', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database transaction failed', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length === 1;
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}
```

## 📊 **Data Models with TypeORM**

```typescript
// database/entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { WorkflowInstance } from './WorkflowInstance';
import { ApiKey } from './ApiKey';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 50, default: 'user' })
  role: string;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WorkflowInstance, instance => instance.createdBy)
  workflows: WorkflowInstance[];

  @OneToMany(() => ApiKey, key => key.user)
  apiKeys: ApiKey[];

  // Helper methods
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  hasRole(role: string): boolean {
    return this.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.role);
  }

  toJSON() {
    const { passwordHash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
```

```typescript
// database/entities/WorkflowInstance.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, 
         ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from './User';
import { WorkflowApproval } from './WorkflowApproval';
import { WorkflowTimeline } from './WorkflowTimeline';
import { BettingContent } from './BettingContent';
import { BettingLine } from './BettingLine';

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
export type WorkflowPriority = 'low' | 'medium' | 'high' | 'critical';

@Entity('workflow_instances')
@Index(['status'])
@Index(['createdBy'])
@Index(['priority'])
@Index(['createdAt'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_definition_id' })
  workflowDefinitionId: string;

  @Column({ type: 'enum', enum: ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'], default: 'pending' })
  status: WorkflowStatus;

  @Column({ name: 'current_step_id', nullable: true })
  currentStepId: string;

  @ManyToOne(() => User, user => user.workflows)
  @Index()
  createdBy: User;

  @Column({ type: 'jsonb', default: {} })
  data: any;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  @Index()
  priority: WorkflowPriority;

  @Column({ name: 'topic_id', type: 'bigint', nullable: true })
  topicId: number;

  @Column({ name: 'pinned_message_id', type: 'bigint', nullable: true })
  pinnedMessageId: number;

  @Column({ name: 'timeout_minutes', type: 'integer', nullable: true })
  timeoutMinutes: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WorkflowApproval, approval => approval.workflowInstance)
  approvals: WorkflowApproval[];

  @OneToMany(() => WorkflowTimeline, timeline => timeline.workflowInstance)
  timeline: WorkflowTimeline[];

  @OneToMany(() => BettingContent, content => content.workflowInstance)
  bettingContent: BettingContent[];

  @OneToMany(() => BettingLine, line => line.workflowInstance)
  bettingLines: BettingLine[];

  // Business logic methods
  isPending(): boolean {
    return this.status === 'pending';
  }

  isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  canTransitionTo(newStatus: WorkflowStatus): boolean {
    const transitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'rejected', 'cancelled'],
      'completed': [],
      'rejected': [],
      'cancelled': []
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }

  getProgress(steps: string[]): number {
    if (!steps || steps.length === 0) return 0;
    const currentIndex = steps.indexOf(this.currentStepId);
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;
  }

  isOverdue(): boolean {
    if (!this.timeoutMinutes || !this.startedAt) return false;
    const deadline = new Date(this.startedAt.getTime() + this.timeoutMinutes * 60000);
    return new Date() > deadline;
  }
}
```

## 🔧 **Repository Pattern Implementation**

```typescript
// database/repositories/WorkflowRepository.ts
import { Repository, EntityManager } from 'typeorm';
import { WorkflowInstance } from '../entities/WorkflowInstance';
import { WorkflowApproval } from '../entities/WorkflowApproval';
import { WorkflowTimeline } from '../entities/WorkflowTimeline';
import { BettingContent } from '../entities/BettingContent';
import { BettingLine } from '../entities/BettingLine';

export interface WorkflowFilters {
  status?: string;
  type?: string;
  priority?: string;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
  assignee?: string;
  bettingCategory?: string;
  financialImpactMin?: number;
  financialImpactMax?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class WorkflowRepository {
  constructor(
    private workflowRepo: Repository<WorkflowInstance>,
    private approvalRepo: Repository<WorkflowApproval>,
    private timelineRepo: Repository<WorkflowTimeline>,
    private contentRepo: Repository<BettingContent>,
    private lineRepo: Repository<BettingLine>,
    private entityManager: EntityManager
  ) {}

  async create(data: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    return await this.entityManager.transaction(async transactionalEntityManager => {
      // Create workflow
      const workflow = transactionalEntityManager.create(WorkflowInstance, data);
      const savedWorkflow = await transactionalEntityManager.save(workflow);

      // Create initial timeline event
      const timelineEvent = transactionalEntityManager.create(WorkflowTimeline, {
        workflowInstance: savedWorkflow,
        eventType: 'workflow_created',
        userId: data.createdBy?.id,
        data: { initialData: data.data }
      });
      await transactionalEntityManager.save(timelineEvent);

      // Create betting content if applicable
      if (data.data?.contentType) {
        const bettingContent = transactionalEntityManager.create(BettingContent, {
          workflowInstance: savedWorkflow,
          contentType: data.data.contentType,
          contentId: data.data.contentId,
          title: data.data.title,
          jurisdiction: data.data.jurisdiction,
          financialImpact: data.data.financialImpact || 0,
          metadata: data.data.metadata || {}
        });
        await transactionalEntityManager.save(bettingContent);
      }

      return savedWorkflow;
    });
  }

  async findById(id: string): Promise<WorkflowInstance | null> {
    return await this.workflowRepo.findOne({
      where: { id },
      relations: [
        'createdBy',
        'approvals',
        'approvals.approver',
        'timeline',
        'bettingContent',
        'bettingLines'
      ]
    });
  }

  async findWithFilters(
    filters: WorkflowFilters,
    pagination: PaginationOptions
  ): Promise<{ items: WorkflowInstance[]; total: number }> {
    const queryBuilder = this.workflowRepo
      .createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.createdBy', 'createdBy')
      .leftJoinAndSelect('workflow.approvals', 'approvals')
      .leftJoinAndSelect('approvals.approver', 'approver')
      .leftJoinAndSelect('workflow.bettingContent', 'bettingContent')
      .leftJoinAndSelect('workflow.bettingLines', 'bettingLines');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('workflow.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('workflow.priority = :priority', { priority: filters.priority });
    }

    if (filters.createdBy) {
      queryBuilder.andWhere('workflow.createdBy.id = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('workflow.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('workflow.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.bettingCategory) {
      queryBuilder.andWhere('bettingContent.contentType = :category', { category: filters.bettingCategory });
    }

    if (filters.financialImpactMin !== undefined) {
      queryBuilder.andWhere('bettingContent.financialImpact >= :minImpact', { minImpact: filters.financialImpactMin });
    }

    if (filters.financialImpactMax !== undefined) {
      queryBuilder.andWhere('bettingContent.financialImpact <= :maxImpact', { maxImpact: filters.financialImpactMax });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const items = await queryBuilder
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .orderBy('workflow.createdAt', 'DESC')
      .getMany();

    return { items, total };
  }

  async updateStatus(id: string, status: string, userId?: string): Promise<WorkflowInstance | null> {
    return await this.entityManager.transaction(async transactionalEntityManager => {
      const workflow = await transactionalEntityManager.findOne(WorkflowInstance, {
        where: { id },
        relations: ['createdBy']
      });

      if (!workflow) return null;

      // Update status
      workflow.status = status as any;
      if (status === 'completed' || status === 'rejected') {
        workflow.completedAt = new Date();
      }
      
      await transactionalEntityManager.save(workflow);

      // Create timeline event
      const timelineEvent = transactionalEntityManager.create(WorkflowTimeline, {
        workflowInstance: workflow,
        eventType: 'status_changed',
        userId: userId,
        data: { newStatus: status, oldStatus: workflow.status }
      });
      await transactionalEntityManager.save(timelineEvent);

      return workflow;
    });
  }

  async addApproval(
    workflowId: string,
    stepId: string,
    userId: string,
    status: string,
    comments?: string
  ): Promise<WorkflowApproval> {
    return await this.entityManager.transaction(async transactionalEntityManager => {
      // Create approval record
      const approval = transactionalEntityManager.create(WorkflowApproval, {
        workflowInstance: { id: workflowId },
        stepId,
        approver: { id: userId },
        status,
        comments,
        decidedAt: new Date()
      });
      
      const savedApproval = await transactionalEntityManager.save(approval);

      // Create timeline event
      const timelineEvent = transactionalEntityManager.create(WorkflowTimeline, {
        workflowInstance: { id: workflowId },
        eventType: 'approval_submitted',
        stepId,
        userId,
        data: { status, comments }
      });
      await transactionalEntityManager.save(timelineEvent);

      return savedApproval;
    });
  }

  async getWorkflowAnalytics(workflowId: string, period: string): Promise<any> {
    const startDate = this.calculatePeriodStartDate(period);
    
    const analytics = await this.entityManager
      .createQueryBuilder(WorkflowTimeline, 'timeline')
      .select([
        'timeline.event_type as event_type',
        'COUNT(*) as count',
        'AVG(EXTRACT(EPOCH FROM (timeline.created_at - workflow.created_at))) as avg_time_seconds'
      ])
      .leftJoin('timeline.workflowInstance', 'workflow')
      .where('workflow.id = :workflowId', { workflowId })
      .andWhere('timeline.created_at >= :startDate', { startDate })
      .groupBy('timeline.event_type')
      .getRawMany();

    const approvalStats = await this.entityManager
      .createQueryBuilder(WorkflowApproval, 'approval')
      .select([
        'approval.status as status',
        'COUNT(*) as count',
        'AVG(EXTRACT(EPOCH FROM (approval.decided_at - workflow.created_at))) as avg_decision_time_seconds'
      ])
      .leftJoin('approval.workflowInstance', 'workflow')
      .where('workflow.id = :workflowId', { workflowId })
      .andWhere('approval.decided_at >= :startDate', { startDate })
      .groupBy('approval.status')
      .getRawMany();

    return {
      period,
      startDate: startDate.toISOString(),
      events: analytics,
      approvals: approvalStats,
      totalTimelineEvents: analytics.reduce((sum, item) => sum + parseInt(item.count), 0)
    };
  }

  private calculatePeriodStartDate(period: string): Date {
    const now = new Date();
    const periodMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodMap[period] || 7;
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }
}
```

## ⚡ **Redis Integration for Caching**

```typescript
// database/redis-client.ts
import Redis from 'ioredis';
import { config } from '../config/redis-config';
import { logger } from '../utils/logger';

export class RedisClient {
  private client: Redis;
  private static instance: RedisClient;

  private constructor() {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Event handlers
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', error);
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET failed', { key, error });
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET failed', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL failed', { key, error });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS failed', { key, error });
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error('Redis HGET failed', { key, field, error });
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      logger.error('Redis HSET failed', { key, field, error });
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error('Redis HGETALL failed', { key, error });
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE failed', { key, seconds, error });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL failed', { key, error });
      return -2;
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHDB failed', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING failed', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    logger.info('Redis client disconnected');
  }
}
```

## 🏪 **Caching Layer Implementation**

```typescript
// database/cache-service.ts
import { RedisClient } from './redis-client';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  refresh?: boolean; // Force refresh cache
}

export class CacheService {
  private redis: RedisClient;

  constructor() {
    this.redis = RedisClient.getInstance();
  }

  private buildKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Workflow caching
  async getWorkflow(workflowId: string): Promise<any | null> {
    const key = this.buildKey('workflow', workflowId);
    const cached = await this.redis.get(key);
    
    if (cached) {
      logger.debug('Workflow cache hit', { workflowId });
      return JSON.parse(cached);
    }
    
    logger.debug('Workflow cache miss', { workflowId });
    return null;
  }

  async setWorkflow(workflowId: string, workflow: any, ttl: number = 300): Promise<boolean> {
    const key = this.buildKey('workflow', workflowId);
    const serialized = JSON.stringify(workflow);
    const result = await this.redis.set(key, serialized, ttl);
    
    if (result) {
      logger.debug('Workflow cached', { workflowId, ttl });
    }
    
    return result;
  }

  async invalidateWorkflow(workflowId: string): Promise<boolean> {
    const key = this.buildKey('workflow', workflowId);
    const result = await this.redis.del(key);
    
    if (result) {
      logger.debug('Workflow cache invalidated', { workflowId });
    }
    
    return result;
  }

  // Workflow list caching
  async getWorkflowList(cacheKey: string): Promise<any | null> {
    const key = this.buildKey('workflow_list', cacheKey);
    const cached = await this.redis.get(key);
    
    if (cached) {
      logger.debug('Workflow list cache hit', { cacheKey });
      return JSON.parse(cached);
    }
    
    logger.debug('Workflow list cache miss', { cacheKey });
    return null;
  }

  async setWorkflowList(cacheKey: string, data: any, ttl: number = 60): Promise<boolean> {
    const key = this.buildKey('workflow_list', cacheKey);
    const serialized = JSON.stringify(data);
    const result = await this.redis.set(key, serialized, ttl);
    
    if (result) {
      logger.debug('Workflow list cached', { cacheKey, ttl });
    }
    
    return result;
  }

  // User session caching
  async getUserSession(sessionToken: string): Promise<any | null> {
    const key = this.buildKey('session', sessionToken);
    const cached = await this.redis.get(key);
    
    if (cached) {
      logger.debug('Session cache hit', { sessionToken: sessionToken.substring(0, 8) + '...' });
      return JSON.parse(cached);
    }
    
    return null;
  }

  async setUserSession(sessionToken: string, userData: any, ttl: number = 1800): Promise<boolean> {
    const key = this.buildKey('session', sessionToken);
    const serialized = JSON.stringify(userData);
    const result = await this.redis.set(key, serialized, ttl);
    
    if (result) {
      logger.debug('Session cached', { 
        sessionToken: sessionToken.substring(0, 8) + '...', 
        ttl,
        userId: userData.id 
      });
    }
    
    return result;
  }

  async invalidateUserSession(sessionToken: string): Promise<boolean> {
    const key = this.buildKey('session', sessionToken);
    const result = await this.redis.del(key);
    
    if (result) {
      logger.debug('Session cache invalidated', { 
        sessionToken: sessionToken.substring(0, 8) + '...' 
      });
    }
    
    return result;
  }

  // API rate limiting cache
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const count = parseInt(await this.redis.get(key) || '0');
    const ttl = await this.redis.ttl(key);
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (windowSeconds * 1000)
      };
    }
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (windowSeconds * 1000)
    };
  }

  async incrementRateLimit(key: string, windowSeconds: number): Promise<void> {
    const exists = await this.redis.exists(key);
    if (!exists) {
      await this.redis.set(key, '1', windowSeconds);
    } else {
      await this.redis.incr(key);
    }
  }

  // Cache warming
  async warmCache(): Promise<void> {
    logger.info('Starting cache warming');
    
    // Warm frequently accessed data
    const hotKeys = [
      'workflow_definitions:latest',
      'user_roles:permissions',
      'system:health_status'
    ];
    
    for (const key of hotKeys) {
      const exists = await this.redis.exists(key);
      if (!exists) {
        logger.debug('Warming cache key', { key });
        // Implementation would fetch data from database and cache it
      }
    }
    
    logger.info('Cache warming completed');
  }

  // Cache statistics
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
    uptime: number;
  }> {
    const connected = await this.redis.ping();
    const info = await this.redis.info();
    
    const keysMatch = info.match(/db\d+:keys=(\d+)/);
    const keys = keysMatch ? parseInt(keysMatch[1]) : 0;
    
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1] : 'unknown';
    
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
    const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

    return {
      connected,
      keys,
      memory,
      uptime
    };
  }
}
```

## 🔗 **Database Service Integration**

```typescript
// database/database-service.ts
import { DatabaseConnection } from './connection';
import { WorkflowRepository } from './repositories/WorkflowRepository';
import { UserRepository } from './repositories/UserRepository';
import { BettingContentRepository } from './repositories/BettingContentRepository';
import { BettingLineRepository } from './repositories/BettingLineRepository';
import { CacheService } from './cache-service';
import { logger } from '../utils/logger';
import { EntityManager } from 'typeorm';

export class DatabaseService {
  private connection: DatabaseConnection;
  private cache: CacheService;
  
  public workflows: WorkflowRepository;
  public users: UserRepository;
  public bettingContent: BettingContentRepository;
  public bettingLines: BettingLineRepository;

  constructor() {
    this.connection = DatabaseConnection.getInstance();
    this.cache = new CacheService();
    
    // Initialize repositories
    this.initializeRepositories();
  }

  private initializeRepositories(): void {
    // This would be implemented with TypeORM connection
    // For now, we'll use the direct database connection approach
    this.workflows = new WorkflowRepository(/* TypeORM repository instances */);
    this.users = new UserRepository(/* TypeORM repository instances */);
    this.bettingContent = new BettingContentRepository(/* TypeORM repository instances */);
    this.bettingLines = new BettingLineRepository(/* TypeORM repository instances */);
  }

  async initializeDatabase(): Promise<void> {
    try {
      // Test database connection
      const isConnected = await this.connection.healthCheck();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      // Test Redis connection
      const redisConnected = await this.cache.redis.ping();
      if (!redisConnected) {
        throw new Error('Redis connection failed');
      }

      // Run migrations (if using TypeORM)
      // await this.runMigrations();

      // Warm cache
      await this.cache.warmCache();

      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service', error);
      throw error;
    }
  }

  async createWorkflow(data: any): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `workflow:create:${JSON.stringify(data)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Workflow creation cache hit');
        return JSON.parse(cached);
      }

      // Create workflow in database
      const workflow = await this.workflows.create(data);

      // Cache the result
      await this.cache.setWorkflow(workflow.id, workflow, 300);

      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow', error);
      throw error;
    }
  }

  async getWorkflow(id: string): Promise<any> {
    try {
      // Check cache first
      const cached = await this.cache.getWorkflow(id);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const workflow = await this.workflows.findById(id);
      
      if (workflow) {
        // Cache for future requests
        await this.cache.setWorkflow(id, workflow, 300);
      }

      return workflow;
    } catch (error) {
      logger.error('Failed to get workflow', { id, error });
      throw error;
    }
  }

  async updateWorkflowStatus(id: string, status: string, userId?: string): Promise<any> {
    try {
      // Update in database
      const workflow = await this.workflows.updateStatus(id, status, userId);
      
      if (workflow) {
        // Invalidate cache
        await this.cache.invalidateWorkflow(id);
        
        // Cache new state
        await this.cache.setWorkflow(id, workflow, 300);
      }

      return workflow;
    } catch (error) {
      logger.error('Failed to update workflow status', { id, status, error });
      throw error;
    }
  }

  async getWorkflowsWithFilters(filters: any, pagination: any): Promise<any> {
    try {
      const cacheKey = `workflows:list:${JSON.stringify({ filters, pagination })}`;
      
      // Check cache
      const cached = await this.cache.getWorkflowList(cacheKey);
      if (cached) {
        logger.debug('Workflow list cache hit');
        return cached;
      }

      // Fetch from database
      const result = await this.workflows.findWithFilters(filters, pagination);
      
      // Cache for 60 seconds (shorter TTL for lists)
      await this.cache.setWorkflowList(cacheKey, result, 60);

      return result;
    } catch (error) {
      logger.error('Failed to get workflows with filters', { filters, error });
      throw error;
    }
  }

  async addApproval(workflowId: string, approvalData: any): Promise<any> {
    try {
      const approval = await this.workflows.addApproval(
        workflowId,
        approvalData.stepId,
        approvalData.userId,
        approvalData.status,
        approvalData.comments
      );

      // Invalidate workflow cache
      await this.cache.invalidateWorkflow(workflowId);

      return approval;
    } catch (error) {
      logger.error('Failed to add approval', { workflowId, approvalData, error });
      throw error;
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
      const cacheKey = `user:${id}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const user = await this.users.findById(id);
      
      if (user) {
        await this.cache.redis.set(cacheKey, JSON.stringify(user), 1800); // 30 minutes
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by ID', { id, error });
      throw error;
    }
  }

  async validateUserSession(sessionToken: string): Promise<any> {
    try {
      // Check Redis cache first
      const cached = await this.cache.getUserSession(sessionToken);
      if (cached) {
        return cached;
      }

      // Check database
      const session = await this.users.findSessionByToken(sessionToken);
      
      if (session && session.expiresAt > new Date()) {
        // Cache session for 30 minutes
        await this.cache.setUserSession(sessionToken, session.user, 1800);
        return session.user;
      }

      return null;
    } catch (error) {
      logger.error('Failed to validate user session', { sessionToken, error });
      throw error;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const dbStats = await this.connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM workflow_instances) as total_workflows,
          (SELECT COUNT(*) FROM workflow_instances WHERE status = 'in_progress') as active_workflows,
          (SELECT COUNT(*) FROM workflow_instances WHERE status = 'completed') as completed_workflows,
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM betting_content) as total_betting_content,
          (SELECT COUNT(*) FROM betting_lines) as total_betting_lines
      `);

      const cacheStats = await this.cache.getStats();

      return {
        database: dbStats.rows[0],
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get database stats', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const dbHealthy = await this.connection.healthCheck();
      const cacheHealthy = await this.cache.redis.ping();
      
      return dbHealthy && cacheHealthy;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.connection.close();
    await this.cache.redis.disconnect();
    logger.info('Database service closed');
  }
}
```

## 🚀 **Database Configuration & Connection**

```typescript
// config/database-config.ts
export const databaseConfig = {
  // PostgreSQL Configuration
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'betting_workflows',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',

  // Connection Pool Configuration
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000')
  },

  // SSL Configuration
  ssl: {
    enabled: process.env.DB_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  },

  // Migration Configuration
  migrations: {
    enabled: process.env.DB_MIGRATIONS_ENABLED !== 'false',
    autoRun: process.env.DB_MIGRATIONS_AUTO_RUN === 'true'
  }
};

// config/redis-config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Cache Configuration
  defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300'), // 5 minutes
  sessionTTL: parseInt(process.env.REDIS_SESSION_TTL || '1800'), // 30 minutes
  workflowTTL: parseInt(process.env.REDIS_WORKFLOW_TTL || '300'), // 5 minutes
  listTTL: parseInt(process.env.REDIS_LIST_TTL || '60'), // 1 minute
  
  // Rate Limiting Configuration
  rateLimitWindow: parseInt(process.env.REDIS_RATE_LIMIT_WINDOW || '900'), // 15 minutes
  rateLimitMax: parseInt(process.env.REDIS_RATE_LIMIT_MAX || '1000')
};
```

## 🔧 **Database Service Integration with API**

```typescript
// api/services/database-service.ts
import { DatabaseService } from '../../database/database-service';
import { CacheService } from '../../database/cache-service';
import { logger } from '../utils/logger';

export class APIDatabaseService {
  private db: DatabaseService;
  private cache: CacheService;

  constructor() {
    this.db = new DatabaseService();
    this.cache = new CacheService();
  }

  async initialize(): Promise<void> {
    try {
      await this.db.initializeDatabase();
      logger.info('API Database service initialized');
    } catch (error) {
      logger.error('Failed to initialize API database service', error);
      throw error;
    }
  }

  // Workflow operations with caching
  async createWorkflow(workflowData: any, userId: string): Promise<any> {
    try {
      const workflow = await this.db.createWorkflow({
        ...workflowData,
        createdBy: { id: userId }
      });

      // Cache the new workflow
      await this.cache.setWorkflow(workflow.id, workflow);

      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow via API', { workflowData, userId, error });
      throw error;
    }
  }

  async getWorkflow(id: string): Promise<any> {
    try {
      // Try cache first
      const cached = await this.cache.getWorkflow(id);
      if (cached) {
        logger.debug('Workflow cache hit in API', { workflowId: id });
        return cached;
      }

      // Fetch from database
      const workflow = await this.db.getWorkflow(id);
      
      if (workflow) {
        // Cache for future requests
        await this.cache.setWorkflow(id, workflow);
      }

      return workflow;
    } catch (error) {
      logger.error('Failed to get workflow via API', { workflowId: id, error });
      throw error;
    }
  }

  async updateWorkflowStatus(id: string, status: string, userId: string): Promise<any> {
    try {
      const workflow = await this.db.updateWorkflowStatus(id, status, userId);
      
      if (workflow) {
        // Invalidate and refresh cache
        await this.cache.invalidateWorkflow(id);
        await this.cache.setWorkflow(id, workflow);
      }

      return workflow;
    } catch (error) {
      logger.error('Failed to update workflow status via API', { id, status, userId, error });
      throw error;
    }
  }

  async approveWorkflowStep(id: string, approvalData: any, userId: string): Promise<any> {
    try {
      const approval = await this.db.addApproval(id, {
        ...approvalData,
        userId
      });

      // Invalidate workflow cache
      await this.cache.invalidateWorkflow(id);

      return approval;
    } catch (error) {
      logger.error('Failed to approve workflow step via API', { id, approvalData, userId, error });
      throw error;
    }
  }

  async getWorkflows(filters: any, pagination: any): Promise<any> {
    try {
      const cacheKey = `api:workflows:${JSON.stringify({ filters, pagination })}`;
      
      // Check cache
      const cached = await this.cache.getWorkflowList(cacheKey);
      if (cached) {
        logger.debug('Workflow list cache hit in API', { cacheKey });
        return cached;
      }

      // Fetch from database
      const result = await this.db.getWorkflowsWithFilters(filters, pagination);
      
      // Cache for 60 seconds
      await this.cache.setWorkflowList(cacheKey, result, 60);

      return result;
    } catch (error) {
      logger.error('Failed to get workflows via API', { filters, error });
      throw error;
    }
  }

  // User authentication with session caching
  async authenticateUser(credentials: any): Promise<any> {
    try {
      const user = await this.db.users.findByCredentials(credentials.email, credentials.password);
      
      if (user) {
        // Create session
        const session = await this.db.users.createSession(user.id);
        
        // Cache session
        await this.cache.setUserSession(session.token, user, 1800); // 30 minutes
        
        return { user, session };
      }
      
      return null;
    } catch (error) {
      logger.error('User authentication failed', { email: credentials.email, error });
      throw error;
    }
  }

  async validateSession(token: string): Promise<any> {
    try {
      // Check cache first
      const cached = await this.cache.getUserSession(token);
      if (cached) {
        logger.debug('Session cache hit in API', { 
          token: token.substring(0, 8) + '...' 
        });
        return cached;
      }

      // Validate against database
      const user = await this.db.validateUserSession(token);
      
      if (user) {
        // Cache for future requests
        await this.cache.setUserSession(token, user, 1800);
      }

      return user;
    } catch (error) {
      logger.error('Session validation failed', { 
        token: token.substring(0, 8) + '...', 
        error 
      });
      return null;
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      return await this.db.getDatabaseStats();
    } catch (error) {
      logger.error('Failed to get system stats', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    return await this.db.healthCheck();
  }

  async shutdown(): Promise<void> {
    await this.db.close();
    logger.info('API Database service shutdown complete');
  }
}
```

## 🧪 **Database Testing & Migration Setup**

```typescript
// tests/database/integration.test.ts
import { DatabaseService } from '../../database/database-service';
import { CacheService } from '../../database/cache-service';

describe('Database Integration Tests', () => {
  let db: DatabaseService;
  let cache: CacheService;

  beforeAll(async () => {
    db = new DatabaseService();
    cache = new CacheService();
    await db.initializeDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Workflow CRUD Operations', () => {
    it('should create and retrieve workflow', async () => {
      const workflowData = {
        workflowDefinitionId: 'content_publishing',
        status: 'pending',
        data: {
          title: 'Test Content',
          contentType: 'featured_bets',
          jurisdiction: 'UK',
          financialImpact: 10000
        },
        priority: 'high'
      };

      const created = await db.createWorkflow(workflowData);
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      const retrieved = await db.getWorkflow(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.data.title).toBe('Test Content');
    });

    it('should handle workflow approval process', async () => {
      const workflow = await db.createWorkflow({
        workflowDefinitionId: 'test_workflow',
        data: { title: 'Approval Test' }
      });

      // Add approval
      const approval = await db.addApproval(workflow.id, {
        stepId: 'step1',
        userId: 'test-user',
        status: 'approved',
        comments: 'Looks good'
      });

      expect(approval).toBeDefined();
      expect(approval.status).toBe('approved');

      // Update status
      const updated = await db.updateWorkflowStatus(workflow.id, 'in_progress');
      expect(updated).toBeDefined();
      expect(updated.status).toBe('in_progress');
    });

    it('should handle workflow with betting content', async () => {
      const workflow = await db.createWorkflow({
        workflowDefinitionId: 'content_publishing',
        data: {
          title: 'Premier League Bets',
          contentType: 'featured_bets',
          jurisdiction: 'UK',
          financialImpact: 25000,
          contentId: 'pl-bets-001'
        }
      });

      // Verify betting content was created
      const bettingContent = await db.bettingContent.findByWorkflowId(workflow.id);
      expect(bettingContent).toBeDefined();
      expect(bettingContent.contentType).toBe('featured_bets');
      expect(bettingContent.financialImpact).toBe(25000);
    });
  });

  describe('Caching Functionality', () => {
    it('should cache and retrieve workflows', async () => {
      const workflow = await db.createWorkflow({
        workflowDefinitionId: 'cache_test',
        data: { title: 'Cache Test' }
      });

      // First request - cache miss
      const start1 = Date.now();
      const result1 = await db.getWorkflow(workflow.id);
      const time1 = Date.now() - start1;

      // Second request - cache hit
      const start2 = Date.now();
      const result2 = await db.getWorkflow(workflow.id);
      const time2 = Date.now() - start2;

      expect(result1.id).toBe(workflow.id);
      expect(result2.id).toBe(workflow.id);
      expect(time2).toBeLessThan(time1); // Cache should be faster

      // Invalidate cache
      await cache.invalidateWorkflow(workflow.id);
      
      // Third request - cache miss again
      const result3 = await db.getWorkflow(workflow.id);
      expect(result3.id).toBe(workflow.id);
    });

    it('should handle session caching', async () => {
      const sessionToken = 'test-session-token';
      const userData = { id: 'user123', username: 'testuser' };

      // Set session
      await cache.setUserSession(sessionToken, userData, 300);
      
      // Get session
      const retrieved = await cache.getUserSession(sessionToken);
      expect(retrieved).toEqual(userData);

      // Invalidate session
      await cache.invalidateUserSession(sessionToken);
      
      const invalidated = await cache.getUserSession(sessionToken);
      expect(invalidated).toBeNull();
    });
  });

  describe('Performance & Analytics', () => {
    it('should provide workflow analytics', async () => {
      const workflow = await db.createWorkflow({
        workflowDefinitionId: 'analytics_test',
        data: { title: 'Analytics Test' }
      });

      // Add multiple approvals
      await db.addApproval(workflow.id, {
        stepId: 'step1',
        userId: 'user1',
        status: 'approved'
      });

      await db.addApproval(workflow.id, {
        stepId: 'step2',
        userId: 'user2',
        status: 'approved'
      });

      // Get analytics
      const analytics = await db.workflows.getWorkflowAnalytics(workflow.id, '7d');
      
      expect(analytics).toBeDefined();
      expect(analytics.events).toBeDefined();
      expect(analytics.approvals).toBeDefined();
      expect(analytics.period).toBe('7d');
    });

    it('should handle bulk operations efficiently', async () => {
      const workflows = await Promise.all(
        Array(10).fill(null).map((_, i) => 
          db.createWorkflow({
            workflowDefinitionId: 'bulk_test',
            data: { title: `Bulk Test ${i}` }
          })
        )
      );

      const workflowIds = workflows.map(w => w.id);

      // Bulk approve
      const startTime = Date.now();
      const results = await Promise.allSettled(
        workflowIds.map(id => 
          db.addApproval(id, {
            stepId: 'step1',
            userId: 'bulk-user',
            status: 'approved'
          })
        )
      );
      const endTime = Date.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
```

## 🚀 **Database Migration System**

```typescript
// database/migrations/initial-setup.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetupMigration implements MigrationInterface {
  name = 'InitialSetupMigration';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('Running initial database setup migration');
    
    // Create all tables
    await queryRunner.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert default admin user
      INSERT INTO users (username, email, password_hash, role, permissions) 
      VALUES ('admin', 'admin@bettingplatform.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '["*"]')
      ON CONFLICT (username) DO NOTHING;
    `);

    // Insert default workflow definitions
    await queryRunner.query(`
      INSERT INTO workflow_definitions (id, name, description, steps) VALUES
      ('content_publishing', 'Content Publishing', 'Workflow for publishing betting content', '[
        {"id": "content_review", "name": "Content Review", "type": "approval", "assignees": ["content_manager"], "required": true, "timeout": 120},
        {"id": "compliance_check", "name": "Compliance Review", "type": "approval", "assignees": ["compliance_officer"], "required": true, "timeout": 240},
        {"id": "final_publish", "name": "Publish Content", "type": "task", "assignees": ["content_team"], "required": true, "timeout": 60}
      ]'),
      ('line_change_approval', 'Line Change Approval', 'Workflow for approving betting line changes', '[
        {"id": "line_impact_analysis", "name": "Financial Impact Analysis", "type": "approval", "assignees": ["trading_manager"], "required": true, "timeout": 30},
        {"id": "senior_trader_approval", "name": "Senior Trader Approval", "type": "approval", "assignees": ["senior_trader"], "required": true, "timeout": 60},
        {"id": "risk_management_review", "name": "Risk Management Review", "type": "approval", "assignees": ["risk_manager"], "required": true, "timeout": 45}
      ]')
      ON CONFLICT (id) DO NOTHING;
    `);

    logger.info('Initial migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.warn('Running down migration - this will delete all data!');
    
    await queryRunner.query(`
      DROP TABLE IF EXISTS workflow_timeline CASCADE;
      DROP TABLE IF EXISTS workflow_approvals CASCADE;
      DROP TABLE IF EXISTS betting_lines CASCADE;
      DROP TABLE IF EXISTS betting_content CASCADE;
      DROP TABLE IF EXISTS user_sessions CASCADE;
      DROP TABLE IF EXISTS workflow_instances CASCADE;
      DROP TABLE IF EXISTS api_keys CASCADE;
      DROP TABLE IF EXISTS workflow_definitions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
  }
}
```

## 🚀 **Complete Setup & Deployment**

### **1. Environment Setup**
```bash
# Install PostgreSQL and Redis
# Ubuntu/Debian:
sudo apt update
sudo apt install postgresql postgresql-contrib redis-server

# macOS:
brew install postgresql redis

# Start services
sudo systemctl start postgresql
sudo systemctl start redis

# Or on macOS:
brew services start postgresql
brew services start redis
```

### **2. Database Setup Script**
```bash
#!/bin/bash
# setup-database.sh

echo "🗄️ Setting up PostgreSQL database..."

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE betting_workflows;
CREATE USER betting_admin WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE betting_workflows TO betting_admin;
ALTER DATABASE betting_workflows OWNER TO betting_admin;
\q
EOF

echo "✅ PostgreSQL database created"

echo "🔧 Configuring Redis..."
# Redis configuration would go here
echo "✅ Redis configured"

echo "🚀 Database setup complete!"
```

### **3. TypeORM Configuration**
```typescript
// database/data-source.ts
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { WorkflowInstance } from './entities/WorkflowInstance';
import { WorkflowApproval } from './entities/WorkflowApproval';
import { WorkflowTimeline } from './entities/WorkflowTimeline';
import { BettingContent } from './entities/BettingContent';
import { BettingLine } from './entities/BettingLine';
import { ApiKey } from './entities/ApiKey';
import { InitialSetupMigration } from './migrations/initial-setup';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'betting_workflows',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    WorkflowInstance,
    WorkflowApproval,
    WorkflowTimeline,
    BettingContent,
    BettingLine,
    ApiKey
  ],
  migrations: [InitialSetupMigration],
  subscribers: [],
  ssl: process.env.DB_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});
```

### **4. API Integration**
```typescript
// api/services/database-integration.ts
import { DatabaseService } from '../../database/database-service';
import { APIDatabaseService } from './database-service';
import { logger } from '../utils/logger';

export class DatabaseIntegrationService {
  private dbService: APIDatabaseService;

  constructor() {
    this.dbService = new APIDatabaseService();
  }

  async initialize(): Promise<void> {
    try {
      await this.dbService.initialize();
      logger.info('Database integration service initialized');
    } catch (error) {
      logger.error('Failed to initialize database integration', error);
      throw error;
    }
  }

  // Delegate all database operations
  async createWorkflow(data: any, userId: string): Promise<any> {
    return this.dbService.createWorkflow(data, userId);
  }

  async getWorkflow(id: string): Promise<any> {
    return this.dbService.getWorkflow(id);
  }

  async updateWorkflowStatus(id: string, status: string, userId: string): Promise<any> {
    return this.dbService.updateWorkflowStatus(id, status, userId);
  }

  async approveWorkflowStep(id: string, approvalData: any, userId: string): Promise<any> {
    return this.dbService.approveWorkflowStep(id, approvalData, userId);
  }

  async getWorkflows(filters: any, pagination: any): Promise<any> {
    return this.dbService.getWorkflows(filters, pagination);
  }

  async validateSession(token: string): Promise<any> {
    return this.dbService.validateSession(token);
  }

  async getSystemStats(): Promise<any> {
    return this.dbService.getSystemStats();
  }

  async healthCheck(): Promise<boolean> {
    return this.dbService.healthCheck();
  }

  async shutdown(): Promise<void> {
    await this.dbService.shutdown();
  }
}
```

## 🧪 **Testing the Complete Database Integration**

```typescript
// tests/database/complete-integration.test.ts
import { DatabaseIntegrationService } from '../../api/services/database-integration';
import { BettingWorkflowAPIClient } from '../../examples/api-integration';

describe('Complete Database Integration', () => {
  let dbService: DatabaseIntegrationService;
  let apiClient: BettingWorkflowAPIClient;

  beforeAll(async () => {
    dbService = new DatabaseIntegrationService();
    await dbService.initialize();
    
    apiClient = new BettingWorkflowAPIClient();
    apiClient.setAuthToken('test-token');
  });

  afterAll(async () => {
    await dbService.shutdown();
  });

  describe('End-to-End Workflow with Database', () => {
    it('should handle complete betting workflow lifecycle', async () => {
      // 1. Create content workflow
      const workflow = await apiClient.createContentWorkflow({
        title: 'Champions League Final Bets',
        contentType: 'featured_bets',
        jurisdiction: 'UK',
        financialImpact: 50000,
        contentId: 'cl-final-bets-2024'
      });

      expect(workflow.success).toBe(true);
      expect(workflow.data.id).toBeDefined();

      const workflowId = workflow.data.id;

      // 2. Verify it was saved to database
      const savedWorkflow = await dbService.getWorkflow(workflowId);
      expect(savedWorkflow).toBeDefined();
      expect(savedWorkflow.data.title).toBe('Champions League Final Bets');

      // 3. Approve workflow step
      const approval = await apiClient.approveWorkflow(workflowId, 'Content reviewed and approved');
      expect(approval.success).toBe(true);

      // 4. Verify approval was saved
      const updatedWorkflow = await dbService.getWorkflow(workflowId);
      expect(updatedWorkflow.status).toBe('in_progress');

      // 5. Check cache is working
      const cachedWorkflow = await dbService.getWorkflow(workflowId);
      expect(cachedWorkflow.id).toBe(workflowId);

      // 6. Get system stats
      const stats = await dbService.getSystemStats();
      expect(stats.database.total_workflows).toBeGreaterThan(0);
      expect(stats.cache.connected).toBe(true);
    });

    it('should handle concurrent workflow operations', async () => {
      // Create multiple workflows concurrently
      const workflows = await Promise.all([
        apiClient.createContentWorkflow({
          title: 'Concurrent Test 1',
          contentType: 'lines',
          jurisdiction: 'DE',
          financialImpact: 10000,
          contentId: 'concurrent-001'
        }),
        apiClient.createContentWorkflow({
          title: 'Concurrent Test 2',
          contentType: 'promotions',
          jurisdiction: 'ES',
          financialImpact: 15000,
          contentId: 'concurrent-002'
        }),
        apiClient.createLineChangeWorkflow({
          lineId: 'concurrent-line-001',
          eventName: 'Concurrent Test Event',
          oldOdds: '2.50',
          newOdds: '2.30',
          marketType: 'match_winner',
          reason: 'Concurrent test'
        })
      ]);

      expect(workflows.every(w => w.success)).toBe(true);

      // Bulk approve all workflows
      const workflowIds = workflows.map(w => w.data.id);
      const bulkResult = await apiClient.bulkApprove(workflowIds, 'Bulk concurrent approval');

      expect(bulkResult.success).toBe(true);
      expect(bulkResult.data.successful).toBe(3);
    });

    it('should handle database failures gracefully', async () => {
      // Simulate database failure
      jest.spyOn(dbService, 'getWorkflow').mockRejectedValueOnce(new Error('Database connection lost'));

      try {
        await apiClient.getWorkflowById('non-existent-id');
      } catch (error) {
        expect(error.response?.data?.error?.code).toBe('INTERNAL_ERROR');
      }

      // Restore original function
      jest.restoreAllMocks();
    });
  });

  describe('Performance Metrics', () => {
    it('should demonstrate caching performance benefits', async () => {
      const workflowId = 'performance-test-id';
      
      // Create workflow
      await dbService.createWorkflow({
        workflowDefinitionId: 'performance_test',
        data: { title: 'Performance Test' }
      }, 'test-user');

      // First request - cache miss
      const start1 = Date.now();
      const result1 = await dbService.getWorkflow(workflowId);
      const time1 = Date.now() - start1;

      // Second request - cache hit
      const start2 = Date.now();
      const result2 = await dbService.getWorkflow(workflowId);
      const time2 = Date.now() - start2;

      expect(result1.id).toBe(workflowId);
      expect(result2.id).toBe(workflowId);
      expect(time2).toBeLessThan(time1 * 0.5); // Cache should be at least 50% faster
    });

    it('should handle high-volume workflow queries efficiently', async () => {
      // Create 100 workflows
      const workflows = await Promise.all(
        Array(100).fill(null).map((_, i) => 
          dbService.createWorkflow({
            workflowDefinitionId: 'volume_test',
            data: { title: `Volume Test ${i}` },
            priority: i % 2 === 0 ? 'high' : 'medium'
          }, 'volume-test-user')
        )
      );

      expect(workflows).toHaveLength(100);

      // Query with filters
      const startTime = Date.now();
      const result = await dbService.getWorkflows(
        { priority: 'high' },
        { page: 1, limit: 50 }
      );
      const endTime = Date.now();

      expect(result.items).toHaveLength(50);
      expect(result.total).toBeGreaterThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
```

## 🚀 **Complete Setup Commands**

```bash
# 1. Install PostgreSQL and Redis
# Ubuntu/Debian:
sudo apt update && sudo apt install postgresql postgresql-contrib redis-server

# macOS:
brew install postgresql redis

# 2. Start services
sudo systemctl start postgresql redis-server
# or on macOS:
brew services start postgresql redis

# 3. Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE betting_workflows;
CREATE USER betting_admin WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE betting_workflows TO betting_admin;
\q
EOF

# 4. Set up environment variables
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=betting_workflows" >> .env
echo "DB_USER=betting_admin" >> .env
echo "DB_PASSWORD=your-secure-password" >> .env
echo "REDIS_HOST=localhost" >> .env
echo "REDIS_PORT=6379" >> .env

# 5. Install Node.js dependencies
npm install pg typeorm ioredis
npm install --save-dev @types/pg @types/ioredis

# 6. Run database migrations
npm run migration:run

# 7. Test database connection
npm run test:database

# 8. Start the API with database
npm run dev
```

## 📊 **Database Performance Optimization**

```typescript
// database/optimization.ts
export class DatabaseOptimizer {
  async optimizeForBettingPlatform(): Promise<void> {
    // Create specialized indexes for betting queries
    await this.connection.query(`
      -- Index for frequently queried betting content
      CREATE INDEX CONCURRENTLY idx_betting_content_status_type 
      ON betting_content(status, content_type) 
      WHERE status IN ('in_review', 'approved');
      
      -- Index for line change queries by financial impact
      CREATE INDEX CONCURRENTLY idx_betting_lines_impact 
      ON betting_lines(financial_impact DESC) 
      WHERE financial_impact > 10000;
      
      -- Composite index for workflow queries with betting data
      CREATE INDEX CONCURRENTLY idx_workflows_betting 
      ON workflow_instances(created_at DESC, status, priority) 
      WHERE workflow_definition_id IN ('content_publishing', 'line_change_approval');
      
      -- Partial index for active workflows
      CREATE INDEX CONCURRENTLY idx_workflows_active 
      ON workflow_instances(created_at DESC) 
      WHERE status = 'in_progress';
    `);

    // Analyze tables for query optimization
    await this.connection.query('ANALYZE workflow_instances, betting_content, betting_lines');
  }

  async setupPartitioning(): Promise<void> {
    // Partition workflow_instances by created date for better performance
    await this.connection.query(`
      -- Create partitioned table for large datasets
      CREATE TABLE workflow_instances_partitioned (
        LIKE workflow_instances INCLUDING ALL
      ) PARTITION BY RANGE (created_at);
      
      -- Create monthly partitions
      CREATE TABLE workflow_instances_2024_01 PARTITION OF workflow_instances_partitioned
      FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
      
      CREATE TABLE workflow_instances_2024_02 PARTITION OF workflow_instances_partitioned
      FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
    `);
  }
}
```

## 🎯 **Database Features Summary**

### ✅ **Complete PostgreSQL Schema**
- **Users & Authentication** with role-based permissions
- **Workflow Management** with full audit trails
- **Betting Platform Integration** with specialized tables
- **Performance Indexes** for fast queries
- **Audit & Timeline**