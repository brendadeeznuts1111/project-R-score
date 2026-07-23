// @see https://bun.com/docs/test/index#run-tests
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { OpsTelegramBot } from "../lib/telegram/ops-bot.ts";
import { DODVerifier } from "../lib/dod/verifier.ts";
import { initSchema } from "../lib/operations/schema.ts";

const SCRATCH = ".tmp/ops-bot-verifydod-test";
const DB = `${SCRATCH}/operations.db`;

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let sent: string[];
let origFetch: typeof globalThis.fetch;

function update(text: string, fromId = "4242"): Record<string, unknown> {
  return {
    message: { text, chat: { id: 7 }, from: { id: fromId } },
  };
}

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
  sent = [];
  origFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)).text);
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
});

afterEach(async () => {
  globalThis.fetch = origFetch;
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

/** Seed: registered agent (telegram 4242) + one DOD submission for them. */
async function seed(): Promise<string> {
  const verifier = new DODVerifier(DB, {
    evidenceRoot: `${SCRATCH}/evidence`,
    registryPath: `${SCRATCH}/registry.json`,
  });
  const db = new (await import("bun:sqlite")).Database(DB);
  initSchema(db);
  db.run(
    "INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at) VALUES ('agent-1', 'agent', 'Agent One', '4242', 1, datetime('now'))",
  );
  db.close();
  const png2x2 = await new Bun.Image(new Uint8Array(PNG_1PX)).resize(2, 2).png().bytes();
  const ver = await verifier.process({
    id: "dod-verify-1",
    agentId: "agent-1",
    type: "balance",
    rawImage: png2x2,
    submittedAt: new Date().toISOString(),
  });
  verifier.close();
  return ver.dodId;
}

describe("ops-bot /verifydod", () => {
  test("returns the receipt for the agent's own submission", async () => {
    const dodId = await seed();
    const bot = new OpsTelegramBot({ token: "t", dbPath: DB });
    await bot.handleUpdate(update(`/verifydod ${dodId}`));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("DOD Receipt");
    expect(sent[0]).toContain("Status:");
    expect(sent[0]).toContain("Visual hash:");
    expect(sent[0]).toContain("Signature:");
  });

  test("rejects other agents' submissions", async () => {
    const dodId = await seed();
    const db = new (await import("bun:sqlite")).Database(DB);
    db.run(
      "INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at) VALUES ('agent-2', 'agent', 'Agent Two', '9999', 1, datetime('now'))",
    );
    db.close();
    const bot = new OpsTelegramBot({ token: "t", dbPath: DB });
    await bot.handleUpdate(update(`/verifydod ${dodId}`, "9999"));
    expect(sent[0]).toContain("DOD not found");
  });

  test("usage hint when no id, not-registered gate", async () => {
    await seed();
    const bot = new OpsTelegramBot({ token: "t", dbPath: DB });
    await bot.handleUpdate(update("/verifydod"));
    expect(sent[0]).toContain("Usage:");
    sent = [];
    await bot.handleUpdate(update("/verifydod anything", "1111")); // unregistered telegram id
    expect(sent[0]).toContain("Not registered");
  });
});
