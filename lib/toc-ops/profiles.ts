/**
 * TOC Ops partner + agent profiles — phones, assets, telegram, deals,
 * accounting, CLV, expert liquidity pools (demo plane).
 *
 * @see lib/toc-ops/types.ts
 * @see docs/harness/tenants/toc-ops.md
 */
import type {
  TocAgentProfile,
  TocExpert,
  TocPartner,
  TocPartnerProfile,
  TocProfilesSummary,
} from './types.ts';

function deal70(
  dealId: string, // brand-ok
  name: string,
  effectiveAt: string,
  notes?: string
) {
  return {
    dealId,
    name,
    partnerPct: 70,
    expertPct: 20,
    housePct: 10,
    payoutCadence: 'weekly' as const,
    payoutMethod: 'rail' as const,
    termMonths: 12,
    effectiveAt,
    notes,
  };
}

export function demoPartnerProfile(
  code: 'ASH' | 'PAT' | 'NOV',
  partner: TocPartner
): TocPartnerProfile {
  const soft = partner.softBalance.byStakeholder;
  const hardInBook = partner.accounts.reduce((n, a) => n + a.hardBalance, 0);
  const wagerPlaces = partner.accounts
    .filter(a => a.venue)
    .map(a => ({
      venueId: a.venue!.venueId,
      label: a.venue!.displayName,
      kind: a.venue!.kind,
    }));
  const preferredMarkets = [...new Set(partner.accounts.flatMap(a => a.venue?.sports ?? []))].slice(
    0,
    8
  );

  if (code === 'ASH') {
    return {
      displayName: 'Cascade Partner (ASH)',
      tier: 'T2',
      risk: 'yellow',
      phones: [
        {
          id: 'phone-ash-001',
          label: 'ASH primary iPhone',
          e164: '+13055550101',
          carrier: 'Verizon',
          dataPlan: {
            name: 'Unlimited+',
            gbMonth: 50,
            usedGb: 18.4,
            hotspot: true,
            renewsAt: '2026-08-01T00:00:00.000Z',
          },
          status: 'active',
          assignedCallSign: 'ASH-001',
        },
        {
          id: 'phone-ash-002',
          label: 'ASH warm burner',
          e164: '+13055550102',
          carrier: 'T-Mobile',
          dataPlan: {
            name: 'Essentials',
            gbMonth: 15,
            usedGb: 6.1,
            hotspot: false,
          },
          status: 'warming',
          assignedCallSign: 'ASH-002',
        },
      ],
      assets: [
        {
          id: 'asset-ash-mac',
          kind: 'device',
          label: 'MacBook desk',
          status: 'active',
          meta: { os: 'macOS', role: 'ops' },
        },
        {
          id: 'asset-ash-venmo',
          kind: 'rail',
          label: 'Venmo CASHOUT',
          ref: 'rail-ash-venmo-1',
          status: 'active',
        },
        {
          id: 'asset-ash-kyc',
          kind: 'document',
          label: 'KYC pack',
          ref: 'proof:ash-onb-kyc',
          status: 'active',
        },
      ],
      telegram: {
        chatId: 'tg:chat:ash-ops',
        groupId: 'tg:group:ash-demo',
        channelId: 'tg:channel:ash-plays',
        botUsername: '@TOC_Ash_bot',
        dmRef: partner.telegramRef,
        topics: [
          { name: 'plays', threadId: 11 },
          { name: 'rails', threadId: 12 },
          { name: 'limits', threadId: 13 },
        ],
      },
      playChannels: [
        { kind: 'telegram', ref: 'tg:channel:ash-plays', primary: true, status: 'live' },
        { kind: 'bot', ref: '@TOC_Ash_bot', primary: false, status: 'live' },
        { kind: 'portal', ref: '/portal/toc/#partner-ASH', primary: false, status: 'live' },
      ],
      payments: [
        {
          id: 'pay-ash-wd-001',
          method: 'venmo',
          direction: 'out',
          amount: 403,
          currency: 'USD',
          status: 'posted',
          at: '2026-07-21T21:15:00.000Z',
          railId: 'rail-ash-venmo-1',
          note: 'Partner ProfitSplit',
        },
        {
          id: 'pay-ash-fund-002',
          method: 'cashapp',
          direction: 'in',
          amount: 5000,
          currency: 'USD',
          status: 'posted',
          at: '2026-07-18T16:05:00.000Z',
          railId: 'rail-ash-cashapp-1',
          note: 'FUND ASH-002',
        },
      ],
      accounting: {
        softPartner: soft.Partner,
        softExpert: soft.Expert,
        softHouse: soft.House,
        hardInBook,
        hardFloat: 0,
        pendingDeploy: partner.softBalance.pendingDeployments.totalAmount,
        pendingPayout: 0,
        currency: 'USD',
      },
      deals: [
        deal70('deal-ash-std-2026', 'ASH standard 70/20/10', '2026-06-01T00:00:00.000Z'),
        {
          dealId: 'deal-ash-kiosk-add',
          name: 'Kiosk addendum',
          partnerPct: 65,
          expertPct: 25,
          housePct: 10,
          payoutCadence: 'weekly',
          payoutMethod: 'rail',
          effectiveAt: '2026-07-20T00:00:00.000Z',
          notes: 'ASH-004 kiosk stakes only',
        },
      ],
      history: [
        {
          at: '2026-07-10T08:00:00.000Z',
          kind: 'onboard',
          summary: 'Partner Ready + package bound',
        },
        {
          at: '2026-07-17T23:40:00.000Z',
          kind: 'play_settle',
          summary: 'ASH-001 NFL win +$240',
          callSign: 'ASH-001',
          amount: 240,
        },
        {
          at: '2026-07-23T12:00:00.000Z',
          kind: 'limit_flag',
          summary: 'ASH-003 LIMIT-EX-02 — reallocate',
          callSign: 'ASH-003',
        },
      ],
      limits: {
        dailyMax: 2500,
        weeklyMax: 10_000,
        perPlayMax: 1500,
        exposureCap: 20_000,
        notes: 'Stale LIMIT on ASH-001 blocks new PLAY until refresh',
      },
      wagerPlaces,
      preferredMarkets,
      bot: {
        username: '@TOC_Ash_bot',
        status: 'live',
        commands: ['/status', '/limits', '/rails'],
      },
    };
  }

  if (code === 'PAT') {
    return {
      displayName: 'Factory Rail Co (PAT)',
      tier: 'T1',
      risk: 'green',
      phones: [
        {
          id: 'phone-pat-001',
          label: 'PAT PLAY phone',
          e164: '+14075550111',
          carrier: 'AT&T',
          dataPlan: {
            name: 'Unlimited Elite',
            gbMonth: 100,
            usedGb: 42.0,
            hotspot: true,
            renewsAt: '2026-08-05T00:00:00.000Z',
          },
          status: 'active',
          assignedCallSign: 'PAT-001',
        },
        {
          id: 'phone-pat-crypto',
          label: 'PAT crypto desk tablet SIM',
          e164: '+14075550114',
          carrier: 'Visible',
          dataPlan: { name: 'Basic', gbMonth: 20, usedGb: 9.2, hotspot: true },
          status: 'active',
          assignedCallSign: 'PAT-004',
        },
      ],
      assets: [
        {
          id: 'asset-pat-cashapp',
          kind: 'rail',
          label: 'CashApp CASHOUT',
          ref: 'rail-pat-cashapp-1',
          status: 'active',
        },
        {
          id: 'asset-pat-paypal',
          kind: 'rail',
          label: 'PayPal CASHOUT',
          ref: 'rail-pat-paypal-1',
          status: 'active',
        },
        {
          id: 'asset-pat-wallet',
          kind: 'wallet',
          label: 'Polymarket USDC',
          ref: '0xpat…demo',
          status: 'active',
          meta: { chain: 'polygon', asset: 'USDC' },
        },
      ],
      telegram: {
        chatId: 'tg:chat:pat-ops',
        groupId: 'tg:group:pat-demo',
        channelId: 'tg:channel:pat-plays',
        botUsername: '@TOC_Pat_bot',
        dmRef: partner.telegramRef,
        topics: [
          { name: 'plays', threadId: 21 },
          { name: 'exchanges', threadId: 22 },
          { name: 'crypto', threadId: 23 },
        ],
      },
      playChannels: [
        { kind: 'telegram', ref: 'tg:channel:pat-plays', primary: true, status: 'live' },
        { kind: 'bot', ref: '@TOC_Pat_bot', primary: true, status: 'live' },
        { kind: 'portal', ref: '/portal/toc/#partner-PAT', primary: false, status: 'live' },
      ],
      payments: [
        {
          id: 'pay-pat-split-001',
          method: 'cashapp',
          direction: 'out',
          amount: 840,
          currency: 'USD',
          status: 'posted',
          at: '2026-07-20T18:50:00.000Z',
          railId: 'rail-pat-cashapp-1',
          note: 'Partner ProfitSplit NFL',
        },
        {
          id: 'pay-pat-poly-001',
          method: 'crypto',
          direction: 'in',
          amount: 5000,
          currency: 'USDC',
          status: 'pending',
          at: '2026-07-23T09:25:00.000Z',
          note: 'PAT-003 Polymarket fund confirm',
        },
      ],
      accounting: {
        softPartner: soft.Partner,
        softExpert: soft.Expert,
        softHouse: soft.House,
        hardInBook,
        hardFloat: 0,
        pendingDeploy: partner.softBalance.pendingDeployments.totalAmount,
        pendingPayout: 0,
        currency: 'USD',
      },
      deals: [
        deal70(
          'deal-pat-std-2026',
          'PAT standard 70/20/10',
          '2026-05-01T00:00:00.000Z',
          'Includes Kalshi + Stake addenda'
        ),
        {
          dealId: 'deal-pat-exchange',
          name: 'Exchange / prediction cut',
          partnerPct: 60,
          expertPct: 25,
          housePct: 15,
          payoutCadence: 'weekly',
          payoutMethod: 'crypto',
          effectiveAt: '2026-07-01T00:00:00.000Z',
          notes: 'Kalshi + Polymarket only',
        },
      ],
      history: [
        {
          at: '2026-07-12T22:00:00.000Z',
          kind: 'play_settle',
          summary: 'PAT-001 prior cycle win +$800',
          callSign: 'PAT-001',
          amount: 800,
        },
        {
          at: '2026-07-20T22:10:00.000Z',
          kind: 'play_settle',
          summary: 'PAT-001 NFL win +$1200',
          callSign: 'PAT-001',
          amount: 1200,
        },
        {
          at: '2026-07-22T15:20:00.000Z',
          kind: 'play_open',
          summary: 'PAT-001 NBA pending',
          callSign: 'PAT-001',
        },
      ],
      limits: {
        dailyMax: 3000,
        weeklyMax: 12_000,
        perPlayMax: 2000,
        exposureCap: 35_000,
        notes: 'PAT-002 Gate12 principal recovery before profit PLAY',
      },
      wagerPlaces,
      preferredMarkets,
      bot: {
        username: '@TOC_Pat_bot',
        status: 'live',
        commands: ['/status', '/play', '/kalshi', '/stake'],
      },
    };
  }

  // NOV
  return {
    displayName: 'NOV Onboarding',
    tier: 'T4',
    risk: 'orange',
    phones: [
      {
        id: 'phone-nov-001',
        label: 'NOV onboarding phone',
        e164: '+19045550199',
        carrier: 'Mint Mobile',
        dataPlan: {
          name: '15GB',
          gbMonth: 15,
          usedGb: 2.0,
          hotspot: false,
          renewsAt: '2026-08-10T00:00:00.000Z',
        },
        status: 'active',
        assignedCallSign: 'NOV-001',
      },
    ],
    assets: [
      {
        id: 'asset-nov-venmo',
        kind: 'rail',
        label: 'Venmo (confirmed)',
        ref: 'rail-nov-venmo-1',
        status: 'active',
      },
      {
        id: 'asset-nov-cashapp',
        kind: 'rail',
        label: 'CashApp (pending)',
        ref: 'rail-nov-cashapp-1',
        status: 'pending',
      },
      {
        id: 'asset-nov-kyc',
        kind: 'document',
        label: 'KYC incomplete',
        status: 'pending',
      },
    ],
    telegram: {
      chatId: 'tg:dm:nov-onboarding',
      dmRef: partner.telegramRef,
      botUsername: '@TOC_Onboard_bot',
      topics: [{ name: 'onboarding', threadId: 1 }],
    },
    playChannels: [
      { kind: 'telegram', ref: 'tg:dm:nov-onboarding', primary: true, status: 'setup' },
      { kind: 'bot', ref: '@TOC_Onboard_bot', primary: true, status: 'setup' },
      { kind: 'sms', ref: '+19045550199', primary: false, status: 'paused' },
    ],
    payments: [
      {
        id: 'pay-nov-fund-001',
        method: 'venmo',
        direction: 'in',
        amount: 5000,
        currency: 'USD',
        status: 'pending',
        at: '2026-07-22T14:05:00.000Z',
        railId: 'rail-nov-venmo-1',
        note: 'FUND-NOV-002 awaiting receipt screenshot',
      },
    ],
    accounting: {
      softPartner: soft.Partner,
      softExpert: soft.Expert,
      softHouse: soft.House,
      hardInBook,
      hardFloat: 0,
      pendingDeploy: partner.softBalance.pendingDeployments.totalAmount,
      pendingPayout: 0,
      currency: 'USD',
    },
    deals: [
      {
        dealId: 'deal-nov-onboard',
        name: 'NOV provisional 70/20/10',
        partnerPct: 70,
        expertPct: 20,
        housePct: 10,
        payoutCadence: 'weekly',
        payoutMethod: 'rail',
        termMonths: 3,
        effectiveAt: '2026-07-22T00:00:00.000Z',
        notes: 'Activates on Ready; PPH desk provisional',
      },
    ],
    history: [
      {
        at: '2026-07-22T10:00:00.000Z',
        kind: 'onboard',
        summary: 'ONB opened — Venmo rail confirmed',
      },
      {
        at: '2026-07-22T14:00:00.000Z',
        kind: 'fund',
        summary: 'FUND-NOV-002 Processing — receipt pending',
        callSign: 'NOV-002',
        amount: 5000,
      },
    ],
    limits: {
      dailyMax: null,
      weeklyMax: null,
      perPlayMax: null,
      exposureCap: 5000,
      notes: 'No PLAY until ONB Ready + WARM complete',
    },
    wagerPlaces,
    preferredMarkets: preferredMarkets.length ? preferredMarkets : ['NFL', 'NBA'],
    bot: {
      username: '@TOC_Onboard_bot',
      status: 'setup',
      commands: ['/start', '/upload', '/ready'],
    },
  };
}

