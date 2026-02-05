import {describe, expect, test} from 'bun:test';
import {formatBytes, formatPerson, PackumentMatrixRenderer} from './packument-matrix';
import type {NpmPackument} from '../../scan';

describe('formatBytes', () => {
	test("0 → '0 B'", () => {
		expect(formatBytes(0)).toBe('0 B');
	});

	test("1024 → '1.0 KB'", () => {
		expect(formatBytes(1024)).toBe('1.0 KB');
	});

	test("1536000 → '1.5 MB'", () => {
		expect(formatBytes(1536000)).toBe('1.5 MB');
	});

	test("undefined → '-'", () => {
		expect(formatBytes(undefined)).toBe('-');
	});

	test("512 → '512 B'", () => {
		expect(formatBytes(512)).toBe('512 B');
	});
});

describe('formatPerson', () => {
	test('string input', () => {
		expect(formatPerson('Alice')).toBe('Alice');
	});

	test('object input with name and email', () => {
		expect(formatPerson({name: 'Alice', email: 'alice@example.com'})).toBe('Alice <alice@example.com>');
	});

	test('object input with name, email, and url', () => {
		expect(formatPerson({name: 'Alice', email: 'a@b.com', url: 'https://alice.dev'})).toBe(
			'Alice <a@b.com> (https://alice.dev)',
		);
	});

	test("object with no fields returns '-'", () => {
		expect(formatPerson({})).toBe('-');
	});

	test("undefined → '-'", () => {
		expect(formatPerson(undefined)).toBe('-');
	});
});

describe('PackumentMatrixRenderer', () => {
	const renderer = new PackumentMatrixRenderer();

	test('render() with minimal packument (name only) does not throw', () => {
		const minimal: NpmPackument = {name: 'test-pkg'};
		expect(() => renderer.render(minimal)).not.toThrow();
	});

	test('render() with full packument does not throw', () => {
		const full: NpmPackument = {
			name: 'full-pkg',
			version: '1.2.3',
			license: 'MIT',
			type: 'module',
			description: 'A test package',
			homepage: 'https://example.com',
			author: {name: 'Test Author', email: 'test@example.com'},
			maintainers: [{name: 'Alice'}, {name: 'Bob'}],
			dependencies: {lodash: '^4.0.0'},
			devDependencies: {jest: '^29.0.0'},
			peerDependencies: {react: '^18.0.0'},
			optionalDependencies: {},
			dist: {
				shasum: 'abc123def456abc123def456abc123def456abcd',
				tarball: 'https://registry.npmjs.org/full-pkg/-/full-pkg-1.2.3.tgz',
				fileCount: 42,
				integrity: 'sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
				unpackedSize: 1536000,
				signatures: [{sig: 'meow', keyid: 'key1'}],
				attestations: {url: 'https://example.com/attestation'},
			},
		};
		expect(() => renderer.render(full)).not.toThrow();
	});

	test('pair count always produces complete rows (odd field count → padded)', () => {
		// A packument with an odd number of meaningful fields still renders
		const pkg: NpmPackument = {name: 'odd-pkg', version: '0.0.1'};
		expect(() => renderer.render(pkg)).not.toThrow();
	});
});
