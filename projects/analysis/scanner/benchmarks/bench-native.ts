/**
 * Benchmark: Bun native API replacements
 *
 * Tests Bun native APIs against their userland equivalents.
 *
 * Sections:
 *   1. Bun.stripANSI        — regex vs native ANSI stripping
 *   2. ReadableStream        — Response wrapper vs stream.text()
 *   3. Bun.fileURLToPath     — URL.pathname vs native
 *   4. Bun.wrapAnsi          — ANSI-aware word wrapping
 *   5. Bun.stringWidth       — SIMD terminal column width
 *   6. Bun.escapeHTML        — SIMD HTML entity escaping
 *   7. Bun.deepEquals        — recursive deep comparison
 *   8. Bun.inspect           — serialization + table formatting
 *   9. Bun.color             — color format conversion (hex, rgb, ansi, css, number)
 *  10. Bun.hash              — fast non-crypto hashing (xxhash64, wyhash, adler32, crc32)
 *
 * Run: bun run benchmarks/bench-native.ts
 *
 * References:
 *   - Bun.stripANSI: https://bun.com/docs/api/utils#bun-stripansi
 *   - proc.stdout.text(): https://bun.com/docs/api/spawn#reading-stdout
 *   - Bun.fileURLToPath: https://bun.com/docs/api/utils#bun-fileurltopath
 *   - Bun.wrapAnsi: https://bun.com/docs/api/utils#bun-wrapansi
 *   - Bun.stringWidth: https://bun.com/docs/api/utils#bun-stringwidth
 *   - Bun.escapeHTML: https://bun.com/docs/api/utils#bun-escapehtml
 *   - Bun.deepEquals: https://bun.com/docs/api/utils#bun-deepequals
 *   - Bun.inspect: https://bun.com/docs/api/utils#bun-inspect
 *   - Bun.color: https://bun.com/docs/api/utils#bun-color
 *   - Bun.hash: https://bun.com/docs/api/utils#bun-hash
 */

import {
	ITERATIONS,
	bench,
	benchAsync,
	fmt,
	useColor,
	S,
	o,
	R,
	B,
	D,
	vw,
	sectionHeader,
	report,
	checkPass,
	loadMemberProfile,
	renderSummary,
} from './bench-core.ts';

// ── Total runtime tracking ───────────────────────────────────────────
const t0 = Bun.nanoseconds();

// ── Bench 1: stripAnsi ──────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-stripansi
// Bun docs: ~6-57x faster strip-ansi alternative (vs npm package).
// We compare against a simple inline regex (not the npm package).

sectionHeader('1. stripAnsi: regex vs Bun.stripANSI', 'https://bun.com/docs/api/utils#bun-stripansi');

const ANSI_INPUTS = {
	short: '\x1b[1m\x1b[32mok\x1b[0m',
	medium: '\x1b[1m\x1b[32mfoo\x1b[0m bar \x1b[31merror\x1b[0m baz \x1b[36m[12:34:56]\x1b[0m',
	heavy: Array.from({length: 20}, (_, i) => `\x1b[${31 + (i % 7)}mword${i}\x1b[0m`).join(' '),
	plain: 'no ansi codes here at all, just plain text for comparison',
};

const stripAnsiRegex = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

for (const [name, input] of Object.entries(ANSI_INPUTS)) {
	console.log(`  ${D}[${name}] (${input.length} raw, ${vw(input)} visible)${R}`);

	// Verify correctness first
	const regexOut = stripAnsiRegex(input);
	const nativeOut = Bun.stripANSI(input);
	if (regexOut !== nativeOut) {
		console.log(
			`  ${o(S.red)}⚠ OUTPUT MISMATCH: regex=${JSON.stringify(regexOut)} native=${JSON.stringify(nativeOut)}${R}`,
		);
	}

	const old = bench('regex', () => stripAnsiRegex(input));
	const neo = bench('Bun.stripANSI', () => Bun.stripANSI(input));
	report(name, old, neo);
	console.log();
}

// ── Bench 2: ReadableStream.text() vs new Response(stream).text() ──
// Ref: https://bun.com/docs/api/spawn#reading-stdout
// proc.stdout is a ReadableStream when stdout: "pipe".
// Bun.spawn ReadableStream includes .text(), .json(), .bytes() methods.
// Old pattern: new Response(proc.stderr).text()
// New pattern: proc.stderr.text()

sectionHeader(
	'2. ReadableStream: new Response(stream).text() vs stream.text()',
	'https://bun.com/docs/api/spawn#reading-stdout',
);

const STREAM_CONTENT =
	'Error: could not be found in keychain\nSecKeychainSearchCopyNext: The specified item could not be found.\n';
const streamBytes = new TextEncoder().encode(STREAM_CONTENT);

// Create a fresh ReadableStream each iteration (streams are consumed once)
function makeStream(): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(streamBytes);
			controller.close();
		},
	});
}

const r2old = await benchAsync(
	'Response wrapper',
	async () => {
		const stream = makeStream();
		await new Response(stream).text();
	},
	5_000,
);

const r2new = await benchAsync(
	'stream.text()',
	async () => {
		const stream = makeStream();
		await stream.text();
	},
	5_000,
);

report('ReadableStream', r2old, r2new);

// Correctness: verify stream.text() returns the original content
{
	const verifyStream = makeStream();
	const verifyText = await verifyStream.text();
	const streamMatch = Bun.deepEquals(verifyText, STREAM_CONTENT);
	console.log(
		`  Stream correctness: ${streamMatch ? `${o(S.green)}pass${R}` : `${o(S.red)}FAIL${R}`} (Bun.deepEquals)`,
	);
}

// Real subprocess benchmark (fewer iterations — spawning is expensive)
console.log(`\n  ${D}[subprocess] real Bun.spawn + read stderr (100 iterations)${R}`);

const r2subOld = await benchAsync(
	'Response(proc.stderr)',
	async () => {
		const proc = Bun.spawn(['echo', 'test'], {stdout: 'pipe', stderr: 'pipe'});
		await new Response(proc.stdout).text();
		await proc.exited;
	},
	100,
);

const r2subNew = await benchAsync(
	'proc.stdout.text()',
	async () => {
		const proc = Bun.spawn(['echo', 'test'], {stdout: 'pipe', stderr: 'pipe'});
		await proc.stdout.text();
		await proc.exited;
	},
	100,
);

report('subprocess', r2subOld, r2subNew);

// ── Bench 3: URL.pathname vs Bun.fileURLToPath ──────────────────────
// Ref: https://bun.com/docs/api/utils#bun-fileurltopath
// Bun.fileURLToPath converts file:// URLs to absolute filesystem paths.
// Observed: correctly decodes percent-encoded characters (confirmed by test).

sectionHeader('3. URL.pathname vs Bun.fileURLToPath', 'https://bun.com/docs/api/utils#bun-fileurltopath');

