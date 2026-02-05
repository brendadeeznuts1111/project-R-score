/**
 * 🔄 Fire22 Dashboard - Database Migration Strategy
 * Coordinated migration from fragmented schema to unified coordination system
 */

import type { DatabaseConnection } from '../types/database/base';
import { databaseService } from '../services/database/connection';
import { systemCoordinator } from '../services/system-coordinator';

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  priority: number;
  dependencies: string[];
  rollbackable: boolean;
  estimatedDuration: string;
  execute: (db: DatabaseConnection) => Promise<void>;
  rollback?: (db: DatabaseConnection) => Promise<void>;
  verify: (db: DatabaseConnection) => Promise<boolean>;
}

export interface MigrationPlan {
  name: string;
  version: string;
  description: string;
  steps: MigrationStep[];
  totalSteps: number;
  estimatedDuration: string;
}

export interface MigrationResult {
  stepId: string;
  success: boolean;
  error?: string;
  duration: number;
  timestamp: string;
}

/**
 * Database migration coordinator for unified schema transition
 */
export class DatabaseMigrationCoordinator {
  private db: DatabaseConnection;
  private executedSteps: Set<string> = new Set();

  constructor(database?: DatabaseConnection) {
    this.db = database || databaseService.getDatabase();
  }

  /**
   * Get the complete migration plan
   */
  public getMigrationPlan(): MigrationPlan {
    return {
      name: 'Fire22 Unified Schema Migration',
      version: '1.0.0',
      description:
        'Migrate from fragmented schema to unified Fire22-Telegram-Internal coordination system',
      steps: this.getAllMigrationSteps(),
      totalSteps: this.getAllMigrationSteps().length,
      estimatedDuration: '2-4 hours',
    };
  }

