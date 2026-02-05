import {describe, test, expect} from 'bun:test';
import {
	isFeatureFlagActive,
	classifyEnvFlag,
	effectiveLinker,
	shouldWarnMise,
	parseTzFromEnv,
	parseEnvVar,
	validateThreatFeed,
	ThreatFeedItemSchema,
	semverBumpType,
	isVulnerable,
	semverCompare,
	ProjectInfoSchema,
	XrefSnapshotSchema,
	XrefEntrySchema,
	PackageJsonSchema,
	classifyKeychainError,
	tokenSource,
	timeSince,
	keychainGet,
	keychainSet,
	keychainDelete,
	BUN_KEYCHAIN_SERVICE,
	BUN_KEYCHAIN_TOKEN_NAMES,
	isValidTokenName,
	validateTokenValue,
	tokenValueWarnings,
	escapeXml,
	decodeXmlEntities,
	generateRssXml,
	parseRssFeed,
	BUN_TOKEN_AUDIT_RSS_PATH,
	BUN_SCAN_RESULTS_RSS_PATH,
	BUN_ADVISORY_MATCHES_PATH,
	getGitCommitHash,
	getGitCommitHashShort,
	type KeychainErr,
	type ProjectInfo,
} from './scan.ts';

describe('isFeatureFlagActive', () => {
	test("returns true for '1'", () => {
		expect(isFeatureFlagActive('1')).toBe(true);
	});

	test("returns true for 'true'", () => {
		expect(isFeatureFlagActive('true')).toBe(true);
	});

	test('returns false for undefined', () => {
		expect(isFeatureFlagActive(undefined)).toBe(false);
	});

	test("returns false for '0'", () => {
		expect(isFeatureFlagActive('0')).toBe(false);
	});

	test("returns false for '2'", () => {
		expect(isFeatureFlagActive('2')).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isFeatureFlagActive('')).toBe(false);
	});

	test("returns false for 'false'", () => {
		expect(isFeatureFlagActive('false')).toBe(false);
	});

	test("returns false for 'yes'", () => {
		expect(isFeatureFlagActive('yes')).toBe(false);
	});

	test("returns false for 'TRUE' (case-sensitive)", () => {
		expect(isFeatureFlagActive('TRUE')).toBe(false);
	});
});

describe('classifyEnvFlag', () => {
	const OFF_LABEL = 'BLOCKED';

	test('not set → inactive with offLabel', () => {
		const result = classifyEnvFlag(undefined, OFF_LABEL);
		expect(result).toEqual({label: 'BLOCKED', state: 'inactive'});
	});

	test("'1' → active OFF", () => {
		const result = classifyEnvFlag('1', OFF_LABEL);
		expect(result).toEqual({label: 'OFF', state: 'active'});
	});

	test("'true' → active OFF", () => {
		const result = classifyEnvFlag('true', OFF_LABEL);
		expect(result).toEqual({label: 'OFF', state: 'active'});
	});

	test("'0' → ambiguous with raw value", () => {
		const result = classifyEnvFlag('0', OFF_LABEL);
		expect(result).toEqual({label: 'set (0)', state: 'ambiguous'});
	});

	test("'2' → ambiguous with raw value", () => {
		const result = classifyEnvFlag('2', OFF_LABEL);
		expect(result).toEqual({label: 'set (2)', state: 'ambiguous'});
	});

	test('empty string → inactive (falsy)', () => {
		const result = classifyEnvFlag('', OFF_LABEL);
		expect(result).toEqual({label: 'BLOCKED', state: 'inactive'});
	});

	test("'false' → ambiguous", () => {
		const result = classifyEnvFlag('false', OFF_LABEL);
		expect(result).toEqual({label: 'set (false)', state: 'ambiguous'});
	});

	test('works with ON offLabel', () => {
		expect(classifyEnvFlag(undefined, 'ON')).toEqual({label: 'ON', state: 'inactive'});
		expect(classifyEnvFlag('1', 'ON')).toEqual({label: 'OFF', state: 'active'});
		expect(classifyEnvFlag('0', 'ON')).toEqual({label: 'set (0)', state: 'ambiguous'});
	});
});

describe('effectiveLinker', () => {
	const base = {linker: '-', configVersion: -1, workspace: false};

	test('explicit bunfig linker wins', () => {
		expect(effectiveLinker({...base, linker: 'isolated'})).toEqual({strategy: 'isolated', source: 'bunfig'});
		expect(effectiveLinker({...base, linker: 'hoisted', configVersion: 1, workspace: true})).toEqual({
			strategy: 'hoisted',
			source: 'bunfig',
		});
	});

	test('configVersion=0 → hoisted (compat)', () => {
		expect(effectiveLinker({...base, configVersion: 0})).toEqual({
			strategy: 'hoisted',
			source: 'configVersion=0 (compat)',
		});
	});

	test('configVersion=0 + workspace → still hoisted', () => {
		expect(effectiveLinker({...base, configVersion: 0, workspace: true})).toEqual({
			strategy: 'hoisted',
			source: 'configVersion=0 (compat)',
		});
	});

	test('configVersion=1 non-workspace → hoisted', () => {
		expect(effectiveLinker({...base, configVersion: 1})).toEqual({strategy: 'hoisted', source: 'configVersion=1'});
	});

	test('configVersion=1 + workspace → isolated', () => {
		expect(effectiveLinker({...base, configVersion: 1, workspace: true})).toEqual({
			strategy: 'isolated',
			source: 'configVersion=1 + workspace',
		});
	});

	test('no lockfile (configVersion=-1) → hoisted default', () => {
		expect(effectiveLinker(base)).toEqual({strategy: 'hoisted', source: 'default'});
	});
});

