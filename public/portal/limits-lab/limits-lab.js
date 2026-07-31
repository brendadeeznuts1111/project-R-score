const ARTIFACT_URL = '/registry/limit-forecast-lab.json';

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
