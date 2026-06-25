import { ConnectionStatsInspectable } from './inspect-custom';

// ============================================
// ENHANCED CONNECTION SYSTEM INTEGRATION
// ============================================

export interface ConnectionStats {
  host: string;
  activeConnections: number;
  idleConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  failures: number;
  lastUsed: Date;
}

export class EnhancedConnectionStats extends ConnectionStatsInspectable {
  constructor(stats: ConnectionStats) {
    super(
      stats.host,
      stats.activeConnections,
      stats.idleConnections,
      stats.totalRequests,
      stats.averageResponseTime,
      stats.failures,
      stats.lastUsed
    );
  }
  
  // Additional methods for connection management
  getHealthScore(): number {
    const failureRate = this.failures / this.total;
    const utilizationRate = this.active / (this.active + this.idle);
    const responseScore = Math.max(0, 100 - (this.avgTime / 10)); // Penalize slow responses
    
    return Math.round((100 - failureRate * 50) * (1 - utilizationRate * 0.3) * (responseScore / 100));
  }
  
  isHealthy(): boolean {
    return this.getHealthScore() > 70 && this.failures < 5;
  }
  
  needsAttention(): boolean {
    return this.getHealthScore() < 50 || this.failures > 10;
  }
}

// ============================================
// CONNECTION POOL INSPECTION
// ============================================

export interface ConnectionPoolStats {
  id: string;
  host: string;
  maxSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalCreated: number;
  totalDestroyed: number;
  lastActivity: Date;
}

export class ConnectionPoolInspectable extends ConnectionStatsInspectable {
  constructor(
    public poolId: string,
    public host: string,
    public maxSize: number,
    public activeConnections: number,
    public idleConnections: number,
    public waitingRequests: number,
    public totalCreated: number,
    public totalDestroyed: number,
    public lastActivity: Date
  ) {
    super(host, activeConnections, idleConnections, totalCreated + totalDestroyed, 0, 0, lastActivity);
  }
  
