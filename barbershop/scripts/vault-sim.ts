#!/usr/bin/env bun

// vault-sim.ts - Exposure Simulation CLI

import { RedisVault } from '../lib/security/redis-vault';
import { integratedSecretManager } from '../lib/security/integrated-secret-manager';

interface SimOptions {
  access?: string;
  duration?: number;
  keys?: number;
  rate?: number;
  pattern?: 'uniform' | 'burst' | 'wave' | 'random';
  output?: 'console' | 'json' | 'csv';
  realTime?: boolean;
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class ExposureSimulator {
  private options: SimOptions = {
    duration: 60, // 60 seconds default
    keys: 100,
    rate: 100, // accesses per second
    pattern: 'uniform',
    output: 'console',
    realTime: false
  };

  private startTime: number = 0;
  private totalAccesses: number = 0;
  private accessTimes: number[] = [];
  private secretKeys: string[] = [];
  private isRunning: boolean = false;

  async run(args: string[]): Promise<void> {
    this.parseArgs(args);
    
    console.log(styled('🔥 Vault Exposure Simulator', 'primary'));
    console.log(styled('==========================', 'muted'));
    console.log();
    
    // Parse access count
    const accessCount = this.parseAccessCount(this.options.access);
    
    console.log(styled('📊 Simulation Configuration:', 'info'));
    console.log(styled(`   Total Accesses: ${this.formatNumber(accessCount)}`, 'muted'));
    console.log(styled(`   Duration: ${this.options.duration}s`, 'muted'));
    console.log(styled(`   Unique Keys: ${this.options.keys}`, 'muted'));
    console.log(styled(`   Rate: ${this.options.rate}/s`, 'muted'));
    console.log(styled(`   Pattern: ${this.options.pattern}`, 'muted'));
    console.log(styled(`   Real-time: ${this.options.realTime ? 'YES' : 'NO'}`, 'muted'));
    console.log();
    
    // Generate secret keys
    this.generateSecretKeys();
    
    // Run simulation
    await this.runSimulation(accessCount);
  }

  private parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--access' && args[i + 1]) {
        this.options.access = args[++i];
      }
      if (arg === '--duration' && args[i + 1]) {
        this.options.duration = parseInt(args[++i]);
      }
      if (arg === '--keys' && args[i + 1]) {
        this.options.keys = parseInt(args[++i]);
      }
      if (arg === '--rate' && args[i + 1]) {
        this.options.rate = parseInt(args[++i]);
      }
      if (arg === '--pattern' && args[i + 1]) {
        this.options.pattern = args[++i] as 'uniform' | 'burst' | 'wave' | 'random';
      }
      if (arg === '--output' && args[i + 1]) {
        this.options.output = args[++i] as 'console' | 'json' | 'csv';
      }
      if (arg === '--realtime') {
        this.options.realTime = true;
      }
      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(styled('🔥 Vault Exposure Simulator CLI', 'primary'));
    console.log(styled('==============================', 'muted'));
    console.log();
    console.log(styled('Usage:', 'info'));
    console.log('  bun run vault-sim.ts [options]');
    console.log();
    console.log(styled('Options:', 'info'));
    console.log('  --access <count>     Total access count (e.g., 20M, 1.5K, 500)');
    console.log('  --duration <seconds> Simulation duration in seconds');
    console.log('  --keys <number>      Number of unique secret keys');
    console.log('  --rate <per-second>  Access rate per second');
    console.log('  --pattern <type>     Access pattern: uniform, burst, wave, random');
    console.log('  --output <format>    Output format: console, json, csv');
    console.log('  --realtime           Show real-time progress');
    console.log('  --help, -h           Show this help');
    console.log();
    console.log(styled('Access Count Formats:', 'accent'));
    console.log('  1000, 1K, 1.5M, 20M, 2.5B');
    console.log();
    console.log(styled('Patterns:', 'accent'));
    console.log('  uniform  - Constant access rate');
    console.log('  burst    - Periodic high-intensity bursts');
    console.log('  wave     - Sinusoidal access pattern');
    console.log('  random   - Random access distribution');
    console.log();
    console.log(styled('Examples:', 'info'));
    console.log('  bun run vault-sim.ts --access 20M --duration 300');
    console.log('  bun run vault-sim.ts --access 1.5K --pattern burst --realtime');
    console.log('  bun run vault-sim.ts --access 500 --keys 50 --rate 20');
    console.log();
    console.log(styled('📚 Documentation:', 'accent'));
    console.log('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
    console.log('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
  }

  private parseAccessCount(accessStr?: string): number {
    if (!accessStr) return 10000; // default 10K
    
    const match = accessStr.match(/^(\d+\.?\d*)([KMB])?$/i);
    if (!match) {
      console.error(styled('❌ Invalid access count format. Use: 1000, 1K, 1.5M, 20M, 2.5B', 'error'));
      process.exit(1);
    }
    
    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    
    const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
    const multiplier = unit ? multipliers[unit as keyof typeof multipliers] : 1;
    
    return Math.floor(value * multiplier);
  }

  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }

