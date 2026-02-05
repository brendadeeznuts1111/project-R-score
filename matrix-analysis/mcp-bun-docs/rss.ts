/**
 * Tier-1380 hardened RSS parser — Bun-safe (no DOMParser; uses regex).
 * DOMParser is not available in Bun main context.
 *
 * Hardening:
 * - Always set User-Agent header
 * - fetch with signal: AbortSignal.timeout(timeoutMs) (default 10s)
 * - Wrap parsing in try/catch + parsererror check (regex for <parsererror>)
 * - Callers: escape displayed content with Bun.escapeHTML; enforce Col-89 with stringWidth + wrapAnsi
 * - Optional file cache with ETag / If-Modified-Since
 * - Audit: fetchTimeMs, sizeBytes, parseTimeMs (and optionally log)
 */

/** Options for safeRSSPreview (Col-89 compliant, XSS-safe title/preview renderer). */
export interface SafeRSSPreviewOptions {
	/** Maximum allowed display columns (default: 89). */
	maxCols?: number;
	/** Reserve columns for ellipsis/suffix (default: 3 for " …"). */
	reserve?: number;
	/** Prefer word boundaries when truncating (default: true). */
	wordAware?: boolean;
	/** Optional audit callback when truncation occurs. */
	onViolation?: (details: SafeRSSPreviewViolation) => void;
	/** If true, log to console.debug when call exceeds 5µs (default: false). */
	logSlow?: boolean;
}

/** Violation details passed to onViolation when title exceeds maxCols. */
export interface SafeRSSPreviewViolation {
	original: string;
	truncated: string;
	width: number;
	maxCols: number;
}

/**
 * Safely prepares an RSS feed title (or any string) for Col-89 compliant,
 * XSS-safe display in HTML/audit contexts.
 *
 * - ANSI stripping
 * - GB9c-aware display width (Bun.stringWidth, v1.3.7+)
 * - Display-width truncation (no mid-grapheme cuts; word boundaries when wordAware)
 * - XSS escaping via Bun.escapeHTML
 * - Optional onViolation audit hook and performance telemetry
 */
export function safeRSSPreview<T extends string>(
	input: T,
	options: SafeRSSPreviewOptions = {},
): string {
	const {
		maxCols = 89,
		reserve = 3,
		wordAware = true,
		onViolation,
		logSlow = false,
	} = options;

	const startNs =
		typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function"
			? Bun.nanoseconds()
			: 0;

	const stripANSI =
		typeof Bun !== "undefined" && typeof Bun.stripANSI === "function"
			? (s: string) => Bun.stripANSI(s)
			: (s: string) => s;
	const clean = stripANSI(input);

	const stringWidth =
		typeof Bun !== "undefined" && typeof Bun.stringWidth === "function"
			? (s: string) =>
					(
						Bun.stringWidth as (
							s: string,
							o?: { countAnsiEscapeCodes?: boolean },
						) => number
					)(s, { countAnsiEscapeCodes: false })
			: (s: string) => s.length;

	const escapeHTML =
		typeof Bun !== "undefined" && typeof Bun.escapeHTML === "function"
			? (s: string) => Bun.escapeHTML(s)
			: (s: string) => s;

	const width = stringWidth(clean);
	if (width <= maxCols) {
		return escapeHTML(clean);
	}

	const targetWidth = maxCols - reserve;
	let truncated: string;

	if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
		const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
		const segments = [...segmenter.segment(clean)];
		let prefix = "";
		for (const seg of segments) {
			const next = prefix + seg.segment;
			if (stringWidth(next) > targetWidth) break;
			prefix = next;
		}
		if (wordAware && prefix.length < clean.length) {
			const lastSpace = prefix.lastIndexOf(" ");
			if (lastSpace > 0) {
				const candidate = prefix.slice(0, lastSpace).trimEnd();
				if (stringWidth(candidate) <= targetWidth) prefix = candidate;
			}
		}
		truncated = prefix;
	} else {
		const slice = clean.slice(0, Math.min(targetWidth, clean.length));
		const lastSpace = wordAware ? slice.lastIndexOf(" ") : -1;
		truncated = lastSpace > 0 ? slice.slice(0, lastSpace).trimEnd() : slice;
	}

	const finalWidth = stringWidth(truncated);
	if (onViolation && finalWidth > 0) {
		onViolation({ original: input, truncated, width: finalWidth, maxCols });
	}

	const result = escapeHTML(truncated) + "…";

	if (
		logSlow &&
		startNs > 0 &&
		typeof Bun !== "undefined" &&
		typeof Bun.nanoseconds === "function"
	) {
		const durationNs = Bun.nanoseconds() - startNs;
		if (
			durationNs > 5000 &&
			typeof console !== "undefined" &&
			typeof console.debug === "function"
		) {
			console.debug(`safeRSSPreview took ${durationNs}ns for ${input.length} chars`);
		}
	}

	return result;
}

