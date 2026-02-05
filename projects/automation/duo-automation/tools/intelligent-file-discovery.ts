#!/usr/bin/env bun

/**
 * Intelligent File Discovery System
 * 
 * Advanced file discovery with semantic analysis, pattern recognition,
 * and AI-powered search capabilities for optimal context retrieval.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  token: string;
  keywords: string[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  complexity: number;
  relevance: number;
}

interface SearchQuery {
  pattern?: string;
  tokens?: string[];
  keywords?: string[];
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  lastModifiedAfter?: Date;
  lastModifiedBefore?: Date;
  complexity?: 'low' | 'medium' | 'high';
  sortBy?: 'name' | 'size' | 'relevance' | 'modified';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface SearchResult {
  files: FileInfo[];
  total: number;
  query: SearchQuery;
  metadata: {
    searchTime: number;
    tokens: string[];
    patterns: string[];
    relevance: number;
  };
}

class IntelligentFileDiscovery {
  private fileIndex: Map<string, FileInfo> = new Map();
  private tokenIndex: Map<string, Set<string>> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  private extensionIndex: Map<string, Set<string>> = new Map();
  private complexityIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.buildIndexes();
  }

  /**
   * Build comprehensive file indexes
   */
  private buildIndexes(): void {
    console.log('🔍 Building file discovery indexes...');
    
    const directories = ['src', 'packages', 'demos', 'scripts', 'tests'];
    
    for (const dir of directories) {
      this.indexDirectory(dir);
    }

    console.log(`📊 Indexed ${this.fileIndex.size} files`);
    console.log(`🏷️ Token groups: ${this.tokenIndex.size}`);
    console.log(`🔤 Keyword groups: ${this.keywordIndex.size}`);
  }

  /**
   * Index directory and all subdirectories
   */
  private indexDirectory(directory: string): void {
    if (!existsSync(directory)) return;

    const files = this.getAllFiles(directory);
    
    for (const filePath of files) {
      const fileInfo = this.analyzeFile(filePath);
      this.fileIndex.set(filePath, fileInfo);
      this.updateIndexes(fileInfo);
    }
  }

  /**
   * Get all files in directory recursively
   */
  private getAllFiles(directory: string, extensions: string[] = ['.ts', '.js', '.tsx', '.jsx', '.md', '.json']): string[] {
    const files: string[] = [];
    
    function scan(currentDir: string) {
      try {
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
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    scan(directory);
    return files;
  }

  /**
   * Analyze file for indexing
   */
  private analyzeFile(filePath: string): FileInfo {
    const stats = statSync(filePath);
    const name = basename(filePath, extname(filePath));
    const extension = extname(filePath);
    
    let content = '';
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      // File might be binary
    }

    return {
      path: filePath,
      name,
      extension,
      size: stats.size,
      lastModified: stats.mtime,
      token: this.extractToken(filePath),
      keywords: this.extractKeywords(content, name),
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      dependencies: this.extractDependencies(content),
      complexity: this.calculateComplexity(content),
      relevance: 0 // Will be calculated during search
    };
  }

  /**
   * Extract context token from file path
   */
  private extractToken(filePath: string): string {
    // Check for @token patterns
    const tokenMatch = filePath.match(/@([^\/]+)/);
    if (tokenMatch) return tokenMatch[1];

    // Check directory-based tokens
    if (filePath.includes('/core/')) return 'core';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('/automation/')) return 'automation';
    if (filePath.includes('/venmo/')) return 'venmo';
    if (filePath.includes('/payment/')) return 'payment';
    if (filePath.includes('/tools/')) return 'tools';
    if (filePath.includes('/platform/')) return 'platform';
    if (filePath.includes('/test/')) return 'test';

    return 'unknown';
  }

  /**
   * Extract keywords from content and filename
   */
  private extractKeywords(content: string, fileName: string): string[] {
    const keywords = new Set<string>();
    
    // Add filename keywords
    fileName.split(/[-_]/).forEach(word => {
      if (word.length > 2) keywords.add(word.toLowerCase());
    });

    // Add content keywords
    const keywordRegex = /\b(class|function|interface|type|const|let|var)\s+(\w+)/g;
    let match;
    while ((match = keywordRegex.exec(content)) !== null) {
      keywords.add(match[2].toLowerCase());
    }

    // Add common programming keywords
    const commonKeywords = ['async', 'await', 'promise', 'callback', 'handler', 'service', 'controller', 'component', 'utility', 'helper', 'manager', 'factory', 'builder'];
    commonKeywords.forEach(kw => {
      if (content.toLowerCase().includes(kw)) {
        keywords.add(kw);
      }
    });

    return Array.from(keywords);
  }

  /**
   * Extract imports from content
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  /**
   * Extract exports from content
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  /**
   * Extract dependencies from content
   */
  private extractDependencies(content: string): string[] {
    const deps = new Set<string>();
    
    // Add imports
    this.extractImports(content).forEach(dep => deps.add(dep));
    
    // Add requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      deps.add(match[1]);
    }

    return Array.from(deps);
  }

  /**
   * Calculate file complexity
   */
  private calculateComplexity(content: string): number {
    let complexity = 0;
    
    // Count lines of code
    const lines = content.split('\n').length;
    complexity += Math.min(lines / 10, 10); // Max 10 points for lines
    
    // Count functions
    const functionCount = (content.match(/function\s+\w+|=>\s*{|\w+\s*:\s*\([^)]*\)\s*=>/g) || []).length;
    complexity += Math.min(functionCount, 5); // Max 5 points for functions
    
    // Count classes
    const classCount = (content.match(/class\s+\w+/g) || []).length;
    complexity += Math.min(classCount * 2, 5); // Max 5 points for classes
    
    // Count control structures
    const controlCount = (content.match(/\b(if|else|for|while|switch|try|catch)\b/g) || []).length;
    complexity += Math.min(controlCount / 5, 5); // Max 5 points for control structures
    
    return Math.round(complexity);
  }

  /**
   * Update indexes with file information
   */
  private updateIndexes(fileInfo: FileInfo): void {
    // Token index
    if (!this.tokenIndex.has(fileInfo.token)) {
      this.tokenIndex.set(fileInfo.token, new Set());
    }
    this.tokenIndex.get(fileInfo.token)!.add(fileInfo.path);

    // Keyword index
    for (const keyword of fileInfo.keywords) {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(fileInfo.path);
    }

    // Extension index
    if (!this.extensionIndex.has(fileInfo.extension)) {
      this.extensionIndex.set(fileInfo.extension, new Set());
    }
    this.extensionIndex.get(fileInfo.extension)!.add(fileInfo.path);

    // Complexity index
    const complexityLevel = this.getComplexityLevel(fileInfo.complexity);
    if (!this.complexityIndex.has(complexityLevel)) {
      this.complexityIndex.set(complexityLevel, new Set());
    }
    this.complexityIndex.get(complexityLevel)!.add(fileInfo.path);
  }

  /**
   * Get complexity level string
   */
  private getComplexityLevel(complexity: number): string {
    if (complexity <= 5) return 'low';
    if (complexity <= 15) return 'medium';
    return 'high';
  }

  /**
   * Search files with intelligent filtering
   */
  public search(query: SearchQuery): SearchResult {
    const startTime = Date.now();
    console.log(`🔍 Searching files with query:`, query);

    let candidateFiles = Array.from(this.fileIndex.values());

    // Apply filters
    candidateFiles = this.applyFilters(candidateFiles, query);

    // Calculate relevance scores
    candidateFiles = this.calculateRelevance(candidateFiles, query);

    // Sort results
    candidateFiles = this.sortResults(candidateFiles, query);

    // Apply limit
    if (query.limit) {
      candidateFiles = candidateFiles.slice(0, query.limit);
    }

    const searchTime = Date.now() - startTime;

    const result: SearchResult = {
      files: candidateFiles,
      total: candidateFiles.length,
      query,
      metadata: {
        searchTime,
        tokens: [...new Set(candidateFiles.map(f => f.token))],
        patterns: query.pattern ? [query.pattern] : [],
        relevance: candidateFiles.length > 0 ? candidateFiles[0].relevance : 0
      }
    };

    console.log(`📊 Found ${result.total} files in ${searchTime}ms`);
    return result;
  }

  /**
   * Apply filters to candidate files
   */
  private applyFilters(files: FileInfo[], query: SearchQuery): FileInfo[] {
    let filtered = files;

    // Token filter
    if (query.tokens && query.tokens.length > 0) {
      filtered = filtered.filter(f => query.tokens!.includes(f.token));
    }

    // Keyword filter
    if (query.keywords && query.keywords.length > 0) {
      filtered = filtered.filter(f => 
        query.keywords!.some(kw => f.keywords.includes(kw.toLowerCase()))
      );
    }

    // Extension filter
    if (query.extensions && query.extensions.length > 0) {
      filtered = filtered.filter(f => query.extensions!.includes(f.extension));
    }

    // Size filter
    if (query.minSize !== undefined) {
      filtered = filtered.filter(f => f.size >= query.minSize!);
    }
    if (query.maxSize !== undefined) {
      filtered = filtered.filter(f => f.size <= query.maxSize!);
    }

    // Date filter
    if (query.lastModifiedAfter) {
      filtered = filtered.filter(f => f.lastModified >= query.lastModifiedAfter!);
    }
    if (query.lastModifiedBefore) {
      filtered = filtered.filter(f => f.lastModified <= query.lastModifiedBefore!);
    }

    // Complexity filter
    if (query.complexity) {
      filtered = filtered.filter(f => this.getComplexityLevel(f.complexity) === query.complexity);
    }

    // Pattern filter
    if (query.pattern) {
      const regex = new RegExp(query.pattern, 'i');
      filtered = filtered.filter(f => 
        regex.test(f.name) || 
        regex.test(f.path) ||
        f.keywords.some(kw => regex.test(kw))
      );
    }

    return filtered;
  }

  /**
   * Calculate relevance scores for files
   */
  private calculateRelevance(files: FileInfo[], query: SearchQuery): FileInfo[] {
    return files.map(file => {
      let relevance = 0;

      // Token relevance
      if (query.tokens && query.tokens.includes(file.token)) {
        relevance += 30;
      }

      // Keyword relevance
      if (query.keywords) {
        const matchingKeywords = query.keywords.filter(kw => 
          file.keywords.includes(kw.toLowerCase())
        ).length;
        relevance += matchingKeywords * 10;
      }

      // Pattern relevance
      if (query.pattern) {
        const regex = new RegExp(query.pattern, 'i');
        if (regex.test(file.name)) relevance += 20;
        if (regex.test(file.path)) relevance += 10;
      }

      // Name relevance (exact match)
      if (query.pattern && file.name.toLowerCase() === query.pattern.toLowerCase()) {
        relevance += 50;
      }

      file.relevance = relevance;
      return file;
    });
  }

  /**
   * Sort search results
   */
  private sortResults(files: FileInfo[], query: SearchQuery): FileInfo[] {
    const sortBy = query.sortBy || 'relevance';
    const sortOrder = query.sortOrder || 'desc';

    return files.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'relevance':
          comparison = a.relevance - b.relevance;
          break;
        case 'modified':
          comparison = a.lastModified.getTime() - b.lastModified.getTime();
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Find similar files
   */
  public findSimilarFiles(filePath: string, limit: number = 5): FileInfo[] {
    const file = this.fileIndex.get(filePath);
    if (!file) return [];

    const similar: Array<{ file: FileInfo; score: number }> = [];

    for (const [path, candidate] of this.fileIndex) {
      if (path === filePath) continue;

      let score = 0;

      // Same token
      if (candidate.token === file.token) score += 20;

      // Shared keywords
      const sharedKeywords = file.keywords.filter(k => candidate.keywords.includes(k)).length;
      score += sharedKeywords * 5;

      // Similar size
      const sizeDiff = Math.abs(file.size - candidate.size);
      if (sizeDiff < file.size * 0.5) score += 10;

      // Similar complexity
      const complexityDiff = Math.abs(file.complexity - candidate.complexity);
      if (complexityDiff <= 5) score += 5;

      similar.push({ file: candidate, score });
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.file);
  }

  /**
   * Get files by token
   */
  public getFilesByToken(token: string): FileInfo[] {
    const paths = this.tokenIndex.get(token) || new Set();
    return Array.from(paths).map(path => this.fileIndex.get(path)!);
  }

  /**
   * Get files by keyword
   */
  public getFilesByKeyword(keyword: string): FileInfo[] {
    const paths = this.keywordIndex.get(keyword.toLowerCase()) || new Set();
    return Array.from(paths).map(path => this.fileIndex.get(path)!);
  }

  /**
   * Get statistics
   */
  public getStatistics(): any {
    const files = Array.from(this.fileIndex.values());
    
    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      averageSize: Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length),
      tokenDistribution: Object.fromEntries(
        Array.from(this.tokenIndex.entries()).map(([token, paths]) => [token, paths.size])
      ),
      extensionDistribution: Object.fromEntries(
        Array.from(this.extensionIndex.entries()).map(([ext, paths]) => [ext, paths.size])
      ),
      complexityDistribution: Object.fromEntries(
        Array.from(this.complexityIndex.entries()).map(([level, paths]) => [level, paths.size])
      ),
      mostComplexFiles: files
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 10)
        .map(f => ({ path: f.path, complexity: f.complexity }))
    };
  }

  /**
   * Export index for analysis
   */
  public exportIndex(): string {
    return JSON.stringify({
      files: Array.from(this.fileIndex.entries()),
      tokenIndex: Object.fromEntries(
        Array.from(this.tokenIndex.entries()).map(([token, paths]) => [token, Array.from(paths)])
      ),
      keywordIndex: Object.fromEntries(
        Array.from(this.keywordIndex.entries()).map(([keyword, paths]) => [keyword, Array.from(paths)])
      ),
      statistics: this.getStatistics()
    }, null, 2);
  }
}

