#!/usr/bin/env bun

/**
 * AI Search Enhancement for DuoPlus CLI v3.0+
 * Intelligent search with AI-powered suggestions and semantic analysis
 */

import { join } from 'path';

interface AISearchOptions {
  enableQueryExpansion?: boolean;
  enableContextAwareness?: boolean;
  enablePersonalization?: boolean;
  enablePredictiveResults?: boolean;
  enableSemanticSearch?: boolean;
  enableLearning?: boolean;
}

interface SearchContext {
  userPreferences: any;
  recentSearches: string[];
  currentTimeOfDay: string;
  currentDirectory: string;
  projectType: string;
  sessionDuration: number;
}

interface QueryExpansion {
  originalQuery: string;
  expandedQuery: string;
  expansions: string[];
  confidence: number;
}

interface SemanticResult {
  artifact: any;
  semanticScore: number;
  relevanceScore: number;
  contextScore: number;
  totalScore: number;
  explanation: string;
}

export class AISearchEnhancer {
  private options: AISearchOptions;
  private userContext: SearchContext;
  private learningModel: any;
  private semanticIndex: any;
  
  constructor(options: AISearchOptions = {}) {
    this.options = {
      enableQueryExpansion: true,
      enableContextAwareness: true,
      enablePersonalization: true,
      enablePredictiveResults: true,
      enableSemanticSearch: true,
      enableLearning: true,
      ...options
    };
    
    this.userContext = this.initializeUserContext();
    this.learningModel = this.initializeLearningModel();
    this.semanticIndex = this.initializeSemanticIndex();
  }
  
  /**
   * Enhanced search with AI capabilities
   */
  async enhancedSearch(query: string, artifacts: any[]): Promise<SemanticResult[]> {
    console.log(`🤖 AI-Enhanced Search: "${query}"`);
    
    const startTime = Date.now();
    
    // Step 1: Query expansion
    const expanded = await this.expandQuery(query);
    
    // Step 2: Context analysis
    const context = await this.analyzeContext();
    
    // Step 3: Semantic search
    const semanticResults = await this.semanticSearch(expanded.expandedQuery, artifacts, context);
    
    // Step 4: Personalization
    const personalizedResults = await this.personalizeResults(semanticResults, context);
    
    // Step 5: Predictive ranking
    const rankedResults = await this.predictiveRanking(personalizedResults, context);
    
    // Step 6: Learning update
    if (this.options.enableLearning) {
      await this.updateLearningModel(query, rankedResults);
    }
    
    const searchTime = Date.now() - startTime;
    
    console.log(`   ✅ Completed in ${searchTime}ms`);
    console.log(`   📊 Found ${rankedResults.length} semantic results`);
    console.log(`   🧠 Query expanded: "${expanded.expandedQuery}"`);
    
    return rankedResults;
  }
  
  /**
   * Initialize user context
   */
  private initializeUserContext(): SearchContext {
    return {
      userPreferences: this.loadUserPreferences(),
      recentSearches: [],
      currentTimeOfDay: this.getTimeOfDay(),
      currentDirectory: process.cwd(),
      projectType: this.detectProjectType(),
      sessionDuration: 0,
    };
  }
  
  /**
   * Initialize learning model
   */
  private initializeLearningModel(): any {
    return {
      searchPatterns: new Map(),
      userPreferences: new Map(),
      contextWeights: {
        timeOfDay: 0.1,
        recentSearches: 0.3,
        projectType: 0.2,
        userHistory: 0.4,
      },
      semanticVectors: new Map(),
    };
  }
  
  /**
   * Initialize semantic index
   */
  private initializeSemanticIndex(): any {
    return {
      wordVectors: new Map(),
      documentVectors: new Map(),
      similarityCache: new Map(),
    };
  }
  
