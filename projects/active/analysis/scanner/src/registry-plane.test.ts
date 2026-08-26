import {describe, expect, test} from 'bun:test';
import {FACTORY_WAGER_CANONICAL_READ_URL, auditRegistryConfig, registryPlaneContract} from './registry-plane';

describe('registryPlaneContract', () => {
	test('canonical read plane is tokenless GET/HEAD only', () => {
		expect(registryPlaneContract('read')).toEqual({
			plane: 'read',
			url: FACTORY_WAGER_CANONICAL_READ_URL,
			auth: 'none',
			methods: ['GET', 'HEAD'],
			writable: false,
		});
	});

	test('rejects read URL drift', () => {
		expect(() => registryPlaneContract('read', 'https://registry.factory-wager.com')).toThrow(
			'read plane must equal',
		);
	});

	test('allows explicit HTTP loopback local writes', () => {
		expect(registryPlaneContract('local-write', 'http://127.1.2.3:4873').writable).toBe(true);
		expect(registryPlaneContract('local-write', 'http://[::1]:4873').auth).toBe('runtime-local-token');
	});

	test('rejects non-loopback and HTTPS local writes', () => {
		expect(() => registryPlaneContract('local-write', 'https://localhost:4873')).toThrow('must use http');
		expect(() => registryPlaneContract('local-write', FACTORY_WAGER_CANONICAL_READ_URL)).toThrow('must use http');
		expect(() => registryPlaneContract('local-write', 'http://registry.internal:4873')).toThrow('must use http');
	});

	test('does not infer a production HTTP write destination', () => {
		expect(registryPlaneContract('production-write')).toEqual({
			plane: 'production-write',
			url: null,
			auth: 'separately-authorized-r2',
			methods: [],
			writable: false,
		});
		expect(() => registryPlaneContract('production-write', 'https://registry.example.com')).toThrow(
			'must not infer an HTTP registry destination',
		);
	});
});

describe('auditRegistryConfig', () => {
	test('flags package and Bun publish destinations on the read plane', () => {
		const findings = auditRegistryConfig({
			packageJson: JSON.stringify({publishConfig: {registry: FACTORY_WAGER_CANONICAL_READ_URL}}),
			bunfig: `[install]\nregistry = "${FACTORY_WAGER_CANONICAL_READ_URL}"\n\n[publish]\nregistry = "${FACTORY_WAGER_CANONICAL_READ_URL}"\n`,
		});
		expect(findings.map(finding => `${finding.file}:${finding.code}`)).toEqual([
			'package.json:publish-to-read',
			'bunfig.toml:publish-to-read',
		]);
	});

	test('flags credentials attached to the public read origin', () => {
		const findings = auditRegistryConfig({
			npmrc: `@factorywager:registry=${FACTORY_WAGER_CANONICAL_READ_URL}\n//registry.factory-wager.com/api/npm/:_authToken=\${FW_REGISTRY_TOKEN}\n`,
		});
		expect(findings).toContainEqual({
			code: 'public-read-token',
			file: '.npmrc',
			message: 'public read origin must not receive an auth token',
		});
	});

	test('accepts a tokenless read mapping with no publish destination', () => {
		expect(
			auditRegistryConfig({
				packageJson: JSON.stringify({private: true}),
				bunfig: `[install.scopes]\n"@factorywager" = "${FACTORY_WAGER_CANONICAL_READ_URL}"\n`,
				npmrc: `@factorywager:registry=${FACTORY_WAGER_CANONICAL_READ_URL}\n`,
			}),
		).toEqual([]);
	});
});

describe('registry plane CLI', () => {
	test('requires an explicit root and refuses apply mode', () => {
		const missingRoot = Bun.spawnSync([process.execPath, 'src/registry-plane.ts', '--plane', 'read'], {
			cwd: import.meta.dir.replace(/\/src$/, ''),
			stdout: 'pipe',
			stderr: 'pipe',
		});
		expect(missingRoot.exitCode).toBe(2);
		expect(missingRoot.stderr.toString()).toContain('--root is required');

		const apply = Bun.spawnSync(
			[process.execPath, 'src/registry-plane.ts', '--plane', 'read', '--root', '.', '--apply'],
			{cwd: import.meta.dir.replace(/\/src$/, ''), stdout: 'pipe', stderr: 'pipe'},
		);
		expect(apply.exitCode).toBe(2);
		expect(apply.stderr.toString()).toContain('report-only');
	});

	test('legacy mass registry fixes fail before discovery or mutation', () => {
		const scannerRoot = import.meta.dir.replace(/\/src$/, '');
		for (const flag of ['--fix-registry', '--fix-scopes', '--fix-npmrc']) {
			const result = Bun.spawnSync(
				[process.execPath, 'scan.ts', flag, FACTORY_WAGER_CANONICAL_READ_URL, '--dry-run'],
				{
					cwd: scannerRoot,
					env: {...process.env, BUN_PLATFORM_HOME: scannerRoot},
					stdout: 'pipe',
					stderr: 'pipe',
				},
			);
			expect(result.exitCode).toBe(2);
			expect(result.stderr.toString()).toContain(
				'is retired because it conflated registry read, write, and auth planes',
			);
		}
	});
});
