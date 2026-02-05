#!/usr/bin/env bun

/**
 * Fire22 Dashboard Maintenance Scheduler
 * Automated scheduling and execution of maintenance tasks
 *
 * @version 1.0.0
 * @author Fire22 Maintenance Team
 * @schedule Runs continuously as a service
 */

import { spawn } from 'bun';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface MaintenanceTask {
  id: string;
  name: string;
  script: string;
  schedule: string; // cron format
  lastRun?: string;
  nextRun?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  dependencies?: string[];
}

interface MaintenanceSchedule {
  tasks: MaintenanceTask[];
  lastUpdated: string;
  version: string;
}

class MaintenanceScheduler {
  private schedule: MaintenanceSchedule;
  private schedulePath: string;
  private isRunning: boolean = false;

  constructor() {
    this.schedulePath = join(process.cwd(), 'maintenance', 'schedule.json');
    this.schedule = this.loadSchedule();
  }

  /**
   * 🕐 Initialize and start the maintenance scheduler
   */
  async start(): Promise<void> {
    console.log('🕐 Fire22 Maintenance Scheduler Starting');
    console.log('!==!==!==!==!==!==!====');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.log(`📋 Loaded ${this.schedule.tasks.length} maintenance tasks\n`);

    this.isRunning = true;

    // Update next run times
    this.updateNextRunTimes();

    // Start the scheduler loop
    await this.schedulerLoop();
  }

