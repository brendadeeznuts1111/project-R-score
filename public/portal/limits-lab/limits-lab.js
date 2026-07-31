const ARTIFACT_URL = '/registry/limit-forecast-lab.json';
const TAXONOMY_URL = '/registry/sports-taxonomy.json';

function esc(value) {
  const element = document.createElement('div');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

function percent(value) {
  return value == null ? '—' : `${(Number(value) * 100).toFixed(1)}%`;
}

function metric(value, label) {
  return `<div class="lab-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function score(value) {
  return value == null ? '—' : Number(value).toFixed(4);
}

function render(payload) {
  document.getElementById('lab-stats').innerHTML = [
    metric(payload.dataset.snapshots, 'snapshots'),
    metric(payload.dataset.transitions, 'transitions'),
    metric(payload.dataset.sportsbooks, 'sportsbooks'),
    metric(payload.dataset.raises, 'raises'),
    metric(payload.dataset.cutsOrFlat, 'cuts or flat'),
    metric(percent(payload.model.globalRate), 'smoothed global rate'),
    metric(payload.evidence.issues, 'issued forecasts'),
    metric(payload.evidence.matured, 'matured outcomes'),
    metric(payload.evidence.negatives, 'matured no-raise'),
  ].join('');

  const blockers = payload.promotion.blockers.map(item => `<li>${esc(item)}</li>`).join('');
  document.getElementById('lab-promotion').innerHTML = `
    <strong>Not eligible for production promotion.</strong>
    <p>${esc(payload.dataset.reason)}</p>
    <ul>${blockers}</ul>
    <small>Next candidate: <code>${esc(payload.promotion.nextModel)}</code></small>`;

  document.getElementById('lab-candidates').innerHTML = payload.model.candidates
    .map(
      candidate => `<tr>
        <td><strong>${esc(candidate.label)}</strong><br><code>${esc(candidate.id)}</code></td>
        <td>${esc(candidate.scope)}</td>
        <td>${esc(candidate.score.samples)}</td>
        <td>${score(candidate.score.brier)}</td>
        <td>${score(candidate.score.logLoss)}</td>
      </tr>`
    )
    .join('');

  document.getElementById('lab-evidence').innerHTML = `
    <div class="lab-evidence-grid">
      ${metric(payload.evidence.pending, 'pending horizon')}
      ${metric(payload.evidence.dueAwaitingObservation, 'awaiting observation')}
      ${metric(payload.evidence.positives, 'matured raises')}
      ${metric(payload.evidence.negatives, 'matured no-raise')}
      ${metric(score(payload.evidence.meanBrierScore), 'mean Brier')}
      ${metric(score(payload.evidence.meanLogLoss), 'mean log loss')}
    </div>`;

  document.getElementById('lab-books').innerHTML = payload.model.books
    .map(
      book => `<tr>
        <td><strong>${esc(book.sportsbook)}</strong></td>
        <td>${esc(book.transitions)}</td>
        <td>${esc(book.raises)}</td>
        <td>${percent(book.observedRate)}</td>
        <td>${percent(book.pooledRate)}</td>
        <td>${percent(book.globalWeight)}</td>
        <td><span class="lab-badge">${esc(book.support)}</span></td>
      </tr>`
    )
    .join('');
}

async function load() {
  try {
    const response = await fetch(ARTIFACT_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`artifact returned HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.schemaVersion !== 1 || payload.kind !== 'limit-forecast-lab') {
      throw new Error('unsupported Limits Forecast Lab artifact');
    }
    render(payload);
  } catch (error) {
    document.getElementById('lab-promotion').textContent =
      error instanceof Error ? error.message : String(error);
  }
}

function addOptions(select, rows, valueKey, label) {
  select.replaceChildren(
    ...rows.map(row => {
      const option = document.createElement('option');
      option.value = row[valueKey];
      option.textContent = label(row);
      return option;
    })
  );
}

function taxonomyState(payload) {
  const url = new URL(window.location.href);
  const requestedSport = url.searchParams.get('sport');
  const requestedLeague = url.searchParams.get('league');
  const requestedCountry = url.searchParams.get('country');
  const sport = payload.sports.some(row => row.key === requestedSport) ? requestedSport : 'tennis';
  const matchingLeagues = payload.leagues.filter(row => row.sport === sport);
  const league = matchingLeagues.some(row => row.key === requestedLeague)
    ? requestedLeague
    : (matchingLeagues.find(row => row.key === 'itf')?.key ?? matchingLeagues[0]?.key);
  const country = payload.countries.some(row => row.code === requestedCountry)
    ? requestedCountry
    : '';
  return { sport, league, country };
}