export interface RSSItemEnclosure {
	url: string;
	type: string;
	length: string;
}

export interface RSSItem {
	title: string;
	link: string;
	pubDate?: string;
	description?: string;
	content?: string;
	guid?: string;
	author?: string;
	categories?: string[];
	enclosure?: RSSItemEnclosure;
}

export interface RSSFeed {
	title: string;
	description: string;
	link: string;
	lastBuildDate?: string;
	items: RSSItem[];
}

/** Audit metadata for feed fetch + parse (Tier-1380). */
export interface RSSFeedAudit {
	fetchTimeMs: number;
	sizeBytes: number;
	parseTimeMs: number;
	fromCache?: boolean;
}

export interface RSSFeedResult {
	feed: RSSFeed;
	audit: RSSFeedAudit;
}

export interface ParseRSSOptions {
	/** Fetch timeout in ms. Default 10000. */
	timeoutMs?: number;
	/** Cache directory for file cache (ETag / If-Modified-Since). */
	cacheDir?: string;
	/** Optional cache key (default: hash of URL). */
	cacheKey?: string;
	/** Callback for audit log (fetchTimeMs, sizeBytes, parseTimeMs). */
	onAudit?: (audit: RSSFeedAudit) => void;
}

const USER_AGENT = "Tier-1380 RSS Reader/1.0";
const DEFAULT_TIMEOUT_MS = 10_000;
const PARSERERROR_RE = /<parsererror[\s>]/i;

function getTagContent(block: string, tag: string): string | undefined {
	const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
	const m = block.match(re);
	return m ? m[1].trim() : undefined;
}

function getLinkHrefOrText(block: string): string {
	const hrefRe = /<link[^>]+href=["']([^"']+)["']/i;
	const m = block.match(hrefRe);
	if (m) return m[1].trim();
	const text = getTagContent(block, "link");
	return text ?? "";
}

function getEnclosure(block: string): RSSItemEnclosure | undefined {
	const re =
		/<enclosure[^>]+url=["']([^"']+)["'][^>]*(?:type=["']([^"']*)["'])?(?:length=["']([^"']*)["'])?/i;
	const m = block.match(re);
	if (!m) return undefined;
	return { url: m[1].trim(), type: (m[2] ?? "").trim(), length: (m[3] ?? "").trim() };
}

function parseItemBlock(itemBlock: string): RSSItem {
	const title = getTagContent(itemBlock, "title") ?? "";
	const link = getLinkHrefOrText(itemBlock) || (getTagContent(itemBlock, "link") ?? "");
	const pubDate =
		getTagContent(itemBlock, "pubDate") ??
		getTagContent(itemBlock, "published") ??
		getTagContent(itemBlock, "updated");
	const description =
		getTagContent(itemBlock, "description") ?? getTagContent(itemBlock, "summary");
	const content =
		getTagContent(itemBlock, "content") ?? getTagContent(itemBlock, "content:encoded");
	const guid = getTagContent(itemBlock, "guid") ?? getTagContent(itemBlock, "id");
	const author =
		getTagContent(itemBlock, "author") ?? getTagContent(itemBlock, "dc:creator");
	const enclosure = getEnclosure(itemBlock);
	const categories: string[] = [];
	const catRe = /<category[^>]*(?:term=["']([^"']+)["'])?[^>]*>([^<]*)<\/category>/gi;
	let cm;
	while ((cm = catRe.exec(itemBlock)) !== null) {
		const val = (cm[1] ?? cm[2] ?? "").trim();
		if (val) categories.push(val);
	}
	return {
		title,
		link,
		...(pubDate && { pubDate }),
		...(description && { description }),
		...(content && { content }),
		...(guid && { guid }),
		...(author && { author }),
		...(categories.length > 0 && { categories }),
		...(enclosure && { enclosure }),
	};
}

