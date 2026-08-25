const SOURCE_URL = 'https://bun.com/blog/bun-v1.4';
const MANIFEST_SCHEMA_VERSION = 2;
const MANIFEST_VERSION = '1.4.0';
const EXPECTED_COUNTS = Object.freeze({ total: 26, image: 21, video: 4, embed: 1 });

function text(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function safeUrl(value, fallback = SOURCE_URL) {
  const candidate = text(value, fallback).trim();
  if (candidate.startsWith('/')) return candidate;
  try {
    const base = typeof window === 'undefined' ? SOURCE_URL : window.location.origin;
    const url = new URL(candidate, base);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    /* manifest URLs are untrusted display data; use the official source fallback */
  }
  return fallback;
}

function inferKind(asset) {
  if (asset.kind === 'embed') return 'youtube';
  return asset.kind;
}

function normalizeAsset(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(`Bun 1.4 manifest assets[${index}] must be an object`);
  }
  const asset = raw;
  const kind = inferKind(asset);
  if (!['image', 'video', 'youtube'].includes(kind)) {
    throw new TypeError(`Bun 1.4 manifest assets[${index}].kind is invalid`);
  }
  const id = text(asset.id).trim();
  const sourceUrl = safeUrl(asset.sourceUrl, '');
  if (!id || !sourceUrl) {
    throw new TypeError(`Bun 1.4 manifest assets[${index}] requires id and sourceUrl`);
  }
  const localUrl = asset.localUrl == null ? '' : safeUrl(asset.localUrl, '');
  const posterId = text(asset.posterId).trim();
  return {
    raw: asset,
    id,
    title: id,
    caption: text(asset.caption, text(asset.alt, 'Official Bun 1.4 release media.')),
    category: text(asset.section, 'Release media'),
    kind,
    sourceUrl,
    localUrl,
    mimeType: text(asset.mimeType, kind === 'video' ? 'video/mp4' : 'image/*'),
    size: asset.byteSize,
    width: asset.width,
    height: asset.height,
    posterId,
    posterUrl: '',
    lazy: asset.lazyLoad !== false,
    youtubeId: '',
  };
}

function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Bun 1.4 manifest must be an object');
  }
  const root = raw;
  if (
    root.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
    root.release !== 'Bun 1.4' ||
    root.version !== MANIFEST_VERSION ||
    root.sourcePage !== SOURCE_URL ||
    !Number.isFinite(Date.parse(root.generatedAt))
  ) {
    throw new TypeError('Bun 1.4 manifest schema/release/version is unsupported');
  }
  const rightsStatus = root.rightsStatus;
  const expectedDelivery = rightsStatus === 'approved' ? 'vendor-approved' : 'external-only';
  if (
    !['pending', 'approved'].includes(rightsStatus) ||
    !root.rights ||
    root.rights.status !== rightsStatus ||
    root.rights.delivery !== expectedDelivery
  ) {
    throw new TypeError('Bun 1.4 manifest rights contract is inconsistent');
  }
  if (!Array.isArray(root.assets) || root.assets.length !== EXPECTED_COUNTS.total) {
    throw new TypeError('Bun 1.4 manifest must contain exactly 26 assets');
  }
  for (const [kind, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (root.counts?.[kind] !== expected) {
      throw new TypeError('Bun 1.4 manifest counts are inconsistent');
    }
  }
  const manifestAssets = root.assets.map(normalizeAsset);
  const ids = new Set();
  const sourceUrls = new Set();
  const actualCounts = { total: manifestAssets.length, image: 0, video: 0, embed: 0 };
  for (const asset of manifestAssets) {
    if (ids.has(asset.id)) throw new TypeError(`Bun 1.4 manifest duplicates asset ${asset.id}`);
    if (sourceUrls.has(asset.sourceUrl)) {
      throw new TypeError(`Bun 1.4 manifest duplicates source URL ${asset.sourceUrl}`);
    }
    ids.add(asset.id);
    sourceUrls.add(asset.sourceUrl);
    actualCounts[asset.kind === 'youtube' ? 'embed' : asset.kind] += 1;
    if (rightsStatus === 'pending' && asset.localUrl) {
      throw new TypeError(`Bun 1.4 pending-rights asset ${asset.id} cannot use local media`);
    }
    if (
      rightsStatus === 'approved' &&
      asset.kind !== 'youtube' &&
      !asset.localUrl.startsWith('/portal/bun-1.4/media/')
    ) {
      throw new TypeError(`Bun 1.4 approved asset ${asset.id} requires versioned local media`);
    }
  }
  if (Object.entries(EXPECTED_COUNTS).some(([kind, count]) => actualCounts[kind] !== count)) {
    throw new TypeError('Bun 1.4 manifest asset kinds do not match its counts');
  }
  for (const asset of manifestAssets) {
    const poster = manifestAssets.find(candidate => candidate.id === asset.posterId);
    if (asset.kind === 'video' && (!poster || poster.kind !== 'image')) {
      throw new TypeError(`Bun 1.4 video ${asset.id} requires a manifest poster`);
    }
  }
  return {
    assets: manifestAssets,
    rightsStatus,
    rightsDelivery: root.rights.delivery,
    generated: text(root.generatedAt, 'unknown'),
    sourcePage: safeUrl(root.sourcePage, SOURCE_URL),
  };
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function parseYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
    if (parsed.hostname.endsWith('youtube.com'))
      return parsed.searchParams.get('v') || parsed.pathname.split('/').pop() || '';
  } catch {
    return '';
  }
  return '';
}

function assetSearch(asset) {
  return `${asset.title} ${asset.caption} ${asset.category} ${asset.id}`.toLowerCase();
}

export {
  SOURCE_URL,
  assetSearch,
  formatBytes,
  inferKind,
  normalizeAsset,
  normalizeManifest,
  parseYouTubeId,
  safeUrl,
  text,
};
