import {describe, expect, test} from 'bun:test';
import {
	BUN_API_CATALOG,
	BUN_SCANNER_APIS,
	formatDocUrl,
	filterBy,
	apiCount,
	colorize,
	renderStatus,
	renderSurface,
	renderScanner,
	BunApiMatrixRenderer,
	type BunApiCategory,
	type BunApiStatus,
	type BunApiSurface,
} from './bun-api-matrix';

const ALL_CATEGORIES: BunApiCategory[] = [
	'HTTP & Networking',
	'Shell & Process',
	'File I/O',
	'Build & Bundling',
	'Hashing & Security',
	'Databases',
	'Compression',
	'Utilities',
	'Streaming',
	'Advanced',
	'Semver',
	'Routing',
];

describe('BUN_API_CATALOG', () => {
	test('all 12 categories are present', () => {
		const found = new Set(BUN_API_CATALOG.map(e => e.category));
		for (const cat of ALL_CATEGORIES) {
			expect(found.has(cat)).toBe(true);
		}
		expect(found.size).toBe(12);
	});

	test('no duplicate API names', () => {
		const names = BUN_API_CATALOG.map(e => e.api);
		expect(new Set(names).size).toBe(names.length);
	});

	test('all entries have non-empty api, category, topic, type, and docUrl', () => {
		for (const entry of BUN_API_CATALOG) {
			expect(entry.api.length).toBeGreaterThan(0);
			expect(entry.category.length).toBeGreaterThan(0);
			expect(entry.topic.length).toBeGreaterThan(0);
			expect(entry.type.length).toBeGreaterThan(0);
			expect(entry.docUrl.length).toBeGreaterThan(0);
		}
	});

	test('all docUrls start with https://bun.com/docs (canonical base)', () => {
		for (const entry of BUN_API_CATALOG) {
			expect(entry.docUrl.startsWith('https://bun.com/docs')).toBe(true);
		}
	});

	test('count matches apiCount()', () => {
		expect(BUN_API_CATALOG.length).toBe(apiCount());
	});

	test('protocol is non-empty only for network-related APIs', () => {
		const withProtocol = BUN_API_CATALOG.filter(e => e.protocol !== '');
		for (const entry of withProtocol) {
			expect(['HTTP', 'TCP', 'UDP', 'WebSocket', 'DNS']).toContain(entry.protocol);
		}
		expect(withProtocol.length).toBeGreaterThan(0);
	});

	test('all HTTP & Networking entries have a protocol', () => {
		const networking = BUN_API_CATALOG.filter(e => e.category === 'HTTP & Networking');
		for (const entry of networking) {
			expect(entry.protocol.length).toBeGreaterThan(0);
		}
	});

	test('type field uses known kind prefixes', () => {
		const validKinds = [
			'function',
			'class',
			'const',
			'namespace',
			'module',
			'object',
			'tagged template',
			'method',
			'getter',
		];
		for (const entry of BUN_API_CATALOG) {
			const matchesKind = validKinds.some(k => entry.type.startsWith(k));
			expect(matchesKind).toBe(true);
		}
	});

	test('topics match official Bun docs groupings', () => {
		const knownTopics = new Set([
			'HTTP Server',
			'TCP Sockets',
			'UDP Sockets',
			'WebSockets',
			'DNS',
			'Shell',
			'Child Processes',
			'File I/O',
			'Bundler',
			'Transpiler',
			'Routing',
			'Module Loaders',
			'Hashing',
			'System & Environment',
			'SQLite',
			'PostgreSQL Client',
			'Redis (Valkey) Client',
			'S3 Storage',
			'Compression',
			'Utilities',
			'Sleep & Timing',
			'Random & UUID',
			'Comparison & Inspection',
			'String & Text Processing',
			'Module Resolution',
			'URL & Path Utilities',
			'Memory & Buffer Management',
			'Glob',
			'Parsing & Formatting',
			'Cookies',
			'Streaming HTML',
			'Stream Processing',
			'FFI',
			'Testing',
			'Workers',
			'Low-level / Internals',
			'Node-API',
			'import.meta',
			'URL Pattern Matching',
		]);
		for (const entry of BUN_API_CATALOG) {
			expect(knownTopics.has(entry.topic)).toBe(true);
		}
	});

	test('status is a valid BunApiStatus', () => {
		const validStatuses: BunApiStatus[] = ['stable', 'new', 'experimental'];
		for (const entry of BUN_API_CATALOG) {
			expect(validStatuses).toContain(entry.status);
		}
	});

	test('surface is 1, 2, or 3', () => {
		const validSurfaces: BunApiSurface[] = [1, 2, 3];
		for (const entry of BUN_API_CATALOG) {
			expect(validSurfaces).toContain(entry.surface);
		}
	});

	test('all three status values are represented', () => {
		const statuses = new Set(BUN_API_CATALOG.map(e => e.status));
		expect(statuses).toEqual(new Set(['stable', 'new', 'experimental']));
	});

	test('all three surface levels are represented', () => {
		const surfaces = new Set(BUN_API_CATALOG.map(e => e.surface));
		expect(surfaces).toEqual(new Set([1, 2, 3]));
	});
});

