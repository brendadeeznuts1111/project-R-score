// Tier-1380 Metrics Feed Module
// Provides RSS-formatted metrics output for telemetry

export interface MetricsData {
	timestamp: string;
	columns: Record<string, number>;
	status: 'healthy' | 'degraded' | 'critical';
}

export class MetricsFeed {
	private readonly data: MetricsData;

	constructor() {
		this.data = {
			timestamp: new Date().toISOString(),
			columns: {},
			status: 'healthy',
		};
	}

	update(columns: Record<string, number>): void {
		this.data.columns = {...this.data.columns, ...columns};
		this.data.timestamp = new Date().toISOString();
	}

	toRSS(): string {
		const items = Object.entries(this.data.columns)
			.map(([key, value]) => `    <item><title>${key}</title><value>${value}</value></item>`)
			.join('\n');

		return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tier-1380 Metrics</title>
    <link>/metrics</link>
    <description>Real-time telemetry feed</description>
    <lastBuildDate>${this.data.timestamp}</lastBuildDate>
    <status>${this.data.status}</status>
${items}
  </channel>
</rss>`;
	}

	get stats(): MetricsData {
		return {...this.data};
	}
}

export const metricsFeed = new MetricsFeed();
