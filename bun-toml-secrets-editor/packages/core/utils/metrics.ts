// utils/metrics.ts
// Metrics collection with Prometheus format export

export interface MetricValue {
	value: number;
	labels?: Record<string, string>;
	timestamp?: number;
}

export interface Counter {
	name: string;
	help: string;
	values: Map<string, number>; // key is label string, value is count
}

export interface Gauge {
	name: string;
	help: string;
	values: Map<string, number>; // key is label string, value is gauge value
}

export interface Histogram {
	name: string;
	help: string;
	buckets: number[];
	values: Map<string, number[]>; // key is label string, value is array of bucket counts
}

class MetricsRegistry {
	private counters: Map<string, Counter> = new Map();
	private gauges: Map<string, Gauge> = new Map();
	private histograms: Map<string, Histogram> = new Map();

	// Counter operations
	counter(name: string, help: string): Counter {
		if (!this.counters.has(name)) {
			this.counters.set(name, { name, help, values: new Map() });
		}
		return this.counters.get(name)!;
	}

	incrementCounter(
		name: string,
		labels?: Record<string, string>,
		value: number = 1,
	): void {
		const counter =
			this.counters.get(name) || this.counter(name, `Counter for ${name}`);
		const key = this.labelKey(labels);
		const current = counter.values.get(key) || 0;
		counter.values.set(key, current + value);
	}

	// Gauge operations
	gauge(name: string, help: string): Gauge {
		if (!this.gauges.has(name)) {
			this.gauges.set(name, { name, help, values: new Map() });
		}
		return this.gauges.get(name)!;
	}

	setGauge(name: string, value: number, labels?: Record<string, string>): void {
		const gauge =
			this.gauges.get(name) || this.gauge(name, `Gauge for ${name}`);
		const key = this.labelKey(labels);
		gauge.values.set(key, value);
	}

	incrementGauge(
		name: string,
		labels?: Record<string, string>,
		value: number = 1,
	): void {
		const gauge =
			this.gauges.get(name) || this.gauge(name, `Gauge for ${name}`);
		const key = this.labelKey(labels);
		const current = gauge.values.get(key) || 0;
		gauge.values.set(key, current + value);
	}

	decrementGauge(
		name: string,
		labels?: Record<string, string>,
		value: number = 1,
	): void {
		this.incrementGauge(name, labels, -value);
	}

	// Histogram operations
	histogram(
		name: string,
		help: string,
		buckets: number[] = [
			0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
		],
	): Histogram {
		if (!this.histograms.has(name)) {
			this.histograms.set(name, { name, help, buckets, values: new Map() });
		}
		return this.histograms.get(name)!;
	}

	observeHistogram(
		name: string,
		value: number,
		labels?: Record<string, string>,
	): void {
		const histogram =
			this.histograms.get(name) ||
			this.histogram(name, `Histogram for ${name}`);
		const key = this.labelKey(labels);
		const bucketCounts =
			histogram.values.get(key) ||
			new Array(histogram.buckets.length + 1).fill(0);

		// Find bucket
		let bucketIndex = histogram.buckets.length;
		for (let i = 0; i < histogram.buckets.length; i++) {
			if (value <= histogram.buckets[i]) {
				bucketIndex = i;
				break;
			}
		}

		bucketCounts[bucketIndex]++;
		histogram.values.set(key, bucketCounts);
	}

	// Timing utility
	timeOperation<T>(
		name: string,
		operation: () => Promise<T>,
		labels?: Record<string, string>,
	): Promise<T> {
		const start = performance.now();
		return operation().finally(() => {
			const duration = (performance.now() - start) / 1000; // Convert to seconds
			this.observeHistogram(name, duration, labels);
		});
	}

	// Export in Prometheus format
	exportPrometheus(): string {
		const lines: string[] = [];

		// Export counters
		for (const counter of this.counters.values()) {
			lines.push(`# HELP ${counter.name} ${counter.help}`);
			lines.push(`# TYPE ${counter.name} counter`);
			for (const [labelKey, value] of counter.values.entries()) {
				const labels = labelKey ? `{${labelKey}}` : "";
				lines.push(`${counter.name}${labels} ${value}`);
			}
		}

		// Export gauges
		for (const gauge of this.gauges.values()) {
			lines.push(`# HELP ${gauge.name} ${gauge.help}`);
			lines.push(`# TYPE ${gauge.name} gauge`);
			for (const [labelKey, value] of gauge.values.entries()) {
				const labels = labelKey ? `{${labelKey}}` : "";
				lines.push(`${gauge.name}${labels} ${value}`);
			}
		}

		// Export histograms
		for (const histogram of this.histograms.values()) {
			lines.push(`# HELP ${histogram.name} ${histogram.help}`);
			lines.push(`# TYPE ${histogram.name} histogram`);
			for (const [labelKey, bucketCounts] of histogram.values.entries()) {
				const labels = labelKey ? `{${labelKey}}` : "";
				let cumulative = 0;
				for (let i = 0; i < histogram.buckets.length; i++) {
					cumulative += bucketCounts[i];
					const bucketLabels = `${labels},le="${histogram.buckets[i]}"`;
					lines.push(`${histogram.name}_bucket${bucketLabels} ${cumulative}`);
				}
				cumulative += bucketCounts[histogram.buckets.length];
				lines.push(`${histogram.name}_bucket${labels},le="+Inf" ${cumulative}`);
				lines.push(`${histogram.name}_count${labels} ${cumulative}`);
				lines.push(`${histogram.name}_sum${labels} 0`); // Sum not tracked for simplicity
			}
		}

		return lines.join("\n");
	}

	// Reset all metrics
	reset(): void {
		this.counters.clear();
		this.gauges.clear();
		this.histograms.clear();
	}

	private labelKey(labels?: Record<string, string>): string {
		if (!labels || Object.keys(labels).length === 0) {
			return "";
		}
		return Object.entries(labels)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}="${v}"`)
			.join(",");
	}
}

// Singleton instance
export const metrics = new MetricsRegistry();

// Predefined metrics
export const OPERATION_DURATION = "secrets_editor_operation_duration_seconds";
export const OPERATION_ERRORS = "secrets_editor_operation_errors_total";
export const OPERATION_COUNT = "secrets_editor_operations_total";
export const CACHE_HITS = "secrets_editor_cache_hits_total";
export const CACHE_MISSES = "secrets_editor_cache_misses_total";
export const SECRETS_COUNT = "secrets_editor_secrets_count";
export const PATTERNS_COUNT = "secrets_editor_patterns_count";