export function demoAgentProfile(expertId: string): TocAgentProfile | undefined {
  // brand-ok — experts.id fixture key
  if (expertId === 'marcus') {
    return {
      handle: '@marcus.nfl',
      style: {
        aggression: 'balanced',
        stakeBand: { min: 500, max: 2500, typical: 1200 },
        marketFocus: ['NFL', 'NBA', 'MLB'],
        holdTimeHint: 'early',
        notes: 'Favors sides with CLV history on HR / DK',
      },
      clv: {
        sampleN: 86,
        avgClvBps: 18.4,
        winRateWhenPositiveClv: 0.57,
        last30dAvgClvBps: 21.2,
        beatsClosePct: 0.62,
      },
      liquidity: {
        allocated: 40_000,
        available: 28_500,
        reserved: 4_200,
        currency: 'USD',
        byMarket: [
          { market: 'NFL', allocated: 18_000, available: 12_000 },
          { market: 'NBA', allocated: 12_000, available: 9_000 },
          { market: 'MLB', allocated: 10_000, available: 7_500 },
        ],
        lastReconciledAt: '2026-07-23T20:00:00.000Z',
      },
      telegram: {
        chatId: 'tg:chat:marcus',
        groupId: 'tg:group:experts',
        channelId: 'tg:channel:marcus-plays',
        botUsername: '@TOC_Expert_Marcus_bot',
        topics: [
          { name: 'releases', threadId: 101 },
          { name: 'clv', threadId: 102 },
        ],
      },
      playChannels: [
        {
          kind: 'telegram',
          ref: 'tg:channel:marcus-plays',
          primary: true,
          status: 'live',
        },
        { kind: 'bot', ref: '@TOC_Expert_Marcus_bot', primary: true, status: 'live' },
      ],
      payments: [
        {
          id: 'pay-marcus-cut-001',
          method: 'ach',
          direction: 'out',
          amount: 480,
          currency: 'USD',
          status: 'posted',
          at: '2026-07-21T12:00:00.000Z',
          note: 'Expert cut week 29',
        },
      ],
      accounting: { pendingCut: 240, paidYtd: 12_400, currency: 'USD' },
      deals: [deal70('deal-marcus-house', 'Marcus house cut 20%', '2026-01-01T00:00:00.000Z')],
      history: [
        {
          at: '2026-07-17T19:10:00.000Z',
          kind: 'release',
          summary: 'ASH-001 BUF ML released',
          callSign: 'ASH-001',
        },
        {
          at: '2026-07-22T12:00:00.000Z',
          kind: 'block',
          summary: 'PAT-002 PLAY-EX-01 stake > limit',
          callSign: 'PAT-002',
        },
      ],
      limits: {
        dailyMax: 8_000,
        weeklyMax: 40_000,
        perPlayMax: 2500,
        exposureCap: 40_000,
      },
      phones: [
        {
          id: 'phone-marcus',
          label: 'Marcus desk',
          e164: '+18135550201',
          carrier: 'Verizon',
          dataPlan: { name: 'Business', gbMonth: 50, usedGb: 22, hotspot: true },
          status: 'active',
        },
      ],
      markets: ['NFL', 'NBA', 'MLB'],
      wagerPlaces: [
        { venueId: 'hardrock', label: 'Hard Rock Bet' },
        { venueId: 'draftkings', label: 'DraftKings' },
      ],
      bot: { username: '@TOC_Expert_Marcus_bot', status: 'live' },
    };
  }

  if (expertId === 'elena') {
    return {
      handle: '@elena.edges',
      style: {
        aggression: 'conservative',
        stakeBand: { min: 400, max: 1800, typical: 900 },
        marketFocus: ['NFL', 'Tennis', 'NBA'],
        holdTimeHint: 'mixed',
        notes: 'Tennis CLV specialist; smaller tickets',
      },
      clv: {
        sampleN: 64,
        avgClvBps: 24.1,
        winRateWhenPositiveClv: 0.61,
        last30dAvgClvBps: 26.8,
        beatsClosePct: 0.68,
      },
      liquidity: {
        allocated: 25_000,
        available: 19_200,
        reserved: 2_100,
        currency: 'USD',
        byMarket: [
          { market: 'NFL', allocated: 10_000, available: 7_500 },
          { market: 'Tennis', allocated: 9_000, available: 7_200 },
          { market: 'NBA', allocated: 6_000, available: 4_500 },
        ],
        lastReconciledAt: '2026-07-23T20:00:00.000Z',
      },
      telegram: {
        chatId: 'tg:chat:elena',
        groupId: 'tg:group:experts',
        channelId: 'tg:channel:elena-plays',
        botUsername: '@TOC_Expert_Elena_bot',
        topics: [{ name: 'releases', threadId: 201 }],
      },
      playChannels: [
        {
          kind: 'telegram',
          ref: 'tg:channel:elena-plays',
          primary: true,
          status: 'live',
        },
        { kind: 'bot', ref: '@TOC_Expert_Elena_bot', primary: true, status: 'live' },
      ],
      payments: [
        {
          id: 'pay-elena-cut-001',
          method: 'paypal',
          direction: 'out',
          amount: 320,
          currency: 'USD',
          status: 'posted',
          at: '2026-07-21T12:05:00.000Z',
        },
      ],
      accounting: { pendingCut: 180, paidYtd: 8_900, currency: 'USD' },
      deals: [deal70('deal-elena-house', 'Elena house cut 20%', '2026-02-01T00:00:00.000Z')],
      history: [
        {
          at: '2026-07-20T16:05:00.000Z',
          kind: 'release',
          summary: 'PAT-001 PHI -3',
          callSign: 'PAT-001',
        },
        {
          at: '2026-07-21T15:05:00.000Z',
          kind: 'release',
          summary: 'ASH-001 Alcaraz ML',
          callSign: 'ASH-001',
        },
      ],
      limits: {
        dailyMax: 5_000,
        weeklyMax: 25_000,
        perPlayMax: 1800,
        exposureCap: 25_000,
      },
      phones: [
        {
          id: 'phone-elena',
          label: 'Elena travel',
          e164: '+13055550303',
          carrier: 'AT&T',
          dataPlan: { name: 'Intl+', gbMonth: 30, usedGb: 11, hotspot: true },
          status: 'active',
        },
      ],
      markets: ['NFL', 'Tennis', 'NBA'],
      wagerPlaces: [
        { venueId: 'draftkings', label: 'DraftKings' },
        { venueId: 'fanduel', label: 'FanDuel' },
        { venueId: 'hardrock', label: 'Hard Rock Bet' },
      ],
      bot: { username: '@TOC_Expert_Elena_bot', status: 'live' },
    };
  }

  if (expertId === 'kai') {
    return {
      handle: '@kai.alts',
      style: {
        aggression: 'aggressive',
        stakeBand: { min: 200, max: 3000, typical: 800 },
        marketFocus: ['MLB', 'Soccer', 'Crypto', 'Politics'],
        holdTimeHint: 'same_game',
        notes: 'Alt venues: Stake · Kalshi · Polymarket',
      },
      clv: {
        sampleN: 41,
        avgClvBps: 9.2,
        winRateWhenPositiveClv: 0.52,
        last30dAvgClvBps: 11.0,
        beatsClosePct: 0.55,
      },
      liquidity: {
        allocated: 18_000,
        available: 11_400,
        reserved: 3_600,
        currency: 'USD',
        byMarket: [
          { market: 'MLB', allocated: 6_000, available: 4_000 },
          { market: 'Soccer', allocated: 5_000, available: 3_200 },
          { market: 'Politics', allocated: 4_000, available: 2_800 },
          { market: 'Crypto', allocated: 3_000, available: 1_400 },
        ],
        lastReconciledAt: '2026-07-23T20:00:00.000Z',
      },
      telegram: {
        chatId: 'tg:chat:kai',
        groupId: 'tg:group:experts',
        channelId: 'tg:channel:kai-plays',
        botUsername: '@TOC_Expert_Kai_bot',
        topics: [
          { name: 'releases', threadId: 301 },
          { name: 'crypto', threadId: 302 },
        ],
      },
      playChannels: [
        { kind: 'telegram', ref: 'tg:channel:kai-plays', primary: true, status: 'live' },
        { kind: 'bot', ref: '@TOC_Expert_Kai_bot', primary: true, status: 'live' },
      ],
      payments: [
        {
          id: 'pay-kai-usdc-001',
          method: 'crypto',
          direction: 'out',
          amount: 210,
          currency: 'USDC',
          status: 'posted',
          at: '2026-07-21T13:00:00.000Z',
        },
      ],
      accounting: { pendingCut: 95, paidYtd: 4_100, currency: 'USD' },
      deals: [
        {
          dealId: 'deal-kai-alts',
          name: 'Kai alts 25% expert',
          partnerPct: 60,
          expertPct: 25,
          housePct: 15,
          payoutCadence: 'weekly',
          payoutMethod: 'crypto',
          effectiveAt: '2026-06-15T00:00:00.000Z',
        },
      ],
      history: [
        {
          at: '2026-07-19T17:20:00.000Z',
          kind: 'release',
          summary: 'ASH-001 LAD -1.5 (loss)',
          callSign: 'ASH-001',
          amount: -600,
        },
      ],
      limits: {
        dailyMax: 6_000,
        weeklyMax: 20_000,
        perPlayMax: 3000,
        exposureCap: 18_000,
      },
      phones: [
        {
          id: 'phone-kai',
          label: 'Kai crypto desk',
          e164: '+14075550404',
          carrier: 'Visible',
          dataPlan: { name: 'Unlimited', gbMonth: 40, usedGb: 28, hotspot: true },
          status: 'active',
        },
      ],
      markets: ['MLB', 'Soccer', 'Crypto', 'Politics'],
      wagerPlaces: [
        { venueId: 'stake', label: 'Stake.com' },
        { venueId: 'kalshi', label: 'Kalshi' },
        { venueId: 'polymarket', label: 'Polymarket' },
      ],
      bot: { username: '@TOC_Expert_Kai_bot', status: 'live' },
    };
  }

  return undefined;
}

function velocityFromPartner(p: TocPartner): NonNullable<TocPartnerProfile['velocity']> {
  const weekAgo = Date.parse('2026-07-17T00:00:00.000Z');
  const plays7d = p.recentPlays.filter(pl => Date.parse(pl.placedAt) >= weekAgo);
  const settles7d = plays7d.filter(pl => pl.status === 'settled');
  const t7d = p.softBalance.recentEntries
    .filter(e => e.entryType === 'ProfitSplit' && Date.parse(e.timestamp) >= weekAgo)
    .reduce((n, e) => n + e.amount, 0);
  const stakes = plays7d.map(pl => pl.stake);
  return {
    t7d,
    plays7d: plays7d.length,
    settles7d: settles7d.length,
    avgStake7d:
      stakes.length === 0 ? 0 : Math.round(stakes.reduce((a, b) => a + b, 0) / stakes.length),
  };
}

/** Append denser payments · history · comms · velocity on top of base demo profile. */
export function deepenPartnerProfile(
  code: 'ASH' | 'PAT' | 'NOV',
  partner: TocPartner,
  base: TocPartnerProfile
): TocPartnerProfile {
  const extraPay =
    code === 'ASH'
      ? [
          {
            id: 'pay-ash-tennis-001',
            method: 'venmo' as const,
            direction: 'out' as const,
            amount: 235,
            currency: 'USD',
            status: 'posted' as const,
            at: '2026-07-21T21:20:00.000Z',
            railId: 'rail-ash-venmo-1',
            note: 'Partner cut tennis settle',
          },
          {
            id: 'pay-ash-kiosk-fund',
            method: 'cashapp' as const,
            direction: 'in' as const,
            amount: 500,
            currency: 'USD',
            status: 'posted' as const,
            at: '2026-07-23T10:05:00.000Z',
            railId: 'rail-ash-cashapp-1',
            note: 'ASH-004 kiosk seed',
          },
          {
            id: 'pay-ash-expert-cut',
            method: 'ach' as const,
            direction: 'out' as const,
            amount: 115,
            currency: 'USD',
            status: 'posted' as const,
            at: '2026-07-22T09:00:00.000Z',
            note: 'Expert Soft settlement batch',
          },
        ]
      : code === 'PAT'
        ? [
            {
              id: 'pay-pat-prior-001',
              method: 'cashapp' as const,
              direction: 'out' as const,
              amount: 560,
              currency: 'USD',
              status: 'posted' as const,
              at: '2026-07-12T19:40:00.000Z',
              railId: 'rail-pat-cashapp-1',
              note: 'Prior-cycle Partner ProfitSplit',
            },
            {
              id: 'pay-pat-stake-001',
              method: 'crypto' as const,
              direction: 'out' as const,
              amount: 420,
              currency: 'USDT',
              status: 'posted' as const,
              at: '2026-07-22T08:30:00.000Z',
              note: 'Stake.com Partner share',
            },
            {
              id: 'pay-pat-kalshi-001',
              method: 'ach' as const,
              direction: 'in' as const,
              amount: 800,
              currency: 'USD',
              status: 'posted' as const,
              at: '2026-07-21T16:00:00.000Z',
              note: 'Kalshi event contract settle',
            },
            {
              id: 'pay-pat-pending-wd',
              method: 'paypal' as const,
              direction: 'out' as const,
              amount: 5000,
              currency: 'USD',
              status: 'pending' as const,
              at: '2026-07-23T16:30:00.000Z',
              railId: 'rail-pat-paypal-1',
              note: 'PAT-002 principal_recovery WD queued',
            },
          ]
        : [
            {
              id: 'pay-nov-rail-test',
              method: 'venmo' as const,
              direction: 'out' as const,
              amount: 1,
              currency: 'USD',
              status: 'posted' as const,
              at: '2026-07-22T10:30:00.000Z',
              railId: 'rail-nov-venmo-1',
              note: 'Rail confirm $1 test',
            },
            {
              id: 'pay-nov-package-fee',
              method: 'cashapp' as const,
              direction: 'in' as const,
              amount: 0,
              currency: 'USD',
              status: 'pending' as const,
              at: '2026-07-23T08:00:00.000Z',
              note: 'Onboarding package fee hold',
            },
          ];

  const extraHist =
    code === 'ASH'
      ? [
          {
            at: '2026-07-15T18:00:00.000Z',
            kind: 'fund',
            summary: 'ASH-001 corridor FUND $5000',
            callSign: 'ASH-001',
            amount: 5000,
          },
          {
            at: '2026-07-16T14:30:00.000Z',
            kind: 'warm',
            summary: 'ASH-001 cycle complete · CostOfPriming $20',
            callSign: 'ASH-001',
            amount: -20,
          },
          {
            at: '2026-07-19T22:05:00.000Z',
            kind: 'play_settle',
            summary: 'ASH-001 MLB loss −$600',
            callSign: 'ASH-001',
            amount: -600,
          },
          {
            at: '2026-07-21T20:40:00.000Z',
            kind: 'play_settle',
            summary: 'ASH-001 Tennis win +$336',
            callSign: 'ASH-001',
            amount: 336,
          },
          {
            at: '2026-07-23T13:00:00.000Z',
            kind: 'fund',
            summary: 'ASH-004 kiosk funded $500',
            callSign: 'ASH-004',
            amount: 500,
          },
        ]
      : code === 'PAT'
        ? [
            {
              at: '2026-07-14T23:00:00.000Z',
              kind: 'play_settle',
              summary: 'PAT-001 MLB loss −$180',
              callSign: 'PAT-001',
              amount: -180,
            },
            {
              at: '2026-07-21T16:00:00.000Z',
              kind: 'exchange_settle',
              summary: 'PAT-002 Kalshi politics +$800',
              callSign: 'PAT-002',
              amount: 800,
            },
            {
              at: '2026-07-22T08:20:00.000Z',
              kind: 'play_settle',
              summary: 'PAT-004 Stake soccer +$600',
              callSign: 'PAT-004',
              amount: 600,
            },
            {
              at: '2026-07-23T09:00:00.000Z',
              kind: 'fund',
              summary: 'PAT-003 PayPal corridor funded',
              callSign: 'PAT-003',
              amount: 5000,
            },
            {
              at: '2026-07-23T11:00:00.000Z',
              kind: 'warm',
              summary: 'PAT-005 FanDuel cycle 1 open',
              callSign: 'PAT-005',
            },
          ]
        : [
            {
              at: '2026-07-22T10:30:00.000Z',
              kind: 'rail',
              summary: 'Venmo profile confirmed + $1 test',
            },
            {
              at: '2026-07-22T11:00:00.000Z',
              kind: 'comms',
              summary: 'Onboarding pack sent via @TOC_Onboard_bot',
            },
            {
              at: '2026-07-23T09:00:00.000Z',
              kind: 'ping',
              summary: 'Partner ping — KYC checklist incomplete',
            },
          ];

  const commsLog =
    code === 'NOV'
      ? [
          {
            at: '2026-07-22T10:05:00.000Z',
            channel: 'telegram' as const,
            direction: 'out' as const,
            summary: 'Welcome + KYC checklist',
          },
          {
            at: '2026-07-22T14:10:00.000Z',
            channel: 'sms' as const,
            direction: 'out' as const,
            summary: 'FUND receipt reminder',
          },
          {
            at: '2026-07-23T09:15:00.000Z',
            channel: 'telegram' as const,
            direction: 'in' as const,
            summary: 'Partner: uploading Venmo screenshot',
          },
        ]
      : code === 'PAT'
        ? [
            {
              at: '2026-07-22T15:25:00.000Z',
              channel: 'telegram' as const,
              direction: 'out' as const,
              summary: 'PLAY card — MIA ML @ +130',
            },
            {
              at: '2026-07-22T16:00:00.000Z',
              channel: 'telegram' as const,
              direction: 'in' as const,
              summary: 'Partner ack — placing',
            },
            {
              at: '2026-07-23T12:05:00.000Z',
              channel: 'sms' as const,
              direction: 'out' as const,
              summary: 'WARM PAT-003 kickoff nudge',
            },
          ]
        : [
            {
              at: '2026-07-20T09:10:00.000Z',
              channel: 'telegram' as const,
              direction: 'out' as const,
              summary: 'LIMIT refresh request ASH-001',
            },
            {
              at: '2026-07-23T12:05:00.000Z',
              channel: 'telegram' as const,
              direction: 'out' as const,
              summary: 'LIMIT-EX-02 WD instructions ASH-003',
            },
          ];

  const extraAssets =
    code === 'PAT'
      ? [
          {
            id: 'asset-pat-kalshi-key',
            kind: 'other' as const,
            label: 'Kalshi API key (env)',
            ref: 'KALSHI_API_KEY',
            status: 'active' as const,
            meta: { venue: 'kalshi' },
          },
          {
            id: 'asset-pat-ipad',
            kind: 'device' as const,
            label: 'PAT exchange iPad',
            status: 'active' as const,
            meta: { role: 'kalshi_desk' },
          },
        ]
      : code === 'ASH'
        ? [
            {
              id: 'asset-ash-kiosk-badge',
              kind: 'other' as const,
              label: 'Kiosk attendant badge',
              ref: 'kiosk-mia-12',
              status: 'active' as const,
            },
          ]
        : [
            {
              id: 'asset-nov-checklist',
              kind: 'document' as const,
              label: 'ONB checklist PDF',
              ref: 'proof:nov-onb-checklist',
              status: 'pending' as const,
            },
          ];

  const extraPhone =
    code === 'PAT'
      ? [
          {
            id: 'phone-pat-005',
            label: 'PAT FanDuel warm phone',
            e164: '+14075550115',
            carrier: 'AT&T',
            dataPlan: {
              name: 'Unlimited Elite',
              gbMonth: 50,
              usedGb: 8.5,
              hotspot: true,
            },
            status: 'warming' as const,
            assignedCallSign: 'PAT-005',
          },
        ]
      : [];

  return {
    ...base,
    phones: [...base.phones, ...extraPhone],
    assets: [...base.assets, ...extraAssets],
    payments: [...base.payments, ...extraPay],
    history: [...base.history, ...extraHist].sort((a, b) => a.at.localeCompare(b.at)),
    accounting: {
      ...base.accounting,
      pendingPayout:
        base.accounting.pendingPayout +
        extraPay
          .filter(p => p.status === 'pending' && p.direction === 'out')
          .reduce((n, p) => n + p.amount, 0),
    },
    commsLog,
    velocity: velocityFromPartner(partner),
  };
}

