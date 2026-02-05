// packages/odds-core/src/tests/phase2-11-analytics.test.ts - Phase 2.11 Analytics Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PredictiveAnalyticsEngine } from '../utils/predictive-analytics';
import { SmartNotificationsEngine } from '../utils/smart-notifications';
import { 
  QualityForecast,
  TrendPrediction,
  DataInsight,
  SmartAlert,
  Recommendation,
  AnalyticsConfig
} from '../types/analytics';
import { 
  RealtimeMetadata, 
  RealtimeMarketUpdate 
} from '../types/realtime';

describe('Phase 2.11 - Advanced Analytics & Intelligence', () => {

  describe('PredictiveAnalyticsEngine', () => {
    let analyticsEngine: PredictiveAnalyticsEngine;
    let config: AnalyticsConfig;

    beforeEach(() => {
      config = {
        predictionHorizon: 30,
        anomalySensitivity: 0.7,
        alertThresholds: {
          quality: 0.8,
          latency: 50,
          errorRate: 0.05,
          memoryUsage: 80,
          cpuUsage: 80,
          anomalyScore: 0.8
        },
        optimizationEnabled: true,
        adaptationEnabled: true,
        learningRate: 0.01
      };
      analyticsEngine = new PredictiveAnalyticsEngine(config);
    });

    afterEach(async () => {
      if (analyticsEngine) {
        await analyticsEngine.stop();
      }
    });

    test('should initialize with correct configuration', () => {
      expect(analyticsEngine).toBeDefined();
      
      const metrics = analyticsEngine.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('predictions');
      expect(metrics).toHaveProperty('anomalies');
      expect(metrics).toHaveProperty('optimizations');
      expect(metrics).toHaveProperty('alerts');
    });

    test('should handle engine lifecycle', async () => {
      await analyticsEngine.start();
      expect(analyticsEngine).toBeDefined();

      const metrics = analyticsEngine.getMetrics();
      expect(metrics).toBeDefined();

      await analyticsEngine.stop();
    });

    test('should predict quality forecast', async () => {
      await analyticsEngine.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const forecast = await analyticsEngine.predictQuality(metadata);
      
      expect(forecast).toBeDefined();
      expect(forecast).toHaveProperty('predictedQuality');
      expect(forecast).toHaveProperty('timeHorizon');
      expect(forecast).toHaveProperty('confidence');
      expect(forecast).toHaveProperty('factors');
      expect(forecast).toHaveProperty('trend');
      expect(forecast).toHaveProperty('accuracy');

      expect(typeof forecast.predictedQuality).toBe('number');
      expect(typeof forecast.confidence).toBe('number');
      expect(Array.isArray(forecast.factors)).toBe(true);
      expect(['improving', 'stable', 'declining']).toContain(forecast.trend);

      await analyticsEngine.stop();
    });

    test('should predict trends for metrics', async () => {
      await analyticsEngine.start();

      const prediction = await analyticsEngine.predictTrend('BTC/USD', 'quality', 30);
      
      expect(prediction).toBeDefined();
      expect(prediction).toHaveProperty('metric');
      expect(prediction).toHaveProperty('currentValue');
      expect(prediction).toHaveProperty('predictedValue');
      expect(prediction).toHaveProperty('timeHorizon');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('pattern');
      expect(prediction).toHaveProperty('seasonality');

      expect(prediction.metric).toBe('quality');
      expect(typeof prediction.predictedValue).toBe('number');
      expect(typeof prediction.confidence).toBe('number');

      await analyticsEngine.stop();
    });

    test('should detect anomalies', async () => {
      await analyticsEngine.start();

      const normalMetadata: RealtimeMetadata = {
        id: 'normal_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const anomalyScore = await analyticsEngine.detectAnomalies(normalMetadata);
      expect(typeof anomalyScore).toBe('number');
      expect(anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalyScore).toBeLessThanOrEqual(1);

      await analyticsEngine.stop();
    });

    test('should update models with actual results', async () => {
      await analyticsEngine.start();

      const predicted: QualityForecast = {
        predictedQuality: 0.85,
        timeHorizon: 30,
        confidence: 0.8,
        factors: [],
        trend: 'stable',
        accuracy: 0.8
      };

      const actual = { 
        overall: 0.87, 
        completeness: 0.9, 
        accuracy: 0.85, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      };

      await analyticsEngine.updateModel('test_symbol', predicted, actual);
      
      const metrics = analyticsEngine.getMetrics();
      expect(metrics.predictions.total).toBeGreaterThanOrEqual(0);

      await analyticsEngine.stop();
    });

    test('should track metrics correctly', async () => {
      await analyticsEngine.start();

      const initialMetrics = analyticsEngine.getMetrics();
      expect(initialMetrics.predictions.total).toBe(0);

      // Make some predictions to update metrics
      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      await analyticsEngine.predictQuality(metadata);
      
      const finalMetrics = analyticsEngine.getMetrics();
      expect(finalMetrics.predictions.total).toBeGreaterThan(0);

      await analyticsEngine.stop();
    });
  });

  describe('SmartNotificationsEngine', () => {
    let notificationsEngine: SmartNotificationsEngine;
    let config: AnalyticsConfig;

    beforeEach(() => {
      config = {
        predictionHorizon: 30,
        anomalySensitivity: 0.7,
        alertThresholds: {
          quality: 0.8,
          latency: 50,
          errorRate: 0.05,
          memoryUsage: 80,
          cpuUsage: 80,
          anomalyScore: 0.8
        },
        optimizationEnabled: true,
        adaptationEnabled: true,
        learningRate: 0.01
      };
      notificationsEngine = new SmartNotificationsEngine(config);
    });

    afterEach(async () => {
      if (notificationsEngine) {
        await notificationsEngine.stop();
      }
    });

    test('should initialize with correct configuration', () => {
      expect(notificationsEngine).toBeDefined();
      
      const insights = notificationsEngine.getInsights();
      const alerts = notificationsEngine.getAlerts();
      const recommendations = notificationsEngine.getRecommendations();
      
      expect(Array.isArray(insights)).toBe(true);
      expect(Array.isArray(alerts)).toBe(true);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should handle engine lifecycle', async () => {
      await notificationsEngine.start();
      expect(notificationsEngine).toBeDefined();

      await notificationsEngine.stop();
    });

    test('should process metadata and generate insights', async () => {
      await notificationsEngine.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.96, 
          completeness: 0.98, 
          accuracy: 0.95, 
          freshness: 0.99, 
          consistency: 0.96, 
          validity: 0.98 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 5,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(metadata);
      
      expect(results).toHaveProperty('insights');
      expect(results).toHaveProperty('alerts');
      expect(results).toHaveProperty('recommendations');

      expect(Array.isArray(results.insights)).toBe(true);
      expect(Array.isArray(results.alerts)).toBe(true);
      expect(Array.isArray(results.recommendations)).toBe(true);

      // Should generate insights for high quality
      expect(results.insights.length).toBeGreaterThan(0);
      expect(results.insights[0]).toHaveProperty('type');
      expect(results.insights[0]).toHaveProperty('title');
      expect(results.insights[0]).toHaveProperty('impact');

      await notificationsEngine.stop();
    });

    test('should generate alerts for low quality', async () => {
      await notificationsEngine.start();

      const lowQualityMetadata: RealtimeMetadata = {
        id: 'low_quality_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.65, 
          completeness: 0.7, 
          accuracy: 0.6, 
          freshness: 0.7, 
          consistency: 0.65, 
          validity: 0.7 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(lowQualityMetadata);
      
      // Should generate alerts for low quality
      expect(results.alerts.length).toBeGreaterThan(0);
      expect(results.alerts[0]).toHaveProperty('severity');
      expect(results.alerts[0]).toHaveProperty('type');
      expect(results.alerts[0]).toHaveProperty('title');
      expect(results.alerts[0]).toHaveProperty('actions');

      await notificationsEngine.stop();
    });

    test('should generate alerts for high latency', async () => {
      await notificationsEngine.start();

      const highLatencyMetadata: RealtimeMetadata = {
        id: 'high_latency_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 75, // High latency
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(highLatencyMetadata);
      
      // Should generate alerts for high latency
      expect(results.alerts.length).toBeGreaterThan(0);
      expect(results.alerts.some(alert => alert.title.includes('Latency'))).toBe(true);

      await notificationsEngine.stop();
    });

    test('should generate recommendations for optimization', async () => {
      await notificationsEngine.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.75, 
          completeness: 0.8, 
          accuracy: 0.7, 
          freshness: 0.8, 
          consistency: 0.75, 
          validity: 0.8 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 60,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(metadata);
      
      // Should generate recommendations
      expect(results.recommendations.length).toBeGreaterThan(0);
      expect(results.recommendations[0]).toHaveProperty('category');
      expect(results.recommendations[0]).toHaveProperty('priority');
      expect(results.recommendations[0]).toHaveProperty('title');
      expect(results.recommendations[0]).toHaveProperty('implementation');

      await notificationsEngine.stop();
    });

    test('should resolve alerts', async () => {
      await notificationsEngine.start();

      const lowQualityMetadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.65, 
          completeness: 0.7, 
          accuracy: 0.6, 
          freshness: 0.7, 
          consistency: 0.65, 
          validity: 0.7 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(lowQualityMetadata);
      expect(results.alerts.length).toBeGreaterThan(0);

      const alertId = results.alerts[0].id;
      await notificationsEngine.resolveAlert(alertId, 'Test resolution');

      // Alert should be resolved
      const alerts = notificationsEngine.getAlerts();
      const resolvedAlert = alerts.find(alert => alert.id === alertId);
      expect(resolvedAlert?.resolved).toBe(true);

      await notificationsEngine.stop();
    });

    test('should implement recommendations', async () => {
      await notificationsEngine.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.75, 
          completeness: 0.8, 
          accuracy: 0.7, 
          freshness: 0.8, 
          consistency: 0.75, 
          validity: 0.8 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 60,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const results = await notificationsEngine.processMetadata(metadata);
      expect(results.recommendations.length).toBeGreaterThan(0);

      const recommendationId = results.recommendations[0].id;
      await notificationsEngine.implementRecommendation(recommendationId);

      // Recommendation should be removed after implementation
      const recommendations = notificationsEngine.getRecommendations();
      const implementedRec = recommendations.find(rec => rec.id === recommendationId);
      expect(implementedRec).toBeUndefined();

      await notificationsEngine.stop();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should perform analytics within performance targets', async () => {
      const analyticsEngine = new PredictiveAnalyticsEngine();
      await analyticsEngine.start();

      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85, 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const startTime = performance.now();
      const forecast = await analyticsEngine.predictQuality(metadata);
      const processingTime = performance.now() - startTime;

      // Should process analytics in under 100ms
      expect(processingTime).toBeLessThan(100);
      expect(forecast).toBeDefined();

      await analyticsEngine.stop();
    });

    test('should handle batch analytics processing', async () => {
      const notificationsEngine = new SmartNotificationsEngine({
        predictionHorizon: 30,
        anomalySensitivity: 0.7,
        alertThresholds: {
          quality: 0.8,
          latency: 50,
          errorRate: 0.05,
          memoryUsage: 80,
          cpuUsage: 80,
          anomalyScore: 0.8
        },
        optimizationEnabled: true,
        adaptationEnabled: true,
        learningRate: 0.01
      });

      await notificationsEngine.start();

      const metadataList: RealtimeMetadata[] = Array.from({ length: 10 }, (_, i) => ({
        id: `test_metadata_${i}`,
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { 
          overall: 0.85 + (i * 0.01), 
          completeness: 0.9, 
          accuracy: 0.8, 
          freshness: 0.9, 
          consistency: 0.85, 
          validity: 0.9 
        },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: `test_stream_${i}`,
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 25 + (i * 2),
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      }));

      const startTime = performance.now();
      const promises = metadataList.map(metadata => 
        notificationsEngine.processMetadata(metadata)
      );
      const results = await Promise.all(promises);
      const processingTime = performance.now() - startTime;

      expect(results).toHaveLength(10);
      expect(processingTime).toBeLessThan(1000); // Should process 10 items in under 1 second

      results.forEach(result => {
        expect(result).toHaveProperty('insights');
        expect(result).toHaveProperty('alerts');
        expect(result).toHaveProperty('recommendations');
      });

      await notificationsEngine.stop();
    });
  });
});
