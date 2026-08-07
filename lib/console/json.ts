/**
 * Machine JSON choke for `--json` CLI branches.
 * Format gate allows this site via `// console-ok` — sole pretty-JSON path for tools.
 */
export function jsonOut<T>(value: T, options: { compact?: boolean } = {}): void {
  console.info(options.compact ? JSON.stringify(value) : JSON.stringify(value, null, 2)); // console-ok — --json choke point
}
