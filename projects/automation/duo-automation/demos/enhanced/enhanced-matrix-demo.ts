#!/usr/bin/env bun

/**
 * Enhanced Matrix System Demo
 * Demonstrates AI-powered analytics and ML predictions
 */

import { MatrixConnectionManager, MatrixCLI } from './src/@core/enhanced-matrix-system.ts';

async function demonstrateEnhancedMatrix() {
  console.log('🚀 Enhanced Matrix System Demo');
  console.log('='.repeat(50));
  
  // Initialize the connection manager
  const manager = new MatrixConnectionManager();
  
  try {
    // 1. Detect current scope
    console.log('\n📍 1. Detecting Scope...');
    const scope = await manager.detectScope();
    console.log(`✅ Scope: ${scope.detectedScope}`);
    console.log(`🌐 Domain: ${scope.servingDomain}`);
    console.log(`🖥️ Platform: ${scope.platform}`);
    
    // 2. Show AI capabilities if available
    if (scope.aiAnalytics) {
      console.log('\n🤖 2. AI Analytics Capabilities:');
      Object.entries(scope.aiAnalytics).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '❌'} ${key}`);
      });
    }
    
    // 3. Show ML models if available
    if (scope.mlModels && scope.mlModels.length > 0) {
      console.log('\n🧠 3. ML Models:');
      scope.mlModels.forEach(model => {
        console.log(`   • ${model.name} (${model.predictionType}) - ${(model.accuracy * 100).toFixed(1)}% accuracy`);
      });
    }
    
    // 4. Make a test request
    console.log('\n🌐 4. Making Test Request...');
    try {
      const response = await manager.makeScopedRequest('https://httpbin.org/json', {
        saveToData: true
      });
      console.log(`✅ Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📄 Response Keys: ${Object.keys(data).join(', ')}`);
      }
    } catch (error) {
      console.log(`⚠️ Request failed: ${error.message}`);
    }
    
    // 5. Get scope statistics
    console.log('\n📊 5. Scope Statistics:');
    const stats = manager.getScopeStats();
    console.log(`   Connection Stats: ${stats.connectionStats.length} hosts`);
    console.log(`   Feature Flags: ${stats.featureFlags.length} enabled`);
    console.log(`   CLI Commands: ${stats.availableCLI.length} available`);
    
    // 6. AI Predictions (if available)
    if (scope.aiAnalytics?.predictiveScaling) {
      console.log('\n🔮 6. AI Performance Prediction:');
      try {
        const prediction = await manager['ecosystem'].getAIPrediction('performance');
        if (prediction) {
          console.log(`   Model: ${prediction.model}`);
          console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
          console.log(`   Risk Level: ${prediction.prediction.riskLevel}`);
          console.log(`   Expected Response Time: ${prediction.prediction.expectedResponseTime.toFixed(2)}ms`);
        }
      } catch (error) {
        console.log(`   ⚠️ Prediction failed: ${error.message}`);
      }
    }
    
    // 7. Anomaly Detection (if available)
    if (scope.aiAnalytics?.anomalyDetection) {
      console.log('\n🚨 7. AI Anomaly Detection:');
      try {
        const anomalies = await manager['ecosystem'].getAIAnomalies();
        if (anomalies.length > 0) {
          console.log(`   Found ${anomalies.length} anomalies`);
          anomalies.forEach(alert => {
            console.log(`   • [${alert.severity.toUpperCase()}] ${alert.message}`);
          });
        } else {
          console.log('   ✅ No anomalies detected');
        }
      } catch (error) {
        console.log(`   ⚠️ Anomaly detection failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Demo Complete!');
    console.log('\n💡 Try these CLI commands:');
    console.log('   bun run src/@core/enhanced-matrix-system.ts scope detect');
    console.log('   bun run src/@core/enhanced-matrix-system.ts ai predict performance');
    console.log('   bun run src/@core/enhanced-matrix-system.ts ai anomalies');
    console.log('   bun run src/@core/enhanced-matrix-system.ts matrix');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
if (import.meta.main) {
  demonstrateEnhancedMatrix().catch(console.error);
}

export { demonstrateEnhancedMatrix };
