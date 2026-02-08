/**
 * Enhanced Depth Configuration Demo
 * Comprehensive demonstration of intelligent depth management
 */

import {
  DepthOptimizer,
  AdaptiveDepthManager,
  DepthPerformanceAnalyzer,
  DepthExplorer,
  EnvironmentDepthConfig,
  type BenchmarkContext
} from '../src/benchmarking/depth-optimizer';

// Sample data structures for testing
const sampleData = {
  simple: {
    message: "Hello, World!",
    count: 42,
    active: true
  },
  
  moderate: {
    user: {
      id: "user_123",
      profile: {
        name: "John Doe",
        email: "john@example.com",
        preferences: {
          theme: "dark",
          notifications: true,
          privacy: {
            showEmail: false,
            showName: true,
            settings: {
              marketing: false,
              security: true,
              analytics: {
                enabled: true,
                samplingRate: 0.1
              }
            }
          }
        }
      }
    },
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: "1.2.3"
    }
  },
  
  complex: {
    // Deeply nested structure
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              level6: {
                level7: {
                  level8: {
                    data: "Very deep data",
                    array: Array.from({ length: 100 }, (_, i) => ({
                      id: i,
                      nested: {
                        value: i * 2,
                        metadata: {
                          timestamp: Date.now(),
                          source: "generated",
                          tags: [`tag_${i}`, `category_${i % 5}`]
                        }
                      }
                    }))
                  }
                }
              }
            }
          }
        }
      }
    },
    
    // Circular reference simulation
    circular: {} as any,
    
    // Large data
    largeDataset: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `This is item number ${i} with some additional text to make it larger`,
      metadata: {
        created: new Date(Date.now() - i * 1000).toISOString(),
        category: `category_${i % 10}`,
        tags: [`tag_${i % 20}`, `type_${i % 5}`],
        metrics: {
          views: Math.floor(Math.random() * 10000),
          likes: Math.floor(Math.random() * 1000),
          shares: Math.floor(Math.random() * 100)
        }
      }
    }))
  }
};

// Create circular reference
sampleData.complex.circular = sampleData.complex;

// Demo functions
async function demonstrateDepthRecommendation() {
  console.log('\n🎯 Depth Recommendation Demo');
  console.log('='.repeat(50));
  
  const contexts: BenchmarkContext[] = [
    { mode: 'development', environment: 'development' },
    { mode: 'production', environment: 'production' },
    { mode: 'debugging', environment: 'development' },
    { mode: 'performanceRun', environment: 'production' }
  ];
  
  for (const [dataName, data] of Object.entries(sampleData)) {
    console.log(`\n📊 Analyzing ${dataName} data structure:`);
    
    for (const context of contexts) {
      const recommendation = DepthOptimizer.recommendDepth(data, context);
      
      console.log(`   ${context.mode} (${context.environment}):`);
      console.log(`     Suggested depth: ${recommendation.suggestedDepth}`);
      console.log(`     Reasoning: ${recommendation.reasoning}`);
      
      if (recommendation.warnings.length > 0) {
        console.log(`     Warnings: ${recommendation.warnings.join(', ')}`);
      }
      
      console.log(`     Auto-apply: ${recommendation.autoApply ? '✅' : '❌'}`);
    }
  }
}

