#!/usr/bin/env bun

/**
 * 🔗 Data Processing Integration Layer
 *
 * Integration examples and utilities for refactoring existing services
 * to use the new centralized data processing system with enhanced error context.
 *
 * Features:
 * - Service integration patterns
 * - Migration utilities
 * - Backward compatibility layers
 * - Performance optimization examples
 */

import { Database } from 'bun:sqlite';
import { AdvancedDataProcessingService } from './data-processor';
import { EnhancedErrorContextManager } from './error-context-manager';
import { AdvancedDataValidationService } from './data-validation-layer';
import { AdvancedProcessingMetricsMonitor } from './processing-metrics-monitor';
import { DataPipelineOrchestrator } from './data-pipeline-orchestrator';

// ============================================================================
// INTEGRATION PATTERNS
// ============================================================================

export interface ServiceIntegration {
  serviceName: string;
  version: string;
  dataProcessingEnabled: boolean;
  errorContextEnabled: boolean;
  validationEnabled: boolean;
  monitoringEnabled: boolean;
  migrationStatus: 'not_started' | 'in_progress' | 'completed' | 'rollback';
  performanceMetrics: {
    throughputImprovement: number;
    errorReduction: number;
    latencyImprovement: number;
  };
}

// ============================================================================
// SERVICE INTEGRATION MANAGER
// ============================================================================

export class ServiceIntegrationManager {
  private db: Database;
  private dataProcessor: AdvancedDataProcessingService;
  private errorManager: EnhancedErrorContextManager;
  private validationService: AdvancedDataValidationService;
  private metricsMonitor: AdvancedProcessingMetricsMonitor;
  private orchestrator: DataPipelineOrchestrator;
  private integrations: Map<string, ServiceIntegration> = new Map();

  constructor(
    db: Database,
    dataProcessor: AdvancedDataProcessingService,
    errorManager: EnhancedErrorContextManager,
    validationService: AdvancedDataValidationService,
    metricsMonitor: AdvancedProcessingMetricsMonitor,
    orchestrator: DataPipelineOrchestrator
  ) {
    this.db = db;
    this.dataProcessor = dataProcessor;
    this.errorManager = errorManager;
    this.validationService = validationService;
    this.metricsMonitor = metricsMonitor;
    this.orchestrator = orchestrator;

    this.initializeIntegrationTracking();
  }

  // ============================================================================
  // INTEGRATION REGISTRATION
  // ============================================================================

  /**
   * Register a service for integration
   */
  registerService(serviceName: string, version: string): ServiceIntegration {
    const integration: ServiceIntegration = {
      serviceName,
      version,
      dataProcessingEnabled: false,
      errorContextEnabled: false,
      validationEnabled: false,
      monitoringEnabled: false,
      migrationStatus: 'not_started',
      performanceMetrics: {
        throughputImprovement: 0,
        errorReduction: 0,
        latencyImprovement: 0,
      },
    };

    this.integrations.set(serviceName, integration);
    this.persistIntegration(integration);

    return integration;
  }

  /**
   * Enable data processing for a service
   */
  async enableDataProcessing(serviceName: string): Promise<void> {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // Create service-specific pipelines
    await this.createServicePipelines(serviceName);

    integration.dataProcessingEnabled = true;
    integration.migrationStatus = 'completed';
    this.persistIntegration(integration);

    this.emit('service-integrated', { serviceName, feature: 'data-processing' });
  }

  /**
   * Enable error context for a service
   */
  enableErrorContext(serviceName: string): void {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    integration.errorContextEnabled = true;
    this.persistIntegration(integration);

    this.emit('service-integrated', { serviceName, feature: 'error-context' });
  }

  /**
   * Enable validation for a service
   */
  async enableValidation(serviceName: string): Promise<void> {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // Create service-specific validation schemas
    await this.createServiceValidationSchemas(serviceName);

    integration.validationEnabled = true;
    this.persistIntegration(integration);

    this.emit('service-integrated', { serviceName, feature: 'validation' });
  }

