#!/usr/bin/env bun
// Tension Field Historical Analysis Engine
import { join } from 'node:path';
import { TENSION_CONSTANTS } from './config';

interface Anomaly {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  description: string;
}

interface HistoricalData {
  timestamp: number;
  tensions: {
    volume: number;
    link: number;
    profile: number;
    security: number;
    compliance: number;
  };
  anomalies: Anomaly[];
  riskScore: number;
  events?: string[];
}

interface AnalysisReport {
  period: {
    start: string;
    end: string;
    duration: number;
  };
  summary: {
    totalDataPoints: number;
    avgTensions: {
      volume: number;
      link: number;
      profile: number;
      security: number;
      compliance: number;
    };
    peakTensions: {
      volume: number;
      link: number;
      profile: number;
      security: number;
      compliance: number;
    };
    minTensions: {
      volume: number;
      link: number;
      profile: number;
      security: number;
      compliance: number;
    };
    totalAnomalies: number;
    avgRiskScore: number;
  };
  trends: {
    volume: TrendAnalysis;
    link: TrendAnalysis;
    profile: TrendAnalysis;
    security: TrendAnalysis;
    compliance: TrendAnalysis;
  };
  patterns: PatternAnalysis[];
  recommendations: string[];
  riskAssessment: RiskAssessment;
}

interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  strength: number; // 0-1
  confidence: number; // 0-1
}

interface PatternAnalysis {
  type: 'seasonal' | 'cyclical' | 'sporadic' | 'correlation';
  description: string;
  strength: number;
  frequency?: string;
  correlation?: number;
}

interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  probabilityOfCrisis: number;
  recommendedActions: string[];
}

export class HistoricalAnalyzer {
  private data: HistoricalData[] = [];
  private readonly DATA_FILE = TENSION_CONSTANTS.DATA_FILE;

  private constructor() {}

  static async create(): Promise<HistoricalAnalyzer> {
    const analyzer = new HistoricalAnalyzer();
    await analyzer.loadData();
    return analyzer;
  }

  private async loadData(): Promise<void> {
    const file = Bun.file(this.DATA_FILE);
    if (await file.exists()) {
      try {
        this.data = await file.json();
        console.log(`📚 Loaded ${this.data.length} historical data points`);
      } catch (err) {
        console.error('❌ Failed to load historical data:', err);
        this.data = [];
      }
    } else {
      console.log('📝 No historical data found, starting fresh');
      this.data = [];
    }
  }

  private async saveData(): Promise<void> {
    try {
      await Bun.write(this.DATA_FILE, JSON.stringify(this.data, null, 2));
      console.log(`💾 Saved ${this.data.length} data points to ${this.DATA_FILE}`);
    } catch (err) {
      console.error('❌ Failed to save historical data:', err);
    }
  }

  async addDataPoint(data: HistoricalData): Promise<void> {
    this.data.push(data);

    // Keep only last MAX_DATA_POINTS points to manage file size
    if (this.data.length > TENSION_CONSTANTS.MAX_DATA_POINTS) {
      this.data = this.data.slice(-TENSION_CONSTANTS.MAX_DATA_POINTS);
    }

    await this.saveData();
  }

  analyzePeriod(startDate?: Date, endDate?: Date): AnalysisReport {
    let filteredData = this.data;

    if (startDate || endDate) {
      const start = startDate?.getTime() || 0;
      const end = endDate?.getTime() || Date.now();
      filteredData = this.data.filter(d => d.timestamp >= start && d.timestamp <= end);
    }

    if (filteredData.length === 0) {
      throw new Error('No data available for the specified period');
    }

    const summary = this.calculateSummary(filteredData);
    const trends = this.analyzeTrends(filteredData);
    const patterns = this.detectPatterns(filteredData);
    const recommendations = this.generateRecommendations(summary, trends, patterns);
    const riskAssessment = this.assessRisk(summary, trends, patterns);

    return {
      period: {
        start: new Date(filteredData[0].timestamp).toISOString(),
        end: new Date(filteredData[filteredData.length - 1].timestamp).toISOString(),
        duration: filteredData[filteredData.length - 1].timestamp - filteredData[0].timestamp
      },
      summary,
      trends,
      patterns,
      recommendations,
      riskAssessment
    };
  }

