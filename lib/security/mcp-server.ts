/**
 * 🔐 Tier-1380 Security MCP Server
 * 
 * Model Context Protocol server for enterprise security operations
 * Exposes security tools, resources, and prompts to LLM applications
 * 
 * @version 4.5
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

import Tier1380SecretManager from './tier1380-secret-manager.ts';
import { Tier1380PasswordSecurity } from './enterprise-password-security.ts';
import { Tier1380EnterpriseAuth } from './enterprise-auth.ts';
import { Tier1380SecureDeployment } from './secure-deployment.ts';
import { SecretLifecycleManager } from './secret-lifecycle.ts';
import { VersionedSecretManager } from './versioned-secrets.ts';

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

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'store_secret',
          description: 'Store a secret in secure enterprise storage',
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
          description: 'Retrieve a secret from secure storage',
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
          description: 'Delete a secret from secure storage',
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
          description: 'List all stored secrets with Tier-1380 prefix',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'hash_password',
          description: 'Hash a password using enterprise-grade algorithms',
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
          description: 'Verify a password against stored hash',
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
          description: 'Authenticate a user with enterprise security',
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
                default: '127.0.0.1',
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
          description: 'Deploy an application with enterprise security',
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
          description: 'Rotate a secret to a new value',
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
          description: 'Create a new version of a secret',
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
          description: 'Rollback a secret to a previous version',
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
                  text: `✅ Secret "${args.key}" stored successfully`,
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
                  text: `📋 Stored secrets:\n${secrets.map(s => `  • ${s}`).join('\n') || '  No secrets found'}`,
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
                  text: `🔐 Password hashed successfully:\n  Algorithm: ${hashResult.algorithm}\n  Version: ${hashResult.version}\n  Created: ${hashResult.createdAt.toISOString()}`,
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
                  text: `🔍 Password verification:\n  Valid: ${verifyResult.valid ? '✅' : '❌'}\n  Score: ${verifyResult.score}/100\n  Needs Rehash: ${verifyResult.needsRehash ? '⚠️ Yes' : '✅ No'}`,
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
                    text: `🔐 Authentication successful:\n  User: ${authResult.session?.userId}\n  Session: ${authResult.session?.token}\n  Expires: ${authResult.session?.expiresAt.toISOString()}`,
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
                    text: `🚀 Deployment successful:\n  Deployment ID: ${deployResult.deploymentId}\n  URL: ${deployResult.metadata?.url}\n  Status: ${deployResult.metadata?.status}`,
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
                    text: `🔄 Secret "${args.key}" rotated successfully`,
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
                  text: `📝 Secret version created:\n  Key: ${versionResult.key}\n  Version: ${versionResult.version}`,
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
                    text: `🔄 Secret rolled back:\n  From: ${rollbackResult.from}\n  To: ${rollbackResult.to}\n  Reason: ${rollbackResult.reason}`,
                  },
                ],
              };
            }

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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🔐 Tier-1380 Security MCP Server running on stdio');
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
