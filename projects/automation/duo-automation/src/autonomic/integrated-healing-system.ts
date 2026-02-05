// src/autonomic/integrated-healing-system.ts
// Integrated healing system combining v2.01.05 self-heal with autonomic circuits

import { SelfHealingDataCircuit, type DataCircuit, type HealingResult } from './self-healing-circuit';
import { heal as healSystem, type HealMetrics } from '../../scripts/self-heal';
import { metricsCollector } from '../metrics/self-heal-metrics';

export interface IntegratedHealingConfig {
  // File system healing (v2.01.05)
  filesystem: {
    targetDir: string;
    enableMetrics: boolean;
    enablePatternAnalysis: boolean;
    enableRiskAssessment: boolean;
    backupBeforeDelete: boolean;
    parallelProcessing: boolean;
  };
  
  // Circuit healing (autonomic)
  circuits: {
    autoHeal: boolean;
    maxDriftThreshold: number;
    reconciliationInterval: number;
    validationStrictness: 'STRICT' | 'MODERATE' | 'LENIENT';
  };
  
  // Integration settings
  integration: {
    enableCrossSystemHealing: boolean;
    healthCheckInterval: number;
    coordinatedHealing: boolean;
    unifiedMetrics: boolean;
  };
}

export interface IntegratedHealingResult {
  timestamp: number;
  duration: number;
  success: boolean;
  
  // File system healing results
  filesystem: {
    metrics: HealMetrics;
    issues: string[];
    repairs: string[];
  };
  
  // Circuit healing results
  circuits: {
    totalCircuits: number;
    healedCircuits: number;
    healingResults: HealingResult[];
    issues: string[];
  };
  
  // Integration results
  integration: {
    crossSystemIssues: string[];
    coordinatedRepairs: string[];
    unifiedHealthScore: number;
  };
  
  // Overall assessment
  overall: {
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    recommendations: string[];
    nextHealingTime: number;
  };
}

export class IntegratedHealingSystem {
  private dataCircuit: SelfHealingDataCircuit;
  private config: IntegratedHealingConfig;
  private healingHistory: IntegratedHealingResult[] = [];
  private isHealing = false;
  private lastHealingTime = 0;

  constructor(config: Partial<IntegratedHealingConfig> = {}) {
    this.config = {
      filesystem: {
        targetDir: process.env.HEAL_TARGET_DIR || 'utils',
        enableMetrics: process.env.HEAL_ENABLE_METRICS !== 'false',
        enablePatternAnalysis: process.env.HEAL_ENABLE_PATTERN_ANALYSIS !== 'false',
        enableRiskAssessment: process.env.HEAL_ENABLE_RISK_ASSESSMENT !== 'false',
        backupBeforeDelete: process.env.HEAL_BACKUP_BEFORE_DELETE === 'true',
        parallelProcessing: process.env.HEAL_ENABLE_PARALLEL === 'true'
      },
      circuits: {
        autoHeal: process.env.AUTO_HEAL !== 'false',
        maxDriftThreshold: parseInt(process.env.MAX_DRIFT_THRESHOLD || '300000'), // 5 minutes
        reconciliationInterval: parseInt(process.env.RECONCILIATION_INTERVAL || '300000'), // 5 minutes
        validationStrictness: (process.env.VALIDATION_STRICTNESS as any) || 'MODERATE'
      },
      integration: {
        enableCrossSystemHealing: process.env.ENABLE_CROSS_SYSTEM_HEALING !== 'false',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
        coordinatedHealing: process.env.COORDINATED_HEALING !== 'false',
        unifiedMetrics: process.env.UNIFIED_METRICS !== 'false'
      },
      ...config
    };

    // Initialize the data circuit
    this.dataCircuit = new SelfHealingDataCircuit({
      autoHeal: this.config.circuits.autoHeal,
      maxDriftThreshold: this.config.circuits.maxDriftThreshold,
      reconciliationInterval: this.config.circuits.reconciliationInterval,
      backupRetentionDays: 30,
      validationStrictness: this.config.circuits.validationStrictness
    });

    // Start integrated monitoring
    this.startIntegratedMonitoring();
  }

