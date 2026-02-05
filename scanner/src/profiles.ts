// ── profiles.ts — Keychain profile management CLI ────────────────────────
// Standalone: does NOT import scan.ts (it executes on import).
// Re-implements lightweight keychain access using the same Bun.secrets /
// globalThis.secrets dual-dispatch pattern.

import {readFileSync} from 'node:fs';

// ── Constants ────────────────────────────────────────────────────────────
export const BUN_PROFILES_KEYCHAIN_PREFIX = 'bun-tier1380';
export const BUN_PROFILES_DEFAULT_NAMESPACE = 'com.tier1380.scanner';
export const BUN_PROFILES_SECRET_NAMES = ['api_key', 'mcp_token', 'database_url', 'registry_token'] as const;
export type SecretName = (typeof BUN_PROFILES_SECRET_NAMES)[number];
export const BUN_PROFILES_ENV_MAP = {
	SCANNER_API_KEY: 'api_key',
	MCP_TOKEN: 'mcp_token',
	DATABASE_URL: 'database_url',
	REGISTRY_TOKEN: 'registry_token',
} as const satisfies Record<string, SecretName>;
export type EnvVarName = keyof typeof BUN_PROFILES_ENV_MAP;

/*
Overview
- Bun.secrets stores credentials in OS-native credential managers (Keychain/libsecret/CredMan).
- Use for local dev tools; not ideal for production deployment secrets.
- Service + name identify credentials; prefer reverse-DNS service names.

TypeScript
- Bun.secrets has get/set/delete async APIs returning Promise<string | null> / Promise<void> / Promise<boolean>.
*/

/*
  Bun.secrets workflow examples (from docs):

  // Store GitHub CLI token (instead of ~/.config/gh/hosts.yml)
  await Bun.secrets.set({
    service: "my-app.com",
    name: "github-token",
    value: "ghp_xxxxxxxxxxxxxxxxxxxx",
  });

  // Or if you prefer without an object
  await Bun.secrets.set("my-app.com", "github-token", "ghp_xxxxxxxxxxxxxxxxxxxx");

  // Store npm registry token (instead of ~/.npmrc)
  await Bun.secrets.set({
    service: "npm-registry",
    name: "https://registry.npmjs.org",
    value: "npm_xxxxxxxxxxxxxxxxxxxx",
  });

  // Retrieve for API calls
  const token = await Bun.secrets.get({
    service: "gh-cli",
    name: "github.com",
  });

  if (token) {
    const response = await fetch("https://api.github.com/name", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
  }
*/

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
};

// ── Types ────────────────────────────────────────────────────────────────
export interface BunSecretsAPI {
	get(opts: {service: string; name: string}): Promise<string | null>;
	get(service: string, name: string): Promise<string | null>;
	set(opts: {service: string; name: string; value: string}): Promise<void>;
	set(service: string, name: string, value: string): Promise<void>;
	delete(opts: {service: string; name: string}): Promise<boolean>;
	delete(service: string, name: string): Promise<boolean>;
}
declare global {
	var secrets: BunSecretsAPI | undefined;
}
export const BUN_KEYCHAIN_ERROR_CODES = ['NO_API', 'ACCESS_DENIED', 'NOT_FOUND', 'OS_ERROR'] as const;
export type KeychainErrCode = (typeof BUN_KEYCHAIN_ERROR_CODES)[number];
export type KeychainResult<T> = {ok: true; value: T} | KeychainErr;
export interface KeychainErr {
	ok: false;
	code: KeychainErrCode;
	reason: string;
}

// ── Keychain service derivation ──────────────────────────────────────────
export function deriveKeychainService(profile: string, namespace: string = BUN_PROFILES_DEFAULT_NAMESPACE): string {
	return `${BUN_PROFILES_KEYCHAIN_PREFIX}.${profile}.${namespace}`;
}

// ── Keychain detection ───────────────────────────────────────────────────
const _hasBunSecrets = !!(globalThis.secrets?.get ?? (Bun as unknown as {secrets?: unknown}).secrets);

function keychainUnavailableErr(): KeychainErr {
	return {ok: false, code: 'NO_API', reason: 'Bun.secrets API is not available in this runtime'};
}

// ── Error classification (mirrors classifyKeychainError from scan.ts) ────
export function classifyError(err: unknown): KeychainErr {
	const msg = err instanceof Error ? err.message : String(err);
	const lower = msg.toLowerCase();
	if (
		lower.includes('denied') ||
		lower.includes('authorization') ||
		lower.includes('permission') ||
		lower.includes('not allowed')
	)
		return {ok: false, code: 'ACCESS_DENIED', reason: `Keychain access denied: ${msg}`};
	if (lower.includes('not found') || lower.includes('no such') || lower.includes('could not be found'))
		return {ok: false, code: 'NOT_FOUND', reason: `Keychain item not found: ${msg}`};
	return {ok: false, code: 'OS_ERROR', reason: `Keychain OS error: ${msg}`};
}

