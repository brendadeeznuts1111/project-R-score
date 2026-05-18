import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { maskValue } from "../lib/output";
import { loadProfile } from "../lib/profileLoader";

// Color helpers that respect NO_COLOR
const colors = process.env.NO_COLOR
	? {
			red: "",
			reset: "",
			bold: "",
		}
	: {
			red: "\x1b[31m",
			reset: "\x1b[0m",
			bold: "\x1b[1m",
		};

export async function profileShow(name: string): Promise<void> {
	const profile = await loadProfile(name);

	if (!profile) {
		console.error(`${colors.red}Error: Profile "${name}" not found${colors.reset}`);
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	console.info(`${colors.bold}Profile: ${profile.name}${colors.reset}`);
	console.info(`Version: ${profile.version}`);
	if (profile.author) {
		console.info(`Author: ${profile.author}`);
	}
	if (profile.created) {
		console.info(`Created: ${profile.created}`);
	}
	if (profile.description) {
		console.info(`Description: ${profile.description}`);
	}

	console.info(`\n${colors.bold}Environment Variables:${colors.reset}`);

	const rows = Object.entries(profile.env)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => ({
			Key: key,
			Value: maskValue(key, value),
		}));

	console.info(Bun.inspect.table(rows, undefined, { colors: !process.env.NO_COLOR }));

	if (profile.paths && Object.keys(profile.paths).length > 0) {
		console.info(`\n${colors.bold}Path Variables:${colors.reset}`);
		for (const [variable, config] of Object.entries(profile.paths)) {
			console.info(`  ${variable}:`);
			if (config.prepend && config.prepend.length > 0) {
				console.info(`    prepend: ${config.prepend.join(", ")}`);
			}
			if (config.append && config.append.length > 0) {
				console.info(`    append: ${config.append.join(", ")}`);
			}
		}
	}
}
