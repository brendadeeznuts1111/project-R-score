// mcp/server.ts - Bun MCP Server for AI Agents (Lightning Fast)
import { enhancedBunConfig } from "../src/enhanced-bun-config";
import { RipgrepCodeSearch } from "../utils/codesearch.ts";
import { SuperRipgrep } from "../utils/super-ripgrep.ts";
import type { RipgrepMCP } from "./ripgrep.ts";

const PORT = parseInt(Bun.env.MCP_PORT || "8787");
const HOST = Bun.env.MCP_HOST || "localhost";

class BunMCPServer {
  private searcher: RipgrepCodeSearch;
  private superSearcher: SuperRipgrep;

  constructor() {
    this.searcher = new RipgrepCodeSearch();
    this.superSearcher = new SuperRipgrep();
  }

  async handleCodeSearch(
    params: RipgrepMCP["params"]
  ): Promise<RipgrepMCP["result"]> {
    try {
      return await this.searcher.search(params);
    } catch (error) {
      console.error("MCP codesearch error:", error);
      return {
        matches: [],
        stats: { filesSearched: 0, matchesFound: 0, timeMs: 0 },
        files: [],
      };
    }
  }

  start() {
    const server = Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const url = new URL(req.url);
        const server = new BunMCPServer();

        // CORS headers for web clients
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        };

        if (req.method === "OPTIONS") {
          return new Response(null, { headers: corsHeaders });
        }

        try {
          // CodeSearch endpoint
          if (url.pathname === "/mcp/codesearch" && req.method === "POST") {
            const params: RipgrepMCP["params"] = await req.json();

            const result = await server.handleCodeSearch(params);

            const response: RipgrepMCP = {
              command: "codesearch",
              version: "1.0",
              params,
              result,
            };

            return Response.json(response, {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Health check endpoint
          if (url.pathname === "/health" && req.method === "GET") {
            return Response.json(
              {
                status: "healthy",
                service: "bun-mcp-codesearch",
                version: "1.0",
                timestamp: new Date().toISOString(),
              },
              { headers: corsHeaders }
            );
          }

          // Speed benchmark endpoint
          if (url.pathname === "/mcp/speed" && req.method === "POST") {
            const { query, compareWithGrep } = await req.json();
            const superSearcher = new SuperRipgrep();

            if (compareWithGrep) {
              const comparison = await superSearcher.compareWithGrep(
                query || "Bun"
              );
              return Response.json(
                {
                  type: "speed-comparison",
                  ripgrep: comparison.ripgrep,
                  grep: comparison.grep,
                  speedup: comparison.speedup + "x",
                  bunwhy: "#bunwhy = Speed",
                },
                { headers: corsHeaders }
              );
            } else {
              const result = await superSearcher.lightningSearch(
                query || "Bun"
              );
              return Response.json(
                {
                  type: "lightning-search",
                  ...result,
                  bunwhy: "#bunwhy = Speed",
                },
                { headers: corsHeaders }
              );
            }
          }

          // MCP discovery endpoint for AI agents
          if (url.pathname === "/mcp" && req.method === "GET") {
            return Response.json(
              {
                name: "bun-mcp-codesearch",
                version: "1.0",
                description:
                  "Ultra-fast codebase search using ripgrep (#bunwhy = Speed)",
                endpoints: {
                  codesearch: "/mcp/codesearch",
                  speed: "/mcp/speed",
                  health: "/health",
                  config: "/config",
                  security: "/security",
                  performance: "/performance",
                },
                capabilities: [
                  "codesearch",
                  "symbol-search",
                  "context-search",
                  "speed-benchmark",
                  "config-analysis",
                  "security-auditing",
                  "performance-metrics",
                ],
                performance: "37x faster than grep, <50ms AI agent responses",
              },
              { headers: corsHeaders }
            );
          }

          // Enhanced Bun Configuration endpoints
          if (
            url.pathname.startsWith("/config") ||
            url.pathname.startsWith("/security") ||
            url.pathname.startsWith("/performance") ||
            url.pathname === "/debug"
          ) {
            return await enhancedBunConfig.handleRequest(req);
          }

          return new Response(
            JSON.stringify({
              error: "MCP endpoint not found",
              available: [
                "/mcp/codesearch",
                "/health",
                "/mcp",
                "/config",
                "/security",
                "/performance",
              ],
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("MCP server error:", error);
          return Response.json(
            {
              error: "Internal server error",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      },

      error(error) {
        console.error("Bun MCP server error:", error);
        return new Response(
          JSON.stringify({
            error: "Server error",
            message: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    });

    console.log(`🚀 bun-mcp codesearch running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🔍 MCP discovery: http://${HOST}:${PORT}/mcp`);
    console.log(`⚡ Ready for AI agent integration!`);

    return server;
  }
}

// Start the server if called directly
if (import.meta.main) {
  const server = new BunMCPServer();
  server.start();
}

export { BunMCPServer };
