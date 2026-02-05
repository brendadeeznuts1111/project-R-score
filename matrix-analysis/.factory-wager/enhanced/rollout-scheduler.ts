#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Enhanced Rollout Scheduler v2.0
 * Progressive A/B rollout with real-time risk assessment and SSE notifications
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';

interface RolloutPhase {
  id: number;
  percentage: number;
  duration: number; // minutes
  riskScore: number;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'paused';
  startTime?: number;
  endTime?: number;
  metrics: PhaseMetrics;
}

interface PhaseMetrics {
  requestsServed: number;
  errorRate: number;
  responseTime: number;
  userSatisfaction: number;
  conversionRate: number;
  revenueImpact: number;
}

interface RolloutConfig {
  phases: RolloutPhase[];
  totalDuration: number; // minutes
  autoAdvance: boolean;
  riskThreshold: number;
  enableRollback: boolean;
  monitoringInterval: number; // seconds
  sseEnabled: boolean;
  port: number;
}

interface RolloutState {
  currentPhase: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number;
  endTime?: number;
  totalRequests: number;
  totalErrors: number;
  overallHealth: number;
  lastUpdate: string;
  clients: Set<any>;
}

class EnhancedRolloutScheduler {
  private config: RolloutConfig;
  private state: RolloutState;
  private intervalId?: NodeJS.Timeout;
  private server?: any;
  private metricsHistory: any[] = [];

  constructor(config: Partial<RolloutConfig> = {}) {
    this.config = {
      phases: [
        { id: 0, percentage: 5, duration: 5, riskScore: 65, description: 'Initial canary', status: 'pending', metrics: this.createEmptyMetrics() },
        { id: 1, percentage: 25, duration: 10, riskScore: 55, description: 'Limited rollout', status: 'pending', metrics: this.createEmptyMetrics() },
        { id: 2, percentage: 50, duration: 15, riskScore: 45, description: 'Balanced rollout', status: 'pending', metrics: this.createEmptyMetrics() },
        { id: 3, percentage: 100, duration: 30, riskScore: 35, description: 'Full deployment', status: 'pending', metrics: this.createEmptyMetrics() }
      ],
      totalDuration: 60, // 1 hour total
      autoAdvance: true,
      riskThreshold: 70,
      enableRollback: true,
      monitoringInterval: 30, // 30 seconds
      sseEnabled: true,
      port: 3002,
      ...config
    };

    this.state = {
      currentPhase: 0,
      isRunning: false,
      isPaused: false,
      startTime: 0,
      totalRequests: 0,
      totalErrors: 0,
      overallHealth: 100,
      lastUpdate: new Date().toISOString(),
      clients: new Set()
    };
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('⚠️ Rollout already in progress');
      return;
    }

