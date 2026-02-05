// status-glyphs.test.ts
import {test, expect, describe} from 'bun:test';
import {
	BUN_STATUS_GLYPHS,
	BUN_PROJECT_PRESETS,
	getProjectConfig,
	applyHsl,
	generateStatusColor,
	formatStatusCell,
	generateStatusMatrix,
	renderUnicodeMatrix,
	type StatusKey,
	type ProjectConfig,
} from './status-glyphs';

const ALL_STATUS_KEYS = Object.keys(BUN_STATUS_GLYPHS) as StatusKey[];
const ALL_PROJECT_KEYS = Object.keys(BUN_PROJECT_PRESETS);

// ═══════════════════════════════════════════════════════════════
// BUN_STATUS_GLYPHS
// ═══════════════════════════════════════════════════════════════

describe('BUN_STATUS_GLYPHS', () => {
	test('has 14 entries', () => {
		expect(ALL_STATUS_KEYS.length).toBe(14);
	});

	test('all entries have non-empty glyph, code, and ascii', () => {
		for (const key of ALL_STATUS_KEYS) {
			const entry = BUN_STATUS_GLYPHS[key];
			expect(entry.glyph.length).toBeGreaterThan(0);
			expect(entry.code.length).toBeGreaterThan(0);
			expect(entry.ascii.length).toBeGreaterThan(0);
		}
	});

	test('all HSL values are in valid ranges', () => {
		for (const key of ALL_STATUS_KEYS) {
			const [h, s, l] = BUN_STATUS_GLYPHS[key].hsl;
			expect(h).toBeGreaterThanOrEqual(0);
			expect(h).toBeLessThan(360);
			expect(s).toBeGreaterThanOrEqual(0);
			expect(s).toBeLessThanOrEqual(100);
			expect(l).toBeGreaterThanOrEqual(0);
			expect(l).toBeLessThanOrEqual(100);
		}
	});

	test('code field matches U+XXXX format', () => {
		for (const key of ALL_STATUS_KEYS) {
			expect(BUN_STATUS_GLYPHS[key].code).toMatch(/^U\+[0-9A-F]{4,5}$/);
		}
	});

	test('glyph codepoints match declared code field', () => {
		for (const key of ALL_STATUS_KEYS) {
			const entry = BUN_STATUS_GLYPHS[key];
			const expectedCodepoint = parseInt(entry.code.slice(2), 16);
			expect(entry.glyph.codePointAt(0)).toBe(expectedCodepoint);
		}
	});

	test('no duplicate glyphs', () => {
		const glyphs = ALL_STATUS_KEYS.map(k => BUN_STATUS_GLYPHS[k].glyph);
		expect(new Set(glyphs).size).toBe(glyphs.length);
	});

	test('no duplicate code points', () => {
		const codes = ALL_STATUS_KEYS.map(k => BUN_STATUS_GLYPHS[k].code);
		expect(new Set(codes).size).toBe(codes.length);
	});

	test('tier 0 (critical) entries use red hue (h=0)', () => {
		for (const key of ['critical', 'error', 'failed'] as StatusKey[]) {
			expect(BUN_STATUS_GLYPHS[key].hsl[0]).toBe(0);
		}
	});

	test('tier 4 (neutral) entries use zero saturation', () => {
		for (const key of ['neutral', 'unknown', 'skip'] as StatusKey[]) {
			expect(BUN_STATUS_GLYPHS[key].hsl[1]).toBe(0);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// BUN_PROJECT_PRESETS
// ═══════════════════════════════════════════════════════════════

describe('BUN_PROJECT_PRESETS', () => {
	test('has 3 presets', () => {
		expect(ALL_PROJECT_KEYS.length).toBe(3);
	});

	test('known presets exist', () => {
		expect(BUN_PROJECT_PRESETS['com.tier1380.scanner']).toBeDefined();
		expect(BUN_PROJECT_PRESETS['com.tier1380.mcp']).toBeDefined();
		expect(BUN_PROJECT_PRESETS['legacy.cli']).toBeDefined();
	});

	test('all presets have required fields', () => {
		for (const key of ALL_PROJECT_KEYS) {
			const cfg = BUN_PROJECT_PRESETS[key];
			expect(cfg.namespace).toBe(key);
			expect(typeof cfg.statusHueOffset).toBe('number');
			expect(typeof cfg.saturationMod).toBe('number');
			expect(typeof cfg.lightnessMod).toBe('number');
			expect(typeof cfg.useUnicode).toBe('boolean');
			expect(typeof cfg.glyphWidth).toBe('number');
		}
	});

	test('saturationMod and lightnessMod are non-negative', () => {
		for (const key of ALL_PROJECT_KEYS) {
			expect(BUN_PROJECT_PRESETS[key].saturationMod).toBeGreaterThanOrEqual(0);
			expect(BUN_PROJECT_PRESETS[key].lightnessMod).toBeGreaterThanOrEqual(0);
		}
	});

	test('legacy.cli disables unicode', () => {
		expect(BUN_PROJECT_PRESETS['legacy.cli'].useUnicode).toBe(false);
	});

	test('legacy.cli uses zero saturation (grayscale)', () => {
		expect(BUN_PROJECT_PRESETS['legacy.cli'].saturationMod).toBe(0);
	});
});

// ═══════════════════════════════════════════════════════════════
// getProjectConfig
// ═══════════════════════════════════════════════════════════════

describe('getProjectConfig', () => {
	test('returns correct preset for known projects', () => {
		for (const key of ALL_PROJECT_KEYS) {
			expect(getProjectConfig(key)).toBe(BUN_PROJECT_PRESETS[key]);
		}
	});

	test('falls back to default for unknown project', () => {
		const cfg = getProjectConfig('nonexistent.project');
		expect(cfg).toBe(BUN_PROJECT_PRESETS['com.tier1380.scanner']);
	});

	test('falls back to default for empty string', () => {
		expect(getProjectConfig('')).toBe(BUN_PROJECT_PRESETS['com.tier1380.scanner']);
	});
});

// ═══════════════════════════════════════════════════════════════
// applyHsl
// ═══════════════════════════════════════════════════════════════

describe('applyHsl', () => {
	const baseCfg: ProjectConfig = {
		namespace: 'test',
		statusHueOffset: 0,
		saturationMod: 1.0,
		lightnessMod: 1.0,
		useUnicode: true,
		glyphWidth: 2,
	};

	test('identity transform with zero offset and 1.0 modifiers', () => {
		expect(applyHsl([120, 80, 50], baseCfg)).toEqual([120, 80, 50]);
	});

	test('applies hue offset', () => {
		const cfg = {...baseCfg, statusHueOffset: 30};
		expect(applyHsl([100, 80, 50], cfg)).toEqual([130, 80, 50]);
	});

	test('wraps hue past 360', () => {
		const cfg = {...baseCfg, statusHueOffset: 200};
		expect(applyHsl([200, 50, 50], cfg)).toEqual([40, 50, 50]);
	});

	test('applies saturation modifier', () => {
		const cfg = {...baseCfg, saturationMod: 0.5};
		expect(applyHsl([0, 80, 50], cfg)).toEqual([0, 40, 50]);
	});

	test('clamps saturation at 100', () => {
		const cfg = {...baseCfg, saturationMod: 2.0};
		const [, s] = applyHsl([0, 80, 50], cfg);
		expect(s).toBe(100);
	});

	test('applies lightness modifier', () => {
		const cfg = {...baseCfg, lightnessMod: 1.5};
		expect(applyHsl([0, 50, 40], cfg)).toEqual([0, 50, 60]);
	});

	test('clamps lightness at 100', () => {
		const cfg = {...baseCfg, lightnessMod: 3.0};
		const [, , l] = applyHsl([0, 50, 50], cfg);
		expect(l).toBe(100);
	});

	test('zero saturationMod produces grayscale', () => {
		const cfg = {...baseCfg, saturationMod: 0};
		const [, s] = applyHsl([120, 100, 50], cfg);
		expect(s).toBe(0);
	});
});

// ═══════════════════════════════════════════════════════════════
// generateStatusColor
// ═══════════════════════════════════════════════════════════════

describe('generateStatusColor', () => {
	test('returns ansi, css, and hex fields', () => {
		const color = generateStatusColor('success', 'com.tier1380.scanner');
		expect(typeof color.ansi).toBe('string');
		expect(typeof color.css).toBe('string');
		expect(typeof color.hex).toBe('string');
	});

	test('css is valid HSL string', () => {
		const color = generateStatusColor('warning', 'com.tier1380.scanner');
		expect(color.css).toMatch(/^hsl\(\d+\.?\d*, \d+\.?\d*%, \d+\.?\d*%\)$/);
	});

	test('hex is valid hex color', () => {
		const color = generateStatusColor('error', 'com.tier1380.scanner');
		expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
	});

	test('ansi is non-empty for chromatic colors', () => {
		const color = generateStatusColor('success', 'com.tier1380.scanner');
		expect(color.ansi.length).toBeGreaterThan(0);
	});

	test('works for all status keys', () => {
		for (const key of ALL_STATUS_KEYS) {
			const color = generateStatusColor(key, 'com.tier1380.scanner');
			expect(color.css).toContain('hsl(');
		}
	});

	test('different projects produce different HSL', () => {
		const a = generateStatusColor('success', 'com.tier1380.scanner');
		const b = generateStatusColor('success', 'com.tier1380.mcp');
		expect(a.css).not.toBe(b.css);
	});

	test('falls back for unknown project', () => {
		const color = generateStatusColor('info', 'nonexistent');
		expect(color.css).toContain('hsl(');
		expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
	});
});

// ═══════════════════════════════════════════════════════════════
// formatStatusCell
// ═══════════════════════════════════════════════════════════════

describe('formatStatusCell', () => {
	test('contains ANSI reset code', () => {
		const cell = formatStatusCell('success', 'com.tier1380.scanner');
		expect(cell).toContain('\x1b[0m');
	});

	test('uses unicode glyph when useUnicode is true', () => {
		const cell = formatStatusCell('success', 'com.tier1380.scanner');
		const stripped = Bun.stripANSI(cell).trim();
		expect(stripped).toBe(BUN_STATUS_GLYPHS.success.glyph);
	});

	test('uses ASCII fallback when useUnicode is false', () => {
		const cell = formatStatusCell('success', 'legacy.cli');
		const stripped = Bun.stripANSI(cell).trim();
		expect(stripped).toBe(BUN_STATUS_GLYPHS.success.ascii);
	});

	test('pads to requested width', () => {
		const cell = formatStatusCell('error', 'com.tier1380.scanner', 8);
		const stripped = Bun.stripANSI(cell);
		// glyph width + padding should reach at least the requested width
		expect(stripped.length).toBeGreaterThanOrEqual(8);
	});

	test('works for all status keys', () => {
		for (const key of ALL_STATUS_KEYS) {
			const cell = formatStatusCell(key, 'com.tier1380.scanner');
			expect(cell).toContain('\x1b[0m');
		}
	});

	test('falls back for unknown project', () => {
		const cell = formatStatusCell('info', 'nonexistent');
		expect(cell).toContain('\x1b[0m');
	});
});

// ═══════════════════════════════════════════════════════════════
// generateStatusMatrix
// ═══════════════════════════════════════════════════════════════

describe('generateStatusMatrix', () => {
	test('returns 5 entries', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		expect(matrix.length).toBe(5);
	});

	test('ids are sequential 0-4', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		expect(matrix.map(m => m.id)).toEqual([0, 1, 2, 3, 4]);
	});

	test('all entries have valid status keys', () => {
		const validKeys = new Set(ALL_STATUS_KEYS);
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		for (const entry of matrix) {
			expect(validKeys.has(entry.status)).toBe(true);
		}
	});

	test('HSL values are project-adjusted (not raw)', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		const cfg = BUN_PROJECT_PRESETS['com.tier1380.scanner'];
		// Scanner has hue offset 15, so adjusted hue != base hue for non-zero base hues
		const stableEntry = matrix.find(m => m.status === 'stable')!;
		const baseHue = BUN_STATUS_GLYPHS.stable.hsl[0]; // 140
		expect(stableEntry.hsl[0]).toBe((baseHue + cfg.statusHueOffset) % 360);
	});

	test('width matches Bun.stringWidth', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		for (const entry of matrix) {
			expect(entry.width).toBe(Bun.stringWidth(entry.unicode));
		}
	});

	test('unicode matches BUN_STATUS_GLYPHS glyph', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		for (const entry of matrix) {
			expect(entry.unicode).toBe(BUN_STATUS_GLYPHS[entry.status].glyph);
		}
	});

	test('codePoint matches BUN_STATUS_GLYPHS code', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		for (const entry of matrix) {
			expect(entry.codePoint).toBe(BUN_STATUS_GLYPHS[entry.status].code);
		}
	});

	test('carbon is floor(risk * 10)', () => {
		const matrix = generateStatusMatrix('com.tier1380.scanner');
		for (const entry of matrix) {
			expect(entry.carbon).toBe(Math.floor(entry.risk * 10));
		}
	});

	test('project field matches input', () => {
		for (const project of ALL_PROJECT_KEYS) {
			const matrix = generateStatusMatrix(project);
			for (const entry of matrix) {
				expect(entry.project).toBe(project);
			}
		}
	});

	test('falls back for unknown project', () => {
		const matrix = generateStatusMatrix('nonexistent');
		expect(matrix.length).toBe(5);
	});
});

