#!/usr/bin/env bun
/**
 * @fileoverview HTML Link Extractor using HTMLRewriter
 * @description Extract links from HTML content using Bun's HTMLRewriter API
 * @module utils/html-link-extractor
 * 
 * @see https://bun.sh/docs/guides/html-rewriter/extract-links
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-UTILS@1.0.0;instance-id=HTML-LINK-EXTRACTOR-001;version=1.0.0}]
 * [PROPERTIES:{utility={value:"html-link-extractor";@root:"ROOT-UTILS";@chain:["BP-UTILS","BP-HTML"];@version:"1.0.0"}}]
 * [CLASS:HTMLLinkExtractor][#REF:v-1.0.0.BP.UTILS.HTML.1.0.A.1.1.UTILS.1.1]]
 */

/**
 * Extracted link information
 */
export interface ExtractedLink {
	/** Link URL (href attribute) */
	url: string;
	/** Link text content */
	text: string;
	/** Link title attribute (if present) */
	title?: string;
	/** Link target attribute (if present) */
	target?: string;
	/** Link rel attribute (if present) */
	rel?: string;
	/** Whether link is external (starts with http:// or https://) */
	isExternal: boolean;
	/** Whether link is a hash/anchor link */
	isAnchor: boolean;
	/** Whether link is a mailto: link */
	isMailto: boolean;
	/** Whether link is a tel: link */
	isTel: boolean;
	/** Link element attributes */
	attributes: Record<string, string>;
}

/**
 * Link extraction options
 */
export interface LinkExtractionOptions {
	/** Include only external links */
	externalOnly?: boolean;
	/** Include only internal links */
	internalOnly?: boolean;
	/** Filter links by URL pattern (regex) */
	urlPattern?: RegExp;
	/** Filter links by rel attribute */
	relFilter?: string[];
	/** Include anchor links */
	includeAnchors?: boolean;
	/** Include mailto links */
	includeMailto?: boolean;
	/** Include tel links */
	includeTel?: boolean;
	/** Maximum number of links to extract */
	maxLinks?: number;
}

/**
 * Extract links from HTML content using HTMLRewriter
 * 
 * @param html - HTML content (string, Response, ArrayBuffer, or File)
 * @param options - Extraction options
 * @returns Array of extracted links
 * 
 * @example
 * ```typescript
 * const html = '<a href="https://example.com">Example</a><a href="/page">Page</a>';
 * const links = await extractLinks(html);
 * // Returns: [
 * //   { url: 'https://example.com', text: 'Example', isExternal: true, ... },
 * //   { url: '/page', text: 'Page', isExternal: false, ... }
 * // ]
 * ```
 */
export async function extractLinks(
	html: string | Response | ArrayBuffer | File,
	options: LinkExtractionOptions = {},
): Promise<ExtractedLink[]> {
	// Use sync version for async inputs
	if (typeof html === "string") {
		return extractLinksSync(html, options);
	}

	// For Response, ArrayBuffer, or File, convert to string first
	let htmlString: string;
	if (html instanceof Response) {
		htmlString = await html.text();
	} else if (html instanceof ArrayBuffer) {
		htmlString = new TextDecoder().decode(html);
	} else if (html instanceof File) {
		htmlString = await html.text();
	} else {
		throw new Error("Unsupported HTML input type");
	}

	return extractLinksSync(htmlString, options);
}

/**
 * Apply filters to determine if link should be included
 */
function applyFilters(link: ExtractedLink, options: LinkExtractionOptions): boolean {
	if (options.externalOnly && !link.isExternal) {
		return false;
	}
	if (options.internalOnly && link.isExternal) {
		return false;
	}
	if (!options.includeAnchors && link.isAnchor) {
		return false;
	}
	if (!options.includeMailto && link.isMailto) {
		return false;
	}
	if (!options.includeTel && link.isTel) {
		return false;
	}
	if (options.urlPattern && !options.urlPattern.test(link.url)) {
		return false;
	}
	if (options.relFilter && link.rel) {
		const rels = link.rel.split(/\s+/);
		if (!options.relFilter.some((r) => rels.includes(r))) {
			return false;
		}
	}
	return true;
}

/**
 * Extract links synchronously from HTML string
 * 
 * @param html - HTML string content
 * @param options - Extraction options
 * @returns Array of extracted links
 */
