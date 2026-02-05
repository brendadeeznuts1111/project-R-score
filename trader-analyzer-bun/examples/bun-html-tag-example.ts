#!/usr/bin/env bun
/**
 * Bun 1.3 HTML Tag Examples
 * 
 * Demonstrates usage of Bun's native `html` tagged template literal
 * for type-safe, XSS-protected HTML generation.
 * 
 * Run: bun run examples/bun-html-tag-example.ts
 */

import { html } from "../src/utils/html-tag-polyfill";
import { Hono } from "hono";

// ============================================================================
// BASIC EXAMPLES
// ============================================================================

/**
 * Example 1: Basic HTML generation
 */
function example1_BasicHTML() {
	const name = "World";
	const htmlContent = html`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>Hello ${name}</title>
		</head>
		<body>
			<h1>Hello, ${name}!</h1>
			<p>This is a basic example of Bun's HTML tag.</p>
		</body>
		</html>
	`;

	console.log("Example 1: Basic HTML");
	console.log(htmlContent);
	console.log("\n");
}

/**
 * Example 2: Dynamic content with variables
 */
function example2_DynamicContent() {
	const user = {
		name: "Alice",
		email: "alice@example.com",
		role: "admin",
	};

	const stats = {
		total: 150,
		active: 120,
		inactive: 30,
	};

	const htmlContent = html`
		<!DOCTYPE html>
		<html>
		<body>
			<header>
				<h1>Welcome, ${user.name}!</h1>
				<p>Email: ${user.email}</p>
				<p>Role: ${user.role}</p>
			</header>
			<main>
				<div class="stats">
					<div class="stat-card">
						<span class="label">Total:</span>
						<span class="value">${stats.total}</span>
					</div>
					<div class="stat-card">
						<span class="label">Active:</span>
						<span class="value">${stats.active}</span>
					</div>
					<div class="stat-card">
						<span class="label">Inactive:</span>
						<span class="value">${stats.inactive}</span>
					</div>
				</div>
			</main>
		</body>
		</html>
	`;

	console.log("Example 2: Dynamic Content");
	console.log(htmlContent);
	console.log("\n");
}

/**
 * Example 3: Nested HTML templates
 */
function example3_NestedTemplates() {
	function renderCard(title: string, content: string, color: string = "blue") {
		return html`
			<div class="card" style="border-color: ${color};">
				<h2>${title}</h2>
				<p>${content}</p>
			</div>
		`;
	}

	const cards = [
		{ title: "Card 1", content: "This is the first card", color: "red" },
		{ title: "Card 2", content: "This is the second card", color: "green" },
		{ title: "Card 3", content: "This is the third card", color: "blue" },
	];

	const htmlContent = html`
		<!DOCTYPE html>
		<html>
		<body>
			<div class="cards-container">
				${cards.map((card) => renderCard(card.title, card.content, card.color))}
			</div>
		</body>
		</html>
	`;

	console.log("Example 3: Nested Templates");
	console.log(htmlContent);
	console.log("\n");
}

/**
 * Example 4: Conditional rendering
 */
function example4_ConditionalRendering() {
	const showError = true;
	const error = "Something went wrong";
	const data = { items: [1, 2, 3] };

	const htmlContent = html`
		<!DOCTYPE html>
		<html>
		<body>
			${showError ? html`<div class="error">⚠️ ${error}</div>` : ""}
			${data.items.length > 0
				? html`
						<ul>
							${data.items.map((item) => html`<li>Item ${item}</li>`)}
						</ul>
					`
				: html`<p>No items found</p>`}
		</body>
		</html>
	`;

	console.log("Example 4: Conditional Rendering");
	console.log(htmlContent);
	console.log("\n");
}

/**
 * Example 5: XSS prevention demonstration
 */
function example5_XSSPrevention() {
	// Malicious user input
	const maliciousInput = '<script>alert("XSS Attack!")</script>';
	const maliciousAttribute = 'class" onclick="alert(1)"';

	console.log("Example 5: XSS Prevention");
	console.log("Malicious input:", maliciousInput);

	// Safe HTML generation (automatically escaped)
	const safeHTML = html`
		<div class="${maliciousAttribute}">
			<p>${maliciousInput}</p>
		</div>
	`;

	console.log("Safe HTML (escaped):");
	console.log(safeHTML);
	console.log("\n");
}