/** Densify agent CLV series, liquidity reservations, release stats, payments, history. */
export function deepenAgentProfile(expertId: string, base: TocAgentProfile): TocAgentProfile {
  // brand-ok — experts.id fixture key
  const clvByMarket =
    expertId === 'marcus'
      ? [
          { market: 'NFL', sampleN: 40, avgClvBps: 22.1 },
          { market: 'NBA', sampleN: 28, avgClvBps: 15.4 },
          { market: 'MLB', sampleN: 18, avgClvBps: 12.0 },
        ]
      : expertId === 'elena'
        ? [
            { market: 'Tennis', sampleN: 30, avgClvBps: 31.2 },
            { market: 'NFL', sampleN: 22, avgClvBps: 19.5 },
            { market: 'NBA', sampleN: 12, avgClvBps: 14.8 },
          ]
        : [
            { market: 'MLB', sampleN: 14, avgClvBps: 8.1 },
            { market: 'Soccer', sampleN: 12, avgClvBps: 11.4 },
            { market: 'Politics', sampleN: 10, avgClvBps: 6.2 },
            { market: 'Crypto', sampleN: 5, avgClvBps: 4.0 },
          ];

  const weeklySeriesBps =
    expertId === 'marcus'
      ? [12, 14, 16, 19, 18, 21, 22, 21.2]
      : expertId === 'elena'
        ? [18, 20, 22, 24, 25, 27, 28, 26.8]
        : [4, 5, 7, 8, 9, 10, 12, 11.0];

  const openReservations =
    expertId === 'marcus'
      ? [
          {
            reservationId: 'res-marcus-pat002-001',
            callSign: 'PAT-002',
            market: 'MLB',
            stake: 0,
            at: '2026-07-22T12:00:00.000Z',
          },
        ]
      : expertId === 'elena'
        ? [
            {
              reservationId: 'res-elena-pat001-nba',
              callSign: 'PAT-001',
              market: 'NBA',
              stake: 900,
              at: '2026-07-22T15:20:00.000Z',
            },
          ]
        : [
            {
              reservationId: 'res-kai-pat004-open',
              callSign: 'PAT-004',
              market: 'Soccer',
              stake: 800,
              at: '2026-07-23T10:00:00.000Z',
            },
          ];

  const extraPay = [
    {
      id: `pay-${expertId}-cut-w28`,
      method: (expertId === 'kai' ? 'crypto' : 'ach') as 'crypto' | 'ach',
      direction: 'out' as const,
      amount: expertId === 'marcus' ? 610 : expertId === 'elena' ? 440 : 190,
      currency: expertId === 'kai' ? 'USDC' : 'USD',
      status: 'posted' as const,
      at: '2026-07-14T12:00:00.000Z',
      note: 'Expert cut week 28',
    },
    {
      id: `pay-${expertId}-cut-w30-pending`,
      method: (expertId === 'elena' ? 'paypal' : expertId === 'kai' ? 'crypto' : 'ach') as
        | 'paypal'
        | 'crypto'
        | 'ach',
      direction: 'out' as const,
      amount: base.accounting.pendingCut,
      currency: expertId === 'kai' ? 'USDC' : 'USD',
      status: 'pending' as const,
      at: '2026-07-23T18:00:00.000Z',
      note: 'Pending expert cut week 30',
    },
  ];

  const extraHist = [
    {
      at: '2026-07-10T12:00:00.000Z',
      kind: 'capacity',
      summary: `Liquidity reconcile · avail $${base.liquidity.available}`,
    },
    {
      at: '2026-07-18T09:00:00.000Z',
      kind: 'clv',
      summary: `30d CLV ${base.clv.last30dAvgClvBps} bps · beat-close ${(base.clv.beatsClosePct * 100).toFixed(0)}%`,
    },
    {
      at: '2026-07-22T18:00:00.000Z',
      kind: 'release',
      summary:
        expertId === 'elena'
          ? 'PAT-001 NBA card released'
          : expertId === 'kai'
            ? 'PAT-004 Stake soccer ticket'
            : 'Desk review PAT-002 blocked stake',
    },
  ];

  const releaseStats =
    expertId === 'marcus'
      ? {
          releases30d: 42,
          placed30d: 31,
          blocked30d: 4,
          placementRate: 0.74,
          avgStake: 1180,
        }
      : expertId === 'elena'
        ? {
            releases30d: 36,
            placed30d: 29,
            blocked30d: 1,
            placementRate: 0.81,
            avgStake: 920,
          }
        : {
            releases30d: 24,
            placed30d: 17,
            blocked30d: 3,
            placementRate: 0.71,
            avgStake: 760,
          };

  const byMarket = base.liquidity.byMarket.map(m => ({
    ...m,
    reserved: Math.round((m.allocated - m.available) * 0.35),
    openPlays:
      m.market === 'NBA' && expertId === 'elena'
        ? 1
        : m.market === 'Soccer' && expertId === 'kai'
          ? 1
          : 0,
  }));

  return {
    ...base,
    clv: {
      ...base.clv,
      byMarket: clvByMarket,
      weeklySeriesBps,
    },
    liquidity: {
      ...base.liquidity,
      byMarket,
      openReservations,
    },
    payments: [...base.payments, ...extraPay],
    history: [...base.history, ...extraHist].sort((a, b) => a.at.localeCompare(b.at)),
    releaseStats,
  };
}

