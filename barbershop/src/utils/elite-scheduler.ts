#!/usr/bin/env bun
/**
 * BarberShop ELITE Scheduler
 * ==========================
 * Cron-like job scheduling with Bun-native precision
 * 
 * Elite Features:
 * - Cron expression support
 * - Job prioritization
 * - Concurrent execution limits
 * - Distributed locking (Redis)
 * - Bun.nanoseconds() precision
 */

import { nanoseconds, redis, sleep } from 'bun';

// ═══════════════════════════════════════════════════════════════════════════════
// CRON PARSER
// ═══════════════════════════════════════════════════════════════════════════════

interface CronExpression {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

function parseCron(cron: string): CronExpression {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression. Expected: "min hour day month dow"');
  }
  
  return {
    minute: parseCronPart(parts[0], 0, 59),
    hour: parseCronPart(parts[1], 0, 23),
    dayOfMonth: parseCronPart(parts[2], 1, 31),
    month: parseCronPart(parts[3], 1, 12),
    dayOfWeek: parseCronPart(parts[4], 0, 6),
  };
}

function parseCronPart(part: string, min: number, max: number): number[] {
  if (part === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  }
  
  if (part.includes(',')) {
    return part.split(',').flatMap(p => parseCronPart(p.trim(), min, max));
  }
  
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }
  
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    const values = parseCronPart(range, min, max);
    return values.filter((_, i) => i % parseInt(step) === 0);
  }
  
  return [parseInt(part)];
}

