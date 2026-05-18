// src/api/metrics-api.ts
// Metrics API endpoints for v2.01.05 self-heal system

import { metricsCollector } from '../metrics/self-heal-metrics';
import { readFile, writeFile } from 'fs/promises';

export interface MetricsResponse {
  timestamp: number;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

export interface MetricsQuery {
  format?: 'json' | 'csv' | 'prometheus';
  startTime?: number;
  endTime?: number;
  patterns?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  limit?: number;
}

export class MetricsAPI {
  private static instance: MetricsAPI;
  
  static getInstance(): MetricsAPI {
    if (!MetricsAPI.instance) {
      MetricsAPI.instance = new MetricsAPI();
    }
    return MetricsAPI.instance;
  }

  async getCurrentMetrics(query: MetricsQuery = {}): Promise<MetricsResponse> {
    try {
      const format = query.format || 'json';
      const metrics = await metricsCollector.exportMetrics(format);
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: format === 'json' ? JSON.parse(metrics) : metrics
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getSystemHealth(): Promise<MetricsResponse> {
    try {
      const systemMetrics = await metricsCollector.collectSystemMetrics();
      const patternAnalysis = await metricsCollector.analyzePatterns();
      
      const health = {
        timestamp: Date.now(),
        status: 'healthy',
        system: {
          memory: {
            used: systemMetrics.memory.heapUsed,
            total: systemMetrics.memory.heapTotal,
            usage: Math.round((systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100)
          },
          performance: systemMetrics.performance,
          uptime: systemMetrics.timestamp
        },
        patterns: patternAnalysis.summary,
        recommendations: patternAnalysis.recommendations,
        alerts: this.generateAlerts(systemMetrics, patternAnalysis)
      };
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: health
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getPatternAnalysis(): Promise<MetricsResponse> {
    try {
      const analysis = await metricsCollector.analyzePatterns();
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: analysis
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getRiskAssessment(): Promise<MetricsResponse> {
    try {
      const systemMetrics = await metricsCollector.collectSystemMetrics();
      const patterns = systemMetrics.patterns;
      
      const riskAssessment = {
        timestamp: Date.now(),
        overall: this.calculateOverallRisk(patterns),
        patterns: patterns.map(p => ({
          pattern: p.pattern,
          riskScore: this.calculatePatternRisk(p),
          riskLevel: this.getRiskLevel(this.calculatePatternRisk(p)),
          count: p.count,
          avgSize: p.avgSize,
          recommendations: this.generatePatternRecommendations(p)
        })),
        recommendations: this.generateRiskRecommendations(patterns)
      };
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: riskAssessment
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getTrends(query: MetricsQuery = {}): Promise<MetricsResponse> {
    try {
      const systemMetrics = await metricsCollector.collectSystemMetrics();
      
      const trends = {
        timestamp: Date.now(),
        performance: {
          filesPerSecond: systemMetrics.performance.filesPerSecond,
          bytesPerSecond: systemMetrics.performance.bytesPerSecond,
          errorRate: systemMetrics.performance.errorRate,
          averageOperationTime: systemMetrics.performance.averageOperationTime
        },
        patterns: systemMetrics.patterns.map(p => ({
          pattern: p.pattern,
          frequency: p.frequency,
          trend: this.calculateFrequencyTrend(p),
          sizeTrend: this.calculateSizeTrend(p)
        })),
        system: {
          memoryTrend: this.calculateMemoryTrend(systemMetrics.memory),
          diskTrend: 'stable', // Would need historical data
          cpuTrend: 'stable'   // Would need historical data
        },
        predictions: this.generatePredictions(systemMetrics)
      };
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: trends
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async exportMetrics(query: MetricsQuery = {}): Promise<MetricsResponse> {
    try {
      const format = query.format || 'json';
      const metrics = await metricsCollector.exportMetrics(format);
      
      // Set appropriate content type for response
      const contentType = this.getContentType(format);
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: {
          content: metrics,
          contentType,
          filename: `metrics-${Date.now()}.${format === 'prometheus' ? 'txt' : format}`
        }
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getConfiguration(): Promise<MetricsResponse> {
    try {
      const config = metricsCollector.getMetrics();
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: {
          configuration: config.config,
          statistics: {
            operationsCount: config.operationsCount,
            patternsCount: config.patternsCount,
            uptime: config.uptime
          },
          capabilities: {
            realTimeCollection: config.config.enableRealTimeCollection,
            patternAnalysis: config.config.enablePatternAnalysis,
            performanceTracking: config.config.enablePerformanceTracking,
            riskAssessment: config.config.enableRiskAssessment
          }
        }
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async resetMetrics(): Promise<MetricsResponse> {
    try {
      metricsCollector.reset();
      
      return {
        timestamp: Date.now(),
        status: 'success',
        data: { message: 'Metrics reset successfully' }
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generateAlerts(systemMetrics: any, patternAnalysis: any): string[] {
    const alerts: string[] = [];
    
    // Memory alerts
    const memoryUsage = (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100;
    if (memoryUsage > 80) {
      alerts.push('High memory usage detected');
    }
    
    // Performance alerts
    if (systemMetrics.performance.errorRate > 0.1) {
      alerts.push('High error rate detected');
    }
    
    if (systemMetrics.performance.averageOperationTime > 5000) {
      alerts.push('Slow operation performance');
    }
    
    // Pattern alerts
    if (patternAnalysis.summary.highRiskPatterns > 0) {
      alerts.push(`${patternAnalysis.summary.highRiskPatterns} high-risk patterns detected`);
    }
    
    if (patternAnalysis.summary.totalPatterns > 50) {
      alerts.push('High number of file patterns detected');
    }
    
    return alerts;
  }

  private calculateOverallRisk(patterns: any[]): number {
    if (patterns.length === 0) return 0;
    
    const totalRisk = patterns.reduce((sum, p) => sum + this.calculatePatternRisk(p), 0);
    return Math.round(totalRisk / patterns.length);
  }

  private calculatePatternRisk(pattern: any): number {
    let risk = 0;
    
    // Size risk
    if (pattern.avgSize > 100 * 1024 * 1024) risk += 40; // > 100MB
    else if (pattern.avgSize > 10 * 1024 * 1024) risk += 25; // > 10MB
    else if (pattern.avgSize > 1024 * 1024) risk += 10; // > 1MB
    
    // Frequency risk
    if (pattern.frequency > 100) risk += 30;
    else if (pattern.frequency > 10) risk += 15;
    else if (pattern.frequency > 1) risk += 5;
    
    // Risk distribution risk
    const highRiskRatio = pattern.riskDistribution.high / pattern.count;
    if (highRiskRatio > 0.5) risk += 30;
    else if (highRiskRatio > 0.2) risk += 15;
    
    return Math.min(risk, 100);
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore < 30) return 'low';
    if (riskScore < 70) return 'medium';
    return 'high';
  }

  private generatePatternRecommendations(pattern: any): string[] {
    const recommendations: string[] = [];
    const riskScore = this.calculatePatternRisk(pattern);
    
    if (riskScore > 70) {
      recommendations.push('Immediate cleanup recommended');
      recommendations.push('Consider automated deletion policy');
    } else if (riskScore > 40) {
      recommendations.push('Schedule regular cleanup');
      recommendations.push('Monitor growth closely');
    }
    
    if (pattern.avgSize > 50 * 1024 * 1024) {
      recommendations.push('Consider compression or archiving');
    }
    
    if (pattern.frequency > 50) {
      recommendations.push('Implement frequency-based cleanup');
    }
    
    return recommendations;
  }

  private generateRiskRecommendations(patterns: any[]): string[] {
    const recommendations: string[] = [];
    const highRiskPatterns = patterns.filter(p => this.calculatePatternRisk(p) > 70);
    
    if (highRiskPatterns.length > 0) {
      recommendations.push(`Address ${highRiskPatterns.length} high-risk patterns immediately`);
    }
    
    const largePatterns = patterns.filter(p => p.avgSize > 50 * 1024 * 1024);
    if (largePatterns.length > 0) {
      recommendations.push('Implement compression for large file patterns');
    }
    
    const frequentPatterns = patterns.filter(p => p.frequency > 100);
    if (frequentPatterns.length > 0) {
      recommendations.push('Set up automated cleanup for high-frequency patterns');
    }
    
    return recommendations;
  }

  private calculateFrequencyTrend(pattern: any): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation
    if (pattern.frequency > 50) return 'increasing';
    if (pattern.frequency < 1) return 'decreasing';
    return 'stable';
  }

  private calculateSizeTrend(pattern: any): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation
    if (pattern.avgSize > 50 * 1024 * 1024) return 'increasing';
    if (pattern.avgSize < 1024 * 1024) return 'decreasing';
    return 'stable';
  }

  private calculateMemoryTrend(memory: any): 'increasing' | 'decreasing' | 'stable' {
    const usage = (memory.heapUsed / memory.heapTotal) * 100;
    if (usage > 80) return 'increasing';
    if (usage < 30) return 'decreasing';
    return 'stable';
  }

  private generatePredictions(systemMetrics: any): any {
    return {
      nextCleanup: {
        estimatedFiles: Math.round(systemMetrics.performance.filesPerSecond * 3600), // Next hour
        estimatedDuration: Math.round(systemMetrics.performance.averageOperationTime * 1.2),
        confidence: 0.8
      },
      diskUsage: {
        trend: 'stable',
        projection24h: 'stable',
        confidence: 0.7
      },
      performance: {
        expectedFilesPerSecond: systemMetrics.performance.filesPerSecond,
        expectedErrorRate: Math.max(0.01, systemMetrics.performance.errorRate * 0.9),
        confidence: 0.8
      }
    };
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'prometheus':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
}

// Express.js route handlers (for integration with web servers)
export function createMetricsRoutes(app: any): void {
  const api = MetricsAPI.getInstance();

  // Get current metrics
  app.get('/api/metrics', async (req: any, res: any) => {
    const query: MetricsQuery = {
      format: req.query.format,
      startTime: req.query.startTime ? parseInt(req.query.startTime) : undefined,
      endTime: req.query.endTime ? parseInt(req.query.endTime) : undefined,
      patterns: req.query.patterns ? req.query.patterns.split(',') : undefined,
      riskLevel: req.query.riskLevel,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const response = await api.getCurrentMetrics(query);
    
    if (response.status === 'error') {
      return res.status(500).json(response);
    }
    
    if (query.format === 'json') {
      res.json(response);
    } else {
      res.type(response.data.contentType);
      res.send(response.data.content);
    }
  });

  // System health endpoint
  app.get('/api/metrics/health', async (req: any, res: any) => {
    const response = await api.getSystemHealth();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });

  // Pattern analysis endpoint
  app.get('/api/metrics/patterns', async (req: any, res: any) => {
    const response = await api.getPatternAnalysis();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });

  // Risk assessment endpoint
  app.get('/api/metrics/risk', async (req: any, res: any) => {
    const response = await api.getRiskAssessment();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });

  // Trends endpoint
  app.get('/api/metrics/trends', async (req: any, res: any) => {
    const response = await api.getTrends();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });

  // Export metrics endpoint
  app.get('/api/metrics/export', async (req: any, res: any) => {
    const query: MetricsQuery = {
      format: req.query.format || 'json'
    };

    const response = await api.exportMetrics(query);
    
    if (response.status === 'error') {
      return res.status(500).json(response);
    }
    
    res.type(response.data.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${response.data.filename}"`);
    res.send(response.data.content);
  });

  // Configuration endpoint
  app.get('/api/metrics/config', async (req: any, res: any) => {
    const response = await api.getConfiguration();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });

  // Reset metrics endpoint
  app.post('/api/metrics/reset', async (req: any, res: any) => {
    const response = await api.resetMetrics();
    res.status(response.status === 'error' ? 500 : 200).json(response);
  });
}

export default MetricsAPI;
