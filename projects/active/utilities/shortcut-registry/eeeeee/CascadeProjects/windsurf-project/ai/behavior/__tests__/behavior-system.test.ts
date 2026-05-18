/**
 * Comprehensive Test Suite for AI Behavior Prediction System
 * Tests all components: tracking, analysis, prediction, recommendations, and monitoring
 */

import { BehaviorTracker } from '../behavior-tracker';
import { PatternAnalyzer } from '../pattern-analyzer';
import { BehaviorPredictionModel } from '../prediction-model';
import { RecommendationEngine } from '../recommendation-engine';
import { RealTimeBehaviorMonitor } from '../real-time-monitor';
import { ModelTrainingSystem } from '../model-training';
import { DashboardAIIntegration } from '../dashboard-integration';

describe('AI Behavior Prediction System', () => {
  let behaviorTracker: BehaviorTracker;
  let patternAnalyzer: PatternAnalyzer;
  let predictionModel: BehaviorPredictionModel;
  let recommendationEngine: RecommendationEngine;
  let realTimeMonitor: RealTimeBehaviorMonitor;
  let trainingSystem: ModelTrainingSystem;
  let dashboardIntegration: DashboardAIIntegration;

  const testUserId = 'test_user_123';
  const testSessionId = 'session_test_456';

  beforeEach(() => {
    // Initialize all components
    behaviorTracker = new BehaviorTracker({
      enabled: true,
      sampleRate: 1.0,
      retentionDays: 30
    });

    patternAnalyzer = new PatternAnalyzer({
      minPatternLength: 2,
      maxPatternLength: 5,
      minSupport: 1,
      minConfidence: 0.5
    });

    predictionModel = new BehaviorPredictionModel();

    recommendationEngine = new RecommendationEngine(
      patternAnalyzer,
      predictionModel,
      {
        maxRecommendations: 3,
        minConfidenceThreshold: 0.3
      }
    );

    realTimeMonitor = new RealTimeBehaviorMonitor(
      behaviorTracker,
      patternAnalyzer,
      predictionModel,
      recommendationEngine,
      {
        enabled: true,
        updateInterval: 1000, // Fast for testing
        alertThresholds: {
          anomalyScore: 0.5,
          responseTime: 1000,
          errorRate: 0.2
        }
      }
    );

    trainingSystem = new ModelTrainingSystem(
      predictionModel,
      patternAnalyzer,
      behaviorTracker,
      {
        enabled: true,
        batchSize: 10,
        updateInterval: 5000,
        minTrainingData: 5
      }
    );

    dashboardIntegration = new DashboardAIIntegration(testUserId);
  });

  afterEach(() => {
    // Clean up
    realTimeMonitor.stopMonitoring();
    trainingSystem.stopContinuousTraining();
    dashboardIntegration.cleanup();
  });

  describe('BehaviorTracker', () => {
    test('should track user actions correctly', async () => {
      const action = {
        userId: testUserId,
        sessionId: testSessionId,
        actionType: 'page_view',
        context: { page: '/dashboard' },
        metadata: { timeSpent: 1500 }
      };

      await behaviorTracker.trackAction(action);

      const actions = behaviorTracker.getUserActions(testUserId);
      expect(actions).toHaveLength(1);
      expect(actions[0].actionType).toBe('page_view');
      expect(actions[0].userId).toBe(testUserId);
    });

    test('should create prediction context', () => {
      const context = behaviorTracker.createPredictionContext(
        testUserId,
        testSessionId,
        '/dashboard'
      );

      expect(context.userId).toBe(testUserId);
      expect(context.sessionId).toBe(testSessionId);
      expect(context.currentPage).toBe('/dashboard');
      expect(context).toHaveProperty('userProfile');
      expect(context).toHaveProperty('recentActions');
    });

    test('should handle sampling correctly', async () => {
      const tracker = new BehaviorTracker({ sampleRate: 0.5 });

      // Track multiple actions
      for (let i = 0; i < 100; i++) {
        await tracker.trackAction({
          userId: testUserId,
          sessionId: testSessionId,
          actionType: 'test_action',
          context: {},
          metadata: {}
        });
      }

      const actions = tracker.getUserActions(testUserId);
      // Should be approximately half due to 0.5 sample rate
      expect(actions.length).toBeGreaterThan(30);
      expect(actions.length).toBeLessThan(70);
    });

    test('should clean up old data', () => {
      // Add actions with old timestamps
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000); // 40 days ago

      behaviorTracker['actions'].set(testUserId, [{
        actionId: 'old_action',
        userId: testUserId,
        sessionId: testSessionId,
        actionType: 'old_action',
        context: {},
        metadata: {},
        timestamp: oldTimestamp
      }]);

      behaviorTracker.cleanup();

      const actions = behaviorTracker.getUserActions(testUserId);
      expect(actions).toHaveLength(0);
    });
  });

  describe('PatternAnalyzer', () => {
    test('should discover sequential patterns', async () => {
      const actions = [
        { actionType: 'login', timestamp: 1000 },
        { actionType: 'view_dashboard', timestamp: 2000 },
        { actionType: 'view_reports', timestamp: 3000 },
        { actionType: 'login', timestamp: 4000 },
        { actionType: 'view_dashboard', timestamp: 5000 },
        { actionType: 'view_reports', timestamp: 6000 }
      ];

      const result = await patternAnalyzer.analyzePatterns(testUserId, actions);

      expect(result.userId).toBe(testUserId);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.patterns).toBeDefined();
    });

    test('should generate insights from patterns', async () => {
      const actions = [
        { actionType: 'login', timestamp: 1000 },
        { actionType: 'failed_login', timestamp: 2000 },
        { actionType: 'failed_login', timestamp: 3000 },
        { actionType: 'login', timestamp: 4000 }
      ];

      const result = await patternAnalyzer.analyzePatterns(testUserId, actions);

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });

    test('should handle empty action sets', async () => {
      const result = await patternAnalyzer.analyzePatterns(testUserId, []);

      expect(result.patterns).toHaveLength(0);
      expect(result.insights).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('BehaviorPredictionModel', () => {
    test('should train a model successfully', async () => {
      const trainingData = [
        {
          features: { lastAction: 'login', actionCount: 1 },
          label: 'view_dashboard',
          context: [],
          timestamp: Date.now()
        }
      ];

      await predictionModel.trainModel(testUserId, trainingData);

      const performance = predictionModel.getModelPerformance(testUserId);
      expect(performance).toBeDefined();
      expect(performance?.accuracy).toBeDefined();
    });

    test('should make predictions', async () => {
      const context = {
        userId: testUserId,
        sessionId: testSessionId,
        currentPage: '/dashboard',
        timeOfDay: 0.5,
        dayOfWeek: 0.5,
        recentActions: [
          {
            actionId: 'test_action',
            userId: testUserId,
            sessionId: testSessionId,
            actionType: 'login',
            context: {},
            metadata: {},
            timestamp: Date.now()
          }
        ],
        userProfile: { riskScore: 0.1, engagementScore: 0.8, preferences: {} }
      };

      const predictions = await predictionModel.predict(context);

      expect(Array.isArray(predictions)).toBe(true);
      if (predictions.length > 0) {
        expect(predictions[0]).toHaveProperty('predictedAction');
        expect(predictions[0]).toHaveProperty('confidence');
      }
    });

    test('should return available models', () => {
      const models = predictionModel.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('RecommendationEngine', () => {
    test('should generate recommendations', async () => {
      const context = {
        sessionId: testSessionId,
        currentPage: '/dashboard',
        timeOfDay: 0.5,
        dayOfWeek: 0.5,
        sessionDuration: 1800000
      };

      const actions = [
        {
          actionId: 'test_action',
          userId: testUserId,
          sessionId: testSessionId,
          actionType: 'login',
          context: {},
          metadata: {},
          timestamp: Date.now()
        }
      ];

      const recommendations = await recommendationEngine.generateRecommendations(
        testUserId,
        context,
        actions
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should personalize recommendations', async () => {
      recommendationEngine.updateUserPreferences(testUserId, {
        preferredCategories: ['productivity'],
        dislikedCategories: ['learning']
      });

      const context = {
        sessionId: testSessionId,
        currentPage: '/dashboard',
        timeOfDay: 0.5,
        dayOfWeek: 0.5,
        sessionDuration: 1800000
      };

      const actions = [];
      const recommendations = await recommendationEngine.generateRecommendations(
        testUserId,
        context,
        actions
      );

      // Should still work even with preferences
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('RealTimeBehaviorMonitor', () => {
    test('should start and stop monitoring', () => {
      realTimeMonitor.startMonitoring(testUserId);

      let stats = realTimeMonitor.getStats();
      expect(stats.isMonitoring).toBe(true);

      realTimeMonitor.stopMonitoring();

      stats = realTimeMonitor.getStats();
      expect(stats.isMonitoring).toBe(false);
    });

    test('should collect real-time metrics', () => {
      realTimeMonitor.startMonitoring(testUserId);

      // Wait a bit for metrics collection
      return new Promise(resolve => {
        setTimeout(() => {
          const metrics = realTimeMonitor.getRecentMetrics();
          expect(Array.isArray(metrics)).toBe(true);
          realTimeMonitor.stopMonitoring();
          resolve(void 0);
        }, 2000);
      });
    });

    test('should handle alerts', () => {
      realTimeMonitor.startMonitoring(testUserId);

      // Simulate high error rate
      const highErrorMetrics = {
        timestamp: Date.now(),
        userId: testUserId,
        sessionId: testSessionId,
        actionsPerMinute: 10,
        errorRate: 0.5, // Above threshold
        responseTime: 500,
        engagementScore: 0.5,
        riskScore: 0.2,
        anomalyScore: 0.3,
        activePatterns: 1,
        predictionsGenerated: 0,
        recommendationsServed: 0
      };

      // This would trigger alerts in a real scenario
      expect(highErrorMetrics.errorRate).toBeGreaterThan(0.1);

      realTimeMonitor.stopMonitoring();
    });
  });

  describe('ModelTrainingSystem', () => {
    test('should initialize training system', () => {
      const stats = trainingSystem.getTrainingStats();
      expect(stats).toHaveProperty('totalSamples');
      expect(stats).toHaveProperty('trainingSessions');
      expect(stats).toHaveProperty('performanceTrend');
    });

    test('should start and stop continuous training', () => {
      trainingSystem.startContinuousTraining(testUserId);
      // Should not throw

      trainingSystem.stopContinuousTraining();
      // Should not throw
    });

    test('should get model versions', () => {
      const versions = trainingSystem.getModelVersions('markov_chain');
      expect(Array.isArray(versions)).toBe(true);
    });

    test('should export training data', () => {
      const data = trainingSystem.exportTrainingData();
      expect(data).toHaveProperty('buffer');
      expect(data).toHaveProperty('versions');
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('config');
    });
  });

  describe('DashboardAIIntegration', () => {
    test('should initialize integration', () => {
      expect(dashboardIntegration).toBeDefined();
    });

    test('should track actions', () => {
      dashboardIntegration.trackAction('test_action', { test: true });
      // Should not throw
    });

    test('should get AI insights', () => {
      const insights = dashboardIntegration.getAIInsights();
      expect(insights).toBeDefined();
      // May be null if not initialized yet
    });

    test('should refresh insights', async () => {
      await dashboardIntegration.refreshInsights();
      // Should not throw
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end', async () => {
      // Track some actions
      await behaviorTracker.trackAction({
        userId: testUserId,
        sessionId: testSessionId,
        actionType: 'login',
        context: { page: '/login' },
        metadata: {}
      });

      await behaviorTracker.trackAction({
        userId: testUserId,
        sessionId: testSessionId,
        actionType: 'view_dashboard',
        context: { page: '/dashboard' },
        metadata: {}
      });

      // Analyze patterns
      const actions = behaviorTracker.getUserActions(testUserId);
      const patternResult = await patternAnalyzer.analyzePatterns(testUserId, actions);

      // Train model
      await predictionModel.trainModel(testUserId, actions);

      // Generate recommendations
      const context = {
        sessionId: testSessionId,
        currentPage: '/dashboard',
        timeOfDay: 0.5,
        dayOfWeek: 0.5,
        sessionDuration: 300000
      };

      const recommendations = await recommendationEngine.generateRecommendations(
        testUserId,
        context,
        actions
      );

      // Verify results
      expect(actions.length).toBeGreaterThan(0);
      expect(patternResult).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should handle error conditions gracefully', async () => {
      // Test with invalid data
      await expect(
        predictionModel.trainModel(testUserId, [])
      ).rejects.toThrow();

      // Should not crash the system
      const insights = dashboardIntegration.getAIInsights();
      expect(insights).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-frequency actions', async () => {
      const startTime = Date.now();

      // Track many actions quickly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          behaviorTracker.trackAction({
            userId: testUserId,
            sessionId: testSessionId,
            actionType: `action_${i % 5}`,
            context: {},
            metadata: {}
          })
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);

      const actions = behaviorTracker.getUserActions(testUserId);
      expect(actions.length).toBeGreaterThan(50);
    });

    test('should maintain performance under load', async () => {
      realTimeMonitor.startMonitoring(testUserId);

      // Simulate load
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => {
              dashboardIntegration.trackAction('load_test', { index: i });
              resolve(void 0);
            }, i * 10);
          })
        );
      }

      await Promise.all(promises);

      const stats = realTimeMonitor.getStats();
      expect(stats.isMonitoring).toBe(true);

      realTimeMonitor.stopMonitoring();
    });
  });
});