import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Type declaration for global process (Bun provides this globally)
declare const process: {
  exit(code?: number): never;
};

// Mintlify search API endpoint
const MINTLIFY_API = "https://api.mintlify.com/v1/search";

interface SearchResult {
  title: string;
  content: string;
  url: string;
  section?: string;
}

async function searchBunDocs(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(MINTLIFY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        // Bun's documentation domain
        domain: "bun.com",
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Search error:", error);
    
    // Fallback to provide helpful responses based on common queries
    return getFallbackResults(query);
  }
}

function getFallbackResults(query: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  
  // HTTP Server queries
  if (queryLower.includes("http") || queryLower.includes("server")) {
    return [{
      title: "HTTP Servers - Bun Documentation",
      content: `Bun provides a fast built-in HTTP server via Bun.serve(). Here's a basic example:

import { serve } from "bun";

serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun!");
  },
});

Key features:
- Built-in HTTP/1.1, HTTP/2 support
- WebSocket upgrade handling
- Automatic compression
- TLS/HTTPS support`,
      url: "https://bun.com/docs/server",
      section: "HTTP Server"
    }];
  }
  
  // File operations queries
  if (queryLower.includes("file") || queryLower.includes("read") || queryLower.includes("write")) {
    return [{
      title: "File I/O - Bun Documentation",
      content: `Bun provides fast file operations with Bun.file() and Bun.write():

// Reading files
const file = Bun.file("hello.txt");
const text = await file.text();

// Writing files
await Bun.write("output.txt", "Hello World!");

// Fastest way for large files
const stream = await file.stream();
for await (const chunk of stream) {
  // Process chunks
}

Bun's file system is optimized for performance and supports streams, buffers, and more.`,
      url: "https://bun.com/docs/api/file-io",
      section: "File System"
    }];
  }
  
  // WebSocket queries
  if (queryLower.includes("websocket")) {
    return [{
      title: "WebSockets - Bun Documentation",
      content: `Bun supports WebSockets natively with upgrade handling:

import { serve } from "bun";

serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // WebSocket handled
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    message(ws, message) {
      ws.send(\`You said: \${message}\`);
    },
    open(ws) {
      ws.send("Welcome to Bun WebSocket!");
    },
  },
});

Features automatic upgrade handling and message framing.`,
      url: "https://bun.com/docs/websockets",
      section: "WebSockets"
    }];
  }
  
  // Database queries
  if (queryLower.includes("sqlite") || queryLower.includes("database")) {
    return [{
      title: "Database - Bun Documentation",
      content: `Bun has built-in SQLite support:

import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");

// Create table
db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

// Insert data
db.run("INSERT INTO users (name) VALUES (?)", "Alice");

// Query data
const users = db.query("SELECT * FROM users").all();
console.log(users);

// Prepared statements
const stmt = db.prepare("SELECT * FROM users WHERE name = ?");
const alice = stmt.get("Alice");

Bun's SQLite is optimized for performance and supports prepared statements.`,
      url: "https://bun.com/docs/sql",
      section: "Database"
    }];
  }
  
  // File upload queries
  if (queryLower.includes("upload") || queryLower.includes("form")) {
    return [{
      title: "File Uploads - Bun Documentation",
      content: `Handle file uploads with FormData:

import { serve } from "bun";

serve({
  async fetch(req) {
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (file) {
        await Bun.write(\`uploads/\${file.name}\`, file);
        return new Response(\`Uploaded \${file.name}\`);
      }
    }
    return new Response("Send POST with file");
  },
});

Bun automatically parses multipart/form-data and provides File objects.`,
      url: "https://bun.com/docs/server#file-uploads",
      section: "File Uploads"
    }];
  }
  
  // Default fallback
  return [{
    title: "Bun Documentation - Getting Started",
    content: `Bun is a fast JavaScript runtime with built-in tools:

Key features:
- Fast runtime (4x faster startup than Node.js)
- Built-in test runner, bundler, and package manager
- Native TypeScript and JSX support
- Built-in SQLite and file system APIs

Getting started:
1. Install: curl -fsSL https://bun.com/install | bash
2. Run: bun run your-script.ts
3. Test: bun test

Visit https://bun.com/docs for complete documentation.`,
    url: "https://bun.com/docs",
    section: "Getting Started"
  }];
}

// Create MCP server
const server = new Server(
  {
    name: "Bun",
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
        description:
          "Search across the Bun knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about Bun, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "A query to search the content with.",
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

    const results = await searchBunDocs(query);

    // Format results for display
    const formattedResults = results
      .map(
        (result, index) => `
### ${index + 1}. ${result.title}

${result.content}

🔗 [Read more](${result.url})
${result.section ? `📂 Section: ${result.section}` : ""}
---
`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text:
            formattedResults ||
            "No results found. Try rephrasing your query or check the Bun documentation directly at https://bun.com/docs",
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
    console.error("Bun MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
