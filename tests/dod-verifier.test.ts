// @see https://bun.com/docs/test/index#run-tests
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DODVerifier, validateImage, type DODSubmission } from "../lib/dod/verifier.ts";
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

function submission(overrides: Partial<DODSubmission> = {}): DODSubmission {
  counter++;
  return {
    id: `dod-test-${counter}`,
    agentId: "agent-test",
    type: "balance",
    rawImage: new Uint8Array(PNG_1PX),
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
  verifier = new DODVerifier(`${SCRATCH}/ops.db`, {
    evidenceRoot: `${SCRATCH}/evidence`,
    registryPath: `${SCRATCH}/registry.json`,
  });
});

afterEach(async () => {
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe("dod-verifier image validation", () => {
  test("accepts PNG magic bytes", () => {
    expect(validateImage(new Uint8Array(PNG_1PX))).toBe(true);
  });

  test("accepts JPEG magic bytes", () => {
    expect(validateImage(JPEG_MAGIC)).toBe(true);
  });

  test("rejects non-image payloads", () => {
    expect(validateImage(NOT_IMAGE)).toBe(false);
    expect(validateImage(new Uint8Array(4))).toBe(false);
  });

  test("process() throws on invalid image before any storage", async () => {
    await expect(verifier.process(submission({ rawImage: NOT_IMAGE }))).rejects.toThrow(
      /Invalid image format/,
    );
    expect(await Bun.file(`${SCRATCH}/registry.json`).exists()).toBe(false);
  });
});

describe("dod-verifier rate limit", () => {
  test("trips at the hourly threshold", async () => {
    const limit = Number(Bun.env.DOD_RATE_LIMIT_PER_HOUR ?? 10);
    for (let i = 0; i < limit; i++) {
      await verifier.process(submission());
    }
    await expect(verifier.process(submission())).rejects.toThrow(/Rate limited/);
  }, 30000);
});

describe("dod-verifier storage path", () => {
  test("path is randomized, contains no agentId, deterministic per id", async () => {
    const sub = submission({ agentId: "agent-secret-name" });
    const ver = await verifier.process(sub);
    expect(ver.s3Path).not.toContain("agent-secret-name");
    expect(ver.s3Path).toMatch(/^dod\/[a-z0-9]+\/dod-test-\d+\.webp$/);
    expect(await Bun.file(`${SCRATCH}/evidence/${ver.s3Path}`).exists()).toBe(true);
  });
});

describe("dod-verifier perceptual hash", () => {
  test("matches evidence.ts averageHash (pixel-based)", async () => {
    const ver = await verifier.process(submission());
    const expected = await averageHash(new Uint8Array(PNG_1PX));
    expect(ver.visualHash).toBe(expected);
    expect(ver.visualHash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("dod-verifier OCR wiring", () => {
  test("non-document types skip OCR", async () => {
    const ver = await verifier.process(submission({ type: "location" }));
    expect(ver.extractedText).toBeUndefined();
  });
});
