#!/usr/bin/env bun

/**
 * 📊 Database Performance Monitor for Fantasy42-Fire22
 *
 * Real-time performance monitoring and metrics collection
 * Tracks Bun SQLite performance in production environment
 */

import { Database } from 'bun:sqlite';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage: number;
  queryCount: number;
  errorCount: number;
  connectionCount: number;
}

interface DatabaseStats {
  totalQueries: number;
  totalErrors: number;
  avgQueryTime: number;
  peakMemoryUsage: number;
  uptime: number;
  lastBackup: number;
  tableCount: number;
  totalRecords: number;
}

class DatabasePerformanceMonitor {
  private db: Database;
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: Timer;
  private stats: DatabaseStats;

  constructor(dbPath: string = './domain-data.sqlite') {
    this.db = new Database(dbPath);
    this.stats = {
      totalQueries: 0,
      totalErrors: 0,
      avgQueryTime: 0,
      peakMemoryUsage: 0,
      uptime: Date.now(),
      lastBackup: 0,
      tableCount: 0,
      totalRecords: 0,
    };

    this.initializeMonitoring();
    console.log('📊 Database Performance Monitor initialized');
  }

  private initializeMonitoring(): void {
    // Create monitoring tables if they don't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        operation TEXT NOT NULL,
        duration REAL NOT NULL,
        memory_usage REAL NOT NULL,
        query_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        connection_count INTEGER DEFAULT 0
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        status TEXT DEFAULT 'healthy'
      )
    `);

    this.updateDatabaseStats();
  }

  private updateDatabaseStats(): void {
    try {
      // Count tables
      const tables = this.db
        .query(
          `
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `
        )
        .all() as any[];

      this.stats.tableCount = tables.length;

      // Count total records
      let totalRecords = 0;
      for (const table of tables) {
        const count = this.db.query(`SELECT COUNT(*) as count FROM ${table.name}`).get() as any;
        totalRecords += count.count;
      }
      this.stats.totalRecords = totalRecords;
    } catch (error) {
      console.warn('⚠️ Failed to update database stats:', error.message);
    }
  }

  private measureMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(((memUsage.heapUsed + memUsage.external) / 1024 / 1024) * 100) / 100;
  }

  private recordMetric(operation: string, duration: number, error: boolean = false): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration,
      memoryUsage: this.measureMemoryUsage(),
      queryCount: 1,
      errorCount: error ? 1 : 0,
      connectionCount: 1, // Simplified for single connection
    };

    this.metrics.push(metric);

    // Update stats
    this.stats.totalQueries++;
    if (error) this.stats.totalErrors++;
    this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, metric.memoryUsage);

    // Store in database for persistence
    try {
      this.db.run(
        `INSERT INTO performance_metrics
         (timestamp, operation, duration, memory_usage, query_count, error_count, connection_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        metric.timestamp,
        metric.operation,
        metric.duration,
        metric.memoryUsage,
        metric.queryCount,
        metric.errorCount,
        metric.connectionCount
      );
    } catch (dbError) {
      console.warn('⚠️ Failed to store metric in database:', dbError.message);
    }

    // Keep only recent metrics in memory (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Monitoring already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`📊 Starting performance monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }

  private collectSystemMetrics(): void {
    const timestamp = Date.now();

    try {
      // Database size
      const dbSize = this.db
        .query('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
        .get() as any;
      const dbSizeMB = Math.round((dbSize.size / 1024 / 1024) * 100) / 100;

      // Connection count (simplified)
      const connectionCount = 1;

      // Cache hit ratio (simplified)
      const cacheStats = this.db.query('SELECT * FROM pragma_cache').get() as any;
      const cacheHitRatio = cacheStats
        ? Math.round((cacheStats.hit / (cacheStats.hit + cacheStats.miss)) * 100)
        : 0;

      // Store system metrics
      this.db.run(
        'INSERT INTO system_health (timestamp, metric_name, metric_value, status) VALUES (?, ?, ?, ?)',
        timestamp,
        'database_size_mb',
        dbSizeMB,
        'healthy'
      );

      this.db.run(
        'INSERT INTO system_health (timestamp, metric_name, metric_value, status) VALUES (?, ?, ?, ?)',
        timestamp,
        'active_connections',
        connectionCount,
        'healthy'
      );

      this.db.run(
        'INSERT INTO system_health (timestamp, metric_name, metric_value, status) VALUES (?, ?, ?, ?)',
        timestamp,
        'cache_hit_ratio',
        cacheHitRatio,
        'healthy'
      );
    } catch (error) {
      console.warn('⚠️ Failed to collect system metrics:', error.message);
    }
  }

  // Performance monitoring wrapper for database operations
  public async monitorQuery<T>(operation: string, queryFn: () => T): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, false);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, true);
      throw error;
    }
  }

  // Synchronous version for non-async operations
  public monitorSyncQuery<T>(operation: string, queryFn: () => T): T {
    const startTime = performance.now();

    try {
      const result = queryFn();
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, false);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, true);
      throw error;
    }
  }

  public getPerformanceReport(timeRangeMs: number = 3600000): any {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        message: 'No metrics available for the specified time range',
        timeRange: `${timeRangeMs / 1000}s`,
      };
    }

    // Calculate statistics
    const totalQueries = recentMetrics.length;
    const totalErrors = recentMetrics.filter(m => m.errorCount > 0).length;
    const avgQueryTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const maxQueryTime = Math.max(...recentMetrics.map(m => m.duration));
    const minQueryTime = Math.min(...recentMetrics.map(m => m.duration));
    const errorRate = (totalErrors / totalQueries) * 100;

    // Memory usage statistics
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / totalQueries;
    const maxMemoryUsage = Math.max(...recentMetrics.map(m => m.memoryUsage));

    // Query type breakdown
    const queryTypes = recentMetrics.reduce(
      (acc, m) => {
        acc[m.operation] = (acc[m.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      timeRange: `${timeRangeMs / 1000}s`,
      summary: {
        totalQueries,
        totalErrors,
        errorRate: Math.round(errorRate * 100) / 100,
        avgQueryTime: Math.round(avgQueryTime * 100) / 100,
        maxQueryTime: Math.round(maxQueryTime * 100) / 100,
        minQueryTime: Math.round(minQueryTime * 100) / 100,
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        maxMemoryUsage: Math.round(maxMemoryUsage * 100) / 100,
      },
      queryBreakdown: queryTypes,
      databaseStats: this.stats,
      recommendations: this.generateRecommendations({
        avgQueryTime,
        errorRate,
        maxMemoryUsage,
        totalQueries,
      }),
    };
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.avgQueryTime > 100) {
      recommendations.push('⚡ Consider optimizing slow queries - average query time > 100ms');
    }

    if (stats.errorRate > 5) {
      recommendations.push('🚨 High error rate detected - investigate database issues');
    }

    if (stats.maxMemoryUsage > 100) {
      recommendations.push('💾 High memory usage - consider memory optimization');
    }

    if (stats.totalQueries < 10) {
      recommendations.push('📊 Low query volume - consider increasing monitoring frequency');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All performance metrics within acceptable ranges');
    }

    return recommendations;
  }

  public async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/db-backup-${timestamp}.sqlite`;

    try {
      // Create backups directory if it doesn't exist
      await Bun.write(Bun.file('./backups/.gitkeep'), '');

      // SQLite backup using built-in functionality
      this.db.run(`VACUUM INTO '${backupPath}'`);

      this.stats.lastBackup = Date.now();

      console.log(`💾 Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  public getHealthStatus(): any {
    const uptime = Date.now() - this.stats.uptime;
    const uptimeHours = Math.round((uptime / 3600000) * 10) / 10;

    // Get recent system metrics
    try {
      const recentMetrics = this.db
        .query(
          `
        SELECT metric_name, metric_value, status
        FROM system_health
        WHERE timestamp > ?
        ORDER BY timestamp DESC
        LIMIT 10
      `,
          Date.now() - 300000
        )
        .all() as any[]; // Last 5 minutes

      const healthStatus = {
        status: 'healthy',
        uptime: `${uptimeHours} hours`,
        database: {
          tables: this.stats.tableCount,
          records: this.stats.totalRecords,
          lastBackup: this.stats.lastBackup
            ? new Date(this.stats.lastBackup).toISOString()
            : 'Never',
        },
        performance: {
          totalQueries: this.stats.totalQueries,
          totalErrors: this.stats.totalErrors,
          avgQueryTime: Math.round(this.stats.avgQueryTime * 100) / 100,
          peakMemoryUsage: this.stats.peakMemoryUsage,
        },
        recentMetrics,
        monitoring: {
          active: this.isMonitoring,
          metricsInMemory: this.metrics.length,
        },
      };

      // Determine overall status
      if (this.stats.totalErrors > this.stats.totalQueries * 0.1) {
        // >10% error rate
        healthStatus.status = 'warning';
      }
      if (this.stats.totalErrors > this.stats.totalQueries * 0.25) {
        // >25% error rate
        healthStatus.status = 'critical';
      }

      return healthStatus;
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        uptime: `${uptimeHours} hours`,
      };
    }
  }

  public displayDashboard(): void {
    console.clear();
    console.log('🚀 Fantasy42-Fire22 Database Performance Dashboard');
    console.log('='.repeat(60));

    const health = this.getHealthStatus();
    const report = this.getPerformanceReport(300000); // Last 5 minutes

    // Status indicator
    const statusEmoji =
      health.status === 'healthy' ? '🟢' : health.status === 'warning' ? '🟡' : '🔴';
    console.log(`${statusEmoji} Status: ${health.status.toUpperCase()}`);
    console.log(`⏱️  Uptime: ${health.uptime}`);
    console.log('');

    // Database stats
    console.log('💾 Database Health:');
    console.log(`   📊 Tables: ${health.database.tables}`);
    console.log(`   📈 Records: ${health.database.records.toLocaleString()}`);
    console.log(`   💽 Last Backup: ${health.database.lastBackup}`);
    console.log('');

    // Performance metrics
    if (report.summary) {
      console.log('⚡ Performance (Last 5 minutes):');
      console.log(`   🔢 Queries: ${report.summary.totalQueries}`);
      console.log(`   ❌ Errors: ${report.summary.totalErrors} (${report.summary.errorRate}%)`);
      console.log(`   🕐 Avg Query Time: ${report.summary.avgQueryTime}ms`);
      console.log(`   📈 Max Query Time: ${report.summary.maxQueryTime}ms`);
      console.log(
        `   💾 Memory Usage: ${report.summary.avgMemoryUsage}MB (peak: ${report.summary.maxMemoryUsage}MB)`
      );
      console.log('');
    }

    // Recommendations
    if (report.recommendations) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec: string) => {
        console.log(`   ${rec}`);
      });
      console.log('');
    }

    // Recent metrics
    if (health.recentMetrics && health.recentMetrics.length > 0) {
      console.log('📊 Recent System Metrics:');
      health.recentMetrics.slice(0, 3).forEach((metric: any) => {
        console.log(`   ${metric.metric_name}: ${metric.metric_value} (${metric.status})`);
      });
    }

    console.log('');
    console.log('🔄 Monitoring: ' + (health.monitoring.active ? '🟢 Active' : '🔴 Inactive'));
    console.log(`📈 Metrics in Memory: ${health.monitoring.metricsInMemory}`);
    console.log('');
    console.log('Press Ctrl+C to exit dashboard');
  }

  public close(): void {
    this.stopMonitoring();
    this.db.close();
    console.log('🔒 Database Performance Monitor closed');
  }

  // Utility methods for common monitoring scenarios
  public monitorUserOperations(): void {
    // Example: Monitor user registration
    this.monitorSyncQuery('user_registration', () => {
      return this.db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        `user_${Date.now()}`,
        `user${Date.now()}@test.com`,
        'hashed_password'
      );
    });
  }

  public monitorQueryOperations(): void {
    // Example: Monitor user lookup
    this.monitorSyncQuery('user_lookup', () => {
      return this.db.query('SELECT * FROM users WHERE id = ?', 1).get();
    });
  }
}

