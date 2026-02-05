#!/usr/bin/env bun

/**
 * FactoryWager Bun MCP Server
 * 
 * Core MCP server providing Bun documentation access with FactoryWager enhancements.
 * This server connects to Bun's official documentation and provides context-aware
 * responses tailored for FactoryWager's ecosystem.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { styled, FW_COLORS } from '../theme/colors.ts';

interface BunDocResult {
  title: string;
  content: string;
  url: string;
  relevance: number;
  type: 'api' | 'guide' | 'example' | 'reference';
}

interface SearchOptions {
  version?: string;
  type?: string;
  context?: string;
  includeExamples?: boolean;
}

class BunMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'FactoryWager-Bun-Docs',
        version: '5.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

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
            name: 'SearchBun',
            description: 'Search Bun documentation with FactoryWager context',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for Bun documentation',
                },
                version: {
                  type: 'string',
                  description: 'Bun version (e.g., v1.4)',
                  default: 'v1.4',
                },
                type: {
                  type: 'string',
                  description: 'Content type filter',
                  enum: ['api', 'guide', 'example', 'reference'],
                },
                context: {
                  type: 'string',
                  description: 'FactoryWager context for enhanced results',
                  enum: ['scanner', 'secrets', 'r2', 'profiling', 'general'],
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include code examples in results',
                  default: true,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'ExplainCode',
            description: 'Explain Bun code with context and examples',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Bun code to explain',
                },
                context: {
                  type: 'string',
                  description: 'Context for explanation',
                  enum: ['scanner', 'secrets', 'r2', 'profiling', 'general'],
                  default: 'general',
                },
                generateExample: {
                  type: 'boolean',
                  description: 'Generate improved example',
                  default: false,
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'ValidateCode',
            description: 'Validate Bun code against best practices',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Bun code to validate',
                },
                strict: {
                  type: 'boolean',
                  description: 'Enable strict validation',
                  default: false,
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'GetAPIReference',
            description: 'Get detailed API reference for Bun functions',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'API name (e.g., Bun.file, Bun.serve)',
                },
                version: {
                  type: 'string',
                  description: 'Bun version',
                  default: 'v1.4',
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include usage examples',
                  default: true,
                },
              },
              required: ['api'],
            },
          },
          {
            name: 'GenerateFactoryWagerExample',
            description: 'Generate FactoryWager-style code examples',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'Bun API name',
                },
                context: {
                  type: 'string',
                  description: 'FactoryWager context',
                  enum: ['scanner', 'secrets', 'r2', 'profiling', 'web-server', 'general'],
                  default: 'general',
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
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'SearchBun':
            return await this.handleSearchBun(args);
            
          case 'ExplainCode':
            return await this.handleExplainCode(args);
            
          case 'ValidateCode':
            return await this.handleValidateCode(args);
            
          case 'GetAPIReference':
            return await this.handleGetAPIReference(args);
            
          case 'GenerateFactoryWagerExample':
            return await this.handleGenerateFactoryWagerExample(args);
            
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
            uri: 'bun://docs/latest',
            name: 'Latest Bun Documentation',
            description: 'Complete Bun documentation index',
            mimeType: 'application/json',
          },
          {
            uri: 'bun://api/reference',
            name: 'Bun API Reference',
            description: 'Complete API reference for all Bun functions',
            mimeType: 'application/json',
          },
          {
            uri: 'bun://examples',
            name: 'Bun Code Examples',
            description: 'Collection of Bun code examples',
            mimeType: 'application/json',
          },
          {
            uri: 'factorywager://patterns',
            name: 'FactoryWager Patterns',
            description: 'FactoryWager-specific patterns and best practices',
            mimeType: 'text/plain',
          },
        ],
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'bun://docs/latest':
            return await this.getBunDocumentation();
            
          case 'bun://api/reference':
            return await this.getAPIReference();
            
          case 'bun://examples':
            return await this.getCodeExamples();
            
          case 'factorywager://patterns':
            return await this.getFactoryWagerPatterns();
            
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

  // Tool handlers
  private async handleSearchBun(args: any): Promise<any> {
    const { query, version = 'v1.4', type, context, includeExamples = true } = args;
    
    // Simulate searching Bun documentation
    const results = await this.searchBunDocs(query, { version, type, context, includeExamples });
    
    // Enhance with FactoryWager context
    const enhancedResults = results.map(result => ({
      ...result,
      factorywagerContext: context ? this.applyFactoryWagerContext(result, context) : null,
      confidence: this.calculateConfidence(result, query),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            version,
            context,
            results: enhancedResults,
            totalResults: enhancedResults.length,
            metadata: {
              searchTime: Date.now(),
              hasContext: !!context,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async handleExplainCode(args: any): Promise<any> {
    const { code, context = 'general', generateExample = false } = args;
    
    // Analyze the code
    const analysis = this.analyzeCode(code);
    
    // Get relevant documentation
    const docs = await this.searchBunDocs(analysis.apiCalls.join(' '), {
      context,
      includeExamples: true,
    });

    // Generate explanation
    const explanation = this.generateExplanation(code, analysis, docs, context);
    
    // Generate improved example if requested
    let improvedExample = null;
    if (generateExample) {
      improvedExample = await this.generateImprovedExample(code, analysis, context);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            originalCode: code,
            explanation,
            analysis,
            relatedDocs: docs.slice(0, 3),
            improvedExample,
            context,
            recommendations: this.getRecommendations(analysis, context),
          }, null, 2),
        },
      ],
    };
  }

  private async handleValidateCode(args: any): Promise<any> {
    const { code, strict = false } = args;
    
    const validation = this.validateBunCode(code, strict);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            suggestions: validation.suggestions,
            score: validation.score,
            strictMode: strict,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetAPIReference(args: any): Promise<any> {
    const { api, version = 'v1.4', includeExamples = true } = args;
    
    const reference = await this.getAPIReferenceForFunction(api, version);
    
    if (includeExamples) {
      reference.examples = await this.getExamplesForAPI(api, version);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(reference, null, 2),
        },
      ],
    };
  }

  private async handleGenerateFactoryWagerExample(args: any): Promise<any> {
    const { api, context = 'general', includeSecurity = true, includeErrorHandling = true } = args;
    
    const baseExample = await this.getBaseExampleForAPI(api);
    const enhancedExample = this.enhanceExampleForFactoryWager(
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
            features: {
              hasSecurity: includeSecurity,
              hasErrorHandling: includeErrorHandling,
              hasFactoryWagerPatterns: true,
            },
            bestPractices: this.getBestPracticesForContext(context),
            securityConsiderations: includeSecurity ? this.getSecurityConsiderations(api, context) : [],
          }, null, 2),
        },
      ],
    };
  }

  // Resource handlers
  private async getBunDocumentation(): Promise<any> {
    return {
      contents: [
        {
          uri: 'bun://docs/latest',
          mimeType: 'application/json',
          text: JSON.stringify({
            version: 'v1.4',
            lastUpdated: new Date().toISOString(),
            sections: [
              { name: 'Runtime', path: '/docs/runtime' },
              { name: 'Bundler', path: '/docs/bundler' },
              { name: 'Test Runner', path: '/docs/test-runner' },
              { name: 'Package Manager', path: '/docs/installer' },
            ],
          }, null, 2),
        },
      ],
    };
  }

  private async getAPIReference(): Promise<any> {
    return {
      contents: [
        {
          uri: 'bun://api/reference',
          mimeType: 'application/json',
          text: JSON.stringify({
            apis: [
              'Bun.file', 'Bun.write', 'Bun.serve', 'Bun.fetch',
              'Bun.secrets', 'Bun.sql', 'Bun.password', 'Bun.gzip',
              'Bun.stdin', 'Bun.stdout', 'Bun.stderr'
            ],
            categories: {
              'File System': ['Bun.file', 'Bun.write', 'Bun.stdin'],
              'Network': ['Bun.serve', 'Bun.fetch'],
              'Security': ['Bun.secrets', 'Bun.password'],
              'Database': ['Bun.sql'],
              'Utilities': ['Bun.gzip', 'Bun.stdout', 'Bun.stderr'],
            },
          }, null, 2),
        },
      ],
    };
  }

  private async getCodeExamples(): Promise<any> {
    return {
      contents: [
        {
          uri: 'bun://examples',
          mimeType: 'application/json',
          text: JSON.stringify({
            examples: [
              {
                api: 'Bun.serve',
                title: 'HTTP Server',
                description: 'Create a simple HTTP server',
              },
              {
                api: 'Bun.file',
                title: 'File Operations',
                description: 'Read and write files efficiently',
              },
            ],
          }, null, 2),
        },
      ],
    };
  }

  private async getFactoryWagerPatterns(): Promise<any> {
    return {
      contents: [
        {
          uri: 'factorywager://patterns',
          mimeType: 'text/plain',
          text: `FactoryWager Patterns v5.0

1. Security First Pattern
   - Always validate inputs
   - Use secure defaults
   - Implement proper error handling

2. Performance Pattern
   - Use Bun's built-in optimizations
   - Implement caching strategies
   - Monitor performance metrics

3. Scanner Pattern
   - Validate URLs before processing
   - Implement rate limiting
   - Log all scanning activities

4. R2 Storage Pattern
   - Use multipart uploads for large files
   - Implement retry logic
   - Optimize for CDN delivery

5. Secrets Management Pattern
   - Use environment variables
   - Implement access controls
   - Audit all secret access
          `,
        },
      ],
    };
  }

  // Helper methods
  private async searchBunDocs(query: string, options: SearchOptions): Promise<BunDocResult[]> {
    // Mock implementation - in reality, this would scrape/search bun.sh docs
    const mockResults: BunDocResult[] = [
      {
        title: `Bun.${query} API Reference`,
        content: `Comprehensive documentation for Bun.${query} function with parameters, examples, and best practices.`,
        url: `https://bun.sh/docs/api/${query.toLowerCase()}`,
        relevance: 0.9,
        type: 'api',
      },
      {
        title: `Using ${query} in Practice`,
        content: `Practical guide for using ${query} in real-world applications with performance tips.`,
        url: `https://bun.sh/docs/guides/${query.toLowerCase()}`,
        relevance: 0.8,
        type: 'guide',
      },
    ];

    // Filter by type if specified
    if (options.type) {
      return mockResults.filter(result => result.type === options.type);
    }

    return mockResults;
  }

  private applyFactoryWagerContext(result: BunDocResult, context: string): string {
    const contextMap = {
      scanner: '🔍 Scanner-specific: Add URL validation and rate limiting',
      secrets: '🔐 Security: Ensure proper secret management and access controls',
      r2: '☁️ R2 Storage: Optimize for cloud storage and CDN delivery',
      profiling: '📊 Performance: Add monitoring and performance tracking',
      general: '📝 General: Follow FactoryWager best practices',
    };
    
    return contextMap[context] || contextMap.general;
  }

  private calculateConfidence(result: BunDocResult, query: string): number {
    let confidence = result.relevance;
    
    // Boost confidence for exact matches
    if (result.title.toLowerCase().includes(query.toLowerCase())) {
      confidence += 0.1;
    }
    
    // Boost confidence for API docs
    if (result.type === 'api') {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  private analyzeCode(code: string): any {
    // Simple code analysis
    const apiCalls = [];
    
    if (code.includes('Bun.file')) apiCalls.push('Bun.file');
    if (code.includes('Bun.serve')) apiCalls.push('Bun.serve');
    if (code.includes('Bun.fetch')) apiCalls.push('Bun.fetch');
    if (code.includes('Bun.secrets')) apiCalls.push('Bun.secrets');
    if (code.includes('Bun.sql')) apiCalls.push('Bun.sql');

    return {
      apiCalls,
      hasErrorHandling: code.includes('try') && code.includes('catch'),
      hasAsync: code.includes('async') || code.includes('await'),
      lineCount: code.split('\n').length,
    };
  }

  private generateExplanation(code: string, analysis: any, docs: BunDocResult[], context: string): string {
    let explanation = `This code uses the following Bun APIs: ${analysis.apiCalls.join(', ')}.\n\n`;
    
    if (docs.length > 0) {
      explanation += `According to the documentation:\n`;
      docs.slice(0, 2).forEach(doc => {
        explanation += `- ${doc.content}\n`;
      });
    }

    if (context !== 'general') {
      explanation += `\nIn the ${context} context, consider additional security and performance measures.`;
    }

    return explanation;
  }

  private async generateImprovedExample(code: string, analysis: any, context: string): Promise<string> {
    // Generate an improved version of the code
    let improved = code;

    if (!analysis.hasErrorHandling) {
      improved = `try {\n  ${improved}\n} catch (error) {\n  console.error('Operation failed:', error);\n  // Handle error appropriately\n}`;
    }

    if (context === 'scanner') {
      improved += '\n\n// Scanner-specific additions\nconst isValidUrl = (url) => {\n  try {\n    new URL(url);\n    return true;\n  } catch {\n    return false;\n  }\n};';
    }

    return improved;
  }

  private getRecommendations(analysis: any, context: string): string[] {
    const recommendations = [];
    
    if (!analysis.hasErrorHandling) {
      recommendations.push('Add error handling with try/catch blocks');
    }
    
    if (!analysis.hasAsync && analysis.apiCalls.length > 0) {
      recommendations.push('Consider using async/await for better performance');
    }
    
    if (context === 'security' || context === 'secrets') {
      recommendations.push('Implement proper security measures');
    }

    return recommendations;
  }

  private validateBunCode(code: string, strict: boolean): any {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Basic validation
    if (!code.trim()) {
      errors.push('Code cannot be empty');
    }

    // Check for common issues
    if (code.includes('eval(')) {
      errors.push('Avoid using eval() - security risk');
    }

    if (code.includes('console.log') && strict) {
      warnings.push('Console.log statements should be removed in production');
    }

    if (!code.includes('await') && code.includes('async')) {
      suggestions.push('Consider using await with async operations');
    }

    const score = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 10) - (suggestions.length * 5));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    };
  }

  private async getAPIReferenceForFunction(api: string, version: string): Promise<any> {
    // Mock API reference
    return {
      name: api,
      version,
      description: `Bun ${api} function documentation`,
      parameters: [],
      returns: 'Promise<any>',
      examples: [],
      seeAlso: [],
    };
  }

  private async getExamplesForAPI(api: string, version: string): Promise<any[]> {
    // Mock examples
    return [
      {
        title: `Basic ${api} usage`,
        code: `// Example usage of ${api}\nconst result = await ${api}(...args);`,
      },
    ];
  }

  private async getBaseExampleForAPI(api: string): Promise<string> {
    const examples = {
      'Bun.file': `const file = Bun.file('example.txt');
const content = await file.text();`,
      'Bun.serve': `const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello World');
  }
});`,
      'Bun.fetch': `const response = await Bun.fetch('https://example.com');
const data = await response.json();`,
    };

    return examples[api] || `// Example for ${api}\nconst result = await ${api}();`;
  }

  private enhanceExampleForFactoryWager(
    baseExample: string,
    context: string,
    includeSecurity: boolean,
    includeErrorHandling: boolean
  ): string {
    let enhanced = baseExample;

    if (includeErrorHandling && !enhanced.includes('try')) {
      enhanced = `try {\n  ${enhanced}\n} catch (error) {\n  console.error('Operation failed:', error);\n  // Implement appropriate error handling\n}`;
    }

    if (includeSecurity) {
      enhanced += '\n\n// Security considerations\n// Validate inputs\n// Use secure defaults\n// Implement proper access controls';
    }

    if (context !== 'general') {
      enhanced += `\n\n// ${context}-specific enhancements\n// Add context-specific optimizations and patterns`;
    }

    return enhanced;
  }

  private getBestPracticesForContext(context: string): string[] {
    const practices = {
      scanner: ['Validate all URLs', 'Implement rate limiting', 'Log all activities'],
      secrets: ['Use environment variables', 'Implement access controls', 'Audit access'],
      r2: ['Use multipart uploads', 'Implement retry logic', 'Optimize for CDN'],
      profiling: ['Monitor performance', 'Track resource usage', 'Identify bottlenecks'],
      general: ['Write clean code', 'Add comprehensive tests', 'Document your code'],
    };

    return practices[context] || practices.general;
  }

  private getSecurityConsiderations(api: string, context: string): string[] {
    const considerations = [
      'Validate all user inputs',
      'Use secure authentication mechanisms',
      'Implement proper error handling',
      'Audit sensitive operations',
    ];

    if (api.includes('file') || api.includes('write')) {
      considerations.push('Validate file paths and types');
      considerations.push('Implement file size limits');
    }

    if (api.includes('serve') || api.includes('fetch')) {
      considerations.push('Use HTTPS connections');
      considerations.push('Implement rate limiting');
    }

    return considerations;
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

// Start the MCP server if this file is executed directly
if (import.meta.main) {
  const server = new BunMCPServer();
  await server.start();
}
