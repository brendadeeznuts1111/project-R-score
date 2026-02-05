import { COLORS } from "../../.claude/lib/cli.ts";

// Wrap COLORS with NO_COLOR check
const colors = process.env.NO_COLOR
	? {
			red: (s: string) => s,
			green: (s: string) => s,
			yellow: (s: string) => s,
			dim: (s: string) => s,
			reset: "",
		}
	: COLORS;

const SENSITIVE_PATTERNS = [
	"SECRET",
	"PASSWORD",
	"TOKEN",
	"KEY",
	"CREDENTIAL",
	"_AUTH",
	"_PRIVATE",
	"_CERT",
	"API_KEY",
];

export function isSensitiveKey(key: string): boolean {
	const upperKey = key.toUpperCase();
	return SENSITIVE_PATTERNS.some((pattern) => upperKey.includes(pattern));
}

export function maskValue(key: string, value: string): string {
	if (isSensitiveKey(key)) {
		return "************";
	}
	return value;
}

export function printValidation(
	passed: boolean,
	errors: string[] = [],
	warnings: string[] = [],
): void {
	if (passed) {
		console.log(`${colors.green}✓ Validation: PASSED${colors.reset}`);
	} else {
		console.log(`${colors.red}✗ Validation: FAILED${colors.reset}`);
	}

	for (const error of errors) {
		console.log(`  ${colors.red}✗ ${error}${colors.reset}`);
	}

	for (const warning of warnings) {
		console.log(`  ${colors.yellow}⚠ ${warning}${colors.reset}`);
	}
}

export interface EnvChange {
	key: string;
	newValue: string;
	oldValue?: string;
	isNew: boolean;
	isChanged: boolean;
}

export function computeChanges(
	newEnv: Record<string, string>,
	currentEnv: Record<string, string | undefined>,
): EnvChange[] {
	const changes: EnvChange[] = [];

	for (const [key, newValue] of Object.entries(newEnv)) {
		const oldValue = currentEnv[key];
		const isNew = oldValue === undefined;
		const isChanged = !isNew && oldValue !== newValue;

		changes.push({
			key,
			newValue,
			oldValue,
			isNew,
			isChanged,
		});
	}

	return changes.sort((a, b) => a.key.localeCompare(b.key));
}

export function printEnvChanges(
	newEnv: Record<string, string>,
	currentEnv: Record<string, string | undefined>,
	dryRun: boolean,
): void {
	const changes = computeChanges(newEnv, currentEnv);
	const verb = dryRun ? "Would set" : "Setting";

	console.log(`\n${verb} ${changes.length} environment variables:`);

	for (const change of changes) {
		const maskedNew = maskValue(change.key, change.newValue);
		let line = `  ${change.key}=${maskedNew}`;

		if (change.isChanged && change.oldValue !== undefined) {
			const maskedOld = maskValue(change.key, change.oldValue);
			line += ` ${colors.yellow}(was: ${maskedOld})${colors.reset}`;
		} else if (change.isNew) {
			line += ` ${colors.green}(new)${colors.reset}`;
		}

		if (isSensitiveKey(change.key)) {
			line += ` ${colors.dim}(masked)${colors.reset}`;
		}

		console.log(line);
	}
}

export interface Conflict {
	key: string;
	currentValue: string;
	newValue: string;
}

export function detectConflicts(
	newEnv: Record<string, string>,
	currentEnv: Record<string, string | undefined>,
): Conflict[] {
	const conflicts: Conflict[] = [];

	for (const [key, newValue] of Object.entries(newEnv)) {
		const currentValue = currentEnv[key];
		if (currentValue !== undefined && currentValue !== newValue) {
			conflicts.push({ key, currentValue, newValue });
		}
	}

	return conflicts.sort((a, b) => a.key.localeCompare(b.key));
}

export function printConflicts(conflicts: Conflict[]): void {
	if (conflicts.length === 0) return;

	console.log(
		`\n${colors.yellow}⚠ Conflicts detected (${conflicts.length}):${colors.reset}`,
	);

	for (const conflict of conflicts) {
		const maskedCurrent = maskValue(conflict.key, conflict.currentValue);
		const maskedNew = maskValue(conflict.key, conflict.newValue);
		console.log(`  ${conflict.key}: ${maskedCurrent} → ${maskedNew}`);
	}
}

export function printExportStatements(env: Record<string, string>): void {
	const sortedKeys = Object.keys(env).sort();
	for (const key of sortedKeys) {
		const value = env[key];
		const escapedValue = value.replace(/'/g, "'\\''");
		console.log(`export ${key}='${escapedValue}'`);
	}
}

export interface PathWarningDisplay {
	variable: string;
	dir: string;
	reason: string;
}

export function printPathWarnings(warnings: PathWarningDisplay[]): void {
	if (warnings.length === 0) return;

	console.log(`\n${colors.yellow}⚠ Path warnings (${warnings.length}):${colors.reset}`);
	for (const w of warnings) {
		console.log(
			`  ${colors.yellow}⚠${colors.reset} ${w.variable}: ${w.dir} — ${w.reason}`,
		);
	}
}