function syncTaxonomyUrl(state) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(state)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (!url.hash) url.hash = '#section:sports-taxonomy';
  history.replaceState(history.state, '', url);
}

function renderTaxonomy(payload, state) {
  const sport = payload.sports.find(row => row.key === state.sport);
  const league = payload.leagues.find(row => row.key === state.league);
  const country = payload.countries.find(row => row.code === state.country);
  const competitions = payload.competitions.filter(row => row.league === state.league);
  const scopeLabel = league?.scope.replace('_', ' ') ?? 'unresolved scope';
  const flag = country?.flagEmoji ?? league?.flagEmoji ?? '🌐';
  const flagLabel = country
    ? `${country.label} hosts this event.`
    : league?.scope === 'global'
      ? 'Global competition; choose the event host country to assign its flag.'
      : `League footprint: ${league?.countries.join(', ') || 'not mapped'}.`;

  document.getElementById('taxonomy-context').innerHTML = `
    <span class="taxonomy-context-flag" role="img" aria-label="${esc(country?.flagAriaLabel ?? 'Competition geography')}">${esc(flag)}</span>
    <div>
      <strong>${esc(sport?.label ?? 'Unknown sport')} · ${esc(league?.label ?? 'Unknown league')}</strong>
      <span>${esc(flagLabel)} Scope: ${esc(scopeLabel)}.</span>
    </div>`;

  const cards = competitions.length
    ? competitions.map(
        row => `<article class="taxonomy-card">
          <header><strong>${esc(row.label)}</strong><span>${esc(country?.flagEmoji ?? '🌐')}</span></header>
          <code>${esc(row.conceptId)}</code>
        </article>`
      )
    : [
        `<article class="taxonomy-card">
          <header><strong>${esc(league?.label ?? 'League')}</strong><span>${esc(flag)}</span></header>
          <code>${esc(league?.conceptId ?? 'league.unresolved')}</code>
        </article>`,
      ];
  document.getElementById('taxonomy-grid').innerHTML = cards.join('');
}

function mountTaxonomy(payload) {
  const sportSelect = document.getElementById('taxonomy-sport');
  const leagueSelect = document.getElementById('taxonomy-league');
  const countrySelect = document.getElementById('taxonomy-country');
  const state = taxonomyState(payload);

  addOptions(sportSelect, payload.sports, 'key', row => row.label);
  countrySelect.append(new Option('Choose event country…', ''));
  for (const country of payload.countries) {
    countrySelect.append(new Option(`${country.flagEmoji} ${country.label}`, country.code));
  }

  const refreshLeagues = preferred => {
    const rows = payload.leagues.filter(row => row.sport === sportSelect.value);
    addOptions(leagueSelect, rows, 'key', row => `${row.flagEmoji} ${row.label}`);
    leagueSelect.value = rows.some(row => row.key === preferred) ? preferred : (rows[0]?.key ?? '');
  };

  sportSelect.value = state.sport;
  refreshLeagues(state.league);
  countrySelect.value = state.country;

  const refresh = () => {
    const next = {
      sport: sportSelect.value,
      league: leagueSelect.value,
      country: countrySelect.value,
    };
    renderTaxonomy(payload, next);
    syncTaxonomyUrl(next);
  };
  sportSelect.addEventListener('change', () => {
    refreshLeagues();
    refresh();
  });
  leagueSelect.addEventListener('change', refresh);
  countrySelect.addEventListener('change', refresh);
  renderTaxonomy(payload, state);
}

async function loadTaxonomy() {
  try {
    const response = await fetch(TAXONOMY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`taxonomy returned HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.schemaVersion !== 1 || payload.kind !== 'sports-competition-taxonomy') {
      throw new Error('unsupported sports taxonomy artifact');
    }
    mountTaxonomy(payload);
  } catch (error) {
    document.getElementById('taxonomy-context').textContent =
      error instanceof Error ? error.message : String(error);
  }
}

function mountCopyCommands() {
  for (const button of document.querySelectorAll('.copy-cli')) {
    button.addEventListener('click', async () => {
      const command = button.dataset.cli;
      if (!command) return;
      const previous = button.textContent;
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    });
  }
}

mountCopyCommands();
load();
loadTaxonomy();
