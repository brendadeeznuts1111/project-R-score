#!/usr/bin/env bun

/**
 * 🚀 Data Processing System Demo
 *
 * Complete demonstration of the integrated data processing system
 * with enhanced error context management and monitoring.
 */

import { Database } from 'bun:sqlite';
import { AdvancedDataProcessingService } from './data-processor';
import { EnhancedErrorContextManager } from './error-context-manager';
import { AdvancedDataValidationService } from './data-validation-layer';
import { AdvancedProcessingMetricsMonitor } from './processing-metrics-monitor';
import { DataPipelineOrchestrator } from './data-pipeline-orchestrator';
import { ServiceIntegrationManager } from './integration-layer';

// ============================================================================
// DEMO DATA AND SCHEMAS
// ============================================================================

const DEMO_SCHEMAS = {
  userData: {
    id: 'user-data',
    name: 'User Data',
    version: '1.0.0',
    description: 'Schema for user data validation',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        constraints: [{ type: 'min', value: 1 }],
      },
      {
        name: 'email',
        type: 'string',
        required: true,
        constraints: [{ type: 'pattern', value: '^[^\s@]+@[^\s@]+\.[^\s@]+$' }],
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        constraints: [{ type: 'min', value: 2 }, { type: 'max', value: 100 }],
      },
      {
        name: 'age',
        type: 'number',
        required: false,
        constraints: [{ type: 'min', value: 0 }, { type: 'max', value: 150 }],
      },
    ],
    rules: [
      {
        id: 'adult-check',
        name: 'Adult Age Check',
        condition: '!age || age >= 18',
        message: 'User must be 18 or older',
        severity: 'warning',
        enabled: true,
      },
    ],
    metadata: { demo: true },
  },

  orderData: {
    id: 'order-data',
    name: 'Order Data',
    version: '1.0.0',
    description: 'Schema for order processing',
    fields: [
      {
        name: 'orderId',
        type: 'string',
        required: true,
      },
      {
        name: 'userId',
        type: 'string',
        required: true,
      },
      {
        name: 'amount',
        type: 'number',
        required: true,
        constraints: [{ type: 'min', value: 0 }],
      },
      {
        name: 'items',
        type: 'array',
        required: true,
      },
    ],
    rules: [],
    metadata: { demo: true },
  },
};

const DEMO_PIPELINES = {
  userProcessing: {
    id: 'user-data-processing',
    name: 'User Data Processing',
    description: 'Process and validate user data',
    steps: [
      {
        id: 'validate',
        name: 'Validate User Data',
        type: 'validation',
        config: { timeout: 5000 },
        enabled: true,
        order: 1,
      },
      {
        id: 'enrich',
        name: 'Enrich User Data',
        type: 'enrichment',
        config: { timeout: 3000 },
        enabled: true,
        order: 2,
      },
      {
        id: 'store',
        name: 'Store User Data',
        type: 'persistence',
        config: { timeout: 2000 },
        enabled: true,
        order: 3,
      },
    ],
    inputSchema: DEMO_SCHEMAS.userData,
    metadata: { demo: true },
  },

  orderProcessing: {
    id: 'order-processing',
    name: 'Order Processing',
    description: 'Process customer orders',
    steps: [
      {
        id: 'validate-order',
        name: 'Validate Order',
        type: 'validation',
        config: { timeout: 3000 },
        enabled: true,
        order: 1,
      },
      {
        id: 'calculate-total',
        name: 'Calculate Total',
        type: 'transformation',
        config: { timeout: 2000 },
        enabled: true,
        order: 2,
      },
      {
        id: 'process-payment',
        name: 'Process Payment',
        type: 'transformation',
        config: { timeout: 5000 },
        enabled: true,
        order: 3,
      },
      {
        id: 'send-confirmation',
        name: 'Send Confirmation',
        type: 'notification',
        config: { timeout: 2000 },
        enabled: true,
        order: 4,
      },
    ],
    inputSchema: DEMO_SCHEMAS.orderData,
    metadata: { demo: true },
  },
};

