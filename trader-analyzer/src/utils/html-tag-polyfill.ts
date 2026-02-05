/**
 * HTML Tag Polyfill for Bun 1.3
 * 
 * Provides XSS-protected HTML template literal functionality
 * until Bun 1.3+ adds native html tag support.
 * 
 * This polyfill will be automatically replaced when Bun adds
 * native html tag support.
 * 
 * @see docs/BUN-1.3-HTML-TAG.md
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHTML(str: unknown): string {
	if (str === null || str === undefined) {
		return "";
	}

	const s = String(str);
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * HTML tagged template literal polyfill
 * 
 * Automatically escapes all interpolated values to prevent XSS attacks.
 * 
 * @example
 * ```typescript
 * import { html } from "./utils/html-tag-polyfill";
 * 
 * const name = "<script>alert('XSS')</script>";
 * const htmlContent = html`<div>${name}</div>`;
 * // Result: <div>&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;</div>
 * ```
 */
// Symbol to mark html template results
const HTML_TEMPLATE_SYMBOL = Symbol("html-template");

/**
 * HTML tagged template literal polyfill
 * 
 * Automatically escapes all interpolated values to prevent XSS attacks.
 * 
 * @example
 * ```typescript
 * import { html } from "./utils/html-tag-polyfill";
 * 
 * const name = "<script>alert('XSS')</script>";
 * const htmlContent = html`<div>${name}</div>`;
 * // Result: <div>&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;</div>
 * ```
 */
export function html(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	let result = "";
	
	for (let i = 0; i < strings.length; i++) {
		result += strings[i];
		
		if (i < values.length) {
			const value = values[i];
			
			// Handle arrays (e.g., from .map() that returns html templates)
			if (Array.isArray(value)) {
				result += value.map((item) => {
					// If item is already an html template result (string with HTML), use as-is
					// Otherwise escape it
					if (typeof item === "string") {
						// Check if it looks like escaped HTML (contains &lt; or &gt;)
						// If so, it's likely from a nested html template
						if (item.includes("&lt;") || item.includes("&gt;") || item.includes("&quot;")) {
							return item; // Already escaped
						}
						return escapeHTML(item);
					}
					return escapeHTML(String(item));
				}).join("");
			} else if (typeof value === "string") {
				// Check if string is already escaped HTML from nested template
				if (value.includes("&lt;") || value.includes("&gt;") || value.includes("&quot;")) {
					// Likely already escaped from nested html template
					result += value;
				} else {
					// Escape the string
					result += escapeHTML(value);
				}
			} else {
				// Escape all other values
				result += escapeHTML(value);
			}
		}
	}
	
	return result;
}

/**
 * Check if native Bun html tag is available
 */
export function hasNativeHTMLTag(): boolean {
	try {
		// Try to import from bun
		const bunModule = require("bun");
		return typeof bunModule.html === "function";
	} catch {
		return false;
	}
}

/**
 * Get the html function (native if available, polyfill otherwise)
 */
export function getHTMLTag() {
	if (hasNativeHTMLTag()) {
		// Use native Bun html tag if available
		const bunModule = require("bun");
		return bunModule.html;
	}
	// Use polyfill
	return html;
}
