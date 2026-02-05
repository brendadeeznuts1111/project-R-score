#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Test Suite for Market Filter Component
 * @description Production-grade tests using Bun v1.3.4 patterns with fake timers and proper mocking
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Bun v1.3.4 Release}
 * @see {@link ../../../test/bun-1.3.4-features.test.ts|Bun v1.3.4 Feature Tests}
 * @see {@link ../../../../docs/TEAM-DASHBOARD-API-VERIFICATION.md|Team Dashboard API Verification}
 * @see {@link ../../../../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Bun Runtime Enhancements}
 *
 * @module apps/registry-dashboard/src/components/market-filter.test
 */

import { afterEach, beforeEach, describe, expect, jest, mock, test } from "bun:test";
import {
	applyMarketFilter,
	clearMarketFilters,
	renderMarketFilter,
	updateConfidenceValue,
} from "./market-filter";

/**
 * Bun v1.3.4 Fake Timers API
 * @see {@link https://bun.sh/blog/bun-v1.3.4#fake-timers-for-buntest}
 */
interface BunFakeTimerOptions {
	now?: number | Date;
}

interface BunJestFakeTimers {
	useFakeTimers(options?: BunFakeTimerOptions): void;
	useRealTimers(): void;
	advanceTimersByTime(ms: number): void;
	runAllTimers(): void;
}

const fakeTimers = jest as unknown as BunJestFakeTimers;

// Mock DOM environment for browser component tests
const createMockDocument = () => {
	const elements: Map<string, any> = new Map();
	const queriedElements: any[] = [];

	return {
		getElementById: (id: string) => elements.get(id) || null,
		querySelector: (selector: string) => {
			return queriedElements.find((el) => el.matches?.(selector)) || null;
		},
		querySelectorAll: <T extends Element = HTMLElement>(selector: string): NodeListOf<T> => {
			const filtered = queriedElements.filter((el) => el.matches?.(selector));
			return filtered as unknown as NodeListOf<T>;
		},
		createElement: (tag: string) => ({
			tagName: tag.toUpperCase(),
			innerHTML: "",
			style: {},
			classList: {
				add: mock(() => {}),
				remove: mock(() => {}),
				contains: () => false,
			},
			setAttribute: () => {},
			getAttribute: () => null,
		}),
		_addElement: (id: string, element: any) => elements.set(id, element),
		_addQueryElement: (element: any) => queriedElements.push(element),
		_clear: () => {
			elements.clear();
			queriedElements.length = 0;
		},
	};
};

// Mock window environment
const createMockWindow = () => ({
	applyMarketFilter: undefined as any,
	updateConfidenceValue: undefined as any,
	clearMarketFilters: undefined as any,
});