// ── Validation (mirrors validateTokenValue from scan.ts) ─────────────────
export function validateSecretValue(value: string): {valid: true} | {valid: false; reason: string} {
	if (value.length === 0) return {valid: false, reason: 'secret value is empty'};
	if (value.trim().length === 0) return {valid: false, reason: 'secret value is only whitespace'};
	if (value.length < 8) return {valid: false, reason: `secret value is too short (${value.length} chars, minimum 8)`};
	if (new Set(value).size === 1) return {valid: false, reason: 'secret value is a single repeated character'};
	return {valid: true};
}

// ── Keychain operations ──────────────────────────────────────────────────
// Bun.secrets only (no security CLI)
export async function profileKeychainGet(service: string, name: string): Promise<KeychainResult<string | null>> {
	if (!_hasBunSecrets) return keychainUnavailableErr();
	try {
		const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
		const value = bunSecrets
			? ((await bunSecrets.get({service, name})) ?? null)
			: ((await globalThis.secrets!.get(service, name)) ?? null);
		return {ok: true, value};
	} catch (err) {
		return classifyError(err);
	}
}

async function profileKeychainSet(service: string, name: string, value: string): Promise<KeychainResult<void>> {
	if (!_hasBunSecrets) return keychainUnavailableErr();
	try {
		const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
		if (bunSecrets) await bunSecrets.set({service, name, value});
		else await globalThis.secrets!.set(service, name, value);
		return {ok: true, value: undefined};
	} catch (err) {
		return classifyError(err);
	}
}

async function _profileKeychainDelete(service: string, name: string): Promise<KeychainResult<boolean>> {
	if (!_hasBunSecrets) return keychainUnavailableErr();
	try {
		const bunSecrets = (Bun as unknown as {secrets?: BunSecretsAPI | undefined}).secrets;
		const deleted = bunSecrets
			? await bunSecrets.delete({service, name})
			: await globalThis.secrets!.delete(service, name);
		return {ok: true, value: !!deleted};
	} catch (err) {
		return classifyError(err);
	}
}

// ── macOS security CLI (avoids Keychain popup in scripts) ────────────────
const _isDarwin = process.platform === 'darwin';

// macOS `security -w` hex-encodes passwords containing control chars (e.g. newlines).
function _tryHexDecode(hex: string): string | null {
	if (hex.length < 2 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
	try {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length; i += 2) {
			bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
		}
		return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
	} catch {
		return null;
	}
}

