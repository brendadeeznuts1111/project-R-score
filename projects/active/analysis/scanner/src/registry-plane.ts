#!/usr/bin/env bun

import {parseArgs} from 'node:util';
import {resolve} from 'node:path';

export const FACTORY_WAGER_CANONICAL_READ_URL = 'https://registry.factory-wager.com/api/npm' as const;
export const FACTORY_WAGER_DEFAULT_LOCAL_WRITE_URL = 'http://localhost:3000' as const;

export type RegistryPlane = 'read' | 'local-write' | 'production-write';

export interface RegistryPlaneContract {
	plane: RegistryPlane;
	url: string | null;
	auth: 'none' | 'runtime-local-token' | 'separately-authorized-r2';
	methods: readonly string[];
	writable: boolean;
}

export interface RegistryConfigInput {
	packageJson?: string;
	bunfig?: string;
	npmrc?: string;
}

export interface RegistryConfigFinding {
	code: 'publish-to-read' | 'public-read-token' | 'ambiguous-registry-url';
	file: 'package.json' | 'bunfig.toml' | '.npmrc';
	message: string;
}

function normalizedUrl(value: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error(`registry URL must be absolute: ${value}`);
	}
	parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
	parsed.search = '';
	parsed.hash = '';
	return parsed;
}

function isLoopbackHostname(hostname: string): boolean {
	const value = hostname.toLowerCase();
	if (value === 'localhost' || value === '::1' || value === '[::1]') return true;
	const match = value.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	return !!match && match.slice(1).every(part => Number(part) <= 255);
}

export function registryPlaneContract(plane: RegistryPlane, requestedUrl?: string): RegistryPlaneContract {
	if (plane === 'production-write') {
		if (requestedUrl) {
			throw new Error('production writes are direct-to-R2 and must not infer an HTTP registry destination');
		}
		return {
			plane,
			url: null,
			auth: 'separately-authorized-r2',
			methods: [],
			writable: false,
		};
	}

	const fallback = plane === 'read' ? FACTORY_WAGER_CANONICAL_READ_URL : FACTORY_WAGER_DEFAULT_LOCAL_WRITE_URL;
	const parsed = normalizedUrl(requestedUrl ?? fallback);
	const url = parsed.toString().replace(/\/$/, '');

	if (plane === 'read') {
		if (url !== FACTORY_WAGER_CANONICAL_READ_URL) {
			throw new Error(`read plane must equal ${FACTORY_WAGER_CANONICAL_READ_URL}`);
		}
		return {plane, url, auth: 'none', methods: ['GET', 'HEAD'], writable: false};
	}

	if (parsed.protocol !== 'http:' || !isLoopbackHostname(parsed.hostname)) {
		throw new Error('local-write plane must use http on localhost, ::1, or 127.0.0.0/8');
	}
	return {plane, url, auth: 'runtime-local-token', methods: ['POST', 'PUT', 'DELETE'], writable: true};
}

export function auditRegistryConfig(input: RegistryConfigInput): RegistryConfigFinding[] {
	const findings: RegistryConfigFinding[] = [];
	const canonical = FACTORY_WAGER_CANONICAL_READ_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	if (input.packageJson) {
		try {
			const pkg = JSON.parse(input.packageJson) as {publishConfig?: {registry?: unknown}};
			if (pkg.publishConfig?.registry === FACTORY_WAGER_CANONICAL_READ_URL) {
				findings.push({
					code: 'publish-to-read',
					file: 'package.json',
					message: 'publishConfig.registry targets the tokenless read plane',
				});
			}
		} catch {
			// Package parsing belongs to the scanner's existing package schema diagnostics.
		}
	}

	if (input.bunfig) {
		const publishSection = input.bunfig.match(/^\[publish\]\s*\n([\s\S]*?)(?=^\[|$)/m)?.[1] ?? '';
		if (new RegExp(`registry\\s*=\\s*["']${canonical}/?["']`).test(publishSection)) {
			findings.push({
				code: 'publish-to-read',
				file: 'bunfig.toml',
				message: '[publish].registry targets the tokenless read plane',
			});
		}
		if (/\bREGISTRY_URL\b/.test(input.bunfig)) {
			findings.push({
				code: 'ambiguous-registry-url',
				file: 'bunfig.toml',
				message: 'raw REGISTRY_URL does not identify a read or write plane',
			});
		}
	}

	if (input.npmrc) {
		const publicHost = new URL(FACTORY_WAGER_CANONICAL_READ_URL).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		if (new RegExp(`//${publicHost}(?:/api/npm)?/:_authToken`, 'i').test(input.npmrc)) {
			findings.push({
				code: 'public-read-token',
				file: '.npmrc',
				message: 'public read origin must not receive an auth token',
			});
		}
		if (/\bREGISTRY_URL\b/.test(input.npmrc)) {
			findings.push({
				code: 'ambiguous-registry-url',
				file: '.npmrc',
				message: 'raw REGISTRY_URL does not identify a read or write plane',
			});
		}
	}

	return findings;
}

async function readIfPresent(path: string): Promise<string | undefined> {
	const file = Bun.file(path);
	return (await file.exists()) ? file.text() : undefined;
}

export async function registryPlaneReport(root: string, plane: RegistryPlane, url?: string): Promise<object> {
	const explicitRoot = resolve(root);
	const packageJson = await readIfPresent(`${explicitRoot}/package.json`);
	if (!packageJson) throw new Error(`explicit --root has no package.json: ${explicitRoot}`);
	const contract = registryPlaneContract(plane, url);
	const findings = auditRegistryConfig({
		packageJson,
		bunfig: await readIfPresent(`${explicitRoot}/bunfig.toml`),
		npmrc: await readIfPresent(`${explicitRoot}/.npmrc`),
	});
	return {
		schema: 'scanner/registry-plane-report/v1',
		mode: 'report-only',
		root: explicitRoot,
		contract,
		findings,
		applySupported: false,
	};
}

async function main(): Promise<void> {
	const {values} = parseArgs({
		args: Bun.argv.slice(2),
		strict: true,
		options: {
			root: {type: 'string'},
			plane: {type: 'string'},
			url: {type: 'string'},
			apply: {type: 'boolean', default: false},
		},
	});
	if (values.apply)
		throw new Error('registry plane remediation is report-only; apply changes in the owning product root');
	if (!values.root) throw new Error('--root is required; global project sweeps are retired');
	if (!values.plane || !['read', 'local-write', 'production-write'].includes(values.plane)) {
		throw new Error('--plane must be read, local-write, or production-write');
	}
	console.info(
		JSON.stringify(await registryPlaneReport(values.root, values.plane as RegistryPlane, values.url), null, 2),
	);
}

if (import.meta.main) {
	main().catch(error => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(2);
	});
}
