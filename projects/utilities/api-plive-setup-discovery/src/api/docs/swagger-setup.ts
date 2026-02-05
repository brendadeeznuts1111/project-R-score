import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config/api-config';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Betting Platform Workflow API',
    description: `Enterprise-grade API for managing betting platform workflows with AI-powered approvals.

## Features
- **Multi-tenant workflow management** with role-based access control
- **Betting platform integration** for content, lines, and odds management
- **Real-time monitoring** and analytics
- **Bulk operations** for efficient workflow processing
- **Advanced filtering** and export capabilities

## Authentication
This API supports two authentication methods:
1. **JWT Bearer tokens** for user authentication
2. **API Keys** for programmatic access

Include the token in the Authorization header:
- \`Authorization: Bearer <jwt-token>\`
- \`Authorization: ApiKey <api-key>\`
`,
    version: config.version,
    contact: {
      name: 'API Support',
      email: 'api@bettingplatform.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: `http://${config.host}:${config.port}/api/v1`,
      description: 'Development server'
    },
    {
      url: `https://${config.host}:${config.port}/api/v1`,
      description: 'Production server'
    }
  ],
  security: [
    { BearerAuth: [] },
    { ApiKeyAuth: [] }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for user authentication'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Use format "ApiKey your-api-key-here"'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', description: 'Response data' },
          message: { type: 'string', description: 'Response message' },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: { type: 'object', description: 'Additional metadata' }
        }
      },
      WorkflowResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Workflow instance ID' },
          workflowId: { type: 'string', description: 'Workflow type ID' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'],
            description: 'Current workflow status'
          },
          currentStep: { type: 'string', description: 'Current step ID' },
          createdBy: { type: 'string', description: 'User who created the workflow' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          data: { type: 'object', description: 'Workflow-specific data' },
          progress: { type: 'integer', minimum: 0, maximum: 100, description: 'Progress percentage' },
          estimatedCompletion: { type: 'string', format: 'date-time', nullable: true },
          approvals: {
            type: 'array',
            items: { $ref: '#/components/schemas/Approval' }
          },
          metadata: { type: 'object', description: 'Additional workflow metadata' }
        }
      },
      CreateWorkflowRequest: {
        type: 'object',
        required: ['workflowType', 'data'],
        properties: {
          workflowType: {
            type: 'string',
            enum: ['content_publishing', 'line_change_approval', 'odds_update_approval', 'promotion_approval'],
            description: 'Type of workflow to create'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
          },
          data: { type: 'object', description: 'Workflow-specific data' },
          metadata: { type: 'object', description: 'Optional metadata' }
        }
      },
      Approval: {
        type: 'object',
        properties: {
          stepId: { type: 'string' },
          approver: { type: 'string' },
          status: { type: 'string', enum: ['approved', 'rejected', 'pending'] },
          comments: { type: 'string' },
          decidedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      BulkOperationResult: {
        type: 'object',
        properties: {
          successful: { type: 'integer', minimum: 0 },
          failed: { type: 'integer', minimum: 0 },
          total: { type: 'integer', minimum: 0 },
          errors: {
            type: 'array',
            items: { type: 'string' },
            nullable: true
          }
        }
      },
      WorkflowAnalytics: {
        type: 'object',
        properties: {
          totalTime: { type: 'integer', description: 'Total time in milliseconds' },
          averageApprovalTime: { type: 'number' },
          approvalRate: { type: 'number', minimum: 0, maximum: 1 },
          rejectionRate: { type: 'number', minimum: 0, maximum: 1 },
          escalationCount: { type: 'integer' },
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                step: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                duration: { type: 'integer' },
                actor: { type: 'string' }
              }
            }
          }
        }
      },
      PaginatedWorkflowList: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/WorkflowResponse' }
          },
          total: { type: 'integer' },
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          totalPages: { type: 'integer' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          data: { type: 'object', nullable: true, example: null },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', nullable: true }
            }
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request - Invalid input data',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: { field: 'workflowType', message: 'Invalid workflow type' }
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing authentication',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authorization header required'
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'FORBIDDEN',
                message: 'Missing required permissions: workflows:create'
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - Resource does not exist',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'NOT_FOUND',
                message: 'Workflow not found'
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      TooManyRequests: {
        description: 'Too Many Requests - Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests'
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              data: null,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal server error occurred'
              },
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Workflows',
      description: 'Core workflow management operations'
    },
    {
      name: 'Workflow Actions',
      description: 'Workflow state management (approve, reject, cancel)'
    },
    {
      name: 'Bulk Operations',
      description: 'Bulk workflow operations for efficiency'
    },
    {
      name: 'Betting Platform',
      description: 'Betting platform specific workflows'
    },
    {
      name: 'Analytics',
      description: 'Workflow analytics and reporting'
    },
    {
      name: 'Monitoring',
      description: 'System monitoring and health checks'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/api/routes/*.ts',
    './src/api/controllers/*.ts',
    './src/api/docs/*.yaml'
  ]
};

export function setupSwagger() {
  return swaggerJSDoc(options);
}
