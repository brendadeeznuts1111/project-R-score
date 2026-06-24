/**
 * Effect boundary wrappers for Bun-native I/O.
 *
 * Converts Bun Promise-based operations into typed Effects with tagged errors.
 * Keep the imperative shell small: parse args, build an Effect program, run it.
 */

import { Data, Effect } from "effect";

export class FileReadError extends Data.TaggedError("FileReadError")<{
  path: string;
  error: unknown;
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  path: string;
  error: unknown;
}> {}

export class SpawnError extends Data.TaggedError("SpawnError")<{
  cmd: readonly string[];
  code: number | null;
  stderr: string;
}> {}

/**
 * Read a file as text, wrapped in Effect.
 * Exact signature: (path: string) => Effect.Effect<string, FileReadError>
 */
export const readTextEffect = (path: string): Effect.Effect<string, FileReadError> =>
  Effect.tryPromise({
    try: () => Bun.file(path).text(),
    catch: (error) => new FileReadError({ path, error }),
  });

/**
 * Parse JSON from a file, wrapped in Effect.
 * Exact signature: <T>(path: string) => Effect.Effect<T, FileReadError>
 */
export const readJsonEffect = <T>(path: string): Effect.Effect<T, FileReadError> =>
  Effect.tryPromise({
    try: async () => (await Bun.file(path).json()) as T,
    catch: (error) => new FileReadError({ path, error }),
  });

/**
 * Write content to a file, wrapped in Effect.
 * Exact signature: (path: string, content: string | Blob | Bun.ArrayBufferView | ArrayBufferLike) => Effect.Effect<number, FileWriteError>
 */
export const writeTextEffect = (
  path: string,
  content: string
): Effect.Effect<number, FileWriteError> =>
  Effect.tryPromise({
    try: () => Bun.write(path, content),
    catch: (error) => new FileWriteError({ path, error }),
  });

/**
 * Spawn a subprocess, wrapped in Effect.
 * Exact signature: (cmd: string[], options?: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit"; env?: Record<string, string> }) => Effect.Effect<{ stdout: string; code: number }, SpawnError>
 */
export const spawnEffect = (
  cmd: string[],
  options: {
    stdout?: "pipe" | "inherit";
    stderr?: "pipe" | "inherit";
    env?: Record<string, string>;
  } = {}
): Effect.Effect<{ stdout: string; code: number }, SpawnError> =>
  Effect.tryPromise({
    try: async () => {
      const stdoutMode = options.stdout ?? "pipe";
      const stderrMode = options.stderr ?? "pipe";
      const proc = Bun.spawn({
        cmd,
        stdout: stdoutMode,
        stderr: stderrMode,
        env: options.env ? { ...Bun.env, ...options.env } : Bun.env,
      });
      const stdout =
        stdoutMode === "pipe" && proc.stdout
          ? await Bun.readableStreamToText(proc.stdout)
          : "";
      const stderr =
        stderrMode === "pipe" && proc.stderr
          ? await Bun.readableStreamToText(proc.stderr)
          : "";
      const code = await proc.exited;
      if (code !== 0) {
        throw new SpawnError({ cmd, code, stderr });
      }
      return { stdout, code };
    },
    catch: (error) =>
      error instanceof SpawnError
        ? error
        : new SpawnError({ cmd, code: null, stderr: String(error) }),
  });