describe('--help output (covers platformHelp internally)', () => {
	test('--help prints usage and bun scan.ts', () => {
		const {stdout} = Bun.spawnSync({
			cmd: [process.execPath, 'scan.ts', '--help'],
			cwd: import.meta.dir,
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const out = stdout.toString();
		expect(out).toContain('bun scan.ts');
		expect(out).toContain('Usage');
		expect(out).toContain('Modes');
	});
});

describe('shouldWarnMise', () => {
	test('win32 without MISE_SHELL → true', () => {
		expect(shouldWarnMise('win32', undefined)).toBe(true);
	});

	test('win32 with empty MISE_SHELL → true', () => {
		expect(shouldWarnMise('win32', '')).toBe(true);
	});

	test('win32 with MISE_SHELL set → false', () => {
		expect(shouldWarnMise('win32', 'pwsh')).toBe(false);
	});

	test('darwin without MISE_SHELL → false', () => {
		expect(shouldWarnMise('darwin', undefined)).toBe(false);
	});

	test('linux with MISE_SHELL → false', () => {
		expect(shouldWarnMise('linux', 'bash')).toBe(false);
	});
});

describe('parseTzFromEnv', () => {
	test('no files → default', () => {
		expect(parseTzFromEnv([])).toBe('-');
	});

	test('no TZ line → default', () => {
		expect(parseTzFromEnv(['FOO=bar\nBAZ=1'])).toBe('-');
	});

	test('simple TZ=', () => {
		expect(parseTzFromEnv(['TZ=America/Chicago'])).toBe('America/Chicago');
	});

	test('TZ with quotes', () => {
		expect(parseTzFromEnv(['TZ="Asia/Tokyo"'])).toBe('Asia/Tokyo');
		expect(parseTzFromEnv(["TZ='Europe/London'"])).toBe('Europe/London');
	});

	test('TZ with surrounding vars', () => {
		expect(parseTzFromEnv(['NODE_ENV=production\nTZ=UTC\nPORT=3000'])).toBe('UTC');
	});

	test('TZ with spaces around =', () => {
		expect(parseTzFromEnv(['TZ = America/New_York'])).toBe('America/New_York');
	});

	test('TZ with inline comment', () => {
		expect(parseTzFromEnv(['TZ=Pacific/Auckland # NZ time'])).toBe('Pacific/Auckland');
	});

	test('last file wins (Bun load order)', () => {
		expect(parseTzFromEnv(['TZ=America/Chicago', 'FOO=bar', 'TZ=Asia/Tokyo'])).toBe('Asia/Tokyo');
	});

	test('later file overrides earlier', () => {
		expect(parseTzFromEnv(['TZ=UTC', 'TZ=America/New_York'])).toBe('America/New_York');
	});

	test('file without TZ does not reset', () => {
		expect(parseTzFromEnv(['TZ=Europe/Berlin', 'NODE_ENV=test'])).toBe('Europe/Berlin');
	});

	test('getHours respects process.env.TZ', () => {
		const before = process.env.TZ;
		process.env.TZ = 'UTC';
		const utcHour = new Date('2026-02-03T12:00:00Z').getHours();
		process.env.TZ = 'Asia/Tokyo';
		const tokyoHour = new Date('2026-02-03T12:00:00Z').getHours();
		process.env.TZ = before;
		expect(utcHour).toBe(12);
		expect(tokyoHour).toBe(21);
	});

	test('dev in Chicago and junior dev in Tokyo see same UTC timestamp', () => {
		const before = process.env.TZ;
		const ts = '2026-06-15T18:30:00Z';

		// Senior dev in Chicago (UTC-5 CDT)
		process.env.TZ = 'America/Chicago';
		const chicagoLocal = new Date(ts).getHours();
		const chicagoIso = new Date(ts).toISOString();

		// Junior dev in Tokyo (UTC+9)
		process.env.TZ = 'Asia/Tokyo';
		const tokyoLocal = new Date(ts).getHours();
		const tokyoIso = new Date(ts).toISOString();

		process.env.TZ = before;

		// Local hours differ
		expect(chicagoLocal).toBe(13); // 1:30 PM CDT
		expect(tokyoLocal).toBe(3); // 3:30 AM +1 day JST

		// UTC timestamp is identical — scanner snapshots use ISO for comparison
		expect(chicagoIso).toBe(tokyoIso);
		expect(chicagoIso).toBe('2026-06-15T18:30:00.000Z');
	});

	test("project .env TZ is independent of developer's local TZ", () => {
		const before = process.env.TZ;
		const envFiles = ['TZ=Europe/Berlin'];

		// Dev in Chicago parses the same project
		process.env.TZ = 'America/Chicago';
		const fromChicago = parseTzFromEnv(envFiles);

		// Dev in Tokyo parses the same project
		process.env.TZ = 'Asia/Tokyo';
		const fromTokyo = parseTzFromEnv(envFiles);

		process.env.TZ = before;

		// Both devs see the project's configured TZ, not their own
		expect(fromChicago).toBe('Europe/Berlin');
		expect(fromTokyo).toBe('Europe/Berlin');
	});

	test('scanner local date differs per developer TZ for same instant', () => {
		const before = process.env.TZ;
		const ts = '2026-02-03T04:00:00Z'; // 4 AM UTC

		// Dev in Chicago: Feb 2, 10 PM
		process.env.TZ = 'America/Chicago';
		const chicagoDate = new Date(ts).getDate();
		const chicagoHour = new Date(ts).getHours();

		// Dev in Tokyo: Feb 3, 1 PM
		process.env.TZ = 'Asia/Tokyo';
		const tokyoDate = new Date(ts).getDate();
		const tokyoHour = new Date(ts).getHours();

		process.env.TZ = before;

		// Different local date — this is why snapshot stores both ISO and local
		expect(chicagoDate).toBe(2);
		expect(chicagoHour).toBe(22);
		expect(tokyoDate).toBe(3);
		expect(tokyoHour).toBe(13);
	});
});

describe('parseEnvVar', () => {
	test('returns default for empty input', () => {
		expect(parseEnvVar([], 'FOO')).toBe('-');
	});

	test('returns default when key not found', () => {
		expect(parseEnvVar(['BAR=1\nBAZ=2'], 'FOO')).toBe('-');
	});

	test('extracts BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS', () => {
		expect(parseEnvVar(['BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5'], 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS')).toBe('5');
	});

	test('extracts quoted values', () => {
		expect(parseEnvVar(['BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS="10"'], 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS')).toBe(
			'10',
		);
	});

	test('last file wins', () => {
		expect(
			parseEnvVar(
				['BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5', 'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=15'],
				'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS',
			),
		).toBe('15');
	});

	test('file without key does not reset', () => {
		expect(
			parseEnvVar(
				['BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5', 'NODE_ENV=production'],
				'BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS',
			),
		).toBe('5');
	});

	test('handles DO_NOT_TRACK', () => {
		expect(parseEnvVar(['DO_NOT_TRACK=1'], 'DO_NOT_TRACK')).toBe('1');
	});

	test('parseTzFromEnv delegates to parseEnvVar', () => {
		expect(parseTzFromEnv(['TZ=America/Chicago'])).toBe('America/Chicago');
		expect(parseEnvVar(['TZ=America/Chicago'], 'TZ')).toBe('America/Chicago');
	});
});

describe('Bun.semver integration (semverBumpType, isVulnerable, semverCompare)', () => {
	test('semverBumpType classifies patch bump', () => {
		expect(semverBumpType('1.2.3', '1.2.4')).toBe('patch');
	});

	test('semverBumpType classifies minor bump', () => {
		expect(semverBumpType('1.2.3', '1.3.0')).toBe('minor');
	});

	test('semverBumpType classifies major bump', () => {
		expect(semverBumpType('1.2.3', '2.0.0')).toBe('major');
	});

	test('semverBumpType returns null for same version', () => {
		expect(semverBumpType('1.2.3', '1.2.3')).toBeNull();
	});

	test('semverBumpType returns null for invalid input', () => {
		expect(semverBumpType('latest', '1.0.0')).toBeNull();
		expect(semverBumpType('1.0.0', 'nope')).toBeNull();
	});

	test('isVulnerable matches event-stream incident range', () => {
		expect(isVulnerable('3.3.6', '>=3.3.6 <4.0.0')).toBe(true);
		expect(isVulnerable('3.3.5', '>=3.3.6 <4.0.0')).toBe(false);
		expect(isVulnerable('4.0.0', '>=3.3.6 <4.0.0')).toBe(false);
	});

	test('isVulnerable handles caret and tilde ranges', () => {
		expect(isVulnerable('1.3.0', '^1.2.0')).toBe(true);
		expect(isVulnerable('2.0.0', '^1.2.0')).toBe(false);
		expect(isVulnerable('1.2.9', '~1.2.0')).toBe(true);
		expect(isVulnerable('1.3.0', '~1.2.0')).toBe(false);
	});

	test('semverCompare orders versions correctly', () => {
		expect(semverCompare('2.0.0', '1.0.0')).toBe(1);
		expect(semverCompare('1.0.0', '2.0.0')).toBe(-1);
		expect(semverCompare('1.0.0', '1.0.0')).toBe(0);
	});

	test('semverCompare handles patch and minor differences', () => {
		expect(semverCompare('1.2.4', '1.2.3')).toBe(1);
		expect(semverCompare('1.3.0', '1.2.9')).toBe(1);
		expect(semverCompare('1.0.0', '1.0.1')).toBe(-1);
	});
});

describe('ThreatFeedItemSchema (Zod validation)', () => {
	test('validates a valid threat feed item', () => {
		const item = {
			package: 'event-stream',
			version: '3.3.6',
			url: 'https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident',
			description: 'event-stream is a malicious package',
			categories: ['malware'],
		};
		expect(() => ThreatFeedItemSchema.parse(item)).not.toThrow();
	});

	test('validates item with nullable url and description', () => {
		const item = {
			package: 'bad-pkg',
			version: '1.0.0',
			url: null,
			description: null,
			categories: ['backdoor'],
		};
		expect(() => ThreatFeedItemSchema.parse(item)).not.toThrow();
	});

	test('validates all category types', () => {
		for (const cat of ['backdoor', 'botnet', 'malware', 'protestware', 'adware']) {
			const item = {package: 'x', version: '1.0.0', url: null, description: null, categories: [cat]};
			expect(() => ThreatFeedItemSchema.parse(item)).not.toThrow();
		}
	});

	test('rejects invalid category', () => {
		const item = {package: 'x', version: '1.0.0', url: null, description: null, categories: ['unknown']};
		expect(() => ThreatFeedItemSchema.parse(item)).toThrow();
	});

	test('rejects missing package field', () => {
		const item = {version: '1.0.0', url: null, description: null, categories: []};
		expect(() => ThreatFeedItemSchema.parse(item)).toThrow();
	});

	test('rejects non-string version', () => {
		const item = {package: 'x', version: 123, url: null, description: null, categories: []};
		expect(() => ThreatFeedItemSchema.parse(item)).toThrow();
	});

	test('validateThreatFeed parses valid array', () => {
		const feed = [
			{package: 'event-stream', version: '3.3.6', url: null, description: 'malicious', categories: ['malware']},
			{
				package: 'flatmap-stream',
				version: '0.1.1',
				url: null,
				description: 'backdoor',
				categories: ['backdoor', 'botnet'],
			},
		];
		const result = validateThreatFeed(feed);
		expect(result).toHaveLength(2);
		expect(result[0].package).toBe('event-stream');
		expect(result[1].categories).toContain('backdoor');
	});

	test('validateThreatFeed accepts empty array (no threats)', () => {
		expect(validateThreatFeed([])).toEqual([]);
	});

	test('validateThreatFeed throws on invalid data', () => {
		expect(() => validateThreatFeed('not an array')).toThrow();
		expect(() => validateThreatFeed([{bad: 'data'}])).toThrow();
	});
});

describe('Bun API integration (scanner uses Bun.hash, Bun.file, Bun.semver, dns)', () => {
	const scanTs = `${import.meta.dir}/scan.ts`;

	test('Bun.hash.wyhash produces consistent hex lockHash', () => {
		const content = 'lockfile content v1';
		const hash1 = Bun.hash.wyhash(content).toString(16);
		const hash2 = Bun.hash.wyhash(content).toString(16);
		expect(hash1).toBe(hash2);
		expect(hash1.length).toBeGreaterThan(0);
		// Different content → different hash
		const hash3 = Bun.hash.wyhash('lockfile content v2').toString(16);
		expect(hash3).not.toBe(hash1);
	});

	test('Bun.hash.wyhash handles binary (Uint8Array) like bun.lockb', () => {
		const bytes = new Uint8Array([0x00, 0x62, 0x75, 0x6e]); // \0bun header
		const hash = Bun.hash.wyhash(bytes).toString(16);
		expect(hash.length).toBeGreaterThan(0);
		// Same bytes → same hash
		expect(Bun.hash.wyhash(new Uint8Array([0x00, 0x62, 0x75, 0x6e])).toString(16)).toBe(hash);
	});

	test('Bun.hash accepts all input types: string, TypedArray, DataView, ArrayBuffer', () => {
		const str = 'some data here';
		const arr = new Uint8Array([1, 2, 3, 4]);

		const fromString = Bun.hash(str);
		const fromTypedArray = Bun.hash(arr);
		const fromArrayBuffer = Bun.hash(arr.buffer);
		const fromDataView = Bun.hash(new DataView(arr.buffer));

		// All return bigint
		expect(typeof fromString).toBe('bigint');
		expect(typeof fromTypedArray).toBe('bigint');
		expect(typeof fromArrayBuffer).toBe('bigint');
		expect(typeof fromDataView).toBe('bigint');

		// SharedArrayBuffer
		const shared = new SharedArrayBuffer(4);
		new Uint8Array(shared).set(arr);
		const fromShared = Bun.hash(shared);
		expect(typeof fromShared).toBe('bigint');

		// Same binary input via different views → same hash
		expect(fromTypedArray).toBe(fromArrayBuffer);
		expect(fromArrayBuffer).toBe(fromDataView);
		expect(fromDataView).toBe(fromShared);

		// String vs binary → different hash
		expect(fromString).not.toBe(fromTypedArray);
	});

	test('Bun.hash with integer seed', () => {
		expect(Bun.hash('some data here', 1234)).toBe(15724820720172937558n);
	});

	test('Bun.hash with BigInt seed above MAX_SAFE_INTEGER', () => {
		const bigSeed = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
		const hash = Bun.hash('data', bigSeed);
		expect(typeof hash).toBe('bigint');
		// Different from default seed
		expect(hash).not.toBe(Bun.hash('data'));
		// Different from small seed
		expect(hash).not.toBe(Bun.hash('data', 1234));
	});

	test('Bun.hash.wyhash with seed', () => {
		const a = Bun.hash.wyhash('data', 0);
		const b = Bun.hash.wyhash('data', 1234);
		expect(a).not.toBe(b); // different seeds → different hashes
		expect(typeof a).toBe('bigint');
	});

	test('all Bun.hash algorithms produce consistent output with seed', () => {
		const data = 'data';
		const seed = 1234;

		// 64-bit algorithms (return bigint)
		const wyhash = Bun.hash.wyhash(data, seed);
		const city64 = Bun.hash.cityHash64(data, seed);
		const xx64 = Bun.hash.xxHash64(data, seed);
		const xx3 = Bun.hash.xxHash3(data, seed);
		const murmur64 = Bun.hash.murmur64v2(data, seed);
		const rapid = Bun.hash.rapidhash(data, seed);

		for (const h of [wyhash, city64, xx64, xx3, murmur64, rapid]) {
			expect(typeof h).toBe('bigint');
			expect(h).toBeGreaterThan(0n);
		}

		// 32-bit algorithms (return number)
		const crc32 = Bun.hash.crc32(data, seed);
		const adler32 = Bun.hash.adler32(data, seed);
		const city32 = Bun.hash.cityHash32(data, seed);
		const xx32 = Bun.hash.xxHash32(data, seed);
		const murmur3 = Bun.hash.murmur32v3(data, seed);
		const murmur2 = Bun.hash.murmur32v2(data, seed);

		for (const h of [crc32, adler32, city32, xx32, murmur3, murmur2]) {
			expect(typeof h).toBe('number');
			expect(h).toBeGreaterThan(0);
		}

		// All 12 algorithms produce unique hashes for the same input
		const all = [
			wyhash,
			city64,
			xx64,
			xx3,
			murmur64,
			rapid,
			BigInt(crc32),
			BigInt(adler32),
			BigInt(city32),
			BigInt(xx32),
			BigInt(murmur3),
			BigInt(murmur2),
		];
		const unique = new Set(all.map(String));
		expect(unique.size).toBe(12);
	});

	test('all Bun.hash algorithms are deterministic', () => {
		const data = 'lockfile content';
		const seed = 42;

		// Run each twice — must be identical
		expect(Bun.hash.wyhash(data, seed)).toBe(Bun.hash.wyhash(data, seed));
		expect(Bun.hash.crc32(data, seed)).toBe(Bun.hash.crc32(data, seed));
		expect(Bun.hash.adler32(data, seed)).toBe(Bun.hash.adler32(data, seed));
		expect(Bun.hash.cityHash32(data, seed)).toBe(Bun.hash.cityHash32(data, seed));
		expect(Bun.hash.cityHash64(data, seed)).toBe(Bun.hash.cityHash64(data, seed));
		expect(Bun.hash.xxHash32(data, seed)).toBe(Bun.hash.xxHash32(data, seed));
		expect(Bun.hash.xxHash64(data, seed)).toBe(Bun.hash.xxHash64(data, seed));
		expect(Bun.hash.xxHash3(data, seed)).toBe(Bun.hash.xxHash3(data, seed));
		expect(Bun.hash.murmur32v3(data, seed)).toBe(Bun.hash.murmur32v3(data, seed));
		expect(Bun.hash.murmur32v2(data, seed)).toBe(Bun.hash.murmur32v2(data, seed));
		expect(Bun.hash.murmur64v2(data, seed)).toBe(Bun.hash.murmur64v2(data, seed));
		expect(Bun.hash.rapidhash(data, seed)).toBe(Bun.hash.rapidhash(data, seed));
	});

	test('Bun.file reads package.json and returns valid JSON', async () => {
		// Use any real project — scanner itself now has a package.json
		const file = Bun.file(`${import.meta.dir}/package.json`);
		expect(await file.exists()).toBe(true);
		const pkg = JSON.parse(await file.text());
		expect(pkg.name).toBe('security-scanner-api');
	});

	test('Bun.file.exists() returns false for missing files', async () => {
		const missing = Bun.file(`${import.meta.dir}/does-not-exist-xyz.json`);
		expect(await missing.exists()).toBe(false);
	});

	test('Bun.semver.satisfies matches vulnerability ranges', () => {
		// event-stream incident: 3.3.6 was malicious
		expect(Bun.semver.satisfies('3.3.6', '>=3.3.6 <4.0.0')).toBe(true);
		expect(Bun.semver.satisfies('4.0.0', '>=3.3.6 <4.0.0')).toBe(false);
		expect(Bun.semver.satisfies('3.3.5', '>=3.3.6 <4.0.0')).toBe(false);
		// Patch range
		expect(Bun.semver.satisfies('1.2.5', '>=1.0.0 <1.2.5')).toBe(false);
		expect(Bun.semver.satisfies('1.2.4', '>=1.0.0 <1.2.5')).toBe(true);
	});

	test('Bun.semver.satisfies handles caret and tilde ranges', () => {
		expect(Bun.semver.satisfies('1.3.0', '^1.2.0')).toBe(true);
		expect(Bun.semver.satisfies('2.0.0', '^1.2.0')).toBe(false);
		expect(Bun.semver.satisfies('1.2.9', '~1.2.0')).toBe(true);
		expect(Bun.semver.satisfies('1.3.0', '~1.2.0')).toBe(false);
	});

	test('dns.getCacheStats returns valid stats object', async () => {
		const {dns} = await import('bun');
		const stats = dns.getCacheStats();
		expect(stats).toHaveProperty('cacheHitsCompleted');
		expect(stats).toHaveProperty('cacheMisses');
		expect(stats).toHaveProperty('size');
		expect(stats).toHaveProperty('errors');
		expect(stats).toHaveProperty('totalCount');
		expect(typeof stats.totalCount).toBe('number');
	});

	test('--json output includes all ProjectInfo fields for every project', async () => {
		const proc = Bun.spawn(['bun', 'run', scanTs, '--json'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const out = await new Response(proc.stdout).text();
		await proc.exited;
		const projects = JSON.parse(out);
		expect(projects.length).toBeGreaterThan(0);

		// Every project must have the core fields
		const requiredFields = [
			'folder',
			'name',
			'deps',
			'devDeps',
			'totalDeps',
			'engine',
			'lock',
			'bunfig',
			'workspace',
			'hasPkg',
			'lockHash',
			'projectTz',
			'projectDnsTtl',
			'envFiles',
			'trustedDeps',
			'peerDeps',
			'peerDepsMeta',
			'installPeer',
			'installSecurityScanner',
			'runShell',
			'runBun',
			'runSilent',
			'debugEditor',
		];
		for (const p of projects) {
			for (const field of requiredFields) {
				expect(p).toHaveProperty(field);
			}
		}
	});

	test('every project with a lockfile has a non-empty lockHash', async () => {
		const proc = Bun.spawn(['bun', 'run', scanTs, '--json'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const out = await new Response(proc.stdout).text();
		await proc.exited;
		const projects = JSON.parse(out);

		const withLock = projects.filter((p: ProjectInfo) => p.lock === 'bun.lock' || p.lock === 'bun.lockb');
		expect(withLock.length).toBeGreaterThan(0);
		for (const p of withLock) {
			expect(p.lockHash).not.toBe('-');
			expect(p.lockHash.length).toBeGreaterThan(4); // hex hash
		}
	});

	test('all projects with package.json are scanned (none dropped)', async () => {
		const proc = Bun.spawn(['bun', 'run', scanTs, '--json'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const out = await new Response(proc.stdout).text();
		await proc.exited;
		const projects = JSON.parse(out);

		const withPkg = projects.filter((p: ProjectInfo) => p.hasPkg);
		// Must match the known project count from --audit (50)
		expect(withPkg.length).toBeGreaterThanOrEqual(50);

		// Every project with package.json should have a name
		for (const p of withPkg) {
			expect(p.name).not.toBe('-');
			expect(typeof p.deps).toBe('number');
			expect(typeof p.devDeps).toBe('number');
			expect(p.totalDeps).toBe(p.deps + p.devDeps);
		}
	});
});

describe('timezone subprocess (real TZ from command line)', () => {
	const scanTs = `${import.meta.dir}/scan.ts`;

	test('--tz flag sets timezone in output', async () => {
		const proc = Bun.spawn(['bun', 'run', scanTs, '--tz=Asia/Tokyo'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const out = await new Response(proc.stdout).text();
		await proc.exited;
		expect(out).toContain('Asia/Tokyo');
		expect(out).toContain('(TZ=Asia/Tokyo)');
	});

	test('TZ env var sets timezone in output', async () => {
		const proc = Bun.spawn(['bun', 'run', scanTs], {
			stdout: 'pipe',
			stderr: 'pipe',
			env: {...process.env, TZ: 'America/New_York'},
		});
		const out = await new Response(proc.stdout).text();
		await proc.exited;
		expect(out).toContain('America/New_York');
		expect(out).toContain('(TZ=America/New_York)');
	});

	test('Chicago dev and Tokyo dev get same project count', async () => {
		const run = (tz: string) => {
			const proc = Bun.spawn(['bun', 'run', scanTs, '--json'], {
				stdout: 'pipe',
				stderr: 'pipe',
				env: {...process.env, TZ: tz},
			});
			return new Response(proc.stdout).text();
		};
		const [chicagoOut, tokyoOut] = await Promise.all([run('America/Chicago'), run('Asia/Tokyo')]);
		const chicagoProjects = JSON.parse(chicagoOut);
		const tokyoProjects = JSON.parse(tokyoOut);
		expect(chicagoProjects.length).toBe(tokyoProjects.length);
		expect(chicagoProjects.length).toBeGreaterThan(0);
	});

	test('snapshot from Chicago dev is readable by Tokyo dev', async () => {
		const snapshotPath = `${import.meta.dir}/.audit/xref-snapshot.json`;
		// Chicago dev saves snapshot
		const save = Bun.spawn(['bun', 'run', scanTs, '--snapshot'], {
			stdout: 'pipe',
			stderr: 'pipe',
			env: {...process.env, TZ: 'America/Chicago'},
		});
		await save.exited;

		const snapshot = JSON.parse(await Bun.file(snapshotPath).text());
		expect(snapshot.tz).toBe('America/Chicago');
		expect(snapshot.timestamp).toContain('T'); // ISO format present

		// Tokyo dev compares against Chicago dev's snapshot
		const cmp = Bun.spawn(['bun', 'run', scanTs, '--compare'], {
			stdout: 'pipe',
			stderr: 'pipe',
			env: {...process.env, TZ: 'Asia/Tokyo'},
		});
		const cmpOut = await new Response(cmp.stdout).text();
		const code = await cmp.exited;
		expect(code).toBe(0);
		// Should show the Chicago snapshot's date in the delta header
		expect(cmpOut).toContain('America/Chicago');
	});

	test('Date instance local fields differ per TZ in real subprocess', async () => {
		// Spawn a script that prints Date fields — simulates what scanner does internally
		const script = `
      const now = new Date("2026-06-15T04:00:00Z");
      console.log(JSON.stringify({
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hours: now.getHours(),
        date: now.getDate(),
        month: now.getMonth(),
        iso: now.toISOString(),
      }));
    `;
		const run = (tz: string) => {
			const proc = Bun.spawn(['bun', '-e', script], {
				stdout: 'pipe',
				stderr: 'pipe',
				env: {...process.env, TZ: tz},
			});
			return new Response(proc.stdout).text().then(JSON.parse);
		};

		const [chicago, tokyo, utc] = await Promise.all([run('America/Chicago'), run('Asia/Tokyo'), run('UTC')]);

		// Each process sees its own TZ
		expect(chicago.tz).toBe('America/Chicago');
		expect(tokyo.tz).toBe('Asia/Tokyo');
		expect(utc.tz).toBe('UTC');

		// Same instant, different local hours (4 AM UTC)
		expect(utc.hours).toBe(4); // 4 AM UTC
		expect(chicago.hours).toBe(23); // 11 PM CDT (prev day)
		expect(tokyo.hours).toBe(13); // 1 PM JST

		// Date boundary: UTC Jun 15, Chicago still Jun 14, Tokyo Jun 15
		expect(utc.date).toBe(15);
		expect(chicago.date).toBe(14);
		expect(tokyo.date).toBe(15);

		// ISO is always UTC — identical across all three
		expect(chicago.iso).toBe(tokyo.iso);
		expect(tokyo.iso).toBe(utc.iso);
		expect(utc.iso).toBe('2026-06-15T04:00:00.000Z');
	});

	test('snapshot date field reflects local time, not UTC', async () => {
		const snapshotPath = `${import.meta.dir}/.audit/xref-snapshot.json`;

		// Save snapshot from Tokyo (UTC+9)
		const save = Bun.spawn(['bun', 'run', scanTs, '--snapshot'], {
			stdout: 'pipe',
			stderr: 'pipe',
			env: {...process.env, TZ: 'Asia/Tokyo'},
		});
		await save.exited;

		const snapshot = JSON.parse(await Bun.file(snapshotPath).text());
		expect(snapshot.tz).toBe('Asia/Tokyo');
		expect(snapshot.tzOverride).toBe(true);

		// date field should differ from the UTC portion of timestamp
		// Tokyo is UTC+9, so local hour >= UTC hour + 9
		const utcHour = parseInt(snapshot.timestamp.split('T')[1].slice(0, 2), 10);
		const localHour = parseInt(snapshot.date.split(' ')[1].slice(0, 2), 10);
		// Tokyo local hour = (utcHour + 9) % 24
		expect(localHour).toBe((utcHour + 9) % 24);
	});
});

describe('Zod schemas', () => {
	const defaults = {
		folder: 'test',
		name: 'test',
		version: '-',
		deps: 0,
		devDeps: 0,
		totalDeps: 0,
		engine: '-',
		lock: 'none',
		bunfig: false,
		workspace: false,
		keyDeps: [],
		author: '-',
		license: '-',
		description: '-',
		scriptsCount: 0,
		bin: [],
		registry: '-',
		authReady: false,
		hasNpmrc: false,
		hasBinDir: false,
		scopes: [],
		resilient: false,
		hasPkg: false,
		frozenLockfile: false,
		dryRun: false,
		production: false,
		exact: false,
		installOptional: true,
		installDev: true,
		installAuto: '-',
		linker: '-',
		configVersion: -1,
		backend: '-',
		minimumReleaseAge: 0,
		minimumReleaseAgeExcludes: [],
		saveTextLockfile: false,
		cacheDisabled: false,
		cacheDir: '-',
		cacheDisableManifest: false,
		globalDir: '-',
		globalBinDir: '-',
		hasCa: false,
		lockfileSave: true,
		lockfilePrint: '-',
		installSecurityScanner: '-',
		linkWorkspacePackages: false,
		noVerify: false,
		verbose: false,
		silent: false,
		concurrentScripts: 0,
		networkConcurrency: 0,
		targetCpu: '-',
		targetOs: '-',
		overrides: {},
		resolutions: {},
		trustedDeps: [],
		repo: '-',
		repoSource: '-',
		repoOwner: '-',
		repoHost: '-',
		envFiles: [],
		projectTz: 'UTC',
		projectDnsTtl: '-',
		bunfigEnvRefs: [],
		peerDeps: [],
		peerDepsMeta: [],
		installPeer: true,
		runShell: '-',
		runBun: false,
		runSilent: false,
		debugEditor: '-',
		hasTests: false,
		nativeDeps: [],
		workspacesList: [],
		lockHash: '-',
	};

	test('ProjectInfoSchema validates default scanProject shape', () => {
		expect(() => ProjectInfoSchema.parse(defaults)).not.toThrow();
	});

	test('ProjectInfoSchema rejects missing required field', () => {
		expect(() => ProjectInfoSchema.parse({folder: 'test'})).toThrow();
	});

	test('ProjectInfoSchema rejects wrong type', () => {
		const bad = {...defaults, deps: 'not-a-number'};
		expect(() => ProjectInfoSchema.parse(bad)).toThrow();
	});

	test('XrefSnapshotSchema validates snapshot shape', () => {
		const snapshot = {
			timestamp: '2025-01-01T00:00:00.000Z',
			date: '2025-01-01',
			tz: 'UTC',
			tzOverride: false,
			projects: [],
			totalBunDefault: 0,
			totalProjects: 0,
		};
		expect(() => XrefSnapshotSchema.parse(snapshot)).not.toThrow();
	});

	test('XrefSnapshotSchema rejects invalid project entry', () => {
		const bad = {
			timestamp: '2025-01-01T00:00:00.000Z',
			date: '2025-01-01',
			tz: 'UTC',
			tzOverride: false,
			projects: [{folder: 123}],
			totalBunDefault: 0,
			totalProjects: 0,
		};
		expect(() => XrefSnapshotSchema.parse(bad)).toThrow();
	});

	test('PackageJsonSchema accepts minimal package.json', () => {
		expect(() => PackageJsonSchema.parse({})).not.toThrow();
	});

	test('PackageJsonSchema accepts full package.json', () => {
		const full = {
			name: 'test',
			version: '1.0.0',
			dependencies: {foo: '^1.0.0'},
			devDependencies: {bar: '^2.0.0'},
			scripts: {test: 'bun test'},
			workspaces: ['packages/*'],
		};
		expect(() => PackageJsonSchema.parse(full)).not.toThrow();
	});

	test('PackageJsonSchema passes through unknown fields', () => {
		const withExtra = {name: 'test', customField: true};
		const result = PackageJsonSchema.parse(withExtra);
		expect((result as Record<string, unknown>).customField).toBe(true);
	});
});

describe('NO_COLOR awareness', () => {
	test('NO_COLOR=1 suppresses ANSI escape sequences in --help output', async () => {
		const {FORCE_COLOR: _, ...cleanEnv} = process.env;
		const proc = Bun.spawn(['bun', 'run', 'scan.ts', '--help'], {
			cwd: import.meta.dir,
			env: {...cleanEnv, NO_COLOR: '1'},
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stdout = await new Response(proc.stdout).text();
		await proc.exited;
		// Should not contain any ANSI escape sequences
		expect(stdout).not.toMatch(/\x1b\[/);
		// But should still contain meaningful output
		expect(stdout).toContain('--help');
	});

	test('FORCE_COLOR=1 overrides NO_COLOR', async () => {
		const proc = Bun.spawn(['bun', 'run', 'scan.ts', '--help'], {
			cwd: import.meta.dir,
			env: {...process.env, NO_COLOR: '1', FORCE_COLOR: '1'},
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stdout = await new Response(proc.stdout).text();
		await proc.exited;
		// FORCE_COLOR should win — output should contain ANSI sequences
		expect(stdout).toMatch(/\x1b\[/);
	});
});

describe('DNS prefetch dry-run', () => {
	test('--fix-dns --dry-run produces domain output without errors', async () => {
		const proc = Bun.spawn(['bun', 'run', 'scan.ts', '--fix-dns', '--dry-run'], {
			cwd: import.meta.dir,
			env: {...process.env, NO_COLOR: '1'},
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;
		// Should complete without error
		expect(exitCode).toBe(0);
		// Should mention domain count or project output
		expect(stdout).toMatch(/domain\(s\) detected|DRY|SKIP/);
		// Should mention dry run
		expect(stdout).toMatch(/dry.run|Run without/i);
	});
});

// ── Keychain token security tests ─────────────────────────────────────
describe('classifyKeychainError', () => {
	test('classifies permission errors as ACCESS_DENIED', () => {
		const result = classifyKeychainError(new Error('User denied access'));
		expect(result.ok).toBe(false);
		expect(result.code).toBe('ACCESS_DENIED');
		expect(result.reason).toContain('denied');
	});

	test('classifies authorization errors as ACCESS_DENIED', () => {
		const result = classifyKeychainError(new Error('authorization failed'));
		expect(result.code).toBe('ACCESS_DENIED');
	});

	test('classifies permission not allowed as ACCESS_DENIED', () => {
		const result = classifyKeychainError(new Error('operation not allowed'));
		expect(result.code).toBe('ACCESS_DENIED');
	});

	test('classifies not found errors as NOT_FOUND', () => {
		const result = classifyKeychainError(new Error('The specified item could not be found in the keychain'));
		expect(result.code).toBe('NOT_FOUND');
	});

	test("classifies 'no such' errors as NOT_FOUND", () => {
		const result = classifyKeychainError(new Error('no such keychain item'));
		expect(result.code).toBe('NOT_FOUND');
	});

	test('classifies unknown errors as OS_ERROR', () => {
		const result = classifyKeychainError(new Error('unexpected internal failure'));
		expect(result.code).toBe('OS_ERROR');
		expect(result.reason).toContain('unexpected internal failure');
	});

	test('handles non-Error values', () => {
		const result = classifyKeychainError('string error');
		expect(result.ok).toBe(false);
		expect(result.code).toBe('OS_ERROR');
		expect(result.reason).toContain('string error');
	});

	test('handles null/undefined', () => {
		const result = classifyKeychainError(null);
		expect(result.ok).toBe(false);
		expect(result.code).toBe('OS_ERROR');
	});
});

describe('tokenSource', () => {
	const origEnv: Record<string, string | undefined> = {};

	test("returns 'env' when env var is set", () => {
		origEnv.FW_REGISTRY_TOKEN = Bun.env.FW_REGISTRY_TOKEN;
		process.env.FW_REGISTRY_TOKEN = 'from-env';
		expect(tokenSource('FW_REGISTRY_TOKEN')).toBe('env');
		// restore
		if (origEnv.FW_REGISTRY_TOKEN === undefined) delete process.env.FW_REGISTRY_TOKEN;
		else process.env.FW_REGISTRY_TOKEN = origEnv.FW_REGISTRY_TOKEN;
	});

	test("returns 'not set' for unknown token names", () => {
		delete process.env.__TEST_NONEXISTENT_TOKEN__;
		expect(tokenSource('__TEST_NONEXISTENT_TOKEN__')).toBe('not set');
	});
});

describe('timeSince', () => {
	test('returns seconds for recent dates', () => {
		const recent = new Date(Date.now() - 30_000);
		expect(timeSince(recent)).toBe('30s ago');
	});

	test('returns minutes', () => {
		const fiveMin = new Date(Date.now() - 5 * 60_000);
		expect(timeSince(fiveMin)).toBe('5m ago');
	});

	test('returns hours', () => {
		const threeHours = new Date(Date.now() - 3 * 3_600_000);
		expect(timeSince(threeHours)).toBe('3h ago');
	});

	test('returns days', () => {
		const twoDays = new Date(Date.now() - 2 * 86_400_000);
		expect(timeSince(twoDays)).toBe('2d ago');
	});

	test('90 days shows rotation-worthy age', () => {
		const ninetyDays = new Date(Date.now() - 90 * 86_400_000);
		expect(timeSince(ninetyDays)).toBe('90d ago');
	});
});

describe('keychainGet / keychainSet / keychainDelete (live keychain)', () => {
	const TEST_TOKEN = '__SCANNER_TEST_TOKEN__';

	test('stores and retrieves a token', async () => {
		const setResult = await keychainSet(TEST_TOKEN, 'test-value-123');
		expect(setResult.ok).toBe(true);

		const getResult = await keychainGet(TEST_TOKEN);
		expect(getResult.ok).toBe(true);
		if (getResult.ok) expect(getResult.value).toBe('test-value-123');
	});

	test('overwrites an existing token', async () => {
		await keychainSet(TEST_TOKEN, 'old-value');
		await keychainSet(TEST_TOKEN, 'new-value');

		const result = await keychainGet(TEST_TOKEN);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe('new-value');
	});

	test('deletes a token and confirms absence', async () => {
		await keychainSet(TEST_TOKEN, 'to-be-deleted');
		const delResult = await keychainDelete(TEST_TOKEN);
		expect(delResult.ok).toBe(true);
		if (delResult.ok) expect(delResult.value).toBe(true);

		const getResult = await keychainGet(TEST_TOKEN);
		expect(getResult.ok).toBe(true);
		if (getResult.ok) expect(getResult.value).toBeNull();
	});

	test('delete returns false for non-existent token', async () => {
		// ensure it doesn't exist
		await keychainDelete(TEST_TOKEN);
		const result = await keychainDelete(TEST_TOKEN);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe(false);
	});

	test('get returns null for non-existent token', async () => {
		await keychainDelete(TEST_TOKEN);
		const result = await keychainGet('__SCANNER_DOES_NOT_EXIST__');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBeNull();
	});

	// Cleanup
	test('cleanup test token', async () => {
		await keychainDelete(TEST_TOKEN);
		const result = await keychainGet(TEST_TOKEN);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBeNull();
	});
});

describe('token security edge cases', () => {
	test('empty string token value is stored and retrieved', async () => {
		const name = '__SCANNER_EMPTY_TEST__';
		const setResult = await keychainSet(name, '');
		expect(setResult.ok).toBe(true);
		const getResult = await keychainGet(name);
		expect(getResult.ok).toBe(true);
		// empty string should round-trip with Bun.secrets
		if (getResult.ok) expect(getResult.value).toBe('');
		await keychainDelete(name);
	});

	test('token with special characters', async () => {
		const name = '__SCANNER_SPECIAL_TEST__';
		const value = 't0k3n!@#$%^&*()_+-={}[]|;\':",./<>?';
		const setResult = await keychainSet(name, value);
		expect(setResult.ok).toBe(true);
		const getResult = await keychainGet(name);
		expect(getResult.ok).toBe(true);
		if (getResult.ok) expect(getResult.value).toBe(value);
		await keychainDelete(name);
	});

	test('token with newlines', async () => {
		const name = '__SCANNER_NEWLINE_TEST__';
		const value = 'line1\nline2\nline3';
		const setResult = await keychainSet(name, value);
		expect(setResult.ok).toBe(true);
		const getResult = await keychainGet(name);
		expect(getResult.ok).toBe(true);
		if (getResult.ok) expect(getResult.value).toBe(value);
		await keychainDelete(name);
	});

	test('BUN_KEYCHAIN_SERVICE is reverse-domain format', () => {
		expect(BUN_KEYCHAIN_SERVICE).toBe('dev.bun.scanner');
		expect(BUN_KEYCHAIN_SERVICE).toMatch(/^[a-z]+\.[a-z]+\.[a-z]+$/);
	});

	test('BUN_KEYCHAIN_TOKEN_NAMES contains expected tokens', () => {
		expect(BUN_KEYCHAIN_TOKEN_NAMES).toContain('FW_REGISTRY_TOKEN');
		expect(BUN_KEYCHAIN_TOKEN_NAMES).toContain('REGISTRY_TOKEN');
		expect(BUN_KEYCHAIN_TOKEN_NAMES.length).toBe(2);
	});

	test('rotation detection: 90+ day old token', () => {
		const stored = new Date(Date.now() - 91 * 86_400_000);
		const ageDays = Math.floor((Date.now() - stored.getTime()) / 86_400_000);
		expect(ageDays).toBeGreaterThanOrEqual(90);
		expect(timeSince(stored)).toBe('91d ago');
	});

	test('rotation detection: fresh token within policy', () => {
		const stored = new Date(Date.now() - 5 * 86_400_000);
		const ageDays = Math.floor((Date.now() - stored.getTime()) / 86_400_000);
		expect(ageDays).toBeLessThan(90);
		expect(timeSince(stored)).toBe('5d ago');
	});

	// ── isValidTokenName ──────────────────────────────────────────────────
	test('isValidTokenName accepts known names', () => {
		expect(isValidTokenName('FW_REGISTRY_TOKEN')).toBe(true);
		expect(isValidTokenName('REGISTRY_TOKEN')).toBe(true);
	});

	test('isValidTokenName rejects arbitrary names', () => {
		expect(isValidTokenName('RANDOM_NAME')).toBe(false);
		expect(isValidTokenName('')).toBe(false);
		expect(isValidTokenName('fw_registry_token')).toBe(false); // case-sensitive
	});

	// ── validateTokenValue ────────────────────────────────────────────────
	test('validateTokenValue rejects empty string', () => {
		const r = validateTokenValue('');
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.reason).toContain('empty');
	});

	test('validateTokenValue rejects whitespace-only', () => {
		const r = validateTokenValue('   \t\n  ');
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.reason).toContain('whitespace');
	});

	test('validateTokenValue rejects values under 8 chars', () => {
		const r = validateTokenValue('abc');
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.reason).toContain('too short');
	});

	test('validateTokenValue rejects single repeated character', () => {
		const r = validateTokenValue('aaaaaaaa');
		expect(r.valid).toBe(false);
		if (!r.valid) expect(r.reason).toContain('repeated');
	});

	test('validateTokenValue accepts real-looking tokens', () => {
		expect(validateTokenValue('npm_Abc123XyZ4567890')).toEqual({valid: true});
		expect(validateTokenValue('ghp_abcdefghijklmnop')).toEqual({valid: true});
		expect(validateTokenValue('t0k3n!@#$%^&*()')).toEqual({valid: true});
	});

	// ── tokenValueWarnings ────────────────────────────────────────────────
	test('tokenValueWarnings warns on placeholder values', () => {
		expect(tokenValueWarnings('test1234').length).toBeGreaterThan(0);
		expect(tokenValueWarnings('password').length).toBeGreaterThan(0);
		expect(tokenValueWarnings('changeme').length).toBeGreaterThan(0);
		expect(tokenValueWarnings('CHANGEME').length).toBeGreaterThan(0);
	});

	test('tokenValueWarnings returns empty for real tokens', () => {
		expect(tokenValueWarnings('npm_Abc123XyZ4567890')).toEqual([]);
		expect(tokenValueWarnings('ghp_abcdefghijklmnop')).toEqual([]);
	});
});

describe('RSS feed helpers', () => {
	// ── escapeXml ───────────────────────────────────────────────────────
	test('escapeXml escapes &, <, >, ", \'', () => {
		expect(escapeXml('Tom & Jerry <"friends"> aren\'t')).toBe(
			'Tom &amp; Jerry &lt;&quot;friends&quot;&gt; aren&#x27;t',
		);
		expect(escapeXml('clean text')).toBe('clean text');
	});

	// ── decodeXmlEntities ───────────────────────────────────────────────
	test('decodeXmlEntities decodes entities and strips CDATA', () => {
		expect(decodeXmlEntities('&amp; &lt; &gt; &quot; &apos;')).toBe('& < > " \'');
		expect(decodeXmlEntities('<![CDATA[hello <world>]]>')).toBe('hello <world>');
		expect(decodeXmlEntities('no entities')).toBe('no entities');
	});

	// ── generateRssXml ─────────────────────────────────────────────────
	test('generateRssXml produces valid RSS 2.0 structure with correct escaping', () => {
		const xml = generateRssXml({
			title: 'Test & Feed',
			description: 'A <test> feed',
			link: 'https://example.com',
			items: [
				{
					title: 'Item 1',
					description: 'Desc 1',
					link: 'https://example.com/1',
					pubDate: '2025-01-02T00:00:00Z',
				},
				{title: 'Item 2', description: 'Desc 2', pubDate: '2025-01-03T00:00:00Z'},
			],
		});
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0"');
		expect(xml).toContain('<title>Test &amp; Feed</title>');
		expect(xml).toContain('<description>A &lt;test&gt; feed</description>');
		expect(xml).toContain('<generator>Bun-Scanner</generator>');
		expect(xml).toContain('<language>en-us</language>');
		expect(xml).toContain('<pubDate>');
		expect(xml).toContain('<lastBuildDate>');
		expect(xml).toContain('rel="self"');
		// Item 2 (newer) should appear before Item 1
		const idx1 = xml.indexOf('Item 1');
		const idx2 = xml.indexOf('Item 2');
		expect(idx2).toBeLessThan(idx1);
	});

	// ── parseRssFeed (RSS 2.0) ─────────────────────────────────────────
	test('parseRssFeed parses RSS 2.0 items', () => {
		const xml = `<rss version="2.0"><channel>
      <item>
        <title>Advisory A</title>
        <link>https://example.com/a</link>
        <description>Affects lodash</description>
        <pubDate>Mon, 01 Jan 2025 00:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Advisory B</title>
        <link>https://example.com/b</link>
        <description>Affects express</description>
        <pubDate>Tue, 02 Jan 2025 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
		const items = parseRssFeed(xml);
		expect(items).toHaveLength(2);
		expect(items[0].title).toBe('Advisory A');
		expect(items[0].link).toBe('https://example.com/a');
		expect(items[0].description).toBe('Affects lodash');
		expect(items[1].title).toBe('Advisory B');
	});

	// ── parseRssFeed (Atom) ─────────────────────────────────────────────
	test('parseRssFeed parses Atom entries (title, link href=, summary, published)', () => {
		const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>CVE-2025-0001</title>
        <link href="https://ghsa.example/1"/>
        <summary>Buffer overflow in zlib</summary>
        <published>2025-03-15T12:00:00Z</published>
      </entry>
      <entry>
        <title>CVE-2025-0002</title>
        <link href="https://ghsa.example/2"/>
        <content>XSS in react-dom</content>
        <updated>2025-03-16T08:00:00Z</updated>
      </entry>
    </feed>`;
		const items = parseRssFeed(xml);
		expect(items).toHaveLength(2);
		expect(items[0].title).toBe('CVE-2025-0001');
		expect(items[0].link).toBe('https://ghsa.example/1');
		expect(items[0].description).toBe('Buffer overflow in zlib');
		expect(items[0].pubDate).toBe('2025-03-15T12:00:00Z');
		expect(items[1].title).toBe('CVE-2025-0002');
		expect(items[1].description).toBe('XSS in react-dom');
		expect(items[1].pubDate).toBe('2025-03-16T08:00:00Z');
	});

	// ── parseRssFeed (garbage) ──────────────────────────────────────────
	test('parseRssFeed returns empty array for garbage input', () => {
		expect(parseRssFeed('not xml at all')).toEqual([]);
		expect(parseRssFeed('')).toEqual([]);
		expect(parseRssFeed('<html><body>nope</body></html>')).toEqual([]);
	});

	// ── parseRssFeed (CDATA) ───────────────────────────────────────────
	test('parseRssFeed handles CDATA content', () => {
		const xml = `<rss version="2.0"><channel>
      <item>
        <title><![CDATA[Alert: <critical>]]></title>
        <description><![CDATA[Use &amp; in code]]></description>
        <pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
		const items = parseRssFeed(xml);
		expect(items).toHaveLength(1);
		expect(items[0].title).toBe('Alert: <critical>');
		expect(items[0].description).toBe('Use & in code');
	});
});

describe('RSS constants', () => {
	test('BUN_TOKEN_AUDIT_RSS_PATH ends with .rss.xml and lives in .audit', () => {
		expect(BUN_TOKEN_AUDIT_RSS_PATH).toEndWith('/token-events.rss.xml');
		expect(BUN_TOKEN_AUDIT_RSS_PATH).toContain('.audit/');
	});

	test('BUN_SCAN_RESULTS_RSS_PATH ends with .rss.xml and lives in .audit', () => {
		expect(BUN_SCAN_RESULTS_RSS_PATH).toEndWith('/scan-results.rss.xml');
		expect(BUN_SCAN_RESULTS_RSS_PATH).toContain('.audit/');
	});

	test('BUN_ADVISORY_MATCHES_PATH ends with .jsonl and lives in .audit', () => {
		expect(BUN_ADVISORY_MATCHES_PATH).toEndWith('/advisory-matches.jsonl');
		expect(BUN_ADVISORY_MATCHES_PATH).toContain('.audit/');
	});

	test('all three paths share the same .audit directory prefix', () => {
		const dir = (p: string) => p.slice(0, p.lastIndexOf('/'));
		const d = dir(BUN_TOKEN_AUDIT_RSS_PATH);
		expect(dir(BUN_SCAN_RESULTS_RSS_PATH)).toBe(d);
		expect(dir(BUN_ADVISORY_MATCHES_PATH)).toBe(d);
	});

	test('paths are absolute', () => {
		expect(BUN_TOKEN_AUDIT_RSS_PATH).toMatch(/^\//);
		expect(BUN_SCAN_RESULTS_RSS_PATH).toMatch(/^\//);
		expect(BUN_ADVISORY_MATCHES_PATH).toMatch(/^\//);
	});
});

describe('RSS round-trip (generate → parse)', () => {
	test('parseRssFeed can parse output of generateRssXml', () => {
		const channel = {
			title: 'Round-trip test',
			description: 'Testing generate → parse',
			link: 'https://example.com/feed',
			items: [
				{
					title: 'First',
					description: 'Desc A',
					link: 'https://example.com/1',
					pubDate: 'Mon, 01 Jan 2025 00:00:00 GMT',
				},
				{
					title: 'Second',
					description: 'Desc B',
					link: 'https://example.com/2',
					pubDate: 'Tue, 02 Jan 2025 00:00:00 GMT',
				},
				{
					title: 'Third',
					description: 'Desc C',
					pubDate: 'Wed, 03 Jan 2025 00:00:00 GMT',
					guid: 'custom-guid-3',
				},
			],
		};
		const xml = generateRssXml(channel);
		const parsed = parseRssFeed(xml);
		expect(parsed).toHaveLength(3);
		// generateRssXml sorts newest-first, so Third is first
		expect(parsed[0].title).toBe('Third');
		expect(parsed[1].title).toBe('Second');
		expect(parsed[2].title).toBe('First');
		expect(parsed[2].link).toBe('https://example.com/1');
		// descriptions survive the escape/decode round-trip
		expect(parsed[0].description).toBe('Desc C');
	});

	test('round-trip preserves special characters', () => {
		const xml = generateRssXml({
			title: 'Special & chars',
			description: 'Test <b>bold</b>',
			link: 'https://example.com',
			items: [
				{
					title: 'He said "hello" & <goodbye>',
					description: "It's a 'test'",
					pubDate: 'Mon, 01 Jan 2025 00:00:00 GMT',
				},
			],
		});
		const parsed = parseRssFeed(xml);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].title).toBe('He said "hello" & <goodbye>');
		expect(parsed[0].description).toBe("It's a 'test'");
	});
});

describe('getGitCommitHash', () => {
	test('returns a 40-char hex SHA from the scanner repo', () => {
		const hash = getGitCommitHash();
		expect(hash).toMatch(/^[0-9a-f]{40}$/);
	});

	test('matches git rev-parse HEAD via Bun.spawnSync', () => {
		const {stdout} = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {stdout: 'pipe', stderr: 'ignore'});
		expect(getGitCommitHash()).toBe(stdout.toString().trim());
	});

	test('returns empty string for non-git directory', () => {
		expect(getGitCommitHash('/')).toBe('');
	});

	test('short form returns first 9 chars', () => {
		const full = getGitCommitHash();
		const short = getGitCommitHashShort();
		expect(short).toBe(full.slice(0, 9));
		expect(short).toHaveLength(9);
	});

	test('short form returns empty string for non-git directory', () => {
		expect(getGitCommitHashShort('/')).toBe('');
	});
});
