import { Effect, Stream } from "effect";
import type { CloseLoopOptions, CloseLoopStep, CloseLoopSummary } from "../close-loop.ts";
import { CloseLoopRatingFailed, type CloseLoopError } from "./errors.ts";
import { CloseLoopEngine } from "./close-loop-service.ts";

export type CloseLoopGateOptions = {
  minRating?: number;
  failOnRating?: boolean;
};

function applyRatingGate(
  summary: CloseLoopSummary,
  gates: CloseLoopGateOptions,
): Effect.Effect<void, CloseLoopRatingFailed> {
  const minRating = gates.minRating ?? 70;
  if (gates.failOnRating && (summary.rating ?? 0) < minRating) {
    return Effect.fail(new CloseLoopRatingFailed({
      rating: summary.rating ?? 0,
      minRating,
      grade: summary.grade,
    }));
  }
  return Effect.void;
}

export function closeLoopProgram(
  opts: CloseLoopOptions,
  gates: CloseLoopGateOptions = {},
): Effect.Effect<CloseLoopSummary, CloseLoopError, CloseLoopEngine> {
  return Effect.gen(function* () {
    const engine = yield* CloseLoopEngine;
    const summary = yield* engine.run(opts);
    yield* applyRatingGate(summary, gates);
    return summary;
  });
}

export function collectCloseLoopFromStream(
  opts: CloseLoopOptions,
  gates: CloseLoopGateOptions = {},
): Effect.Effect<{ steps: CloseLoopStep[]; summary: CloseLoopSummary }, CloseLoopError, CloseLoopEngine> {
  return Effect.gen(function* () {
    const engine = yield* CloseLoopEngine;
    const steps: CloseLoopStep[] = [];
    const summary = yield* engine.run({
      ...opts,
      onStep: (step) => { steps.push(step); },
    });
    yield* applyRatingGate(summary, gates);
    return { steps, summary };
  });
}

/** Materialize pipeline steps as a Stream after the full close-loop run completes. */
export function closeLoopStepsAsStream(
  opts: CloseLoopOptions,
  gates: CloseLoopGateOptions = {},
): Stream.Stream<CloseLoopStep, CloseLoopError, CloseLoopEngine> {
  return Stream.unwrap(
    collectCloseLoopFromStream(opts, gates).pipe(
      Effect.map(({ steps }) => Stream.fromIterable(steps)),
    ),
  );
}