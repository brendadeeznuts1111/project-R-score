/**
 * Packages graph map board — load + render with explicit failure paths.
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/monorepo-health.md (claim packages-graph-map-v12)
 */

/** Supported bake schema for this board (pin — warn on mismatch, still try to render). */
export const PACKAGES_MAP_SCHEMA = 12;

/** Primary registry bake + optional local audit-report fallbacks (dev only paths may 404 on Pages). */
export const PACKAGES_MAP_SOURCES = [
  '/registry/packages-graph-map.json',
  '/audit-report.json',
];

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatLoadError(err) {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

/**
 * Normalize audit report vs packages-graph-map bake into a board view-model.
 * @param {Record<string, unknown>} raw
 * @param {string} source
 */
export function normalizePackagesMap(raw, source) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Map payload is empty or not an object');
  }
  const kind = raw.kind;
  // Full audit report embeds map; bake is map-first with packages at top level.
  const map =
    kind === 'packages-metafile-audit' && raw.map && typeof raw.map === 'object'
      ? /** @type {Record<string, unknown>} */ (raw.map)
      : raw.map && typeof raw.map === 'object'
        ? /** @type {Record<string, unknown>} */ (raw.map)
        : /** @type {Record<string, unknown>} */ (raw);

  const packages = Array.isArray(raw.packages)
    ? raw.packages
    : Array.isArray(map.packages) && map.packages.every(p => typeof p === 'object')
      ? map.packages
      : [];

  // When packages is string[] on map only, synthesize rows from packageScores + coupling.
  let rows = packages;
  if (packages.length && typeof packages[0] === 'string') {
    const scores = new Map(
      (Array.isArray(map.packageScores) ? map.packageScores : []).map(s => [s.package, s])
    );
    const coupling = new Map(
      (Array.isArray(map.coupling) ? map.coupling : []).map(c => [c.package, c])
    );
    rows = packages.map(name => {
      const sc = scores.get(name);
      const c = coupling.get(name);
      return {
        name,
        score: sc?.score,
        grade: sc?.grade,
        role: c?.role,
        orphans: 0,
        bytes: 0,
      };
    });
  }

  const schemaVersion = Number(raw.schemaVersion ?? map.schemaVersion ?? 0);
  return {
    source,
    schemaVersion,
    schemaOk: schemaVersion === PACKAGES_MAP_SCHEMA || schemaVersion === 0,
    generatedAt: raw.generatedAt ?? map.generatedAt ?? '',
    bunVersion: raw.bunVersion ?? map.bunVersion ?? '',
    score: raw.score ?? map.score,
    grade: raw.grade ?? map.grade,
    map,
    packages: rows,
    summary: map.summary && typeof map.summary === 'object' ? map.summary : {},
    actions: Array.isArray(map.actions) ? map.actions : [],
    archiveProbes: Array.isArray(map.archiveProbes) ? map.archiveProbes : [],
    quarantine: Array.isArray(map.quarantine) ? map.quarantine : [],
    vault: map.vault && typeof map.vault === 'object' ? map.vault : null,
    env: map.env && typeof map.env === 'object' ? map.env : null,
  };
}

/**
 * Fetch first successful map source.
 * @param {string[]} [sources]
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function loadPackagesMap(sources = PACKAGES_MAP_SOURCES, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: opts.signal ?? AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      let raw;
      try {
        raw = await res.json();
      } catch {
        errors.push(`${url}: invalid JSON`);
        continue;
      }
      return normalizePackagesMap(raw, url);
    } catch (err) {
      errors.push(`${url}: ${formatLoadError(err)}`);
    }
  }
  const detail = errors.length ? errors.join(' · ') : 'no sources configured';
  throw new Error(`Packages map unavailable — ${detail}`);
}

/**
 * @param {HTMLElement | null} el
 * @param {string} text
 */
function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * @param {ReturnType<typeof normalizePackagesMap>} data
 * @param {Document} doc
 */
/**
 * Grade band for package / board scores (matches monorepo-health).
 * @param {number | null | undefined} score
 * @returns {'healthy'|'needs-improvement'|'critical'|'unknown'}
 */
export function gradeFromScore(score) {
  if (score == null || !Number.isFinite(Number(score))) return 'unknown';
  const n = Number(score);
  if (n >= 90) return 'healthy';
  if (n >= 60) return 'needs-improvement';
  return 'critical';
}

/** Operator CLI hint for coupling actions. */
export function actionHint(action) {
  switch (action) {
    case 'wire-root-dep':
      return 'bun run audit:packages:apply';
    case 'migrate-relative-imports':
      return 'prefer @factorywager/<pkg> over packages/<pkg>/…';
    case 'archive-candidate':
      return 'review probes · quarantine blocks hard delete';
    default:
      return '';
  }
}

