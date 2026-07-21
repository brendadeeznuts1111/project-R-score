// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn

import { getCliPath, getPat } from './env.ts';
import { getLogger } from './logger.ts';

export class ProtonPassCliError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function runCli(args: string[], input?: string): Promise<string> {
  const pat = getPat();
  const cmd = [getCliPath(), ...args];
  const logger = getLogger();

  logger.debug('spawning pass-cli', { cmd });

  const proc = Bun.spawn({
    cmd,
    env: {
      ...Bun.env,
      PROTON_PASS_PERSONAL_ACCESS_TOKEN: pat,
    },
    stdin: input ? 'pipe' : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (input && proc.stdin) {
    proc.stdin.write(input);
    proc.stdin.end();
  }

  const exit = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (exit !== 0) {
    logger.debug('pass-cli failed', { exit, stderr, stdout });
    throw new ProtonPassCliError(
      exit,
      `pass-cli failed (code ${exit}): ${stderr || stdout}`.trim(),
    );
  }

  logger.debug('pass-cli succeeded', { stdout: stdout.slice(0, 200) });
  return stdout.trim();
}

/** Run a command and parse the JSON output. */
export async function runJson<T = unknown>(args: string[], input?: string): Promise<T> {
  const jsonArgs = args.includes('--format') ? args : [...args, '--format', 'json'];
  const stdout = await runCli(jsonArgs, input);
  try {
    return JSON.parse(stdout) as T;
  } catch (cause) {
    throw new Error(`pass-cli returned invalid JSON: ${stdout.slice(0, 200)}`, { cause });
  }
}

/** Run a command and return the raw text output. */
export function runRaw(args: string[], input?: string): Promise<string> {
  return runCli(args, input);
}
