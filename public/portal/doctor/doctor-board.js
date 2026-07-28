/**
 * Portal doctor board — reads /registry/doctor-state.json; loopback run via /api/doctor/run.
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isLoopback() {
  const h = location.hostname;
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** @param {object|null} state */
export function renderDoctorState(state) {
  const toneEl = document.getElementById('doc-tone');
  const meta = document.getElementById('doc-meta');
  const stats = document.getElementById('doc-stats');
  const groups = document.getElementById('doc-groups');
  const body = document.getElementById('doc-body');
  if (!toneEl || !body) return;

  if (!state || state.kind !== 'portal-doctor-state') {
    toneEl.textContent = 'missing';
    toneEl.className = 'doc-badge yellow';
    if (meta) {
      meta.textContent =
        'No doctor-state bake — run: bun run bake:doctor  ·  or portal-cli doctor';
    }
    body.innerHTML =
      '<tr><td colspan="6" class="dim">Missing /registry/doctor-state.json</td></tr>';
    return;
  }

  const tone = state.tone || (state.ok ? 'green' : 'red');
  toneEl.textContent = tone;
  toneEl.className = `doc-badge ${tone}`;
  const s = state.summary || {};
  if (meta) {
    meta.textContent = `generated ${ageLabel(state.generatedAt)} · ${s.passed ?? 0}/${s.checkCount ?? 0} passed · fatalFail=${s.failedFatal ?? 0} · ${state.cli || 'bun run portal:doctor'}`;
  }

  if (stats) {
    stats.innerHTML = [
      ['passed', `${s.passed ?? 0}/${s.checkCount ?? 0}`],
      ['failed', String(s.failed ?? 0)],
      ['fatal fail', String(s.failedFatal ?? 0)],
      ['auto-fixable', String(s.autoFixableFailed ?? 0)],
    ]
      .map(
        ([k, v]) =>
          `<div class="doc-stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`
      )
      .join('');
  }

  if (groups) {
    const bg = state.byGroup || {};
    const chips = Object.entries(bg)
      .map(([g, v]) => {
        const fail = v?.failed ?? 0;
        return `<span class="group-chip" title="failed ${fail}/${v?.total ?? 0}">${esc(g)} · ${fail ? `${fail} fail` : 'ok'}</span>`;
      })
      .join(' ');
    groups.innerHTML = chips || '—';
  }

  const checks = Array.isArray(state.checks) ? state.checks : [];
  body.innerHTML = checks
    .map(c => {
      const rowClass = c.ok ? '' : 'fail';
      const st = c.ok ? '✓' : '✗';
      const fix = c.fixCommand
        ? `<code>${esc(c.fixCommand)}</code>`
        : '<span class="dim">—</span>';
      return `<tr class="${rowClass}">
        <td>${st}</td>
        <td><span class="group-chip">${esc(c.group)}</span></td>
        <td><code>${esc(c.id)}</code></td>
        <td>${esc(c.level)}</td>
        <td>${esc(c.message)}</td>
        <td>${fix}</td>
      </tr>`;
    })
    .join('');
}

async function load() {
  const r = await fetchJsonResult('/registry/doctor-state.json');
  renderDoctorState(r.ok ? r.data : null);
}

async function runDoctor() {
  const btn = document.getElementById('doc-run');
  const status = document.getElementById('doc-run-status');
  if (!isLoopback()) {
    if (status) {
      status.textContent =
        'Run is loopback-only. Use: bun run bake:doctor  or  bun run portal:doctor';
    }
    return;
  }
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Running portal doctor…';
  try {
    const res = await fetch('/api/doctor/run', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      if (status) status.textContent = data?.error || `run failed (${res.status})`;
      return;
    }
    if (status) {
      status.textContent = `OK · tone=${data?.tone ?? '—'} · wrote doctor-state.json`;
    }
    if (data?.state) renderDoctorState(data.state);
    else await load();
  } catch (e) {
    if (status) status.textContent = String(e?.message || e);
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function initDoctorBoard() {
  await load();
  document.getElementById('doc-run')?.addEventListener('click', () => {
    void runDoctor();
  });
  bindCopyButtons();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initDoctorBoard();
    });
  } else {
    void initDoctorBoard();
  }
}
