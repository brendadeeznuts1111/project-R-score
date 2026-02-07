// lib/mcp/wiki-generator-mcp.ts — Wiki generator integration for the MCP ecosystem

import { WikiURLGenerator } from '../wiki/wiki-generator';
import { r2MCPIntegration } from './r2-integration';
import { masterTokenManager } from '../security/master-token';
import { DocumentationProvider } from '../docs/constants/enums';
import { styled, FW_COLORS } from '../theme/colors';

export interface WikiGenerationRequest {
  format: 'markdown' | 'html' | 'json' | 'all';
  baseUrl?: string;
  workspace?: string;
  includeExamples?: boolean;
  includeValidation?: boolean;
  context?: string;
  authToken?: string;
  provider?: DocumentationProvider;
}

export interface WikiGenerationResult {
  success: boolean;
  files: {
    markdown?: string;
    html?: string;
    json?: string;
  };
  metadata: {
    total: number;
    categories: number;
    generated: string;
    baseUrl: string;
    workspace: string;
  };
  r2Stored?: {
    key: string;
    url: string;
  };
  error?: string;
  provider?: {
    name: string;
    description: string;
    features: string[];
    requiresAuth: boolean;
  };
}

export type WikiFormat = 'markdown' | 'html' | 'json' | 'all';

export interface WikiTemplate {
  name: string;
  description: string;
  provider: DocumentationProvider;
  baseUrl?: string;
  workspace: string;
  format: WikiFormat;
  includeExamples: boolean;
  customSections?: string[];
  providerConfig?: {
    apiKey?: string;
    version?: string;
    region?: string;
  };
  // Enhanced features
  tags?: string[];
  category?: 'api' | 'documentation' | 'tutorial' | 'reference' | 'guide' | 'custom';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  version?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  dependencies?: string[];
  validationRules?: {
    requiredSections?: string[];
    maxSections?: number;
    forbiddenPatterns?: string[];
  };
  metadata?: Record<string, any>;
  performanceMetrics?: {
    averageGenerationTime?: number;
    successRate?: number;
    lastUsed?: string;
    usageCount?: number;
  };
  crossReferences?: {
    rssFeedItems?: Array<{
      title: string;
      link: string;
      pubDate: string;
      relevanceScore: number;
      benchmarkMatches?: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        rssValue?: string;
        codeValue?: string;
      }>;
    }>;
    gitCommits?: Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
      relevanceScore: number;
      benchmarkMatches?: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        commitValue?: string;
        codeValue?: string;
      }>;
    }>;
    relatedTemplates?: Array<{
      templateName: string;
      similarityScore: number;
      sharedFeatures: string[];
      sharedTags: string[];
    }>;
  };
}

export class MCPWikiGenerator {
  private static readonly WIKI_R2_PREFIX = 'mcp/wiki/';
  private static customTemplates: WikiTemplate[] = [];
  private static templateUsageCache = new Map<string, number>();
  private static templateMetrics = new Map<string, {
    totalGenerations: number;
    successfulGenerations: number;
    averageGenerationTime: number;
    lastUsed: string;
  }>();
  private static templateMap = new Map<string, WikiTemplate>(); // O(1) template lookup cache
  private static mapInitialized = false; // Track if map is initialized
  private static updateLock = false; // Simple lock for template updates

  /**
   * Ensure template map is initialized (lazy initialization with proper locking)
   */
  private static ensureMapInitialized(): void {
    // Use existing updateLock to prevent race conditions
    if (MCPWikiGenerator.mapInitialized) {
      return; // Already initialized
    }

    // Wait if another thread is updating
    if (MCPWikiGenerator.updateLock) {
      // Simple spin wait - in production, consider using proper async locks
      let attempts = 0;
      while (MCPWikiGenerator.updateLock && attempts < 100) {
        // Small delay to allow other thread to complete
        attempts++;
      }
      
      // Check again after waiting
      if (MCPWikiGenerator.mapInitialized) {
        return;
      }
    }

    // Acquire lock and initialize
    try {
      MCPWikiGenerator.updateLock = true;
      
      // Double-check pattern - another thread might have initialized while we waited for lock
      if (MCPWikiGenerator.mapInitialized) {
        return;
      }
      
      MCPWikiGenerator.updateTemplateMap();
      MCPWikiGenerator.mapInitialized = true;
    } finally {
      MCPWikiGenerator.updateLock = false;
    }
  }

  /**
   * Update template map for O(1) lookups
   */
  private static updateTemplateMap(): void {
    MCPWikiGenerator.templateMap.clear();
    MCPWikiGenerator.getWikiTemplates().forEach(template => {
      MCPWikiGenerator.templateMap.set(template.name, template);
    });
    // Ensure map is marked as initialized after update
    MCPWikiGenerator.mapInitialized = true;
  }

  /**
   * Get template by name using O(1) lookup
   */
  private static getTemplateByName(name: string): WikiTemplate | undefined {
    MCPWikiGenerator.ensureMapInitialized();
    return MCPWikiGenerator.templateMap.get(name);
  }

  /**
   * Enhanced template registration with metadata tracking
   * @param template Template object with required fields
   */
  static registerCustomTemplate(template: WikiTemplate): void {
    // Input validation
    if (!template || typeof template !== 'object') {
      throw new Error('Template must be a valid object');
    }
    
    if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
      throw new Error('Template must have a valid name');
    }
    
    if (!template.provider || !Object.values(DocumentationProvider).includes(template.provider)) {
      throw new Error('Template must have a valid provider from DocumentationProvider enum');
    }
    
    if (!template.format || typeof template.format !== 'string') {
      throw new Error('Template must have a valid format');
    }

    // Add timestamps if not provided
    const now = new Date().toISOString();
    const enhancedTemplate = {
      ...template,
      createdAt: template.createdAt || now,
      updatedAt: now,
      version: template.version || '1.0.0',
      usageCount: template.usageCount || 0,
    };

    // Check for duplicates and update
    const existingIndex = MCPWikiGenerator.customTemplates.findIndex(t => t.name === template.name);
    if (existingIndex >= 0) {
      MCPWikiGenerator.customTemplates[existingIndex] = enhancedTemplate;
      MCPWikiGenerator.templateMap.set(template.name, enhancedTemplate); // Update cache
      console.log(styled(`📝 Updated custom template: ${template.name}`, 'info'));
    } else {
      MCPWikiGenerator.customTemplates.push(enhancedTemplate);
      MCPWikiGenerator.templateMap.set(template.name, enhancedTemplate); // Add to cache
      console.log(styled(`📝 Registered custom template: ${template.name}`, 'success'));
    }
    
    // Mark map as initialized since we've manually updated it
    MCPWikiGenerator.mapInitialized = true;