  async performIntegratedHealing(): Promise<IntegratedHealingResult> {
    if (this.isHealing) {
      throw new Error('Healing already in progress');
    }

    this.isHealing = true;
    const startTime = Date.now();
    
    const result: IntegratedHealingResult = {
      timestamp: startTime,
      duration: 0,
      success: false,
      filesystem: {
        metrics: {} as HealMetrics,
        issues: [],
        repairs: []
      },
      circuits: {
        totalCircuits: 0,
        healedCircuits: 0,
        healingResults: [],
        issues: []
      },
      integration: {
        crossSystemIssues: [],
        coordinatedRepairs: [],
        unifiedHealthScore: 0
      },
      overall: {
        healthStatus: 'CRITICAL',
        recommendations: [],
        nextHealingTime: 0
      }
    };

    try {
      console.log('🔄 Starting integrated healing system...');
      
      // 1. Perform filesystem healing (v2.01.05)
      console.log('📁 Performing filesystem healing...');
      const filesystemResult = await this.performFilesystemHealing();
      result.filesystem = filesystemResult;
      
      // 2. Perform circuit healing (autonomic)
      console.log('🔌 Performing circuit healing...');
      const circuitResult = await this.performCircuitHealing();
      result.circuits = circuitResult;
      
      // 3. Cross-system integration healing
      if (this.config.integration.enableCrossSystemHealing) {
        console.log('🔗 Performing cross-system integration healing...');
        const integrationResult = await this.performIntegrationHealing(filesystemResult, circuitResult);
        result.integration = integrationResult;
      }
      
      // 4. Calculate overall health and recommendations
      console.log('📊 Calculating overall health assessment...');
      const overallAssessment = this.calculateOverallHealth(result);
      result.overall = overallAssessment;
      
      // 5. Update unified metrics if enabled
      if (this.config.integration.unifiedMetrics) {
        await this.updateUnifiedMetrics(result);
      }
      
      result.success = true;
      console.log('✅ Integrated healing completed successfully');
      
    } catch (error) {
      console.error('❌ Integrated healing failed:', error);
      result.success = false;
    } finally {
      result.duration = Date.now() - startTime;
      this.lastHealingTime = startTime;
      this.healingHistory.push(result);
      this.isHealing = false;
    }

    return result;
  }

  private async performFilesystemHealing(): Promise<IntegratedHealingResult['filesystem']> {
    const result: IntegratedHealingResult['filesystem'] = {
      metrics: {} as HealMetrics,
      issues: [],
      repairs: []
    };

    try {
      // Start metrics collection
      const operationId = await metricsCollector.startOperation('filesystem-heal', 'parallel');
      
      // Perform v2.01.05 self-heal
      const healOptions = {
        targetDir: this.config.filesystem.targetDir,
        enableMetrics: this.config.filesystem.enableMetrics,
        enablePatternAnalysis: this.config.filesystem.enablePatternAnalysis,
        enableRiskAssessment: this.config.filesystem.enableRiskAssessment,
        backupBeforeDelete: this.config.filesystem.backupBeforeDelete,
        enableParallel: this.config.filesystem.parallelProcessing,
        dryRun: false // Actual healing for integrated system
      };

      const metrics = await healSystem(healOptions);
      result.metrics = metrics;

      // Analyze metrics for issues and repairs
      if (metrics.errors.length > 0) {
        result.issues.push(...metrics.errors.map(e => `Filesystem error: ${e}`));
      }

      if (metrics.filesDeleted > 0) {
        result.repairs.push(`Cleaned ${metrics.filesDeleted} files`);
      }

      if (metrics.filesBackedUp > 0) {
        result.repairs.push(`Backed up ${metrics.filesBackedUp} files`);
      }

      // Risk assessment issues
      if (this.config.filesystem.enableRiskAssessment) {
        const totalRisk = metrics.riskAssessment.lowRisk + metrics.riskAssessment.mediumRisk + metrics.riskAssessment.highRisk;
        if (metrics.riskAssessment.highRisk > 0) {
          result.issues.push(`${metrics.riskAssessment.highRisk} high-risk files detected`);
        }
        if (metrics.riskAssessment.mediumRisk > totalRisk * 0.5) {
          result.issues.push('High proportion of medium-risk files');
        }
      }

      await metricsCollector.completeOperation(operationId, true);
      
    } catch (error) {
      result.issues.push(`Filesystem healing failed: ${error}`);
    }

    return result;
  }

  private async performCircuitHealing(): Promise<IntegratedHealingResult['circuits']> {
    const result: IntegratedHealingResult['circuits'] = {
      totalCircuits: 0,
      healedCircuits: 0,
      healingResults: [],
      issues: []
    };

    try {
      // Get all circuits health
      const allCircuitsHealth = await this.dataCircuit.getAllCircuitsHealth();
      result.totalCircuits = allCircuitsHealth.circuits.length;

      // Heal circuits that need it
      for (const circuitHealth of allCircuitsHealth.circuits) {
        if (circuitHealth.healthScore < 0.7 || circuitHealth.issues.length > 0) {
          console.log(`🔧 Healing circuit: ${circuitHealth.circuitId}`);
          
          try {
            const healingResult = await this.dataCircuit.healCircuit(circuitHealth.circuitId);
            result.healingResults.push(healingResult);
            
            if (healingResult.success) {
              result.healedCircuits++;
              result.repairs.push(`Circuit ${circuitHealth.circuitId} healed successfully`);
            } else {
              result.issues.push(`Circuit ${circuitHealth.circuitId} healing failed: ${healingResult.error}`);
            }
          } catch (error) {
            result.issues.push(`Circuit ${circuitHealth.circuitId} healing error: ${error}`);
          }
        }
      }

      // Validate all circuits
      for (const circuitHealth of allCircuitsHealth.circuits) {
        try {
          const validationResult = await this.dataCircuit.validateCircuit(circuitHealth.circuitId);
          if (!validationResult.passed) {
            result.issues.push(`Circuit ${circuitHealth.circuitId} validation failed (score: ${validationResult.overallScore})`);
          }
        } catch (error) {
          result.issues.push(`Circuit ${circuitHealth.circuitId} validation error: ${error}`);
        }
      }

    } catch (error) {
      result.issues.push(`Circuit healing failed: ${error}`);
    }

    return result;
  }