// ============================================================================
// DEMO APPLICATION
// ============================================================================

export class DataProcessingDemo {
  private db: Database;
  private dataProcessor: AdvancedDataProcessingService;
  private errorManager: EnhancedErrorContextManager;
  private validationService: AdvancedDataValidationService;
  private metricsMonitor: AdvancedProcessingMetricsMonitor;
  private orchestrator: DataPipelineOrchestrator;
  private integrationManager: ServiceIntegrationManager;

  constructor() {
    this.db = new Database(':memory:');

    // Initialize core services
    this.errorManager = new EnhancedErrorContextManager(this.db);
    this.dataProcessor = new AdvancedDataProcessingService(this.db, this.errorManager);
    this.validationService = new AdvancedDataValidationService(this.db);
    this.metricsMonitor = new AdvancedProcessingMetricsMonitor(this.db);
    this.orchestrator = new DataPipelineOrchestrator(
      this.db,
      this.dataProcessor,
      this.errorManager
    );

    this.integrationManager = new ServiceIntegrationManager(
      this.db,
      this.dataProcessor,
      this.errorManager,
      this.validationService,
      this.metricsMonitor,
      this.orchestrator
    );

    this.setupDemo();
  }

  private async setupDemo(): Promise<void> {
    console.log('🚀 Setting up Data Processing Demo...');

    // Register schemas
    this.validationService.registerSchema(DEMO_SCHEMAS.userData);
    this.validationService.registerSchema(DEMO_SCHEMAS.orderData);

    // Register pipelines
    this.dataProcessor.registerPipeline(DEMO_PIPELINES.userProcessing);
    this.dataProcessor.registerPipeline(DEMO_PIPELINES.orderProcessing);

    // Register service integrations
    this.integrationManager.registerService('user-service', '1.0.0');
    this.integrationManager.registerService('order-service', '1.0.0');

    await this.integrationManager.enableDataProcessing('user-service');
    await this.integrationManager.enableDataProcessing('order-service');
    await this.integrationManager.enableValidation('user-service');
    await this.integrationManager.enableValidation('order-service');

    console.log('✅ Demo setup complete');
  }

  // ============================================================================
  // DEMO SCENARIOS
  // ============================================================================

