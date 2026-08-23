// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/utils#bun-inspect — prefer statusLine over raw console dumps
/**
 * Shared pre-commit / day-loop gate failure UX.
 *
 * Shape: gate · why · fix command — rendered via Bun.markdown.ansi + statusLine.
 * Policy: lib/console-depth.md · staged-only hooks (pre-commit-harness).
 */
import { statusLine, tones } from '../console/index.ts';

export type GateFailureInput = {
  /** Short human title (e.g. "Console format"). */
  title: string;
  /** Stable gate id (e.g. console-format-staged). */
  gate: string;
  /** One-line why. */
  why: string;
  /** Exact fix / re-run command. */
  fix: string;
  /** Optional extra detail (stack / file list). */
  detail?: string;
};

/** Markdown body for tests and non-TTY consumers. */
export function formatGateFailureMarkdown(input: GateFailureInput): string {
  const lines = [
    `# Gate failed: ${input.title}`,
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| gate | \`${input.gate}\` |`,
    `| why | ${input.why} |`,
    `| fix | \`${input.fix}\` |`,
  ];
  if (input.detail?.trim()) {
    lines.push('', '## Detail', '', '```text', input.detail.trimEnd(), '```');
  }
  lines.push('');
  return lines.join('\n');
}

/** Print ANSI markdown failure + next-step status line to stdout. */
export function printGateFailure(input: GateFailureInput): void {
  Bun.write(Bun.stdout, Bun.markdown.ansi(formatGateFailureMarkdown(input)));
  console.error(statusLine('next', input.fix, 'warn'));
  console.error(tones.dim(`  gate=${input.gate}`));
}

/** Exit 1 after printing a structured gate failure. */
export function exitGateFailure(input: GateFailureInput, code = 1): never {
  printGateFailure(input);
  process.exit(code);
}
