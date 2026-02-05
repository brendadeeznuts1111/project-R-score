#!/usr/bin/env bun

// [DATAPIPE][QUERY-ALL][v2.6][DP-QUERY-001][v2.6][ACTIVE]

// [DATAPIPE][CORE][DA-CO-F58][v2.6.0][ACTIVE]

import { hash } from "bun";

const VAULT = process.env.OBSIDIAN_VAULT || process.cwd();

// Helper function to get COOKIE with error handling
async function getCookie(): Promise<string> {
  const COOKIE = await Bun.secrets.get({ service: "datapipe", name: "COOKIE" });
  if (!COOKIE) {
    throw new Error('❌ No COOKIE found! Run: bun scripts/datapipe.ts setup-secrets');
  }
  return COOKIE;
}






interface AgentStats {
  profit: number;
  volume: number;
  bets: number;
  wins: number;
}

interface FullBet {
  // Core identifiers
  id: string;
  betGroupId: string;
  sequenceNumber: string;
  ticketNumber: string;
  hashId: string; // [RAPIDHASH][BET-ID][v1.3] Unique hash for queries

  // Player/Account info
  userID: string;
  playerId: string;
  partnerUserID: string;
  partnerID: string;
  profile: string;
  agent: string;
  userGroupId: string;

  // Bet details
  bet: string;
  result: string;
  betGroupToWin: string;
  betGroupResult: string;
  betGroupFinalOdds: string;
  betGroupPremiumAwarded: string;

  // Event info
  sID: string;
  displaySportId: string;
  lID: string;
  eID: string;
  eventStartTime: string;
  eventResult: string;
  team1: string;
  team2: string;
  period: string;
  marketTypeCategory: string;

  // Timing
  logTime: string;
  acceptTime: string;
  calcTime: string;
  resultTime: string;
  gradeTime: string;

  // Status
  state: string;
  accept: string;
  type: string;
  isWin: string;

  // Technical
  ipAddress: string;
  delay: string;
  balanceId: string;
  isFreePlay: string;

  // Odds/Prices
  fVal: string;
  fVal_new: string;
  finalUncorrelatedOdds: string;

  // Parsed details
  player: string;
  marketId: string | number;
  odds: string;
  skill: string;
  class: string | number;
  limit: string | number;

  // Additional metadata
  currency: string;
  exchangeRate: string;
  displayExchangeRate: string;
  adminUser: string;
  reversedCredit: string;
  reversedCreditTime: string;
  manualLogExists: string;
  isSuspectedBot: string;

  // Risk/EV
  ev: string;
  evRisk: string;

  // Parlay/Teaser
  fixedParlayName: string;
  fixedParlayDetails: string;
  teaserName: string;
  openSpots: string;
  openParlay: string;

  // Free bets
  freeBetDetails: string;
  ifBet: string;
  featuredBetDetails: string;

  // Supplements
  supplementalConfirmation: string;
  disclaimer: string;
}



function parseBetDetails(betDetails: string): Pick<FullBet, 'player' | 'marketId' | 'odds' | 'skill' | 'class' | 'limit'> {

  try {

    let details = betDetails ? JSON.parse(betDetails) : {};

    if (Array.isArray(details)) details = details[0];  // Parlay leg1

    return {

      player: details.d || 'Parlay/No Player',

      marketId: details.k || 'N/A',

      odds: details.m ? (details.m > 0 ? `ML +${details.m}` : `ML ${details.m}`) : 'N/A',

      skill: details.sk || 'N/A',

      class: details.cls || 'N/A',

      limit: details.lim || 'N/A',

    };

  } catch {

    return { player: 'Parse Error', marketId: 'N/A', odds: 'N/A', skill: 'N/A', class: 'N/A', limit: 'N/A' };

  }

}



async function fetchData(state?: string) {
  const COOKIE = await getCookie();

  const now = Math.floor(Date.now() / 1000);

  const dayStart = (ts: number) => Math.floor(ts / 86400) * 86400;

  const from = dayStart(now - 7 * 86400);  // 7d ago

  const to = dayStart(now) + 86399;  // Today end

  const HEADERS = {

    'accept': 'application/json, gzip, deflate, br',

    'accept-language': 'en-US,en;q=0.9',

    'content-type': 'application/json',

    'cookie': COOKIE,

    'origin': 'https://plive.sportswidgets.pro',

    'priority': 'u=1, i',

    'referer': 'https://plive.sportswidgets.pro/manager-tools/',

    'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',

    'sec-ch-ua-mobile': '?1',

    'sec-ch-ua-platform': '"Android"',

    'sec-fetch-dest': 'empty',

    'sec-fetch-mode': 'cors',

    'sec-fetch-site': 'same-origin',

    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',

  };

  const BODY = {

    action: "getBetReport",

    partnerUserId: "",

    agent: "",

    eventId: "",

    freeBetId: "",

    state: state || "",  // Allow filtering by state

    sId: "",

    minVolume: "0",

    maxTimeUntilScore: "0",

    mId: "",

    from, fromTime: 0,

    to, toTime: 86399,

    betId: "",

    betGroupId: "",

    group: null,

    dateFilterBy: "calcTime",

    partnerIds: "",

    period: null,

  };

  const res = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php', {

    method: 'POST',

    headers: HEADERS,

    body: JSON.stringify(BODY),

  });

  if (!res.ok) throw new Error(`API ${res.status}`);

  const data = await res.json();

  return data;

}

