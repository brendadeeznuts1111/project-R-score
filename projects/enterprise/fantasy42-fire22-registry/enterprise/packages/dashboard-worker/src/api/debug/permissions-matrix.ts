#!/usr/bin/env bun

/**
 * 🔍 Permissions Matrix Debug API
 * Comprehensive debugging endpoints for the Enhanced Permissions Matrix Validation System
 *
 * Endpoints:
 * - /api/debug/permissions-matrix (Structure)
 * - /api/debug/permissions-matrix/validation (Validation Details)
 * - /api/debug/permissions-matrix/agents (Agent Details)
 * - /api/debug/permissions-matrix/performance (Performance Metrics)
 * - /api/debug/permissions-matrix/realtime (Real-Time Status)
 */

import { Env } from '../../env';

interface DebugResponse {
  success: boolean;
  timestamp: string;
  endpoint: string;
  data?: any;
  error?: string;
}

interface MatrixData {
  totalAgents: number;
  matrixStructure: {
    permissions: boolean;
    commissionRates: boolean;
    status: boolean;
    complete: boolean;
  };
  validationSummary: {
    valid: number;
    invalid: number;
    warning: number;
    pending: number;
  };
}

interface ValidationResults {
  structureValidation: {
    status: 'valid' | 'invalid' | 'warning' | 'pending';
    details: string;
    errors: string[];
  };
  commissionValidation: {
    status: 'valid' | 'invalid' | 'warning' | 'pending';
    details: string;
    errors: string[];
  };
  statusValidation: {
    status: 'valid' | 'invalid' | 'warning' | 'pending';
    details: string;
    errors: string[];
  };
  completeValidation: {
    status: 'valid' | 'invalid' | 'warning' | 'pending';
    details: string;
    errors: string[];
  };
}

interface AgentDetails {
  agents: any[];
  agentDetails: {
    total: number;
    withPermissions: number;
    withCommissionRates: number;
    withStatus: number;
    complete: number;
  };
  validationSummary: {
    structureValid: number;
    commissionValid: number;
    statusValid: number;
    completeValid: number;
  };
}

interface PerformanceMetrics {
  responseTimes: {
    average: number;
    min: number;
    max: number;
    p95: number;
  };
  throughput: {
    requestsPerSecond: number;
    totalRequests: number;
    successfulRequests: number;
  };
  cacheStats: {
    hitRate: string;
    cacheSize: number;
    evictions: number;
  };
  validationMetrics: {
    totalValidations: number;
    averageValidationTime: number;
    validationSuccessRate: string;
  };
}

interface RealTimeStatus {
  liveMetrics: {
    totalAgents: number;
    activeValidations: number;
    lastValidationTime: string;
  };
  activeValidations: Array<{
    id: string;
    type: string;
    status: string;
    startTime: string;
  }>;
  systemStatus: string;
  lastUpdate: string;
}

export class PermissionsMatrixDebugAPI {
  private env: Env;
  private startTime: number;
  private requestCount: number;
  private validationCount: number;
  private cacheHits: number;
  private cacheMisses: number;

