/**
 * OpenAPI/Swagger Documentation Generator
 * Generates comprehensive API documentation from route definitions
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      email: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components: {
    schemas: Record<string, OpenAPISchema>;
    securitySchemes: Record<string, OpenAPISecurityScheme>;
    responses: Record<string, OpenAPIResponse>;
    parameters: Record<string, OpenAPIParameter>;
  };
  security: Array<Record<string, string[]>>;
  tags: Array<{
    name: string;
    description: string;
    externalDocs?: {
      description: string;
      url: string;
    };
  }>;
}

export interface OpenAPIOperation {
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    description: string;
    required?: boolean;
    content: Record<
      string,
      {
        schema: OpenAPISchema;
        examples?: Record<string, any>;
      }
    >;
  };
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
}

export interface OpenAPISchema {
  type: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: string[];
  description?: string;
  example?: any;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  $ref?: string;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required?: boolean;
  schema: OpenAPISchema;
  examples?: Record<string, any>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<
    string,
    {
      schema: OpenAPISchema;
      examples?: Record<string, any>;
    }
  >;
  headers?: Record<
    string,
    {
      description: string;
      schema: OpenAPISchema;
    }
  >;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: {
      authorizationUrl: string;
      scopes: Record<string, string>;
    };
    password?: {
      tokenUrl: string;
      scopes: Record<string, string>;
    };
    clientCredentials?: {
      tokenUrl: string;
      scopes: Record<string, string>;
    };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };
  openIdConnectUrl?: string;
}

export class OpenAPIGenerator {
  private spec: Partial<OpenAPISpec>;
  private routes: Map<string, Map<string, OpenAPIOperation>> = new Map();

  constructor() {
    this.spec = {
      openapi: '3.0.3',
      info: {
        title: 'Fire22 Dashboard Worker API',
        description: 'Comprehensive API for Fire22 dashboard and worker operations',
        version: '1.0.0',
        contact: {
          name: 'Fire22 Team',
          email: 'api@fire22.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'https://api.fire22.com/v1',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.fire22.com/v1',
          description: 'Staging server',
        },
        {
          url: 'http://localhost:8787/v1',
          description: 'Local development server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
        responses: {},
        parameters: {},
      },
      security: [],
      tags: [],
    };
  }

  /**
   * Add a route to the OpenAPI specification
   */
  addRoute(path: string, method: string, operation: OpenAPIOperation): void {
    if (!this.routes.has(path)) {
      this.routes.set(path, new Map());
    }

    const pathRoutes = this.routes.get(path)!;
    pathRoutes.set(method.toLowerCase(), operation);

    // Update the spec paths
    if (!this.spec.paths) {
      this.spec.paths = {};
    }
    this.spec.paths[path] = this.spec.paths[path] || {};
    this.spec.paths[path][method.toLowerCase()] = operation;
  }

  /**
   * Add a schema component
   */
  addSchema(name: string, schema: OpenAPISchema): void {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {}, responses: {}, parameters: {} };
    }
    if (!this.spec.components.schemas) {
      this.spec.components.schemas = {};
    }
    this.spec.components.schemas[name] = schema;
  }

  /**
   * Add a security scheme
   */
  addSecurityScheme(name: string, scheme: OpenAPISecurityScheme): void {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {}, responses: {}, parameters: {} };
    }
    if (!this.spec.components.securitySchemes) {
      this.spec.components.securitySchemes = {};
    }
    this.spec.components.securitySchemes[name] = scheme;
  }

  /**
   * Add a reusable response
   */
  addResponse(name: string, response: OpenAPIResponse): void {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {}, responses: {}, parameters: {} };
    }
    if (!this.spec.components.responses) {
      this.spec.components.responses = {};
    }
    this.spec.components.responses[name] = response;
  }

  /**
   * Add a reusable parameter
   */
  addParameter(name: string, parameter: OpenAPIParameter): void {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {}, responses: {}, parameters: {} };
    }
    if (!this.spec.components.parameters) {
      this.spec.components.parameters = {};
    }
    this.spec.components.parameters[name] = parameter;
  }

  /**
   * Add a tag
   */
  addTag(
    name: string,
    description: string,
    externalDocs?: { description: string; url: string }
  ): void {
    if (!this.spec.tags) {
      this.spec.tags = [];
    }

    this.spec.tags.push({
      name,
      description,
      externalDocs,
    });
  }

  /**
   * Set global security
   */
  setGlobalSecurity(security: Array<Record<string, string[]>>): void {
    this.spec.security = security;
  }

  /**
   * Generate the complete OpenAPI specification
   */
  generate(): OpenAPISpec {
    // Add default schemas
    this.addDefaultSchemas();

    // Add default security schemes
    this.addDefaultSecuritySchemes();

    // Add default responses
    this.addDefaultResponses();

    // Add default parameters
    this.addDefaultParameters();

    // Add default tags
    this.addDefaultTags();

    return this.spec as OpenAPISpec;
  }

  /**
   * Add default schemas
   */
  private addDefaultSchemas(): void {
    // Error response schema
    this.addSchema('Error', {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Invalid input data' },
            details: { type: 'object', additionalProperties: true },
          },
          required: ['code', 'message'],
        },
        timestamp: { type: 'string', format: 'date-time' },
        requestId: { type: 'string', example: 'req_1234567890' },
      },
      required: ['success', 'error', 'timestamp'],
    });

    // Success response schema
    this.addSchema('Success', {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object', additionalProperties: true },
        timestamp: { type: 'string', format: 'date-time' },
        requestId: { type: 'string', example: 'req_1234567890' },
      },
      required: ['success', 'timestamp'],
    });

    // User schema
    this.addSchema('User', {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'user_123' },
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        name: { type: 'string', example: 'John Doe' },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'moderator'],
          example: 'user',
        },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
      required: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt'],
    });

    // Pagination schema
    this.addSchema('Pagination', {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, example: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
        total: { type: 'integer', example: 150 },
        totalPages: { type: 'integer', example: 8 },
        hasNext: { type: 'boolean', example: true },
        hasPrev: { type: 'boolean', example: false },
      },
      required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
    });
  }

  /**
   * Add default security schemes
   */
  private addDefaultSecuritySchemes(): void {
    this.addSecurityScheme('bearerAuth', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Authorization header using the Bearer scheme',
    });

    this.addSecurityScheme('apiKeyAuth', {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API Key authentication',
    });
  }

  /**
   * Add default responses
   */
  private addDefaultResponses(): void {
    this.addResponse('BadRequest', {
      description: 'Bad Request - Invalid input data',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            validationError: {
              summary: 'Validation Error',
              value: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: { email: 'Invalid email format' },
                },
                timestamp: '2024-01-01T12:00:00Z',
                requestId: 'req_1234567890',
              },
            },
          },
        },
      },
    });

    this.addResponse('Unauthorized', {
      description: 'Unauthorized - Authentication required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            unauthorized: {
              summary: 'Unauthorized',
              value: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
                timestamp: '2024-01-01T12:00:00Z',
                requestId: 'req_1234567890',
              },
            },
          },
        },
      },
    });

    this.addResponse('Forbidden', {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            forbidden: {
              summary: 'Forbidden',
              value: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
                timestamp: '2024-01-01T12:00:00Z',
                requestId: 'req_1234567890',
              },
            },
          },
        },
      },
    });

    this.addResponse('NotFound', {
      description: 'Not Found - Resource does not exist',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            notFound: {
              summary: 'Not Found',
              value: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
                timestamp: '2024-01-01T12:00:00Z',
                requestId: 'req_1234567890',
              },
            },
          },
        },
      },
    });

    this.addResponse('InternalServerError', {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            internalError: {
              summary: 'Internal Server Error',
              value: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An unexpected error occurred',
                },
                timestamp: '2024-01-01T12:00:00Z',
                requestId: 'req_1234567890',
              },
            },
          },
        },
      },
    });
  }

  /**
   * Add default parameters
   */
  private addDefaultParameters(): void {
    this.addParameter('page', {
      name: 'page',
      in: 'query',
      description: 'Page number for pagination',
      required: false,
      schema: { type: 'integer', minimum: 1, default: 1 },
    });

    this.addParameter('limit', {
      name: 'limit',
      in: 'query',
      description: 'Number of items per page',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    });

    this.addParameter('sortBy', {
      name: 'sortBy',
      in: 'query',
      description: 'Field to sort by',
      required: false,
      schema: { type: 'string', example: 'createdAt' },
    });

    this.addParameter('sortOrder', {
      name: 'sortOrder',
      in: 'query',
      description: 'Sort order',
      required: false,
      schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    });
  }

  /**
   * Add default tags
   */
  private addDefaultTags(): void {
    this.addTag('Authentication', 'User authentication and authorization operations', {
      description: 'Authentication API Documentation',
      url: 'https://docs.fire22.com/auth',
    });

    this.addTag('Users', 'User management operations', {
      description: 'User Management API Documentation',
      url: 'https://docs.fire22.com/users',
    });

    this.addTag('Dashboard', 'Dashboard and analytics operations', {
      description: 'Dashboard API Documentation',
      url: 'https://docs.fire22.com/dashboard',
    });

    this.addTag('Monitoring', 'System monitoring and health check operations', {
      description: 'Monitoring API Documentation',
      url: 'https://docs.fire22.com/monitoring',
    });

    this.addTag('Admin', 'Administrative operations', {
      description: 'Admin API Documentation',
      url: 'https://docs.fire22.com/admin',
    });
  }

  /**
   * Export specification as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Export specification as YAML (placeholder for future implementation)
   */
  toYAML(): string {
    // For now, return JSON. In a real implementation, you'd use a YAML library
    return this.toJSON();
  }
}
