#!/usr/bin/env bun
// Tension Field MCP Server
// [TENSION-MCP-001] [TENSION-AI-INTEGRATION-002]
// Provides Model Context Protocol server for AI assistant integration

import { serve } from 'bun';
import { Database } from 'bun:sqlite';
import { TensionGraphPropagator } from './src/tension-field/propagate';
import { EnhancedHistoricalAnalyzer } from './src/tension-field/historical-analyzer-enhanced';
import { errorHandler, TensionErrorCode } from './src/tension-field/error-handler';
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";
import { InputValidator } from './src/tension-field/validation';
import { TENSION_CONSTANTS } from './src/tension-field/config';

// MCP Server Configuration
const MCP_SERVER_CONFIG = {
  name: 'tension-field-mcp',
  version: '1.0.0',
  description: 'Tension Field Analysis and Control MCP Server',
  port: parseInt(process.env.MCP_PORT || TENSION_CONSTANTS.DEFAULT_MCP_PORT.toString()),
  host: process.env.MCP_HOST || TENSION_CONSTANTS.DEFAULT_MCP_HOST
};

// Initialize components
const propagator = new TensionGraphPropagator();
const analyzer = new EnhancedHistoricalAnalyzer();
const db = new Database('./tension-mcp.db');

// MCP Tool Definitions
const MCP_TOOLS = {
  // Tension Analysis Tools
  analyze_tension: {
    name: 'analyze_tension',
    description: 'Analyze tension in the graph for a specific node or the entire network',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'Specific node ID to analyze (optional, analyzes entire network if not provided)'
        },
        depth: {
          type: 'number',
          description: 'Depth of analysis (default: 3, range: 1-10)',
          default: TENSION_CONSTANTS.DEFAULT_DEPTH,
          minimum: 1,
          maximum: 10
        },
        includePredictions: {
          type: 'boolean',
          description: 'Include ML predictions in analysis',
          default: false
        }
      }
    }
  },

  // Propagation Control
  propagate_tension: {
    name: 'propagate_tension',
    description: 'Trigger tension propagation from source nodes',
    inputSchema: {
      type: 'object',
      properties: {
        sourceNodes: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ],
          description: 'Source node ID(s) for propagation'
        },
        config: {
          type: 'object',
          description: 'Propagation configuration overrides',
          properties: {
            decayRate: { type: 'number' },
            inertiaFactor: { type: 'number' },
            maxIterations: { type: 'number' }
          }
        }
      },
      required: ['sourceNodes']
    }
  },

  // Risk Assessment
  assess_risk: {
    name: 'assess_risk',
    description: 'Assess risk levels for nodes or the entire network',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'Specific node ID to assess (optional, assesses entire network if not provided)'
        },
        timeHorizon: {
          type: 'number',
          description: 'Time horizon for risk assessment in hours (default: 24, range: 1-168)',
          default: TENSION_CONSTANTS.DEFAULT_TIME_HORIZON,
          minimum: 1,
          maximum: 168
        }
      }
    }
  },

  // Historical Data Query
  query_history: {
    name: 'query_history',
    description: 'Query historical tension data and metrics',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'object',
          description: 'Time range for query',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          }
        },
        nodeId: {
          type: 'string',
          description: 'Filter by specific node ID (optional)'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to retrieve (optional)',
          enum: ['tension', 'volatility', 'predictions', 'anomalies', 'risk']
        }
      }
    }
  },

  // System Status
  get_system_status: {
    name: 'get_system_status',
    description: 'Get current system status and health metrics',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed system information',
          default: false
        }
      }
    }
  },

  // Error Management
  get_errors: {
    name: 'get_errors',
    description: 'Retrieve recent errors and system issues',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          description: 'Filter by error severity',
          enum: ['low', 'medium', 'high', 'critical']
        },
        timeRange: {
          type: 'number',
          description: 'Time range in hours for error filtering (default: 24, range: 1-168)',
          default: TENSION_CONSTANTS.DEFAULT_TIME_RANGE,
          minimum: 1,
          maximum: 168
        },
        limit: {
          type: 'number',
          description: 'Maximum number of errors to return (default: 50, range: 1-1000)',
          default: TENSION_CONSTANTS.DEFAULT_LIMIT,
          minimum: 1,
          maximum: 1000
        }
      }
    }
  }
};

// Tool Implementations
async function handleToolCall(toolName: string, args: any): Promise<any> {
  try {
    // Validate input
    const validation = InputValidator.validateRequest(toolName, args);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors,
        code: 'VALIDATION_ERROR'
      };
    }

    switch (toolName) {
      case 'analyze_tension':
        return await analyzeTension(args);

      case 'propagate_tension':
        return await propagateTension(args);

      case 'assess_risk':
        return await assessRisk(args);

      case 'query_history':
        return await queryHistory(args);

      case 'get_system_status':
        return await getSystemStatus(args);

      case 'get_errors':
        return await getErrors(args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    await errorHandler.handleError(error as Error, { toolName, args });
    return {
      success: false,
      error: (error as Error).message,
      code: (error as any).code || 'UNKNOWN_ERROR'
    };
  }
}