  /**
   * Enable monitoring for a service
   */
  enableMonitoring(serviceName: string): void {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    integration.monitoringEnabled = true;
    this.persistIntegration(integration);

    this.emit('service-integrated', { serviceName, feature: 'monitoring' });
  }

  // ============================================================================
  // SERVICE-SPECIFIC PIPELINE CREATION
  // ============================================================================

  /**
   * Create pipelines for a specific service
   */
  private async createServicePipelines(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'playbook-auditor':
        await this.createPlaybookAuditorPipelines();
        break;
      case 'api-server':
        await this.createAPIServerPipelines();
        break;
      case 'websocket-server':
        await this.createWebSocketServerPipelines();
        break;
      case 'project-management':
        await this.createProjectManagementPipelines();
        break;
      default:
        await this.createGenericServicePipelines(serviceName);
    }
  }

  /**
   * Create pipelines for playbook auditor
   */
  private async createPlaybookAuditorPipelines(): Promise<void> {
    // Compliance scanning pipeline
    const compliancePipeline = {
      id: 'playbook-compliance-scan',
      name: 'Playbook Compliance Scanning',
      description: 'Scan repositories for playbook compliance',
      steps: [
        {
          id: 'validate-input',
          name: 'Validate Scan Input',
          type: 'validation',
          config: { timeout: 5000 },
          enabled: true,
          order: 1,
        },
        {
          id: 'scan-repository',
          name: 'Scan Repository',
          type: 'transformation',
          config: { timeout: 30000 },
          enabled: true,
          order: 2,
        },
        {
          id: 'generate-report',
          name: 'Generate Compliance Report',
          type: 'transformation',
          config: { timeout: 10000 },
          enabled: true,
          order: 3,
        },
        {
          id: 'store-results',
          name: 'Store Results',
          type: 'persistence',
          config: { timeout: 5000 },
          enabled: true,
          order: 4,
        },
      ],
      inputSchema: {
        id: 'compliance-scan-input',
        name: 'Compliance Scan Input',
        version: '1.0.0',
        description: 'Input schema for compliance scanning',
        fields: [
          {
            name: 'repository',
            type: 'string',
            required: true,
            constraints: [{ type: 'min', value: 1 }],
          },
          {
            name: 'branch',
            type: 'string',
            required: false,
            constraints: [{ type: 'min', value: 1 }],
          },
        ],
        rules: [],
        metadata: {},
      },
      metadata: { service: 'playbook-auditor' },
    };

    this.dataProcessor.registerPipeline(compliancePipeline);
  }

  /**
   * Create pipelines for API server
   */
  private async createAPIServerPipelines(): Promise<void> {
    // Dashboard data processing pipeline
    const dashboardPipeline = {
      id: 'dashboard-data-processing',
      name: 'Dashboard Data Processing',
      description: 'Process dashboard metrics and analytics data',
      steps: [
        {
          id: 'validate-metrics',
          name: 'Validate Metrics Data',
          type: 'validation',
          config: { timeout: 3000 },
          enabled: true,
          order: 1,
        },
        {
          id: 'enrich-data',
          name: 'Enrich Data',
          type: 'enrichment',
          config: { timeout: 5000 },
          enabled: true,
          order: 2,
        },
        {
          id: 'cache-results',
          name: 'Cache Results',
          type: 'persistence',
          config: { timeout: 2000 },
          enabled: true,
          order: 3,
        },
      ],
      metadata: { service: 'api-server' },
    };

    this.dataProcessor.registerPipeline(dashboardPipeline);
  }

  /**
   * Create pipelines for WebSocket server
   */
  private async createWebSocketServerPipelines(): Promise<void> {
    // Real-time data streaming pipeline
    const streamingPipeline = {
      id: 'realtime-data-streaming',
      name: 'Real-time Data Streaming',
      description: 'Process and stream real-time data updates',
      steps: [
        {
          id: 'validate-message',
          name: 'Validate Message',
          type: 'validation',
          config: { timeout: 1000 },
          enabled: true,
          order: 1,
        },
        {
          id: 'compress-data',
          name: 'Compress Data',
          type: 'transformation',
          config: { timeout: 2000 },
          enabled: true,
          order: 2,
        },
        {
          id: 'broadcast-message',
          name: 'Broadcast Message',
          type: 'notification',
          config: { timeout: 1000 },
          enabled: true,
          order: 3,
        },
      ],
      metadata: { service: 'websocket-server' },
    };

    this.dataProcessor.registerPipeline(streamingPipeline);
  }

  /**
   * Create pipelines for project management
   */
  private async createProjectManagementPipelines(): Promise<void> {
    // Task processing pipeline
    const taskPipeline = {
      id: 'task-processing',
      name: 'Task Processing',
      description: 'Process project management tasks',
      steps: [
        {
          id: 'validate-task',
          name: 'Validate Task Data',
          type: 'validation',
          config: { timeout: 2000 },
          enabled: true,
          order: 1,
        },
        {
          id: 'update-status',
          name: 'Update Task Status',
          type: 'transformation',
          config: { timeout: 3000 },
          enabled: true,
          order: 2,
        },
        {
          id: 'notify-stakeholders',
          name: 'Notify Stakeholders',
          type: 'notification',
          config: { timeout: 2000 },
          enabled: true,
          order: 3,
        },
      ],
      metadata: { service: 'project-management' },
    };

    this.dataProcessor.registerPipeline(taskPipeline);
  }

  /**
   * Create generic pipelines for unknown services
   */
  private async createGenericServicePipelines(serviceName: string): Promise<void> {
    const genericPipeline = {
      id: `${serviceName}-processing`,
      name: `${serviceName} Data Processing`,
      description: `Generic processing pipeline for ${serviceName}`,
      steps: [
        {
          id: 'validate',
          name: 'Data Validation',
          type: 'validation',
          config: { timeout: 5000 },
          enabled: true,
          order: 1,
        },
        {
          id: 'process',
          name: 'Data Processing',
          type: 'transformation',
          config: { timeout: 10000 },
          enabled: true,
          order: 2,
        },
        {
          id: 'store',
          name: 'Data Storage',
          type: 'persistence',
          config: { timeout: 5000 },
          enabled: true,
          order: 3,
        },
      ],
      metadata: { service: serviceName },
    };

    this.dataProcessor.registerPipeline(genericPipeline);
  }

  // ============================================================================
  // VALIDATION SCHEMA CREATION
  // ============================================================================

  /**
   * Create validation schemas for services
   */
  private async createServiceValidationSchemas(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'playbook-auditor':
        await this.createPlaybookAuditorSchemas();
        break;
      case 'api-server':
        await this.createAPIServerSchemas();
        break;
      case 'websocket-server':
        await this.createWebSocketServerSchemas();
        break;
      case 'project-management':
        await this.createProjectManagementSchemas();
        break;
    }
  }

  private async createPlaybookAuditorSchemas(): Promise<void> {
    const complianceResultSchema = {
      id: 'compliance-result',
      name: 'Compliance Result',
      version: '1.0.0',
      description: 'Schema for compliance audit results',
      fields: [
        {
          name: 'repository',
          type: 'string',
          required: true,
          constraints: [{ type: 'min', value: 1 }],
        },
        {
          name: 'overallScore',
          type: 'number',
          required: true,
          constraints: [
            { type: 'min', value: 0 },
            { type: 'max', value: 100 },
          ],
        },
        {
          name: 'violations',
          type: 'array',
          required: false,
        },
      ],
      rules: [
        {
          id: 'score-range',
          name: 'Score Range Check',
          condition: 'overallScore >= 0 && overallScore <= 100',
          message: 'Overall score must be between 0 and 100',
          severity: 'error',
          enabled: true,
        },
      ],
      metadata: { service: 'playbook-auditor' },
    };

    this.validationService.registerSchema(complianceResultSchema);
  }

  private async createAPIServerSchemas(): Promise<void> {
    const dashboardMetricsSchema = {
      id: 'dashboard-metrics',
      name: 'Dashboard Metrics',
      version: '1.0.0',
      description: 'Schema for dashboard metrics data',
      fields: [
        {
          name: 'totalRevenue',
          type: 'number',
          required: true,
          constraints: [{ type: 'min', value: 0 }],
        },
        {
          name: 'activeUsers',
          type: 'number',
          required: true,
          constraints: [{ type: 'min', value: 0 }],
        },
        {
          name: 'timestamp',
          type: 'string',
          required: true,
        },
      ],
      rules: [],
      metadata: { service: 'api-server' },
    };

    this.validationService.registerSchema(dashboardMetricsSchema);
  }

  private async createWebSocketServerSchemas(): Promise<void> {
    const messageSchema = {
      id: 'websocket-message',
      name: 'WebSocket Message',
      version: '1.0.0',
      description: 'Schema for WebSocket messages',
      fields: [
        {
          name: 'type',
          type: 'string',
          required: true,
          constraints: [{ type: 'min', value: 1 }],
        },
        {
          name: 'payload',
          type: 'object',
          required: false,
        },
        {
          name: 'timestamp',
          type: 'string',
          required: true,
        },
      ],
      rules: [],
      metadata: { service: 'websocket-server' },
    };

    this.validationService.registerSchema(messageSchema);
  }

  private async createProjectManagementSchemas(): Promise<void> {
    const taskSchema = {
      id: 'project-task',
      name: 'Project Task',
      version: '1.0.0',
      description: 'Schema for project management tasks',
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          constraints: [{ type: 'min', value: 1 }],
        },
        {
          name: 'title',
          type: 'string',
          required: true,
          constraints: [{ type: 'min', value: 1 }],
        },
        {
          name: 'status',
          type: 'string',
          required: true,
          constraints: [
            {
              type: 'enum',
              value: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],
            },
          ],
        },
      ],
      rules: [],
      metadata: { service: 'project-management' },
    };

    this.validationService.registerSchema(taskSchema);
  }

  // ============================================================================
  // MIGRATION UTILITIES
  // ============================================================================

  /**
   * Migrate existing service to use new data processing
   */
  async migrateService(serviceName: string): Promise<void> {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    integration.migrationStatus = 'in_progress';
    this.persistIntegration(integration);

    try {
      // Enable all features
      await this.enableDataProcessing(serviceName);
      this.enableErrorContext(serviceName);
      await this.enableValidation(serviceName);
      this.enableMonitoring(serviceName);

      // Measure performance improvements
      await this.measurePerformanceImprovement(serviceName);

      integration.migrationStatus = 'completed';
      this.persistIntegration(integration);

      this.emit('service-migration-completed', serviceName);

    } catch (error) {
      integration.migrationStatus = 'rollback';
      this.persistIntegration(integration);

      // Attempt rollback
      await this.rollbackMigration(serviceName);

      throw error;
    }
  }

  /**
   * Measure performance improvement after migration
   */
  private async measurePerformanceImprovement(serviceName: string): Promise<void> {
    // This would measure before/after metrics
    // For demo purposes, we'll simulate improvements
    const integration = this.integrations.get(serviceName)!;

    integration.performanceMetrics = {
      throughputImprovement: 25, // 25% improvement
      errorReduction: 40, // 40% error reduction
      latencyImprovement: 30, // 30% latency improvement
    };

    this.persistIntegration(integration);
  }

  /**
   * Rollback migration
   */
  private async rollbackMigration(serviceName: string): Promise<void> {
    const integration = this.integrations.get(serviceName);
    if (!integration) return;

    // Disable all features
    integration.dataProcessingEnabled = false;
    integration.errorContextEnabled = false;
    integration.validationEnabled = false;
    integration.monitoringEnabled = false;

    this.persistIntegration(integration);

    this.emit('service-migration-rolled-back', serviceName);
  }

  // ============================================================================
  // INTEGRATION HELPERS
  // ============================================================================

  /**
   * Get service integration wrapper
   */
  getServiceWrapper(serviceName: string) {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service ${serviceName} not integrated`);
    }

    return new ServiceWrapper(
      serviceName,
      integration,
      this.dataProcessor,
      this.errorManager,
      this.validationService,
      this.metricsMonitor
    );
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): ServiceIntegration[] {
    return Array.from(this.integrations.values());
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  private initializeIntegrationTracking(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS service_integrations (
        service_name TEXT PRIMARY KEY,
        version TEXT,
        data_processing_enabled BOOLEAN,
        error_context_enabled BOOLEAN,
        validation_enabled BOOLEAN,
        monitoring_enabled BOOLEAN,
        migration_status TEXT,
        throughput_improvement REAL,
        error_reduction REAL,
        latency_improvement REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Load existing integrations
    const rows = this.db.prepare('SELECT * FROM service_integrations').all();

    for (const row of rows) {
      this.integrations.set(row.service_name, {
        serviceName: row.service_name,
        version: row.version,
        dataProcessingEnabled: row.data_processing_enabled === 1,
        errorContextEnabled: row.error_context_enabled === 1,
        validationEnabled: row.validation_enabled === 1,
        monitoringEnabled: row.monitoring_enabled === 1,
        migrationStatus: row.migration_status,
        performanceMetrics: {
          throughputImprovement: row.throughput_improvement || 0,
          errorReduction: row.error_reduction || 0,
          latencyImprovement: row.latency_improvement || 0,
        },
      });
    }
  }

  private persistIntegration(integration: ServiceIntegration): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO service_integrations
      (service_name, version, data_processing_enabled, error_context_enabled,
       validation_enabled, monitoring_enabled, migration_status,
       throughput_improvement, error_reduction, latency_improvement, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      integration.serviceName,
      integration.version,
      integration.dataProcessingEnabled ? 1 : 0,
      integration.errorContextEnabled ? 1 : 0,
      integration.validationEnabled ? 1 : 0,
      integration.monitoringEnabled ? 1 : 0,
      integration.migrationStatus,
      integration.performanceMetrics.throughputImprovement,
      integration.performanceMetrics.errorReduction,
      integration.performanceMetrics.latencyImprovement,
      new Date().toISOString()
    );
  }
}

// ============================================================================
// SERVICE WRAPPER
// ============================================================================

/**
 * Wrapper class for integrated services
 */
export class ServiceWrapper {
  constructor(
    private serviceName: string,
    private integration: ServiceIntegration,
    private dataProcessor: AdvancedDataProcessingService,
    private errorManager: EnhancedErrorContextManager,
    private validationService: AdvancedDataValidationService,
    private metricsMonitor: AdvancedProcessingMetricsMonitor
  ) {}

  /**
   * Process data with full integration
   */
  async processData<T = any, R = any>(
    pipelineId: string,
    data: T,
    context: any = {}
  ): Promise<R> {
    if (!this.integration.dataProcessingEnabled) {
      throw new Error(`Data processing not enabled for service ${this.serviceName}`);
    }

    // Create error context
    const errorContext = this.errorManager.createContext(
      `process_${Date.now()}`,
      this.serviceName,
      'data-processing',
      'processData',
      {
        metadata: {
          pipelineId,
          dataSize: JSON.stringify(data).length,
        },
      }
    );

    try {
      // Validate data if enabled
      if (this.integration.validationEnabled) {
        const validationResult = await this.validationService.validateData(
          data,
          `${this.serviceName}-input`
        );

        if (!validationResult.isValid) {
          throw new Error(`Data validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Process data
      const result = await this.dataProcessor.processData<T, R>(
        pipelineId,
        data,
        {
          source: this.serviceName,
          ...context,
        }
      );

      // Update metrics
      if (this.integration.monitoringEnabled) {
        this.metricsMonitor.updatePipelineMetrics(pipelineId, {
          throughput: result.metrics.recordsProcessed / (result.duration / 1000),
          errorRate: result.metrics.recordsFailed / Math.max(result.metrics.recordsProcessed, 1),
          averageExecutionTime: result.duration,
        });
      }

      return result.data!;

    } catch (error) {
      // Enhanced error reporting
      await this.errorManager.createErrorReport(
        error as Error,
        errorContext.id,
        {
          category: 'application',
          severity: 'high',
        }
      );

      throw error;
    } finally {
      await this.errorManager.closeContext(errorContext.id);
    }
  }

  /**
   * Validate data
   */
  async validateData(data: any, schemaId?: string): Promise<boolean> {
    if (!this.integration.validationEnabled) {
      return true; // Skip validation if not enabled
    }

    const schema = schemaId || `${this.serviceName}-input`;
    const result = await this.validationService.validateData(data, schema);

    return result.isValid;
  }

  /**
   * Transform data
   */
  async transformData(data: any, pipelineId: string): Promise<any> {
    if (!this.integration.dataProcessingEnabled) {
      throw new Error(`Data processing not enabled for service ${this.serviceName}`);
    }

    const result = await this.validationService.transformData(data, pipelineId);

    return result.data;
  }
}

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example: Refactored PlaybookAuditor using new data processing system
 */
