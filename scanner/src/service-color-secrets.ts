// ── service-color-secrets.ts — Colored secret status matrix (Enhanced) ────
// Standalone CLI that renders a colored status matrix showing keychain
// secret availability per profile.
// Enhanced with Bun v1.3.7 APIs: color, stringWidth, stripANSI, escapeHTML,
// openInEditor, nanoseconds, deepEquals, Glob, TOML, resolveSync

import {
	BUN_STATUS_GLYPHS,
	formatStatusCell,
	getProjectConfig,
	applyHsl,
	type StatusKey,
} from '../cli/renderers/status-glyphs';
import {
	BUN_PROFILES_SECRET_NAMES,
	BUN_PROFILES_ENV_MAP,
	BUN_PROFILES_DEFAULT_NAMESPACE,
	deriveKeychainService,
	profileKeychainGet,
	type SecretName,
	type EnvVarName,
	type KeychainErrCode,
} from './profiles';

// ── Types ────────────────────────────────────────────────────────────────
export type SecretSource = 'keychain' | 'env' | 'missing';
export type SecretKeychainCode = 'ok' | 'empty' | KeychainErrCode;

export interface SecretStatus {
	name: SecretName;
	envVar: EnvVarName | null;
	status: StatusKey;
	source: SecretSource;
	keychainCode: SecretKeychainCode;
	maskedValue?: string;
}

export interface SecretMatrixResult {
	statuses: SecretStatus[];
	profile: string;
	namespace: string;
	durationMs: number;
	found: number;
	warning: number;
	error: number;
}

// ── Constants ────────────────────────────────────────────────────────────
export const BUN_SECRET_STATUS_COLUMNS = ['Secret', 'Status', 'Source', 'Env Var'] as const;

// ── ANSI color helpers ───────────────────────────────────────────────────
const _useColor = (() => {
	if (Bun.env.FORCE_COLOR) return true;
	if (Bun.env.NO_COLOR !== undefined) return false;
	return process.stdout.isTTY ?? false;
})();

const _wrap = (code: string) => (_useColor ? (s: string) => `\x1b[${code}m${s}\x1b[0m` : (s: string) => s);

const c = {
	bold: _wrap('1'),
	cyan: _wrap('36'),
	green: _wrap('32'),
	yellow: _wrap('33'),
	dim: _wrap('2'),
	magenta: _wrap('35'),
	red: _wrap('31'),
	reset: '\x1b[0m',
};

// ── Reverse env map: secret name → env var ───────────────────────────────
const _envBySecret = Object.fromEntries(Object.entries(BUN_PROFILES_ENV_MAP).map(([k, v]) => [v, k])) as Record<
	SecretName,
	EnvVarName
>;

// ── Status mapping ───────────────────────────────────────────────────────
const STATUS_MAP: Record<SecretSource, StatusKey> = {
	keychain: 'success',
	env: 'warning',
	missing: 'error',
};

// ── Enhanced: Bun.color HSL helpers ──────────────────────────────────────

/**
 * Generate dynamic HSL color based on profile
 * Production = green hues, Staging = yellow/orange, Dev = blue/purple
 */
function getProfileHsl(profile: string): {hue: number; sat: number; light: number} {
	switch (profile) {
		case 'production':
			return {hue: 120, sat: 80, light: 45}; // Green
		case 'staging':
			return {hue: 35, sat: 90, light: 50}; // Orange/Yellow
		case 'dev':
		default:
			return {hue: 210, sat: 70, light: 55}; // Blue
	}
}

/**
 * Apply Bun.color with HSL for dynamic theming
 */
function colorize(text: string, profile: string, type: 'header' | 'success' | 'warning' | 'error'): string {
	if (!_useColor) return text;

	const base = getProfileHsl(profile);
	let hsl: {h: number; s: number; l: number};

	switch (type) {
		case 'success':
			hsl = {h: 120, s: 80, l: 45};
			break;
		case 'warning':
			hsl = {h: 45, s: 90, l: 50};
			break;
		case 'error':
			hsl = {h: 0, s: 80, l: 50};
			break;
		case 'header':
		default:
			hsl = base;
	}

	const ansiColor = Bun.color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'ansi');
	return ansiColor ? `${ansiColor}${text}${c.reset}` : text;
}

// ── Enhanced: Project scanning with Glob + TOML ──────────────────────────

/**
 * Scan all project bunfig.toml files using Bun.Glob
 */