  // Override the custom inspection for pool-specific display
  [Symbol.for("Bun.inspect.custom")](): string {
    const utilization = (this.activeConnections / this.maxSize) * 100;
    const efficiency = this.totalCreated > 0 ? ((this.totalDestroyed / this.totalCreated) * 100) : 0;
    
    const barWidth = 20;
    const filled = Math.floor((utilization / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    
    const status = this.waitingRequests > 0 ? '🟡' : 
                   utilization > 80 ? '🔴' : 
                   utilization > 60 ? '🟠' : '🟢';
    
    const lines = [
      `${status} Connection Pool: ${this.poolId}`,
      `${'─'.repeat(50)}`,
      `🌐 Host:       ${this.host}`,
      `📊 Size:       ${this.activeConnections}/${this.maxSize} (${utilization.toFixed(1)}%)`,
      `📈 Utilization:[${bar}]`,
      `💤 Idle:       ${this.idleConnections}`,
      `⏳ Waiting:    ${this.waitingRequests}`,
      `🔄 Lifecycle:  ${this.totalCreated} created, ${this.totalDestroyed} destroyed`,
      `📈 Efficiency: ${efficiency.toFixed(1)}% reuse rate`,
      `🕐 Last Active: ${this.lastActivity.toLocaleString()}`,
    ];
    
    if (this.waitingRequests > 0) {
      lines.push('');
      lines.push(`⚠️  ${this.waitingRequests} requests waiting for connections`);
    }
    
    return lines.join('\n');
  }
}

// ============================================
// CONNECTION MANAGER INTEGRATION
// ============================================

export class ConnectionManager {
  private pools = new Map<string, ConnectionPoolInspectable>();
  private connections = new Map<string, EnhancedConnectionStats>();
  
  addConnection(stats: ConnectionStats): void {
    const enhanced = new EnhancedConnectionStats(stats);
    this.connections.set(stats.host, enhanced);
  }
  
  addPool(stats: ConnectionPoolStats): void {
    const pool = new ConnectionPoolInspectable(
      stats.id,
      stats.host,
      stats.maxSize,
      stats.activeConnections,
      stats.idleConnections,
      stats.waitingRequests,
      stats.totalCreated,
      stats.totalDestroyed,
      stats.lastActivity
    );
    this.pools.set(stats.id, pool);
  }
  
  getConnection(host: string): EnhancedConnectionStats | undefined {
    return this.connections.get(host);
  }
  
  getPool(id: string): ConnectionPoolInspectable | undefined {
    return this.pools.get(id);
  }
  
  getAllConnections(): EnhancedConnectionStats[] {
    return Array.from(this.connections.values());
  }
  
  getAllPools(): ConnectionPoolInspectable[] {
    return Array.from(this.pools.values());
  }
  
  getHealthyConnections(): EnhancedConnectionStats[] {
    return this.getAllConnections().filter(conn => conn.isHealthy());
  }
  
  getConnectionsNeedingAttention(): EnhancedConnectionStats[] {
    return this.getAllConnections().filter(conn => conn.needsAttention());
  }
  
  // Custom inspection for the entire manager
  [Symbol.for("Bun.inspect.custom")](): string {
    const connections = this.getAllConnections();
    const pools = this.getAllPools();
    const healthy = this.getHealthyConnections();
    const needAttention = this.getConnectionsNeedingAttention();
    
    const lines = [
      '🔗 CONNECTION MANAGER',
      `${'═'.repeat(50)}`,
      `📊 Connections: ${connections.length} total`,
      `  ✅ Healthy: ${healthy.length}`,
      `  ⚠️  Needs Attention: ${needAttention.length}`,
      `  🔴 Unhealthy: ${connections.length - healthy.length}`,
      '',
      `🏊 Pools: ${pools.length} total`,
      '',
    ];
    
    if (needAttention.length > 0) {
      lines.push('⚠️  CONNECTIONS NEEDING ATTENTION:');
      needAttention.slice(0, 3).forEach(conn => {
        lines.push(`  • ${conn.host} - Health: ${conn.getHealthScore()}%`);
      });
      if (needAttention.length > 3) {
        lines.push(`  • ... and ${needAttention.length - 3} more`);
      }
      lines.push('');
    }
    
    if (pools.length > 0) {
      lines.push('🏊 POOL STATUS:');
      pools.slice(0, 2).forEach(pool => {
        const utilization = (pool.activeConnections / pool.maxSize) * 100;
        lines.push(`  • ${pool.poolId}: ${pool.activeConnections}/${pool.maxSize} (${utilization.toFixed(1)}%)`);
      });
      if (pools.length > 2) {
        lines.push(`  • ... and ${pools.length - 2} more pools`);
      }
    }
    
    return lines.join('\n');
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createConnectionStats(data: Partial<ConnectionStats>): ConnectionStats {
  return {
    host: data.host || 'unknown',
    activeConnections: data.activeConnections || 0,
    idleConnections: data.idleConnections || 0,
    totalRequests: data.totalRequests || 0,
    averageResponseTime: data.averageResponseTime || 0,
    failures: data.failures || 0,
    lastUsed: data.lastUsed || new Date(),
  };
}

export function createConnectionPoolStats(data: Partial<ConnectionPoolStats>): ConnectionPoolStats {
  return {
    id: data.id || 'pool-' + Math.random().toString(36).substr(2, 9),
    host: data.host || 'unknown',
    maxSize: data.maxSize || 10,
    activeConnections: data.activeConnections || 0,
    idleConnections: data.idleConnections || 0,
    waitingRequests: data.waitingRequests || 0,
    totalCreated: data.totalCreated || 0,
    totalDestroyed: data.totalDestroyed || 0,
    lastActivity: data.lastActivity || new Date(),
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  ConnectionStatsInspectable,
  EnhancedConnectionStats as ConnectionStats,
  ConnectionPoolInspectable as ConnectionPool,
};
