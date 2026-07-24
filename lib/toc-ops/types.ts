/**
 * TOC Ops portal fixture types (Pages-safe snapshot).
 * Theory SSOT lives in toc-ops-repo; this plane only mirrors edge surfaces.
 *
 * @see toc-ops-repo/docs/reference/TOC-Production-Reference.md
 * @see docs/harness/tenants/toc-ops.md
 */
import type { TocIdentityBridge } from './identity.ts';

export type TocGateId =
  | 'play_warmed'
  | 'play_limit'
  | 'confirmed_rail'
  | 'partner_ready'
  | 'gate12_wd_mode'
  | 'soft_posted'
  | 'screenshot_first'
  | 'limit_fresh_drum'
  | 'fund_rail_ready'
  | 'warm_sequential';

export type TocGateResult = {
  gateId: TocGateId;
  ok: boolean;
  severity: 'info' | 'warn' | 'critical';
  partnerCode: string;
  callSign?: string;
  taskId?: string; // brand-ok — fixture/enforcement DTO mirrors toc-ops-repo task id
  reason: string;
  tag?: '#HARDGATE-VIOLATION' | '#ROPE' | '#GATE12';
};

export type TocThroughputSlice = {
  T: number;
  I: number;
  OE: number;
  byPartner: Record<string, { T: number; I: number; OE: number }>;
};

export type TocConstraintDiagnosis = {
  order: Array<'rope' | 'drum' | 'buffer' | 'elevate'>;
  focus: 'rope' | 'drum' | 'buffer' | 'elevate';
  summary: string;
  ropeBroken: boolean;
  drumStarved: boolean;
  bufferWrongSized: boolean;
};

export type TocEnforcementSlice = {
  evaluatedAt: string;
  plane: 'operate-lite';
  note: string;
  warmupRequiredForPlay: 2;
  gates: TocGateResult[];
  passed: number;
  failed: number;
  criticalFailed: number;
  throughput: TocThroughputSlice;
  diagnosis: TocConstraintDiagnosis;
};

export type TocPartnerStatus = 'Ready' | 'Limited' | 'Inactive' | 'Onboarding';
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
export type TocPlayStatus = 'instruction' | 'placed' | 'settled' | 'blocked';
export type TocPlayResult = 'pending' | 'win' | 'loss' | 'push' | 'void' | 'blocked';
export type TocExperimentStatus = 'draft' | 'active' | 'paused' | 'completed';
export type TocFlowStage = 'ONB' | 'FUND' | 'LIMIT' | 'WARM' | 'PLAY' | 'WD' | 'RECYCLE';

/** Return-efficiency catalog knobs (mirror toc-ops-repo ACCOUNTING; fixture defaults). */
export type TocReturnCatalog = {
  daysCover: number;
  staticFloatFloor: number;
  settlementThrottleRatio: number;
  tVelocityWindowDays: number;
  /** Expected ProfitSplit per settled win when upstream ΔT is projected. */
  defaultExpectedPlayT: number;
  processRank: TocTaskType[];
};

/** Where / how a Drum places risk. */
export type TocVenueKind =
  | 'sportsbook'
  | 'exchange'
  | 'prediction_market'
  | 'crypto'
  | 'pph'
  | 'postup_credit'
  | 'casino'
  | 'kiosk'
  | 'in_person';

export type TocSportMarket =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'Soccer'
  | 'Tennis'
  | 'Golf'
  | 'MMA'
  | 'Boxing'
  | 'Politics'
  | 'Economics'
  | 'Crypto'
  | 'Other';

export type TocLegalStatus = 'legal' | 'restricted' | 'prohibited' | 'grey' | 'unknown';

export type TocVenueAccess = 'online' | 'in_person' | 'kiosk' | 'hybrid';

export type TocStateLegal = {
  state: string; // brand-ok — USPS / region code
  status: TocLegalStatus;
  notes?: string;
  licenseRef?: string;
};

export type TocCreditTerms = {
  mode: 'cash' | 'postup' | 'pph' | 'mixed';
  creditLimit?: number;
  postedBalance?: number;
  settlementDays?: number;
  currency?: string; // brand-ok — USD / USDC / USDT
};