    // Initialize metrics tracking
    if (!MCPWikiGenerator.templateMetrics.has(template.name)) {
      MCPWikiGenerator.templateMetrics.set(template.name, {
        totalGenerations: 0,
        successfulGenerations: 0,
        averageGenerationTime: 0,
        lastUsed: now,
      });
    }
  }

  /**
   * Advanced template search and filtering
   */
  static searchTemplates(criteria: {
    query?: string;
    provider?: DocumentationProvider;
    category?: string;
    tags?: string[];
    format?: WikiFormat;
    priority?: string;
    author?: string;
  }): WikiTemplate[] {
    const allTemplates = MCPWikiGenerator.getWikiTemplates();
    
    return allTemplates.filter(template => {
      // Text search
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const searchText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Provider filter
      if (criteria.provider && template.provider !== criteria.provider) return false;

      // Category filter
      if (criteria.category && template.category !== criteria.category) return false;

      // Tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const templateTags = template.tags || [];
        if (!criteria.tags.some(tag => templateTags.includes(tag))) return false;
      }

      // Format filter
      if (criteria.format && template.format !== criteria.format) return false;

      // Priority filter
      if (criteria.priority && template.priority !== criteria.priority) return false;

      // Author filter
      if (criteria.author && template.author !== criteria.author) return false;

      return true;
    });
  }

  /**
   * Get template recommendations based on usage patterns
   */
  static getTemplateRecommendations(limit: number = 5): WikiTemplate[] {
    const allTemplates = MCPWikiGenerator.getWikiTemplates();
    
    return allTemplates
      .sort((a, b) => {
        // Sort by usage count and success rate
        const aMetrics = MCPWikiGenerator.templateMetrics.get(a.name);
        const bMetrics = MCPWikiGenerator.templateMetrics.get(b.name);
        
        const aScore = (a.usageCount || 0) + (aMetrics?.successfulGenerations || 0);
        const bScore = (b.usageCount || 0) + (bMetrics?.successfulGenerations || 0);
        
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get template analytics and insights
   */
  static getTemplateAnalytics(): {
    totalTemplates: number;
    customTemplates: number;
    builtInTemplates: number;
    providerDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    formatDistribution: Record<string, number>;
    mostUsedTemplates: Array<{ name: string; usageCount: number; successRate: number }>;
    averageGenerationTime: number;
  } {
    const allTemplates = MCPWikiGenerator.getWikiTemplates();
    const builtInCount = 8; // Number of built-in templates
    const customCount = allTemplates.length - builtInCount;

    // Provider distribution
    const providerDist: Record<string, number> = {};
    allTemplates.forEach(template => {
      providerDist[template.provider] = (providerDist[template.provider] || 0) + 1;
    });

    // Category distribution
    const categoryDist: Record<string, number> = {};
    allTemplates.forEach(template => {
      if (template.category) {
        categoryDist[template.category] = (categoryDist[template.category] || 0) + 1;
      }
    });

    // Format distribution
    const formatDist: Record<string, number> = {};
    allTemplates.forEach(template => {
      formatDist[template.format] = (formatDist[template.format] || 0) + 1;
    });

    // Most used templates
    const mostUsed = Array.from(MCPWikiGenerator.templateMetrics.entries())
      .map(([name, metrics]) => ({
        name,
        usageCount: metrics.totalGenerations,
        successRate: metrics.totalGenerations > 0 ? metrics.successfulGenerations / metrics.totalGenerations : 0
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    // Average generation time
    const avgTime = Array.from(MCPWikiGenerator.templateMetrics.values())
      .reduce((sum, metrics) => sum + metrics.averageGenerationTime, 0) / 
      Math.max(MCPWikiGenerator.templateMetrics.size, 1);

    return {
      totalTemplates: allTemplates.length,
      customTemplates: customCount,
      builtInTemplates: builtInCount,
      providerDistribution: providerDist,
      categoryDistribution: categoryDist,
      formatDistribution: formatDist,
      mostUsedTemplates: mostUsed,
      averageGenerationTime: avgTime
    };
  }

  /**
   * Track template usage with atomic updates and locking
   */
  private static trackTemplateUsage(templateName: string, generationTime: number, success: boolean): void {
    // Skip if update is already in progress (simple lock)
    if (MCPWikiGenerator.updateLock) {
      console.warn(styled('⚠️ Template update in progress, skipping tracking', 'warning'));
      return;
    }

    try {
      MCPWikiGenerator.updateLock = true; // Acquire lock

      const existing = MCPWikiGenerator.templateMetrics.get(templateName) || {
        totalGenerations: 0,
        successfulGenerations: 0,
        averageGenerationTime: 0,
        lastUsed: new Date().toISOString(),
      };

      existing.totalGenerations++;
      if (success) {
        existing.successfulGenerations++;
      }

      // Update average generation time with NaN protection
      if (!isNaN(generationTime) && generationTime >= 0) {
        existing.averageGenerationTime = 
          (existing.averageGenerationTime * (existing.totalGenerations - 1) + generationTime) / 
          existing.totalGenerations;
      }

      existing.lastUsed = new Date().toISOString();

      MCPWikiGenerator.templateMetrics.set(templateName, existing);

      // Atomic template update to prevent race conditions using O(1) lookup
      const template = MCPWikiGenerator.getTemplateByName(templateName);
      if (template) {
        const templateIndex = MCPWikiGenerator.customTemplates.findIndex(t => t.name === templateName);
        if (templateIndex >= 0) {
          const updatedTemplate = {
            ...MCPWikiGenerator.customTemplates[templateIndex],
            usageCount: (template.usageCount || 0) + 1,
            performanceMetrics: {
              averageGenerationTime: existing.averageGenerationTime,
              successRate: existing.totalGenerations > 0 ? existing.successfulGenerations / existing.totalGenerations : 0,
              lastUsed: existing.lastUsed,
              usageCount: existing.totalGenerations,
            }
          };
          MCPWikiGenerator.customTemplates[templateIndex] = updatedTemplate;
          MCPWikiGenerator.templateMap.set(templateName, updatedTemplate); // Update cache
        }
      }
    } finally {
      MCPWikiGenerator.updateLock = false; // Release lock
    }
  }

  /**
   * Cleanup old template metrics to prevent memory leaks
   * @param maxAge Maximum age in milliseconds (default: 30 days)
   */
  static cleanupOldMetrics(maxAge?: number): void {
    // Input validation
    if (typeof maxAge !== 'number' || maxAge < 0) {
      console.warn(styled('⚠️ Invalid maxAge provided to cleanupOldMetrics, using default', 'warning'));
      maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days default
    }
    
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [name, metrics] of MCPWikiGenerator.templateMetrics.entries()) {
      try {
        // Validate date parsing
        const lastUsed = new Date(metrics.lastUsed).getTime();
        if (isNaN(lastUsed)) {
          console.warn(styled(`⚠️ Invalid date for template '${name}', removing from metrics`, 'warning'));
          toDelete.push(name);
          continue;
        }
        
        if (now - lastUsed > maxAge) {
          toDelete.push(name);
        }
      } catch (error) {
        console.warn(styled(`⚠️ Error processing metrics for template '${name}': ${error}`, 'warning'));
        toDelete.push(name); // Remove problematic entries
      }
    }
    
    toDelete.forEach(name => MCPWikiGenerator.templateMetrics.delete(name));
    console.log(styled(`🧹 Cleaned up ${toDelete.length} old template metrics`, 'info'));
  }

  /**
   * Clear all cached data and reset state
   * Useful for testing and memory cleanup
   */
  static clearCache(): void {
    // Wait for any ongoing operations
    if (MCPWikiGenerator.updateLock) {
      let attempts = 0;
      while (MCPWikiGenerator.updateLock && attempts < 100) {
        attempts++;
      }
    }

    try {
      MCPWikiGenerator.updateLock = true;
      
      // Clear all caches and reset state
      MCPWikiGenerator.customTemplates = [];
      MCPWikiGenerator.templateUsageCache.clear();
      MCPWikiGenerator.templateMetrics.clear();
      MCPWikiGenerator.templateMap.clear();
      MCPWikiGenerator.mapInitialized = false;
    } finally {
      MCPWikiGenerator.updateLock = false;
    }
  }

  /**
   * Export templates with analytics
   */
  static exportTemplatesWithAnalytics(): {
    templates: WikiTemplate[];
    analytics: ReturnType<typeof MCPWikiGenerator.getTemplateAnalytics>;
    exportDate: string;
  } {
    return {
      templates: MCPWikiGenerator.getWikiTemplates(),
      analytics: MCPWikiGenerator.getTemplateAnalytics(),
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Import templates with validation and merge
   */
  static async importTemplatesWithValidation(
    templates: WikiTemplate[],
    options: {
      overwrite?: boolean;
      validateProvider?: boolean;
      skipDuplicates?: boolean;
    } = {}
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const template of templates) {
      try {
        // Validate template
        const validation = MCPWikiGenerator.validateTemplateForProvider(template);
        if (!validation.isValid) {
          errors.push(`Template "${template.name}": ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for duplicates
        const existing = MCPWikiGenerator.customTemplates.find(t => t.name === template.name);
        if (existing && !options.overwrite) {
          if (options.skipDuplicates) {
            skipped++;
            continue;
          } else {
            errors.push(`Template "${template.name}" already exists`);
            continue;
          }
        }

        // Register template
        MCPWikiGenerator.registerCustomTemplate(template);
        imported++;

      } catch (error) {
        errors.push(`Template "${template.name}": ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Cross-reference scoring system for templates
   */
  static async scoreCrossReferences(templateName: string): Promise<{
    rssFeedItems: Array<{
      title: string;
      link: string;
      pubDate: string;
      relevanceScore: number;
      benchmarkMatches: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        rssValue?: string;
        codeValue?: string;
      }>;
    }>;
    gitCommits: Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
      relevanceScore: number;
      benchmarkMatches: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        commitValue?: string;
        codeValue?: string;
      }>;
    }>;
    relatedTemplates: Array<{
      templateName: string;
      similarityScore: number;
      sharedFeatures: string[];
      sharedTags: string[];
    }>;
  }> {
    const template = MCPWikiGenerator.getTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Score RSS feed items
    const rssFeedItems = await MCPWikiGenerator.scoreRSSFeedItems(template);

    // Score git commits
    const gitCommits = await MCPWikiGenerator.scoreGitCommits(template);

    // Score related templates
    const relatedTemplates = MCPWikiGenerator.scoreRelatedTemplates(template);

    return {
      rssFeedItems,
      gitCommits,
      relatedTemplates
    };
  }

  /**
   * Score RSS feed items against template with proper security and error handling
   */
  private static async scoreRSSFeedItems(template: WikiTemplate): Promise<Array<{
    title: string;
    link: string;
    pubDate: string;
    relevanceScore: number;
    benchmarkMatches: Array<{
      type: 'performance' | 'feature' | 'security';
      score: number;
      description: string;
      rssValue?: string;
      codeValue?: string;
    }>;
  }>> {
    try {
      const RSS_FEED_URL = 'https://bun.com/rss.xml';
      const REQUEST_TIMEOUT = 10000; // 10 seconds

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      try {
        const response = await fetch(RSS_FEED_URL, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'MCPWikiGenerator/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const rssText = await response.text();
        
        // Validate RSS content
        if (!rssText || rssText.trim().length === 0) {
          console.warn(styled('⚠️ RSS feed returned empty content', 'warning'));
          return [];
        }
        
        // Parse RSS feed (simplified parsing for demo)
        const items = MCPWikiGenerator.parseRSSFeed(rssText);
        
        return items.map(item => {
          const relevanceScore = MCPWikiGenerator.calculateRSSRelevanceScore(item, template);
          const benchmarkMatches = MCPWikiGenerator.extractBenchmarkMatches(item, template);
          
          return {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            relevanceScore,
            benchmarkMatches
          };
        }).filter(item => item.relevanceScore > 0.3) // Filter low relevance items
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10); // Top 10 items

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn(styled('⚠️ RSS feed request timed out', 'warning'));
        } else {
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          console.warn(styled(`⚠️ Failed to fetch RSS feed: ${errorMessage}`, 'warning'));
        }
        return [];
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(styled(`⚠️ RSS feed processing failed: ${errorMessage}`, 'warning'));
      return [];
    }
  }

  /**
   * Score git commits against template with proper security and error handling
   */
  private static async scoreGitCommits(template: WikiTemplate): Promise<Array<{
    hash: string;
    message: string;
    date: string;
    author: string;
    relevanceScore: number;
    benchmarkMatches: Array<{
      type: 'performance' | 'feature' | 'security';
      score: number;
      description: string;
      commitValue?: string;
      codeValue?: string;
    }>;
  }>> {
    try {
      // Validate current working directory
      const cwd = process.cwd();
      if (!cwd || typeof cwd !== 'string') {
        console.warn(styled('⚠️ Invalid current working directory', 'warning'));
        return [];
      }

      // Validate git repository exists with comprehensive error handling
      let gitCheck: ReturnType<typeof Bun.spawnSync>;
      try {
        gitCheck = Bun.spawnSync(['git', 'rev-parse', '--git-dir'], {
          cwd,
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: 5000 // 5 second timeout
        });
      } catch (spawnError) {
        console.warn(styled(`⚠️ Failed to spawn git command: ${spawnError}`, 'warning'));
        return [];
      }
      
      if (gitCheck.exitCode !== 0) {
        const errorMsg = gitCheck.stderr?.toString() || 'Not a git repository';
        console.warn(styled(`⚠️ Git repository validation failed: ${errorMsg}`, 'warning'));
        return [];
      }
      
      // Get git commits for the current repository with proper error handling
      let gitLog: ReturnType<typeof Bun.spawnSync>;
      try {
        gitLog = Bun.spawnSync(['git', 'log', '--oneline', '-n', '50', '--pretty=format:%H|%s|%ai|%an'], {
          cwd,
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: 10000 // 10 second timeout
        });
      } catch (spawnError) {
        console.warn(styled(`⚠️ Failed to spawn git log command: ${spawnError}`, 'warning'));
        return [];
      }
      
      if (!gitLog.stdout || gitLog.exitCode !== 0) {
        const errorMsg = gitLog.stderr?.toString() || 'Unknown error';
        console.warn(styled(`⚠️ Git log failed: ${errorMsg}`, 'warning'));
        return [];
      }
      
      const commits = gitLog.stdout.toString().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const parts = line.split('|');
            if (parts.length < 4) {
              console.warn(styled(`⚠️ Malformed git log line: ${line}`, 'warning'));
              return null;
            }
            
            const hash = parts[0];
            const messageParts = parts.slice(1, -2);
            const message = messageParts.join('|');
            const date = parts[parts.length - 2];
            const author = parts[parts.length - 1];
            
            // Validate required fields
            if (!hash || !date || !author) {
              console.warn(styled(`⚠️ Missing required fields in git log line: ${line}`, 'warning'));
              return null;
            }
            
            return { hash, message, date, author };
          } catch (error) {
            console.warn(styled(`⚠️ Error parsing git log line: ${line}`, 'warning'));
            return null;
          }
        })
        .filter((commit): commit is NonNullable<typeof commit> => commit !== null);

      return commits.map(commit => {
        const relevanceScore = MCPWikiGenerator.calculateGitRelevanceScore(commit, template);
        const benchmarkMatches = MCPWikiGenerator.extractGitBenchmarkMatches(commit, template);
        
        return {
          ...commit,
          relevanceScore,
          benchmarkMatches
        };
      }).filter(commit => commit.relevanceScore > 0.2)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(styled(`⚠️ Failed to fetch git commits: ${errorMessage}`, 'warning'));
      return [];
    }
  }

  /**
   * Score related templates
   */
  private static scoreRelatedTemplates(template: WikiTemplate): Array<{
    templateName: string;
    similarityScore: number;
    sharedFeatures: string[];
    sharedTags: string[];
  }> {
    const allTemplates = MCPWikiGenerator.getWikiTemplates();
    
    return allTemplates
      .filter(t => t.name !== template.name)
      .map(otherTemplate => {
        const similarityScore = MCPWikiGenerator.calculateTemplateSimilarity(template, otherTemplate);
        const sharedFeatures = MCPWikiGenerator.findSharedFeatures(template, otherTemplate);
        const sharedTags = MCPWikiGenerator.findSharedTags(template, otherTemplate);
        
        return {
          templateName: otherTemplate.name,
          similarityScore,
          sharedFeatures,
          sharedTags
        };
      })
      .filter(t => t.similarityScore > 0.1)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);
  }

  /**
   * Calculate RSS relevance score
   */
  private static calculateRSSRelevanceScore(rssItem: any, template: WikiTemplate): number {
    let score = 0;
    const title = rssItem.title.toLowerCase();
    const description = rssItem.description.toLowerCase();
    const templateText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();

    // Provider matching
    if (title.includes(template.provider.toLowerCase()) || description.includes(template.provider.toLowerCase())) {
      score += 0.4;
    }

    // Format matching
    if (title.includes(template.format) || description.includes(template.format)) {
      score += 0.3;
    }

    // Category matching
    if (template.category && (title.includes(template.category) || description.includes(template.category))) {
      score += 0.3;
    }

    // Tag matching
    template.tags?.forEach(tag => {
      if (title.includes(tag.toLowerCase()) || description.includes(tag.toLowerCase())) {
        score += 0.2;
      }
    });

    // Benchmark keyword matching
    const benchmarkKeywords = ['faster', 'performance', 'optimization', 'speed', 'benchmark', 'improved'];
    benchmarkKeywords.forEach(keyword => {
      if (title.includes(keyword) || description.includes(keyword)) {
        score += 0.1;
      }
    });

    // Text similarity bonus
    const textSimilarity = MCPWikiGenerator.calculateTextSimilarity(templateText, title + ' ' + description);
    score += textSimilarity * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate git relevance score
   */
  private static calculateGitRelevanceScore(commit: any, template: WikiTemplate): number {
    let score = 0;
    const message = commit.message.toLowerCase();
    const templateText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();

    // Provider matching
    if (message.includes(template.provider.toLowerCase())) {
      score += 0.3;
    }

    // Format matching
    if (message.includes(template.format)) {
      score += 0.2;
    }

    // Category matching
    if (template.category && message.includes(template.category)) {
      score += 0.2;
    }

    // Tag matching
    template.tags?.forEach(tag => {
      if (message.includes(tag.toLowerCase())) {
        score += 0.15;
      }
    });

    // Performance keywords
    const performanceKeywords = ['performance', 'optimize', 'faster', 'improve', 'benchmark', 'speed'];
    performanceKeywords.forEach(keyword => {
      if (message.includes(keyword)) {
        score += 0.1;
      }
    });

    // Text similarity
    const textSimilarity = MCPWikiGenerator.calculateTextSimilarity(templateText, message);
    score += textSimilarity * 0.15;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate template similarity
   */
  private static calculateTemplateSimilarity(template1: WikiTemplate, template2: WikiTemplate): number {
    let score = 0;

    // Provider matching
    if (template1.provider === template2.provider) {
      score += 0.3;
    }

    // Format matching
    if (template1.format === template2.format) {
      score += 0.2;
    }

    // Category matching
    if (template1.category === template2.category) {
      score += 0.2;
    }

    // Tag overlap
    const sharedTags = MCPWikiGenerator.findSharedTags(template1, template2);
    score += (sharedTags.length / Math.max(template1.tags?.length || 1, template2.tags?.length || 1)) * 0.2;

    // Description similarity
    const descSimilarity = MCPWikiGenerator.calculateTextSimilarity(
      template1.description,
      template2.description
    );
    score += descSimilarity * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract benchmark matches from RSS item
   */
  private static extractBenchmarkMatches(rssItem: any, template: WikiTemplate): Array<{
    type: 'performance' | 'feature' | 'security';
    score: number;
    description: string;
    rssValue?: string;
    codeValue?: string;
  }> {
    const matches: Array<{
      type: 'performance' | 'feature' | 'security';
      score: number;
      description: string;
      rssValue?: string;
      codeValue?: string;
    }> = [];

    const text = rssItem.title + ' ' + rssItem.description;

    // Performance benchmarks
    const performanceRegex = /(\d+%|\d+x)\s+faster|(\d+(?:\.\d+)?)\s*ms|(\d+(?:\.\d+)?)\s*seconds?/gi;
    let perfMatch;
    while ((perfMatch = performanceRegex.exec(text)) !== null) {
      matches.push({
        type: 'performance',
        score: 0.8,
        description: `Performance improvement: ${perfMatch[0]}`,
        rssValue: perfMatch[0]
      });
    }

    // Feature mentions
    const featureKeywords = ['new feature', 'added', 'implemented', 'feature'];
    featureKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        matches.push({
          type: 'feature',
          score: 0.6,
          description: `Feature mention: ${keyword}`,
          rssValue: keyword
        });
      }
    });

    // Security mentions
    const securityKeywords = ['security', 'vulnerability', 'cve', 'patch', 'fix'];
    securityKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        matches.push({
          type: 'security',
          score: 0.7,
          description: `Security mention: ${keyword}`,
          rssValue: keyword
        });
      }
    });

    return matches;
  }

  /**
   * Extract benchmark matches from git commit
   */
  private static extractGitBenchmarkMatches(commit: any, template: WikiTemplate): Array<{
    type: 'performance' | 'feature' | 'security';
    score: number;
    description: string;
    commitValue?: string;
    codeValue?: string;
  }> {
    const matches: Array<{
      type: 'performance' | 'feature' | 'security';
      score: number;
      description: string;
      commitValue?: string;
      codeValue?: string;
    }> = [];

    const message = commit.message;

    // Performance benchmarks in commits
    const performanceRegex = /(\d+%|\d+x)\s+faster|improved.*performance|optimize.*performance/gi;
    let perfMatch;
    while ((perfMatch = performanceRegex.exec(message)) !== null) {
      matches.push({
        type: 'performance',
        score: 0.8,
        description: `Performance improvement: ${perfMatch[0]}`,
        commitValue: perfMatch[0]
      });
    }

    // Feature implementations
    if (message.toLowerCase().includes('feat:') || message.toLowerCase().includes('feature')) {
      matches.push({
        type: 'feature',
        score: 0.6,
        description: 'Feature implementation',
        commitValue: message
      });
    }

    // Security fixes
    if (message.toLowerCase().includes('security') || message.toLowerCase().includes('cve') || message.toLowerCase().includes('fix:')) {
      matches.push({
        type: 'security',
        score: 0.7,
        description: 'Security fix/improvement',
        commitValue: message
      });
    }

    return matches;
  }

  /**
   * Find shared features between templates
   */
  private static findSharedFeatures(template1: WikiTemplate, template2: WikiTemplate): string[] {
    const features1 = template1.metadata?.features || [];
    const features2 = template2.metadata?.features || [];
    
    return features1.filter((feature: string) => features2.includes(feature));
  }

  /**
   * Find shared tags between templates
   */
  private static findSharedTags(template1: WikiTemplate, template2: WikiTemplate): string[] {
    const tags1 = template1.tags || [];
    const tags2 = template2.tags || [];
    
    return tags1.filter(tag => tags2.includes(tag));
  }

  /**
   * Calculate text similarity (simplified Jaccard similarity)
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Parse RSS feed (simplified parser)
   */
  private static parseRSSFeed(rssText: string): Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }> {
    const items: Array<{
      title: string;
      link: string;
      description: string;
      pubDate: string;
    }> = [];

    // Simple regex-based parsing for demo
    const itemMatches = rssText.match(/<item>[\s\S]*?<\/item>/gi) || [];
    
    itemMatches.forEach(itemText => {
      const titleMatch = itemText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemText.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemText.match(/<link>(.*?)<\/link>/);
      const descMatch = itemText.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || itemText.match(/<description>(.*?)<\/description>/);
      const dateMatch = itemText.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1],
          link: linkMatch[1],
          description: descMatch?.[1] || '',
          pubDate: dateMatch?.[1] || ''
        });
      }
    });

    return items;
  }

  /**
   * Calculate content scores using existing formulas
   */
  static calculateContentScores(content: string): {
    gfmCompliance: number;
    commonmarkCompliance: number;
    optimizationScore: number;
    reactComponents: number;
    complexityScore: number;
  } {
    // Use existing GFM compliance formula
    const gfmCompliance = MCPWikiGenerator.calculateGFMCompliance(content);
    
    // Use existing CommonMark compliance formula
    const commonmarkCompliance = MCPWikiGenerator.calculateCommonMarkCompliance(content);
    
    // Calculate optimization score (based on wiki output metrics)
    const optimizationScore = MCPWikiGenerator.calculateOptimizationScore(content);
    
    // Estimate React components (existing formula)
    const reactComponents = MCPWikiGenerator.estimateReactComponents(content);
    
    // Calculate complexity score
    const complexityScore = MCPWikiGenerator.calculateComplexityScore(content);
    
    return {
      gfmCompliance,
      commonmarkCompliance,
      optimizationScore,
      reactComponents,
      complexityScore
    };
  }

  /**
   * GFM Compliance Formula (from senior-hooks.ts)
   */
  private static calculateGFMCompliance(md: string): number {
    let score = 60; // Base CommonMark compliance
    
    // GFM features (5 points each)
    if (md.includes('|')) score += 5; // Tables
    if (md.includes('- [')) score += 5; // Task lists
    if (md.includes('~~')) score += 5; // Strikethrough
    if (md.match(/\b[A-Z][a-z]+[A-Z][a-z]+\b/)) score += 5; // Autolinks
    if (md.match(/\.md\b/)) score += 5; // Wiki links
    
    return Math.min(score, 100);
  }

  /**
   * CommonMark Compliance Formula (from senior-hooks.ts)
   */
  private static calculateCommonMarkCompliance(md: string): number {
    let score = 50; // Base score
    
    // CommonMark features (10 points each)
    if (md.match(/^#{1,6}\s/m)) score += 10; // Headings
    if (md.match(/\*\*.*?\*\*/)) score += 10; // Strong emphasis
    if (md.match(/\*.*?\*/)) score += 10; // Emphasis
    if (md.match(/^>\s/m)) score += 10; // Blockquotes
    if (md.match(/\[.*\]\(.*\)/)) score += 10; // Links
    
    return Math.min(score, 100);
  }

  /**
   * Optimization Score Formula (based on wiki output metrics)
   */
  private static calculateOptimizationScore(content: string): number {
    let score = 40; // Base score
    
    // Content structure optimization
    const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
    if (headingCount >= 3 && headingCount <= 8) score += 15; // Optimal heading count
    else if (headingCount > 0) score += 5; // Some headings
    
    // Code block optimization
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    if (codeBlocks > 0) score += 10;
    
    // List optimization
    const lists = (content.match(/^[-*+]\s/gm) || []).length;
    if (lists > 0) score += 10;
    
    // Link density
    const links = (content.match(/\[.*\]\(.*\)/g) || []).length;
    const linkDensity = links / Math.max(content.split(/\s+/).length, 1) * 100;
    if (linkDensity > 0 && linkDensity <= 10) score += 15;
    else if (linkDensity > 0) score += 5;
    
    // Table presence
    if (content.includes('|')) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * React Components Estimation (from senior-hooks.ts)
   */
  private static estimateReactComponents(md: string): number {
    let components = 0;
    
    // Each heading = component
    components += (md.match(/^#{1,6}\s/gm) || []).length;
    
    // Each table = component
    components += (md.match(/\|.*\|/g) || []).length;
    
    // Each code block = component
    components += (md.match(/```/g) || []).length / 2;
    
    // Each list = component
    components += (md.match(/^[-*+]\s/gm) || []).length;
    
    return Math.ceil(components);
  }

  /**
   * Content Complexity Score
   */
  private static calculateComplexityScore(content: string): number {
    let complexity = 0;
    
    // Base complexity from content length
    const wordCount = content.split(/\s+/).length;
    complexity += Math.min(wordCount / 100, 30); // Max 30 points for length
    
    // Structural complexity
    const headingLevels = new Set();
    const headingMatches = content.match(/^#{1,6}\s/gm) || [];
    headingMatches.forEach(heading => {
      headingLevels.add(heading.length);
    });
    complexity += headingLevels.size * 5; // 5 points per heading level
    
    // Code complexity
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    complexity += codeBlocks * 10; // 10 points per code block
    
    // Table complexity
    const tableRows = (content.match(/\|.*\|/g) || []).length;
    complexity += tableRows * 2; // 2 points per table row
    
    // Link complexity
    const links = (content.match(/\[.*\]\(.*\)/g) || []).length;
    complexity += links * 3; // 3 points per link
    
    return Math.min(Math.round(complexity), 100);
  }

  /**
   * Enhanced cross-reference scoring with content metrics
   */
  static async scoreCrossReferencesWithContent(templateName: string, generatedContent?: string): Promise<{
    rssFeedItems: Array<{
      title: string;
      link: string;
      pubDate: string;
      relevanceScore: number;
      benchmarkMatches: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        rssValue?: string;
        codeValue?: string;
      }>;
      contentScores?: {
        gfmCompliance?: number;
        commonmarkCompliance?: number;
        optimizationScore?: number;
        reactComponents?: number;
        complexityScore?: number;
      };
    }>;
    gitCommits: Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
      relevanceScore: number;
      benchmarkMatches: Array<{
        type: 'performance' | 'feature' | 'security';
        score: number;
        description: string;
        commitValue?: string;
        codeValue?: string;
      }>;
      contentScores?: {
        gfmCompliance?: number;
        commonmarkCompliance?: number;
        optimizationScore?: number;
        reactComponents?: number;
        complexityScore?: number;
      };
    }>;
    relatedTemplates: Array<{
      templateName: string;
      similarityScore: number;
      sharedFeatures: string[];
      sharedTags: string[];
      contentScores?: {
        gfmCompliance?: number;
        commonmarkCompliance?: number;
        optimizationScore?: number;
        reactComponents?: number;
        complexityScore?: number;
      };
    }>;
    overallScore: {
      relevanceScore: number;
      contentQualityScore: number;
      performanceScore: number;
      combinedScore: number;
    };
  }> {
    const template = MCPWikiGenerator.getTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Get base cross-references
    const baseCrossRefs = await MCPWikiGenerator.scoreCrossReferences(templateName);
    
    // Calculate content scores if content provided with proper validation
    const contentScores = generatedContent && generatedContent.trim().length > 0 
      ? MCPWikiGenerator.calculateContentScores(generatedContent) 
      : null;

    // Enhance RSS items with content scores
    const enhancedRSSItems = baseCrossRefs.rssFeedItems.map(item => ({
      ...item,
      contentScores: contentScores
    }));

    // Enhance git commits with content scores
    const enhancedGitCommits = baseCrossRefs.gitCommits.map(commit => ({
      ...commit,
      contentScores: contentScores
    }));

    // Enhance related templates with content scores
    const enhancedRelatedTemplates = baseCrossRefs.relatedTemplates.map(tmpl => ({
      ...tmpl,
      contentScores: contentScores
    }));

    // Calculate overall scores
    const avgRelevanceScore = (
      enhancedRSSItems.reduce((sum, item) => sum + item.relevanceScore, 0) / Math.max(enhancedRSSItems.length, 1) +
      enhancedGitCommits.reduce((sum, commit) => sum + commit.relevanceScore, 0) / Math.max(enhancedGitCommits.length, 1)
    ) / 2;

    const contentQualityScore = contentScores ? 
      (contentScores.gfmCompliance + contentScores.commonmarkCompliance + contentScores.optimizationScore) / 3 : 0;

    const performanceScore = template.performanceMetrics?.successRate || 0;

    const combinedScore = (avgRelevanceScore * 0.4) + (contentQualityScore * 0.4) + (performanceScore * 0.2);

    return {
      rssFeedItems: enhancedRSSItems,
      gitCommits: enhancedGitCommits,
      relatedTemplates: enhancedRelatedTemplates,
      overallScore: {
        relevanceScore: avgRelevanceScore,
        contentQualityScore,
        performanceScore,
        combinedScore
      }
    };
  }

  /**
   * Generate wiki content with MCP integration
   */
  static async generateWiki(request: WikiGenerationRequest): Promise<WikiGenerationResult> {
    const startTime = Date.now();
    let templateName = 'Direct Generation';
    
    try {
      // Authenticate request if token provided
      if (request.authToken) {
        const auth = await masterTokenManager.validateToken(request.authToken);
        if (!auth.valid) {
          MCPWikiGenerator.trackTemplateUsage(templateName, Date.now() - startTime, false);
          return {
            success: false,
            files: {},
            metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
            error: 'Authentication failed',
          };
        }
      }

      console.log(styled('🌐 Generating MCP Wiki Content...', 'primary'));

      // Resolve provider metadata if provider is specified
      let resolvedBaseUrl = request.baseUrl;
      let providerMetadata = null;
      
      if (request.provider) {
        providerMetadata = MCPWikiGenerator.getProviderMetadata(request.provider);
        resolvedBaseUrl = request.baseUrl || MCPWikiGenerator.resolveProviderUrl(request.provider);
        
        // Validate format compatibility with provider
        if (!providerMetadata.supportedFormats.includes(request.format as WikiFormat)) {
          console.warn(styled(
            `⚠️ Format '${request.format}' may not be fully supported by provider '${request.provider}'. ` +
            `Supported formats: ${providerMetadata.supportedFormats.join(', ')}`,
            'warning'
          ));
        }

        // Log provider information
        console.log(styled(`📋 Using provider: ${providerMetadata.name}`, 'info'));
        console.log(styled(`🔗 Provider URL: ${resolvedBaseUrl}`, 'info'));
        
        if (providerMetadata.requiresAuth) {
          console.log(styled(`🔐 Provider '${request.provider}' requires authentication`, 'warning'));
        }
      }

      // Generate wiki using existing generator
      const wikiConfig = {
        baseUrl: resolvedBaseUrl || 'https://wiki.company.com',
        workspace: request.workspace || 'bun-utilities',
        format: request.format as 'markdown' | 'html' | 'json',
        includeExamples: request.includeExamples ?? true,
        includeValidation: request.includeValidation ?? true,
      };

      const wikiResult = WikiURLGenerator.generateWikiURLs(wikiConfig);

      // Generate content for each format
      const files: WikiGenerationResult['files'] = {};

      if (request.format === 'all' || request.format === 'markdown') {
        files.markdown = WikiURLGenerator.generateMarkdownWiki(wikiConfig);
      }

      if (request.format === 'all' || request.format === 'html') {
        files.html = WikiURLGenerator.generateHTMLWiki(wikiConfig);
      }

      if (request.format === 'all' || request.format === 'json') {
        files.json = WikiURLGenerator.generateJSONWiki(wikiConfig);
      }

      const generationTime = Date.now() - startTime;

      const result: WikiGenerationResult = {
        success: true,
        files,
        metadata: {
          total: wikiResult.total,
          categories: wikiResult.categories,
          generated: new Date().toISOString(),
          baseUrl: wikiConfig.baseUrl,
          workspace: wikiConfig.workspace,
        },
      };

      // Add provider metadata to result if available
      if (providerMetadata) {
        result.provider = {
          name: providerMetadata.name,
          description: providerMetadata.description,
          features: providerMetadata.features,
          requiresAuth: providerMetadata.requiresAuth,
        };
      }

      // Store in R2 if available
      try {
        const r2Key = `${MCPWikiGenerator.WIKI_R2_PREFIX}wiki-${Date.now()}-${wikiConfig.workspace}`;
        const r2Stored = await r2MCPIntegration.storeDiagnosis({
          id: r2Key,
          timestamp: new Date().toISOString(),
          error: {
            name: 'WikiGeneration',
            message: `Generated ${request.format} wiki for ${wikiConfig.workspace}`,
          },
          fix: JSON.stringify(result, null, 2),
          relatedAudits: [],
          relatedDocs: [],
          confidence: 1.0,
          context: request.context || 'wiki-generation',
          metadata: {
            wikiGeneration: true,
            format: request.format,
            workspace: wikiConfig.workspace,
            totalUtilities: wikiResult.total,
            provider: request.provider,
            providerName: providerMetadata?.name,
            generationTime,
          },
        });

        result.r2Stored = {
          key: r2Key,
          url: await r2MCPIntegration.getSignedURL(r2Key, 3600),
        };

        console.log(styled('📦 Wiki content stored in R2', 'success'));
      } catch (r2Error) {
        console.log(styled('⚠️ R2 storage not available, using local only', 'warning'));
      }

      // Track successful generation
      MCPWikiGenerator.trackTemplateUsage(templateName, generationTime, true);

      console.log(
        styled(
          `✅ Wiki generated: ${wikiResult.total} utilities in ${wikiResult.categories} categories (${generationTime}ms)`,
          'success'
        )
      );
      return result;
    } catch (error) {
      const generationTime = Date.now() - startTime;
      MCPWikiGenerator.trackTemplateUsage(templateName, generationTime, false);
      
      console.error(styled(`❌ Wiki generation failed: ${error.message}`, 'error'));
      return {
        success: false,
        files: {},
        metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
        error: error.message,
      };
    }
  }

  /**
   * Register a custom wiki template for internal tools
   */
  static registerCustomTemplate(template: WikiTemplate): void {
    // Validate template structure
    if (!template.name || !template.baseUrl || !template.format) {
      throw new Error('Template must have name, baseUrl, and format');
    }
    
    // Validate format is one of the allowed types
    const validFormats: WikiFormat[] = ['markdown', 'html', 'json', 'all'];
    if (!validFormats.includes(template.format)) {
      throw new Error(`Invalid format '${template.format}'. Must be one of: ${validFormats.join(', ')}`);
    }
    
    // Check for duplicates
    const existingIndex = MCPWikiGenerator.customTemplates.findIndex(t => t.name === template.name);
    if (existingIndex >= 0) {
      MCPWikiGenerator.customTemplates[existingIndex] = template;
      console.log(styled(`📝 Updated custom template: ${template.name}`, 'info'));
    } else {
      MCPWikiGenerator.customTemplates.push(template);
      console.log(styled(`📝 Registered custom template: ${template.name}`, 'success'));
    }
  }

  /**
   * Resolve provider base URL from DocumentationProvider enum
   */
  private static resolveProviderUrl(provider: DocumentationProvider): string {
    const providerUrls: Record<DocumentationProvider, string> = {
      // Official Bun sources
      [DocumentationProvider.BUN_OFFICIAL]: 'https://bun.sh/docs',
      [DocumentationProvider.BUN_TYPES]: 'https://bun.sh/docs/api/types',
      [DocumentationProvider.BUN_GITHUB]: 'https://github.com/oven-sh/bun',
      [DocumentationProvider.BUN_NPM]: 'https://www.npmjs.com/package/bun',

      // Official partner sources
      [DocumentationProvider.VERCEL]: 'https://vercel.com/docs',
      [DocumentationProvider.NETLIFY]: 'https://docs.netlify.com',
      [DocumentationProvider.CLOUDFLARE]: 'https://developers.cloudflare.com',
      [DocumentationProvider.RAILWAY]: 'https://docs.railway.app',
      [DocumentationProvider.FLY_IO]: 'https://fly.io/docs',

      // Community sources
      [DocumentationProvider.DEV_TO]: 'https://dev.to',
      [DocumentationProvider.MEDIUM]: 'https://medium.com',
      [DocumentationProvider.HASHNODE]: 'https://hashnode.com',
      [DocumentationProvider.REDDIT]: 'https://reddit.com',
      [DocumentationProvider.DISCORD]: 'https://discord.com',
      [DocumentationProvider.STACK_OVERFLOW]: 'https://stackoverflow.com',

      // Package ecosystems
      [DocumentationProvider.NPM]: 'https://docs.npmjs.com',
      [DocumentationProvider.DENO_LAND]: 'https://deno.land',
      [DocumentationProvider.JSR_IO]: 'https://jsr.io',

      // External references
      [DocumentationProvider.MDN_WEB_DOCS]: 'https://developer.mozilla.org',
      [DocumentationProvider.NODE_JS]: 'https://nodejs.org/docs',
      [DocumentationProvider.WEB_STANDARDS]: 'https://web.dev',
      [DocumentationProvider.GITHUB_ENTERPRISE]: 'https://docs.github.com',
      [DocumentationProvider.INTERNAL_WIKI]: 'https://wiki.factorywager.com',

      // Specialized
      [DocumentationProvider.PERFORMANCE_GUIDES]: 'https://web.dev/performance',
      [DocumentationProvider.SECURITY_DOCS]: 'https://owasp.org',
      [DocumentationProvider.API_REFERENCE]: 'https://api-reference.com',
      [DocumentationProvider.COMMUNITY_BLOG]: 'https://community-blog.com',
      [DocumentationProvider.RSS_FEEDS]: 'https://rss-feeds.com',
      [DocumentationProvider.INTERNAL_PORTAL]: 'https://docs.company.com',
      [DocumentationProvider.DOCUMENTATION_HUB]: 'https://docs-hub.com',
      [DocumentationProvider.TECHNICAL_DOCS]: 'https://technical-docs.com',
      [DocumentationProvider.KNOWLEDGE_BASE]: 'https://knowledge-base.com',
      [DocumentationProvider.DEVELOPER_PORTAL]: 'https://developer-portal.com',
      [DocumentationProvider.HELP_CENTER]: 'https://help-center.com',
      [DocumentationProvider.SUPPORT_DOCS]: 'https://support-docs.com',
      [DocumentationProvider.TRAINING_MATERIALS]: 'https://training-materials.com',
      [DocumentationProvider.ONBOARDING_GUIDES]: 'https://onboarding-guides.com',
      [DocumentationProvider.BEST_PRACTICES]: 'https://best-practices.com',
      [DocumentationProvider.TROUBLESHOOTING]: 'https://troubleshooting.com',
      [DocumentationProvider.FAQ]: 'https://faq.com',
      [DocumentationProvider.TUTORIALS]: 'https://tutorials.com',
      [DocumentationProvider.EXAMPLES]: 'https://examples.com',
      [DocumentationProvider.TEMPLATES]: 'https://templates.com',
      [DocumentationProvider.COOKBOOK]: 'https://cookbook.com',
      [DocumentationProvider.GUIDES]: 'https://guides.com',
      [DocumentationProvider.REFERENCE]: 'https://reference.com',
      [DocumentationProvider.DOCUMENTATION]: 'https://documentation.com',
    };

    return providerUrls[provider] || 'https://docs.example.com';
  }

  /**
   * Get provider metadata and capabilities
   */
  private static getProviderMetadata(provider: DocumentationProvider): {
    name: string;
    description: string;
    supportedFormats: WikiFormat[];
    requiresAuth: boolean;
    features: string[];
  } {
    const providerMetadata: Record<DocumentationProvider, {
      name: string;
      description: string;
      supportedFormats: WikiFormat[];
      requiresAuth: boolean;
      features: string[];
    }> = {
      [DocumentationProvider.BUN_OFFICIAL]: {
        name: 'Bun Official Documentation',
        description: 'Official Bun runtime documentation and API reference',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['API Reference', 'Examples', 'Performance Tips', 'Security Notes'],
      },
      [DocumentationProvider.VERCEL]: {
        name: 'Vercel Platform Documentation',
        description: 'Vercel deployment platform and edge functions documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Deployment Guides', 'Edge Functions', 'Configuration'],
      },
      [DocumentationProvider.GITHUB_ENTERPRISE]: {
        name: 'GitHub Enterprise Wiki',
        description: 'GitHub Wiki and repository documentation',
        supportedFormats: ['markdown'],
        requiresAuth: true,
        features: ['Wiki Pages', 'Repository Integration', 'Collaboration'],
      },
      [DocumentationProvider.INTERNAL_WIKI]: {
        name: 'Internal Wiki System',
        description: 'Enterprise internal knowledge base and documentation',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: true,
        features: ['Internal Knowledge', 'Team Collaboration', 'Security Controls'],
      },
      [DocumentationProvider.API_REFERENCE]: {
        name: 'API Reference Documentation',
        description: 'Technical API documentation and schema reference',
        supportedFormats: ['json', 'html'],
        requiresAuth: false,
        features: ['API Schemas', 'Endpoint Documentation', 'Code Examples'],
      },
      // Default metadata for other providers
      [DocumentationProvider.BUN_TYPES]: {
        name: 'Bun Type Definitions',
        description: 'Bun TypeScript type definitions and interfaces',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['Type Definitions', 'Interface Documentation'],
      },
      [DocumentationProvider.BUN_GITHUB]: {
        name: 'Bun GitHub Repository',
        description: 'Bun source code and development documentation',
        supportedFormats: ['markdown'],
        requiresAuth: false,
        features: ['Source Code', 'Development Guides', 'Contributing'],
      },
      [DocumentationProvider.BUN_NPM]: {
        name: 'Bun NPM Package',
        description: 'Bun package documentation on NPM registry',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['Package Info', 'Installation Guide', 'Usage Examples'],
      },
      // Add default metadata for remaining providers
      [DocumentationProvider.NETLIFY]: {
        name: 'Netlify Documentation',
        description: 'Netlify platform documentation and guides',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Deployment', 'Functions', 'Configuration'],
      },
      [DocumentationProvider.CLOUDFLARE]: {
        name: 'Cloudflare Developers',
        description: 'Cloudflare developer documentation and API reference',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['API Reference', 'Security', 'Performance'],
      },
      [DocumentationProvider.RAILWAY]: {
        name: 'Railway Documentation',
        description: 'Railway deployment platform documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Deployment', 'Databases', 'Environment'],
      },
      [DocumentationProvider.FLY_IO]: {
        name: 'Fly.io Documentation',
        description: 'Fly.io platform documentation and guides',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Deployment', 'Apps', 'Networking'],
      },
      [DocumentationProvider.DEV_TO]: {
        name: 'DEV.to Community',
        description: 'Developer community blog and tutorials',
        supportedFormats: ['markdown'],
        requiresAuth: false,
        features: ['Community Articles', 'Tutorials', 'Discussions'],
      },
      [DocumentationProvider.MEDIUM]: {
        name: 'Medium Publications',
        description: 'Medium technical publications and articles',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Articles', 'Publications', 'Topics'],
      },
      [DocumentationProvider.HASHNODE]: {
        name: 'Hashnode Platform',
        description: 'Hashnode developer blog platform',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Blogging', 'Publications', 'Community'],
      },
      [DocumentationProvider.REDDIT]: {
        name: 'Reddit Communities',
        description: 'Reddit developer communities and discussions',
        supportedFormats: ['markdown'],
        requiresAuth: false,
        features: ['Community Discussions', 'Q&A', 'Resources'],
      },
      [DocumentationProvider.DISCORD]: {
        name: 'Discord Communities',
        description: 'Discord developer communities and chat',
        supportedFormats: ['markdown'],
        requiresAuth: true,
        features: ['Real-time Chat', 'Community Support', 'Voice Channels'],
      },
      [DocumentationProvider.STACK_OVERFLOW]: {
        name: 'Stack Overflow',
        description: 'Stack Overflow Q&A and developer discussions',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Q&A', 'Code Examples', 'Community Solutions'],
      },
      [DocumentationProvider.NPM]: {
        name: 'NPM Documentation',
        description: 'NPM package registry and documentation',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['Package Registry', 'Documentation', 'Usage Stats'],
      },
      [DocumentationProvider.DENO_LAND]: {
        name: 'Deno Documentation',
        description: 'Deno runtime documentation and API reference',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['API Reference', 'Examples', 'Security'],
      },
      [DocumentationProvider.JSR_IO]: {
        name: 'JSR Registry',
        description: 'JavaScript Registry documentation and packages',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['Package Registry', 'Type Safety', 'Documentation'],
      },
      [DocumentationProvider.MDN_WEB_DOCS]: {
        name: 'MDN Web Docs',
        description: 'Mozilla Developer Network web documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Web Standards', 'API Reference', 'Tutorials'],
      },
      [DocumentationProvider.NODE_JS]: {
        name: 'Node.js Documentation',
        description: 'Node.js runtime documentation and API reference',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['API Reference', 'Examples', 'Best Practices'],
      },
      [DocumentationProvider.WEB_STANDARDS]: {
        name: 'Web Standards Documentation',
        description: 'Web standards and specification documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Specifications', 'Standards', 'Compliance'],
      },
      [DocumentationProvider.PERFORMANCE_GUIDES]: {
        name: 'Performance Guides',
        description: 'Web performance optimization guides and best practices',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Performance Tips', 'Optimization', 'Metrics'],
      },
      [DocumentationProvider.SECURITY_DOCS]: {
        name: 'Security Documentation',
        description: 'Security best practices and vulnerability documentation',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Security Guidelines', 'Vulnerability Info', 'Best Practices'],
      },
      [DocumentationProvider.COMMUNITY_BLOG]: {
        name: 'Community Blog',
        description: 'Community-driven blog and tutorial platform',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Community Articles', 'Tutorials', 'Discussions'],
      },
      [DocumentationProvider.RSS_FEEDS]: {
        name: 'RSS Feed Documentation',
        description: 'RSS feed documentation and syndication guides',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['RSS Feeds', 'Syndication', 'Content Distribution'],
      },
      [DocumentationProvider.INTERNAL_PORTAL]: {
        name: 'Internal Documentation Portal',
        description: 'Internal company documentation portal',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: true,
        features: ['Internal Docs', 'Company Policies', 'Procedures'],
      },
      [DocumentationProvider.DOCUMENTATION_HUB]: {
        name: 'Documentation Hub',
        description: 'Centralized documentation hub and knowledge base',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Central Hub', 'Knowledge Base', 'Search'],
      },
      [DocumentationProvider.TECHNICAL_DOCS]: {
        name: 'Technical Documentation',
        description: 'Technical documentation and engineering guides',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Technical Guides', 'Engineering Docs', 'Specifications'],
      },
      [DocumentationProvider.KNOWLEDGE_BASE]: {
        name: 'Knowledge Base',
        description: 'Knowledge base and FAQ documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['FAQ', 'Knowledge Base', 'Search'],
      },
      [DocumentationProvider.DEVELOPER_PORTAL]: {
        name: 'Developer Portal',
        description: 'Developer portal and API documentation',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Developer Resources', 'API Docs', 'SDKs'],
      },
      [DocumentationProvider.HELP_CENTER]: {
        name: 'Help Center',
        description: 'Help center and support documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Help Articles', 'Support', 'Troubleshooting'],
      },
      [DocumentationProvider.SUPPORT_DOCS]: {
        name: 'Support Documentation',
        description: 'Support documentation and troubleshooting guides',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Support Guides', 'Troubleshooting', 'FAQ'],
      },
      [DocumentationProvider.TRAINING_MATERIALS]: {
        name: 'Training Materials',
        description: 'Training materials and educational resources',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Training Guides', 'Educational Resources', 'Tutorials'],
      },
      [DocumentationProvider.ONBOARDING_GUIDES]: {
        name: 'Onboarding Guides',
        description: 'Onboarding guides and getting started resources',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Getting Started', 'Onboarding', 'Setup Guides'],
      },
      [DocumentationProvider.BEST_PRACTICES]: {
        name: 'Best Practices',
        description: 'Best practices and coding standards documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Best Practices', 'Standards', 'Guidelines'],
      },
      [DocumentationProvider.TROUBLESHOOTING]: {
        name: 'Troubleshooting Guides',
        description: 'Troubleshooting guides and problem resolution documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Troubleshooting', 'Problem Solving', 'Solutions'],
      },
      [DocumentationProvider.FAQ]: {
        name: 'FAQ Documentation',
        description: 'Frequently asked questions and answers',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['FAQ', 'Common Questions', 'Answers'],
      },
      [DocumentationProvider.TUTORIALS]: {
        name: 'Tutorial Documentation',
        description: 'Step-by-step tutorials and learning resources',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Tutorials', 'Step-by-Step Guides', 'Learning Resources'],
      },
      [DocumentationProvider.EXAMPLES]: {
        name: 'Code Examples',
        description: 'Code examples and implementation samples',
        supportedFormats: ['markdown', 'json'],
        requiresAuth: false,
        features: ['Code Examples', 'Samples', 'Implementations'],
      },
      [DocumentationProvider.TEMPLATES]: {
        name: 'Template Documentation',
        description: 'Template documentation and starter templates',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Templates', 'Starters', 'Boilerplates'],
      },
      [DocumentationProvider.COOKBOOK]: {
        name: 'Cookbook Documentation',
        description: 'Cookbook recipes and implementation patterns',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Recipes', 'Patterns', 'Implementations'],
      },
      [DocumentationProvider.GUIDES]: {
        name: 'Guide Documentation',
        description: 'Comprehensive guides and walkthrough documentation',
        supportedFormats: ['markdown', 'html'],
        requiresAuth: false,
        features: ['Guides', 'Walkthroughs', 'Tutorials'],
      },
      [DocumentationProvider.REFERENCE]: {
        name: 'Reference Documentation',
        description: 'Reference documentation and API specifications',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Reference', 'Specifications', 'API Docs'],
      },
      [DocumentationProvider.DOCUMENTATION]: {
        name: 'General Documentation',
        description: 'General documentation and knowledge resources',
        supportedFormats: ['markdown', 'html', 'json'],
        requiresAuth: false,
        features: ['Documentation', 'Knowledge Resources', 'Information'],
      },
    };

    return providerMetadata[provider] || {
      name: provider,
      description: `Documentation for ${provider}`,
      supportedFormats: ['markdown', 'html', 'json'],
      requiresAuth: false,
      features: ['Basic Documentation'],
    };
  }
  /**
   * Get all available wiki templates (built-in + custom)
   */
  static getWikiTemplates(): WikiTemplate[] {
    const builtInTemplates = [
      {
        name: 'Confluence Integration',
        description: 'Markdown format optimized for Confluence import',
        provider: DocumentationProvider.INTERNAL_WIKI,
        baseUrl: 'https://yourcompany.atlassian.net/wiki',
        workspace: 'engineering/bun-utilities',
        format: 'markdown' as WikiFormat,
        includeExamples: true,
        customSections: ['## Integration Notes', '## API Examples'],
        tags: ['confluence', 'collaboration', 'enterprise'],
        category: 'documentation' as const,
        priority: 'high' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['atlassian-api'],
        validationRules: {
          requiredSections: ['## Overview', '## Installation'],
          maxSections: 20,
          forbiddenPatterns: ['<script>', 'javascript:']
        },
        metadata: {
          confluenceSpace: 'ENG',
          pageTemplate: 'technical-documentation'
        }
      },
      {
        name: 'Notion API',
        description: 'JSON format for Notion database integration',
        provider: DocumentationProvider.INTERNAL_WIKI,
        baseUrl: 'https://notion.so/your-team',
        workspace: 'api/bun-utilities',
        format: 'json' as WikiFormat,
        includeExamples: true,
        customSections: ['## API Endpoints', '## Database Schema'],
        tags: ['notion', 'database', 'api'],
        category: 'api' as const,
        priority: 'medium' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['notion-sdk'],
        validationRules: {
          requiredSections: ['## Database Schema'],
          maxSections: 15,
        },
        metadata: {
          notionDatabaseId: 'template-db-id',
          integrationType: 'api'
        }
      },
      {
        name: 'GitHub Wiki',
        description: 'Markdown format for GitHub repository wikis',
        provider: DocumentationProvider.GITHUB_ENTERPRISE,
        baseUrl: 'https://github.com/your-org/bun-utilities/wiki',
        workspace: 'docs/bun-utilities',
        format: 'markdown' as WikiFormat,
        includeExamples: true,
        customSections: ['## Contributing', '## Troubleshooting'],
        tags: ['github', 'wiki', 'open-source'],
        category: 'documentation' as const,
        priority: 'high' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['github-api'],
        validationRules: {
          requiredSections: ['## Installation', '## Usage'],
          maxSections: 25,
        },
        metadata: {
          repository: 'your-org/bun-utilities',
          wikiType: 'github'
        }
      },
      {
        name: 'Bun Official Docs',
        description: 'Comprehensive documentation following Bun docs style',
        provider: DocumentationProvider.BUN_OFFICIAL,
        baseUrl: 'https://bun.sh/docs',
        workspace: 'bun-utilities',
        format: 'markdown' as WikiFormat,
        includeExamples: true,
        customSections: ['## Installation', '## API Reference', '## Examples'],
        tags: ['bun', 'official', 'runtime'],
        category: 'reference' as const,
        priority: 'critical' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['bun-runtime'],
        validationRules: {
          requiredSections: ['## Installation', '## API Reference'],
          maxSections: 30,
          forbiddenPatterns: ['node.js', 'npm install']
        },
        metadata: {
          docStyle: 'bun-official',
          targetAudience: 'developers'
        }
      },
      {
        name: 'Vercel Documentation',
        description: 'HTML format optimized for Vercel deployment guides',
        provider: DocumentationProvider.VERCEL,
        baseUrl: 'https://vercel.com/docs',
        workspace: 'deployment/bun-utilities',
        format: 'html' as WikiFormat,
        includeExamples: true,
        customSections: ['## Deployment', '## Environment Variables', '## Edge Functions'],
        tags: ['vercel', 'deployment', 'serverless'],
        category: 'guide' as const,
        priority: 'high' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['vercel-cli'],
        validationRules: {
          requiredSections: ['## Deployment'],
          maxSections: 20,
        },
        metadata: {
          deploymentPlatform: 'vercel',
          framework: 'bun'
        }
      },
      {
        name: 'API Reference',
        description: 'JSON format for API documentation and OpenAPI specs',
        provider: DocumentationProvider.API_REFERENCE,
        baseUrl: 'https://api.docs.company.com',
        workspace: 'api/bun-utilities',
        format: 'json' as WikiFormat,
        includeExamples: true,
        customSections: ['## Endpoints', '## Schemas', '## Authentication'],
        tags: ['api', 'openapi', 'reference'],
        category: 'api' as const,
        priority: 'critical' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['openapi-spec'],
        validationRules: {
          requiredSections: ['## Endpoints', '## Authentication'],
          maxSections: 50,
        },
        metadata: {
          specVersion: '3.0.0',
          apiVersion: 'v1'
        }
      },
      {
        name: 'Tutorial Guide',
        description: 'Step-by-step tutorial format with code examples',
        provider: DocumentationProvider.INTERNAL_WIKI,
        baseUrl: 'https://learn.company.com',
        workspace: 'tutorials/bun-utilities',
        format: 'markdown' as WikiFormat,
        includeExamples: true,
        customSections: ['## Prerequisites', '## Step-by-Step', '## Next Steps'],
        tags: ['tutorial', 'learning', 'guide'],
        category: 'tutorial' as const,
        priority: 'medium' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: [],
        validationRules: {
          requiredSections: ['## Prerequisites', '## Step-by-Step'],
          maxSections: 15,
        },
        metadata: {
          difficulty: 'beginner',
          estimatedTime: '30 minutes'
        }
      },
      {
        name: 'Quick Reference',
        description: 'Concise reference sheet for common operations',
        provider: DocumentationProvider.INTERNAL_WIKI,
        baseUrl: 'https://ref.company.com',
        workspace: 'reference/bun-utilities',
        format: 'markdown' as WikiFormat,
        includeExamples: true,
        customSections: ['## Common Commands', '## Quick Examples', '## Tips'],
        tags: ['reference', 'quick-start', 'cheatsheet'],
        category: 'reference' as const,
        priority: 'medium' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: [],
        validationRules: {
          requiredSections: ['## Common Commands'],
          maxSections: 10,
        },
        metadata: {
          type: 'cheatsheet',
          audience: 'experienced-developers'
        }
      },
      {
        name: 'Internal Portal',
        description: 'HTML format for internal documentation portal',
        provider: DocumentationProvider.INTERNAL_PORTAL,
        baseUrl: 'https://docs.yourcompany.com',
        workspace: 'bun',
        format: 'html' as WikiFormat,
        includeExamples: true,
        customSections: ['## Related Documentation', '## Support'],
        tags: ['internal', 'portal', 'enterprise'],
        category: 'documentation' as const,
        priority: 'medium' as const,
        version: '1.0.0',
        author: 'System',
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
        dependencies: ['internal-auth'],
        validationRules: {
          requiredSections: ['## Overview'],
          maxSections: 25,
        },
        metadata: {
          portalType: 'internal',
          accessLevel: 'employee'
        }
      },
    ];

    return [...builtInTemplates, ...MCPWikiGenerator.customTemplates];
  }

  /**
   * Get templates by provider
   */
  static getTemplatesByProvider(provider: DocumentationProvider): WikiTemplate[] {
    return MCPWikiGenerator.getWikiTemplates()
      .filter(template => template.provider === provider);
  }

  /**
   * Create template from provider with auto-resolved URL
   */
  static createProviderTemplate(
    provider: DocumentationProvider,
    workspace: string,
    format: WikiFormat,
    options?: Partial<WikiTemplate>
  ): WikiTemplate {
    const metadata = MCPWikiGenerator.getProviderMetadata(provider);
    const baseUrl = MCPWikiGenerator.resolveProviderUrl(provider);

    // Validate format compatibility with provider
    if (!metadata.supportedFormats.includes(format)) {
      throw new Error(
        `Format '${format}' not supported by provider '${provider}'. ` +
        `Supported formats: ${metadata.supportedFormats.join(', ')}`
      );
    }

    return {
      name: `${metadata.name} Template`,
      description: metadata.description,
      provider,
      baseUrl: options?.baseUrl || baseUrl,
      workspace,
      format,
      includeExamples: true,
      customSections: options?.customSections || metadata.features.map(f => `## ${f}`),
      providerConfig: options?.providerConfig || {},
      ...options
    };
  }

  /**
   * Create multiple templates for a provider
   */
  static createProviderTemplateSuite(
    provider: DocumentationProvider,
    workspace: string,
    formats?: WikiFormat[]
  ): WikiTemplate[] {
    const metadata = MCPWikiGenerator.getProviderMetadata(provider);
    const targetFormats = formats || metadata.supportedFormats;

    return targetFormats.map(format => 
      MCPWikiGenerator.createProviderTemplate(provider, workspace, format)
    );
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): DocumentationProvider[] {
    const templates = MCPWikiGenerator.getWikiTemplates();
    const uniqueProviders = new Set(templates.map(t => t.provider));
    return Array.from(uniqueProviders);
  }

  /**
   * Get provider statistics
   */
  static getProviderStatistics(): Record<DocumentationProvider, {
    templateCount: number;
    supportedFormats: WikiFormat[];
    requiresAuth: boolean;
  }> {
    const templates = MCPWikiGenerator.getWikiTemplates();
    const stats: Record<DocumentationProvider, {
      templateCount: number;
      supportedFormats: WikiFormat[];
      requiresAuth: boolean;
    }> = {} as any;

    templates.forEach(template => {
      if (!stats[template.provider]) {
        const metadata = MCPWikiGenerator.getProviderMetadata(template.provider);
        stats[template.provider] = {
          templateCount: 0,
          supportedFormats: metadata.supportedFormats,
          requiresAuth: metadata.requiresAuth
        };
      }
      stats[template.provider].templateCount++;
    });

    return stats;
  }

  /**
   * Validate template against provider requirements
   */
  static validateTemplateForProvider(template: WikiTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata = MCPWikiGenerator.getProviderMetadata(template.provider);

    // Validate required fields
    if (!template.name) errors.push('Template name is required');
    if (!template.workspace) errors.push('Workspace is required');
    if (!template.format) errors.push('Format is required');

    // Validate format compatibility
    if (template.format && !metadata.supportedFormats.includes(template.format)) {
      errors.push(
        `Format '${template.format}' not supported by provider '${template.provider}'. ` +
        `Supported formats: ${metadata.supportedFormats.join(', ')}`
      );
    }

    // Validate URL if provided
    if (template.baseUrl) {
      try {
        new URL(template.baseUrl);
      } catch {
        errors.push('Invalid baseUrl format');
      }
    }

    // Check authentication requirements
    if (metadata.requiresAuth && !template.providerConfig?.apiKey) {
      warnings.push(
        `Provider '${template.provider}' requires authentication but no API key provided`
      );
    }

    // Validate provider-specific configuration
    if (template.providerConfig) {
      const config = template.providerConfig;
      
      if (config.apiKey && typeof config.apiKey !== 'string') {
        errors.push('API key must be a string');
      }
      
      if (config.version && typeof config.version !== 'string') {
        errors.push('Version must be a string');
      }
      
      if (config.region && typeof config.region !== 'string') {
        errors.push('Region must be a string');
      }
    }

    // Provider-specific validations
    switch (template.provider) {
      case DocumentationProvider.GITHUB_ENTERPRISE:
        if (!template.baseUrl?.includes('github.com')) {
          warnings.push('GitHub Enterprise templates should use GitHub URLs');
        }
        break;
        
      case DocumentationProvider.VERCEL:
        if (!template.baseUrl?.includes('vercel.com')) {
          warnings.push('Vercel templates should use Vercel URLs');
        }
        break;
        
      case DocumentationProvider.INTERNAL_WIKI:
        if (!template.baseUrl) {
          errors.push('Internal Wiki templates require a baseUrl');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get provider-specific recommendations
   */
  static getProviderRecommendations(provider: DocumentationProvider): {
    formats: WikiFormat[];
    features: string[];
    bestPractices: string[];
    configuration: Record<string, any>;
  } {
    const metadata = MCPWikiGenerator.getProviderMetadata(provider);
    
    const recommendations: Record<DocumentationProvider, {
      formats: WikiFormat[];
      features: string[];
      bestPractices: string[];
      configuration: Record<string, any>;
    }> = {
      [DocumentationProvider.BUN_OFFICIAL]: {
        formats: ['markdown', 'html'],
        features: ['API Reference', 'Examples', 'Performance Tips'],
        bestPractices: [
          'Include code examples for all APIs',
          'Add performance benchmarks',
          'Use CommonMark-compliant markdown',
          'Include type definitions'
        ],
        configuration: {
          includeExamples: true,
          includeValidation: true,
          customSections: ['## Installation', '## Quick Start', '## API Reference']
        }
      },
      
      [DocumentationProvider.VERCEL]: {
        formats: ['markdown', 'html'],
        features: ['Deployment Guides', 'Edge Functions', 'Configuration'],
        bestPractices: [
          'Include deployment steps',
          'Add environment variable examples',
          'Include edge function patterns',
          'Add performance optimization tips'
        ],
        configuration: {
          includeExamples: true,
          customSections: ['## Deployment', '## Environment Setup', '## Edge Functions']
        }
      },
      
      [DocumentationProvider.GITHUB_ENTERPRISE]: {
        formats: ['markdown'],
        features: ['Wiki Pages', 'Repository Integration', 'Collaboration'],
        bestPractices: [
          'Use GitHub-flavored markdown',
          'Include repository links',
          'Add contribution guidelines',
          'Include issue templates'
        ],
        configuration: {
          includeExamples: true,
          customSections: ['## Contributing', '## Repository Setup', '## Issues']
        }
      },
      
      [DocumentationProvider.INTERNAL_WIKI]: {
        formats: ['markdown', 'html', 'json'],
        features: ['Internal Knowledge', 'Team Collaboration', 'Security Controls'],
        bestPractices: [
          'Include internal links',
          'Add security classifications',
          'Include team contact information',
          'Follow company documentation standards'
        ],
        configuration: {
          includeExamples: true,
          customSections: ['## Internal Links', '## Security', '## Team Contacts']
        }
      },
      
      [DocumentationProvider.API_REFERENCE]: {
        formats: ['json', 'html'],
        features: ['API Schemas', 'Endpoint Documentation', 'Code Examples'],
        bestPractices: [
          'Include OpenAPI specifications',
          'Add request/response examples',
          'Include error codes',
          'Add authentication details'
        ],
        configuration: {
          includeExamples: true,
          customSections: ['## API Endpoints', '## Authentication', '## Error Codes']
        }
      }
    };

    return recommendations[provider] || {
      formats: metadata.supportedFormats,
      features: metadata.features,
      bestPractices: [
        'Follow provider documentation guidelines',
        'Include relevant examples',
        'Ensure proper formatting'
      ],
      configuration: {
        includeExamples: true,
        customSections: metadata.features.map(f => `## ${f}`)
      }
    };
  }

  /**
   * Generate wiki from template name
   */
  static async generateFromTemplate(
    templateName: string,
    options?: {
      includeValidation?: boolean;
      context?: string;
      authToken?: string;
    }
  ): Promise<WikiGenerationResult> {
    const startTime = Date.now();
    
    try {
      const templates = MCPWikiGenerator.getWikiTemplates();
      const template = templates.find(t => t.name === templateName);
      
      if (!template) {
        MCPWikiGenerator.trackTemplateUsage(templateName, Date.now() - startTime, false);
        return {
          success: false,
          files: {},
          metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
          error: `Template '${templateName}' not found`,
        };
      }

      // Validate template
      const validation = MCPWikiGenerator.validateTemplateForProvider(template);
      if (!validation.isValid) {
        MCPWikiGenerator.trackTemplateUsage(templateName, Date.now() - startTime, false);
        return {
          success: false,
          files: {},
          metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
          error: `Template validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.warn(styled(`⚠️ ${warning}`, 'warning'));
        });
      }

      // Generate wiki using template configuration
      const result = await MCPWikiGenerator.generateWiki({
        format: template.format,
        baseUrl: template.baseUrl,
        workspace: template.workspace,
        includeExamples: template.includeExamples,
        includeValidation: options?.includeValidation,
        context: options?.context,
        authToken: options?.authToken,
        provider: template.provider,
      });

      // Track template-specific usage
      const generationTime = Date.now() - startTime;
      MCPWikiGenerator.trackTemplateUsage(templateName, generationTime, result.success);

      return result;
    } catch (error) {
      const generationTime = Date.now() - startTime;
      MCPWikiGenerator.trackTemplateUsage(templateName, generationTime, false);
      
      return {
        success: false,
        files: {},
        metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
        error: error.message,
      };
    }
  }

  /**
   * Load templates from configuration file
   */
  static async loadTemplatesFromFile(configPath: string): Promise<void> {
    try {
      // Validate input parameter
      if (!configPath || typeof configPath !== 'string') {
        throw new Error('Invalid configPath: must be a non-empty string');
      }

      const configFile = Bun.file(configPath);
      if (!await configFile.exists()) {
        console.warn(styled(`⚠️ Template config file not found: ${configPath}`, 'warning'));
        return;
      }

      const configText = await configFile.text();
      if (!configText.trim()) {
        console.warn(styled(`⚠️ Template config file is empty: ${configPath}`, 'warning'));
        return;
      }

      let config;
      try {
        config = JSON.parse(configText);
      } catch (parseError) {
        throw new Error(`Invalid JSON in config file: ${parseError.message}`);
      }

      if (!config || typeof config !== 'object') {
        throw new Error('Config file must contain a valid JSON object');
      }

      if (config.templates && Array.isArray(config.templates)) {
        for (const template of config.templates) {
          // Validate each template before registration
          if (!template || typeof template !== 'object') {
            console.warn(styled('⚠️ Skipping invalid template: not an object', 'warning'));
            continue;
          }

          try {
            MCPWikiGenerator.registerCustomTemplate(template);
          } catch (templateError) {
            console.warn(styled(`⚠️ Skipping invalid template: ${templateError.message}`, 'warning'));
          }
        }
      } else {
        console.warn(styled('⚠️ No templates array found in config file', 'warning'));
      }
    } catch (error) {
      console.error(styled(`❌ Failed to load templates from ${configPath}: ${error.message}`, 'error'));
    }
  }

  /**
   * Export current templates to configuration file
   */
  static async exportTemplatesToFile(configPath: string): Promise<void> {
    try {
      const config = {
        templates: MCPWikiGenerator.getWikiTemplates(),
        exported: new Date().toISOString(),
        version: '1.0.0'
      };

      await Bun.write(configPath, JSON.stringify(config, null, 2));
      console.log(styled(`📄 Templates exported to: ${configPath}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to export templates: ${error.message}`, 'error'));
    }
  }

  /**
   * Generate wiki from template
   */
  static async generateFromTemplate(
    templateName: string,
    customizations?: Partial<WikiGenerationRequest>
  ): Promise<WikiGenerationResult> {
    const templates = MCPWikiGenerator.getWikiTemplates();
    const template = templates.find(t => t.name === templateName);

    if (!template) {
      return {
        success: false,
        files: {},
        metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
        error: `Template '${templateName}' not found`,
      };
    }

    const request: WikiGenerationRequest = {
      format: template.format,
      baseUrl: template.baseUrl,
      workspace: template.workspace,
      includeExamples: template.includeExamples,
      includeValidation: true,
      context: `template-${templateName.toLowerCase().replace(/\s+/g, '-')}`,
      ...customizations,
    };

    return MCPWikiGenerator.generateWiki(request);
  }

  /**
   * Get wiki generation history from R2
   */
  static async getWikiHistory(limit: number = 10): Promise<
    Array<{
      id: string;
      timestamp: string;
      workspace: string;
      format: string;
      totalUtilities: number;
    }>
  > {
    try {
      // Search for wiki generation entries in R2
      const wikiEntries = await r2MCPIntegration.searchSimilarErrors(
        'WikiGeneration',
        'wiki-generation',
        limit
      );

      return wikiEntries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        workspace: entry.metadata?.workspace || 'unknown',
        format: entry.metadata?.format || 'unknown',
        totalUtilities: entry.metadata?.totalUtilities || 0,
      }));
    } catch (error) {
      console.log(styled('⚠️ Could not retrieve wiki history from R2', 'warning'));
      return [];
    }
  }

  /**
   * Generate wiki with FactoryWager enhancements
   */
  static async generateFactoryWagerWiki(
    context: string,
    enhancements?: {
      includeSecurityNotes?: boolean;
      includePerformanceTips?: boolean;
      includeFactoryWagerPatterns?: boolean;
    }
  ): Promise<WikiGenerationResult> {
    const request: WikiGenerationRequest = {
      format: 'all',
      baseUrl: 'https://wiki.factorywager.com',
      workspace: `mcp/${context}`,
      includeExamples: true,
      includeValidation: true,
      context: `factorywager-${context}`,
    };

    const result = await MCPWikiGenerator.generateWiki(request);

    // Add FactoryWager enhancements to generated content
    if (result.success && enhancements) {
      Object.entries(result.files).forEach(([format, content]) => {
        if (enhancements.includeSecurityNotes && content) {
          result.files[format] = MCPWikiGenerator.addSecurityNotes(content, format);
        }
        if (enhancements.includePerformanceTips && content) {
          result.files[format] = MCPWikiGenerator.addPerformanceTips(content, format);
        }
        if (enhancements.includeFactoryWagerPatterns && content) {
          result.files[format] = MCPWikiGenerator.addFactoryWagerPatterns(content, format);
        }
      });
    }

    return result;
  }

  /**
   * Add security notes to wiki content
   */
  private static addSecurityNotes(content: string, format: string): string {
    const securitySection =
      format === 'json'
        ? '"security_notes": "Always validate inputs and use secure defaults"'
        : '\n\n## 🔐 Security Notes\n\n• Always validate user inputs\n• Use secure authentication mechanisms\n• Implement proper error handling\n• Audit sensitive operations\n';

    return content + securitySection;
  }

  /**
   * Add performance tips to wiki content
   */
  private static addPerformanceTips(content: string, format: string): string {
    const performanceSection =
      format === 'json'
        ? '"performance_tips": "Monitor performance metrics and optimize bottlenecks"'
        : '\n\n## ⚡ Performance Tips\n\n• Monitor response times\n• Use caching for frequently accessed data\n• Optimize database queries\n• Implement proper error handling\n';

    return content + performanceSection;
  }

  /**
   * Add FactoryWager patterns to wiki content
   */
  private static addFactoryWagerPatterns(content: string, format: string): string {
    const patternsSection =
      format === 'json'
        ? '"factorywager_patterns": "Apply proven FactoryWager resolution patterns"'
        : '\n\n## 🏛️ FactoryWager Patterns\n\n• Apply proven patterns from audit history\n• Use standardized error handling\n• Follow naming conventions\n• Implement proper logging\n';

    return content + patternsSection;
  }

  /**
   * Schedule automatic wiki generation
   */
  static scheduleWikiGeneration(
    schedule: 'hourly' | 'daily' | 'weekly',
    template: string,
    customizations?: Partial<WikiGenerationRequest>
  ): void {
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
    };

    const interval = setInterval(async () => {
      console.log(styled(`🔄 Scheduled wiki generation (${schedule})`, 'info'));
      const result = await MCPWikiGenerator.generateFromTemplate(template, customizations);

      if (result.success) {
        console.log(
          styled(`✅ Scheduled wiki generated: ${result.metadata.total} utilities`, 'success')
        );
      } else {
        console.error(styled(`❌ Scheduled wiki generation failed: ${result.error}`, 'error'));
      }
    }, intervals[schedule]);

    console.log(styled(`⏰ Wiki generation scheduled: ${schedule}`, 'success'));
    console.log(styled(`   Template: ${template}`, 'info'));
    console.log(styled(`   Interval: ${intervals[schedule] / 1000}s`, 'muted'));
  }
}

// CLI interface for wiki generation
if (import.meta.main) {
  const command = Bun.argv[2];
  const args = Bun.argv.slice(3);

  async function runWikiCLI() {
    try {
      switch (command) {
        case 'generate':
          const format =
            (args.find(arg => arg.startsWith('--format='))?.split('=')[1] as
              | 'markdown'
              | 'html'
              | 'json'
              | 'all') || 'markdown';
          const baseUrl = args.find(arg => arg.startsWith('--base-url='))?.split('=')[1];
          const workspace = args.find(arg => arg.startsWith('--workspace='))?.split('=')[1];

          const result = await MCPWikiGenerator.generateWiki({
            format,
            baseUrl,
            workspace,
            context: 'cli-generation',
          });

          if (result.success) {
            console.log(styled('✅ Wiki generated successfully!', 'success'));
            console.log(styled(`📊 Total utilities: ${result.metadata.total}`, 'info'));
            console.log(styled(`📂 Categories: ${result.metadata.categories}`, 'info'));
            console.log(styled(`🌐 Base URL: ${result.metadata.baseUrl}`, 'muted'));
            console.log(styled(`📁 Workspace: ${result.metadata.workspace}`, 'muted'));

            if (result.r2Stored) {
              console.log(styled(`📦 Stored in R2: ${result.r2Stored.key}`, 'success'));
            }
          } else {
            console.error(styled(`❌ Generation failed: ${result.error}`, 'error'));
          }
          break;

        case 'templates':
          const templates = MCPWikiGenerator.getWikiTemplates();
          console.log(styled('📋 Available Wiki Templates:', 'primary'));
          templates.forEach((template, index) => {
            console.log(styled(`\n${index + 1}. ${template.name}`, 'accent'));
            console.log(styled(`   ${template.description}`, 'muted'));
            console.log(
              styled(`   Format: ${template.format} | Workspace: ${template.workspace}`, 'info')
            );
          });
          break;

        case 'template':
          const templateName = args[0];
          if (!templateName) {
            console.error('❌ Template name required');
            process.exit(1);
          }

          const templateResult = await MCPWikiGenerator.generateFromTemplate(templateName);
          if (templateResult.success) {
            console.log(styled(`✅ Wiki generated from template: ${templateName}`, 'success'));
            console.log(styled(`📊 Total utilities: ${templateResult.metadata.total}`, 'info'));
          } else {
            console.error(
              styled(`❌ Template generation failed: ${templateResult.error}`, 'error')
            );
          }
          break;

        case 'history':
          const limit = parseInt(args[0]) || 10;
          const history = await MCPWikiGenerator.getWikiHistory(limit);

          if (history.length === 0) {
            console.log(styled('📭 No wiki generation history found', 'muted'));
          } else {
            console.log(styled(`📋 Wiki Generation History (Last ${limit}):`, 'primary'));
            history.forEach((entry, index) => {
              console.log(styled(`\n${index + 1}. ${entry.id}`, 'accent'));
              console.log(
                styled(`   Time: ${new Date(entry.timestamp).toLocaleString()}`, 'muted')
              );
              console.log(styled(`   Workspace: ${entry.workspace}`, 'info'));
              console.log(styled(`   Format: ${entry.format}`, 'info'));
              console.log(styled(`   Utilities: ${entry.totalUtilities}`, 'primary'));
            });
          }
          break;

        case 'factorywager':
          const context = args[0] || 'default';
          const fwResult = await MCPWikiGenerator.generateFactoryWagerWiki(context, {
            includeSecurityNotes: true,
            includePerformanceTips: true,
            includeFactoryWagerPatterns: true,
          });

          if (fwResult.success) {
            console.log(
              styled(`✅ FactoryWager wiki generated for context: ${context}`, 'success')
            );
            console.log(styled(`📊 Total utilities: ${fwResult.metadata.total}`, 'info'));
            console.log(styled('🔐 Security notes added', 'success'));
            console.log(styled('⚡ Performance tips added', 'success'));
            console.log(styled('🏛️ FactoryWager patterns added', 'success'));
          } else {
            console.error(
              styled(`❌ FactoryWager wiki generation failed: ${fwResult.error}`, 'error')
            );
          }
          break;

        default:
          console.log(styled('🌐 FactoryWager MCP Wiki Generator', 'accent'));
          console.log(styled('==================================', 'accent'));
          console.log('');
          console.log(styled('Commands:', 'primary'));
          console.log(
            styled(
              '  generate [--format=markdown|html|json|all] [--base-url=URL] [--workspace=NAME]',
              'info'
            )
          );
          console.log(styled('  templates                    - List available templates', 'info'));
          console.log(styled('  template <name>             - Generate from template', 'info'));
          console.log(styled('  history [limit]              - Show generation history', 'info'));
          console.log(
            styled(
              '  factorywager [context]       - Generate with FactoryWager enhancements',
              'info'
            )
          );
          console.log('');
          console.log(styled('Examples:', 'primary'));
          console.log(
            styled('  bun run lib/mcp/wiki-generator-mcp.ts generate --format=all', 'muted')
          );
          console.log(
            styled(
              '  bun run lib/mcp/wiki-generator-mcp.ts template "Confluence Integration"',
              'muted'
            )
          );
          console.log(
            styled('  bun run lib/mcp/wiki-generator-mcp.ts factorywager security', 'muted')
          );
      }
    } catch (error) {
      console.error(styled(`❌ CLI error: ${error.message}`, 'error'));
      process.exit(1);
    }
  }

  runWikiCLI();
}
