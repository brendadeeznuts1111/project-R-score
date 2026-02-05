#!/usr/bin/env bun

import type { DocumentationResult, SearchOptions } from '../schemas/types.js';

/**
 * Bun documentation search utility
 * Extracted from the original monolithic file with enhancements
 */
export class BunDocumentationSearch {
  private documentationIndex: Array<{
    title: string;
    description: string;
    url: string;
    category: string;
    keywords: string[];
  }>;

  constructor() {
    this.documentationIndex = this.buildDocumentationIndex();
  }

  /**
   * Build comprehensive Bun documentation index
   */
  private buildDocumentationIndex(): Array<{
    title: string;
    description: string;
    url: string;
    category: string;
    keywords: string[];
  }> {
    return [
      {
        title: "Bun Runtime - Getting Started",
        description: "Complete guide to setting up and using Bun JavaScript runtime",
        url: "https://bun.com/docs/installation",
        category: "Getting Started",
        keywords: ["install", "setup", "getting started", "runtime", "bun"],
      },
      {
        title: "Bun Test - Fast Testing Framework",
        description: "Built-in testing framework with TypeScript support and coverage",
        url: "https://bun.com/docs/test",
        category: "Testing",
        keywords: ["test", "testing", "coverage", "jest", "vitest"],
      },
      {
        title: "Bun Build - Optimized Bundler",
        description: "High-performance bundler with minification and code splitting",
        url: "https://bun.com/docs/bundler",
        category: "Build Tools",
        keywords: ["build", "bundle", "minify", "webpack", "esbuild", "bundler"],
      },
      {
        title: "Bun Server - HTTP/WebSocket Server",
        description: "Built-in HTTP and WebSocket server with hot reload support",
        url: "https://bun.com/docs/server",
        category: "Server",
        keywords: ["server", "http", "websocket", "api", "fetch", "serve"],
      },
      {
        title: "Bun SQL - Database Client",
        description: "Built-in SQL client with connection pooling and migrations",
        url: "https://bun.com/docs/sql",
        category: "Database",
        keywords: ["sql", "database", "postgres", "mysql", "sqlite", "query"],
      },
      {
        title: "Bun File System API",
        description: "Fast file system operations with built-in utilities",
        url: "https://bun.com/docs/api/file-io",
        category: "API Reference",
        keywords: ["file", "fs", "read", "write", "path", "file system"],
      },
      {
        title: "Bun Performance Optimization",
        description: "Tips and techniques for optimizing Bun applications",
        url: "https://bun.com/docs/runtime/performance",
        category: "Performance",
        keywords: ["performance", "optimization", "speed", "memory", "benchmark"],
      },
      {
        title: "Bun v1.3 Features",
        description: "Latest features and improvements in Bun version 1.3",
        url: "https://bun.com/blog/bun-v1.3",
        category: "Release Notes",
        keywords: ["v1.3", "features", "new", "release", "update"],
      },
      {
        title: "Bun Package Manager",
        description: "Lightning-fast package manager with lockfile support",
        url: "https://bun.com/docs/install",
        category: "Package Management",
        keywords: ["install", "package", "npm", "yarn", "lockfile", "dependencies"],
      },
      {
        title: "Bun WebSocket API",
        description: "Real-time WebSocket communication with Bun",
        url: "https://bun.com/docs/websocket",
        category: "WebSocket",
        keywords: ["websocket", "realtime", "socket", "communication", "ws"],
      },
      {
        title: "Bun TypeScript Support",
        description: "Native TypeScript support without configuration",
        url: "https://bun.com/docs/typescript",
        category: "TypeScript",
        keywords: ["typescript", "ts", "js", "type", "compile", "tsc"],
      },
      {
        title: "Bun Environment Variables",
        description: "Managing environment variables and configuration",
        url: "https://bun.com/docs/runtime/env",
        category: "Environment",
        keywords: ["env", "environment", "variables", "config", "dotenv"],
      },
      {
        title: "Bun HTTP Client",
        description: "Built-in HTTP client for making requests",
        url: "https://bun.com/docs/api/http",
        category: "HTTP Client",
        keywords: ["http", "client", "request", "fetch", "api", "network"],
      },
      {
        title: "Bun Worker Threads",
        description: "Multi-threading with Worker API",
        url: "https://bun.com/docs/api/workers",
        category: "Workers",
        keywords: ["worker", "thread", "parallel", "multithreading", "concurrent"],
      },
      {
        title: "Bun Crypto APIs",
        description: "Built-in cryptographic functions and hashing",
        url: "https://bun.com/docs/api/crypto",
        category: "Crypto",
        keywords: ["crypto", "hash", "encrypt", "decrypt", "security", "cipher"],
      },
      {
        title: "Bun Subprocess",
        description: "Running external processes and commands",
        url: "https://bun.com/docs/api/spawn",
        category: "Subprocess",
        keywords: ["spawn", "process", "exec", "command", "subprocess", "child"],
      },
      {
        title: "Bun Event Loop",
        description: "Understanding Bun's event loop and async operations",
        url: "https://bun.com/docs/runtime/event-loop",
        category: "Runtime",
        keywords: ["event loop", "async", "await", "promise", "task", "microtask"],
      },
      {
        title: "Bun Global APIs",
        description: "Available global functions and objects in Bun",
        url: "https://bun.com/docs/api/globals",
        category: "Globals",
        keywords: ["global", "console", "setTimeout", "setInterval", "process"],
      },
      {
        title: "Bun Module System",
        description: "ES modules, CommonJS, and module resolution",
        url: "https://bun.com/docs/modules",
        category: "Modules",
        keywords: ["module", "import", "export", "require", "es modules", "cjs"],
      },
      {
        title: "Bun Memory Management",
        description: "Memory usage, garbage collection, and optimization",
        url: "https://bun.com/docs/runtime/memory",
        category: "Memory",
        keywords: ["memory", "garbage collection", "gc", "heap", "leak", "optimize"],
      }
    ];
  }

