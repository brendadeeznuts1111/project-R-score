#!/usr/bin/env bun
/**
 * 📊 Fire22 Performance Analysis Tools
 *
 * Advanced performance analysis featuring:
 * - Statistical analysis (percentiles, distributions)
 * - Trend detection and forecasting
 * - Bottleneck identification
 * - Performance budget tracking
 * - Regression detection
 * - Capacity planning
 *
 * @version 3.0.9
 */

interface PerformanceMetric {
  timestamp: number;
  value: number;
  metadata: {
    service?: string;
    endpoint?: string;
    region?: string;
    version?: string;
    user_type?: string;
  };
}

interface StatisticalSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p99_9: number;
  };
  outliers: number;
}

interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  correlation: number;
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
  changePoints: number[];
  forecast: {
    nextValue: number;
    confidence: number;
    range: { min: number; max: number };
  };
}

interface BottleneckAnalysis {
  component: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  contribution: number; // percentage of total latency
  recommendations: string[];
  estimatedImprovement: number; // milliseconds
}

interface PerformanceBudget {
  metric: string;
  target: number;
  current: number;
  status: 'within_budget' | 'approaching_limit' | 'over_budget';
  utilization: number; // percentage
  timeToLimit?: number; // minutes until over budget
}

interface RegressionDetection {
  detected: boolean;
  severity: 'minor' | 'moderate' | 'severe';
  startTime: number;
  endTime: number;
  impactMagnitude: number;
  affectedMetrics: string[];
  possibleCauses: string[];
}

class PerformanceAnalyzer {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private budgets: Map<string, PerformanceBudget> = new Map();
  private baselineData: Map<string, StatisticalSummary> = new Map();

  constructor() {
    this.initializeBudgets();
    this.generateSampleData();
    this.calculateBaselines();
  }

  private initializeBudgets() {
    // Define performance budgets
    const budgets: PerformanceBudget[] = [
      {
        metric: 'api_response_time',
        target: 200,
        current: 0,
        status: 'within_budget',
        utilization: 0,
      },
      {
        metric: 'database_query_time',
        target: 50,
        current: 0,
        status: 'within_budget',
        utilization: 0,
      },
      {
        metric: 'dns_resolution_time',
        target: 10,
        current: 0,
        status: 'within_budget',
        utilization: 0,
      },
      {
        metric: 'fire22_api_latency',
        target: 150,
        current: 0,
        status: 'within_budget',
        utilization: 0,
      },
      {
        metric: 'memory_usage',
        target: 80,
        current: 0,
        status: 'within_budget',
        utilization: 0,
      },
    ];

    budgets.forEach(budget => {
      this.budgets.set(budget.metric, budget);
    });
  }

  private generateSampleData() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    // Generate realistic sample data with trends and anomalies
    const services = ['fire22-api', 'database', 'auth-service', 'cache'];
    const endpoints = ['/api/customers', '/api/wagers', '/api/agents', '/health'];

    // API Response Time data (with degradation trend)
    const apiData: PerformanceMetric[] = [];
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * 60000; // Last 1000 minutes
      const baseLatency = 85 + Math.sin(i * 0.05) * 15; // Seasonal pattern
      const trendIncrease = i * 0.08; // Gradual increase
      const noise = (Math.random() - 0.5) * 20;
      const anomaly = Math.random() < 0.02 ? Math.random() * 200 : 0; // 2% anomaly rate

