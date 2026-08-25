const SOURCE_URL = 'https://bun.com/blog/bun-v1.4';

function text(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function first(...values) {
  return values.find(value => value != null && value !== '');
}

function safeUrl(value, fallback = SOURCE_URL) {
  const candidate = text(value, fallback).trim();
  if (candidate.startsWith('/')) return candidate;
  try {
    const url = new URL(candidate, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    /* manifest URLs are untrusted display data; use the official source fallback */
  }
  return fallback;
}

function inferKind(asset) {
  const raw = text(first(asset.kind, asset.type, asset.mimeType, asset.category)).toLowerCase();
  const source = text(first(asset.sourceUrl, asset.url, asset.publicUrl)).toLowerCase();
  if (raw.includes('youtube') || source.includes('youtube.com') || source.includes('youtu.be'))
    return 'youtube';
  if (raw.includes('video') || raw.includes('mp4') || /\.mp4(?:$|[?#])/.test(source))
    return 'video';
  return 'image';
}

function normalizeAsset(raw, index) {
  const asset = raw && typeof raw === 'object' ? raw : {};
  const kind = inferKind(asset);
  const sourceUrl = safeUrl(first(asset.sourceUrl, asset.source, asset.url, asset.href));
  const localUrl = first(asset.localUrl, asset.publicUrl, asset.localPath);
  const posterId = first(asset.posterId, asset.posterAssetId, asset.poster);
  const title = text(
    first(asset.title, asset.name, asset.id, asset.stableId),
    `Bun 1.4 asset ${index + 1}`
  );
  const caption = text(
    first(asset.caption, asset.alt, asset.description, asset.section),
    'Official Bun 1.4 release media.'
  );
  return {
    raw: asset,
    id: text(first(asset.id, asset.stableId, asset.slug), `asset-${index + 1}`),
    title,
    caption,
    category: text(first(asset.category, asset.section, asset.group), 'Release media'),
    kind,
    sourceUrl,
    localUrl: localUrl ? safeUrl(localUrl, '') : '',
    mimeType: text(
      first(asset.mimeType, asset.contentType, asset.type),
      kind === 'video' ? 'video/mp4' : 'image/*'
    ),
    size: first(asset.byteSize, asset.size, asset.bytes),
    width: first(asset.width, asset.dimensions?.width),
    height: first(asset.height, asset.dimensions?.height),
    posterId: posterId ? text(posterId) : '',
    posterUrl: first(asset.posterUrl, asset.poster?.url),
    lazy: asset.lazyLoad !== false && asset.lazy !== false,
    youtubeId: text(first(asset.youtubeId, asset.videoId)),
  };
}

function normalizeManifest(raw) {
  const root = raw && typeof raw === 'object' ? raw : {};
  const rows = Array.isArray(raw) ? raw : first(root.assets, root.records, root.media, root.items);
  const rightsStatus = text(first(root.rightsStatus, root.rights?.status), 'pending');
  const rightsApproved = /^(approved|granted|cleared|confirmed)$/i.test(rightsStatus);
  const manifestAssets = Array.isArray(rows)
    ? rows.map(normalizeAsset).map(asset => (rightsApproved ? asset : { ...asset, localUrl: '' }))
    : [];
  return {
    assets: manifestAssets,
    rightsStatus,
    rightsDelivery: text(
      root.rights?.delivery,
      rightsApproved ? 'vendor-approved' : 'external-only'
    ),
    generated: text(first(root.generatedAt, root.generated, root.generated_at), 'unknown'),
    sourcePage: safeUrl(first(root.sourcePage, root.officialSource, root.sourceUrl), SOURCE_URL),
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