  /**
   * Search Bun documentation with comprehensive results
   */
  async search(query: string, options: SearchOptions = {}): Promise<DocumentationResult[]> {
    const {
      limit = 5,
      categories,
      includeDocumentation = true,
      includeExamples = true
    } = options;

    // Normalize search query
    const queryLower = query.toLowerCase().trim();

    // Score and filter results
    const results = this.documentationIndex
      .map(doc => ({
        ...doc,
        relevance: this.calculateRelevance(queryLower, doc),
      }))
      .filter(result => result.relevance > 0)
      .filter(result => {
        // Filter by category if specified
        if (categories && categories.length > 0) {
          return categories.includes(result.category);
        }
        return true;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return results.map(result => ({
      title: result.title,
      description: result.description,
      url: result.url,
      category: result.category,
      relevance: result.relevance,
    }));
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateRelevance(query: string, doc: any): number {
    let score = 0;
    
    // Title matches (highest weight)
    if (doc.title.toLowerCase().includes(query)) {
      score += 50;
    }
    
    // Description matches
    if (doc.description.toLowerCase().includes(query)) {
      score += 30;
    }
    
    // Category matches
    if (doc.category.toLowerCase().includes(query)) {
      score += 20;
    }
    
    // Keyword matches (medium weight)
    for (const keyword of doc.keywords) {
      if (keyword.toLowerCase().includes(query) || query.includes(keyword.toLowerCase())) {
        score += 15;
      }
      
      // Exact keyword match (highest weight for keywords)
      if (keyword.toLowerCase() === query) {
        score += 25;
      }
    }
    
    // Exact title match (bonus)
    if (doc.title.toLowerCase() === query) {
      score += 30;
    }
    
    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return [...new Set(this.documentationIndex.map(doc => doc.category))].sort();
  }

  /**
   * Get documents by category
   */
  getDocumentsByCategory(category: string): DocumentationResult[] {
    return this.documentationIndex
      .filter(doc => doc.category === category)
      .map(doc => ({
        title: doc.title,
        description: doc.description,
        url: doc.url,
        category: doc.category,
        relevance: 100,
      }));
  }

  /**
   * Get popular/featured documentation
   */
  getPopularDocuments(): DocumentationResult[] {
    const popularTopics = [
      'getting started',
      'test',
      'build',
      'server',
      'install',
      'typescript'
    ];

    return this.documentationIndex
      .filter(doc => {
        const searchText = `${doc.title} ${doc.description} ${doc.keywords.join(' ')}`.toLowerCase();
        return popularTopics.some(topic => searchText.includes(topic));
      })
      .map(doc => ({
        title: doc.title,
        description: doc.description,
        url: doc.url,
        category: doc.category,
        relevance: 100,
      }));
  }
}

// Singleton instance
export const bunDocumentationSearch = new BunDocumentationSearch();

export default bunDocumentationSearch;