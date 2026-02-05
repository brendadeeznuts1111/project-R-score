// cascade-memories-demo.ts
// Usage example for CascadeMemoryManager

import { 
  CascadeMemoryManager, 
  type BaseMemory, 
  type MemoryContext, 
  type MemoryQuery,
  type CursorExport,
  DefaultMemoryStore,
  DefaultLearningEngine
} from './cascade-memories';

async function demonstrateMemoryManager() {
  console.log('🧠 Cascade Memory Manager Demo');
  console.log('===============================');
  
  const memoryManager = new CascadeMemoryManager();
  
  // Example 1: Store Different Memory Types
  console.log('\n📝 Storing Memory Examples');
  
  // Store Merchant Memory
  const merchantMemory: BaseMemory = {
    id: '',
    type: 'merchant',
    timestamp: new Date(),
    data: {
      merchantId: 'factory-wager',
      name: 'Factory Wager Enterprise',
      tier: 'enterprise',
      activationDate: new Date('2024-01-15'),
      colorPreferences: {
        primary: '#3b82f6',
        secondary: '#1f2937',
        success: '#22c55e'
      },
      onboardingHistory: {
        totalDevices: 45,
        successRate: 0.94,
        avgOnboardingTime: 28,
        favoriteDeviceType: 'tablet'
      },
      roiMetrics: {
        initialMRR: 299,
        currentMRR: 450,
        increasePercentage: 50.5,
        bestPerformingDevice: 'kiosk'
      },
      learnedBehaviors: {
        prefersBulkOnboarding: true,
        needsManualHelp: false,
        quickLearner: true
      }
    },
    metadata: {
      source: 'dashboard',
      version: '1.0',
      tags: ['enterprise', 'high-value', 'stable']
    }
  };
  
  const merchantId = await memoryManager.storeMemory(merchantMemory);
  console.log(`✅ Stored merchant memory: ${merchantId}`);
  
  // Store Device Memory
  const deviceMemory: BaseMemory = {
    id: '',
    type: 'device',
    timestamp: new Date(),
    data: {
      deviceId: 'device-001',
      merchantId: 'factory-wager',
      deviceType: 'tablet',
      manufacturer: 'Apple',
      model: 'iPad Pro',
      osVersion: '17.0',
      healthCheckHistory: [
        {
          timestamp: new Date(),
          score: 98,
          failedChecks: []
        }
      ],
      configurationProfile: 'enterprise-suite',
      productionReady: true,
      activationDate: new Date('2024-01-20'),
      lastActive: new Date(),
      performanceMetrics: {
        uptime: 0.99,
        transactionSuccess: 0.97,
        avgResponseTime: 150
      }
    },
    metadata: {
      source: 'device-monitor',
      version: '1.0',
      tags: ['ios', 'tablet', 'high-performance']
    }
  };
  
  const deviceId = await memoryManager.storeMemory(deviceMemory);
  console.log(`✅ Stored device memory: ${deviceId}`);
  
  // Store Interaction Memory
  const interactionMemory: BaseMemory = {
    id: '',
    type: 'interaction',
    timestamp: new Date(),
    data: {
      interactionId: 'interaction-001',
      merchantId: 'factory-wager',
      deviceId: 'device-001',
      action: 'qr_scan',
      success: true,
      duration: 2.3,
      context: {
        deviceType: 'tablet',
        networkSpeed: 100,
        timeOfDay: 'morning'
      },
      outcome: {
        productionReady: true,
        healthScore: 98,
        configApplied: true
      },
      learnedLessons: [
        'High-quality camera improves scan success',
        'Morning onboarding has highest success rate'
      ]
    },
    metadata: {
      source: 'interaction-tracker',
      version: '1.0',
      tags: ['qr-scan', 'successful', 'optimized']
    }
  };
  
  const interactionId = await memoryManager.storeMemory(interactionMemory);
  console.log(`✅ Stored interaction memory: ${interactionId}`);
  
  // Store Performance Memory
  const performanceMemory: BaseMemory = {
    id: '',
    type: 'performance',
    timestamp: new Date(),
    data: {
      skillId: 'skill-qr-generation',
      executionTime: 150,
      success: true,
      impact: {
        timeSaved: 15,
        mrrImpact: 50,
        userSatisfaction: 4.8
      },
      context: {
        deviceType: 'tablet',
        merchantTier: 'enterprise',
        timeOfDay: 'morning'
      },
      improvementsSuggested: [
        'Optimize QR complexity for tablet cameras',
        'Cache merchant preferences for faster loading'
      ]
    },
    metadata: {
      source: 'performance-monitor',
      version: '1.0',
      tags: ['qr-generation', 'high-performance', 'optimized']
    }
  };
  
  const performanceId = await memoryManager.storeMemory(performanceMemory);
  console.log(`✅ Stored performance memory: ${performanceId}`);
  
  // Example 2: Query Memories
  console.log('\n🔍 Querying Memories');
  
  // Query by merchant
  const merchantContext: MemoryContext = {
    merchantId: 'factory-wager'
  };
  
  const merchantMemories = await memoryManager.retrieveRelevantMemories(merchantContext);
  console.log(`✅ Found ${merchantMemories.length} memories for merchant factory-wager`);
  
  // Query by device type
  const deviceContext: MemoryContext = {
    filters: { deviceType: 'tablet' }
  };
  
  const deviceMemories = await memoryManager.retrieveRelevantMemories(deviceContext);
  console.log(`✅ Found ${deviceMemories.length} memories for tablet devices`);
  
  // Example 3: Advanced Query with Filters
  console.log('\n🎯 Advanced Query with Filters');
  
  const advancedQuery: MemoryQuery = {
    type: 'performance',
    filters: {
      success: true,
      'context.deviceType': 'tablet'
    },
    minRelevance: 0.8,
    startTime: Date.now(),
    limit: 10
  };
  
  const queryResult = await memoryManager.queryMemories(advancedQuery);
  console.log(`✅ Query results: ${queryResult.relevantCount}/${queryResult.totalFound} relevant memories`);
  console.log(`⏱️ Query executed in ${queryResult.queryStats.executionTime}ms`);
  
  // Example 4: Memory Optimization
  console.log('\n🔧 Memory Optimization');
  
  const optimizationReport = await memoryManager.optimizeMemories();
  console.log(`✅ Optimization complete:`);
  console.log(`   - Memories analyzed: ${optimizationReport.memoriesAnalyzed}`);
  console.log(`   - Optimizations applied: ${optimizationReport.optimizationsApplied}`);
  console.log(`   - Space saved: ${optimizationReport.spaceSaved} bytes`);
  console.log(`   - Performance improvement: ${optimizationReport.performanceImprovement}%`);
  
  // Example 5: Import from Cursor
  console.log('\n📥 Import from Cursor');
  
  const cursorData: CursorExport = {
    memories: [
      {
        type: 'merchant',
        timestamp: '2024-01-10T00:00:00Z',
        data: {
          merchantId: 'legacy-merchant',
          name: 'Legacy Merchant Co',
          tier: 'pro'
        },
        tags: ['legacy', 'migrated']
      },
      {
        type: 'device',
        timestamp: '2024-01-11T00:00:00Z',
        data: {
          deviceId: 'legacy-device',
          deviceType: 'mobile',
          manufacturer: 'Samsung'
        },
        tags: ['legacy', 'mobile']
      }
    ],
    metadata: {
      exportDate: new Date(),
      version: '2.0',
      totalCount: 2
    }
  };
  
  await memoryManager.importFromCursor(cursorData);
  console.log(`✅ Imported ${cursorData.memories.length} memories from Cursor`);
  
  // Example 6: Memory Statistics
  console.log('\n📊 Memory Statistics');
  
  const stats = await memoryManager.getMemoryStats();
  console.log(`✅ Memory Statistics:`);
  console.log(`   - Total memories: ${stats.totalMemories}`);
  console.log(`   - By type:`, stats.byType);
  console.log(`   - Oldest memory: ${stats.oldestMemory?.toISOString()}`);
  console.log(`   - Newest memory: ${stats.newestMemory?.toISOString()}`);
  console.log(`   - Total indices: ${stats.totalIndices}`);
  
  // Example 7: Learning Demonstration
  console.log('\n🧠 Learning System Demonstration');
  
  // Store more memories to build learning patterns
  for (let i = 0; i < 5; i++) {
    const testMemory: BaseMemory = {
      id: '',
      type: 'interaction',
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Past 5 days
      data: {
        interactionId: `test-${i}`,
        merchantId: 'factory-wager',
        action: 'qr_scan',
        success: i % 2 === 0, // Alternating success/failure
        duration: 2 + Math.random() * 2,
        context: {
          deviceType: 'tablet',
          networkSpeed: 50 + Math.random() * 100,
          timeOfDay: ['morning', 'afternoon', 'evening'][i % 3]
        },
        outcome: {
          productionReady: i % 2 === 0,
          healthScore: 80 + Math.random() * 20,
          configApplied: true
        },
        learnedLessons: [`Lesson ${i}`]
      },
      metadata: {
        source: 'test',
        version: '1.0',
        tags: ['test', 'learning']
      }
    };
    
    await memoryManager.storeMemory(testMemory);
  }
  
  console.log('✅ Stored test memories for learning');
  
  // Demonstrate learning predictions
  const learningEngine = new DefaultLearningEngine();
  const prediction = await learningEngine.predict({
    deviceType: 'tablet',
    action: 'qr_scan'
  });
  
  console.log(`✅ Learning prediction:`, prediction);
}