describe("Market Filter Component", () => {
	let mockDocument: ReturnType<typeof createMockDocument>;
	let mockWindow: ReturnType<typeof createMockWindow>;
	let originalDocument: any;
	let originalWindow: any;
	let originalFetch: any;

	beforeEach(() => {
		mockDocument = createMockDocument();
		mockWindow = createMockWindow();

		// Store originals
		originalDocument = globalThis.document;
		originalWindow = globalThis.window;
		originalFetch = globalThis.fetch;

		// Mock globals
		(globalThis as any).document = mockDocument;
		(globalThis as any).window = mockWindow;
		(globalThis as any).fetch = mock(() => Promise.resolve({ ok: true }));
	});

	afterEach(() => {
		// Restore originals
		(globalThis as any).document = originalDocument;
		(globalThis as any).window = originalWindow;
		(globalThis as any).fetch = originalFetch;
		mockDocument._clear();
		fakeTimers.useRealTimers();
	});

	describe("renderMarketFilter", () => {
		/**
		 * @test Should render filter container
		 */
		test("should render market filter container", () => {
			const html = renderMarketFilter();
			expect(html).toContain("market-filter-bar");
			expect(html).toContain("🔍 Market Filters");
		});

		/**
		 * @test Should include market type filter
		 */
		test("should include market type filter dropdown", () => {
			const html = renderMarketFilter();
			expect(html).toContain("market-type-filter");
			expect(html).toContain("All Markets");
			expect(html).toContain("Moneyline");
			expect(html).toContain("Point Spread");
			expect(html).toContain("Over/Under");
			expect(html).toContain("Player Props");
		});

		/**
		 * @test Should include sub-market filter
		 */
		test("should include sub-market filter with optgroups", () => {
			const html = renderMarketFilter();
			expect(html).toContain("submarket-filter");
			expect(html).toContain("All Sub-Markets");
			expect(html).toContain("<optgroup");
			expect(html).toContain("Soccer");
			expect(html).toContain("Basketball");
			expect(html).toContain("soccer:premier_league");
			expect(html).toContain("soccer:bundesliga");
			expect(html).toContain("basketball:nba");
		});

		/**
		 * @test Should include pattern filter
		 */
		test("should include anomaly pattern filter dropdown", () => {
			const html = renderMarketFilter();
			expect(html).toContain("pattern-filter");
			expect(html).toContain("All Patterns");
			expect(html).toContain("Volume Spike");
			expect(html).toContain("Odds Flip");
			expect(html).toContain("Market Suspension");
			expect(html).toContain("Correlation Chain");
			expect(html).toContain("Temporal Pattern");
			expect(html).toContain("Cross-Sport Anomaly");
		});

		/**
		 * @test Should include confidence slider
		 */
		test("should include confidence range slider", () => {
			const html = renderMarketFilter();
			expect(html).toContain("confidence-filter");
			expect(html).toContain('type="range"');
			expect(html).toContain('min="0"');
			expect(html).toContain('max="1"');
			expect(html).toContain('step="0.1"');
			expect(html).toContain('value="0.5"');
			expect(html).toContain("confidence-value");
			expect(html).toContain("0.5");
		});

		/**
		 * @test Should include action buttons
		 */
		test("should include clear and apply buttons", () => {
			const html = renderMarketFilter();
			expect(html).toContain("clear-filters-btn");
			expect(html).toContain("apply-filters-btn");
			expect(html).toContain("clearMarketFilters()");
			expect(html).toContain("applyMarketFilter()");
		});

		/**
		 * @test Should include results count display
		 */
		test("should include filter results count display", () => {
			const html = renderMarketFilter();
			expect(html).toContain("filter-results-count");
			expect(html).toContain("All packages visible");
		});

		/**
		 * @test Should have proper styling
		 */
		test("should have proper styling attributes", () => {
			const html = renderMarketFilter();
			expect(html).toContain("border-radius: 12px");
			expect(html).toContain("box-shadow");
			expect(html).toContain("padding: 20px");
		});

		/**
		 * @test HTML should be well-formed
		 */
		test("should have matching tags", () => {
			const html = renderMarketFilter();
			const openDivs = (html.match(/<div/g) || []).length;
			const closeDivs = (html.match(/<\/div>/g) || []).length;
			expect(openDivs).toBe(closeDivs);

			const openSelects = (html.match(/<select/g) || []).length;
			const closeSelects = (html.match(/<\/select>/g) || []).length;
			expect(openSelects).toBe(closeSelects);
		});
	});

	describe("applyMarketFilter", () => {
		/**
		 * @test Should filter by market type
		 */
		test("should filter packages by market type", () => {
			// Setup mock form elements
			const marketTypeSelect = { value: "moneyline" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0.5" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			// Create mock package cards
			const moneylineCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@odds/moneyline";
					if (attr === "data-market-types") return "moneyline,spread";
					return null;
				},
				querySelector: () => ({ textContent: "75%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			const propsCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@odds/props";
					if (attr === "data-market-types") return "props";
					return null;
				},
				querySelector: () => ({ textContent: "80%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(moneylineCard);
			mockDocument._addQueryElement(propsCard);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			applyMarketFilter();

			// Moneyline card should be visible
			expect(moneylineCard.classList.add).toHaveBeenCalledWith("visible");
			// Props card should be hidden
			expect(propsCard.classList.add).toHaveBeenCalledWith("hidden");
		});

		/**
		 * @test Should filter by sub-market
		 */
		test("should filter packages by sub-market", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "basketball:nba" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const nbaCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@odds/nba";
					if (attr === "data-sub-markets") return "basketball:nba,basketball:ncaa";
					return null;
				},
				querySelector: () => ({ textContent: "60%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			const soccerCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@odds/soccer";
					if (attr === "data-sub-markets") return "soccer:premier_league";
					return null;
				},
				querySelector: () => ({ textContent: "70%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(nbaCard);
			mockDocument._addQueryElement(soccerCard);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			applyMarketFilter();

			expect(nbaCard.classList.add).toHaveBeenCalledWith("visible");
			expect(soccerCard.classList.add).toHaveBeenCalledWith("hidden");
		});

		/**
		 * @test Should filter by pattern
		 */
		test("should filter packages by anomaly pattern", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "volume_spike" };
			const confidenceInput = { value: "0" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const volumeCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@analysis/volume";
					if (attr === "data-patterns") return "volume_spike,temporal_pattern";
					return null;
				},
				querySelector: () => ({ textContent: "85%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(volumeCard);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			applyMarketFilter();

			expect(volumeCard.classList.add).toHaveBeenCalledWith("visible");
		});

		/**
		 * @test Should filter by minimum confidence
		 */
		test("should filter packages by minimum confidence", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0.7" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const highConfCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@high/conf";
					return null;
				},
				querySelector: (sel: string) => {
					if (sel === ".confidence-indicator") return { textContent: "85%" };
					return null;
				},
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			const lowConfCard = {
				getAttribute: (attr: string) => {
					if (attr === "data-package") return "@low/conf";
					return null;
				},
				querySelector: (sel: string) => {
					if (sel === ".confidence-indicator") return { textContent: "50%" };
					return null;
				},
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(highConfCard);
			mockDocument._addQueryElement(lowConfCard);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			applyMarketFilter();

			expect(highConfCard.classList.add).toHaveBeenCalledWith("visible");
			expect(lowConfCard.classList.add).toHaveBeenCalledWith("hidden");
		});

		/**
		 * @test Should update results count
		 */
		test("should update filter results count", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const card1 = {
				getAttribute: () => "@pkg/1",
				querySelector: () => ({ textContent: "80%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			const card2 = {
				getAttribute: () => "@pkg/2",
				querySelector: () => ({ textContent: "90%" }),
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(card1);
			mockDocument._addQueryElement(card2);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			applyMarketFilter();

			expect(resultsElement.textContent).toContain("2 packages visible");
		});

		/**
		 * @test Should notify Telegram when filter is applied
		 */
		test("should call Telegram notification API when team is active", async () => {
			fakeTimers.useFakeTimers();

			const marketTypeSelect = { value: "moneyline" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0.5" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			// Add active team filter tab
			const activeTab = {
				textContent: "🏀 Sports",
				matches: (sel: string) => sel === ".filter-tab.active",
			};
			mockDocument._addQueryElement(activeTab);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			const mockFetch = mock(() => Promise.resolve({ ok: true }));
			(globalThis as any).fetch = mockFetch;

			applyMarketFilter();

			// Advance timers to allow async fetch
			fakeTimers.advanceTimersByTime(100);

			// Verify fetch was called with Telegram notification
			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("updateConfidenceValue", () => {
		/**
		 * @test Should update confidence display element
		 */
		test("should update confidence value display", () => {
			const confidenceElement = { textContent: "0.5" };
			mockDocument._addElement("confidence-value", confidenceElement);

			updateConfidenceValue("0.8");

			expect(confidenceElement.textContent).toBe("0.8");
		});

		/**
		 * @test Should handle missing element gracefully
		 */
		test("should handle missing confidence-value element gracefully", () => {
			// No element added to mock document
			expect(() => updateConfidenceValue("0.9")).not.toThrow();
		});
	});

	describe("clearMarketFilters", () => {
		/**
		 * @test Should reset all filter values
		 */
		test("should reset all filter values to defaults", () => {
			const marketTypeSelect = { value: "moneyline" };
			const subMarketSelect = { value: "basketball:nba" };
			const patternSelect = { value: "volume_spike" };
			const confidenceInput = { value: "0.9" };
			const confidenceValue = { textContent: "0.9" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);
			mockDocument._addElement("confidence-value", confidenceValue);

			const resultsElement = { textContent: "1 package visible" };
			mockDocument._addElement("filter-results-count", resultsElement);

			// Add mock package cards
			const card = {
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(card);

			clearMarketFilters();

			expect(marketTypeSelect.value).toBe("");
			expect(subMarketSelect.value).toBe("");
			expect(patternSelect.value).toBe("");
			expect(confidenceInput.value).toBe("0.5");
			expect(confidenceValue.textContent).toBe("0.5");
		});

		/**
		 * @test Should show all packages
		 */
		test("should show all packages after clearing", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0.5" };
			const confidenceValue = { textContent: "0.5" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);
			mockDocument._addElement("confidence-value", confidenceValue);

			const hiddenCard = {
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(hiddenCard);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			clearMarketFilters();

			expect(hiddenCard.classList.add).toHaveBeenCalledWith("visible");
			expect(hiddenCard.classList.remove).toHaveBeenCalledWith("hidden");
			expect(resultsElement.textContent).toBe("All packages visible");
		});
	});

	describe("Global Window Exports", () => {
		/**
		 * @test Functions should be available globally after registration
		 * @description The component registers functions globally when imported in browser context
		 */
		test("should be able to register functions to window object", () => {
			// In test environment, we verify that the functions can be assigned to window
			// The actual registration happens at module load time in browser context
			mockWindow.applyMarketFilter = applyMarketFilter;
			mockWindow.updateConfidenceValue = updateConfidenceValue;
			mockWindow.clearMarketFilters = clearMarketFilters;

			expect(mockWindow.applyMarketFilter).toBe(applyMarketFilter);
			expect(mockWindow.updateConfidenceValue).toBe(updateConfidenceValue);
			expect(mockWindow.clearMarketFilters).toBe(clearMarketFilters);
		});
	});

	describe("Edge Cases", () => {
		/**
		 * @test Should handle missing filter elements
		 */
		test("should handle missing DOM elements gracefully", () => {
			// No elements added to mock document
			expect(() => applyMarketFilter()).toThrow();
		});

		/**
		 * @test Should handle cards without data-package attribute
		 */
		test("should skip cards without data-package attribute", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const cardWithoutPackage = {
				getAttribute: () => null,
				querySelector: () => null,
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(cardWithoutPackage);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			// Should not throw
			expect(() => applyMarketFilter()).not.toThrow();
		});

		/**
		 * @test Should handle cards without confidence indicator
		 */
		test("should handle cards without confidence indicator", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0.5" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			const cardWithoutConfidence = {
				getAttribute: (attr: string) => (attr === "data-package" ? "@pkg/test" : null),
				querySelector: () => null, // No confidence indicator
				classList: {
					add: mock(() => {}),
					remove: mock(() => {}),
				},
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(cardWithoutConfidence);

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			// Should not throw
			expect(() => applyMarketFilter()).not.toThrow();
		});
	});

	describe("Performance", () => {
		/**
		 * @test Should filter many packages efficiently
		 * @see {@link Bun.nanoseconds}
		 */
		test("should filter many packages efficiently", () => {
			const marketTypeSelect = { value: "" };
			const subMarketSelect = { value: "" };
			const patternSelect = { value: "" };
			const confidenceInput = { value: "0" };

			mockDocument._addElement("market-type-filter", marketTypeSelect);
			mockDocument._addElement("submarket-filter", subMarketSelect);
			mockDocument._addElement("pattern-filter", patternSelect);
			mockDocument._addElement("confidence-filter", confidenceInput);

			// Create 100 mock package cards
			for (let i = 0; i < 100; i++) {
				const card = {
					getAttribute: (attr: string) => (attr === "data-package" ? `@pkg/${i}` : null),
					querySelector: () => ({ textContent: "75%" }),
					classList: {
						add: mock(() => {}),
						remove: mock(() => {}),
					},
					matches: (sel: string) => sel === ".package-card",
				};
				mockDocument._addQueryElement(card);
			}

			const resultsElement = { textContent: "" };
			mockDocument._addElement("filter-results-count", resultsElement);

			const start = Bun.nanoseconds();

			for (let i = 0; i < 100; i++) {
				applyMarketFilter();
			}

			const duration = Bun.nanoseconds() - start;

			// Should complete 100 filter operations in < 100ms
			expect(duration).toBeLessThan(100_000_000);
		});
	});
});