// CLI interface
if (import.meta.main) {
  const discovery = new IntelligentFileDiscovery();
  const command = process.argv[2];
  const query = process.argv[3];

  switch (command) {
    case 'search':
      if (query) {
        const searchQuery: SearchQuery = {
          pattern: query,
          limit: 10,
          sortBy: 'relevance',
          sortOrder: 'desc'
        };
        const result = discovery.search(searchQuery);
        console.log('\n🔍 Search Results:');
        result.files.forEach(file => {
          console.log(`  📄 ${file.path} (${file.token}, relevance: ${file.relevance})`);
        });
      }
      break;

    case 'similar':
      if (query) {
        const similar = discovery.findSimilarFiles(query);
        console.log(`\n📄 Files similar to ${query}:`);
        similar.forEach(file => {
          console.log(`  📄 ${file.path} (${file.token})`);
        });
      }
      break;

    case 'token':
      if (query) {
        const files = discovery.getFilesByToken(query);
        console.log(`\n📁 Files with token ${query}:`);
        files.forEach(file => {
          console.log(`  📄 ${file.path}`);
        });
      }
      break;

    case 'stats':
      console.log('\n📊 File Discovery Statistics:');
      console.log(JSON.stringify(discovery.getStatistics(), null, 2));
      break;

    case 'export':
      console.log(discovery.exportIndex());
      break;

    default:
      console.log(`
Intelligent File Discovery System

Usage:
  file-discovery search <pattern>    - Search files by pattern
  file-discovery similar <file>      - Find similar files
  file-discovery token <token>       - Get files by token
  file-discovery stats               - Show statistics
  file-discovery export              - Export index

Features:
- Semantic file analysis
- Pattern recognition
- Token-based grouping
- Intelligent search
- Similarity detection
      `);
  }
}

export default IntelligentFileDiscovery;