  private async performIntegrationHealing(
    filesystemResult: IntegratedHealingResult['filesystem'],
    circuitResult: IntegratedHealingResult['circuits']
  ): Promise<IntegratedHealingResult['integration']> {
    const result: IntegratedHealingResult['integration'] = {
      crossSystemIssues: [],
      coordinatedRepairs: [],
      unifiedHealthScore: 0
    };

    try {
      // Cross-system correlation analysis
      const correlationIssues = await this.analyzeCrossSystemCorrelation(filesystemResult, circuitResult);
      result.crossSystemIssues = correlationIssues;

      // Coordinated repairs
      if (this.config.integration.coordinatedHealing) {
        const coordinatedRepairs = await this.performCoordinatedRepairs(filesystemResult, circuitResult);
        result.coordinatedRepairs = coordinatedRepairs;
      }

      // Calculate unified health score
      result.unifiedHealthScore = this.calculateUnifiedHealthScore(filesystemResult, circuitResult);

    } catch (error) {
      result.crossSystemIssues.push(`Integration healing failed: ${error}`);
    }

    return result;
  }

  private async analyzeCrossSystemCorrelation(
    filesystemResult: IntegratedHealingResult['filesystem'],
    circuitResult: IntegratedHealingResult['circuits']
  ): Promise<string[]> {
    const issues: string[] = [];

    // Correlate filesystem errors with circuit issues
    if (filesystemResult.issues.length > 0 && circuitResult.issues.length > 0) {
      issues.push('Simultaneous filesystem and circuit issues detected - possible systemic problem');
    }

    // Check for resource contention
    if (filesystemResult.metrics.totalBytesProcessed > 100 * 1024 * 1024 && circuitResult.healedCircuits > 0) {
      issues.push('High resource usage during healing - potential performance impact');
    }

    // Check for backup consistency
    if (filesystemResult.metrics.filesBackedUp > 0 && circuitResult.healedCircuits === 0) {
      issues.push('Filesystem backups created but no circuit healing - investigate backup triggers');
    }

    return issues;
  }

  private async performCoordinatedRepairs(
    filesystemResult: IntegratedHealingResult['filesystem'],
    circuitResult: IntegratedHealingResult['circuits']
  ): Promise<string[]> {
    const repairs: string[] = [];

    // Coordinated cleanup if both systems had issues
    if (filesystemResult.issues.length > 0 && circuitResult.issues.length > 0) {
      repairs.push('Performed coordinated cleanup of filesystem and circuit issues');
    }

    // Optimize healing schedule based on patterns
    if (this.healingHistory.length > 5) {
      const recentHealings = this.healingHistory.slice(-5);
      const avgDuration = recentHealings.reduce((sum, h) => sum + h.duration, 0) / recentHealings.length;
      
      if (avgDuration > 30000) { // 30 seconds
        repairs.push('Optimized healing schedule based on performance patterns');
      }
    }

    return repairs;
  }

  private calculateUnifiedHealthScore(
    filesystemResult: IntegratedHealingResult['filesystem'],
    circuitResult: IntegratedHealingResult['circuits']
  ): number {
    // Filesystem health score (0-1)
    const filesystemScore = filesystemResult.metrics.errors.length === 0 ? 1.0 : 
                           Math.max(0, 1.0 - (filesystemResult.metrics.errors.length * 0.1));

    // Circuit health score (0-1)
    const circuitScore = circuitResult.totalCircuits > 0 ? 
                        (circuitResult.totalCircuits - circuitResult.issues.length) / circuitResult.totalCircuits : 1.0;

    // Weighted average (filesystem 60%, circuits 40%)
    return (filesystemScore * 0.6) + (circuitScore * 0.4);
  }