  /**
   * Expand query with AI
   */
  private async expandQuery(query: string): Promise<QueryExpansion> {
    if (!this.options.enableQueryExpansion) {
      return {
        originalQuery: query,
        expandedQuery: query,
        expansions: [],
        confidence: 1.0,
      };
    }
    
    const words = query.toLowerCase().split(' ');
    const expansions: string[] = [];
    let confidence = 1.0;
    
    // Synonym expansion
    const synonyms = this.getSynonyms(words);
    expansions.push(...synonyms);
    
    // Domain-specific expansion
    const domainExpansions = this.getDomainExpansions(words);
    expansions.push(...domainExpansions);
    
    // Contextual expansion
    const contextualExpansions = this.getContextualExpansions(words);
    expansions.push(...contextualExpansions);
    
    // Build expanded query
    const expandedWords = [...words, ...expansions];
    const expandedQuery = [...new Set(expandedWords)].join(' ');
    
    // Calculate confidence based on expansion quality
    confidence = Math.max(0.5, 1.0 - (expansions.length * 0.1));
    
    return {
      originalQuery: query,
      expandedQuery,
      expansions,
      confidence,
    };
  }
  
  /**
   * Get synonyms for words
   */
  private getSynonyms(words: string[]): string[] {
    const synonymMap: Record<string, string[]> = {
      'sec': ['security', 'secure', 'authentication', 'authorization'],
      'api': ['rest', 'graphql', 'endpoint', 'service', 'interface'],
      'ui': ['user interface', 'frontend', 'components', 'gui'],
      'perf': ['performance', 'optimization', 'speed', 'efficiency'],
      'test': ['testing', 'unit', 'integration', 'e2e', 'qa'],
      'db': ['database', 'storage', 'persistence', 'data'],
      'dev': ['development', 'dev', 'coding', 'programming'],
      'prod': ['production', 'prod', 'live', 'deployed'],
    };
    
    const synonyms: string[] = [];
    
    words.forEach(word => {
      if (synonymMap[word]) {
        synonyms.push(...synonymMap[word]);
      }
    });
    
    return synonyms;
  }
  
  /**
   * Get domain-specific expansions
   */
  private getDomainExpansions(words: string[]): string[] {
    const expansions: string[] = [];
    
    // Security domain
    if (words.some(w => ['sec', 'security', 'auth'].includes(w))) {
      expansions.push('encryption', 'firewall', 'vpn', 'certificate');
    }
    
    // API domain
    if (words.some(w => ['api', 'rest', 'graphql'].includes(w))) {
      expansions.push('swagger', 'openapi', 'documentation', 'schema');
    }
    
    // UI domain
    if (words.some(w => ['ui', 'frontend', 'components'].includes(w))) {
      expansions.push('react', 'vue', 'angular', 'css', 'scss');
    }
    
    // Performance domain
    if (words.some(w => ['perf', 'performance', 'optimization'].includes(w))) {
      expansions.push('caching', 'lazy', 'async', 'benchmark');
    }
    
    return expansions;
  }
  
  /**
   * Get contextual expansions
   */
  private getContextualExpansions(words: string[]): string[] {
    const expansions: string[] = [];
    
    // Time-based context
    if (this.userContext.currentTimeOfDay === 'morning') {
      expansions.push('planning', 'setup', 'configuration');
    } else if (this.userContext.currentTimeOfDay === 'evening') {
      expansions.push('review', 'cleanup', 'maintenance');
    }
    
    // Project type context
    if (this.userContext.projectType === 'typescript') {
      expansions.push('types', 'interfaces', 'generics', 'decorators');
    } else if (this.userContext.projectType === 'python') {
      expansions.push('classes', 'modules', 'packages', 'pip');
    }
    
    return expansions;
  }
  
  /**
   * Analyze search context
   */
  private async analyzeContext(): Promise<SearchContext> {
    // Update current context
    this.userContext.currentTimeOfDay = this.getTimeOfDay();
    this.userContext.currentDirectory = process.cwd();
    this.userContext.projectType = this.detectProjectType();
    
    return this.userContext;
  }
  