export async function scanProjectConfigs(rootDir = '.'): Promise<{path: string; config: Record<string, unknown>}[]> {
	const configs: {path: string; config: Record<string, unknown>}[] = [];
	const glob = new Bun.Glob('**/bunfig.toml');

	for await (const path of glob.scan(rootDir)) {
		try {
			const content = await Bun.file(path).text();
			const parsed = Bun.TOML.parse(content);
			configs.push({path, config: parsed});
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : String(e);
			console.warn(`${c.yellow}⚠ Failed to parse ${path}:${c.reset} ${Bun.escapeHTML(errorMsg)}`);
		}
	}

	return configs;
}

/**
 * Validate project configs against baseline using Bun.deepEquals
 */
export function validateProjectConfigs(
	configs: {path: string; config: Record<string, unknown>}[],
	baseline: Record<string, unknown>,
): {valid: boolean; issues: string[]} {
	const issues: string[] = [];

	for (const {path, config} of configs) {
		// Use Bun.deepEquals for deep equality comparison (same as bun:test)
		if (!Bun.deepEquals(config, baseline)) {
			// Find specific differences using custom diff
			const diffs = diffConfigs(config, baseline);
			issues.push(`${path}: ${diffs.join(', ')}`);
		}
	}

	return {valid: issues.length === 0, issues};
}

/**
 * Simple config diff to identify specific mismatches
 */
function diffConfigs(current: Record<string, unknown>, baseline: Record<string, unknown>, prefix = ''): string[] {
	const diffs: string[] = [];

	const allKeys = new Set([...Object.keys(current), ...Object.keys(baseline)]);

	for (const key of allKeys) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		const currentVal = current[key];
		const baselineVal = baseline[key];

		if (!(key in current)) {
			diffs.push(`missing ${fullKey}`);
		} else if (!(key in baseline)) {
			diffs.push(`extra ${fullKey}`);
		} else if (
			typeof currentVal === 'object' &&
			currentVal !== null &&
			typeof baselineVal === 'object' &&
			baselineVal !== null
		) {
			diffs.push(
				...diffConfigs(currentVal as Record<string, unknown>, baselineVal as Record<string, unknown>, fullKey),
			);
		} else if (currentVal !== baselineVal) {
			diffs.push(`mismatch ${fullKey}`);
		}
	}

	return diffs;
}

// ── Enhanced: Module resolution ──────────────────────────────────────────

/**
 * Safely resolve module in project directory using Bun.resolveSync
 */
export function resolveProjectModule(projectDir: string, moduleName: string): string | null {
	try {
		return Bun.resolveSync(moduleName, projectDir);
	} catch {
		return null;
	}
}

// ── Core functions ───────────────────────────────────────────────────────

export async function resolveSecretStatuses(
	profile: string,
	namespace: string = BUN_PROFILES_DEFAULT_NAMESPACE,
): Promise<SecretStatus[]> {
	const service = deriveKeychainService(profile, namespace);
	const results: SecretStatus[] = [];

	for (const secretName of BUN_PROFILES_SECRET_NAMES) {
		const envVar = _envBySecret[secretName] ?? null;
		const keychainResult = await profileKeychainGet(service, secretName);
		const keychainCode = keychainResult.ok ? (keychainResult.value ? 'ok' : 'empty') : keychainResult.code;

		let source: SecretSource;
		let maskedValue: string | undefined;

		if (keychainResult.ok && keychainResult.value) {
			source = 'keychain';
			const v = keychainResult.value;
			maskedValue = v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : '****';
		} else if (envVar && Bun.env[envVar]) {
			source = 'env';
			const v = Bun.env[envVar];
			maskedValue = v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : '****';
		} else {
			source = 'missing';
		}

		results.push({
			name: secretName,
			envVar,
			status: STATUS_MAP[source],
			source,
			keychainCode,
			maskedValue,
		});
	}

	return results;
}

// ── Enhanced: Export formats ─────────────────────────────────────────────

/**
 * Export matrix as HTML with escapeHTML for security
 */
