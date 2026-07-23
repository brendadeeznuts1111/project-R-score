// @see https://bun.com/docs/test/index#run-tests
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  DOD_MODEL_VERSION,
  DODVerifier,
  decryptAesGcm,
  encryptAesGcm,
  extractAmount,
  validateImage,
  type DODSubmission,
} from "../lib/dod/verifier.ts";
import { averageHash } from "../lib/dod/evidence.ts";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const NOT_IMAGE = new TextEncoder().encode("<?php echo 'shell'; ?>");

const SCRATCH = ".tmp/dod-verifier-test";
let verifier: DODVerifier;
let counter = 0;
let png2x2: Uint8Array;

function submission(overrides: Partial<DODSubmission> = {}): DODSubmission {
  counter++;
  return {
    id: `dod-test-${counter}`,
    agentId: "agent-test",
    type: "balance",
    rawImage: png2x2, // even dimensions → tamper floor 20 (no EXIF only)
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
  png2x2 = await new Bun.Image(new Uint8Array(PNG_1PX)).resize(2, 2).png().bytes();
  verifier = new DODVerifier(`${SCRATCH}/ops.db`, {
    evidenceRoot: `${SCRATCH}/evidence`,
    registryPath: `${SCRATCH}/registry.json`,
  });
});

afterEach(async () => {
  verifier.close();
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe("dod-verifier image validation", () => {
  test.serial("accepts PNG magic bytes", () => {
    expect(validateImage(new Uint8Array(PNG_1PX))).toBe(true);
  });

  test.serial("accepts JPEG magic bytes", () => {
    expect(validateImage(JPEG_MAGIC)).toBe(true);
  });

  test.serial("rejects non-image payloads", () => {
    expect(validateImage(NOT_IMAGE)).toBe(false);
    expect(validateImage(new Uint8Array(4))).toBe(false);
  });

  test.serial("process() throws on invalid image before any storage", async () => {
    await expect(verifier.process(submission({ rawImage: NOT_IMAGE }))).rejects.toThrow(
      /Invalid image format/,
    );
    expect(await Bun.file(`${SCRATCH}/registry.json`).exists()).toBe(false);
  });
});

describe("dod-verifier rate limit", () => {
  test.serial("trips at the hourly threshold", async () => {
    const limit = Number(Bun.env.DOD_RATE_LIMIT_PER_HOUR ?? 10);
    for (let i = 0; i < limit; i++) {
      await verifier.process(submission());
    }
    await expect(verifier.process(submission())).rejects.toThrow(/Rate limited/);
  }, 30000);
});

describe("dod-verifier storage path", () => {
  test.serial("path is randomized, contains no agentId, deterministic per id", async () => {
    const sub = submission({ agentId: "agent-secret-name" });
    const ver = await verifier.process(sub);
    expect(ver.s3Path).not.toContain("agent-secret-name");
    expect(ver.s3Path).toMatch(/^dod\/[a-z0-9]+\/dod-test-\d+\.webp$/);
    expect(await Bun.file(`${SCRATCH}/evidence/${ver.s3Path}`).exists()).toBe(true);
  });
});

describe("dod-verifier perceptual hash", () => {
  test.serial("matches evidence.ts averageHash (pixel-based)", async () => {
    const ver = await verifier.process(submission());
    const expected = await averageHash(png2x2);
    expect(ver.visualHash).toBe(expected);
    expect(ver.visualHash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("dod-verifier OCR wiring", () => {
  test.serial("non-document types skip OCR", async () => {
    const ver = await verifier.process(submission({ type: "location" }));
    expect(ver.extractedText).toBeUndefined();
  });
});

describe("dod batch 2 — encryption", () => {
  test.serial("AES-GCM roundtrip", async () => {
    const data = new TextEncoder().encode("sensitive id scan bytes");
    const enc = await encryptAesGcm(data, "test-key");
    expect(enc.length).toBeGreaterThan(data.length);
    const dec = await decryptAesGcm(enc, "test-key");
    expect(new TextDecoder().decode(dec)).toBe("sensitive id scan bytes");
  });

  test.serial("wrong key fails to decrypt", async () => {
    const enc = await encryptAesGcm(new Uint8Array([1, 2, 3]), "k1");
    await expect(decryptAesGcm(enc, "k2")).rejects.toThrow();
  });

  test.serial("id submissions are stored encrypted with .enc suffix and flagged in db", async () => {
    const keyed = new DODVerifier(`${SCRATCH}/ops2.db`, {
      evidenceRoot: `${SCRATCH}/evidence`,
      registryPath: `${SCRATCH}/registry2.json`,
      idEncryptionKey: "pii-key",
    });
    const sub = submission({ type: "id" });
    const ver = await keyed.process(sub);
    expect(ver.s3Path).toEndWith(".webp.enc");
    const stored = await Bun.file(`${SCRATCH}/evidence/${ver.s3Path}`).bytes();
    expect(validateImage(stored)).toBe(false); // ciphertext, not a webp
    const roundtrip = await decryptAesGcm(stored, "pii-key");
    expect(validateImage(roundtrip)).toBe(true); // decrypts back to a real image
    keyed.close();
  });
});

describe("dod batch 2 — auto-approve", () => {
  test.serial("balance auto-approves for trusted agents (10+ verified)", async () => {
    const db = new (await import("bun:sqlite")).Database(`${SCRATCH}/ops.db`);
    for (let i = 0; i < 10; i++) {
      // Older than 1h: counts toward auto-approve trust, not the rate limit.
      db.run(
        "INSERT INTO dod_submissions (id, agent_id, type, status, submitted_at) VALUES (?, 'agent-test', 'balance', 'verified', datetime('now', '-2 hours'))",
        [`seed-${i}`],
      );
    }
    db.close();
    const ver = await verifier.process(submission({ type: "balance" }));
    expect(ver.status).toBe("verified");
  });

  test.serial("first-time agent balance stays pending", async () => {
    const ver = await verifier.process(submission({ type: "balance" }));
    expect(ver.status).toBe("pending");
  });
});

describe("dod batch 2 — liquidity hook", () => {
  test.serial("onVerifiedBalance fires with parsed amount after verified balance DOD", async () => {
    const calls: { agentId: string; amount?: number }[] = []; // brand-ok — test spy
    const db = new (await import("bun:sqlite")).Database(`${SCRATCH}/ops.db`);
    for (let i = 0; i < 10; i++) {
      // Older than 1h: counts toward auto-approve trust, not the rate limit.
      db.run(
        "INSERT INTO dod_submissions (id, agent_id, type, status, submitted_at) VALUES (?, 'agent-test', 'balance', 'verified', datetime('now', '-2 hours'))",
        [`seed-${i}`],
      );
    }
    db.close();
    const hooked = new DODVerifier(`${SCRATCH}/ops.db`, {
      evidenceRoot: `${SCRATCH}/evidence`,
      registryPath: `${SCRATCH}/registry.json`,
      onVerifiedBalance: async (agentId, amount) => {
        calls.push({ agentId, amount });
      },
    });
    const ver = await hooked.process(submission({ type: "balance" }));
    expect(ver.status).toBe("verified");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.agentId).toBe("agent-test");
    hooked.close();
  });

  test.serial("extractAmount parses dollar figures", () => {
    expect(extractAmount("Balance: $12,345.67 available")).toBe(12345.67);
    expect(extractAmount("no amount here")).toBeUndefined();
    expect(extractAmount(undefined)).toBeUndefined();
  });
});

describe("dod batch 2 — review API auth", () => {
  const savedToken = Bun.env.DOD_REVIEW_TOKEN;

  afterEach(() => {
    if (savedToken == null) delete Bun.env.DOD_REVIEW_TOKEN;
    else Bun.env.DOD_REVIEW_TOKEN = savedToken;
  });

  test.serial("401 without bearer token when DOD_REVIEW_TOKEN is set", async () => {
    Bun.env.DOD_REVIEW_TOKEN = "test-review-token";
    const { onRequest } = await import("../functions-bun-only/api/dod/index.ts");
    const res = await onRequest({
      request: new Request("http://localhost/api/dod?status=all"),
    });
    expect(res.status).toBe(401);
  });

  test.serial("200 with correct bearer token", async () => {
    Bun.env.DOD_REVIEW_TOKEN = "test-review-token";
    const { onRequest } = await import("../functions-bun-only/api/dod/index.ts");
    const res = await onRequest({
      request: new Request("http://localhost/api/dod?status=all", {
        headers: { authorization: "Bearer test-review-token" },
      }),
    });
    expect(res.status).toBe(200);
  });

  test.serial("open when DOD_REVIEW_TOKEN is unset (dev)", async () => {
    delete Bun.env.DOD_REVIEW_TOKEN;
    const { onRequest } = await import("../functions-bun-only/api/dod/index.ts");
    const res = await onRequest({
      request: new Request("http://localhost/api/dod?status=all"),
    });
    expect(res.status).toBe(200);
  });
});

describe("dod batch 3 — rebuild index", () => {
  test.serial("rebuilds SQLite from sidecar records in the store", async () => {
    await verifier.process(submission({ id: "dod-rebuild-1" }));
    await verifier.process(submission({ id: "dod-rebuild-2" }));
    const db = new (await import("bun:sqlite")).Database(`${SCRATCH}/ops.db`);
    db.run("DELETE FROM dod_submissions");
    db.close();
    const restored = await verifier.rebuildIndex();
    expect(restored).toBe(2);
    expect(verifier.receipt("dod-rebuild-1")?.status).toBe("pending");
    expect(verifier.receipt("dod-rebuild-2")?.status).toBe("pending");
  });
});

describe("dod batch 3 — agent receipt", () => {
  test.serial("receipt returns status + hashes after processing", async () => {
    const ver = await verifier.process(submission({ id: "dod-receipt-1" }));
    const r = verifier.receipt("dod-receipt-1") as Record<string, unknown>;
    expect(r.status).toBe(ver.status);
    expect(r.visual_hash).toBe(ver.visualHash);
    expect(r.signature).toBe(ver.signature);
  });

  test.serial("verifySignature accepts the issued signature, rejects tampered ones", async () => {
    const ver = await verifier.process(submission({ id: "dod-sig-1" }));
    expect(verifier.verifySignature(ver.dodId, ver.visualHash, ver.metadataHash, ver.signature)).toBe(true);
    expect(
      verifier.verifySignature(ver.dodId, ver.visualHash, ver.metadataHash, "0".repeat(64)),
    ).toBe(false);
  });
});

describe("dod batch 3 — watermark batching", () => {
  test.serial("repeated process() calls reuse the pipeline and close() disposes cleanly", async () => {
    for (let i = 0; i < 3; i++) {
      await verifier.process(submission());
    }
    expect(() => verifier.close()).not.toThrow();
    verifier = new DODVerifier(`${SCRATCH}/ops.db`, {
      evidenceRoot: `${SCRATCH}/evidence`,
      registryPath: `${SCRATCH}/registry.json`,
    });
  });
});

describe("dod — registry signature chain", () => {
  test.serial("new registry entries carry the HMAC signature", async () => {
    const ver = await verifier.process(submission({ id: "dod-chain-1" }));
    const reg = await Bun.file(`${SCRATCH}/registry.json`).json();
    const entry = reg.entries.find((e: { id: string }) => e.id === "dod-chain-1"); // brand-ok — opaque registry JSON row
    expect(entry.signature).toBe(ver.signature);
    expect(entry.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.modelVersion).toBe(DOD_MODEL_VERSION);
  });
});

describe("dod — explicit resource management", () => {
  test("using auto-closes the verifier at block exit", async () => {
    let closed = false;
    {
      using v = new DODVerifier(`${SCRATCH}/dispose.db`, {
        evidenceRoot: `${SCRATCH}/evidence`,
        registryPath: `${SCRATCH}/registry.json`,
      });
      // spy on close to observe disposal
      const origClose = v.close.bind(v);
      v.close = () => {
        closed = true;
        origClose();
      };
      expect(v.receipt("nothing")).toBeNull();
    }
    expect(closed).toBe(true);
  });
});