// Tool Implementation Functions
async function analyzeTension(args: any) {
  const { nodeId, depth = 3, includePredictions = false } = args;

  if (nodeId) {
    // Analyze specific node
    const result = await propagator.propagateFullGraph(nodeId);

    if (includePredictions) {
      const predictions = await analyzer.predictNextTension(nodeId);
      return { ...result, predictions };
    }

    return result;
  } else {
    // Analyze entire network
    const nodes = Array.from((propagator as any).nodesById.keys());
    const results = [];

    for (const node of nodes.slice(0, TENSION_CONSTANTS.NETWORK_ANALYSIS_LIMIT)) { // Limit nodes for demo
      const result = await propagator.propagateFullGraph(node as string);
      results.push({ nodeId: node, ...result });
    }

    return { networkAnalysis: results };
  }
}

async function propagateTension(args: any) {
  const { sourceNodes, config } = args;

  // Apply config overrides if provided
  if (config) {
    Object.assign((propagator as any).config, config);
  }

  const result = await propagator.propagateFullGraph(sourceNodes);

  return {
    success: true,
    propagation: result,
    timestamp: new Date().toISOString()
  };
}

async function assessRisk(args: any) {
  const { nodeId, timeHorizon = 24 } = args;

  if (nodeId) {
    return await analyzer.assessRisk(nodeId);
  } else {
    // Get network-wide risk assessment
    const nodes = Array.from((propagator as any).nodesById.keys());
    const riskAssessments = [];

    for (const node of nodes.slice(0, TENSION_CONSTANTS.NETWORK_ANALYSIS_LIMIT)) {
      const risk = await analyzer.assessRisk(node as string);
      riskAssessments.push({ nodeId: node, ...risk });
    }

    return { networkRisk: riskAssessments };
  }
}

async function queryHistory(args: any) {
  const { timeRange, nodeId, metrics } = args;

  let query = 'SELECT * FROM tension_history WHERE 1=1';
  const params: any[] = [];

  if (timeRange?.start) {
    query += ' AND timestamp >= ?';
    params.push(new Date(timeRange.start).getTime());
  }

  if (timeRange?.end) {
    query += ' AND timestamp <= ?';
    params.push(new Date(timeRange.end).getTime());
  }

  if (nodeId) {
    query += ' AND nodeId = ?';
    params.push(nodeId);
  }

  if (metrics && metrics.length > 0) {
    const placeholders = metrics.map(() => '?').join(',');
    query += ` AND metric IN (${placeholders})`;
    params.push(...metrics);
  }

  query += ` ORDER BY timestamp DESC LIMIT ${TENSION_CONSTANTS.QUERY_LIMIT}`;

  const results = db.prepare(query).all(...params);

  return {
    data: results,
    count: results.length,
    query: { timeRange, nodeId, metrics }
  };
}

async function getSystemStatus(args: any) {
  const { includeDetails = false } = args;

  const status: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    propagator: {
      nodeCount: (propagator as any).nodesById?.size || 0,
      edgeCount: (propagator as any).edgesByTarget?.size || 0,
      stats: (propagator as any).stats || {}
    },
    database: {
      connected: true,
      size: Bun.file('./tension-mcp.db').size
    }
  };

  if (includeDetails) {
    const errorStats = errorHandler.getErrorStats();
    status.errors = errorStats;

    // Add recent activity
    const recentActivity = db.prepare(
      'SELECT * FROM tension_history ORDER BY timestamp DESC LIMIT 10'
    ).all();
    status.recentActivity = recentActivity;
  }

  return status;
}

async function getErrors(args: any) {
  const { severity, timeRange = TENSION_CONSTANTS.DEFAULT_TIME_RANGE, limit = TENSION_CONSTANTS.DEFAULT_LIMIT } = args;

  const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

  let query = 'SELECT * FROM error_logs WHERE timestamp > ?';
  const params: any[] = [cutoffTime];

  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const errors = db.prepare(query).all(...params);

  return {
    errors: errors.map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp).toISOString()
    })),
    count: errors.length,
    filters: { severity, timeRange, limit }
  };
}

// MCP HTTP Server
const server = serve({
  port: MCP_SERVER_CONFIG.port,
  hostname: MCP_SERVER_CONFIG.host,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      if (url.pathname === '/') {
        // MCP Server Info
        return new Response(JSON.stringify({
          name: MCP_SERVER_CONFIG.name,
          version: MCP_SERVER_CONFIG.version,
          description: MCP_SERVER_CONFIG.description,
          tools: Object.values(MCP_TOOLS).map(tool => ({
            name: tool.name,
            description: tool.description
          }))
        }), { headers });
      }

      if (url.pathname === '/tools') {
        // List available tools
        return new Response(JSON.stringify(MCP_TOOLS), { headers });
      }

      if (url.pathname === '/call' && req.method === 'POST') {
        // Execute tool call
        const body = await req.json();
        const { tool, arguments: args } = body;

        if (!tool) {
          return new Response(JSON.stringify({ error: 'Tool name required' }), {
            status: 400,
            headers
          });
        }

        const result = await handleToolCall(tool, args);

        return new Response(JSON.stringify({
          success: true,
          result,
          timestamp: new Date().toISOString()
        }), { headers });
      }

      return new Response('Not Found', { status: 404, headers });

    } catch (error) {
      await errorHandler.handleError(error as Error, { url: req.url, method: req.method });

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: (error as Error).message
      }), { status: 500, headers });
    }
  }
});

console.log(`🚀 Tension Field MCP Server running on http://${MCP_SERVER_CONFIG.host}:${MCP_SERVER_CONFIG.port}`);
console.log('\n📋 Available Tools:');
Object.values(MCP_TOOLS).forEach(tool => {
  console.log(`  - ${tool.name}: ${tool.description}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP server...');
  server.stop();
  process.exit(EXIT_CODES.SUCCESS);
});

export default server;
