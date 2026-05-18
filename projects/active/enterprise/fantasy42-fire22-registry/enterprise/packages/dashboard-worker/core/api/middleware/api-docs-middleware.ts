/**
 * API Documentation Middleware
 * Serves OpenAPI/Swagger documentation and provides API discovery
 */

import { OpenAPIGenerator } from '../openapi/openapi-generator';

export interface APIDocsConfig {
  enabled: boolean;
  path: string;
  title: string;
  description: string;
  version: string;
  servers: Array<{
    url: string;
    description: string;
  }>;
  contact?: {
    name: string;
    email: string;
    url?: string;
  };
}

export class APIDocsMiddleware {
  private generator: OpenAPIGenerator;
  private config: APIDocsConfig;

  constructor(config: APIDocsConfig) {
    this.config = config;
    this.generator = new OpenAPIGenerator();

    // Configure the generator with our settings
    this.configureGenerator();
  }

  /**
   * Configure the OpenAPI generator with our settings
   */
  private configureGenerator(): void {
    // Update spec info
    this.generator = new OpenAPIGenerator();

    // Add custom servers if provided
    if (this.config.servers && this.config.servers.length > 0) {
      // Note: In a real implementation, you'd modify the generator's servers
      // For now, we'll work with the default servers
    }

    // Set global security (bearer auth by default)
    this.generator.setGlobalSecurity([{ bearerAuth: [] }, { apiKeyAuth: [] }]);
  }

  /**
   * Add a route to the API documentation
   */
  addRoute(path: string, method: string, operation: any): void {
    this.generator.addRoute(path, method, operation);
  }

  /**
   * Add a schema to the API documentation
   */
  addSchema(name: string, schema: any): void {
    this.generator.addSchema(name, schema);
  }

  /**
   * Generate API documentation response
   */
  generateDocs(request: Request): Response {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';

    try {
      const spec = this.generator.generate();

      if (format === 'yaml') {
        return new Response(this.generator.toYAML(), {
          headers: {
            'Content-Type': 'application/yaml',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        });
      }

      return new Response(JSON.stringify(spec, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error('Error generating API docs:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate API documentation',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  /**
   * Handle CORS preflight requests
   */
  handleOptions(): Response {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  /**
   * Generate Swagger UI HTML page
   */
  generateSwaggerUI(request: Request): Response {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const docsUrl = `${baseUrl}${this.config.path}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title} - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui.css" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.7.2/favicon-32x32.png" sizes="32x32" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '${docsUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                requestInterceptor: function(req) {
                    // Add any custom request headers here
                    return req;
                },
                responseInterceptor: function(res) {
                    return res;
                }
            });
        };
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  /**
   * Generate Redoc HTML page
   */
  generateRedoc(request: Request): Response {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const docsUrl = `${baseUrl}${this.config.path}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title} - API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/redoc@2.0.0-rc.72/bundles/redoc.standalone.min.css">
</head>
<body>
    <redoc spec-url="${docsUrl}"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0-rc.72/bundles/redoc.standalone.min.js"></script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  /**
   * Get API documentation middleware function
   */
  getMiddleware(): (request: Request) => Response | null {
    return (request: Request): Response | null => {
      if (!this.config.enabled) {
        return null;
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return this.handleOptions();
      }

      // Handle API docs endpoints
      if (path === this.config.path) {
        return this.generateDocs(request);
      }

      // Handle Swagger UI
      if (path === `${this.config.path}/swagger-ui`) {
        return this.generateSwaggerUI(request);
      }

      // Handle Redoc
      if (path === `${this.config.path}/redoc`) {
        return this.generateRedoc(request);
      }

      return null;
    };
  }

  /**
   * Get API documentation routes for manual registration
   */
  getRoutes(): Array<{
    path: string;
    method: string;
    handler: (request: Request) => Response;
    description: string;
  }> {
    return [
      {
        path: this.config.path,
        method: 'GET',
        handler: request => this.generateDocs(request),
        description: 'OpenAPI/Swagger JSON specification',
      },
      {
        path: `${this.config.path}/swagger-ui`,
        method: 'GET',
        handler: request => this.generateSwaggerUI(request),
        description: 'Swagger UI documentation interface',
      },
      {
        path: `${this.config.path}/redoc`,
        method: 'GET',
        handler: request => this.generateRedoc(request),
        description: 'Redoc documentation interface',
      },
    ];
  }
}

// Default configuration
export const defaultAPIDocsConfig: APIDocsConfig = {
  enabled: true,
  path: '/api/v1/docs',
  title: 'Fire22 Dashboard Worker API',
  description: 'Comprehensive API for Fire22 dashboard and worker operations',
  version: '1.0.0',
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
  contact: {
    name: 'Fire22 Team',
    email: 'api@fire22.com',
    url: 'https://fire22.com',
  },
};