const URL_CASES = {
	simple: {base: 'file:///Users/test/project/', relative: './scan-worker.ts'},
	spaces: {url: 'file:///Users/test/my%20project/scan-worker.ts'},
	unicode: {url: 'file:///Users/tëst/日本語/scan.ts'},
	deep: {base: 'file:///a/b/c/d/e/f/g/', relative: './worker.ts'},
};

// simple: relative URL resolution
{
	const {base, relative} = URL_CASES.simple;
	console.log(`  ${D}[simple] new URL("${relative}", "${base}")${R}`);

	const pathA = new URL(relative, base).pathname;
	const pathB = Bun.fileURLToPath(new URL(relative, base));
	console.log(`  URL.pathname:      ${pathA}`);
	console.log(`  fileURLToPath:     ${pathB}`);
	const match = pathA === pathB;
	console.log(`  match: ${match ? `${o(S.green)}true${R}` : `${o(S.red)}false${R}`}\n`);

	const old = bench('URL.pathname', () => new URL(relative, base).pathname);
	const neo = bench('fileURLToPath', () => Bun.fileURLToPath(new URL(relative, base)));
	report('simple', old, neo);
}

// spaces: percent-encoding correctness
{
	const {url} = URL_CASES.spaces;
	console.log(`\n  ${D}[spaces] "${url}"${R}`);

	const pathA = new URL(url).pathname;
	const pathB = Bun.fileURLToPath(url);
	const decodedA = pathA.includes(' ');
	const decodedB = pathB.includes(' ');
	console.log(
		`  URL.pathname:      ${pathA}  (decoded: ${decodedA ? `${o(S.green)}true${R}` : `${o(S.red)}false${R}`})`,
	);
	console.log(
		`  fileURLToPath:     ${pathB}  (decoded: ${decodedB ? `${o(S.green)}true${R}` : `${o(S.red)}false${R}`})`,
	);

	const old = bench('URL.pathname', () => new URL(url).pathname);
	const neo = bench('fileURLToPath', () => Bun.fileURLToPath(url));
	report('spaces', old, neo);
}

// unicode
{
	const {url} = URL_CASES.unicode;
	console.log(`\n  ${D}[unicode] "${url}"${R}`);

	const pathA = new URL(url).pathname;
	const pathB = Bun.fileURLToPath(url);
	console.log(`  URL.pathname:      ${pathA}`);
	console.log(`  fileURLToPath:     ${pathB}`);

	const old = bench('URL.pathname', () => new URL(url).pathname);
	const neo = bench('fileURLToPath', () => Bun.fileURLToPath(url));
	report('unicode', old, neo);
}

// deep: deeply nested path resolution
{
	const {base, relative} = URL_CASES.deep;
	console.log(`\n  ${D}[deep] new URL("${relative}", "${base}")${R}`);

	const pathA = new URL(relative, base).pathname;
	const pathB = Bun.fileURLToPath(new URL(relative, base));
	console.log(`  URL.pathname:      ${pathA}`);
	console.log(`  fileURLToPath:     ${pathB}`);
	const match = pathA === pathB;
	console.log(`  match: ${match ? `${o(S.green)}true${R}` : `${o(S.red)}false${R}`}\n`);

	const old = bench('URL.pathname', () => new URL(relative, base).pathname);
	const neo = bench('fileURLToPath', () => Bun.fileURLToPath(new URL(relative, base)));
	report('deep', old, neo);
}

// ── Bench 4: Bun.wrapAnsi ────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-wrapansi
// Bun docs: 33-88x faster than wrap-ansi npm package.
// Native ANSI-aware word wrapping with color preservation across line breaks.

sectionHeader('4. Bun.wrapAnsi', 'https://bun.com/docs/api/utils#bun-wrapansi');

const WRAP_COLS = 20;

const WRAP_INPUTS = {
	short: '\x1b[31mThis is a short colored text\x1b[0m padding!!',
	medium: Array.from({length: 18}, (_, i) => `\x1b[${31 + (i % 7)}mWord${i} text segment here\x1b[0m`).join(' '),
	long: '',
	hardWrap: '',
	noTrimLong: '',
};
WRAP_INPUTS.long = WRAP_INPUTS.medium.repeat(10);
WRAP_INPUTS.hardWrap = Array.from({length: 200}, (_, i) => `\x1b[${31 + (i % 7)}mLongword${i}coloredtext\x1b[0m`).join(
	' ',
);
WRAP_INPUTS.noTrimLong = '  ' + WRAP_INPUTS.long + '  ';

// Correctness: verify color preservation across line breaks
{
	const text = '\x1b[31mThis is a long red text that needs wrapping\x1b[0m';
	const wrapped = Bun.wrapAnsi(text, WRAP_COLS);
	const wrapLines = wrapped.split('\n');
	const allColored = wrapLines.every(l => l.includes('\x1b[31m'));
	const passColor = allColored ? o(S.green) : o(S.red);
	console.log(
		`  Color preservation: ${passColor}${allColored ? 'pass' : 'FAIL'}${R} (${wrapLines.length} lines, all re-open red)`,
	);
}

// Size benchmarks (matching Bun v1.3.7 release notes cases)
const wrapCases: [string, string, Parameters<typeof Bun.wrapAnsi>[2]][] = [
	['short (~45 chars)', WRAP_INPUTS.short, undefined],
	['medium (~810 chars)', WRAP_INPUTS.medium, undefined],
	['long (~8100 chars)', WRAP_INPUTS.long, undefined],
	['hard wrap colored', WRAP_INPUTS.hardWrap, {hard: true}],
	['no trim long', WRAP_INPUTS.noTrimLong, {trim: false}],
];

const wrapRows: {Case: string; Chars: number; Mean: string; Min: string; Max: string}[] = [];
for (const [name, input, opts] of wrapCases) {
	const r = bench(name, () => Bun.wrapAnsi(input, WRAP_COLS, opts));
	wrapRows.push({Case: name, Chars: input.length, Mean: fmt(r.mean_ns), Min: fmt(r.min_ns), Max: fmt(r.max_ns)});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(wrapRows, ['Case', 'Chars', 'Mean', 'Min', 'Max'], {colors: useColor}));

// Option variants (all on long input)
console.log(`  ${D}[option variants] (long input, 20 cols)${R}`);

const optCases: [string, Parameters<typeof Bun.wrapAnsi>[2]][] = [
	['default', undefined],
	['hard: true', {hard: true}],
	['wordWrap: false', {wordWrap: false}],
	['trim: false', {trim: false}],
	['ambiguousIsNarrow: false', {ambiguousIsNarrow: false}],
];