  /**
   * 🔄 Main scheduler loop
   */
  private async schedulerLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkAndRunTasks();
        await this.sleep(60000); // Check every minute
      } catch (error) {
        console.error('❌ Scheduler error:', error);
        await this.sleep(60000); // Wait before retrying
      }
    }
  }

  /**
   * ✅ Check and run due tasks
   */
  private async checkAndRunTasks(): Promise<void> {
    const now = new Date();

    for (const task of this.schedule.tasks) {
      if (this.isTaskDue(task, now) && task.status !== 'running') {
        await this.runTask(task);
      }
    }
  }

  /**
   * 🏃 Run a specific maintenance task
   */
  private async runTask(task: MaintenanceTask): Promise<void> {
    console.log(`🏃 Running task: ${task.name}`);

    // Update task status
    task.status = 'running';
    task.lastRun = new Date().toISOString();
    this.saveSchedule();

    try {
      const startTime = Date.now();

      // Check dependencies
      if (task.dependencies) {
        const dependenciesMet = await this.checkDependencies(task.dependencies);
        if (!dependenciesMet) {
          console.log(`  ⚠️ Dependencies not met for ${task.name}, skipping`);
          task.status = 'pending';
          this.updateNextRunTime(task);
          return;
        }
      }

      // Execute the task
      const result = await this.executeTask(task);

      const duration = Math.round((Date.now() - startTime) / 1000 / 60);

      if (result.success) {
        task.status = 'completed';
        console.log(`  ✅ Task completed: ${task.name} (${duration}m)`);
      } else {
        task.status = 'failed';
        console.log(`  ❌ Task failed: ${task.name} - ${result.error}`);
      }
    } catch (error) {
      task.status = 'failed';
      console.log(`  ❌ Task error: ${task.name} - ${error}`);
    }

    // Update next run time
    this.updateNextRunTime(task);
    this.saveSchedule();
  }

  /**
   * 🔧 Execute a maintenance task
   */
  private async executeTask(task: MaintenanceTask): Promise<{ success: boolean; error?: string }> {
    return new Promise(resolve => {
      const scriptPath = join(process.cwd(), 'maintenance', task.script);

      if (!existsSync(scriptPath)) {
        resolve({ success: false, error: `Script not found: ${task.script}` });
        return;
      }

      const process = spawn(['bun', scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', data => {
        output += data.toString();
      });

      process.stderr?.on('data', data => {
        errorOutput += data.toString();
      });

      process.on('close', code => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: errorOutput || `Exit code: ${code}` });
        }
      });

      process.on('error', error => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  /**
   * 📅 Check if task is due to run
   */
  private isTaskDue(task: MaintenanceTask, now: Date): boolean {
    if (!task.nextRun) return false;
    return new Date(task.nextRun) <= now;
  }

  /**
   * 🔗 Check task dependencies
   */
  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const depId of dependencies) {
      const depTask = this.schedule.tasks.find(t => t.id === depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * ⏰ Update next run time for a task
   */
  private updateNextRunTime(task: MaintenanceTask): void {
    const now = new Date();
    task.nextRun = this.calculateNextRun(task.schedule, now).toISOString();
  }

  /**
   * 📊 Update next run times for all tasks
   */
  private updateNextRunTimes(): void {
    const now = new Date();
    for (const task of this.schedule.tasks) {
      if (!task.nextRun) {
        task.nextRun = this.calculateNextRun(task.schedule, now).toISOString();
      }
    }
    this.saveSchedule();
  }

  /**
   * 🧮 Calculate next run time based on cron schedule
   */
  private calculateNextRun(cronSchedule: string, from: Date): Date {
    // Simple cron parser for common patterns
    const next = new Date(from);

    switch (cronSchedule) {
      case '@daily':
      case '0 9 * * *': // Daily at 9 AM
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0);
        break;

      case '@weekly':
      case '0 9 * * 1': // Weekly on Monday at 9 AM
        const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
        next.setDate(next.getDate() + daysUntilMonday);
        next.setHours(9, 0, 0, 0);
        break;

      case '@monthly':
      case '0 9 1 * *': // Monthly on 1st at 9 AM
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(9, 0, 0, 0);
        break;

      case '*/15 * * * *': // Every 15 minutes
        next.setMinutes(next.getMinutes() + 15);
        break;

      case '0 */2 * * *': // Every 2 hours
        next.setHours(next.getHours() + 2);
        next.setMinutes(0, 0, 0);
        break;

      default:
        // Default to daily if unknown
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0);
    }

    return next;
  }

  /**
   * 📂 Load maintenance schedule
   */
  private loadSchedule(): MaintenanceSchedule {
    if (existsSync(this.schedulePath)) {
      try {
        return JSON.parse(readFileSync(this.schedulePath, 'utf-8'));
      } catch (error) {
        console.warn('⚠️ Could not load schedule, using default');
      }
    }

    return this.createDefaultSchedule();
  }

  /**
   * 💾 Save maintenance schedule
   */
  private saveSchedule(): void {
    this.schedule.lastUpdated = new Date().toISOString();
    writeFileSync(this.schedulePath, JSON.stringify(this.schedule, null, 2));
  }

  /**
   * 📋 Create default maintenance schedule
   */
  private createDefaultSchedule(): MaintenanceSchedule {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tasks: [
        {
          id: 'daily-health-check',
          name: 'Daily Health Check',
          script: 'daily-health-check.ts',
          schedule: '0 9 * * *', // Daily at 9 AM
          status: 'pending',
          priority: 'high',
          estimatedDuration: 5,
        },
        {
          id: 'weekly-documentation-update',
          name: 'Weekly Documentation Update',
          script: 'documentation-updater.ts',
          schedule: '0 9 * * 3', // Wednesday at 9 AM
          status: 'pending',
          priority: 'medium',
          estimatedDuration: 15,
        },
        {
          id: 'weekly-dependency-check',
          name: 'Weekly Dependency Check',
          script: 'dependency-checker.ts',
          schedule: '0 10 * * 1', // Monday at 10 AM
          status: 'pending',
          priority: 'medium',
          estimatedDuration: 10,
        },
        {
          id: 'monthly-security-audit',
          name: 'Monthly Security Audit',
          script: 'security-audit.ts',
          schedule: '0 9 1 * *', // 1st of month at 9 AM
          status: 'pending',
          priority: 'high',
          estimatedDuration: 30,
        },
        {
          id: 'quarterly-performance-review',
          name: 'Quarterly Performance Review',
          script: 'performance-review.ts',
          schedule: '0 9 1 */3 *', // Quarterly on 1st at 9 AM
          status: 'pending',
          priority: 'medium',
          estimatedDuration: 60,
        },
        {
          id: 'rss-feed-validation',
          name: 'RSS Feed Validation',
          script: 'rss-validator.ts',
          schedule: '0 */2 * * *', // Every 2 hours
          status: 'pending',
          priority: 'medium',
          estimatedDuration: 5,
        },
        {
          id: 'backup-verification',
          name: 'Backup Verification',
          script: 'backup-verifier.ts',
          schedule: '0 8 * * *', // Daily at 8 AM
          status: 'pending',
          priority: 'high',
          estimatedDuration: 10,
          dependencies: ['daily-health-check'],
        },
      ],
    };
  }

  /**
   * 📊 Generate maintenance status report
   */
  async generateStatusReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      totalTasks: this.schedule.tasks.length,
      tasksByStatus: {
        pending: this.schedule.tasks.filter(t => t.status === 'pending').length,
        running: this.schedule.tasks.filter(t => t.status === 'running').length,
        completed: this.schedule.tasks.filter(t => t.status === 'completed').length,
        failed: this.schedule.tasks.filter(t => t.status === 'failed').length,
      },
      upcomingTasks: this.schedule.tasks
        .filter(t => t.nextRun)
        .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())
        .slice(0, 5)
        .map(t => ({
          name: t.name,
          nextRun: t.nextRun,
          priority: t.priority,
        })),
      recentFailures: this.schedule.tasks
        .filter(t => t.status === 'failed' && t.lastRun)
        .sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())
        .slice(0, 3)
        .map(t => ({
          name: t.name,
          lastRun: t.lastRun,
          priority: t.priority,
        })),
    };

    const reportPath = join(process.cwd(), 'maintenance', 'reports', 'scheduler-status.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Status report generated: ${reportPath}`);
  }

  /**
   * 💤 Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🛑 Stop the scheduler
   */
  stop(): void {
    console.log('🛑 Stopping maintenance scheduler...');
    this.isRunning = false;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const scheduler = new MaintenanceScheduler();

  switch (command) {
    case 'start':
      await scheduler.start();
      break;

    case 'status':
      await scheduler.generateStatusReport();
      console.log('📊 Status report generated');
      break;

    case 'stop':
      scheduler.stop();
      break;

    default:
      console.log('Fire22 Maintenance Scheduler');
      console.log('');
      console.log('Usage:');
      console.log('  bun maintenance/maintenance-scheduler.ts start   # Start the scheduler');
      console.log('  bun maintenance/maintenance-scheduler.ts status  # Generate status report');
      console.log('  bun maintenance/maintenance-scheduler.ts stop    # Stop the scheduler');
      console.log('');
      console.log(
        'The scheduler runs continuously and executes maintenance tasks based on their schedules.'
      );
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { MaintenanceScheduler };
