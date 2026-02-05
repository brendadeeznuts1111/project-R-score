#!/usr/bin/env bun
// genesis-unit-01.ts - Phase-01 Orchestrator with IPC Feedback Loop
// ADB-Turbo Gmail Creation + Real-Time Verification + ZSTD Logging

import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface GenesisPhase01Config {
  traceId: string;
  unitGmail: string;
  proxyFloor: number;
  retryLimit: number;
  adbWaitMs: number;
}

interface GenesisFeedback {
  phase: '01';
  status: 'SUCCESS' | 'FAIL' | 'PENDING';
  trace: string;
  gmail?: string;
  totp?: string;
  timestamp: string;
  duration?: number;
  attempts?: number;
}

class GenesisUnit01 {
  private config: GenesisPhase01Config;
  private logStream: string;
  private startTime: number;
  private feedbackCallbacks: Array<(feedback: GenesisFeedback) => void> = [];

  constructor(config: Partial<GenesisPhase01Config> = {}) {
    this.config = {
      traceId: config.traceId || `GEN-01-${Date.now()}`,
      unitGmail: config.unitGmail || `genesis-unit-${Date.now()}@example.com`,
      proxyFloor: config.proxyFloor || 8192,
      retryLimit: config.retryLimit || 3,
      adbWaitMs: config.adbWaitMs || 1500,
      ...config
    };

    this.logStream = `./factory/logs/unit-01/${this.config.traceId}-gmail.zst`;
    this.startTime = Date.now();
  }

  // 🚀 Phase-01 Ignition
  async ignite(): Promise<GenesisFeedback> {
    console.log(`🚀 GENESIS PHASE-01 IGNITION: ${this.config.traceId}`);
    console.log(`📱 Target Gmail: ${this.config.unitGmail}`);
    console.log(`🛡️ Proxy Floor: ${this.config.proxyFloor}`);

    try {
      // Ensure log directory exists
      await mkdir('./factory/logs/unit-01', { recursive: true });

      // Execute Phase-01 Gmail Creation
      const result = await this.executePhase01();
      
      // Broadcast feedback to all callbacks
      this.broadcastFeedback(result);
      
      return result;
    } catch (error) {
      const feedback: GenesisFeedback = {
        phase: '01',
        status: 'FAIL',
        trace: this.config.traceId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime
      };
      
      this.broadcastFeedback(feedback);
      return feedback;
    }
  }

  // 🔥 Execute Phase-01 Script with IPC
  private async executePhase01(): Promise<GenesisFeedback> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        TRACE_ID: this.config.traceId,
        UNIT_GMAIL: this.config.unitGmail,
        PROXY_FLOOR: this.config.proxyFloor.toString(),
        RETRY_LIMIT: this.config.retryLimit.toString(),
        ADB_WAIT_MS: this.config.adbWaitMs.toString()
      };

      const phase01 = spawn('bash', [
        './factory/phases/phase-01-gmail-creation.sh'
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';
      let attempts = 0;

      // Capture output for real-time feedback
      phase01.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Real-time parsing for feedback
        if (output.includes('Phase-01 STABLE')) {
          attempts = this.extractAttempts(output);
        }
        
        console.log(`📡 [${this.config.traceId}] ${output.trim()}`);
      });

      phase01.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`❌ [${this.config.traceId}] ${output.trim()}`);
      });

      phase01.on('close', async (code) => {
        const duration = Date.now() - this.startTime;
        
        if (code === 0) {
          // Parse success details from output
          const gmailMatch = stdout.match(/Target Gmail: ([^\s]+)/);
          const totpMatch = stdout.match(/TOTP Seed Vaulted: ([a-f0-9]{4})/);
          
          const feedback: GenesisFeedback = {
            phase: '01',
            status: 'SUCCESS',
            trace: this.config.traceId,
            gmail: gmailMatch?.[1] || this.config.unitGmail,
            totp: totpMatch?.[1] || 'unknown',
            timestamp: new Date().toISOString(),
            duration,
            attempts
          };
          
          // Store performance metrics
          await this.storeMetrics(feedback, stdout);
          
          resolve(feedback);
        } else {
          const feedback: GenesisFeedback = {
            phase: '01',
            status: 'FAIL',
            trace: this.config.traceId,
            timestamp: new Date().toISOString(),
            duration,
            attempts
          };
          
          resolve(feedback);
        }
      });

      phase01.on('error', (error) => {
        console.error(`💥 [${this.config.traceId}] Phase-01 Error:`, error);
        reject(error);
      });
    });
  }

  // 📊 Extract attempt count from logs
  private extractAttempts(output: string): number {
    const attemptMatch = output.match(/Attempt (\d+)\/\d+/);
    return attemptMatch ? parseInt(attemptMatch[1]) : 1;
  }

  // 💾 Store performance metrics
  private async storeMetrics(feedback: GenesisFeedback, logs: string): Promise<void> {
    const metrics = {
      ...feedback,
      performance: {
        duration: feedback.duration,
        successRate: feedback.attempts ? (100 / feedback.attempts) : 100,
        logSize: logs.length,
        compressedSize: await this.getCompressedSize()
      }
    };

    const metricsPath = `./factory/metrics/unit-01/${feedback.trace || this.config.traceId}.json`;
    await mkdir('./factory/metrics/unit-01', { recursive: true });
    await writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    
    console.log(`📊 [${feedback.trace}] Metrics stored: ${metricsPath}`);
  }

  // 📏 Get compressed log size
  private async getCompressedSize(): Promise<number> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(this.logStream);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // 📡 IPC Feedback Registration
  onFeedback(callback: (feedback: GenesisFeedback) => void): void {
    this.feedbackCallbacks.push(callback);
  }

  // 📢 Broadcast Feedback to Nexus
  private broadcastFeedback(feedback: GenesisFeedback): void {
    console.log(`📡 [${feedback.trace}] Broadcasting Feedback:`, feedback);
    
    this.feedbackCallbacks.forEach(callback => {
      try {
        callback(feedback);
      } catch (error) {
        console.error(`❌ [${feedback.trace}] Feedback callback error:`, error);
      }
    });

    // Send to Nexus IPC (if available)
    this.sendToNexus(feedback);
  }

  // 🌐 Send to Nexus IPC
  private sendToNexus(feedback: GenesisFeedback): void {
    // Nexus IPC communication (stub for integration)
    if (process.env.NEXUS_IPC_PORT) {
      const nexusData = {
        type: 'genesis_feedback',
        phase: feedback.phase,
        data: feedback
      };
      
      console.log(`🌐 [${feedback.trace}] Nexus IPC:`, nexusData);
      // Actual IPC implementation would go here
    }
  }

  // 📈 Performance Analytics
  getPerformanceMetrics(): {
    phase: string;
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    avgAttempts: number;
  } {
    // This would read from stored metrics
    return {
      phase: '01',
      totalRuns: 0,
      successRate: 0,
      avgDuration: 0,
      avgAttempts: 0
    };
  }
}