const optRows: {Option: string; Mean: string; Min: string}[] = [];
for (const [name, opts] of optCases) {
	const r = bench(name, () => Bun.wrapAnsi(WRAP_INPUTS.long, WRAP_COLS, opts));
	optRows.push({Option: name, Mean: fmt(r.mean_ns), Min: fmt(r.min_ns)});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(optRows, ['Option', 'Mean', 'Min'], {colors: useColor}));

// ── Bench 5: Bun.stringWidth ──────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-stringwidth
// Bun docs: ~6,756x faster string-width alternative (vs npm package).
// SIMD-optimized, supports ANSI codes, emoji, wide CJK characters.

sectionHeader('5. Bun.stringWidth', 'https://bun.com/docs/api/utils#bun-stringwidth');

// Generate test inputs matching Bun benchmark categories
function repeat(s: string, n: number): string {
	let out = '';
	for (let i = 0; i < n; i++) out += s;
	return out;
}

const SW_ASCII_BASE = 'The quick brown fox jumps over the lazy dog. ';
const SW_EMOJI_BASE = 'Hello 🌍🎉 world 🚀💻 test 🔥⭐ data ';
const SW_ANSI_EMOJI_BASE = '\x1b[31m🔴 red\x1b[0m \x1b[32m🟢 green\x1b[0m ';
const SW_MIXED_BASE = '\x1b[1mBold\x1b[0m text 🎯 \x1b[36mcyan\x1b[0m 日本語 ';

const SW_INPUTS: Record<string, {label: string; value: string}> = {
	ascii5: {label: '5 chars ascii', value: 'hello'},
	ascii50: {label: '50 chars ascii', value: SW_ASCII_BASE.slice(0, 50)},
	ascii500: {label: '500 chars ascii', value: repeat(SW_ASCII_BASE, 12).slice(0, 500)},
	ascii5k: {label: '5,000 chars ascii', value: repeat(SW_ASCII_BASE, 115).slice(0, 5000)},
	ascii25k: {label: '25,000 chars ascii', value: repeat(SW_ASCII_BASE, 560).slice(0, 25000)},
	emoji7: {label: '7 chars ascii+emoji', value: 'Hi 🌍🎉!'},
	emoji70: {label: '70 chars ascii+emoji', value: repeat(SW_EMOJI_BASE, 2).slice(0, 70)},
	emoji700: {label: '700 chars ascii+emoji', value: repeat(SW_EMOJI_BASE, 20).slice(0, 700)},
	emoji7k: {label: '7,000 chars ascii+emoji', value: repeat(SW_EMOJI_BASE, 200).slice(0, 7000)},
	ansiEmoji8: {label: '8 chars ansi+emoji', value: '\x1b[31m🔴 hi\x1b[0m'},
	ansiEmoji80: {label: '80 chars ansi+emoji', value: repeat(SW_ANSI_EMOJI_BASE, 3).slice(0, 80)},
	ansiEmoji800: {label: '800 chars ansi+emoji', value: repeat(SW_ANSI_EMOJI_BASE, 30).slice(0, 800)},
	ansiEmoji8k: {label: '8,000 chars ansi+emoji', value: repeat(SW_ANSI_EMOJI_BASE, 300).slice(0, 8000)},
	mixed19: {label: '19 chars ansi+emoji+ascii', value: SW_MIXED_BASE.slice(0, 19)},
	mixed190: {label: '190 chars ansi+emoji+ascii', value: repeat(SW_MIXED_BASE, 6).slice(0, 190)},
	mixed1900: {label: '1,900 chars ansi+emoji+ascii', value: repeat(SW_MIXED_BASE, 60).slice(0, 1900)},
	mixed19k: {label: '19,000 chars ansi+emoji+ascii', value: repeat(SW_MIXED_BASE, 600).slice(0, 19000)},
};

// Correctness checks
{
	const plain = Bun.stringWidth('hello');
	checkPass('plain ascii', plain === 5, `"hello" → ${plain}`);

	const ansi = Bun.stringWidth('\x1b[31mhello\x1b[0m');
	checkPass('ANSI stripped', ansi === 5, `"\\x1b[31mhello\\x1b[0m" → ${ansi}`);

	const ansiCounted = Bun.stringWidth('\x1b[31mhello\x1b[0m', {countAnsiEscapeCodes: true});
	checkPass('ANSI counted', ansiCounted === 12, `countAnsiEscapeCodes: true → ${ansiCounted}`);

	const wide = Bun.stringWidth('日本語');
	checkPass('CJK wide chars', wide === 6, `"日本語" → ${wide} (3 chars × 2 cols)`);

	const emoji = Bun.stringWidth('🎉');
	checkPass('emoji width', emoji === 2, `"🎉" → ${emoji}`);

	const empty = Bun.stringWidth('');
	checkPass('empty string', empty === 0, `"" → ${empty}`);
}

// Size benchmarks (matching Bun doc categories)
console.log(`\n  ${D}[size scaling — default options]${R}`);

const swRows: {Input: string; Chars: number; Visible: number; Mean: string; Min: string; Max: string}[] = [];
for (const [, {label, value}] of Object.entries(SW_INPUTS)) {
	const r = bench(label, () => Bun.stringWidth(value));
	swRows.push({
		Input: label,
		Chars: value.length,
		Visible: Bun.stringWidth(value),
		Mean: fmt(r.mean_ns),
		Min: fmt(r.min_ns),
		Max: fmt(r.max_ns),
	});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(swRows, ['Input', 'Chars', 'Visible', 'Mean', 'Min', 'Max'], {colors: useColor}));

// Option variants
console.log(`  ${D}[option variants] (500 chars ascii)${R}`);

const swOptCases: [string, Parameters<typeof Bun.stringWidth>[1]][] = [
	['default', undefined],
	['countAnsiEscapeCodes: true', {countAnsiEscapeCodes: true}],
	['ambiguousIsNarrow: false', {ambiguousIsNarrow: false}],
];

const swOptRows: {Option: string; Mean: string; Min: string}[] = [];
for (const [name, opts] of swOptCases) {
	const input = SW_INPUTS.ascii500.value;
	const r = bench(name, () => Bun.stringWidth(input, opts));
	swOptRows.push({Option: name, Mean: fmt(r.mean_ns), Min: fmt(r.min_ns)});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(swOptRows, ['Option', 'Mean', 'Min'], {colors: useColor}));

// ── Bench 6: Bun.escapeHTML ────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-escapehtml
// Bun docs: SIMD-optimized, 480 MB/s – 20 GB/s depending on input.
// Escapes: & → &amp;  < → &lt;  > → &gt;  " → &quot;  ' → &#x27;

sectionHeader('6. Bun.escapeHTML', 'https://bun.com/docs/api/utils#bun-escapehtml');

