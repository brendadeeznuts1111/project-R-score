#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Matrix - Bun --smol Demo
 * 
 * Demonstrates Bun's --smol flag for memory-constrained environments
 * using our wiki template system with memory monitoring
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';

interface MemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

class SmolDemo {
  private getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  }

  private formatMemoryStats(stats: MemoryStats): string {
    return `RSS: ${stats.rss}MB | Heap: ${stats.heapUsed}/${stats.heapTotal}MB | External: ${stats.external}MB`;
  }

  private createLargeWikiDataset(): any[] {
    console.log('📊 Creating large wiki dataset for memory testing...');
    
    const templates = MCPWikiGenerator.getWikiTemplates();
    const largeDataset = [];

    // Create 1000 wiki template entries to stress test memory
    for (let i = 0; i < 1000; i++) {
      const baseTemplate = templates[i % templates.length];
      largeDataset.push({
        id: i + 1,
        name: `${baseTemplate.name} - Instance ${i + 1}`,
        description: `${baseTemplate.description} (Generated instance ${i + 1})`,
        baseUrl: baseTemplate.baseUrl,
        workspace: baseTemplate.workspace,
        format: baseTemplate.format,
        includeExamples: baseTemplate.includeExamples,
        customSections: baseTemplate.customSections || [],
        metadata: {
          created: new Date().toISOString(),
          version: `1.${i}.0`,
          tags: [`instance-${i}`, baseTemplate.format, 'generated'],
          metrics: {
            views: Math.floor(Math.random() * 10000),
            edits: Math.floor(Math.random() * 1000),
            lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        configuration: {
          security: {
            encryption: true,
            authentication: {
              type: 'OAuth2',
              tokens: ['read', 'write', 'admin'],
              policies: Array.from({ length: 5 }, (_, j) => ({
                name: `policy-${j}`,
                rules: Array.from({ length: 3 }, (_, k) => ({
                  action: ['read', 'write', 'delete'][k % 3],
                  resource: `resource-${k}`,
                  conditions: Array.from({ length: 2 }, (_, l) => ({
                    field: `field-${l}`,
                    operator: 'equals',
                    value: `value-${l}`
                  }))
                }))
              }))
            }
          },
          performance: {
            caching: true,
            optimization: {
              minification: true,
              compression: true,
              lazyLoading: true
            },
            metrics: {
              responseTime: Math.floor(Math.random() * 200) + 50,
              throughput: Math.floor(Math.random() * 2000) + 500,
              errorRate: Math.random() * 0.05,
              details: {
                average: Math.floor(Math.random() * 100) + 100,
                median: Math.floor(Math.random() * 100) + 90,
                p95: Math.floor(Math.random() * 100) + 150,
                p99: Math.floor(Math.random() * 100) + 200
              }
            }
          },
          integration: {
            apis: {
              rest: {
                endpoints: Array.from({ length: 10 }, (_, j) => `/api/endpoint-${j}`),
                authentication: 'Bearer',
                rateLimit: {
                  requests: 1000,
                  window: 3600,
                  strategy: 'sliding-window'
                }
              },
              graphql: {
                schema: 'wiki.graphql',
                queries: Array.from({ length: 5 }, (_, j) => `query${j}`),
                mutations: Array.from({ length: 3 }, (_, j) => `mutation${j}`)
              }
            },
            databases: {
              primary: {
                type: 'PostgreSQL',
                connection: {
                  host: 'db.factorywager.com',
                  port: 5432,
                  database: `wiki_db_${i % 10}`,
                  credentials: {
                    username: `user_${i}`,
                    password: '***hidden***',
                    ssl: true
                  }
                }
              },
              cache: {
                type: 'Redis',
                ttl: 3600,
                maxSize: 1000 + i
              }
            }
          }
        }
      });
    }

    return largeDataset;
  }

  demonstrateMemoryUsage(): void {
    console.log('🎯 Bun --smol Memory Usage Demonstration');
    console.log('==========================================');
    console.log('');

    // Initial memory state
    const initialMemory = this.getMemoryStats();
    console.log('📊 Initial Memory State:');
    console.log(`   ${this.formatMemoryStats(initialMemory)}`);
    console.log('');

    // Create large dataset
    console.log('🏗️  Building large wiki dataset (1000 templates)...');
    const largeDataset = this.createLargeWikiDataset();
    
    const afterCreationMemory = this.getMemoryStats();
    console.log('📊 Memory After Dataset Creation:');
    console.log(`   ${this.formatMemoryStats(afterCreationMemory)}`);
    console.log(`   Increase: +${afterCreationMemory.heapUsed - initialMemory.heapUsed}MB heap`);
    console.log('');

    // Perform memory-intensive operations
    console.log('⚡ Performing memory-intensive operations...');
    
    // Complex filtering
    const filtered = largeDataset.filter(template => 
      template.format === 'markdown' && 
      template.metadata.metrics.views > 5000
    );

    // Complex sorting
    const sorted = largeDataset.sort((a, b) => 
      b.metadata.metrics.views - a.metadata.metrics.views
    );

    // Complex aggregation
    const aggregated = largeDataset.reduce((acc, template) => {
      const format = template.format;
      if (!acc[format]) {
        acc[format] = { count: 0, totalViews: 0, avgResponseTime: 0 };
      }
      acc[format].count++;
      acc[format].totalViews += template.metadata.metrics.views;
      acc[format].avgResponseTime += template.configuration.performance.metrics.responseTime;
      return acc;
    }, {} as any);

    // Calculate averages
    Object.keys(aggregated).forEach(format => {
      aggregated[format].avgResponseTime = Math.round(
        aggregated[format].avgResponseTime / aggregated[format].count
      );
    });

    const afterOperationsMemory = this.getMemoryStats();
    console.log('📊 Memory After Operations:');
    console.log(`   ${this.formatMemoryStats(afterOperationsMemory)}`);
    console.log(`   Processed: ${largeDataset.length} templates`);
    console.log(`   Filtered: ${filtered.length} results`);
    console.log(`   Aggregated: ${Object.keys(aggregated).length} formats`);
    console.log('');

    // Show some results
    console.log('📈 Sample Results:');
    console.log(`   Top 5 templates by views:`);
    sorted.slice(0, 5).forEach((template, i) => {
      console.log(`   ${i + 1}. ${template.name} (${template.metadata.metrics.views} views)`);
    });
    console.log('');

    console.log('📊 Format Aggregation:');
    Object.entries(aggregated).forEach(([format, stats]: [string, any]) => {
      console.log(`   ${format}: ${stats.count} templates, ${stats.totalViews} total views, ${stats.avgResponseTime}ms avg response`);
    });
    console.log('');

    // Final memory state
    const finalMemory = this.getMemoryStats();
    console.log('📊 Final Memory State:');
    console.log(`   ${this.formatMemoryStats(finalMemory)}`);
    console.log('');

    // Memory efficiency analysis
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryPerTemplate = memoryIncrease / largeDataset.length;

    console.log('📊 Memory Efficiency Analysis:');
    console.log(`   Total increase: +${memoryIncrease}MB`);
    console.log(`   Memory per template: ${memoryPerTemplate.toFixed(2)}MB`);
    console.log(`   Dataset size: ${(JSON.stringify(largeDataset).length / 1024 / 1024).toFixed(2)}MB (JSON)`);
    console.log('');

    console.log('💡 --smol Flag Benefits:');
    console.log('   ✅ More frequent garbage collection');
    console.log('   ✅ Reduced memory footprint');
    console.log('   ✅ Better for memory-constrained environments');
    console.log('   ✅ Prevents memory leaks in long-running processes');
    console.log('');

    console.log('🚀 Try with different memory modes:');
    console.log('   bun run examples/bun-smol-demo.tsx          # Normal mode');
    console.log('   bun --smol run examples/bun-smol-demo.tsx    # Memory-efficient mode');
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up memory...');
    largeDataset.length = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const cleanupMemory = this.getMemoryStats();
    console.log('📊 Memory After Cleanup:');
    console.log(`   ${this.formatMemoryStats(cleanupMemory)}`);
    console.log(`   Freed: ${finalMemory.heapUsed - cleanupMemory.heapUsed}MB`);
  }

  demonstrateSmolVsNormal(): void {
    console.log('🔬 --smol vs Normal Mode Comparison');
    console.log('====================================');
    console.log('');

    console.log('📊 Memory Mode Characteristics:');
    console.log('');

    console.log('Normal Mode:');
    console.log('   • Larger heap size for better performance');
    console.log('   • Less frequent garbage collection');
    console.log('   • Higher memory usage');
    console.log('   • Better for CPU-intensive tasks');
    console.log('');

    console.log('--smol Mode:');
    console.log('   • Smaller heap size');
    console.log('   • More frequent garbage collection');
    console.log('   • Lower memory usage');
    console.log('   • Better for memory-constrained environments');
    console.log('   • Slightly slower execution due to GC overhead');
    console.log('');

    console.log('🎯 Use Cases:');
    console.log('');

    console.log('Use Normal Mode when:');
    console.log('   • Plenty of RAM available');
    console.log('   • Performance is critical');
    console.log('   • Processing large datasets quickly');
    console.log('   • Running on servers with sufficient resources');
    console.log('');

    console.log('Use --smol Mode when:');
    console.log('   • Limited RAM available');
    console.log('   • Running on CI/CD runners');
    console.log('   • Containerized environments with memory limits');
    console.log('   • Long-running background processes');
    console.log('   • Memory leaks are a concern');
    console.log('');

    console.log('🏃‍♂️ Performance Impact:');
    console.log('   --smol typically adds 5-15% execution overhead');
    console.log('   But can prevent OOM errors in constrained environments');
    console.log('   Bun automatically adjusts heap size based on available memory');
  }
}

// CLI execution
if (import.meta.main) {
  const demo = new SmolDemo();
  
  const command = Bun.argv[2];
  
  switch (command) {
    case 'compare':
      demo.demonstrateSmolVsNormal();
      break;
    case 'help':
    default:
      demo.demonstrateMemoryUsage();
      if (command === 'help') {
        console.log('');
        console.log('📖 Usage:');
        console.log('  # Normal memory mode');
        console.log('  bun run examples/bun-smol-demo.tsx');
        console.log('');
        console.log('  # Memory-efficient mode');
        console.log('  bun --smol run examples/bun-smol-demo.tsx');
        console.log('');
        console.log('  # Show comparison');
        console.log('  bun run examples/bun-smol-demo.tsx compare');
      }
      break;
  }
}
