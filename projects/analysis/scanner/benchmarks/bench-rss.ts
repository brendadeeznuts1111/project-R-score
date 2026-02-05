/**
 * Benchmark: RSS helper functions
 *
 * Tests escapeXml, decodeXmlEntities, generateRssXml, and parseRssFeed
 * across varying input sizes with correctness verification.
 *
 * Run: bun run benchmarks/bench-rss.ts
 */

import {escapeXml, decodeXmlEntities, generateRssXml, parseRssFeed} from '../scan.ts';
import {
	ITERATIONS,
	bench,
	fmt,
	opsPerSec,
	throughput,
	useColor,
	S,
	o,
	R,
	B,
	D,
	sectionHeader,
	checkPass,
	loadMemberProfile,
	renderSummary,
} from './bench-core.ts';

// ── Total runtime tracking ───────────────────────────────────────────
const t0 = Bun.nanoseconds();

// ── Test data ───────────────────────────────────────────────────────

const ESCAPE_INPUTS: Record<string, string> = {
	clean: 'No special characters here at all',
	light: 'Tom & Jerry say "hello" to <world>',
	medium: Array.from({length: 10}, (_, i) => `item<${i}> & "val${i}" 'q${i}'`).join(' '),
	heavy: Array.from({length: 50}, (_, i) => `item<${i}> & "val${i}" 'q${i}'`).join(' '),
};

const ENCODED_INPUTS: Record<string, string> = {
	clean: 'No entities here at all',
	light: 'Tom &amp; Jerry say &quot;hello&quot; to &lt;world&gt;',
	medium: Array.from({length: 10}, (_, i) => `item&lt;${i}&gt; &amp; &quot;val${i}&quot; &apos;q${i}&apos;`).join(
		' ',
	),
	heavy: Array.from({length: 50}, (_, i) => `item&lt;${i}&gt; &amp; &quot;val${i}&quot; &apos;q${i}&apos;`).join(' '),
	cdata: '<![CDATA[Some <raw> content & more]]>',
};

function makeRssChannel(itemCount: number) {
	return {
		title: 'Benchmark Feed',
		description: 'A test feed for benchmarking',
		link: 'https://example.com/feed',
		items: Array.from({length: itemCount}, (_, i) => ({
			title: `Item ${i}: advisory & update <${i}>`,
			description: `Description for item ${i} with "quotes" and 'apostrophes'`,
			link: `https://example.com/item/${i}`,
			pubDate: new Date(2025, 0, i + 1).toUTCString(),
		})),
	};
}

function makeRss20Xml(itemCount: number): string {
	const items = Array.from(
		{length: itemCount},
		(_, i) =>
			`<item>
      <title>Advisory ${i}: buffer overflow in pkg-${i}</title>
      <link>https://example.com/advisory/${i}</link>
      <description>Affects pkg-${i} versions &lt; 2.0.0</description>
      <pubDate>${new Date(2025, 0, i + 1).toUTCString()}</pubDate>
    </item>`,
	).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${items}</channel></rss>`;
}

function makeAtomXml(itemCount: number): string {
	const entries = Array.from(
		{length: itemCount},
		(_, i) =>
			`<entry>
      <title>CVE-2025-${String(i).padStart(4, '0')}</title>
      <link href="https://example.com/cve/${i}"/>
      <summary>Vulnerability in pkg-${i}</summary>
      <published>2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z</published>
    </entry>`,
	).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">${entries}</feed>`;
}

// ── Bench 1: escapeXml ──────────────────────────────────────────────

sectionHeader('1. escapeXml', 'XML entity encoding: & < > " \'');

// Correctness
{
	const input = 'Tom & Jerry <"friends"> aren\'t';
	const escaped = escapeXml(input);
	const expected = 'Tom &amp; Jerry &lt;&quot;friends&quot;&gt; aren&apos;t';
	checkPass('round-trip identity', decodeXmlEntities(escaped) === input);
	checkPass('entity encoding', escaped === expected, `${input.length} chars → ${escaped.length} chars`);
	checkPass('no-op on clean text', escapeXml('clean text') === 'clean text');
	console.log();
}