function exportHtml(statuses: SecretStatus[], profile: string): string {
	const rows = statuses
		.map(
			s => `
		<tr>
			<td>${Bun.escapeHTML(s.name)}</td>
			<td class="${s.status}">${Bun.escapeHTML(s.status)}</td>
			<td>${Bun.escapeHTML(s.source)}</td>
			<td>${s.envVar ? Bun.escapeHTML(s.envVar) : '—'}</td>
		</tr>
	`,
		)
		.join('');

	return `<!DOCTYPE html>
<html>
<head>
	<title>Secret Status Report - ${Bun.escapeHTML(profile)}</title>
	<style>
		body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; }
		table { width: 100%; border-collapse: collapse; }
		th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
		th { background: #f5f5f5; }
		.success { color: #22c55e; }
		.warning { color: #eab308; }
		.error { color: #ef4444; }
	</style>
</head>
<body>
	<h1>Secret Status Report</h1>
	<p>Profile: <strong>${Bun.escapeHTML(profile)}</strong></p>
	<table>
		<thead>
			<tr><th>Secret</th><th>Status</th><th>Source</th><th>Env Var</th></tr>
		</thead>
		<tbody>
			${rows}
		</tbody>
	</table>
</body>
</html>`;
}

/**
 * Export as plain text using stripANSI
 */
function exportPlain(statuses: SecretStatus[]): string {
	const lines = [
		'Secret Status Matrix',
		'====================',
		'',
		...statuses.map(s => `${s.name}: ${s.status} (${s.source})`),
		'',
		`Total: ${statuses.length}`,
	];

	return Bun.stripAnsi(lines.join('\n'));
}

// ── Enhanced: Render with timing, exports, validation ────────────────────

export async function renderSecretMatrix(
	statuses: SecretStatus[],
	profile: string,
	namespace: string = BUN_PROFILES_DEFAULT_NAMESPACE,
	verbose = false,
	options: {html?: boolean; plain?: boolean; openOnError?: boolean; baseline?: SecretStatus[]} = {},
): Promise<SecretMatrixResult> {
	const startNs = Bun.nanoseconds();
	const cfg = getProjectConfig(namespace);
	const service = deriveKeychainService(profile, namespace);
	const profileHsl = getProfileHsl(profile);

	// Header with dynamic HSL coloring
	console.log(`${c.bold(colorize('🔐 Secret Status Matrix', profile, 'header'))}`);
	console.log(`${c.dim('Profile:')}   ${colorize(profile, profile, 'header')}`);
	console.log(`${c.dim('Namespace:')} ${namespace}`);
	console.log(`${c.dim('Service:')}   ${service}`);

	// Show HSL info using Bun.color
	const hslPreview = Bun.color(`hsl(${profileHsl.hue}, ${profileHsl.sat}%, ${profileHsl.light}%)`, 'ansi');
	console.log(
		`${c.dim('Theme:')}     ${hslPreview || ''}HSL(${profileHsl.hue}, ${profileHsl.sat}%, ${profileHsl.light}%)${c.reset}`,
	);
	console.log();

	// Build table rows with colored status glyphs
	const rows = statuses.map(s => {
		const base: Record<string, string> = {
			'Secret': s.name,
			'Status': formatStatusCell(s.status, cfg),
			'Source': s.source,
			'Env Var': s.envVar ? `$${s.envVar}` : c.dim('—'),
		};

		if (verbose) {
			base['Keychain'] = s.keychainCode;
			base['HSL'] = applyHsl(BUN_STATUS_GLYPHS[s.status].hsl, cfg);
			base['Value'] = s.maskedValue || c.dim('—');

			// Use stringWidth for width calculation
			const statusWidth = Bun.stringWidth(base['Status']);
			const sourceWidth = Bun.stringWidth(base['Source']);
			base['_widths'] = `${statusWidth},${sourceWidth}`;
		}

		return base;
	});

	const columns = verbose
		? [...BUN_SECRET_STATUS_COLUMNS, 'Keychain', 'HSL', 'Value']
		: [...BUN_SECRET_STATUS_COLUMNS];

	console.log(Bun.inspect.table(rows, columns, {colors: true}));

	// Summary with timing
	const found = statuses.filter(s => s.source === 'keychain').length;
	const warning = statuses.filter(s => s.source === 'env').length;
	const error = statuses.filter(s => s.source === 'missing').length;
	const total = statuses.length;

	const durationMs = (Bun.nanoseconds() - startNs) / 1e6;

	console.log();
	console.log(
		`${colorize(`${found}/${total}`, profile, found === total ? 'success' : 'warning')} secrets available ${c.dim(`(${durationMs.toFixed(2)}ms)`)}`,
	);

	if (warning > 0) {
		console.log(`${c.yellow}⚠ ${warning} secrets in env only — migrate to keychain for security${c.reset}`);
	}

	if (error > 0) {
		console.log(`${c.red}✗ ${error} secrets missing — critical issue${c.reset}`);

		// Enhanced: Open in editor on error
		if (options.openOnError) {
			console.log(`${c.dim('Opening profiles.ts for editing...')}`);
			Bun.openInEditor('./src/profiles.ts', {line: 1});
		}
	}

	// Enhanced: Compare to baseline using deepEquals
	if (options.baseline) {
		const currentStripped = statuses.map(s => ({name: s.name, source: s.source}));
		const baselineStripped = options.baseline.map(s => ({name: s.name, source: s.source}));

		if (!Bun.deepEquals(currentStripped, baselineStripped)) {
			console.log(`${c.yellow}⚠ Status differs from baseline${c.reset}`);
		}
	}

	// Enhanced: HTML export
	if (options.html) {
		const html = exportHtml(statuses, profile);
		const filename = `.audit/secrets-${profile}-${Date.now()}.html`;
		await Bun.write(filename, html);
		console.log(`${c.dim(`HTML report: ${filename}`)}`);
	}

	// Enhanced: Plain text export
	if (options.plain) {
		const plain = exportPlain(statuses);
		const filename = `.audit/secrets-${profile}-${Date.now()}.txt`;
		await Bun.write(filename, plain);
		console.log(`${c.dim(`Plain text: ${filename}`)}`);
	}

	return {
		statuses,
		profile,
		namespace,
		durationMs,
		found,
		warning,
		error,
	};
}

