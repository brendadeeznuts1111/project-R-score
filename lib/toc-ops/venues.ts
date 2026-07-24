/**
 * TOC Ops account venue taxonomy — sportsbooks, exchanges, crypto, PPH,
 * post-up credit, casino, kiosk, in-person + state legality.
 * Demo-plane catalog for Pages fixture (not live licensing SSOT).
 *
 * @see lib/toc-ops/types.ts
 * @see docs/harness/tenants/toc-ops.md
 */
import type {
  TocAccount,
  TocAccountVenue,
  TocPartner,
  TocSportMarket,
  TocVenueCatalog,
  TocVenueKind,
  TocVenueSummary,
} from './types.ts';

export const TOC_VENUE_KINDS: TocVenueKind[] = [
  'sportsbook',
  'exchange',
  'prediction_market',
  'crypto',
  'pph',
  'postup_credit',
  'casino',
  'kiosk',
  'in_person',
];

export const TOC_SPORT_MARKETS: TocSportMarket[] = [
  'NFL',
  'NBA',
  'MLB',
  'NHL',
  'NCAAF',
  'NCAAB',
  'Soccer',
  'Tennis',
  'Golf',
  'MMA',
  'Boxing',
  'Politics',
  'Economics',
  'Crypto',
  'Other',
];

/** Canonical demo venue ids (slug). */
export const TOC_VENUE_IDS = [
  'hardrock',
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'bovada',
  'stake',
  'kalshi',
  'polymarket',
  'prophet_x',
  'pph_southfl',
  'postup_desk',
  'hr_casino_tampa',
  'hr_kiosk_mia',
] as const;

export type TocVenueId = (typeof TOC_VENUE_IDS)[number];

export const TOC_VENUE_CATALOG: TocVenueCatalog = {
  kinds: [...TOC_VENUE_KINDS],
  venueIds: [...TOC_VENUE_IDS],
  sports: [...TOC_SPORT_MARKETS],
  legalStatuses: ['legal', 'restricted', 'prohibited', 'grey', 'unknown'],
  accessModes: ['online', 'in_person', 'kiosk', 'hybrid'],
};

function flLegal(status: TocAccountVenue['legalByState'][0]['status'] = 'legal') {
  return [
    {
      state: 'FL',
      status,
      notes: status === 'legal' ? 'Retail + online where licensed' : undefined,
    },
    { state: 'NJ', status: 'legal' as const, notes: 'Online sports / casino' },
    { state: 'NY', status: 'restricted' as const, notes: 'Exchange / prediction vary' },
    { state: 'TX', status: 'prohibited' as const, notes: 'No statewide retail sportsbook' },
  ];
}

