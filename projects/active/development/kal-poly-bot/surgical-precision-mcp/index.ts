#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { Decimal } from 'decimal.js';
import { SurgicalTarget } from './surgical-target';
import { ContainedExecutionEngine } from './execution-engine';
import { PrecisionUtils, TargetValidationError, HTMLRewriterUtils } from './precision-utils';
import { ComplianceAuditSystem } from './audit-system';
import { spawn } from 'child_process';

/**
 * Feature Flags Configuration
 */
const SURGICAL_DEBUG = process.env.SURGICAL_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
const SURGICAL_VERSION = process.env.SURGICAL_VERSION || '1.1.0';

/**
 * Debug logging utility
 */
const debugLog = (category: string, ...args: unknown[]) => {
  if (SURGICAL_DEBUG) {
    console.error(`[DEBUG:${category}]`, PrecisionUtils.timestamp(), ...args);
  }
};

/**
 * SURGICAL PRECISION MCP SERVER
 */
class SurgicalPrecisionServer {
  private server: Server;
  private precisionTargets: SurgicalTarget[] = [];
  private executionEngines: ContainedExecutionEngine[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'surgical-precision-server',
        version: '1.0.0-strict',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[SURGICAL PRECISION ERROR]', error);

    const shutdown = async (signal: string) => {
      console.error(`[SHUTDOWN] Received ${signal} - terminating gracefully...`);
      try {
        await this.server.close();
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'precision://compliance/daily-report',
          name: 'Daily Compliance Report',
          description: 'Automated daily validation of precision standards',
          mimeType: 'application/json',
        },
        {
          uri: 'precision://targets/active',
          name: 'Active Precision Targets',
          description: 'Currently validated surgical targets',
          mimeType: 'application/json',
        }
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      switch (uri) {
        case 'precision://compliance/daily-report': {
          const report = ComplianceAuditSystem.dailyComplianceReport();
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }] };
        }
        case 'precision://targets/active': {
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                totalTargets: this.precisionTargets.length,
                activeTargets: this.precisionTargets.map(t => t.toJSON()),
                lastUpdated: PrecisionUtils.timestamp()
              }, null, 2),
            }],
          };
        }
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'validate_surgical_target',
          description: 'Create and validate an immutable surgical target with 6+ decimal precision',
          inputSchema: {
            type: 'object',
            properties: {
              targetIdentifier: { type: 'string' },
              coordinateX: { type: 'string' },
              coordinateY: { type: 'string' },
              entryThreshold: { type: 'string' },
              exitThreshold: { type: 'string' },
              confidenceScore: { type: 'string' },
            },
            required: ['targetIdentifier', 'coordinateX', 'coordinateY', 'entryThreshold', 'exitThreshold', 'confidenceScore'],
          },
        },
        {
          name: 'execute_contained_operation',
          description: 'Execute isolated operation with zero-collateral guarantees',
          inputSchema: {
            type: 'object',
            properties: {
              targetIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['targetIds'],
          },
        },
        {
          name: 'generate_compliance_report',
          description: 'Generate detailed compliance validation report',
          inputSchema: { type: 'object', properties: { reportDate: { type: 'string' } } },
        },
        {
          name: 'surgical_search',
          description: 'Ultra-fast precision text search using ripgrep',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              path: { type: 'string' },
              caseInsensitive: { type: 'boolean' },
              wholeWord: { type: 'boolean' },
              maxResults: { type: 'number' },
            },
            required: ['pattern', 'path'],
          },
        },
        {
          name: 'surgical_link_extract',
          description: 'Extract and analyze links from HTML content using Bun HTMLRewriter',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              sourceType: { type: 'string', enum: ['html', 'url'] },
              baseUrl: { type: 'string' },
              filterCategory: { type: 'string', enum: ['navigation', 'resource', 'external', 'internal', 'anchor', 'all'] },
              maxLinks: { type: 'number' },
              outputFormat: { type: 'string', enum: ['detailed', 'compact', 'json'] },
            },
            required: ['source', 'sourceType'],
          },
        },
        {
          name: 'ast_grep_search',
          description: 'AST-aware code pattern search using ast-grep',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              path: { type: 'string' },
              lang: { type: 'string' },
            },
            required: ['pattern', 'path'],
          },
        },
        {
          name: 'lsp_hover',
          description: 'Get type information and docs at a specific position',
          inputSchema: {
            type: 'object',
            properties: { uri: { type: 'string' }, line: { type: 'number' }, character: { type: 'number' } },
            required: ['uri', 'line', 'character'],
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (!args) throw new Error('Arguments required');

      switch (name) {
        case 'validate_surgical_target': {
          const target = new SurgicalTarget(
            String(args.targetIdentifier),
            new Decimal(String(args.coordinateX)),
            new Decimal(String(args.coordinateY)),
            new Decimal(String(args.entryThreshold)),
            new Decimal(String(args.exitThreshold)),
            new Decimal(String(args.confidenceScore))
          );
          this.precisionTargets.push(target);
          return { content: [{ type: 'text', text: `✅ Target validated: ${target.toString()}` }] };
        }

        case 'execute_contained_operation': {
          const targets = this.precisionTargets.filter(t => (args.targetIds as string[]).includes(t.targetIdentifier));
          if (targets.length === 0) return { content: [{ type: 'text', text: '❌ No valid targets found' }], isError: true };
          const engine = new ContainedExecutionEngine(targets);
          const metrics = engine.executeIsolatedOperation();
          return { content: [{ type: 'text', text: `✅ Operation Complete. Success Rate: ${PrecisionUtils.format(metrics.successRate)}` }] };
        }

        case 'surgical_search': {
          // @ts-ignore
          const ripgrepPath = Bun.which('rg');
          if (!ripgrepPath) return { content: [{ type: 'text', text: '❌ ripgrep not found' }], isError: true };
          return new Promise((resolve) => {
            const rg = spawn(ripgrepPath, [String(args.pattern), String(args.path)]);
            let out = '';
            rg.stdout.on('data', d => out += d);
            rg.on('close', () => resolve({ content: [{ type: 'text', text: out }] }));
          });
        }

        case 'ast_grep_search': {
          // @ts-ignore
          const sgPath = Bun.which('ast-grep');
          if (!sgPath) return { content: [{ type: 'text', text: '❌ ast-grep not found' }], isError: true };
          return new Promise((resolve) => {
            const proc = spawn(sgPath, ['run', '--pattern', String(args.pattern), String(args.path), '--json']);
            let out = '';
            proc.stdout.on('data', d => out += d);
            proc.on('close', () => resolve({ content: [{ type: 'text', text: out }] }));
          });
        }

        case 'lsp_hover': {
          return { content: [{ type: 'text', text: `⚠️ LSP Hover proxy for ${args.uri} at ${args.line}:${args.character}` }] };
        }

        case 'surgical_link_extract': {
          const result = (args.sourceType === 'url') 
            ? await HTMLRewriterUtils.extractLinksFromUrl(String(args.source))
            : await HTMLRewriterUtils.extractLinks(String(args.source), String(args.baseUrl));
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Surgical Precision MCP server running');
  }
}

const server = new SurgicalPrecisionServer();
server.run().catch(console.error);