// Userland baseline (chained .replace — common pattern)
function escapeHtmlReplace(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

// Correctness checks
{
	const basic = Bun.escapeHTML('<script>alert("xss")</script>');
	checkPass('basic escaping', basic === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', `→ ${basic}`);

	const amp = Bun.escapeHTML('AT&T\'s "deal" <now>');
	checkPass('all 5 entities', amp === 'AT&amp;T&#x27;s &quot;deal&quot; &lt;now&gt;', `→ ${amp}`);

	const clean = Bun.escapeHTML('hello world 123');
	checkPass('clean passthrough', clean === 'hello world 123', `→ ${clean}`);

	const empty = Bun.escapeHTML('');
	checkPass('empty string', empty === '', `→ "${empty}"`);

	const num = Bun.escapeHTML(42 as any);
	checkPass('number coercion', num === '42', `42 → "${num}"`);

	const bool = Bun.escapeHTML(true as any);
	checkPass('boolean coercion', bool === 'true', `true → "${bool}"`);

	// Verify parity with userland
	const testStr = `<div class="foo" data-x='bar'>&amp; stuff</div>`;
	const nativeOut = Bun.escapeHTML(testStr);
	const userlandOut = escapeHtmlReplace(testStr);
	checkPass('native ≡ userland', nativeOut === userlandOut, `match: ${nativeOut === userlandOut}`);
}

// Build scaled inputs
const EH_CLEAN_BASE = 'The quick brown fox jumps over the lazy dog. No special chars here! ';
const EH_LIGHT_BASE = 'Hello & welcome <user>! Price: $9.99 "sale" ends now. It\'s great. ';
const EH_HEAVY_BASE = `<div class="x" data-y='z'>&amp;</div>`;
const EH_HTML_BASE = `<tr><td class="name">O'Brien &amp; Sons</td><td>"$99.99"</td></tr>\n`;

const EH_INPUTS: Record<string, {label: string; value: string}> = {
	clean50: {label: '50 chars clean', value: EH_CLEAN_BASE.slice(0, 50)},
	clean500: {label: '500 chars clean', value: repeat(EH_CLEAN_BASE, 8).slice(0, 500)},
	clean5k: {label: '5,000 chars clean', value: repeat(EH_CLEAN_BASE, 80).slice(0, 5000)},
	clean50k: {label: '50,000 chars clean', value: repeat(EH_CLEAN_BASE, 750).slice(0, 50000)},
	light50: {label: '50 chars light entities', value: EH_LIGHT_BASE.slice(0, 50)},
	light500: {label: '500 chars light entities', value: repeat(EH_LIGHT_BASE, 8).slice(0, 500)},
	light5k: {label: '5,000 chars light entities', value: repeat(EH_LIGHT_BASE, 80).slice(0, 5000)},
	light50k: {label: '50,000 chars light entities', value: repeat(EH_LIGHT_BASE, 750).slice(0, 50000)},
	heavy36: {label: '36 chars heavy entities', value: EH_HEAVY_BASE},
	heavy360: {label: '360 chars heavy entities', value: repeat(EH_HEAVY_BASE, 10)},
	heavy3600: {label: '3,600 chars heavy entities', value: repeat(EH_HEAVY_BASE, 100)},
	heavy36k: {label: '36,000 chars heavy entities', value: repeat(EH_HEAVY_BASE, 1000)},
	html60: {label: '60 chars html rows', value: EH_HTML_BASE},
	html600: {label: '600 chars html rows', value: repeat(EH_HTML_BASE, 10)},
	html6k: {label: '6,000 chars html rows', value: repeat(EH_HTML_BASE, 100)},
	html60k: {label: '60,000 chars html rows', value: repeat(EH_HTML_BASE, 1000)},
};

// Head-to-head: userland .replace() chain vs Bun.escapeHTML
console.log(`\n  ${D}[userland vs native — selected sizes]${R}`);

const ehCompare: [string, string][] = [
	['clean500', 'clean (500)'],
	['clean5k', 'clean (5k)'],
	['light500', 'light (500)'],
	['light5k', 'light (5k)'],
	['heavy360', 'heavy (360)'],
	['heavy3600', 'heavy (3.6k)'],
	['html600', 'html (600)'],
	['html6k', 'html (6k)'],
];

for (const [key, label] of ehCompare) {
	const input = EH_INPUTS[key].value;
	const old = bench('replace()', () => escapeHtmlReplace(input));
	const neo = bench('Bun.escapeHTML', () => Bun.escapeHTML(input));
	report(label, old, neo);
}

// Size scaling table (native only)
console.log(`\n  ${D}[size scaling — Bun.escapeHTML]${R}`);

const ehRows: {Input: string; Chars: number; Escaped: number; Mean: string; Min: string; Max: string}[] = [];
for (const [, {label, value}] of Object.entries(EH_INPUTS)) {
	const r = bench(label, () => Bun.escapeHTML(value));
	ehRows.push({
		Input: label,
		Chars: value.length,
		Escaped: Bun.escapeHTML(value).length,
		Mean: fmt(r.mean_ns),
		Min: fmt(r.min_ns),
		Max: fmt(r.max_ns),
	});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(ehRows, ['Input', 'Chars', 'Escaped', 'Mean', 'Min', 'Max'], {colors: useColor}));

// ── Bench 7: Bun.deepEquals ────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-deepequals
// Used internally by expect().toEqual() / toStrictEqual() in bun:test.
// Recursively compares objects; optional strict mode for undefined/sparse handling.

sectionHeader('7. Bun.deepEquals', 'https://bun.com/docs/api/utils#bun-deepequals');

// Userland baseline — recursive deep equals (common hand-rolled pattern)
function deepEqualsUserland(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (typeof a !== typeof b) return false;
	if (typeof a !== 'object') return false;
	const aObj = a as Record<string, unknown>;
	const bObj = b as Record<string, unknown>;
	const aKeys = Object.keys(aObj);
	const bKeys = Object.keys(bObj);
	if (aKeys.length !== bKeys.length) return false;
	for (const k of aKeys) {
		if (!deepEqualsUserland(aObj[k], bObj[k])) return false;
	}
	return true;
}

// Correctness checks
{
	checkPass('equal flat', Bun.deepEquals({a: 1, b: 'x'}, {a: 1, b: 'x'}) === true, 'flat objects');
	checkPass('unequal flat', Bun.deepEquals({a: 1}, {a: 2}) === false, 'different values');
	checkPass('nested equal', Bun.deepEquals({a: {b: {c: 3}}}, {a: {b: {c: 3}}}) === true, 'nested');
	checkPass('nested unequal', Bun.deepEquals({a: {b: 1}}, {a: {b: 2}}) === false, 'nested diff');
	checkPass('array equal', Bun.deepEquals([1, [2, 3]], [1, [2, 3]]) === true, 'arrays');
	checkPass('strict undef', Bun.deepEquals({}, {a: undefined}, true) === false, 'strict mode');
	checkPass('non-strict undef', Bun.deepEquals({}, {a: undefined}) === true, 'non-strict mode');
	checkPass('parity', Bun.deepEquals({a: 1}, {a: 1}) === deepEqualsUserland({a: 1}, {a: 1}), 'native ≡ userland');
}

// Build test data at different scales
function makeFlat(n: number): Record<string, number> {
	const obj: Record<string, number> = {};
	for (let i = 0; i < n; i++) obj[`k${i}`] = i;
	return obj;
}
function makeNested(depth: number): Record<string, unknown> {
	let obj: Record<string, unknown> = {val: depth};
	for (let i = depth - 1; i >= 0; i--) obj = {val: i, child: obj};
	return obj;
}
function makeArray(n: number): number[] {
	return Array.from({length: n}, (_, i) => i);
}

const DE_CASES: {label: string; a: unknown; b: unknown}[] = [
	{label: 'flat 5 keys', a: makeFlat(5), b: makeFlat(5)},
	{label: 'flat 50 keys', a: makeFlat(50), b: makeFlat(50)},
	{label: 'flat 500 keys', a: makeFlat(500), b: makeFlat(500)},
	{label: 'nested depth 5', a: makeNested(5), b: makeNested(5)},
	{label: 'nested depth 20', a: makeNested(20), b: makeNested(20)},
	{label: 'nested depth 50', a: makeNested(50), b: makeNested(50)},
	{label: 'array 10 items', a: makeArray(10), b: makeArray(10)},
	{label: 'array 1000 items', a: makeArray(1000), b: makeArray(1000)},
	{label: 'array 10000 items', a: makeArray(10000), b: makeArray(10000)},
	{
		label: 'mixed (real-world)',
		a: {
			name: 'scanner',
			version: '1.0.0',
			deps: {bun: '1.3.9', typescript: '5.4'},
			config: {strict: true, targets: ['es2022'], paths: ['/a', '/b', '/c']},
		},
		b: {
			name: 'scanner',
			version: '1.0.0',
			deps: {bun: '1.3.9', typescript: '5.4'},
			config: {strict: true, targets: ['es2022'], paths: ['/a', '/b', '/c']},
		},
	},
];

// Head-to-head: userland vs Bun.deepEquals
console.log(`\n  ${D}[userland vs native — equal objects]${R}`);

for (const {label, a, b} of DE_CASES) {
	const old = bench('userland', () => deepEqualsUserland(a, b));
	const neo = bench('Bun.deepEquals', () => Bun.deepEquals(a, b));
	report(label, old, neo);
}

// Strict mode variants
console.log(`\n  ${D}[strict vs non-strict mode]${R}`);

const strictCases: [string, unknown, unknown][] = [
	['flat 50', makeFlat(50), makeFlat(50)],
	['nested 20', makeNested(20), makeNested(20)],
	['array 1000', makeArray(1000), makeArray(1000)],
];

const strictRows: {'Case': string; 'Non-strict': string; 'Strict': string}[] = [];
for (const [label, a, b] of strictCases) {
	const r1 = bench('non-strict', () => Bun.deepEquals(a, b));
	const r2 = bench('strict', () => Bun.deepEquals(a, b, true));
	strictRows.push({'Case': label, 'Non-strict': fmt(r1.mean_ns), 'Strict': fmt(r2.mean_ns)});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(strictRows, ['Case', 'Non-strict', 'Strict'], {colors: useColor}));

// Early-exit benchmark: unequal objects (first key differs)
console.log(`\n  ${D}[early-exit — unequal at first key]${R}`);

const unequalA = makeFlat(500);
const unequalB = {...makeFlat(500), k0: -1};
{
	const old = bench('userland', () => deepEqualsUserland(unequalA, unequalB));
	const neo = bench('Bun.deepEquals', () => Bun.deepEquals(unequalA, unequalB));
	report('unequal 500 keys', old, neo);
}

// ── Bench 8: Bun.inspect / Bun.inspect.table ─────────────────────
// Ref: https://bun.com/docs/api/utils#bun-inspect
// Serializes values to string exactly as console.log would.
// Bun.inspect.custom: symbol for custom class serialization.
// Bun.inspect.table: formatted ASCII table output (like console.table).
//   Overloads: table(data), table(data, props), table(data, opts), table(data, props, opts)

sectionHeader('8. Bun.inspect / Bun.inspect.table', 'https://bun.com/docs/api/utils#bun-inspect');

// ── 8a. Bun.inspect.custom ──────────────────────────────────────

class PlainClass {
	constructor(
		public id: number,
		public name: string,
		public data: number[],
	) {}
}

class CustomInspectClass {
	constructor(
		public id: number,
		public name: string,
		public data: number[],
	) {}
	[Bun.inspect.custom]() {
		return `CustomInspect<${this.id}:${this.name}>`;
	}
}

class HeavyCustomInspectClass {
	constructor(public items: {key: string; val: number}[]) {}
	[Bun.inspect.custom]() {
		return `HeavyInspect[${this.items.length} items: ${this.items.map(i => `${i.key}=${i.val}`).join(', ')}]`;
	}
}

// Correctness
{
	const plain = new PlainClass(1, 'test', [1, 2, 3]);
	const custom = new CustomInspectClass(1, 'test', [1, 2, 3]);
	const heavy = new HeavyCustomInspectClass([
		{key: 'a', val: 1},
		{key: 'b', val: 2},
	]);

	const plainOut = Bun.inspect(plain);
	const customOut = Bun.inspect(custom);
	const heavyOut = Bun.inspect(heavy);

	checkPass('inspect.custom used', customOut === 'CustomInspect<1:test>', `→ ${customOut}`);
	checkPass('plain class default', plainOut.includes('PlainClass'), `→ ${plainOut.slice(0, 40)}...`);
	checkPass('heavy custom', heavyOut.includes('HeavyInspect'), `→ ${heavyOut.slice(0, 50)}...`);
}

// Benchmark: custom vs default serialization
console.log(`\n  ${D}[Bun.inspect.custom — custom vs default class serialization]${R}`);

const plainInstances = Array.from({length: 50}, (_, i) => new PlainClass(i, `item-${i}`, [i, i + 1, i + 2]));
const customInstances = Array.from({length: 50}, (_, i) => new CustomInspectClass(i, `item-${i}`, [i, i + 1, i + 2]));
const heavyInstances = Array.from(
	{length: 50},
	(_, i) => new HeavyCustomInspectClass(Array.from({length: 10}, (_, j) => ({key: `k${j}`, val: i * 10 + j}))),
);

{
	const r1 = bench('plain class', () => {
		for (const inst of plainInstances) Bun.inspect(inst);
	});
	const r2 = bench('custom inspect', () => {
		for (const inst of customInstances) Bun.inspect(inst);
	});
	report('50 instances', r1, r2);
}
{
	const r1 = bench('plain (single)', () => Bun.inspect(plainInstances[0]));
	const r2 = bench('custom (single)', () => Bun.inspect(customInstances[0]));
	report('single instance', r1, r2);
}
{
	const r = bench('heavy custom (50)', () => {
		for (const inst of heavyInstances) Bun.inspect(inst);
	});
	console.log(`  ${D}[heavy custom × 50] ${fmt(r.mean_ns)} mean (${fmt(r.min_ns)} min)${R}`);
}

// ── 8b. Bun.inspect — JSON.stringify comparison ─────────────────

const INSPECT_CASES: {label: string; value: unknown}[] = [
	{label: 'flat object (5 keys)', value: {a: 1, b: 'hello', c: true, d: null, e: [1, 2]}},
	{
		label: 'nested object',
		value: {
			name: 'scanner',
			config: {strict: true, paths: ['/a', '/b']},
			meta: {version: '1.0', build: {date: '2026-01-29', hash: 'abc123'}},
		},
	},
	{label: 'typed array', value: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])},
	{
		label: 'array of objects (10)',
		value: Array.from({length: 10}, (_, i) => ({id: i, name: `item-${i}`, active: i % 2 === 0})),
	},
	{
		label: 'array of objects (100)',
		value: Array.from({length: 100}, (_, i) => ({id: i, name: `item-${i}`, active: i % 2 === 0})),
	},
	{label: 'Map (20 entries)', value: new Map(Array.from({length: 20}, (_, i) => [`key${i}`, i * 10]))},
	{label: 'Set (50 items)', value: new Set(Array.from({length: 50}, (_, i) => i))},
	{label: 'deep nesting (10)', value: makeNested(10)},
];

