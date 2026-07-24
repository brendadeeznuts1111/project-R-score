/**
 * Filter verification result cards by data-channel, and switch proof snapshots.
 */

class ChannelFilter extends HTMLElement {
  /** @type {((path: string) => void) | null} */
  onSnapshotChange = null;

  connectedCallback() {
    this.innerHTML = `
      <div class="channel-toolbar">
        <label class="proof-snapshot-label">
          Proof snapshot
          <select id="proof-snapshot" class="proof-snapshot-select" aria-label="Proof snapshot">
            <option value="">Canonical (release-features.json)</option>
          </select>
        </label>
        <fieldset class="channel-filter" data-filter="channel">
          <legend>Filter by channel</legend>
          <label><input type="checkbox" name="channel" value="canary" checked> Canary</label>
          <label><input type="checkbox" name="channel" value="latest" checked> Latest</label>
          <label><input type="checkbox" name="channel" value="stable" checked> Stable</label>
          <label><input type="checkbox" name="channel" value="pinned" checked> Pinned</label>
          <label><input type="checkbox" name="channel" value="runtime" checked> Runtime</label>
        </fieldset>
        <fieldset class="channel-filter" data-filter="subsystem">
          <legend>Filter by subsystem</legend>
          <label><input type="checkbox" name="subsystem" value="runtime" checked> Runtime</label>
          <label><input type="checkbox" name="subsystem" value="package-manager" checked> PM</label>
          <label><input type="checkbox" name="subsystem" value="networking" checked> Networking</label>
          <label><input type="checkbox" name="subsystem" value="bundler" checked> Bundler</label>
          <label><input type="checkbox" name="subsystem" value="test" checked> Test</label>
          <label><input type="checkbox" name="subsystem" value="other" checked> Other</label>
        </fieldset>
      </div>
    `;

    this.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => this.applyFilter());
    });

    const select = this.querySelector('#proof-snapshot');
    select?.addEventListener('change', () => {
      const path = /** @type {HTMLSelectElement} */ (select).value;
      if (typeof this.onSnapshotChange === 'function') this.onSnapshotChange(path);
      this.dispatchEvent(
        new CustomEvent('proof-snapshot-change', {
          bubbles: true,
          detail: { path },
        })
      );
    });
  }

  /**
   * @param {Array<{ id?: string, channel?: string, targetVersion?: string, path?: string, status?: string }>} snapshots
   * @param {string} [selectedPath]
   */
  setSnapshots(snapshots, selectedPath = '') {
    const select = this.querySelector('#proof-snapshot');
    if (!select) return;
    const opts = [
      `<option value="">Canonical (release-features.json)</option>`,
      ...(snapshots || []).map(s => {
        const path = s.path?.startsWith('public/')
          ? `/${s.path.slice('public/'.length)}`
          : s.path || '';
        const file = (s.path || path).split('/').pop() || '';
        const suite = s.suite && s.suite !== 'release' && s.suite !== 'all' ? `+${s.suite}` : '';
        const label = `${s.channel || '?'}@${s.targetVersion || '?'}${suite}${s.status ? ` · ${s.status}` : ''} · ${file}`;
        const sel = path === selectedPath || s.path === selectedPath ? ' selected' : '';
        return `<option value="${path}"${sel}>${label}</option>`;
      }),
    ];
    select.innerHTML = opts.join('');
  }

  applyFilter() {
    const channels = Array.from(
      this.querySelectorAll('input[name="channel"]:checked')
    ).map(cb => /** @type {HTMLInputElement} */ (cb).value);
    const subsystems = Array.from(
      this.querySelectorAll('input[name="subsystem"]:checked')
    ).map(cb => /** @type {HTMLInputElement} */ (cb).value);
    const root = this.closest('operations-dashboard') || document;
    root.querySelectorAll('.verification-result').forEach(card => {
      const channel = card.getAttribute('data-channel') || '';
      const subsystem = card.getAttribute('data-subsystem') || 'other';
      const channelOk = channels.length === 0 || channels.includes(channel);
      const subsystemOk = subsystems.length === 0 || subsystems.includes(subsystem);
      /** @type {HTMLElement} */ (card).style.display =
        channelOk && subsystemOk ? '' : 'none';
    });
    // Ops panels: data-subsystem="mixed" stays when any pillar is selected;
    // empty / missing attr always visible.
    root.querySelectorAll('.ops-panel[data-subsystem]').forEach(panel => {
      const sub = panel.getAttribute('data-subsystem') || '';
      let show = true;
      if (subsystems.length > 0) {
        if (sub === 'mixed') {
          show = subsystems.some(s =>
            ['runtime', 'package-manager', 'networking', 'bundler', 'test', 'other'].includes(s)
          );
        } else if (sub) {
          show = subsystems.includes(sub);
        }
      }
      /** @type {HTMLElement} */ (panel).style.display = show ? '' : 'none';
    });
  }
}

customElements.define('channel-filter', ChannelFilter);
