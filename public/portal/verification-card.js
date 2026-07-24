/**
 * Semantic HTML renderer for channel-aware verification results.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article
 */

function esc(s) {
  if (typeof s !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}

/**
 * @param {object} result
 * @param {object} [semanticTags]
 * @returns {string}
 */
export function renderVerificationArticle(result, semanticTags) {
  const tags = semanticTags || {};
  const channel = result.channel || tags.channel || 'unknown';
  const version = result.targetVersion || tags.targetVersion || tags.runtimeVersion || '';
  const testedAt = tags.testedAt || new Date().toISOString();
  const docs = result._links?.docs || result.canonical || '';
  const docMeta = [result.canonicalKind, result.canonicalStability].filter(Boolean).join(' · ');
  const docTitle = [docMeta, result.canonicalDescription || docs].filter(Boolean).join(' — ');
  const source = result._links?.source || '';
  const report = result._links?.report || '/registry/release-features.json';

  return `
<article
  class="verification-result"
  data-test-id="${esc(result.name)}"
  data-channel="${esc(String(channel))}"
  data-version="${esc(String(version))}"
  data-passed="${result.passed ? 'true' : 'false'}"
  data-tested-at="${esc(testedAt)}"
  itemscope
  itemtype="https://schema.org/SoftwareApplication"
>
  <header class="verification-header">
    <h3 class="verification-title" itemprop="name">${esc(result.name)}</h3>
    <span class="channel-badge ${esc(String(channel))}" itemprop="applicationSubCategory">${esc(String(channel))}</span>
    ${version ? `<span class="version-badge" itemprop="softwareVersion">${esc(String(version))}</span>` : ''}
    <time datetime="${esc(testedAt)}" itemprop="dateModified">${esc(new Date(testedAt).toLocaleDateString())}</time>
  </header>
  <section class="test-result" data-passed="${result.passed ? 'true' : 'false'}">
    <div class="expected"><strong>Expected</strong><pre><code>${esc(result.expected)}</code></pre></div>
    <div class="actual"><strong>Actual</strong><pre><code>${esc(result.actual)}</code></pre></div>
    <div class="status ${result.passed ? 'pass' : 'fail'}">
      <span class="status-text">${result.passed ? 'PASS' : 'FAIL'}</span>
    </div>
  </section>
  <footer class="verification-footer">
    <nav class="result-links">
      ${docs ? `<a href="${esc(docs)}" rel="help" target="_blank" rel="noopener noreferrer" title="${esc(docTitle || docs)}">Docs</a>` : ''}
      ${source ? `<a href="${esc(source)}" rel="source" target="_blank" rel="noopener noreferrer">Source</a>` : ''}
      <a href="${esc(report)}" rel="related">Report</a>
    </nav>
  </footer>
</article>`.trim();
}

/**
 * @param {object} proof
 * @param {number} [limit]
 * @returns {string}
 */
export function renderVerificationResults(proof, limit = 12) {
  const rows = (proof?.results || []).slice(0, limit);
  const tags = proof?.semanticTags;
  return rows.map(r => renderVerificationArticle(r, tags)).join('\n');
}

/**
 * Legacy table row for proofs without semanticTags.
 * @param {object} result
 * @returns {string}
 */
export function renderVerificationTableRow(result) {
  const doc = result.canonical || result._links?.docs;
  const meta = [result.canonicalKind, result.canonicalStability].filter(Boolean).join(' · ');
  const title = [meta, result.canonicalDescription || doc].filter(Boolean).join(' — ');
  const docCell = doc
    ? `<a href="${esc(doc)}" target="_blank" rel="noopener" title="${esc(title || doc)}">Docs</a>`
    : '—';
  const lane = result.lane ? `<span class="ops-lane">${esc(result.lane)}</span> ` : '';
  return `<tr><td>${lane}${esc(result.name)}</td><td>${result.passed ? '✅' : '❌'}</td><td>${docCell}</td></tr>`;
}
