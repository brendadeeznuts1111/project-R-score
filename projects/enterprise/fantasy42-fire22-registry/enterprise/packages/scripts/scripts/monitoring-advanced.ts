#!/usr/bin/env bun
/**
 * 🔥 Fire22 Advanced Monitoring Features
 *
 * Demonstrates:
 * - Real-time anomaly detection
 * - Predictive analytics
 * - Custom metric collectors
 * - Distributed tracing
 * - SLA monitoring
 *
 * @version 3.0.9
 */

interface AnomalyDetector {
  name: string;
  detect: (metrics: number[]) => boolean;
  sensitivity: number;
}

interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  alertThreshold?: number;
}

interface SLATarget {
  name: string;
  target: number;
  current: number;
  period: string;
  status: 'meeting' | 'at_risk' | 'breached';
}

interface TraceSpan {
  id: string;
  operation: string;
  service: string;
  startTime: number;
  duration: number;
  status: 'success' | 'error';
  children: TraceSpan[];
}

class AdvancedMonitoring {
  private anomalyDetectors: AnomalyDetector[] = [];
  private predictions: Map<string, Prediction> = new Map();
  private slaTargets: SLATarget[] = [];
  private traces: TraceSpan[] = [];

  constructor() {
    this.initializeAnomalyDetection();
    this.initializeSLATargets();
    this.generateSampleTraces();
  }

  private initializeAnomalyDetection() {
    // Z-Score anomaly detection
    this.anomalyDetectors.push({
      name: 'Z-Score Detector',
      sensitivity: 2.5,
      detect: (metrics: number[]) => {
        if (metrics.length < 3) return false;

        const mean = metrics.reduce((a, b) => a + b, 0) / metrics.length;
        const variance =
          metrics.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / metrics.length;
        const stdDev = Math.sqrt(variance);
        const latest = metrics[metrics.length - 1];
        const zScore = Math.abs((latest - mean) / stdDev);

        return zScore > 2.5;
      },
    });

    // Moving Average anomaly detection
    this.anomalyDetectors.push({
      name: 'Moving Average Detector',
      sensitivity: 1.5,
      detect: (metrics: number[]) => {
        if (metrics.length < 10) return false;

        const windowSize = 5;
        const recent = metrics.slice(-windowSize);
        const previous = metrics.slice(-(windowSize * 2), -windowSize);

        const recentAvg = recent.reduce((a, b) => a + b, 0) / windowSize;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / windowSize;

        const change = Math.abs((recentAvg - previousAvg) / previousAvg);
        return change > 0.5; // 50% change threshold
      },
    });

    // Rate of Change detector
    this.anomalyDetectors.push({
      name: 'Rate of Change Detector',
      sensitivity: 2.0,
      detect: (metrics: number[]) => {
        if (metrics.length < 5) return false;

        const rates: number[] = [];
        for (let i = 1; i < metrics.length; i++) {
          rates.push(metrics[i] - metrics[i - 1]);
        }

        const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        const latestRate = rates[rates.length - 1];

        return Math.abs(latestRate) > Math.abs(avgRate * 3);
      },
    });
  }

  private initializeSLATargets() {
    this.slaTargets = [
      {
        name: 'API Availability',
        target: 99.9,
        current: 99.95,
        period: 'Monthly',
        status: 'meeting',
      },
      {
        name: 'Response Time P95',
        target: 200,
        current: 185,
        period: 'Daily',
        status: 'meeting',
      },
      {
        name: 'Error Rate',
        target: 0.1,
        current: 0.08,
        period: 'Hourly',
        status: 'meeting',
      },
      {
        name: 'DNS Resolution',
        target: 10,
        current: 12,
        period: 'Real-time',
        status: 'at_risk',
      },
      {
        name: 'Database Query Time',
        target: 50,
        current: 45,
        period: 'Real-time',
        status: 'meeting',
      },
    ];
  }

  private generateSampleTraces() {
    // Generate sample distributed trace
    const rootSpan: TraceSpan = {
      id: 'trace-001',
      operation: 'POST /api/manager/getLiveWagers',
      service: 'api-gateway',
      startTime: Date.now(),
      duration: 145,
      status: 'success',
      children: [
        {
          id: 'span-002',
          operation: 'Auth Validation',
          service: 'auth-service',
          startTime: Date.now() + 5,
          duration: 12,
          status: 'success',
          children: [],
        },
        {
          id: 'span-003',
          operation: 'Database Query',
          service: 'postgres',
          startTime: Date.now() + 20,
          duration: 85,
          status: 'success',
          children: [
            {
              id: 'span-004',
              operation: 'Connection Pool',
              service: 'postgres',
              startTime: Date.now() + 21,
              duration: 3,
              status: 'success',
              children: [],
            },
            {
              id: 'span-005',
              operation: 'Query Execution',
              service: 'postgres',
              startTime: Date.now() + 25,
              duration: 78,
              status: 'success',
              children: [],
            },
          ],
        },
        {
          id: 'span-006',
          operation: 'Response Serialization',
          service: 'api-gateway',
          startTime: Date.now() + 110,
          duration: 8,
          status: 'success',
          children: [],
        },
      ],
    };

    this.traces.push(rootSpan);
  }

