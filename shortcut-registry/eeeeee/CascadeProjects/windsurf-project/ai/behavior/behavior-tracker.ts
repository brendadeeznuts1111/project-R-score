/**
 * Behavior Tracker - Real-time User Behavior Tracking System
 * Tracks and stores user actions for behavior analysis and prediction
 */

import {
  UserAction,
  BehaviorTrackingConfig,
  BehavioralPattern,
  PredictionContext
} from '../types/behavior';

export class BehaviorTracker {
  private actions: Map<string, UserAction[]> = new Map();
  private patterns: Map<string, BehavioralPattern> = new Map();
  // [TYPE][LOCAL][GENERIC_FUNCTION_ARRAY][META:{fix:"Use specific callback types", impact:"medium"}][BehaviorTracker][eventListeners][#REF:TYPE001][BUN-NATIVE]
  private eventListeners: Map<string, Function[]> = new Map();
  private config: BehaviorTrackingConfig = {
    enabled: true,
    sampleRate: 1.0,
    retentionDays: 30,
    realTimeProcessing: true,
    maxActionsPerUser: 1000
  };

  private userSessions: Map<string, UserSession> = new Map();
  private behaviorPatterns: Map<string, BehavioralPattern[]> = new Map();
  private realTimeMetrics: Map<string, RealTimeMetrics> = new Map();
  private eventBuffer: UserAction[] = [];
  private maxBufferSize = 1000;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertThresholds: Map<string, number> = new Map();
  private anomalyDetectors: Map<string, AnomalyDetector> = new Map();

  constructor(config?: Partial<BehaviorTrackingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeTracking();
    this.initializeRealTimeMonitoring();
    this.setupAlertThresholds();
    this.initializeAnomalyDetectors();
  }

  /**
   * Track a user action
   */
  async trackAction(action: Omit<UserAction, 'actionId' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) return;

    // [PERF][LOCAL][HOT_PATH_RANDOM][META:{fix:"Use Bun.randomUUIDv7() seeded approach", impact:"high"}][BehaviorTracker][trackAction][#REF:PERF001][BUN-NATIVE]
    // Sample based on configured rate
    if (Math.random() > this.config.sampleRate) return;

    const userAction: UserAction = {
      ...action,
      actionId: this.generateActionId(),
      timestamp: Date.now()
    };

    // Store action
    const userActions = this.actions.get(action.userId) || [];
    userActions.push(userAction);

    // Keep only recent actions based on retention policy
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    const filteredActions = userActions.filter(a => a.timestamp > cutoffTime);

    this.actions.set(action.userId, filteredActions);

    // Emit tracking event
    this.emitEvent('actionTracked', userAction);

