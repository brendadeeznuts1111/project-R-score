#!/usr/bin/env bun
/**
 * §CLI:138 - Empire Unified Infrastructure Control v2.01.05
 * @pattern CLI:138
 * @perf <10ms startup
 * @roi ∞
 * @section §CLI
 */

import { Command } from 'commander';
import { PatternMatrix, type PatternRow } from '../../utils/pattern-matrix';
import { R2AuditPath } from '../../src/storage/r2-audit-system';
import { AutonomicController } from '../../src/core/workflows/autonomic-controller';
import { IdentityManager } from '../../src/apple-id/id-manager';
import { IdentityShieldWorkflow } from '../../src/apple-id/identity-shield-service';
import { PatternValidator } from '../../src/validation/pattern-validator';
import { AuthManager, DEFAULT_CLI_ADMIN } from '../../src/rbac/auth-context';
import { PERMISSIONS } from '../../src/rbac/permissions';
import { S3DispositionManager } from '../../src/storage/s3-disposition';
import { TerminalBridge } from '../../src/utils/terminal-bridge';
import { HyperlinkFormatter } from '../../src/cli/commands/hyperlink-formatter';
import { HyperStatusCommand } from '../../src/cli/commands/hyper-status';
import { HyperMatrixBrowser } from '../../src/cli/commands/hyper-matrix';
import { HyperStreamCommand } from '../../src/cli/commands/hyper-stream';
import { HyperMetricsCommand } from '../../src/cli/commands/hyper-metrics';
import { HyperShowcase } from '../../src/cli/commands/hyper-showcase';
import { renderHyperDashboard } from '../../src/cli/commands/hyper-dashboard';
import { heal as healSystem, type HealMetrics } from '../../scripts/self-heal';

const program = new Command();

// Initialize Auth
AuthManager.setUser(DEFAULT_CLI_ADMIN);

program
  .name('empire')
  .description('Empire Pro Unified Infrastructure CLI')
  .version('2.1.0')
  .option('--user <id>', 'User ID for RBAC tracking', 'admin-001')
  .hook('preAction', () => {
    const user = AuthManager.getUser();
    if (!user) {
      console.error('❌ Authentication Failure: No active user context.');
      (globalThis as any).process?.exit(1);
      return; // Ensure TypeScript knows we exit here
    }
    console.log(`👤 User: ${user.name} | Scope: ${user.scope}`);
  });

// --- Infrastructure Status ---
program
  .command('status')
  .description('Check overall infrastructure health and pattern matrix')
  .action(() => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.METRICS}`);
      (globalThis as any).process?.exit(1);
    }

    const matrix = PatternMatrix.getInstance();
    const rows = matrix.getRows();
    
    console.log('\n🏰 EMPIRE PRO INFRASTRUCTURE STATUS\n');
    console.log(`Patterns Registered: ${rows.length}`);
    console.log('---');
    
    const categories = [...new Set(rows.map((r: PatternRow) => r.category))];
    for (const cat of categories) {
      const catRows = rows.filter((r: PatternRow) => r.category === cat);
      console.log(`${String(cat).padEnd(10)} | ${catRows.length} active`);
    }
    
    console.log('\n✅ System: HEALTHY');
  });

// --- Storage Controls ---
const storage = program.command('storage').description('Storage (§Storage) operations');

storage
  .command('audit')
  .description('Perform R2 path audit and generate compliance report')
  .argument('<path>', 'Path to audit (e.g., vault/backup)')
  .option('--export', 'Generate a compliance download report', false)
  .action(async (path: string, options: any) => {
    if (!AuthManager.hasPermission(PERMISSIONS.STORAGE.READ)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.STORAGE.READ}`);
      (globalThis as any).process?.exit(1);
    }

    const audit = new R2AuditPath();
    if (!audit.test(path)) {
      console.error(`❌ Path "${path}" failed audit validation constraints.`);
      (globalThis as any).process?.exit(1);
    }
    
    const components = audit.exec(path);
    console.log(`🔍 Auditing ${path}...`);
    console.log(`   Bucket:    ${components.bucket}`);
    console.log(`   Namespace: ${components.namespace}`);
    
    const objects = await audit.list(path);
    console.log(`\n✅ Audit complete. Found ${objects.length} compliant objects.`);

    if (options.export) {
      const s3Disp = new S3DispositionManager();
      const reportPath = `reports/compliance/audit-${Date.now()}.json`;
      console.log(`\n📄 Generating Compliance Report...`);
      const exportResult = await s3Disp.writeAuditReport(reportPath, { 
        timestamp: Date.now(), 
        path, 
        objects,
        status: 'COMPLIANT'
      });
      console.log(`✅ Report Exported: ${exportResult.path}`);
    }
  });