  private generateSecretKeys(): void {
    const types = ['api', 'database', 'csrf', 'vault', 'session', 'encryption', 'backup', 'audit'];
    
    for (let i = 0; i < this.options.keys; i++) {
      const type = types[i % types.length];
      const key = `${type}:secret-${i.toString().padStart(4, '0')}`;
      this.secretKeys.push(key);
    }
    
    console.log(styled(`🔑 Generated ${this.options.keys} unique secret keys`, 'info'));
  }

  private async runSimulation(totalAccesses: number): Promise<void> {
    console.log(styled('🚀 Starting exposure simulation...', 'accent'));
    console.log();
    
    this.startTime = Date.now();
    this.isRunning = true;
    this.totalAccesses = 0;
    this.accessTimes = [];
    
    // Setup real-time display
    let realTimeInterval: NodeJS.Timeout | null = null;
    if (this.options.realTime) {
      realTimeInterval = setInterval(() => this.showRealTimeProgress(), 1000);
    }
    
    try {
      switch (this.options.pattern) {
        case 'uniform':
          await this.uniformPattern(totalAccesses);
          break;
        case 'burst':
          await this.burstPattern(totalAccesses);
          break;
        case 'wave':
          await this.wavePattern(totalAccesses);
          break;
        case 'random':
          await this.randomPattern(totalAccesses);
          break;
        default:
          throw new Error(`Unknown pattern: ${this.options.pattern}`);
      }
      
      this.isRunning = false;
      
      // Clear real-time display
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
        this.showRealTimeProgress(); // Final update
      }
      
      console.log();
      console.log(styled('✅ Simulation completed!', 'success'));
      console.log();
      
      // Show results
      await this.showResults();
      
    } catch (error) {
      this.isRunning = false;
      if (realTimeInterval) clearInterval(realTimeInterval);
      console.error(styled(`❌ Simulation failed: ${error.message}`, 'error'));
      throw error;
    }
  }

  private async uniformPattern(totalAccesses: number): Promise<void> {
    const intervalMs = 1000 / this.options.rate;
    const accessesPerBatch = Math.max(1, Math.floor(totalAccesses / (this.options.duration * this.options.rate)));
    
    for (let i = 0; i < totalAccesses && this.isRunning; i += accessesPerBatch) {
      const batchStart = Date.now();
      
      // Process batch
      for (let j = 0; j < accessesPerBatch && (i + j) < totalAccesses; j++) {
        await this.simulateAccess();
      }
      
      // Rate limiting
      const batchTime = Date.now() - batchStart;
      const targetTime = accessesPerBatch * intervalMs;
      if (batchTime < targetTime) {
        await new Promise(resolve => setTimeout(resolve, targetTime - batchTime));
      }
    }
  }

  private async burstPattern(totalAccesses: number): Promise<void> {
    const burstDuration = 5; // 5 seconds burst
    const restDuration = 5; // 5 seconds rest
    const cycleTime = burstDuration + restDuration;
    const cycles = Math.ceil(this.options.duration / cycleTime);
    const accessesPerCycle = Math.floor(totalAccesses / cycles);
    const accessesPerSecond = accessesPerCycle / burstDuration;
    
    for (let cycle = 0; cycle < cycles && this.isRunning; cycle++) {
      console.log(styled(`💥 Burst cycle ${cycle + 1}/${cycles}`, 'warning'));
      
      // Burst phase
      const burstStart = Date.now();
      for (let i = 0; i < accessesPerCycle && this.isRunning; i++) {
        await this.simulateAccess();
        
        // Rate limiting within burst
        const expectedTime = burstStart + (i / accessesPerSecond) * 1000;
        const now = Date.now();
        if (now < expectedTime) {
          await new Promise(resolve => setTimeout(resolve, expectedTime - now));
        }
      }
      
      // Rest phase
      if (cycle < cycles - 1 && this.isRunning) {
        console.log(styled('😴 Rest phase...', 'muted'));
        await new Promise(resolve => setTimeout(resolve, restDuration * 1000));
      }
    }
  }

  private async wavePattern(totalAccesses: number): Promise<void> {
    const wavePeriod = 10; // 10 seconds per wave
    const maxRate = this.options.rate * 2;
    const minRate = this.options.rate * 0.2;
    
    for (let i = 0; i < totalAccesses && this.isRunning; i++) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const wavePosition = (elapsed % wavePeriod) / wavePeriod;
      const rateMultiplier = minRate + (maxRate - minRate) * (0.5 + 0.5 * Math.sin(2 * Math.PI * wavePosition));
      
      await this.simulateAccess();
      
      // Dynamic rate limiting
      const delay = 1000 / rateMultiplier;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async randomPattern(totalAccesses: number): Promise<void> {
    const avgDelay = 1000 / this.options.rate;
    
    for (let i = 0; i < totalAccesses && this.isRunning; i++) {
      await this.simulateAccess();
      
      // Random delay with exponential distribution
      const randomFactor = Math.random() * 2; // 0-2x average
      const delay = avgDelay * randomFactor;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async simulateAccess(): Promise<void> {
    const accessStart = performance.now();
    
    // Select random secret key
    const key = this.secretKeys[Math.floor(Math.random() * this.secretKeys.length)];
    
    try {
      // Simulate secret access
      await RedisVault.fetchSecret(key, {
        cache: Math.random() > 0.3, // 70% cache hit rate
        ttl: 3600
      });
      
      // Track access pattern
      await RedisVault.trackSecretAccess(key, {
        userId: `user-${Math.floor(Math.random() * 1000)}`,
        sessionId: crypto.randomUUID(),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: 'VaultSimulator/1.0'
      });
      
    } catch (error) {
      // Simulated access may fail, that's expected
    }
    
    const accessTime = performance.now() - accessStart;
    this.accessTimes.push(accessTime);
    this.totalAccesses++;
  }

  private showRealTimeProgress(): void {
    if (!this.isRunning) return;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.totalAccesses / elapsed;
    const progress = Math.min(100, (elapsed / this.options.duration) * 100);
    
    // Clear previous line and show progress
    process.stdout.write('\r' + ' '.repeat(100)); // Clear line
    process.stdout.write(`\r${styled('📊 Progress:', 'info')} ${progress.toFixed(1)}% | ${styled('Accesses:', 'muted')} ${this.formatNumber(this.totalAccesses)} | ${styled('Rate:', 'muted')} ${rate.toFixed(1)}/s | ${styled('Time:', 'muted')} ${elapsed.toFixed(1)}s`);
  }

  private async showResults(): Promise<void> {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const avgRate = this.totalAccesses / totalTime;
    
    console.log(styled('📊 Simulation Results:', 'primary'));
    console.log();
    console.log(styled('   Performance Metrics:', 'accent'));
    console.log(styled(`   Total Accesses:    ${this.formatNumber(this.totalAccesses)}`, 'info'));
    console.log(styled(`   Duration:          ${totalTime.toFixed(2)}s`, 'info'));
    console.log(styled(`   Average Rate:      ${avgRate.toFixed(1)}/s`, 'info'));
    console.log(styled(`   Target Rate:       ${this.options.rate}/s`, 'muted'));
    
    // Access time statistics
    if (this.accessTimes.length > 0) {
      const avgAccessTime = this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length;
      const minAccessTime = Math.min(...this.accessTimes);
      const maxAccessTime = Math.max(...this.accessTimes);
      
      console.log();
      console.log(styled('   Access Time Statistics:', 'accent'));
      console.log(styled(`   Average: ${avgAccessTime.toFixed(2)}ms`, 'info'));
      console.log(styled(`   Min:     ${minAccessTime.toFixed(2)}ms`, 'success'));
      console.log(styled(`   Max:     ${maxAccessTime.toFixed(2)}ms`, 'warning'));
    }
    
    // Get Redis vault analytics
    try {
      console.log();
      console.log(styled('   Redis Vault Analytics:', 'accent'));
      
      const analytics = await RedisVault.getExposureAnalytics('simulator', 1);
      const exposures = await RedisVault.getVaultExposures('simulator');
      
      console.log(styled(`   Total Exposures:   ${analytics.total}`, 'info'));
      console.log(styled(`   Risk Score:        ${analytics.riskScore.toFixed(1)}/100`, 
        analytics.riskScore > 80 ? 'error' : analytics.riskScore > 60 ? 'warning' : 'success'));
      
      console.log(styled('   Exposure by Type:', 'muted'));
      const types = ['API', 'Database', 'CSRF', 'Vault', 'Session', 'Encryption', 'Backup', 'Audit'];
      exposures.forEach((count, index) => {
        if (index < types.length) {
          const percentage = analytics.total > 0 ? ((count / analytics.total) * 100).toFixed(1) : '0.0';
          console.log(styled(`     ${types[index].padEnd(12)}: ${count.toString().padEnd(6)} (${percentage}%)`, 'info'));
        }
      });
      
    } catch (error) {
      console.warn(styled(`⚠️  Failed to get Redis analytics: ${error.message}`, 'warning'));
    }
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      results: {
        totalAccesses: this.totalAccesses,
        duration: totalTime,
        averageRate: avgRate,
        accessTimes: {
          count: this.accessTimes.length,
          average: this.accessTimes.length > 0 ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length : 0,
          min: this.accessTimes.length > 0 ? Math.min(...this.accessTimes) : 0,
          max: this.accessTimes.length > 0 ? Math.max(...this.accessTimes) : 0
        }
      }
    };
    
    if (this.options.output === 'json') {
      await Bun.write(`vault-sim-results-${Date.now()}.json`, JSON.stringify(results, null, 2));
      console.log();
      console.log(styled('📄 Results saved to JSON file', 'success'));
    } else if (this.options.output === 'csv') {
      const csv = this.generateCSV(results);
      await Bun.write(`vault-sim-results-${Date.now()}.csv`, csv);
      console.log();
      console.log(styled('📄 Results saved to CSV file', 'success'));
    }
    
    console.log();
    console.log(styled('🎉 Exposure simulation completed successfully!', 'success'));
  }

  private generateCSV(results: any): string {
    const headers = ['Timestamp', 'TotalAccesses', 'Duration', 'AverageRate', 'AccessTimeAvg', 'AccessTimeMin', 'AccessTimeMax'];
    const row = [
      results.timestamp,
      results.results.totalAccesses,
      results.results.duration.toFixed(2),
      results.results.averageRate.toFixed(2),
      results.results.accessTimes.average.toFixed(2),
      results.results.accessTimes.min.toFixed(2),
      results.results.accessTimes.max.toFixed(2)
    ];
    
    return [headers, row].map(row => row.join(',')).join('\n');
  }
}

// Run the CLI
const simulator = new ExposureSimulator();
simulator.run(Bun.argv.slice(2)).catch(console.error);
