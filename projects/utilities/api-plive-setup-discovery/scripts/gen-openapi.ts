// scripts/gen-openapi.ts - Source-mapped OpenAPI forge
// Bun 1.3 async OpenAPI generator with ripgrep-powered sourcemap tracing

import { file, YAML } from 'bun';
import { parseZodToOpenAPI } from '../src/api/utils/zod-openapi';

interface RouteDecl {
  path: string;
  method: string | 'WS';
  id: string;
  handler: string;
  auth?: string;
  request?: { schema: string; required?: boolean };
  response: Record<string, { schema: string; example?: any }>;
  tags: string[];
  summary: string;
  sourcemap?: boolean;
  subprotocol?: string;
}

async function generateOpenAPI() {
  console.time('🟢 OpenAPI forge');

  // Load bun.yaml configuration
  const config = YAML.parse(await file('bun.yaml').text());
  const routes: RouteDecl[] = config.api.routes;

  // Initialize OpenAPI spec
  const openapi: any = {
    openapi: '3.1.0',
    info: {
      title: config.api.openapi.title,
      version: config.api.version,
      description: config.api.openapi.description
    },
    servers: config.api.openapi.servers,
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        vault: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Vault-Token'
        },
        csrf: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token'
        },
        'csrf+vault': {
          type: 'apiKey',
          in: 'header',
          name: 'X-Vault-Token'
        }
      }
    },
    tags: [],
    security: []
  };

  // Process routes with sourcemap tracing
  await Promise.all(routes.map(async (route) => {
    if (!route.sourcemap) return;

    console.log(`🔍 Tracing sourcemap: ${route.handler}`);

    try {
      // Read handler source code
      const handlerCode = await file(route.handler).text();

      // Extract Zod schemas from handler (basic regex parsing)
      const schemaMatches = handlerCode.match(/const\s+(\w+)\s*=\s*z\.object\({([^}]+)}\)/gs) || [];
      const schemas: Record<string, any> = {};

      // Parse found schemas
      for (const match of schemaMatches) {
        const schemaNameMatch = match.match(/const\s+(\w+)\s*=/);
        const schemaDefMatch = match.match(/z\.object\({([^}]+)}\)/);

        if (schemaNameMatch && schemaDefMatch) {
          const schemaName = schemaNameMatch[1];
          const schemaDef = schemaDefMatch[1];
          schemas[schemaName] = parseZodToOpenAPI(schemaDef);
        }
      }

      // Build response schemas
      const responseSchemas: any = {};
      if (route.response) {
        for (const [code, res] of Object.entries(route.response)) {
          const example = (res as any).example;
          const schemaName = (res as any).schema;

          responseSchemas[code] = {
            description: getStatusDescription(code),
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${schemaName}` },
                ...(example && { example })
              }
            }
          };

          // Add to components if not already present
          if (!openapi.components.schemas[schemaName]) {
            openapi.components.schemas[schemaName] = schemas[schemaName] || { type: 'object', properties: {} };
          }
        }
      }

      // Add request schema if present
      if (route.request && !openapi.components.schemas[route.request.schema]) {
        openapi.components.schemas[route.request.schema] = schemas[route.request.schema] || {
          type: 'object',
          properties: {
            data: { type: 'string', description: 'YAML content' }
          }
        };
      }

      // Build path entry
      const pathKey = route.path.replace(/{/g, '{').replace(/}/g, '}');
      openapi.paths[pathKey] ??= {};

      const methodKey = route.method === 'WS' ? 'get' : route.method.toLowerCase();

      openapi.paths[pathKey][methodKey] = {
        summary: route.summary,
        tags: route.tags,
        operationId: route.id,
        parameters: extractPathParameters(route.path),
        requestBody: route.request ? {
          required: route.request.required ?? false,
          content: {
            'application/yaml': {
              schema: { $ref: `#/components/schemas/${route.request.schema}` }
            }
          }
        } : undefined,
        responses: responseSchemas,
        security: route.auth ? [{ [route.auth]: [] }] : []
      };

      // Deduplicate tags
      route.tags.forEach((tag: string) => {
        if (!openapi.tags.some((t: any) => t.name === tag)) {
          openapi.tags.push({ name: tag, description: `${tag.charAt(0).toUpperCase() + tag.slice(1)} operations` });
        }
      });

    } catch (error) {
      console.warn(`⚠️  Failed to process ${route.handler}:`, error.message);
    }
  }));

  // Write OpenAPI spec with zstd compression hint
  const yamlSpec = YAML.stringify(openapi);
  await file(config.api.openapi.output).write(yamlSpec);

  console.log(`🟢 OpenAPI spec forged: ${config.api.openapi.output} (${yamlSpec.length} bytes)`);
  console.timeEnd('🟢 OpenAPI forge');
}

function extractPathParameters(path: string): any[] {
  const params: any[] = [];
  const paramMatches = path.match(/{([^}]+)}/g);

  if (paramMatches) {
    paramMatches.forEach(match => {
      const paramName = match.slice(1, -1);
      params.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${paramName} parameter`
      });
    });
  }

  return params;
}

function getStatusDescription(code: string): string {
  const descriptions: Record<string, string> = {
    '200': 'Successful operation',
    '201': 'Resource created successfully',
    '400': 'Bad request - validation error',
    '404': 'Resource not found',
    '500': 'Internal server error'
  };
  return descriptions[code] || `${code} response`;
}

if (import.meta.main) {
  generateOpenAPI().catch(console.error);
}