// ============================================================================
// HONO INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example 6: Hono route handler
 */
function example6_HonoIntegration() {
	const app = new Hono();

	interface DashboardData {
		user: { name: string; email: string };
		stats: { total: number; valid: number; invalid: number };
	}

	app.get("/dashboard", async (c) => {
		// Simulate loading data
		const data: DashboardData = {
			user: { name: "Alice", email: "alice@example.com" },
			stats: { total: 100, valid: 95, invalid: 5 },
		};

		const htmlContent = html`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Dashboard</title>
				<style>
					body { font-family: system-ui; padding: 2rem; }
					.stat-card { background: #f0f0f0; padding: 1rem; margin: 0.5rem; border-radius: 8px; }
					.stat-value { font-size: 2rem; font-weight: bold; color: #667eea; }
				</style>
			</head>
			<body>
				<header>
					<h1>Welcome, ${data.user.name}!</h1>
					<p>${data.user.email}</p>
				</header>
				<main>
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">Total</div>
							<div class="stat-value">${data.stats.total}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Valid</div>
							<div class="stat-value" style="color: #28a745;">${data.stats.valid}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Invalid</div>
							<div class="stat-value" style="color: #dc3545;">${data.stats.invalid}</div>
						</div>
					</div>
				</main>
			</body>
			</html>
		`;

		return c.html(htmlContent);
	});

	console.log("Example 6: Hono Integration");
	console.log("Route handler created: GET /dashboard");
	console.log("Use with: const server = Bun.serve({ fetch: app.fetch });");
	console.log("\n");
}

/**
 * Example 7: Complex table rendering
 */
function example7_ComplexTable() {
	interface TagResult {
		file: string;
		tag: string;
		line: number;
		valid: boolean;
	}

	const tags: TagResult[] = [
		{ file: "src/api/routes.ts", tag: "[api][routes]", line: 100, valid: true },
		{ file: "src/cli/dashboard.ts", tag: "[cli][dashboard]", line: 50, valid: true },
		{ file: "src/utils/helper.ts", tag: "[utils][helper]", line: 25, valid: false },
	];

	function renderTagRow(tag: TagResult) {
		return html`
			<tr data-valid="${tag.valid}">
				<td>${tag.file}</td>
				<td>${tag.tag}</td>
				<td>${tag.line}</td>
				<td>
					${tag.valid
						? html`<span class="status-valid">✅ Valid</span>`
						: html`<span class="status-invalid">❌ Invalid</span>`}
				</td>
			</tr>
		`;
	}

	const htmlContent = html`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				table { border-collapse: collapse; width: 100%; }
				th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
				th { background-color: #f2f2f2; }
				.status-valid { color: #28a745; }
				.status-invalid { color: #dc3545; }
			</style>
		</head>
		<body>
			<table>
				<thead>
					<tr>
						<th>File</th>
						<th>Tag</th>
						<th>Line</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					${tags.map((tag) => renderTagRow(tag))}
				</tbody>
			</table>
		</body>
		</html>
	`;

	console.log("Example 7: Complex Table");
	console.log(htmlContent);
	console.log("\n");
}

// ============================================================================
// MAIN
// ============================================================================

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Bun 1.3 HTML Tag Examples");
	console.log("=".repeat(60));
	console.log("\n");

	example1_BasicHTML();
	example2_DynamicContent();
	example3_NestedTemplates();
	example4_ConditionalRendering();
	example5_XSSPrevention();
	example6_HonoIntegration();
	example7_ComplexTable();

	console.log("=".repeat(60));
	console.log("All examples completed!");
	console.log("=".repeat(60));
}

export {
	example1_BasicHTML,
	example2_DynamicContent,
	example3_NestedTemplates,
	example4_ConditionalRendering,
	example5_XSSPrevention,
	example6_HonoIntegration,
	example7_ComplexTable,
};
