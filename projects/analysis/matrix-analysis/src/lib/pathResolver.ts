import { existsSync } from "node:fs";

export interface PathVarConfig {
	prepend?: string[];
	append?: string[];
}

export interface PathWarning {
	variable: string;
	dir: string;
	reason: string;
}

export interface PathResolveResult {
	resolved: Record<string, string>;
	warnings: PathWarning[];
}

export const PATH_SEPARATOR = process.platform === "win32" ? ";" : ":";

export const PATH_LIKE_VARS = [
	"PATH",
	"MANPATH",
	"LD_LIBRARY_PATH",
	"DYLD_LIBRARY_PATH",
	"PKG_CONFIG_PATH",
	"PYTHONPATH",
	"NODE_PATH",
	"GOPATH",
	"CLASSPATH",
	"CPATH",
	"LIBRARY_PATH",
];

export function expandPathVars(
	template: string,
	env: Record<string, string | undefined>,
): string {
	return template.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
		const value = env[varName];
		return value !== undefined ? value : "";
	});
}

function normalizePath(dir: string): string {
	// Remove trailing slashes for comparison, but keep "/" and "\" alone
	if (dir.length > 1) {
		return dir.replace(/[/\\]+$/, "");
	}
	return dir;
}

export function dedupePaths(entries: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of entries) {
		if (!entry) continue;
		const normalized = normalizePath(entry);
		if (!seen.has(normalized)) {
			seen.add(normalized);
			result.push(entry);
		}
	}

	return result;
}

export function checkPathExists(dir: string): boolean {
	try {
		return existsSync(dir);
	} catch {
		return false;
	}
}

export function resolvePaths(
	paths: Record<string, PathVarConfig> | undefined,
	currentEnv: Record<string, string | undefined>,
	profileEnv: Record<string, string>,
): PathResolveResult {
	if (!paths || Object.keys(paths).length === 0) {
		return { resolved: {}, warnings: [] };
	}

	const resolved: Record<string, string> = {};
	const warnings: PathWarning[] = [];
	const mergedEnv = { ...currentEnv, ...profileEnv };

	for (const [variable, config] of Object.entries(paths)) {
		const prependDirs = (config.prepend || []).map((d) => expandPathVars(d, mergedEnv));
		const appendDirs = (config.append || []).map((d) => expandPathVars(d, mergedEnv));

		const currentValue = currentEnv[variable] || "";
		const currentDirs = currentValue ? currentValue.split(PATH_SEPARATOR) : [];

		const allDirs = [...prependDirs, ...currentDirs, ...appendDirs];
		const deduped = dedupePaths(allDirs);

		resolved[variable] = deduped.join(PATH_SEPARATOR);

		// Check for non-existent directories in prepend/append
		for (const dir of [...prependDirs, ...appendDirs]) {
			if (dir && !checkPathExists(dir)) {
				warnings.push({
					variable,
					dir,
					reason: "directory does not exist",
				});
			}
		}
	}

	return { resolved, warnings };
}
