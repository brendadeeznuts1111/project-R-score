import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { styled, FW_COLORS, FactoryWagerColor } from '../theme/colors';

export interface SearchResult {
  title: string;
  content: string;
  links: string[];
  relevance: number;
  confidence?: number;
}

export interface SearchFilters {
  version?: string;
  apiReferenceOnly?: boolean;
  codeOnly?: boolean;
  context?: string;
  generateExample?: boolean;
}

export interface Diagnosis {
  error: string;
  bunDocs: SearchResult[];
  similarPastIssues: any[];
  suggestedFix: string;
  confidence: number;
}

export class BunMCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected = false;

  constructor() {
    this.client = new Client(
      {
        name: 'factorywager-cli',
        version: '5.0.0',
      },
      { capabilities: { tools: {} } }
    );

    this.transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', './lib/mcp/bun-mcp-server.ts'],
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      console.log(styled('✅ MCP Connected to Bun Docs', 'success'));
    } catch (error) {
      console.error(styled('❌ Failed to connect to MCP server', 'error'));
      throw error;
    }
  }

  async searchBunDocs(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'SearchBun',
        arguments: { query, ...filters },
      });

      return this.formatResults(result.content || []);
    } catch (error) {
      console.error(styled(`🔍 Search failed: ${error.message}`, 'error'));
      return [];
    }
  }

  async explainCode(codeSnippet: string, context?: string): Promise<SearchResult[]> {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'ExplainCode',
        arguments: {
          code: codeSnippet,
          context: context || 'factorywager',
          generateExample: true,
        },
      });

      return this.formatResults(result.content || []);
    } catch (error) {
      console.error(styled(`📚 Code explanation failed: ${error.message}`, 'error'));
      return [];
    }
  }

  async validateCode(code: string): Promise<any> {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'ValidateCode',
        arguments: { code },
      });

      return result.content || {};
    } catch (error) {
      console.error(styled(`🔍 Code validation failed: ${error.message}`, 'error'));
      return { valid: false, errors: [error.message] };
    }
  }

  async generateFactoryWagerExample(api: string, context?: string): Promise<string> {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'GenerateFactoryWagerExample',
        arguments: {
          api,
          context: context || 'general',
          includeSecurity: true,
        },
      });

      return result.content?.[0]?.text || '// No example generated';
    } catch (error) {
      console.error(styled(`🔧 Example generation failed: ${error.message}`, 'error'));
      return `// Error generating example: ${error.message}`;
    }
  }

  private formatResults(content: any[]): SearchResult[] {
    return content
      .map((item, index) => ({
        title: this.extractTitle(item.text) || `Result ${index + 1}`,
        content: item.text || '',
        links: this.extractLinks(item.text || ''),
        relevance: this.calculateRelevance(item.text || ''),
        confidence: item.confidence || 0.8,
      }))
      .sort((a, b) => b.relevance - a.relevance);
  }

  private extractTitle(text: string): string | null {
    const lines = text.split('\n');
    const firstLine = lines[0]?.trim();

    // Look for markdown headers
    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }

    // Look for function definitions
    const funcMatch = firstLine?.match(/^(async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      return funcMatch[2];
    }

    // Look for class definitions
    const classMatch = firstLine?.match(/^class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }

    return firstLine?.length > 0 ? firstLine : null;
  }

  private extractLinks(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    return text.match(urlRegex) || [];
  }

  private calculateRelevance(text: string): number {
    // Simple relevance scoring based on content characteristics
    let score = 0.5; // Base score

    // Boost for code examples
    if (text.includes('```') || text.includes('function') || text.includes('class')) {
      score += 0.3;
    }

    // Boost for official documentation patterns
    if (text.includes('bun.sh') || text.includes('@bun')) {
      score += 0.2;
    }

    // Boost for comprehensive content
    if (text.length > 200) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
      console.log(styled('🔌 MCP Disconnected', 'muted'));
    }
  }
}

// Export singleton instance
export const bunMCPClient = new BunMCPClient();
