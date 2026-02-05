/**
 * Frontmatter key normalization and type coercion
 * Converts common fields to consistent types and formats
 */

export interface NormalizationOptions {
	/** Convert date fields to ISO 8601 (default: true) */
	normalizeDates?: boolean;
	/** Coerce tags/categories to arrays (default: true) */
	coerceArrays?: boolean;
	/** Map SEO keys like title → meta.title (default: false) */
	seoMapping?: boolean;
	/** Coerce draft to boolean (default: true) */
	coerceDraft?: boolean;
}

const DEFAULT_OPTIONS: Required<NormalizationOptions> = {
	normalizeDates: true,
	coerceArrays: true,
	seoMapping: false,
	coerceDraft: true,
};

const DATE_FIELDS = new Set([
	"date",
	"published",
	"created",
	"updated",
	"modified",
	"publishedAt",
	"createdAt",
	"updatedAt",
]);
const ARRAY_FIELDS = new Set(["tags", "categories", "keywords", "authors"]);

/**
 * Normalize frontmatter data: date → ISO, tags → array, draft → bool, SEO mapping.
 * Returns a shallow copy — does not mutate the original.
 */
export function normalizeFrontmatter(
	data: Record<string, unknown>,
	options?: NormalizationOptions,
): Record<string, unknown> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const out: Record<string, unknown> = { ...data };

	if (opts.normalizeDates) {
		normalizeDates(out);
	}

	if (opts.coerceArrays) {
		coerceArrayFields(out);
	}

	if (opts.coerceDraft) {
		coerceDraftField(out);
	}

	if (opts.seoMapping) {
		applySeoMapping(out);
	}

	return out;
}

function normalizeDates(data: Record<string, unknown>): void {
	for (const key of Object.keys(data)) {
		if (!DATE_FIELDS.has(key)) continue;
		const val = data[key];
		if (val == null) continue;

		const parsed = val instanceof Date ? val : new Date(String(val));
		if (!Number.isNaN(parsed.getTime())) {
			data[`${key}_iso`] = parsed.toISOString();
		}
	}
}

function coerceArrayFields(data: Record<string, unknown>): void {
	for (const key of Object.keys(data)) {
		if (!ARRAY_FIELDS.has(key)) continue;
		const val = data[key];
		if (val == null) continue;

		if (typeof val === "string") {
			data[key] = val
				.split(/[\s,]+/)
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (!Array.isArray(val)) {
			data[key] = [val];
		}
	}
}

function coerceDraftField(data: Record<string, unknown>): void {
	if (!("draft" in data)) return;
	const val = data.draft;
	if (typeof val === "boolean") return;
	if (typeof val === "string") {
		data.draft = val.toLowerCase() === "true" || val === "1";
	} else if (typeof val === "number") {
		data.draft = val !== 0;
	}
}

function applySeoMapping(data: Record<string, unknown>): void {
	const meta = (data.meta as Record<string, unknown>) || {};
	let changed = false;

	if ("title" in data && !meta.title) {
		meta.title = data.title;
		changed = true;
	}
	if ("description" in data && !meta.description) {
		meta.description = data.description;
		changed = true;
	}
	if ("author" in data && !meta.author) {
		meta.author = data.author;
		changed = true;
	}
	if ("image" in data && !meta.image) {
		meta.image = data.image;
		changed = true;
	}

	if (changed) {
		data.meta = meta;
	}
}
