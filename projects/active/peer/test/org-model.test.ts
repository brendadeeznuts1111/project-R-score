import { describe, expect, test } from "bun:test";

import {
  getPermissionsForRole,
  getRegionFromState,
  hasPermission,
  summarizeOrg,
  type OrgMemberRecord,
} from "../src/org-model";

describe("org hierarchy model", () => {
  test("maps U.S. states into regions and permissions", () => {
    expect(getRegionFromState("CA")).toBe("west");
    expect(getRegionFromState("IL")).toBe("midwest");
    expect(getRegionFromState("TX")).toBe("south");
    expect(getRegionFromState("NY")).toBe("northeast");
    expect(getPermissionsForRole("regional_lead", false)).toContain("team:write");
  });

  test("summarizes balances and enforces regional permission scope", () => {
    const members: OrgMemberRecord[] = [
      {
        memberId: "west-lead",
        displayName: "West Lead",
        email: "west@example.com",
        state: "CA",
        region: "west",
        role: "regional_lead",
        leaderForRegion: true,
        canExecutePeerTransactions: true,
        venmo: "@west",
        cashapp: null,
        paypal: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        memberId: "south-member",
        displayName: "South Member",
        email: "south@example.com",
        state: "TX",
        region: "south",
        role: "member",
        leaderForRegion: false,
        canExecutePeerTransactions: false,
        venmo: null,
        cashapp: "$south",
        paypal: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const summary = summarizeOrg(members, [
      {
        entryId: "1",
        memberId: "west-lead",
        amountUsdCents: 10000,
        type: "credit",
        note: "seed",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "west-lead",
      },
      {
        entryId: "2",
        memberId: "south-member",
        amountUsdCents: 2500,
        type: "debit",
        note: "expense",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "west-lead",
      },
    ]);

    expect(summary.leadersByRegion.west).toBe("west-lead");
    expect(summary.funds.byMember["west-lead"]).toBe(10000);
    expect(summary.funds.byRegion.west).toBe(10000);
    expect(summary.funds.byRegion.south).toBe(-2500);
    expect(summary.funds.totalUsdCents).toBe(7500);
    expect(hasPermission(members[0], "team:write", "west")).toBe(true);
    expect(hasPermission(members[0], "team:write", "south")).toBe(false);
  });
});