    console.log('🚀 FactoryWager Enhanced Rollout Scheduler v2.0');
    console.log('================================================');
    console.log(`📊 Total Duration: ${this.config.totalDuration} minutes`);
    console.log(`🎯 Risk Threshold: ${this.config.riskThreshold}/100`);
    console.log(`🔄 Auto-Advance: ${this.config.autoAdvance ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📡 SSE Notifications: ${this.config.sseEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('');

    this.state.isRunning = true;
    this.state.startTime = Date.now();
    this.config.phases[0].status = 'active';
    this.config.phases[0].startTime = Date.now();

    // Start SSE server if enabled
    if (this.config.sseEnabled) {
      await this.startSSEServer();
    }

    // Start monitoring loop
    this.startMonitoringLoop();

    console.log(`✅ Rollout started - Phase ${this.state.currentPhase}: ${this.config.phases[this.state.currentPhase].description}`);
    this.broadcastUpdate({
      type: 'rollout_started',
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString()
    });
  }

  async pause(): Promise<void> {
    if (!this.state.isRunning) {
      console.log('⚠️ No rollout in progress');
      return;
    }

    this.state.isPaused = true;
    const currentPhase = this.config.phases[this.state.currentPhase];
    currentPhase.status = 'paused';

    console.log(`⏸️ Rollout paused at Phase ${this.state.currentPhase}: ${currentPhase.description}`);
    this.broadcastUpdate({
      type: 'rollout_paused',
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString()
    });
  }

  async resume(): Promise<void> {
    if (!this.state.isRunning || !this.state.isPaused) {
      console.log('⚠️ No paused rollout to resume');
      return;
    }

    this.state.isPaused = false;
    const currentPhase = this.config.phases[this.state.currentPhase];
    currentPhase.status = 'active';

    console.log(`▶️ Rollout resumed at Phase ${this.state.currentPhase}: ${currentPhase.description}`);
    this.broadcastUpdate({
      type: 'rollout_resumed',
      phase: this.state.currentPhase,
      timestamp: new Date().toISOString()
    });
  }

  async rollback(): Promise<void> {
    if (!this.state.isRunning) {
      console.log('⚠️ No rollout in progress');
      return;
    }

    console.log('🔄 Initiating rollback...');
    
    // Stop current rollout
    this.stop();
    
    // Reset to previous stable phase or 0
    const targetPhase = Math.max(0, this.state.currentPhase - 1);
    
    console.log(`🔙 Rolled back to Phase ${targetPhase}: ${this.config.phases[targetPhase].description}`);
    this.broadcastUpdate({
      type: 'rollback_completed',
      fromPhase: this.state.currentPhase,
      toPhase: targetPhase,
      timestamp: new Date().toISOString()
    });

    // Save rollback report
    this.saveRollbackReport(targetPhase);
  }

  async advancePhase(): Promise<void> {
    if (!this.state.isRunning || this.state.isPaused) {
      console.log('⚠️ Cannot advance phase - rollout not active');
      return;
    }

    const nextPhase = this.state.currentPhase + 1;
    if (nextPhase >= this.config.phases.length) {
      console.log('🎉 All phases completed!');
      this.complete();
      return;
    }

    // Check risk threshold before advancing
    const currentHealth = this.calculateOverallHealth();
    if (currentHealth < (100 - this.config.riskThreshold)) {
      console.log(`⚠️ Health score ${currentHealth}% below threshold - pausing advancement`);
      this.state.isPaused = true;
      this.broadcastUpdate({
        type: 'advancement_paused',
        reason: 'Low health score',
        health: currentHealth,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Complete current phase
    const currentPhaseConfig = this.config.phases[this.state.currentPhase];
    currentPhaseConfig.status = 'completed';
    currentPhaseConfig.endTime = Date.now();

    // Start next phase
    this.state.currentPhase = nextPhase;
    const nextPhaseConfig = this.config.phases[nextPhase];
    nextPhaseConfig.status = 'active';
    nextPhaseConfig.startTime = Date.now();

    console.log(`📈 Advanced to Phase ${nextPhase}: ${nextPhaseConfig.description} (${nextPhaseConfig.percentage}% traffic)`);
    console.log(`   Risk Score: ${nextPhaseConfig.riskScore}/100`);
    
    this.broadcastUpdate({
      type: 'phase_advanced',
      fromPhase: nextPhase - 1,
      toPhase: nextPhase,
      percentage: nextPhaseConfig.percentage,
      riskScore: nextPhaseConfig.riskScore,
      timestamp: new Date().toISOString()
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.server) {
      this.server.close();
      this.server = undefined;
    }

    this.state.isRunning = false;
    this.state.endTime = Date.now();

    console.log('🛑 Rollout stopped');
    this.broadcastUpdate({
      type: 'rollout_stopped',
      timestamp: new Date().toISOString()
    });
  }

  complete(): void {
    this.stop();
    
    const finalPhase = this.config.phases[this.state.currentPhase];
    finalPhase.status = 'completed';
    finalPhase.endTime = Date.now();

    console.log('🎉 Rollout completed successfully!');
    console.log(`📊 Final Health Score: ${this.state.overallHealth}%`);
    console.log(`⏱️ Total Duration: ${Math.round((Date.now() - this.state.startTime) / 60000)} minutes`);
    
    this.broadcastUpdate({
      type: 'rollout_completed',
      finalHealth: this.state.overallHealth,
      totalDuration: Date.now() - this.state.startTime,
      timestamp: new Date().toISOString()
    });

    this.saveCompletionReport();
  }

  shouldServeRequest(): boolean {
    if (!this.state.isRunning || this.state.isPaused) {
      return false;
    }

    const currentPhase = this.config.phases[this.state.currentPhase];
    const random = Math.random() * 100;
    
    return random <= currentPhase.percentage;
  }

  recordRequest(success: boolean, responseTime: number): void {
    if (!this.state.isRunning) return;

    this.state.totalRequests++;
    if (!success) {
      this.state.totalErrors++;
    }

    const currentPhase = this.config.phases[this.state.currentPhase];
    currentPhase.metrics.requestsServed++;
    
    if (!success) {
      currentPhase.metrics.errorRate = (currentPhase.metrics.errorRate * (currentPhase.metrics.requestsServed - 1) + 100) / currentPhase.metrics.requestsServed;
    } else {
      currentPhase.metrics.errorRate = (currentPhase.metrics.errorRate * (currentPhase.metrics.requestsServed - 1)) / currentPhase.metrics.requestsServed;
    }

    currentPhase.metrics.responseTime = (currentPhase.metrics.responseTime * (currentPhase.metrics.requestsServed - 1) + responseTime) / currentPhase.metrics.requestsServed;

    this.state.lastUpdate = new Date().toISOString();
  }

  getCurrentPhase(): RolloutPhase {
    return this.config.phases[this.state.currentPhase];
  }

  getRolloutStatus(): any {
    return {
      state: this.state,
      config: this.config,
      currentPhase: this.getCurrentPhase(),
      progress: this.calculateProgress(),
      health: this.calculateOverallHealth(),
      estimatedCompletion: this.estimateCompletion()
    };
  }

  private createEmptyMetrics(): PhaseMetrics {
    return {
      requestsServed: 0,
      errorRate: 0,
      responseTime: 0,
      userSatisfaction: 95,
      conversionRate: 5.2,
      revenueImpact: 0
    };
  }

  private startMonitoringLoop(): void {
    this.intervalId = setInterval(() => {
      if (!this.state.isRunning || this.state.isPaused) return;

      this.updateMetrics();
      this.checkPhaseAdvancement();
      this.checkRollbackConditions();
      
      // Broadcast metrics update
      this.broadcastUpdate({
        type: 'metrics_update',
        metrics: this.getCurrentPhase().metrics,
        health: this.calculateOverallHealth(),
        timestamp: new Date().toISOString()
      });

    }, this.config.monitoringInterval * 1000);
  }

  private updateMetrics(): void {
    const currentPhase = this.getCurrentPhase();
    
    // Simulate metric updates (in real implementation, these would come from actual monitoring)
    currentPhase.metrics.userSatisfaction = Math.max(80, Math.min(99, 
      currentPhase.metrics.userSatisfaction + (Math.random() - 0.5) * 2));
    
    currentPhase.metrics.conversionRate = Math.max(3, Math.min(8, 
      currentPhase.metrics.conversionRate + (Math.random() - 0.5) * 0.5));
    
    currentPhase.metrics.revenueImpact = Math.round(currentPhase.metrics.requestsServed * 
      currentPhase.metrics.conversionRate * 100); // $100 per conversion

    this.state.overallHealth = this.calculateOverallHealth();
  }

  private checkPhaseAdvancement(): void {
    if (!this.config.autoAdvance) return;

    const currentPhase = this.getCurrentPhase();
    const phaseDuration = (Date.now() - (currentPhase.startTime || Date.now())) / 60000; // minutes

    if (phaseDuration >= currentPhase.duration) {
      this.advancePhase();
    }
  }

  private checkRollbackConditions(): void {
    if (!this.config.enableRollback) return;

    const currentPhase = this.getCurrentPhase();
    const health = this.calculateOverallHealth();

    // Auto-rollback if health is critically low
    if (health < 70) {
      console.log(`🚨 Critical health detected (${health}%) - initiating auto-rollback`);
      this.rollback();
    }
  }

  private calculateOverallHealth(): number {
    const currentPhase = this.getCurrentPhase();
    
    // Weighted health calculation
    const errorRateWeight = 0.4;
    const responseTimeWeight = 0.3;
    const satisfactionWeight = 0.3;

    const errorScore = Math.max(0, 100 - currentPhase.metrics.errorRate * 10);
    const responseScore = Math.max(0, 100 - (currentPhase.metrics.responseTime - 100) / 10);
    const satisfactionScore = currentPhase.metrics.userSatisfaction;

    return Math.round(
      errorScore * errorRateWeight + 
      responseScore * responseTimeWeight + 
      satisfactionScore * satisfactionWeight
    );
  }

  private calculateProgress(): number {
    const totalPhases = this.config.phases.length;
    const currentPhase = this.state.currentPhase;
    const phaseProgress = this.getCurrentPhase().duration > 0 ? 
      Math.min(1, (Date.now() - (this.getCurrentPhase().startTime || Date.now())) / (this.getCurrentPhase().duration * 60000)) : 0;

    return Math.round(((currentPhase + phaseProgress) / totalPhases) * 100);
  }

  private estimateCompletion(): string {
    if (!this.state.isRunning) return 'N/A';

    const remainingPhases = this.config.phases.slice(this.state.currentPhase + 1);
    const remainingDuration = remainingPhases.reduce((sum, phase) => sum + phase.duration, 0);
    const currentPhaseRemaining = Math.max(0, 
      this.getCurrentPhase().duration - (Date.now() - (this.getCurrentPhase().startTime || Date.now())) / 60000);

    const totalRemaining = remainingDuration + currentPhaseRemaining;
    const completionTime = new Date(Date.now() + totalRemaining * 60000);
    
    return completionTime.toLocaleTimeString();
  }

  private async startSSEServer(): Promise<void> {
    this.server = createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      if (req.url === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        // Send initial state
        res.write(`data: ${JSON.stringify({
          type: 'initial_state',
          status: this.getRolloutStatus(),
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Store client connection
        this.state.clients.add(res);

        // Handle client disconnect
        req.on('close', () => {
          this.state.clients.delete(res);
        });

      } else if (req.url === '/status') {
        // REST API endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getRolloutStatus()));
      
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(this.config.port, () => {
      console.log(`📡 SSE server running on http://localhost:${this.config.port}`);
      console.log(`   Events: http://localhost:${this.config.port}/events`);
      console.log(`   Status: http://localhost:${this.config.port}/status`);
    });
  }

  private broadcastUpdate(event: any): void {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    
    this.state.clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        // Remove disconnected clients
        this.state.clients.delete(client);
      }
    });
  }

