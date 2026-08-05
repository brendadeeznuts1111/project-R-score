export interface GitStatusEntry {
  code: string;
  path: string;
}

/** Parse `git status --porcelain=v1` without discarding its significant XY columns. */
export function parseGitStatusPorcelain(output: string): GitStatusEntry[] {
  if (!output) return [];
  return output
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map(line => ({ code: line.slice(0, 2), path: line.slice(3) }));
}
