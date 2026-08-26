/** Validated consumer for Bun-baked color samples on the static Pages surface. */
function normalizeColorSamples(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    raw.schemaVersion !== 1 ||
    raw.release !== 'Bun 1.4' ||
    raw.version !== '1.4.0' ||
    raw.sourceApi !== 'Bun.color' ||
    !Array.isArray(raw.samples) ||
    raw.samples.length !== 5
  ) {
    throw new TypeError('Bun 1.4 color format registry is unsupported');
  }
  return raw.samples.map((sample, index) => {
    const status = sample?.status;
    if (
      !sample ||
      typeof sample.label !== 'string' ||
      typeof sample.input !== 'string' ||
      (status !== 'supported' && status !== 'unsupported') ||
      (status === 'supported' &&
        (typeof sample.css !== 'string' ||
          typeof sample.hex !== 'string' ||
          !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(sample.hex) ||
          !Array.isArray(sample.rgb) ||
          sample.rgb.length !== 3 ||
          !sample.rgb.every(
            channel => Number.isInteger(channel) && channel >= 0 && channel <= 255
          ) ||
          typeof sample.hsl !== 'string'))
    ) {
      throw new TypeError(`Bun 1.4 color sample ${index} is unsupported`);
    }
    return Object.freeze({
      label: sample.label,
      input: sample.input,
      status,
      css: status === 'supported' ? sample.css : null,
      hex: status === 'supported' ? sample.hex : null,
      rgb: status === 'supported' ? Object.freeze(sample.rgb.map(Number)) : null,
      hsl: status === 'supported' ? sample.hsl : null,
    });
  });
}

function sampleByIndex(samples, rawIndex) {
  if (typeof rawIndex !== 'string' || !/^(0|[1-9]\d*)$/.test(rawIndex)) return null;
  const index = Number(rawIndex);
  return Number.isSafeInteger(index) && index < samples.length ? samples[index] : null;
}

function sampleByInput(samples, value) {
  return samples.find(sample => sample.input === String(value).trim()) || null;
}

function renderSample(sample) {
  const result = document.getElementById('bun-color-result');
  const swatch = document.getElementById('bun-color-swatch');
  const input = document.getElementById('bun-color-input');
  if (!result || !swatch || !input || !sample) return;
  input.value = sample.input;
  result.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `${sample.label}: ${sample.status} in Bun 1.4`;
  const detail = document.createElement('code');
  detail.textContent =
    sample.status === 'supported'
      ? `css ${sample.css} · hex ${sample.hex} · rgb ${sample.rgb.join(', ')} · ${sample.hsl}`
      : 'Bun.color returned null. HSV is shown as an explicit unsupported boundary.';
  result.append(title, detail);
  if (sample.hex) {
    swatch.style.backgroundColor = sample.hex;
    swatch.hidden = false;
  } else {
    swatch.style.removeProperty('background-color');
    swatch.hidden = true;
  }
}

function mountAdvancedColorDemo(samples) {
  const root = document.getElementById('bun-color-demo');
  const choices = document.getElementById('bun-color-choices');
  const suggestions = document.getElementById('bun-color-suggestions');
  const input = document.getElementById('bun-color-input');
  const apply = document.getElementById('bun-color-apply');
  if (!root || !choices || !suggestions || !input || !apply) return;

  samples.forEach((sample, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'portal-pill bun-color-choice';
    button.dataset.idx = String(index);
    button.textContent = sample.label;
    choices.append(button);
    const option = document.createElement('option');
    option.value = sample.input;
    suggestions.append(option);
  });

  choices.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-idx]') : null;
    if (!target || !choices.contains(target)) return;
    renderSample(sampleByIndex(samples, target.dataset.idx));
  });
  apply.addEventListener('click', () => {
    const sample = sampleByInput(samples, input.value);
    if (sample) return renderSample(sample);
    const result = document.getElementById('bun-color-result');
    if (result) result.textContent = 'Choose one of the Bun 1.4 runtime-proven samples.';
  });
  renderSample(samples[0]);
}

export { mountAdvancedColorDemo, normalizeColorSamples, sampleByIndex, sampleByInput };
