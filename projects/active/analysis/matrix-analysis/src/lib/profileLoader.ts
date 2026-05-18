import type { TeamInfo } from "../../.claude/core/team/types.ts";
import type { PathVarConfig } from "./pathResolver";

export interface Profile {
	name: string;
	version: string;
	created?: string;
	author?: string;
	description?: string;
	environment?: string;
	env: Record<string, string>;
	paths?: Record<string, PathVarConfig>;
	team?: TeamInfo;
}

export function getProfilesDir(): string {
	return `${Bun.env.HOME}/.matrix/profiles`;
}

export async function listProfiles(): Promise<string[]> {
	const dir = getProfilesDir();
	const glob = new Bun.Glob("*.json");
	const profiles: string[] = [];

	for await (const file of glob.scan({ cwd: dir, absolute: false })) {
		profiles.push(file.replace(/\.json$/, ""));
	}

	return profiles.sort();
}

export async function loadProfile(name: string): Promise<Profile | null> {
	const profilePath = `${getProfilesDir()}/${name}.json`;
	const file = Bun.file(profilePath);

	if (!(await file.exists())) {
		return null;
	}

	const content = await file.json().catch(() => null);
	if (!content) {
		return null;
	}

	return content as Profile;
}

export async function saveProfile(name: string, profile: Profile): Promise<void> {
	const profilePath = `${getProfilesDir()}/${name}.json`;
	await Bun.write(profilePath, JSON.stringify(profile, null, 2) + "\n");
}

export function resolveSecretRefs(env: Record<string, string>): Record<string, string> {
	const resolved: Record<string, string> = {};
	const varPattern = /\$\{([^}]+)\}/g;

	for (const [key, value] of Object.entries(env)) {
		if (typeof value !== "string") {
			resolved[key] = String(value);
			continue;
		}

		resolved[key] = value.replace(varPattern, (match, varName) => {
			const envValue = Bun.env[varName];
			if (envValue !== undefined) {
				return envValue;
			}
			return match;
		});
	}

	return resolved;
}

export function getUnresolvedRefs(env: Record<string, string>): string[] {
	const varPattern = /\$\{([^}]+)\}/g;
	const unresolved: string[] = [];

	for (const value of Object.values(env)) {
		if (typeof value !== "string") continue;

		for (const match of value.matchAll(varPattern)) {
			const varName = match[1];
			if (Bun.env[varName] === undefined) {
				unresolved.push(varName);
			}
		}
	}

	return [...new Set(unresolved)];
}
