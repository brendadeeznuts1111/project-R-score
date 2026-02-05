/**
 * HTML metadata injection from frontmatter
 * Generates meta tags, JSON-LD, and OpenGraph from extracted frontmatter
 */

export type InjectionMode = "meta" | "jsonld" | "opengraph" | "comment";

export interface InjectOptions {
	modes?: InjectionMode[];
	siteUrl?: string;
}

const DEFAULT_MODES: InjectionMode[] = ["meta", "opengraph"];

/**
 * Generate HTML head content from frontmatter data.
 * Returns a string of HTML tags suitable for injection into <head>.
 */
export function generateHeadTags(
	data: Record<string, unknown>,
	options?: InjectOptions,
): string {
	const modes = options?.modes ?? DEFAULT_MODES;
	const parts: string[] = [];

	if (modes.includes("meta")) {
		parts.push(generateMetaTags(data));
	}
	if (modes.includes("opengraph")) {
		parts.push(generateOpenGraphTags(data, options?.siteUrl));
	}
	if (modes.includes("jsonld")) {
		parts.push(generateJsonLd(data, options?.siteUrl));
	}
	if (modes.includes("comment")) {
		parts.push(generateHtmlComment(data));
	}

	return parts.filter(Boolean).join("\n");
}

/**
 * Inject frontmatter metadata into an HTML string's <head> section.
 * If no <head> exists, prepends the tags.
 */
export function injectIntoHtml(
	html: string,
	data: Record<string, unknown>,
	options?: InjectOptions,
): string {
	const tags = generateHeadTags(data, options);
	if (!tags) return html;

	if (html.includes("</head>")) {
		return html.replace("</head>", `${tags}\n</head>`);
	}
	// No <head> found — wrap with minimal head
	return `<head>\n${tags}\n</head>\n${html}`;
}

function esc(value: unknown): string {
	return Bun.escapeHTML(String(value ?? ""));
}

function generateMetaTags(data: Record<string, unknown>): string {
	const tags: string[] = [];
	if (data.title) tags.push(`<meta name="title" content="${esc(data.title)}">`);
	if (data.description)
		tags.push(`<meta name="description" content="${esc(data.description)}">`);
	if (data.author) tags.push(`<meta name="author" content="${esc(data.author)}">`);

	const keywords = data.tags ?? data.keywords;
	if (Array.isArray(keywords)) {
		tags.push(`<meta name="keywords" content="${esc(keywords.join(", "))}">`);
	}

	if (data.date_iso) tags.push(`<meta name="date" content="${esc(data.date_iso)}">`);

	return tags.join("\n");
}

function generateOpenGraphTags(data: Record<string, unknown>, siteUrl?: string): string {
	const tags: string[] = [];
	if (data.title) tags.push(`<meta property="og:title" content="${esc(data.title)}">`);
	if (data.description)
		tags.push(`<meta property="og:description" content="${esc(data.description)}">`);
	if (data.image) tags.push(`<meta property="og:image" content="${esc(data.image)}">`);
	if (siteUrl && data.slug)
		tags.push(`<meta property="og:url" content="${esc(siteUrl)}/${esc(data.slug)}">`);
	tags.push(`<meta property="og:type" content="article">`);
	return tags.join("\n");
}

function generateJsonLd(data: Record<string, unknown>, siteUrl?: string): string {
	const ld: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Article",
	};
	if (data.title) ld.headline = data.title;
	if (data.description) ld.description = data.description;
	if (data.author) {
		ld.author = { "@type": "Person", name: data.author };
	}
	if (data.date_iso) ld.datePublished = data.date_iso;
	if (data.image) ld.image = data.image;
	if (siteUrl && data.slug) ld.url = `${siteUrl}/${data.slug}`;

	return `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

function generateHtmlComment(data: Record<string, unknown>): string {
	const lines = Object.entries(data)
		.filter(([, v]) => v != null && typeof v !== "object")
		.map(([k, v]) => `  ${k}: ${v}`);
	return `<!-- frontmatter\n${lines.join("\n")}\n-->`;
}