// Correctness: verify Bun.inspect produces a string for each type
{
	for (const {label, value} of INSPECT_CASES.slice(0, 4)) {
		const out = Bun.inspect(value);
		checkPass(`inspect ${label}`, typeof out === 'string' && out.length > 0, `${out.length} chars`);
	}
}

// Head-to-head: JSON.stringify vs Bun.inspect
console.log(`\n  ${D}[JSON.stringify vs Bun.inspect — 8b]${R}`);

for (const {label, value} of INSPECT_CASES) {
	// JSON.stringify can't handle Map/Set/TypedArray natively — skip those for fair comparison
	const canJson = !(value instanceof Map || value instanceof Set || value instanceof Uint8Array);
	if (canJson) {
		const old = bench('JSON.stringify', () => JSON.stringify(value));
		const neo = bench('Bun.inspect', () => Bun.inspect(value));
		report(label, old, neo);
	} else {
		const r = bench('Bun.inspect', () => Bun.inspect(value));
		console.log(`  ${D}[${label}] Bun.inspect only: ${fmt(r.mean_ns)} mean${R}`);
	}
}

// ── 8c. Bun.inspect.table ────────────────────────────────────────

console.log(`\n  ${D}[Bun.inspect.table — scaling by row count]${R}`);

const tableCols = ['ID', 'Name', 'Value', 'Status'];
function makeTableData(n: number) {
	return Array.from({length: n}, (_, i) => ({
		ID: i,
		Name: `item-${i}`,
		Value: Math.random(),
		Status: i % 2 === 0 ? 'active' : 'inactive',
	}));
}

