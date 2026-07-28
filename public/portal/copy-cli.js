/**
 * Shared copy-to-clipboard behavior for portal command buttons.
 *
 * Static Pages only: command text comes from data-cli and is never executed in
 * the browser.
 */

const BOUND = 'copyCliBound';

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export function bindCopyButtons(root = document) {
  for (const button of root.querySelectorAll('.copy-cli[data-cli]')) {
    if (button.dataset[BOUND] === 'true') continue;
    button.dataset[BOUND] = 'true';
    button.addEventListener('click', async () => {
      const command = button.dataset.cli ?? '';
      if (!command) return;

      const previous = button.textContent;
      try {
        await copyText(command);
        button.textContent = 'copied';
      } catch {
        button.textContent = 'copy failed';
      }
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1_400);
    });
  }
}