// [LIVE][BETS][FETCH][LIVE-FETCH-001][v2.14][ACTIVE]
// Console-compatible params to avoid 403
async function fetchLiveBets() {
  const COOKIE = await getCookie();

  // Try to get session token if available
  let sessionToken = '';
  try {
    sessionToken = await Bun.secrets.get({ service: "plive", name: "x-gs-session" }) || '';
  } catch (e) {
    // Session token not available, continue without it
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 86400;  // 24h ago (console style)

  // Console-compatible headers (no JSON content-type)
  const HEADERS: Record<string, string> = {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', // URL-encoded like console
    'cookie': COOKIE,
    'origin': 'https://plive.sportswidgets.pro',
    'priority': 'u=1, i',
    'referer': 'https://plive.sportswidgets.pro/manager-tools/',
    'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'x-requested-with': 'XMLHttpRequest'
  };

  // Add session token if available
  if (sessionToken) {
    HEADERS['x-gs-session'] = sessionToken;
  }

  // Console-style body (URL-encoded, not JSON)
  const BODY = `action=getBetReport&minVolume=0&maxTimeUntilScore=0&from=${from}&to=${now}&toTime=86399&dateFilterBy=calcTime&state=0`;

  const res = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php', {
    method: 'POST',
    headers: HEADERS,
    body: BODY,
  });

  if (!res.ok) {
    console.error(`❌ Live bets API ${res.status}: ${await res.text()}`);
    throw new Error(`API ${res.status}`);
  }

  const data = await res.json();

  // Return bets array (matches console structure)
  return data.r?.bets || data.r || [];
}

// [LIVE][DASHBOARD][MD][LIVE-MD-001][v2.14][ACTIVE]
// Generate AG Grid-style table matching console UX
function generateLiveBetsMD(bets: any[]): string {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return `# [DATAPIPE][LIVE][RECENT][LIVE-BETS][v2.14][ACTIVE]

⚡ **LIVE RECENT BETS** *(Auto-refresh)*

**Last Update**: ${timestamp} | **${bets.length} Bets**

---

## 🔄 **Controls**

\`\`\`dataviewjs
dv.button("🔄 Recent Bets", async () => {
  const { execSync } = require('child_process');
  try {
    execSync('bun datapipe:live');
    dv.view.reload();
  } catch (error) {
    console.error('Failed to refresh:', error.message);
  }
});

dv.button("📱 Telegram", async () => {
  const { execSync } = require('child_process');
  try {
    execSync('bun telegram:pending');
  } catch (error) {
    console.error('Failed to send:', error.message);
  }
});
\`\`\`

---

## 📊 **RECENT BETS TABLE** *(AG Grid Style)*

| Bet Group | Player | To Win | Bet | Agent | Sport | Event | Result | Delay |
|-----------|--------|--------|-----|-------|-------|-------|--------|-------|
${bets.slice(0, 50).map(b =>
  `| ${b.betGroupId || ''} | ${b.profile || ''} | $${parseFloat(b.betGroupToWin || 0).toFixed(2)} | $${parseFloat(b.bet || 0).toFixed(2)} | **${b.agent || ''}** | S${b.sID || ''} | ${b.team1 || ''} vs ${b.team2 || ''} | $${parseFloat(b.result || 0).toFixed(2)} | ${b.delay || 0}s |`
).join('\n')}

---

## 💰 **BIG WINNERS** *(Result >$100)*

| Agent | Player | Bet | Result | Event |
|-------|--------|-----|--------|-------|
${bets.filter(b => parseFloat(b.result || 0) > 100).slice(0, 10).map(b =>
  `| ${b.agent || ''} | ${b.profile || ''} | $${parseFloat(b.bet || 0).toFixed(2)} | $${parseFloat(b.result || 0).toFixed(2)} | ${b.team1 || ''} vs ${b.team2 || ''} |`
).join('\n')}

---

## 🔴 **HIGH RISK** *(Delay >10s | Bet >$200)*

| Agent | Player | Bet | Delay | Result |
|-------|--------|-----|-------|--------|
${bets.filter(b => (parseInt(b.delay || 0) > 10) || (parseFloat(b.bet || 0) > 200)).slice(0, 20).map(b =>
  `| ${b.agent || ''} | ${b.profile || ''} | $${parseFloat(b.bet || 0).toFixed(2)} | ${b.delay || 0}s | $${parseFloat(b.result || 0).toFixed(2)} |`
).join('\n')}

---

## 📈 **SUMMARY STATS**

- **Total Bets**: ${bets.length}
- **Big Winners** (> $100): ${bets.filter(b => parseFloat(b.result || 0) > 100).length}
- **High Risk Bets**: ${bets.filter(b => (parseInt(b.delay || 0) > 10) || (parseFloat(b.bet || 0) > 200)).length}
- **Average Bet**: $${(bets.reduce((sum, b) => sum + parseFloat(b.bet || 0), 0) / bets.length).toFixed(2)}
- **Total Volume**: $${bets.reduce((sum, b) => sum + parseFloat(b.bet || 0), 0).toFixed(2)}

---

*Generated by Datapipe v2.14 • Live data • No 403 errors*
`;
}