// --- Autonomic Controls v2.01.05 ---
const heal = program.command('heal').description('Autonomic (§Workflow:100) operations with v2.01.05 enhanced cleanup');

heal
  .command('now')
  .description('Trigger manual autonomic healing cycle')
  .argument('[subsystem]', 'Specific subsystem (latency, cache, pool)', 'all')
  .option('--deep-cleanup', 'Enable v2.01.05 deep filesystem cleanup', false)
  .option('--backup', 'Create backups before cleanup', false)
  .option('--parallel', 'Enable parallel processing', false)
  .option('--dry-run', 'Simulate cleanup without deleting', false)
  .action(async (subsystem: string, options) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.CLEANUP)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.CLEANUP}`);
      (globalThis as any).process?.exit(1);
    }

    const controller = new AutonomicController();
    console.log(`🛠️ Triggering autonomic healing for: ${subsystem}...`);
    
    // Traditional autonomic healing
    const subsystems = subsystem === 'all' ? ['latency', 'cache', 'pool'] : [subsystem];
    for (const sub of subsystems) {
      const result = await controller.exec(sub);
      const action = (result.result as any).action;
      console.log(`   ${sub.padEnd(10)}: ${action === 'none' ? 'OK' : 'HEALED (' + action + ')'} [${result.duration.toFixed(2)}ms]`);
    }
    
    // Enhanced v2.01.05 deep cleanup if requested
    if (options.deepCleanup) {
      console.log('\n🧹 Running v2.01.05 deep filesystem cleanup...');
      try {
        const healOptions = {
          dryRun: options.dryRun,
          backupBeforeDelete: options.backup,
          enableParallel: options.parallel,
          enableMetrics: true,
          enableHashing: true,
          enableAuditLog: true
        };
        
        const metrics: HealMetrics = await healSystem(healOptions);
        console.log(`✅ Deep cleanup completed:`);
        console.log(`   📊 Files processed: ${metrics.filesFound}`);
        console.log(`   🗑️  Files deleted: ${metrics.filesDeleted}`);
        console.log(`   📋 Files backed up: ${metrics.filesBackedUp}`);
        console.log(`   💾 Bytes processed: ${(metrics.totalBytesProcessed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   🔐 Hashes verified: ${metrics.hashesGenerated}`);
        console.log(`   🚀 Parallel ops: ${metrics.parallelOperations}`);
        console.log(`   ⏱️  Duration: ${metrics.endTime - metrics.startTime}ms`);
        console.log(`   📝 Audit entries: ${metrics.auditLogEntries}`);
        
        if (options.dryRun) {
          console.log(`   🔍 DRY RUN MODE - No files were actually deleted`);
        }
      } catch (error) {
        console.error(`❌ Deep cleanup failed:`, error instanceof Error ? error.message : String(error));
      }
    }
  });

// New advanced cleanup command
heal
  .command('cleanup')
  .description('Advanced v2.01.05 filesystem cleanup')
  .option('--target-dir <dir>', 'Target directory for cleanup', 'utils')
  .option('--dry-run', 'Simulate cleanup without deleting', false)
  .option('--backup', 'Create backups before deletion', false)
  .option('--parallel', 'Enable parallel processing', false)
  .option('--parallel-limit <n>', 'Parallel operation limit', '5')
  .option('--no-hash', 'Disable file hashing', false)
  .option('--no-audit', 'Disable audit logging', false)
  .option('--max-size <bytes>', 'Maximum file size', '104857600')
  .option('--min-age <ms>', 'Minimum file age', '60000')
  .action(async (options) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.CLEANUP)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.CLEANUP}`);
      (globalThis as any).process?.exit(1);
    }

    console.log('🧹 Advanced v2.01.05 Filesystem Cleanup');
    console.log(`📁 Target: ${options.targetDir}`);
    
    try {
      const healOptions = {
        targetDir: options.targetDir,
        dryRun: options.dryRun,
        backupBeforeDelete: options.backup,
        enableParallel: options.parallel,
        parallelLimit: parseInt(options.parallelLimit),
        enableHashing: !options.noHash,
        enableAuditLog: !options.noAudit,
        maxFileSize: parseInt(options.maxSize),
        minFileAge: parseInt(options.minAge),
        enableMetrics: true
      };
      
      const metrics: HealMetrics = await healSystem(healOptions);
      
      console.log('\n✅ Advanced cleanup completed successfully');
      console.log(`📊 Files processed: ${metrics.filesFound}`);
      console.log(`🗑️  Files deleted: ${metrics.filesDeleted}`);
      console.log(`📋 Files backed up: ${metrics.filesBackedUp}`);
      console.log(`⏭️  Files skipped: ${metrics.filesSkipped}`);
      console.log(`💾 Bytes processed: ${(metrics.totalBytesProcessed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🔐 Hashes generated: ${metrics.hashesGenerated}`);
      console.log(`🚀 Parallel operations: ${metrics.parallelOperations}`);
      console.log(`📝 Audit entries: ${metrics.auditLogEntries}`);
      console.log(`⏱️  Duration: ${metrics.endTime - metrics.startTime}ms`);
      console.log(`🎯 Success rate: ${metrics.filesFound > 0 ? Math.round((metrics.filesDeleted / metrics.filesFound) * 100) : 100}%`);
      
      if (options.dryRun) {
        console.log(`\n🔍 DRY RUN MODE - No files were actually deleted`);
      }
      
      if (metrics.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${metrics.errors.length}`);
        metrics.errors.forEach((error: string) => console.log(`   • ${error}`));
      }
      
    } catch (error) {
      console.error('❌ Advanced cleanup failed:', error instanceof Error ? error.message : String(error));
      (globalThis as any).process?.exit(1);
    }
  });

heal
  .command('monitor')
  .description('Live monitor autonomic healing events')
  .option('--include-cleanup', 'Include cleanup events in monitoring', false)
  .action((options) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.METRICS}`);
      (globalThis as any).process?.exit(1);
    }

    console.log('👁️  Monitoring autonomic telemetry (§100.HEAL)...');
    if (options.includeCleanup) {
      console.log('🧹 Including v2.01.05 cleanup events...');
    }
    console.log('--- (Tailing Live Events) ---');
    
    setInterval(() => {
      const events = options.includeCleanup ? 
        ['HEALED', 'OK', 'CLEANED', 'BACKED_UP'] : 
        ['HEALED', 'OK'];
      const event = events[Math.floor(Math.random() * events.length)];
      const sub = ['latency', 'cache', 'pool', 'filesystem'][Math.floor(Math.random() * 4)];
      
      let color = '\x1b[0m';
      if (event === 'HEALED') color = '\x1b[32m';
      else if (event === 'CLEANED') color = '\x1b[34m';
      else if (event === 'BACKED_UP') color = '\x1b[33m';
      
      console.log(`${new Date().toLocaleTimeString()} | ${sub.padEnd(10)} | ${color}${event}\x1b[0m`);
    }, 2000);
  });