export function renderPackagesBoard(data, doc = document) {
  const summary = data.summary ?? {};
  const boardGrade = gradeFromScore(data.score);
  const scoreEl = doc.getElementById('s-score');
  setText(scoreEl, data.score != null ? String(data.score) : '—');
  if (scoreEl) {
    scoreEl.className = `stat-num grade-${boardGrade}`;
    scoreEl.title = data.grade ? String(data.grade) : boardGrade;
  }
  setText(
    doc.getElementById('s-avg'),
    summary.avgPackageScore != null ? String(summary.avgPackageScore) : '—'
  );
  setText(
    doc.getElementById('s-actions'),
    summary.openActions != null ? String(summary.openActions) : '—'
  );
  setText(
    doc.getElementById('s-archive'),
    summary.archivePlaceholders != null ? String(summary.archivePlaceholders) : '—'
  );
  setText(
    doc.getElementById('s-quarantine'),
    summary.quarantineCount != null
      ? String(summary.quarantineCount)
      : String((data.quarantine || []).length)
  );
  setText(
    doc.getElementById('s-inject'),
    summary.envRootRuntimeNeedsInject != null
      ? String(summary.envRootRuntimeNeedsInject)
      : data.env?.summary?.rootRuntimeNeedsInject != null
        ? String(data.env.summary.rootRuntimeNeedsInject)
        : '—'
  );
  setText(doc.getElementById('hub'), summary.topHub != null ? String(summary.topHub) : '—');

  const schemaNote = data.schemaOk
    ? `schema ${data.schemaVersion || PACKAGES_MAP_SCHEMA}`
    : `schema ${data.schemaVersion} (board pins v${PACKAGES_MAP_SCHEMA} — rebake recommended)`;
  const gradeNote = data.grade ? ` · ${data.grade}` : '';
  setText(
    doc.getElementById('gen-meta'),
    `${data.generatedAt || 'unknown time'} · bun ${data.bunVersion || '?'} · ${schemaNote}${gradeNote} · ${data.source}`
  );

  const body = doc.getElementById('pkg-body');
  if (body) {
    body.replaceChildren();
    if (!data.packages.length) {
      const tr = doc.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="pkg-empty">No package rows in bake</td>`;
      body.appendChild(tr);
    } else {
      // Sort: critical / needs-improvement first, then name
      const rows = [...data.packages].sort((a, b) => {
        const ga = gradeFromScore(a.score);
        const gb = gradeFromScore(b.score);
        const rank = g =>
          g === 'critical' ? 0 : g === 'needs-improvement' ? 1 : g === 'healthy' ? 2 : 3;
        return rank(ga) - rank(gb) || String(a.name ?? a.package).localeCompare(String(b.name ?? b.package));
      });
      for (const p of rows) {
        const tr = doc.createElement('tr');
        const role = p.role ?? '—';
        const name = p.name ?? p.package ?? '—';
        const bytes = typeof p.bytes === 'number' ? (p.bytes / 1024).toFixed(1) : '—';
        const g = gradeFromScore(p.score);
        tr.innerHTML = `<td>${escapeHtml(String(name))}</td><td class="role role-${escapeAttr(String(role))}">${escapeHtml(String(role))}</td><td class="grade-${g}">${p.score ?? '—'}</td><td>${p.orphans ?? 0}</td><td>${bytes}</td>`;
        body.appendChild(tr);
      }
    }
  }

  const actionList = doc.getElementById('action-list');
  if (actionList) {
    const actions = data.actions.filter(a => a.action !== 'ok');
    actionList.innerHTML = actions.length
      ? actions
          .map(a => {
            const hint = actionHint(a.action);
            const hintHtml = hint
              ? ` · <span class="action-hint"><code>${escapeHtml(hint)}</code></span>`
              : '';
            return `<li><code>${escapeHtml(a.package)}</code> · <strong>${escapeHtml(a.action)}</strong> — ${escapeHtml(a.reason)}${hintHtml}</li>`;
          })
          .join('')
      : '<li>None — coupling aligned</li>';
  }

  const probeList = doc.getElementById('probe-list');
  if (probeList) {
    const probes = data.archiveProbes;
    probeList.innerHTML = probes.length
      ? probes
          .map(
            p =>
              `<li><code>${escapeHtml(p.package)}</code> · ${escapeHtml(p.kind)} → <strong>${escapeHtml(p.recommendation)}</strong> — ${escapeHtml(p.note)}</li>`
          )
          .join('')
      : '<li>No dormant packages</li>';
  }

  const quarantineList = doc.getElementById('quarantine-list');
  if (quarantineList) {
    const q = data.quarantine || [];
    quarantineList.innerHTML = q.length
      ? q
          .map(
            row =>
              `<li><code>${escapeHtml(row.package)}</code> · blockedBy=[${(row.blockedBy || []).map(escapeHtml).join(', ') || '—'}] — ${escapeHtml(row.reason || '')}</li>`
          )
          .join('')
      : '<li>None</li>';
  }

  const vaultList = doc.getElementById('vault-list');
  const vaultGapMeta = doc.getElementById('vault-gap-meta');
  const vault = data.vault;
  if (vaultList) {
    if (vault?.byPackage?.length) {
      vaultList.innerHTML = vault.byPackage
        .map(r => {
          const miss = r.missingTemplateKeys?.length
            ? ` · missing: ${r.missingTemplateKeys.map(escapeHtml).join(', ')}`
            : '';
          return `<li><code>${escapeHtml(r.package)}</code> · ${(r.envKeys || []).map(escapeHtml).join(', ')}${miss}</li>`;
        })
        .join('');
      if (vault.gap && vaultGapMeta) {
        vaultGapMeta.textContent = `pass-cli=${vault.gap.passCliAvailable ? 'yes' : 'no'} · items=${vault.gap.passItemCount ?? '—'} · humanOpen=${(vault.gap.humanOpen || []).join(', ') || '—'} · wouldMint=${(vault.gap.mintableWouldMint || []).join(', ') || '—'}`;
      }
    } else {
      vaultList.innerHTML =
        '<li>No vault plane in bake — run <code>bun run audit:packages:vault</code></li>';
    }
  }

  const envMeta = doc.getElementById('env-meta');
  const envOwnerList = doc.getElementById('env-owner-list');
  const env = data.env;
  if (envMeta) {
    if (env?.summary) {
      envMeta.textContent = `unique=${env.uniqueVars} · owners=${env.summary.ownerCount} · pkgKeys=${env.summary.packageTouchedKeys} · multiPlane=${env.summary.multiPlaneKeys} · rootNeedsInject=${env.runtime?.root?.missingNeedsInject?.length ?? env.summary?.rootRuntimeNeedsInject ?? '—'} · coveredByDefault=${env.runtime?.root?.coveredByTemplateDefault?.length ?? env.summary?.rootCoveredByDefault ?? '—'} · defaultsIssues=${env.defaultsIssues?.total ?? 0}`;
    } else {
      envMeta.textContent = 'No env inventory — run bun run audit:packages:env';
    }
  }
  if (envOwnerList) {
    const owners = (env?.owners || []).filter(o => (o.packages || []).length).slice(0, 12);
    envOwnerList.innerHTML = owners.length
      ? owners
          .map(
            o =>
              `<li><code>${escapeHtml(o.envKey)}</code> ×${o.count} · pkgs=[${(o.packages || []).map(escapeHtml).join(', ')}] · planes=[${(o.planes || []).map(escapeHtml).join(', ')}]</li>`
          )
          .join('')
      : '<li>No package-touched env keys</li>';
  }
}

/**
 * @param {unknown} err
 * @param {Document} doc
 */
export function renderPackagesBoardError(err, doc = document) {
  const msg = formatLoadError(err);
  setText(doc.getElementById('gen-meta'), `Failed to load map: ${msg}`);
  setText(doc.getElementById('s-score'), '—');
  setText(doc.getElementById('s-avg'), '—');
  setText(doc.getElementById('s-actions'), '—');
  setText(doc.getElementById('s-archive'), '—');
  setText(doc.getElementById('s-quarantine'), '—');
  setText(doc.getElementById('s-inject'), '—');
  setText(doc.getElementById('hub'), '—');
  const scoreEl = doc.getElementById('s-score');
  if (scoreEl) scoreEl.className = 'stat-num';

  const body = doc.getElementById('pkg-body');
  if (body) {
    body.innerHTML = `<tr><td colspan="5" class="pkg-error">Unavailable — rebake with <code>bun run audit:packages:full</code></td></tr>`;
  }
  for (const id of ['action-list', 'probe-list', 'quarantine-list', 'vault-list', 'env-owner-list']) {
    const el = doc.getElementById(id);
    if (el) el.innerHTML = '<li>Unavailable</li>';
  }
  setText(doc.getElementById('env-meta'), 'Unavailable');

  const banner = doc.getElementById('pkg-error-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.innerHTML = `<p><strong>Packages map failed</strong> — ${escapeHtml(msg)}</p>
      <p class="error-hint">
        <button type="button" class="retry-btn error-action" id="pkg-retry">Retry</button>
        · <a class="ops-link" href="/registry/packages-graph-map.json">Raw JSON</a>
        · <a class="ops-link" href="/portal/packages.md">Runbook</a>
        · <code>bun run audit:packages:full</code>
      </p>`;
  }
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} s
 */
function escapeAttr(s) {
  return escapeHtml(s).replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Bootstrap when loaded as a module on the packages board page. */
export async function mountPackagesBoard() {
  const banner = document.getElementById('pkg-error-banner');
  if (banner) banner.classList.add('hidden');

  const run = async () => {
    try {
      const data = await loadPackagesMap();
      renderPackagesBoard(data);
      if (banner) banner.classList.add('hidden');
    } catch (err) {
      renderPackagesBoardError(err);
      const retry = document.getElementById('pkg-retry');
      if (retry) {
        retry.addEventListener(
          'click',
          () => {
            void mountPackagesBoard();
          },
          { once: true }
        );
      }
    }
  };
  await run();
}

if (typeof document !== 'undefined' && document.getElementById('pkg-body')) {
  void mountPackagesBoard();
}
