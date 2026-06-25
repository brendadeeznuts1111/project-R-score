import { Effect, Exit } from "effect";
import type { CloseLoopError } from "./errors.ts";
import { closeLoopErrorMessage } from "./errors.ts";

export type AstGrepCliError = CloseLoopError | { _tag: "Unknown"; message: string };

export async function runCliExit<A>(
  program: Effect.Effect<A, AstGrepCliError>,
  opts?: { quiet?: boolean; onError?: (message: string) => void },
): Promise<number> {
  const emit = (msg: string) => {
    if (opts?.quiet) return;
    if (opts?.onError) opts.onError(msg);
    else process.stderr.write(`${msg}\n`);
  };

  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) return 0;

  const failure = exit.cause;
  if (failure._tag === "Fail") {
    const err = failure.error as AstGrepCliError;
    if (typeof err === "object" && err !== null && "_tag" in err) {
      if (err._tag === "Unknown") emit(err.message);
      else emit(closeLoopErrorMessage(err as CloseLoopError));
    } else {
      emit(err instanceof Error ? err.message : String(err));
    }
  } else {
    emit("Unexpected close-loop Effect failure");
  }
  return 1;
}