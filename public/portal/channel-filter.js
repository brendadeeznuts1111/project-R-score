/**
 * Filter verification result cards by data-channel.
 */
class ChannelFilter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <fieldset class="channel-filter">
        <legend>Filter by channel</legend>
        <label><input type="checkbox" value="canary" checked> Canary</label>
        <label><input type="checkbox" value="latest" checked> Latest</label>
        <label><input type="checkbox" value="stable" checked> Stable</label>
        <label><input type="checkbox" value="pinned" checked> Pinned</label>
        <label><input type="checkbox" value="runtime" checked> Runtime</label>
      </fieldset>
    `;

    this.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', () => this.applyFilter());
    });
  }

  applyFilter() {
    const checked = Array.from(this.querySelectorAll('input:checked')).map(
      cb => /** @type {HTMLInputElement} */ (cb).value
    );
    const root = this.closest('operations-dashboard') || document;
    root.querySelectorAll('.verification-result').forEach(card => {
      const channel = card.getAttribute('data-channel') || '';
      /** @type {HTMLElement} */ (card).style.display =
        checked.length === 0 || checked.includes(channel) ? '' : 'none';
    });
  }
}

customElements.define('channel-filter', ChannelFilter);
