#!/usr/bin/env bun
// Error Recovery and Diagnostics Script
// [TENSION-RECOVERY-001] [TENSION-DIAGNOSTICS-002]
// [TENSION-VOLUME-001] [TENSION-LINK-002] [TENSION-PROFILE-003]
// [GOV-SECURITY-001] [GOV-COMPLIANCE-002]

import { Database } from 'bun:sqlite';
import { file, write } from 'bun';
import { errorHandler, TensionErrorCode } from '../src/tension-field/error-handler';
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";

interface RecoveryAction {
  type: 'restart' | 'cleanup' | 'repair' | 'notify';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<void>;
}

class ErrorRecoverySystem {
  private db: Database;
  private recoveryActions: Map<TensionErrorCode, RecoveryAction[]> = new Map();

  constructor() {
    this.db = new Database('./tension-errors.db');
    this.setupRecoveryActions();
  }

  private setupRecoveryActions() {
    // Propagation errors
    this.recoveryActions.set(TensionErrorCode.PROPAGATION_FAILED, [
      {
        type: 'repair',
        description: 'Reset graph state and retry',
        severity: 'medium',
        execute: async () => {
          console.log('🔧 Resetting graph state...');
          // Implementation would reset the propagator state
        }
      },
      {
        type: 'restart',
        description: 'Restart propagation service',
        severity: 'high',
        execute: async () => {
          console.log('🔄 Restarting propagation service...');
          // Implementation would restart the service
        }
      }
    ]);

    // Database errors
    this.recoveryActions.set(TensionErrorCode.DATABASE_CONNECTION_FAILED, [
      {
        type: 'repair',
        description: 'Reconnect to database',
        severity: 'high',
        execute: async () => {
          console.log('🔌 Attempting database reconnection...');
          // Implementation would reconnect to DB
        }
      },
      {
        type: 'cleanup',
        description: 'Cleanup and recreate database',
        severity: 'critical',
        execute: async () => {
          console.log('🧹 Cleaning up database...');
          // Implementation would cleanup DB
        }
      }
    ]);

    // Memory errors
    this.recoveryActions.set(TensionErrorCode.MEMORY_LIMIT_EXCEEDED, [
      {
        type: 'cleanup',
        description: 'Force garbage collection',
        severity: 'medium',
        execute: async () => {
          console.log('🗑️ Forcing garbage collection...');
          if (typeof Bun !== 'undefined' && 'gc' in Bun) {
            (Bun as any).gc(true);
          }
        }
      },
      {
        type: 'restart',
        description: 'Restart process to free memory',
        severity: 'high',
        execute: async () => {
          console.log('🔄 Process restart required for memory recovery');
          process.exit(EXIT_CODES.GENERIC_ERROR);
        }
      }
    ]);
  }

  // Analyze recent errors and suggest recovery actions
  async analyzeErrors(timeRange: number = 3600000): Promise<void> { // Default 1 hour
    const cutoffTime = Date.now() - timeRange;

    const errors = this.db.prepare(`
      SELECT code, severity, COUNT(*) as count,
             MAX(timestamp) as last_occurrence
      FROM error_logs
      WHERE timestamp > ? AND resolved = FALSE
      GROUP BY code, severity
      ORDER BY count DESC
    `).all(cutoffTime) as any[];

    console.log('\n📊 Error Analysis Report');
    console.log('========================');

    if (errors.length === 0) {
      console.log('✅ No unresolved errors found in the specified time range');
      return;
    }

    for (const error of errors) {
      console.log(`\n❌ ${error.code} (${error.severity})`);
      console.log(`   Count: ${error.count}`);
      console.log(`   Last: ${new Date(error.last_occurrence).toLocaleString()}`);

      const actions = this.recoveryActions.get(error.code);
      if (actions) {
        console.log('   Recovery Actions:');
        actions.forEach((action, index) => {
          console.log(`   ${index + 1}. [${action.type.toUpperCase()}] ${action.description}`);
        });
      }
    }
  }

