// @see https://bun.com/docs/test/index#run-tests
/**
 * End-to-end DOD lifecycle: agent submission → processing → ops review queue
 * → approve via review API → verified state + receipt.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { DODVerifier } from "../lib/dod/verifier.ts";

const SCRATCH = ".tmp/dod-lifecycle-test";
const DB = `${SCRATCH}/operations.db`;

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let verifier: DODVerifier;
let onRequest: (ctx: { request: Request }) => Promise<Response>;

function authed(path: string, init: RequestInit = {}): Promise<Response> {
  return onRequest({
    request: new Request(`http://localhost${path}`, {
      ...init,
      headers: { authorization: "Bearer lifecycle-token", "content-type": "application/json" },
    }),
  });
}

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
  Bun.env.DOD_DB_PATH = DB;
  Bun.env.DOD_REVIEW_TOKEN = "lifecycle-token";
  ({ onRequest } = await import("../functions-bun-only/api/dod/index.ts"));
  verifier = new DODVerifier(DB, {
    evidenceRoot: `${SCRATCH}/evidence`,
    registryPath: `${SCRATCH}/registry.json`,
  });
});

afterEach(async () => {
  verifier.close();
  delete Bun.env.DOD_DB_PATH;
  delete Bun.env.DOD_REVIEW_TOKEN;
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe("dod lifecycle — end to end", () => {
  test("submission → pending queue → approve → verified + receipt", async () => {
    // 1. Agent submits a balance proof (Telegram ingest path = verifier.process)
    const png2x2 = await new Bun.Image(new Uint8Array(PNG_1PX)).resize(2, 2).png().bytes();
    const submission = await verifier.process({
      id: "dod-lifecycle-1",
      agentId: "agent-lc",
      type: "balance",
      rawImage: png2x2,
      submittedAt: new Date().toISOString(),
    });
    expect(submission.status).toBe("pending");

    // 2. Ops review queue shows it as pending (via the review API, authed)
    const list = await authed("/api/dod?status=pending");
    expect(list.status).toBe(200);
    const pending = (await list.json()) as { id: string; status: string }[];
    expect(pending.some(r => r.id === "dod-lifecycle-1")).toBe(true);

    // 3. Ops approves via the review API
    const approve = await authed("/api/dod/approve", {
      method: "POST",
      body: JSON.stringify({ id: "dod-lifecycle-1" }),
    });
    expect(approve.status).toBe(200);
    expect((await approve.json()).status).toBe("verified");

    // 4. DB reflects the review (status + reviewer + timestamp)
    const db = new Database(DB);
    const row = db
      .query("SELECT status, reviewed_by, reviewed_at FROM dod_submissions WHERE id = 'dod-lifecycle-1'")
      .get() as { status: string; reviewed_by: string; reviewed_at: string };
    db.close();
    expect(row.status).toBe("verified");
    expect(row.reviewed_by).toBe("operations");
    expect(row.reviewed_at).not.toBeNull();

    // 5. Agent receipt reflects the final state
    const receipt = verifier.receipt("dod-lifecycle-1") as { status: string };
    expect(receipt.status).toBe("verified");

    // 6. And the queue no longer lists it as pending
    const after = (await (await authed("/api/dod?status=pending")).json()) as { id: string }[];
    expect(after.some(r => r.id === "dod-lifecycle-1")).toBe(false);
  });

  test("submission → reject with reason → rejected state preserved", async () => {
    const png2x2 = await new Bun.Image(new Uint8Array(PNG_1PX)).resize(2, 2).png().bytes();
    await verifier.process({
      id: "dod-lifecycle-2",
      agentId: "agent-lc",
      type: "balance",
      rawImage: png2x2,
      submittedAt: new Date().toISOString(),
    });

    const reject = await authed("/api/dod/reject", {
      method: "POST",
      body: JSON.stringify({ id: "dod-lifecycle-2", reason: "blurry screenshot" }),
    });
    expect(reject.status).toBe(200);

    const receipt = verifier.receipt("dod-lifecycle-2") as { status: string };
    expect(receipt.status).toBe("rejected");
    const db = new Database(DB);
    const row = db
      .query("SELECT rejection_reason FROM dod_submissions WHERE id = 'dod-lifecycle-2'")
      .get() as { rejection_reason: string };
    db.close();
    expect(row.rejection_reason).toBe("blurry screenshot");
  });
});
