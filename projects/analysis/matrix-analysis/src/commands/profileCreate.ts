import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import type { Profile } from "../lib/profileLoader";
import {
	getProfilesDir,
	listProfiles,
	loadProfile,
	saveProfile,
} from "../lib/profileLoader";

interface CreateOptions {
	from?: string;
	env?: string;
	description?: string;
	force?: boolean;
}

const DEFAULT_PROFILE: Profile = {
	name: "",
	version: "1.0.0",
	env: {
		NODE_ENV: "development",
	},
};

export async function profileCreate(
	name: string,
	options: CreateOptions,
): Promise<void> {
	const profilesDir = getProfilesDir();
	const profilePath = `${profilesDir}/${name}.json`;
	const file = Bun.file(profilePath);

	// Check if profile already exists
	if (await file.exists()) {
		if (!options.force) {
			console.error(`\x1b[31mError: Profile "${name}" already exists\x1b[0m`);
			console.error("Use --force to overwrite");
			process.exit(EXIT_CODES.CONFLICT_ERROR);
		}
		console.log(`\x1b[33m⚠ Overwriting existing profile "${name}"\x1b[0m`);
	}

	let profile: Profile;

	// Create from template or existing profile
	if (options.from) {
		const source = await loadProfile(options.from);
		if (!source) {
			console.error(`\x1b[31mError: Source profile "${options.from}" not found\x1b[0m`);
			const available = await listProfiles();
			if (available.length > 0) {
				console.error(`Available profiles: ${available.join(", ")}`);
			}
			process.exit(EXIT_CODES.NOT_FOUND);
		}

		profile = {
			...source,
			name,
			version: "1.0.0",
			created: new Date().toISOString(),
			description: options.description || `Based on ${options.from}`,
		};
	} else {
		profile = {
			...DEFAULT_PROFILE,
			name,
			created: new Date().toISOString(),
			description: options.description || "",
		};
	}

	// Override NODE_ENV if specified
	if (options.env) {
		profile.env.NODE_ENV = options.env;
	}

	// Save profile
	await saveProfile(name, profile);

	console.log(`\x1b[32m✓ Created profile "${name}"\x1b[0m`);
	console.log(`  Path: ${profilePath}`);
	console.log(`  Variables: ${Object.keys(profile.env).length}`);

	if (options.from) {
		console.log(`  Based on: ${options.from}`);
	}

	console.log(`\nTo edit: \x1b[90m$EDITOR ${profilePath}\x1b[0m`);
	console.log(`To use:  \x1b[90meval $(bun run matrix:profile:use ${name})\x1b[0m`);
}
