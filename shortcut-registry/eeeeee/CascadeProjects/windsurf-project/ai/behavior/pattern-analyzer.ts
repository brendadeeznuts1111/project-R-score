/**
 * Pattern Analyzer - Advanced Behavioral Pattern Analysis System
 * Analyzes user behavior patterns for prediction and insights
 */

import {
  UserAction,
  BehavioralPattern,
  PatternAnalysisResult,
  PatternPrediction,
  PatternConfig
} from '../types/behavior';

export class PatternAnalyzer {
  private patterns: Map<string, BehavioralPattern> = new Map();
  private patternSequences: Map<string, UserAction[][]> = new Map();
  private analysisCache: Map<string, PatternAnalysisResult> = new Map();
  private config: PatternConfig;

  constructor(config: PatternConfig = {}) {
    this.config = {
      minPatternLength: 3,
      maxPatternLength: 10,
      minSupport: 2,
      minConfidence: 0.6,
      timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableRealTimeAnalysis: true,
      ...config
    };
  }

  /**
   * Analyze user actions to discover patterns
   */
  async analyzePatterns(userId: string, actions: UserAction[]): Promise<PatternAnalysisResult> {
    const cacheKey = `${userId}_${actions.length}_${actions[actions.length - 1]?.timestamp || 0}`;

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const result: PatternAnalysisResult = {
      userId,
      patterns: [],
      insights: [],
      predictions: [],
      confidence: 0,
      timestamp: Date.now()
    };

    try {
      // Filter actions within time window
      const recentActions = this.filterRecentActions(actions);

      if (recentActions.length < this.config.minPatternLength) {
        return result;
      }

      // Discover sequential patterns
      const sequentialPatterns = this.discoverSequentialPatterns(recentActions);

      // Discover temporal patterns
      const temporalPatterns = this.discoverTemporalPatterns(recentActions);

      // Discover behavioral clusters
      const clusterPatterns = this.discoverBehavioralClusters(recentActions);

      // Combine all patterns
      result.patterns = [...sequentialPatterns, ...temporalPatterns, ...clusterPatterns];

      // Generate insights
      result.insights = this.generateInsights(result.patterns, recentActions);

      // Generate predictions
      result.predictions = this.generatePredictions(result.patterns, recentActions);

      // Calculate overall confidence
      result.confidence = this.calculateOverallConfidence(result.patterns);

      // Cache result
      this.analysisCache.set(cacheKey, result);

    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }

    return result;
  }

