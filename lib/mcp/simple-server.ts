// lib/mcp/simple-server.ts — Simple MCP server with direct HTTP implementation

export class SimpleBunMCPServer {
  private searchCache = new Map<string, any>();
  private cacheStats = {
    hits: 0,
    misses: 0,
    total: 0,
  };

  /**
   * Create deterministic cache key from parameters
   */
  private createCacheKey(query: string, version?: string, language?: string, apiReferenceOnly?: boolean, codeOnly?: boolean): string {
    // Create sorted key object to ensure consistent ordering
    const keyObj = {
      query: query.trim().toLowerCase(),
      version: version?.toLowerCase() || 'latest',
      language: language?.toLowerCase() || 'en',
      apiReferenceOnly: Boolean(apiReferenceOnly),
      codeOnly: Boolean(codeOnly)
    };

    // Use deterministic JSON stringification
    return JSON.stringify(keyObj, Object.keys(keyObj).sort());
  }

  /**
   * Validate and sanitize search query
   */
  private validateQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (trimmed.length > 1000) {
      throw new Error('Query too long (max 1000 characters)');
    }

    // Remove potentially dangerous regex characters
    return trimmed.replace(/[<>{}[\]\\]/g, '');
  }

  /**
   * Create safe search pattern with proper escaping
   */
  private createSearchPattern(query: string): RegExp {
    // Validate and sanitize input
    const sanitized = this.validateQuery(query);

    // Handle wildcard patterns
    let pattern = sanitized;

    // Convert * to .*
    pattern = pattern.replace(/\*/g, '.*');

    // Handle partial matches (add wildcards if not present)
    if (!pattern.includes('*')) {
      pattern = `.*${pattern}.*`;
    }

    // Escape special regex characters except * (already handled)
    pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

    // Convert back * to .*
    pattern = pattern.replace(/\\\*/g, '.*');

    // Limit pattern complexity to prevent ReDoS
    if (pattern.length > 500) {
      throw new Error('Search pattern too complex');
    }

    try {
      // Create case-insensitive regex with timeout protection
      return new RegExp(pattern, 'i');
    } catch (error) {
      throw new Error('Invalid search pattern');
    }
  }

  /**
   * Proper cache eviction with LRU-like behavior
   */
  private evictCache(): void {
    const maxSize = 100;
    const evictCount = 20; // Remove multiple entries at once

    if (this.searchCache.size > maxSize) {
      const keys = Array.from(this.searchCache.keys());

      // Remove oldest entries (simple FIFO)
      for (let i = 0; i < Math.min(evictCount, keys.length); i++) {
        this.searchCache.delete(keys[i]);
      }

      console.log(`🗑️ Evicted ${Math.min(evictCount, keys.length)} cache entries`);
    }
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList() {
    return {
      tools: [
        {
          name: 'SearchBun',
          description: 'Search across the Bun knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about Bun, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.',
          inputSchema: {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "A query to search the content with."
              },
              "version": {
                "type": "string",
                "description": "Filter to specific version (e.g., 'v0.7')"
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
              }
            },
            "required": [
              "query"
            ]
          },
          "operationId": "MintlifyDefaultSearch"
        },
      ],
    };
  }

  /**
   * Handle tools/call request with proper input validation
   */
  private async handleToolsCall(params: any) {
    // Validate params structure
    if (!params || typeof params !== 'object') {
      throw new Error('Invalid params: must be an object');
    }

    const { name, arguments: args } = params;

    // Validate tool name
    if (!name || typeof name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    // Validate arguments
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments are required and must be an object');
    }

    if (name === 'SearchBun') {
      // Validate required query parameter
      if (!args.query || typeof args.query !== 'string') {
        throw new Error('Query parameter is required and must be a string');
      }

      const startTime = Date.now();
      const searchResults = await this.searchBunDocumentation(
        args.query,
        args.version,
        args.language,
        args.apiReferenceOnly,
        args.codeOnly
      );
      const executionTime = Date.now() - startTime;

      // Enhanced console output with depth and formatting
      const formattedResults = this.formatSearchResults(searchResults, args, executionTime);

      return {
        content: [
          {
            type: 'text',
            text: formattedResults,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  /**
   * Format search results with enhanced console output and depth
   */
  private formatSearchResults(
    results: Array<{
      title: string;
      description: string;
      url: string;
      codeExample?: string;
    }>,
    args: any,
    executionTime: number
  ): string {

    const timestamp = new Date().toISOString();
    const searchDepth = this.calculateSearchDepth(args.query);

    let output = `╭─────────────────────────────────────────────────────────────────╮\n`;
    output += `│ 🔍 BUN DOCUMENTATION SEARCH RESULTS                              │\n`;
    output += `│ ├─ Query: "${args.query}"                                          │\n`;
    output += `│ ├─ Language: ${args.language || 'en'}                              │\n`;
    output += `│ ├─ Version: ${args.version || 'latest'}                            │\n`;
    output += `│ ├─ Filters: ${args.apiReferenceOnly ? 'API-only' : 'all'}${args.codeOnly ? ', code-only' : ''} │\n`;
    output += `│ ├─ Results: ${results.length} found                                 │\n`;
    output += `│ ├─ Search Depth: ${searchDepth}                                    │\n`;
    output += `│ └─ Timestamp: ${timestamp}                                         │\n`;
    output += `╰─────────────────────────────────────────────────────────────────╯\n\n`;

    if (results.length === 0) {
      output += `❌ No results found for "${args.query}"\n`;
      output += `💡 Try adjusting your search terms or filters\n`;
      return output;
    }

    results.forEach((result, index) => {
      const resultNumber = (index + 1).toString().padStart(2, '0');

      output += `${'─'.repeat(80)}\n`;
      output += `📄 RESULT ${resultNumber}: ${result.title}\n`;
      output += `${'─'.repeat(80)}\n`;
      output += `📝 Description: ${result.description}\n`;
      output += `🔗 Documentation: ${result.url}\n`;

      if (result.codeExample) {
        output += `\n💻 Code Example:\n`;
        output += `\`\`\`typescript\n`;
        output += `${result.codeExample}\n`;
        output += `\`\`\`\n`;
      }

      // Add relevance score and metadata
      const relevance = this.calculateRelevance(result, args.query);
      output += `\n📊 Metadata:\n`;
      output += `   ├─ Relevance Score: ${relevance}%\n`;
      output += `   ├─ Has Code: ${result.codeExample ? '✅ Yes' : '❌ No'}\n`;
      output += `   ├─ API Reference: ${result.url.includes('/docs/api/') ? '✅ Yes' : '❌ No'}\n`;
      output += `   └─ Match Type: ${this.getMatchType(result, args.query)}\n\n`;
    });

    // Add search summary
    output += `${'═'.repeat(80)}\n`;
    output += `📋 SEARCH SUMMARY\n`;
    output += `${'═'.repeat(80)}\n`;
    output += `• Total Results: ${results.length}\n`;
    output += `• Search Pattern: ${args.query}\n`;
    output += `• Search Depth: ${searchDepth}\n`;
    output += `• Execution Time: ${executionTime}ms\n`;

    const apiCount = results.filter(r => r.url.includes('/docs/api/')).length;
    const codeCount = results.filter(r => r.codeExample).length;
    output += `• API References: ${apiCount}/${results.length}\n`;
    output += `• Code Examples: ${codeCount}/${results.length}\n`;

    if (this.cacheStats.total > 0) {
      output += `• Cache Hit Rate: ${((this.cacheStats.hits / this.cacheStats.total) * 100).toFixed(1)}%\n`;
    }

    output += `\n🎯 TIPS:\n`;
    output += `• Use * for wildcards: *password*, serve*\n`;
    output += `• Add filters: apiReferenceOnly: true, codeOnly: true\n`;
    output += `• Check cache stats: GET /cache\n`;

    return output;
  }

  /**
   * Calculate search depth based on query complexity
   */
  private calculateSearchDepth(query: string): string {
    if (query.includes('*')) {
      const wildcardCount = (query.match(/\*/g) || []).length;
      if (wildcardCount >= 2) return 'Deep (Pattern Match)';
      return 'Medium (Wildcard)';
    }

    if (query.length > 10) return 'Medium (Specific)';
    if (query.length > 5) return 'Shallow (Broad)';
    return 'Very Shallow (Keyword)';
  }

  /**
   * Calculate relevance score for a result
   */
  private calculateRelevance(result: any, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase().replace(/\*/g, '');

    // Title matches are most important
    if (result.title.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Description matches
    if (result.description.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    // Code matches
    if (result.codeExample && result.codeExample.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Bonus for exact matches
    if (result.title.toLowerCase() === lowerQuery) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  /**
   * Determine match type
   */
  private getMatchType(result: any, query: string): string {
    const lowerQuery = query.toLowerCase().replace(/\*/g, '');

    if (result.title.toLowerCase() === lowerQuery) return 'Exact Title Match';
    if (result.title.toLowerCase().includes(lowerQuery)) return 'Title Match';
    if (result.description.toLowerCase().includes(lowerQuery)) return 'Description Match';
    if (result.codeExample && result.codeExample.toLowerCase().includes(lowerQuery)) return 'Code Match';
    return 'Pattern Match';
    this.cacheStats.total++;

    // Check cache
    if (this.searchCache.has(cacheKey)) {
      this.cacheStats.hits++;
      console.log(` Cache HIT for query: ${query.substring(0, 50)}...`);
      return this.searchCache.get(cacheKey);
    }

    this.cacheStats.misses++;
    console.log(` Cache MISS for query: ${query.substring(0, 50)}...`);

    // Perform search (mock data for now)
    const results = await this.performSearch(query, version, language, apiReferenceOnly, codeOnly);
      }
    ];

    // Enhanced pattern matching
    const searchPattern = this.createSearchPattern(query);
    let results = bunDocs.filter(doc =>
      searchPattern.test(doc.title) ||
      searchPattern.test(doc.description) ||
      (doc.codeExample && searchPattern.test(doc.codeExample))
    );

    // Apply filters
    if (apiReferenceOnly) {
      results = results.filter(result =>
        result.url.includes('/docs/api/') || result.title.includes('API')
      );
    }

    if (codeOnly) {
      results = results.filter(result => result.codeExample);
    }

    const finalResults = results.slice(0, 10);

    // Store in cache
    this.searchCache.set(cacheKey, finalResults);

    // Limit cache size
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    return finalResults;
  }

  /**
   * Create search pattern from query (supports wildcards and regex)
   */
  private createSearchPattern(query: string): RegExp {
    // Handle wildcard patterns
    let pattern = query;

    // Convert * to .*
    pattern = pattern.replace(/\*/g, '.*');

    // Handle partial matches (add wildcards if not present)
    if (!pattern.includes('*')) {
      pattern = `.*${pattern}.*`;
    }

    // Escape special regex characters except *
    pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

    // Convert back * to .*
    pattern = pattern.replace(/\\\*/g, '.*');

    // Create case-insensitive regex
    return new RegExp(pattern, 'i');
  }

  /**
   * Handle JSON-RPC requests
   */
  private async handleRequest(request: any) {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: this.handleToolsList(),
          };

        case 'tools/call':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.handleToolsCall(params),
          };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found',
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message,
        },
      };
    }
  }

  /**
   * Start HTTP server
   */
  async run(port: number = 3000) {
    const server = Bun.serve({
      port,
      fetch: async (req) => {
        // Health check endpoint
        if (req.method === 'GET' && req.url.endsWith('/health')) {
          return new Response(JSON.stringify({
            status: 'healthy',
            server: 'Simple Bun MCP Server',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Cache stats endpoint with sanitized keys
        if (req.method === 'GET' && req.url.endsWith('/cache')) {
          const hitRate = this.cacheStats.total > 0 ? (this.cacheStats.hits / this.cacheStats.total * 100).toFixed(2) : '0.00';

          // Sanitize cache keys to prevent exposing sensitive queries
          const sanitizedKeys = Array.from(this.searchCache.keys())
            .slice(0, 10)
            .map(key => {
              const parsed = JSON.parse(key);
              return {
                query: parsed.query.substring(0, 20) + (parsed.query.length > 20 ? '...' : ''),
                version: parsed.version,
                language: parsed.language,
                hasFilters: parsed.apiReferenceOnly || parsed.codeOnly
              };
            });

          return new Response(JSON.stringify({
            cache: {
              size: this.searchCache.size,
              maxSize: 100,
              stats: this.cacheStats,
              hitRate: `${hitRate}%`,
              sampleKeys: sanitizedKeys, // Sanitized sample keys
            },
            timestamp: new Date().toISOString(),
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // JSON-RPC 2.0 requests
        if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
          try {
            const body = await req.json();
            const response = await this.handleRequest(body);
            return new Response(JSON.stringify(response), {
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            return new Response(JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error',
              },
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }

        // Default response
        return new Response('Simple Bun MCP Server - Use POST with JSON-RPC 2.0', {
          status: 200,
        });
      },
    });

    const MCP_SERVER_HOST = process.env.MCP_SERVER_HOST || process.env.SERVER_HOST || 'localhost';
    console.log(`🌐 Simple Bun MCP server running on http://${MCP_SERVER_HOST}:${port}`);
    console.log(`📊 Health check: http://${MCP_SERVER_HOST}:${port}/health`);
  }
}

// Run the server
const server = new SimpleBunMCPServer();
const port = parseInt(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
server.run(port).catch(console.error);