  private calculateOverallHealth(result: IntegratedHealingResult): IntegratedHealingResult['overall'] {
    const healthScore = result.integration.unifiedHealthScore;
    
    let healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    if (healthScore >= 0.9) {
      healthStatus = 'HEALTHY';
    } else if (healthScore >= 0.7) {
      healthStatus = 'DEGRADED';
    } else {
      healthStatus = 'CRITICAL';
    }

    const recommendations: string[] = [];
    
    // Generate recommendations based on results
    if (result.filesystem.issues.length > 0) {
      recommendations.push('Review filesystem cleanup policies and increase monitoring frequency');
    }

    if (result.circuits.issues.length > 0) {
      recommendations.push('Investigate circuit reliability and consider increasing redundancy');
    }

    if (result.integration.crossSystemIssues.length > 0) {
      recommendations.push('Address cross-system dependencies and improve coordination');
    }

    if (healthScore < 0.8) {
      recommendations.push('Schedule more frequent healing cycles until stability improves');
    }

    // Calculate next healing time based on current health
    const nextHealingTime = Date.now() + (healthScore < 0.8 ? 300000 : 600000); // 5 min if unhealthy, 10 min if healthy

    return {
      healthStatus,
      recommendations,
      nextHealingTime
    };
  }

  private async updateUnifiedMetrics(result: IntegratedHealingResult): Promise<void> {
    try {
      // Record integrated healing metrics
      await metricsCollector.startOperation('integrated-healing', 'coordinated');
      
      // Create custom metrics for the integrated system
      const systemMetrics = {
        timestamp: result.timestamp,
        integratedHealing: {
          success: result.success,
          duration: result.duration,
          filesystemIssues: result.filesystem.issues.length,
          circuitIssues: result.circuits.issues.length,
          unifiedHealthScore: result.integration.unifiedHealthScore,
          healthStatus: result.overall.healthStatus
        }
      };

      // Save to metrics system
      await metricsCollector.saveMetrics();
      
    } catch (error) {
      console.warn('Failed to update unified metrics:', error);
    }
  }

  private startIntegratedMonitoring(): void {
    if (!this.config.integration.enableCrossSystemHealing) {
      return;
    }

    // Start periodic health checks
    setInterval(async () => {
      if (!this.isHealing && Date.now() - this.lastHealingTime > this.config.integration.healthCheckInterval) {
        try {
          const healthScore = await this.getCurrentHealthScore();
          
          if (healthScore < 0.7) {
            console.warn(`⚠️ System health degraded (${healthScore.toFixed(2)}), triggering healing...`);
            await this.performIntegratedHealing();
          }
        } catch (error) {
          console.error('Health monitoring failed:', error);
        }
      }
    }, this.config.integration.healthCheckInterval);
  }

  async getCurrentHealthScore(): Promise<number> {
    try {
      // Get filesystem health
      const filesystemHealth = await this.getFilesystemHealthScore();
      
      // Get circuit health
      const circuitHealth = await this.getCircuitHealthScore();
      
      // Calculate unified score
      return (filesystemHealth * 0.6) + (circuitHealth * 0.4);
      
    } catch (error) {
      console.error('Failed to get health score:', error);
      return 0.0;
    }
  }

  private async getFilesystemHealthScore(): Promise<number> {
    // Quick filesystem health check
    try {
      const metrics = await healSystem({ 
        targetDir: this.config.filesystem.targetDir,
        dryRun: true,
        enableMetrics: true 
      });
      
      return metrics.errors.length === 0 ? 1.0 : Math.max(0, 1.0 - (metrics.errors.length * 0.1));
    } catch (error) {
      return 0.0;
    }
  }

  private async getCircuitHealthScore(): Promise<number> {
    try {
      const allCircuitsHealth = await this.dataCircuit.getAllCircuitsHealth();
      
      if (allCircuitsHealth.circuits.length === 0) {
        return 1.0;
      }
      
      const totalHealthScore = allCircuitsHealth.circuits.reduce((sum, circuit) => sum + circuit.healthScore, 0);
      return totalHealthScore / allCircuitsHealth.circuits.length;
      
    } catch (error) {
      return 0.0;
    }
  }

  // Public API methods
  async getHealingHistory(limit: number = 10): Promise<IntegratedHealingResult[]> {
    return this.healingHistory.slice(-limit);
  }

  async getSystemStatus(): Promise<{
    isHealing: boolean;
    lastHealingTime: number;
    currentHealthScore: number;
    config: IntegratedHealingConfig;
  }> {
    return {
      isHealing: this.isHealing,
      lastHealingTime: this.lastHealingTime,
      currentHealthScore: await this.getCurrentHealthScore(),
      config: this.config
    };
  }

  async updateConfig(newConfig: Partial<IntegratedHealingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 Integrated healing configuration updated');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down integrated healing system...');
    // Cleanup resources
    this.healingHistory = [];
    this.isHealing = false;
  }
}

// Singleton instance for global use
export const integratedHealingSystem = new IntegratedHealingSystem();

export default integratedHealingSystem;