// Enterprise Dashboard Integration Example
async function demonstrateEnterpriseIntegration() {
  console.log('\n\n🏢 Enterprise Dashboard Integration');
  console.log('=======================================');
  
  const memoryManager = new CascadeMemoryManager();
  
  // Simulate enterprise onboarding with memory tracking
  const enterpriseScenarios = [
    {
      name: 'High-Value Merchant Onboarding',
      memories: [
        {
          type: 'merchant',
          data: {
            merchantId: 'enterprise-corp',
            tier: 'enterprise',
            expectedMRR: 1000,
            priority: 'high'
          }
        },
        {
          type: 'device',
          data: {
            deviceId: 'enterprise-kiosk-001',
            deviceType: 'kiosk',
            manufacturer: 'Custom',
            highAvailability: true
          }
        },
        {
          type: 'interaction',
          data: {
            action: 'bulk_onboarding',
            success: true,
            duration: 45,
            devicesConfigured: 10
          }
        }
      ]
    },
    {
      name: 'Performance Optimization',
      memories: [
        {
          type: 'performance',
          data: {
            skillId: 'skill-roi-prediction',
            executionTime: 200,
            success: true,
            impact: {
              timeSaved: 30,
              mrrImpact: 150,
              userSatisfaction: 4.9
            }
          }
        },
        {
          type: 'optimization',
          data: {
            optimizationId: 'qr-compression',
            impact: {
              timeSaved: 15,
              spaceSaved: 1024,
              performanceGain: 25
            },
            success: true
          }
        }
      ]
    }
  ];
  
  // Store enterprise scenario memories
  for (const scenario of enterpriseScenarios) {
    console.log(`\n📊 Processing: ${scenario.name}`);
    
    for (const memoryData of scenario.memories) {
      const memory: BaseMemory = {
        id: '',
        type: memoryData.type,
        timestamp: new Date(),
        data: memoryData.data,
        metadata: {
          source: 'enterprise-dashboard',
          version: '2.0',
          tags: ['enterprise', 'production', 'optimized']
        }
      };
      
      const memoryId = await memoryManager.storeMemory(memory);
      console.log(`   ✅ Stored ${memoryData.type} memory: ${memoryId}`);
    }
  }
  
  // Analyze enterprise patterns
  console.log('\n🔍 Analyzing Enterprise Patterns');
  
  const enterpriseContext: MemoryContext = {
    filters: {
      'metadata.tags': 'enterprise'
    }
  };
  
  const enterpriseMemories = await memoryManager.retrieveRelevantMemories(enterpriseContext);
  console.log(`✅ Found ${enterpriseMemories.length} enterprise memories`);
  
  // Generate insights
  const insights = generateEnterpriseInsights(enterpriseMemories);
  console.log('\n💡 Enterprise Insights:');
  insights.forEach(insight => console.log(`   - ${insight}`));
  
  // Optimize for enterprise performance
  const optimizationReport = await memoryManager.optimizeMemories();
  console.log('\n🚀 Enterprise Optimization Results:');
  console.log(`   - Performance improvement: ${optimizationReport.performanceImprovement}%`);
  console.log(`   - Optimizations applied: ${optimizationReport.optimizationsApplied}`);
  console.log(`   - Space efficiency: ${optimizationReport.spaceSaved} bytes saved`);
}

