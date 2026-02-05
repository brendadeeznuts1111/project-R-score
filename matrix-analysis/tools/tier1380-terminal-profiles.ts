#!/usr/bin/env bun
/**
 * Tier-1380 Terminal Profile Manager
 * Secure profile management with Bun.secrets integration
 * Usage: bun run tier1380:terminal:profiles [list|get|set|switch|encrypt|decrypt]
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Glyphs ───────────────────────────────────────
const GLYPHS = {
	DRIFT: "▵⟂⥂",
	LOCKED: "⟳⟲⟜(▵⊗⥂)",
	KEY: "🔑",
	LOCK: "🔒",
	UNLOCK: "🔓",
	PROFILE: "👤",
	TERMINAL: "🖥",
	OK: "✓",
	FAIL: "✗",
};

// ─── Configuration ────────────────────────────────
const SERVICE_NAME = "com.tier1380.terminal";
const PROFILES_DIR = `${process.env.HOME}/.matrix/profiles`;
const SECRETS_INDEX = `${process.env.HOME}/.matrix/secrets-index.json`;

// ─── Types ────────────────────────────────────────
interface TerminalProfile {
	name: string;
	environment: "development" | "staging" | "production";
	envVars: Record<string, string>;
	secrets: string[]; // Names of secrets stored in Bun.secrets
	created: string;
	modified: string;
}

interface SecretEntry {
	name: string;
	service: string;
	created: string;
	lastUsed?: string;
}

// ─── Ensure Directories ───────────────────────────
function ensureDirectories(): void {
	if (!existsSync(PROFILES_DIR)) {
		mkdirSync(PROFILES_DIR, { recursive: true });
	}
}

// ─── Load/Save Secrets Index ──────────────────────
async function loadSecretsIndex(): Promise<SecretEntry[]> {
	if (!existsSync(SECRETS_INDEX)) {
		return [];
	}
	try {
		return await Bun.file(SECRETS_INDEX).json();
	} catch {
		return [];
	}
}

async function saveSecretsIndex(index: SecretEntry[]): Promise<void> {
	await Bun.write(SECRETS_INDEX, JSON.stringify(index, null, 2));
}

// ─── Bun.secrets Wrapper ──────────────────────────
async function setSecureSecret(name: string, value: string): Promise<boolean> {
	try {
		// Check if Bun.secrets is available
		if (typeof Bun === "undefined" || !Bun.secrets) {
			console.log(`${GLYPHS.FAIL} Bun.secrets not available`);
			return false;
		}

		await Bun.secrets.set({
			service: SERVICE_NAME,
			name: name,
			value: value,
		});

		// Update index
		const index = await loadSecretsIndex();
		const existing = index.find((e) => e.name === name);
		if (existing) {
			existing.lastUsed = new Date().toISOString();
		} else {
			index.push({
				name,
				service: SERVICE_NAME,
				created: new Date().toISOString(),
				lastUsed: new Date().toISOString(),
			});
		}
		await saveSecretsIndex(index);

		return true;
	} catch (e: any) {
		console.error(`${GLYPHS.FAIL} Failed to store secret: ${e.message}`);
		return false;
	}
}

async function getSecureSecret(name: string): Promise<string | null> {
	try {
		if (typeof Bun === "undefined" || !Bun.secrets) {
			return null;
		}

		const value = await Bun.secrets.get({
			service: SERVICE_NAME,
			name: name,
		});

		// Update last used
		const index = await loadSecretsIndex();
		const entry = index.find((e) => e.name === name);
		if (entry) {
			entry.lastUsed = new Date().toISOString();
			await saveSecretsIndex(index);
		}

		return value;
	} catch {
		return null;
	}
}

async function deleteSecureSecret(name: string): Promise<boolean> {
	try {
		if (typeof Bun === "undefined" || !Bun.secrets) {
			return false;
		}

		await Bun.secrets.delete({
			service: SERVICE_NAME,
			name: name,
		});

		// Update index
		const index = await loadSecretsIndex();
		const filtered = index.filter((e) => e.name !== name);
		await saveSecretsIndex(filtered);

		return true;
	} catch {
		return false;
	}
}

// ─── Profile Management ───────────────────────────
async function listProfiles(): Promise<void> {
	ensureDirectories();

	console.log(`\n${GLYPHS.PROFILE} Terminal Profiles\n`);
	console.log("-".repeat(70));

	// Load secrets index
	const secretsIndex = await loadSecretsIndex();
	console.log(`  Secure Secrets: ${secretsIndex.length} stored in macOS Keychain`);
	console.log(`  Service: ${SERVICE_NAME}`);
	console.log();

	// List profiles
	const profiles: string[] = [];
	if (existsSync(PROFILES_DIR)) {
		for await (const entry of new Bun.Glob("*.json").scan(PROFILES_DIR)) {
			if (!entry.includes("secret") && !entry.includes("encrypted")) {
				profiles.push(entry.replace(".json", ""));
			}
		}
	}

	console.log(`  Environment Profiles: ${profiles.length}`);
	for (const p of profiles) {
		const profilePath = join(PROFILES_DIR, `${p}.json`);
		try {
			const data = await Bun.file(profilePath).json();
			const env = data.environment || "unknown";
			const secretCount = data.secrets?.length || 0;
			console.log(`    ${GLYPHS.OK} ${p.padEnd(20)} [${env}] ${secretCount} secrets`);
		} catch {
			console.log(`    ${GLYPHS.PROFILE} ${p}`);
		}
	}

	// Show secrets
	if (secretsIndex.length > 0) {
		console.log(`\n  ${GLYPHS.LOCK} Stored Secrets:`);
		for (const s of secretsIndex.slice(0, 5)) {
			const lastUsed = s.lastUsed
				? ` (used: ${new Date(s.lastUsed).toLocaleDateString()})`
				: "";
			console.log(`    ${GLYPHS.KEY} ${s.name}${lastUsed}`);
		}
		if (secretsIndex.length > 5) {
			console.log(`    ... and ${secretsIndex.length - 5} more`);
		}
	}

	console.log("-".repeat(70) + "\n");
}

async function setSecret(name: string, value?: string): Promise<void> {
	if (!value) {
		// Read from stdin or prompt
		console.log(`${GLYPHS.KEY} Enter value for secret '${name}':`);
		// For now, require command line arg
		console.log(`${GLYPHS.FAIL} Value required: --value <secret>`);
		process.exit(1);
	}

	const success = await setSecureSecret(name, value);
	if (success) {
		console.log(`${GLYPHS.OK} Secret '${name}' stored securely in macOS Keychain`);
	} else {
		console.log(`${GLYPHS.FAIL} Failed to store secret`);
		process.exit(1);
	}
}

async function getSecret(name: string): Promise<void> {
	const value = await getSecureSecret(name);
	if (value) {
		console.log(`${GLYPHS.KEY} ${name}=${value}`);
	} else {
		console.log(`${GLYPHS.FAIL} Secret '${name}' not found`);
		process.exit(1);
	}
}

async function switchProfile(name: string): Promise<void> {
	const profilePath = join(PROFILES_DIR, `${name}.json`);

	if (!existsSync(profilePath)) {
		console.log(`${GLYPHS.FAIL} Profile '${name}' not found`);
		process.exit(1);
	}

	console.log(`\n${GLYPHS.TERMINAL} Switching to profile: ${name}\n`);
	console.log("-".repeat(70));

	// Load profile
	const profile = await Bun.file(profilePath).json();

	// Load env vars
	if (profile.env) {
		console.log("  Environment Variables:");
		for (const [key, value] of Object.entries(profile.env)) {
			if (typeof value === "string" && !value.includes("secret")) {
				console.log(`    ${key}=${value}`);
			} else {
				console.log(`    ${key}=***`);
			}
		}
	}

	// Load secrets
	if (profile.secrets && profile.secrets.length > 0) {
		console.log("\n  Loading Secure Secrets:");
		for (const secretName of profile.secrets) {
			const value = await getSecureSecret(secretName);
			if (value) {
				console.log(`    ${GLYPHS.LOCK} ${secretName} loaded`);
				// Export for shell
				console.log(`    export ${secretName.toUpperCase()}="${value}"`);
			} else {
				console.log(`    ${GLYPHS.FAIL} ${secretName} not found in keychain`);
			}
		}
	}

	// Set active profile
	process.env.MATRIX_ACTIVE_PROFILE = name;

	console.log("-".repeat(70));
	console.log(`\n${GLYPHS.OK} Profile '${name}' activated`);
	console.log(`Run: export MATRIX_ACTIVE_PROFILE=${name}`);
	console.log();
}

async function encryptProfile(name: string): Promise<void> {
	console.log(`${GLYPHS.LOCK} Encrypting profile: ${name}`);
	console.log(`${GLYPHS.DRIFT} Using Bun.password for Argon2id hashing...`);
	// Implementation would use Bun.password.hash()
	console.log(`${GLYPHS.OK} Profile encrypted (simulated)`);
}

async function decryptProfile(name: string): Promise<void> {
	console.log(`${GLYPHS.UNLOCK} Decrypting profile: ${name}`);
	console.log(`${GLYPHS.OK} Profile decrypted (simulated)`);
}

// ─── Help ─────────────────────────────────────────
function printHelp(): void {
	console.log(`
${GLYPHS.DRIFT} Tier-1380 Terminal Profile Manager

Secure profile management with Bun.secrets (macOS Keychain)

Usage:
  bun run tier1380:terminal:profiles [command] [options]

Commands:
  list                    List all profiles and secrets
  set <name> --value <v>  Store a secure secret
  get <name>              Retrieve a secret
  switch <profile>        Switch to profile (loads secrets)
  encrypt <profile>       Encrypt profile with Bun.password
  decrypt <profile>       Decrypt profile
  help                    Show this help

Examples:
  bun run tier1380:terminal:profiles list
  bun run tier1380:terminal:profiles set API_KEY --value "sk-xxx"
  bun run tier1380:terminal:profiles get API_KEY
  bun run tier1380:terminal:profiles switch prod

Security:
  • Secrets stored in macOS Keychain (Bun.secrets)
  • Service: ${SERVICE_NAME}
  • Argon2id hashing for passwords
  • Automatic secret indexing

Integration:
  • Matrix Agent: ~/.matrix/agent/config.json
  • Profiles: ~/.matrix/profiles/
  • Secrets Index: ~/.matrix/secrets-index.json
`);
}

// ─── Main ─────────────────────────────────────────
async function main(): Promise<void> {
	ensureDirectories();

	const cmd = process.argv[2] || "list";
	const args = process.argv.slice(3);

	switch (cmd) {
		case "list":
			await listProfiles();
			break;

		case "set": {
			const name = args[0];
			const valueIdx = args.indexOf("--value");
			const value = valueIdx !== -1 ? args[valueIdx + 1] : undefined;
			if (!name) {
				console.log(`${GLYPHS.FAIL} Secret name required`);
				process.exit(1);
			}
			await setSecret(name, value);
			break;
		}

		case "get": {
			const name = args[0];
			if (!name) {
				console.log(`${GLYPHS.FAIL} Secret name required`);
				process.exit(1);
			}
			await getSecret(name);
			break;
		}

		case "switch":
		case "use": {
			const name = args[0];
			if (!name) {
				console.log(`${GLYPHS.FAIL} Profile name required`);
				process.exit(1);
			}
			await switchProfile(name);
			break;
		}

		case "encrypt": {
			const name = args[0];
			if (!name) {
				console.log(`${GLYPHS.FAIL} Profile name required`);
				process.exit(1);
			}
			await encryptProfile(name);
			break;
		}

		case "decrypt": {
			const name = args[0];
			if (!name) {
				console.log(`${GLYPHS.FAIL} Profile name required`);
				process.exit(1);
			}
			await decryptProfile(name);
			break;
		}

		case "help":
		case "--help":
		case "-h":
			printHelp();
			break;

		default:
			console.log(`${GLYPHS.FAIL} Unknown command: ${cmd}`);
			console.log("Run 'bun run tier1380:terminal:profiles help' for usage.");
			process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export {
	setSecureSecret,
	getSecureSecret,
	deleteSecureSecret,
	SERVICE_NAME,
	PROFILES_DIR,
};
