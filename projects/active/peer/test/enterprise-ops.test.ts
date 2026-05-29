import { describe, expect, test } from "bun:test";

import { filterDeposits, paginate, sortDeposits, type DepositFilters } from "../src/utils/deposits";
import { canAccess } from "../src/utils/rbac";
import type { DepositRecord } from "../src/services/local-store";

const records: DepositRecord[] = [
  {
    id: "dep_a",
    memberId: "west-lead",
    memberName: "West Lead",
    division: "Houston HQ",
    paymentMethod: "venmo",
    amountBaseUnits: "1000000",
    fiatCurrency: "USD",
    status: "active",
    riskLevel: "low",
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:05:00.000Z",
    createdBy: "admin-central",
    walletAddress: "0x1111111111111111111111111111111111111111",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    minIntentAmount: "100000",
    maxIntentAmount: "500000",
    tags: ["Houston HQ", "venmo"],
    live: true,
    transactionHash: null,
  },
  {
    id: "dep_b",
    memberId: "remote-ops",
    memberName: "Remote Ops",
    division: "Remote Ops",
    paymentMethod: "paypal",
    amountBaseUnits: "2500000",
    fiatCurrency: "USD",
    status: "paused",
    riskLevel: "medium",
    createdAt: "2026-04-23T12:00:00.000Z",
    updatedAt: "2026-04-24T08:00:00.000Z",
    createdBy: "ops-lead",
    walletAddress: "0x2222222222222222222222222222222222222222",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    minIntentAmount: "200000",
    maxIntentAmount: "900000",
    tags: ["Remote Ops", "paypal"],
    live: true,
    transactionHash: "0xabc",
  },
  {
    id: "dep_c",
    memberId: "energy-team",
    memberName: "Energy Team",
    division: "Energy Corridor",
    paymentMethod: "cashapp",
    amountBaseUnits: "500000",
    fiatCurrency: "USD",
    status: "error",
    riskLevel: "high",
    createdAt: "2026-04-22T09:00:00.000Z",
    updatedAt: "2026-04-24T07:00:00.000Z",
    createdBy: "ops-energy",
    walletAddress: null,
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    minIntentAmount: "100000",
    maxIntentAmount: "300000",
    tags: ["Energy Corridor", "cashapp"],
    live: false,
    transactionHash: null,
  },
];

describe("enterprise deposit management", () => {
  test("filters deposits by search, status, division, method, amount, and date window", () => {
    const filters: DepositFilters = {
      search: "remote",
      status: "paused",
      division: "Remote Ops",
      paymentMethod: "paypal",
      amountMin: 2000000,
      amountMax: 3000000,
      dateFrom: "2026-04-23",
      dateTo: "2026-04-24",
    };

    expect(filterDeposits(records, filters)).toEqual([records[1]]);
  });

  test("sorts newest-first and paginates filtered deposits deterministically", () => {
    const sorted = sortDeposits(records);
    expect(sorted.map((record) => record.id)).toEqual(["dep_a", "dep_b", "dep_c"]);

    const page = paginate(sorted, 2, 2);
    expect(page.totalItems).toBe(3);
    expect(page.totalPages).toBe(2);
    expect(page.items.map((record) => record.id)).toEqual(["dep_c"]);
  });
});

describe("enterprise RBAC", () => {
  test("gates deposit, approval, and settings capabilities by UI role", () => {
    expect(canAccess("Operator", "deposit:create")).toBe(true);
    expect(canAccess("Operator", "settings:write")).toBe(false);
    expect(canAccess("Compliance", "approval:act")).toBe(true);
    expect(canAccess("Viewer", "deposit:manage")).toBe(false);
    expect(canAccess("Admin", "settings:write")).toBe(true);
  });
});
