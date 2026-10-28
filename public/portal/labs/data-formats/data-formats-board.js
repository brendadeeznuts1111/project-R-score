import { fetchJsonResult } from '/portal/fetch-json.js';

const gate = document.getElementById('format-gate');
const meta = document.getElementById('format-meta');
const stats = document.getElementById('format-stats');
const count = document.getElementById('format-count');
const rows = document.getElementById('format-rows');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stat(label, value, hint, tone) {
  const card = element('div', `portal-stat ${tone}`);
  card.append(element('span', 'k', label), element('span', 'v', String(value)), element('span', 'hint', hint));
  return card;
}

function cell(text) {
  return element('td', '', text);
}

function isDataFormatReport(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      data.schemaVersion === 3 &&
      ['off', 'preview', 'enabled'].includes(data.mode) &&
      typeof data.manifestSha256 === 'string' &&
      data.manifestSha256.length === 64 &&
      data.runtime &&
      typeof data.runtime.version === 'string' &&
      data.summary &&
      Number.isInteger(data.summary.total) &&
      Number.isInteger(data.summary.proofFailures) &&
      Array.isArray(data.formats)
  );
}

function render(data) {
  const { summary, runtime, mode, formats } = data;
  const healthy = summary.drift === 0 && summary.proofFailures === 0;
  gate.className = `portal-gate ${healthy ? (summary.gated ? 'warn' : 'ok') : 'bad'}`;
  gate.textContent = healthy ? `${mode} · capability contract valid` : `${mode} · contract drift`;
  meta.textContent = `Bun ${runtime.version} · manifest ${data.manifestSha256.slice(0, 12)} · ${new Date(data.generatedAt).toLocaleString()}`;
  stats.replaceChildren(
    stat('Available', summary.available, 'native APIs proved', 'ok'),
    stat('Runtime-gated', summary.gated, 'awaiting stable runtime', summary.gated ? 'warn' : 'muted'),
    stat('Contract drift', summary.drift, 'unexpected missing APIs', summary.drift ? 'bad' : 'ok'),
    stat('Proof failures', summary.proofFailures, 'fixture execution errors', summary.proofFailures ? 'bad' : 'ok'),
    stat('Exposure', mode, 'reviewed manifest state', mode === 'enabled' ? 'ok' : 'warn')
  );
  count.textContent = `${summary.total} formats`;
  rows.replaceChildren();

  if (mode === 'off') {
    const row = document.createElement('tr');
    const message = cell('This surface is disabled by the reviewed exposure manifest.');
    message.colSpan = 5;
    row.append(message);
    rows.append(row);
    return;
  }

  for (const format of formats) {
    const row = document.createElement('tr');
    const positiveEntries = Object.entries(format.behaviorProof?.positive || {});
    const negativeEntries = Object.entries(format.behaviorProof?.negative || {});
    const timing = result =>
      `${result.durationNs} ns (${Number(result.durationMs).toFixed(6)} ms)`;
    const positive = positiveEntries
      .map(
        ([operation, result]) =>
          `${operation} ${result.ok ? `✓ ${result.outputBytes} B` : `✗ ${result.error}`} · ${timing(result)}`
      )
      .join(' · ');
    const negative = negativeEntries
      .map(([operation, result]) => `${operation} rejects ✓ ${result.behavior} · ${timing(result)}`)
      .join(' · ');
    const roundTrip = format.behaviorProof?.roundTrip
      ? `round-trip ${format.behaviorProof.roundTrip.ok ? '✓' : '✗'} · ${timing(format.behaviorProof.roundTrip)}`
      : '';
    const proof = positiveEntries.length
      ? [positive, negative, roundTrip].filter(Boolean).join(' · ')
      : `not run · ${format.status}`;
    const minimum = format.minimumBunVersion ? ` · Bun ≥ ${format.minimumBunVersion}` : '';
    row.append(
      cell(format.label),
      cell(format.api),
      cell(format.requiredOperations.join(', ')),
      cell(`${format.status}${minimum}`),
      cell(proof)
    );
    rows.append(row);
  }
}

const result = await fetchJsonResult('/portal/registry/data-format-lab.json', { timeoutMs: 5000 });
if (result.ok && isDataFormatReport(result.data)) render(result.data);
else {
  gate.className = 'portal-gate bad';
  gate.textContent = 'proof unavailable';
  meta.textContent = result.ok
    ? 'schema · invalid data-format report'
    : `${result.kind || 'error'} · ${result.error || 'unknown error'}`;
  rows.replaceChildren();
  const row = document.createElement('tr');
  const message = cell('The baked capability artifact could not be loaded.');
  message.colSpan = 5;
  row.append(message);
  rows.append(row);
}