  /**
   * Semantic search implementation
   */
  private async semanticSearch(query: string, artifacts: any[], context: SearchContext): Promise<SemanticResult[]> {
    if (!this.options.enableSemanticSearch) {
      return artifacts.map(artifact => ({
        artifact,
        semanticScore: 0.5,
        relevanceScore: 0.5,
        contextScore: 0.5,
        totalScore: 0.5,
        explanation: 'Basic keyword matching',
      }));
    }
    
    const results: SemanticResult[] = [];
    
    for (const artifact of artifacts) {
      const semanticScore = this.calculateSemanticScore(query, artifact);
      const relevanceScore = this.calculateRelevanceScore(query, artifact);
      const contextScore = this.calculateContextScore(artifact, context);
      
      const totalScore = (
        semanticScore * 0.4 +
        relevanceScore * 0.4 +
        contextScore * 0.2
      );
      
      results.push({
        artifact,
        semanticScore,
        relevanceScore,
        contextScore,
        totalScore,
        explanation: this.generateExplanation(semanticScore, relevanceScore, contextScore),
      });
    }
    
    return results.sort((a, b) => b.totalScore - a.totalScore);
  }
  
  /**
   * Calculate semantic score
   */
  private calculateSemanticScore(query: string, artifact: any): number {
    const queryWords = query.toLowerCase().split(' ');
    const artifactText = `${artifact.path} ${artifact.tags.join(' ')}`.toLowerCase();
    
    let score = 0;
    let matches = 0;
    
    queryWords.forEach(word => {
      if (artifactText.includes(word)) {
        matches++;
        score += 1 / queryWords.length;
      }
    });
    
    // Bonus for exact matches
    if (artifactText.includes(query.toLowerCase())) {
      score += 0.5;
    }
    
    // Bonus for tag matches
    const tagMatches = artifact.tags.filter(tag => 
      queryWords.some(word => tag.includes(word))
    ).length;
    
    score += tagMatches * 0.2;
    
    return Math.min(1.0, score);
  }
  
  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(query: string, artifact: any): number {
    let score = 0.5; // Base score
    
    // Recent file bonus
    const daysSinceModified = (Date.now() - artifact.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) {
      score += 0.3;
    } else if (daysSinceModified < 30) {
      score += 0.1;
    }
    
    // File type relevance
    const extension = artifact.path.split('.').pop()?.toLowerCase();
    const queryWords = query.toLowerCase().split(' ');
    
    if (queryWords.includes('code') && ['ts', 'js', 'py', 'java'].includes(extension || '')) {
      score += 0.2;
    }
    
    if (queryWords.includes('config') && ['json', 'yaml', 'toml', 'ini'].includes(extension || '')) {
      score += 0.2;
    }
    
    return Math.min(1.0, score);
  }
  
  /**
   * Calculate context score
   */
  private calculateContextScore(artifact: any, context: SearchContext): number {
    let score = 0.5;
    
    // Directory context
    if (artifact.path.startsWith(context.currentDirectory)) {
      score += 0.2;
    }
    
    // Project type context
    if (context.projectType === 'typescript' && artifact.path.endsWith('.ts')) {
      score += 0.1;
    }
    
    // Recent searches context
    const recentSearchTags = context.recentSearches.flatMap(search => search.split(' '));
    const matchingTags = artifact.tags.filter(tag => 
      recentSearchTags.some(recentTag => tag.includes(recentTag))
    );
    
    score += matchingTags.length * 0.05;
    
    return Math.min(1.0, score);
  }
  
