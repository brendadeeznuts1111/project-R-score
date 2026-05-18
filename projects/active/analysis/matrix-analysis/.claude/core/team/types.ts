/**
 * Team Profile Hierarchy Types
 *
 * Org-role-to-tier mapping for developer profiles.
 * All permissions are boolean flags — check with hasPermission().
 *
 * @module team/types
 * @tier 1380-OMEGA
 */

/** Developer org roles, ordered by seniority */
export type TeamRole = "lead" | "senior" | "developer" | "contributor";

/** Every permission is a named boolean flag */
export interface PermissionFlags {
	admin: boolean;
	deploy: boolean;
	review: boolean;
	mentor: boolean;
	manageTeam: boolean;
	develop: boolean;
	test: boolean;
	read: boolean;
}

/** All flag names for iteration */
export const PERMISSION_NAMES: (keyof PermissionFlags)[] = [
	"admin",
	"deploy",
	"review",
	"mentor",
	"manageTeam",
	"develop",
	"test",
	"read",
];

/** Role hierarchy order (index = rank, 0 = highest) */
export const ROLE_ORDER: TeamRole[] = ["lead", "senior", "developer", "contributor"];

/** Maps org role to tier level */
export const ROLE_TIER_MAP: Record<TeamRole, number> = {
	lead: 1380,
	senior: 1370,
	developer: 950,
	contributor: 500,
};

/** Maps tier level to permission flags */
export const TIER_PERMISSION_FLAGS: Record<number, PermissionFlags> = {
	1380: {
		admin: true,
		deploy: true,
		review: true,
		mentor: true,
		manageTeam: true,
		develop: true,
		test: true,
		read: true,
	},
	1370: {
		admin: false,
		deploy: true,
		review: true,
		mentor: true,
		manageTeam: false,
		develop: true,
		test: true,
		read: true,
	},
	950: {
		admin: false,
		deploy: false,
		review: true,
		mentor: false,
		manageTeam: false,
		develop: true,
		test: true,
		read: true,
	},
	500: {
		admin: false,
		deploy: false,
		review: false,
		mentor: false,
		manageTeam: false,
		develop: false,
		test: true,
		read: true,
	},
};

/** Cloudflare Email Routing domain for per-member emails */
export const EMAIL_DOMAIN = "factory-wager.com";

/** All-false baseline for unknown tiers */
const NO_PERMISSIONS: PermissionFlags = {
	admin: false,
	deploy: false,
	review: false,
	mentor: false,
	manageTeam: false,
	develop: false,
	test: false,
	read: false,
};

/** Team membership info stored in profile JSON */
export interface TeamInfo {
	id: string;
	role: TeamRole;
	tier: number;
	joinedAt: string;
	email: string;
	permissions: PermissionFlags;
}

/** Resolve tier for a role */
export function getRoleTier(role: TeamRole): number {
	return ROLE_TIER_MAP[role] ?? 500;
}

/** Resolve permission flags for a role */
export function getRolePermissions(role: TeamRole): PermissionFlags {
	const tier = getRoleTier(role);
	return { ...(TIER_PERMISSION_FLAGS[tier] ?? NO_PERMISSIONS) };
}

/** Check a single permission flag on a TeamInfo */
export function hasPermission(
	team: TeamInfo | null | undefined,
	flag: keyof PermissionFlags,
): boolean {
	if (!team) return false;
	return team.permissions[flag] === true;
}

/** Get list of enabled flag names (for display) */
export function enabledFlags(permissions: PermissionFlags): string[] {
	return PERMISSION_NAMES.filter((name) => permissions[name]);
}

/** Generate per-member Cloudflare email from profile name */
export function generateMemberEmail(profileName: string): string {
	return `${profileName}@${EMAIL_DOMAIN}`;
}

/** Get the next role up (promote). Returns null if already lead. */
export function getPromotedRole(current: TeamRole): TeamRole | null {
	const idx = ROLE_ORDER.indexOf(current);
	if (idx <= 0) return null;
	return ROLE_ORDER[idx - 1];
}

/** Get the next role down (demote). Returns null if already contributor. */
export function getDemotedRole(current: TeamRole): TeamRole | null {
	const idx = ROLE_ORDER.indexOf(current);
	if (idx < 0 || idx >= ROLE_ORDER.length - 1) return null;
	return ROLE_ORDER[idx + 1];
}
