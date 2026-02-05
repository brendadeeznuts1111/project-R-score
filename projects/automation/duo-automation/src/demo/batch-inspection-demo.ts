// src/demo/batch-inspection-demo.ts
/**
 * ⚡ Batch Inspection Demonstration
 * 
 * Shows the power of efficient batch processing with the Custom Inspection System.
 */

import { 
  SecurityCheckInspectable, 
  PaymentRequestInspectable, 
  DatabaseConnectionInspectable,
  ConnectionStatsInspectable,
  FamilyMemberInspectable,
  InspectionUtils,
  INSPECT_CUSTOM 
} from '../../ecosystem/inspect-custom.ts';

console.log('⚡ BATCH INSPECTION DEMONSTRATION');
console.log('='.repeat(50));

// ============================================================================
// BATCH PROCESSING DEMONSTRATION
// ============================================================================

class BatchInspectionDemo {
  private metrics = {
    totalObjects: 0,
    batchTime: 0,
    individualTime: 0,
    savings: 0
  };

  async demonstrateBatchProcessing() {
    console.log('🚀 Starting batch inspection demonstration...\n');

    // 1. Create a large dataset of inspectable objects
    const dataset = this.createLargeDataset();
    console.log(`📊 Created dataset with ${dataset.length} objects\n`);

    // 2. Demonstrate batch inspection
    await this.demonstrateBatchInspection(dataset);

    // 3. Compare with individual inspection
    await this.demonstrateIndividualInspection(dataset);

    // 4. Show performance comparison
    this.showPerformanceComparison();

    // 5. Advanced batch features
    await this.demonstrateAdvancedBatchFeatures();
  }

  private createLargeDataset() {
    const objects: any[] = [];

    // Security checks
    for (let i = 1; i <= 10; i++) {
      objects.push(new SecurityCheckInspectable(
        `Security Check ${i}`,
        ['PASS', 'FAIL', 'WARN'][i % 3] as any,
        `Security check result ${i}`,
        {
          checkId: `check-${i}`,
          timestamp: new Date().toISOString(),
          severity: ['LOW', 'MEDIUM', 'HIGH'][i % 3]
        }
      ));
    }

    // Database connections
    for (let i = 1; i <= 5; i++) {
      objects.push(new DatabaseConnectionInspectable(
        `db-${i}`,
        ['connected', 'connecting', 'error'][i % 3] as any,
        20 + i * 5,
        Math.floor(Math.random() * 10),
        20 + i * 5 - Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 3)
      ));
    }

    // Payment requests
    for (let i = 1; i <= 8; i++) {
      objects.push(new PaymentRequestInspectable(
        `pay_${i}`,
        `User${i}`,
        `Merchant${i}`,
        Math.random() * 100 + 10,
        ['$', '€', '£'][i % 3],
        ['pending', 'completed', 'failed'][i % 3] as any,
        new Date(Date.now() - Math.random() * 86400000),
        ['venmo', 'paypal', 'cashapp'][i % 3],
        {
          type: 'transaction',
          processed: i % 2 === 0
        }
      ));
    }