/** Build a typed venue blob for a demo call sign. */
export function demoVenueForCallSign(callSign: string): TocAccountVenue {
  // brand-ok — fixture call-sign routing
  switch (callSign) {
    case 'ASH-001':
      return {
        kind: 'sportsbook',
        venueId: 'hardrock',
        displayName: 'Hard Rock Bet (Florida)',
        access: 'hybrid',
        sports: ['NFL', 'NBA', 'MLB', 'NHL', 'Tennis'],
        primaryState: 'FL',
        legalByState: flLegal('legal'),
        credit: { mode: 'cash', currency: 'USD' },
      };
    case 'ASH-002':
      return {
        kind: 'in_person',
        venueId: 'hardrock',
        displayName: 'Hard Rock — Retail Counter',
        access: 'in_person',
        sports: ['NFL', 'NBA', 'MLB'],
        primaryState: 'FL',
        legalByState: flLegal('legal'),
        credit: { mode: 'cash', currency: 'USD' },
        casino: { property: 'Hard Rock Hollywood', floor: 'sportsbook_window' },
      };
    case 'ASH-003':
      return {
        kind: 'casino',
        venueId: 'hr_casino_tampa',
        displayName: 'Seminole Hard Rock Casino Tampa',
        access: 'in_person',
        sports: ['Other'],
        primaryState: 'FL',
        legalByState: [
          { state: 'FL', status: 'legal', notes: 'Tribal casino floor' },
          { state: 'NJ', status: 'legal' },
          { state: 'TX', status: 'prohibited' },
        ],
        credit: { mode: 'cash', currency: 'USD' },
        casino: { property: 'Hard Rock Tampa', floor: 'main' },
      };
    case 'PAT-001':
      return {
        kind: 'sportsbook',
        venueId: 'draftkings',
        displayName: 'DraftKings',
        access: 'online',
        sports: ['NFL', 'NBA', 'MLB', 'NCAAF', 'Soccer', 'MMA'],
        primaryState: 'FL',
        legalByState: flLegal('legal'),
        credit: { mode: 'cash', currency: 'USD' },
      };
    case 'PAT-002':
      return {
        kind: 'exchange',
        venueId: 'kalshi',
        displayName: 'Kalshi',
        access: 'online',
        sports: ['Politics', 'Economics', 'NFL', 'Other'],
        primaryState: 'FL',
        legalByState: [
          { state: 'FL', status: 'legal', notes: 'CFTC-regulated event contracts' },
          { state: 'NY', status: 'legal' },
          { state: 'TX', status: 'legal' },
          { state: 'CA', status: 'legal' },
        ],
        credit: { mode: 'cash', currency: 'USD' },
        exchange: {
          clearing: 'cftc',
          markets: ['politics', 'economics', 'sports_event_contracts'],
        },
      };
    case 'PAT-003':
      return {
        kind: 'prediction_market',
        venueId: 'polymarket',
        displayName: 'Polymarket',
        access: 'online',
        sports: ['Politics', 'Crypto', 'Economics', 'Other'],
        primaryState: 'FL',
        legalByState: [
          { state: 'FL', status: 'grey', notes: 'Geo / product restrictions apply' },
          { state: 'NY', status: 'restricted' },
          { state: 'TX', status: 'grey' },
          { state: 'CA', status: 'grey' },
        ],
        credit: { mode: 'cash', currency: 'USDC' },
        crypto: {
          networks: ['polygon', 'ethereum'],
          assets: ['USDC'],
          walletHint: '0xpat…demo',
        },
        exchange: {
          clearing: 'p2p',
          markets: ['politics', 'crypto', 'culture'],
        },
      };
    case 'NOV-001':
      return {
        kind: 'pph',
        venueId: 'pph_southfl',
        displayName: 'SouthFL PPH Desk',
        access: 'online',
        sports: ['NFL', 'NBA', 'MLB', 'Soccer', 'Boxing'],
        primaryState: 'FL',
        legalByState: [
          { state: 'FL', status: 'grey', notes: 'PPH agent desk — compliance review' },
          { state: 'NJ', status: 'prohibited' },
          { state: 'TX', status: 'grey' },
        ],
        credit: {
          mode: 'pph',
          creditLimit: 10_000,
          postedBalance: 0,
          settlementDays: 7,
          currency: 'USD',
        },
        pph: { shopName: 'SouthFL Agents', agentRef: 'agent:nov-onboard' },
      };
    case 'NOV-002':
      return {
        kind: 'postup_credit',
        venueId: 'postup_desk',
        displayName: 'House Post-Up Credit Line',
        access: 'hybrid',
        sports: ['NFL', 'NBA', 'MLB', 'Tennis'],
        primaryState: 'FL',
        legalByState: flLegal('restricted'),
        credit: {
          mode: 'postup',
          creditLimit: 5000,
          postedBalance: 5000,
          settlementDays: 3,
          currency: 'USD',
        },
      };
    default:
      return {
        kind: 'sportsbook',
        venueId: 'hardrock',
        displayName: 'Hard Rock Bet (Florida)',
        access: 'online',
        sports: ['NFL', 'NBA'],
        primaryState: 'FL',
        legalByState: flLegal('unknown'),
        credit: { mode: 'cash', currency: 'USD' },
      };
  }
}

