/** Optional Tier 4 scrape policy from config/operators/*.toml `[scrape]`. */
export type OperatorScrapeConfig = {
  agentId: string; // brand-ok — scrape agent slug (e.g. draftkings-agent), not a catalog *Id
  liveUrl: string;
  html: boolean;
  htmlUrl?: string;
  htmlFixture?: string;
  /** Wire jurisdiction code; branded at scrape boundary. */
  jurisdiction: string; // brand-ok — StateCode after asStateCode/tryStateCode
};

/** Operator declarative truth from config/operators/*.toml */
export type OperatorConfig = {
  id: string; // brand-ok — opaque research/wire id
  name: string;
  host: string;
  url: string;
  identity: string;
  geo: string[];
  markets: string[];
  lifecycle: string[];
  expectedStack: string[];
  probePaths: string[];
  sourcePath: string;
  scrape?: OperatorScrapeConfig;
};

export type SeedDomain = {
  id: string; // brand-ok — opaque research/wire id
  host: string;
  url: string;
};

export type FetchObservation = {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  protocol: string | null;
  bytes: number;
  elapsedMs: number;
  error?: string;
  source: 'live' | 'fixture' | 'none';
  htmlPath?: string;
};

export type ScreenshotObservation = {
  ok: boolean;
  source: 'webview' | 'placeholder' | 'none';
  pngPath?: string;
  thumbPath?: string;
  evidenceId?: string; // brand-ok — opaque research/wire id
  width?: number;
  height?: number;
  thumbBytes?: number;
  elapsedMs: number;
  error?: string;
};

export type StackHit = {
  provider: string;
  confidence: number;
  fingerprint: string;
  matches: string[];
};

export type StackDetection = {
  url: string;
  host: string;
  provider: string;
  confidence: number;
  fingerprint: string;
  hits: StackHit[];
  marketsObserved: string[];
  source: 'html' | 'empty';
};

export type EnrichResult = {
  taskId: string; // brand-ok — opaque research/wire id
  workerId: string; // brand-ok — opaque research/wire id
  operatorId: string | null; // brand-ok — opaque research/wire id
  url: string;
  host: string;
  identity: string | null;
  fetchedAt: string;
  dns: { host: string; addresses: string[]; ok: boolean; error?: string };
  fetch: FetchObservation;
  screenshot: ScreenshotObservation;
  stack?: StackDetection;
  error?: string;
};

export type BatchEnrichReport = {
  generatedAt: string;
  bunVersion: string;
  parallel: number;
  screenshot: boolean;
  fixtureFallback: boolean;
  count: number;
  results: EnrichResult[];
};

export type EvidenceRow = {
  id: string; // brand-ok — opaque research/wire id
  url: string;
  host: string;
  operatorId: string | null; // brand-ok — opaque research/wire id
  type: 'fetch' | 'screenshot' | 'stack' | 'enrich';
  claim: string;
  provider: string | null;
  confidence: number | null;
  fingerprint: string | null;
  marketsJson: string | null;
  geoJson: string | null;
  payloadJson: string;
  createdAt: string;
};

export type CoverageRow = {
  name: string;
  id: string; // brand-ok — opaque research/wire id
  host: string;
  identity: string;
  expected: { markets: string[]; geo: string[]; stack: string[] };
  observed: {
    markets: string[];
    geo: string[];
    stack: string | null;
    stackConfidence: number | null;
    fetchOk: boolean;
    screenshotOk: boolean;
    evidenceCount: number;
  };
  gap: { markets: string[]; geo: string[]; stack: string[] };
  score: number;
  notes: string[];
};

export type CoverageReport = {
  generatedAt: string;
  bunVersion: string;
  operators: number;
  meanScore: number;
  rows: CoverageRow[];
};
