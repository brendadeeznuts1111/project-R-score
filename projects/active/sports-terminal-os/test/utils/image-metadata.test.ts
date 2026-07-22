/**
 * Sports-terminal re-export smoke — SSOT tests live in monorepo
 * `tests/image-metadata.test.ts`.
 */
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from "bun:test";
import { BUN_IMAGE_METADATA_DOCS, extractImageEvidenceMeta } from "../../src/utils/image-metadata";
import { TEST_003, remediateScreenshotCapture } from "../../src/services/screenshot-remediation";

const PNG_10 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC",
  "base64",
);

describe("sports-terminal image-metadata re-export", () => {
  test("points at monorepo Bun.Image metadata docs", () => {
    expect(BUN_IMAGE_METADATA_DOCS).toContain("runtime/image#metadata");
  });

  test("TEST-003 remediation available via local barrel", async () => {
    const meta = await extractImageEvidenceMeta(PNG_10);
    expect(meta.format).toBe("png");
    const result = await remediateScreenshotCapture(PNG_10);
    expect(result.code).toBe(TEST_003);
    expect(result.status).toBe("pass");
  });
});