const tableRows: {'Rows': number; 'No color': string; 'Color': string; 'Chars': number}[] = [];
for (const rowCount of [5, 25, 100, 500]) {
	const data = makeTableData(rowCount);
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const r1 = bench(`${rowCount} rows`, () => Bun.inspect.table(data, tableCols, {colors: false}));
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const r2 = bench(`${rowCount} rows (color)`, () => Bun.inspect.table(data, tableCols, {colors: true}));
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const outputLen = Bun.inspect.table(data, tableCols, {colors: false}).length;
	tableRows.push({'Rows': rowCount, 'No color': fmt(r1.mean_ns), 'Color': fmt(r2.mean_ns), 'Chars': outputLen});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(tableRows, ['Rows', 'No color', 'Color', 'Chars'], {colors: useColor}));

// Column count scaling
console.log(`\n  ${D}[Bun.inspect.table — scaling by column count]${R}`);

function makeWideTableData(rows: number, cols: number) {
	return Array.from({length: rows}, (_, i) => {
		const obj: Record<string, unknown> = {};
		for (let c = 0; c < cols; c++)
			obj[`col${c}`] = c % 3 === 0 ? i * c : c % 3 === 1 ? `val-${i}-${c}` : i % 2 === 0;
		return obj;
	});
}

const colRows: {Cols: number; Mean: string; Min: string; Chars: number}[] = [];
for (const colCount of [4, 10, 22, 40]) {
	const data = makeWideTableData(25, colCount);
	const cols = Array.from({length: colCount}, (_, i) => `col${i}`);
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const r = bench(`${colCount} cols`, () => Bun.inspect.table(data, cols, {colors: false}));
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const outputLen = Bun.inspect.table(data, cols, {colors: false}).length;
	colRows.push({Cols: colCount, Mean: fmt(r.mean_ns), Min: fmt(r.min_ns), Chars: outputLen});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(colRows, ['Cols', 'Mean', 'Min', 'Chars'], {colors: useColor}));

// Property filtering: all columns vs subset
console.log(`\n  ${D}[Bun.inspect.table — property filtering]${R}`);

const filterData = Array.from({length: 50}, (_, i) => ({
	a: i,
	b: `name-${i}`,
	c: Math.random(),
	d: i % 2 === 0,
	e: `long-value-${i}`,
	f: i * 100,
	g: `extra-${i}`,
	h: !!(i % 3),
}));

const filterRows: {Variant: string; Mean: string; Min: string; Chars: number}[] = [];
{
	// All columns (no property array)
	const r1 = bench('all cols (no props)', () => Bun.inspect.table(filterData));
	filterRows.push({
		Variant: 'all cols (no props)',
		Mean: fmt(r1.mean_ns),
		Min: fmt(r1.min_ns),
		Chars: (Bun.inspect.table(filterData) as string).length,
	});

	// All columns via property array
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const r2 = bench('all cols (props array)', () =>
		Bun.inspect.table(filterData, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], {colors: false}),
	);
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	filterRows.push({
		Variant: 'all 8 cols (explicit)',
		Mean: fmt(r2.mean_ns),
		Min: fmt(r2.min_ns),
		Chars: (Bun.inspect.table(filterData, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], {colors: false}) as string)
			.length,
	});

	// Subset: 2 of 8 columns
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	const r3 = bench('2 of 8 cols', () => Bun.inspect.table(filterData, ['a', 'c'], {colors: false}));
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	filterRows.push({
		Variant: '2 of 8 cols',
		Mean: fmt(r3.mean_ns),
		Min: fmt(r3.min_ns),
		Chars: (Bun.inspect.table(filterData, ['a', 'c'], {colors: false}) as string).length,
	});

	// Options as second arg (no property array) — the overload from docs
	const r4 = bench('opts as 2nd arg', () => Bun.inspect.table(filterData, {colors: false} as any));
	filterRows.push({
		Variant: 'all cols (opts 2nd arg)',
		Mean: fmt(r4.mean_ns),
		Min: fmt(r4.min_ns),
		Chars: (Bun.inspect.table(filterData, {colors: false} as any) as string).length,
	});
}
// @ts-expect-error Bun.inspect.table accepts options as third arg
console.log(Bun.inspect.table(filterRows, ['Variant', 'Mean', 'Min', 'Chars'], {colors: useColor}));

