/**
 * TOC Ops portal fixture types (Pages-safe snapshot).
 * Theory SSOT lives in toc-ops-repo; this plane only mirrors edge surfaces.
 *
 * @see toc-ops-repo/docs/reference/TOC-Production-Reference.md
 * @see docs/harness/tenants/toc-ops.md
 */

export type TocPartnerStatus = 'Ready' | 'Limited' | 'Inactive';
export type TocAccountStatus = 'New' | 'Funded' | 'Warming' | 'WARMED' | 'Limited' | 'Inactive';
export type TocCapitalLocation =
  | 'HouseFloat'
  | 'WithPartner'
  | 'InSportsbook'
  | 'InRail'
  | 'Pending';
export type TocRailType = 'Venmo' | 'CashApp' | 'PayPal' | 'House' | 'Other';
export type TocTaskType = 'ONB' | 'FUND' | 'LIMIT' | 'WARM' | 'PLAY' | 'WD';
export type TocTaskStatus =
  | 'New'
  | 'GateCheck'
  | 'PendingPartner'
  | 'Processing'
  | 'Completed'
  | 'Stopped'
  | 'PendingRailReview';
export type TocBallInCourt = 'Partner' | 'Ops' | 'System' | 'Expert';
export type TocWdMode = 'warmup_capital_return' | 'principal_recovery' | 'profit_split';
export type TocSoftEntryType =
  | 'CapitalDeployment'
  | 'CapitalReturn'
  | 'ProfitSplit'
  | 'Loss'
  | 'CostOfPriming'
  | 'Adjustment';
export type TocBottleneckSeverity = 'info' | 'warn' | 'critical';

export type TocOpsCatalog = {
  taskTypes: TocTaskType[];
  accountStatuses: TocAccountStatus[];
  softBalanceEntryTypes: TocSoftEntryType[];
  bottleneckRuleKeys: string[];
  warmupRequiredForPlay: 2;
  defaultSplit: { partnerPct: number; expertPct: number; housePct: number };
  exceptionFamilies: Record<string, string>;
};

export type TocOpsBuffer = {
  floatTarget: number;
  floatTargetSource: 'static' | 't_velocity';
  houseFloatHard: number;
  floatRatio: number;
  throttleOnboarding: boolean;
  settlementFloatRatio: number;
  primedDrums: number;
  playableDrums: number;
  principalOutstandingTotal: number;
};

export type TocRail = {
  id: string; // brand-ok — fixture rail id
  railType: TocRailType;
  label: string;
  confirmed: boolean;
  profileScreenshotRef?: string;
};

export type TocAccount = {
  callSign: string; // brand-ok — TOC call sign string in fixture plane
  status: TocAccountStatus;
  warmupCount: number;
  warmupProgress: { completed: number; required: 2; tags: string[] };
  capitalLocation: TocCapitalLocation;
  hardBalance: number;
  primaryRailId: string; // brand-ok
  gate12: {
    housePrincipalOutstanding: number;
    withdrawalMode: TocWdMode;
  };
  sportsbook?: string;
};

export type TocOpenTask = {
  taskId: string; // brand-ok — fixture task id
  taskType: TocTaskType;
  callSign: string; // brand-ok
  status: TocTaskStatus;
  ballInCourt: TocBallInCourt;
  nextAction: string;
  linkedExceptionId?: string; // brand-ok — e.g. WARM-EX-01
};

export type TocSoftEntry = {
  entryType: TocSoftEntryType;
  stakeholder: 'Partner' | 'Expert' | 'House';
  amount: number;
  callSign: string; // brand-ok
  taskId: string; // brand-ok
  timestamp: string;
};

export type TocSoftBalance = {
  byStakeholder: { Partner: number; Expert: number; House: number };
  recentEntries: TocSoftEntry[];
  pendingDeployments: { count: number; totalAmount: number };
};

export type TocBottleneck = {
  ruleKey: string;
  severity: TocBottleneckSeverity;
  metric: string;
  threshold: number;
  observed: number;
  callSign?: string; // brand-ok
  taskId?: string; // brand-ok
  resolvedAt: string | null;
  nextAction: string;
};

export type TocPartner = {
  partnerCode: string; // brand-ok — 3–6 letter TOC partner code
  status: TocPartnerStatus;
  package: {
    id: string; // brand-ok
    partnerPct: number;
    expertPct: number;
    housePct: number;
  };
  readiness: {
    score: number;
    playableAccountCount: number;
    accountScores: Array<{
      callSign: string; // brand-ok
      score: number;
      playable: boolean;
      factors: string[];
    }>;
  };
  rails: TocRail[];
  accounts: TocAccount[];
  openTasks: TocOpenTask[];
  softBalance: TocSoftBalance;
  bottlenecks: TocBottleneck[];
  knownExceptions: Array<{
    id: string; // brand-ok — FUND-EX-01 …
    trigger: string;
    action: string;
  }>;
};

export type TocOpsSnapshot = {
  schema: 'factorywager.toc-ops.portal-fixture.v1';
  source: 'snapshot' | 'demo';
  readOnly: true;
  generatedAt: string;
  ssot: {
    theory: 'toc-ops-repo/docs/reference/TOC-Production-Reference.md';
    accounting: 'toc-ops-repo/docs/system/ACCOUNTING.md';
    domain: 'toc-ops-repo/docs/DOMAIN_CONSTANTS.md';
  };
  catalog: TocOpsCatalog;
  buffer: TocOpsBuffer;
  partners: TocPartner[];
  /** Rollups for ops-summary.toc + portal cards */
  summary: {
    partners: number;
    accounts: number;
    warmed: number;
    warming: number;
    confirmedRails: number;
    openTasks: number;
    openBottlenecks: number;
    criticalBottlenecks: number;
    principalOutstandingTotal: number;
    byTaskType: Record<string, number>;
    byBallInCourt: Record<string, number>;
  };
};

/** Compact slice embedded in ops-summary.json */
export type TocOpsSummarySlice = {
  available: boolean;
  path: '/registry/toc-ops.json';
  generatedAt: string | null;
  partners: number;
  warmed: number;
  warming: number;
  confirmedRails: number;
  openTasks: number;
  openBottlenecks: number;
  criticalBottlenecks: number;
  principalOutstandingTotal: number;
  throttleOnboarding: boolean;
  primedDrums: number;
  playableDrums: number;
};
