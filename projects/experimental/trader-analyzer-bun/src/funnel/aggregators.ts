/**
 * @fileoverview Data Aggregators
 * @description Aggregate data across sources/time
 * @module funnel/aggregators
 */

import type { CanonicalData } from "../pipeline/types";
import type { AggregatedData, AggregationConfig } from "./types";

/**
 * Data aggregator for aggregating data
 */
export class DataAggregator {
	/**
	 * Aggregate data across sources/time
	 */
	async aggregate(
		data: CanonicalData[],
		aggregationConfig: AggregationConfig,
	): Promise<AggregatedData> {
		switch (aggregationConfig.type) {
			case "sum":
				return this.sum(data, aggregationConfig.property!);
			case "average":
				return this.average(data, aggregationConfig.property!);
			case "min":
				return this.min(data, aggregationConfig.property!);
			case "max":
				return this.max(data, aggregationConfig.property!);
			case "count":
				return this.count(data);
			case "group_by":
				return this.groupBy(data, aggregationConfig.groupBy!);
			case "time_series":
				return this.timeSeries(data, aggregationConfig.interval!);
			default:
				throw new Error(`Unknown aggregation type: ${aggregationConfig.type}`);
		}
	}

	/**
	 * Sum values of a property
	 */
	private sum(data: CanonicalData[], property: string): AggregatedData {
		let sum = 0;
		for (const item of data) {
			const value = item.properties[property];
			if (typeof value === "number") {
				sum += value;
			}
		}

		return {
			type: "sum",
			value: sum,
			data: data,
			timestamp: Date.now(),
			metadata: {
				property,
				count: data.length,
			},
		};
	}

	/**
	 * Average values of a property
	 */
	private average(data: CanonicalData[], property: string): AggregatedData {
		let sum = 0;
		let count = 0;

		for (const item of data) {
			const value = item.properties[property];
			if (typeof value === "number") {
				sum += value;
				count++;
			}
		}

		const avg = count > 0 ? sum / count : 0;

		return {
			type: "average",
			value: avg,
			data: data,
			timestamp: Date.now(),
			metadata: {
				property,
				count,
			},
		};
	}

	/**
	 * Minimum value of a property
	 */
	private min(data: CanonicalData[], property: string): AggregatedData {
		let min: number | null = null;

		for (const item of data) {
			const value = item.properties[property];
			if (typeof value === "number") {
				if (min === null || value < min) {
					min = value;
				}
			}
		}

		return {
			type: "min",
			value: min,
			data: data,
			timestamp: Date.now(),
			metadata: {
				property,
			},
		};
	}

	/**
	 * Maximum value of a property
	 */
	private max(data: CanonicalData[], property: string): AggregatedData {
		let max: number | null = null;

		for (const item of data) {
			const value = item.properties[property];
			if (typeof value === "number") {
				if (max === null || value > max) {
					max = value;
				}
			}
		}

		return {
			type: "max",
			value: max,
			data: data,
			timestamp: Date.now(),
			metadata: {
				property,
			},
		};
	}

	/**
	 * Count items
	 */
	private count(data: CanonicalData[]): AggregatedData {
		return {
			type: "count",
			value: data.length,
			data: data,
			timestamp: Date.now(),
		};
	}

	/**
	 * Group by property(ies)
	 */
	private groupBy(
		data: CanonicalData[],
		groupBy: string | string[],
	): AggregatedData {
		const groups: Record<string, CanonicalData[]> = {};
		const keys = Array.isArray(groupBy) ? groupBy : [groupBy];

		for (const item of data) {
			const groupKey = keys
				.map((key) => String(item.properties[key] || ""))
				.join(":");

			if (!groups[groupKey]) {
				groups[groupKey] = [];
			}
			groups[groupKey].push(item);
		}

		return {
			type: "group_by",
			value: groups,
			data: data,
			timestamp: Date.now(),
			metadata: {
				groupBy: keys,
				groupCount: Object.keys(groups).length,
			},
		};
	}

	/**
	 * Time series aggregation
	 */
	private timeSeries(data: CanonicalData[], interval: number): AggregatedData {
		// Sort by timestamp
		const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

		if (sorted.length === 0) {
			return {
				type: "time_series",
				value: [],
				data: [],
				timestamp: Date.now(),
			};
		}

		const buckets: Record<number, CanonicalData[]> = {};
		const startTime = sorted[0].timestamp;

		for (const item of sorted) {
			const bucketIndex = Math.floor((item.timestamp - startTime) / interval);
			const bucketTime = startTime + bucketIndex * interval;

			if (!buckets[bucketTime]) {
				buckets[bucketTime] = [];
			}
			buckets[bucketTime].push(item);
		}

		const timeSeries = Object.entries(buckets).map(([time, items]) => ({
			time: Number.parseInt(time, 10),
			count: items.length,
			items,
		}));

		return {
			type: "time_series",
			value: timeSeries,
			data: sorted,
			timestamp: Date.now(),
			metadata: {
				interval,
				bucketCount: timeSeries.length,
			},
		};
	}
}