// Export for use in applications
export { DatabasePerformanceMonitor };

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'dashboard';
  const dbPath = args[1] || './domain-data.sqlite';

  const monitor = new DatabasePerformanceMonitor(dbPath);

  switch (command) {
    case 'start':
      monitor.startMonitoring(10000); // 10 second intervals
      console.log('📊 Performance monitoring started. Press Ctrl+C to stop.');
      // Keep running
      process.on('SIGINT', () => {
        monitor.stopMonitoring();
        monitor.close();
        process.exit(0);
      });
      break;

    case 'dashboard':
      monitor.startMonitoring(5000); // 5 second intervals for dashboard
      // Update dashboard every 2 seconds
      const dashboardInterval = setInterval(() => {
        monitor.displayDashboard();
      }, 2000);

      process.on('SIGINT', () => {
        clearInterval(dashboardInterval);
        monitor.stopMonitoring();
        monitor.close();
        process.exit(0);
      });
      break;

    case 'report':
      const timeRange = parseInt(args[2] || '3600000'); // Default 1 hour
      const report = monitor.getPerformanceReport(timeRange);
      console.log(JSON.stringify(report, null, 2));
      monitor.close();
      break;

    case 'backup':
      monitor
        .createBackup()
        .then(path => {
          console.log(`✅ Backup created: ${path}`);
          monitor.close();
        })
        .catch(error => {
          console.error('❌ Backup failed:', error.message);
          monitor.close();
          process.exit(1);
        });
      break;

    case 'health':
      const health = monitor.getHealthStatus();
      console.log(JSON.stringify(health, null, 2));
      monitor.close();
      break;

    default:
      console.log('Usage: bun run scripts/database-performance-monitor.bun.ts [command] [db-path]');
      console.log('');
      console.log('Commands:');
      console.log('  dashboard  - Interactive performance dashboard');
      console.log('  start      - Start background monitoring');
      console.log('  report     - Generate performance report');
      console.log('  backup     - Create database backup');
      console.log('  health     - Show system health status');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/database-performance-monitor.bun.ts dashboard');
      console.log(
        '  bun run scripts/database-performance-monitor.bun.ts report 1800000  # 30 min report'
      );
      monitor.close();
      break;
  }
}