export class RefactoredPlaybookAuditor {
  private wrapper: ServiceWrapper;

  constructor(integrationManager: ServiceIntegrationManager) {
    this.wrapper = integrationManager.getServiceWrapper('playbook-auditor');
  }

  async auditRepository(repoPath: string): Promise<any> {
    const auditData = {
      repository: repoPath,
      timestamp: new Date().toISOString(),
      scanType: 'full',
    };

    // Use integrated processing
    const result = await this.wrapper.processData(
      'playbook-compliance-scan',
      auditData,
      {
        userId: 'system',
        metadata: { scanInitiator: 'automated' },
      }
    );

    return result;
  }
}

/**
 * Example: Refactored APIServer using new data processing system
 */
export class RefactoredAPIServer {
  private wrapper: ServiceWrapper;

  constructor(integrationManager: ServiceIntegrationManager) {
    this.wrapper = integrationManager.getServiceWrapper('api-server');
  }

  async getDashboardMetrics(): Promise<any> {
    const requestData = {
      endpoint: '/api/dashboard/metrics',
      timestamp: new Date().toISOString(),
    };

    // Validate and process request
    const isValid = await this.wrapper.validateData(requestData);
    if (!isValid) {
      throw new Error('Invalid request data');
    }

    // Process through pipeline
    const result = await this.wrapper.processData(
      'dashboard-data-processing',
      requestData
    );

    return result;
  }
}

// ============================================================================
// MIGRATION SCRIPTS
// ============================================================================

/**
 * Migration script for existing services
 */
export async function migrateExistingServices(integrationManager: ServiceIntegrationManager): Promise<void> {
  const services = ['playbook-auditor', 'api-server', 'websocket-server', 'project-management'];

  for (const service of services) {
    try {
      console.log(`🚀 Migrating service: ${service}`);

      // Register service
      integrationManager.registerService(service, '1.0.0');

      // Migrate to new system
      await integrationManager.migrateService(service);

      console.log(`✅ Successfully migrated: ${service}`);

    } catch (error) {
      console.error(`❌ Failed to migrate ${service}:`, error);
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default ServiceIntegrationManager;
