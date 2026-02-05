export type StatusKey =
	| 'critical'
	| 'failed'
	| 'error'
	| 'warning'
	| 'success'
	| 'stable'
	| 'pending'
	| 'neutral'
	| 'unknown'
	| 'skip'
	| 'info'
	| 'audit'
	| 'fix'
	| 'done';

export type HslTuple = [h: number, s: number, l: number];

export const BUN_STATUS_GLYPHS: Record<StatusKey, {glyph: string; code: string; ascii: string; hsl: HslTuple}> = {
	critical: {glyph: '🔴', code: 'U+1F534', ascii: '!!', hsl: [0, 100, 50]},
	failed: {glyph: '✗', code: 'U+2717', ascii: 'FAIL', hsl: [0, 80, 45]},
	error: {glyph: '✖', code: 'U+2716', ascii: 'ERR', hsl: [0, 80, 45]},
	warning: {glyph: '⚠', code: 'U+26A0', ascii: 'WARN', hsl: [35, 100, 50]},
	success: {glyph: '✓', code: 'U+2713', ascii: 'OK', hsl: [120, 100, 40]},
	stable: {glyph: '🟢', code: 'U+1F7E2', ascii: 'OK', hsl: [140, 70, 45]},
	pending: {glyph: '○', code: 'U+25CB', ascii: '...', hsl: [200, 50, 50]},
	neutral: {glyph: '−', code: 'U+2212', ascii: '-', hsl: [0, 0, 50]},
	unknown: {glyph: '?', code: 'U+003F', ascii: '?', hsl: [0, 0, 50]},
	skip: {glyph: '⊘', code: 'U+2298', ascii: 'skip', hsl: [0, 0, 50]},
	info: {glyph: '•', code: 'U+2022', ascii: 'INFO', hsl: [200, 100, 50]},
	audit: {glyph: '◐', code: 'U+25D0', ascii: 'audit', hsl: [280, 60, 50]},
	fix: {glyph: '◉', code: 'U+25C9', ascii: 'fix', hsl: [30, 80, 50]},
	done: {glyph: '✔', code: 'U+2714', ascii: 'done', hsl: [120, 80, 45]},
};

export interface ProjectConfig {
	namespace: string;
	statusHueOffset: number;
	saturationMod: number;
	lightnessMod: number;
	useUnicode: boolean;
	glyphWidth: number;
}

const DEFAULT_PROJECT = 'com.tier1380.scanner';

export const BUN_PROJECT_PRESETS: Record<string, ProjectConfig> = {
	[DEFAULT_PROJECT]: {
		namespace: DEFAULT_PROJECT,
		statusHueOffset: 15,
		saturationMod: 0.9,
		lightnessMod: 1.0,
		useUnicode: true,
		glyphWidth: 2,
	},
	'com.tier1380.mcp': {
		namespace: 'com.tier1380.mcp',
		statusHueOffset: 200,
		saturationMod: 0.9,
		lightnessMod: 1.0,
		useUnicode: true,
		glyphWidth: 2,
	},
	'legacy.cli': {
		namespace: 'legacy.cli',
		statusHueOffset: 0,
		saturationMod: 0,
		lightnessMod: 1.0,
		useUnicode: false,
		glyphWidth: 1,
	},
};

export function getProjectConfig(namespace: string): ProjectConfig {
	if (namespace && BUN_PROJECT_PRESETS[namespace]) return BUN_PROJECT_PRESETS[namespace];
	return BUN_PROJECT_PRESETS[DEFAULT_PROJECT];
}

export function applyHsl(base: HslTuple, cfg: ProjectConfig): HslTuple {
	const h = (base[0] + cfg.statusHueOffset) % 360;
	const s = Math.min(100, Math.max(0, base[1] * cfg.saturationMod));
	const l = Math.min(100, Math.max(0, base[2] * cfg.lightnessMod));
	return [h, s, l];
}

function hslToCss([h, s, l]: HslTuple): string {
	return `hsl(${h}, ${s}%, ${l}%)`;
}

function hslToHex([h, s, l]: HslTuple): string {
	s /= 100;
	l /= 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number): string => {
		const k = (n + h / 30) % 12;
		const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(c * 255)
			.toString(16)
			.padStart(2, '0');
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateStatusColor(status: StatusKey, projectId: string): {ansi: string; css: string; hex: string} {
	const cfg = getProjectConfig(projectId);
	const entry = BUN_STATUS_GLYPHS[status];
	const hsl = applyHsl(entry.hsl, cfg);
	const css = hslToCss(hsl);
	let ansi = Bun.color(css, 'ansi');
	if (!ansi || ansi.length === 0) ansi = '\x1b[32m'; // fallback when Bun.color is no-op (e.g. no TTY)
	const hex = hslToHex(hsl);
	return {ansi, css, hex};
}

export function formatStatusCell(status: StatusKey, projectId: string, width?: number): string {
	const cfg = getProjectConfig(projectId);
	const entry = BUN_STATUS_GLYPHS[status];
	const glyph = cfg.useUnicode ? entry.glyph : entry.ascii;
	const hsl = applyHsl(entry.hsl, cfg);
	const color = Bun.color(hslToCss(hsl), 'ansi');
	let cell = `${color}${glyph}\x1b[0m`;
	if (width !== undefined) {
		const w = Bun.stringWidth(glyph);
		if (w < width) cell += ' '.repeat(width - w);
	}
	return cell;
}

const MATRIX_STATUS_KEYS: StatusKey[] = ['critical', 'error', 'warning', 'success', 'stable'];

export function generateStatusMatrix(projectId: string): Array<{
	id: number;
	status: StatusKey;
	hsl: HslTuple;
	unicode: string;
	width: number;
	codePoint: string;
	carbon: number;
	risk: number;
	project: string;
}> {
	const cfg = getProjectConfig(projectId);
	return MATRIX_STATUS_KEYS.map((status, id) => {
		const entry = BUN_STATUS_GLYPHS[status];
		const hsl = applyHsl(entry.hsl, cfg);
		const risk = (id + 1) * 0.2;
		return {
			id,
			status,
			hsl,
			unicode: entry.glyph,
			width: Bun.stringWidth(entry.glyph),
			codePoint: entry.code,
			carbon: Math.floor(risk * 10),
			risk,
			project: projectId,
		};
	});
}

export function renderUnicodeMatrix(projectId: string): string {
	const matrix = generateStatusMatrix(projectId);
	const lines = matrix.map(m => `${m.unicode} ${m.status} ${m.codePoint}`).join('\n');
	return lines;
}
