import { fetchJsonResult } from '../fetch-json.js';

const LIMIT_WATCH_URL = '/registry/limit-raises.json';
const LIMIT_WATCH_POLL_INTERVAL = 30_000;
const LIMIT_WATCH_QUERY_PARAMS = Object.freeze({
  state: 'watch_state',
  sport: 'watch_sport',
  market: 'watch_market',
  minStake: 'watch_stake',
});

function text(value) {
  return value == null ? '' : String(value);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function label(value) {
  return text(value)
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function classifyMovement(rows) {
  const deltas = rows
    .map(row => finiteNumber(row.line_move_5m))
    .filter(value => value != null)
    .map(Math.abs);
  if (deltas.length === 0) return { kind: 'unclassified', delta: null, tone: 'skip' };
  const delta = Math.max(...deltas);
  if (delta <= 2) return { kind: 'retail', delta, tone: 'ok' };
  if (delta <= 10) return { kind: 'vip', delta, tone: 'warn' };
  return { kind: 'sharp', delta, tone: 'bad' };
}

function sustainability(rows) {
  const scores = rows
    .map(row => finiteNumber(row.multi_factor_score))
    .filter(value => value != null);
  if (scores.length === 0) return { score: null, label: 'pending', tone: 'skip' };
  const score = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  if (score >= 0.7) return { score: round(score, 4), label: 'high', tone: 'ok' };
  if (score >= 0.5) return { score: round(score, 4), label: 'watch', tone: 'warn' };
  return { score: round(score, 4), label: 'low', tone: 'bad' };
}

function latestOperatorRows(rows) {
  const byOperator = new Map();
  for (const row of rows) {
    const current = byOperator.get(row.sportsbook);
    const currentTime = finiteNumber(current?.increased_at) ?? 0;
    const rowTime = finiteNumber(row.increased_at) ?? 0;
    const currentLimit = finiteNumber(current?.new_limit) ?? 0;
    const rowLimit = finiteNumber(row.new_limit) ?? 0;
    if (!current || rowTime > currentTime || (rowTime === currentTime && rowLimit > currentLimit)) {
      byOperator.set(row.sportsbook, row);
    }
  }
  return [...byOperator.values()].sort(
    (left, right) =>
      (finiteNumber(right.new_limit) ?? 0) - (finiteNumber(left.new_limit) ?? 0) ||
      text(left.sportsbook).localeCompare(text(right.sportsbook))
  );
}

function flattenSnapshot(snapshot) {
  const nodePatterns = new Map(
    (snapshot?.patterns?.nodePatterns ?? []).map(pattern => [text(pattern.node_id), pattern])
  );
  return Object.entries(snapshot?.byNode ?? {}).flatMap(([nodeId, bucket]) => {
    const pattern = nodePatterns.get(nodeId) ?? {};
    return (bucket?.raises ?? []).map(row => ({
      ...row,
      node_id: nodeId,
      node_name: pattern.node_name ?? nodeId,
      state_code: pattern.state_code ?? null,
      zip_prefix: pattern.zip_prefix ?? null,
      license_status: pattern.license_status ?? null,
      direction:
        row.direction ??
        ((finiteNumber(row.new_limit) ?? 0) >= (finiteNumber(row.previous_max) ?? 0)
          ? 'up'
          : 'down'),
    }));
  });
}

export function buildLimitWatchProjection(snapshot, filters = {}) {
  const allRows = flattenSnapshot(snapshot).filter(
    row => row.sportsbook && row.sport_id && row.market_id
  );
  const universe = {
    states: [...new Set(allRows.map(row => text(row.state_code)).filter(Boolean))].sort(),
    sports: [...new Set(allRows.map(row => text(row.sport_id)).filter(Boolean))].sort(),
    markets: [...new Set(allRows.map(row => text(row.market_id)).filter(Boolean))].sort(),
  };
  const minStake = Math.max(0, finiteNumber(filters.minStake) ?? 0);
  const rows = allRows.filter(row => {
    if (filters.state && row.state_code !== filters.state) return false;
    if (filters.sport && row.sport_id !== filters.sport) return false;
    if (filters.market && row.market_id !== filters.market) return false;
    return true;
  });
  const grouped = new Map();
  for (const row of rows) {
    const key = [row.state_code ?? 'unmapped', row.sport_id, row.market_id, row.bet_type].join('|');
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  const signals = [...grouped].map(([key, groupRows]) => {
    const operators = latestOperatorRows(groupRows);
    const operatorLimits = operators
      .map(row => finiteNumber(row.new_limit))
      .filter(value => value != null);
    const maxStake = operatorLimits.length > 0 ? Math.min(...operatorLimits) : 0;
    const maxObserved = operatorLimits.length > 0 ? Math.max(...operatorLimits) : 0;
    const movement = classifyMovement(groupRows);
    const strength = sustainability(groupRows);
    const licensedNodes = new Set(
      groupRows.filter(row => row.license_status === 'active').map(row => row.node_id)
    ).size;
    const proofRows = groupRows.filter(row => row.context_proof?.valid === true).length;
    return {
      key,
      state: text(groupRows[0]?.state_code) || 'unmapped',
      sport: text(groupRows[0]?.sport_id),
      market: text(groupRows[0]?.market_id),
      phase: text(groupRows[0]?.bet_type) || 'unmapped',
      operators: operators.map(row => ({
        name: text(row.sportsbook),
        maxStake: finiteNumber(row.new_limit) ?? 0,
      })),
      operatorCount: operators.length,
      crossOperator: operators.length >= 2,
      maxStake,
      maxObserved,
      stakeSpread: maxObserved - maxStake,
      actionable: operators.length >= 2 && maxStake >= minStake,
      movement,
      sustainability: strength,
      evidence: {
        rows: groupRows.length,
        licensedNodes,
        proofRows,
      },
    };
  });
  signals.sort(
    (left, right) =>
      Number(right.actionable) - Number(left.actionable) ||
      right.operatorCount - left.operatorCount ||
      (right.sustainability.score ?? -1) - (left.sustainability.score ?? -1) ||
      right.maxStake - left.maxStake ||
      left.key.localeCompare(right.key)
  );
  const crossOperator = signals.filter(signal => signal.crossOperator);
  const actionable = crossOperator.filter(signal => signal.actionable);
  return {
    filters: { ...filters, minStake },
    universe,
    signals,
    summary: {
      signals: signals.length,
      crossOperator: crossOperator.length,
      actionable: actionable.length,
      states: new Set(signals.map(signal => signal.state).filter(state => state !== 'unmapped'))
        .size,
      operators: new Set(signals.flatMap(signal => signal.operators.map(operator => operator.name)))
        .size,
      stakeCapacity: actionable.reduce((maximum, signal) => Math.max(maximum, signal.maxStake), 0),
    },
  };
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = text(value);
  return element.innerHTML;
}

function filterStateFromUrl() {
  const url = new URL(window.location.href);
  return {
    state: url.searchParams.get(LIMIT_WATCH_QUERY_PARAMS.state) ?? '',
    sport: url.searchParams.get(LIMIT_WATCH_QUERY_PARAMS.sport) ?? '',
    market: url.searchParams.get(LIMIT_WATCH_QUERY_PARAMS.market) ?? '',
    minStake: url.searchParams.get(LIMIT_WATCH_QUERY_PARAMS.minStake) ?? '500',
  };
}

function syncFiltersToUrl(filters) {
  const url = new URL(window.location.href);
  for (const [key, parameter] of Object.entries(LIMIT_WATCH_QUERY_PARAMS)) {
    const value = text(filters[key]);
    if (value && !(key === 'minStake' && value === '500')) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
  }
  history.replaceState(history.state, '', url);
}

function setOptions(select, values, current, emptyLabel) {
  select.replaceChildren(new Option(emptyLabel, ''));
  for (const value of values) select.append(new Option(label(value), value));
  select.value = values.includes(current) ? current : '';
}

function currentFilters() {
  return {
    state: document.getElementById('watch-state')?.value ?? '',
    sport: document.getElementById('watch-sport')?.value ?? '',
    market: document.getElementById('watch-market')?.value ?? '',
    minStake: document.getElementById('watch-min-stake')?.value ?? '500',
  };
}

function renderSummary(summary) {
  const values = {
    'watch-actionable': summary.actionable,
    'watch-cross-operator': summary.crossOperator,
    'watch-states': summary.states,
    'watch-operators': summary.operators,
    'watch-capacity': money(summary.stakeCapacity),
  };
  for (const [id, value] of Object.entries(values)) {
    const target = document.getElementById(id);
    if (target) target.textContent = value;
  }
}

function renderSignals(projection) {
  const body = document.getElementById('limit-watch-body');
  const status = document.getElementById('limit-watch-status');
  if (!body || !status) return;
  const rows = projection.signals.filter(signal => signal.crossOperator);
  status.textContent = rows.length
    ? `${projection.summary.actionable} actionable of ${rows.length} cross-operator signals`
    : 'No cross-operator signals match the active filters';
  body.innerHTML = rows.length
    ? rows
        .map(signal => {
          const operatorCells = signal.operators
            .map(
              operator =>
                `<span><strong>${escapeHtml(label(operator.name))}</strong> ${escapeHtml(money(operator.maxStake))}</span>`
            )
            .join('');
          const movementDetail =
            signal.movement.delta == null
              ? 'no line delta'
              : `${signal.movement.delta.toFixed(2)} move`;
          const score =
            signal.sustainability.score == null
              ? 'pending'
              : `${Math.round(signal.sustainability.score * 100)}%`;
          const actionTone = signal.actionable ? 'ok' : 'warn';
          return `<tr>
            <td><strong>${escapeHtml(signal.state)}</strong><br><small>${signal.evidence.licensedNodes} licensed nodes</small></td>
            <td><strong>${escapeHtml(label(signal.sport))}</strong><br><small>${escapeHtml(label(signal.market))} · ${escapeHtml(label(signal.phase))}</small></td>
            <td><div class="limit-watch-operators">${operatorCells}</div></td>
            <td><strong>${escapeHtml(money(signal.maxStake))}</strong><br><small>${escapeHtml(money(signal.stakeSpread))} operator spread</small></td>
            <td><span class="status-token" data-tone="${signal.movement.tone}">${escapeHtml(signal.movement.kind)}</span><br><small>${escapeHtml(movementDetail)}</small></td>
            <td><span class="status-token" data-tone="${signal.sustainability.tone}">${escapeHtml(signal.sustainability.label)}</span><br><small>${escapeHtml(score)} influence</small></td>
            <td><span class="status-token" data-tone="${actionTone}">${signal.actionable ? 'stake ready' : 'below target'}</span><br><small>${signal.evidence.proofRows}/${signal.evidence.rows} proof rows</small></td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="7" class="empty">No cross-operator regional limit signals match this stake target.</td></tr>';
}

let limitWatchSnapshot = null;

function render() {
  if (!limitWatchSnapshot) return;
  const filters = currentFilters();
  const projection = buildLimitWatchProjection(limitWatchSnapshot, filters);
  renderSummary(projection.summary);
  renderSignals(projection);
  syncFiltersToUrl(filters);
}

async function load() {
  const status = document.getElementById('limit-watch-status');
  try {
    const result = await fetchJsonResult(LIMIT_WATCH_URL, {
      method: 'GET',
      timeoutMs: 5_000,
    });
    if (!result.ok) {
      throw new Error(
        `limit artifact ${result.kind ?? 'fetch'} failure${result.status ? ` (HTTP ${result.status})` : ''}: ${result.error ?? 'unavailable'}`
      );
    }
    if (result.contentType && !/json/i.test(result.contentType)) {
      throw new Error(`limit artifact returned ${result.contentType}; expected JSON`);
    }
    limitWatchSnapshot = result.data;
    const filters = filterStateFromUrl();
    const projection = buildLimitWatchProjection(limitWatchSnapshot, filters);
    setOptions(
      document.getElementById('watch-state'),
      projection.universe.states,
      filters.state,
      'All states'
    );
    setOptions(
      document.getElementById('watch-sport'),
      projection.universe.sports,
      filters.sport,
      'All sports'
    );
    setOptions(
      document.getElementById('watch-market'),
      projection.universe.markets,
      filters.market,
      'All markets'
    );
    document.getElementById('watch-min-stake').value = filters.minStake;
    render();
  } catch (error) {
    if (status) {
      const message = error instanceof Error ? error.message : text(error);
      status.textContent = `${message}; retrying automatically`;
    }
  }
}

function mount() {
  if (!document.getElementById('limit-watch')) return;
  for (const id of ['watch-state', 'watch-sport', 'watch-market']) {
    document.getElementById(id)?.addEventListener('change', render);
  }
  document.getElementById('watch-min-stake')?.addEventListener('input', render);
  window.addEventListener('popstate', () => void load());
  void load();
  window.setInterval(() => void load(), LIMIT_WATCH_POLL_INTERVAL);
}

if (typeof document !== 'undefined') mount();