async function securityCliGet(service: string, name: string): Promise<string | null> {
	if (!_isDarwin) return null;
	try {
		const proc = Bun.spawn(['security', 'find-generic-password', '-s', service, '-a', name, '-w'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const exitCode = await proc.exited;
		if (exitCode !== 0) return null;
		const output = await new Response(proc.stdout).text();
		const trimmed = output.trim();
		if (trimmed.length === 0) return null;
		return _tryHexDecode(trimmed) ?? trimmed;
	} catch {
		return null;
	}
}

async function securityCliSet(service: string, name: string, value: string): Promise<boolean> {
	if (!_isDarwin) return false;
	try {
		const proc = Bun.spawn(['security', 'add-generic-password', '-U', '-s', service, '-a', name, '-w', value], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		return (await proc.exited) === 0;
	} catch {
		return false;
	}
}

// ── Convenience exports (security CLI first, Bun.secrets fallback) ───────
export async function getSecret(service: string, name: string): Promise<string | null> {
	const cliValue = await securityCliGet(service, name);
	if (cliValue !== null) return cliValue;

	const result = await profileKeychainGet(service, name);
	if (result.ok) return result.value ?? null;
	return null;
}

export async function setSecret(service: string, name: string, value: string): Promise<boolean> {
	if (await securityCliSet(service, name, value)) return true;

	const result = await profileKeychainSet(service, name, value);
	return result.ok;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function maskValue(value: string): string {
	if (value.length <= 8) return value.slice(0, 2) + '••••' + value.slice(-2);
	return value.slice(0, 4) + '••••' + value.slice(-4);
}

function loadBenchrcTeamMembers(): string[] {
	try {
		const raw = readFileSync(`${import.meta.dir}/.benchrc.json`, 'utf-8');
		const config = JSON.parse(raw);
		return config?.team ? Object.keys(config.team) : [];
	} catch {
		return [];
	}
}

// ── CLI entry point (inside import.meta.main to avoid side effects on import) ──
function printDocs(): void {
	console.log(`
Overview
- Bun.secrets stores credentials in OS-native credential managers (Keychain/libsecret/CredMan).
- Use for local development tools; avoid for production deployment secrets.
- Use descriptive service names (prefer reverse-DNS).

TypeScript
namespace Bun {
  interface SecretsOptions { service: string; name: string; }
  interface Secrets {
    get(options: SecretsOptions): Promise<string | null>;
    set(options: SecretsOptions, value: string): Promise<void>;
    delete(options: SecretsOptions): Promise<boolean>;
  }
  const secrets: Secrets;
}

Utilities (error handling)
try {
  await Bun.secrets.set({
    service: "my-app",
    name: "alice",
    value: "password123",
  });
} catch (error) {
  console.error("Failed to store credential:", error.message);
}

const password = await Bun.secrets.get({
  service: "my-app",
  name: "alice",
});

if (password === null) {
  console.log("No credential found");
}
`);
}

if (import.meta.main) {
	const {parseArgs} = await import('node:util');
	const {positionals} = parseArgs({
		allowPositionals: true,
		args: Bun.argv.slice(2),
		options: {},
		strict: false,
	});

	const subcommand = positionals[0];
	const profileArg = positionals[1];

	if (subcommand === '--docs') {
		printDocs();
		process.exit(0);
	}

	if (subcommand === 'keychain-migrate') {
		if (!profileArg) {
			console.error(`${c.red('error:')} missing profile argument`);
			console.error('usage: bun run profiles.ts keychain-migrate <profile>');
			process.exit(1);
		}
		const service = deriveKeychainService(profileArg);
		console.log(`${c.bold('Migrating env vars \u2192 keychain')} for profile ${c.cyan(profileArg)}`);
		console.log(`${c.dim('service:')} ${service}\n`);

		let migrated = 0;
		let skipped = 0;

		for (const [envVar, secretName] of Object.entries(BUN_PROFILES_ENV_MAP)) {
			const envValue = Bun.env[envVar];
			if (!envValue) {
				console.log(`  ${c.dim('skip')} ${secretName} \u2014 ${c.dim(`$${envVar} not set`)}`);
				skipped++;
				continue;
			}
			const check = validateSecretValue(envValue);
			if (!check.valid) {
				console.log(`  ${c.yellow('\u26A0')} ${secretName} \u2014 ${c.yellow(check.reason)}`);
				skipped++;
				continue;
			}
			const result = await profileKeychainSet(service, secretName, envValue);
			if (result.ok) {
				console.log(`  ${c.green('\u2713')} ${secretName} \u2014 stored (${maskValue(envValue)})`);
				migrated++;
			} else {
				console.error(`Failed to store credential: ${result.reason}`);
				console.error(`  ${c.red('\u2717')} ${secretName} \u2014 ${result.reason}`);
			}
		}

		console.log(`\n${c.bold('Done:')} ${migrated} migrated, ${skipped} skipped`);
	} else if (subcommand === 'keychain-verify') {
		if (!profileArg) {
			console.error(`${c.red('error:')} missing profile argument`);
			console.error('usage: bun run profiles.ts keychain-verify <profile>');
			process.exit(1);
		}
		const service = deriveKeychainService(profileArg);
		console.log(`${c.bold('Verifying keychain secrets')} for profile ${c.cyan(profileArg)}`);
		console.log(`${c.dim('service:')} ${service}\n`);

		let found = 0;
		let missing = 0;

		for (const secretName of BUN_PROFILES_SECRET_NAMES) {
			const result = await profileKeychainGet(service, secretName);
			if (result.ok && result.value) {
				console.log(`  ${c.green('\u2713')} ${secretName} \u2014 ${c.dim(maskValue(result.value))}`);
				found++;
			} else {
				if (result.ok && !result.value) {
					console.log('No credential found');
				} else if (!result.ok) {
					console.error(`Failed to retrieve credential: ${result.reason}`);
				}
				const reason = result.ok ? 'not set' : result.reason;
				console.log(`  ${c.red('\u2717')} ${secretName} \u2014 ${c.red(reason)}`);
				missing++;
			}
		}

		console.log(`\n${c.bold('Result:')} ${found}/${BUN_PROFILES_SECRET_NAMES.length} secrets found`);
		if (missing > 0) process.exit(1);
	} else if (subcommand === 'keychain-list') {
		const profiles = new Set<string>();
		if (profileArg) {
			profiles.add(profileArg);
		} else {
			profiles.add('local');
			const user = Bun.env.USER;
			if (user) profiles.add(user);
			for (const member of loadBenchrcTeamMembers()) profiles.add(member);
		}

		console.log(`${c.bold('Keychain secrets by profile')}\n`);

		for (const profile of profiles) {
			const service = deriveKeychainService(profile);
			console.log(`${c.cyan(profile)} ${c.dim(`(${service})`)}`);

			let found = 0;
			for (const secretName of BUN_PROFILES_SECRET_NAMES) {
				const result = await profileKeychainGet(service, secretName);
				if (result.ok && result.value) {
					console.log(`  ${c.green('\u2713')} ${secretName}`);
					found++;
				} else {
					console.log(`  ${c.dim('\u00B7')} ${secretName}`);
				}
			}

			console.log(`  ${c.dim(`${found}/${BUN_PROFILES_SECRET_NAMES.length} stored`)}\n`);
		}
	} else {
		console.log(`${c.bold('profiles.ts')} \u2014 keychain profile management\n`);
		console.log('subcommands:');
		console.log(`  ${c.cyan('keychain-migrate')} <profile>  migrate env vars to keychain`);
		console.log(`  ${c.cyan('keychain-verify')} <profile>   verify keychain secrets`);
		console.log(`  ${c.cyan('keychain-list')} [profile]     list stored secrets per profile`);
		console.log(`  ${c.cyan('--docs')}                   print Bun.secrets overview + error handling`);
	}
}
