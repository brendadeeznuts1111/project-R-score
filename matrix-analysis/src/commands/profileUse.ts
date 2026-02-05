import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import {
	detectConflicts,
	printConflicts,
	printEnvChanges,
	printExportStatements,
	printPathWarnings,
	printValidation,
} from "../lib/output";
import { resolvePaths } from "../lib/pathResolver";
import { loadProfile, type Profile, resolveSecretRefs } from "../lib/profileLoader";
import { validateProfile } from "../lib/validators";

export interface ProfileUseOptions {
	validateRules: boolean;
	dryRun: boolean;
	environment?: string;
	force?: boolean;
}

export async function profileUse(
	name: string,
	options: ProfileUseOptions,
): Promise<void> {
	const profile = await loadProfile(name);
	if (!profile) {
		console.error(`\x1b[31mError: Profile "${name}" not found\x1b[0m`);
		console.error(`Run 'bun run matrix:profile:list' to see available profiles`);
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	if (options.validateRules) {
		const result = validateProfile(profile);
		printValidation(result.passed, result.errors, result.warnings);

		if (!result.passed) {
			process.exit(EXIT_CODES.VALIDATION_ERROR);
		}

		if (result.warnings.length > 0 && !options.force) {
			console.log("\n\x1b[33mUse --force to continue with warnings\x1b[0m");
			if (!options.dryRun) {
				process.exit(EXIT_CODES.VALIDATION_ERROR);
			}
		}
	}

	const effectiveEnv =
		options.environment || profile.environment || profile.env.NODE_ENV;

	const rawEnvVars: Record<string, string> = {
		...profile.env,
		NODE_ENV: effectiveEnv || profile.env.NODE_ENV || "development",
		MATRIX_PROFILE_ENV: profile.env.NODE_ENV || effectiveEnv || "development",
		MATRIX_PROFILE_NAME: profile.name,
		MATRIX_PROFILE_VERSION: profile.version,
	};

	// Resolve path variables and merge into env
	const pathResult = resolvePaths(profile.paths, Bun.env, rawEnvVars);
	for (const [key, value] of Object.entries(pathResult.resolved)) {
		rawEnvVars[key] = value;
	}

	if (pathResult.warnings.length > 0 && (options.dryRun || options.validateRules)) {
		printPathWarnings(pathResult.warnings);
	}

	const envVars = resolveSecretRefs(rawEnvVars);

	const conflicts = detectConflicts(envVars, Bun.env);
	if (conflicts.length > 0) {
		printConflicts(conflicts);

		if (!options.force && !options.dryRun) {
			console.error("\n\x1b[33mUse --force to override or --dry-run to preview\x1b[0m");
			process.exit(EXIT_CODES.CONFLICT_ERROR);
		}
	}

	if (options.dryRun) {
		printEnvChanges(envVars, Bun.env, true);
		console.log("\n\x1b[90mRun without --dry-run to apply, then use:\x1b[0m");
		console.log(`\x1b[90m  eval $(bun run matrix:profile:use ${name})\x1b[0m`);
	} else {
		printExportStatements(envVars);
	}
}