export function extractLinksSync(
	html: string,
	options: LinkExtractionOptions = {},
): ExtractedLink[] {
	const links: ExtractedLink[] = [];
	let linkCount = 0;
	const maxLinks = options.maxLinks || Infinity;
	let currentLink: Partial<ExtractedLink> | null = null;
	let currentText = "";

	// Check if HTMLRewriter is available
	const HTMLRewriter = (globalThis as any).HTMLRewriter || (Bun as any)?.HTMLRewriter;
	if (!HTMLRewriter) {
		throw new Error(
			"HTMLRewriter is not available. Update Bun to 1.4+ or use --compat flag.",
		);
	}

	const rewriter = new HTMLRewriter()
		.on("a", {
			element: (element) => {
				// Save previous link if exists
				if (currentLink && currentLink.url) {
					const link = currentLink as ExtractedLink;
					link.text = currentText.trim();
					links.push(link);
					linkCount++;
					currentText = "";
				}

				if (linkCount >= maxLinks) {
					return;
				}

				const href = element.getAttribute("href");
				if (!href) {
					currentLink = null;
					return;
				}

				// Collect attributes
				const attributes: Record<string, string> = {};
				const knownAttrs = ["href", "title", "target", "rel"];
				for (const attr of knownAttrs) {
					const value = element.getAttribute(attr);
					if (value) {
						attributes[attr] = value;
					}
				}

				// Determine link type
				const isExternal = /^https?:\/\//i.test(href);
				const isAnchor = href.startsWith("#");
				const isMailto = href.startsWith("mailto:");
				const isTel = href.startsWith("tel:");

				// Apply filters
				if (options.externalOnly && !isExternal) {
					currentLink = null;
					return;
				}
				if (options.internalOnly && isExternal) {
					currentLink = null;
					return;
				}
				if (!options.includeAnchors && isAnchor) {
					currentLink = null;
					return;
				}
				if (!options.includeMailto && isMailto) {
					currentLink = null;
					return;
				}
				if (!options.includeTel && isTel) {
					currentLink = null;
					return;
				}
				if (options.urlPattern && !options.urlPattern.test(href)) {
					currentLink = null;
					return;
				}
				if (options.relFilter && attributes.rel) {
					const rels = attributes.rel.split(/\s+/);
					if (!options.relFilter.some((r) => rels.includes(r))) {
						currentLink = null;
						return;
					}
				}

				currentLink = {
					url: href,
					title: attributes.title,
					target: attributes.target,
					rel: attributes.rel,
					isExternal,
					isAnchor,
					isMailto,
					isTel,
					attributes,
				};
				currentText = "";
			},
		})
		.on("a", {
			text: (textChunk) => {
				if (currentLink) {
					currentText += textChunk.text;
				}
			},
		});

	// Transform HTML string
	rewriter.transform(html);

	// Save last link if exists
	if (currentLink && currentLink.url) {
		const link = currentLink as ExtractedLink;
		link.text = currentText.trim();
		links.push(link);
	}

	return links;
}

/**
 * Extract unique domains from extracted links
 * 
 * @param links - Array of extracted links
 * @returns Set of unique domains
 */
export function extractDomains(links: ExtractedLink[]): Set<string> {
	const domains = new Set<string>();

	for (const link of links) {
		if (link.isExternal && link.url) {
			try {
				const url = new URL(link.url);
				domains.add(url.hostname);
			} catch {
				// Invalid URL, skip
			}
		}
	}

	return domains;
}

/**
 * Group links by domain
 * 
 * @param links - Array of extracted links
 * @returns Map of domain to links
 */
export function groupLinksByDomain(
	links: ExtractedLink[],
): Map<string, ExtractedLink[]> {
	const grouped = new Map<string, ExtractedLink[]>();

	for (const link of links) {
		if (link.isExternal && link.url) {
			try {
				const url = new URL(link.url);
				const domain = url.hostname;
				if (!grouped.has(domain)) {
					grouped.set(domain, []);
				}
				grouped.get(domain)!.push(link);
			} catch {
				// Invalid URL, skip
			}
		} else {
			// Internal links
			if (!grouped.has("internal")) {
				grouped.set("internal", []);
			}
			grouped.get("internal")!.push(link);
		}
	}

	return grouped;
}
