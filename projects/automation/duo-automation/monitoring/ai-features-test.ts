#!/usr/bin/env bun

/**
 * AI Features Test for Enhanced Matrix System
 */

import { MatrixConnectionManager } from './src/@core/enhanced-matrix-system.ts';

async function testAIFeatures() {
  console.info('🤖 AI Features Test');
  console.info('='.repeat(40));
  
  const manager = new MatrixConnectionManager();
  
  // Create a mock ENTERPRISE scope with AI enabled
  const mockEnterpriseScope = {
    servingDomain: 'test.enterprise.com',
    detectedScope: 'ENTERPRISE' as const,
    platform: 'macOS' as const,
    storagePathPrefix: 'enterprise/',
    secretsBackend: 'Test Backend',
    serviceNameFormat: 'test-enterprise-service',
    secretsFlag: 'TEST_FLAG',
    bunRuntimeTZ: 'UTC',
    bunTestTZ: 'UTC',
    
    connectionConfig: {
      maxConnections: 10,
      keepAlive: true,
      timeout: 15000,
      preloadCookies: true,
      enableVerbose: false,
      retryAttempts: 3,
      preconnectDomains: ['api.test.enterprise.com']
    },
    
    featureFlags: ['TEST_ENTERPRISE', 'AI_ANALYTICS'],
    bunAPIs: ['Bun.fetch', 'Bun.serve'],
    strategy: 'Test strategy',
    benefits: ['Test benefit'],
    
    aiAnalytics: {
      predictiveScaling: true,
      anomalyDetection: true,
      performanceOptimization: true,
      securityThreatDetection: true
    },
    
    mlModels: [
      {
        name: 'TestPerformancePredictor',
        accuracy: 0.95,
        lastTrained: new Date(),
        predictionType: 'performance' as const
      }
    ],
    
    realTimeMetrics: {
      enabled: true,
      collectionInterval: 5000,
      retentionPeriod: 86400000,
      alertThresholds: {
        responseTime: 1000,
        errorRate: 0.05
      }
    },
    
    statsEnabled: true,
    dataPersistence: 'audit' as const,
    cliCommands: ['test', 'ai-test']
  };
  
  try {
    // Manually set the current scope for testing
    (manager as any).currentScope = mockEnterpriseScope;
    
    // Initialize AI analytics
    manager['ecosystem'].initializeAI(mockEnterpriseScope);
    
    console.info('✅ AI Analytics initialized');
    
    // Test AI prediction
    console.info('\n🔮 Testing AI Prediction...');
    const prediction = await manager['ecosystem'].getAIPrediction('performance');
    
    if (prediction) {
      console.info('🤖 AI Prediction Results:');
      console.info(`  Model: ${prediction.model}`);
      console.info(`  Type: ${prediction.predictionType}`);
      console.info(`  Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
      console.info(`  Risk Level: ${prediction.prediction.riskLevel}`);
      console.info(`  Expected Response Time: ${prediction.prediction.expectedResponseTime.toFixed(2)}ms`);
      console.info(`  Recommended Connections: ${prediction.prediction.recommendedConnections}`);
    } else {
      console.info('❌ No prediction available');
    }
    
    // Test anomaly detection
    console.info('\n🚨 Testing Anomaly Detection...');
    const anomalies = await manager['ecosystem'].getAIAnomalies();
    
    if (anomalies.length > 0) {
      console.info(`Found ${anomalies.length} anomalies:`);
      anomalies.forEach((alert, index) => {
        console.info(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`);
      });
    } else {
      console.info('✅ No anomalies detected');
    }
    
    // Test optimization
    console.info('\n⚡ Testing Connection Optimization...');
    const optimization = await manager['ecosystem'].getAIOptimizations(mockEnterpriseScope);
    
    console.info('AI Optimization Recommendations:');
    optimization.recommendations.forEach(rec => {
      console.info(`  • ${rec}`);
    });
    
    console.info('\nOptimized Configuration:');
    console.info(JSON.stringify(optimization.optimizedConfig, null, 2));
    
    console.info('\n🎉 AI Features Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (import.meta.main) {
  testAIFeatures().catch(console.error);
}

export { testAIFeatures };
