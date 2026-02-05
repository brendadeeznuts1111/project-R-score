#!/usr/bin/env bun

/**
 * Advanced Context Engine - AI-Powered Context Optimization
 * 
 * This system provides intelligent context management for AI/LLM systems
 * with semantic analysis, dependency tracking, and dynamic context optimization.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { ContextTokenManager } from './context-token-manager';

interface ContextFile {
  path: string;
  token: string;
  priority: number;
  dependencies: string[];
  imports: string[];
  exports: string[];
  keywords: string[];
  size: number;
  lastModified: Date;
}

interface ContextGraph {
  nodes: Map<string, ContextFile>;
  edges: Map<string, Set<string>>;
  reverseEdges: Map<string, Set<string>>;
  tokenGroups: Map<string, Set<string>>;
}

interface ContextQuery {
  tokens?: string[];
  keywords?: string[];
  filePath?: string;
  maxFiles?: number;
  maxTokens?: number;
  includeTests?: boolean;
  includeDependencies?: boolean;
  contextWindow?: number;
}

interface ContextResult {
  files: ContextFile[];
  context: string;
  metadata: {
    totalFiles: number;
    totalTokens: number;
    tokens: string[];
    relevance: number;
    coverage: string[];
  };
}

class AdvancedContextEngine {
  private tokenManager: ContextTokenManager;
  private contextGraph: ContextGraph;
  private cache: Map<string, ContextResult> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.tokenManager = new ContextTokenManager();
    this.contextGraph = {
      nodes: new Map(),
      edges: new Map(),
      reverseEdges: new Map(),
      tokenGroups: new Map()
    };
    this.buildContextGraph();
  }

  /**
   * Build comprehensive context graph from project files
   */
  private async buildContextGraph(): Promise<void> {
    const directories = ['src', 'packages', 'demos', 'scripts', 'tests'];
    
    for (const dir of directories) {
      await this.scanDirectory(dir);
    }

    this.buildDependencyEdges();
    this.buildTokenGroups();
  }

  /**
   * Scan directory and extract file information
   */
  private async scanDirectory(directory: string): Promise<void> {
    if (!existsSync(directory)) return;

    const files = this.getAllFiles(directory, ['.ts', '.js', '.tsx', '.jsx']);
    
    for (const filePath of files) {
      const contextFile = await this.analyzeFile(filePath);
      this.contextGraph.nodes.set(filePath, contextFile);
    }
  }

  /**
   * Analyze individual file for context information
   */
  private async analyzeFile(filePath: string): Promise<ContextFile> {
    const content = readFileSync(filePath, 'utf-8');
    const stats = statSync(filePath);
    const token = this.tokenManager.getTokenForPath(filePath) || 'unknown';
    
    return {
      path: filePath,
      token,
      priority: this.tokenManager.getTokenPriority(token),
      dependencies: this.extractDependencies(content),
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      keywords: this.extractKeywords(content, filePath),
      size: stats.size,
      lastModified: stats.mtime
    };
  }

  /**
   * Extract dependencies from file content
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  /**
   * Extract exports from file content
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Export statements
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Extract keywords from content and filename
   */
  private extractKeywords(content: string, filePath: string): string[] {
    const keywords = new Set<string>();
    
    // Add filename keywords
    const fileName = basename(filePath, extname(filePath));
    fileName.split(/[-_]/).forEach(word => {
      if (word.length > 2) keywords.add(word.toLowerCase());
    });

    // Add content keywords (functions, classes, interfaces)
    const keywordRegex = /\b(class|function|interface|type|const|let|var)\s+(\w+)/g;
    let match;
    while ((match = keywordRegex.exec(content)) !== null) {
      keywords.add(match[2].toLowerCase());
    }

    // Add token keywords
    const token = this.tokenManager.getTokenForPath(filePath);
    if (token) {
      this.tokenManager.getTokenKeywords(token).forEach(k => keywords.add(k));
    }

    return Array.from(keywords);
  }

  /**
   * Build dependency edges between files
   */
  private buildDependencyEdges(): void {
    for (const [filePath, file] of this.contextGraph.nodes) {
      const dependencies = new Set<string>();
      
      for (const dep of file.dependencies) {
        // Convert relative imports to file paths
        const resolvedPath = this.resolveImportPath(filePath, dep);
        if (resolvedPath && this.contextGraph.nodes.has(resolvedPath)) {
          dependencies.add(resolvedPath);
        }
      }

      this.contextGraph.edges.set(filePath, dependencies);
      
      // Build reverse edges
      for (const dep of dependencies) {
        if (!this.contextGraph.reverseEdges.has(dep)) {
          this.contextGraph.reverseEdges.set(dep, new Set());
        }
        this.contextGraph.reverseEdges.get(dep)!.add(filePath);
      }
    }
  }

  /**
   * Build token groups for efficient context retrieval
   */
  private buildTokenGroups(): void {
    for (const [filePath, file] of this.contextGraph.nodes) {
      const token = file.token;
      if (!this.contextGraph.tokenGroups.has(token)) {
        this.contextGraph.tokenGroups.set(token, new Set());
      }
      this.contextGraph.tokenGroups.get(token)!.add(filePath);
    }
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(fromPath: string, importPath: string): string | null {
    // Handle token-based imports
    if (importPath.startsWith('@')) {
      const token = importPath.split('/')[0];
      const tokenPaths = this.getTokenPaths(token);
      for (const tokenPath of tokenPaths) {
        const resolved = join(tokenPath, importPath.slice(token.length + 1));
        if (this.contextGraph.nodes.has(resolved)) {
          return resolved;
        }
      }
    }

    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolved = join(dirname(fromPath), importPath);
      return this.findActualFile(resolved);
    }

    return null;
  }

  /**
   * Find actual file path (handle extensions)
   */
  private findActualFile(path: string): string | null {
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    
    for (const ext of extensions) {
      const fullPath = path + ext;
      if (this.contextGraph.nodes.has(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Get all files for a token
   */
  private getTokenPaths(token: string): string[] {
    const tokenConfig = this.tokenManager.getTokenConfig(token);
    return tokenConfig?.paths || [];
  }

  /**
   * Get all files in directory recursively
   */
  private getAllFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    function scan(currentDir: string) {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          scan(fullPath);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    scan(dir);
    return files;
  }

  /**
   * Query context with advanced filtering
   */
  public async queryContext(query: ContextQuery): Promise<ContextResult> {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.metadata.totalFiles < this.CACHE_TTL) {
      return cached;
    }

    let files = Array.from(this.contextGraph.nodes.values());

    // Filter by tokens
    if (query.tokens && query.tokens.length > 0) {
      files = files.filter(f => query.tokens!.includes(f.token));
    }

    // Filter by keywords
    if (query.keywords && query.keywords.length > 0) {
      files = files.filter(f => 
        query.keywords!.some(kw => f.keywords.includes(kw.toLowerCase()))
      );
    }

    // Include dependencies
    if (query.includeDependencies && query.filePath) {
      const deps = this.getDependencies(query.filePath);
      const depFiles = deps.map(d => this.contextGraph.nodes.get(d)).filter(Boolean) as ContextFile[];
      files = [...files, ...depFiles];
    }

    // Sort by priority and relevance
    files.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.size - a.size; // Prefer larger files for more context
    });

    // Limit by file count and token count
    let totalTokens = 0;
    const limitedFiles: ContextFile[] = [];
    
    for (const file of files) {
      if (query.maxFiles && limitedFiles.length >= query.maxFiles) break;
      if (query.maxTokens && totalTokens + file.size > query.maxTokens) break;
      
      limitedFiles.push(file);
      totalTokens += file.size;
    }

    const result: ContextResult = {
      files: limitedFiles,
      context: this.buildContextString(limitedFiles, query),
      metadata: {
        totalFiles: limitedFiles.length,
        totalTokens,
        tokens: [...new Set(limitedFiles.map(f => f.token))],
        relevance: this.calculateRelevance(limitedFiles, query),
        coverage: this.getCoverage(limitedFiles)
      }
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get dependencies for a file
   */
  private getDependencies(filePath: string, visited = new Set<string>()): string[] {
    if (visited.has(filePath)) return [];
    visited.add(filePath);

    const deps = this.contextGraph.edges.get(filePath) || new Set();
    const allDeps = Array.from(deps);

    for (const dep of deps) {
      allDeps.push(...this.getDependencies(dep, visited));
    }

    return [...new Set(allDeps)];
  }

  /**
   * Build context string for AI consumption
   */
  private buildContextString(files: ContextFile[], query: ContextQuery): string {
    const sections: string[] = [];
    
    // Group by token
    const tokenGroups = new Map<string, ContextFile[]>();
    files.forEach(file => {
      if (!tokenGroups.has(file.token)) {
        tokenGroups.set(file.token, []);
      }
      tokenGroups.get(file.token)!.push(file);
    });

    // Build sections
    for (const [token, tokenFiles] of tokenGroups) {
      sections.push(`\n// ${token.toUpperCase()} CONTEXT`);
      
      for (const file of tokenFiles) {
        const content = readFileSync(file.path, 'utf-8');
        const truncated = this.truncateContent(content, query.contextWindow || 2000);
        sections.push(`\n// File: ${file.path}`);
        sections.push(truncated);
      }
    }

    return sections.join('\n');
  }

  /**
   * Truncate content to fit context window
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    // Try to truncate at logical boundaries
    const lines = content.split('\n');
    let result = '';
    let currentLength = 0;
    
    for (const line of lines) {
      if (currentLength + line.length + 1 > maxLength) break;
      result += line + '\n';
      currentLength += line.length + 1;
    }
    
    return result + '\n// ... (truncated)';
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(files: ContextFile[], query: ContextQuery): number {
    let score = 0;
    
    // Token relevance
    if (query.tokens) {
      const tokenMatches = files.filter(f => query.tokens!.includes(f.token)).length;
      score += (tokenMatches / files.length) * 40;
    }

    // Keyword relevance
    if (query.keywords) {
      const keywordMatches = files.filter(f => 
        query.keywords!.some(kw => f.keywords.includes(kw.toLowerCase()))
      ).length;
      score += (keywordMatches / files.length) * 30;
    }

    // Priority relevance
    const avgPriority = files.reduce((sum, f) => sum + f.priority, 0) / files.length;
    score += Math.max(0, (10 - avgPriority) / 10) * 30;

    return Math.round(score);
  }

  /**
   * Get coverage information
   */
  private getCoverage(files: ContextFile[]): string[] {
    const tokens = [...new Set(files.map(f => f.token))];
    const coverage: string[] = [];
    
    for (const token of tokens) {
      const tokenFiles = files.filter(f => f.token === token);
      coverage.push(`${token}: ${tokenFiles.length} files`);
    }

    return coverage;
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: ContextQuery): string {
    return JSON.stringify({
      tokens: query.tokens?.sort(),
      keywords: query.keywords?.sort(),
      filePath: query.filePath,
      maxFiles: query.maxFiles,
      maxTokens: query.maxTokens,
      includeTests: query.includeTests,
      includeDependencies: query.includeDependencies
    });
  }

  /**
   * Get context suggestions for a file
   */
  public async getContextSuggestions(filePath: string): Promise<string[]> {
    const file = this.contextGraph.nodes.get(filePath);
    if (!file) return [];

    const suggestions: string[] = [];
    
    // Suggest related tokens
    const relatedTokens = this.tokenManager.getRelatedTokens(file.token);
    suggestions.push(...relatedTokens);

    // Suggest files with similar keywords
    const similarFiles = Array.from(this.contextGraph.nodes.values())
      .filter(f => f.path !== filePath && f.keywords.some(k => file.keywords.includes(k)))
      .slice(0, 5)
      .map(f => f.path);

    suggestions.push(...similarFiles);

    return [...new Set(suggestions)];
  }

  /**
   * Export context graph for analysis
   */
  public exportGraph(): string {
    return JSON.stringify({
      nodes: Array.from(this.contextGraph.nodes.entries()),
      edges: Array.from(this.contextGraph.edges.entries()),
      tokenGroups: Array.from(this.contextGraph.tokenGroups.entries()),
      metadata: {
        totalFiles: this.contextGraph.nodes.size,
        totalEdges: Array.from(this.contextGraph.edges.values()).reduce((sum, edges) => sum + edges.size, 0),
        tokens: Array.from(this.contextGraph.tokenGroups.keys())
      }
    }, null, 2);
  }
}

// CLI interface
if (import.meta.main) {
  const engine = new AdvancedContextEngine();
  const command = process.argv[2];
  const target = process.argv[3];

  switch (command) {
    case 'query':
      if (target) {
        const query: ContextQuery = {
          filePath: target,
          includeDependencies: true,
          maxFiles: 10,
          maxTokens: 5000
        };
        const result = await engine.queryContext(query);
        console.log('Context Result:');
        console.log(JSON.stringify(result.metadata, null, 2));
        console.log('\nContext Preview:');
        console.log(result.context.substring(0, 1000) + '...');
      }
      break;
    case 'suggest':
      if (target) {
        const suggestions = await engine.getContextSuggestions(target);
        console.log('Context Suggestions:');
        suggestions.forEach(s => console.log(`  - ${s}`));
      }
      break;
    case 'export':
      console.log(engine.exportGraph());
      break;
    default:
      console.log(`
Advanced Context Engine CLI

Usage:
  context-engine query <file>     - Query context for file
  context-engine suggest <file>   - Get context suggestions
  context-engine export          - Export context graph

Features:
- Semantic file analysis
- Dependency tracking
- Token-based grouping
- Intelligent context retrieval
- AI-optimized output
      `);
  }
}

export default AdvancedContextEngine;
