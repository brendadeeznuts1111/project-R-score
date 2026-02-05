/**
 * @fileoverview HTML Utilities
 * @description HTML escaping, sanitization, templating, and syntax highlighting
 * @module utils/html-utils
 * 
 * Uses Bun.escapeHTML for HTML escaping and HTMLRewriter for sanitization.
 */

export interface SanitizeOptions {
	allowedTags?: string[];
	allowedAttributes?: Record<string, string[]>;
	stripTags?: boolean;
	stripComments?: boolean;
}

/**
 * HTML Utilities
 * 
 * Provides utilities for HTML escaping, sanitization, templating,
 * and syntax highlighting using Bun's native HTML APIs.
 */
export class HTMLUtils {
	/**
	 * Escape HTML special characters using Bun.escapeHTML
	 */
	static escape = Bun.escapeHTML;

	/**
	 * Escape HTML attribute value
	 */
	static escapeAttribute(value: string): string {
		return Bun.escapeHTML(value)
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			.replace(/`/g, '&#x60;');
	}

	/**
	 * Escape and validate URL
	 */
	static escapeURL(url: string): string {
		try {
			const parsed = new URL(url);
			// Whitelist allowed protocols
			const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'data:'];
			if (!allowedProtocols.includes(parsed.protocol)) {
				return 'about:blank';
			}
			return Bun.escapeHTML(parsed.toString());
		} catch {
			return 'about:blank';
		}
	}

	/**
	 * Sanitize HTML content
	 * 
	 * Note: HTMLRewriter requires a Response object, so this is a simplified
	 * version that uses basic tag/attribute filtering. For production use,
	 * consider using a dedicated HTML sanitization library.
	 */
	static sanitize(html: string, options: SanitizeOptions = {}): string {
		const {
			allowedTags = ['b', 'i', 'u', 'strong', 'em', 'a', 'code', 'pre', 'p', 'br'],
			allowedAttributes = {
				a: ['href', 'title', 'target', 'rel'],
				'*': ['class', 'id']
			},
			stripTags = false,
			stripComments = true
		} = options;

		if (stripTags) {
			return Bun.escapeHTML(html);
		}

		// Basic tag filtering using regex (simplified approach)
		// For production, use HTMLRewriter with a Response object
		let sanitized = html;

		// Remove comments
		if (stripComments) {
			sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
		}

		// Remove script and style tags completely
		sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
		sanitized = sanitized.replace(/<style[\s\S]*?<\/style>/gi, '');

		// Basic tag whitelist (simplified - for production use HTMLRewriter)
		const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
		sanitized = sanitized.replace(tagPattern, (match, tagName) => {
			const lowerTag = tagName.toLowerCase();
			if (allowedTags.includes(lowerTag) || allowedTags.includes('*')) {
				// Basic attribute filtering
				const attrPattern = /(\w+)=["']([^"']*)["']/g;
				let filteredAttrs = '';
				let attrMatch;
				while ((attrMatch = attrPattern.exec(match)) !== null) {
					const attrName = attrMatch[1];
					const attrValue = attrMatch[2];
					const allowed = allowedAttributes[lowerTag] || allowedAttributes['*'] || [];
					if (allowed.includes(attrName)) {
						// Special handling for href
						if (attrName === 'href') {
							const escapedUrl = this.escapeURL(attrValue);
							filteredAttrs += ` ${attrName}="${escapedUrl}"`;
						} else {
							filteredAttrs += ` ${attrName}="${this.escapeAttribute(attrValue)}"`;
						}
					}
				}
				return `<${lowerTag}${filteredAttrs}>`;
			}
			return '';
		});

		return sanitized;
	}

	/**
	 * Create template with data substitution
	 */
	static createTemplate(template: string, data: Record<string, any>): string {
		let result = template;

		for (const [key, value] of Object.entries(data)) {
			const placeholder = `{{${key}}}`;
			const escaped = typeof value === 'string' ? Bun.escapeHTML(value) : String(value);
			result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escaped);
		}

		return result;
	}

	/**
	 * Highlight syntax in code blocks
	 */
	static highlightSyntax(code: string, language: 'javascript' | 'html' | 'css' = 'javascript'): string {
		const escaped = Bun.escapeHTML(code);

		const highlighters = {
			javascript: (code: string) => {
				const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'async', 'await', 'class', 'extends', 'import', 'export'];
				let highlighted = code;

				keywords.forEach(keyword => {
					const regex = new RegExp(`\\b${keyword}\\b`, 'g');
					highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
				});

				// Highlight strings
				highlighted = highlighted.replace(/'([^']*)'/g, `<span class="string">'$1'</span>`);
				highlighted = highlighted.replace(/"([^"]*)"/g, `<span class="string">"$1"</span>`);
				highlighted = highlighted.replace(/`([^`]*)`/g, `<span class="string">\`$1\`</span>`);

				// Highlight numbers
				highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, `<span class="number">$1</span>`);

				// Highlight comments
				highlighted = highlighted.replace(/\/\/.*$/gm, `<span class="comment">$&</span>`);
				highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, `<span class="comment">$&</span>`);

				return highlighted;
			},

			html: (code: string) => {
				let highlighted = code;

				// Highlight tags
				highlighted = highlighted.replace(/&lt;(\/?)([a-z][a-z0-9]*)\b([^&]*?)&gt;/gi, (match, closing, tagName, attrs) => {
					return `&lt;${closing}<span class="tag">${tagName}</span>${attrs}&gt;`;
				});

				// Highlight attributes
				highlighted = highlighted.replace(/(\w+)=/g, `<span class="attribute">$1</span>=`);

				return highlighted;
			},

			css: (code: string) => {
				let highlighted = code;

				// Highlight selectors
				highlighted = highlighted.replace(/([^{}]+)\{/g, `<span class="selector">$1</span>{`);

				// Highlight properties
				highlighted = highlighted.replace(/([a-z-]+):/g, `<span class="property">$1</span>:`);

				// Highlight values
				highlighted = highlighted.replace(/:\s*([^;]+);/g, `: <span class="value">$1</span>;`);

				return highlighted;
			}
		};

		const highlighter = highlighters[language] || ((code: string) => code);
		return `<pre><code class="language-${language}">${highlighter(escaped)}</code></pre>`;
	}
}
