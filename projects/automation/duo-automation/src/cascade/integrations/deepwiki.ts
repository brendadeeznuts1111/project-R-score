/**
 * Cascade DeepWiki Integration
 * Leverages MCP deepwiki server for knowledge enhancement
 * [#REF:DEEPWIKI-INTEGRATION] - Building on workspace tool availability
 */

// Type declarations for MCP deepwiki server
interface DeepWikiClient {
  askQuestion(repoName: string, question: string): Promise<string>;
  readWikiContents(repoName: string): Promise<any>;
  readWikiStructure(repoName: string): Promise<any>;
}

declare const mcp0_ask_question: (params: { repoName: string; question: string }) => Promise<string>;
declare const mcp0_read_wiki_contents: (params: { repoName: string }) => Promise<any>;
declare const mcp0_read_wiki_structure: (params: { repoName: string }) => Promise<any>;

export class DeepWikiIntegration {
  private static instance: DeepWikiIntegration;
  private knowledgeCache = new Map<string, any>();
  
  static getInstance(): DeepWikiIntegration {
    if (!DeepWikiIntegration.instance) {
      DeepWikiIntegration.instance = new DeepWikiIntegration();
    }
    return DeepWikiIntegration.instance;
  }
  
  /**
   * Ask question about GitHub repository (from workspace context)
   */
  async askQuestion(repoName: string, question: string): Promise<string> {
    const cacheKey = `${repoName}:${question}`;
    
    if (this.knowledgeCache.has(cacheKey)) {
      return this.knowledgeCache.get(cacheKey);
    }
    
    try {
      const answer = await mcp0_ask_question({ repoName, question });
      this.knowledgeCache.set(cacheKey, answer);
      
      // Log knowledge acquisition for observability
      console.log(`🧠 Acquired knowledge from ${repoName}: ${question.substring(0, 50)}...`);
      
      return answer;
    } catch (error) {
      console.warn(`⚠️ Failed to query DeepWiki for ${repoName}:`, error);
      return `Knowledge unavailable for ${repoName}`;
    }
  }
  
  /**
   * Get repository documentation structure
   */
  async getRepoStructure(repoName: string): Promise<any> {
    const cacheKey = `structure:${repoName}`;
    
    if (this.knowledgeCache.has(cacheKey)) {
      return this.knowledgeCache.get(cacheKey);
    }
    
    try {
      const structure = await mcp0_read_wiki_structure({ repoName });
      this.knowledgeCache.set(cacheKey, structure);
      return structure;
    } catch (error) {
      console.warn(`⚠️ Failed to get structure for ${repoName}:`, error);
      return null;
    }
  }
  
  /**
   * Get full repository contents
   */
  async getRepoContents(repoName: string): Promise<any> {
    const cacheKey = `contents:${repoName}`;
    
    if (this.knowledgeCache.has(cacheKey)) {
      return this.knowledgeCache.get(cacheKey);
    }
    
    try {
      const contents = await mcp0_read_wiki_contents({ repoName });
      this.knowledgeCache.set(cacheKey, contents);
      return contents;
    } catch (error) {
      console.warn(`⚠️ Failed to get contents for ${repoName}:`, error);
      return null;
    }
  }
  
  /**
   * Enhance hook execution with external knowledge
   * (Building on variation 2's "follow-up readiness")
   */
  async enhanceWithKnowledge(context: any, operation: string): Promise<any> {
    // Knowledge enhancement based on operation type
    const knowledgeEnhancements: Record<string, () => Promise<any>> = {
      'rule.evaluate': async () => {
        const bestPractices = await this.askQuestion(
          'microsoft/vscode',
          'What are the best practices for rule engine optimization?'
        );
        return { bestPractices, source: 'deepwiki' };
      },
      'skill.execute': async () => {
        const patterns = await this.askQuestion(
          'facebook/react',
          'What are the latest performance patterns for skill execution?'
        );
        return { patterns, source: 'deepwiki' };
      },
      'config.update': async () => {
        const validation = await this.askQuestion(
          'nodejs/node',
          'What are the configuration validation best practices?'
        );
        return { validation, source: 'deepwiki' };
      }
    };
    
    const enhancer = knowledgeEnhancements[operation];
    if (enhancer) {
      try {
        const knowledge = await enhancer();
        context.knowledge = knowledge;
        console.log(`🧠 Enhanced ${operation} with external knowledge`);
      } catch (error) {
        console.warn(`⚠️ Knowledge enhancement failed for ${operation}:`, error);
      }
    }
    
    return context;
  }
  
  /**
   * Clear knowledge cache (for memory management)
   */
  clearCache(): void {
    this.knowledgeCache.clear();
    console.log('🧹 DeepWiki knowledge cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.knowledgeCache.size,
      keys: Array.from(this.knowledgeCache.keys())
    };
  }
}