  private calculateSummary(data: HistoricalData[]) {
    const tensions = data.map(d => d.tensions);
    const riskScores = data.map(d => d.riskScore);
    const totalAnomalies = data.reduce((sum, d) => sum + d.anomalies.length, 0);

    const avgTensions = {
      volume: this.average(tensions.map(t => t.volume)),
      link: this.average(tensions.map(t => t.link)),
      profile: this.average(tensions.map(t => t.profile)),
      security: this.average(tensions.map(t => t.security)),
      compliance: this.average(tensions.map(t => t.compliance))
    };

    const peakTensions = {
      volume: Math.max(...tensions.map(t => t.volume)),
      link: Math.max(...tensions.map(t => t.link)),
      profile: Math.max(...tensions.map(t => t.profile)),
      security: Math.max(...tensions.map(t => t.security)),
      compliance: Math.max(...tensions.map(t => t.compliance))
    };

    const minTensions = {
      volume: Math.min(...tensions.map(t => t.volume)),
      link: Math.min(...tensions.map(t => t.link)),
      profile: Math.min(...tensions.map(t => t.profile)),
      security: Math.min(...tensions.map(t => t.security)),
      compliance: Math.min(...tensions.map(t => t.compliance))
    };

    return {
      totalDataPoints: data.length,
      avgTensions,
      peakTensions,
      minTensions,
      totalAnomalies,
      avgRiskScore: this.average(riskScores)
    };
  }

  private analyzeTrends(data: HistoricalData[]): {
    volume: TrendAnalysis;
    link: TrendAnalysis;
    profile: TrendAnalysis;
    security: TrendAnalysis;
    compliance: TrendAnalysis;
  } {
    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    const trends = {
      volume: {} as TrendAnalysis,
      link: {} as TrendAnalysis,
      profile: {} as TrendAnalysis,
      security: {} as TrendAnalysis,
      compliance: {} as TrendAnalysis
    };

    fields.forEach(field => {
      const values = data.map(d => d.tensions[field]);
      const timePoints = data.map(d => d.timestamp);

      // Linear regression to find trend
      const { slope, correlation } = this.linearRegression(timePoints, values);

      let direction: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(slope) < TENSION_CONSTANTS.STABILITY_THRESHOLD) {
        direction = 'stable';
      } else if (slope > 0) {
        direction = 'increasing';
      } else {
        direction = 'decreasing';
      }

      trends[field] = {
        direction,
        slope,
        strength: Math.abs(correlation),
        confidence: Math.min(1, Math.abs(correlation) * Math.sqrt(data.length / TENSION_CONSTANTS.TREND_CONFIDENCE_FACTOR))
      };
    });