function generateEnterpriseInsights(memories: BaseMemory[]): string[] {
  const insights: string[] = [];
  
  const merchantMemories = memories.filter(m => m.type === 'merchant');
  const performanceMemories = memories.filter(m => m.type === 'performance');
  const interactionMemories = memories.filter(m => m.type === 'interaction');
  
  if (merchantMemories.length > 0) {
    insights.push(`${merchantMemories.length} enterprise merchants tracked with average MRR potential of $750`);
  }
  
  if (performanceMemories.length > 0) {
    const avgExecutionTime = performanceMemories.reduce((sum, m) => 
      sum + (m.data.executionTime || 0), 0) / performanceMemories.length;
    insights.push(`Average skill execution time: ${avgExecutionTime.toFixed(0)}ms (target: <200ms)`);
  }
  
  if (interactionMemories.length > 0) {
    const successRate = interactionMemories.filter(m => m.data.success).length / interactionMemories.length;
    insights.push(`Interaction success rate: ${(successRate * 100).toFixed(1)}% (target: >95%)`);
  }
  
  insights.push('Memory optimization enabled for enterprise-scale performance');
  insights.push('Learning patterns identified for predictive onboarding');
  
  return insights;
}

// Run demonstrations
// Check if running as main module (ESM compatible)
const globalProcess = (globalThis as any).process;
const isMainModule = typeof globalProcess !== 'undefined' && 
  globalProcess.argv && 
  import.meta.url === `file://${globalProcess.argv[1]}`;

if (isMainModule) {
  demonstrateMemoryManager()
    .then(() => demonstrateEnterpriseIntegration())
    .then(() => {
      console.log('\n🎉 All memory demonstrations completed successfully!');
      // Exit process for non-browser environments
      if (globalProcess && globalProcess.exit) {
        globalProcess.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Memory demonstration failed:', error);
      // Exit process for non-browser environments
      if (globalProcess && globalProcess.exit) {
        globalProcess.exit(1);
      }
    });
}

export { demonstrateMemoryManager, demonstrateEnterpriseIntegration };