/** Per-account venue / channel profile. */
export type TocAccountVenue = {
  kind: TocVenueKind;
  venueId: string; // brand-ok — slug e.g. hardrock, kalshi, polymarket
  displayName: string;
  access: TocVenueAccess;
  sports: TocSportMarket[];
  primaryState: string; // brand-ok
  legalByState: TocStateLegal[];
  credit?: TocCreditTerms;
  crypto?: {
    networks: string[]; // brand-ok
    assets: string[]; // brand-ok
    walletHint?: string;
  };
  exchange?: {
    clearing: 'cftc' | 'offshore' | 'p2p' | 'unknown';
    markets: string[];
  };
  pph?: {
    shopName: string;
    agentRef?: string;
  };
  casino?: {
    property: string;
    floor?: string;
  };
  kiosk?: {
    locationLabel: string;
    deviceId?: string; // brand-ok
  };
};

export type TocVenueCatalog = {
  kinds: TocVenueKind[];
  venueIds: string[];
  sports: TocSportMarket[];
  legalStatuses: TocLegalStatus[];
  accessModes: TocVenueAccess[];
};

export type TocVenueSummary = {
  accountsWithVenue: number;
  byVenueKind: Record<string, number>;
  byVenueId: Record<string, number>;
  byAccess: Record<string, number>;
  byPrimaryState: Record<string, number>;
  byLegalStatus: Record<string, number>;
  bySport: Record<string, number>;
  legalStatesCovered: number;
  creditLines: number;
  cryptoAccounts: number;
  exchangeAccounts: number;
  kioskAccounts: number;
  inPersonAccounts: number;
};

export type TocOpsCatalog = {
  taskTypes: TocTaskType[];
  accountStatuses: TocAccountStatus[];
  softBalanceEntryTypes: TocSoftEntryType[];
  bottleneckRuleKeys: string[];
  warmupRequiredForPlay: 2;
  defaultSplit: { partnerPct: number; expertPct: number; housePct: number };
  exceptionFamilies: Record<string, string>;
  flowOrder: TocFlowStage[];
  depositCorridor: { min: number; max: number; target: number };
  limitFreshnessDays: number;
  returnEfficiency?: TocReturnCatalog;
  venues?: TocVenueCatalog;
};

export type TocProcessReturn = {
  process: TocTaskType;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  deltaT: number;
  iPeak: number;
  tauDays: number;
  oe: number;
  rP: number;
};

export type TocAssetEfficiency = {
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  profitSplitTotal: number;
  peakCapital: number;
  capitalDaysInI: number;
  ce: number;
};

export type TocLimitEnhancement = {
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  deltaL: number;
  cAsset: number;
  daysToUsableLimit: number;
  le: number;
};

export type TocRankedAction = {
  rank: number;
  process: TocTaskType;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  rP: number;
  weightedScore?: number;
  reason: string;
  ropeSafe: boolean;
};

export type TocReturnEfficiencySlice = {
  computedAt: string;
  byProcess: TocProcessReturn[];
  byAsset: TocAssetEfficiency[];
  byLimit: TocLimitEnhancement[];
  avgRP: number;
  processTypeAvgRP: Partial<Record<TocTaskType, number>>;
};