  constructor(env: Env) {
    this.env = env;
    this.startTime = Date.now();
    this.requestCount = 0;
    this.validationCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 🔍 Main Debug Endpoint - Matrix Structure
   */
  async getMatrixStructure(): Promise<DebugResponse & { data: MatrixData }> {
    try {
      this.requestCount++;

      // Get agents from database
      const agents = await this.getAgentsFromDB();

      // Analyze matrix structure
      const matrixStructure = this.analyzeMatrixStructure(agents);

      // Generate validation summary
      const validationSummary = this.generateValidationSummary(agents);

      const data: MatrixData = {
        totalAgents: agents.length,
        matrixStructure,
        validationSummary,
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix',
        data,
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix',
        error: error.message,
      };
    }
  }

  /**
   * ✅ Validation Details Debug Endpoint
   */
  async getValidationDetails(): Promise<DebugResponse & { data: ValidationResults }> {
    try {
      this.requestCount++;
      this.validationCount++;

      const agents = await this.getAgentsFromDB();

      const data: ValidationResults = {
        structureValidation: this.validatePermissionsStructure(agents),
        commissionValidation: this.validateCommissionRates(agents),
        statusValidation: this.validateAgentStatus(agents),
        completeValidation: this.validateCompleteMatrix(agents),
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/validation',
        data,
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/validation',
        error: error.message,
      };
    }
  }

  /**
   * 👥 Agent Details Debug Endpoint
   */
  async getAgentDetails(): Promise<DebugResponse & { data: AgentDetails }> {
    try {
      this.requestCount++;

      const agents = await this.getAgentsFromDB();

      const agentDetails = this.analyzeAgentDetails(agents);
      const validationSummary = this.generateAgentValidationSummary(agents);

      const data: AgentDetails = {
        agents: agents.slice(0, 10), // Limit to first 10 for performance
        agentDetails,
        validationSummary,
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/agents',
        data,
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/agents',
        error: error.message,
      };
    }
  }

  /**
   * ⚡ Performance Metrics Debug Endpoint
   */
  async getPerformanceMetrics(): Promise<DebugResponse & { data: PerformanceMetrics }> {
    try {
      this.requestCount++;

      const data: PerformanceMetrics = {
        responseTimes: this.calculateResponseTimes(),
        throughput: this.calculateThroughput(),
        cacheStats: this.calculateCacheStats(),
        validationMetrics: this.calculateValidationMetrics(),
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/performance',
        data,
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/performance',
        error: error.message,
      };
    }
  }

  /**
   * 🔄 Real-Time Status Debug Endpoint
   */
  async getRealTimeStatus(): Promise<DebugResponse & { data: RealTimeStatus }> {
    try {
      this.requestCount++;

      const agents = await this.getAgentsFromDB();

      const data: RealTimeStatus = {
        liveMetrics: {
          totalAgents: agents.length,
          activeValidations: this.getActiveValidationsCount(),
          lastValidationTime: this.getLastValidationTime(),
        },
        activeValidations: this.getActiveValidations(),
        systemStatus: this.getSystemStatus(),
        lastUpdate: new Date().toISOString(),
      };

      return {
        success: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/realtime',
        data,
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        endpoint: '/api/debug/permissions-matrix/realtime',
        error: error.message,
      };
    }
  }

  // 🔧 Private Helper Methods

  private async getAgentsFromDB(): Promise<any[]> {
    try {
      // Query agents from D1 database
      const result = await this.env.DB.prepare(
        `
        SELECT 
          agent_id,
          permissions,
          commissionRates,
          status,
          created_at,
          updated_at
        FROM agent_configs 
        ORDER BY created_at DESC
        LIMIT 100
      `
      ).all();

      return result.results || [];
    } catch (error) {
      console.error('Database query failed:', error);
      return [];
    }
  }

  private analyzeMatrixStructure(agents: any[]): MatrixData['matrixStructure'] {
    if (agents.length === 0) {
      return {
        permissions: false,
        commissionRates: false,
        status: false,
        complete: false,
      };
    }

    const firstAgent = agents[0];

    return {
      permissions: !!(firstAgent.permissions && typeof firstAgent.permissions === 'object'),
      commissionRates: !!(
        firstAgent.commissionRates && typeof firstAgent.commissionRates === 'object'
      ),
      status: !!(firstAgent.status && typeof firstAgent.status === 'object'),
      complete: !!(
        firstAgent.agent_id &&
        firstAgent.permissions &&
        firstAgent.commissionRates &&
        firstAgent.status
      ),
    };
  }

  private generateValidationSummary(agents: any[]): MatrixData['validationSummary'] {
    let valid = 0,
      invalid = 0,
      warning = 0,
      pending = 0;

    agents.forEach(agent => {
      const hasPermissions = !!(agent.permissions && typeof agent.permissions === 'object');
      const hasCommissionRates = !!(
        agent.commissionRates && typeof agent.commissionRates === 'object'
      );
      const hasStatus = !!(agent.status && typeof agent.status === 'object');

      if (hasPermissions && hasCommissionRates && hasStatus) {
        valid++;
      } else if (hasPermissions || hasCommissionRates || hasStatus) {
        warning++;
      } else if (agent.agent_id) {
        pending++;
      } else {
        invalid++;
      }
    });

    return { valid, invalid, warning, pending };
  }

  private validatePermissionsStructure(agents: any[]): ValidationResults['structureValidation'] {
    if (agents.length === 0) {
      return {
        status: 'pending',
        details: 'No agents found',
        errors: ['No agents available for validation'],
      };
    }

    const errors: string[] = [];
    let validCount = 0;

    agents.forEach((agent, index) => {
      if (!agent.permissions || typeof agent.permissions !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid permissions object`);
        return;
      }

      const permissionKeys = Object.keys(agent.permissions);
      if (permissionKeys.length === 0) {
        errors.push(`Agent ${index + 1}: No permission keys found`);
        return;
      }

      // Check for required permissions
      const hasCanPlaceBets = 'canPlaceBets' in agent.permissions;
      const hasCanModifyInfo = 'canModifyInfo' in agent.permissions;

      if (!hasCanPlaceBets) {
        errors.push(`Agent ${index + 1}: Missing canPlaceBets permission`);
        return;
      }

      validCount++;
    });

    const status =
      errors.length === 0 ? 'valid' : validCount > agents.length * 0.8 ? 'warning' : 'invalid';

    return {
      status,
      details: `${validCount}/${agents.length} agents have valid permissions structure`,
      errors: errors.slice(0, 10), // Limit errors for performance
    };
  }

  private validateCommissionRates(agents: any[]): ValidationResults['commissionValidation'] {
    if (agents.length === 0) {
      return {
        status: 'pending',
        details: 'No agents found',
        errors: ['No agents available for validation'],
      };
    }

    const errors: string[] = [];
    let validCount = 0;

    agents.forEach((agent, index) => {
      if (!agent.commissionRates || typeof agent.commissionRates !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid commissionRates object`);
        return;
      }

      const requiredRates = ['inet', 'casino', 'propBuilder'];
      const missingRates = requiredRates.filter(rate => !(rate in agent.commissionRates));

      if (missingRates.length > 0) {
        errors.push(`Agent ${index + 1}: Missing commission rates: ${missingRates.join(', ')}`);
        return;
      }

      // Validate rate values
      let totalRate = 0;
      for (const rate of requiredRates) {
        const value = agent.commissionRates[rate];
        if (typeof value !== 'number' || value < 0 || value > 0.5) {
          errors.push(`Agent ${index + 1}: Invalid ${rate} rate: ${value} (must be 0.00-0.50)`);
          return;
        }
        totalRate += value;
      }

      if (totalRate > 1.0) {
        errors.push(`Agent ${index + 1}: Total commission rate ${totalRate} exceeds 100%`);
        return;
      }

      validCount++;
    });

    const status =
      errors.length === 0 ? 'valid' : validCount > agents.length * 0.8 ? 'warning' : 'invalid';

    return {
      status,
      details: `${validCount}/${agents.length} agents have valid commission rates`,
      errors: errors.slice(0, 10),
    };
  }