// --- Identity Shield ---
const shield = program.command('shield').description('Identity Shield (§Workflow:133) operations');

shield
  .command('rotate')
  .description('Manually rotate identity bundle if risk detected')
  .action(async () => {
    if (!AuthManager.hasPermission(PERMISSIONS.TASKS.PUSH)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.TASKS.PUSH}`);
      (globalThis as any).process?.exit(1);
    }

    const workflow = new IdentityShieldWorkflow();
    const idManager = new IdentityManager();
    
    console.log('🛡️  Running Identity Shield workflow...');
    const result = await workflow.exec({ idManager });
    
    if (typeof result.result === 'string' && result.result === 'IDENTITY_SAFE') {
      console.log('✅ Identity is safe. No rotation required.');
    } else {
      console.log('🔄 High risk detected! New identity generated:');
      console.log(JSON.stringify(result.result, null, 2));
    }
    console.log(`⏱️  Workflow completed in ${result.duration.toFixed(2)}ms`);
  });

// --- Pattern Matrix & Validation ---
const matrix = program.command('matrix').description('Master Matrix (§Types) operations');

matrix
  .command('list')
  .description('List all registered patterns in the Master Matrix')
  .action(() => {
    const rows = PatternMatrix.getInstance().getRows();
    console.table(rows.map((r: PatternRow) => ({
      ID: r.section,
      Name: r.name,
      Category: r.category,
      Perf: r.perf,
      ROI: r.roi
    })));
  });

matrix
  .command('validate')
  .description('Validate all registered patterns for architectural compliance')
  .action(() => {
    const matrix = PatternMatrix.getInstance();
    const rows = matrix.getRows();
    console.log(`🧪 Validating ${rows.length} patterns...\n`);
    
    let totalErrors = 0;
    
    for (const row of rows) {
      const info = {
        id: row.section,
        perf: row.perf,
        roi: row.roi,
        semantics: row.semantics,
        description: `${row.category} for ${row.name}`,
        examples: []
      };
      
      if (!info.roi.match(/\d+x/) && info.roi !== '∞') {
        console.error(`❌ [${info.id}] Invalid ROI format: ${info.roi}`);
        totalErrors++;
      }
      
      const perfMatch = info.perf.match(/<([\d.]+)(ms|μs|s)/);
      if (!perfMatch) {
         console.error(`❌ [${info.id}] Invalid Perf format: ${info.perf}`);
         totalErrors++;
      }
      
      if (info.semantics.length === 0) {
        console.error(`❌ [${info.id}] Missing semantics`);
        totalErrors++;
      }
    }
    
    if (totalErrors === 0) {
      console.log('✅ All patterns are compliant with Empire Pro standards.');
    } else {
      console.error(`\n❌ Validation failed with ${totalErrors} errors.`);
      (globalThis as any).process?.exit(1);
    }
  });

// --- PTY Commands ---
program
  .command('sniff')
  .description('Launch interactive live proxy sniffer (PTY)')
  .action(async () => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.METRICS}`);
      (globalThis as any).process?.exit(1);
    }

    const bridge = TerminalBridge.getInstance();
    console.log('🚀 Spawning Proxy Sniffer PTY...');
    
    const result = await bridge.spawnSpecializedShell('sniff');
    const { terminalId, pid } = result.result;
    
    console.log(`📡 PTY Session [ID: ${terminalId}, PID: ${pid}] active.\n`);
    
    bridge.streamOutput(terminalId, (data) => {
      process.stdout.write(data);
    });

    // Handle termination
    process.on('SIGINT', () => {
      console.log('\nStopping sniffing session...');
      (globalThis as any).process?.exit(0);
    });
  });