// ── Bench 9: Bun.color ──────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-color
// Bun.color parses any CSS color string and converts between formats:
//   ansi (256-color escape), css (string), hex (string), number, {rgb} (object)
// Userland baseline: manual lookup table for named colors + regex for hex.

sectionHeader('9. Bun.color: format conversion', 'https://bun.com/docs/api/utils#bun-color');

// ── 9a: Correctness checks ──────────────────────────────────────────

const COLOR_NAMES = ['red', 'green', 'yellow', 'cyan', 'blue', 'magenta', 'white', 'black'] as const;

// Named color → number mapping (CSS spec values)
const EXPECTED_NUMBERS: Record<string, number> = {
	red: 0xff0000,
	green: 0x008000,
	yellow: 0xffff00,
	cyan: 0x00ffff,
	blue: 0x0000ff,
	magenta: 0xff00ff,
	white: 0xffffff,
	black: 0x000000,
};

for (const name of COLOR_NAMES) {
	const num = Bun.color(name, 'number');
	checkPass(`color("${name}", "number") = ${num}`, num === EXPECTED_NUMBERS[name]);
}

// Hex round-trip: hex string → number → css
checkPass('hex→number round-trip', Bun.color('#ff6600', 'number') === 0xff6600);
checkPass('rgb→css round-trip', Bun.color('rgb(255, 102, 0)', 'css') === '#f60');

// ANSI output is a non-empty string
checkPass(
	'ansi output is string',
	typeof Bun.color('red', 'ansi') === 'string' && Bun.color('red', 'ansi')!.length > 0,
);

// {rgb} returns object with r, g, b
const rgbObj = Bun.color('red', '{rgb}');
checkPass('{rgb} returns {r,g,b}', rgbObj != null && rgbObj.r === 255 && rgbObj.g === 0 && rgbObj.b === 0);

// Invalid color returns null
checkPass('invalid color → null', Bun.color('notacolor', 'number') === null);

console.log();

// ── 9b: Userland baseline (lookup table + regex) ────────────────────

const NAMED_COLORS_HEX: Record<string, string> = {
	red: '#ff0000',
	green: '#008000',
	yellow: '#ffff00',
	cyan: '#00ffff',
	blue: '#0000ff',
	magenta: '#ff00ff',
	white: '#ffffff',
	black: '#000000',
	orange: '#ffa500',
	purple: '#800080',
	pink: '#ffc0cb',
	gray: '#808080',
};

const NAMED_COLORS_ANSI: Record<string, string> = {
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	white: '\x1b[37m',
	black: '\x1b[30m',
};

function colorToNumberUserland(input: string): number | null {
	// Named color
	const hex = NAMED_COLORS_HEX[input.toLowerCase()];
	if (hex) return parseInt(hex.slice(1), 16);
	// Hex string
	const m = input.match(/^#([0-9a-f]{3,8})$/i);
	if (m) {
		const h = m[1];
		if (h.length === 3) return parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16);
		if (h.length === 6) return parseInt(h, 16);
	}
	// rgb()
	const rm = input.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
	if (rm) return (Number(rm[1]) << 16) | (Number(rm[2]) << 8) | Number(rm[3]);
	return null;
}

function colorToAnsiUserland(input: string): string | null {
	const ansi = NAMED_COLORS_ANSI[input.toLowerCase()];
	if (ansi) return ansi;
	// For non-named: convert to number, then 24-bit ANSI
	const n = colorToNumberUserland(input);
	if (n == null) return null;
	return `\x1b[38;2;${(n >> 16) & 0xff};${(n >> 8) & 0xff};${n & 0xff}m`;
}

// ── 9c: Named color conversions ─────────────────────────────────────

