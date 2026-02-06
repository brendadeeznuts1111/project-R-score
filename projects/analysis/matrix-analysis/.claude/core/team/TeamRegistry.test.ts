import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import {
	addMember,
	demoteMember,
	getHierarchy,
	getMember,
	listMembers,
	promoteMember,
	removeMember,
	resetProfilesDir,
	setProfilesDir,
	updateRole,
} from "./TeamRegistry.ts";
import {
	EMAIL_DOMAIN,
	enabledFlags,
	generateMemberEmail,
	getDemotedRole,
	getPromotedRole,
	getRolePermissions,
	getRoleTier,
	hasPermission,
	PERMISSION_NAMES,
	ROLE_ORDER,
	ROLE_TIER_MAP,
	type TeamRole,
	TIER_PERMISSION_FLAGS,
} from "./types.ts";

// ═══════════════════════════════════════════════════════════════════════════
// types.ts unit tests
// ═══════════════════════════════════════════════════════════════════════════

describe("types", () => {
	it("should map all roles to tiers", () => {
		expect(getRoleTier("lead")).toBe(1380);
		expect(getRoleTier("senior")).toBe(1370);
		expect(getRoleTier("developer")).toBe(950);
		expect(getRoleTier("contributor")).toBe(500);
	});

	it("should return PermissionFlags objects, not arrays", () => {
		const flags = getRolePermissions("lead");
		expect(typeof flags).toBe("object");
		expect(typeof flags.admin).toBe("boolean");
		expect(typeof flags.deploy).toBe("boolean");
	});

	it("should set correct flags per role", () => {
		const leadFlags = getRolePermissions("lead");
		expect(leadFlags.admin).toBe(true);
		expect(leadFlags.deploy).toBe(true);
		expect(leadFlags.manageTeam).toBe(true);
		expect(leadFlags.read).toBe(true);

		const seniorFlags = getRolePermissions("senior");
		expect(seniorFlags.admin).toBe(false);
		expect(seniorFlags.deploy).toBe(true);
		expect(seniorFlags.mentor).toBe(true);
		expect(seniorFlags.manageTeam).toBe(false);

		const devFlags = getRolePermissions("developer");
		expect(devFlags.develop).toBe(true);
		expect(devFlags.review).toBe(true);
		expect(devFlags.deploy).toBe(false);
		expect(devFlags.admin).toBe(false);

		const contribFlags = getRolePermissions("contributor");
		expect(contribFlags.read).toBe(true);
		expect(contribFlags.test).toBe(true);
		expect(contribFlags.develop).toBe(false);
		expect(contribFlags.deploy).toBe(false);
		expect(contribFlags.admin).toBe(false);
	});

	it("should promote roles correctly", () => {
		expect(getPromotedRole("contributor")).toBe("developer");
		expect(getPromotedRole("developer")).toBe("senior");
		expect(getPromotedRole("senior")).toBe("lead");
		expect(getPromotedRole("lead")).toBeNull();
	});

	it("should demote roles correctly", () => {
		expect(getDemotedRole("lead")).toBe("senior");
		expect(getDemotedRole("senior")).toBe("developer");
		expect(getDemotedRole("developer")).toBe("contributor");
		expect(getDemotedRole("contributor")).toBeNull();
	});

	it("should have 4 roles in correct order", () => {
		expect(ROLE_ORDER).toEqual(["lead", "senior", "developer", "contributor"]);
		expect(ROLE_ORDER.length).toBe(4);
	});

	it("should have flags for every tier", () => {
		for (const role of ROLE_ORDER) {
			const tier = ROLE_TIER_MAP[role];
			const flags = TIER_PERMISSION_FLAGS[tier];
			expect(flags).toBeDefined();
			for (const name of PERMISSION_NAMES) {
				expect(typeof flags[name]).toBe("boolean");
			}
		}
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// hasPermission() flag guard tests
// ═══════════════════════════════════════════════════════════════════════════

describe("hasPermission", () => {
	it("should return true for enabled flags", () => {
		const team = {
			id: "eng",
			role: "lead" as TeamRole,
			tier: 1380,
			joinedAt: new Date().toISOString(),
			email: "lead@factory-wager.com",
			permissions: getRolePermissions("lead"),
		};
		expect(hasPermission(team, "admin")).toBe(true);
		expect(hasPermission(team, "deploy")).toBe(true);
		expect(hasPermission(team, "manageTeam")).toBe(true);
	});

	it("should return false for disabled flags", () => {
		const team = {
			id: "eng",
			role: "contributor" as TeamRole,
			tier: 500,
			joinedAt: new Date().toISOString(),
			email: "contrib@factory-wager.com",
			permissions: getRolePermissions("contributor"),
		};
		expect(hasPermission(team, "admin")).toBe(false);
		expect(hasPermission(team, "deploy")).toBe(false);
		expect(hasPermission(team, "develop")).toBe(false);
	});

	it("should return false for null/undefined team", () => {
		expect(hasPermission(null, "admin")).toBe(false);
		expect(hasPermission(undefined, "deploy")).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// enabledFlags() display helper tests
// ═══════════════════════════════════════════════════════════════════════════

describe("enabledFlags", () => {
	it("should return only enabled flag names", () => {
		const flags = getRolePermissions("contributor");
		const enabled = enabledFlags(flags);
		expect(enabled).toEqual(["test", "read"]);
	});

	it("should return all flags for lead", () => {
		const flags = getRolePermissions("lead");
		const enabled = enabledFlags(flags);
		expect(enabled).toEqual(PERMISSION_NAMES);
	});

	it("should return subset for developer", () => {
		const flags = getRolePermissions("developer");
		const enabled = enabledFlags(flags);
		expect(enabled).toContain("develop");
		expect(enabled).toContain("review");
		expect(enabled).toContain("test");
		expect(enabled).toContain("read");
		expect(enabled).not.toContain("admin");
		expect(enabled).not.toContain("deploy");
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// generateMemberEmail() tests
// ═══════════════════════════════════════════════════════════════════════════

describe("generateMemberEmail", () => {
	it("should generate email from profile name", () => {
		expect(generateMemberEmail("dev")).toBe("dev@factory-wager.com");
		expect(generateMemberEmail("alice")).toBe("alice@factory-wager.com");
		expect(generateMemberEmail("test")).toBe("test@factory-wager.com");
	});

	it("should use the EMAIL_DOMAIN constant", () => {
		expect(generateMemberEmail("bob")).toBe(`bob@${EMAIL_DOMAIN}`);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// TeamRegistry.ts integration tests (uses temp profiles dir)
// ═══════════════════════════════════════════════════════════════════════════

import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("TeamRegistry", () => {
	const TEST_PROFILE = "test";
	const tempDir = join(tmpdir(), `team-registry-test-${Date.now()}`);
	const profilePath = join(tempDir, `${TEST_PROFILE}.json`);

	const seedProfile: Record<string, unknown> = {
		name: TEST_PROFILE,
		version: "1.0.0",
		env: {},
	};

	beforeAll(() => {
		mkdirSync(tempDir, { recursive: true });
		setProfilesDir(tempDir);
	});

	afterAll(() => {
		resetProfilesDir();
		rmSync(tempDir, { recursive: true, force: true });
	});

	beforeEach(async () => {
		await Bun.write(profilePath, JSON.stringify(seedProfile, null, 2));
	});

	afterEach(async () => {
		await Bun.write(profilePath, JSON.stringify(seedProfile, null, 2));
	});

	it("should add a team member with flag-based permissions", async () => {
		const result = await addMember(TEST_PROFILE, "engineering", "developer");
		expect(result).not.toBeNull();
		expect(result!.team).toBeDefined();
		expect(result!.team!.id).toBe("engineering");
		expect(result!.team!.role).toBe("developer");
		expect(result!.team!.tier).toBe(950);
		expect(result!.team!.email).toBe(`${TEST_PROFILE}@${EMAIL_DOMAIN}`);

		// Permissions are now flags
		const perms = result!.team!.permissions;
		expect(typeof perms).toBe("object");
		expect(perms.develop).toBe(true);
		expect(perms.test).toBe(true);
		expect(perms.review).toBe(true);
		expect(perms.deploy).toBe(false);
		expect(perms.admin).toBe(false);
	});

	it("should return null for non-existent profile", async () => {
		const result = await addMember("nonexistent-profile-xyz", "eng", "lead");
		expect(result).toBeNull();
	});

	it("should update role and recalculate flags", async () => {
		await addMember(TEST_PROFILE, "engineering", "developer");
		const result = await updateRole(TEST_PROFILE, "senior");
		expect(result).not.toBeNull();
		expect(result!.team!.role).toBe("senior");
		expect(result!.team!.tier).toBe(1370);
		expect(result!.team!.permissions.mentor).toBe(true);
		expect(result!.team!.permissions.deploy).toBe(true);
		expect(result!.team!.permissions.admin).toBe(false);
	});

	it("should promote a member and upgrade flags", async () => {
		await addMember(TEST_PROFILE, "engineering", "contributor");

		const promoted = await promoteMember(TEST_PROFILE);
		expect(promoted).not.toBeNull();
		expect(promoted!.team!.role).toBe("developer");
		expect(promoted!.team!.tier).toBe(950);
		expect(promoted!.team!.permissions.develop).toBe(true);
		expect(promoted!.team!.permissions.deploy).toBe(false);
	});

	it("should not promote past lead", async () => {
		await addMember(TEST_PROFILE, "engineering", "lead");
		const result = await promoteMember(TEST_PROFILE);
		expect(result).toBeNull();
	});

	it("should demote a member and downgrade flags", async () => {
		await addMember(TEST_PROFILE, "engineering", "senior");

		const demoted = await demoteMember(TEST_PROFILE);
		expect(demoted).not.toBeNull();
		expect(demoted!.team!.role).toBe("developer");
		expect(demoted!.team!.tier).toBe(950);
		expect(demoted!.team!.permissions.mentor).toBe(false);
		expect(demoted!.team!.permissions.develop).toBe(true);
	});

	it("should not demote past contributor", async () => {
		await addMember(TEST_PROFILE, "engineering", "contributor");
		const result = await demoteMember(TEST_PROFILE);
		expect(result).toBeNull();
	});

	it("should remove team membership", async () => {
		await addMember(TEST_PROFILE, "engineering", "developer");
		const removed = await removeMember(TEST_PROFILE);
		expect(removed).toBe(true);

		const after = await getMember(TEST_PROFILE);
		expect(after).not.toBeNull();
		expect(after!.team).toBeUndefined();
	});

	it("should get hierarchy grouped by role", async () => {
		await addMember(TEST_PROFILE, "engineering", "senior");

		const hierarchy = await getHierarchy("engineering");
		expect(hierarchy.lead).toBeDefined();
		expect(hierarchy.senior).toBeDefined();
		expect(hierarchy.developer).toBeDefined();
		expect(hierarchy.contributor).toBeDefined();

		const seniors = hierarchy.senior;
		expect(seniors.some((m) => m.name === TEST_PROFILE)).toBe(true);
	});

	it("should list only members with team data", async () => {
		await addMember(TEST_PROFILE, "engineering", "developer");
		const members = await listMembers("engineering");
		expect(members.length).toBeGreaterThanOrEqual(1);
		expect(members.every((m) => m.team?.id === "engineering")).toBe(true);
	});

	it("should persist flag-based permissions and email to disk", async () => {
		await addMember(TEST_PROFILE, "ops", "lead");

		// Re-read from disk
		const raw = await Bun.file(profilePath).json();
		expect(raw.team).toBeDefined();
		expect(raw.team.id).toBe("ops");
		expect(raw.team.role).toBe("lead");
		expect(raw.team.tier).toBe(1380);
		expect(raw.team.email).toBe(`${TEST_PROFILE}@${EMAIL_DOMAIN}`);

		// Flags persisted as booleans
		expect(raw.team.permissions.admin).toBe(true);
		expect(raw.team.permissions.deploy).toBe(true);
		expect(raw.team.permissions.manageTeam).toBe(true);
		expect(raw.team.permissions.read).toBe(true);
	});

	it("should preserve email across role changes", async () => {
		await addMember(TEST_PROFILE, "engineering", "contributor");
		const originalEmail = `${TEST_PROFILE}@${EMAIL_DOMAIN}`;

		// Promote: contributor -> developer
		const promoted = await promoteMember(TEST_PROFILE);
		expect(promoted!.team!.email).toBe(originalEmail);

		// Update role directly: developer -> senior
		const updated = await updateRole(TEST_PROFILE, "senior");
		expect(updated!.team!.email).toBe(originalEmail);

		// Demote: senior -> developer
		const demoted = await demoteMember(TEST_PROFILE);
		expect(demoted!.team!.email).toBe(originalEmail);
	});

	it("should support hasPermission() guard on loaded profiles", async () => {
		await addMember(TEST_PROFILE, "engineering", "developer");
		const member = await getMember(TEST_PROFILE);

		expect(hasPermission(member?.team, "develop")).toBe(true);
		expect(hasPermission(member?.team, "test")).toBe(true);
		expect(hasPermission(member?.team, "review")).toBe(true);
		expect(hasPermission(member?.team, "deploy")).toBe(false);
		expect(hasPermission(member?.team, "admin")).toBe(false);
		expect(hasPermission(member?.team, "manageTeam")).toBe(false);
	});
});