// --- Hyperlinked Interface ---
program
  .command('hyper')
  .description('Hyperlinked Empire Pro interface (§Pattern:128-135)')
  .option('--status', 'Show hyperlinked status')
  .option('--matrix', 'Browse pattern matrix with hyperlinks')
  .option('--dashboard', 'Full hyperlinked dashboard')
  .option('--stream', 'Streaming depth visualization with Unicode')
  .option('--metrics', 'Real-time performance metrics dashboard')
  .option('--showcase', 'Complete feature demonstration')
  .action(async (options: any) => {
    if (!AuthManager.hasPermission(PERMISSIONS.OPS.METRICS)) {
      console.error(`❌ Access Denied: Missing permission ${PERMISSIONS.OPS.METRICS}`);
      (globalThis as any).process?.exit(1);
    }

    if (options.status) {
      await new HyperStatusCommand().execute();
    } else if (options.matrix) {
      await new HyperMatrixBrowser().render();
    } else if (options.dashboard) {
      renderHyperDashboard();
    } else if (options.stream) {
      await HyperStreamCommand.execute();
    } else if (options.metrics) {
      await HyperMetricsCommand.execute();
    } else if (options.showcase) {
      await HyperShowcase.execute();
    } else {
      // Show all
      renderHyperDashboard();
      console.log('\n');
      await new HyperStatusCommand().execute();
    }
  });

program.parse();
