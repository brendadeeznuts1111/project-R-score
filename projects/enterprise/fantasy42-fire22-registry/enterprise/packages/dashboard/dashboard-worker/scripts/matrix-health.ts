#!/usr/bin/env bun

import { Database } from 'bun:sqlite';

// Matrix Health Response Interface
interface MatrixHealthResponse {
  success: boolean;
  status: 'OK' | 'WARNING' | 'ERROR';
  matrix_health_score: number;
  matrix_stats?: {
    total_agents: number;
    total_permissions: number;
    total_matrix_cells: number;
    valid_matrix_cells: number;
    data_completeness: number;
    permission_coverage: number;
    agent_data_quality: number;
  };
  error?: string;
}

// Validation Result Interface
interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

// Repair Result Interface
interface RepairResult {
  success: boolean;
  message: string;
  issues_fixed: number;
  details?: any;
}

class MatrixHealthChecker {
  private db: Database;

  constructor() {
    this.db = new Database('dashboard.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS agent_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL UNIQUE,
          permissions TEXT NOT NULL,
          commission_rates TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS customer_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id TEXT NOT NULL UNIQUE,
          agent_id TEXT NOT NULL,
          permissions TEXT NOT NULL,
          betting_limits TEXT NOT NULL,
          account_settings TEXT NOT NULL,
          vip_status TEXT NOT NULL,
          risk_profile TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          notes TEXT
        )
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS matrix_health_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          check_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          health_score INTEGER NOT NULL,
          total_agents INTEGER NOT NULL,
          total_permissions INTEGER NOT NULL,
          valid_matrix_cells INTEGER NOT NULL,
          data_completeness REAL NOT NULL,
          permission_coverage REAL NOT NULL,
          agent_data_quality REAL NOT NULL,
          issues_found TEXT,
          recommendations TEXT
        )
      `);

      // Insert sample data if tables are empty
      const agentCount = this.db.prepare('SELECT COUNT(*) as count FROM agent_configs').get() as {
        count: number;
      };
      if (agentCount.count === 0) {
        this.insertSampleData();
      }

      // Create views for easier querying
      this.db.exec(`
        CREATE VIEW IF NOT EXISTS v_matrix_health_summary AS
        SELECT 
          MAX(check_timestamp) as last_check,
          AVG(health_score) as avg_health_score,
          AVG(data_completeness) as avg_data_completeness,
          AVG(permission_coverage) as avg_permission_coverage,
          AVG(agent_data_quality) as avg_agent_data_quality
        FROM matrix_health_logs
      `);

      this.db.exec(`
        CREATE VIEW IF NOT EXISTS v_agent_permissions_matrix AS
        SELECT 
          ac.agent_id,
          ac.status as agent_status,
          ac.permissions,
          ac.commission_rates,
          COUNT(cc.customer_id) as total_customers,
          SUM(CASE WHEN cc.status = 'active' THEN 1 ELSE 0 END) as active_customers
        FROM agent_configs ac
        LEFT JOIN customer_configs cc ON ac.agent_id = cc.agent_id
        GROUP BY ac.agent_id, ac.status, ac.permissions, ac.commission_rates
      `);
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  private insertSampleData() {
    try {
      // Sample agent configs
      this.db.exec(`
        INSERT OR REPLACE INTO agent_configs (agent_id, permissions, commission_rates, status) VALUES
        ('AGENT_001', 
         '{"can_place_bets": true, "can_modify_info": true, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": true}',
         '{"standard": 0.05, "vip": 0.08, "premium": 0.10}',
         'active'
        ),
        ('AGENT_002', 
         '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": false}',
         '{"standard": 0.04, "vip": 0.07, "premium": 0.09}',
         'active'
        ),
        ('AGENT_003', 
         '{"can_place_bets": true, "can_modify_info": true, "can_withdraw": false, "can_deposit": true, "can_view_history": true, "can_use_telegram": false, "can_use_mobile": true, "can_use_desktop": true}',
         '{"standard": 0.06, "vip": 0.09, "premium": 0.12}',
         'active'
        )
      `);

      // Sample customer configs
      this.db.exec(`
        INSERT OR REPLACE INTO customer_configs (customer_id, agent_id, permissions, betting_limits, account_settings, vip_status, risk_profile, created_by, updated_by) VALUES
        ('CUSTOMER_001', 'AGENT_001',
         '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": true}',
         '{"max_single_bet": 1000, "max_daily_bet": 5000, "max_weekly_bet": 25000, "max_monthly_bet": 100000, "min_bet": 10}',
         '{"auto_logout_minutes": 30, "session_timeout_hours": 24, "require_2fa": false, "allow_remember_me": true, "notification_preferences": {"email": true, "sms": false, "telegram": true, "push": true}}',
         '{"level": "silver", "benefits": ["priority_support", "special_rates"], "special_rates": 0.05, "priority_support": true}',
         '{"risk_level": "medium", "max_exposure": 5000, "daily_loss_limit": 1000, "weekly_loss_limit": 5000, "monthly_loss_limit": 20000}',
         'SYSTEM', 'SYSTEM'
        ),
        ('CUSTOMER_002', 'AGENT_002',
         '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": false}',
         '{"max_single_bet": 500, "max_daily_bet": 2500, "max_weekly_bet": 12500, "max_monthly_bet": 50000, "min_bet": 5}',
         '{"auto_logout_minutes": 15, "session_timeout_hours": 12, "require_2fa": true, "allow_remember_me": false, "notification_preferences": {"email": true, "sms": true, "telegram": false, "push": false}}',
         '{"level": "bronze", "benefits": ["basic_support"], "special_rates": 0.04, "priority_support": false}',
         '{"risk_level": "low", "max_exposure": 2500, "daily_loss_limit": 500, "weekly_loss_limit": 2500, "monthly_loss_limit": 10000}',
         'SYSTEM', 'SYSTEM'
        )
      `);

      console.log('✅ Sample data inserted successfully');
    } catch (error) {
      console.error('Error inserting sample data:', error);
    }
  }

  async checkMatrixHealth(): Promise<MatrixHealthResponse> {
    try {
      // Check agent configs
      const agentConfigs = this.db.prepare('SELECT * FROM agent_configs').all() as any[];

      // Check customer configs
      const customerConfigs = this.db.prepare('SELECT * FROM customer_configs').all() as any[];

      // Calculate matrix health metrics
      const totalAgents = agentConfigs.length;
      const totalPermissions = this.calculateTotalPermissions(agentConfigs);
      const validMatrixCells = this.countValidMatrixCells(agentConfigs, customerConfigs);
      const dataCompleteness = this.calculateDataCompleteness(agentConfigs, customerConfigs);
      const permissionCoverage = this.calculatePermissionCoverage(agentConfigs);
      const agentDataQuality = this.calculateAgentDataQuality(agentConfigs);

      // Calculate overall health score
      const healthScore = Math.round(
        (dataCompleteness + permissionCoverage + agentDataQuality) / 3
      );

      // Log the health check
      this.logMatrixHealth({
        health_score: healthScore,
        total_agents: totalAgents,
        total_permissions: totalPermissions,
        valid_matrix_cells: validMatrixCells,
        data_completeness: dataCompleteness,
        permission_coverage: permissionCoverage,
        agent_data_quality: agentDataQuality,
        issues_found: this.identifyIssues(agentConfigs, customerConfigs),
        recommendations: this.generateRecommendations(
          healthScore,
          dataCompleteness,
          permissionCoverage,
          agentDataQuality
        ),
      });

      return {
        success: true,
        status: healthScore >= 80 ? 'OK' : healthScore >= 60 ? 'WARNING' : 'ERROR',
        matrix_health_score: healthScore,
        matrix_stats: {
          total_agents: totalAgents,
          total_permissions: totalPermissions,
          total_matrix_cells: totalAgents * totalPermissions,
          valid_matrix_cells: validMatrixCells,
          data_completeness: dataCompleteness,
          permission_coverage: permissionCoverage,
          agent_data_quality: agentDataQuality,
        },
      };
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        matrix_health_score: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateTotalPermissions(agentConfigs: any[]): number {
    return agentConfigs.reduce((total, agent) => {
      try {
        const permissions = JSON.parse(agent.permissions);
        return total + Object.keys(permissions).length;
      } catch {
        return total;
      }
    }, 0);
  }

  private countValidMatrixCells(agentConfigs: any[], customerConfigs: any[]): number {
    let validCells = 0;

    for (const agent of agentConfigs) {
      try {
        const permissions = JSON.parse(agent.permissions);
        for (const permission of Object.values(permissions)) {
          if (permission !== null && permission !== undefined) {
            validCells++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return validCells;
  }

  private calculateDataCompleteness(agentConfigs: any[], customerConfigs: any[]): number {
    const totalFields = agentConfigs.length * 8; // 8 fields per agent
    let completedFields = 0;

    for (const agent of agentConfigs) {
      const fields = [
        'agent_id',
        'permissions',
        'commission_rates',
        'status',
        'created_at',
        'updated_at',
      ];
      for (const field of fields) {
        if (agent[field] && agent[field] !== '') {
          completedFields++;
        }
      }
    }

    return Math.round((completedFields / totalFields) * 100);
  }

  private calculatePermissionCoverage(agentConfigs: any[]): number {
    const expectedPermissions = [
      'can_place_bets',
      'can_modify_info',
      'can_withdraw',
      'can_deposit',
      'can_view_history',
      'can_use_telegram',
      'can_use_mobile',
      'can_use_desktop',
    ];
    let totalCoverage = 0;

    for (const agent of agentConfigs) {
      try {
        const permissions = JSON.parse(agent.permissions);
        let agentCoverage = 0;

        for (const expectedPermission of expectedPermissions) {
          if (permissions[expectedPermission] !== undefined) {
            agentCoverage++;
          }
        }

        totalCoverage += (agentCoverage / expectedPermissions.length) * 100;
      } catch {
        // Skip invalid JSON
      }
    }

    return Math.round(totalCoverage / agentConfigs.length);
  }

  private calculateAgentDataQuality(agentConfigs: any[]): number {
    let qualityScore = 0;

    for (const agent of agentConfigs) {
      let agentQuality = 0;

      // Check if permissions JSON is valid
      try {
        JSON.parse(agent.permissions);
        agentQuality += 25;
      } catch {
        // Invalid JSON
      }

      // Check if commission rates JSON is valid
      try {
        JSON.parse(agent.commission_rates);
        agentQuality += 25;
      } catch {
        // Invalid JSON
      }

      // Check required fields
      if (agent.agent_id && agent.agent_id !== '') agentQuality += 25;
      if (agent.status && agent.status !== '') agentQuality += 25;

      qualityScore += agentQuality;
    }

    return Math.round(qualityScore / agentConfigs.length);
  }

  private identifyIssues(agentConfigs: any[], customerConfigs: any[]): string {
    const issues = [];

    // Check for invalid JSON
    for (const agent of agentConfigs) {
      try {
        JSON.parse(agent.permissions);
      } catch {
        issues.push(`Invalid permissions JSON for agent ${agent.agent_id}`);
      }

      try {
        JSON.parse(agent.commission_rates);
      } catch {
        issues.push(`Invalid commission rates JSON for agent ${agent.agent_id}`);
      }
    }

    // Check for missing required fields
    for (const agent of agentConfigs) {
      if (!agent.agent_id || agent.agent_id === '') {
        issues.push(`Missing agent_id for agent ${agent.id}`);
      }
      if (!agent.status || agent.status === '') {
        issues.push(`Missing status for agent ${agent.agent_id}`);
      }
    }

    return issues.join('; ');
  }

  private generateRecommendations(
    healthScore: number,
    dataCompleteness: number,
    permissionCoverage: number,
    agentDataQuality: number
  ): string {
    const recommendations = [];

    if (dataCompleteness < 80) {
      recommendations.push('Complete missing agent configuration data');
    }

    if (permissionCoverage < 80) {
      recommendations.push('Add missing permission fields to agent configurations');
    }

    if (agentDataQuality < 80) {
      recommendations.push('Fix invalid JSON in agent configurations');
    }

    if (healthScore < 60) {
      recommendations.push('Perform comprehensive matrix health review');
    }

    return recommendations.join('; ');
  }

  private logMatrixHealth(data: {
    health_score: number;
    total_agents: number;
    total_permissions: number;
    valid_matrix_cells: number;
    data_completeness: number;
    permission_coverage: number;
    agent_data_quality: number;
    issues_found: string;
    recommendations: string;
  }) {
    try {
      this.db
        .prepare(
          `
        INSERT INTO matrix_health_logs (
          health_score, total_agents, total_permissions, valid_matrix_cells,
          data_completeness, permission_coverage, agent_data_quality,
          issues_found, recommendations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          data.health_score,
          data.total_agents,
          data.total_permissions,
          data.valid_matrix_cells,
          data.data_completeness,
          data.permission_coverage,
          data.agent_data_quality,
          data.issues_found,
          data.recommendations
        );
    } catch (error) {
      console.error('Error logging matrix health:', error);
    }
  }

  async validatePermissionsMatrix(): Promise<ValidationResult> {
    const health = await this.checkMatrixHealth();

    if (health.status === 'OK') {
      return { success: true, message: 'Permissions matrix is healthy' };
    } else {
      return {
        success: false,
        message: `Permissions matrix has issues: ${health.status}`,
        details: health.matrix_stats,
      };
    }
  }

  async repairMatrixIssues(): Promise<RepairResult> {
    try {
      let issuesFixed = 0;

      // Fix invalid JSON in permissions
      const agentConfigs = this.db.prepare('SELECT * FROM agent_configs').all() as any[];

      for (const agent of agentConfigs) {
        let needsUpdate = false;
        let fixedPermissions = agent.permissions;
        let fixedCommissionRates = agent.commission_rates;

        // Fix permissions JSON
        try {
          JSON.parse(agent.permissions);
        } catch {
          // Create default permissions
          fixedPermissions = JSON.stringify({
            can_place_bets: true,
            can_modify_info: false,
            can_withdraw: true,
            can_deposit: true,
            can_view_history: true,
            can_use_telegram: true,
            can_use_mobile: true,
            can_use_desktop: true,
          });
          needsUpdate = true;
          issuesFixed++;
        }

        // Fix commission rates JSON
        try {
          JSON.parse(agent.commission_rates);
        } catch {
          // Create default commission rates
          fixedCommissionRates = JSON.stringify({
            standard: 0.05,
            vip: 0.08,
            premium: 0.1,
          });
          needsUpdate = true;
          issuesFixed++;
        }

        // Update if fixes were applied
        if (needsUpdate) {
          this.db
            .prepare(
              `
            UPDATE agent_configs 
            SET permissions = ?, commission_rates = ?, updated_at = datetime('now')
            WHERE id = ?
          `
            )
            .run(fixedPermissions, fixedCommissionRates, agent.id);
        }
      }

      return {
        success: true,
        message: `Matrix issues repaired successfully`,
        issues_fixed: issuesFixed,
        details: { agents_processed: agentConfigs.length },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to repair matrix issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issues_fixed: 0,
      };
    }
  }

  getMatrixHealthHistory(limit: number = 10): any[] {
    try {
      return this.db
        .prepare(
          `
        SELECT * FROM matrix_health_logs 
        ORDER BY check_timestamp DESC 
        LIMIT ?
      `
        )
        .all(limit) as any[];
    } catch (error) {
      console.error('Error fetching matrix health history:', error);
      return [];
    }
  }

  getCurrentMatrixStatus(): any {
    try {
      return this.db
        .prepare(
          `
        SELECT * FROM v_matrix_health_summary
      `
        )
        .get() as any;
    } catch (error) {
      console.error('Error fetching current matrix status:', error);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const checker = new MatrixHealthChecker();

  console.log('🔍 Fire22 Matrix Health Checker');
  console.log('!==!==!==!==!==!==\n');

  switch (args[0]) {
    case 'validate':
      console.log('🔍 Validating permissions matrix...\n');
      const validation = await checker.validatePermissionsMatrix();
      console.log(JSON.stringify(validation, null, 2));
      break;

    case 'repair':
      console.log('🔧 Repairing matrix issues...\n');
      const repair = await checker.repairMatrixIssues();
      console.log(JSON.stringify(repair, null, 2));
      break;

    case 'status':
      console.log('📊 Matrix health status...\n');
      const status = await checker.checkMatrixHealth();
      console.log(`Matrix Health Score: ${status.matrix_health_score}/100`);
      console.log(`Status: ${status.status}`);
      if (status.matrix_stats) {
        console.log(`Data Completeness: ${status.matrix_stats.data_completeness}%`);
        console.log(`Permission Coverage: ${status.matrix_stats.permission_coverage}%`);
        console.log(`Agent Data Quality: ${status.matrix_stats.agent_data_quality}%`);
      }
      break;

    case 'history':
      console.log('📈 Matrix health history...\n');
      const history = checker.getMatrixHealthHistory(parseInt(args[1]) || 5);
      console.log(JSON.stringify(history, null, 2));
      break;

    case 'summary':
      console.log('📋 Matrix health summary...\n');
      const summary = checker.getCurrentMatrixStatus();
      console.log(JSON.stringify(summary, null, 2));
      break;

    default:
      console.log('🔍 Checking matrix health...\n');
      const health = await checker.checkMatrixHealth();
      console.log(JSON.stringify(health, null, 2));

      if (health.success) {
        console.log(`\n🎯 Matrix Health Score: ${health.matrix_health_score}/100`);
        console.log(`📊 Status: ${health.status}`);
      }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MatrixHealthChecker, MatrixHealthResponse, ValidationResult, RepairResult };