  private validateAgentStatus(agents: any[]): ValidationResults['statusValidation'] {
    if (agents.length === 0) {
      return {
        status: 'pending',
        details: 'No agents found',
        errors: ['No agents available for validation'],
      };
    }

    const errors: string[] = [];
    let validCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    agents.forEach((agent, index) => {
      if (!agent.status || typeof agent.status !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid status object`);
        return;
      }

      if (typeof agent.status.isActive !== 'boolean') {
        errors.push(`Agent ${index + 1}: Missing or invalid isActive status`);
        return;
      }

      if (!agent.status.lastActivity) {
        errors.push(`Agent ${index + 1}: Missing lastActivity timestamp`);
        return;
      }

      // Check if lastActivity is recent
      try {
        const lastActivity = new Date(agent.status.lastActivity);
        if (lastActivity < thirtyDaysAgo) {
          errors.push(
            `Agent ${index + 1}: Last activity ${lastActivity.toISOString()} is more than 30 days ago`
          );
        }
      } catch (error) {
        errors.push(
          `Agent ${index + 1}: Invalid lastActivity format: ${agent.status.lastActivity}`
        );
        return;
      }

      validCount++;
    });

    const status =
      errors.length === 0 ? 'valid' : validCount > agents.length * 0.8 ? 'warning' : 'invalid';

    return {
      status,
      details: `${validCount}/${agents.length} agents have valid status information`,
      errors: errors.slice(0, 10),
    };
  }

  private validateCompleteMatrix(agents: any[]): ValidationResults['completeValidation'] {
    if (agents.length === 0) {
      return {
        status: 'pending',
        details: 'No agents found',
        errors: ['No agents available for validation'],
      };
    }

    const errors: string[] = [];
    let validCount = 0;

    agents.forEach((agent, index) => {
      // Check all required fields exist
      if (!agent.agent_id) {
        errors.push(`Agent ${index + 1}: Missing agent_id`);
        return;
      }

      if (!agent.permissions || typeof agent.permissions !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid permissions`);
        return;
      }

      if (!agent.commissionRates || typeof agent.commissionRates !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid commissionRates`);
        return;
      }

      if (!agent.status || typeof agent.status !== 'object') {
        errors.push(`Agent ${index + 1}: Missing or invalid status`);
        return;
      }

      // Cross-reference validation
      if (agent.status.isActive && !agent.permissions.canPlaceBets) {
        errors.push(`Agent ${index + 1}: Active agent cannot place bets`);
        return;
      }

      validCount++;
    });

    const status =
      errors.length === 0 ? 'valid' : validCount > agents.length * 0.8 ? 'warning' : 'invalid';

    return {
      status,
      details: `${validCount}/${agents.length} agents have complete and valid matrix data`,
      errors: errors.slice(0, 10),
    };
  }

  private analyzeAgentDetails(agents: any[]): AgentDetails['agentDetails'] {
    if (agents.length === 0) {
      return {
        total: 0,
        withPermissions: 0,
        withCommissionRates: 0,
        withStatus: 0,
        complete: 0,
      };
    }

    let withPermissions = 0,
      withCommissionRates = 0,
      withStatus = 0,
      complete = 0;

    agents.forEach(agent => {
      if (agent.permissions && typeof agent.permissions === 'object') withPermissions++;
      if (agent.commissionRates && typeof agent.commissionRates === 'object') withCommissionRates++;
      if (agent.status && typeof agent.status === 'object') withStatus++;

      if (agent.agent_id && agent.permissions && agent.commissionRates && agent.status) {
        complete++;
      }
    });

    return {
      total: agents.length,
      withPermissions,
      withCommissionRates,
      withStatus,
      complete,
    };
  }

  private generateAgentValidationSummary(agents: any[]): AgentDetails['validationSummary'] {
    if (agents.length === 0) {
      return {
        structureValid: 0,
        commissionValid: 0,
        statusValid: 0,
        completeValid: 0,
      };
    }

    let structureValid = 0,
      commissionValid = 0,
      statusValid = 0,
      completeValid = 0;

    agents.forEach(agent => {
      if (agent.permissions && typeof agent.permissions === 'object') structureValid++;
      if (agent.commissionRates && typeof agent.commissionRates === 'object') commissionValid++;
      if (agent.status && typeof agent.status === 'object') statusValid++;
      if (agent.agent_id && agent.permissions && agent.commissionRates && agent.status)
        completeValid++;
    });

    return {
      structureValid,
      commissionValid,
      statusValid,
      completeValid,
    };
  }

  private calculateResponseTimes(): PerformanceMetrics['responseTimes'] {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = uptime > 0 ? Math.round(uptime / this.requestCount) : 0;

    return {
      average: avgResponseTime,
      min: Math.max(0, avgResponseTime - 50),
      max: avgResponseTime + 100,
      p95: Math.round(avgResponseTime * 1.5),
    };
  }

  private calculateThroughput(): PerformanceMetrics['throughput'] {
    const uptime = Date.now() - this.startTime;
    const requestsPerSecond = uptime > 0 ? this.requestCount / (uptime / 1000) : 0;

    return {
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      totalRequests: this.requestCount,
      successfulRequests: this.requestCount, // Assuming all requests are successful for debug
    };
  }

  private calculateCacheStats(): PerformanceMetrics['cacheStats'] {
    const totalCacheAccess = this.cacheHits + this.cacheMisses;
    const hitRate =
      totalCacheAccess > 0 ? `${Math.round((this.cacheHits / totalCacheAccess) * 100)}%` : '0%';

    return {
      hitRate,
      cacheSize: 1000, // Mock cache size
      evictions: Math.floor(this.cacheMisses / 10), // Mock evictions
    };
  }

  private calculateValidationMetrics(): PerformanceMetrics['validationMetrics'] {
    const avgValidationTime =
      this.validationCount > 0
        ? Math.round((Date.now() - this.startTime) / this.validationCount)
        : 0;

    const successRate =
      this.validationCount > 0
        ? `${Math.round((this.validationCount / this.validationCount) * 100)}%`
        : '0%';

    return {
      totalValidations: this.validationCount,
      averageValidationTime: avgValidationTime,
      validationSuccessRate: successRate,
    };
  }

  private getActiveValidationsCount(): number {
    // Mock active validations count
    return Math.floor(Math.random() * 5) + 1;
  }

  private getLastValidationTime(): string {
    // Mock last validation time
    const time = new Date(Date.now() - Math.random() * 300000); // Within last 5 minutes
    return time.toISOString();
  }

  private getActiveValidations(): RealTimeStatus['activeValidations'] {
    // Mock active validations
    const types = ['structure', 'commission', 'status', 'complete'];
    const statuses = ['running', 'queued', 'processing'];

    return Array.from({ length: this.getActiveValidationsCount() }, (_, i) => ({
      id: `validation_${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      startTime: new Date(Date.now() - Math.random() * 60000).toISOString(), // Within last minute
    }));
  }

  private getSystemStatus(): string {
    // Mock system status based on performance
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = uptime > 0 ? uptime / this.requestCount : 0;

    if (avgResponseTime < 100) return 'Excellent';
    if (avgResponseTime < 500) return 'Good';
    if (avgResponseTime < 1000) return 'Fair';
    return 'Needs Attention';
  }
}

// Export for use in main API
export default PermissionsMatrixDebugAPI;
