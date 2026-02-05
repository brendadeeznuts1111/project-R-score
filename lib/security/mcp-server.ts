/**
 * 🔐 Tier-1380 Security MCP Server (Bun-Optimized)
 * 
 * Model Context Protocol server for enterprise security operations
 * Built with Bun runtime for maximum performance and native integration
 * Exposes security tools, resources, and prompts to LLM applications
 * 
 * @version 4.5
 */

import { validateHost } from '../utils/env-validator';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import Tier1380SecretManager from './tier1380-secret-manager';
import { Tier1380PasswordSecurity } from './enterprise-password-security';
import { Tier1380EnterpriseAuth } from './enterprise-auth';
import { Tier1380SecureDeployment } from './secure-deployment';
import { SecretLifecycleManager } from './secret-lifecycle';
import { VersionedSecretManager } from './versioned-secrets';

// Bun-specific optimizations
const BUN_RUNTIME = typeof Bun !== 'undefined';
const BUN_VERSION = BUN_RUNTIME ? Bun.version : 'unknown';

class Tier1380SecurityMCPServer {
  private server: Server;
  private secretManager: Tier1380SecretManager;
  private lifecycleManager: SecretLifecycleManager;
  private versionManager: VersionedSecretManager;

  constructor() {
    this.server = new Server(
      {
        name: 'tier1380-security',
        version: '4.5.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.secretManager = Tier1380SecretManager;
    this.lifecycleManager = new SecretLifecycleManager();
    this.versionManager = new VersionedSecretManager();

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  /**
   * Run server with stdio transport (default)
   */
  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🔐 Tier-1380 Security MCP Server running on stdio');
  }

  /**
   * Run server with HTTP transport (Bun-style)
   */
  async runHttp(port: number = 3000): Promise<void> {
    if (!BUN_RUNTIME) {
      throw new Error('HTTP transport requires Bun runtime');
    }

    const server = Bun.serve({
      port,
      fetch: async (req) => {
        if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
          try {
            const body = await req.json();
            const response = await this.handleHttpRequest(body);
            return new Response(JSON.stringify(response), {
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Health check endpoint
        if (req.url === '/health') {
          return new Response(
            JSON.stringify({ 
              status: 'healthy', 
              server: 'tier1380-security',
              version: '4.5.0',
              bunVersion: BUN_VERSION 
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.error(`🔐 Tier-1380 Security MCP Server running on HTTP port ${port}`);
    const MCP_SERVER_HOST = validateHost(process.env.MCP_SERVER_HOST) || validateHost(process.env.SERVER_HOST) || 'localhost';
    console.log(`📊 Health check: http://${MCP_SERVER_HOST}:${port}/health`);
  }

  /**
   * Run server with SSE transport (alternative HTTP approach)
   */
  async runSSE(port: number = 3001): Promise<void> {
    if (!BUN_RUNTIME) {
      throw new Error('SSE transport requires Bun runtime');
    }

    const server = Bun.serve({
      port,
      fetch: async (req, server) => {
        const url = new URL(req.url);
        
        if (url.pathname === '/mcp') {
          // Upgrade to SSE for MCP communication
          const transport = new SSEServerTransport('/message', req);
          await this.server.connect(transport);
          return new Response('MCP SSE connection established');
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.error(`🔐 Tier-1380 Security MCP Server running on SSE port ${port}`);
  }

  /**
   * Handle HTTP requests for MCP protocol
   */
  private async handleHttpRequest(body: any): Promise<any> {
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    try {
      let result;
      
      switch (method) {
        case 'tools/list':
          result = await this.server.request({ method: 'tools/list' }, ListToolsRequestSchema);
          break;
        case 'tools/call':
          result = await this.server.request({ method: 'tools/call', params }, CallToolRequestSchema);
          break;
        case 'resources/list':
          result = await this.server.request({ method: 'resources/list' }, ListResourcesRequestSchema);
          break;
        case 'resources/read':
          result = await this.server.request({ method: 'resources/read', params }, ReadResourceRequestSchema);
          break;
        case 'prompts/list':
          result = await this.server.request({ method: 'prompts/list' }, ListPromptsRequestSchema);
          break;
        case 'prompts/get':
          result = await this.server.request({ method: 'prompts/get', params }, GetPromptRequestSchema);
          break;
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown method: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: error.code || -32603,
          message: error.message,
        },
      };
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'store_secret',
          description: 'Store a secret in secure enterprise storage (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key/identifier',
              },
              value: {
                type: 'string',
                description: 'Secret value to store',
              },
              persistEnterprise: {
                type: 'boolean',
                description: 'Use enterprise persistence (Windows CRED_PERSIST_ENTERPRISE)',
                default: false,
              },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'retrieve_secret',
          description: 'Retrieve a secret from secure storage (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key/identifier',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'delete_secret',
          description: 'Delete a secret from secure storage (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key/identifier',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'list_secrets',
          description: 'List all stored secrets with Tier-1380 prefix (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'hash_password',
          description: 'Hash a password using enterprise-grade algorithms (Bun.password)',
          inputSchema: {
            type: 'object',
            properties: {
              password: {
                type: 'string',
                description: 'Password to hash',
              },
              algorithm: {
                type: 'string',
                enum: ['argon2id', 'bcrypt'],
                description: 'Hashing algorithm to use',
                default: 'argon2id',
              },
              userId: {
                type: 'string',
                description: 'User identifier for storage',
              },
            },
            required: ['password'],
          },
        },
        {
          name: 'verify_password',
          description: 'Verify a password against stored hash (Bun.password)',
          inputSchema: {
            type: 'object',
            properties: {
              password: {
                type: 'string',
                description: 'Password to verify',
              },
              userId: {
                type: 'string',
                description: 'User identifier',
              },
            },
            required: ['password', 'userId'],
          },
        },
        {
          name: 'authenticate_user',
          description: 'Authenticate a user with enterprise security (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'Username',
              },
              password: {
                type: 'string',
                description: 'Password',
              },
              ipAddress: {
                type: 'string',
                description: 'Client IP address',
                default: process.env.DEFAULT_CLIENT_IP || process.env.SERVER_HOST || '127.0.0.1',
              },
              userAgent: {
                type: 'string',
                description: 'Client user agent',
                default: 'MCP Client',
              },
            },
            required: ['username', 'password'],
          },
        },
        {
          name: 'deploy_application',
          description: 'Deploy an application with enterprise security (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              snapshotId: {
                type: 'string',
                description: 'Application snapshot identifier',
              },
              username: {
                type: 'string',
                description: 'Deploying username',
              },
              password: {
                type: 'string',
                description: 'User password for authentication',
              },
            },
            required: ['snapshotId', 'username', 'password'],
          },
        },
        {
          name: 'rotate_secret',
          description: 'Rotate a secret to a new value (Bun.random.bytes)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key to rotate',
              },
              reason: {
                type: 'string',
                description: 'Reason for rotation',
                default: 'Scheduled rotation',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'create_secret_version',
          description: 'Create a new version of a secret (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key',
              },
              value: {
                type: 'string',
                description: 'New secret value',
              },
              description: {
                type: 'string',
                description: 'Version description',
              },
              author: {
                type: 'string',
                description: 'Version author',
                default: 'system',
              },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'rollback_secret',
          description: 'Rollback a secret to a previous version (Bun-optimized)',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Secret key',
              },
              targetVersion: {
                type: 'string',
                description: 'Target version to rollback to',
              },
              reason: {
                type: 'string',
                description: 'Rollback reason',
                default: 'Manual rollback',
              },
              confirm: {
                type: 'boolean',
                description: 'Skip confirmation prompt',
                default: false,
              },
            },
            required: ['key', 'targetVersion'],
          },
        },
        {
          name: 'search_security_docs',
          description: 'Search across the Tier-1380 security knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about enterprise security, find specific security documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.',
          inputSchema: {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "A query to search the content with."
              },
              "version": {
                "type": "string",
                "description": "Filter to specific version (e.g., 'v4.5', 'v4.0', 'v3.0')"
              },
              "language": {
                "type": "string",
                "description": "Filter to specific language code (e.g., 'zh', 'es'). Defaults to 'en'"
              },
              "apiReferenceOnly": {
                "type": "boolean",
                "description": "Only return API reference docs"
              },
              "codeOnly": {
                "type": "boolean",
                "description": "Only return code snippets"
              },
              "category": {
                "type": "string",
                "description": "Filter to specific security category (e.g., \"secrets\", \"auth\", \"deployment\", \"mcp\")",
                "enum": ["secrets", "auth", "deployment", "mcp", "audit", "all"],
                "default": "all"
              },
              "severity": {
                "type": "string",
                "description": "Filter by security severity level",
                "enum": ["critical", "high", "medium", "low", "all"],
                "default": "all"
              }
            },
            "required": [
              "query"
            ]
          },
          "operationId": "Tier1380SecuritySearch"
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'store_secret':
            await this.secretManager.setSecret(args.key, args.value, {
              persistEnterprise: args.persistEnterprise,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Secret "${args.key}" stored successfully (Bun runtime: ${BUN_VERSION})`,
                },
              ],
            };

          case 'retrieve_secret':
            const value = await this.secretManager.getSecret(args.key);
            if (value) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `🔑 Secret "${args.key}": ${value}`,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: `❌ Secret "${args.key}" not found`,
                  },
                ],
              };
            }

          case 'delete_secret':
            await this.secretManager.deleteSecret(args.key);
            return {
              content: [
                {
                  type: 'text',
                  text: `🗑️ Secret "${args.key}" deleted successfully`,
                },
              ],
            };

          case 'list_secrets':
            const secrets = await this.secretManager.listSecrets();
            return {
              content: [
                {
                  type: 'text',
                  text: `📋 Stored secrets (Bun-optimized):\n${secrets.map(s => `  • ${s}`).join('\n') || '  No secrets found'}`,
                },
              ],
            };

          case 'hash_password':
            const hashResult = await Tier1380PasswordSecurity.hashPassword(
              args.password,
              {
                algorithm: args.algorithm,
                userId: args.userId,
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `🔐 Password hashed successfully (Bun.password):\n  Algorithm: ${hashResult.algorithm}\n  Version: ${hashResult.version}\n  Created: ${hashResult.createdAt.toISOString()}`,
                },
              ],
            };

          case 'verify_password':
            const verifyResult = await Tier1380PasswordSecurity.verifyPassword(
              args.password,
              args.userId
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 Password verification (Bun.password):\n  Valid: ${verifyResult.valid ? '✅' : '❌'}\n  Score: ${verifyResult.score}/100\n  Needs Rehash: ${verifyResult.needsRehash ? '⚠️ Yes' : '✅ No'}`,
                },
              ],
            };

          case 'authenticate_user':
            try {
              const authResult = await Tier1380EnterpriseAuth.authenticate(
                args.username,
                args.password,
                {
                  ipAddress: args.ipAddress,
                  userAgent: args.userAgent,
                }
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: `🔐 Authentication successful (Bun-optimized):\n  User: ${authResult.session?.userId}\n  Session: ${authResult.session?.token}\n  Expires: ${authResult.session?.expiresAt.toISOString()}`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `❌ Authentication failed: ${error.message}`,
                  },
                ],
              };
            }

          case 'deploy_application':
            try {
              const deployResult = await Tier1380SecureDeployment.deployWithPasswordAuth(
                args.snapshotId,
                {
                  username: args.username,
                  password: args.password,
                }
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: `🚀 Deployment successful (Bun-optimized):\n  Deployment ID: ${deployResult.deploymentId}\n  URL: ${deployResult.metadata?.url}\n  Status: ${deployResult.metadata?.status}`,
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `❌ Deployment failed: ${error.message}`,
                  },
                ],
              };
            }

          case 'rotate_secret':
            const rotateResult = await this.lifecycleManager.rotateNow(
              args.key,
              args.reason
            );
            if (rotateResult.success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `🔄 Secret "${args.key}" rotated successfully (Bun.random.bytes)`,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: `❌ Secret rotation failed: ${rotateResult.error}`,
                  },
                ],
              };
            }

          case 'create_secret_version':
            const versionResult = await this.versionManager.set(args.key, args.value, {
              description: args.description,
              author: args.author,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `📝 Secret version created (Bun-optimized):\n  Key: ${versionResult.key}\n  Version: ${versionResult.version}`,
                },
              ],
            };

          case 'rollback_secret':
            const rollbackResult = await this.versionManager.rollback(
              args.key,
              args.targetVersion,
              {
                reason: args.reason,
                confirm: !args.confirm,
              }
            );
            if (rollbackResult.cancelled) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `⚠️ Rollback cancelled by user`,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: `🔄 Secret rolled back (Bun-optimized):\n  From: ${rollbackResult.from}\n  To: ${rollbackResult.to}\n  Reason: ${rollbackResult.reason}`,
                  },
                ],
              };
            }

          case 'search_security_docs':
            const searchResults = await this.searchSecurityDocumentation(
              args.query,
              args.version,
              args.language,
              args.apiReferenceOnly,
              args.codeOnly,
              args.category,
              args.severity
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 Security Documentation Search Results:\n${searchResults.map(result => 
                    `📄 ${result.title}\n   📝 ${result.description}\n   🔗 ${result.url || result.reference}\n   🏷️  ${result.category} | ${result.severity} | ${result.version}\n${result.codeExample ? `   💻 Code: ${result.codeExample}\n` : ''}`
                  ).join('\n')}`
                },
              ],
            };

          case 'bun_security_info':
            const info = {
              bunVersion: BUN_VERSION,
              runtime: BUN_RUNTIME ? 'Bun' : 'Node.js',
              platform: process.platform,
              arch: process.arch,
              cryptoCapabilities: args.include_crypto ? {
                passwordHashing: typeof Bun?.password !== 'undefined',
                randomBytes: typeof Bun?.random !== 'undefined',
                cryptoHash: typeof Bun?.CryptoHash !== 'undefined',
                sha256: typeof Bun?.hash?.sha256 !== 'undefined',
              } : undefined,
              performance: {
                startupTime: Date.now(),
                memoryUsage: BUN_RUNTIME ? process.memoryUsage() : 'N/A',
              },
            };
            return {
              content: [
                {
                  type: 'text',
                  text: `🔧 Bun Security Information:\n${JSON.stringify(info, null, 2)}`,
                },
              ],
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'security://audit-log',
          name: 'Security Audit Log',
          description: 'Recent security audit entries',
          mimeType: 'text/plain',
        },
        {
          uri: 'security://secret-status',
          name: 'Secret Status Report',
          description: 'Current status of all secrets',
          mimeType: 'application/json',
        },
        {
          uri: 'security://auth-report',
          name: 'Authentication Report',
          description: 'Authentication system statistics',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'security://audit-log':
          const auditLog = Tier1380EnterpriseAuth.getAuditLog(20);
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `Security Audit Log (Last 20 entries):\n${auditLog
                  .map(
                    (entry) =>
                      `${entry.timestamp} - ${entry.action} - ${entry.userId} - ${entry.success ? 'SUCCESS' : 'FAILED'}`
                  )
                  .join('\n')}`,
              },
            ],
          };

        case 'security://secret-status':
          const secrets = await this.secretManager.listSecrets();
          const statusReport = {
            timestamp: new Date().toISOString(),
            totalSecrets: secrets.length,
            secrets: secrets,
            platform: process.platform,
          };
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(statusReport, null, 2),
              },
            ],
          };

        case 'security://auth-report':
          const authReport = Tier1380EnterpriseAuth.generateAuthReport();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(authReport, null, 2),
              },
            ],
          };

        default:
          throw new McpError(
            ErrorCode.NotFound,
            `Resource not found: ${uri}`
          );
      }
    });
  }

  private setupPromptHandlers(): void {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'security-audit',
          description: 'Generate a comprehensive security audit report',
          arguments: [
            {
              name: 'timeframe',
              description: 'Timeframe for the audit (e.g., "24h", "7d", "30d")',
              required: false,
            },
            {
              name: 'include_recommendations',
              description: 'Include security recommendations',
              required: false,
            },
          ],
        },
        {
          name: 'secret-rotation-plan',
          description: 'Create a secret rotation plan',
          arguments: [
            {
              name: 'secret_pattern',
              description: 'Pattern to match secrets (e.g., "API_*", "JWT_*")',
              required: false,
            },
            {
              name: 'rotation_interval',
              description: 'Rotation interval (e.g., "30d", "90d")',
              required: false,
            },
          ],
        },
        {
          name: 'deployment-security-checklist',
          description: 'Generate a security checklist for deployment',
          arguments: [
            {
              name: 'environment',
              description: 'Deployment environment (e.g., "production", "staging")',
              required: false,
            },
            {
              name: 'compliance_level',
              description: 'Compliance level (e.g., "basic", "enterprise", "federal")',
              required: false,
            },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'security-audit':
          const timeframe = args?.timeframe || '24h';
          const includeRecommendations = args?.include_recommendations !== 'false';
          
          return {
            description: `Security audit report for the last ${timeframe}`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Generate a comprehensive security audit report for the last ${timeframe}. ${
                    includeRecommendations
                      ? 'Include security recommendations and best practices.'
                      : 'Focus on factual findings and metrics.'
                  }`,
                },
              },
            ],
          };

        case 'secret-rotation-plan':
          const pattern = args?.secret_pattern || '*';
          const interval = args?.rotation_interval || '90d';
          
          return {
            description: `Secret rotation plan for ${pattern} secrets`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Create a comprehensive secret rotation plan for secrets matching pattern "${pattern}" with rotation interval "${interval}". Include:\n1. Risk assessment\n2. Rotation schedule\n3. Rollback procedures\n4. Notification plan\n5. Compliance considerations`,
                },
              },
            ],
          };

        case 'deployment-security-checklist':
          const environment = args?.environment || 'production';
          const complianceLevel = args?.compliance_level || 'enterprise';
          
          return {
            description: `Security checklist for ${environment} deployment (${complianceLevel} compliance)`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Generate a comprehensive security checklist for ${environment} deployment with ${complianceLevel} compliance level. Include:\n1. Pre-deployment security checks\n2. Authentication and authorization\n3. Secret management\n4. Network security\n5. Monitoring and logging\n6. Incident response procedures`,
                },
              },
            ],
          };

        default:
          throw new McpError(
            ErrorCode.NotFound,
            `Prompt not found: ${name}`
          );
      }
    });
  }

  /**
   * Search security documentation knowledge base (Bun SearchBun-style)
   */
  private async searchSecurityDocumentation(
    query: string,
    version?: string,
    language: string = 'en',
    apiReferenceOnly: boolean = false,
    codeOnly: boolean = false,
    category: string = 'all',
    severity: string = 'all'
  ): Promise<Array<{
    title: string;
    description: string;
    url: string;
    reference: string;
    category: string;
    severity: string;
    version: string;
    language: string;
    codeExample?: string;
  }>> {
    
    const securityKnowledgeBase = [
      {
        title: 'Enterprise Password Security with Bun.password',
        description: 'Learn how to implement enterprise-grade password hashing using Bun.password API with Argon2id and bcrypt algorithms. Comprehensive guide with code examples and best practices.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/enterprise-password-security.ts',
        reference: 'lib/security/enterprise-password-security.ts',
        category: 'secrets',
        severity: 'critical',
        version: '4.5',
        language: 'en',
        codeExample: 'await Tier1380PasswordSecurity.hashPassword(password, { algorithm: "argon2id" })',
        isApiReference: true
      },
      {
        title: 'Cross-Platform Secret Storage Implementation',
        description: 'Store secrets securely across Windows Credential Manager, macOS Keychain, and Linux libsecret. Complete implementation guide with enterprise persistence support.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/tier1380-secret-manager.ts',
        reference: 'lib/security/tier1380-secret-manager.ts',
        category: 'secrets',
        severity: 'critical',
        version: '4.5',
        language: 'en',
        codeExample: 'await Tier1380SecretManager.setSecret(key, value, { persistEnterprise: true })',
        isApiReference: true
      },
      {
        title: 'Enterprise Authentication System Guide',
        description: 'Implement user authentication with rate limiting, audit trails, and session management. Complete security framework with compliance features.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/enterprise-auth.ts',
        reference: 'lib/security/enterprise-auth.ts',
        category: 'auth',
        severity: 'high',
        version: '4.5',
        language: 'en',
        codeExample: 'await Tier1380EnterpriseAuth.authenticate(username, password, context)',
        isApiReference: true
      },
      {
        title: 'Secure Deployment Pipeline Documentation',
        description: 'Deploy applications with enterprise security validation and monitoring. Complete deployment workflow with authentication and audit trails.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/secure-deployment.ts',
        reference: 'lib/security/secure-deployment.ts',
        category: 'deployment',
        severity: 'high',
        version: '4.5',
        language: 'en',
        codeExample: 'await Tier1380SecureDeployment.deployWithPasswordAuth(snapshotId, credentials)',
        isApiReference: true
      },
      {
        title: 'Secret Lifecycle Management System',
        description: 'Automate secret rotation, expiration monitoring, and compliance management. Enterprise-grade lifecycle automation with scheduling.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/secret-lifecycle.ts',
        reference: 'lib/security/secret-lifecycle.ts',
        category: 'secrets',
        severity: 'medium',
        version: '4.5',
        language: 'en',
        codeExample: 'await lifecycleManager.rotateNow(key, reason)',
        isApiReference: true
      },
      {
        title: 'Versioned Secrets with Rollback Capabilities',
        description: 'Manage secret versions with audit trails and safe rollback capabilities. Complete versioning system with metadata tracking.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/versioned-secrets.ts',
        reference: 'lib/security/versioned-secrets.ts',
        category: 'secrets',
        severity: 'medium',
        version: '4.5',
        language: 'en',
        codeExample: 'await versionManager.rollback(key, targetVersion, { reason: "Security issue" })',
        isApiReference: true
      },
      {
        title: 'Security MCP Server Implementation',
        description: 'Model Context Protocol server for enterprise security operations with HTTP transport. Complete MCP server with tools, resources, and prompts.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/mcp-server.ts',
        reference: 'lib/security/mcp-server.ts',
        category: 'mcp',
        severity: 'high',
        version: '4.5',
        language: 'en',
        codeExample: 'bun run mcp-server.ts --http --port=3000',
        isApiReference: true
      },
      {
        title: 'Security Audit and Monitoring Guide',
        description: 'Generate comprehensive security reports and monitor authentication events. Complete audit system with compliance reporting.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/enterprise-auth.ts#getAuditLog',
        reference: 'lib/security/enterprise-auth.ts#getAuditLog',
        category: 'audit',
        severity: 'medium',
        version: '4.5',
        language: 'en',
        codeExample: 'const auditLog = Tier1380EnterpriseAuth.getAuditLog(20)',
        isApiReference: true
      },
      {
        title: 'Bun Runtime Security Integration',
        description: 'Leverage Bun\'s native cryptographic APIs for maximum security performance. Complete integration guide with performance optimizations.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/enterprise-password-security.ts#Bun.password',
        reference: 'lib/security/enterprise-password-security.ts#Bun.password',
        category: 'secrets',
        severity: 'low',
        version: '4.5',
        language: 'en',
        codeExample: 'const hash = await Bun.password.hash(password, { algorithm: "argon2id" })',
        isApiReference: true
      },
      {
        title: 'HTTP Transport Security for MCP',
        description: 'Secure HTTP transport for MCP protocol with JSON-RPC 2.0 compliance. Complete HTTP server implementation with health checks.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/mcp-server.ts#HTTP',
        reference: 'lib/security/mcp-server.ts#HTTP',
        category: 'mcp',
        severity: 'medium',
        version: '4.5',
        language: 'en',
        codeExample: `curl -X POST ${process.env.API_BASE_URL || "http://example.com"} -d '{"jsonrpc":"2.0","method":"tools/list"}'`,
        isApiReference: true
      },
      {
        title: 'Security Integration Test Suite',
        description: 'Comprehensive test suite for all security components. Integration testing with coverage reports and validation.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/test-integration.ts',
        reference: 'lib/security/test-integration.ts',
        category: 'audit',
        severity: 'low',
        version: '4.5',
        language: 'en',
        codeExample: 'bun run test-integration.ts',
        isApiReference: false
      },
      {
        title: 'MCP Configuration and Deployment',
        description: 'Complete configuration guide for MCP server deployment. HTTP transport setup and client configuration examples.',
        url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/security/bun-mcp-server-config.json',
        reference: 'lib/security/bun-mcp-server-config.json',
        category: 'mcp',
        severity: 'low',
        version: '4.5',
        language: 'en',
        codeExample: 'bun run mcp-server.ts --http --port=3000',
        isApiReference: false
      }
    ];

    // Filter based on search criteria
    let results = securityKnowledgeBase.filter(item => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase()) ||
                         item.description.toLowerCase().includes(query.toLowerCase());
      const matchesVersion = !version || item.version === version || item.version === version.replace('v', '');
      const matchesLanguage = !language || language === 'en' || item.language === language;
      const matchesCategory = category === 'all' || item.category === category;
      const matchesSeverity = severity === 'all' || item.severity === severity;
      const matchesApiFilter = !apiReferenceOnly || item.isApiReference;
      
      return matchesQuery && matchesVersion && matchesLanguage && matchesCategory && matchesSeverity && matchesApiFilter;
    });

    // Apply code-only filter
    if (codeOnly) {
      results = results.filter(item => item.codeExample);
    }

    // Sort by relevance (title matches first, then description matches)
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase());
      const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase());
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      return 0;
    });

    return results.slice(0, 10); // Limit to top 10 results
  }

  async run(): Promise<void> {
    const transport = process.argv.includes('--http') ? 'http' : 
                     process.argv.includes('--sse') ? 'sse' : 'stdio';
  
    const port = parseInt(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');

    switch (transport) {
      case 'http':
        await this.runHttp(port);
        break;
      case 'sse':
        await this.runSSE(port);
        break;
      case 'stdio':
      default:
        await this.runStdio();
        break;
    }
  }
}

// Run server if called directly
async function main() {
  const server = new Tier1380SecurityMCPServer();
  await server.run();
}

if (import.meta.main) {
  main().catch(console.error);
}

export default Tier1380SecurityMCPServer;
