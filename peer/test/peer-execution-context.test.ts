import { describe, expect, test } from "bun:test";

import { buildPeerExecutionContext } from "../src/peer-execution-context";
import { buildPeerTeamPayouts } from "../src/peer-team-payouts";
import type { OrgMemberRecord } from "../src/org-model";

describe("buildPeerExecutionContext", () => {
  test("describes operator, payout owner, and deposit wallet separately", () => {
    const signedInMember: OrgMemberRecord = {
      memberId: "west-lead",
      displayName: "West Lead",
      email: "west@example.com",
      state: "CA",
      region: "west",
      role: "regional_lead",
      leaderForRegion: true,
      canExecutePeerTransactions: true,
      venmo: "@westlead",
      cashapp: null,
      paypal: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const team = buildPeerTeamPayouts([
      {
        memberId: "south-payout",
        displayName: "South Payout Owner",
        venmo: "@southowner",
        paypal: "south@example.com",
      },
    ]);

    const context = buildPeerExecutionContext({
      signedInMember,
      permissions: ["team:read", "team:write", "peer:execute"],
      payoutOwner: team.members[0],
      connectedWalletAddress: "0x1111111111111111111111111111111111111111",
    });

    expect(context.signedInMember.memberId).toBe("west-lead");
    expect(context.payoutOwner.memberId).toBe("south-payout");
    expect(context.payoutOwner.processorNames).toEqual(["venmo", "paypal"]);
    expect(context.connectedWalletAddress).toBe("0x1111111111111111111111111111111111111111");
    expect(context.rules.depositOwnership).toContain("connected wallet");
    expect(context.rules.payoutOwnership).toContain("member-owned payout destinations");
  });
});
