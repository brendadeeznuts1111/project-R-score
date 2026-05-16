import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "bun:test";

const tempDir = mkdtempSync(join(tmpdir(), "peer-server-deposits-"));
process.env.NODE_ENV = "test";
process.env.PEER_DATA_DIR = tempDir;
process.env.PEER_DB_PATH = `${tempDir}/peer.sqlite`;
process.env.PEER_BUILD_ON_START = "0";

const { handleRequest } = await import("../src/server");

type JsonObject = Record<string, unknown>;

async function request(
  pathname: string,
  init: {
    method?: string;
    headers?: HeadersInit;
    body?: JsonObject;
  } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return handleRequest(
    new Request(`http://peer.test${pathname}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
  );
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("server-backed deposit lifecycle", () => {
  test("persists deposits, honors cookie auth, and rejects non-peer operators", async () => {
    const createAdmin = await request("/api/org/members", {
      method: "POST",
      body: {
        memberId: "admin-central",
        displayName: "Admin Central",
        email: "admin-central@peer.test",
        state: "TX",
        role: "admin",
        password: "peer-password-123",
        venmo: "peeradmin",
      },
    });
    expect(createAdmin.status).toBe(201);

    const adminSignIn = await request("/api/auth/signin", {
      method: "POST",
      body: {
        memberId: "admin-central",
        password: "peer-password-123",
      },
    });
    expect(adminSignIn.status).toBe(200);
    const adminSession = await json<{
      session: {
        permissions: string[];
        appRole: string;
      };
    }>(adminSignIn);
    expect(adminSession.session.permissions).toContain("peer:execute");
    expect(adminSession.session.appRole).toBe("Admin");
    const adminCookie = adminSignIn.headers.get("set-cookie");
    expect(adminCookie).toBeTruthy();

    const createFinance = await request("/api/org/members", {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        memberId: "finance-review",
        displayName: "Finance Review",
        email: "finance-review@peer.test",
        state: "TX",
        role: "finance",
        password: "peer-password-456",
      },
    });
    expect(createFinance.status).toBe(201);

    const financeSignIn = await request("/api/auth/signin", {
      method: "POST",
      body: {
        memberId: "finance-review",
        password: "peer-password-456",
      },
    });
    expect(financeSignIn.status).toBe(200);
    const financeCookie = financeSignIn.headers.get("set-cookie");
    expect(financeCookie).toBeTruthy();

    const financePreview = await request("/api/peer/deposits/preview", {
      method: "POST",
      headers: {
        Cookie: financeCookie ?? "",
      },
      body: {
        memberId: "admin-central",
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000000",
        minIntentAmount: "100000",
        maxIntentAmount: "500000",
        currency: "USD",
        conversionRate: "100",
      },
    });
    expect(financePreview.status).toBe(403);

    const previewResponse = await request("/api/peer/deposits/preview", {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        memberId: "admin-central",
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "1000000",
        minIntentAmount: "100000",
        maxIntentAmount: "500000",
        currency: "USD",
        conversionRate: "100",
      },
    });
    expect(previewResponse.status).toBe(200);
    const preview = await json<{
      payload: {
        token: string;
        amount: string;
        intentAmountRange: { min: string; max: string };
        processorNames: string[];
        depositData: Record<string, string>[];
        payeeData: Record<string, string>[];
        conversionRates: Array<Array<{ currency: string; conversionRate: string }>>;
      };
    }>(previewResponse);
    expect(preview.payload.processorNames).toContain("venmo");

    const createDeposit = await request("/api/peer/deposits", {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        memberId: "admin-central",
        division: "Houston HQ",
        preferredMethod: "venmo",
        fiatCurrency: "USD",
        walletAddress: "0x1111111111111111111111111111111111111111",
        live: true,
        riskLevel: "low",
        payload: preview.payload,
        protocol: {
          transactionHash: "0xpeercreatehash",
          onchainDepositId: "42",
          compositeDepositId: "8453_0xescrow_42",
          escrowAddress: "0x2222222222222222222222222222222222222222",
          payeeDetailsHashes: ["hash:venmo:peeradmin"],
        },
      },
    });
    expect(createDeposit.status).toBe(201);
    const created = await json<{
      deposit: {
        recordId: string;
        status: string;
        amountBaseUnits: string;
        events: Array<{ eventType: string; depositRecordId: string }>;
      };
    }>(createDeposit);
    expect(created.deposit.status).toBe("submitted");
    expect(created.deposit.events[0]?.eventType).toBe("created");
    expect(created.deposit.events[0]?.depositRecordId).toBe(created.deposit.recordId);

    const listWithCookie = await request("/api/peer/deposits?page=1&pageSize=10", {
      headers: {
        Cookie: adminCookie ?? "",
      },
    });
    expect(listWithCookie.status).toBe(200);
    const listed = await json<{
      deposits: Array<{ recordId: string; status: string }>;
      pagination: { totalItems: number; totalPages: number };
    }>(listWithCookie);
    expect(listed.pagination.totalItems).toBe(1);
    expect(listed.deposits[0]?.recordId).toBe(created.deposit.recordId);

    const addFunds = await request(`/api/peer/deposits/${created.deposit.recordId}/add-funds`, {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        amount: "250000",
        transactionHash: "0xaddfundshash",
      },
    });
    expect(addFunds.status).toBe(200);
    const funded = await json<{ deposit: { amountBaseUnits: string; status: string } }>(addFunds);
    expect(funded.deposit.amountBaseUnits).toBe("1250000");
    expect(funded.deposit.status).toBe("active");

    const pause = await request(`/api/peer/deposits/${created.deposit.recordId}/set-accepting`, {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        accepting: false,
        transactionHash: "0xpausehash",
      },
    });
    expect(pause.status).toBe(200);
    const paused = await json<{ deposit: { status: string } }>(pause);
    expect(paused.deposit.status).toBe("paused");

    const financeWithdraw = await request(`/api/peer/deposits/${created.deposit.recordId}/withdraw`, {
      method: "POST",
      headers: {
        Cookie: financeCookie ?? "",
      },
      body: {
        transactionHash: "0xfinancewithdraw",
      },
    });
    expect(financeWithdraw.status).toBe(403);

    const withdraw = await request(`/api/peer/deposits/${created.deposit.recordId}/withdraw`, {
      method: "POST",
      headers: {
        Cookie: adminCookie ?? "",
      },
      body: {
        transactionHash: "0xwithdrawhash",
      },
    });
    expect(withdraw.status).toBe(200);
    const withdrawn = await json<{ deposit: { status: string; events: Array<{ eventType: string }> } }>(withdraw);
    expect(withdrawn.deposit.status).toBe("withdrawn");
    expect(withdrawn.deposit.events[0]?.eventType).toBe("withdrawn");

    const getDeposit = await request(`/api/peer/deposits/${created.deposit.recordId}`, {
      headers: {
        Cookie: adminCookie ?? "",
      },
    });
    expect(getDeposit.status).toBe(200);
    const fetched = await json<{ deposit: { recordId: string; status: string } }>(getDeposit);
    expect(fetched.deposit.recordId).toBe(created.deposit.recordId);
    expect(fetched.deposit.status).toBe("withdrawn");

    rmSync(tempDir, { recursive: true, force: true });
  });
});