    // Connection stats
    for (let i = 1; i <= 3; i++) {
      objects.push(new ConnectionStatsInspectable(
        `server-${i}.factory-wager.com`,
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 70),
        Math.random() * 100,
        Math.floor(Math.random() * 5),
        new Date()
      ));
    }

    // Family members
    for (let i = 1; i <= 4; i++) {
      objects.push(new FamilyMemberInspectable(
        `member-${i}`,
        `Person ${i}`,
        ['host', 'cousin', 'guest', 'friend'][i % 4] as any,
        Math.random() > 0.5,
        Math.random() * 100,
        Math.random() * 200,
        Math.floor(Math.random() * 100),
        100 + i * 50
      ));
    }

    this.metrics.totalObjects = objects.length;
    return objects;
  }

  private async demonstrateBatchInspection(dataset: any[]) {
    console.log('⚡ BATCH INSPECTION');
    console.log('-'.repeat(30));

    const startTime = performance.now();
    
    // Use batch inspection
    const batchResult = InspectionUtils.batchInspect(dataset);
    
    this.metrics.batchTime = performance.now() - startTime;

    console.log(`📊 Batch processed ${dataset.length} objects in ${this.metrics.batchTime.toFixed(2)}ms`);
    console.log(`🚀 Average per object: ${(this.metrics.batchTime / dataset.length).toFixed(4)}ms`);
    
    // Show first few results
    const lines = batchResult.split('\n---\n');
    console.log('\n📋 Sample Results (first 3):');
    console.log(lines.slice(0, 3).join('\n---\n'));
    
    if (lines.length > 3) {
      console.log(`\n... and ${lines.length - 3} more objects`);
    }
  }

  private async demonstrateIndividualInspection(dataset: any[]) {
    console.log('\n🔍 INDIVIDUAL INSPECTION');
    console.log('-'.repeat(30));

    const startTime = performance.now();
    
    // Process individually
    const individualResults = dataset.map(item => item[INSPECT_CUSTOM]());
    
    this.metrics.individualTime = performance.now() - startTime;

    console.log(`📊 Individual processed ${dataset.length} objects in ${this.metrics.individualTime.toFixed(2)}ms`);
    console.log(`🚀 Average per object: ${(this.metrics.individualTime / dataset.length).toFixed(4)}ms`);
    
    // Calculate savings
    this.metrics.savings = this.metrics.individualTime - this.metrics.batchTime;
    const savingsPercent = (this.metrics.savings / this.metrics.individualTime) * 100;
    
    console.log(`💰 Time savings: ${this.metrics.savings.toFixed(2)}ms (${savingsPercent.toFixed(1)}% faster)`);
  }

  private showPerformanceComparison() {
    console.log('\n📈 PERFORMANCE COMPARISON');
    console.log('-'.repeat(30));

    const batchAvg = this.metrics.batchTime / this.metrics.totalObjects;
    const individualAvg = this.metrics.individualTime / this.metrics.totalObjects;
    const speedup = individualAvg / batchAvg;

    console.log(`┌${'─'.repeat(58)}┐`);
    console.log(`│ ${'BATCH INSPECTION PERFORMANCE'.padStart(35)}${' '.repeat(23)}│`);
    console.log(`├${'─'.repeat(58)}┤`);
    console.log(`│ Total Objects: ${this.metrics.totalObjects.toString().padStart(4)}${' '.repeat(46)}│`);
    console.log(`│ Batch Time:    ${this.metrics.batchTime.toFixed(2).padStart(8)}ms${' '.repeat(42)}│`);
    console.log(`│ Individual:    ${this.metrics.individualTime.toFixed(2).padStart(8)}ms${' '.repeat(42)}│`);
    console.log(`│ Savings:       ${this.metrics.savings.toFixed(2).padStart(8)}ms${' '.repeat(42)}│`);
    console.log(`│ Speedup:       ${speedup.toFixed(1).padStart(8)}x${' '.repeat(44)}│`);
    console.log(`│ Batch Avg:     ${batchAvg.toFixed(4).padStart(8)}ms${' '.repeat(42)}│`);
    console.log(`│ Individual Avg: ${individualAvg.toFixed(4).padStart(8)}ms${' '.repeat(38)}│`);
    console.log(`└${'─'.repeat(58)}┘`);
  }

  private async demonstrateAdvancedBatchFeatures() {
    console.log('\n🎯 ADVANCED BATCH FEATURES');
    console.log('-'.repeat(30));

    // 1. Filtered batch inspection
    console.log('\n1️⃣ FILTERED BATCH INSPECTION');
    const securityChecks = this.createLargeDataset().filter(item => 
      item.constructor.name === 'SecurityCheckInspectable'
    );
    
    const securityBatch = InspectionUtils.batchInspect(securityChecks);
    console.log(`🔍 Processed ${securityChecks.length} security checks`);
    
    // Show sample
    const securityLines = securityBatch.split('\n---\n');
    console.log(securityLines.slice(0, 2).join('\n---\n'));

    // 2. Grouped batch inspection
    console.log('\n2️⃣ GROUPED BATCH INSPECTION');
    const dataset = this.createLargeDataset();
    const groups = this.groupByType(dataset);
    
    console.log(`📊 Created ${groups.size} type groups:`);
    groups.forEach((items, type) => {
      console.log(`   ${type}: ${items.length} items`);
    });

    // 3. Batch with custom formatting
    console.log('\n3️⃣ BATCH WITH CUSTOM FORMATTING');
    const payments = dataset.filter(item => 
      item.constructor.name === 'PaymentRequestInspectable'
    );
    
    const paymentBatch = this.formatBatchWithHeaders(payments);
    console.log(paymentBatch);

    // 4. Performance metrics for batch operations
    console.log('\n4️⃣ BATCH PERFORMANCE METRICS');
    this.showBatchMetrics(groups);
  }

  private groupByType(dataset: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    dataset.forEach(item => {
      const type = item.constructor.name.replace('Inspectable', '');
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(item);
    });
    
    return groups;
  }

  private formatBatchWithHeaders(items: any[]): string {
    const header = `💳 PAYMENT BATCH (${items.length} items)`;
    const separator = '='.repeat(header.length);
    
    const inspections = items.map(item => item[INSPECT_CUSTOM]());
    
    return [header, separator, ...inspections].join('\n');
  }

  private showBatchMetrics(groups: Map<string, any[]>) {
    console.log(`┌${'─'.repeat(58)}┐`);
    console.log(`│ ${'BATCH PROCESSING METRICS'.padStart(35)}${' '.repeat(23)}│`);
    console.log(`├${'─'.repeat(58)}┤`);
    
    let totalItems = 0;
    groups.forEach((items, type) => {
      const startTime = performance.now();
      const batch = InspectionUtils.batchInspect(items);
      const processingTime = performance.now() - startTime;
      
      console.log(`│ ${type.padEnd(15)}: ${items.length.toString().padStart(3)} items │ ${processingTime.toFixed(2).padStart(6)}ms │ ${(processingTime / items.length).toFixed(4).padStart(6)}ms avg │`);
      totalItems += items.length;
    });
    
    console.log(`├${'─'.repeat(58)}┤`);
    console.log(`│ ${'Total'.padEnd(15)}: ${totalItems.toString().padStart(3)} items │ ${this.metrics.batchTime.toFixed(2).padStart(6)}ms │ ${(this.metrics.batchTime / totalItems).toFixed(4).padStart(6)}ms avg │`);
    console.log(`└${'─'.repeat(58)}┘`);
  }
}

// ============================================================================
// DEMO EXECUTION
// ============================================================================

async function runBatchInspectionDemo() {
  console.log('⚡ Starting Batch Inspection Demo...\n');

  const demo = new BatchInspectionDemo();
  await demo.demonstrateBatchProcessing();

  console.log('\n✅ Batch Inspection Demo Complete!');
  console.log('\n🎯 Batch Processing Benefits Demonstrated:');
  console.log('  • Efficient processing of multiple objects');
  console.log('  • Performance optimization with batch operations');
  console.log('  • Type-based grouping and filtering');
  console.log('  • Custom formatting for batch results');
  console.log('  • Detailed performance metrics');
  console.log('  • Memory-efficient processing');
  console.log('  • Scalable for large datasets');
}

// Run the demo if this is the main module
if (import.meta.main) {
  runBatchInspectionDemo().catch(console.error);
}

export { BatchInspectionDemo, runBatchInspectionDemo };