describe('BUN_SCANNER_APIS', () => {
	test('known APIs are present', () => {
		expect(BUN_SCANNER_APIS.has('Bun.hash')).toBe(true);
		expect(BUN_SCANNER_APIS.has('Bun.semver')).toBe(true);
	});

	test('every entry exists in the catalog', () => {
		const catalogApis = new Set(BUN_API_CATALOG.map(e => e.api));
		for (const api of BUN_SCANNER_APIS) {
			expect(catalogApis.has(api)).toBe(true);
		}
	});
});

describe('colorize', () => {
	const COLORIZE_CASES: [string, string, boolean][] = [
		//  text     hsl input                  expect ANSI?
		['test', 'hsl(140, 70%, 40%)', true], // green
		['test', 'hsl(210, 80%, 55%)', true], // blue
		['test', 'hsl(40, 90%, 50%)', true], // amber
		['test', 'hsl(270, 60%, 55%)', true], // purple
		['test', 'hsl(0, 0%, 30%)', true], // gray
		['test', 'not-a-color', false], // invalid → plain
		['test', '', false], // empty → plain
	];

	test.each(COLORIZE_CASES)('case colorize(%s, %s) → ansi=%s', (text, hsl, expectAnsi) => {
		const result = colorize(text, hsl);
		expect(result).toContain(text);
		if (expectAnsi) {
			expect(result).toContain('\x1b[');
			expect(result).toEndWith('\x1b[0m');
			expect(result.length).toBeGreaterThan(text.length);
		} else {
			expect(result).toBe(text);
		}
	});
});

describe('renderStatus', () => {
	const STATUS_CASES: [BunApiStatus, string, string, number][] = [
		//  status            symbol    label              codepoint
		['stable', '\u25cf', 'green circle', 0x25cf],
		['new', '\u25c6', 'blue diamond', 0x25c6],
		['experimental', '\u25d0', 'amber half-circle', 0x25d0],
	];

	test.each(STATUS_CASES)('case %s → %s (%s)', (status, symbol, _label, codepoint) => {
		const raw = renderStatus(status);
		const stripped = Bun.stripANSI(raw);

		// Symbol + space + status label
		expect(stripped).toBe(`${symbol} ${status}`);
		// Correct codepoint
		expect(symbol.codePointAt(0)).toBe(codepoint);
		// ANSI envelope
		expect(raw).toContain('\x1b[');
		expect(raw).toEndWith('\x1b[0m');
		expect(raw.length).toBeGreaterThan(stripped.length);
	});

	test('each status has a unique symbol', () => {
		const symbols = STATUS_CASES.map(([, s]) => s);
		expect(new Set(symbols).size).toBe(3);
	});

	test('every catalog entry renders a valid status', () => {
		const validSymbols = new Set(STATUS_CASES.map(([, s]) => s));
		for (const entry of BUN_API_CATALOG) {
			const stripped = Bun.stripANSI(renderStatus(entry.status));
			expect(validSymbols.has(stripped.charAt(0))).toBe(true);
			expect(stripped).toContain(entry.status);
		}
	});
});