  private saveCompletionReport(): void {
    const report = {
      rolloutId: `rollout-${Date.now()}`,
      startTime: new Date(this.state.startTime).toISOString(),
      endTime: new Date(this.state.endTime || Date.now()).toISOString(),
      totalDuration: this.state.endTime ? this.state.endTime - this.state.startTime : 0,
      finalHealth: this.state.overallHealth,
      totalRequests: this.state.totalRequests,
      totalErrors: this.state.totalErrors,
      phases: this.config.phases.map(phase => ({
        ...phase,
        duration: phase.endTime && phase.startTime ? phase.endTime - phase.startTime : 0
      })),
      metricsHistory: this.metricsHistory
    };

    const filename = `.factory-wager/reports/rollout-completion-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Completion report saved: ${filename}`);
  }

  private saveRollbackReport(targetPhase: number): void {
    const report = {
      rollbackId: `rollback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromPhase: this.state.currentPhase,
      toPhase: targetPhase,
      reason: 'Manual rollback triggered',
      healthAtRollback: this.state.overallHealth,
      metrics: this.getCurrentPhase().metrics
    };

    const filename = `.factory-wager/reports/rollback-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Rollback report saved: ${filename}`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  const scheduler = new EnhancedRolloutScheduler({
    phases: [
      { id: 0, percentage: 5, duration: 2, riskScore: 65, description: 'Initial canary', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
      { id: 1, percentage: 25, duration: 3, riskScore: 55, description: 'Limited rollout', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
      { id: 2, percentage: 50, duration: 4, riskScore: 45, description: 'Balanced rollout', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
      { id: 3, percentage: 100, duration: 5, riskScore: 35, description: 'Full deployment', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } }
    ],
    totalDuration: 14, // 14 minutes for demo
    autoAdvance: true,
    riskThreshold: 70,
    enableRollback: true,
    monitoringInterval: 10, // 10 seconds for demo
    sseEnabled: true,
    port: 3002
  });

  switch (command) {
    case 'start':
      await scheduler.start();
      console.log('Press Ctrl+C to stop the rollout');
      break;
    
    case 'pause':
      await scheduler.pause();
      break;
    
    case 'resume':
      await scheduler.resume();
      break;
    
    case 'advance':
      await scheduler.advancePhase();
      break;
    
    case 'rollback':
      await scheduler.rollback();
      break;
    
    case 'status':
      console.log(JSON.stringify(scheduler.getRolloutStatus(), null, 2));
      break;
    
    default:
      console.log('Usage: bun rollout-scheduler.ts [start|pause|resume|advance|rollback|status]');
  }
}

export { EnhancedRolloutScheduler };
