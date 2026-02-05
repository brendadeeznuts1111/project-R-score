#!/usr/bin/env bun
/**
 * XSS Prevention Tests for Bun 1.3 HTML Tag
 * 
 * Tests that the html tagged template literal properly escapes
 * malicious input to prevent XSS attacks.
 * 
 * Run: bun test test/bun-html-tag-xss.test.ts
 */

import { describe, test, expect } from "bun:test";
import { html } from "../src/utils/html-tag-polyfill";

describe("Bun HTML Tag XSS Prevention", () => {
	test("should escape script tags in content", () => {
		const malicious = '<script>alert("XSS")</script>';
		const result = html`<div>${malicious}</div>`;

		// Should contain escaped HTML entities
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;/script&gt;");
		// Should NOT contain unescaped script tags
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("</script>");
	});

	test("should escape script tags in attributes", () => {
		const malicious = 'class" onclick="alert(1)"';
		const result = html`<div class="${malicious}">Content</div>`;

		// Should escape quotes
		expect(result).toContain("&quot;");
		// Should NOT contain unescaped quotes that could break attributes
		expect(result).not.toMatch(/class"[^>]*onclick=/);
	});

	test("should escape HTML entities in content", () => {
		const malicious = '<img src=x onerror="alert(1)">';
		const result = html`<div>${malicious}</div>`;

		// Should escape angle brackets
		expect(result).toContain("&lt;img");
		expect(result).toContain("&gt;");
		// Should NOT contain unescaped HTML tags
		expect(result).not.toContain("<img");
	});

	test("should escape JavaScript event handlers", () => {
		const malicious = 'onclick="alert(\'XSS\')"';
		const result = html`<div ${malicious}>Click me</div>`;

		// Should escape quotes
		expect(result).toContain("&quot;");
		// Should NOT contain executable JavaScript
		expect(result).not.toMatch(/onclick="[^"]*alert/);
	});

	test("should escape nested script tags", () => {
		const malicious = '<script>const x = "<script>alert(1)</script>";</script>';
		const result = html`<div>${malicious}</div>`;

		// All script tags should be escaped
		const scriptMatches = result.match(/<script>/g);
		expect(scriptMatches).toBeNull();
	});

	test("should escape SVG with script tags", () => {
		const malicious = '<svg><script>alert("XSS")</script></svg>';
		const result = html`<div>${malicious}</div>`;

		// Should escape script tags even inside SVG
		expect(result).toContain("&lt;script&gt;");
		expect(result).not.toContain("<script>");
	});

	test("should escape data URIs with JavaScript", () => {
		const malicious = '<a href="javascript:alert(1)">Click</a>';
		const result = html`<div>${malicious}</div>`;

		// Should escape the entire tag
		expect(result).toContain("&lt;a");
		expect(result).not.toContain('href="javascript:');
	});

	test("should escape iframe tags", () => {
		const malicious = '<iframe src="javascript:alert(1)"></iframe>';
		const result = html`<div>${malicious}</div>`;

		// Should escape iframe tag
		expect(result).toContain("&lt;iframe");
		expect(result).not.toContain("<iframe");
	});

	test("should escape object and embed tags", () => {
		const malicious = '<object data="evil.swf"></object><embed src="evil.swf">';
		const result = html`<div>${malicious}</div>`;

		// Should escape both tags
		expect(result).toContain("&lt;object");
		expect(result).toContain("&lt;embed");
		expect(result).not.toContain("<object");
		expect(result).not.toContain("<embed");
	});

	test("should escape CSS expressions", () => {
		const malicious = '<div style="background: expression(alert(1))">Test</div>';
		const result = html`<div>${malicious}</div>`;

		// Should escape the entire tag (the tag itself won't execute)
		expect(result).toContain("&lt;div");
		expect(result).not.toContain("<div style="); // Unescaped tag should not exist
		// Note: "expression(" may appear in escaped form, but the tag is safe
	});

	test("should handle safe content correctly", () => {
		const safe = "Hello, World!";
		const result = html`<div>${safe}</div>`;

		// Safe content should remain unchanged
		expect(result).toContain("Hello, World!");
		expect(result).toContain("<div>");
		expect(result).toContain("</div>");
	});

	test("should handle numbers correctly", () => {
		const number = 42;
		const result = html`<div>${number}</div>`;

		// Numbers should be converted to string safely
		expect(result).toContain("42");
	});

	test("should handle null and undefined", () => {
		const nullValue = null;
		const undefinedValue = undefined;
		const result = html`<div>${nullValue}${undefinedValue}</div>`;

		// Should handle null/undefined gracefully
		expect(result).toContain("<div>");
		expect(result).toContain("</div>");
	});

	test("should escape multiple malicious inputs", () => {
		const malicious1 = '<script>alert(1)</script>';
		const malicious2 = '<img src=x onerror="alert(2)">';
		const result = html`<div>${malicious1}${malicious2}</div>`;

		// Both should be escaped
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;img");
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<img");
	});

	test("should escape in nested templates", () => {
		function renderCard(title: string) {
			return html`<div class="card">${title}</div>`;
		}

		const malicious = '<script>alert("XSS")</script>';
		const result = html`<div>${renderCard(malicious)}</div>`;

		// Should escape even in nested templates
		expect(result).toContain("&lt;script&gt;");
		expect(result).not.toContain("<script>");
	});

	test("should escape arrays of malicious content", () => {
		const malicious = [
			'<script>alert(1)</script>',
			'<img src=x onerror="alert(2)">',
			'<iframe src="evil.html"></iframe>',
		];

		const result = html`
			<ul>
				${malicious.map((item) => html`<li>${item}</li>`)}
			</ul>
		`;

		// All malicious content should be escaped
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;img");
		expect(result).toContain("&lt;iframe");
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<img");
		expect(result).not.toContain("<iframe");
	});

	test("should escape special characters", () => {
		const special = '&<>"\'';
		const result = html`<div>${special}</div>`;

		// Should escape special HTML characters
		expect(result).toContain("&amp;");
		expect(result).toContain("&lt;");
		expect(result).toContain("&gt;");
		expect(result).toContain("&quot;");
	});

	test("should handle complex XSS payloads", () => {
		const complexXSS = `
			<script>
				const x = document.createElement('script');
				x.src = 'evil.js';
				document.body.appendChild(x);
			</script>
			<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
		`;

		const result = html`<div>${complexXSS}</div>`;

		// Should escape all script tags and event handlers
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;img");
		expect(result).not.toContain("<script>");
		// onerror= should be escaped (as onerror=&quot;), not unescaped
		expect(result).not.toMatch(/onerror="[^"]*eval/); // Unescaped onerror= should not exist
		expect(result).toContain("onerror=&quot;"); // Escaped version should exist
	});
});

describe("Bun HTML Tag Integration", () => {
	test("should work with Hono c.html()", () => {
		const content = html`<div>Hello, World!</div>`;
		
		// Should return a string that can be used with Hono
		expect(typeof content).toBe("string");
		expect(content).toContain("<div>");
		expect(content).toContain("Hello, World!");
		expect(content).toContain("</div>");
	});

	test("should handle conditional rendering", () => {
		const showError = true;
		const error = '<script>alert("XSS")</script>';
		
		const result = html`
			<div>
				${showError ? html`<div class="error">${error}</div>` : ""}
			</div>
		`;

		// Error should be escaped
		expect(result).toContain("&lt;script&gt;");
		expect(result).not.toContain("<script>");
	});

	test("should handle loops safely", () => {
		const items = [
			'<script>alert(1)</script>',
			'<img src=x onerror="alert(2)">',
		];

		const result = html`
			<ul>
				${items.map((item) => html`<li>${item}</li>`)}
			</ul>
		`;

		// All items should be escaped
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;img");
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<img");
	});
});
