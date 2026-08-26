/** Bun 1.4 release gallery — two normalized registries, external-source first. */
import { fetchJsonResult } from '../fetch-json.js';
import { assetSearch, normalizeManifest, text } from './bun-1.4-assets.js';
import {
  indexCapabilities,
  normalizeCapabilityRegistry,
  normalizeMigrationSources,
  normalizeReleaseChapters,
  renderChapterGrid,
  renderCapabilityGrid,
} from './bun-1.4-capabilities.js';
import { observeVideos, renderCard } from './bun-1.4-media.js';
import { mountAdvancedColorDemo, normalizeColorSamples } from './bun-1.4-color-demo.js';
import { normalizeProjectMedia, renderProjectMedia } from './bun-1.4-project-media.js';

const MANIFEST_URL = '/registry/bun-1.4-assets.json';
const CAPABILITIES_URL = '/registry/bun-1.4-capabilities.json';
const PROJECT_MEDIA_URL = '/registry/bun-1.4-project-media.json';
const COLOR_FORMATS_URL = '/registry/bun-1.4-color-formats.json';
let assets = [];
let capabilities = [];
let chapters = [];
let capabilitiesForAsset = new Map();
let filters = { query: '', section: '', kind: '', domain: '', chapter: '', capability: '' };

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = text(value, '—');
}

function setExternalLink(id, label, href) {
  const node = document.getElementById(id);
  if (!node || !href) return;
  node.textContent = label;
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
}

function fillSelect(id, label, values) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.replaceChildren(new Option(label, ''));
  for (const value of values) select.append(new Option(value.label, value.value));
  select.value = values.some(value => value.value === current) ? current : '';
}

function updateOptions() {
  const sections = [...new Set(assets.map(asset => asset.category))]
    .sort((a, b) => a.localeCompare(b))
    .map(value => ({ label: value, value }));
  const domains = [...new Set(capabilities.map(item => item.domain))]
    .sort((a, b) => a.localeCompare(b))
    .map(value => ({ label: value, value }));
  const capabilityOptions = capabilities
    .map(item => ({ label: item.symbol, value: item.id }))
    .sort((a, b) => a.label.localeCompare(b.label));
  fillSelect('bun-section', 'All sections', sections);
  fillSelect('bun-domain', 'All domains', domains);
  fillSelect(
    'bun-chapter',
    'All release chapters',
    chapters.map(chapter => ({ label: chapter.title, value: chapter.id }))
  );
  fillSelect('bun-capability', 'All capabilities', capabilityOptions);
}

function relatedCapabilities(asset) {
  return capabilitiesForAsset.get(asset.id) || [];
}

function filteredAssets() {
  return assets.filter(asset => {
    const related = relatedCapabilities(asset);
    const search = `${assetSearch(asset)} ${related.map(item => `${item.id} ${item.symbol}`).join(' ')}`;
    return (
      (!filters.query || search.includes(filters.query)) &&
      (!filters.section || asset.category === filters.section) &&
      (!filters.kind || asset.kind === filters.kind) &&
      (!filters.domain || related.some(item => item.domain === filters.domain)) &&
      (!filters.chapter || related.some(item => item.chapterId === filters.chapter)) &&
      (!filters.capability || related.some(item => item.id === filters.capability))
    );
  });
}

function selectChapter(id) {
  const select = document.getElementById('bun-chapter');
  if (select) select.value = id;
  filters.chapter = id;
  renderGallery();
  document.getElementById('bun-media-title')?.scrollIntoView({ behavior: 'auto' });
}

function renderGallery() {
  const gallery = document.getElementById('bun-gallery');
  if (!gallery) return;
  const visible = filteredAssets();
  gallery.replaceChildren();
  setText('bun-count', `${visible.length} of ${assets.length} shown`);
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'portal-card bun-empty';
    const title = document.createElement('strong');
    title.textContent = 'No matching media';
    const message = document.createElement('span');
    message.textContent = 'Clear the filters to restore the release gallery.';
    empty.append(title, message);
    gallery.append(empty);
    return;
  }
  for (const asset of visible) {
    gallery.append(renderCard(asset, assets, relatedCapabilities(asset)));
  }
  observeVideos(gallery);
}

