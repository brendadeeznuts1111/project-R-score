/**
 * card.js — project card rendering and detail modal.
 */

import { computeHealth, healthClass, healthLabel } from './health.js';

/**
 * Render a single project card as HTML.
 * @param {string} name — package name
 * @param {object} info — PackageInfo from registry index
 * @returns {string} HTML
 */
export function renderCard(name, info) {
  const latestVer = info['dist-tags']?.latest;
  const release = latestVer ? info.releases?.[String(latestVer)] : null;
  const health = computeHealth(release, info.versions?.length || 0);
  const hClass = healthClass(health.score);

  return `
    <div class="pkg-card" data-name="${esc(name)}">
      <div class="pkg-card-header">
        <span class="pkg-name">${esc(name)}</span>
        <span class="pkg-version">${latestVer ? esc(String(latestVer)) : '—'}</span>
      </div>
      <div class="pkg-health-row">
        <span class="pkg-health-bar ${hClass}">
          <span class="health-fill" style="width:${health.score}%"></span>
        </span>
        <span class="pkg-health-label ${hClass}">${healthLabel(health.score)}</span>
      </div>
      <span class="pkg-type">${esc(release?.type || 'library')}</span>
      ${release?.description ? `<p class="pkg-description">${esc(release.description)}</p>` : ''}
      ${release?.tags?.length ? `
        <div class="pkg-tags">
          ${release.tags.map(t => `<span class="pkg-tag">${esc(t)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="pkg-meta">
        <span>${info.versions.length} version(s)</span>
        ${release?.publishedAt ? `<span>${new Date(release.publishedAt).toLocaleDateString()}</span>` : ''}
      </div>
      <button class="pkg-detail-btn" data-name="${esc(name)}">Details →</button>
    </div>
  `;
}

/** Render the detail overlay for a package. */
export function renderDetail(name, info) {
  const latestVer = info['dist-tags']?.latest;
  const release = latestVer ? info.releases?.[String(latestVer)] : null;
  const health = computeHealth(release, info.versions?.length || 0);

  return `
    <div id="detail-overlay" class="detail-overlay" role="dialog" aria-label="${esc(name)} details">
      <div class="detail-panel">
        <button class="detail-close" aria-label="Close">&times;</button>
        <h2 class="detail-name">${esc(name)}</h2>
        <span class="pkg-type">${esc(release?.type || 'library')}</span>
        <span class="pkg-version">v${latestVer ? esc(String(latestVer)) : '—'}</span>

        <div class="detail-health">
          <span class="pkg-health-bar ${healthClass(health.score)}">
            <span class="health-fill" style="width:${health.score}%"></span>
          </span>
          <span class="pkg-health-label">Score: ${health.score}/100 · ${healthLabel(health.score)}</span>
          <div class="health-breakdown">
            <span>Freshness: ${health.freshness}</span>
            <span>Completeness: ${health.completeness}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Description</h3>
          <p>${release?.description ? esc(release.description) : 'No description.'}</p>
        </div>

        <div class="detail-section">
          <h3>Versions</h3>
          <p>${info.versions.length} published — ${info.versions.slice(0, 5).map(v => esc(String(v))).join(', ')}${info.versions.length > 5 ? '...' : ''}</p>
        </div>

        <div class="detail-section">
          <h3>Tags</h3>
          <div class="pkg-tags">
            ${release?.tags?.length ? release.tags.map(t => `<span class="pkg-tag">${esc(t)}</span>`).join('') : '<span class="pkg-tag">none</span>'}
          </div>
        </div>

        ${release?.readme ? `
          <div class="detail-section">
            <h3>README</h3>
            <pre class="detail-readme">${esc(release.readme)}</pre>
          </div>
        ` : ''}

        <div class="detail-meta">
          <p>Published: ${release?.publishedAt ? new Date(release.publishedAt).toLocaleString() : 'unknown'}</p>
          <p>Publisher: ${esc(release?.publisher || 'unknown')}</p>
          <p>Storage: ${esc(release?.storage?.r2Key || '—')} · ${release?.storage?.size ? (release.storage.size / 1024).toFixed(1) + ' KB' : '—'}</p>
          ${release?.storage?.checksum ? `<p>SHA-256: <code>${esc(release.storage.checksum.slice(0, 32))}...</code></p>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function showDetail(name, info) {
  const existing = document.getElementById('detail-overlay');
  if (existing) existing.remove();

  const html = renderDetail(name, info);
  document.body.insertAdjacentHTML('beforeend', html);

  const overlay = document.getElementById('detail-overlay');
  overlay.querySelector('.detail-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escClose);
    }
  });
}

function esc(s) {
  if (typeof s !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}
