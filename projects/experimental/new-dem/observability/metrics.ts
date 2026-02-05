# T3-Lattice Observability Suite
# Comprehensive monitoring, metrics, and alerting for edge detection system

import { CONFIG } from "../src/constants.ts";

// Metrics Collector with Enhanced Observability
export class ObservabilityMetrics {
  private metrics: Map<string, MetricData> = new Map();
  private alerts: Alert[] = [];
  private readonly maxMetricsHistory = 10000;

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = `${name}_${JSON.stringify(tags)}`;
    const timestamp = Date.now();

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name,
        values: [],
        tags,
        firstSeen: timestamp,
        lastSeen: timestamp
      });
    }

    const metric = this.metrics.get(key)!;
    metric.values.push({ value, timestamp });
    metric.lastSeen = timestamp;

    // Keep only recent values
    if (metric.values.length > this.maxMetricsHistory) {
      metric.values = metric.values.slice(-this.maxMetricsHistory);
    }

    // Check for anomalies
    this.checkAnomalies(metric);
  }

  private checkAnomalies(metric: MetricData): void {
    const values = metric.values.slice(-100); // Check last 100 values
    if (values.length < 10) return;

    const recentValues = values.slice(-10).map(v => v.value);
    const historicalValues = values.slice(0, -10).map(v => v.value);

    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const historicalAvg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;

    const threshold = Math.abs(historicalAvg) * 0.5; // 50% deviation threshold

    if (Math.abs(recentAvg - historicalAvg) > threshold) {
      this.createAlert({
        type: 'anomaly',
        severity: 'warning',
        metric: metric.name,
        message: `Anomaly detected in ${metric.name}: ${recentAvg.toFixed(2)} vs historical ${historicalAvg.toFixed(2)}`,
        value: recentAvg,
        expectedValue: historicalAvg,
        tags: metric.tags,
        timestamp: Date.now()
      });
    }
  }

  createAlert(alert: Omit<Alert, 'id' | 'status'>): void {
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      status: 'active',
      ...alert
    };

    this.alerts.unshift(newAlert);

    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    console.log(`🚨 ALERT: ${alert.message}`);
  }

  getMetrics(name?: string, tags?: Record<string, string>): MetricData[] {
    const metrics = Array.from(this.metrics.values());

    return metrics.filter(metric => {
      if (name && metric.name !== name) return false;
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          if (metric.tags[key] !== value) return false;
        }
      }
      return true;
    });
  }

  getAlerts(status?: AlertStatus, severity?: AlertSeverity): Alert[] {
    return this.alerts.filter(alert => {
      if (status && alert.status !== status) return false;
      if (severity && alert.severity !== severity) return false;
      return true;
    });
  }

  getSystemHealth(): SystemHealth {
    const now = Date.now();
    const last5Min = now - 5 * 60 * 1000;

    // Calculate response time metrics
    const responseMetrics = this.getMetrics('http_request_duration');
    const recentResponses = responseMetrics.flatMap(m =>
      m.values.filter(v => v.timestamp > last5Min)
    );

    const avgResponseTime = recentResponses.length > 0
      ? recentResponses.reduce((sum, v) => sum + v.value, 0) / recentResponses.length
      : 0;

    // Calculate error rate
    const errorMetrics = this.getMetrics('http_request_errors');
    const recentErrors = errorMetrics.flatMap(m =>
      m.values.filter(v => v.timestamp > last5Min)
    ).reduce((sum, v) => sum + v.value, 0);

    const totalRequests = recentResponses.length + recentErrors;
    const errorRate = totalRequests > 0 ? (recentErrors / totalRequests) * 100 : 0;

    // Calculate system status
    let status: HealthStatus = 'healthy';
    if (avgResponseTime > 2000 || errorRate > 5) status = 'degraded';
    if (avgResponseTime > 5000 || errorRate > 15) status = 'unhealthy';

    // Check for active critical alerts
    const criticalAlerts = this.getAlerts('active', 'critical');
    if (criticalAlerts.length > 0) status = 'critical';

    return {
      status,
      timestamp: now,
      metrics: {
        avgResponseTime,
        errorRate,
        totalRequests,
        activeAlerts: this.alerts.filter(a => a.status === 'active').length
      },
      lastUpdated: Math.max(
        ...responseMetrics.map(m => m.lastSeen),
        ...errorMetrics.map(m => m.lastSeen),
        0
      )
    };
  }
}

