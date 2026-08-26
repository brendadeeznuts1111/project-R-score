export function parseReleaseAstMetadata(input: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of input.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (key) metadata[key] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return Object.fromEntries(
    Object.entries(metadata).sort(([left], [right]) => left.localeCompare(right))
  );
}

export function parseReleaseFrontmatter(
  lines: readonly string[],
  closing: number
): Record<string, string> {
  if (closing <= 0) return {};
  const entries: Array<[string, string]> = [];
  for (const line of lines.slice(1, closing)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(line);
    if (match?.[1]) entries.push([match[1], match[2] ?? '']);
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}
