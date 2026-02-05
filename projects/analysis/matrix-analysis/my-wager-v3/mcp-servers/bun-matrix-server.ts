// MCP Server for Bun Matrix - Tier-1380 Infrastructure
import { matrixViewer } from '../src/matrix-view';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// MCP Server implementation
export class BunMatrixMCPServer {
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'matrix/list':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.listEntries(params)
          };
          
        case 'matrix/get':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.getEntry(params?.term)
          };
          
        case 'matrix/check':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.checkCompatibility(params?.version)
          };
          
        case 'matrix/breaking':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.getBreakingChanges(params?.version)
          };
          
        case 'matrix/sync':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.syncRSS()
          };
          
        case 'matrix/search':
          return {
            jsonrpc: '2.0',
            id,
            result: await this.searchEntries(params?.query, params?.filters)
          };
          
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
  
  private async listEntries(filters?: any): Promise<any[]> {
    const entries = matrixViewer['store'].getAll();
    
    let filtered = entries;
    
    if (filters?.platform) {
      filtered = filtered.filter(e => e.platforms.includes(filters.platform));
    }
    if (filters?.stability) {
      filtered = filtered.filter(e => e.stability === filters.stability);
    }
    if (filters?.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    
    return filtered.map(entry => ({
      term: entry.term,
      path: entry.path,
      bunMinVersion: entry.bunMinVersion,
      stability: entry.stability,
      platforms: entry.platforms,
      category: entry.category,
      perfProfile: entry.perfProfile,
      security: entry.security,
      lastUpdated: entry.lastUpdated
    }));
  }
  
  private async getEntry(term: string): Promise<any> {
    const entry = matrixViewer['store'].get(term);
    
    if (!entry) {
      throw new Error(`Entry not found: ${term}`);
    }
    
    return {
      term: entry.term,
      path: entry.path,
      bunMinVersion: entry.bunMinVersion,
      stability: entry.stability,
      platforms: entry.platforms,
      changelogFeed: entry.changelogFeed?.href,
      perfProfile: entry.perfProfile,
      security: entry.security,
      cliFlags: entry.cliFlags,
      breakingChanges: entry.breakingChanges,
      relatedTerms: entry.relatedTerms,
      category: entry.category,
      deprecatedIn: entry.deprecatedIn,
      removedIn: entry.removedIn,
      lastUpdated: entry.lastUpdated
    };
  }
  
  private async checkCompatibility(version?: string): Promise<any> {
    const bunVersion = version || process.env.BUN_VERSION || '1.3.7';
    const entries = matrixViewer['store'].getAll();
    
    const compatible = entries.filter(e => 
      matrixViewer['store'].isCompatible(e.term, bunVersion)
    );
    
    const incompatible = entries.filter(e => 
      !matrixViewer['store'].isCompatible(e.term, bunVersion)
    );
    
    return {
      version: bunVersion,
      total: entries.length,
      compatible: compatible.length,
      incompatible: incompatible.map(e => ({
        term: e.term,
        required: e.bunMinVersion,
        current: bunVersion
      }))
    };
  }
  
  private async getBreakingChanges(version: string): Promise<any[]> {
    const breaking = matrixViewer['store'].getBreakingChanges(version);
    
    return breaking.map(entry => ({
      term: entry.term,
      stability: entry.stability,
      breakingSince: entry.breakingChanges,
      deprecatedIn: entry.deprecatedIn,
      removedIn: entry.removedIn,
      action: entry.removedIn ? 'REMOVED' : 
              entry.deprecatedIn ? 'DEPRECATED' : 'Review'
    }));
  }
  
  private async syncRSS(): Promise<{ status: string; updated: number }> {
    await matrixViewer.syncWithRSS();
    return {
      status: 'success',
      updated: matrixViewer['store'].getAll().length
    };
  }
  
  private async searchEntries(query: string, filters?: any): Promise<any[]> {
    const entries = matrixViewer['store'].getAll();
    const searchTerm = query.toLowerCase();
    
    let results = entries.filter(entry => 
      entry.term.toLowerCase().includes(searchTerm) ||
      entry.path.toLowerCase().includes(searchTerm) ||
      entry.category?.toLowerCase().includes(searchTerm) ||
      entry.relatedTerms?.some(rt => rt.toLowerCase().includes(searchTerm))
    );
    
    if (filters) {
      if (filters.platform) {
        results = results.filter(e => e.platforms.includes(filters.platform));
      }
      if (filters.stability) {
        results = results.filter(e => e.stability === filters.stability);
      }
    }
    
    return results.map(entry => ({
      term: entry.term,
      path: entry.path,
      bunMinVersion: entry.bunMinVersion,
      stability: entry.stability,
      category: entry.category,
      matchScore: this.calculateMatchScore(entry, searchTerm)
    })).sort((a, b) => b.matchScore - a.matchScore);
  }
  
  private calculateMatchScore(entry: any, searchTerm: string): number {
    let score = 0;
    
    if (entry.term.toLowerCase() === searchTerm) score += 100;
    else if (entry.term.toLowerCase().startsWith(searchTerm)) score += 50;
    else if (entry.term.toLowerCase().includes(searchTerm)) score += 25;
    
    if (entry.category?.toLowerCase().includes(searchTerm)) score += 10;
    
    return score;
  }
}

// HTTP Server for MCP
export async function startBunMatrixServer(port = 3001): Promise<void> {
  const server = new BunMatrixMCPServer();
  
  const serverInstance = Bun.serve({
    port,
    async fetch(req) {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      
      try {
        const request = await req.json() as MCPRequest;
        const response = await server.handleRequest(request);
        return Response.json(response);
      } catch (error) {
        return Response.json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error'
          }
        }, { status: 400 });
      }
    }
  });
  
  console.log(`🚀 Bun Matrix MCP Server running on port ${port}`);
  console.log(`📊 Endpoint: http://localhost:${port}`);
  console.log(`🔗 Ready for Tier-1380 integration`);
}

// Run server if executed directly
if (import.meta.main) {
  startBunMatrixServer(parseInt(process.env.PORT || '3001'));
}