// Alert Manager for Automated Incident Response
export class AlertManager {
  private escalationRules: EscalationRule[] = [];
  private notificationChannels: NotificationChannel[] = [];

  constructor() {
    this.setupDefaultRules();
    this.setupNotificationChannels();
  }

  private setupDefaultRules(): void {
    this.escalationRules = [
      {
        condition: (alert) => alert.severity === 'critical',
        action: 'page_on_call',
        channels: ['pagerduty', 'slack'],
        timeout: 5 * 60 * 1000 // 5 minutes
      },
      {
        condition: (alert) => alert.severity === 'error' && alert.metric?.includes('latency'),
        action: 'notify_team',
        channels: ['slack', 'email'],
        timeout: 15 * 60 * 1000 // 15 minutes
      },
      {
        condition: (alert) => alert.type === 'anomaly',
        action: 'log_and_monitor',
        channels: ['logs'],
        timeout: 60 * 60 * 1000 // 1 hour
      }
    ];
  }

  private setupNotificationChannels(): void {
    this.notificationChannels = [
      {
        name: 'slack',
        type: 'webhook',
        config: { url: process.env.SLACK_WEBHOOK_URL || '' }
      },
      {
        name: 'pagerduty',
        type: 'api',
        config: { key: process.env.PAGERDUTY_KEY || '' }
      },
      {
        name: 'email',
        type: 'smtp',
        config: {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587')
        }
      },
      {
        name: 'logs',
        type: 'file',
        config: { path: './logs/alerts.log' }
      }
    ];
  }

  async processAlert(alert: Alert): Promise<void> {
    // Find matching escalation rule
    const rule = this.escalationRules.find(rule => rule.condition(alert));
    if (!rule) return;

    // Execute escalation action
    await this.executeEscalation(alert, rule);

    // Schedule follow-up if timeout specified
    if (rule.timeout) {
      setTimeout(() => {
        this.followUpAlert(alert, rule);
      }, rule.timeout);
    }
  }

  private async executeEscalation(alert: Alert, rule: EscalationRule): Promise<void> {
    for (const channelName of rule.channels) {
      const channel = this.notificationChannels.find(c => c.name === channelName);
      if (channel) {
        await this.sendNotification(alert, channel);
      }
    }
  }

  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'webhook':
          await fetch(channel.config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
              attachments: [{
                color: this.getSeverityColor(alert.severity),
                fields: [
                  { title: 'Metric', value: alert.metric || 'N/A', short: true },
                  { title: 'Value', value: alert.value?.toString() || 'N/A', short: true },
                  { title: 'Expected', value: alert.expectedValue?.toString() || 'N/A', short: true }
                ]
              }]
            })
          });
          break;

        case 'file':
          const logEntry = `${new Date().toISOString()} [${alert.severity.toUpperCase()}] ${alert.message}\n`;
          await Bun.write(channel.config.path, logEntry);
          break;

        // Add other channel types as needed
      }
    } catch (error) {
      console.error(`Failed to send notification to ${channel.name}:`, error);
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'error': return 'warning';
      case 'warning': return '#ff9900';
      case 'info': return 'good';
      default: return '#808080';
    }
  }

  private followUpAlert(alert: Alert, rule: EscalationRule): void {
    // Check if alert is still active and escalate if needed
    console.log(`📋 Follow-up check for alert ${alert.id}`);
    // Implementation for follow-up logic
  }
}

// Distributed Tracing for Request Flow Analysis
export class DistributedTracer {
  private traces: Map<string, Trace> = new Map();
  private spans: Map<string, Span[]> = new Map();

