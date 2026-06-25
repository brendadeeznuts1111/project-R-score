/**
 * Team Registry — Profile-level team membership CRUD
 *
 * Reads/writes team data directly into ~/.matrix/profiles/*.json.
 * No separate database; profiles are the source of truth.
 *
 * @module team/TeamRegistry
 * @tier 1380-OMEGA
 */

import {
	generateMemberEmail,
	getDemotedRole,
	getPromotedRole,
	getRolePermissions,
	getRoleTier,
	ROLE_ORDER,
	type TeamInfo,
	type TeamRole,
} from "./types.ts";

export interface ProfileWithTeam {
	name: string;
	version: string;
	created?: string;
	author?: string;
	description?: string;
	environment?: string;
	env: Record<string, string>;
	team?: TeamInfo;
}

const DEFAULT_PROFILES_DIR = `${Bun.env.HOME}/.matrix/profiles`;
let PROFILES_DIR = DEFAULT_PROFILES_DIR;

/** Override the profiles directory (for testing). */
export function setProfilesDir(dir: string): void {
	PROFILES_DIR = dir;
}

/** Reset the profiles directory to default. */
export function resetProfilesDir(): void {
	PROFILES_DIR = DEFAULT_PROFILES_DIR;
}

/** Read a single profile JSON. Returns null on any error. */
async function readProfile(profileName: string): Promise<ProfileWithTeam | null> {
	const file = Bun.file(`${PROFILES_DIR}/${profileName}.json`);
	if (!(await file.exists())) return null;
	return file.json().catch(() => null);
}

/** Write a profile back to disk. Returns success boolean. */
async function writeProfile(
	profileName: string,
	data: ProfileWithTeam,
): Promise<boolean> {
	const path = `${PROFILES_DIR}/${profileName}.json`;
	return Bun.write(path, JSON.stringify(data, null, 2))
		.then(() => true)
		.catch(() => false);
}

/** List all profile file names (without .json extension). */
async function listProfileNames(): Promise<string[]> {
	const glob = new Bun.Glob("*.json");
	const names: string[] = [];
	for await (const file of glob.scan({ cwd: PROFILES_DIR, absolute: false })) {
		names.push(file.replace(/\.json$/, ""));
	}
	return names.sort();
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add team membership to a profile.
 * Overwrites any existing team data on that profile.
 */
export async function addMember(
	profileName: string,
	teamId: string,
	role: TeamRole,
): Promise<ProfileWithTeam | null> {
	const profile = await readProfile(profileName);
	if (!profile) return null;

	profile.team = {
		id: teamId,
		role,
		tier: getRoleTier(role),
		joinedAt: new Date().toISOString(),
		email: generateMemberEmail(profileName),
		permissions: getRolePermissions(role),
	};

	const ok = await writeProfile(profileName, profile);
	return ok ? profile : null;
}

/**
 * Remove team membership from a profile.
 */
export async function removeMember(profileName: string): Promise<boolean> {
	const profile = await readProfile(profileName);
	if (!profile) return false;

	delete profile.team;
	return writeProfile(profileName, profile);
}

/**
 * Update a member's role (promotes or demotes).
 * Recalculates tier and permissions automatically.
 */
export async function updateRole(
	profileName: string,
	newRole: TeamRole,
): Promise<ProfileWithTeam | null> {
	const profile = await readProfile(profileName);
	if (!profile?.team) return null;

	profile.team.role = newRole;
	profile.team.tier = getRoleTier(newRole);
	profile.team.permissions = getRolePermissions(newRole);

	const ok = await writeProfile(profileName, profile);
	return ok ? profile : null;
}

/**
 * Promote a member one role level up. Returns null if already lead.
 */
export async function promoteMember(
	profileName: string,
): Promise<ProfileWithTeam | null> {
	const profile = await readProfile(profileName);
	if (!profile?.team) return null;

	const nextRole = getPromotedRole(profile.team.role);
	if (!nextRole) return null;

	return updateRole(profileName, nextRole);
}

/**
 * Demote a member one role level down. Returns null if already contributor.
 */
export async function demoteMember(
	profileName: string,
): Promise<ProfileWithTeam | null> {
	const profile = await readProfile(profileName);
	if (!profile?.team) return null;

	const nextRole = getDemotedRole(profile.team.role);
	if (!nextRole) return null;

	return updateRole(profileName, nextRole);
}

/**
 * Get a single member profile with team data.
 */
export async function getMember(profileName: string): Promise<ProfileWithTeam | null> {
	return readProfile(profileName);
}

/**
 * List all profiles that have team membership.
 * Optionally filter by teamId.
 */
export async function listMembers(teamId?: string): Promise<ProfileWithTeam[]> {
	const names = await listProfileNames();
	const results: ProfileWithTeam[] = [];

	for (const name of names) {
		const profile = await readProfile(name);
		if (!profile?.team) continue;
		if (teamId && profile.team.id !== teamId) continue;
		results.push(profile);
	}

	return results;
}

/**
 * Get team hierarchy: members grouped by role, leads first.
 */
export async function getHierarchy(
	teamId?: string,
): Promise<Record<TeamRole, ProfileWithTeam[]>> {
	const members = await listMembers(teamId);

	const hierarchy: Record<TeamRole, ProfileWithTeam[]> = {
		lead: [],
		senior: [],
		developer: [],
		contributor: [],
	};

	for (const member of members) {
		const role = member.team?.role ?? "contributor";
		hierarchy[role].push(member);
	}

	// Sort each group alphabetically by name
	for (const role of ROLE_ORDER) {
		hierarchy[role].sort((a, b) => a.name.localeCompare(b.name));
	}

	return hierarchy;
}