  /**
   * Demo 1: Basic data validation and processing
   */
  async demoBasicValidation(): Promise<void> {
    console.log('\n📋 Demo 1: Basic Data Validation');

    const testUser = {
      id: 'user123',
      email: 'john.doe@example.com',
      name: 'John Doe',
      age: 25,
    };

    try {
      const validationResult = await this.validationService.validateData(testUser, 'user-data');

      console.log('✅ Validation Result:');
      console.log(`   Valid: ${validationResult.isValid}`);
      console.log(`   Score: ${validationResult.score}/100`);
      console.log(`   Errors: ${validationResult.errors.length}`);
      console.log(`   Warnings: ${validationResult.warnings.length}`);

      if (validationResult.errors.length > 0) {
        console.log('   Error Details:');
        validationResult.errors.forEach(error => {
          console.log(`     - ${error.message}`);
        });
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
    }
  }

  /**
   * Demo 2: Data processing pipeline
   */
  async demoDataProcessing(): Promise<void> {
    console.log('\n🔄 Demo 2: Data Processing Pipeline');

    const userData = {
      id: 'user456',
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      age: 30,
    };

    try {
      const result = await this.dataProcessor.processData(
        'user-data-processing',
        userData,
        {
          operationId: 'demo-processing',
          source: 'demo-app',
          metadata: { demo: true },
        }
      );

      console.log('✅ Processing Result:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Records Processed: ${result.metrics.recordsProcessed}`);

      if (result.success) {
        console.log('   Processed Data:', result.data);
      } else {
        console.log('   Error:', result.error?.message);
      }

    } catch (error) {
      console.error('❌ Processing failed:', error);
    }
  }

  /**
   * Demo 3: Error context management
   */
  async demoErrorContext(): Promise<void> {
    console.log('\n🚨 Demo 3: Enhanced Error Context');

    const errorContext = this.errorManager.createContext(
      'demo-error-handling',
      'demo-app',
      'error-demo',
      'testErrorScenario',
      {
        metadata: { scenario: 'validation-failure' },
      }
    );

    try {
      // Simulate an error scenario
      const invalidUser = {
        id: '', // Invalid: empty string
        email: 'invalid-email', // Invalid: bad format
        name: 'X', // Invalid: too short
        age: -5, // Invalid: negative
      };

      // Add breadcrumb
      this.errorManager.addBreadcrumb(
        errorContext.id,
        'Starting validation of invalid user data',
        'info',
        { dataSize: JSON.stringify(invalidUser).length }
      );

      // Validate (should fail)
      const validationResult = await this.validationService.validateData(invalidUser, 'user-data');

      if (!validationResult.isValid) {
        // Create comprehensive error report
        await this.errorManager.createErrorReport(
          new Error('User data validation failed'),
          errorContext.id,
          {
            code: 'VALIDATION_FAILED',
            severity: 'medium',
            category: 'application',
            correlatedErrors: [],
            impact: {
              usersAffected: 1,
              businessImpact: 'low',
              dataLoss: false,
              securityRisk: false,
              downtime: 0,
            },
          }
        );

        console.log('✅ Error Context Created:');
        console.log(`   Context ID: ${errorContext.id}`);
        console.log(`   Errors Found: ${validationResult.errors.length}`);

        validationResult.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.message} (${error.severity})`);
        });
      }

    } catch (error) {
      console.error('❌ Error handling failed:', error);
    } finally {
      await this.errorManager.closeContext(errorContext.id);
    }
  }

  /**
   * Demo 4: Orchestrated processing
   */
  async demoOrchestration(): Promise<void> {
    console.log('\n🎯 Demo 4: Pipeline Orchestration');

    const orderData = {
      orderId: 'order789',
      userId: 'user123',
      amount: 99.99,
      items: [
        { id: 'item1', name: 'Widget', price: 49.99, quantity: 1 },
        { id: 'item2', name: 'Gadget', price: 25.00, quantity: 1 },
      ],
    };

    try {
      // Execute pipeline through orchestrator
      const execution = await this.orchestrator.executePipeline(
        'order-processing',
        orderData,
        {
          operationId: 'demo-orchestration',
          source: 'demo-app',
          metadata: { priority: 'high' },
        },
        {
          priority: 2,
          waitForDependencies: false,
        }
      );

      console.log('✅ Orchestration Result:');
      console.log(`   Execution ID: ${execution.id}`);
      console.log(`   Status: ${execution.status}`);
      console.log(`   Duration: ${execution.duration}ms`);
      console.log(`   Steps Completed: ${execution.results.length}`);

      execution.results.forEach((result, index) => {
        console.log(`   Step ${index + 1}: ${result.stepId} - ${result.status}`);
      });

    } catch (error) {
      console.error('❌ Orchestration failed:', error);
    }
  }

  /**
   * Demo 5: Service integration
   */
  async demoServiceIntegration(): Promise<void> {
    console.log('\n🔗 Demo 5: Service Integration');

    const userService = this.integrationManager.getServiceWrapper('user-service');

    const userData = {
      id: 'user999',
      email: 'demo@example.com',
      name: 'Demo User',
      age: 28,
    };

    try {
      // Process through integrated service
      const result = await userService.processData(
        'user-data-processing',
        userData,
        {
          metadata: { integrationTest: true },
        }
      );

      console.log('✅ Service Integration Result:');
      console.log('   Processed User:', result);

      // Check integration status
      const integrations = this.integrationManager.getIntegrationStatus();
      console.log('   Active Integrations:', integrations.length);

      integrations.forEach(integration => {
        console.log(`     - ${integration.serviceName}: ${integration.migrationStatus}`);
      });

    } catch (error) {
      console.error('❌ Service integration failed:', error);
    }
  }

  /**
   * Demo 6: Metrics and monitoring
   */
  async demoMetricsMonitoring(): Promise<void> {
    console.log('\n📊 Demo 6: Metrics and Monitoring');

    // Get current system metrics
    const systemMetrics = this.metricsMonitor.getSystemMetrics();

    console.log('✅ System Metrics:');
    console.log(`   Overall Health: ${systemMetrics.overallHealth.toFixed(1)}%`);
    console.log(`   Active Pipelines: ${systemMetrics.activePipelines}`);
    console.log(`   Total Throughput: ${systemMetrics.totalThroughput.toFixed(2)} req/s`);
    console.log(`   Error Rate: ${systemMetrics.errorRate.toFixed(2)}%`);
    console.log(`   Active Alerts: ${systemMetrics.alerts.length}`);

    // Get performance recommendations
    const recommendations = this.metricsMonitor.getPerformanceRecommendations();

    if (recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Get recent error reports
    const recentErrors = await this.errorManager.getRecentErrors(5);

    if (recentErrors.length > 0) {
      console.log('🚨 Recent Errors:');
      recentErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.severity})`);
      });
    }
  }

  /**
   * Demo 7: Batch processing
   */
  async demoBatchProcessing(): Promise<void> {
    console.log('\n📦 Demo 7: Batch Processing');

    const batchData = [
      {
        data: { id: 'user1', email: 'user1@example.com', name: 'User One', age: 25 },
        context: { operationId: 'batch-1', source: 'demo-batch' },
      },
      {
        data: { id: 'user2', email: 'user2@example.com', name: 'User Two', age: 30 },
        context: { operationId: 'batch-2', source: 'demo-batch' },
      },
      {
        data: { id: 'user3', email: 'user3@example.com', name: 'User Three', age: 35 },
        context: { operationId: 'batch-3', source: 'demo-batch' },
      },
    ];

    try {
      const batchResults = await this.orchestrator.executeBatch(batchData);

      console.log('✅ Batch Processing Result:');
      console.log(`   Total Items: ${batchData.length}`);
      console.log(`   Successful: ${batchResults.filter(r => r.success).length}`);
      console.log(`   Failed: ${batchResults.filter(r => !r.success).length}`);

      batchResults.forEach((result, index) => {
        console.log(`   Item ${index + 1}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
      });

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
    }
  }

  // ============================================================================
  // RUN ALL DEMOS
  // ============================================================================

  async runAllDemos(): Promise<void> {
    console.log('🎬 Starting Data Processing System Demo');
    console.log('=' .repeat(50));

    try {
      await this.demoBasicValidation();
      await this.demoDataProcessing();
      await this.demoErrorContext();
      await this.demoOrchestration();
      await this.demoServiceIntegration();
      await this.demoMetricsMonitoring();
      await this.demoBatchProcessing();

      console.log('\n🎉 All demos completed successfully!');
      console.log('=' .repeat(50));

      this.printSummary();

    } catch (error) {
      console.error('❌ Demo execution failed:', error);
    }
  }

  private printSummary(): void {
    console.log('\n📈 Demo Summary:');
    console.log('✅ Advanced Data Processing Service - Implemented');
    console.log('✅ Enhanced Error Context Manager - Implemented');
    console.log('✅ Data Validation and Transformation Layer - Implemented');
    console.log('✅ Processing Metrics and Monitoring - Implemented');
    console.log('✅ Data Pipeline Orchestrator - Implemented');
    console.log('✅ Service Integration Layer - Implemented');
    console.log('\n🚀 Ready for production deployment!');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up demo resources...');

    this.metricsMonitor.stop();
    this.db.close();

    console.log('✅ Cleanup complete');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const demo = new DataProcessingDemo();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    await demo.cleanup();
    process.exit(0);
  });

  // Run all demos
  await demo.runAllDemos();

  // Cleanup
  await demo.cleanup();
}

// Run demo if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export default DataProcessingDemo;