  startTrace(traceId: string, name: string, tags: Record<string, string> = {}): string {
    const spanId = crypto.randomUUID();

    const trace: Trace = {
      id: traceId,
      name,
      startTime: Date.now(),
      tags,
      rootSpanId: spanId
    };

    this.traces.set(traceId, trace);
    this.spans.set(traceId, []);

    this.startSpan(traceId, spanId, name, tags);

    return spanId;
  }

  startSpan(traceId: string, parentSpanId: string | null, name: string, tags: Record<string, string> = {}): string {
    const spanId = crypto.randomUUID();
    const span: Span = {
      id: spanId,
      traceId,
      parentSpanId,
      name,
      startTime: Date.now(),
      tags,
      events: []
    };

    if (!this.spans.has(traceId)) {
      this.spans.set(traceId, []);
    }

    this.spans.get(traceId)!.push(span);

    return spanId;
  }

  addSpanEvent(spanId: string, event: SpanEvent): void {
    // Find the span and add the event
    for (const spans of this.spans.values()) {
      const span = spans.find(s => s.id === spanId);
      if (span) {
        span.events.push({
          ...event,
          timestamp: event.timestamp || Date.now()
        });
        break;
      }
    }
  }

  endSpan(spanId: string): void {
    const now = Date.now();

    // Find and update the span
    for (const spans of this.spans.values()) {
      const span = spans.find(s => s.id === spanId);
      if (span && !span.endTime) {
        span.endTime = now;
        span.duration = now - span.startTime;
        break;
      }
    }
  }

  endTrace(traceId: string): Trace | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    // End any unfinished spans
    const spans = this.spans.get(traceId) || [];
    spans.forEach(span => {
      if (!span.endTime) {
        this.endSpan(span.id);
      }
    });

    return trace;
  }

  getTrace(traceId: string): TraceWithSpans | null {
    const trace = this.traces.get(traceId);
    const spans = this.spans.get(traceId) || [];

    if (!trace) return null;

    return {
      ...trace,
      spans
    };
  }

  getTraces(limit = 100): TraceWithSpans[] {
    const traceIds = Array.from(this.traces.keys()).slice(-limit);

    return traceIds.map(id => this.getTrace(id)).filter(Boolean) as TraceWithSpans[];
  }

  // Performance analysis
  getSlowTraces(thresholdMs = 1000): TraceWithSpans[] {
    return this.getTraces().filter(trace =>
      trace.duration && trace.duration > thresholdMs
    );
  }

  getErrorTraces(): TraceWithSpans[] {
    return this.getTraces().filter(trace =>
      trace.spans.some(span =>
        span.events.some(event => event.type === 'error')
      )
    );
  }
}

// Global instances
export const metrics = new ObservabilityMetrics();
export const alertManager = new AlertManager();
export const tracer = new DistributedTracer();

// Type definitions
interface MetricData {
  name: string;
  values: { value: number; timestamp: number }[];
  tags: Record<string, string>;
  firstSeen: number;
  lastSeen: number;
}

interface Alert {
  id: string;
  type: 'anomaly' | 'threshold' | 'error' | 'performance';
  severity: AlertSeverity;
  metric?: string;
  message: string;
  value?: number;
  expectedValue?: number;
  tags: Record<string, string>;
  timestamp: number;
  status: AlertStatus;
}

type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface EscalationRule {
  condition: (alert: Alert) => boolean;
  action: string;
  channels: string[];
  timeout?: number;
}

interface NotificationChannel {
  name: string;
  type: 'webhook' | 'email' | 'sms' | 'api' | 'file';
  config: Record<string, any>;
}

interface SystemHealth {
  status: HealthStatus;
  timestamp: number;
  metrics: {
    avgResponseTime: number;
    errorRate: number;
    totalRequests: number;
    activeAlerts: number;
  };
  lastUpdated: number;
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';

interface Trace {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  rootSpanId: string;
}

interface Span {
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  events: SpanEvent[];
}

interface SpanEvent {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp?: number;
  attributes?: Record<string, any>;
}

interface TraceWithSpans extends Trace {
  spans: Span[];
}