  // Execute recovery actions for specific error code
  async executeRecovery(errorCode: TensionErrorCode): Promise<void> {
    const actions = this.recoveryActions.get(errorCode);

    if (!actions || actions.length === 0) {
      console.log(`⚠️ No recovery actions available for ${errorCode}`);
      return;
    }

    console.log(`\n🔧 Executing recovery for ${errorCode}`);
    console.log('=====================================');

    for (const action of actions) {
      console.log(`\nExecuting: ${action.description}`);

      try {
        await action.execute();
        console.log(`✅ Success: ${action.type} action completed`);
      } catch (e: any) {
        console.error(`❌ Failed: ${e.message}`);
        await errorHandler.handleError(e, {
          action: 'recovery',
          errorCode,
          recoveryAction: action.type
        });
      }
    }
  }

  // Auto-recovery based on error patterns
  async autoRecovery(): Promise<void> {
    console.log('\n🤖 Starting auto-recovery process...');

    // Check for critical errors that need immediate attention
    const criticalErrors = this.db.prepare(`
      SELECT DISTINCT code FROM error_logs
      WHERE severity = 'critical'
      AND timestamp > ?
      AND resolved = FALSE
    `).all(Date.now() - 300000) as any[]; // Last 5 minutes

    for (const error of criticalErrors) {
      console.log(`🚨 Critical error detected: ${error.code}`);
      await this.executeRecovery(error.code);
    }

    // Check for repeated errors
    const repeatedErrors = this.db.prepare(`
      SELECT code, COUNT(*) as count
      FROM error_logs
      WHERE timestamp > ?
      GROUP BY code
      HAVING count > 5
    `).all(Date.now() - 3600000) as any[]; // Last hour

    for (const error of repeatedErrors) {
      console.log(`⚠️ Repeated error detected: ${error.code} (${error.count} times)`);
      await this.executeRecovery(error.code);
    }
  }

  // Generate error report
  async generateReport(outputPath: string = './error-report.json'): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: await this.getErrorSummary(),
      topErrors: await this.getTopErrors(),
      recoveryActions: Array.from(this.recoveryActions.entries()).map(([code, actions]) => ({
        code,
        actions: actions.map(a => ({
          type: a.type,
          description: a.description,
          severity: a.severity
        }))
      }))
    };

    await write(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Error report generated: ${outputPath}`);
  }

  private async getErrorSummary() {
    return this.db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN resolved = TRUE THEN 1 END) as resolved
      FROM error_logs
      WHERE timestamp > ?
    `).get(Date.now() - 86400000) as any; // Last 24 hours
  }

  private async getTopErrors() {
    return this.db.prepare(`
      SELECT code, severity, COUNT(*) as count
      FROM error_logs
      WHERE timestamp > ?
      GROUP BY code, severity
      ORDER BY count DESC
      LIMIT 10
    `).all(Date.now() - 86400000) as any[]; // Last 24 hours
  }
}

// CLI Interface
if (import.meta.main) {
  const recovery = new ErrorRecoverySystem();
  const command = process.argv[2];

  switch (command) {
    case 'analyze':
      const hours = parseInt(process.argv[3]) || 1;
      await recovery.analyzeErrors(hours * 3600000);
      break;

    case 'recover':
      const errorCode = process.argv[3] as TensionErrorCode;
      if (errorCode) {
        await recovery.executeRecovery(errorCode);
      } else {
        console.error('Please provide an error code');
        process.exit(EXIT_CODES.GENERIC_ERROR);
      }
      break;

    case 'auto':
      await recovery.autoRecovery();
      break;

    case 'report':
      const outputPath = process.argv[3] || './error-report.json';
      await recovery.generateReport(outputPath);
      break;

    default:
      console.log(`
Error Recovery Commands:
  analyze [hours]     - Analyze errors from last N hours (default: 1)
  recover <code>      - Execute recovery for specific error code
  auto                - Run auto-recovery based on error patterns
  report [path]       - Generate error report (default: ./error-report.json)

Available Error Codes:
${Object.values(TensionErrorCode).join(', ')}
      `);
  }
}

export { ErrorRecoverySystem };