  /**
   * Discover sequential patterns in user actions
   */
  private discoverSequentialPatterns(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const actionTypes = actions.map(a => a.actionType);

    // Use Apriori-like algorithm for frequent sequence mining
    for (let length = this.config.minPatternLength; length <= Math.min(this.config.maxPatternLength, actions.length); length++) {
      const sequences = this.generateSequences(actionTypes, length);
      const frequentSequences = this.findFrequentSequences(sequences, actions);

      for (const sequence of frequentSequences) {
        const pattern: BehavioralPattern = {
          patternId: `seq_${sequence.join('_')}_${Date.now()}`,
          patternType: 'sequential',
          actions: sequence,
          confidence: this.calculateSequenceConfidence(sequence, actions),
          frequency: this.countSequenceOccurrences(sequence, actions),
          lastObserved: actions[actions.length - 1].timestamp,
          metadata: {
            support: this.calculateSupport(sequence, actions),
            length: sequence.length,
            discovered: true
          }
        };

        if (pattern.confidence >= this.config.minConfidence && pattern.frequency >= this.config.minSupport) {
          patterns.push(pattern);
          this.patterns.set(pattern.patternId, pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Discover temporal patterns (time-based patterns)
   */
  private discoverTemporalPatterns(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];

    // Analyze daily patterns
    const dailyPatterns = this.analyzeDailyPatterns(actions);
    patterns.push(...dailyPatterns);

    // Analyze session patterns
    const sessionPatterns = this.analyzeSessionPatterns(actions);
    patterns.push(...sessionPatterns);

    // Analyze peak activity patterns
    const peakPatterns = this.analyzePeakActivityPatterns(actions);
    patterns.push(...peakPatterns);

    return patterns;
  }

  /**
   * Discover behavioral clusters using unsupervised learning
   */
  private discoverBehavioralClusters(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];

    // Simple clustering based on action types and timing
    const clusters = this.clusterActions(actions);

    for (const cluster of clusters) {
      if (cluster.actions.length >= this.config.minPatternLength) {
        const pattern: BehavioralPattern = {
          patternId: `cluster_${cluster.id}_${Date.now()}`,
          patternType: 'cluster',
          actions: cluster.actions.map(a => a.actionType),
          confidence: cluster.coherence,
          frequency: cluster.frequency,
          lastObserved: cluster.lastObserved,
          metadata: {
            clusterId: cluster.id,
            clusterSize: cluster.actions.length,
            centroid: cluster.centroid,
            discovered: true
          }
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Generate insights from discovered patterns
   */
  private generateInsights(patterns: BehavioralPattern[], actions: UserAction[]): string[] {
    const insights: string[] = [];

    // Analyze pattern frequency and confidence
    const highConfidencePatterns = patterns.filter(p => p.confidence > 0.8);
    if (highConfidencePatterns.length > 0) {
      insights.push(`Discovered ${highConfidencePatterns.length} high-confidence behavioral patterns`);
    }

    // Analyze user engagement patterns
    const engagementPatterns = patterns.filter(p =>
      p.actions.some(action => action.includes('view') || action.includes('interact'))
    );
    if (engagementPatterns.length > 0) {
      insights.push(`User shows strong engagement with ${engagementPatterns.length} interaction patterns`);
    }

    // Analyze risk patterns
    const riskPatterns = patterns.filter(p =>
      p.actions.some(action => action.includes('failed') || action.includes('error'))
    );
    if (riskPatterns.length > 0) {
      insights.push(`Detected ${riskPatterns.length} potential risk patterns requiring attention`);
    }

    // Analyze temporal patterns
    const temporalPatterns = patterns.filter(p => p.patternType === 'temporal');
    if (temporalPatterns.length > 0) {
      insights.push(`User exhibits ${temporalPatterns.length} distinct temporal behavior patterns`);
    }

    return insights;
  }

  /**
   * Generate predictions based on patterns
   */
  private generatePredictions(patterns: BehavioralPattern[], actions: UserAction[]): PatternPrediction[] {
    const predictions: PatternPrediction[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        const prediction = this.predictNextAction(pattern, actions);
        if (prediction) {
          predictions.push(prediction);
        }
      }
    }

    // Sort by confidence
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predict next action based on pattern
   */
  private predictNextAction(pattern: BehavioralPattern, actions: UserAction[]): PatternPrediction | null {
    if (pattern.patternType === 'sequential' && pattern.actions.length >= 2) {
      const lastActions = actions.slice(-pattern.actions.length + 1).map(a => a.actionType);

      // Check if recent actions match pattern prefix
      const matches = this.sequencesMatch(lastActions, pattern.actions.slice(0, -1));

      if (matches) {
        return {
          predictedAction: pattern.actions[pattern.actions.length - 1],
          confidence: pattern.confidence,
          basedOnPattern: pattern.patternId,
          timeHorizon: 300000, // 5 minutes
          context: {
            recentActions: lastActions,
            pattern: pattern.actions
          }
        };
      }
    }

    return null;
  }

  /**
   * Filter actions within the configured time window
   */
  private filterRecentActions(actions: UserAction[]): UserAction[] {
    const cutoffTime = Date.now() - this.config.timeWindow;
    return actions.filter(action => action.timestamp > cutoffTime);
  }

  /**
   * Generate all possible sequences of given length
   */
  private generateSequences(actionTypes: string[], length: number): string[][] {
    const sequences: string[][] = [];

    for (let i = 0; i <= actionTypes.length - length; i++) {
      sequences.push(actionTypes.slice(i, i + length));
    }

    return sequences;
  }

  /**
   * Find sequences that occur frequently enough
   */
  private findFrequentSequences(sequences: string[][], actions: UserAction[]): string[][] {
    const frequencyMap = new Map<string, number>();

    for (const sequence of sequences) {
      const key = sequence.join(',');
      const count = frequencyMap.get(key) || 0;
      frequencyMap.set(key, count + 1);
    }

    const frequent: string[][] = [];
    for (const [key, count] of frequencyMap.entries()) {
      if (count >= this.config.minSupport) {
        frequent.push(key.split(','));
      }
    }

    return frequent;
  }

  /**
   * Calculate confidence for a sequence
   */
  private calculateSequenceConfidence(sequence: string[], actions: UserAction[]): number {
    const prefix = sequence.slice(0, -1);
    const target = sequence[sequence.length - 1];

    const prefixCount = this.countSequenceOccurrences(prefix, actions);
    const fullCount = this.countSequenceOccurrences(sequence, actions);

    return prefixCount > 0 ? fullCount / prefixCount : 0;
  }

  /**
   * Count occurrences of a sequence in actions
   */
  private countSequenceOccurrences(sequence: string[], actions: UserAction[]): number {
    const actionTypes = actions.map(a => a.actionType);
    let count = 0;

    for (let i = 0; i <= actionTypes.length - sequence.length; i++) {
      if (this.sequencesMatch(actionTypes.slice(i, i + sequence.length), sequence)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if two sequences match
   */
  private sequencesMatch(seq1: string[], seq2: string[]): boolean {
    if (seq1.length !== seq2.length) return false;
    return seq1.every((action, index) => action === seq2[index]);
  }

  /**
   * Calculate support for a sequence
   */
  private calculateSupport(sequence: string[], actions: UserAction[]): number {
    return this.countSequenceOccurrences(sequence, actions) / actions.length;
  }

  /**
   * Analyze daily activity patterns
   */
  private analyzeDailyPatterns(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const hourlyActivity = new Array(24).fill(0);

    actions.forEach(action => {
      const hour = new Date(action.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    // Find peak hours
    const maxActivity = Math.max(...hourlyActivity);
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count > maxActivity * 0.7)
      .sort((a, b) => b.count - a.count);

    if (peakHours.length > 0) {
      patterns.push({
        patternId: `daily_peak_${Date.now()}`,
        patternType: 'temporal',
        actions: [`activity_peak_hour_${peakHours[0].hour}`],
        confidence: peakHours[0].count / actions.length,
        frequency: peakHours[0].count,
        lastObserved: actions[actions.length - 1].timestamp,
        metadata: {
          peakHours: peakHours.map(p => p.hour),
          activityDistribution: hourlyActivity,
          discovered: true
        }
      });
    }

    return patterns;
  }

  /**
   * Analyze session-based patterns
   */
  private analyzeSessionPatterns(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    const sessions = this.groupActionsIntoSessions(actions);

    if (sessions.length > 1) {
      // Analyze session length patterns
      const sessionLengths = sessions.map(s => s.length);
      const avgSessionLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;

      patterns.push({
        patternId: `session_length_${Date.now()}`,
        patternType: 'temporal',
        actions: ['session_activity'],
        confidence: 0.8, // High confidence for session analysis
        frequency: sessions.length,
        lastObserved: actions[actions.length - 1].timestamp,
        metadata: {
          avgSessionLength,
          totalSessions: sessions.length,
          sessionLengths,
          discovered: true
        }
      });
    }

    return patterns;
  }

  /**
   * Analyze peak activity patterns
   */
  private analyzePeakActivityPatterns(actions: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];

    // Analyze action frequency over time
    const timeWindows = this.createTimeWindows(actions, 60 * 60 * 1000); // 1-hour windows

    for (const window of timeWindows) {
      if (window.actions.length > 10) { // High activity threshold
        patterns.push({
          patternId: `peak_activity_${window.startTime}_${Date.now()}`,
          patternType: 'temporal',
          actions: ['high_activity_period'],
          confidence: window.actions.length / actions.length,
          frequency: window.actions.length,
          lastObserved: window.endTime,
          metadata: {
            windowStart: window.startTime,
            windowEnd: window.endTime,
            actionCount: window.actions.length,
            discovered: true
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Group actions into sessions based on time gaps
   */
  private groupActionsIntoSessions(actions: UserAction[]): UserAction[][] {
    const sessions: UserAction[][] = [];
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    let currentSession: UserAction[] = [];

    for (const action of actions) {
      if (currentSession.length === 0) {
        currentSession.push(action);
      } else {
        const timeGap = action.timestamp - currentSession[currentSession.length - 1].timestamp;
        if (timeGap < sessionTimeout) {
          currentSession.push(action);
        } else {
          sessions.push(currentSession);
          currentSession = [action];
        }
      }
    }

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  /**
   * Create time windows for analysis
   */
  private createTimeWindows(actions: UserAction[], windowSize: number): Array<{startTime: number, endTime: number, actions: UserAction[]}> {
    if (actions.length === 0) return [];

    const windows: Array<{startTime: number, endTime: number, actions: UserAction[]}> = [];
    const startTime = actions[0].timestamp;
    const endTime = actions[actions.length - 1].timestamp;

    for (let time = startTime; time < endTime; time += windowSize) {
      const windowEnd = time + windowSize;
      const windowActions = actions.filter(a => a.timestamp >= time && a.timestamp < windowEnd);

      windows.push({
        startTime: time,
        endTime: windowEnd,
        actions: windowActions
      });
    }

    return windows;
  }

  /**
   * Cluster actions using simple distance-based clustering
   */
  private clusterActions(actions: UserAction[]): Array<{id: string, actions: UserAction[], centroid: number[], coherence: number, frequency: number, lastObserved: number}> {
    const clusters: Array<{id: string, actions: UserAction[], centroid: number[], coherence: number, frequency: number, lastObserved: number}> = [];

    // Simple clustering based on action timing and type similarity
    const processed = new Set<string>();

    for (let i = 0; i < actions.length; i++) {
      if (processed.has(actions[i].actionId)) continue;

      const cluster = {
        id: `cluster_${i}`,
        actions: [actions[i]],
        centroid: [actions[i].timestamp],
        coherence: 1.0,
        frequency: 1,
        lastObserved: actions[i].timestamp
      };

      processed.add(actions[i].actionId);

      // Find similar actions within time window
      for (let j = i + 1; j < actions.length; j++) {
        if (processed.has(actions[j].actionId)) continue;

        const timeDiff = Math.abs(actions[j].timestamp - actions[i].timestamp);
        const typeSimilarity = actions[j].actionType === actions[i].actionType ? 1 : 0;

        if (timeDiff < 60 * 60 * 1000 && typeSimilarity > 0) { // Within 1 hour and same type
          cluster.actions.push(actions[j]);
          cluster.centroid.push(actions[j].timestamp);
          cluster.frequency++;
          cluster.lastObserved = Math.max(cluster.lastObserved, actions[j].timestamp);
          processed.add(actions[j].actionId);
        }
      }

      // Calculate centroid
      cluster.centroid = [cluster.centroid.reduce((a, b) => a + b, 0) / cluster.centroid.length];

      // Calculate coherence (inverse of variance)
      const variance = cluster.actions.reduce((sum, action) => {
        return sum + Math.pow(action.timestamp - cluster.centroid[0], 2);
      }, 0) / cluster.actions.length;
      cluster.coherence = variance > 0 ? 1 / (1 + variance / (60 * 60 * 1000)) : 1.0;

      if (cluster.actions.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Calculate overall confidence for pattern analysis
   */
  private calculateOverallConfidence(patterns: BehavioralPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0);
    return totalConfidence / patterns.length;
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): BehavioralPattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Get all patterns for a user
   */
  getUserPatterns(userId: string): BehavioralPattern[] {
    return Array.from(this.patterns.values()).filter(pattern =>
      pattern.metadata?.userId === userId
    );
  }

  /**
   * Update pattern analysis configuration
   */
  updateConfig(newConfig: Partial<PatternConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear cache when config changes
    this.analysisCache.clear();
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Get analysis statistics
   */
  getStats(): {
    totalPatterns: number;
    cachedAnalyses: number;
    config: PatternConfig;
  } {
    return {
      totalPatterns: this.patterns.size,
      cachedAnalyses: this.analysisCache.size,
      config: { ...this.config }
    };
  }
}