import { safeUrl, text } from './bun-1.4-assets.js';

function normalizeProjectMedia(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    raw.schemaVersion !== 1 ||
    raw.publisher?.name !== 'FactoryWager' ||
    raw.sourceApi !== 'Bun.color' ||
    !Array.isArray(raw.media) ||
    raw.media.length !== 1
  ) {
    throw new TypeError('Bun 1.4 project media contract is unsupported');
  }
  const item = raw.media[0];
  const videoUrl = safeUrl(item?.videoUrl, '');
  const posterUrl = safeUrl(item?.posterUrl, '');
  if (
    item?.id !== 'factorywager-bun-color-palette' ||
    !videoUrl.startsWith('/portal/bun-1.4/media/') ||
    !posterUrl.startsWith('/portal/bun-1.4/media/')
  ) {
    throw new TypeError('Bun 1.4 project media paths are unsupported');
  }
  return {
    publisher: { name: 'FactoryWager', url: safeUrl(raw.publisher.url) },
    sourceDocs: safeUrl(raw.sourceDocs),
    rights: text(raw.rights),
    generatedAt: text(raw.generatedAt),
    item: {
      id: item.id,
      title: text(item.title),
      description: text(item.description),
      videoUrl,
      posterUrl,
      width: Number(item.width),
      height: Number(item.height),
      durationSeconds: Number(item.durationSeconds),
    },
  };
}

function projectLink(label, href) {
  const link = document.createElement('a');
  link.textContent = label;
  link.href = safeUrl(href);
  return link;
}

function renderProjectMedia(root, registry) {
  root.replaceChildren();
  const card = document.createElement('article');
  card.className = 'portal-card bun-media-card bun-project-media-card';
  const preview = document.createElement('div');
  preview.className = 'bun-media-preview';
  const video = document.createElement('video');
  video.controls = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = registry.item.posterUrl;
  video.dataset.src = registry.item.videoUrl;
  video.setAttribute('aria-label', registry.item.title);
  const fallback = document.createElement('div');
  fallback.className = 'bun-media-fallback';
  fallback.textContent = 'Playback unavailable. Open the local proof file below.';
  preview.append(video, fallback);
  const body = document.createElement('div');
  body.className = 'bun-media-body';
  const title = document.createElement('h3');
  title.className = 'bun-media-title';
  title.textContent = registry.item.title;
  const description = document.createElement('p');
  description.className = 'bun-media-caption';
  description.textContent = registry.item.description;
  const boundary = document.createElement('p');
  boundary.className = 'bun-media-caption';
  boundary.textContent = registry.rights;
  const links = document.createElement('div');
  links.className = 'bun-media-links';
  links.append(projectLink(`Publisher: ${registry.publisher.name}`, registry.publisher.url));
  links.append(projectLink('Bun.color docs ↗', registry.sourceDocs));
  links.append(projectLink('Local MP4', registry.item.videoUrl));
  body.append(title, description, boundary, links);
  card.append(preview, body);
  root.append(card);
}

export { normalizeProjectMedia, renderProjectMedia };