// ── CLI entry point ──────────────────────────────────────────────────────
if (import.meta.main) {
	const {parseArgs} = await import('node:util');
	const {values, positionals} = parseArgs({
		allowPositionals: true,
		args: Bun.argv.slice(2),
		options: {
			'profile': {type: 'string', default: 'local'},
			'namespace': {type: 'string', default: BUN_PROFILES_DEFAULT_NAMESPACE},
			'verbose': {type: 'boolean', default: false},
			'html': {type: 'boolean', default: false},
			'plain': {type: 'boolean', default: false},
			'open-on-error': {type: 'boolean', default: false},
			'scan-projects': {type: 'boolean', default: false},
		},
		strict: false,
	});

	const subcommand = positionals[0];

	if (subcommand === 'matrix') {
		const profile = String(values.profile ?? 'local');
		const namespace = String(values.namespace ?? BUN_PROFILES_DEFAULT_NAMESPACE);
		const verbose = !!values.verbose;
		const html = !!values.html;
		const plain = !!values.plain;
		const openOnError = !!(values['open-on-error'] as boolean);
		const scanProjects = !!(values['scan-projects'] as boolean);

		// Scan and render
		const statuses = await resolveSecretStatuses(profile, namespace);
		await renderSecretMatrix(statuses, profile, namespace, verbose, {
			html,
			plain,
			openOnError,
		});

		// Enhanced: Project config scanning
		if (scanProjects) {
			console.log();
			console.log(`${c.cyan}Scanning project configs...${c.reset}`);
			const configs = await scanProjectConfigs('.');
			console.log(`${c.dim(`Found ${configs.length} bunfig.toml files`)}`);

			if (configs.length > 0) {
				// Try to resolve a common module in first project
				const firstProjectDir = configs[0]?.path.replace('/bunfig.toml', '') ?? '.';
				const resolved = resolveProjectModule(firstProjectDir, 'bun');
				if (resolved) {
					console.log(`${c.dim(`Resolved bun module: ${resolved}`)}`);
				}
			}
		}
	} else {
		console.log(`${c.bold('service-color-secrets.ts')} — secret status matrix (enhanced)\n`);
		console.log('commands:');
		console.log(`  ${c.cyan('matrix')}              show secret availability matrix`);
		console.log('\noptions:');
		console.log(`  ${c.dim('--profile')}        profile name (default: local)`);
		console.log(`  ${c.dim('--namespace')}      namespace (default: ${BUN_PROFILES_DEFAULT_NAMESPACE})`);
		console.log(`  ${c.dim('--verbose')}        show keychain codes, HSL values, masked values`);
		console.log(`  ${c.dim('--html')}           export HTML report to .audit/`);
		console.log(`  ${c.dim('--plain')}          export plain text to .audit/`);
		console.log(`  ${c.dim('--open-on-error')}  open profiles.ts in editor if secrets missing`);
		console.log(`  ${c.dim('--scan-projects')}  scan project configs with Glob + TOML`);
	}
}
