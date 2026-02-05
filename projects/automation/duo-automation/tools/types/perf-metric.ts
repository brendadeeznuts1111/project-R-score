// Bun.inspect.custom for Bun v1.3.6+
const inspectCustom = Symbol.for('Bun.inspect.custom');

export interface PerfMetric {
  category: string;
  type: string;
  topic: string;
  subCat: string;
  id: string;
  value: string;
  pattern?: string;
  locations: number;
  impact: 'high' | 'medium' | 'low';
  properties?: Record<string, any>;
}

// Custom inspector for Bun.inspect.table()
export const PerfMetricInspector = {
  [inspectCustom](): string {
    // Format for table display
    const props = this.properties 
      ? JSON.stringify(this.properties, null, 0)
          .replace(/\n/g, ' ')
          .slice(0, 50) + (JSON.stringify(this.properties).length > 50 ? '...' : '')
      : '{}';
    
    return [
      `[${this.category}]`.padEnd(12),
      `[${this.type}]`.padEnd(10),
      this.topic.padEnd(20).slice(0, 20),
      this.subCat.padEnd(15).slice(0, 15),
      this.id.padEnd(15).slice(0, 15),
      this.value.padEnd(10),
      this.pattern ? `🔍 ${this.pattern.slice(0, 10)}...` : '📭',
      `📍 ${this.locations}`.padEnd(8),
      this.impact === 'high' ? '🔴 HIGH' : 
      this.impact === 'medium' ? '🟡 MEDIUM' : '🟢 LOW',
      props
    ].join(' | ');
  }
};

// Helper function to enhance metrics with custom inspector
export function enhanceMetric(metric: PerfMetric): PerfMetric & typeof PerfMetricInspector {
  return Object.assign({ ...metric }, PerfMetricInspector);
}

// Class-based version with better type safety
export class PerfMetricClass implements PerfMetric {
  category: string;
  type: string;
  topic: string;
  subCat: string;
  id: string;
  value: string;
  pattern?: string;
  locations: number;
  impact: 'high' | 'medium' | 'low';
  properties?: Record<string, any>;

  constructor(data: PerfMetric) {
    this.category = data.category;
    this.type = data.type;
    this.topic = data.topic;
    this.subCat = data.subCat;
    this.id = data.id;
    this.value = data.value;
    this.pattern = data.pattern;
    this.locations = data.locations ?? 0;
    this.impact = data.impact;
    this.properties = data.properties;
  }

  [inspectCustom](): string {
    // Compact representation for table display
    const props = this.properties 
      ? `{${Object.entries(this.properties)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')
          .slice(0, 40)}${Object.keys(this.properties).length > 2 ? '...' : ''}}`
      : '{}';

    // Color coding based on impact
    const impactColor = {
      high: '\x1b[31m',    // Red
      medium: '\x1b[33m',  // Yellow
      low: '\x1b[32m'      // Green
    }[this.impact];

    return [
      this.category.padEnd(10),
      this.type.padEnd(8),
      this.topic.padEnd(25).slice(0, 25),
      this.subCat.padEnd(15).slice(0, 15),
      this.id.padEnd(12).slice(0, 12),
      this.value.padEnd(8),
      this.locations.toString().padStart(3),
      `${impactColor}${this.impact.toUpperCase()}\x1b[0m`,
      props
    ].join(' | ');
  }
}