    // Process in real-time if enabled
    if (this.config.realTimeProcessing) {
      await this.processRealTimeAction(userAction);
    }
  }

  /**
   * Get user actions within a time range
   */
  getUserActions(
    userId: string,
    startTime?: number,
    endTime?: number
  ): UserAction[] {
    const userActions = this.actions.get(userId) || [];
    let filtered = userActions;

    if (startTime) {
      filtered = filtered.filter(a => a.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(a => a.timestamp <= endTime);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get recent actions for prediction context
   */
  getRecentActions(userId: string, limit: number = 50): UserAction[] {
    return this.getUserActions(userId).slice(0, limit);
  }

  /**
   * Create prediction context for a user
   */
  createPredictionContext(userId: string, sessionId: string, currentPage: string): PredictionContext {
    const recentActions = this.getRecentActions(userId, 20);
    const now = new Date();

    return {
      userId,
      sessionId,
      currentPage,
      timeOfDay: now.getHours() + now.getMinutes() / 60,
      dayOfWeek: now.getDay(),
      recentActions,
      userProfile: this.calculateUserProfile(userId)
    };
  }

  /**
   * Calculate user profile metrics
   */
  private calculateUserProfile(userId: string): PredictionContext['userProfile'] {
    const actions = this.getUserActions(userId);
    if (actions.length === 0) {
      return { riskScore: 0.5, engagementScore: 0.5, preferences: {} };
    }

    // Calculate engagement score based on action frequency
    const recentActions = actions.filter(a => a.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
    const engagementScore = Math.min(recentActions.length / 100, 1); // Normalize to 0-1

    // Calculate risk score based on suspicious patterns
    const riskIndicators = actions.filter(a =>
      a.actionType.includes('failed') ||
      a.actionType.includes('error') ||
      a.metadata?.suspicious === true
    ).length;
    const riskScore = Math.min(riskIndicators / actions.length, 1);

    // Extract preferences from action metadata
    const preferences: Record<string, any> = {};
    actions.forEach(action => {
      if (action.metadata?.preferences) {
        Object.assign(preferences, action.metadata.preferences);
      }
    });

    return {
      riskScore,
      engagementScore,
      preferences
    };
  }

  /**
   * Process action in real-time for immediate insights
   */
  private async processRealTimeAction(action: UserAction): Promise<void> {
    // Check for immediate pattern matches
    await this.checkImmediatePatterns(action);

    // Update behavior metrics
    this.updateBehaviorMetrics(action);

    // Emit real-time insights
    this.emitEvent('realTimeInsight', {
      userId: action.userId,
      action: action.actionType,
      timestamp: action.timestamp,
      insights: this.generateImmediateInsights(action)
    });
  }

  /**
   * Check for immediate pattern matches
   */
  private async checkImmediatePatterns(action: UserAction): Promise<void> {
    const userPatterns = Array.from(this.patterns.values())
      .filter(p => p.lastObserved > Date.now() - 24 * 60 * 60 * 1000); // Recent patterns

    for (const pattern of userPatterns) {
      if (this.matchesPattern(action, pattern)) {
        this.emitEvent('patternMatch', {
          patternId: pattern.patternId,
          userId: action.userId,
          action: action.actionType,
          confidence: pattern.confidence
        });
      }
    }
  }

  /**
   * Check if action matches a behavioral pattern
   */
  private matchesPattern(action: UserAction, pattern: BehavioralPattern): boolean {
    // Simple sequence matching for now
    if (pattern.patternType === 'sequential') {
      const recentActions = this.getRecentActions(action.userId, pattern.actions.length + 1);
      const recentTypes = recentActions.slice(1).map(a => a.actionType).reverse();

      return pattern.actions.every((actionType, index) =>
        recentTypes[index] === actionType
      );
    }

    return false;
  }

  /**
   * Update behavior metrics
   */
  private updateBehaviorMetrics(action: UserAction): void {
    // Update session metrics, page dwell time, etc.
    // This would be expanded based on specific metrics needed
  }

  /**
   * Generate immediate insights from action
   */
  private generateImmediateInsights(action: UserAction): any {
    return {
      actionType: action.actionType,
      context: action.context,
      timestamp: action.timestamp,
      potentialRisk: this.assessImmediateRisk(action),
      engagement: this.assessEngagement(action)
    };
  }

  /**
   * Assess immediate risk level
   */
  private assessImmediateRisk(action: UserAction): 'low' | 'medium' | 'high' {
    const riskIndicators = [
      action.actionType.includes('login') && action.metadata?.failed,
      action.actionType.includes('transfer') && action.metadata?.largeAmount,
      action.context.device !== 'trusted',
      action.metadata?.unusualLocation
    ];

    const riskCount = riskIndicators.filter(Boolean).length;

    if (riskCount >= 2) return 'high';
    if (riskCount === 1) return 'medium';
    return 'low';
  }

  /**
   * Assess engagement level
   */
  private assessEngagement(action: UserAction): 'low' | 'medium' | 'high' {
    const engagementIndicators = [
      action.actionType.includes('view'),
      action.actionType.includes('interact'),
      action.metadata?.timeSpent > 30, // seconds
      action.context.page.includes('dashboard')
    ];

    const engagementCount = engagementIndicators.filter(Boolean).length;

    if (engagementCount >= 3) return 'high';
    if (engagementCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const filtered = listeners.filter(l => l !== callback);
    this.eventListeners.set(event, filtered);
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Initialize tracking system
   */
  private initializeTracking(): void {
    if (typeof window !== 'undefined') {
      // Browser environment - add DOM event listeners
      this.initializeBrowserTracking();
    }
  }

  /**
   * Initialize browser-based tracking
   */
  private initializeBrowserTracking(): void {
    // [SECURITY][LOCAL][DIRECT_DOM_ACCESS][META:{fix:"Add input sanitization and CSP headers", impact:"medium"}][BehaviorTracker][initializeBrowserTracking][#REF:SEC001][BUN-NATIVE]
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackSystemAction('page_visibility_change', {
        visible: !document.hidden,
        timestamp: Date.now()
      });
    });

    // [SECURITY][LOCAL][DIRECT_DOM_ACCESS][META:{fix:"Add input sanitization and CSP headers", impact:"medium"}][BehaviorTracker][initializeBrowserTracking][#REF:SEC001][BUN-NATIVE]
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackSystemAction('page_unload', {
        timestamp: Date.now()
      });
    });

    // [SECURITY][LOCAL][DIRECT_DOM_ACCESS][META:{fix:"Add input sanitization and CSP headers", impact:"medium"}][BehaviorTracker][initializeBrowserTracking][#REF:SEC001][BUN-NATIVE]
    // Track errors
    window.addEventListener('error', (event) => {
      this.trackSystemAction('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  /**
   * Track system-level actions
   */
  private trackSystemAction(actionType: string, metadata: any): void {
    // System actions don't have a specific user context
    // This would be enhanced with proper user identification
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize real-time monitoring system
   */
  private initializeRealTimeMonitoring(): void {
    // [PERF][LOCAL][MULTIPLE_SETINTERVAL][META:{fix:"Consolidate intervals and use single timer with multiplexing", impact:"high"}][BehaviorTracker][initializeRealTimeMonitoring][#REF:PERF002][BUN-NATIVE]
    // Set up monitoring intervals for different metrics
    this.monitoringIntervals.set('sessionActivity', setInterval(() => {
      this.monitorSessionActivity();
    }, 30000)); // Every 30 seconds

    this.monitoringIntervals.set('behaviorPatterns', setInterval(() => {
      this.monitorBehaviorPatterns();
    }, 60000)); // Every minute

    this.monitoringIntervals.set('anomalyDetection', setInterval(() => {
      this.monitorAnomalies();
    }, 300000)); // Every 5 minutes

    // Set up real-time event processing
    this.setupRealTimeEventProcessing();
  }

  /**
   * Set up alert thresholds for different metrics
   */
  private setupAlertThresholds(): void {
    this.alertThresholds.set('sessionInactivity', 300000); // 5 minutes
    this.alertThresholds.set('unusualActivity', 10); // 10 unusual actions per minute
    this.alertThresholds.set('failedActions', 5); // 5 failed actions per minute
    this.alertThresholds.set('rapidActions', 20); // 20 actions per minute
  }

  /**
   * Initialize anomaly detectors
   */
  private initializeAnomalyDetectors(): void {
    this.anomalyDetectors.set('statistical', new StatisticalAnomalyDetector());
    this.anomalyDetectors.set('behavioral', new BehavioralAnomalyDetector());
    this.anomalyDetectors.set('temporal', new TemporalAnomalyDetector());
  }

  /**
   * Monitor session activity in real-time
   */
  private monitorSessionActivity(): void {
    const now = Date.now();
    const inactivityThreshold = this.alertThresholds.get('sessionInactivity') || 300000;

    for (const [userId, session] of this.userSessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity;
      if (timeSinceLastActivity > inactivityThreshold) {
        this.emitEvent('sessionInactive', {
          userId,
          sessionId: session.sessionId,
          inactiveDuration: timeSinceLastActivity,
          lastActivity: session.lastActivity
        });
      }
    }
  }

  /**
   * Monitor behavior patterns in real-time
   */
  private monitorBehaviorPatterns(): void {
    for (const [userId, patterns] of this.behaviorPatterns.entries()) {
      for (const pattern of patterns) {
        if (this.isPatternActive(pattern)) {
          this.emitEvent('activePattern', {
            userId,
            patternId: pattern.patternId,
            patternType: pattern.patternType,
            confidence: pattern.confidence
          });
        }
      }
    }
  }

  /**
   * Monitor for anomalies in real-time
   */
  private monitorAnomalies(): void {
    for (const [userId, metrics] of this.realTimeMetrics.entries()) {
      for (const [detectorName, detector] of this.anomalyDetectors.entries()) {
        const anomalies = detector.detect(metrics);
        if (anomalies.length > 0) {
          this.emitEvent('anomalyDetected', {
            userId,
            detector: detectorName,
            anomalies,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Set up real-time event processing pipeline
   */
  private setupRealTimeEventProcessing(): void {
    // Process buffered events
    setInterval(() => {
      this.processEventBuffer();
    }, 5000); // Every 5 seconds

    // Update real-time metrics
    setInterval(() => {
      this.updateRealTimeMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Process buffered events
   */
  private processEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Group events by user
    const userEvents = new Map<string, UserAction[]>();
    events.forEach(event => {
      const userEventsList = userEvents.get(event.userId) || [];
      userEventsList.push(event);
      userEvents.set(event.userId, userEventsList);
    });

    // Process events for each user
    for (const [userId, userEventList] of userEvents.entries()) {
      this.processUserEvents(userId, userEventList);
    }
  }

  /**
   * Process events for a specific user
   */
  private processUserEvents(userId: string, events: UserAction[]): void {
    // Update session information
    this.updateUserSession(userId, events);

    // Check for immediate alerts
    this.checkImmediateAlerts(userId, events);

    // Update behavior patterns
    this.updateBehaviorPatterns(userId, events);

    // Emit processed events
    this.emitEvent('eventsProcessed', {
      userId,
      eventCount: events.length,
      timestamp: Date.now()
    });
  }

  /**
   * Update user session information
   */
  private updateUserSession(userId: string, events: UserAction[]): void {
    let session = this.userSessions.get(userId);
    if (!session) {
      session = {
        userId,
        sessionId: `session_${Date.now()}`,
        startTime: events[0].timestamp,
        lastActivity: events[0].timestamp,
        actionCount: 0,
        pageViews: 0,
        duration: 0
      };
    }

    // Update session metrics
    session.lastActivity = Math.max(session.lastActivity, ...events.map(e => e.timestamp));
    session.actionCount += events.length;
    session.pageViews += events.filter(e => e.actionType === 'page_view').length;
    session.duration = session.lastActivity - session.startTime;

    this.userSessions.set(userId, session);
  }

  /**
   * Check for immediate alerts based on events
   */
  private checkImmediateAlerts(userId: string, events: UserAction[]): void {
    const failedActions = events.filter(e => e.actionType.includes('failed')).length;
    const totalActions = events.length;
    const failedRate = failedActions / totalActions;

    if (failedRate > 0.5) { // More than 50% failed actions
      this.emitEvent('alert', {
        userId,
        type: 'high_failure_rate',
        severity: 'high',
        message: `High failure rate detected: ${Math.round(failedRate * 100)}%`,
        timestamp: Date.now()
      });
    }

    // Check for rapid actions (potential automation)
    const timeSpan = events[events.length - 1].timestamp - events[0].timestamp;
    const actionsPerMinute = (totalActions / timeSpan) * 60000;

    if (actionsPerMinute > this.alertThresholds.get('rapidActions')) {
      this.emitEvent('alert', {
        userId,
        type: 'rapid_actions',
        severity: 'medium',
        message: `Unusual activity rate: ${Math.round(actionsPerMinute)} actions/minute`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update behavior patterns based on new events
   */
  private updateBehaviorPatterns(userId: string, events: UserAction[]): void {
    const patterns = this.behaviorPatterns.get(userId) || [];

    // Update existing patterns
    patterns.forEach(pattern => {
      if (this.patternMatchesEvents(pattern, events)) {
        pattern.lastObserved = Date.now();
        pattern.frequency++;
        pattern.confidence = Math.min(1.0, pattern.confidence + 0.1);
      }
    });

    // Look for new patterns
    const newPatterns = this.discoverNewPatterns(events);
    patterns.push(...newPatterns);

    // Keep only recent and relevant patterns
    const recentPatterns = patterns.filter(p =>
      p.lastObserved > Date.now() - 7 * 24 * 60 * 60 * 1000 && // Last 7 days
      p.frequency > 2 // Occurred more than twice
    );

    this.behaviorPatterns.set(userId, recentPatterns);
  }

  /**
   * Check if pattern matches recent events
   */
  private patternMatchesEvents(pattern: BehavioralPattern, events: UserAction[]): boolean {
    if (pattern.patternType === 'sequential') {
      const recentTypes = events.slice(-pattern.actions.length).map(e => e.actionType);
      return pattern.actions.every((action, index) => action === recentTypes[index]);
    }
    return false;
  }

  /**
   * Discover new patterns from events
   */
  private discoverNewPatterns(events: UserAction[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];

    // Simple sequential pattern discovery
    if (events.length >= 3) {
      const sequence = events.slice(-3).map(e => e.actionType);
      const patternId = `seq_${sequence.join('_')}_${Date.now()}`;

      patterns.push({
        patternId,
        patternType: 'sequential',
        actions: sequence,
        confidence: 0.6,
        frequency: 1,
        lastObserved: Date.now(),
        metadata: {
          discovered: true,
          source: 'real_time_monitoring'
        }
      });
    }

    return patterns;
  }

  /**
   * Check if a pattern is currently active
   */
  private isPatternActive(pattern: BehavioralPattern): boolean {
    return pattern.lastObserved > Date.now() - 300000; // Active in last 5 minutes
  }

  /**
   * Update real-time metrics
   */
  private updateRealTimeMetrics(): void {
    for (const [userId, session] of this.userSessions.entries()) {
      const metrics: RealTimeMetrics = {
        userId,
        sessionId: session.sessionId,
        lastActivity: session.lastActivity,
        actionRate: this.calculateActionRate(userId),
        sessionDuration: session.duration,
        currentPage: '', // Would be updated from current page tracking
        deviceInfo: {}, // Would be populated from user agent
        locationInfo: {} // Would be populated from geolocation
      };

      this.realTimeMetrics.set(userId, metrics);
    }
  }

  /**
   * Calculate action rate for user
   */
  private calculateActionRate(userId: string): number {
    const recentActions = this.getUserActions(userId, Date.now() - 60000); // Last minute
    return recentActions.length;
  }

  /**
   * Get real-time metrics for a user
   */
  getRealTimeMetrics(userId: string): RealTimeMetrics | null {
    return this.realTimeMetrics.get(userId) || null;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): UserSession[] {
    const now = Date.now();
    const activeThreshold = 300000; // 5 minutes

    return Array.from(this.userSessions.values()).filter(session =>
      now - session.lastActivity < activeThreshold
    );
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    for (const [name, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
      this.monitoringIntervals.delete(name);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BehaviorTrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): BehaviorTrackingConfig {
    return { ...this.config };
  }

  /**
   * Clear old data based on retention policy
   */
  cleanup(): void {
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    // Clean up old actions
    for (const [userId, actions] of this.actions.entries()) {
      const filtered = actions.filter(a => a.timestamp > cutoffTime);
      if (filtered.length === 0) {
        this.actions.delete(userId);
      } else {
        this.actions.set(userId, filtered);
      }
    }

    // Clean up old patterns
    for (const [patternId, pattern] of this.patterns.entries()) {
      if (pattern.lastObserved < cutoffTime) {
        this.patterns.delete(patternId);
      }
    }

    // Clean up old sessions
    for (const [userId, session] of this.userSessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.userSessions.delete(userId);
      }
    }
  }
}

// Anomaly Detector Interfaces
interface AnomalyDetector {
  detect(metrics: RealTimeMetrics): Anomaly[];
}

class StatisticalAnomalyDetector implements AnomalyDetector {
  private baselineMetrics: Map<string, { mean: number; std: number }> = new Map();

  detect(metrics: RealTimeMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check action rate against baseline
    const actionRateKey = `${metrics.userId}_actionRate`;
    const baseline = this.baselineMetrics.get(actionRateKey);

    if (baseline) {
      const zScore = Math.abs(metrics.actionRate - baseline.mean) / baseline.std;
      if (zScore > 3) { // 3 standard deviations
        anomalies.push({
          type: 'statistical',
          severity: zScore > 5 ? 'high' : 'medium',
          metric: 'actionRate',
          value: metrics.actionRate,
          expected: baseline.mean,
          deviation: zScore,
          timestamp: Date.now()
        });
      }
    }

    // Update baseline
    this.updateBaseline(actionRateKey, metrics.actionRate);

    return anomalies;
  }

  private updateBaseline(key: string, value: number): void {
    const current = this.baselineMetrics.get(key) || { mean: value, std: 0 };
    // Simple moving average update (would be more sophisticated in production)
    current.mean = (current.mean + value) / 2;
    this.baselineMetrics.set(key, current);
  }
}

class BehavioralAnomalyDetector implements AnomalyDetector {
  detect(metrics: RealTimeMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for unusual session duration
    if (metrics.sessionDuration > 8 * 60 * 60 * 1000) { // 8 hours
      anomalies.push({
        type: 'behavioral',
        severity: 'medium',
        metric: 'sessionDuration',
        value: metrics.sessionDuration,
        expected: 4 * 60 * 60 * 1000, // 4 hours expected
        deviation: metrics.sessionDuration / (4 * 60 * 60 * 1000),
        timestamp: Date.now()
      });
    }

    return anomalies;
  }
}

class TemporalAnomalyDetector implements AnomalyDetector {
  detect(metrics: RealTimeMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const hour = new Date().getHours();

    // Check for activity during unusual hours
    if (hour < 6 || hour > 22) { // Outside 6 AM - 10 PM
      anomalies.push({
        type: 'temporal',
        severity: 'low',
        metric: 'activityTime',
        value: hour,
        expected: '6-22',
        deviation: 1,
        timestamp: Date.now()
      });
    }

    return anomalies;
  }
}

// Additional interfaces
interface UserSession {
  userId: string;
  sessionId: string;
  startTime: number;
  lastActivity: number;
  actionCount: number;
  pageViews: number;
  duration: number;
}

interface RealTimeMetrics {
  userId: string;
  sessionId: string;
  lastActivity: number;
  actionRate: number;
  sessionDuration: number;
  currentPage: string;
  deviceInfo: Record<string, any>;
  locationInfo: Record<string, any>;
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  metric: string;
  value: number;
  expected: number | string;
  deviation: number;
  timestamp: number;
}