/** Unified T/I/OE + return metrics + dynamic buffer (getTioeSnapshot output). */
export type TocTioeSnapshot = {
  throughput: TocThroughputSlice;
  buffer: TocOpsBuffer;
  returnEfficiency: TocReturnEfficiencySlice;
  rankedActions: TocRankedAction[];
  partners: TocPartner[];
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

/** WGS84 point — fixture/demo plane (not live GeoIP). */
export type TocGeoPoint = {
  lat: number;
  lon: number;
  accuracyM?: number;
  source: 'profile' | 'ip' | 'manual' | 'demo';
  observedAt?: string;
};

/** Postal / administrative place. */
export type TocPostal = {
  country: string; // brand-ok — ISO 3166-1 alpha-2
  region?: string; // brand-ok — state/province
  city?: string;
  zip: string; // brand-ok — postal / ZIP
  timezone?: string; // brand-ok — IANA tz
};

/** Resolved DNS snapshot for a partner/account hostname. */
export type TocDnsRecord = {
  hostname: string; // brand-ok
  resolvedAt: string;
  a?: string[]; // brand-ok — A (IPv4)
  aaaa?: string[]; // brand-ok — AAAA (IPv6)
  cname?: string[];
  mx?: string[];
  ttlSec?: number;
  resolver?: string; // brand-ok — e.g. 1.1.1.1
};

/** Network endpoint / last-seen egress. */
export type TocNetworkEndpoint = {
  ipv4?: string; // brand-ok
  ipv6?: string; // brand-ok
  asn?: number;
  asOrg?: string;
  isp?: string;
  reverseDns?: string; // brand-ok — PTR
  dns?: TocDnsRecord;
  lastSeenAt?: string;
  vpnSuspected?: boolean;
  /** Connected interface hint for desk triage */
  connectionType?: 'residential' | 'mobile' | 'datacenter' | 'unknown';
};

/** Geo + network presence for partner HQ, drum, or house desk. */
export type TocPresence = {
  geo: TocGeoPoint;
  postal: TocPostal;
  network: TocNetworkEndpoint;
  metrics?: {
    distanceKmFromHouse?: number;
    sameMetroAsHouse?: boolean;
  };
};

/** Placement-time geo/IP context on a play (subset of presence). */
export type TocPlacementContext = {
  geo?: TocGeoPoint;
  postal?: Pick<TocPostal, 'country' | 'region' | 'city' | 'zip'>;
  ipv4?: string; // brand-ok
  ipv6?: string; // brand-ok
  asn?: number;
  dnsHostname?: string; // brand-ok
};

/** Rollup metrics for presence coverage on the board / ops card. */
export type TocPresenceSummary = {
  partnersWithGeo: number;
  accountsWithGeo: number;
  playsWithPlacement: number;
  uniqueZips: number;
  uniqueCities: number;
  uniqueAsns: number;
  ipv4Count: number;
  ipv6Count: number;
  dnsResolved: number;
  vpnSuspected: number;
  byCountry: Record<string, number>;
  byTimezone: Record<string, number>;
  byAsn: Record<string, number>;
  byConnectionType: Record<string, number>;
  avgDistanceKmFromHouse: number | null;
};

export type TocRail = {
  id: string; // brand-ok — fixture rail id
  railType: TocRailType;
  label: string;
  confirmed: boolean;
  profileScreenshotRef?: string;
  destinationHint?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
};

export type TocAccountLimits = {
  dailyMax: number | null;
  weeklyMax: number | null;
  rawText?: string;
  checkedAt: string | null;
  screenshotRef?: string;
  freshness: 'fresh' | 'stale' | 'unknown';
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
  /** @deprecated Prefer `venue.displayName` — kept for older portal readers. */
  sportsbook?: string;
  /** Venue / channel profile (book · exchange · crypto · PPH · …). */
  venue?: TocAccountVenue;
  limits: TocAccountLimits;
  expertId?: string; // brand-ok
  flowStage: TocFlowStage;
  /** Last-seen device / session geo+IP for this Drum. */
  presence?: TocPresence;
};

export type TocOpenTask = {
  taskId: string; // brand-ok — fixture task id
  taskType: TocTaskType;
  callSign: string; // brand-ok
  status: TocTaskStatus;
  ballInCourt: TocBallInCourt;
  nextAction: string;
  linkedExceptionId?: string; // brand-ok — e.g. WARM-EX-01
  proofRefs?: string[];
  createdAt?: string;
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

export type TocPlay = {
  playId: string; // brand-ok
  taskId?: string; // brand-ok
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  expertId: string; // brand-ok
  market: string;
  event: string;
  selection: string;
  odds: number;
  stake: number;
  confidence?: number;
  status: TocPlayStatus;
  result: TocPlayResult;
  pnl: number | null;
  blockedReason?: string;
  experimentId?: string; // brand-ok
  variantKey?: string;
  placedAt: string;
  settledAt?: string;
  /** Egress / place context when the slip was posted. */
  placement?: TocPlacementContext;
};

export type TocExperimentVariant = {
  key: string;
  name: string;
  config: Record<string, string | number | boolean>;
};

export type TocExperimentAssignment = {
  partnerCode: string; // brand-ok
  variantKey: string;
  metricValue?: number;
  assignedAt: string;
};

export type TocExperiment = {
  id: string; // brand-ok
  name: string;
  status: TocExperimentStatus;
  phase: 1 | 2 | 3 | 4;
  designMethod: 'full' | 'switchback' | 'cluster' | 'factorial';
  metricName: 'win_rate' | 'placement_rate' | 'throughput_t';
  hypothesis: string;
  factors: Array<{ name: string; levels: string[] }>;
  variants: TocExperimentVariant[];
  assignments: TocExperimentAssignment[];
  clusterBy?: 'package_id' | 'partner_code';
};

/** Phone / SIM asset on a partner or agent. */
export type TocPhoneAsset = {
  id: string; // brand-ok
  label: string;
  e164?: string; // brand-ok — +1…
  carrier?: string;
  dataPlan?: {
    name: string;
    gbMonth: number;
    usedGb: number;
    hotspot: boolean;
    renewsAt?: string;
  };
  status: 'active' | 'warming' | 'suspended' | 'retired';
  assignedCallSign?: string; // brand-ok
};

export type TocPartnerAsset = {
  id: string; // brand-ok
  kind: 'phone' | 'device' | 'wallet' | 'document' | 'rail' | 'other';
  label: string;
  ref?: string;
  status: 'active' | 'pending' | 'retired';
  meta?: Record<string, string | number | boolean>;
};

export type TocTelegramLane = {
  chatId?: string; // brand-ok
  groupId?: string; // brand-ok
  channelId?: string; // brand-ok — plays channel
  botUsername?: string; // brand-ok — @TOC_…
  dmRef?: string;
  topics?: Array<{ name: string; threadId?: number }>;
};

export type TocPlayChannel = {
  kind: 'telegram' | 'bot' | 'portal' | 'sms' | 'voice';
  ref: string; // brand-ok
  primary: boolean;
  status: 'live' | 'paused' | 'setup';
};

export type TocPaymentRecord = {
  id: string; // brand-ok
  method: 'venmo' | 'cashapp' | 'paypal' | 'ach' | 'wire' | 'crypto' | 'cash' | 'other';
  direction: 'in' | 'out';
  amount: number;
  currency: string; // brand-ok
  status: 'posted' | 'pending' | 'failed';
  at: string;
  railId?: string; // brand-ok
  note?: string;
};

export type TocAccountingBalance = {
  softPartner: number;
  softExpert: number;
  softHouse: number;
  hardInBook: number;
  hardFloat: number;
  pendingDeploy: number;
  pendingPayout: number;
  currency: string; // brand-ok
};

export type TocDealTerms = {
  dealId: string; // brand-ok
  name: string;
  partnerPct: number;
  expertPct: number;
  housePct: number;
  payoutCadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  payoutMethod: 'rail' | 'ach' | 'crypto' | 'mixed';
  termMonths?: number;
  effectiveAt: string;
  notes?: string;
};

export type TocHistoryEvent = {
  at: string;
  kind: string;
  summary: string;
  callSign?: string; // brand-ok
  amount?: number;
};

export type TocClvStats = {
  sampleN: number;
  avgClvBps: number;
  winRateWhenPositiveClv: number;
  last30dAvgClvBps: number;
  beatsClosePct: number;
  /** Optional per-market CLV breakdown. */
  byMarket?: Array<{ market: string; sampleN: number; avgClvBps: number }>;
  /** Optional weekly avg CLV (bps) oldest→newest. */
  weeklySeriesBps?: number[];
};

export type TocAgentStyle = {
  aggression: 'conservative' | 'balanced' | 'aggressive';
  stakeBand: { min: number; max: number; typical: number };
  marketFocus: string[];
  holdTimeHint: 'same_game' | 'early' | 'mixed';
  notes?: string;
};

/** Expert / agent liquidity pool (allocated capacity by market). */
export type TocLiquidityPool = {
  allocated: number;
  available: number;
  reserved: number;
  currency: string; // brand-ok
  byMarket: Array<{
    market: string;
    allocated: number;
    available: number;
    reserved?: number;
    openPlays?: number;
  }>;
  lastReconciledAt?: string;
  /** Open reservations (demo desk view). */
  openReservations?: Array<{
    reservationId: string; // brand-ok
    callSign: string; // brand-ok
    market: string;
    stake: number;
    at: string;
  }>;
};

export type TocLimitProfile = {
  dailyMax: number | null;
  weeklyMax: number | null;
  perPlayMax?: number | null;
  exposureCap?: number | null;
  notes?: string;
};

/** Rich partner operating profile (demo plane). */
export type TocPartnerProfile = {
  displayName: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  risk: 'green' | 'yellow' | 'orange' | 'red';
  phones: TocPhoneAsset[];
  assets: TocPartnerAsset[];
  telegram: TocTelegramLane;
  playChannels: TocPlayChannel[];
  payments: TocPaymentRecord[];
  accounting: TocAccountingBalance;
  deals: TocDealTerms[];
  history: TocHistoryEvent[];
  limits: TocLimitProfile;
  wagerPlaces: Array<{ venueId: string; label: string; kind: string }>; // brand-ok venueId
  preferredMarkets: string[];
  bot?: { username: string; status: 'live' | 'paused' | 'setup'; commands?: string[] };
  /** SMS / voice ops log (demo). */
  commsLog?: Array<{
    at: string;
    channel: 'sms' | 'voice' | 'telegram';
    direction: 'in' | 'out';
    summary: string;
  }>;
  /** Rolling 7d Soft / play velocity (demo desk). */
  velocity?: {
    t7d: number;
    plays7d: number;
    settles7d: number;
    avgStake7d: number;
  };
  /** Ops desk scorecard (SLA · trust · proof). */
  deskScorecard?: {
    trustScore: number;
    slaOnTimePct: number;
    proofCompletenessPct: number;
    avgPartnerResponseMin: number;
    openExceptions: number;
    lastReviewAt: string;
  };
  /** Rail health for confirmed payout paths. */
  railHealth?: Array<{
    railId: string; // brand-ok
    successRate: number;
    avgSettleMin: number;
    lastFailureAt: string | null;
    volume30d: number;
  }>;
  /** Screenshot / proof vault refs. */
  proofVault?: Array<{
    ref: string;
    kind: 'limits' | 'rail' | 'kyc' | 'slip' | 'receipt' | 'other';
    callSign?: string; // brand-ok
    at: string;
  }>;
  /** Daily Soft T series (oldest→newest, demo). */
  softDailyT?: Array<{ day: string; t: number; oe: number }>;
};

/** Rich expert / agent profile + liquidity. */
export type TocAgentProfile = {
  handle: string;
  style: TocAgentStyle;
  clv: TocClvStats;
  liquidity: TocLiquidityPool;
  telegram: TocTelegramLane;
  playChannels: TocPlayChannel[];
  payments: TocPaymentRecord[];
  accounting: { pendingCut: number; paidYtd: number; currency: string };
  deals: TocDealTerms[];
  history: TocHistoryEvent[];
  limits: TocLimitProfile;
  phones: TocPhoneAsset[];
  markets: string[];
  wagerPlaces: Array<{ venueId: string; label: string }>; // brand-ok — venue catalog slug
  bot?: { username: string; status: 'live' | 'paused' | 'setup' };
  /** Release / hit-rate desk metrics. */
  releaseStats?: {
    releases30d: number;
    placed30d: number;
    blocked30d: number;
    placementRate: number;
    avgStake: number;
  };
  /** Per-book / venue permission matrix. */
  bookPermissions?: Array<{
    venueId: string; // brand-ok
    allowed: boolean;
    maxStake: number;
    markets: string[];
    note?: string;
  }>;
  /** Exposure ladder by stake band. */
  exposureLadder?: Array<{
    band: string;
    openStake: number;
    reserved: number;
    cap: number;
  }>;
  /** Daily CLV samples (bps) oldest→newest. */
  clvDailyBps?: number[];
};

export type TocProfilesSummary = {
  partnersWithProfile: number;
  agentsWithProfile: number;
  phonesActive: number;
  telegramLanes: number;
  playChannelsLive: number;
  expertLiquidityAllocated: number;
  expertLiquidityAvailable: number;
  avgAgentClvBps: number | null;
  openDeals: number;
  pendingPayouts: number;
};

export type TocExpert = {
  expertId: string; // brand-ok
  displayName: string;
  markets: string[];
  weight: number;
  /** Enriched agent profile (style · CLV · liquidity · telegram · deals). */
  profile?: TocAgentProfile;
};

export type TocPartner = {
  partnerCode: string; // brand-ok — 3–6 letter TOC partner code
  status: TocPartnerStatus;
  telegramRef?: string;
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
      weightedScore?: number;
    }>;
  };
  /** Furthest healthy stage in ONB→…→WD for this partner */
  flowStage: TocFlowStage;
  /** Partner HQ / onboarding geo + egress network. */
  presence?: TocPresence;
  /** Operating profile: phones · assets · telegram · deals · accounting. */
  profile?: TocPartnerProfile;
  rails: TocRail[];
  accounts: TocAccount[];
  openTasks: TocOpenTask[];
  softBalance: TocSoftBalance;
  bottlenecks: TocBottleneck[];
  recentPlays: TocPlay[];
  experimentAssignment?: {
    experimentId: string; // brand-ok
    variantKey: string;
    metricName: string;
    metricValue: number;
  };
  knownExceptions: Array<{
    id: string; // brand-ok — FUND-EX-01 …
    trigger: string;
    action: string;
  }>;
};