  public generatePredictions(historicalData: number[]): void {
    // Simple linear regression for prediction
    const predictMetric = (data: number[], metricName: string) => {
      if (data.length < 5) return null;

      // Calculate trend
      const n = data.length;
      const indices = Array.from({ length: n }, (_, i) => i);

      const sumX = indices.reduce((a, b) => a + b, 0);
      const sumY = data.reduce((a, b) => a + b, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
      const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const nextValue = slope * n + intercept;
      const currentValue = data[data.length - 1];

      // Calculate confidence based on variance
      const predictions = indices.map(x => slope * x + intercept);
      const errors = data.map((y, i) => Math.abs(y - predictions[i]));
      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      const confidence = Math.max(0, Math.min(100, 100 - (avgError / currentValue) * 100));

      const trend = slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable';

      return {
        metric: metricName,
        currentValue,
        predictedValue: Math.round(nextValue),
        confidence: Math.round(confidence),
        trend,
        alertThreshold: metricName.includes('CPU')
          ? 80
          : metricName.includes('Memory')
            ? 85
            : undefined,
      };
    };

    // Generate predictions for different metrics
    const cpuPrediction = predictMetric(historicalData, 'CPU Usage');
    if (cpuPrediction) this.predictions.set('cpu', cpuPrediction);

    const memoryData = historicalData.map(v => v * 1.2); // Simulated memory data
    const memoryPrediction = predictMetric(memoryData, 'Memory Usage');
    if (memoryPrediction) this.predictions.set('memory', memoryPrediction);

    const responseTimeData = historicalData.map(v => v * 2.5); // Simulated response times
    const responsePrediction = predictMetric(responseTimeData, 'Response Time');
    if (responsePrediction) this.predictions.set('responseTime', responsePrediction);
  }

  public detectAnomalies(metrics: number[]): string[] {
    const anomalies: string[] = [];

    this.anomalyDetectors.forEach(detector => {
      if (detector.detect(metrics)) {
        anomalies.push(`⚠️  ${detector.name} triggered (sensitivity: ${detector.sensitivity})`);
      }
    });

    return anomalies;
  }

  public renderAdvancedMetrics(): void {
    console.log('\n🔬 Advanced Monitoring Features\n');
    console.log('═'.repeat(70));

    // Anomaly Detection
    console.log('\n📡 Anomaly Detection Systems');
    console.log('─'.repeat(60));
    this.anomalyDetectors.forEach(detector => {
      console.log(`  ✓ ${detector.name.padEnd(25)} Sensitivity: ${detector.sensitivity}`);
    });

    // Predictive Analytics
    console.log('\n🔮 Predictive Analytics');
    console.log('─'.repeat(60));
    this.predictions.forEach(prediction => {
      const trend =
        prediction.trend === 'increasing' ? '📈' : prediction.trend === 'decreasing' ? '📉' : '➡️';

      console.log(
        `  ${prediction.metric.padEnd(20)} Current: ${prediction.currentValue.toString().padEnd(5)} ` +
          `Predicted: ${prediction.predictedValue} ${trend} ` +
          `(${prediction.confidence}% confidence)`
      );

      if (prediction.alertThreshold && prediction.predictedValue > prediction.alertThreshold) {
        console.log(`    ⚠️  Alert: Predicted to exceed threshold of ${prediction.alertThreshold}`);
      }
    });

    // SLA Monitoring
    console.log('\n📊 SLA Compliance');
    console.log('─'.repeat(60));
    this.slaTargets.forEach(sla => {
      const icon = sla.status === 'meeting' ? '✅' : sla.status === 'at_risk' ? '⚠️' : '❌';
      const color =
        sla.status === 'meeting' ? '\x1b[32m' : sla.status === 'at_risk' ? '\x1b[33m' : '\x1b[31m';

      const compliance = ((sla.current / sla.target) * 100).toFixed(1);

      console.log(
        `  ${icon} ${sla.name.padEnd(25)} ` +
          `Target: ${sla.target} Current: ${sla.current} ` +
          `${color}(${compliance}% compliance)\x1b[0m`
      );
    });

    // Distributed Tracing
    console.log('\n🔍 Distributed Tracing');
    console.log('─'.repeat(60));
    this.traces.forEach(trace => {
      this.renderTraceTree(trace, 0);
    });

    // Custom Metrics
    console.log('\n📐 Custom Metrics Collection');
    console.log('─'.repeat(60));
    console.log('  • Business Metrics: Revenue, User Activity, Conversion Rates');
    console.log('  • Infrastructure: Container Health, Service Mesh Stats');
    console.log('  • Application: Feature Flags, A/B Test Results');
    console.log('  • Security: Failed Auth Attempts, API Key Usage');
    console.log('  • Compliance: Data Retention, Audit Trail Completeness');
  }

  private renderTraceTree(span: TraceSpan, depth: number): void {
    const indent = '  '.repeat(depth);
    const icon = span.status === 'success' ? '✓' : '✗';
    const color = span.status === 'success' ? '\x1b[32m' : '\x1b[31m';

    console.log(`  ${indent}${icon} ${span.operation} ${color}[${span.duration}ms]\x1b[0m`);

    span.children.forEach(child => {
      this.renderTraceTree(child, depth + 1);
    });
  }
}

// Main execution
const monitor = new AdvancedMonitoring();

// Generate sample data
const sampleMetrics = [45, 48, 46, 47, 52, 55, 58, 61, 59, 62, 85, 63, 60];
monitor.generatePredictions(sampleMetrics);

// Detect anomalies
const anomalies = monitor.detectAnomalies(sampleMetrics);

// Render everything
monitor.renderAdvancedMetrics();

if (anomalies.length > 0) {
  console.log('\n🚨 Detected Anomalies');
  console.log('─'.repeat(60));
  anomalies.forEach(anomaly => console.log(anomaly));
}

console.log('\n' + '═'.repeat(70));
console.log('\n✨ Advanced monitoring features demonstration complete!');