function selectCapability(id) {
  const select = document.getElementById('bun-capability');
  if (select) select.value = id;
  filters.capability = id;
  renderGallery();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById('bun-media-title')
    ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

function renderCapabilities() {
  const root = document.getElementById('bun-capabilities');
  if (!root) return;
  const assetsById = new Map(assets.map(asset => [asset.id, asset]));
  renderCapabilityGrid(root, capabilities, assetsById, selectCapability);
  const chapterRoot = document.getElementById('bun-chapters');
  if (chapterRoot) renderChapterGrid(chapterRoot, chapters, capabilities, selectChapter);
}

function updateSummary(manifest) {
  setText('bun-assets', assets.length);
  setText('bun-images', assets.filter(asset => asset.kind === 'image').length);
  setText('bun-videos', assets.filter(asset => asset.kind === 'video').length);
  setText('bun-capability-count', capabilities.length);
  setText('bun-behavior-count', capabilities.filter(item => item.changeKind !== 'new').length);
  setText('bun-local', assets.filter(asset => asset.localUrl).length);
  setText('bun-rights', `Rights status: ${manifest.rightsStatus} · ${manifest.rightsDelivery}`);
  setText('bun-generated', `Manifest: ${manifest.generated}`);
}

function showError(message) {
  const banner = document.getElementById('bun-banner');
  if (!banner) return;
  banner.className = 'portal-banner bun-banner-error';
  banner.textContent = message;
}

function readFilters() {
  filters = {
    query: text(document.getElementById('bun-search')?.value).trim().toLowerCase(),
    section: text(document.getElementById('bun-section')?.value),
    kind: text(document.getElementById('bun-kind')?.value),
    domain: text(document.getElementById('bun-domain')?.value),
    chapter: text(document.getElementById('bun-chapter')?.value),
    capability: text(document.getElementById('bun-capability')?.value),
  };
  renderGallery();
}

function bindFilters() {
  for (const id of [
    'bun-search',
    'bun-section',
    'bun-kind',
    'bun-domain',
    'bun-chapter',
    'bun-capability',
  ]) {
    document
      .getElementById(id)
      ?.addEventListener(id === 'bun-search' ? 'input' : 'change', readFilters);
  }
  document.getElementById('bun-clear')?.addEventListener('click', () => {
    for (const id of [
      'bun-search',
      'bun-section',
      'bun-kind',
      'bun-domain',
      'bun-chapter',
      'bun-capability',
    ]) {
      const control = document.getElementById(id);
      if (control) control.value = '';
    }
    readFilters();
  });
}

async function mount() {
  bindFilters();
  const [manifestResult, capabilityResult, projectMediaResult, colorFormatsResult] =
    await Promise.all([
      fetchJsonResult(MANIFEST_URL, { cache: 'no-store', timeoutMs: 8000 }),
      fetchJsonResult(CAPABILITIES_URL, { cache: 'no-store', timeoutMs: 8000 }),
      fetchJsonResult(PROJECT_MEDIA_URL, { cache: 'no-store', timeoutMs: 8000 }),
      fetchJsonResult(COLOR_FORMATS_URL, { cache: 'no-store', timeoutMs: 8000 }),
    ]);
  if (colorFormatsResult.ok) {
    try {
      mountAdvancedColorDemo(normalizeColorSamples(colorFormatsResult.data));
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Color format registry failed validation.'
      );
    }
  }
  if (!manifestResult.ok) {
    showError(
      `Asset manifest unavailable (${manifestResult.error || manifestResult.kind || 'unknown error'}).`
    );
    setText('bun-count', '0 assets');
    return;
  }
  let manifest;
  try {
    manifest = normalizeManifest(manifestResult.data);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Asset manifest failed validation.');
    setText('bun-count', '0 assets');
    return;
  }
  assets = manifest.assets;
  if (capabilityResult.ok) {
    try {
      capabilities = normalizeCapabilityRegistry(capabilityResult.data);
      chapters = normalizeReleaseChapters(capabilityResult.data);
      capabilitiesForAsset = indexCapabilities(capabilities);
      const migration = normalizeMigrationSources(capabilityResult.data);
      if (migration) {
        setExternalLink('bun-breaking-changes', 'Breaking changes ↗', migration.breakingChangesUrl);
        setExternalLink('bun-upgrade-guide', 'Bun 1.3 → 1.4 guide ↗', migration.upgradeGuideUrl);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Capability registry failed validation.');
    }
  } else {
    showError(
      'Capability registry unavailable. The asset gallery remains usable without capability filters.'
    );
  }
  updateOptions();
  updateSummary(manifest);
  renderCapabilities();
  renderGallery();
  if (projectMediaResult.ok) {
    try {
      const root = document.getElementById('bun-project-media');
      if (root) {
        renderProjectMedia(root, normalizeProjectMedia(projectMediaResult.data));
        observeVideos(root);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Project media failed validation.');
    }
  }
}

if (typeof document !== 'undefined') void mount();

export {
  assetSearch,
  normalizeManifest,
  normalizeCapabilityRegistry,
  normalizeMigrationSources,
  normalizeReleaseChapters,
};
