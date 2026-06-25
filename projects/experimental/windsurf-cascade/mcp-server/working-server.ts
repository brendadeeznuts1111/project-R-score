#!/usr/bin/env bun

// Working MCP Server Example
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

console.error("🚀 Starting Bun MCP Server...");

// Create server
const server = new Server(
  {
    name: "bun-search-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "SearchBun",
        description: "Search Bun documentation for information",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for Bun documentation",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "SearchBun") {
    const query = request.params.arguments?.query as string;

    if (!query) {
      throw new Error("Query parameter is required");
    }

    // Return helpful Bun documentation based on query
    let response = "";
    
    if (query.toLowerCase().includes("timezone")) {
      response = `
# Bun Timezone Documentation

## Setting Timezone in Bun

### Command Line:
\`\`\`bash
TZ=America/New_York bun run script.ts
\`\`\`

### Programmatic:
\`\`\`typescript
process.env.TZ = "America/New_York";
console.info(new Date().getHours()); // Local time in NY
\`\`\`

### Key Points:
- \`bun test\` defaults to UTC for deterministic testing
- \`bun run\` uses system timezone by default
- Timezone changes affect all subsequent Date objects

📗 [Read more](https://bun.com/docs/runtime/timezone)
      `;
    } else {
      response = `
# Bun Documentation Search Results

Query: "${query}"

## Getting Started with Bun
Bun is a fast JavaScript runtime with built-in tools.

## Key Features:
- ⚡ Fast runtime (4x faster than Node.js)
- 🔥 Built-in test runner, bundler, package manager
- 📝 Native TypeScript and JSX support
- 🗄️ Built-in SQLite and file system APIs

## Common Commands:
\`\`\`bash
bun install          # Install dependencies
bun run script.ts     # Run TypeScript
bun test              # Run tests
bun build             # Bundle code
\`\`\`

📗 [Full documentation](https://bun.com/docs)
      `;
    }

    return {
      content: [
        {
          type: "text",
          text: response.trim(),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("✅ Bun MCP Server running on stdio");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