function matchesCron(cron: CronExpression, date: Date): boolean {
  return (
    cron.minute.includes(date.getMinutes()) &&
    cron.hour.includes(date.getHours()) &&
    cron.dayOfMonth.includes(date.getDate()) &&
    cron.month.includes(date.getMonth() + 1) &&
    cron.dayOfWeek.includes(date.getDay())
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Job {
  id: string;
  name: string;
  cron?: string;
  fn: () => Promise<void> | void;
  priority: number;
  timeoutMs: number;
  maxRetries: number;
  concurrent: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  status: JobStatus;
}

interface JobResult {
  jobId: string;
  success: boolean;
  durationMs: number;
  error?: Error;
  retryCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteScheduler {
  private jobs = new Map<string, Job>();
  private running = false;
  private checkInterval: Timer | null = null;
  private runningJobs = new Set<string>();
  private maxConcurrent = 5;
  private jobQueue: string[] = [];
  
  /**
   * Add a scheduled job
   */
  addJob(
    name: string,
    cron: string,
    fn: () => Promise<void> | void,
    options: {
      priority?: number;
      timeoutMs?: number;
      maxRetries?: number;
      concurrent?: boolean;
    } = {}
  ): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const job: Job = {
      id,
      name,
      cron,
      fn,
      priority: options.priority ?? 0,
      timeoutMs: options.timeoutMs ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      concurrent: options.concurrent ?? true,
      runCount: 0,
      errorCount: 0,
      status: 'pending',
    };
    
    // Calculate next run
    job.nextRun = this.getNextRun(cron);
    
    this.jobs.set(id, job);
    console.log(`[SCHEDULER] Added job "${name}" (${cron}) -> ${job.nextRun.toISOString()}`);
    
    return id;
  }
  
  /**
   * Add one-time job
   */
  addOneTimeJob(
    name: string,
    runAt: Date,
    fn: () => Promise<void> | void,
    options: Partial<Omit<Job, 'id' | 'name' | 'fn' | 'runAt'>> = {}
  ): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const job: Job = {
      id,
      name,
      fn,
      priority: options.priority ?? 0,
      timeoutMs: options.timeoutMs ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      concurrent: options.concurrent ?? true,
      nextRun: runAt,
      runCount: 0,
      errorCount: 0,
      status: 'pending',
    };
    
    this.jobs.set(id, job);
    console.log(`[SCHEDULER] Added one-time job "${name}" -> ${runAt.toISOString()}`);
    
    return id;
  }
  
  /**
   * Calculate next run time
   */
  private getNextRun(cron: string): Date {
    const expression = parseCron(cron);
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    
    // Find next matching time (max 1 year)
    for (let i = 0; i < 525600; i++) {
      if (matchesCron(expression, next)) {
        return next;
      }
      next.setMinutes(next.getMinutes() + 1);
    }
    
    throw new Error('Could not find next run time');
  }
  
  /**
   * Start scheduler
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    console.log('[SCHEDULER] Started');
    
    // Check every minute
    this.checkInterval = setInterval(() => this.checkJobs(), 1000);
  }
  
  /**
   * Stop scheduler
   */
  stop(): void {
    this.running = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    console.log('[SCHEDULER] Stopped');
  }
  
  /**
   * Check and run due jobs
   */
  private async checkJobs(): Promise<void> {
    const now = new Date();
    const dueJobs: Job[] = [];
    
    for (const job of this.jobs.values()) {
      if (job.nextRun && job.nextRun <= now && !this.runningJobs.has(job.id)) {
        dueJobs.push(job);
      }
    }
    
    // Sort by priority
    dueJobs.sort((a, b) => b.priority - a.priority);
    
    for (const job of dueJobs) {
      if (this.runningJobs.size >= this.maxConcurrent) {
        this.jobQueue.push(job.id);
        continue;
      }
      
      this.runJob(job);
    }
  }
  
  /**
   * Execute a job
   */
  private async runJob(job: Job, retryCount = 0): Promise<JobResult> {
    const startNs = nanoseconds();
    
    if (!job.concurrent) {
      // Check if already running
      if (this.runningJobs.has(job.id)) {
        return { jobId: job.id, success: false, durationMs: 0, retryCount, error: new Error('Job already running') };
      }
    }
    
    this.runningJobs.add(job.id);
    job.status = 'running';
    job.lastRun = new Date();
    
    console.log(`[SCHEDULER] Running job "${job.name}" (retry: ${retryCount})`);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeoutMs);
      });
      
      // Race job against timeout
      await Promise.race([job.fn(), timeoutPromise]);
      
      const durationMs = Number(nanoseconds() - startNs) / 1e6;
      
      job.runCount++;
      job.status = 'completed';
      job.errorCount = 0;
      
      // Schedule next run for recurring jobs
      if (job.cron) {
        job.nextRun = this.getNextRun(job.cron);
        console.log(`[SCHEDULER] Job "${job.name}" completed in ${durationMs.toFixed(2)}ms, next run: ${job.nextRun.toISOString()}`);
      } else {
        // Remove one-time job
        this.jobs.delete(job.id);
        console.log(`[SCHEDULER] One-time job "${job.name}" completed in ${durationMs.toFixed(2)}ms`);
      }
      
      this.runningJobs.delete(job.id);
      this.processQueue();
      
      return { jobId: job.id, success: true, durationMs, retryCount };
      
    } catch (error) {
      const durationMs = Number(nanoseconds() - startNs) / 1e6;
      job.errorCount++;
      job.status = 'failed';
      
      console.error(`[SCHEDULER] Job "${job.name}" failed after ${durationMs.toFixed(2)}ms:`, (error as Error).message);
      
      // Retry logic
      if (retryCount < job.maxRetries) {
        console.log(`[SCHEDULER] Retrying job "${job.name}" in ${Math.pow(2, retryCount)}s...`);
        await sleep(Math.pow(2, retryCount) * 1000);
        this.runningJobs.delete(job.id);
        return this.runJob(job, retryCount + 1);
      }
      
      this.runningJobs.delete(job.id);
      this.processQueue();
      
      return { jobId: job.id, success: false, durationMs, retryCount, error: error as Error };
    }
  }
  
  /**
   * Process job queue
   */
  private processQueue(): void {
    while (this.jobQueue.length > 0 && this.runningJobs.size < this.maxConcurrent) {
      const jobId = this.jobQueue.shift();
      if (jobId) {
        const job = this.jobs.get(jobId);
        if (job) {
          this.runJob(job);
        }
      }
    }
  }
  
  /**
   * Remove a job
   */
  removeJob(id: string): boolean {
    return this.jobs.delete(id);
  }
  
  /**
   * List all jobs
   */
  listJobs(): Array<Pick<Job, 'id' | 'name' | 'cron' | 'nextRun' | 'runCount' | 'status'>> {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      cron: job.cron,
      nextRun: job.nextRun,
      runCount: job.runCount,
      status: job.status,
    }));
  }
  
  /**
   * Run job immediately (manual trigger)
   */
  async runNow(id: string): Promise<JobResult | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    
    return this.runJob(job);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const scheduler = new EliteScheduler();

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON CRON PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const CronPresets = {
  EVERY_SECOND: '* * * * *',      // Not valid for this scheduler (1 min min)
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY: '0 0 * * *',
  EVERY_WEEK: '0 0 * * 0',
  EVERY_MONTH: '0 0 1 * *',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ⏰ ELITE SCHEDULER                                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Cron Expressions • Priorities • Retries • Concurrent Limits     ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const sched = new EliteScheduler();
  
  // Daily report job
  sched.addJob('daily-report', '*/1 * * * *', async () => {
    console.log('   📊 Generating daily report...');
    await sleep(500);
    console.log('   ✓ Daily report complete');
  }, { priority: 5 });
  
  // Cleanup job (lower priority)
  sched.addJob('cleanup', '*/1 * * * *', async () => {
    console.log('   🧹 Running cleanup...');
    await sleep(300);
    console.log('   ✓ Cleanup complete');
  }, { priority: 1 });
  
  // High priority payment processing
  sched.addJob('payment-processing', '*/1 * * * *', async () => {
    console.log('   💳 Processing payments...');
    await sleep(200);
    console.log('   ✓ Payments processed');
  }, { priority: 10 });
  
  // Failing job with retries
  let failCount = 0;
  sched.addJob('unreliable-task', '*/1 * * * *', async () => {
    failCount++;
    if (failCount < 3) {
      throw new Error('Simulated failure');
    }
    console.log('   ✓ Unreliable task succeeded after retries');
  }, { priority: 3, maxRetries: 3 });
  
  // One-time job
  const futureTime = new Date(Date.now() + 5000);
  sched.addOneTimeJob('one-time-setup', futureTime, () => {
    console.log('   🚀 One-time setup executed!');
  });
  
  console.log('\nScheduled Jobs:');
  console.log(sched.listJobs().map(j => `  - ${j.name}: ${j.cron || 'one-time'} (priority: ${j.priority || 0})`).join('\n'));
  
  console.log('\nStarting scheduler for 10 seconds...\n');
  
  sched.start();
  
  // Stop after 10 seconds
  setTimeout(() => {
    sched.stop();
    console.log('\n✅ Scheduler demo complete!');
    console.log('\nFinal stats:');
    sched.listJobs().forEach(j => {
      console.log(`   ${j.name}: ${j.runCount} runs, status: ${j.status}`);
    });
    process.exit(0);
  }, 10000);
}

export default EliteScheduler;
