/**
 * Copy-to-clipboard for portal-cli commands (Pages-safe — no spawn).
 */

const RESET_DELAY_MS = 1200;

/**
 * Copy text through the browser clipboard boundary.
 * @param {string} value
 */
export async function copyText(value) {
  if (!value) throw new TypeError('Nothing to copy');
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard access is unavailable');
  }
  await navigator.clipboard.writeText(value);
}

/**
 * @param {ParentNode} [root]
 */
export function bindCopyButtons(root = document) {
  root.querySelectorAll('.copy-cli').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.setAttribute('aria-live', 'polite');
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-cli') || btn.textContent?.trim() || '';
      const previousText = btn.textContent;
      const canDisable = 'disabled' in btn;
      if (canDisable) btn.disabled = true;
      btn.dataset.copyState = 'pending';

      try {
        await copyText(cmd);
        btn.dataset.copyState = 'copied';
        btn.textContent = 'copied';
      } catch {
        btn.dataset.copyState = 'failed';
        btn.textContent = 'copy failed';
      } finally {
        setTimeout(() => {
          btn.textContent = previousText;
          delete btn.dataset.copyState;
          if (canDisable) btn.disabled = false;
        }, RESET_DELAY_MS);
      }
    });
  });
}
