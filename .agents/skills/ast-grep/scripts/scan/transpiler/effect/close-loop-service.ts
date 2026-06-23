import { Context, Effect, Layer } from "effect";
import {
  runCloseLoop,
  type CloseLoopOptions,
  type CloseLoopStep,
  type CloseLoopSummary,
} from "../close-loop.ts";
import {
  CloseLoopRunnerFailed,
  CloseLoopStepFailed,
  type CloseLoopError,
} from "./errors.ts";

export interface CloseLoopEngineService {
  readonly run: (
    opts: CloseLoopOptions,
  ) => Effect.Effect<CloseLoopSummary, CloseLoopError>;
}

export class CloseLoopEngine extends Context.Tag("CloseLoopEngine")<
  CloseLoopEngine,
  CloseLoopEngineService
>() {}

function firstFailedStep(steps: CloseLoopStep[]): CloseLoopStep | undefined {
  return steps.find((s) => !s.ok);
}

const CloseLoopEngineLive = Layer.succeed(
  CloseLoopEngine,
  {
    run: (opts) => Effect.tryPromise({
      try: () => runCloseLoop(opts),
      catch: (e) => new CloseLoopRunnerFailed({
        cause: e instanceof Error ? e.message : String(e),
      }),
    }).pipe(
      Effect.flatMap((summary) => {
        if (summary.ok) return Effect.succeed(summary);
        const failed = firstFailedStep(summary.steps);
        return Effect.fail(new CloseLoopStepFailed({
          step: failed?.id ?? "bench-snapshot",
          detail: failed?.detail,
          elapsedMs: failed?.elapsedMs,
        }));
      }),
    ),
  },
);

export type CloseLoopTestSummary = CloseLoopSummary | CloseLoopError;

export function CloseLoopEngineTest(
  result: CloseLoopTestSummary,
): Layer.Layer<CloseLoopEngine> {
  return Layer.succeed(
    CloseLoopEngine,
    {
      run: (opts) => {
        if (typeof result === "object" && result !== null && "_tag" in result) {
          return Effect.fail(result as CloseLoopError);
        }
        const summary = result as CloseLoopSummary;
        return Effect.sync(() => {
          for (const step of summary.steps) opts.onStep?.(step);
        }).pipe(
          Effect.flatMap(() => {
            if (!summary.ok) {
              const failed = firstFailedStep(summary.steps);
              return Effect.fail(new CloseLoopStepFailed({
                step: failed?.id ?? "bench-snapshot",
                detail: failed?.detail,
              }));
            }
            return Effect.succeed(summary);
          }),
        );
      },
    },
  );
}

export const CloseLoopLive = CloseLoopEngineLive;