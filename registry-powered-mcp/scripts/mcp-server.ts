#!/usr/bin/env bun
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import * as z from "zod/v4";
import { ConfigManager } from "./src/config.js";
import { Logger } from "./src/logger.js";
import { SearchEngine } from "./src/search.js";
import { BunTools } from "./src/tools.js";

// Initialize components
const configManager = new ConfigManager();
const config = configManager.getConfig();
const logger = new Logger(config.logging.level, true);
const searchEngine = new SearchEngine();
const bunTools = new BunTools(searchEngine);

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const getServer = () => {
  const server = new McpServer(
    {
      name: config.server.name,
      version: config.server.version,
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Register SearchBun tool
  server.registerTool(
    "SearchBun",
    {
      description:
        "Enhanced search across multiple sources including Bun documentation, GitHub repositories, NPM packages, and community content. Returns comprehensive results with relevance scoring and caching.",
      inputSchema: {
        query: z
          .string()
          .describe("Search query for Bun documentation and resources"),
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      const startTime = Date.now();
      const requestId = generateRequestId();

      try {
        logger.info(`Search request received: ${query}`, { query }, requestId);

        if (!query || typeof query !== "string") {
          throw new Error("Query parameter is required and must be a string");
        }

        const searchResults = await searchEngine.searchBunDocumentation(query);
        const duration = Date.now() - startTime;

        logger.performance(
          `Search completed for: ${query}`,
          duration,
          { resultsCount: searchResults.results.length },
          requestId
        );

        return {
          content: [
            {
              type: "text",
              text: formatSearchResults(searchResults),
            },
          ],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Search failed for: ${query}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );

        return {
          content: [
            {
              type: "text",
              text: `Error searching Bun documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Register GetBunVersion tool
  server.registerTool(
    "GetBunVersion",
    {
      description:
        "Get detailed information about Bun versions including local version, latest release, features, and installation instructions.",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      const requestId = generateRequestId();
      logger.info("Bun version request received", {}, requestId);

      try {
        const result = await bunTools.getBunVersion();
        logger.info("Bun version retrieved successfully", {}, requestId);
        return result;
      } catch (error) {
        logger.error(
          "Failed to get Bun version",
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );
        return {
          content: [
            {
              type: "text",
              text: `Error getting Bun version: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Register SearchPackage tool
  server.registerTool(
    "SearchPackage",
    {
      description:
        "Search for NPM packages and check their Bun compatibility. Provides package information, installation instructions, and usage examples.",
      inputSchema: {
        packageName: z
          .string()
          .describe("Name of the NPM package to search for"),
      },
    },
    async ({ packageName }): Promise<CallToolResult> => {
      const requestId = generateRequestId();
      logger.info(
        `Package search request received: ${packageName}`,
        { packageName },
        requestId
      );

      try {
        if (!packageName || typeof packageName !== "string") {
          throw new Error("Package name is required and must be a string");
        }

        const result = await bunTools.searchPackage(packageName);
        logger.info(`Package search completed: ${packageName}`, {}, requestId);
        return result;
      } catch (error) {
        logger.error(
          `Package search failed: ${packageName}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );
        return {
          content: [
            {
              type: "text",
              text: `Error searching for package: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Register GetApiExamples tool
  server.registerTool(
    "GetApiExamples",
    {
      description:
        "Get code examples and usage patterns for specific Bun APIs. Includes filesystem, HTTP, database, and other common operations.",
      inputSchema: {
        category: z
          .string()
          .describe(
            "API category to get examples for (e.g., filesystem, http, database)"
          ),
      },
    },
    async ({ category }): Promise<CallToolResult> => {
      const requestId = generateRequestId();
      logger.info(
        `API examples request received: ${category}`,
        { category },
        requestId
      );

      try {
        if (!category || typeof category !== "string") {
          throw new Error("Category is required and must be a string");
        }

        const result = await bunTools.getApiExamples(category);
        logger.info(`API examples retrieved: ${category}`, {}, requestId);
        return result;
      } catch (error) {
        logger.error(
          `API examples failed: ${category}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );
        return {
          content: [
            {
              type: "text",
              text: `Error getting API examples: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Register GetServerStats tool
  server.registerTool(
    "GetServerStats",
    {
      description:
        "Get comprehensive server statistics including uptime, memory usage, cache information, and available tools.",
      inputSchema: {},
    },
    async (): Promise<CallToolResult> => {
      const requestId = generateRequestId();
      logger.info("Server stats request received", {}, requestId);

      try {
        const result = await bunTools.getServerStats();
        logger.info("Server stats retrieved successfully", {}, requestId);
        return result;
      } catch (error) {
        logger.error(
          "Failed to get server stats",
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );
        return {
          content: [
            {
              type: "text",
              text: `Error getting server stats: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

};

// Utility functions
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function formatSearchResults(results: any): string {
  let output = `## Search Results for: "${results.query}"\n\n`;
  output += `**Sources:** ${results.sources.join(", ")}\n`;
  output += `**Total Results:** ${results.totalResults}\n`;
  output += `**Search Time:** ${new Date(results.timestamp).toLocaleString()}\n\n`;

  if (results.results.length === 0) {
    output += "No results found. Try a different search query.\n";
    return output;
  }

  results.results.forEach((result: any, index: number) => {
    output += `### ${index + 1}. ${result.title}\n\n`;
    output += `**URL:** [${result.url}](${result.url})\n`;
    output += `**Type:** ${result.type}\n`;
    output += `**Relevance:** ${result.relevance || "N/A"}\n\n`;
    output += `${result.snippet}\n\n`;
    output += `---\n\n`;
  });

  return output;
}

// Rate limiting middleware
function rateLimitMiddleware(req: Request, res: Response, next: Function) {
  if (!config.security.enableRateLimit) {
    return next();
  }

  const clientId = req.ip || "unknown";
  const now = Date.now();
  const clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return next();
  }

  if (clientData.count >= config.security.maxRequestsPerMinute) {
    logger.warn("Rate limit exceeded", { clientId, count: clientData.count });
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  clientData.count++;
  next();
}

// CORS middleware
function corsMiddleware(req: Request, res: Response, next: Function) {
  if (!config.security.enableCors) {
    return next();
  }

  const origin = req.headers.origin;
  if (
    config.security.allowedOrigins.includes("*") ||
    (origin && config.security.allowedOrigins.includes(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
}

// Request logging middleware
function requestLoggingMiddleware(req: Request, res: Response, next: Function) {
  if (!config.logging.enableRequestLogging) {
    return next();
  }

  const start = Date.now();
  const requestId = generateRequestId();

  logger.info(
    `${req.method} ${req.url}`,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
    requestId
  );

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.url} completed`,
      { statusCode: res.statusCode, duration },
      requestId
    );
  });

  next();
}

// Create Express app
const app = createMcpExpressApp();
const transports: Record<string, SSEServerTransport> = {};

// Apply middleware
app.use(rateLimitMiddleware);
app.use(corsMiddleware);
app.use(requestLoggingMiddleware);

// MCP endpoint
app.get("/mcp", async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  logger.info("SSE connection request", { ip: req.ip }, requestId);

  try {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    transport.onclose = () => {
      logger.info(`SSE transport closed`, { sessionId }, requestId);
      delete transports[sessionId];
    };

    const server = getServer();
    await server.connect(transport);

    logger.info(`SSE stream established`, { sessionId }, requestId);
  } catch (error) {
    logger.error(
      "Error establishing SSE stream",
      { error: error instanceof Error ? error.message : "Unknown error" },
      requestId
    );
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
});

// Messages endpoint
app.post("/messages", async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    logger.warn(
      "Missing session ID in message request",
      { ip: req.ip },
      requestId
    );
    res.status(400).send("Missing sessionId parameter");
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    logger.warn("Invalid session ID", { sessionId, ip: req.ip }, requestId);
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    logger.error(
      "Error handling message",
      {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      requestId
    );
    if (!res.headersSent) {
      res.status(500).send("Error handling message");
    }
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  const stats = logger.getStats();
  const cacheStats = searchEngine.getCacheStats();

  res.json({
    status: "healthy",
    server: config.server.name,
    version: config.server.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    logs: stats,
    cache: cacheStats,
    activeConnections: Object.keys(transports).length,
  });
});

// Server info endpoint
app.get("/", (req: Request, res: Response) => {
  res.send(`# Enhanced Bun MCP Server

## Configuration
- **Name:** ${config.server.name}
- **Version:** ${config.server.version}
- **Transport:** HTTP (SSE)
- **Port:** ${config.server.port}

## Available Tools
1. **SearchBun** - Enhanced multi-source search
2. **GetBunVersion** - Version information and features
3. **SearchPackage** - NPM package search with Bun compatibility
4. **GetApiExamples** - Code examples for Bun APIs
5. **GetServerStats** - Server statistics and monitoring

## Endpoints
- **MCP Connection:** GET /mcp
- **Messages:** POST /messages?sessionId=<id>
- **Health Check:** GET /health
- **Server Info:** GET /

## Features
- ✅ Multi-source search (Bun docs, GitHub, NPM, Community)
- ✅ Intelligent caching with TTL
- ✅ Rate limiting and security
- ✅ Comprehensive logging
- ✅ Performance monitoring
- ✅ CORS support
- ✅ Error handling and recovery

## Usage with Claude Desktop
\`\`\`json
{
  "mcpServers": {
    "bun": {
      "command": "curl",
      "args": ["-N", "http://localhost:${config.server.port}/mcp"]
    }
  }
}
\`\`\`
`);
});

// Start server
const port = config.server.port;
app.listen(port, () => {
  logger.info(`Enhanced Bun MCP server started`, {
    port,
    config: {
      search: config.search,
      security: config.security,
      logging: config.logging,
    },
  });
  console.log(`🚀 Enhanced Bun MCP Server running on http://localhost:${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log(`📊 Server info: http://localhost:${port}/`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  Object.values(transports).forEach((transport) => {
    transport.close?.();
  });
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down server...");
  Object.values(transports).forEach((transport) => {
    transport.close?.();
  });
  process.exit(0);
});

  // Register LSP Tools
  server.registerTool(
    "GetCodeCompletions",
    {
      description: "Get intelligent code completion suggestions for Bun APIs",
      inputSchema: {
        code: z.string().describe("The code to get completions for"),
        line: z.number().describe("Line number (0-based)"),
        character: z.number().describe("Character position (0-based)"),
      },
    },
    async ({ code, line, character }): Promise<CallToolResult> => {
      const requestId = generateRequestId();
      try {
        const result = await bunTools.getCodeCompletions(code, { line, character });
        logger.info(`Code completions requested`, { line, character }, requestId);
        return result;
      } catch (error) {
        logger.error(
          `Code completions failed`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          requestId
        );
        return {
          content: [{
            type: "text",
            text: `Error getting code completions: ${error instanceof Error ? error.message : "Unknown error"}`
          }]
        };
      }
    }
  );

  return server;
};
