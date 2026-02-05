#!/usr/bin/env bun

// ai/api.ts - REST API for Nebula-Flow™ AI System
// Endpoints for scoring, training, and monitoring

import { AnomalyEngine } from './anomalyEngine.js';
import { trainModel, getTrainingHistory } from './train.js';
import type { 
  LegSignal, 
  AnomalyResult,
  ScoreResponse, 
  BatchScoreResponse, 
  TrainingResponse, 
  HealthResponse,
  APIResponse 
} from './types.js';

console.log("🌐 Nebula-Flow™ AI API - Starting");

export class AIAPI {
  private engine: AnomalyEngine;
  private requestCount = 0;
  private startTime = Date.now();
  
  constructor() {
    this.engine = new AnomalyEngine();
  }
  
  // Health check endpoint
  async health(): Promise<HealthResponse> {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    return {
      success: true,
      data: {
        status: 'healthy',
        modelLoaded: this.engine.getStats().modelInitialized,
        uptime,
        memoryUsage: memoryUsage.heapUsed
      },
      timestamp: new Date().toISOString()
    };
  }
  
  // Score single leg
  async scoreLeg(signal: LegSignal): Promise<ScoreResponse> {
    const startTime = performance.now();
    
    try {
      this.requestCount++;
      
      const result = await this.engine.scoreLeg(signal);
      const processingTime = performance.now() - startTime;
      
      return {
        success: true,
        data: result,
        processingTime,
        modelVersion: this.engine.getStats().version,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: performance.now() - startTime,
        modelVersion: this.engine.getStats().version,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Score batch of legs
  async scoreBatch(signals: LegSignal[]): Promise<BatchScoreResponse> {
    const startTime = performance.now();
    
    try {
      this.requestCount += signals.length;
      
      const results = await this.engine.scoreBatch(signals);
      const processingTime = performance.now() - startTime;
      
      return {
        success: true,
        data: results,
        totalProcessed: signals.length,
        processingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        totalProcessed: 0,
        processingTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Train new model
  async trainModel(): Promise<TrainingResponse> {
    const startTime = performance.now();
    
    try {
      const metrics = await trainModel();
      const trainingTime = performance.now() - startTime;
      
      return {
        success: true,
        data: metrics,
        trainingTime,
        samplesUsed: metrics.samples,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        trainingTime: performance.now() - startTime,
        samplesUsed: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Get training history
  async getHistory(): Promise<APIResponse<any[]>> {
    try {
      const history = await getTrainingHistory();
      
      return {
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Get system statistics
  async getStats(): Promise<APIResponse<any>> {
    try {
      const engineStats = this.engine.getStats();
      const uptime = Date.now() - this.startTime;
      
      return {
        success: true,
        data: {
          ...engineStats,
          uptime,
          requestsProcessed: this.requestCount,
          requestsPerSecond: this.requestCount / (uptime / 1000),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Export anomaly data
  async exportData(startDate: string, endDate: string): Promise<APIResponse<string>> {
    try {
      // Mock export - in production, query actual database
      const mockData = this.generateMockExportData(startDate, endDate);
      const csv = this.convertToCSV(mockData);
      
      return {
        success: true,
        data: csv,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  private generateMockExportData(startDate: string, endDate: string) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < Math.min(days * 100, 1000); i++) {
      const score = Math.random();
      const nebulaCode = score < 0.7 ? 'N-00' : score < 0.9 ? 'N-AI-T' : 'N-AI-B';
      
      data.push({
        timestamp: new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString(),
        deviceId: `device_${i}`,
        amount: Math.floor(Math.random() * 10000),
        anomalyScore: score,
        nebulaCode,
        riskReasons: score > 0.7 ? ['HIGH_RISK', 'VELOCITY_HIGH'] : ['LOW_RISK'],
        recommendation: nebulaCode === 'N-00' ? 'ALLOW' : nebulaCode === 'N-AI-T' ? 'THROTTLE' : 'BLOCK'
      });
    }
    
    return data;
  }
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
}

// Express.js route handlers
export function createRoutes(app: any) {
  const api = new AIAPI();
  
  // Health check
  app.get('/api/ai/health', async (req: any, res: any) => {
    const result = await api.health();
    res.json(result);
  });
  
  // Score single leg
  app.post('/api/ai/score', async (req: any, res: any) => {
    const result = await api.scoreLeg(req.body);
    res.json(result);
  });
  
  // Score batch
  app.post('/api/ai/score-batch', async (req: any, res: any) => {
    const result = await api.scoreBatch(req.body.signals || []);
    res.json(result);
  });
  
  // Train model
  app.post('/api/ai/train', async (req: any, res: any) => {
    const result = await api.trainModel();
    res.json(result);
  });
  
  // Get history
  app.get('/api/ai/history', async (req: any, res: any) => {
    const result = await api.getHistory();
    res.json(result);
  });
  
  // Get stats
  app.get('/api/ai/stats', async (req: any, res: any) => {
    const result = await api.getStats();
    res.json(result);
  });
  
  // Export data
  app.get('/api/ai/export', async (req: any, res: any) => {
    const { startDate, endDate } = req.query;
    const result = await api.exportData(startDate, endDate);
    
    if (result.success) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="anomaly-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(result.data);
    } else {
      res.status(500).json(result);
    }
  });
  
  console.log('🔗 AI API routes registered');
}

export default AIAPI;