    return trends;
  }

  private detectPatterns(data: HistoricalData[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];

    // Detect seasonal patterns (daily/weekly cycles)
    patterns.push(...this.detectSeasonalPatterns(data));

    // Detect correlation patterns between fields
    patterns.push(...this.detectCorrelationPatterns(data));

    // Detect anomaly clusters
    patterns.push(...this.detectAnomalyClusters(data));

    // Detect volatility patterns
    patterns.push(...this.detectVolatilityPatterns(data));

    return patterns.sort((a, b) => b.strength - a.strength);
  }

  private detectSeasonalPatterns(data: HistoricalData[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];

    // Check for daily patterns (24-hour cycles)
    const hourlyData = this.groupByHour(data);
    const hourlyVariance = this.calculateVariance(Object.values(hourlyData));

    if (hourlyVariance > TENSION_CONSTANTS.DAILY_VARIANCE_THRESHOLD) {
      patterns.push({
        type: 'seasonal',
        description: 'Daily seasonal pattern detected - tension varies by hour',
        strength: Math.min(1, hourlyVariance / TENSION_CONSTANTS.DAILY_VARIANCE_NORMALIZER),
        frequency: 'daily'
      });
    }

    // Check for weekly patterns
    const weeklyData = this.groupByDayOfWeek(data);
    const weeklyVariance = this.calculateVariance(Object.values(weeklyData));

    if (weeklyVariance > TENSION_CONSTANTS.WEEKLY_VARIANCE_THRESHOLD) {
      patterns.push({
        type: 'seasonal',
        description: 'Weekly seasonal pattern detected - tension varies by day',
        strength: Math.min(1, weeklyVariance / TENSION_CONSTANTS.WEEKLY_VARIANCE_NORMALIZER),
        frequency: 'weekly'
      });
    }

    return patterns;
  }

  private detectCorrelationPatterns(data: HistoricalData[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];
    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    // Calculate correlations between all field pairs
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];

        const values1 = data.map(d => d.tensions[field1]);
        const values2 = data.map(d => d.tensions[field2]);
        const correlation = this.calculateCorrelation(values1, values2);

        if (Math.abs(correlation) > TENSION_CONSTANTS.CORRELATION_THRESHOLD) {
          patterns.push({
            type: 'correlation',
            description: `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation between ${field1} and ${field2}`,
            strength: Math.abs(correlation),
            correlation
          });
        }
      }
    }

    return patterns;
  }

  private detectAnomalyClusters(data: HistoricalData[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];

    // Look for clusters of anomalies
    const anomalyCounts = data.map(d => d.anomalies.length);
    const avgAnomalies = this.average(anomalyCounts);

    // Find periods with unusually high anomaly counts
    const threshold = avgAnomalies * TENSION_CONSTANTS.ANOMALY_CLUSTER_THRESHOLD;
    const clusters = this.findConsecutiveValues(anomalyCounts, threshold, TENSION_CONSTANTS.MIN_CLUSTER_LENGTH);

    if (clusters.length > 0) {
      patterns.push({
        type: 'sporadic',
        description: `Detected ${clusters.length} anomaly clusters - periods of unusual activity`,
        strength: Math.min(1, clusters.length / 10)
      });
    }

    return patterns;
  }

  private detectVolatilityPatterns(data: HistoricalData[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];
    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    fields.forEach(field => {
      const values = data.map(d => d.tensions[field]);
      const volatility = this.calculateVolatility(values);

      if (volatility > TENSION_CONSTANTS.VOLATILITY_THRESHOLD) {
        patterns.push({
          type: 'cyclical',
          description: `High volatility detected in ${field} field - frequent large swings`,
          strength: Math.min(1, volatility / TENSION_CONSTANTS.VOLATILITY_NORMALIZER)
        });
      }
    });

    return patterns;
  }

  private generateRecommendations(
    summary: AnalysisReport['summary'],
    trends: {
      volume: TrendAnalysis;
      link: TrendAnalysis;
      profile: TrendAnalysis;
      security: TrendAnalysis;
      compliance: TrendAnalysis;
    },
    patterns: PatternAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on trends
    Object.entries(trends).forEach(([field, trend]) => {
      if (trend.direction === 'increasing' && trend.strength > TENSION_CONSTANTS.TREND_STRENGTH_THRESHOLD) {
        recommendations.push(`🔴 ${field.toUpperCase()} tension is consistently increasing - monitor closely`);
      } else if (trend.direction === 'decreasing' && trend.strength > TENSION_CONSTANTS.TREND_STRENGTH_THRESHOLD) {
        recommendations.push(`🟢 ${field.toUpperCase()} tension is decreasing - positive trend`);
      }
    });

    // Based on peak tensions
    Object.entries(summary.peakTensions).forEach(([field, value]) => {
      if (value > TENSION_CONSTANTS.HIGH_RISK_THRESHOLD) {
        recommendations.push(`⚠️ ${field.toUpperCase()} reached critical levels (${value.toFixed(1)}%)`);
      }
    });

    // Based on patterns
    patterns.forEach(pattern => {
      if (pattern.type === 'seasonal' && pattern.strength > TENSION_CONSTANTS.RECOMMENDATION_STRENGTH_THRESHOLD) {
        recommendations.push(`📅 Strong ${pattern.frequency} pattern detected - adjust resources accordingly`);
      }
      if (pattern.type === 'correlation' && Math.abs(pattern.correlation!) > TENSION_CONSTANTS.HIGH_CORRELATION_THRESHOLD) {
        recommendations.push(`🔗 Very strong correlation detected - consider unified monitoring`);
      }
    });

    // Based on anomalies
    if (summary.totalAnomalies > summary.totalDataPoints * TENSION_CONSTANTS.ANOMALY_RATE_THRESHOLD) {
      recommendations.push('🚨 High anomaly rate detected - investigate underlying issues');
    }

    // Based on risk score
    if (summary.avgRiskScore > TENSION_CONSTANTS.AVG_RISK_THRESHOLD) {
      recommendations.push('🎯 High average risk score - implement mitigation strategies');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System operating within normal parameters');
    }

    return recommendations;
  }

  private assessRisk(
    summary: AnalysisReport['summary'],
    trends: {
      volume: TrendAnalysis;
      link: TrendAnalysis;
      profile: TrendAnalysis;
      security: TrendAnalysis;
      compliance: TrendAnalysis;
    },
    patterns: PatternAnalysis[]
  ): RiskAssessment {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Risk from peak tensions
    Object.entries(summary.peakTensions).forEach(([field, value]) => {
      if (value > TENSION_CONSTANTS.CRITICAL_RISK_THRESHOLD) {
        riskScore += TENSION_CONSTANTS.CRITICAL_RISK_SCORE;
        riskFactors.push(`Critical ${field} levels`);
      } else if (value > TENSION_CONSTANTS.HIGH_RISK_THRESHOLD) {
        riskScore += TENSION_CONSTANTS.HIGH_RISK_SCORE;
        riskFactors.push(`High ${field} levels`);
      }
    });

    // Risk from trends
    Object.values(trends).forEach((trend) => {
      if (trend.direction === 'increasing' && trend.strength > 0.8) {
        riskScore += TENSION_CONSTANTS.STRONG_TREND_SCORE;
        riskFactors.push('Strong increasing trend');
      }
    });

    // Risk from anomalies
    if (summary.totalAnomalies > summary.totalDataPoints * TENSION_CONSTANTS.HIGH_ANOMALY_RATE_THRESHOLD) {
      riskScore += TENSION_CONSTANTS.VERY_HIGH_ANOMALY_SCORE;
      riskFactors.push('Very high anomaly rate');
    }

    // Risk from patterns
    patterns.forEach(pattern => {
      if (pattern.type === 'sporadic' && pattern.strength > 0.7) {
        riskScore += TENSION_CONSTANTS.SPORADIC_PATTERN_SCORE;
        riskFactors.push('Frequent anomaly clusters');
      }
    });

    // Determine overall risk level
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= TENSION_CONSTANTS.CRITICAL_RISK_LEVEL) {
      overallRisk = 'CRITICAL';
    } else if (riskScore >= TENSION_CONSTANTS.HIGH_RISK_LEVEL) {
      overallRisk = 'HIGH';
    } else if (riskScore >= TENSION_CONSTANTS.MEDIUM_RISK_LEVEL) {
      overallRisk = 'MEDIUM';
    } else {
      overallRisk = 'LOW';
    }

    const recommendedActions = this.generateRiskActions(overallRisk, riskFactors);

    return {
      overallRisk,
      riskFactors,
      probabilityOfCrisis: Math.min(1, riskScore / 100),
      recommendedActions
    };
  }

  private generateRiskActions(riskLevel: string, factors: string[]): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case 'CRITICAL':
        actions.push('🚨 Activate emergency response protocols');
        actions.push('📞 Notify all stakeholders immediately');
        actions.push('🔧 Implement immediate mitigation measures');
        actions.push('📊 Increase monitoring frequency to real-time');
        break;
      case 'HIGH':
        actions.push('⚠️ Prepare contingency plans');
        actions.push('📈 Increase monitoring frequency');
        actions.push('👥 Alert relevant team members');
        actions.push('🔍 Investigate root causes');
        break;
      case 'MEDIUM':
        actions.push('📊 Monitor trends closely');
        actions.push('📋 Review and update procedures');
        actions.push('🎯 Set up automated alerts');
        break;
      case 'LOW':
        actions.push('✅ Continue normal operations');
        actions.push('📈 Maintain regular monitoring');
        actions.push('📋 Schedule periodic reviews');
        break;
    }

    return actions;
  }

  // Utility methods
  private average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private linearRegression(x: number[], y: number[]): { slope: number; correlation: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return { slope, correlation };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const { correlation } = this.linearRegression(x, y);
    return correlation;
  }

  private calculateVariance(values: number[]): number {
    const avg = this.average(values);
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i - 1]));
    }

    return this.average(changes);
  }

  private groupByHour(data: HistoricalData[]): Record<number, number> {
    const groups: Record<number, number[]> = {};

    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(d.riskScore);
    });

    // Return averages
    const result: Record<number, number> = {};
    Object.entries(groups).forEach(([hour, values]) => {
      result[parseInt(hour)] = this.average(values);
    });

    return result;
  }

  private groupByDayOfWeek(data: HistoricalData[]): Record<number, number> {
    const groups: Record<number, number[]> = {};

    data.forEach(d => {
      const day = new Date(d.timestamp).getDay();
      if (!groups[day]) groups[day] = [];
      groups[day].push(d.riskScore);
    });

    // Return averages
    const result: Record<number, number> = {};
    Object.entries(groups).forEach(([day, values]) => {
      result[parseInt(day)] = this.average(values);
    });

    return result;
  }

  private findConsecutiveValues(values: number[], threshold: number, minLength: number): Array<{start: number, end: number}> {
    const clusters: Array<{start: number, end: number}> = [];
    let currentStart = -1;

    values.forEach((value, index) => {
      if (value >= threshold) {
        if (currentStart === -1) {
          currentStart = index;
        }
      } else {
        if (currentStart !== -1 && index - currentStart >= minLength) {
          clusters.push({ start: currentStart, end: index - 1 });
        }
        currentStart = -1;
      }
    });

    // Check if cluster extends to end
    if (currentStart !== -1 && values.length - currentStart >= minLength) {
      clusters.push({ start: currentStart, end: values.length - 1 });
    }

    return clusters;
  }

  // Export methods
  exportReport(report: AnalysisReport, format: 'json' | 'csv' | 'html' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertToCSV(report);
      case 'html':
        return this.convertToHTML(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCSV(report: AnalysisReport): string {
    const headers = [
      'Metric', 'Volume', 'Link', 'Profile', 'Security', 'Compliance'
    ];

    const rows = [
      ['Average', ...Object.values(report.summary.avgTensions).map(v => v.toFixed(2))],
      ['Peak', ...Object.values(report.summary.peakTensions).map(v => v.toFixed(2))],
      ['Minimum', ...Object.values(report.summary.minTensions).map(v => v.toFixed(2))]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToHTML(report: AnalysisReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Tension Field Historical Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #007bff; margin-top: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .risk-${report.riskAssessment.overallRisk.toLowerCase()} { background: #dc3545; color: white; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #007bff; color: white; }
        .pattern { background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .recommendation { background: #d4edda; padding: 10px; margin: 5px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌠 Tension Field Historical Analysis Report</h1>

        <h2>📊 Analysis Period</h2>
        <p><strong>Start:</strong> ${new Date(report.period.start).toLocaleString()}</p>
        <p><strong>End:</strong> ${new Date(report.period.end).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${(report.period.duration / (1000 * 60 * 60 * 24)).toFixed(1)} days</p>

        <h2>📈 Summary Statistics</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value">${report.summary.totalDataPoints}</div>
                <div>Data Points</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${report.summary.totalAnomalies}</div>
                <div>Total Anomalies</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${report.summary.avgRiskScore.toFixed(1)}</div>
                <div>Avg Risk Score</div>
            </div>
        </div>

        <table>
            <tr><th>Metric</th><th>Volume</th><th>Link</th><th>Profile</th><th>Security</th><th>Compliance</th></tr>
            <tr><td>Average</td>${Object.values(report.summary.avgTensions).map(v => `<td>${v.toFixed(1)}</td>`).join('')}</tr>
            <tr><td>Peak</td>${Object.values(report.summary.peakTensions).map(v => `<td>${v.toFixed(1)}</td>`).join('')}</tr>
            <tr><td>Minimum</td>${Object.values(report.summary.minTensions).map(v => `<td>${v.toFixed(1)}</td>`).join('')}</tr>
        </table>

        <h2>🎯 Risk Assessment</h2>
        <div class="risk-${report.riskAssessment.overallRisk.toLowerCase()}">
            OVERALL RISK: ${report.riskAssessment.overallRisk}
        </div>
        <p><strong>Probability of Crisis:</strong> ${(report.riskAssessment.probabilityOfCrisis * 100).toFixed(1)}%</p>

        <h2>🔍 Detected Patterns</h2>
        ${report.patterns.map(p => `<div class="pattern"><strong>${p.type}:</strong> ${p.description} (Strength: ${(p.strength * 100).toFixed(1)}%)</div>`).join('')}

        <h2>💡 Recommendations</h2>
        ${report.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}

        <h2>⚠️ Risk Factors</h2>
        <ul>${report.riskAssessment.riskFactors.map(f => `<li>${f}</li>`).join('')}</ul>

        <h2>🛠️ Recommended Actions</h2>
        <ul>${report.riskAssessment.recommendedActions.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>
</body>
</html>`;
  }
}

// CLI interface
if (import.meta.main) {
  const analyzer = await HistoricalAnalyzer.create();

  // Generate sample historical data
  console.log('📊 Generating sample historical data...');
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 100; i++) {
    const timestamp = now - (100 - i) * dayMs;
    const dataPoint: HistoricalData = {
      timestamp,
      tensions: {
        volume: 30 + Math.random() * 50 + Math.sin(i / 10) * 20,
        link: 25 + Math.random() * 45 + Math.cos(i / 8) * 15,
        profile: 40 + Math.random() * 35 + Math.sin(i / 12) * 10,
        security: 20 + Math.random() * 60 + (i > 50 ? 20 : 0), // Increase security issues after day 50
        compliance: 35 + Math.random() * 40 + Math.cos(i / 15) * 15
      },
      anomalies: Math.random() > 0.8 ? [{
        type: 'SPIKE',
        severity: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
        confidence: 0.8,
        description: 'Random anomaly detected'
      }] : [],
      riskScore: 20 + Math.random() * 60 + (i > 70 ? 30 : 0), // Higher risk towards end
      events: i % 10 === 0 ? ['Scheduled maintenance'] : undefined
    };

    analyzer.addDataPoint(dataPoint);
  }

  // Analyze the data
  console.log('🔍 Analyzing historical patterns...');
  const report = analyzer.analyzePeriod();

  // Export reports in different formats
  console.log('📄 Exporting reports...');

  const jsonReport = analyzer.exportReport(report, 'json');
  await Bun.write('./tension-analysis-report.json', jsonReport);

  const htmlReport = analyzer.exportReport(report, 'html');
  await Bun.write('./tension-analysis-report.html', htmlReport);

  const csvReport = analyzer.exportReport(report, 'csv');
  await Bun.write('./tension-analysis-report.csv', csvReport);

  console.log('✅ Analysis complete!');
  console.log('📊 Reports generated:');
  console.log('  - tension-analysis-report.json');
  console.log('  - tension-analysis-report.html');
  console.log('  - tension-analysis-report.csv');

  console.log('\n🎯 Risk Assessment:', report.riskAssessment.overallRisk);
  console.log('📈 Key Recommendations:');
  report.recommendations.slice(0, 3).forEach(rec => console.log(`  - ${rec}`));
}
// [TENSION-VOLUME-001]
// [TENSION-LINK-002]
// [TENSION-PROFILE-003]
// [GOV-SECURITY-001]
// [GOV-COMPLIANCE-002]
