import { describe, expect, test } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import {
  closeLoopProgram,
  closeLoopStepsAsStream,
  collectCloseLoopFromStream,
} from "../../scripts/scan/transpiler/effect/close-loop-program.ts";
import {
  CloseLoopEngineTest,
} from "../../scripts/scan/transpiler/effect/close-loop-service.ts";
import { CloseLoopStepFailed } from "../../scripts/scan/transpiler/effect/errors.ts";
import { decodeCloseLoopSummary } from "../../scripts/scan/transpiler/effect/schema.ts";
import type { CloseLoopSummary } from "../../scripts/scan/transpiler/close-loop.ts";

const okSummary: CloseLoopSummary = {
  schemaVersion: 1,
  tool: "skill-loop-close-loop",
  domain: "sports-terminal-os",
  scanPath: "dist/frontend",
  steps: [
    { id: "ground-truth", ok: true, elapsedMs: 10, detail: "4/4 checks" },
    { id: "bench-snapshot", ok: true, elapsedMs: 100, detail: "pass" },
    { id: "baseline-diff", ok: true, elapsedMs: 1, detail: "no drift" },
  ],
  ok: true,
  rating: 95,
  grade: "A",
};

describe("close-loop Effect layer", () => {
  test("closeLoopProgram succeeds with Test layer", async () => {
    const summary = await Effect.runPromise(
      closeLoopProgram({ skillRoot: ".", repo: "." }).pipe(
        Effect.provide(CloseLoopEngineTest(okSummary)),
      ),
    );
    expect(summary.rating).toBe(95);
    expect(decodeCloseLoopSummary(summary).ok).toBe(true);
  });

  test("closeLoopProgram fails with CloseLoopStepFailed", async () => {
    const fail = new CloseLoopStepFailed({
      step: "ground-truth",
      detail: "sports-terminal-snapshot",
    });
    const result = await Effect.runPromiseExit(
      closeLoopProgram({ skillRoot: ".", repo: "." }).pipe(
        Effect.provide(CloseLoopEngineTest(fail)),
      ),
    );
    expect(result._tag).toBe("Failure");
  });

  test("closeLoopStepsAsStream emits pipeline steps", async () => {
    const chunk = await Effect.runPromise(
      closeLoopStepsAsStream({ skillRoot: ".", repo: "." }).pipe(
        Stream.runCollect,
        Effect.provide(CloseLoopEngineTest(okSummary)),
      ),
    );
    const steps = Chunk.toReadonlyArray(chunk);
    expect(steps.length).toBe(3);
    expect(steps[0]?.id).toBe("ground-truth");
  });

  test("collectCloseLoopFromStream returns steps and summary", async () => {
    const collected = await Effect.runPromise(
      collectCloseLoopFromStream({ skillRoot: ".", repo: "." }).pipe(
        Effect.provide(CloseLoopEngineTest(okSummary)),
      ),
    );
    expect(collected.summary.grade).toBe("A");
    expect(collected.steps.length).toBe(3);
  });
});