{
	const rows: {
		'Input': string;
		'Chars': string;
		'Mean': string;
		'Min': string;
		'Max': string;
		'ops/s': string;
		'Throughput': string;
	}[] = [];
	for (const [name, input] of Object.entries(ESCAPE_INPUTS)) {
		const r = bench(`escapeXml(${name})`, () => escapeXml(input));
		rows.push({
			'Input': name,
			'Chars': String(input.length),
			'Mean': fmt(r.mean_ns),
			'Min': fmt(r.min_ns),
			'Max': fmt(r.max_ns),
			'ops/s': opsPerSec(r.mean_ns),
			'Throughput': throughput(r.mean_ns, input.length),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Input', 'Chars', 'Mean', 'Min', 'Max', 'ops/s', 'Throughput'], {colors: useColor}),
	);
}

// ── Bench 2: decodeXmlEntities ──────────────────────────────────────

sectionHeader('2. decodeXmlEntities', 'XML entity decoding + CDATA unwrap');

// Correctness
{
	checkPass('entity decode', decodeXmlEntities('&amp; &lt; &gt; &quot; &apos;') === '& < > " \'');
	checkPass('CDATA strip', decodeXmlEntities('<![CDATA[hello <world>]]>') === 'hello <world>');
	checkPass('nested CDATA entity', decodeXmlEntities('<![CDATA[Use &amp; here]]>') === 'Use & here');
	checkPass('no-op on clean text', decodeXmlEntities('clean text') === 'clean text');
	console.log();
}

{
	const rows: {
		'Input': string;
		'Chars': string;
		'Mean': string;
		'Min': string;
		'Max': string;
		'ops/s': string;
		'Throughput': string;
	}[] = [];
	for (const [name, input] of Object.entries(ENCODED_INPUTS)) {
		const r = bench(`decodeXmlEntities(${name})`, () => decodeXmlEntities(input));
		rows.push({
			'Input': name,
			'Chars': String(input.length),
			'Mean': fmt(r.mean_ns),
			'Min': fmt(r.min_ns),
			'Max': fmt(r.max_ns),
			'ops/s': opsPerSec(r.mean_ns),
			'Throughput': throughput(r.mean_ns, input.length),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Input', 'Chars', 'Mean', 'Min', 'Max', 'ops/s', 'Throughput'], {colors: useColor}),
	);
}

// ── Bench 3: escapeXml ↔ decodeXmlEntities symmetry ─────────────────

sectionHeader('3. escape/decode symmetry', 'Verifying round-trip identity across input sizes');

{
	const rows: {
		'Input': string;
		'Chars': string;
		'Escape (mean)': string;
		'Decode (mean)': string;
		'Ratio (d/e)': string;
		'Round-trip': string;
	}[] = [];
	for (const [name, input] of Object.entries(ESCAPE_INPUTS)) {
		const escaped = escapeXml(input);
		const re = bench(`escape(${name})`, () => escapeXml(input));
		const rd = bench(`decode(${name})`, () => decodeXmlEntities(escaped));
		const ratio = rd.mean_ns / re.mean_ns;
		const roundTrip = decodeXmlEntities(escapeXml(input)) === input;
		rows.push({
			'Input': name,
			'Chars': String(input.length),
			'Escape (mean)': fmt(re.mean_ns),
			'Decode (mean)': fmt(rd.mean_ns),
			'Ratio (d/e)': `${ratio.toFixed(2)}x`,
			'Round-trip': roundTrip ? 'pass' : 'FAIL',
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Input', 'Chars', 'Escape (mean)', 'Decode (mean)', 'Ratio (d/e)', 'Round-trip'], {
			colors: useColor,
		}),
	);
}

// ── Bench 4: generateRssXml ─────────────────────────────────────────

sectionHeader('4. generateRssXml', 'RSS 2.0 XML generation via template literals');

// Correctness
{
	const ch = makeRssChannel(3);
	const xml = generateRssXml(ch);
	checkPass('XML declaration', xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
	checkPass('rss 2.0 root', xml.includes('<rss version="2.0"'));
	checkPass('atom namespace', xml.includes('xmlns:atom="http://www.w3.org/2005/Atom"'));
	checkPass('channel title', xml.includes('<title>Benchmark Feed</title>'));
	checkPass('generator tag', xml.includes('<generator>Bun-Scanner</generator>'));
	checkPass('language tag', xml.includes('<language>en-us</language>'));
	checkPass('item count', (xml.match(/<item>/g) || []).length === 3, '3 items');
	// Items should be sorted newest-first
	const idx0 = xml.indexOf('Item 0:');
	const idx2 = xml.indexOf('Item 2:');
	checkPass('newest-first sort', idx2 < idx0, 'Item 2 before Item 0');
	console.log();
}

{
	const rows: {
		'Items': string;
		'Bytes': string;
		'Mean': string;
		'Min': string;
		'Max': string;
		'ops/s': string;
		'Throughput': string;
		'Per item': string;
	}[] = [];
	for (const count of [1, 10, 50, 100]) {
		const channel = makeRssChannel(count);
		const r = bench(`generateRssXml(${count})`, () => generateRssXml(channel));
		const sample = generateRssXml(channel);
		rows.push({
			'Items': String(count),
			'Bytes': String(sample.length),
			'Mean': fmt(r.mean_ns),
			'Min': fmt(r.min_ns),
			'Max': fmt(r.max_ns),
			'ops/s': opsPerSec(r.mean_ns),
			'Throughput': throughput(r.mean_ns, sample.length),
			'Per item': fmt(r.mean_ns / count),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Items', 'Bytes', 'Mean', 'Min', 'Max', 'ops/s', 'Throughput', 'Per item'], {
			colors: useColor,
		}),
	);
}

// ── Bench 5: parseRssFeed (RSS 2.0) ─────────────────────────────────

sectionHeader('5. parseRssFeed — RSS 2.0', 'Regex-based <item> extraction');

// Correctness
{
	const xml = makeRss20Xml(5);
	const items = parseRssFeed(xml);
	checkPass('item count', items.length === 5, `expected 5, got ${items.length}`);
	checkPass('has title', items[0].title.startsWith('Advisory 0:'));
	checkPass('has link', items[0].link.startsWith('https://'));
	checkPass('has description', items[0].description.length > 0);
	checkPass('has pubDate', items[0].pubDate.length > 0);
	checkPass('empty on garbage', parseRssFeed('not xml').length === 0);
	console.log();
}

{
	const rows: {
		'Items': string;
		'Bytes': string;
		'Mean': string;
		'Min': string;
		'Max': string;
		'ops/s': string;
		'Throughput': string;
		'Per item': string;
	}[] = [];
	for (const count of [1, 10, 50, 100]) {
		const xml = makeRss20Xml(count);
		const r = bench(`parseRss(${count})`, () => parseRssFeed(xml));
		rows.push({
			'Items': String(count),
			'Bytes': String(xml.length),
			'Mean': fmt(r.mean_ns),
			'Min': fmt(r.min_ns),
			'Max': fmt(r.max_ns),
			'ops/s': opsPerSec(r.mean_ns),
			'Throughput': throughput(r.mean_ns, xml.length),
			'Per item': fmt(r.mean_ns / count),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Items', 'Bytes', 'Mean', 'Min', 'Max', 'ops/s', 'Throughput', 'Per item'], {
			colors: useColor,
		}),
	);
}

// ── Bench 6: parseRssFeed (Atom) ─────────────────────────────────────

sectionHeader('6. parseRssFeed — Atom', 'Regex-based <entry> extraction with link href= attribute');

// Correctness
{
	const xml = makeAtomXml(5);
	const items = parseRssFeed(xml);
	checkPass('entry count', items.length === 5, `expected 5, got ${items.length}`);
	checkPass('has title', items[0].title.startsWith('CVE-2025-'));
	checkPass('href link', items[0].link.startsWith('https://'), items[0].link);
	checkPass('summary as description', items[0].description.length > 0);
	checkPass('published as pubDate', items[0].pubDate.includes('2025-01-'));
	console.log();
}

{
	const rows: {
		'Items': string;
		'Bytes': string;
		'Mean': string;
		'Min': string;
		'Max': string;
		'ops/s': string;
		'Throughput': string;
		'Per item': string;
	}[] = [];
	for (const count of [1, 10, 50, 100]) {
		const xml = makeAtomXml(count);
		const r = bench(`parseAtom(${count})`, () => parseRssFeed(xml));
		rows.push({
			'Items': String(count),
			'Bytes': String(xml.length),
			'Mean': fmt(r.mean_ns),
			'Min': fmt(r.min_ns),
			'Max': fmt(r.max_ns),
			'ops/s': opsPerSec(r.mean_ns),
			'Throughput': throughput(r.mean_ns, xml.length),
			'Per item': fmt(r.mean_ns / count),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Items', 'Bytes', 'Mean', 'Min', 'Max', 'ops/s', 'Throughput', 'Per item'], {
			colors: useColor,
		}),
	);
}

// ── Bench 7: RSS 2.0 vs Atom comparison ──────────────────────────────

sectionHeader('7. RSS 2.0 vs Atom — head-to-head', 'Same item count, comparing parse cost');

{
	const rows: {'Items': string; 'RSS mean': string; 'Atom mean': string; 'Δ': string; 'Faster': string}[] = [];
	for (const count of [10, 50, 100]) {
		const rssXml = makeRss20Xml(count);
		const atomXml = makeAtomXml(count);
		const rr = bench(`rss(${count})`, () => parseRssFeed(rssXml));
		const ra = bench(`atom(${count})`, () => parseRssFeed(atomXml));
		const diff = rr.mean_ns - ra.mean_ns;
		const ratio = rr.mean_ns / ra.mean_ns;
		rows.push({
			'Items': String(count),
			'RSS mean': fmt(rr.mean_ns),
			'Atom mean': fmt(ra.mean_ns),
			'Δ': `${diff > 0 ? '+' : ''}${fmt(Math.abs(diff))}`,
			'Faster':
				ratio > 1.05
					? `Atom (${ratio.toFixed(2)}x)`
					: ratio < 0.95
						? `RSS (${(1 / ratio).toFixed(2)}x)`
						: '~equal',
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(Bun.inspect.table(rows, ['Items', 'RSS mean', 'Atom mean', 'Δ', 'Faster'], {colors: useColor}));
}

// ── Bench 8: round-trip (generate → parse) ───────────────────────────

sectionHeader('8. round-trip: generateRssXml → parseRssFeed', 'Full cycle: generate XML then parse it back');

// Correctness
{
	const ch = makeRssChannel(5);
	const xml = generateRssXml(ch);
	const parsed = parseRssFeed(xml);
	checkPass('round-trip count', parsed.length === 5, `generated 5, parsed ${parsed.length}`);
	// Special chars survive
	const special = generateRssXml({
		title: 'Test',
		description: 'Test',
		link: 'https://example.com',
		items: [{title: 'A & B <"C">', description: "It's done", pubDate: 'Mon, 01 Jan 2025 00:00:00 GMT'}],
	});
	const sp = parseRssFeed(special);
	checkPass('special chars survive', sp[0].title === 'A & B <"C">' && sp[0].description === "It's done");
	console.log();
}

{
	const rows: {
		'Items': string;
		'Bytes': string;
		'Gen (mean)': string;
		'Parse (mean)': string;
		'Total (mean)': string;
		'ops/s': string;
		'Per item': string;
	}[] = [];
	for (const count of [1, 10, 50, 100]) {
		const channel = makeRssChannel(count);
		const sample = generateRssXml(channel);
		const rg = bench(`gen(${count})`, () => generateRssXml(channel));
		const rp = bench(`parse(${count})`, () => parseRssFeed(sample));
		const rt = bench(`round-trip(${count})`, () => {
			const xml = generateRssXml(channel);
			parseRssFeed(xml);
		});
		rows.push({
			'Items': String(count),
			'Bytes': String(sample.length),
			'Gen (mean)': fmt(rg.mean_ns),
			'Parse (mean)': fmt(rp.mean_ns),
			'Total (mean)': fmt(rt.mean_ns),
			'ops/s': opsPerSec(rt.mean_ns),
			'Per item': fmt(rt.mean_ns / count),
		});
	}
	// @ts-expect-error Bun.inspect.table accepts options as third arg
	console.log(
		Bun.inspect.table(rows, ['Items', 'Bytes', 'Gen (mean)', 'Parse (mean)', 'Total (mean)', 'ops/s', 'Per item'], {
			colors: useColor,
		}),
	);
}

// ── Summary ─────────────────────────────────────────────────────────

const {key: memberKey, profile: memberProfile} = await loadMemberProfile();
renderSummary({t0, memberKey, memberProfile});
