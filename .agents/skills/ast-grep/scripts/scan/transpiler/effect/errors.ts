import { Data } from "effect";
import type { CloseLoopStepId } from "../close-loop.ts";

export class CloseLoopStepFailed extends Data.TaggedError("CloseLoopStepFailed")<{
  step: CloseLoopStepId;
  detail?: string;
  elapsedMs?: number;
}> {}

export class CloseLoopRatingFailed extends Data.TaggedError("CloseLoopRatingFailed")<{
  rating: number;
  minRating: number;
  grade?: string;
}> {}

export class CloseLoopRunnerFailed extends Data.TaggedError("CloseLoopRunnerFailed")<{
  cause: string;
}> {}

export type CloseLoopError =
  | CloseLoopStepFailed
  | CloseLoopRatingFailed
  | CloseLoopRunnerFailed;

export function closeLoopErrorMessage(error: CloseLoopError): string {
  switch (error._tag) {
    case "CloseLoopStepFailed":
      return `close-loop step ${error.step} failed${error.detail ? `: ${error.detail}` : ""}`;
    case "CloseLoopRatingFailed":
      return `close-loop rating ${error.rating} below min ${error.minRating} (${error.grade ?? "?"})`;
    case "CloseLoopRunnerFailed":
      return `close-loop runner failed: ${error.cause}`;
  }
}