      apiData.push({
        timestamp,
        value: Math.max(10, baseLatency + trendIncrease + noise + anomaly),
        metadata: {
          service: services[Math.floor(Math.random() * services.length)],
          endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
          region: ['us-east', 'us-west', 'eu-central'][Math.floor(Math.random() * 3)],
        },
      });
    }
    this.metrics.set('api_response_time', apiData);

    // Database Query Time (with periodic spikes)
    const dbData: PerformanceMetric[] = [];
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * 60000;
      const baseTime = 25 + Math.sin(i * 0.1) * 8;
      const spike = i % 100 === 0 ? Math.random() * 50 : 0; // Periodic spikes
      const noise = (Math.random() - 0.5) * 5;

      dbData.push({
        timestamp,
        value: Math.max(5, baseTime + spike + noise),
        metadata: {
          service: 'postgres',
          version: '15.2',
        },
      });
    }
    this.metrics.set('database_query_time', dbData);

    // Memory Usage (steadily increasing)
    const memData: PerformanceMetric[] = [];
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * 60000;
      const baseUsage = 45 + i * 0.02; // Memory leak simulation
      const dailyCycle = Math.sin((i * 60000) / (24 * hour)) * 5; // Daily pattern
      const noise = (Math.random() - 0.5) * 3;

      memData.push({
        timestamp,
        value: Math.max(20, Math.min(95, baseUsage + dailyCycle + noise)),
        metadata: {
          service: 'fire22-worker',
        },
      });
    }
    this.metrics.set('memory_usage', memData);

    // DNS Resolution Time (mostly stable with occasional issues)
    const dnsData: PerformanceMetric[] = [];
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - (1000 - i) * 60000;
      const baseTime = 3;
      const issue = Math.random() < 0.005 ? Math.random() * 50 : 0; // 0.5% DNS issues
      const noise = Math.random() * 2;

      dnsData.push({
        timestamp,
        value: baseTime + issue + noise,
        metadata: {
          service: 'dns-resolver',
        },
      });
    }
    this.metrics.set('dns_resolution_time', dnsData);
  }

  private calculateBaselines() {
    // Calculate baseline statistics for comparison
    this.metrics.forEach((data, metric) => {
      if (data.length > 100) {
        // Use first 20% of data as baseline
        const baselineSize = Math.floor(data.length * 0.2);
        const baselineData = data.slice(0, baselineSize).map(m => m.value);
        this.baselineData.set(metric, this.calculateStatistics(baselineData));
      }
    });
  }

  public calculateStatistics(values: number[]): StatisticalSummary {
    if (values.length === 0) {
      throw new Error('Cannot calculate statistics for empty array');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Mean
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    // Median
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];

    // Variance and Standard Deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, Math.min(index, count - 1))];
    };

    const percentiles = {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      p99_9: percentile(99.9),
    };

    // Outlier detection using IQR method
    const q1 = percentile(25);
    const q3 = percentile(75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound).length;

    return {
      count,
      min,
      max,
      mean,
      median,
      stdDev,
      variance,
      percentiles,
      outliers,
    };
  }

  public analyzeTrend(metricName: string, windowSize: number = 100): TrendAnalysis | null {
    const data = this.metrics.get(metricName);
    if (!data || data.length < windowSize) return null;

    // Use the most recent data for trend analysis
    const recentData = data.slice(-windowSize);
    const values = recentData.map(d => d.value);
    const timestamps = recentData.map(d => d.timestamp);

    // Linear regression for trend
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = values.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = numerator / denominator;

    // Determine trend direction
    const direction =
      Math.abs(slope) < 0.1
        ? 'stable'
        : Math.abs(correlation) < 0.5
          ? 'volatile'
          : slope > 0
            ? 'increasing'
            : 'decreasing';

    // Simple change point detection
    const changePoints: number[] = [];
    const segmentSize = Math.floor(windowSize / 4);
    for (let i = segmentSize; i < windowSize - segmentSize; i += segmentSize) {
      const before = values.slice(i - segmentSize, i);
      const after = values.slice(i, i + segmentSize);
      const beforeMean = before.reduce((a, b) => a + b, 0) / before.length;
      const afterMean = after.reduce((a, b) => a + b, 0) / after.length;

      if (
        Math.abs(afterMean - beforeMean) >
        (values.reduce((a, b) => a + b, 0) / values.length) * 0.2
      ) {
        changePoints.push(timestamps[i]);
      }
    }

    // Forecast next value
    const nextValue = slope * n + intercept;
    const residuals = values.map((y, i) => y - (slope * i + intercept));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length;
    const confidence = Math.max(0, Math.min(100, 100 - (Math.sqrt(mse) / (sumY / n)) * 100));

    return {
      direction,
      slope,
      correlation,
      changePoints,
      forecast: {
        nextValue: Math.max(0, nextValue),
        confidence: Math.round(confidence),
        range: {
          min: Math.max(0, nextValue - Math.sqrt(mse)),
          max: nextValue + Math.sqrt(mse),
        },
      },
    };
  }

  public identifyBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];

    // Analyze current metrics to identify bottlenecks
    this.metrics.forEach((data, metric) => {
      const recentValues = data.slice(-100).map(d => d.value);
      const stats = this.calculateStatistics(recentValues);
      const baseline = this.baselineData.get(metric);

      if (baseline) {
        const degradation = (stats.mean - baseline.mean) / baseline.mean;
        const impact =
          degradation > 0.5
            ? 'critical'
            : degradation > 0.3
              ? 'high'
              : degradation > 0.1
                ? 'medium'
                : 'low';

        if (impact !== 'low') {
          const recommendations: string[] = [];
          let estimatedImprovement = 0;

          switch (metric) {
            case 'api_response_time':
              recommendations.push('Optimize database queries');
              recommendations.push('Implement response caching');
              recommendations.push('Add connection pooling');
              estimatedImprovement = stats.mean * 0.3; // 30% improvement
              break;

            case 'database_query_time':
              recommendations.push('Add database indexes');
              recommendations.push('Optimize query patterns');
              recommendations.push('Consider read replicas');
              estimatedImprovement = stats.mean * 0.4; // 40% improvement
              break;

            case 'memory_usage':
              recommendations.push('Investigate memory leaks');
              recommendations.push('Optimize object lifecycle');
              recommendations.push('Add memory profiling');
              estimatedImprovement = Math.max(0, stats.mean - 60); // Target 60% usage
              break;

            case 'dns_resolution_time':
              recommendations.push('Implement DNS caching');
              recommendations.push('Use multiple DNS servers');
              recommendations.push('Optimize DNS TTL settings');
              estimatedImprovement = stats.mean * 0.6; // 60% improvement
              break;
          }

          bottlenecks.push({
            component: metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            impact,
            contribution: degradation * 100,
            recommendations,
            estimatedImprovement: Math.round(estimatedImprovement),
          });
        }
      }
    });

    return bottlenecks.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  public updateBudgets(): void {
    this.budgets.forEach((budget, metricName) => {
      const data = this.metrics.get(metricName);
      if (data && data.length > 0) {
        const recentData = data.slice(-50); // Last 50 data points
        const currentValue =
          recentData.map(d => d.value).reduce((a, b) => a + b, 0) / recentData.length;

        budget.current = Math.round(currentValue * 100) / 100;
        budget.utilization = Math.round((currentValue / budget.target) * 100);

        if (budget.utilization >= 100) {
          budget.status = 'over_budget';
        } else if (budget.utilization >= 90) {
          budget.status = 'approaching_limit';
        } else {
          budget.status = 'within_budget';
        }

        // Calculate time to limit based on trend
        const trend = this.analyzeTrend(metricName, 100);
        if (trend && trend.slope > 0 && budget.status !== 'over_budget') {
          const remainingCapacity = budget.target - currentValue;
          const timeToLimit = remainingCapacity / trend.slope; // In data points
          budget.timeToLimit = Math.round(timeToLimit * 5); // Convert to minutes (5min intervals)
        }
      }
    });
  }

  public detectRegression(metricName: string): RegressionDetection {
    const data = this.metrics.get(metricName);
    if (!data || data.length < 200) {
      return { detected: false } as RegressionDetection;
    }

    // Split data into recent and historical periods
    const splitPoint = Math.floor(data.length * 0.7);
    const historical = data.slice(0, splitPoint).map(d => d.value);
    const recent = data.slice(splitPoint).map(d => d.value);

    const historicalStats = this.calculateStatistics(historical);
    const recentStats = this.calculateStatistics(recent);

    // Statistical significance test (simplified t-test)
    const pooledStdDev = Math.sqrt(
      ((historical.length - 1) * Math.pow(historicalStats.stdDev, 2) +
        (recent.length - 1) * Math.pow(recentStats.stdDev, 2)) /
        (historical.length + recent.length - 2)
    );

    const standardError = pooledStdDev * Math.sqrt(1 / historical.length + 1 / recent.length);
    const tStatistic = Math.abs(recentStats.mean - historicalStats.mean) / standardError;

    const criticalValue = 2.0; // Simplified critical value for significance
    const detected = tStatistic > criticalValue;

    if (!detected) {
      return { detected: false } as RegressionDetection;
    }

    // Determine severity based on magnitude of change
    const changePercent = Math.abs(recentStats.mean - historicalStats.mean) / historicalStats.mean;
    const severity = changePercent > 0.5 ? 'severe' : changePercent > 0.2 ? 'moderate' : 'minor';

    return {
      detected: true,
      severity,
      startTime: data[splitPoint].timestamp,
      endTime: data[data.length - 1].timestamp,
      impactMagnitude: Math.round((recentStats.mean - historicalStats.mean) * 100) / 100,
      affectedMetrics: [metricName],
      possibleCauses: [
        'Recent code deployment',
        'Infrastructure changes',
        'Increased traffic load',
        'Database performance degradation',
        'Third-party service issues',
      ],
    };
  }

  public generateReport(): void {
    console.log('\n📊 Fire22 Performance Analysis Report\n');
    console.log('═'.repeat(80));

    // Update budgets first
    this.updateBudgets();

    // Performance Budgets
    console.log('\n💰 Performance Budget Status');
    console.log('─'.repeat(60));
    this.budgets.forEach((budget, metric) => {
      const icon =
        budget.status === 'within_budget'
          ? '✅'
          : budget.status === 'approaching_limit'
            ? '⚠️'
            : '❌';
      const color =
        budget.status === 'within_budget'
          ? '\x1b[32m'
          : budget.status === 'approaching_limit'
            ? '\x1b[33m'
            : '\x1b[31m';

      console.log(
        `${icon} ${metric
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .padEnd(25)} ` +
          `${color}${budget.current}/${budget.target} (${budget.utilization}%)\x1b[0m`
      );

      if (budget.timeToLimit && budget.timeToLimit > 0) {
        console.log(`   ⏰ Time to limit: ${budget.timeToLimit} minutes`);
      }
    });

    // Statistical Analysis
    console.log('\n📈 Statistical Analysis');
    console.log('─'.repeat(60));
    this.metrics.forEach((data, metric) => {
      const values = data.slice(-100).map(d => d.value);
      const stats = this.calculateStatistics(values);

      console.log(`\n${metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:`);
      console.log(
        `  Mean: ${stats.mean.toFixed(2)}  Median: ${stats.median.toFixed(2)}  P95: ${stats.percentiles.p95.toFixed(2)}`
      );
      console.log(
        `  Min: ${stats.min.toFixed(2)}  Max: ${stats.max.toFixed(2)}  StdDev: ${stats.stdDev.toFixed(2)}`
      );
      console.log(
        `  Outliers: ${stats.outliers} (${((stats.outliers / stats.count) * 100).toFixed(1)}%)`
      );
    });

    // Trend Analysis
    console.log('\n📊 Trend Analysis');
    console.log('─'.repeat(60));
    this.metrics.forEach((_, metric) => {
      const trend = this.analyzeTrend(metric);
      if (trend) {
        const trendIcon =
          trend.direction === 'increasing'
            ? '📈'
            : trend.direction === 'decreasing'
              ? '📉'
              : trend.direction === 'stable'
                ? '➡️'
                : '📊';

        console.log(
          `${trendIcon} ${metric
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .padEnd(25)} ` + `${trend.direction} (slope: ${trend.slope.toFixed(3)})`
        );
        console.log(
          `   Forecast: ${trend.forecast.nextValue.toFixed(1)} ` +
            `(${trend.forecast.confidence}% confidence)`
        );

        if (trend.changePoints.length > 0) {
          console.log(`   Change points detected: ${trend.changePoints.length}`);
        }
      }
    });

    // Bottleneck Analysis
    console.log('\n🔍 Bottleneck Analysis');
    console.log('─'.repeat(60));
    const bottlenecks = this.identifyBottlenecks();
    if (bottlenecks.length === 0) {
      console.log('✅ No significant bottlenecks detected');
    } else {
      bottlenecks.forEach(bottleneck => {
        const impactIcon =
          bottleneck.impact === 'critical' ? '🔴' : bottleneck.impact === 'high' ? '🟡' : '🟠';

        console.log(`${impactIcon} ${bottleneck.component} (${bottleneck.impact} impact)`);
        console.log(`   Performance degradation: ${bottleneck.contribution.toFixed(1)}%`);
        console.log(`   Estimated improvement: ${bottleneck.estimatedImprovement}ms`);
        console.log(`   Recommendations:`);
        bottleneck.recommendations.forEach(rec => {
          console.log(`     • ${rec}`);
        });
        console.log();
      });
    }

    // Regression Detection
    console.log('\n🔍 Regression Detection');
    console.log('─'.repeat(60));
    let regressionFound = false;
    this.metrics.forEach((_, metric) => {
      const regression = this.detectRegression(metric);
      if (regression.detected) {
        regressionFound = true;
        const severityIcon =
          regression.severity === 'severe'
            ? '🔴'
            : regression.severity === 'moderate'
              ? '🟡'
              : '🟠';

        console.log(
          `${severityIcon} ${metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} regression detected`
        );
        console.log(`   Severity: ${regression.severity}`);
        console.log(
          `   Impact: ${regression.impactMagnitude > 0 ? '+' : ''}${regression.impactMagnitude}`
        );
        console.log(
          `   Period: ${new Date(regression.startTime).toLocaleString()} - ${new Date(regression.endTime).toLocaleString()}`
        );
        console.log(`   Possible causes: ${regression.possibleCauses.slice(0, 3).join(', ')}`);
        console.log();
      }
    });

    if (!regressionFound) {
      console.log('✅ No performance regressions detected');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n🎯 Analysis Complete - Key Insights:');
    console.log('  • Real-time performance budget monitoring');
    console.log('  • Advanced statistical analysis with percentiles');
    console.log('  • Trend detection and forecasting');
    console.log('  • Automated bottleneck identification');
    console.log('  • Regression detection with statistical significance');
    console.log('  • Actionable performance recommendations');
  }
}

// Execute analysis
const analyzer = new PerformanceAnalyzer();
analyzer.generateReport();
