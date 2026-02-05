// server/agent-connection-pool.ts
import { AgentTipsManager } from '../agents/tips-system.js';
import { PaymentPlatformManager } from '../agents/payment-platforms.js';
import { PhoneProvisioningManager } from '../agents/phone-provisioning.js';

export interface AgentConnection {
  id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  status: 'active' | 'idle' | 'error' | 'disconnected';
  created: Date;
  lastActive: Date;
  requests: number;
  responseTime: number;
  errorCount: number;
  metadata: {
    payments?: any;
    phoneData?: any;
    riskLevel?: string;
    tips?: any[];
  };
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  customHeaders: Record<string, string>;
}

export class AgentConnectionPool {
  private connections = new Map<string, AgentConnection>();
  private config: ConnectionPoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private requestQueue: Array<{
    agentId: string;
    request: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 50,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000,
      customHeaders: {
        'User-Agent': 'DuoPlus-Agent-Pool/1.0',
        'X-Client-Version': '1.0.0',
        'X-Request-ID': () => this.generateRequestId()
      },
      ...config
    };

    this.startHealthCheck();
  }

  // Add agent to connection pool
  async addAgent(agentData: any): Promise<AgentConnection> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error(`Connection pool full (max: ${this.config.maxConnections})`);
    }

    const connection: AgentConnection = {
      id: agentData.id,
      name: agentData.name,
      department: agentData.department,
      email: agentData.email,
      phone: agentData.phone.number,
      status: 'active',
      created: new Date(),
      lastActive: new Date(),
      requests: 0,
      responseTime: 0,
      errorCount: 0,
      metadata: {
        payments: agentData.payments,
        phoneData: agentData.phone,
        riskLevel: agentData.riskAssessment?.riskLevel,
        tips: agentData.tips
      }
    };

    this.connections.set(agentData.id, connection);
    
    // Test connection
    await this.testConnection(agentData.id);
    
    console.log(`✅ Agent ${agentData.id} added to connection pool`);
    return connection;
  }

  // Remove agent from connection pool
  removeAgent(agentId: string): boolean {
    const removed = this.connections.delete(agentId);
    if (removed) {
      console.log(`🗑️ Agent ${agentId} removed from connection pool`);
    }
    return removed;
  }

  // Execute HTTP request through agent connection
  async executeRequest(agentId: string, options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    proxy?: boolean;
  }): Promise<Response> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      throw new Error(`Agent ${agentId} not found in connection pool`);
    }

    if (connection.status !== 'active') {
      throw new Error(`Agent ${agentId} is not active (status: ${connection.status})`);
    }

    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithAgent(agentId, options);
      
      // Update connection stats
      connection.requests++;
      connection.responseTime = Date.now() - startTime;
      connection.lastActive = new Date();
      connection.errorCount = 0; // Reset error count on success
      
      if (connection.status === 'error') {
        connection.status = 'active'; // Recover from error state
      }
      
      console.log(`📡 Agent ${agentId} request completed in ${connection.responseTime}ms`);
      return response;
      
    } catch (error) {
      connection.errorCount++;
      connection.lastActive = new Date();
      
      if (connection.errorCount >= 3) {
        connection.status = 'error';
        console.warn(`⚠️ Agent ${agentId} marked as error after ${connection.errorCount} failures`);
      }
      
      throw error;
    }
  }

  // Bun HTTP fetch with custom headers and proxy support
  private async fetchWithAgent(agentId: string, options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    proxy?: boolean;
  }): Promise<Response> {
    const connection = this.connections.get(agentId);
    const agentHeaders = {
      ...this.config.customHeaders,
      'X-Agent-ID': agentId,
      'X-Agent-Department': connection?.department || '',
      'X-Agent-Email': connection?.email || '',
      'X-Agent-Phone': connection?.phone || '',
      'X-Agent-Status': connection?.status || '',
      ...options.headers
    };

    // Add dynamic headers
    if (typeof this.config.customHeaders['X-Request-ID'] === 'function') {
      agentHeaders['X-Request-ID'] = this.config.customHeaders['X-Request-ID']();
    }

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: agentHeaders,
      timeout: this.config.timeout
    };

    if (options.body) {
      if (typeof options.body === 'object') {
        fetchOptions.body = JSON.stringify(options.body);
        agentHeaders['Content-Type'] = 'application/json';
      } else {
        fetchOptions.body = options.body;
      }
    }

    // Add proxy support if configured and requested
    if (options.proxy && this.config.proxyConfig) {
      // Note: Bun doesn't have built-in proxy support like Node's https-proxy-agent
      // This would require a proxy implementation or external proxy service
      console.log(`🌐 Proxy request through ${this.config.proxyConfig.host}:${this.config.proxyConfig.port}`);
    }

    let attempt = 0;
    while (attempt < this.config.retryAttempts) {
      try {
        const response = await fetch(options.url, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        attempt++;
        console.warn(`🔄 Request failed for agent ${agentId}, attempt ${attempt}/${this.config.retryAttempts}: ${error.message}`);
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Request failed after ${this.config.retryAttempts} attempts`);
  }

  // Test agent connection
  private async testConnection(agentId: string): Promise<boolean> {
    try {
      const response = await this.executeRequest(agentId, {
        url: 'http://localhost:3002/api/dashboard/health',
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      console.warn(`❌ Connection test failed for agent ${agentId}: ${error.message}`);
      return false;
    }
  }

  // Start health check timer
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      const promises = Array.from(this.connections.keys()).map(async (agentId) => {
        const connection = this.connections.get(agentId);
        if (!connection) return;

        try {
          const isHealthy = await this.testConnection(agentId);
          if (!isHealthy && connection.status === 'active') {
            connection.status = 'idle';
          } else if (isHealthy && connection.status !== 'active') {
            connection.status = 'active';
          }
        } catch (error) {
          if (connection.status === 'active') {
            connection.status = 'error';
          }
        }
      });

      await Promise.all(promises);
    }, this.config.healthCheckInterval);
  }

  // Stop health check timer
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  // Get connection pool statistics
  getStats(): {
    total: number;
    active: number;
    idle: number;
    error: number;
    avgResponseTime: number;
    totalRequests: number;
    utilization: number;
  } {
    const connections = Array.from(this.connections.values());
    const active = connections.filter(c => c.status === 'active').length;
    const idle = connections.filter(c => c.status === 'idle').length;
    const error = connections.filter(c => c.status === 'error').length;
    const totalRequests = connections.reduce((sum, c) => sum + c.requests, 0);
    const avgResponseTime = connections.length > 0 
      ? connections.reduce((sum, c) => sum + c.responseTime, 0) / connections.length 
      : 0;

    return {
      total: connections.length,
      active,
      idle,
      error,
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests,
      utilization: Math.round((active / this.config.maxConnections) * 100)
    };
  }

  // Get active connections
  getActiveConnections(): AgentConnection[] {
    return Array.from(this.connections.values()).filter(c => c.status === 'active');
  }

  // Get connections by department
  getConnectionsByDepartment(): Record<string, AgentConnection[]> {
    const result: Record<string, AgentConnection[]> = {};
    
    for (const connection of this.connections.values()) {
      if (!result[connection.department]) {
        result[connection.department] = [];
      }
      result[connection.department].push(connection);
    }
    
    return result;
  }

  // Update pool configuration
  updateConfig(newConfig: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Connection pool configuration updated');
  }

  // Clear all connections
  clear(): void {
    this.connections.clear();
    console.log('🧹 Connection pool cleared');
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Export connection pool state
  export(): {
    timestamp: string;
    config: ConnectionPoolConfig;
    stats: any;
    connections: AgentConnection[];
  } {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      stats: this.getStats(),
      connections: Array.from(this.connections.values())
    };
  }

  // Import connection pool state
  import(data: {
    connections: AgentConnection[];
    config?: Partial<ConnectionPoolConfig>;
  }): void {
    if (data.config) {
      this.updateConfig(data.config);
    }

    for (const connection of data.connections) {
      this.connections.set(connection.id, connection);
    }

    console.log(`📥 Imported ${data.connections.length} connections to pool`);
  }
}

// Singleton instance
export const agentConnectionPool = new AgentConnectionPool();

// Example usage and helper functions
export class AgentPoolManager {
  // Create agent and add to pool
  static async createAndAddAgent(agentData: any): Promise<AgentConnection> {
    // Create complete agent using existing system
    const { createCompleteAgent } = await import('../agents/create-agent.js');
    const agentResult = await createCompleteAgent([
      `--first=${agentData.firstName || 'Agent'}`,
      `--last=${agentData.lastName || 'User'}`,
      `--dept=${agentData.department || 'operations'}`,
      `--phone-type=${agentData.phoneType || 'virtual'}`
    ]);

    // Add to connection pool
    return await agentConnectionPool.addAgent(agentResult.agent);
  }

  // Execute batch request across multiple agents
  static async executeBatchRequest(agentIds: string[], options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  }): Promise<Array<{ agentId: string; success: boolean; data?: any; error?: string }>> {
    const promises = agentIds.map(async (agentId) => {
      try {
        const response = await agentConnectionPool.executeRequest(agentId, options);
        const data = await response.json();
        return { agentId, success: true, data };
      } catch (error) {
        return { agentId, success: false, error: error.message };
      }
    });

    return await Promise.all(promises);
  }

  // Get agent performance metrics
  static getAgentMetrics(agentId: string): {
    connection: AgentConnection;
    performance: {
      requestsPerMinute: number;
      errorRate: number;
      avgResponseTime: number;
      uptime: number;
    };
  } | null {
    const connection = agentConnectionPool.connections.get(agentId);
    if (!connection) return null;

    const uptime = Date.now() - connection.created.getTime();
    const requestsPerMinute = (connection.requests / uptime) * 60000;
    const errorRate = connection.requests > 0 ? (connection.errorCount / connection.requests) * 100 : 0;

    return {
      connection,
      performance: {
        requestsPerMinute: Math.round(requestsPerMinute),
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: connection.responseTime,
        uptime: Math.round(uptime / 1000) // seconds
      }
    };
  }

  // Cleanup inactive agents
  static cleanupInactiveAgents(maxIdleTime: number = 3600000): number { // 1 hour default
    let cleaned = 0;
    const now = Date.now();

    for (const [agentId, connection] of agentConnectionPool.connections) {
      if (now - connection.lastActive.getTime() > maxIdleTime) {
        agentConnectionPool.removeAgent(agentId);
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} inactive agents`);
    return cleaned;
  }
}

// Export for use in other modules
export default AgentConnectionPool;