  /**
   * Execute complete migration plan
   */
  public async executeMigration(): Promise<MigrationResult[]> {
    const steps = this.getAllMigrationSteps();
    const results: MigrationResult[] = [];

    console.log('🚀 Starting Fire22 unified schema migration...');
    console.log(`📋 Total steps: ${steps.length}`);

    // Check migration status table exists
    await this.initializeMigrationTracking();

    for (const step of steps) {
      const startTime = Date.now();

      try {
        // Check if step already executed
        if (await this.isStepExecuted(step.id)) {
          console.log(`⏭️  Step ${step.id} already executed, skipping...`);
          continue;
        }

        // Check dependencies
        if (!(await this.checkDependencies(step.dependencies))) {
          throw new Error(`Dependencies not met for step ${step.id}`);
        }

        console.log(`🔄 Executing step: ${step.name}`);

        // Execute step
        await step.execute(this.db);

        // Verify step
        if (!(await step.verify(this.db))) {
          throw new Error(`Step verification failed for ${step.id}`);
        }

        // Mark as executed
        await this.markStepExecuted(step.id);
        this.executedSteps.add(step.id);

        const duration = Date.now() - startTime;
        results.push({
          stepId: step.id,
          success: true,
          duration,
          timestamp: new Date().toISOString(),
        });

        console.log(`✅ Step ${step.id} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          stepId: step.id,
          success: false,
          error: error.message,
          duration,
          timestamp: new Date().toISOString(),
        });

        console.error(`❌ Step ${step.id} failed:`, error.message);

        // If step is critical, stop migration
        if (step.priority === 1) {
          console.error('🛑 Critical step failed, stopping migration');
          break;
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`🎯 Migration completed: ${successCount}/${results.length} steps successful`);
    console.log(`⏱️  Total time: ${totalTime}ms`);

    return results;
  }

  /**
   * Get all migration steps in execution order
   */
  private getAllMigrationSteps(): MigrationStep[] {
    return [
      // Phase 1: Core Infrastructure
      this.createMigrationTrackingStep(),
      this.createUnifiedUsersTableStep(),
      this.createDepartmentsTableStep(),

      // Phase 2: Enhanced Fire22 Integration
      this.createEnhancedFire22CustomersStep(),
      this.createEnhancedFire22AgentsStep(),
      this.createEnhancedTransactionsStep(),

      // Phase 3: Telegram Integration
      this.createTelegramTablesStep(),
      this.createSupportTicketsStep(),

      // Phase 4: Coordination & Automation
      this.createWorkflowTablesStep(),
      this.createAnalyticsTablesStep(),
      this.createViewsStep(),
      this.createTriggersStep(),

      // Phase 5: Data Migration
      this.migrateLegacyCustomersStep(),
      this.migrateLegacyTransactionsStep(),
      this.linkExistingTelegramUsersStep(),

      // Phase 6: Optimization
      this.createIndexesStep(),
      this.optimizePerformanceStep(),
    ].sort((a, b) => a.priority - b.priority);
  }

  // !== MIGRATION STEP DEFINITIONS !==

  private createMigrationTrackingStep(): MigrationStep {
    return {
      id: 'create_migration_tracking',
      name: 'Create Migration Tracking',
      description: 'Set up migration tracking and status tables',
      priority: 1,
      dependencies: [],
      rollbackable: true,
      estimatedDuration: '1 minute',
      execute: async db => {
        await db
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS migration_history (
            id INTEGER PRIMARY KEY,
            step_id TEXT UNIQUE NOT NULL,
            step_name TEXT NOT NULL,
            executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            duration INTEGER,
            success BOOLEAN DEFAULT TRUE,
            error_message TEXT
          )
        `
          )
          .run();
      },
      rollback: async db => {
        await db.prepare('DROP TABLE IF EXISTS migration_history').run();
      },
      verify: async db => {
        const result = await db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='migration_history'
        `
          )
          .first();
        return !!result;
      },
    };
  }

  private createUnifiedUsersTableStep(): MigrationStep {
    return {
      id: 'create_unified_users',
      name: 'Create Unified Users Table',
      description: 'Create central users table linking all systems',
      priority: 2,
      dependencies: ['create_migration_tracking'],
      rollbackable: true,
      estimatedDuration: '2 minutes',
      execute: async db => {
        // Read and execute unified schema
        const fs = await import('fs');
        const schemaSQL = fs.readFileSync('./src/database/unified-schema.sql', 'utf8');

        // Extract just the users table creation
        const usersTableSQL =
          schemaSQL.match(/CREATE TABLE IF NOT EXISTS users[\s\S]*?(?=;)/)[0] + ';';
        await db.exec(usersTableSQL);

        // Create initial departments
        await db
          .prepare(
            `
          INSERT OR IGNORE INTO departments (name, display_name, description) VALUES
          ('finance', 'Finance Department', 'Handles deposits, withdrawals, and financial operations'),
          ('support', 'Customer Support', 'General customer service and support'),
          ('vip', 'VIP Services', 'Premium customer service for high-tier clients'),
          ('technical', 'Technical Support', 'System issues and technical problems'),
          ('compliance', 'Compliance & Risk', 'KYC, AML, and risk management'),
          ('management', 'Management', 'Leadership and oversight')
        `
          )
          .run();
      },
      rollback: async db => {
        await db.prepare('DROP TABLE IF EXISTS users').run();
        await db.prepare('DROP TABLE IF EXISTS departments').run();
      },
      verify: async db => {
        const usersTable = await db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='users'
        `
          )
          .first();

        const departmentCount = await db
          .prepare(
            `
          SELECT COUNT(*) as count FROM departments
        `
          )
          .first();

        return !!usersTable && departmentCount.count >= 6;
      },
    };
  }

  private createDepartmentsTableStep(): MigrationStep {
    return {
      id: 'create_departments_structure',
      name: 'Create Departments Structure',
      description: 'Set up department hierarchy and team permissions',
      priority: 3,
      dependencies: ['create_unified_users'],
      rollbackable: true,
      estimatedDuration: '3 minutes',
      execute: async db => {
        // Create team_permissions table
        await db
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS team_permissions (
            id INTEGER PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            department_id INTEGER REFERENCES departments(id),
            permission_level INTEGER DEFAULT 1,
            permissions TEXT,
            customer_access_scope TEXT,
            financial_limits TEXT,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER REFERENCES users(id),
            expires_at TEXT,
            UNIQUE(user_id, department_id)
          )
        `
          )
          .run();

        // Set up default permissions for departments
        const departments = await db.prepare('SELECT * FROM departments').all();

        for (const dept of departments) {
          const defaultPermissions = this.getDefaultPermissionsForDepartment(dept.name);
          await db
            .prepare(
              `
            UPDATE departments SET 
              escalation_rules = ?,
              working_hours = ?
            WHERE id = ?
          `
            )
            .bind(
              JSON.stringify(defaultPermissions.escalation),
              JSON.stringify(defaultPermissions.hours),
              dept.id
            )
            .run();
        }
      },
      verify: async db => {
        const permissionsTable = await db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='team_permissions'
        `
          )
          .first();
        return !!permissionsTable;
      },
    };
  }

  private createEnhancedFire22CustomersStep(): MigrationStep {
    return {
      id: 'create_enhanced_fire22_customers',
      name: 'Create Enhanced Fire22 Customers',
      description: 'Set up enhanced Fire22 customer integration',
      priority: 4,
      dependencies: ['create_departments_structure'],
      rollbackable: true,
      estimatedDuration: '5 minutes',
      execute: async db => {
        await db
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS fire22_customers (
            id INTEGER PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            fire22_customer_id TEXT UNIQUE NOT NULL,
            agent_id TEXT NOT NULL,
            parent_agent TEXT,
            master_agent TEXT,
            login TEXT UNIQUE NOT NULL,
            tier TEXT DEFAULT 'bronze',
            status TEXT DEFAULT 'active',
            balance REAL DEFAULT 0,
            casino_balance REAL DEFAULT 0,
            sports_balance REAL DEFAULT 0,
            freeplay_balance REAL DEFAULT 0,
            credit_limit REAL DEFAULT 0,
            total_deposits REAL DEFAULT 0,
            total_withdrawals REAL DEFAULT 0,
            lifetime_volume REAL DEFAULT 0,
            last_activity TEXT,
            betting_limits TEXT,
            risk_score INTEGER DEFAULT 0,
            vip_status BOOLEAN DEFAULT FALSE,
            kyc_status TEXT DEFAULT 'pending',
            kyc_documents TEXT,
            notes TEXT,
            preferences TEXT,
            fire22_synced_at TEXT,
            sync_version INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `
          )
          .run();

        // Create fire22_agents table
        await db
          .prepare(
            `
          CREATE TABLE IF NOT EXISTS fire22_agents (
            id INTEGER PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            agent_id TEXT UNIQUE NOT NULL,
            agent_login TEXT UNIQUE NOT NULL,
            agent_name TEXT NOT NULL,
            agent_type TEXT DEFAULT 'agent',
            parent_agent TEXT,
            master_agent TEXT,
            level INTEGER DEFAULT 1,
            commission_rate REAL DEFAULT 0,
            territory TEXT,
            specializations TEXT,
            total_customers INTEGER DEFAULT 0,
            active_customers INTEGER DEFAULT 0,
            total_volume REAL DEFAULT 0,
            total_commission REAL DEFAULT 0,
            performance_score INTEGER DEFAULT 0,
            permissions TEXT,
            access_level INTEGER DEFAULT 1,
            allowed_sports TEXT,
            max_bet_limit REAL DEFAULT 0,
            last_login TEXT,
            login_count INTEGER DEFAULT 0,
            contact_email TEXT,
            contact_phone TEXT,
            contact_address TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `
          )
          .run();
      },
      verify: async db => {
        const customersTable = await db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='fire22_customers'
        `
          )
          .first();

        const agentsTable = await db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='fire22_agents'
        `
          )
          .first();

        return !!customersTable && !!agentsTable;
      },
    };
  }

  private migrateLegacyCustomersStep(): MigrationStep {
    return {
      id: 'migrate_legacy_customers',
      name: 'Migrate Legacy Customer Data',
      description: 'Transfer existing customer data to unified schema',
      priority: 10,
      dependencies: ['create_enhanced_fire22_customers'],
      rollbackable: false,
      estimatedDuration: '10 minutes',
      execute: async db => {
        console.log('🔄 Migrating legacy customer data...');

        // Get existing customers from old schema
        const legacyCustomers = await db
          .prepare(
            `
          SELECT * FROM customers WHERE 1=1
        `
          )
          .all();

        console.log(`📊 Found ${legacyCustomers.length} legacy customers to migrate`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const customer of legacyCustomers) {
          try {
            // Create unified user
            const userResult = await db
              .prepare(
                `
              INSERT INTO users (
                uuid, username, first_name, last_name, 
                fire22_customer_id, role, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `
              )
              .bind(
                `user_${customer.customer_id}`,
                customer.username || customer.login,
                customer.first_name || '',
                customer.last_name || '',
                customer.customer_id,
                'customer',
                'active',
                customer.created_at || new Date().toISOString()
              )
              .run();

            // Create Fire22 customer record
            await db
              .prepare(
                `
              INSERT INTO fire22_customers (
                user_id, fire22_customer_id, login, 
                agent_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?)
            `
              )
              .bind(
                userResult.lastInsertRowId,
                customer.customer_id,
                customer.login || customer.username,
                'BLAKEPPH', // Default agent
                customer.created_at || new Date().toISOString(),
                new Date().toISOString()
              )
              .run();

            migratedCount++;
          } catch (error) {
            console.error(`Failed to migrate customer ${customer.customer_id}:`, error);
            errorCount++;
          }
        }

        console.log(
          `✅ Migration completed: ${migratedCount} customers migrated, ${errorCount} errors`
        );
      },
      verify: async db => {
        const unifiedCount = await db
          .prepare(
            `
          SELECT COUNT(*) as count FROM users WHERE role = 'customer'
        `
          )
          .first();

        const fire22Count = await db
          .prepare(
            `
          SELECT COUNT(*) as count FROM fire22_customers
        `
          )
          .first();

        return unifiedCount.count > 0 && fire22Count.count > 0;
      },
    };
  }

  // Additional migration steps would be implemented similarly...
  // For brevity, showing the pattern for the remaining steps

  private createEnhancedFire22AgentsStep(): MigrationStep {
    return {
      id: 'create_enhanced_fire22_agents',
      name: 'Create Enhanced Fire22 Agents',
      description: 'Set up enhanced Fire22 agent integration',
      priority: 5,
      dependencies: ['create_enhanced_fire22_customers'],
      rollbackable: true,
      estimatedDuration: '3 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createEnhancedTransactionsStep(): MigrationStep {
    return {
      id: 'create_enhanced_transactions',
      name: 'Create Enhanced Transactions',
      description: 'Set up enhanced transaction tracking with department assignment',
      priority: 6,
      dependencies: ['create_enhanced_fire22_agents'],
      rollbackable: true,
      estimatedDuration: '4 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createTelegramTablesStep(): MigrationStep {
    return {
      id: 'create_telegram_tables',
      name: 'Create Telegram Integration Tables',
      description: 'Set up Telegram users, messages, and integration',
      priority: 7,
      dependencies: ['create_enhanced_transactions'],
      rollbackable: true,
      estimatedDuration: '5 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createSupportTicketsStep(): MigrationStep {
    return {
      id: 'create_support_tickets',
      name: 'Create Support Ticket System',
      description: 'Set up comprehensive support ticket management',
      priority: 8,
      dependencies: ['create_telegram_tables'],
      rollbackable: true,
      estimatedDuration: '6 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createWorkflowTablesStep(): MigrationStep {
    return {
      id: 'create_workflow_tables',
      name: 'Create Workflow & Automation Tables',
      description: 'Set up department workflows and automation rules',
      priority: 9,
      dependencies: ['create_support_tickets'],
      rollbackable: true,
      estimatedDuration: '4 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createAnalyticsTablesStep(): MigrationStep {
    return {
      id: 'create_analytics_tables',
      name: 'Create Analytics & Reporting Tables',
      description: 'Set up department metrics and performance tracking',
      priority: 11,
      dependencies: ['migrate_legacy_customers'],
      rollbackable: true,
      estimatedDuration: '3 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createViewsStep(): MigrationStep {
    return {
      id: 'create_views',
      name: 'Create Database Views',
      description: 'Create unified views for common queries',
      priority: 12,
      dependencies: ['create_analytics_tables'],
      rollbackable: true,
      estimatedDuration: '2 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createTriggersStep(): MigrationStep {
    return {
      id: 'create_triggers',
      name: 'Create Database Triggers',
      description: 'Set up triggers for data consistency and automation',
      priority: 13,
      dependencies: ['create_views'],
      rollbackable: true,
      estimatedDuration: '3 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private migrateLegacyTransactionsStep(): MigrationStep {
    return {
      id: 'migrate_legacy_transactions',
      name: 'Migrate Legacy Transactions',
      description: 'Transfer existing transaction data with department assignment',
      priority: 14,
      dependencies: ['create_triggers'],
      rollbackable: false,
      estimatedDuration: '15 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private linkExistingTelegramUsersStep(): MigrationStep {
    return {
      id: 'link_telegram_users',
      name: 'Link Existing Telegram Users',
      description: 'Connect existing Telegram users to unified user records',
      priority: 15,
      dependencies: ['migrate_legacy_transactions'],
      rollbackable: false,
      estimatedDuration: '5 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private createIndexesStep(): MigrationStep {
    return {
      id: 'create_indexes',
      name: 'Create Performance Indexes',
      description: 'Create indexes for optimal query performance',
      priority: 16,
      dependencies: ['link_telegram_users'],
      rollbackable: true,
      estimatedDuration: '5 minutes',
      execute: async db => {
        /* Implementation */
      },
      verify: async db => {
        return true;
      },
    };
  }

  private optimizePerformanceStep(): MigrationStep {
    return {
      id: 'optimize_performance',
      name: 'Optimize Database Performance',
      description: 'Run ANALYZE and other performance optimizations',
      priority: 17,
      dependencies: ['create_indexes'],
      rollbackable: false,
      estimatedDuration: '3 minutes',
      execute: async db => {
        await db.prepare('ANALYZE').run();
        await db.prepare('PRAGMA optimize').run();
      },
      verify: async db => {
        return true;
      },
    };
  }

  // !== UTILITY METHODS !==

  private async initializeMigrationTracking(): Promise<void> {
    await this.db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS migration_status (
        id INTEGER PRIMARY KEY,
        migration_name TEXT NOT NULL,
        version TEXT NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        status TEXT DEFAULT 'in_progress',
        steps_completed INTEGER DEFAULT 0,
        steps_total INTEGER DEFAULT 0
      )
    `
      )
      .run();
  }

  private async isStepExecuted(stepId: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `
      SELECT id FROM migration_history WHERE step_id = ? AND success = 1
    `
      )
      .bind(stepId)
      .first();
    return !!result;
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    if (dependencies.length === 0) return true;

    const placeholders = dependencies.map(() => '?').join(',');
    const result = await this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM migration_history 
      WHERE step_id IN (${placeholders}) AND success = 1
    `
      )
      .bind(...dependencies)
      .first();

    return result.count === dependencies.length;
  }

  private async markStepExecuted(stepId: string): Promise<void> {
    await this.db
      .prepare(
        `
      INSERT INTO migration_history (step_id, step_name, success) 
      VALUES (?, ?, 1)
    `
      )
      .bind(stepId, `Step ${stepId}`)
      .run();
  }

  private getDefaultPermissionsForDepartment(departmentName: string): any {
    const permissionMap = {
      finance: {
        escalation: { threshold: 10000, escalate_to: 'management' },
        hours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
      },
      support: {
        escalation: { response_time: 120, escalate_after: 240 },
        hours: { start: '08:00', end: '20:00', timezone: 'America/New_York' },
      },
      vip: {
        escalation: { response_time: 30, priority: 'high' },
        hours: { start: '00:00', end: '23:59', timezone: 'America/New_York' },
      },
      technical: {
        escalation: { severity_threshold: 'high' },
        hours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
      },
      compliance: {
        escalation: { auto_escalate: false },
        hours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
      },
      management: {
        escalation: { final_escalation: true },
        hours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
      },
    };

    return permissionMap[departmentName] || permissionMap.support;
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<any> {
    const steps = this.getAllMigrationSteps();
    const executedSteps = await this.db
      .prepare(
        `
      SELECT step_id FROM migration_history WHERE success = 1
    `
      )
      .all();

    const executedIds = new Set(executedSteps.map(s => s.step_id));

    return {
      totalSteps: steps.length,
      completedSteps: executedSteps.length,
      remainingSteps: steps.length - executedSteps.length,
      progress: (executedSteps.length / steps.length) * 100,
      steps: steps.map(step => ({
        id: step.id,
        name: step.name,
        priority: step.priority,
        completed: executedIds.has(step.id),
        estimatedDuration: step.estimatedDuration,
      })),
    };
  }
}

// Export singleton instance
export const migrationCoordinator = new DatabaseMigrationCoordinator();
export default DatabaseMigrationCoordinator;