export type TocOpsSnapshot = {
  schema: 'factorywager.toc-ops.portal-fixture.v2';
  source: 'snapshot' | 'demo';
  readOnly: true;
  /** Pages surface is always demo-readonly (no Soft mutations). */
  plane: 'demo-readonly';
  identity?: TocIdentityBridge;
  /** Baked operate-lite Rope/Hard Gate evaluation (read-only on Pages). */
  enforcement?: TocEnforcementSlice;
  /** Baked R_P / CE / LE + ranked next actions. */
  returnEfficiency?: TocReturnEfficiencySlice;
  rankedActions?: TocRankedAction[];
  generatedAt: string;
  ssot: {
    theory: 'toc-ops-repo/docs/reference/TOC-Production-Reference.md';
    accounting: 'toc-ops-repo/docs/system/ACCOUNTING.md';
    domain: 'toc-ops-repo/docs/DOMAIN_CONSTANTS.md';
  };
  catalog: TocOpsCatalog;
  buffer: TocOpsBuffer;
  /** Ops desk / house float geo+network (demo). */
  housePresence?: TocPresence;
  experts: TocExpert[];
  experiments: TocExperiment[];
  partners: TocPartner[];
  /** Geo / IP / DNS coverage rollup. */
  presence?: TocPresenceSummary;
  /** Venue / channel rollup (books · exchanges · crypto · PPH · …). */
  venues?: TocVenueSummary;
  /** Partner + agent profile rollup. */
  profiles?: TocProfilesSummary;
  /** Rollups for ops-summary.toc + portal cards */
  summary: {
    partners: number;
    accounts: number;
    warmed: number;
    warming: number;
    onboarding: number;
    confirmedRails: number;
    unconfirmedRails: number;
    openTasks: number;
    openOnb: number;
    openLimit: number;
    openWarm: number;
    openPlay: number;
    openBottlenecks: number;
    criticalBottlenecks: number;
    principalOutstandingTotal: number;
    playsPending: number;
    playsSettled: number;
    playsBlocked: number;
    activeExperiments: number;
    byTaskType: Record<string, number>;
    byBallInCourt: Record<string, number>;
    byFlowStage: Record<string, number>;
    /** Compact presence counts mirrored from `presence` for ops cards. */
    presencePartners?: number;
    presenceIpv6?: number;
    presenceUniqueZips?: number;
    presenceUniqueAsns?: number;
    presenceDnsResolved?: number;
    /** Compact venue counts */
    venueKinds?: number;
    venueExchanges?: number;
    venueCrypto?: number;
    venueCreditLines?: number;
    venueLegalStates?: number;
    profilePhones?: number;
    profileTelegramLanes?: number;
    expertLiquidityAvailable?: number;
    avgAgentClvBps?: number | null;
    openDeals?: number;
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
  onboarding: number;
  confirmedRails: number;
  openTasks: number;
  openOnb: number;
  openLimit: number;
  openBottlenecks: number;
  criticalBottlenecks: number;
  principalOutstandingTotal: number;
  throttleOnboarding: boolean;
  primedDrums: number;
  playableDrums: number;
  playsPending: number;
  playsSettled: number;
  activeExperiments: number;
  plane: 'demo-readonly';
  identityLinked: boolean;
  identityPartners: number;
  enforcementFocus: 'rope' | 'drum' | 'buffer' | 'elevate' | null;
  enforcementFailed: number;
  enforcementCritical: number;
  throughputT: number | null;
  throughputI: number | null;
  throughputOE: number | null;
  topRankedProcess: TocTaskType | null;
  avgRP: number | null;
  settlementFloatRatio: number | null;
  /** Presence / geo-network rollups (optional until fixture baked). */
  presencePartners?: number;
  presenceIpv6?: number;
  presenceUniqueZips?: number;
  presenceUniqueAsns?: number;
  presenceDnsResolved?: number;
  presenceAvgDistanceKm?: number | null;
  venueKinds?: number;
  venueExchanges?: number;
  venueCrypto?: number;
  venueCreditLines?: number;
  venueLegalStates?: number;
  profilePhones?: number;
  profileTelegramLanes?: number;
  expertLiquidityAvailable?: number;
  avgAgentClvBps?: number | null;
  openDeals?: number;
};
