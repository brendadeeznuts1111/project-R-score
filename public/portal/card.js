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
  const isNew =
    release?.publishedAt && Date.now() - new Date(release.publishedAt).getTime() < 7 * 86400000;
  const depCount = release?.dependencies ? Object.keys(release.dependencies).length : 0;
  const scope = name.startsWith('@') ? '@' + name.slice(1).split('/')[0] : null;
  const displayName = scope ? name.slice(scope.length + 1) : name;

  return `
    <div class="pkg-card" data-name="${esc(name)}">
      <div class="pkg-card-header">
        <span class="pkg-name-wrap">
          ${scope ? `<span class="pkg-scope filter-chip--scope">${esc(scope)}</span>` : ''}
          <span class="pkg-name">${esc(displayName)}${isNew ? ' <span class="pkg-badge-new">NEW</span>' : ''}</span>
        </span>
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
      ${
        release?.tags?.length
          ? `
        <div class="pkg-tags">
          ${release.tags.map(t => `<span class="pkg-tag">${esc(t)}</span>`).join('')}
        </div>
      `
          : ''
      }
      <div class="pkg-meta">
        <span>${info.versions.length} version(s)</span>
        ${depCount > 0 ? `<span>${depCount} dep(s)</span>` : ''}
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
    <div id="detail-overlay" class="detail-overlay" role="dialog" aria-modal="true" aria-label="${esc(name)} details">
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
          <div class="version-list">
            ${info.versions
              .map(v => {
                const vStr = String(v);
                const tags = Object.entries(info['dist-tags'] || {})
                  .filter(([, tv]) => String(tv) === vStr)
                  .map(([t]) => `<span class="pkg-tag tag-dist">${esc(t)}</span>`)
                  .join('');
                const vRelease = info.releases?.[vStr];
                const vDate = vRelease?.publishedAt
                  ? new Date(vRelease.publishedAt).toLocaleDateString()
                  : '';
                return `<div class="version-row">
                <span class="version-num">v${esc(vStr)}</span>
                <span class="version-tags">${tags || ''}</span>
                <span class="version-date">${vDate}</span>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        ${
          release?.dependencies
            ? `
          <div class="detail-section">
            <h3>Dependencies</h3>
            <div class="dep-list">
              ${Object.entries(release.dependencies)
                .map(
                  ([dep, ver]) =>
                    `<div class="dep-row"><span class="dep-name">${esc(dep)}</span><span class="dep-ver">${esc(ver)}</span></div>`
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <div class="detail-section">
          <h3>Tags</h3>
          <div class="pkg-tags">
            ${release?.tags?.length ? release.tags.map(t => `<span class="pkg-tag">${esc(t)}</span>`).join('') : '<span class="pkg-tag">none</span>'}
          </div>
        </div>

        ${
          release?.readme
            ? `
          <div class="detail-section">
            <h3>README</h3>
            <div class="detail-readme">${renderSimpleMarkdown(release.readme)}</div>
          </div>
        `
            : ''
        }

        <div class="detail-meta">
          <div class="detail-actions">
            <button class="copy-install-btn" data-name="${esc(name)}">📋 Copy install</button>
            <button class="copy-create-btn" data-name="${esc(name)}">📋 Copy create</button>
          </div>
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
  const returnFocus = document.activeElement;

  /** Close the dialog, restore focus to the element that opened it. */
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', escClose);
    document.removeEventListener('keydown', trapFocus);
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  }

  /** Close on Escape. */
  function escClose(e) {
    if (e.key === 'Escape') close();
  }

  /** Keep Tab cycling inside the dialog while it is open. */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusables = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  overlay.querySelector('.detail-close').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', escClose);
  document.addEventListener('keydown', trapFocus);

  // Move focus into the dialog
  overlay.querySelector('.detail-close')?.focus();

  // Copy install command
  overlay.querySelector('.copy-install-btn')?.addEventListener('click', async () => {
    await copyText(`factory install ${name}`);
    const btn = overlay.querySelector('.copy-install-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy install';
    }, 2000);
  });

  // Copy create command
  overlay.querySelector('.copy-create-btn')?.addEventListener('click', async () => {
    await copyText(`factory create factory-library ${name} --publish`);
    const btn = overlay.querySelector('.copy-create-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy create';
    }, 2000);
  });
}

/**
 * Minimal markdown-to-HTML for README preview.
 * Handles headings, code fences, inline code, bold, links, and paragraphs.
 * Zero deps, safe HTML output via esc() on content.
 */
function renderSimpleMarkdown(md) {
  let html = esc(md);

  // Code fences
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre><code class="${lang ? 'language-' + esc(lang) : ''}">${esc(code.trim())}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${esc(code)}</code>`);

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Paragraphs (double newline)
  html = '<p>' + html.split(/\n\n+/).join('</p><p>') + '</p>';

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}

function esc(s) {
  if (typeof s !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
