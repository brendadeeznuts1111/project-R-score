#!/usr/bin/env bun

/**
 * FactoryWager MCP Bridge for Claude Desktop Integration
 * 
 * This bridge connects Claude Desktop with FactoryWager's ecosystem,
 * providing enhanced Bun documentation search with FactoryWager context.
 * 
 * Setup:
 *   cp factorywager-mcp.json ~/.config/claude/mcp.json
 *   Restart Claude Desktop
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { BunMCPClient } from '../lib/mcp/bun-mcp-client.ts';
import { styled, FW_COLORS } from '../lib/theme/colors.ts';
import { SecretManager } from '../lib/security/secrets-v5.ts';
import { r2MCPIntegration } from '../lib/mcp/r2-integration.ts';
import { mcpAuthMiddleware, extractTokenFromRequest, AuthContext } from '../lib/mcp/auth-middleware.ts';
import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';

class FactoryWagerMCPBridge {
  private server: Server;
  private bunClient: BunMCPClient;
  private secrets: SecretManager;
  private r2Integration = r2MCPIntegration;
  private currentAuthContext: AuthContext | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'FactoryWager-Bun-Bridge',
        version: '5.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.bunClient = new BunMCPClient();
    this.secrets = new SecretManager();

    this.setupTools();
    this.setupResources();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'SearchBunEnhanced',
            description: 'Search Bun docs with FactoryWager context and enhanced filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for Bun documentation',
                },
                context: {
                  type: 'string',
                  description: 'FactoryWager context: scanner, secrets, r2, profiling, security',
                  enum: ['scanner', 'secrets', 'r2', 'profiling', 'security', 'general'],
                },
                generateExample: {
                  type: 'boolean',
                  description: 'Generate FactoryWager-style code example',
                  default: false,
                },
                version: {
                  type: 'string',
                  description: 'Bun version to search (e.g., v1.4)',
                  default: 'v1.4',
                },
                includeSecurity: {
                  type: 'boolean',
                  description: 'Include security considerations',
                  default: true,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'GenerateFactoryWagerExample',
            description: 'Generate FactoryWager-style code for any Bun API with best practices',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'Bun API name (e.g., Bun.file, Bun.serve, Bun.secrets)',
                },
                context: {
                  type: 'string',
                  description: 'Usage context for the example',
                  enum: ['scanner', 'r2-upload', 'secrets-manager', 'profiling', 'web-server', 'general'],
                },
                includeSecurity: {
                  type: 'boolean',
                  description: 'Include security best practices',
                  default: true,
                },
                includeErrorHandling: {
                  type: 'boolean',
                  description: 'Include comprehensive error handling',
                  default: true,
                },
              },
              required: ['api'],
            },
          },
          {
            name: 'AuditSearch',
            description: 'Search FactoryWager audit trails in R2 storage',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for audit logs',
                },
                timeframe: {
                  type: 'string',
                  description: 'Timeframe: 1h, 24h, 7d, 30d',
                  default: '24h',
                },
                severity: {
                  type: 'string',
                  description: 'Filter by severity level',
                  enum: ['critical', 'high', 'medium', 'low', 'info'],
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 50,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'DiagnoseError',
            description: 'Diagnose errors using Bun docs and FactoryWager audit history',
            inputSchema: {
              type: 'object',
              properties: {
                errorMessage: {
                  type: 'string',
                  description: 'Error message to diagnose',
                },
                stackTrace: {
                  type: 'string',
                  description: 'Stack trace if available',
                },
                codeContext: {
                  type: 'string',
                  description: 'Relevant code context',
                },
                includeAuditHistory: {
                  type: 'boolean',
                  description: 'Include similar past issues from audit logs',
                  default: true,
                },
              },
              required: ['errorMessage'],
            },
          },
          {
            name: 'ValidateFactoryWagerCode',
            description: 'Validate code against FactoryWager best practices and Bun standards',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Code to validate',
                },
                context: {
                  type: 'string',
                  description: 'Code context for validation rules',
                  enum: ['scanner', 'secrets', 'r2', 'profiling', 'security'],
                },
                strictMode: {
                  type: 'boolean',
                  description: 'Enable strict validation rules',
                  default: false,
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'GetFactoryWagerMetrics',
            description: 'Get performance and usage metrics for FactoryWager tools',
            inputSchema: {
              type: 'object',
              properties: {
                metricType: {
                  type: 'string',
                  description: 'Type of metrics to retrieve',
                  enum: ['performance', 'usage', 'errors', 'security', 'r2-storage'],
                  default: 'performance',
                },
                timeframe: {
                  type: 'string',
                  description: 'Timeframe for metrics',
                  default: '24h',
                },
              },
            },
          },
          {
            name: 'StoreDiagnosis',
            description: 'Store error diagnosis in R2 for institutional learning',
            inputSchema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  description: 'Error object with name, message, and stack',
                },
                fix: {
                  type: 'string',
                  description: 'Generated fix for the error',
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score (0-1)',
                },
                context: {
                  type: 'string',
                  description: 'FactoryWager context',
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata',
                },
              },
              required: ['error', 'fix', 'confidence', 'context'],
            },
          },
          {
            name: 'GenerateWiki',
            description: 'Generate internal wiki documentation for Bun utilities with FactoryWager enhancements',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['markdown', 'html', 'json', 'all'],
                  description: 'Output format for the wiki'
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for internal wiki (e.g., https://wiki.company.com)'
                },
                workspace: {
                  type: 'string',
                  description: 'Workspace name (e.g., engineering/bun-utilities)'
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include code examples in the wiki'
                },
                context: {
                  type: 'string',
                  description: 'Context for wiki generation (e.g., security, performance)'
                },
                token: {
                  type: 'string',
                  description: 'Authentication token for access'
                }
              }
            }
          },
          {
            name: 'GetWikiTemplates',
            description: 'Get available wiki generation templates for different platforms',
            inputSchema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Authentication token for access'
                }
              }
            }
          },
          {
            name: 'GenerateWikiFromTemplate',
            description: 'Generate wiki using a predefined template (Confluence, Notion, GitHub, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                templateName: {
                  type: 'string',
                  description: 'Name of the template to use'
                },
                customizations: {
                  type: 'object',
                  description: 'Custom configuration options'
                },
                token: {
                  type: 'string',
                  description: 'Authentication token for access'
                }
              }
            }
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Extract token from arguments or environment
        const token = args?.token || process.env.MASTER_TOKEN;
        
        // Authenticate the request
        const auth = await mcpAuthMiddleware.claudeDesktop.authenticate(token, {
          ip: 'claude-desktop',
          userAgent: 'claude-desktop-mcp-client'
        });

        if (!auth.success) {
          return {
            content: [
              {
                type: 'text',
                text: `🔒 Authentication failed: ${auth.error}`,
              },
            ],
          };
        }

        // Store auth context for logging
        this.currentAuthContext = auth.authContext;
        
        console.log(styled(`🔐 Authenticated request: ${name} (${auth.authContext.tokenId})`, 'success'));
        await this.bunClient.connect();

        switch (name) {
          case 'SearchBunEnhanced':
            return await this.handleSearchBunEnhanced(args);
            
          case 'GenerateFactoryWagerExample':
            return await this.handleGenerateFactoryWagerExample(args);
            
          case 'AuditSearch':
            return await this.handleAuditSearch(args);
            
          case 'DiagnoseError':
            return await this.handleDiagnoseError(args);
            
          case 'ValidateFactoryWagerCode':
            return await this.handleValidateFactoryWagerCode(args);
            
          case 'GetFactoryWagerMetrics':
            return await this.handleGetFactoryWagerMetrics(args);
            
          case 'StoreDiagnosis':
            return await this.handleStoreDiagnosis(args);
            
          case 'GenerateWiki':
            return await this.handleGenerateWiki(args);
            
          case 'GetWikiTemplates':
            return await this.handleGetWikiTemplates(args);
            
          case 'GenerateWikiFromTemplate':
            return await this.handleGenerateWikiFromTemplate(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private setupResources(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'factorywager://audit-logs',
            name: 'FactoryWager Audit Logs',
            description: 'Access to FactoryWager security and performance audit logs',
            mimeType: 'application/json',
          },
          {
            uri: 'factorywager://performance-metrics',
            name: 'Performance Metrics',
            description: 'Real-time performance metrics for FactoryWager tools',
            mimeType: 'application/json',
          },
          {
            uri: 'factorywager://security-policies',
            name: 'Security Policies',
            description: 'Current FactoryWager security policies and guidelines',
            mimeType: 'text/plain',
          },
          {
            uri: 'factorywager://configuration',
            name: 'FactoryWager Configuration',
            description: 'Current configuration settings and environment variables',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'factorywager://audit-logs':
            return await this.getAuditLogs();
            
          case 'factorywager://performance-metrics':
            return await this.getPerformanceMetrics();
            
          case 'factorywager://security-policies':
            return await this.getSecurityPolicies();
            
          case 'factorywager://configuration':
            return await this.getConfiguration();
            
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Error accessing resource: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private async handleSearchBunEnhanced(args: any): Promise<any> {
    const { query, context, generateExample, version, includeSecurity } = args;
    
    // Search Bun docs
    const results = await this.bunClient.searchBunDocs(query, {
      version,
      context,
      generateExample,
      apiReferenceOnly: true,
    });

    // Enhance with FactoryWager context
    const enhancedResults = results.map(result => ({
      ...result,
      factorywagerContext: context ? this.applyFactoryWagerContext(result.content, context) : null,
      securityNotes: includeSecurity ? this.extractSecurityNotes(result.content) : null,
      relatedAudits: context ? await this.findRelatedAudits(query, context) : null,
    }));

    // Generate example if requested
    let example = null;
    if (generateExample) {
      example = await this.bunClient.generateFactoryWagerExample(query, context);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            context,
            results: enhancedResults,
            generatedExample: example,
            metadata: {
              totalResults: results.length,
              hasSecurityNotes: includeSecurity,
              factorywagerContext: !!context,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async handleGenerateFactoryWagerExample(args: any): Promise<any> {
    const { api, context, includeSecurity, includeErrorHandling } = args;
    
    const baseExample = await this.bunClient.generateFactoryWagerExample(api, context);
    
    // Enhance with FactoryWager patterns
    const enhancedExample = this.enhanceExampleWithPatterns(
      baseExample,
      context,
      includeSecurity,
      includeErrorHandling
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            api,
            context,
            example: enhancedExample,
            patterns: this.getAppliedPatterns(context),
            bestPractices: this.getBestPracticesForContext(context),
          }, null, 2),
        },
      ],
    };
  }

  private async handleAuditSearch(args: any): Promise<any> {
    const { query, timeframe, severity, limit } = args;
    
    try {
      // Use R2 integration for real audit search
      const auditResults = await this.r2Integration.searchSimilarErrors(query, 'general', limit || 50);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              timeframe,
              severity,
              results: auditResults,
              total: auditResults.length,
              source: 'R2 Storage',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // Fallback to mock data if R2 fails
      const mockAuditResults = [
        {
          id: 'audit-001',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          message: `Similar issue found: ${query}`,
          resolution: 'Fixed by updating region configuration',
          affectedComponent: 'secrets-manager',
        },
      ];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              timeframe,
              severity,
              results: mockAuditResults.slice(0, limit),
              total: mockAuditResults.length,
              source: 'Fallback (R2 unavailable)',
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleDiagnoseError(args: any): Promise<any> {
    const { errorMessage, stackTrace, codeContext, includeAuditHistory } = args;
    
    // Search Bun docs for error patterns
    const docsResults = await this.bunClient.searchBunDocs(errorMessage, {
      codeOnly: true,
    });

    // Find similar audit entries
    const auditHistory = includeAuditHistory 
      ? await this.findSimilarErrors(errorMessage)
      : [];

    // Generate diagnosis
    const diagnosis = {
      error: errorMessage,
      bunDocs: docsResults,
      similarPastIssues: auditHistory,
      suggestedFix: this.generateSuggestedFix(errorMessage, docsResults, auditHistory),
      confidence: this.calculateConfidence(docsResults, auditHistory),
      relatedResources: this.findRelatedResources(docsResults),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnosis, null, 2),
        },
      ],
    };
  }

  private async handleValidateFactoryWagerCode(args: any): Promise<any> {
    const { code, context, strictMode } = args;
    
    const validation = await this.bunClient.validateCode(code);
    
    // Add FactoryWager-specific validation
    const factoryWagerValidation = this.validateFactoryWagerPatterns(code, context, strictMode);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid: validation.valid && factoryWagerValidation.valid,
            bunValidation: validation,
            factoryWagerValidation,
            overallScore: this.calculateOverallScore(validation, factoryWagerValidation),
            recommendations: this.getRecommendations(validation, factoryWagerValidation),
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetFactoryWagerMetrics(args: any): Promise<any> {
    const { metricType, timeframe } = args;
    
    if (metricType === 'r2-storage') {
      try {
        const stats = await this.r2Integration.getBucketStats();
        const configStatus = this.r2Integration.getConfigStatus();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                type: metricType,
                timeframe,
                storage: stats,
                configuration: configStatus,
                generated: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                type: metricType,
                timeframe,
                error: error.message,
                generated: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }
    }
    
    // Mock metrics for other types
    const metrics = {
      performance: {
        avgResponseTime: '45ms',
        throughput: '1000 req/s',
        errorRate: '0.1%',
      },
      usage: {
        dailyActiveUsers: 150,
        apiCalls: 50000,
        storageUsed: '2.5GB',
      },
      errors: {
        totalErrors: 12,
        criticalErrors: 1,
        mostCommonError: 'TimeoutError',
      },
      security: {
        securityScore: 94,
        vulnerabilities: 0,
        lastAudit: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            type: metricType,
            timeframe,
            metrics: metrics[metricType] || {},
            generated: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleStoreDiagnosis(args: any): Promise<any> {
    const { error, fix, confidence, context, metadata = {} } = args;
    
    try {
      const diagnosisEntry = {
        id: `diagnosis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        error,
        fix,
        confidence,
        context,
        metadata: {
          ...metadata,
          source: 'mcp-bridge',
          userAgent: 'claude-desktop',
        },
      };
      
      const key = await this.r2Integration.storeDiagnosis(diagnosisEntry);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              key,
              diagnosisId: diagnosisEntry.id,
              timestamp: diagnosisEntry.timestamp,
              message: 'Diagnosis stored successfully in R2',
            }, null, 2),
          },
        ],
      };
    } catch (storageError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: storageError.message,
              message: 'Failed to store diagnosis in R2',
            }, null, 2),
          },
        ],
      };
    }
  }

  // Helper methods
  private applyFactoryWagerContext(content: string, context: string): string {
    // Apply context-specific enhancements
    const contextMap = {
      scanner: '🔍 Scanner-specific optimizations applied',
      secrets: '🔐 Security best practices integrated',
      r2: '☁️ R2 storage patterns included',
      profiling: '📊 Performance profiling considerations added',
      security: '🛡️ Security hardening measures applied',
    };
    
    return contextMap[context] || '📝 General FactoryWager context applied';
  }

  private extractSecurityNotes(content: string): string[] {
    const securityKeywords = ['security', 'authentication', 'authorization', 'encryption', 'token'];
    const notes: string[] = [];
    
    securityKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        notes.push(`🔐 Security consideration: ${keyword}`);
      }
    });
    
    return notes;
  }

  private async findRelatedAudits(query: string, context: string): Promise<any[]> {
    // Mock implementation - integrate with actual audit storage
    return [
      {
        id: 'audit-001',
        timestamp: new Date().toISOString(),
        query,
        context,
        result: 'No similar issues found',
      },
    ];
  }

  private enhanceExampleWithPatterns(
    example: string, 
    context: string, 
    includeSecurity: boolean, 
    includeErrorHandling: boolean
  ): string {
    let enhanced = example;
    
    if (includeErrorHandling) {
      enhanced += '\n\n// FactoryWager Error Handling\ntry {\n  // Your code here\n} catch (error) {\n  console.error(\'Operation failed:\', error);\n  // Implement retry logic or fallback\n}';
    }
    
    if (includeSecurity) {
      enhanced += '\n\n// FactoryWager Security Considerations\n// Validate inputs\n// Sanitize outputs\n// Use secure defaults\n';
    }
    
    return enhanced;
  }

  private getAppliedPatterns(context: string): string[] {
    const patterns = {
      scanner: ['Input validation', 'Output sanitization', 'Rate limiting'],
      secrets: ['Secure storage', 'Access control', 'Audit logging'],
      r2: ['Efficient uploads', 'Metadata management', 'CDN optimization'],
      profiling: ['Performance monitoring', 'Resource tracking', 'Bottleneck identification'],
    };
    
    return patterns[context] || ['General best practices'];
  }

  private getBestPracticesForContext(context: string): string[] {
    const practices = {
      scanner: ['Always validate URLs', 'Implement rate limiting', 'Log all scans'],
      secrets: ['Use environment variables', 'Rotate keys regularly', 'Audit access'],
      r2: ['Use multipart uploads for large files', 'Implement retry logic', 'Monitor storage costs'],
      profiling: ['Profile in production-like environment', 'Monitor memory usage', 'Track performance trends'],
    };
    
    return practices[context] || ['Follow TypeScript best practices', 'Write comprehensive tests', 'Document your code'];
  }

  private async findSimilarErrors(errorMessage: string): Promise<any[]> {
    // Mock implementation
    return [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        error: errorMessage,
        resolution: 'Updated configuration',
        similar: true,
      },
    ];
  }

  private generateSuggestedFix(error: string, docs: any[], audits: any[]): string {
    if (docs.length > 0) {
      return `Based on Bun documentation: ${docs[0].content.slice(0, 200)}...`;
    }
    return 'No specific fix available. Please review the error and documentation.';
  }

  private calculateConfidence(docs: any[], audits: any[]): number {
    let confidence = 0.5;
    
    if (docs.length > 0) confidence += 0.3;
    if (audits.length > 0) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private findRelatedResources(docs: any[]): string[] {
    return docs.flatMap(doc => doc.links || []);
  }

  private validateFactoryWagerPatterns(code: string, context: string, strictMode: boolean): any {
    // Mock validation logic
    return {
      valid: true,
      issues: [],
      suggestions: ['Consider adding error handling', 'Add input validation'],
    };
  }

  private calculateOverallScore(bunValidation: any, fwValidation: any): number {
    const bunScore = bunValidation.valid ? 0.8 : 0.4;
    const fwScore = fwValidation.valid ? 0.9 : 0.6;
    
    return Math.round((bunScore + fwScore) / 2 * 100);
  }

  private getRecommendations(bunValidation: any, fwValidation: any): string[] {
    const recommendations: string[] = [];
    
    if (!bunValidation.valid) {
      recommendations.push('Fix Bun validation errors');
    }
    
    if (!fwValidation.valid) {
      recommendations.push('Address FactoryWager pattern issues');
    }
    
    recommendations.push('Consider adding more comprehensive tests');
    
    return recommendations;
  }

  // Resource handlers
  private async getAuditLogs(): Promise<any> {
    return {
      contents: [
        {
          uri: 'factorywager://audit-logs',
          mimeType: 'application/json',
          text: JSON.stringify({
            logs: [
              {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'MCP Bridge initialized',
                component: 'mcp-bridge',
              },
            ],
          }, null, 2),
        },
      ],
    };
  }

  private async getPerformanceMetrics(): Promise<any> {
    return {
      contents: [
        {
          uri: 'factorywager://performance-metrics',
          mimeType: 'application/json',
          text: JSON.stringify({
            metrics: {
              responseTime: '25ms',
              throughput: '100 req/s',
              memoryUsage: '45MB',
            },
          }, null, 2),
        },
      ],
    };
  }

  private async getSecurityPolicies(): Promise<any> {
    return {
      contents: [
        {
          uri: 'factorywager://security-policies',
          mimeType: 'text/plain',
          text: `FactoryWager Security Policies v5.0

1. All API calls must be authenticated
2. Sensitive data must be encrypted at rest
3. Audit all access to sensitive resources
4. Implement rate limiting on all endpoints
5. Regular security audits required
          `,
        },
      ],
    };
  }

  private async getConfiguration(): Promise<any> {
    return {
      contents: [
        {
          uri: 'factorywager://configuration',
          mimeType: 'application/json',
          text: JSON.stringify({
            version: '5.0.0',
            environment: process.env.NODE_ENV || 'development',
            features: {
              mcpIntegration: true,
              securityAuditing: true,
              performanceMonitoring: true,
            },
          }, null, 2),
        },
      ],
    };
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Server is now running and handling requests
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}

// Start the MCP bridge if this file is executed directly
if (import.meta.main) {
  const bridge = new FactoryWagerMCPBridge();
  await bridge.start();
}
