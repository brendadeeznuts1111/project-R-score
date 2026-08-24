/** Pure, acyclic release-provenance joins shared by catalog build and CLI gates. */

export type OfficialReleaseEvidence = {
  version: string;
  url: string;
  pubDate: string;
};

export type CatalogReleaseProvenanceFinding = {
  token: string;
  locus: 'released' | 'fixed' | 'changed' | 'hit';
  version: string;
  issue: 'invalid-version' | 'release-missing' | 'date-mismatch' | 'url-mismatch';
  expected?: string;
  actual?: string;
};

export type CatalogReleaseProvenanceEntry = {
  name: string;
  releasedIn?: string;
  releasedAt?: string;
  releasedUrl?: string;
  fixedIn?: string;
  fixedAt?: string;
  fixedUrl?: string;
  changedIn?: string;
  changedAt?: string;
  changedUrl?: string;
  releaseHits?: readonly {
    version: string;
    url: string;
    publishedAt?: string;
  }[];
};

export function cleanProvenanceVersion(version: string): string {
  return version
    .trim()
    .replace(/^bun-v/i, '')
    .replace(/^v/i, '')
    .split('-')[0]!
    .split('+')[0]!;
}

export function exactReleaseEntry<T extends OfficialReleaseEvidence>(
  version: string,
  releaseMap: Map<string, T>
): T | undefined {
  const clean = cleanProvenanceVersion(version);
  const parts = clean.split('.');
  return releaseMap.get(parts.length === 2 ? `${clean}.0` : clean);
}

/** Official RSS post URL, optionally with a section `#anchor`. */
export function matchesOfficialReleaseUrl(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  return actual === expected || actual.startsWith(`${expected}#`);
}

/** Compare every dated catalog event with the exact official RSS release row. */
export function catalogReleaseProvenanceFindings(
  entries: readonly CatalogReleaseProvenanceEntry[],
  releaseMap: Map<string, OfficialReleaseEvidence>
): CatalogReleaseProvenanceFinding[] {
  const findings: CatalogReleaseProvenanceFinding[] = [];
  const inspect = (
    token: string,
    locus: CatalogReleaseProvenanceFinding['locus'],
    version: string,
    date: string | undefined,
    url: string | undefined
  ): void => {
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(cleanProvenanceVersion(version))) {
      findings.push({ token, locus, version, issue: 'invalid-version', actual: version });
      return;
    }
    const release = exactReleaseEntry(version, releaseMap);
    if (!release) {
      findings.push({ token, locus, version, issue: 'release-missing' });
      return;
    }
    if (date !== release.pubDate) {
      findings.push({
        token,
        locus,
        version,
        issue: 'date-mismatch',
        expected: release.pubDate,
        actual: date,
      });
    }
    if (!matchesOfficialReleaseUrl(url, release.url)) {
      findings.push({
        token,
        locus,
        version,
        issue: 'url-mismatch',
        expected: release.url,
        actual: url,
      });
    }
  };

  for (const entry of entries) {
    const scalars = [
      ['released', entry.releasedIn, entry.releasedAt, entry.releasedUrl],
      ['fixed', entry.fixedIn, entry.fixedAt, entry.fixedUrl],
      ['changed', entry.changedIn, entry.changedAt, entry.changedUrl],
    ] as const;
    for (const [locus, version, date, url] of scalars) {
      if (version) inspect(entry.name, locus, version, date, url);
    }
    for (const hit of entry.releaseHits ?? []) {
      inspect(entry.name, 'hit', hit.version, hit.publishedAt, hit.url);
    }
  }
  return findings;
}
