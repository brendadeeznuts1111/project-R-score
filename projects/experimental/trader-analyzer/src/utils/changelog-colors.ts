/**
 * @fileoverview Changelog Category Colors
 * @description Vibrant color mapping for changelog categories matching NEXUS tag system
 * @module utils/changelog-colors
 *
 * [Bun.inspect.custom] Category color mapping for code search and visual navigation
 *
 * Colors match the vibrant NEXUS tag system used throughout the codebase:
 * - Cyan (#00d4ff) - API routes, enhancements
 * - Red (#ff1744) - Critical issues, bug fixes, arbitrage
 * - Green (#00ff88) - Documentation, performance
 * - Indigo (#667eea) - Code cleanup, dashboard
 * - Purple (#9c27b0) - Configuration, ORCA
 * - Yellow (#ffeb3b) - VM, runtime, testing
 * - Orange (#ff6b00) - Security, warnings
 * - Magenta (#ff00ff) - Registry & MCP tools
 */

/**
 * Category color mapping matching NEXUS vibrant tag system
 *
 * [Bun.inspect.custom]feat / feature / enhancement → #00d4ff (Cyan) — API routes, enhancements
 * fix / bug / fixes → #ff1744 (Red) — Critical issues, bug fixes
 * docs / doc / documentation → #00ff88 (Green) — Documentation, guides
 * refactor / refactoring → #667eea (Indigo) — Code cleanup, restructuring
 * chore / chores → #9c27b0 (Purple) — Configuration, external services
 * test / tests / testing → #ffeb3b (Yellow) — VM, runtime, testing
 * perf / performance → #00ff88 (Green) — Performance & caching
 * security / sec → #ff6b00 (Orange) — Security, warnings
 * registry / mcp → #ff00ff (Magenta) — Registry & MCP tools
 * api → #00d4ff (Cyan) — API routes
 * arbitrage → #ff1744 (Red) — Arbitrage & trading
 * orca → #9c27b0 (Purple) — ORCA & sports betting
 * dashboard → #667eea (Indigo) — Dashboard & UI
 */
export const CHANGELOG_CATEGORY_COLORS: Record<string, string> = {
	// Feature categories
	feat: "#00d4ff", // Cyan - API routes, enhancements
	feature: "#00d4ff",
	enhancement: "#00d4ff",

	// Bug fixes
	fix: "#ff1744", // Red - Critical issues, bug fixes
	bug: "#ff1744",
	fixes: "#ff1744",

	// Documentation
	docs: "#00ff88", // Green - Documentation, guides
	doc: "#00ff88",
	documentation: "#00ff88",

	// Refactoring
	refactor: "#667eea", // Indigo - Code cleanup, restructuring
	refactoring: "#667eea",

	// Chores
	chore: "#9c27b0", // Purple - Configuration, external services
	chores: "#9c27b0",

	// Testing
	test: "#ffeb3b", // Yellow - VM, runtime, testing
	tests: "#ffeb3b",
	testing: "#ffeb3b",

	// Performance
	perf: "#00ff88", // Green - Performance & caching
	performance: "#00ff88",

	// Security
	security: "#ff6b00", // Orange - Security, warnings
	sec: "#ff6b00",

	// Registry/MCP
	registry: "#ff00ff", // Magenta - Registry & MCP tools
	mcp: "#ff00ff",

	// Component categories
	api: "#00d4ff", // Cyan - API routes
	arbitrage: "#ff1744", // Red - Arbitrage & trading
	orca: "#9c27b0", // Purple - ORCA & sports betting
	dashboard: "#667eea", // Indigo - Dashboard & UI

	// Fallback
	other: "#9ca3af", // Gray - Uncategorized
	misc: "#9ca3af",
};

/**
 * Get color for a category
 * @param category - Category name
 * @returns Hex color code or fallback gray
 */
export function getCategoryColor(category: string): string {
	return (
		CHANGELOG_CATEGORY_COLORS[category.toLowerCase()] ||
		CHANGELOG_CATEGORY_COLORS.other
	);
}

/**
 * Get all categories with their colors
 * @returns Record of category names to colors
 */
export function getAllCategoryColors(): Record<string, string> {
	return { ...CHANGELOG_CATEGORY_COLORS };
}

/**
 * Format category with color for terminal output (ANSI)
 * @param category - Category name
 * @param text - Text to colorize
 * @returns ANSI-colored string
 */
export function colorizeCategory(category: string, text: string): string {
	const color = getCategoryColor(category);
	// Convert hex to RGB
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}