/** Extra demo drums to broaden venue coverage (kiosk · crypto · FanDuel). */
export function extraDemoVenueAccounts(): Array<{
  partnerCode: 'ASH' | 'PAT';
  account: Omit<TocAccount, 'presence'>;
}> {
  return [
    {
      partnerCode: 'ASH',
      account: {
        callSign: 'ASH-004',
        status: 'Funded',
        warmupCount: 0,
        warmupProgress: { completed: 0, required: 2, tags: ['#KIOSK', '#FUNDED'] },
        capitalLocation: 'WithPartner',
        hardBalance: 500,
        primaryRailId: 'rail-ash-cashapp-1',
        gate12: {
          housePrincipalOutstanding: 500,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'Hard Rock Kiosk — Miami',
        flowStage: 'FUND',
        limits: {
          dailyMax: 1000,
          weeklyMax: 3000,
          rawText: 'Kiosk daily $1,000',
          checkedAt: '2026-07-23T10:00:00.000Z',
          screenshotRef: 'proof:ash-004-kiosk',
          freshness: 'fresh',
        },
        venue: {
          kind: 'kiosk',
          venueId: 'hr_kiosk_mia',
          displayName: 'Hard Rock Bet Kiosk — Miami Beach',
          access: 'kiosk',
          sports: ['NFL', 'NBA', 'MLB'],
          primaryState: 'FL',
          legalByState: flLegal('legal'),
          credit: { mode: 'cash', currency: 'USD' },
          kiosk: {
            locationLabel: 'Miami Beach walk-up #12',
            deviceId: 'kiosk-mia-12',
          },
        },
      },
    },
    {
      partnerCode: 'PAT',
      account: {
        callSign: 'PAT-004',
        status: 'WARMED',
        warmupCount: 2,
        warmupProgress: {
          completed: 2,
          required: 2,
          tags: ['#WARMED', '#CRYPTO', '#STAKE'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 2400,
        primaryRailId: 'rail-pat-cashapp-1',
        gate12: { housePrincipalOutstanding: 0, withdrawalMode: 'profit_split' },
        sportsbook: 'Stake.com',
        expertId: 'kai',
        flowStage: 'PLAY',
        limits: {
          dailyMax: 5000,
          weeklyMax: 20_000,
          rawText: 'Crypto book — soft limits',
          checkedAt: '2026-07-22T08:00:00.000Z',
          screenshotRef: 'proof:pat-004-stake',
          freshness: 'fresh',
        },
        venue: {
          kind: 'crypto',
          venueId: 'stake',
          displayName: 'Stake.com',
          access: 'online',
          sports: ['NFL', 'Soccer', 'Tennis', 'MMA', 'Crypto'],
          primaryState: 'FL',
          legalByState: [
            { state: 'FL', status: 'grey', notes: 'Offshore crypto book' },
            { state: 'NJ', status: 'prohibited' },
            { state: 'NY', status: 'prohibited' },
            { state: 'TX', status: 'grey' },
          ],
          credit: { mode: 'cash', currency: 'USDT' },
          crypto: {
            networks: ['ethereum', 'tron', 'bitcoin'],
            assets: ['USDT', 'BTC', 'ETH'],
            walletHint: 'stake:pat-demo',
          },
        },
      },
    },
    {
      partnerCode: 'PAT',
      account: {
        callSign: 'PAT-005',
        status: 'Warming',
        warmupCount: 1,
        warmupProgress: {
          completed: 1,
          required: 2,
          tags: ['#CYCLE-1', '#FANDUEL'],
        },
        capitalLocation: 'InSportsbook',
        hardBalance: 5100,
        primaryRailId: 'rail-pat-paypal-1',
        gate12: {
          housePrincipalOutstanding: 0,
          withdrawalMode: 'warmup_capital_return',
        },
        sportsbook: 'FanDuel',
        expertId: 'elena',
        flowStage: 'WARM',
        limits: {
          dailyMax: 2500,
          weeklyMax: 10_000,
          checkedAt: null,
          freshness: 'unknown',
        },
        venue: {
          kind: 'sportsbook',
          venueId: 'fanduel',
          displayName: 'FanDuel',
          access: 'online',
          sports: ['NFL', 'NBA', 'NCAAB', 'Golf'],
          primaryState: 'FL',
          legalByState: flLegal('legal'),
          credit: { mode: 'cash', currency: 'USD' },
        },
      },
    },
  ];
}

export function attachVenueToAccount(account: TocAccount): TocAccount {
  const venue = account.venue ?? demoVenueForCallSign(account.callSign);
  return {
    ...account,
    venue,
    sportsbook: account.sportsbook ?? venue.displayName,
  };
}

function openTasksForExtra(callSign: string): TocPartner['openTasks'] {
  if (callSign === 'ASH-004') {
    return [
      {
        taskId: 'WARM-ASH-004-20260723-130000-001',
        taskType: 'WARM',
        callSign: 'ASH-004',
        status: 'New',
        ballInCourt: 'Ops',
        nextAction: 'Kiosk funded — start cycle 1 dummy bet at device kiosk-mia-12',
        createdAt: '2026-07-23T13:00:00.000Z',
      },
    ];
  }
  if (callSign === 'PAT-005') {
    return [
      {
        taskId: 'WARM-PAT-005-20260723-110000-001',
        taskType: 'WARM',
        callSign: 'PAT-005',
        status: 'PendingPartner',
        ballInCourt: 'Partner',
        nextAction: 'Complete FanDuel cycle 2 WD after settlement',
        createdAt: '2026-07-23T11:00:00.000Z',
      },
    ];
  }
  return [];
}

export function attachVenuesToPartners(partners: TocPartner[]): TocPartner[] {
  const extras = extraDemoVenueAccounts();
  return partners.map(p => {
    const addons = extras
      .filter(e => e.partnerCode === p.partnerCode)
      .map(e => attachVenueToAccount(e.account as TocAccount));
    const accounts = [...p.accounts.map(attachVenueToAccount), ...addons];
    const accountScores = [
      ...p.readiness.accountScores,
      ...addons.map(a => ({
        callSign: a.callSign,
        score: a.status === 'WARMED' ? 0.7 : a.status === 'Warming' ? 0.4 : 0.25,
        playable: a.status === 'WARMED' && a.venue?.kind === 'sportsbook',
        factors: [
          a.venue?.kind ?? 'venue',
          a.venue?.venueId ?? 'unknown',
          a.venue?.access ?? 'online',
        ],
      })),
    ];
    const extraTasks = addons.flatMap(a => openTasksForExtra(a.callSign));
    return {
      ...p,
      accounts,
      openTasks: [...p.openTasks, ...extraTasks],
      readiness: {
        ...p.readiness,
        accountScores,
        playableAccountCount: accounts.filter(
          a =>
            a.status === 'WARMED' &&
            a.gate12.housePrincipalOutstanding === 0 &&
            (a.venue?.kind === 'sportsbook' ||
              a.venue?.kind === 'exchange' ||
              a.venue?.kind === 'crypto')
        ).length,
      },
    };
  });
}

function bump(map: Record<string, number>, key: string | undefined): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

export function summarizeVenues(partners: TocPartner[]): TocVenueSummary {
  const byVenueKind: Record<string, number> = {};
  const byVenueId: Record<string, number> = {};
  const byAccess: Record<string, number> = {};
  const byPrimaryState: Record<string, number> = {};
  const byLegalStatus: Record<string, number> = {};
  const bySport: Record<string, number> = {};
  const states = new Set<string>();
  let withCredit = 0;
  let withCrypto = 0;
  let withExchange = 0;
  let withKiosk = 0;
  let withInPerson = 0;

  for (const p of partners) {
    for (const a of p.accounts) {
      const v = a.venue;
      if (!v) continue;
      bump(byVenueKind, v.kind);
      bump(byVenueId, v.venueId);
      bump(byAccess, v.access);
      bump(byPrimaryState, v.primaryState);
      if (v.credit && v.credit.mode !== 'cash') withCredit++;
      if (v.crypto) withCrypto++;
      if (v.exchange || v.kind === 'exchange' || v.kind === 'prediction_market') withExchange++;
      if (v.kind === 'kiosk' || v.access === 'kiosk') withKiosk++;
      if (v.kind === 'in_person' || v.access === 'in_person') withInPerson++;
      for (const s of v.sports) bump(bySport, s);
      for (const L of v.legalByState) {
        states.add(L.state);
        bump(byLegalStatus, L.status);
      }
    }
  }

  return {
    accountsWithVenue: Object.values(byVenueKind).reduce((n, c) => n + c, 0),
    byVenueKind,
    byVenueId,
    byAccess,
    byPrimaryState,
    byLegalStatus,
    bySport,
    legalStatesCovered: states.size,
    creditLines: withCredit,
    cryptoAccounts: withCrypto,
    exchangeAccounts: withExchange,
    kioskAccounts: withKiosk,
    inPersonAccounts: withInPerson,
  };
}
