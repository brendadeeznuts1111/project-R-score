/**
 * Recommendation Engine - AI-Powered User Behavior Recommendations
 * Generates personalized recommendations based on behavior patterns and predictions
 */

import {
  UserAction,
  PredictionContext,
  BehavioralPattern,
  PredictionResult,
  Recommendation,
  RecommendationConfig,
  RecommendationContext
} from '../types/behavior';

import { PatternAnalyzer } from './pattern-analyzer';
import { BehaviorPredictionModel } from './prediction-model';

export class RecommendationEngine {
  private patternAnalyzer: PatternAnalyzer;
  private predictionModel: BehaviorPredictionModel;
  private config: RecommendationConfig;
  private recommendationCache: Map<string, Recommendation[]> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private recommendationHistory: Map<string, RecommendationHistory[]> = new Map();

  constructor(
    patternAnalyzer: PatternAnalyzer,
    predictionModel: BehaviorPredictionModel,
    config: RecommendationConfig = {}
  ) {
    this.patternAnalyzer = patternAnalyzer;
    this.predictionModel = predictionModel;
    this.config = {
      maxRecommendations: 5,
      minConfidenceThreshold: 0.6,
      enablePersonalization: true,
      considerContext: true,
      includeProactiveSuggestions: true,
      recommendationCooldown: 300000, // 5 minutes
      diversityWeight: 0.3,
      noveltyWeight: 0.2,
      relevanceWeight: 0.5,
      ...config
    };
  }

