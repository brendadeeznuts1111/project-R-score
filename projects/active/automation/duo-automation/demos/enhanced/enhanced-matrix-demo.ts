#!/usr/bin/env bun

/**
 * Enhanced Matrix System Demo
 * Demonstrates AI-powered analytics and ML predictions
 */

import { MatrixConnectionManager, MatrixCLI } from './src/@core/enhanced-matrix-system.ts';

async function demonstrateEnhancedMatrix() {
  console.info('🚀 Enhanced Matrix System Demo');
  console.info('='.repeat(50));
  
  // Initialize the connection manager
  const manager = new MatrixConnectionManager();
  
  try {
    // 1. Detect current scope
    console.info('\n📍 1. Detecting Scope...');
    const scope = await manager.detectScope();
    console.info(`✅ Scope: ${scope.detectedScope}`);
    console.info(`🌐 Domain: ${scope.servingDomain}`);
    console.info(`🖥️ Platform: ${scope.platform}`);
    
    // 2. Show AI capabilities if available
    if (scope.aiAnalytics) {
      console.info('\n🤖 2. AI Analytics Capabilities:');
      Object.entries(scope.aiAnalytics).forEach(([key, value]) => {
        console.info(`   ${value ? '✅' : '❌'} ${key}`);
      });
    }
    
    // 3. Show ML models if available
    if (scope.mlModels && scope.mlModels.length > 0) {
      console.info('\n🧠 3. ML Models:');
      scope.mlModels.forEach(model => {
        console.info(`   • ${model.name} (${model.predictionType}) - ${(model.accuracy * 100).toFixed(1)}% accuracy`);
      });
    }
    
    // 4. Make a test request
    console.info('\n🌐 4. Making Test Request...');
    try {
      const response = await manager.makeScopedRequest('https://httpbin.org/json', {
        saveToData: true
      });
      console.info(`✅ Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.info(`📄 Response Keys: ${Object.keys(data).join(', ')}`);
      }
    } catch (error) {
      console.info(`⚠️ Request failed: ${error.message}`);
    }
    
    // 5. Get scope statistics
    console.info('\n📊 5. Scope Statistics:');
    const stats = manager.getScopeStats();
    console.info(`   Connection Stats: ${stats.connectionStats.length} hosts`);
    console.info(`   Feature Flags: ${stats.featureFlags.length} enabled`);
    console.info(`   CLI Commands: ${stats.availableCLI.length} available`);
    
    // 6. AI Predictions (if available)
    if (scope.aiAnalytics?.predictiveScaling) {
      console.info('\n🔮 6. AI Performance Prediction:');
      try {
        const prediction = await manager['ecosystem'].getAIPrediction('performance');
        if (prediction) {
          console.info(`   Model: ${prediction.model}`);
          console.info(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
          console.info(`   Risk Level: ${prediction.prediction.riskLevel}`);
          console.info(`   Expected Response Time: ${prediction.prediction.expectedResponseTime.toFixed(2)}ms`);
        }
      } catch (error) {
        console.info(`   ⚠️ Prediction failed: ${error.message}`);
      }
    }
    
    // 7. Anomaly Detection (if available)
    if (scope.aiAnalytics?.anomalyDetection) {
      console.info('\n🚨 7. AI Anomaly Detection:');
      try {
        const anomalies = await manager['ecosystem'].getAIAnomalies();
        if (anomalies.length > 0) {
          console.info(`   Found ${anomalies.length} anomalies`);
          anomalies.forEach(alert => {
            console.info(`   • [${alert.severity.toUpperCase()}] ${alert.message}`);
          });
        } else {
          console.info('   ✅ No anomalies detected');
        }
      } catch (error) {
        console.info(`   ⚠️ Anomaly detection failed: ${error.message}`);
      }
    }
    
    console.info('\n🎉 Demo Complete!');
    console.info('\n💡 Try these CLI commands:');
    console.info('   bun run src/@core/enhanced-matrix-system.ts scope detect');
    console.info('   bun run src/@core/enhanced-matrix-system.ts ai predict performance');
    console.info('   bun run src/@core/enhanced-matrix-system.ts ai anomalies');
    console.info('   bun run src/@core/enhanced-matrix-system.ts matrix');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
if (import.meta.main) {
  demonstrateEnhancedMatrix().catch(console.error);
}

export { demonstrateEnhancedMatrix };
