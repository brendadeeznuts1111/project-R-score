/**
 * ROI Calculator Test Suite
 * 
 * Tests ROI calculation for reverse engineered models
 */

import { test, expect } from "bun:test";
import { ROICalculator } from "../src/roi-calculator";
import { ExtractedPattern } from "../src/pattern-extractor";

test('calculate ROI for replicas', () => {
	const calculator = new ROICalculator();

	const patterns: ExtractedPattern[] = [
		{
			name: 'asia-sharp',
			plays: 42,
			edge: 1.87,
			signals: ['SBOBET volume 3x+', 'Pinnacle confirms'],
			entry: '1.90-1.95',
			stake: '> $1M',
			hitRate: 0.89,
			replicationScore: 0.89
		},
		{
			name: 'buyback-edge',
			plays: 28,
			edge: 1.47,
			signals: ['Fonbet buyback', 'Europe lag'],
			entry: '1.95-2.00',
			stake: '> $500K',
			hitRate: 0.82,
			replicationScore: 0.82
		},
		{
			name: 'closing-sharp',
			plays: 19,
			edge: 3.01,
			signals: ['Pinnacle closing', '30min window'],
			entry: '1.85-1.90',
			stake: '> $800K',
			hitRate: 0.94,
			replicationScore: 0.94
		}
	];

	const roi = calculator.calculateROI(10000000, 2.1, patterns);

	expect(roi.originalModel.stake).toBe(10000000);
	expect(roi.originalModel.edge).toBe(2.1);
	expect(roi.replicas.length).toBe(3);
	expect(roi.totalMonthlyProfit).toBeGreaterThan(0);
	expect(roi.roi).toBeGreaterThan(0);
});

test('format ROI calculation', () => {
	const calculator = new ROICalculator();

	const patterns: ExtractedPattern[] = [
		{
			name: 'asia-sharp',
			plays: 42,
			edge: 1.87,
			signals: [],
			entry: '1.90-1.95',
			stake: '> $1M',
			hitRate: 0.89,
			replicationScore: 0.89
		}
	];

	const roi = calculator.calculateROI(10000000, 2.1, patterns);
	const formatted = calculator.formatROI(roi);

	expect(formatted).toContain('ORIGINAL MODEL');
	expect(formatted).toContain('YOUR REPLICAS');
	expect(formatted).toContain('TOTAL');
	expect(formatted).toContain('ROI');
});



