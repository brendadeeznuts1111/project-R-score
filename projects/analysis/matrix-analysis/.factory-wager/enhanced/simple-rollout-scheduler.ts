#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Simple Rollout Scheduler v2.0
 * Streamlined A/B rollout with cron-style progression and SSE notifications
 * Based on original concept: Progressive rollout with risk assessment
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createServer } from 'http';
import { writeFileSync } from 'fs';

interface RolloutMetrics {
  rollout: number;
  phase: string;
  risk: number;
  requests: number;
  errors: number;
  health: number;
  timestamp: string;
}

class SimpleRolloutScheduler {
  private rolloutPhase: number = 0;
  private phases: string[] = ['5%', '25%', '50%', '100%'];
  private percentages: number[] = [5, 25, 50, 100];
  private intervalId?: NodeJS.Timeout;
  private server?: any;
  private metrics: RolloutMetrics;
  private clients: Set<any> = new Set();
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.metrics = {
      rollout: 0,
      phase: '5%',
      risk: 65,
      requests: 0,
      errors: 0,
      health: 100,
      timestamp: new Date().toISOString()
    };
  }

  start(): void {
    if (this.intervalId) {
      console.log('⚠️ Rollout already running');
      return;
    }

    console.log('🚀 FactoryWager Simple Rollout Scheduler v2.0');
    console.log('==============================================');
    console.log('📊 Phases: 5% → 25% → 50% → 100%');
    console.log('⏱️ Phase Duration: 1 minute');
    console.log('🎯 Risk Reduction: 10 points per phase');
    console.log('📡 SSE Server: http://localhost:3003/events');
    console.log('');

    // Start SSE server
    this.startSSEServer();

    // Start rollout progression
    this.intervalId = setInterval(() => {
      this.advancePhase();
    }, 60000); // 1 minute phases

    // Initial phase announcement
    this.announcePhase();
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

    console.log('🛑 Rollout scheduler stopped');
    this.broadcastUpdate({
      type: 'rollout_stopped',
      timestamp: new Date().toISOString()
    });
  }

  shouldServeRequest(): boolean {
    this.requestCount++;
    
    const currentPercentage = this.percentages[this.rolloutPhase];
    const random = Math.random() * 100;
    
    const shouldServe = random <= currentPercentage;
    
    if (!shouldServe) {
      console.log('🚫 Request blocked (not in rollout phase)');
    }
    
    return shouldServe;
  }

  recordRequest(success: boolean, responseTime: number = 0): void {
    if (!success) {
      this.errorCount++;
    }

    // Update metrics
    this.updateMetrics();

    // Log performance
    const status = success ? '✅' : '❌';
    console.log(`${status} Request ${this.requestCount}: ${Math.round(responseTime)}ms | Health: ${this.metrics.health}%`);
  }

  getCurrentPhase(): number {
    return this.rolloutPhase;
  }

  getMetrics(): RolloutMetrics {
    return { ...this.metrics };
  }

  private advancePhase(): void {
    this.rolloutPhase = (this.rolloutPhase + 1) % 4;
    this.announcePhase();
  }

  private announcePhase(): void {
    const phase = this.phases[this.rolloutPhase];
    const risk = 65 - this.rolloutPhase * 10;
    
    console.log(`🚀 Rollout Phase: ${phase} | Risk: ${risk}/100`);
    
    // Update metrics
    this.metrics.rollout = this.rolloutPhase;
    this.metrics.phase = phase;
    this.metrics.risk = risk;
    this.metrics.timestamp = new Date().toISOString();
    
    // Broadcast via SSE
    this.broadcastUpdate({
      type: 'phase_advanced',
      rollout: this.rolloutPhase,
      phase: phase,
      risk: risk,
      health: this.metrics.health,
      timestamp: this.metrics.timestamp
    });

    // Save checkpoint
    this.saveCheckpoint();
  }

  private updateMetrics(): void {
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    // Health calculation: base health minus error impact
    const baseHealth = 100 - (this.rolloutPhase * 5); // Progressive base reduction
    const errorImpact = errorRate * 2; // 2% health per 1% error rate
    this.metrics.health = Math.max(0, Math.round(baseHealth - errorImpact));
    
    this.metrics.requests = this.requestCount;
    this.metrics.errors = this.errorCount;
    this.metrics.timestamp = new Date().toISOString();

    // Broadcast metrics update
    this.broadcastUpdate({
      type: 'metrics_update',
      metrics: this.metrics,
      timestamp: this.metrics.timestamp
    });
  }

  private startSSEServer(): void {
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
          metrics: this.metrics,
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Store client connection
        this.clients.add(res);

        // Handle client disconnect
        req.on('close', () => {
          this.clients.delete(res);
        });

      } else if (req.url === '/status') {
        // REST API endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          metrics: this.metrics,
          rolloutPhase: this.rolloutPhase,
          currentPhase: this.phases[this.rolloutPhase],
          percentage: this.percentages[this.rolloutPhase],
          risk: 65 - this.rolloutPhase * 10,
          uptime: this.intervalId ? 'running' : 'stopped'
        }));
      
      } else if (req.url === '/health') {
        // Simple health check
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          phase: this.rolloutPhase,
          health: this.metrics.health,
          requests: this.requestCount,
          errors: this.errorCount
        }));
      
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(3003, () => {
      console.log('📡 SSE server started on http://localhost:3003');
      console.log('   Events: http://localhost:3003/events');
      console.log('   Status: http://localhost:3003/status');
      console.log('   Health: http://localhost:3003/health');
    });
  }

  private broadcastUpdate(event: any): void {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    
    this.clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        // Remove disconnected clients
        this.clients.delete(client);
      }
    });
  }

  private saveCheckpoint(): void {
    const checkpoint = {
      rollout: this.rolloutPhase,
      phase: this.phases[this.rolloutPhase],
      risk: 65 - this.rolloutPhase * 10,
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };

    const filename = `.factory-wager/reports/rollout-checkpoint-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(checkpoint, null, 2));
  }
}

// Global instance for easy access
let globalScheduler: SimpleRolloutScheduler;

// Factory function for integration
export function createRolloutScheduler(): SimpleRolloutScheduler {
  if (!globalScheduler) {
    globalScheduler = new SimpleRolloutScheduler();
  }
  return globalScheduler;
}

// Express middleware integration
export function rolloutMiddleware(req: any, res: any, next: any) {
  const scheduler = createRolloutScheduler();
  
  if (!scheduler.shouldServeRequest()) {
    return res.status(404).json({ 
      error: 'Feature not available in current rollout phase',
      phase: scheduler.getCurrentPhase(),
      percentage: scheduler.getMetrics().phase
    });
  }
  
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body: any) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    scheduler.recordRequest(success, responseTime);
    return originalSend.call(this, body);
  };
  
  next();
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  const scheduler = createRolloutScheduler();

  switch (command) {
    case 'start':
      scheduler.start();
      console.log('Press Ctrl+C to stop the rollout');
      break;
    
    case 'stop':
      scheduler.stop();
      break;
    
    case 'status':
      console.log(JSON.stringify(scheduler.getMetrics(), null, 2));
      break;
    
    case 'demo':
      // Demo with simulated traffic
      scheduler.start();
      
      // Simulate requests every 2 seconds
      setInterval(() => {
        const success = Math.random() > 0.05; // 95% success rate
        const responseTime = 100 + Math.random() * 400; // 100-500ms
        scheduler.recordRequest(success, responseTime);
      }, 2000);
      
      console.log('🎬 Demo started with simulated traffic');
      break;
    
    default:
      console.log('Usage: bun simple-rollout-scheduler.ts [start|stop|status|demo]');
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down rollout scheduler...');
    scheduler.stop();
    process.exit(0);
  });
}

export { SimpleRolloutScheduler };
