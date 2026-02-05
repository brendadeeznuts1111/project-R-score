import { fmt } from "../../.claude/lib/cli.ts";
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import type { PathVarConfig } from "../lib/pathResolver";
import { checkPathExists, expandPathVars, PATH_LIKE_VARS } from "../lib/pathResolver";
import type { Profile } from "../lib/profileLoader";
import { loadProfile, saveProfile } from "../lib/profileLoader";

interface PathAddOptions {
	append?: boolean;
	force?: boolean;
}

export async function profilePathAdd(
	profileName: string,
	variable: string,
	path: string,
	options: PathAddOptions = {},
): Promise<void> {
	const profile = await loadProfile(profileName);
	if (!profile) {
		console.error(fmt.fail(`Profile "${profileName}" not found`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	if (!profile.paths) {
		profile.paths = {};
	}

	if (!profile.paths[variable]) {
		profile.paths[variable] = {};
	}

	const config = profile.paths[variable];
	const position = options.append ? "append" : "prepend";

	if (!config[position]) {
		config[position] = [];
	}

	// Check for duplicate
	if (config[position]!.includes(path)) {
		if (!options.force) {
			console.error(fmt.fail(`"${path}" already exists in ${variable} ${position}`));
			process.exit(EXIT_CODES.CONFLICT_ERROR);
		}
		console.log(
			`\x1b[33m⚠ "${path}" already in ${variable} ${position}, skipping\x1b[0m`,
		);
		return;
	}

	config[position]!.push(path);

	await saveProfile(profileName, profile);

	const hint = PATH_LIKE_VARS.includes(variable) ? "" : " (custom variable)";
	console.log(`\x1b[32m✓ Added to ${variable}${hint}\x1b[0m`);
	console.log(`  ${position}: ${path}`);
}

export async function profilePathRemove(
	profileName: string,
	variable: string,
	path: string,
): Promise<void> {
	const profile = await loadProfile(profileName);
	if (!profile) {
		console.error(fmt.fail(`Profile "${profileName}" not found`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	if (!profile.paths || !profile.paths[variable]) {
		console.error(fmt.fail(`No paths configured for ${variable} in "${profileName}"`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	const config = profile.paths[variable];
	let removed = false;

	if (config.prepend) {
		const idx = config.prepend.indexOf(path);
		if (idx !== -1) {
			config.prepend.splice(idx, 1);
			removed = true;
		}
		if (config.prepend.length === 0) {
			delete config.prepend;
		}
	}

	if (config.append) {
		const idx = config.append.indexOf(path);
		if (idx !== -1) {
			config.append.splice(idx, 1);
			removed = true;
		}
		if (config.append.length === 0) {
			delete config.append;
		}
	}

	if (!removed) {
		console.error(fmt.fail(`"${path}" not found in ${variable}`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	// Clean up empty config
	if (!config.prepend && !config.append) {
		delete profile.paths[variable];
	}
	if (Object.keys(profile.paths).length === 0) {
		delete profile.paths;
	}

	await saveProfile(profileName, profile);

	console.log(`\x1b[32m✓ Removed from ${variable}\x1b[0m`);
	console.log(`  path: ${path}`);
}

export async function profilePathList(
	profileName: string,
	options: { variable?: string; resolved?: boolean } = {},
): Promise<void> {
	const profile = await loadProfile(profileName);
	if (!profile) {
		console.error(fmt.fail(`Profile "${profileName}" not found`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	if (!profile.paths || Object.keys(profile.paths).length === 0) {
		console.log(`No path variables configured in "${profileName}"`);
		return;
	}

	const variables = options.variable
		? { [options.variable]: profile.paths[options.variable] }
		: profile.paths;

	if (options.variable && !profile.paths[options.variable]) {
		console.log(`No paths configured for ${options.variable} in "${profileName}"`);
		return;
	}

	const env: Record<string, string | undefined> = { ...Bun.env, ...profile.env };

	console.log(fmt.bold(`Path variables in "${profileName}":\n`));

	for (const [variable, config] of Object.entries(variables)) {
		if (!config) continue;

		const hint = PATH_LIKE_VARS.includes(variable) ? "" : " (custom)";
		console.log(`  ${fmt.bold(variable)}${hint}`);

		if (config.prepend && config.prepend.length > 0) {
			console.log("    prepend:");
			for (const dir of config.prepend) {
				if (options.resolved) {
					const expanded = expandPathVars(dir, env);
					const exists = checkPathExists(expanded);
					const mark = exists ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
					console.log(
						`      ${mark} ${expanded}${expanded !== dir ? ` (from ${dir})` : ""}`,
					);
				} else {
					console.log(`      ${dir}`);
				}
			}
		}

		if (config.append && config.append.length > 0) {
			console.log("    append:");
			for (const dir of config.append) {
				if (options.resolved) {
					const expanded = expandPathVars(dir, env);
					const exists = checkPathExists(expanded);
					const mark = exists ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
					console.log(
						`      ${mark} ${expanded}${expanded !== dir ? ` (from ${dir})` : ""}`,
					);
				} else {
					console.log(`      ${dir}`);
				}
			}
		}

		console.log();
	}
}
