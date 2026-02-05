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