describe('renderSurface', () => {
	const FILLED = '\u25aa'; // ▪ U+25AA small filled square
	const EMPTY = '\u25ab'; // ▫ U+25AB small empty square

	const SURFACE_CASES: [BunApiSurface, string][] = [
		//  level   expected stripped output
		[1, `${FILLED}${EMPTY}${EMPTY}`],
		[2, `${FILLED}${FILLED}${EMPTY}`],
		[3, `${FILLED}${FILLED}${FILLED}`],
	];

	test.each(SURFACE_CASES)('case surface %i → %s', (level, expected) => {
		const raw = renderSurface(level);
		const stripped = Bun.stripANSI(raw);

		expect(stripped).toBe(expected);
		expect(stripped.length).toBe(3);
		// Filled count matches level
		expect([...stripped].filter(c => c === FILLED).length).toBe(level);
		// ANSI coloring present on both segments
		expect((raw.match(/\x1b\[/g) || []).length).toBeGreaterThanOrEqual(2);
	});

	test('filled U+25AA and empty U+25AB are distinct', () => {
		expect(FILLED.codePointAt(0)).toBe(0x25aa);
		expect(EMPTY.codePointAt(0)).toBe(0x25ab);
		expect(FILLED).not.toBe(EMPTY);
	});

	test('every catalog entry renders a valid 3-glyph surface bar', () => {
		const validGlyphs = new Set([FILLED, EMPTY]);
		for (const entry of BUN_API_CATALOG) {
			const stripped = Bun.stripANSI(renderSurface(entry.surface));
			expect(stripped.length).toBe(3);
			for (const ch of stripped) {
				expect(validGlyphs.has(ch)).toBe(true);
			}
			expect([...stripped].filter(c => c === FILLED).length).toBe(entry.surface);
		}
	});
});

describe('renderScanner', () => {
	const SCANNER_CASES: [boolean, string, string, number][] = [
		//  used     symbol    label        codepoint
		[true, '\u2713', 'checkmark', 0x2713],
		[false, '\u00b7', 'dot', 0x00b7],
	];

	test.each(SCANNER_CASES)('case used=%s → %s (%s)', (used, symbol, _label, codepoint) => {
		const raw = renderScanner(used);
		const stripped = Bun.stripANSI(raw);

		expect(stripped).toBe(symbol);
		expect(stripped.length).toBe(1);
		expect(symbol.codePointAt(0)).toBe(codepoint);
		// ANSI envelope
		expect(raw).toContain('\x1b[');
		expect(raw).toEndWith('\x1b[0m');
		expect(raw.length).toBeGreaterThan(stripped.length);
	});

	test('symbols are distinct', () => {
		expect(SCANNER_CASES[0][1]).not.toBe(SCANNER_CASES[1][1]);
	});

	test('BUN_SCANNER_APIS entries render \u2713, non-used render \u00b7', () => {
		for (const entry of BUN_API_CATALOG) {
			const used = BUN_SCANNER_APIS.has(entry.api);
			const stripped = Bun.stripANSI(renderScanner(used));
			expect(stripped).toBe(used ? '\u2713' : '\u00b7');
		}
	});
});

describe('formatDocUrl', () => {
	test('short URL returned unchanged', () => {
		const url = 'https://bun.com/docs/api/http';
		expect(formatDocUrl(url)).toBe(url);
	});

	test('long URL truncated with ellipsis', () => {
		const url = 'https://bun.com/docs/api/some-very-long-path-that-exceeds-default-max-length';
		const result = formatDocUrl(url);
		expect(result.length).toBe(48);
		expect(result.endsWith('\u2026')).toBe(true);
	});

	test('explicit large maxLen preserves full URL', () => {
		const url = 'https://bun.com/docs/api/some-very-long-path-that-exceeds-default-max-length';
		expect(formatDocUrl(url, 200)).toBe(url);
	});
});

describe('filterBy', () => {
	test('correct count for HTTP & Networking category', () => {
		const result = filterBy(BUN_API_CATALOG, 'category', 'HTTP & Networking');
		expect(result.length).toBe(9);
	});

	test('empty for invalid category', () => {
		const result = filterBy(BUN_API_CATALOG, 'category', 'Nonexistent' as BunApiCategory);
		expect(result.length).toBe(0);
	});

	test('correct count for DNS topic', () => {
		const result = filterBy(BUN_API_CATALOG, 'topic', 'DNS');
		expect(result.length).toBe(3);
	});

	test('correct count for Compression topic', () => {
		const result = filterBy(BUN_API_CATALOG, 'topic', 'Compression');
		expect(result.length).toBe(9);
	});

	test('empty for nonexistent topic', () => {
		const result = filterBy(BUN_API_CATALOG, 'topic', 'Nonexistent');
		expect(result.length).toBe(0);
	});
});

describe('Unicode symbol system', () => {
	// Full glyph palette: [name, glyph, codepoint, unicode block low, unicode block high]
	const GLYPH_CASES: [string, string, number, number, number][] = [
		['statusStable', '\u25cf', 0x25cf, 0x25a0, 0x25ff], // ● Geometric Shapes
		['statusNew', '\u25c6', 0x25c6, 0x25a0, 0x25ff], // ◆ Geometric Shapes
		['statusExperimental', '\u25d0', 0x25d0, 0x25a0, 0x25ff], // ◐ Geometric Shapes
		['surfaceFilled', '\u25aa', 0x25aa, 0x25a0, 0x25ff], // ▪ Geometric Shapes
		['surfaceEmpty', '\u25ab', 0x25ab, 0x25a0, 0x25ff], // ▫ Geometric Shapes
		['scannerUsed', '\u2713', 0x2713, 0x2700, 0x27bf], // ✓ Dingbats
		['scannerUnused', '\u00b7', 0x00b7, 0x0080, 0x00ff], // · Latin-1 Supplement
		['urlTruncated', '\u2026', 0x2026, 0x2000, 0x206f], // … General Punctuation
	];

	test.each(GLYPH_CASES)('case %s → %s (U+%s) in block [%s, %s]', (name, glyph, codepoint, blockLow, blockHigh) => {
		// Single BMP character
		expect(glyph.length).toBe(1);
		expect(glyph.codePointAt(0)).toBe(codepoint);
		// Within expected Unicode block
		expect(codepoint).toBeGreaterThanOrEqual(blockLow);
		expect(codepoint).toBeLessThanOrEqual(blockHigh);
		// Terminal width = 1 column
		expect(Bun.stringWidth(glyph)).toBe(1);
	});

	test('all 8 glyphs have distinct codepoints', () => {
		const codepoints = GLYPH_CASES.map(([, , cp]) => cp);
		expect(new Set(codepoints).size).toBe(8);
	});

	test('full catalog renders consistently with all glyph types', () => {
		const validStatusSymbols = new Set(GLYPH_CASES.slice(0, 3).map(([, g]) => g));
		const validSurfaceSymbols = new Set(GLYPH_CASES.slice(3, 5).map(([, g]) => g));
		const validScannerSymbols = new Set(GLYPH_CASES.slice(5, 7).map(([, g]) => g));

		for (const entry of BUN_API_CATALOG) {
			const statusStripped = Bun.stripANSI(renderStatus(entry.status));
			expect(validStatusSymbols.has(statusStripped.charAt(0))).toBe(true);

			const surfaceStripped = Bun.stripANSI(renderSurface(entry.surface));
			for (const ch of surfaceStripped) {
				expect(validSurfaceSymbols.has(ch)).toBe(true);
			}

			const scannerStripped = Bun.stripANSI(renderScanner(BUN_SCANNER_APIS.has(entry.api)));
			expect(validScannerSymbols.has(scannerStripped)).toBe(true);
		}
	});
});

describe('BunApiMatrixRenderer', () => {
	const renderer = new BunApiMatrixRenderer();

	test('render() with no options does not throw', () => {
		expect(() => renderer.render()).not.toThrow();
	});

	test('render() with category filter does not throw', () => {
		expect(() => renderer.render({category: 'Hashing & Security'})).not.toThrow();
	});

	test('render() with topic filter does not throw', () => {
		expect(() => renderer.render({topic: 'DNS'})).not.toThrow();
	});

	test('render() with every category individually does not throw', () => {
		for (const category of ALL_CATEGORIES) {
			expect(() => renderer.render({category})).not.toThrow();
		}
	});
});
