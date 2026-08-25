// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @released --cpu-prof-md · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4#cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#heap-profiling — --heap-prof-md
// @released --heap-prof-md · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4#heap-prof-md
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
export type PrePushReceipt = {
  schemaVersion: 1;
  tree: string;
  bunVersion: string;
  bunRevision: string;
  gateConfigHash: string;
  status: 'passed';
  finishedAt: string;
};

export function resolvePrePushProfile(
  kind: string | undefined,
  tree: string
): { flag: '--cpu-prof-md' | '--heap-prof-md'; name: string } {
  const heap = kind === 'heap';
  return {
    flag: heap ? '--heap-prof-md' : '--cpu-prof-md',
    name: `prepush-${heap ? 'heap' : 'cpu'}-${tree.slice(0, 8)}.md`,
  };
}

export function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

export function receiptMatches(
  receipt: PrePushReceipt | undefined,
  expected: Omit<PrePushReceipt, 'status' | 'finishedAt'>
): boolean {
  return Boolean(
    receipt &&
    receipt.schemaVersion === 1 &&
    receipt.status === 'passed' &&
    receipt.tree === expected.tree &&
    receipt.bunVersion === expected.bunVersion &&
    receipt.bunRevision === expected.bunRevision &&
    receipt.gateConfigHash === expected.gateConfigHash
  );
}

export function hasContentPush(lines: string): boolean {
  return lines.split('\n').some(line => {
    const [, localSha] = line.trim().split(/\s+/);
    return Boolean(localSha && localSha !== '0000000000000000000000000000000000000000');
  });
}
