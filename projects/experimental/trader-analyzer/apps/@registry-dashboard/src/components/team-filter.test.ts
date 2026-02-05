#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Test Suite for Team Filter Component
 * @description Production-grade tests using Bun v1.3.4 patterns with fake timers, proper isolation, and edge cases
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Bun v1.3.4 Release}
 * @see {@link ../../../test/bun-1.3.4-features.test.ts|Bun v1.3.4 Feature Tests}
 * @see {@link ../../../../docs/TEAM-DASHBOARD-API-VERIFICATION.md|Team Dashboard API Verification}
 * @see {@link ../../../../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Bun Runtime Enhancements}
 * @see {@link ../../../../dashboard/team-organization.html|Team Organization Dashboard}
 *
 * @module apps/registry-dashboard/src/components/team-filter.test
 */

import { afterEach, beforeEach, describe, expect, jest, mock, spyOn, test } from "bun:test";
import { createRFC, filterTeam, initTeamFilter, runTeamBenchmark, TEAM_DATA } from "./team-filter";

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
}

const fakeTimers = jest as unknown as BunJestFakeTimers;

// Mock DOM environment for browser component tests
const createMockDocument = () => {
	const elements: Map<string, any> = new Map();
	const queriedElements: any[] = [];

	return {
		getElementById: (id: string) => elements.get(id) || null,
		querySelector: (selector: string) => queriedElements.find((el) => el.matches?.(selector)) || null,
		querySelectorAll: (selector: string) => {
			return queriedElements.filter((el) => el.matches?.(selector));
		},
		createElement: (tag: string) => ({
			tagName: tag.toUpperCase(),
			innerHTML: "",
			style: {},
			classList: {
				add: () => {},
				remove: () => {},
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
	TELEGRAM_SUPERGROUP_ID: -1001234567890,
	open: mock(() => {}),
	filterTeam: undefined as any,
	runTeamBenchmark: undefined as any,
	createRFC: undefined as any,
});

describe("Team Filter Component", () => {
	let mockDocument: ReturnType<typeof createMockDocument>;
	let mockWindow: ReturnType<typeof createMockWindow>;
	let originalDocument: any;
	let originalWindow: any;

	beforeEach(() => {
		mockDocument = createMockDocument();
		mockWindow = createMockWindow();

		// Store originals
		originalDocument = globalThis.document;
		originalWindow = globalThis.window;

		// Mock globals
		(globalThis as any).document = mockDocument;
		(globalThis as any).window = mockWindow;
	});

	afterEach(() => {
		// Restore originals
		(globalThis as any).document = originalDocument;
		(globalThis as any).window = originalWindow;
		mockDocument._clear();
	});

	describe("TEAM_DATA Constants", () => {
		/**
		 * @test Verify team data structure
		 */
		test("should have correct team data structure", () => {
			expect(TEAM_DATA).toBeDefined();
			expect(typeof TEAM_DATA).toBe("object");
		});

		/**
		 * @test Verify sports-correlation team
		 */
		test("should have sports-correlation team with correct properties", () => {
			const team = TEAM_DATA["sports-correlation"];
			expect(team).toBeDefined();
			expect(team.name).toBe("Sports Correlation");
			expect(team.emoji).toBe("🏀");
			expect(team.packages).toContain("@graph/layer4");
			expect(team.packages).toContain("@graph/layer3");
			expect(team.teamLead).toMatch(/@/);
			expect(team.telegramTopicId).toBe(1);
			expect(team.color).toMatch(/^#[0-9a-fA-F]{6}$/);
		});

		/**
		 * @test Verify market-analytics team
		 */
		test("should have market-analytics team with correct properties", () => {
			const team = TEAM_DATA["market-analytics"];
			expect(team).toBeDefined();
			expect(team.name).toBe("Market Analytics");
			expect(team.emoji).toBe("📊");
			expect(team.packages).toContain("@graph/layer2");
			expect(team.packages).toContain("@graph/layer1");
		});

		/**
		 * @test Verify platform-tools team
		 */
		test("should have platform-tools team with correct properties", () => {
			const team = TEAM_DATA["platform-tools"];
			expect(team).toBeDefined();
			expect(team.name).toBe("Platform & Tools");
			expect(team.emoji).toBe("🔧");
			expect(team.packages).toContain("@graph/algorithms");
			expect(team.packages).toContain("@bench/*");
		});

		/**
		 * @test Verify all teams have required fields
		 */
		test("should have all required fields for each team", () => {
			const requiredFields = ["name", "emoji", "packages", "teamLead", "telegramTopicId", "color"];

			Object.entries(TEAM_DATA).forEach(([teamKey, teamData]) => {
				requiredFields.forEach((field) => {
					expect(teamData).toHaveProperty(field);
				});
			});
		});

		/**
		 * @test Verify color format
		 */
		test("should have valid hex color codes", () => {
			const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

			Object.values(TEAM_DATA).forEach((team) => {
				expect(team.color).toMatch(hexColorRegex);
			});
		});

		/**
		 * @test Verify telegram topic IDs are unique
		 */
		test("should have unique telegram topic IDs", () => {
			const topicIds = Object.values(TEAM_DATA).map((t) => t.telegramTopicId);
			const uniqueIds = new Set(topicIds);
			expect(uniqueIds.size).toBe(topicIds.length);
		});
	});

	describe("filterTeam Function", () => {
		/**
		 * @test Filter to 'all' teams
		 */
		test("should show all packages when filter is 'all'", () => {
			// Create mock package cards
			const card1 = {
				style: { display: "none" },
				getAttribute: () => "@graph/layer4",
				matches: (sel: string) => sel === ".package-card",
			};
			const card2 = {
				style: { display: "none" },
				getAttribute: () => "@graph/layer2",
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(card1);
			mockDocument._addQueryElement(card2);

			// Create mock filter tabs
			const allTab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: (sel: string) => sel === '[data-team="all"]',
			};
			mockDocument._addQueryElement(allTab);

			// Create mock team info panel
			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			filterTeam("all");

			expect(card1.style.display).toBe("block");
			expect(card2.style.display).toBe("block");
			expect(panel.innerHTML).toBe("");
		});

		/**
		 * @test Handle unknown team gracefully
		 */
		test("should handle unknown team gracefully", () => {
			const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

			// @ts-expect-error Testing invalid input
			filterTeam("unknown-team");

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		/**
		 * @test Filter to specific team
		 */
		test("should filter packages for sports-correlation team", () => {
			// Create mock package cards
			const sportsCard = {
				style: { display: "block" },
				getAttribute: (attr: string) => (attr === "data-package" ? "@graph/layer4" : null),
				matches: (sel: string) => sel === ".package-card",
			};
			const marketCard = {
				style: { display: "block" },
				getAttribute: (attr: string) => (attr === "data-package" ? "@graph/layer2" : null),
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(sportsCard);
			mockDocument._addQueryElement(marketCard);

			// Create mock filter tabs
			const sportsTab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: (sel: string) => sel === '[data-team="sports-correlation"]',
			};
			mockDocument._addQueryElement(sportsTab);

			// Create mock team info panel
			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			filterTeam("sports-correlation");

			expect(sportsCard.style.display).toBe("block");
			expect(marketCard.style.display).toBe("none");
		});

		/**
		 * @test Wildcard package matching
		 */
		test("should handle wildcard package patterns like @bench/*", () => {
			const benchCard = {
				style: { display: "block" },
				getAttribute: (attr: string) => (attr === "data-package" ? "@bench/layer4" : null),
				matches: (sel: string) => sel === ".package-card",
			};

			mockDocument._addQueryElement(benchCard);

			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			const platformTab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: (sel: string) => sel === '[data-team="platform-tools"]',
			};
			mockDocument._addQueryElement(platformTab);

			filterTeam("platform-tools");

			expect(benchCard.style.display).toBe("block");
		});
	});

	describe("runTeamBenchmark Function", () => {
		/**
		 * @test Successful benchmark run
		 */
		test("should call API and show success alert on successful benchmark", async () => {
			const mockFetch = mock(() =>
				Promise.resolve({
					json: () => Promise.resolve({ success: true, jobId: "job-123" }),
				})
			);
			(globalThis as any).fetch = mockFetch;

			const mockAlert = mock(() => {});
			(globalThis as any).alert = mockAlert;

			await runTeamBenchmark("@graph/layer4");

			expect(mockFetch).toHaveBeenCalledWith("/api/benchmark/run", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ package: "@graph/layer4" }),
			});

			expect(mockAlert).toHaveBeenCalled();
			const alertMessage = mockAlert.mock.calls[0][0];
			expect(alertMessage).toContain("✅");
			expect(alertMessage).toContain("job-123");
		});

		/**
		 * @test Failed benchmark run
		 */
		test("should show error alert on failed benchmark", async () => {
			const mockFetch = mock(() =>
				Promise.resolve({
					json: () => Promise.resolve({ success: false, error: "Test error" }),
				})
			);
			(globalThis as any).fetch = mockFetch;

			const mockAlert = mock(() => {});
			(globalThis as any).alert = mockAlert;

			await runTeamBenchmark("@graph/layer4");

			expect(mockAlert).toHaveBeenCalled();
			const alertMessage = mockAlert.mock.calls[0][0];
			expect(alertMessage).toContain("❌");
			expect(alertMessage).toContain("Test error");
		});

		/**
		 * @test Network error handling
		 */
		test("should handle network errors gracefully", async () => {
			const mockFetch = mock(() => Promise.reject(new Error("Network error")));
			(globalThis as any).fetch = mockFetch;

			const mockAlert = mock(() => {});
			(globalThis as any).alert = mockAlert;

			const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

			await runTeamBenchmark("@graph/layer4");

			expect(consoleSpy).toHaveBeenCalled();
			expect(mockAlert).toHaveBeenCalled();
			const alertMessage = mockAlert.mock.calls[0][0];
			expect(alertMessage).toContain("❌");
			expect(alertMessage).toContain("Network error");

			consoleSpy.mockRestore();
		});
	});

	describe("createRFC Function", () => {
		/**
		 * @test RFC creation opens new window
		 */
		test("should open new window with correct RFC URL", () => {
			createRFC("@graph/layer4");

			expect(mockWindow.open).toHaveBeenCalledWith(
				"/rfcs/new?package=%40graph%2Flayer4",
				"_blank"
			);
		});

		/**
		 * @test RFC with special characters
		 */
		test("should properly encode package names with special characters", () => {
			createRFC("@bench/test+package");

			expect(mockWindow.open).toHaveBeenCalled();
			const url = mockWindow.open.mock.calls[0][0];
			expect(url).toContain("package=");
			expect(url).toContain("%40"); // Encoded @
		});

		/**
		 * @test Server-side context handling
		 */
		test("should handle non-browser context gracefully", () => {
			const originalWindow = (globalThis as any).window;
			(globalThis as any).window = undefined;

			const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});

			createRFC("@graph/layer4");

			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
			(globalThis as any).window = originalWindow;
		});
	});

	describe("initTeamFilter Function", () => {
		/**
		 * @test Initialization exposes global functions
		 */
		test("should expose filterTeam function globally", () => {
			initTeamFilter();

			expect(mockWindow.filterTeam).toBe(filterTeam);
		});

		/**
		 * @test Initialization exposes benchmark function
		 */
		test("should expose runTeamBenchmark function globally", () => {
			initTeamFilter();

			expect(mockWindow.runTeamBenchmark).toBe(runTeamBenchmark);
		});

		/**
		 * @test Initialization exposes RFC function
		 */
		test("should expose createRFC function globally", () => {
			initTeamFilter();

			expect(mockWindow.createRFC).toBe(createRFC);
		});

		/**
		 * @test Default filter is 'all'
		 */
		test("should call filterTeam with 'all' by default", () => {
			// Create mock elements for filter
			const card = {
				style: { display: "none" },
				getAttribute: () => "@graph/layer4",
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(card);

			const allTab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: (sel: string) => sel === '[data-team="all"]',
			};
			mockDocument._addQueryElement(allTab);

			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			initTeamFilter();

			expect(card.style.display).toBe("block");
		});
	});

	describe("Integration with Telegram", () => {
		/**
		 * @test Telegram URL generation
		 */
		test("should generate correct Telegram topic URL", () => {
			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			// Add mock elements
			const card = {
				style: { display: "block" },
				getAttribute: () => "@graph/layer4",
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(card);

			const tab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: (sel: string) => sel === '[data-team="sports-correlation"]',
			};
			mockDocument._addQueryElement(tab);

			filterTeam("sports-correlation");

			// Check panel contains Telegram link
			expect(panel.innerHTML).toContain("t.me");
			expect(panel.innerHTML).toContain("1234567890"); // Supergroup ID
			expect(panel.innerHTML).toContain("/1"); // Topic ID for sports-correlation
		});
	});

	describe("Edge Cases", () => {
		/**
		 * @test Empty package list
		 */
		test("should handle empty package list gracefully", () => {
			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			// No package cards added

			filterTeam("sports-correlation");

			// Should not throw
			expect(panel.innerHTML).toContain("Sports Correlation");
		});

		/**
		 * @test Missing team info panel
		 */
		test("should handle missing team-info-panel element", () => {
			// No panel added to mock document

			// Should not throw
			expect(() => filterTeam("sports-correlation")).not.toThrow();
		});

		/**
		 * @test Package with null data-package attribute
		 */
		test("should handle packages without data-package attribute", () => {
			const cardWithoutPackage = {
				style: { display: "block" },
				getAttribute: () => null,
				matches: (sel: string) => sel === ".package-card",
			};
			mockDocument._addQueryElement(cardWithoutPackage);

			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			// Should not throw
			expect(() => filterTeam("sports-correlation")).not.toThrow();
		});
	});

	describe("Performance", () => {
		/**
		 * @test Filter many packages efficiently
		 * @see {@link Bun.nanoseconds}
		 */
		test("should filter many packages efficiently", () => {
			// Create 100 mock package cards
			for (let i = 0; i < 100; i++) {
				const card = {
					style: { display: "block" },
					getAttribute: (attr: string) => (attr === "data-package" ? `@graph/package-${i}` : null),
					matches: (sel: string) => sel === ".package-card",
				};
				mockDocument._addQueryElement(card);
			}

			const panel = { innerHTML: "" };
			mockDocument._addElement("team-info-panel", panel);

			const tab = {
				classList: { add: mock(() => {}), remove: mock(() => {}) },
				matches: () => false,
			};
			mockDocument._addQueryElement(tab);

			const start = Bun.nanoseconds();

			for (let i = 0; i < 100; i++) {
				filterTeam("all");
			}

			const duration = Bun.nanoseconds() - start;

			// Should complete 100 filter operations in < 50ms
			expect(duration).toBeLessThan(50_000_000);
		});
	});
});