function parseFeedFromText(text: string): RSSFeed {
	// Parsererror check (XML parse failure often injects <parsererror>)
	if (PARSERERROR_RE.test(text)) {
		const snippet = text.slice(0, 500);
		throw new Error(`RSS parse error (parsererror detected): ${snippet}`);
	}

	const channelBlock =
		text.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i)?.[1] ??
		text.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i)?.[1] ??
		"";

	const title =
		getTagContent(channelBlock, "title") ??
		getTagContent(text, "title") ??
		"Untitled Feed";
	const description =
		getTagContent(channelBlock, "description") ??
		getTagContent(channelBlock, "subtitle") ??
		"";
	const link =
		getLinkHrefOrText(channelBlock) ||
		getLinkHrefOrText(text) ||
		(getTagContent(channelBlock, "link") ?? "");
	const lastBuildDate =
		getTagContent(channelBlock, "lastBuildDate") ??
		getTagContent(channelBlock, "updated") ??
		undefined;

	const itemMatches = [...text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
	const entryMatches = [...text.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)];
	const blocks =
		itemMatches.length > 0
			? itemMatches.map((m) => m[1] ?? "")
			: entryMatches.map((m) => m[1] ?? "");
	const items = blocks.map(parseItemBlock);

	return {
		title,
		description,
		link,
		...(lastBuildDate && { lastBuildDate }),
		items,
	};
}

/**
 * Parse RSS/Atom feed from URL. Tier-1380 hardened:
 * - User-Agent always set
 * - AbortSignal.timeout(timeoutMs) (default 10s)
 * - try/catch + parsererror check
 * - Returns feed + audit (fetchTimeMs, sizeBytes, parseTimeMs)
 */
export async function parseRSS(
	url: string,
	options: ParseRSSOptions = {},
): Promise<RSSFeedResult> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const t0 =
		typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function"
			? Bun.nanoseconds()
			: Date.now() * 1e6;

	let text: string;
	let fromCache = false;

	if (options.cacheDir && typeof Bun !== "undefined") {
		const result = await fetchWithFileCache(
			url,
			options.cacheDir,
			options.cacheKey,
			timeoutMs,
		);
		text = result.body;
		fromCache = result.fromCache;
	} else {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			redirect: "follow",
			signal: AbortSignal.timeout(timeoutMs),
		});

		if (!res.ok) {
			throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
		}

		text = await res.text();
	}

	const t1 =
		typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function"
			? Bun.nanoseconds()
			: Date.now() * 1e6;
	const fetchTimeMs = (t1 - t0) / 1e6;
	const sizeBytes = new TextEncoder().encode(text).length;

	let feed: RSSFeed;
	const parseT0 =
		typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function"
			? Bun.nanoseconds()
			: Date.now() * 1e6;
	try {
		feed = parseFeedFromText(text);
	} catch (err) {
		throw err instanceof Error ? err : new Error(String(err));
	}
	const parseT1 =
		typeof Bun !== "undefined" && typeof Bun.nanoseconds === "function"
			? Bun.nanoseconds()
			: Date.now() * 1e6;
	const parseTimeMs = (parseT1 - parseT0) / 1e6;

	const audit: RSSFeedAudit = {
		fetchTimeMs,
		sizeBytes,
		parseTimeMs,
		...(fromCache && { fromCache }),
	};
	options.onAudit?.(audit);

	return { feed, audit };
}

/** Legacy: parseRSS returning only feed (no audit). Uses hardened parseRSS then returns .feed. */
export async function parseRSSLegacy(url: string): Promise<RSSFeed> {
	const { feed } = await parseRSS(url);
	return feed;
}

/** File cache entry (ETag, Last-Modified, body). */
interface CacheEntry {
	etag?: string;
	lastModified?: string;
	body: string;
}

async function fetchWithFileCache(
	url: string,
	cacheDir: string,
	cacheKey: string | undefined,
	timeoutMs: number,
): Promise<{ body: string; fromCache: boolean }> {
	const key = cacheKey ?? url.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120);
	const cachePath = `${cacheDir}/${key}.json`;

	let previous: CacheEntry | null = null;
	try {
		const file = Bun.file(cachePath);
		if (await file.exists()) {
			previous = (await file.json()) as CacheEntry;
		}
	} catch {
		previous = null;
	}

	const headers: Record<string, string> = { "User-Agent": USER_AGENT };
	if (previous?.etag) headers["If-None-Match"] = previous.etag;
	if (previous?.lastModified) headers["If-Modified-Since"] = previous.lastModified;

	const res = await fetch(url, {
		headers,
		redirect: "follow",
		signal: AbortSignal.timeout(timeoutMs),
	});

	if (res.status === 304 && previous) {
		return { body: previous.body, fromCache: true };
	}

	if (!res.ok) {
		throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
	}

	const body = await res.text();
	const etag = res.headers.get("etag") ?? undefined;
	const lastModified = res.headers.get("last-modified") ?? undefined;

	try {
		await Bun.write(cachePath, JSON.stringify({ etag, lastModified, body }));
	} catch {
		// cache write best-effort
	}

	return { body, fromCache: false };
}