export function attachProfiles(
  partners: TocPartner[],
  experts: TocExpert[]
): { partners: TocPartner[]; experts: TocExpert[]; profiles: TocProfilesSummary } {
  const enrichedPartners = partners.map(p => {
    const code = p.partnerCode;
    if (code !== 'ASH' && code !== 'PAT' && code !== 'NOV') return p;
    const base = demoPartnerProfile(code, p);
    return { ...p, profile: deepenPartnerProfile(code, p, base) };
  });
  const enrichedExperts = experts.map(e => {
    const base = demoAgentProfile(e.expertId);
    if (!base) return e;
    return { ...e, profile: deepenAgentProfile(e.expertId, base) };
  });
  return {
    partners: enrichedPartners,
    experts: enrichedExperts,
    profiles: summarizeProfiles(enrichedPartners, enrichedExperts),
  };
}

export function summarizeProfiles(
  partners: TocPartner[],
  experts: TocExpert[]
): TocProfilesSummary {
  let phonesActive = 0;
  let telegramLanes = 0;
  let playChannelsLive = 0;
  let openDeals = 0;
  let pendingPayouts = 0;
  let partnersWithProfile = 0;
  let agentsWithProfile = 0;
  let expertLiquidityAllocated = 0;
  let expertLiquidityAvailable = 0;
  const clvSamples: number[] = [];

  for (const p of partners) {
    const pr = p.profile;
    if (!pr) continue;
    partnersWithProfile++;
    phonesActive += pr.phones.filter(ph => ph.status === 'active').length;
    if (pr.telegram.groupId || pr.telegram.chatId || pr.telegram.channelId) telegramLanes++;
    playChannelsLive += pr.playChannels.filter(c => c.status === 'live').length;
    openDeals += pr.deals.length;
    pendingPayouts += pr.accounting.pendingPayout;
    pendingPayouts += pr.payments.filter(pay => pay.status === 'pending').length;
  }

  for (const e of experts) {
    const pr = e.profile;
    if (!pr) continue;
    agentsWithProfile++;
    phonesActive += pr.phones.filter(ph => ph.status === 'active').length;
    if (pr.telegram.groupId || pr.telegram.channelId) telegramLanes++;
    playChannelsLive += pr.playChannels.filter(c => c.status === 'live').length;
    openDeals += pr.deals.length;
    expertLiquidityAllocated += pr.liquidity.allocated;
    expertLiquidityAvailable += pr.liquidity.available;
    clvSamples.push(pr.clv.avgClvBps);
    pendingPayouts += pr.accounting.pendingCut > 0 ? 1 : 0;
  }

  const avgAgentClvBps =
    clvSamples.length === 0
      ? null
      : Math.round((clvSamples.reduce((a, b) => a + b, 0) / clvSamples.length) * 10) / 10;

  return {
    partnersWithProfile,
    agentsWithProfile,
    phonesActive,
    telegramLanes,
    playChannelsLive,
    expertLiquidityAllocated,
    expertLiquidityAvailable,
    avgAgentClvBps,
    openDeals,
    pendingPayouts,
  };
}
