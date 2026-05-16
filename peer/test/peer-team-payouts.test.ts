import { describe, expect, test } from "bun:test";

import {
  buildPeerTeamPayouts,
  getNormalizedTeamMemberOrThrow,
  getPeerCreateDepositPaymentConfig,
  getSdkPayeeData,
  getTeamPaymentMethodIndex,
  hasAnySupportedPayoutMethod,
} from "../src/peer-team-payouts";
import { buildDemoCreateDepositPayload } from "../src/peer-create-deposit";

describe("buildPeerTeamPayouts", () => {
  test("normalizes handles into Peer-compatible depositData", () => {
    const result = buildPeerTeamPayouts([
      {
        memberId: "me",
        displayName: "Nola",
        venmo: "@NolaRose",
        cashapp: "$nolarose",
        paypal: "Nola@Example.com",
      },
      {
        memberId: "sam",
        displayName: "Sam",
        venmo: "@sam_team",
      },
    ]);

    expect(result.members[0]).toEqual({
      memberId: "me",
      displayName: "Nola",
      methods: [
        {
          platform: "venmo",
          processorName: "venmo",
          depositData: { venmoUsername: "NolaRose" },
          redactedValue: "No****se",
        },
        {
          platform: "cashapp",
          processorName: "cashapp",
          depositData: { cashtag: "nolarose" },
          redactedValue: "no****se",
        },
        {
          platform: "paypal",
          processorName: "paypal",
          depositData: { paypalEmail: "nola@example.com" },
          redactedValue: "no************om",
        },
      ],
    });

    expect(getPeerCreateDepositPaymentConfig(result.members[0])).toEqual({
      processorNames: ["venmo", "cashapp", "paypal"],
      depositData: [
        { venmoUsername: "NolaRose" },
        { cashtag: "nolarose" },
        { paypalEmail: "nola@example.com" },
      ],
    });

    expect(getSdkPayeeData(result.members[0])).toEqual([
      { offchainId: "NolaRose" },
      { offchainId: "nolarose" },
      { offchainId: "nola@example.com" },
    ]);

    expect(getTeamPaymentMethodIndex(result)).toEqual({
      me: {
        venmo: { venmoUsername: "NolaRose" },
        cashapp: { cashtag: "nolarose" },
        paypal: { paypalEmail: "nola@example.com" },
      },
      sam: {
        venmo: { venmoUsername: "sam_team" },
        cashapp: undefined,
        paypal: undefined,
      },
    });

    expect(
      buildDemoCreateDepositPayload(result, {
        memberId: "me",
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "10000000",
        minIntentAmount: "100000",
        maxIntentAmount: "5000000",
        conversionRates: [{ currency: "USD", conversionRate: "1020000000000000000" }],
      }),
    ).toEqual({
      token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      amount: "10000000",
      intentAmountRange: {
        min: "100000",
        max: "5000000",
      },
      processorNames: ["venmo", "cashapp", "paypal"],
      depositData: [
        { venmoUsername: "NolaRose" },
        { cashtag: "nolarose" },
        { paypalEmail: "nola@example.com" },
      ],
      payeeData: [
        { offchainId: "NolaRose" },
        { offchainId: "nolarose" },
        { offchainId: "nola@example.com" },
      ],
      conversionRates: [[{ currency: "USD", conversionRate: "1020000000000000000" }]],
    });
  });

  test("rejects invalid team data", () => {
    expect(() =>
      buildPeerTeamPayouts([
        {
          memberId: "me",
          displayName: "Nola",
          venmo: "@bad handle",
        },
      ]),
    ).toThrow("Venmo username cannot contain spaces.");

    expect(() =>
      buildPeerTeamPayouts([
        {
          memberId: "me",
          displayName: "Nola",
        },
      ]),
    ).toThrow("must include at least one supported payout method");

    expect(() =>
      buildPeerTeamPayouts([
        {
          memberId: "dup",
          displayName: "One",
          venmo: "@one",
        },
        {
          memberId: "dup",
          displayName: "Two",
          venmo: "@two",
        },
      ]),
    ).toThrow('Duplicate memberId "dup" is not allowed.');
  });

  test("detects payout-ready members and selected payout owner lookup", () => {
    expect(
      hasAnySupportedPayoutMethod({
        venmo: null,
        cashapp: "$opslead",
        paypal: null,
      }),
    ).toBe(true);

    expect(
      hasAnySupportedPayoutMethod({
        venmo: null,
        cashapp: null,
        paypal: null,
      }),
    ).toBe(false);

    const result = buildPeerTeamPayouts([
      {
        memberId: "ops-lead",
        displayName: "Ops Lead",
        cashapp: "$opslead",
      },
    ]);

    expect(getNormalizedTeamMemberOrThrow(result, "ops-lead").memberId).toBe("ops-lead");
    expect(() => getNormalizedTeamMemberOrThrow(result, "missing")).toThrow(
      'Selected payout owner "missing" was not found.',
    );
  });
});