console.log(`  ${B}Named color → number${R}`);
{
	const rows: {Color: string; Userland: string; Native: string; Speedup: string}[] = [];
	for (const name of COLOR_NAMES) {
		const old = bench(`userland(${name})`, () => colorToNumberUserland(name));
		const neo = bench(`Bun.color(${name})`, () => Bun.color(name, 'number'));
		const speedup = old.mean_ns / neo.mean_ns;
		rows.push({
			Color: name,
			Userland: fmt(old.mean_ns),
			Native: fmt(neo.mean_ns),
			Speedup: `${speedup.toFixed(1)}x`,
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Color', 'Userland', 'Native', 'Speedup'], {colors: useColor}));
}

// ── 9d: Hex color conversions ───────────────────────────────────────

console.log(`  ${B}Hex string → number${R}`);
{
	const hexInputs = ['#f00', '#ff6600', '#3498db', '#1a2b3c'];
	const rows: {Input: string; Userland: string; Native: string; Speedup: string}[] = [];
	for (const hex of hexInputs) {
		const old = bench(`userland(${hex})`, () => colorToNumberUserland(hex));
		const neo = bench(`Bun.color(${hex})`, () => Bun.color(hex, 'number'));
		const speedup = old.mean_ns / neo.mean_ns;
		rows.push({
			Input: hex,
			Userland: fmt(old.mean_ns),
			Native: fmt(neo.mean_ns),
			Speedup: `${speedup.toFixed(1)}x`,
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Input', 'Userland', 'Native', 'Speedup'], {colors: useColor}));
}

// ── 9e: ANSI output ─────────────────────────────────────────────────

console.log(`  ${B}Color → ANSI escape${R}`);
{
	const ansiInputs = ['red', 'cyan', '#ff6600', 'rgb(100, 200, 50)'];
	const rows: {Input: string; Userland: string; Native: string; Speedup: string}[] = [];
	for (const input of ansiInputs) {
		const old = bench(`userland(${input})`, () => colorToAnsiUserland(input));
		const neo = bench(`Bun.color(${input})`, () => Bun.color(input, 'ansi'));
		const speedup = old.mean_ns / neo.mean_ns;
		rows.push({
			Input: input,
			Userland: fmt(old.mean_ns),
			Native: fmt(neo.mean_ns),
			Speedup: `${speedup.toFixed(1)}x`,
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Input', 'Userland', 'Native', 'Speedup'], {colors: useColor}));
}

// ── 9f: Format conversion matrix ────────────────────────────────────

console.log(`  ${B}Format conversion speed (native only)${R}`);
{
	const formats = ['number', 'css', 'ansi', '{rgb}'] as const;
	const rows: {'Format': string; 'red': string; '#ff6600': string; 'rgb(100,200,50)': string}[] = [];
	for (const format of formats) {
		const r1 = bench(`red→${format}`, () => Bun.color('red', format));
		const r2 = bench(`#ff6600→${format}`, () => Bun.color('#ff6600', format));
		const r3 = bench(`rgb→${format}`, () => Bun.color('rgb(100, 200, 50)', format));
		rows.push({
			'Format': format,
			'red': fmt(r1.mean_ns),
			'#ff6600': fmt(r2.mean_ns),
			'rgb(100,200,50)': fmt(r3.mean_ns),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Format', 'red', '#ff6600', 'rgb(100,200,50)'], {colors: useColor}));
}

// ── Bench 10: Bun.hash ─────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-hash
// Bun.hash: fast non-crypto hashing. Default is wyhash.
// Also: Bun.hash.wyhash, Bun.hash.adler32, Bun.hash.crc32, Bun.hash.cityHash32,
//        Bun.hash.cityHash64, Bun.hash.murmur32v3, Bun.hash.murmur32v2, Bun.hash.murmur64v2
// Userland baseline: simple djb2 hash and FNV-1a.

sectionHeader('10. Bun.hash: non-crypto hashing', 'https://bun.com/docs/api/utils#bun-hash');

// ── 10a: Correctness checks ─────────────────────────────────────────

// Bun.hash returns bigint, deterministic
const h1 = Bun.hash('hello');
const h2 = Bun.hash('hello');
checkPass('hash is deterministic', h1 === h2);
checkPass('hash returns bigint', typeof h1 === 'bigint');

// Different inputs → different hashes
checkPass('different inputs differ', Bun.hash('hello') !== Bun.hash('world'));

// Seed support
checkPass('seed changes hash', Bun.hash('hello', 0) !== Bun.hash('hello', 42));

// Typed array input
const buf = new TextEncoder().encode('hello');
checkPass('string ≡ Uint8Array hash', Bun.hash('hello') === Bun.hash(buf));

// Named algorithm variants exist
checkPass('crc32 exists', typeof Bun.hash.crc32 === 'function');
checkPass('adler32 exists', typeof Bun.hash.adler32 === 'function');
checkPass('cityHash64 exists', typeof Bun.hash.cityHash64 === 'function');

console.log();

// ── 10b: Userland baselines ─────────────────────────────────────────

function djb2(s: string): number {
	let hash = 5381;
	for (let i = 0; i < s.length; i++) {
		hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}

function fnv1a(s: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		hash ^= s.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

// ── 10c: Size-scaled comparisons ────────────────────────────────────

const hashInputs = {
	tiny: 'ok',
	short: 'hello world',
	medium: 'The quick brown fox jumps over the lazy dog and then some more text to pad it out a bit',
	long: 'x'.repeat(1_000),
	large: 'y'.repeat(10_000),
	huge: 'z'.repeat(100_000),
};

console.log(`  ${B}djb2 vs fnv1a vs Bun.hash (wyhash)${R}`);
{
	const rows: {
		'Size': string;
		'Len': number;
		'djb2': string;
		'fnv1a': string;
		'Bun.hash': string;
		'vs djb2': string;
		'vs fnv1a': string;
	}[] = [];
	for (const [label, input] of Object.entries(hashInputs)) {
		const rDjb2 = bench(`djb2(${label})`, () => djb2(input));
		const rFnv = bench(`fnv1a(${label})`, () => fnv1a(input));
		const rNative = bench(`Bun.hash(${label})`, () => Bun.hash(input));
		rows.push({
			'Size': label,
			'Len': input.length,
			'djb2': fmt(rDjb2.mean_ns),
			'fnv1a': fmt(rFnv.mean_ns),
			'Bun.hash': fmt(rNative.mean_ns),
			'vs djb2': `${(rDjb2.mean_ns / rNative.mean_ns).toFixed(1)}x`,
			'vs fnv1a': `${(rFnv.mean_ns / rNative.mean_ns).toFixed(1)}x`,
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Size', 'Len', 'djb2', 'fnv1a', 'Bun.hash', 'vs djb2', 'vs fnv1a'], {
			colors: useColor,
		}),
	);
}

// ── 10d: Algorithm comparison (native only) ─────────────────────────

console.log(`  ${B}Bun.hash algorithm variants (1k string)${R}`);
{
	const input = 'x'.repeat(1_000);
	const algorithms = [
		['wyhash (default)', () => Bun.hash(input)],
		['crc32', () => Bun.hash.crc32(input)],
		['adler32', () => Bun.hash.adler32(input)],
		['cityHash32', () => Bun.hash.cityHash32(input)],
		['cityHash64', () => Bun.hash.cityHash64(input)],
		['murmur32v3', () => Bun.hash.murmur32v3(input)],
		['murmur64v2', () => Bun.hash.murmur64v2(input)],
	] as const;

	const rows: {Algorithm: string; Mean: string; Min: string; Output: string}[] = [];
	for (const [name, fn] of algorithms) {
		const r = bench(name, fn as () => unknown);
		const out = (fn as () => unknown)();
		rows.push({Algorithm: name, Mean: fmt(r.mean_ns), Min: fmt(r.min_ns), Output: String(out).slice(0, 20)});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Algorithm', 'Mean', 'Min', 'Output'], {colors: useColor}));
}

// ── 10e: Typed array vs string input ────────────────────────────────

console.log(`  ${B}String vs Uint8Array input${R}`);
{
	const sizes = [100, 1_000, 10_000];
	const rows: {Size: number; String: string; Uint8Array: string; Ratio: string}[] = [];
	for (const size of sizes) {
		const str = 'a'.repeat(size);
		const arr = new TextEncoder().encode(str);
		const rStr = bench(`string(${size})`, () => Bun.hash(str));
		const rArr = bench(`uint8array(${size})`, () => Bun.hash(arr));
		rows.push({
			Size: size,
			String: fmt(rStr.mean_ns),
			Uint8Array: fmt(rArr.mean_ns),
			Ratio: `${(rStr.mean_ns / rArr.mean_ns).toFixed(2)}x`,
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Size', 'String', 'Uint8Array', 'Ratio'], {colors: useColor}));
}

// ── Summary ─────────────────────────────────────────────────────────

const {key: memberKey, profile: memberProfile} = await loadMemberProfile();
renderSummary({t0, iterLabel: `${ITERATIONS} (sync), 5000 (stream), 100 (subprocess)`, memberKey, memberProfile});