  /**
   * Generate recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    context: RecommendationContext,
    actions: UserAction[]
  ): Promise<Recommendation[]> {
    const cacheKey = `${userId}_${context.currentPage}_${Date.now()}`;

    // Check cache first
    const cached = this.recommendationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const recommendations: Recommendation[] = [];

    try {
      // Analyze user patterns
      const patternAnalysis = await this.patternAnalyzer.analyzePatterns(userId, actions);

      // Get predictions
      const predictionContext: PredictionContext = {
        userId,
        sessionId: context.sessionId,
        currentPage: context.currentPage,
        timeOfDay: context.timeOfDay,
        dayOfWeek: context.dayOfWeek,
        recentActions: actions.slice(-10),
        userProfile: this.calculateUserProfile(userId, actions)
      };

      const predictions = await this.predictionModel.predict(predictionContext);

      // Generate different types of recommendations
      const patternBasedRecs = this.generatePatternBasedRecommendations(patternAnalysis, context);
      const predictionBasedRecs = this.generatePredictionBasedRecommendations(predictions, context);
      const contextualRecs = this.generateContextualRecommendations(context, actions);
      const proactiveRecs = this.generateProactiveRecommendations(userId, actions, context);

      // Combine and rank recommendations
      recommendations.push(...patternBasedRecs, ...predictionBasedRecs, ...contextualRecs, ...proactiveRecs);

      // Apply personalization and filtering
      const personalizedRecs = await this.personalizeRecommendations(userId, recommendations, context);

      // Rank and filter recommendations
      const rankedRecs = this.rankRecommendations(personalizedRecs, context);

      // Apply diversity and novelty filters
      const diverseRecs = this.applyDiversityFilter(userId, rankedRecs);

      // Cache results
      this.recommendationCache.set(cacheKey, diverseRecs);

      // Track recommendation history
      this.trackRecommendationHistory(userId, diverseRecs);

    } catch (error) {
      console.error('Error generating recommendations:', error);
    }

    return recommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Generate recommendations based on discovered patterns
   */
  private generatePatternBasedRecommendations(
    patternAnalysis: any,
    context: RecommendationContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const pattern of patternAnalysis.patterns || []) {
      if (pattern.confidence >= this.config.minConfidenceThreshold) {
        const recommendation = this.patternToRecommendation(pattern, context);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations based on predictions
   */
  private generatePredictionBasedRecommendations(
    predictions: PredictionResult[],
    context: RecommendationContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const prediction of predictions) {
      if (prediction.confidence >= this.config.minConfidenceThreshold) {
        recommendations.push({
          id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'predictive',
          title: this.getActionTitle(prediction.predictedAction),
          description: `Based on your recent activity, you might want to ${prediction.predictedAction.replace('_', ' ')}`,
          action: prediction.predictedAction,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          context: prediction.context,
          category: this.categorizeAction(prediction.predictedAction),
          priority: this.calculatePriority(prediction.confidence, 'predictive'),
          metadata: {
            source: 'prediction',
            basedOnPattern: prediction.basedOnPattern,
            timeHorizon: prediction.timeHorizon
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + 600000 // 10 minutes
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate contextual recommendations based on current situation
   */
  private generateContextualRecommendations(
    context: RecommendationContext,
    actions: UserAction[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Time-based recommendations
    const timeBasedRecs = this.generateTimeBasedRecommendations(context);
    recommendations.push(...timeBasedRecs);

    // Page-based recommendations
    const pageBasedRecs = this.generatePageBasedRecommendations(context, actions);
    recommendations.push(...pageBasedRecs);

    // Session-based recommendations
    const sessionBasedRecs = this.generateSessionBasedRecommendations(context, actions);
    recommendations.push(...sessionBasedRecs);

    return recommendations;
  }

  /**
   * Generate proactive recommendations for user engagement
   */
  private generateProactiveRecommendations(
    userId: string,
    actions: UserAction[],
    context: RecommendationContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (!this.config.includeProactiveSuggestions) return recommendations;

    // Check for engagement opportunities
    const engagementRecs = this.generateEngagementRecommendations(userId, actions, context);
    recommendations.push(...engagementRecs);

    // Check for learning opportunities
    const learningRecs = this.generateLearningRecommendations(userId, actions);
    recommendations.push(...learningRecs);

    // Check for optimization opportunities
    const optimizationRecs = this.generateOptimizationRecommendations(actions, context);
    recommendations.push(...optimizationRecs);

    return recommendations;
  }

  /**
   * Convert a behavioral pattern to a recommendation
   */
  private patternToRecommendation(pattern: BehavioralPattern, context: RecommendationContext): Recommendation | null {
    if (pattern.patternType === 'sequential' && pattern.actions.length > 0) {
      const nextAction = pattern.actions[pattern.actions.length - 1];

      return {
        id: `pattern_${pattern.patternId}`,
        type: 'pattern_based',
        title: `Continue your ${pattern.actions[0]} pattern`,
        description: `You've been following a pattern that leads to ${nextAction.replace('_', ' ')}`,
        action: nextAction,
        confidence: pattern.confidence,
        reasoning: `Pattern detected: ${pattern.actions.join(' ’ ')}`,
        context: {
          patternId: pattern.patternId,
          patternType: pattern.patternType,
          frequency: pattern.frequency
        },
        category: this.categorizeAction(nextAction),
        priority: this.calculatePriority(pattern.confidence, 'pattern'),
        metadata: {
          source: 'pattern_analysis',
          pattern: pattern,
          support: pattern.metadata?.support,
          length: pattern.metadata?.length
        },
        timestamp: Date.now(),
        expiresAt: Date.now() + 1800000 // 30 minutes
      };
    }

    return null;
  }

  /**
   * Generate time-based recommendations
   */
  private generateTimeBasedRecommendations(context: RecommendationContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const hour = Math.floor(context.timeOfDay * 24);

    // Morning recommendations
    if (hour >= 6 && hour <= 10) {
      recommendations.push({
        id: `time_morning_${Date.now()}`,
        type: 'contextual',
        title: 'Start your day with key metrics',
        description: 'Review your dashboard metrics to plan your day effectively',
        action: 'view_dashboard_overview',
        confidence: 0.8,
        reasoning: 'Morning hours are optimal for strategic planning',
        context: { timeOfDay: context.timeOfDay },
        category: 'productivity',
        priority: 'medium',
        metadata: { source: 'time_based', timeSlot: 'morning' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000 // 1 hour
      });
    }

    // Evening recommendations
    if (hour >= 18 && hour <= 22) {
      recommendations.push({
        id: `time_evening_${Date.now()}`,
        type: 'contextual',
        title: 'End of day review',
        description: 'Take a moment to review your daily achievements',
        action: 'view_daily_summary',
        confidence: 0.7,
        reasoning: 'Evening hours are good for reflection and planning',
        context: { timeOfDay: context.timeOfDay },
        category: 'reflection',
        priority: 'low',
        metadata: { source: 'time_based', timeSlot: 'evening' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 7200000 // 2 hours
      });
    }

    return recommendations;
  }

  /**
   * Generate page-based recommendations
   */
  private generatePageBasedRecommendations(
    context: RecommendationContext,
    actions: UserAction[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Dashboard-specific recommendations
    if (context.currentPage.includes('dashboard')) {
      const recentActions = actions.slice(-5);
      const hasViewedReports = recentActions.some(a => a.actionType.includes('report'));

      if (!hasViewedReports) {
        recommendations.push({
          id: `page_dashboard_reports_${Date.now()}`,
          type: 'contextual',
          title: 'Check your latest reports',
          description: 'New reports are available for your review',
          action: 'view_reports',
          confidence: 0.75,
          reasoning: 'You\'re on the dashboard but haven\'t viewed reports recently',
          context: { currentPage: context.currentPage },
          category: 'information',
          priority: 'medium',
          metadata: { source: 'page_based', pageType: 'dashboard' },
          timestamp: Date.now(),
          expiresAt: Date.now() + 900000 // 15 minutes
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate session-based recommendations
   */
  private generateSessionBasedRecommendations(
    context: RecommendationContext,
    actions: UserAction[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Long session recommendations
    const sessionDuration = context.sessionDuration || 0;
    if (sessionDuration > 3600000) { // 1 hour
      recommendations.push({
        id: `session_break_${Date.now()}`,
        type: 'contextual',
        title: 'Take a break',
        description: 'You\'ve been active for over an hour. Consider taking a short break.',
        action: 'take_break',
        confidence: 0.9,
        reasoning: 'Long continuous sessions can lead to fatigue',
        context: { sessionDuration },
        category: 'wellness',
        priority: 'high',
        metadata: { source: 'session_based', sessionLength: sessionDuration },
        timestamp: Date.now(),
        expiresAt: Date.now() + 300000 // 5 minutes
      });
    }

    return recommendations;
  }

  /**
   * Generate engagement recommendations
   */
  private generateEngagementRecommendations(
    userId: string,
    actions: UserAction[],
    context: RecommendationContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze recent engagement
    const recentActions = actions.filter(a => a.timestamp > Date.now() - 3600000); // Last hour
    const engagementScore = this.calculateEngagementScore(recentActions);

    if (engagementScore < 0.3) {
      recommendations.push({
        id: `engagement_boost_${Date.now()}`,
        type: 'proactive',
        title: 'Boost your engagement',
        description: 'Try exploring new features to enhance your experience',
        action: 'explore_features',
        confidence: 0.7,
        reasoning: 'Low recent engagement detected - suggesting exploration',
        context: { engagementScore },
        category: 'engagement',
        priority: 'medium',
        metadata: { source: 'engagement', currentScore: engagementScore },
        timestamp: Date.now(),
        expiresAt: Date.now() + 1800000 // 30 minutes
      });
    }

    return recommendations;
  }

  /**
   * Generate learning recommendations
   */
  private generateLearningRecommendations(userId: string, actions: UserAction[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check if user has explored advanced features
    const advancedActions = actions.filter(a =>
      a.actionType.includes('advanced') ||
      a.actionType.includes('analytics') ||
      a.actionType.includes('customization')
    );

    if (advancedActions.length < 5) {
      recommendations.push({
        id: `learning_advanced_${Date.now()}`,
        type: 'proactive',
        title: 'Discover advanced features',
        description: 'Learn about powerful features that can enhance your workflow',
        action: 'view_advanced_tutorial',
        confidence: 0.6,
        reasoning: 'Limited exploration of advanced features detected',
        context: { advancedActionsCount: advancedActions.length },
        category: 'learning',
        priority: 'low',
        metadata: { source: 'learning', skillLevel: 'beginner' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000 // 24 hours
      });
    }

    return recommendations;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    actions: UserAction[],
    context: RecommendationContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze for repetitive tasks
    const actionCounts = new Map<string, number>();
    actions.forEach(action => {
      actionCounts.set(action.actionType, (actionCounts.get(action.actionType) || 0) + 1);
    });

    // Find highly repetitive actions
    for (const [actionType, count] of actionCounts.entries()) {
      if (count > 10) { // More than 10 times
        recommendations.push({
          id: `optimization_automate_${actionType}_${Date.now()}`,
          type: 'proactive',
          title: `Automate ${actionType.replace('_', ' ')}`,
          description: `You've performed this action ${count} times. Consider setting up automation.`,
          action: `setup_automation_${actionType}`,
          confidence: Math.min(count / 20, 0.9), // Scale confidence with frequency
          reasoning: 'High frequency of repetitive action detected',
          context: { actionType, frequency: count },
          category: 'optimization',
          priority: count > 20 ? 'high' : 'medium',
          metadata: { source: 'optimization', repetitiveAction: actionType },
          timestamp: Date.now(),
          expiresAt: Date.now() + 3600000 // 1 hour
        });
      }
    }

    return recommendations;
  }

  /**
   * Personalize recommendations based on user preferences and history
   */
  private async personalizeRecommendations(
    userId: string,
    recommendations: Recommendation[],
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    if (!this.config.enablePersonalization) return recommendations;

    const preferences = this.userPreferences.get(userId);
    const history = this.recommendationHistory.get(userId) || [];

    return recommendations.map(rec => {
      let adjustedConfidence = rec.confidence;

      // Adjust based on user preferences
      if (preferences) {
        if (preferences.preferredCategories.includes(rec.category)) {
          adjustedConfidence *= 1.2;
        }
        if (preferences.dislikedCategories.includes(rec.category)) {
          adjustedConfidence *= 0.5;
        }
      }

      // Adjust based on history (avoid showing similar recommendations too frequently)
      const similarRecentRecs = history.filter(h =>
        h.timestamp > Date.now() - this.config.recommendationCooldown &&
        h.recommendation.category === rec.category
      );

      if (similarRecentRecs.length > 0) {
        adjustedConfidence *= 0.7;
      }

      return {
        ...rec,
        confidence: Math.min(adjustedConfidence, 1.0),
        metadata: {
          ...rec.metadata,
          personalized: true,
          originalConfidence: rec.confidence
        }
      };
    });
  }

  /**
   * Rank recommendations based on multiple factors
   */
  private rankRecommendations(recommendations: Recommendation[], context: RecommendationContext): Recommendation[] {
    return recommendations
      .map(rec => ({
        ...rec,
        score: this.calculateRecommendationScore(rec, context)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate recommendation score based on multiple factors
   */
  private calculateRecommendationScore(rec: Recommendation, context: RecommendationContext): number {
    const relevanceScore = rec.confidence * this.config.relevanceWeight;
    const diversityScore = this.calculateDiversityScore(rec) * this.config.diversityWeight;
    const noveltyScore = this.calculateNoveltyScore(rec) * this.config.noveltyWeight;

    // Context relevance bonus
    let contextBonus = 0;
    if (this.config.considerContext) {
      contextBonus = this.calculateContextRelevance(rec, context) * 0.2;
    }

    return relevanceScore + diversityScore + noveltyScore + contextBonus;
  }

  /**
   * Apply diversity filter to avoid similar recommendations
   */
  private applyDiversityFilter(userId: string, recommendations: Recommendation[]): Recommendation[] {
    const diverseRecs: Recommendation[] = [];
    const categories = new Set<string>();

    for (const rec of recommendations) {
      if (!categories.has(rec.category) || categories.size < 3) {
        diverseRecs.push(rec);
        categories.add(rec.category);
      }
    }

    return diverseRecs;
  }

  /**
   * Calculate diversity score for a recommendation
   */
  private calculateDiversityScore(rec: Recommendation): number {
    // Higher score for less common categories
    const categoryFrequency = {
      'productivity': 0.8,
      'engagement': 0.6,
      'learning': 0.4,
      'optimization': 0.5,
      'wellness': 0.3,
      'information': 0.7,
      'reflection': 0.4
    };

    return 1 - (categoryFrequency[rec.category] || 0.5);
  }

  /**
   * Calculate novelty score for a recommendation
   */
  private calculateNoveltyScore(rec: Recommendation): number {
    // Higher score for newer types of recommendations
    const typeNovelty = {
      'predictive': 0.9,
      'pattern_based': 0.8,
      'contextual': 0.6,
      'proactive': 0.7
    };

    return typeNovelty[rec.type] || 0.5;
  }

  /**
   * Calculate context relevance for a recommendation
   */
  private calculateContextRelevance(rec: Recommendation, context: RecommendationContext): number {
    let relevance = 0;

    // Time relevance
    if (rec.context.timeOfDay !== undefined) {
      const timeDiff = Math.abs(rec.context.timeOfDay - context.timeOfDay);
      relevance += Math.max(0, 1 - timeDiff);
    }

    // Page relevance
    if (rec.context.currentPage && context.currentPage) {
      relevance += rec.context.currentPage === context.currentPage ? 1 : 0;
    }

    return relevance / 2; // Normalize
  }

  /**
   * Calculate priority level for a recommendation
   */
  private calculatePriority(confidence: number, type: string): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Categorize an action
   */
  private categorizeAction(action: string): string {
    if (action.includes('view') || action.includes('check')) return 'information';
    if (action.includes('learn') || action.includes('tutorial')) return 'learning';
    if (action.includes('optimize') || action.includes('automate')) return 'optimization';
    if (action.includes('engage') || action.includes('explore')) return 'engagement';
    if (action.includes('break') || action.includes('rest')) return 'wellness';
    if (action.includes('dashboard') || action.includes('summary')) return 'productivity';
    return 'general';
  }

  /**
   * Get human-readable title for an action
   */
  private getActionTitle(action: string): string {
    const titles: Record<string, string> = {
      'view_dashboard': 'View Dashboard',
      'view_reports': 'View Reports',
      'view_analytics': 'View Analytics',
      'setup_automation': 'Setup Automation',
      'explore_features': 'Explore Features',
      'take_break': 'Take a Break',
      'view_tutorial': 'View Tutorial'
    };

    return titles[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Calculate user profile from actions
   */
  private calculateUserProfile(userId: string, actions: UserAction[]): any {
    if (actions.length === 0) {
      return { riskScore: 0.5, engagementScore: 0.5, preferences: {} };
    }

    const recentActions = actions.filter(a => a.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
    const engagementScore = Math.min(recentActions.length / 100, 1);

    const failedActions = actions.filter(a => a.actionType.includes('failed')).length;
    const riskScore = Math.min(failedActions / actions.length, 1);

    return {
      riskScore,
      engagementScore,
      preferences: {}
    };
  }

  /**
   * Calculate engagement score from recent actions
   */
  private calculateEngagementScore(actions: UserAction[]): number {
    if (actions.length === 0) return 0;

    const engagementActions = actions.filter(a =>
      a.actionType.includes('view') ||
      a.actionType.includes('interact') ||
      a.actionType.includes('click')
    ).length;

    return engagementActions / actions.length;
  }

  /**
   * Check if cached recommendations are still valid
   */
  private isCacheValid(recommendations: Recommendation[]): boolean {
    const now = Date.now();
    return recommendations.every(rec => rec.expiresAt > now);
  }

  /**
   * Track recommendation history for personalization
   */
  private trackRecommendationHistory(userId: string, recommendations: Recommendation[]): void {
    const history = this.recommendationHistory.get(userId) || [];

    for (const rec of recommendations) {
      history.push({
        recommendationId: rec.id,
        userId,
        category: rec.category,
        type: rec.type,
        confidence: rec.confidence,
        shownAt: Date.now(),
        timestamp: Date.now()
      });
    }

    // Keep only recent history (last 100 recommendations)
    const recentHistory = history.slice(-100);
    this.recommendationHistory.set(userId, recentHistory);
  }

  /**
   * Update user preferences based on feedback
   */
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const existing = this.userPreferences.get(userId) || {
      preferredCategories: [],
      dislikedCategories: [],
      preferredTimes: [],
      lastUpdated: Date.now()
    };

    this.userPreferences.set(userId, {
      ...existing,
      ...preferences,
      lastUpdated: Date.now()
    });
  }

  /**
   * Get recommendation statistics
   */
  getStats(): {
    totalUsers: number;
    totalRecommendations: number;
    averageConfidence: number;
    categoryDistribution: Record<string, number>;
  } {
    const allRecommendations = Array.from(this.recommendationCache.values()).flat();
    const categoryDistribution: Record<string, number> = {};

    allRecommendations.forEach(rec => {
      categoryDistribution[rec.category] = (categoryDistribution[rec.category] || 0) + 1;
    });

    const averageConfidence = allRecommendations.length > 0
      ? allRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / allRecommendations.length
      : 0;

    return {
      totalUsers: this.recommendationCache.size,
      totalRecommendations: allRecommendations.length,
      averageConfidence,
      categoryDistribution
    };
  }

  /**
   * Clear recommendation cache
   */
  clearCache(): void {
    this.recommendationCache.clear();
  }
}

// Additional interfaces
interface UserPreferences {
  preferredCategories: string[];
  dislikedCategories: string[];
  preferredTimes: number[];
  lastUpdated: number;
}

interface RecommendationHistory {
  recommendationId: string;
  userId: string;
  category: string;
  type: string;
  confidence: number;
  shownAt: number;
  timestamp: number;
}