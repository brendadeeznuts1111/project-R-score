// doc-cross-reference.test.ts
import {test, expect, describe} from 'bun:test';
import {
	BUN_API_PROVENANCE,
	BUN_PERF_ANNOTATIONS,
	BUN_RELATED_APIS,
	BUN_SEARCH_KEYWORDS,
	DocLinkGenerator,
	DocumentationScanner,
	type DocLink,
	type DocSearchResult,
	type DocCoverageReport,
	type PerfAnnotation,
} from './doc-cross-reference';
import {BUN_API_CATALOG, apiCount} from './bun-api-matrix';

const generator = new DocLinkGenerator();
const scanner = new DocumentationScanner();
const catalogApis = new Set(BUN_API_CATALOG.map(e => e.api));

// ═══════════════════════════════════════════════════════════════
// BUN_API_PROVENANCE
// ═══════════════════════════════════════════════════════════════

describe('BUN_API_PROVENANCE', () => {
	test('has entries for core APIs', () => {
		expect(BUN_API_PROVENANCE['Bun.serve']).toBe('<1.2');
		expect(BUN_API_PROVENANCE['Bun.file']).toBe('<1.2');
		expect(BUN_API_PROVENANCE['Bun.spawn']).toBe('<1.2');
		expect(BUN_API_PROVENANCE['bun:sqlite']).toBe('<1.2');
	});

	test('has entries for 1.2.0 APIs', () => {
		expect(BUN_API_PROVENANCE['Bun.sql']).toBe('1.2.0');
		expect(BUN_API_PROVENANCE['Bun.S3Client']).toBe('1.2.0');
		expect(BUN_API_PROVENANCE['Bun.color']).toBe('1.2.0');
	});

	test('has entries for 1.3.x APIs', () => {
		expect(BUN_API_PROVENANCE['Bun.redis']).toBe('1.3.0');
		expect(BUN_API_PROVENANCE['URLPattern']).toBe('1.3.4');
		expect(BUN_API_PROVENANCE['Bun.Terminal']).toBe('1.3.5');
		expect(BUN_API_PROVENANCE['Bun.Archive']).toBe('1.3.6');
		expect(BUN_API_PROVENANCE['Bun.markdown']).toBe('1.3.8');
	});

	test('has provenance entries', () => {
		expect(Object.keys(BUN_API_PROVENANCE).length).toBeGreaterThan(0);
	});

	test('all provenance APIs exist in catalog', () => {
		const missing: string[] = [];
		for (const api of Object.keys(BUN_API_PROVENANCE)) {
			if (!catalogApis.has(api)) missing.push(api);
		}
		expect(missing).toEqual([]);
	});

	test('valid version strings', () => {
		const validVersions = /^(<1\.2|1\.\d+\.\d+)$/;
		for (const version of Object.values(BUN_API_PROVENANCE)) {
			expect(version).toMatch(validVersions);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// BUN_RELATED_APIS
// ═══════════════════════════════════════════════════════════════

describe('BUN_RELATED_APIS', () => {
	test('has related API entries', () => {
		expect(Object.keys(BUN_RELATED_APIS).length).toBeGreaterThan(0);
	});

	test('all source APIs exist in catalog', () => {
		const missing: string[] = [];
		for (const api of Object.keys(BUN_RELATED_APIS)) {
			if (!catalogApis.has(api)) missing.push(api);
		}
		expect(missing).toEqual([]);
	});

	test('all target APIs exist in catalog', () => {
		const missing: string[] = [];
		for (const [source, targets] of Object.entries(BUN_RELATED_APIS)) {
			for (const target of targets) {
				if (!catalogApis.has(target)) missing.push(`${source} -> ${target}`);
			}
		}
		expect(missing).toEqual([]);
	});

	test('no self-references', () => {
		for (const [api, related] of Object.entries(BUN_RELATED_APIS)) {
			expect(related).not.toContain(api);
		}
	});

	test('key relationships are bidirectional', () => {
		for (const [a, b] of [
			['Bun.serve', 'Bun.fetch'],
			['Bun.spawn', 'Bun.spawnSync'],
			['Bun.gzipSync', 'Bun.gunzipSync'],
			['Bun.file', 'Bun.write'],
		]) {
			expect(BUN_RELATED_APIS[a]).toContain(b);
			expect(BUN_RELATED_APIS[b]).toContain(a);
		}
	});

	test('each entry has 1-5 related APIs', () => {
		for (const [api, related] of Object.entries(BUN_RELATED_APIS)) {
			expect(related.length).toBeGreaterThanOrEqual(1);
			expect(related.length).toBeLessThanOrEqual(5);
		}
	});

	test('no duplicate targets per API', () => {
		for (const [api, related] of Object.entries(BUN_RELATED_APIS)) {
			expect(new Set(related).size).toBe(related.length);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// BUN_SEARCH_KEYWORDS
// ═══════════════════════════════════════════════════════════════

describe('BUN_SEARCH_KEYWORDS', () => {
	test('has keyword entries', () => {
		expect(Object.keys(BUN_SEARCH_KEYWORDS).length).toBeGreaterThan(0);
	});

	test('all keyword APIs exist in catalog', () => {
		const missing: string[] = [];
		for (const api of Object.keys(BUN_SEARCH_KEYWORDS)) {
			if (!catalogApis.has(api)) missing.push(api);
		}
		expect(missing).toEqual([]);
	});

	test('each entry has 2-10 keywords', () => {
		for (const [api, keywords] of Object.entries(BUN_SEARCH_KEYWORDS)) {
			expect(keywords.length).toBeGreaterThanOrEqual(2);
			expect(keywords.length).toBeLessThanOrEqual(10);
		}
	});

	test('all keywords are lowercase', () => {
		for (const keywords of Object.values(BUN_SEARCH_KEYWORDS)) {
			for (const kw of keywords) {
				expect(kw).toBe(kw.toLowerCase());
			}
		}
	});

	test('no duplicate keywords per API', () => {
		for (const [api, keywords] of Object.entries(BUN_SEARCH_KEYWORDS)) {
			expect(new Set(keywords).size).toBe(keywords.length);
		}
	});

	test('expected keywords present', () => {
		expect(BUN_SEARCH_KEYWORDS['Bun.serve']).toContain('http');
		expect(BUN_SEARCH_KEYWORDS['Bun.serve']).toContain('server');
		expect(BUN_SEARCH_KEYWORDS['bun:sqlite']).toContain('sqlite');
		expect(BUN_SEARCH_KEYWORDS['bun:sqlite']).toContain('database');
		expect(BUN_SEARCH_KEYWORDS['Bun.hash']).toContain('hash');
		expect(BUN_SEARCH_KEYWORDS['HTMLRewriter']).toContain('html');
	});
});

// ═══════════════════════════════════════════════════════════════
// BUN_PERF_ANNOTATIONS
// ═══════════════════════════════════════════════════════════════

describe('BUN_PERF_ANNOTATIONS', () => {
	test('has annotation entries', () => {
		expect(Object.keys(BUN_PERF_ANNOTATIONS).length).toBeGreaterThan(0);
	});

	test('all annotated APIs exist in catalog', () => {
		const missing: string[] = [];
		for (const api of Object.keys(BUN_PERF_ANNOTATIONS)) {
			if (!catalogApis.has(api)) missing.push(api);
		}
		expect(missing).toEqual([]);
	});

	test('every annotation has required fields', () => {
		for (const [api, annotations] of Object.entries(BUN_PERF_ANNOTATIONS)) {
			expect(annotations.length).toBeGreaterThan(0);
			for (const a of annotations) {
				expect(a.version.length).toBeGreaterThan(0);
				expect(a.change.length).toBeGreaterThan(0);
				expect(a.impact.length).toBeGreaterThan(0);
			}
		}
	});

	test('Bun.spawnSync has close_range annotation for 1.3.6', () => {
		const annotations = BUN_PERF_ANNOTATIONS['Bun.spawnSync'];
		expect(annotations).toBeDefined();
		expect(annotations.length).toBeGreaterThanOrEqual(1);
		const fix = annotations.find(a => a.version === '1.3.6');
		expect(fix).toBeDefined();
		expect(fix!.change).toContain('close_range');
		expect(fix!.impact).toContain('30x');
		expect(fix!.contributor).toBe('@sqdshguy');
		expect(fix!.ref).toContain('bun.com/blog/bun-v1.3.6');
	});

	test('Bun.spawn shares the close_range annotation', () => {
		const annotations = BUN_PERF_ANNOTATIONS['Bun.spawn'];
		expect(annotations).toBeDefined();
		const fix = annotations.find(a => a.version === '1.3.6');
		expect(fix).toBeDefined();
		expect(fix!.change).toContain('close_range');
	});

	test('Bun.hash has crc32 SIMD annotation for 1.3.6', () => {
		const annotations = BUN_PERF_ANNOTATIONS['Bun.hash'];
		expect(annotations).toBeDefined();
		const fix = annotations.find(a => a.version === '1.3.6');
		expect(fix).toBeDefined();
		expect(fix!.impact).toContain('20x');
	});

	test('valid version strings in all annotations', () => {
		const validVersions = /^(<1\.2|1\.\d+\.\d+)$/;
		for (const annotations of Object.values(BUN_PERF_ANNOTATIONS)) {
			for (const a of annotations) {
				expect(a.version).toMatch(validVersions);
			}
		}
	});

	test('ref URLs are valid when present', () => {
		for (const annotations of Object.values(BUN_PERF_ANNOTATIONS)) {
			for (const a of annotations) {
				if (a.ref) {
					expect(a.ref).toStartWith('https://');
				}
			}
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// DocLinkGenerator
// ═══════════════════════════════════════════════════════════════

describe('DocLinkGenerator', () => {
	describe('getDocLink', () => {
		test('returns enriched doc link for known API', () => {
			const link = generator.getDocLink('Bun.serve');
			expect(link).not.toBeNull();
			expect(link!.api).toBe('Bun.serve');
			expect(link!.docUrl).toContain('bun.com/docs');
			expect(link!.related.length).toBeGreaterThan(0);
			expect(link!.keywords.length).toBeGreaterThan(0);
			expect(link!.since).toBe('<1.2');
			expect(link!.category).toBe('HTTP & Networking');
			expect(link!.perf).toBeInstanceOf(Array);
		});

		test('perf annotations populated for annotated APIs', () => {
			const link = generator.getDocLink('Bun.spawnSync');
			expect(link).not.toBeNull();
			expect(link!.perf.length).toBeGreaterThan(0);
			expect(link!.perf[0].version).toBe('1.3.6');
			expect(link!.perf[0].change).toContain('close_range');
		});

		test('perf is empty array for non-annotated APIs', () => {
			const link = generator.getDocLink('Bun.sleep');
			expect(link).not.toBeNull();
			expect(link!.perf).toEqual([]);
		});

		test('returns null for unknown API', () => {
			expect(generator.getDocLink('Bun.doesNotExist')).toBeNull();
		});

		test('includes provenance for new APIs', () => {
			const link = generator.getDocLink('Bun.sql');
			expect(link).not.toBeNull();
			expect(link!.since).toBe('1.2.0');
		});

		test('related array is consistent across calls', () => {
			const link1 = generator.getDocLink('Bun.serve');
			const link2 = generator.getDocLink('Bun.serve');
			expect(link1!.related).toEqual(link2!.related);
		});
	});

	describe('search', () => {
		test('finds APIs by exact name', () => {
			const results = generator.search('Bun.serve');
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].api).toBe('Bun.serve');
			expect(results[0].matchedOn).toContain('api');
		});

		test('finds APIs by keyword', () => {
			const results = generator.search('sqlite');
			const apis = results.map(r => r.api);
			expect(apis).toContain('bun:sqlite');
		});

		test('finds APIs by topic', () => {
			const results = generator.search('hashing');
			expect(results.length).toBeGreaterThan(0);
			expect(results.some(r => r.matchedOn.includes('topic'))).toBe(true);
		});

		test('finds APIs by category', () => {
			const results = generator.search('compression');
			expect(results.length).toBeGreaterThan(0);
			expect(results.some(r => r.matchedOn.includes('category'))).toBe(true);
		});

		test('results are sorted by score descending', () => {
			const results = generator.search('stream');
			for (let i = 1; i < results.length; i++) {
				expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
			}
		});

		test('empty query returns empty', () => {
			expect(generator.search('')).toEqual([]);
			expect(generator.search('   ')).toEqual([]);
		});

		test('multi-word query matches multiple keywords', () => {
			const results = generator.search('http server');
			expect(results.length).toBeGreaterThan(0);
			// Bun.serve should score high since it matches both "http" and "server"
			expect(results[0].api).toBe('Bun.serve');
		});
	});

	describe('getRelated', () => {
		test('returns related BunApiEntry objects', () => {
			const related = generator.getRelated('Bun.serve');
			expect(related.length).toBeGreaterThan(0);
			expect(related[0]).toHaveProperty('api');
			expect(related[0]).toHaveProperty('category');
			expect(related[0]).toHaveProperty('docUrl');
		});

		test('returns empty for unknown API', () => {
			expect(generator.getRelated('Bun.nope')).toEqual([]);
		});

		test('returns empty for API without related entries', () => {
			// Find an API that isn't in BUN_RELATED_APIS
			const allRelated = new Set(Object.keys(BUN_RELATED_APIS));
			const unlinked = BUN_API_CATALOG.find(e => !allRelated.has(e.api));
			if (unlinked) {
				expect(generator.getRelated(unlinked.api)).toEqual([]);
			}
		});
	});

	describe('getByVersion', () => {
		test('returns 1.2.0 APIs', () => {
			const apis = generator.getByVersion('1.2.0');
			expect(apis.length).toBeGreaterThan(0);
			const names = apis.map(e => e.api);
			expect(names).toContain('Bun.sql');
			expect(names).toContain('Bun.color');
		});

		test('returns 1.3.4 APIs', () => {
			const apis = generator.getByVersion('1.3.4');
			const names = apis.map(e => e.api);
			expect(names).toContain('URLPattern');
			expect(names).toContain('FormData.from');
		});

		test('returns empty for unknown version', () => {
			expect(generator.getByVersion('9.9.9')).toEqual([]);
		});

		test('pre-1.2 returns core APIs', () => {
			const apis = generator.getByVersion('<1.2');
			expect(apis.length).toBeGreaterThan(30);
			const names = apis.map(e => e.api);
			expect(names).toContain('Bun.serve');
			expect(names).toContain('Bun.file');
		});
	});

	describe('render', () => {
		test('render with no options does not throw', () => {
			expect(() => generator.render()).not.toThrow();
		});

		test('render with query does not throw', () => {
			expect(() => generator.render({query: 'http'})).not.toThrow();
		});

		test('render with version does not throw', () => {
			expect(() => generator.render({version: '1.2.0'})).not.toThrow();
		});
	});
});

// ═══════════════════════════════════════════════════════════════
// DocumentationScanner
// ═══════════════════════════════════════════════════════════════

describe('DocumentationScanner', () => {
	describe('scanCode', () => {
		test('detects Bun.serve usage', () => {
			const code = 'const server = Bun.serve({ fetch(req) { return new Response("ok"); } });';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('Bun.serve');
		});

		test('detects Bun.file and Bun.write', () => {
			const code = `
        const f = Bun.file("input.txt");
        await Bun.write("output.txt", await f.text());
      `;
			const apis = scanner.scanCode(code);
			expect(apis).toContain('Bun.file');
			expect(apis).toContain('Bun.write');
		});

		test('detects bun:test import', () => {
			const code = 'import { test, expect } from "bun:test";';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('bun:test');
		});

		test('detects bun:sqlite import', () => {
			const code = 'import { Database } from "bun:sqlite";';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('bun:sqlite');
		});

		test('detects HTMLRewriter', () => {
			const code = 'const rw = new HTMLRewriter();';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('HTMLRewriter');
		});

		test('detects WebSocket', () => {
			const code = 'const ws = new WebSocket("ws://localhost");';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('WebSocket');
		});

		test('detects URLPattern', () => {
			const code = 'const p = new URLPattern("/api/:id");';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('URLPattern');
		});

		test('detects URLPattern.test and URLPattern.exec', () => {
			const code = `
        URLPattern.test("/api/123");
        URLPattern.exec("/api/456");
      `;
			const apis = scanner.scanCode(code);
			expect(apis).toContain('URLPattern.test');
			expect(apis).toContain('URLPattern.exec');
		});

		test('detects FormData.from', () => {
			const code = 'const fd = FormData.from(buffer);';
			const apis = scanner.scanCode(code);
			expect(apis).toContain('FormData.from');
		});

		test('detects multiple APIs in complex code', () => {
			const code = `
        import { Database } from "bun:sqlite";
        const server = Bun.serve({
          fetch(req) {
            const hash = Bun.hash(req.url);
            return new Response("ok");
          }
        });
        const rw = new HTMLRewriter();
      `;
			const apis = scanner.scanCode(code);
			expect(apis).toContain('bun:sqlite');
			expect(apis).toContain('Bun.serve');
			expect(apis).toContain('Bun.hash');
			expect(apis).toContain('HTMLRewriter');
		});

		test('returns sorted results', () => {
			const code = `
        Bun.write("out", "data");
        Bun.file("in");
        const ws = new WebSocket("ws://x");
      `;
			const apis = scanner.scanCode(code);
			for (let i = 1; i < apis.length; i++) {
				expect(apis[i].localeCompare(apis[i - 1])).toBeGreaterThanOrEqual(0);
			}
		});

		test('returns empty for code with no Bun APIs', () => {
			const code = 'const x = 1 + 2; console.log(x);';
			expect(scanner.scanCode(code)).toEqual([]);
		});

		test('ignores non-catalog Bun properties', () => {
			const code = 'const x = Bun.notARealApi();';
			expect(scanner.scanCode(code)).toEqual([]);
		});
	});

	describe('report', () => {
		test('generates coverage report', () => {
			const code = `
        const server = Bun.serve({ fetch() { return new Response("ok"); } });
        const text = await Bun.readableStreamToText(stream);
      `;
			const report = scanner.report('server.ts', code);
			expect(report.file).toBe('server.ts');
			expect(report.apisUsed.length).toBeGreaterThan(0);
			expect(report.coveragePercent).toBeGreaterThanOrEqual(0);
			expect(report.coveragePercent).toBeLessThanOrEqual(100);
		});

		test('100% coverage for well-documented APIs', () => {
			// Use APIs that have both BUN_RELATED_APIS and BUN_SEARCH_KEYWORDS entries
			const code = 'Bun.serve({ fetch() {} }); Bun.file("x");';
			const report = scanner.report('test.ts', code);
			expect(report.documented).toContain('Bun.serve');
			expect(report.documented).toContain('Bun.file');
			expect(report.coveragePercent).toBe(100);
		});

		test('empty file = 100% coverage', () => {
			const report = scanner.report('empty.ts', '');
			expect(report.apisUsed).toEqual([]);
			expect(report.coveragePercent).toBe(100);
		});

		test('report includes all fields', () => {
			const code = 'Bun.serve({});';
			const report = scanner.report('x.ts', code);
			expect(report).toHaveProperty('file');
			expect(report).toHaveProperty('apisUsed');
			expect(report).toHaveProperty('documented');
			expect(report).toHaveProperty('undocumented');
			expect(report).toHaveProperty('coveragePercent');
		});
	});
});

// ═══════════════════════════════════════════════════════════════
// Integration: cross-reference consistency
// ═══════════════════════════════════════════════════════════════

describe('Cross-reference consistency', () => {
	test('every catalog API with provenance is in a valid version', () => {
		const versions = new Set(['<1.2', '1.2.0', '1.3.0', '1.3.4', '1.3.5', '1.3.6', '1.3.7', '1.3.8']);
		for (const version of Object.values(BUN_API_PROVENANCE)) {
			expect(versions).toContain(version);
		}
	});

	test('provenance + related + keywords coverage > 50% of catalog', () => {
		const catalogApis = BUN_API_CATALOG.map(e => e.api);
		const covered = catalogApis.filter(
			api => BUN_API_PROVENANCE[api] || BUN_RELATED_APIS[api] || BUN_SEARCH_KEYWORDS[api],
		);
		const pct = (covered.length / catalogApis.length) * 100;
		expect(pct).toBeGreaterThan(50);
	});

	test('search for each category returns results', () => {
		const categories = [...new Set(BUN_API_CATALOG.map(e => e.category))];
		for (const cat of categories) {
			const results = generator.search(cat.toLowerCase());
			expect(results.length).toBeGreaterThan(0);
		}
	});
});
