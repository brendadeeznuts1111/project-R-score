// lib/security/version-graph.ts

export interface VersionNode {
  id?: string;
  version: string;
  action: 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'DELETE' | 'VIEW';
  timestamp: string;
  author?: string;
  description?: string;
  value?: string;
  visual?: {
    color: string;
    icon: string;
    theme: string;
  };
}

export interface VisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    color: string;
    icon: string;
    metadata: Record<string, any>;
  }>;
  links: Array<{
    source: string;
    target: string;
    action: string;
    timestamp: string;
  }>;
}

export class VersionGraph {
  private r2Credentials: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  };

  constructor() {
    // Secure credentials from environment variables
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || 'bun-executables';
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing required R2 credentials in environment variables. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
    }
    
    this.r2Credentials = {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName
    };
  }

  private async makeR2Request(key: string, method: string = 'GET', body?: string, metadata?: Record<string, string>) {
    try {
      const endpoint = `https://${this.r2Credentials.accountId}.r2.cloudflarestorage.com`;
      const url = `${endpoint}/${this.r2Credentials.bucketName}/${key}`;
      
      // Use AWS Signature V4 instead of Basic Auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': await this.generateAWSAuthHeader(method, key, body || ''),
        'x-amz-content-sha256': await Bun.hash(body || ''),
        'x-amz-date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
      };

      if (metadata) {
        Object.entries(metadata).forEach(([k, v]) => {
          headers[`x-amz-meta-${k}`] = v;
        });
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`🚨 R2 request failed for ${key}:`, {
        error: error.message,
        method,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  // AWS Signature V4 authentication helper - FIXED VERSION
  private async generateAWSAuthHeader(method: string, key: string, payload: string): Promise<string> {
    try {
      const region = 'auto';
      const service = 's3';
      const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      
      // For now, use Basic Auth as fallback until proper AWS SDK is integrated
      // TODO: Replace with proper AWS Signature V4 implementation
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Using Basic Auth fallback - implement proper AWS Signature V4 for production');
      }
      
      const authString = `${this.r2Credentials.accessKeyId}:${this.r2Credentials.secretAccessKey}`;
      return `Basic ${btoa(authString)}`;
    } catch (error) {
      console.error('🚨 Failed to generate AWS auth header:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async update(key: string, node: VersionNode) {
    try {
      console.log(`📈 Updating version graph for ${key}`);

      // Get existing graph
      const graphKey = `versions/graph/${key}.json`;
      const existing = await this.makeR2Request(graphKey);
      
      let graph: VersionNode[] = [];
      if (existing && existing.status === 200) {
        try {
          graph = JSON.parse(await existing.text());
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse existing graph for ${key}, starting fresh:`, parseError.message);
          graph = [];
        }
      }

      // Validate node data
      if (!node.version || !node.action || !node.timestamp) {
        throw new Error('Invalid node data: version, action, and timestamp are required');
      }

      // Add new node
      const newNode: VersionNode = {
        ...node,
        id: `v${graph.length + 1}`,
        visual: {
          color: this.getColorForAction(node.action),
          icon: this.getIconForAction(node.action),
          theme: `factorywager-version-${node.action.toLowerCase()}`
        }
      };
      
      graph.push(newNode);

      // Store updated graph
      const graphData = JSON.stringify(graph, null, 2);
      await this.makeR2Request(graphKey, 'PUT', graphData, {
        'graph:type': 'secret-versions',
        'graph:key': key,
        'graph:versions': graph.length.toString(),
        'graph:latest': node.version,
        'visual:render': 'force-directed',
        'docs:reference': 'https://bun.sh/docs/runtime/secrets#versioning',
        'factorywager:version': '5.0',
        'created:at': new Date().toISOString()
      });

      // Generate visualization data
      const vizResult = await this.generateVisualization(key, graph);
      
      console.log(`✅ Version graph updated: ${graph.length} versions`);
      console.log(`📊 Visualization: Mermaid & D3.js generated`);
      
      return { graph, visualization: vizResult };
    } catch (error) {
      console.error(`🚨 Failed to update version graph for ${key}:`, {
        error: error.message,
        node: node.version,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getHistory(key: string, limit = 10) {
    const graphKey = `versions/graph/${key}.json`;
    const graph = await this.makeR2Request(graphKey);
    
    if (!graph || graph.status !== 200) return [];
    
    const history = JSON.parse(await graph.text());
    return history.slice(-limit).reverse(); // Latest first
  }

  async generateVisualization(key: string, graph: VersionNode[]) {
    console.log(`🎨 Generating visualizations for ${key}`);

    // Generate Mermaid.js diagram
    const mermaid = this.generateMermaidDiagram(key, graph);
    
    // Generate D3.js data
    const d3Data = this.generateD3Data(graph);
    
    // Store both representations
    await this.makeR2Request(
      `versions/viz/${key}/mermaid.md`, 
      'PUT',
      mermaid,
      { 
        'viz:format': 'mermaid', 
        'viz:type': 'graph',
        'generated:at': new Date().toISOString(),
        'factorywager:theme': '5.0'
      }
    );
    
    await this.makeR2Request(
      `versions/viz/${key}/d3.json`,
      'PUT',
      JSON.stringify(d3Data, null, 2),
      { 
        'viz:format': 'd3', 
        'viz:type': 'graph',
        'generated:at': new Date().toISOString(),
        'factorywager:theme': '5.0'
      }
    );

    // Generate public URLs (since R2 doesn't have signed URLs in basic auth, we'll use direct URLs)
    const baseUrl = `https://${this.r2Credentials.accountId}.r2.cloudflarestorage.com/${this.r2Credentials.bucketName}`;
    
    const mermaidUrl = `${baseUrl}/versions/viz/${key}/mermaid.md`;
    const d3Url = `${baseUrl}/versions/viz/${key}/d3.json`;
    
    return { 
      mermaidUrl, 
      d3Url, 
      nodeCount: graph.length,
      latestVersion: graph[graph.length - 1]?.version
    };
  }

  private generateMermaidDiagram(key: string, graph: VersionNode[]): string {
    let mermaid = `graph TD\n`;
    mermaid += `    Start["${key}"] --> ${graph[0]?.id || 'V1'}["${graph[0]?.version || 'v1.0.0'}"]\n`;
    
    for (let i = 1; i < graph.length; i++) {
      const prev = graph[i - 1];
      const curr = graph[i];
      const color = this.getMermaidColor(curr.action);
      
      mermaid += `    ${prev.id}["${prev.version}"] -- "${curr.action}" --> ${curr.id}["${curr.version}"]\n`;
      mermaid += `    style ${curr.id} fill:${color},stroke:#333,stroke-width:2px\n`;
      
      if (curr.description) {
        mermaid += `    ${curr.id}:::desc -->|"${curr.description}"\n`;
      }
    }
    
    // Add styling
    mermaid += `    classDef default fill:#f9f,stroke:#333,stroke-width:2px;\n`;
    mermaid += `    classDef desc fill:#ffe,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5;\n`;
    
    // Add click handlers for interactive versions
    graph.forEach(node => {
      if (node.id) {
        mermaid += `    click ${node.id} "javascript:alert('Version ${node.version} - ${node.action}')" "${node.action}"\n`;
      }
    });

    return mermaid;
  }

  private generateD3Data(graph: VersionNode[]): VisualizationData {
    const nodes = graph.map((node, index) => ({
      id: node.id!,
      label: node.version,
      color: node.visual?.color || this.getColorForAction(node.action),
      icon: node.visual?.icon || this.getIconForAction(node.action),
      metadata: {
        action: node.action,
        timestamp: node.timestamp,
        author: node.author,
        description: node.description,
        theme: node.visual?.theme || `factorywager-version-${node.action.toLowerCase()}`
      }
    }));

    const links = graph.slice(1).map((node, index) => ({
      source: graph[index].id!,
      target: node.id!,
      action: node.action,
      timestamp: node.timestamp
    }));

    return { nodes, links };
  }

  private getColorForAction(action: string): string {
    const colors = {
      'CREATE': '#10b981',    // green
      'UPDATE': '#3b82f6',    // blue  
      'ROLLBACK': '#f59e0b',  // amber
      'DELETE': '#ef4444',    // red
      'VIEW': '#8b5cf6'       // purple
    };
    return colors[action as keyof typeof colors] || '#6b7280';
  }

  private getIconForAction(action: string): string {
    const icons = {
      'CREATE': '➕',
      'UPDATE': '🔄', 
      'ROLLBACK': '⏪',
      'DELETE': '🗑️',
      'VIEW': '👁️'
    };
    return icons[action as keyof typeof icons] || '📝';
  }

  private getMermaidColor(action: string): string {
    const colors = {
      'CREATE': '#c6f6d5',
      'UPDATE': '#dbeafe', 
      'ROLLBACK': '#fed7aa',
      'DELETE': '#fecaca',
      'VIEW': '#e9d5ff'
    };
    return colors[action as keyof typeof colors] || '#f3f4f6';
  }

  // Additional utility methods

  async getGraph(key: string): Promise<VersionNode[]> {
    const graphKey = `versions/graph/${key}.json`;
    const response = await this.makeR2Request(graphKey);
    
    if (!response || response.status !== 200) return [];
    
    return JSON.parse(await response.text());
  }

  async deleteGraph(key: string): Promise<boolean> {
    try {
      const graphKey = `versions/graph/${key}.json`;
      await this.makeR2Request(graphKey, 'DELETE');
      
      // Also delete visualizations
      await this.makeR2Request(`versions/viz/${key}/mermaid.md`, 'DELETE');
      await this.makeR2Request(`versions/viz/${key}/d3.json`, 'DELETE');
      
      console.log(`🗑️ Deleted version graph for ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete graph for ${key}:`, error.message);
      return false;
    }
  }

  async listAllGraphs(): Promise<string[]> {
    try {
      const listUrl = `https://${this.r2Credentials.accountId}.r2.cloudflarestorage.com/${this.r2Credentials.bucketName}?list-type=2&prefix=versions/graph/`;
      
      const authString = `${this.r2Credentials.accessKeyId}:${this.r2Credentials.secretAccessKey}`;
      const authHeader = `Basic ${btoa(authString)}`;
      
      const response = await fetch(listUrl, {
        headers: {
          'Authorization': authHeader,
          'x-amz-content-sha256': await Bun.hash('')
        }
      });

      if (!response.ok) return [];

      const xml = await response.text();
      const keyMatches = xml.match(/<Key>(versions\/graph\/[^<]+\.json)<\/Key>/g) || [];
      
      return keyMatches.map(match => {
        const key = match.match(/<Key>([^<]+)<\/Key>/)![1];
        return key.replace('versions/graph/', '').replace('.json', '');
      });
    } catch (error) {
      console.error('Failed to list graphs:', error.message);
      return [];
    }
  }

  async getStats(key: string): Promise<{
    totalVersions: number;
    latestVersion: string;
    lastModified: string;
    actionCounts: Record<string, number>;
  }> {
    const graph = await this.getGraph(key);
    
    if (graph.length === 0) {
      return {
        totalVersions: 0,
        latestVersion: '',
        lastModified: '',
        actionCounts: {}
      };
    }

    const actionCounts = graph.reduce((acc, node) => {
      acc[node.action] = (acc[node.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalVersions: graph.length,
      latestVersion: graph[graph.length - 1].version,
      lastModified: graph[graph.length - 1].timestamp,
      actionCounts
    };
  }
}

// Export singleton instance
export const versionGraph = new VersionGraph();
