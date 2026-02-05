/**
 * @dynamic-spy/kit v6.2 - AI Pattern Loader Test
 * 
 * Test AI-generated pattern loading and priority handling
 */

import { test, expect } from "bun:test";
import { AIPatternLoader } from "../src/ai-pattern-loader";
import type { AIPattern } from "../src/ai-pattern-loader";

describe("AI Pattern Loader", () => {
	test("load AI patterns from JSON", async () => {
		const patterns = await AIPatternLoader.loadPatterns('./patterns/ai-generated.json');
		expect(patterns.length).toBeGreaterThan(0);
		expect(patterns[0].id).toBe('AI_PATTERN_1');
		expect(patterns[0].priority).toBe(999);
	});

	test("convert AI patterns to URLPatternInit", () => {
		const aiPatterns: AIPattern[] = [
			{
				id: 'AI_PATTERN_1',
				pathname: '/ai/:feed/:market',
				hostname: 'newbookie.com',
				priority: 999
			}
		];

		const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
		expect(converted.length).toBe(1);
		expect(converted[0].pathname).toBe('/ai/:feed/:market');
		expect(converted[0].hostname).toBe('newbookie.com');
		expect(converted[0].priority).toBe(999);
		expect(converted[0].protocol).toBe('https:');
	});

	test("sort patterns by priority", () => {
		const patterns = [
			{ pathname: '/low', priority: 50 },
			{ pathname: '/high', priority: 999 },
			{ pathname: '/medium', priority: 100 }
		];

		const sorted = AIPatternLoader.sortByPriority(patterns);
		expect(sorted[0].priority).toBe(999);
		expect(sorted[1].priority).toBe(100);
		expect(sorted[2].priority).toBe(50);
	});

	test("filter patterns by priority threshold", () => {
		const patterns = [
			{ pathname: '/low', priority: 50 },
			{ pathname: '/high', priority: 999 },
			{ pathname: '/medium', priority: 100 }
		];

		const highPriority = AIPatternLoader.filterByPriority(patterns, 100, 1000);
		expect(highPriority.length).toBe(2);
		expect(highPriority[0].priority).toBe(999);
		expect(highPriority[1].priority).toBe(100);
	});

	test("merge AI patterns with existing patterns", () => {
		const existing = [
			{ pathname: '/existing', priority: 50 }
		];

		const aiPatterns: AIPattern[] = [
			{
				id: 'AI_PATTERN_1',
				pathname: '/ai/:feed/:market',
				hostname: 'newbookie.com',
				priority: 999
			}
		];

		const merged = AIPatternLoader.mergePatterns(existing, aiPatterns);
		expect(merged.length).toBe(2);
		expect(merged[0].priority).toBe(999); // AI pattern first (highest priority)
		expect(merged[1].priority).toBe(50);
	});
});



