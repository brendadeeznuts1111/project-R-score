import { db } from '../connection';
import { redisService } from '../redis-service';
import { WorkflowModel } from '../models/workflow-model';
import { logger } from '../../api/utils/logger';
// Bun-native: use import.meta.dir and Bun.file() instead of fs

export class DatabaseService {
  private workflowModel: WorkflowModel;

  constructor() {
    this.workflowModel = new WorkflowModel();
  }

  // Initialize database connection and Redis
  async initialize(): Promise<void> {
    try {
      await db.connect();
      logger.info('Database connected successfully');

      try {
        await redisService.connect();
        logger.info('Redis connected successfully');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without Redis', { error: redisError });
      }

      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service', { error });
      throw error;
    }
  }

  // Run migrations
  async runMigrations(): Promise<void> {
    try {
      const migrationPath = `${import.meta.dir}/../migrations/001_create_workflows_tables.sql`;
      const migrationSQL = await Bun.file(migrationPath).text();

      await db.transaction(async (client) => {
        await client.query(migrationSQL);
      });

      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Failed to run database migrations', { error });
      throw error;
    }
  }

  // Run seeds
  async runSeeds(): Promise<void> {
    try {
      const seedPath = `${import.meta.dir}/../seeds/initial_data.sql`;
      const seedSQL = await Bun.file(seedPath).text();

      await db.transaction(async (client) => {
        await client.query(seedSQL);
      });

      logger.info('Database seeds completed successfully');
    } catch (error) {
      logger.error('Failed to run database seeds', { error });
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean;
    status: any;
    migrations: boolean;
    redis: {
      connected: boolean;
      status: any;
    };
  }> {
    try {
      const connected = await db.healthCheck();
      const status = db.getStatus();

      // Check if migrations have been run
      const migrationsCheck = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'workflows'
        ) as has_tables
      `);

      const migrations = migrationsCheck.rows[0]?.has_tables || false;

      // Redis health check
      let redisHealth = { connected: false, status: null as any };
      try {
        const redisConnected = await redisService.healthCheck();
        const redisStatus = redisService.getStatus();
        redisHealth = { connected: redisConnected, status: redisStatus };
      } catch (redisError) {
        logger.debug('Redis health check failed', { error: redisError });
      }

      return {
        connected,
        status,
        migrations,
        redis: redisHealth
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      return {
        connected: false,
        status: null,
        migrations: false,
        redis: { connected: false, status: null }
      };
    }
  }

  // Cleanup expired data
  async cleanup(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await db.transaction(async (client) => {
        // Clean up old audit logs (keep last 90 days)
        await client.query(`
          DELETE FROM audit_logs
          WHERE timestamp < $1
        `, [thirtyDaysAgo]);

        // Clean up old analytics data (keep last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        await client.query(`
          DELETE FROM workflow_analytics
          WHERE recorded_at < $1
        `, [sixMonthsAgo]);

        // Clean up expired API keys
        await client.query(`
          UPDATE api_keys
          SET is_active = false
          WHERE expires_at < NOW() AND is_active = true
        `);
      });

      logger.info('Database cleanup completed');
    } catch (error) {
      logger.error('Database cleanup failed', { error });
      throw error;
    }
  }

  // Get database statistics
  async getStats(): Promise<{
    workflows: {
      total: number;
      byStatus: Record<string, number>;
      byPriority: Record<string, number>;
      byType: Record<string, number>;
    };
    approvals: {
      total: number;
      approvalRate: number;
      rejectionRate: number;
    };
    users: {
      total: number;
      active: number;
      byRole: Record<string, number>;
    };
    apiKeys: {
      total: number;
      active: number;
    };
  }> {
    try {
      const [
        workflowStats,
        approvalStats,
        userStats,
        apiKeyStats
      ] = await Promise.all([
        this.getWorkflowStats(),
        this.getApprovalStats(),
        this.getUserStats(),
        this.getApiKeyStats()
      ]);

      return {
        workflows: workflowStats,
        approvals: approvalStats,
        users: userStats,
        apiKeys: apiKeyStats
      };
    } catch (error) {
      logger.error('Failed to get database statistics', { error });
      throw error;
    }
  }

  private async getWorkflowStats() {
    const queries = [
      'SELECT COUNT(*) as total FROM workflows',
      'SELECT status, COUNT(*) as count FROM workflows GROUP BY status',
      'SELECT priority, COUNT(*) as count FROM workflows GROUP BY priority',
      'SELECT workflow_id, COUNT(*) as count FROM workflows GROUP BY workflow_id'
    ];

    const results = await Promise.all(
      queries.map(query => db.query(query))
    );

    const total = parseInt(results[0].rows[0].total);
    const byStatus = Object.fromEntries(
      results[1].rows.map(row => [row.status, parseInt(row.count)])
    );
    const byPriority = Object.fromEntries(
      results[2].rows.map(row => [row.priority, parseInt(row.count)])
    );
    const byType = Object.fromEntries(
      results[3].rows.map(row => [row.workflow_id, parseInt(row.count)])
    );

    return { total, byStatus, byPriority, byType };
  }

  private async getApprovalStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM workflow_approvals
    `);

    const { total, approved, rejected } = result.rows[0];
    const approvalRate = total > 0 ? approved / total : 0;
    const rejectionRate = total > 0 ? rejected / total : 0;

    return {
      total: parseInt(total),
      approvalRate,
      rejectionRate
    };
  }

  private async getUserStats() {
    const queries = [
      'SELECT COUNT(*) as total FROM users',
      'SELECT COUNT(*) as active FROM users WHERE is_active = true',
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    ];

    const results = await Promise.all(
      queries.map(query => db.query(query))
    );

    const total = parseInt(results[0].rows[0].total);
    const active = parseInt(results[1].rows[0].active);
    const byRole = Object.fromEntries(
      results[2].rows.map(row => [row.role, parseInt(row.count)])
    );

    return { total, active, byRole };
  }

  private async getApiKeyStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active
      FROM api_keys
    `);

    return {
      total: parseInt(result.rows[0].total),
      active: parseInt(result.rows[0].active)
    };
  }

  // Expose workflow model methods
  get workflow() {
    return this.workflowModel;
  }

  // Close database connection
  async close(): Promise<void> {
    await db.disconnect();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