  /**
   * Generate explanation for scoring
   */
  private generateExplanation(semanticScore: number, relevanceScore: number, contextScore: number): string {
    const reasons: string[] = [];
    
    if (semanticScore > 0.7) {
      reasons.push('strong semantic match');
    }
    
    if (relevanceScore > 0.7) {
      reasons.push('highly relevant');
    }
    
    if (contextScore > 0.7) {
      reasons.push('contextually appropriate');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'basic match';
  }
  
  /**
   * Personalize results
   */
  private async personalizeResults(results: SemanticResult[], context: SearchContext): Promise<SemanticResult[]> {
    if (!this.options.enablePersonalization) {
      return results;
    }
    
    return results.map(result => {
      const personalizationScore = this.calculatePersonalizationScore(result.artifact, context);
      
      return {
        ...result,
        totalScore: result.totalScore * 0.8 + personalizationScore * 0.2,
        explanation: result.explanation + (personalizationScore > 0.5 ? ', personalized' : ''),
      };
    });
  }
  
  /**
   * Calculate personalization score
   */
  private calculatePersonalizationScore(artifact: any, context: SearchContext): number {
    let score = 0.5;
    
    // User preferences
    const preferredTags = context.userPreferences.preferredTags || [];
    const matchingPreferredTags = artifact.tags.filter(tag => 
      preferredTags.includes(tag)
    );
    
    score += matchingPreferredTags.length * 0.1;
    
    // Usage history
    const usageCount = this.learningModel.userPreferences.get(artifact.path) || 0;
    score += Math.min(0.3, usageCount * 0.05);
    
    return Math.min(1.0, score);
  }
  
  /**
   * Predictive ranking
   */
  private async predictiveRanking(results: SemanticResult[], context: SearchContext): Promise<SemanticResult[]> {
    if (!this.options.enablePredictiveResults) {
      return results;
    }
    
    // Apply machine learning model for ranking
    return results.map(result => {
      const predictiveScore = this.calculatePredictiveScore(result, context);
      
      return {
        ...result,
        totalScore: result.totalScore * 0.7 + predictiveScore * 0.3,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }
  
  /**
   * Calculate predictive score
   */
  private calculatePredictiveScore(result: SemanticResult, context: SearchContext): number {
    // Simulate ML model prediction
    let score = 0.5;
    
    // Time-based prediction
    if (context.currentTimeOfDay === 'morning' && result.artifact.tags.includes('#planning')) {
      score += 0.2;
    }
    
    // Session-based prediction
    if (context.sessionDuration < 300 && result.artifact.tags.includes('#quick')) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }
  
  /**
   * Update learning model
   */
  private async updateLearningModel(query: string, results: SemanticResult[]): Promise<void> {
    // Record search pattern
    const pattern = this.extractSearchPattern(query);
    this.learningModel.searchPatterns.set(pattern, 
      (this.learningModel.searchPatterns.get(pattern) || 0) + 1
    );
    
    // Update user preferences based on results
    results.slice(0, 5).forEach(result => {
      const currentCount = this.learningModel.userPreferences.get(result.artifact.path) || 0;
      this.learningModel.userPreferences.set(result.artifact.path, currentCount + 1);
    });
    
    // Save learning data
    this.saveLearningData();
  }
  
  /**
   * Extract search pattern
   */
  private extractSearchPattern(query: string): string {
    // Simple pattern extraction - can be enhanced with NLP
    const words = query.toLowerCase().split(' ');
    return words.sort().join(' ');
  }
  
  /**
   * Load user preferences
   */
  private loadUserPreferences(): any {
    try {
      const prefsPath = join(process.cwd(), '.duoplus', 'preferences.json');
      return JSON.parse(readFileSync(prefsPath, 'utf-8'));
    } catch {
      return {
        preferredTags: [],
        searchHistory: [],
        theme: 'dark',
      };
    }
  }
  
  /**
   * Save learning data
   */
  private saveLearningData(): void {
    try {
      const dataPath = join(process.cwd(), '.duoplus', 'learning-data.json');
      const data = {
        searchPatterns: Object.fromEntries(this.learningModel.searchPatterns),
        userPreferences: Object.fromEntries(this.learningModel.userPreferences),
        lastUpdated: new Date().toISOString(),
      };
      
      writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      // Silent fail for learning data
    }
  }
  
  /**
   * Get time of day
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  /**
   * Detect project type
   */
  private detectProjectType(): string {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      if (packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript) {
        return 'typescript';
      }
      
      if (packageJson.dependencies?.react) {
        return 'react';
      }
      
      if (packageJson.dependencies?.vue) {
        return 'vue';
      }
      
      return 'javascript';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Get search suggestions
   */
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Pattern-based suggestions
    const patterns = Array.from(this.learningModel.searchPatterns.keys());
    const matchingPatterns = patterns.filter(pattern => 
      pattern.includes(partialQuery.toLowerCase())
    );
    
    suggestions.push(...matchingPatterns.slice(0, 5));
    
    // Contextual suggestions
    if (this.userContext.currentTimeOfDay === 'morning') {
      suggestions.push('planning setup configuration');
    }
    
    if (this.userContext.projectType === 'typescript') {
      suggestions.push('typescript types interfaces');
    }
    
    // Popular searches
    suggestions.push('#typescript #api', '#security #authentication', '#testing #unit');
    
    return [...new Set(suggestions)].slice(0, 10);
  }
  
  /**
   * Get learning insights
   */
  getLearningInsights(): any {
    const topPatterns = Array.from(this.learningModel.searchPatterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const topArtifacts = Array.from(this.learningModel.userPreferences.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return {
      topSearchPatterns: topPatterns.map(([pattern, count]) => ({ pattern, count })),
      topArtifacts: topArtifacts.map(([path, count]) => ({ path, count })),
      totalSearches: Array.from(this.learningModel.searchPatterns.values())
        .reduce((sum, count) => sum + count, 0),
      uniqueArtifacts: this.learningModel.userPreferences.size,
    };
  }
}

// Demonstration
async function demonstrateAISearch() {
  console.log('🤖 AI-Powered Search Enhancement Demo');
  console.log('='.repeat(60));
  
  const aiSearch = new AISearchEnhancer({
    enableQueryExpansion: true,
    enableContextAwareness: true,
    enablePersonalization: true,
    enablePredictiveResults: true,
    enableSemanticSearch: true,
    enableLearning: true,
  });
  
  // Sample artifacts
  const artifacts = [
    {
      path: 'src/api/auth.ts',
      tags: ['#typescript', '#api', '#security', '#authentication'],
      lastModified: new Date(),
    },
    {
      path: 'src/ui/components/Button.tsx',
      tags: ['#react', '#ui', '#components', '#frontend'],
      lastModified: new Date(),
    },
    {
      path: 'tests/unit/auth.test.ts',
      tags: ['#testing', '#unit', '#typescript', '#security'],
      lastModified: new Date(),
    },
    {
      path: 'config/database.json',
      tags: ['#config', '#database', '#storage'],
      lastModified: new Date(),
    },
  ];
  
  // Demonstrate enhanced search
  console.log('\n🔍 Enhanced Search Examples:');
  
  const searches = ['sec api', 'ui comp', 'test', 'perf'];
  
  for (const search of searches) {
    console.log(`\n📝 Query: "${search}"`);
    const results = await aiSearch.enhancedSearch(search, artifacts);
    
    console.log(`   Results: ${results.length}`);
    results.slice(0, 3).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.artifact.path}`);
      console.log(`      Score: ${result.totalScore.toFixed(3)} (${result.explanation})`);
    });
  }
  
  // Demonstrate suggestions
  console.log('\n💡 Search Suggestions:');
  const suggestions = await aiSearch.getSearchSuggestions('sec');
  console.log(`   For "sec": ${suggestions.join(', ')}`);
  
  // Show learning insights
  console.log('\n📊 Learning Insights:');
  const insights = aiSearch.getLearningInsights();
  console.log(`   Total searches: ${insights.totalSearches}`);
  console.log(`   Unique artifacts: ${insights.uniqueArtifacts}`);
  console.log(`   Top patterns: ${insights.topSearchPatterns.map(p => p.pattern).join(', ')}`);
  
  console.log('\n🎉 AI Search Demo Complete!');
}

if (import.meta.main) {
  demonstrateAISearch().catch(console.error);
}

export { AISearchEnhancer, AISearchOptions, SearchContext, SemanticResult };