function parseFullBet(bet: any): FullBet {
  const details = parseBetDetails(bet.betDetails || '{}');

  return {
    // Core identifiers
    id: bet.id || '',
    betGroupId: bet.betGroupId || '',
    sequenceNumber: bet.sequenceNumber || '',
    ticketNumber: bet.ticketNumber || '',
    hashId: hash.rapidhash((bet.betGroupId || '') + (bet.agent || '')).toString(16),

    // Player/Account info
    userID: bet.userID || '',
    playerId: bet.playerId || '',
    partnerUserID: bet.partnerUserID || '',
    partnerID: bet.partnerID || '',
    profile: bet.profile || '',
    agent: bet.agent || '',
    userGroupId: bet.userGroupId || '',

    // Bet details
    bet: bet.bet || '',
    result: bet.result || '',
    betGroupToWin: bet.betGroupToWin || '',
    betGroupResult: bet.betGroupResult || '',
    betGroupFinalOdds: bet.betGroupFinalOdds || '',
    betGroupPremiumAwarded: bet.betGroupPremiumAwarded || '',

    // Event info
    sID: bet.sID || '',
    displaySportId: bet.displaySportId || '',
    lID: bet.lID || '',
    eID: bet.eID || '',
    eventStartTime: bet.eventStartTime || '',
    eventResult: bet.eventResult || '',
    team1: bet.team1 || '',
    team2: bet.team2 || '',
    period: bet.period || '',
    marketTypeCategory: bet.marketTypeCategory || '',

    // Timing
    logTime: bet.logTime || '',
    acceptTime: bet.acceptTime || '',
    calcTime: bet.calcTime || '',
    resultTime: bet.resultTime || '',
    gradeTime: bet.gradeTime || '',

    // Status
    state: bet.state || '',
    accept: bet.accept || '',
    type: bet.type || '',
    isWin: bet.isWin || '',

    // Technical
    ipAddress: bet.ipAddress || '',
    delay: bet.delay || '',
    balanceId: bet.balanceId || '',
    isFreePlay: bet.isFreePlay || '',

    // Odds/Prices
    fVal: bet.fVal || '',
    fVal_new: bet.fVal_new || '',
    finalUncorrelatedOdds: bet.finalUncorrelatedOdds || '',

    // Parsed details (from betDetails JSON)
    ...details,

    // Additional metadata
    currency: bet.currency || '',
    exchangeRate: bet.exchangeRate || '',
    displayExchangeRate: bet.displayExchangeRate || '',
    adminUser: bet.adminUser || '',
    reversedCredit: bet.reversedCredit || '',
    reversedCreditTime: bet.reversedCreditTime || '',
    manualLogExists: bet.manualLogExists || '',
    isSuspectedBot: bet.isSuspectedBot || '',

    // Risk/EV
    ev: bet.ev || '',
    evRisk: bet.evRisk || '',

    // Parlay/Teaser
    fixedParlayName: bet.fixedParlayName || '',
    fixedParlayDetails: bet.fixedParlayDetails || '',
    teaserName: bet.teaserName || '',
    openSpots: bet.openSpots || '',
    openParlay: bet.openParlay || '',

    // Free bets
    freeBetDetails: bet.freeBetDetails || '',
    ifBet: bet.ifBet || '',
    featuredBetDetails: bet.featuredBetDetails || '',

    // Supplements
    supplementalConfirmation: bet.supplementalConfirmation || '',
    disclaimer: bet.disclaimer || '',
  };
}

function parseBets(bets: any[]): FullBet[] {
  return bets.map(parseFullBet);
}

// GREPA-style query functionality
function parseQuery(query: string): ((bet: FullBet) => boolean) {
  if (!query.trim()) return () => true;

  const conditions = query.split(/\s+/).map(part => {
    // Handle operators: =, >, <, >=, <=, !=, ~= (contains)
    const match = part.match(/^(\w+)(=|>|<|>=|<=|!=|~=)(.+)$/);
    if (!match) return null;

    const [, field, op, value] = match;
    return { field, op, value };
  }).filter(Boolean);

  return (bet: FullBet) => {
    return conditions.every(condition => {
      if (!condition) return true;

      const { field, op, value } = condition;
      const betValue = (bet as any)[field];

      if (betValue === undefined || betValue === null) return false;

      // Convert to comparable types
      const numValue = parseFloat(value);
      const numBetValue = parseFloat(betValue);
      const strValue = value.toString().toLowerCase();
      const strBetValue = betValue.toString().toLowerCase();

      switch (op) {
        case '=':
          return strBetValue === strValue;
        case '!=':
          return strBetValue !== strValue;
        case '~=':
          return strBetValue.includes(strValue);
        case '>':
          return !isNaN(numBetValue) && !isNaN(numValue) && numBetValue > numValue;
        case '<':
          return !isNaN(numBetValue) && !isNaN(numValue) && numBetValue < numValue;
        case '>=':
          return !isNaN(numBetValue) && !isNaN(numValue) && numBetValue >= numValue;
        case '<=':
          return !isNaN(numBetValue) && !isNaN(numValue) && numBetValue <= numValue;
        default:
          return false;
      }
    });
  };
}

function queryBets(bets: FullBet[], query: string): FullBet[] {
  const filterFn = parseQuery(query);
  return bets.filter(filterFn);
}

// CSV Export functionality
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function betsToCSV(bets: FullBet[]): string {
  if (bets.length === 0) return '';

  // Get all field names from FullBet interface
  const fields = Object.keys(bets[0]) as (keyof FullBet)[];

  // CSV header
  const header = fields.map(escapeCSV).join(',');

  // CSV rows
  const rows = bets.map(bet =>
    fields.map(field => escapeCSV(String(bet[field] || ''))).join(',')
  );

  return [header, ...rows].join('\n');
}

async function exportBetsToCSV(bets: FullBet[], filename: string, query?: string): Promise<void> {
  const csv = betsToCSV(bets);
  const querySuffix = query ? `_${query.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filepath = `${VAULT}/exports/${filename}${querySuffix}.csv`;

  await Bun.write(filepath, csv);
  console.log(`📄 Exported ${bets.length} bets to: ${filepath}`);
}

// Dataview-compatible markdown generation
function betsToDataviewMD(bets: FullBet[], title: string, query?: string): string {
  const timestamp = new Date().toISOString();
  const queryInfo = query ? `\n\n**Query:** \`${query}\`` : '';

  let content = `# 📊 ${title} - ${timestamp}
**Total Bets:** ${bets.length}${queryInfo}

\`\`\`dataview
TABLE WITHOUT ID
  agent AS Agent,
  player AS Player,
  bet AS Stake,
  result AS Result,
  isWin AS Won,
  delay AS Delay,
  team1 + " vs " + team2 AS Event,
  period AS Period,
  marketTypeCategory AS Market,
  state AS Status,
  logTime AS Time
FROM "exports"
WHERE file.name = this.file.name
SORT bet DESC
\`\`\`

## Raw Data (First 100)

| Agent | Player | Stake | Result | Won | Delay | Event | Period | Market | Status |
|-------|--------|-------|--------|-----|-------|-------|--------|--------|--------|
`;

  // Add first 100 bets as a preview table
  const preview = bets.slice(0, 100).map(bet => {
    const event = `${bet.team1 || ''} vs ${bet.team2 || ''}`.trim() || 'Unknown';
    return `| ${bet.agent} | ${bet.player} | $${bet.bet} | $${bet.result} | ${bet.isWin === '1' ? '✅' : '❌'} | ${bet.delay} | ${event} | ${bet.period} | ${bet.marketTypeCategory} | ${bet.state} |`;
  }).join('\n');

  content += preview;

  if (bets.length > 100) {
    content += `\n\n*... and ${bets.length - 100} more bets*`;
  }

  content += '\n\n---\n*Generated by Datapipe v2.6 • Query any field with GREPA syntax*';

  return content;
}

