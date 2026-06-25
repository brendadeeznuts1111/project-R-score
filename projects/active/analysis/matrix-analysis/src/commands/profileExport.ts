import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { loadProfile, resolveSecretRefs } from "../lib/profileLoader";

interface ExportOptions {
	output?: string;
	resolve?: boolean;
	quote?: boolean;
}

export async function profileExport(
	name: string,
	options: ExportOptions,
): Promise<void> {
	const profile = await loadProfile(name);

	if (!profile) {
		console.error(`\x1b[31mError: Profile "${name}" not found\x1b[0m`);
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	// Optionally resolve ${VAR} references
	const env = options.resolve ? resolveSecretRefs(profile.env) : profile.env;

	// Build .env content
	const lines: string[] = [
		`# Generated from profile: ${name}`,
		`# Version: ${profile.version}`,
		`# Created: ${new Date().toISOString()}`,
		"",
	];

	const sortedKeys = Object.keys(env).sort();

	for (const key of sortedKeys) {
		const value = env[key];

		// Quote values with spaces, special chars, or if --quote flag is set
		const needsQuotes =
			options.quote ||
			value.includes(" ") ||
			value.includes("#") ||
			value.includes("$") ||
			value.includes("'") ||
			value.includes('"') ||
			value.includes("\n");

		if (needsQuotes) {
			// Use double quotes and escape special chars
			const escaped = value
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\n/g, "\\n");
			lines.push(`${key}="${escaped}"`);
		} else {
			lines.push(`${key}=${value}`);
		}
	}

	const content = lines.join("\n") + "\n";

	// Write to file or stdout
	if (options.output) {
		await Bun.write(options.output, content);
		console.error(
			`\x1b[32m✓ Exported ${sortedKeys.length} variables to ${options.output}\x1b[0m`,
		);
	} else {
		process.stdout.write(content);
	}
}