// ============================================================================
// 🚀 GENESIS CLI INTERFACE
// ============================================================================

if (import.meta.main) {
  const command = process.argv[2];
  const traceId = process.argv[3] || `GEN-01-${Date.now()}`;

  switch (command) {
    case 'ignite':
    case 'phase-01': {
      console.log('🚀 GENESIS PHASE-01 IGNITION SEQUENCE');
      
      const unit = new GenesisUnit01({
        traceId,
        unitGmail: `genesis-unit-${traceId}@example.com`,
        proxyFloor: 8192
      });

      // Register feedback handler
      unit.onFeedback((feedback) => {
        console.log(`📡 FEEDBACK: ${feedback.status} | ${feedback.trace}`);
        
        if (feedback.status === 'SUCCESS') {
          console.log(`✅ Gmail Created: ${feedback.gmail}`);
          console.log(`🔒 TOTP Seed: ${feedback.totp}...`);
          console.log(`⏱️ Duration: ${feedback.duration}ms`);
        }
      });

      // Execute Phase-01
      const result = await unit.ignite();
      
      if (result.status === 'SUCCESS') {
        console.log('🎆 GENESIS PHASE-01 COMPLETE - DOMINION ACHIEVED!');
        process.exit(0);
      } else {
        console.log('💥 GENESIS PHASE-01 FAILED - RETRY REQUIRED');
        process.exit(1);
      }
      break;
    }

    case 'verify': {
      console.log('🔍 GENESIS FEEDBACK VERIFICATION');
      // Implementation for feedback verification
      break;
    }

    case 'log-decode': {
      console.log('📂 ZSTD LOG DECODING');
      const { spawn } = await import('child_process');
      
      const logFile = `./factory/logs/unit-01/${traceId}-gmail.zst`;
      const decoder = spawn('zstd', ['-d', '-c', logFile]);
      
      decoder.stdout?.pipe(process.stdout);
      decoder.stderr?.pipe(process.stderr);
      break;
    }

    default:
      console.log('🎯 GENESIS PHASE-01 COMMANDS:');
      console.log('  bun genesis-unit-01.ts phase-01 [traceId]  - Execute Gmail creation');
      console.log('  bun genesis-unit-01.ts verify [traceId]    - Verify feedback status');
      console.log('  bun genesis-unit-01.ts log-decode [traceId] - Decode ZSTD logs');
      break;
  }
}

export default GenesisUnit01;