// ═══════════════════════════════════════════════════════════════
// renderUnicodeMatrix
// ═══════════════════════════════════════════════════════════════

describe('renderUnicodeMatrix', () => {
	test('does not throw for known projects', () => {
		for (const project of ALL_PROJECT_KEYS) {
			expect(() => renderUnicodeMatrix(project)).not.toThrow();
		}
	});

	test('does not throw for unknown project (fallback)', () => {
		expect(() => renderUnicodeMatrix('nonexistent')).not.toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════
// Unicode width verification
// ═══════════════════════════════════════════════════════════════

describe('Unicode glyph widths', () => {
	test('emoji glyphs have width 2', () => {
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.critical.glyph)).toBe(2);
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.stable.glyph)).toBe(2);
	});

	test('BMP glyphs have width 1', () => {
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.success.glyph)).toBe(1);
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.error.glyph)).toBe(1);
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.pending.glyph)).toBe(1);
		expect(Bun.stringWidth(BUN_STATUS_GLYPHS.neutral.glyph)).toBe(1);
	});

	test('all glyphs have positive width', () => {
		for (const key of ALL_STATUS_KEYS) {
			expect(Bun.stringWidth(BUN_STATUS_GLYPHS[key].glyph)).toBeGreaterThan(0);
		}
	});
});
