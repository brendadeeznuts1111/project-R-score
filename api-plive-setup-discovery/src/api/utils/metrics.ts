// Simple metrics implementation - can be replaced with Prometheus/statsd
class Metrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(name: string, labels: Record<string, string | number> = {}) {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  histogram(name: string, value: number, labels: Record<string, string | number> = {}) {
    const key = this.createKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
  }

  private createKey(name: string, labels: Record<string, string | number>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(this.histograms)
    };
  }

  reset() {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const metrics = new Metrics();
