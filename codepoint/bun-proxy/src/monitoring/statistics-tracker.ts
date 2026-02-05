// @bun/proxy/monitoring/statistics-tracker.ts - Statistics tracker implementation
export class StatisticsTracker {
  private statistics: Record<string, number> = {};

  trackValue(name: string, value: number): void {
    this.statistics[name] = value;
  }

  getValue(name: string): number {
    return this.statistics[name] || 0;
  }

  getAllStatistics(): Record<string, number> {
    return { ...this.statistics };
  }
}