async function demonstrateAdaptiveDepth() {
  console.log('\n🔄 Adaptive Depth Manager Demo');
  console.log('='.repeat(50));
  
  const manager = new AdaptiveDepthManager({
    enableAutoEscalation: true,
    maxAutoDepth: 8,
    performanceThreshold: 100 // 100ms
  });
  
  // Simulate different operations
  const operations = [
    {
      name: 'Quick operation',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'success', data: 'quick' };
      },
      data: { type: 'quick', size: 'small' }
    },
    {
      name: 'Slow operation',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { status: 'success', data: 'slow' };
      },
      data: { type: 'slow', size: 'large' }
    },
    {
      name: 'Error operation',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Simulated error for depth escalation');
      },
      data: { type: 'error', size: 'medium' }
    },
    {
      name: 'Complex data operation',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { status: 'success', data: sampleData.complex };
      },
      data: sampleData.complex
    }
  ];
  
  for (const operation of operations) {
    console.log(`\n🔧 Running: ${operation.name}`);
    
    try {
      const result = await manager.runWithAdaptiveDepth(operation.fn);
      console.log(`   ✅ Success: ${JSON.stringify(result).substring(0, 100)}...`);
      
      // Check if depth should escalate based on data complexity
      if (operation.data) {
        manager.escalateDepthIfNeeded(operation.data, result);
      }
    } catch (error) {
      // Expected errors for specific operations - don't exit the demo
      if (operation.name === 'Error operation' || operation.name === 'Complex data operation') {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        console.error(`❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }
    
    console.log(`   Current depth: ${manager.getCurrentDepth()}`);
  }
  
  console.log('\n📈 Depth History:');
  manager.getDepthHistory().forEach((entry, index) => {
    console.log(`   ${index + 1}. Depth ${entry.depth}: ${entry.reason} (${entry.timestamp.toLocaleTimeString()})`);
  });
}

async function demonstratePerformanceAnalysis() {
  console.log('\n⚡ Performance Analysis Demo');
  console.log('='.repeat(50));
  
  const depths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const dataSizes = [1000, 10000, 100000, 1000000]; // 1KB, 10KB, 100KB, 1MB
  
  console.log('\n📊 Performance Impact by Depth and Data Size:');
  console.log('Depth | 1KB    | 10KB   | 100KB  | 1MB    | Recommendation');
  console.log('------|--------|--------|--------|--------|----------------');
  
  for (const depth of depths) {
    const row = [`${depth}`.padEnd(5)];
    
    for (const size of dataSizes) {
      const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, size);
      const timeStr = `${analysis.estimatedTimeMs.toFixed(1)}ms`.padEnd(7);
      row.push(timeStr);
    }
    
    // Get recommendation for 100KB data size
    const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, 100000);
    row.push(analysis.recommendation);
    
    console.log(row.join(' | '));
  }
  
  console.log('\n🎯 Optimal Depth for Different Scenarios:');
  
  const scenarios = [
    { name: 'Quick debugging (max 50ms)', maxSize: 10000, maxTime: 50 },
    { name: 'Standard development (max 200ms)', maxSize: 100000, maxTime: 200 },
    { name: 'Production monitoring (max 20ms)', maxSize: 1000, maxTime: 20 },
    { name: 'Deep analysis (max 1s)', maxSize: 1000000, maxTime: 1000 }
  ];
  
  for (const scenario of scenarios) {
    let optimalDepth = 1;
    
    // Find the deepest setting that meets requirements
    for (let depth = 10; depth >= 1; depth--) {
      const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, scenario.maxSize);
      if (analysis.estimatedTimeMs <= scenario.maxTime) {
        optimalDepth = depth;
        break;
      }
    }
    
    const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(optimalDepth, scenario.maxSize);
    console.log(`   ${scenario.name}:`);
    console.log(`     Optimal depth: ${optimalDepth}`);
    console.log(`     Estimated time: ${analysis.estimatedTimeMs.toFixed(1)}ms`);
    console.log(`     Memory usage: ${analysis.estimatedMemoryMB.toFixed(1)}MB`);
  }
}

async function demonstrateEnvironmentConfiguration() {
  console.log('\n🌍 Environment Configuration Demo');
  console.log('='.repeat(50));
  
  const environments = ['development', 'test', 'staging', 'production', 'profiling'];
  
  console.log('\n📋 Environment-Specific Configurations:');
  
  for (const env of environments) {
    const config = EnvironmentDepthConfig.getOptimalDepth(env);
    
    console.log(`\n🔧 ${env.toUpperCase()}:`);
    console.log(`   Default depth: ${config.defaultDepth}`);
    console.log(`   Max depth: ${config.maxDepth}`);
    console.log(`   Error depth: ${config.onErrorDepth}`);
    console.log(`   Log level: ${config.logLevel}`);
  }
  
  console.log('\n🚀 Environment Script Generation:');
  
  for (const env of environments) {
    console.log(`\n--- ${env.toUpperCase()} Environment Script ---`);
    const script = EnvironmentDepthConfig.generateEnvScript(env);
    console.log(script);
  }
  
  console.log('\n🔍 Current Environment Detection:');
  const detectedEnv = EnvironmentDepthConfig.detectEnvironment();
  const currentConfig = EnvironmentDepthConfig.getCurrentConfig();
  
  console.log(`   Detected environment: ${detectedEnv}`);
  console.log(`   Current config: depth=${currentConfig.defaultDepth}, max=${currentConfig.maxDepth}`);
  
  console.log('\n✅ Applying Environment Configuration:');
  EnvironmentDepthConfig.applyEnvironmentConfig();
}

async function demonstrateInteractiveExplorer() {
  console.log('\n🎮 Interactive Explorer Demo');
  console.log('='.repeat(50));
  
  console.log('🔍 Preview of different depth levels:');
  
  for (let depth = 1; depth <= 5; depth++) {
    console.log(`\n--- Depth ${depth} Preview ---`);
    
    const preview = DepthExplorer.previewAtDepth(sampleData.moderate, depth);
    
    console.log('Visible content:');
    console.log(preview.preview.substring(0, 300) + (preview.preview.length > 300 ? '...' : ''));
    
    console.log(`\nStatistics:`);
    console.log(`   Visible levels: ${preview.visibleLevels}/${preview.totalLevels}`);
    console.log(`   Hidden items: ${preview.hiddenCount}`);
  }
}

async function demonstrateRealWorldUsage() {
  console.log('\n🌟 Real-World Usage Examples');
  console.log('='.repeat(50));
  
  // Example 1: API Response Debugging
  console.log('\n📡 Example 1: API Response Debugging');
  const apiResponse = {
    status: 'success',
    data: {
      users: Array.from({ length: 50 }, (_, i) => ({
        id: `user_${i}`,
        profile: {
          personal: {
            name: `User ${i}`,
            email: `user${i}@example.com`,
            preferences: {
              theme: 'dark',
              notifications: {
                email: true,
                push: false,
                sms: {
                  enabled: true,
                  number: '+1234567890',
                  carrier: {
                    name: 'Example Carrier',
                    gateway: 'api.example.com'
                  }
                }
              }
            }
          }
        }
      }))
    },
    metadata: {
      total: 50,
      page: 1,
      timestamp: new Date().toISOString()
    }
  };
  
  const apiContext: BenchmarkContext = {
    mode: 'development',
    environment: 'development'
  };
  
  const apiRecommendation = DepthOptimizer.recommendDepth(apiResponse, apiContext);
  console.log(`   Recommended depth: ${apiRecommendation.suggestedDepth}`);
  console.log(`   Reasoning: ${apiRecommendation.reasoning}`);
  
  // Example 2: Performance Benchmarking
  console.log('\n⚡ Example 2: Performance Benchmarking');
  const benchmarkData = {
    iterations: 1000,
    results: Array.from({ length: 1000 }, (_, i) => ({
      iteration: i,
      duration: Math.random() * 100,
      memory: Math.random() * 1000000,
      operations: Math.floor(Math.random() * 10000)
    })),
    summary: {
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      totalMemory: 0
    }
  };
  
  const benchmarkContext: BenchmarkContext = {
    mode: 'performanceRun',
    environment: 'profiling'
  };
  
  const benchmarkRecommendation = DepthOptimizer.recommendDepth(benchmarkData, benchmarkContext);
  console.log(`   Recommended depth: ${benchmarkRecommendation.suggestedDepth}`);
  console.log(`   Reasoning: ${benchmarkRecommendation.reasoning}`);
  
  // Example 3: Error Investigation
  console.log('\n🐛 Example 3: Error Investigation');
  const errorData = {
    error: {
      name: 'ValidationError',
      message: 'Invalid user data',
      stack: 'Error: Invalid user data\n    at validateUser (user.js:45:15)\n    at handler (api.js:123:10)',
      cause: {
        field: 'email',
        value: 'invalid-email',
        validation: {
          rules: ['required', 'email'],
          errors: ['Must be a valid email address'],
          context: {
            endpoint: '/api/users',
            method: 'POST',
            requestId: 'req_123456',
            userId: 'user_789',
            session: {
              id: 'sess_abc',
              createdAt: new Date().toISOString(),
              metadata: {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0...',
                referrer: 'https://example.com'
              }
            }
          }
        }
      }
    },
    request: {
      headers: { 'content-type': 'application/json' },
      body: { name: 'Test', email: 'invalid-email' }
    }
  };
  
  const errorContext: BenchmarkContext = {
    mode: 'debugging',
    environment: 'development'
  };
  
  const errorRecommendation = DepthOptimizer.recommendDepth(errorData, errorContext);
  console.log(`   Recommended depth: ${errorRecommendation.suggestedDepth}`);
  console.log(`   Reasoning: ${errorRecommendation.reasoning}`);
  if (errorRecommendation.warnings.length > 0) {
    console.log(`   Warnings: ${errorRecommendation.warnings.join(', ')}`);
  }
}

// Main demo execution
async function runDemo() {
  console.log('🎯 Enhanced Depth Configuration Demo');
  console.log('🚀 Intelligent Console Depth Management for Bun');
  console.log('='.repeat(60));
  
  try {
    await demonstrateDepthRecommendation();
    await demonstrateAdaptiveDepth();
    await demonstratePerformanceAnalysis();
    await demonstrateEnvironmentConfiguration();
    await demonstrateInteractiveExplorer();
    await demonstrateRealWorldUsage();
    
    console.log('\n✅ Demo completed successfully!');
    console.log('\n📚 Next Steps:');
    console.log('   1. Try the CLI tool: bun run scripts/benchmarking/depth-cli.ts --help');
    console.log('   2. Use the shell script: ./scripts/benchmarking/depth-optimizer.sh --help');
    console.log('   3. Integrate hooks: import { useDepthManager } from "./src/benchmarking/depth-hooks"');
    console.log('   4. Configure presets: edit config/depth-presets.yml');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  runDemo();
}

export {
  runDemo,
  demonstrateDepthRecommendation,
  demonstrateAdaptiveDepth,
  demonstratePerformanceAnalysis,
  demonstrateEnvironmentConfiguration,
  demonstrateInteractiveExplorer,
  demonstrateRealWorldUsage,
  sampleData
};