async function exportBetsToDataview(bets: FullBet[], filename: string, query?: string): Promise<void> {
  const title = query ? `Query Results: ${query}` : 'All Bets';
  const md = betsToDataviewMD(bets, title, query);
  const querySuffix = query ? `_${query.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filepath = `${VAULT}/exports/${filename}${querySuffix}.md`;

  await Bun.write(filepath, md);
  console.log(`📊 Exported ${bets.length} bets to Dataview: ${filepath}`);
}



function aggregateAgents(data: any) {

  const agentMap = new Map<string, AgentStats>();

  const bets = data?.data || data?.bets || data || [];

  console.log(`📊 Processing ${Array.isArray(bets) ? bets.length : 0} bets...`);



  for (const bet of (Array.isArray(bets) ? bets : [])) {

    // Skip pending bets (state=1), only count settled (state=2)

    if (bet.state !== "2") continue;

    const agent = bet.agent || bet.agentName || bet.agentId?.toString() || 'Unknown';

    if (!agentMap.has(agent)) agentMap.set(agent, {profit:0, volume:0, bets:0, winrate:0});

    const stats = agentMap.get(agent)!;

    // Use 'result' field for profit (can be negative for losses)

    stats.profit += parseFloat(bet.result || 0);

    // Use 'bet' field for stake amount

    stats.volume += parseFloat(bet.bet || 0);

    stats.bets++;

    // isWin="1" means win, isWin="0" means loss

    if (bet.isWin === "1") stats.winrate++;

  }



  return Array.from(agentMap.entries()).map(([name, stats]) => ({

    name,

    stats: {

      ...stats,

      winrate: Math.round(stats.winrate / stats.bets * 100) || 0,

    }

  })).sort((a,b) => b.stats.profit - a.stats.profit);

}



async function mdTable(agents: ReturnType<typeof aggregateAgents>) {

  // Gen header (needs obsidian-tools.ts gen func)

  let header = '[DATAPIPE][REPORT][LIVE][CORE][AGENT-7D][v2.2][ACTIVE]';

  try {

    const { gen } = await import('./obsidian-tools.ts');

    header = gen('DATAPIPE', 'REPORT', 'LIVE', 'CORE', 'AGENT-7D');

  } catch {}



  const ts = new Date().toISOString().slice(0, 10);

  const totalProfit = agents.reduce((sum, a) => sum + a.stats.profit, 0);

  return `# ${header}



**🔥 Live ${ts} | 7d | ${agents.length} Agents | **Total: +$${totalProfit.toLocaleString()}**



| # | 🏆 Agent | 💰 Profit | 📊 Volume | 🎯 Bets | 🔥 Win% |

|---|----------|-----------|-----------|---------|---------|

${agents.slice(0, 50).map((a, i) =>

  `| ${i+1} | **${a.name}** | **$${a.stats.profit.toLocaleString()}** | **$${a.stats.volume.toLocaleString()}** | ${a.stats.bets.toLocaleString()} | **${a.stats.winrate}%** |`

).join('\n')}



**🏆 TOP: ${agents[0]?.name} +$${agents[0]?.stats?.profit?.toLocaleString() || 0}**  

**📈 Total Profit: +$${totalProfit.toLocaleString()}**

`;

}



function topBetsTable(bets: ParsedBet[]): string {

  return `| Bet Group | **Player** | **Agent** | Bet | **Result** | Odds | Sport |

|------------|-------------|------------|-----|-------------|------|-------|

${bets.map(b =>

  `| ${b.betGroupId} | **${b.player}** | ${b.agent} | **$${b.bet}** | **$${b.result}** | ${b.odds} | S${b.sID} |`

).join('\n') || '| None |'}

`;

}



function agentSummaryTable(bets: ParsedBet[]): string {

  // Aggregate top player per agent

  const agentTop = bets.reduce((acc, b) => {

    const key = `${b.agent}-${b.player}`;

    if (!acc[key] || parseFloat(acc[key].result) < parseFloat(b.result)) acc[key] = b;

    return acc;

  }, {} as Record<string, ParsedBet>);



  return `| Agent | **Top Player Bet** | Profit | Odds |

|-------|---------------------|--------|------|

${Object.values(agentTop).slice(0,20).map(b =>

  `| **${b.agent}** | **${b.player}** | **$${b.result}** | ${b.odds} |`

).join('\n')}`;

}



function generateDetailedMD(graded: ParsedBet[], pending: ParsedBet[]) {

  const header = '[DATAPIPE][DETAILED][LIVE][CORE][BETS-v2.4][v2.4][ACTIVE]';

  const ts = new Date().toISOString().slice(0,10);



  return `# ${header}



**Detailed ${ts} | Players + Odds | Graded: ${graded.length} | Pending: ${pending.length}**



## 🔥 **Top Graded Bets** (Profit > $50)

${topBetsTable(graded.filter(b => parseFloat(b.result) > 50).slice(0,20))}



## ⏳ **Pending Bets** (Vol > $100)

${topBetsTable(pending.filter(b => parseFloat(b.bet) > 100).slice(0,50))}



## 📊 **All Graded Summary**

${agentSummaryTable(graded)}

`;

}



function generateSummaryMD(graded: ParsedBet[], pending: ParsedBet[]) {

  // Create summary version with agent rankings

  const header = '[DATAPIPE][SUMMARY][LIVE][CORE][AGENTS-v2.4][v2.4][ACTIVE]';

  const ts = new Date().toISOString().slice(0,10);

  const totalProfit = graded.reduce((sum, b) => sum + parseFloat(b.result), 0);

  const totalVolume = graded.reduce((sum, b) => sum + parseFloat(b.bet), 0);



  const agentStats = graded.reduce((acc, b) => {

    const agent = b.agent;

    if (!acc[agent]) acc[agent] = { profit: 0, bets: 0, wins: 0 };

    acc[agent].profit += parseFloat(b.result);

    acc[agent].bets += 1;

    if (b.isWin === '1') acc[agent].wins += 1;

    return acc;

  }, {} as Record<string, any>);



  const topAgents = Object.entries(agentStats).map(([agent, stats]: [string, any]) => ({

    agent,

    profit: stats.profit,

    bets: stats.bets,

    winrate: Math.round((stats.wins / stats.bets) * 100)

  })).sort((a,b) => b.profit - a.profit);



  return `# ${header}



**Agent Summary ${ts} | ${graded.length} graded bets | $${totalProfit.toLocaleString()} total P&L**



## Top Agents by Profit

| # | Agent | Profit | Bets | Win% |

|---|-------|--------|------|------|

${topAgents.slice(0,20).map((a,i) =>

  `| ${i+1} | **${a.agent}** | **$${a.profit.toLocaleString()}** | ${a.bets} | ${a.winrate}% |`

).join('\n')}

`;

}

function generateFullMD(graded: FullParsedBet[], pending: FullParsedBet[]) {

  const ts = new Date().toISOString().slice(0,10);

  return `# [DATAPIPE][FULL-FIELDS][LIVE][CORE][BETS-v2.5][v2.5][ACTIVE]



**ALL Fields ${ts} | Graded:${graded.length} | Pending:${pending.length}**



## 🔥 **Top Graded** (Profit >$20)

\`\`\`

| Group | **Player** | Agent | **Bet** | **P&L** | **Odds** | Class | Limit | Sport |

|-------|------------|-------|---------|---------|----------|-------|-------|-------|

${topFullTable(graded.filter(b => parseFloat(b.result || 0) > 20).slice(0,25))}

\`\`\`



## ⏳ **Top Pending** (Vol >$50)

\`\`\`

| Group | **Player** | Agent | **Bet** | **P&L** | **Odds** | Class | Limit | Sport |

|-------|------------|-------|---------|---------|----------|-------|-------|-------|

${topFullTable(pending.filter(b => parseFloat(b.bet || 0) > 50).slice(0,50))}

\`\`\``;

}



function topFullTable(bets: FullParsedBet[]): string {

  return bets.map(b =>

    `| ${b.betGroupId} | **${b.player}** | ${b.agent} | **$${b.bet}** | **$${b.result || '?'}** | ${b.odds} | ${b.class} | ${b.limit} | S${b.sID} |`

  ).join('\n') || '| - |';

}



// === EXPORTS (for testing and WebSocket server) ===
export { parseBets, aggregateAgents, parseQuery, queryBets, fetchData, getCookie };

// === CLI ===

const cmd = process.argv[2];
const query = process.argv[3] || '';
const useSql = process.argv.includes('--sql');
const useWs = process.argv.includes('--ws');

try {
  switch (cmd) {
    case 'raw':
      const rawData = await fetchData();
      console.log(JSON.stringify(rawData, null, 2));
      console.log(`\n🚀 RAW: ${rawData?.data?.length || 0} bets from API`);
      break;

    case 'query':
      const allBets = parseBets((await fetchData()).data || []);
      const filtered = query ? queryBets(allBets, query) : allBets;

      console.log(`🔍 Query: "${query}" → ${filtered.length}/${allBets.length} bets`);

      // Show sample results
      filtered.slice(0, 5).forEach((bet, i) => {
        console.log(`${i+1}. ${bet.agent}: ${bet.player} - $${bet.bet} (${bet.isWin === '1' ? 'WIN' : 'LOSS'})`);
      });

      // Export to CSV and Dataview
      await exportBetsToCSV(filtered, 'query_results', query);
      await exportBetsToDataview(filtered, 'query_results', query);
      break;

    case 'csv':
      const csvBets = parseBets((await fetchData()).data || []);
      await exportBetsToCSV(csvBets, 'all_bets_full');
      console.log(`📊 Exported ${csvBets.length} bets to CSV with ${Object.keys(csvBets[0] || {}).length} columns`);
      break;

    case 'graded':
      const gradedBets = parseBets((await fetchData('2')).data || []);
      await exportBetsToCSV(gradedBets, 'graded_bets');
      await exportBetsToDataview(gradedBets, 'graded_bets');
      console.log(`✅ Graded bets: ${gradedBets.length}`);
      break;

    case 'pending':
      const pendingBets = parseBets((await fetchData('0')).data || []);
      await exportBetsToCSV(pendingBets, 'pending_bets');
      await exportBetsToDataview(pendingBets, 'pending_bets');
      console.log(`⏳ Pending bets: ${pendingBets.length}`);
      break;

    case 'live':
      // Fetch live/pending bets (state=0) with console-compatible params
      const liveBetsData = await fetchLiveBets();
      const liveBets = parseBets(liveBetsData);
      const liveMD = generateLiveBetsMD(liveBets);
      await Bun.write(`${VAULT}/dashboards/live-bets.md`, liveMD);
      console.log(`⚡ **LIVE bets**: ${liveBets.length} (no 403!)`);
      break;

    case 'users':
      // Fetch users list directly (skip session refresh for now since we have working token)
      const cookie = await getCookie();
      const sessionToken = await Bun.secrets.get({ service: "plive", name: "x-gs-session" }) || '2fbd859dc1d0deef89c256e8';
      const agent = process.argv[3] || 'nolarose';

      console.log(`👥 Fetching users for agent: ${agent}`);

      const url = new URL('https://plive.sportswidgets.pro/manager-tools/usersList/');
      url.searchParams.set('agentNames', agent);
      url.searchParams.set('includeSubAgents', 'true');

      const res = await fetch(url, {
        headers: {
          'accept': 'application/json, gzip, deflate, br',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'cookie': cookie,
          'referer': 'https://plive.sportswidgets.pro/manager-tools/',
          'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
          'x-gs-session': sessionToken,
          'x-requested-with': 'XMLHttpRequest'
        },
        timeout: 15000
      });

      if (!res.ok) {
        console.error(`❌ Users API ${res.status}: ${await res.text()}`);
        process.exit(1);
      }

      const users = await res.json();
      console.log(`👥 **USERS for ${agent}**: ${users.length}`);

      if (users.length > 0) {
        console.log('\nTop 5 users:');
        users.slice(0, 5).forEach((user: any, i: number) => {
          console.log(`${i+1}. ${user.username} - Agent: ${user.agent} - Status: ${user.isBlocked === '0' ? 'Active' : 'Blocked'}`);
        });

        // Save to file for dashboard (YAML format for Dataview)
        const usersYAML = users.map((user: any) => `---
username: "${user.username}"
agent: "${user.agent}"
isBlocked: ${user.isBlocked}
currency: "${user.currency}"
regDate: "${user.regDate}"
platform: "${user.platform}"
`).join('\n');

        await Bun.write(`${VAULT}/dashboards/users-${agent}.md`, usersYAML);
        console.log(`💾 Saved ${users.length} users to dashboards/users-${agent}.md`);

        // Also save raw JSON for reference
        await Bun.write(`${VAULT}/data/users-${agent}.json`, JSON.stringify(users, null, 2));
      }
      break;

    case 'fetch':
      const fetchDataResult = await fetchData();
      const agents = aggregateAgents(fetchDataResult);
      const md = await mdTable(agents);
      await Bun.write(`${VAULT}/dashboards/bet-reports.md`, md);

      // v1.3: Optional SQL storage
      if (useSql) {
        const { Database } = await import("bun:sqlite");
        const db = new Database("datapipe.db");

        // Store bets in database
        const bets = (fetchDataResult?.data || []).map((bet: any) => parseFullBet(bet));
        const insert = db.prepare(`
          INSERT OR REPLACE INTO bets (
            id, betGroupId, ticketNumber, userID, playerId, partnerUserID, partnerID,
            profile, agent, userGroupId, bet, result, betGroupToWin, betGroupResult,
            betGroupFinalOdds, betGroupPremiumAwarded, sID, displaySportId, lID, eID,
            eventStartTime, eventResult, team1, team2, period, marketTypeCategory,
            logTime, acceptTime, calcTime, resultTime, gradeTime, state, accept, type,
            isWin, ipAddress, delay, balanceId, isFreePlay, fVal, fVal_new,
            finalUncorrelatedOdds, player, marketId, odds, skill, class, limit,
            currency, exchangeRate, displayExchangeRate, adminUser, reversedCredit,
            reversedCreditTime, manualLogExists, isSuspectedBot, ev, evRisk,
            fixedParlayName, fixedParlayDetails, teaserName, openSpots, openParlay,
            freeBetDetails, ifBet, featuredBetDetails, supplementalConfirmation, disclaimer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const bet of bets) {
          insert.run(
            bet.id, bet.betGroupId, bet.sequenceNumber, bet.userID, bet.playerId,
            bet.partnerUserID, bet.partnerID, bet.profile, bet.agent, bet.userGroupId,
            bet.bet, bet.result, bet.betGroupToWin, bet.betGroupResult,
            bet.betGroupFinalOdds, bet.betGroupPremiumAwarded, bet.sID, bet.displaySportId,
            bet.lID, bet.eID, bet.eventStartTime, bet.eventResult, bet.team1, bet.team2,
            bet.period, bet.marketTypeCategory, bet.logTime, bet.acceptTime, bet.calcTime,
            bet.resultTime, bet.gradeTime, bet.state, bet.accept, bet.type, bet.isWin,
            bet.ipAddress, bet.delay, bet.balanceId, bet.isFreePlay, bet.fVal, bet.fVal_new,
            bet.finalUncorrelatedOdds, bet.player, bet.marketId, bet.odds, bet.skill,
            bet.class, bet.limit, bet.currency, bet.exchangeRate, bet.displayExchangeRate,
            bet.adminUser, bet.reversedCredit, bet.reversedCreditTime, bet.manualLogExists,
            bet.isSuspectedBot, bet.ev, bet.evRisk, bet.fixedParlayName, bet.fixedParlayDetails,
            bet.teaserName, bet.openSpots, bet.openParlay, bet.freeBetDetails, bet.ifBet,
            bet.featuredBetDetails, bet.supplementalConfirmation, bet.disclaimer
          );
        }

        console.log(`💾 Stored ${bets.length} bets in datapipe.db`);
      }

      // v1.3: Redis caching and alerts
      if (useSql) {
        const { redis } = await import("bun:redis");

        // Cache top agent data
        const topAgent = agents[0];
        if (topAgent) {
          await redis.set("datapipe:top-agent", JSON.stringify({
            name: topAgent.name,
            profit: topAgent.stats.profit,
            winrate: topAgent.stats.winrate,
            bets: topAgent.stats.bets,
            volume: topAgent.stats.volume,
            timestamp: new Date().toISOString()
          }));
          console.log(`🔄 Cached top agent: ${topAgent.name}`);
        }

        // Check for profit alerts (>10k threshold)
        const totalProfit = agents.reduce((sum, a) => sum + a.stats.profit, 0);
        const previousTotal = JSON.parse(await redis.get("datapipe:total-profit") || "0");

        if (totalProfit > 10000 && previousTotal <= 10000) {
          console.log(`🚨 ALERT: Total profit exceeded $10k! Current: $${Math.round(totalProfit)}`);
          // Could integrate with Telegram bot here
        }

        await redis.set("datapipe:total-profit", JSON.stringify(totalProfit));
        await redis.set("datapipe:last-update", new Date().toISOString());
      }

      // v2.8: WebSocket live push
      if (useWs) {
        try {
          // Connect to WebSocket server and push data
          const ws = new WebSocket("ws://localhost:3001", ["syndicate-live"]);

          ws.onopen = () => {
            console.log("📡 Connected to WS server for push");
            ws.send(JSON.stringify({ type: "fetch" }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "fetch_response") {
              console.log(`📡 Pushed ${data.bets?.length || 0} bets to ${data.agents?.length || 0} connected clients`);
              ws.close();
            }
          };

          ws.onerror = (error) => {
            console.warn("⚠️  WebSocket push failed (server not running?)");
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 5000);

        } catch (error) {
          console.warn(`⚠️  WS push error: ${error.message}`);
        }
      }

      console.log(`✅ ${agents.length} agents → bet-reports.md | Top: ${agents[0]?.name} +$${Math.round(agents[0]?.stats.profit || 0)}`);
      break;

    case 'top':
      const topAgents = aggregateAgents(await fetchData()).slice(0, 5);
      console.log('🏆 TOP 5 AGENTS:');
      topAgents.forEach((a, i) => {
        console.log(`${i+1}. ${a.name}: +$${Math.round(a.stats.profit)} (${a.stats.winrate}% win) - ${a.stats.bets} bets`);
      });
      break;

    case 'watch':
      console.log('👀 Auto-fetch every 5min (Ctrl+C to stop)...');
      await Bun.spawnSync(['bun', 'scripts/datapipe.ts', 'fetch'], {
        timeout: 30000, // 30s timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      setInterval(async () => {
        try {
          await Bun.spawnSync(['bun', 'scripts/datapipe.ts', 'fetch'], {
            timeout: 30000, // 30s timeout
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
          });
          console.log(`🔄 Updated at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          console.error(`❌ Watch error: ${err}`);
        }
      }, 300000);
      break;

    case 'yaml':
      const yamlBets = parseBets((await fetchData('2')).data || []); // Only graded bets for Dataview

      // v1.3: Use native Bun.YAML instead of string concatenation
      const yamlData = {
        bets: yamlBets.map(bet => ({
          agent: bet.agent || '',
          profit: parseFloat(bet.result || '0'),
          volume: parseFloat(bet.bet || '0'),
          wins: bet.isWin === '1' ? 1 : 0,
          player: bet.player || '',
          odds: bet.odds || '',
          state: bet.state || '',
          delay: parseInt(bet.delay || '0'),
          sport: bet.sID || '',
          market: bet.marketTypeCategory || '',
          team1: bet.team1 || '',
          team2: bet.team2 || '',
          period: bet.period || '',
          eventResult: bet.eventResult || '',
          logTime: bet.logTime || '',
          resultTime: bet.resultTime || '',
          currency: bet.currency || '',
          ticketNumber: bet.ticketNumber || '',
          betGroupId: bet.betGroupId || '',
          userID: bet.userID || '',
          partnerUserID: bet.partnerUserID || '',
          profile: bet.profile || '',
          userGroupId: bet.userGroupId || '',
          ipAddress: bet.ipAddress || ''
        })),
        metadata: {
          generated: new Date().toISOString(),
          total_bets: yamlBets.length,
          version: 'v1.3'
        }
      };

      const yaml = Bun.YAML.stringify(yamlData);

      // Ensure data directory exists
      await Bun.mkdir(`${VAULT}/data`, { recursive: true });
      await Bun.write(`${VAULT}/data/bets.yaml`, yaml);

      console.log(`✅ ${yamlBets.length} bets → data/bets.yaml (Dataview-ready)`);
      break;

    case 'stats':
      const statsBets = parseBets((await fetchData()).data || []);
      const stats = {
        total: statsBets.length,
        graded: statsBets.filter(b => b.state === '2').length,
        pending: statsBets.filter(b => b.state === '0').length,
        agents: new Set(statsBets.map(b => b.agent)).size,
        volume: statsBets.reduce((sum, b) => sum + parseFloat(b.bet || '0'), 0),
        profit: statsBets.filter(b => b.state === '2').reduce((sum, b) => sum + parseFloat(b.result || '0'), 0),
      };

      console.log(`📊 DATAPIPE STATS:`);
      console.log(`   Total Bets: ${stats.total}`);
      console.log(`   Graded: ${stats.graded} | Pending: ${stats.pending}`);
      console.log(`   Agents: ${stats.agents}`);
      console.log(`   Volume: $${Math.round(stats.volume)}`);
      console.log(`   Profit: $${Math.round(stats.profit)}`);
      break;

    case 'setup-secrets':
      console.log('🔐 Setting up Datapipe secrets...');

      // Check if already configured
      const existingCookie = await Bun.secrets.get({ service: "datapipe", name: "COOKIE" });
      if (existingCookie) {
        console.log('✅ COOKIE already configured!');
        break;
      }

      // Prompt for cookie
      console.log('📋 Get your COOKIE from:');
      console.log('   1. Open Chrome → Sportswidgets dashboard');
      console.log('   2. F12 → Network tab → Find ajax.php request');
      console.log('   3. Copy full cookie string from request headers');
      console.log('');

      // Use readline for input
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const cookieInput = await new Promise<string>((resolve) => {
        rl.question('Paste your full COOKIE string: ', (answer) => {
          rl.close();
          resolve(answer);
        });
      });
      if (!cookieInput.trim()) {
        throw new Error('❌ No cookie provided!');
      }

      // Store the secret
      await Bun.secrets.set({ service: "datapipe", name: "COOKIE", value: cookieInput.trim() });
      console.log('✅ COOKIE stored securely in Bun.secrets!');
      console.log('🚀 Ready to run: bun scripts/datapipe.ts raw');
      break;

    case 'ws:push':
      console.log('📡 Pushing data to WebSocket clients...');

      try {
        const rawData = await fetchData();
        const bets = parseBets(rawData.data || []);
        const agents = aggregateAgents(rawData);

        // Get recent bets for live updates
        const recentBets = bets.slice(-10);

        // Publish to WebSocket channel (requires server running)
        // This is a client-side push - server needs to be running separately
        console.log(`📊 Prepared ${recentBets.length} recent bets for push`);
        console.log(`👥 Top agent: ${agents[0]?.name} (+$${Math.round(agents[0]?.stats.profit || 0)})`);

        // In a real implementation, this would connect to the WS server
        // For now, just prepare the data structure
        const pushData = {
          type: "manual_push",
          bets: recentBets,
          agents: agents.slice(0, 5),
          timestamp: new Date().toISOString()
        };

        console.log('📡 Push data prepared (start WebSocket server with: bun ws:start)');
        console.log(JSON.stringify(pushData, null, 2));

      } catch (error) {
        console.error(`❌ WS push error: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'sql-init':
      console.log('🗄️  Initializing Bun.SQL database...');

      const { Database } = await import("bun:sqlite");
      const db = new Database("datapipe.db");

      // Create bets table
      db.run(`
        CREATE TABLE IF NOT EXISTS bets (
          id TEXT PRIMARY KEY,
          betGroupId TEXT,
          ticketNumber TEXT,
          userID TEXT,
          playerId TEXT,
          partnerUserID TEXT,
          partnerID TEXT,
          profile TEXT,
          agent TEXT,
          userGroupId TEXT,
          bet TEXT,
          result TEXT,
          betGroupToWin TEXT,
          betGroupResult TEXT,
          betGroupFinalOdds TEXT,
          betGroupPremiumAwarded TEXT,
          sID TEXT,
          displaySportId TEXT,
          lID TEXT,
          eID TEXT,
          eventStartTime TEXT,
          eventResult TEXT,
          team1 TEXT,
          team2 TEXT,
          period TEXT,
          marketTypeCategory TEXT,
          logTime TEXT,
          acceptTime TEXT,
          calcTime TEXT,
          resultTime TEXT,
          gradeTime TEXT,
          state TEXT,
          accept TEXT,
          type TEXT,
          isWin TEXT,
          ipAddress TEXT,
          delay TEXT,
          balanceId TEXT,
          isFreePlay TEXT,
          fVal TEXT,
          fVal_new TEXT,
          finalUncorrelatedOdds TEXT,
          player TEXT,
          marketId TEXT,
          odds TEXT,
          skill TEXT,
          class TEXT,
          limit TEXT,
          currency TEXT,
          exchangeRate TEXT,
          displayExchangeRate TEXT,
          adminUser TEXT,
          reversedCredit TEXT,
          reversedCreditTime TEXT,
          manualLogExists TEXT,
          isSuspectedBot TEXT,
          ev TEXT,
          evRisk TEXT,
          fixedParlayName TEXT,
          fixedParlayDetails TEXT,
          teaserName TEXT,
          openSpots TEXT,
          openParlay TEXT,
          freeBetDetails TEXT,
          ifBet TEXT,
          featuredBetDetails TEXT,
          supplementalConfirmation TEXT,
          disclaimer TEXT
        )
      `);

      // Create indexes for common queries
      db.run(`CREATE INDEX IF NOT EXISTS idx_agent ON bets(agent)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_state ON bets(state)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_logTime ON bets(logTime)`);

      console.log('✅ Database initialized: datapipe.db');
      console.log('💡 Use --sql flag with other commands to store data');
      break;

    default:
      console.log(`🚀 DATAPIPE v2.6 - Query ALL 40+ Fields

USAGE:
  bun scripts/datapipe.ts setup-secrets    # Setup encrypted COOKIE (v1.3)
  bun datapipe:raw                    # Raw JSON from API
  bun datapipe:yaml                   # YAML export for Dataview
  bun datapipe:query "agent=ADAM"     # GREPA query any field
  bun datapipe:csv                    # Full CSV export (1132x40+)
  bun datapipe:graded                 # CSV + Dataview for graded bets
  bun datapipe:pending                # CSV + Dataview for pending bets
  bun datapipe:fetch                  # Agent reports (legacy)
  bun datapipe:top                    # Top 5 agents
  bun datapipe:stats                  # Quick statistics
  bun datapipe:watch                  # Auto-fetch every 5min
  bun datapipe:ws:push                # Push data to WS clients (v2.8)

FLAGS:
  --sql                              # Store data in SQLite database
  --ws                               # Push live updates to WebSocket clients

QUERY EXAMPLES:
  agent=ADAM delay>10                 # ADAM bets with delay > 10
  state=pending bet>100               # Pending bets over $100
  player~=Leong isWin=1               # Won bets with "Leong" in player
  delay>=5 delay<=15                  # Delay between 5-15

OUTPUTS:
  📄 exports/*.csv                    # Full datasets for analysis
  📊 exports/*.md                     # Dataview live filtering
  📈 dashboards/bet-reports.md        # Agent summaries
`);
  }
} catch (error) {
  console.error(`❌ Datapipe error: ${error.message}`);
  process.exit(1);
}