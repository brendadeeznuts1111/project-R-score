import { formatBytes, parseYouTubeId, safeUrl } from './bun-1.4-assets.js';

const BUN_PUBLISHER = Object.freeze({ name: 'Bun', url: 'https://bun.com/' });

function displayUrl(asset) {
  return asset.localUrl || asset.sourceUrl;
}

function getAssetPoster(asset, assets) {
  if (asset.posterUrl) return safeUrl(asset.posterUrl, '');
  if (!asset.posterId) return '';
  const poster = assets.find(candidate => candidate.id === asset.posterId);
  return poster ? displayUrl(poster) : '';
}

function sourceLink(label, href) {
  const link = document.createElement('a');
  link.href = safeUrl(href);
  link.textContent = label;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function officialSourceUrl(asset) {
  return asset.raw?.watchUrl || asset.raw?.sourcePage || asset.sourceUrl;
}

function renderYouTubePreview(asset, preview, card) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bun-video-facade';
  button.setAttribute('aria-label', `Play ${asset.title} on YouTube`);
  button.append(document.createTextNode('Load YouTube overview'));
  button.addEventListener(
    'click',
    () => {
      const id = asset.youtubeId || parseYouTubeId(asset.sourceUrl);
      if (!id) {
        button.hidden = true;
        card.classList.add('is-fallback');
        return;
      }
      const frame = document.createElement('iframe');
      frame.className = 'bun-youtube-frame';
      frame.title = asset.title;
      frame.loading = 'lazy';
      frame.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      preview.replaceChildren(frame);
    },
    { once: true }
  );
  preview.append(button);
}

function renderMediaPreview(asset, preview, card, assets) {
  if (asset.kind === 'youtube') {
    renderYouTubePreview(asset, preview, card);
    return;
  }
  const url = displayUrl(asset);
  if (!url) {
    preview.append(
      Object.assign(document.createElement('div'), {
        className: 'bun-media-placeholder',
        textContent: 'No media URL in manifest',
      })
    );
    return;
  }
  if (asset.kind === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    const poster = getAssetPoster(asset, assets);
    if (poster) video.poster = poster;
    video.dataset.src = url;
    video.setAttribute('aria-label', asset.title);
    video.addEventListener('error', () => {
      video.removeAttribute('src');
      video.hidden = true;
      card.classList.add('is-fallback');
    });
    preview.append(video);
    return;
  }
  const image = document.createElement('img');
  image.src = url;
  image.alt = asset.caption;
  image.loading = asset.lazy ? 'lazy' : 'eager';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    image.remove();
    card.classList.add('is-fallback');
  });
  preview.append(image);
}

function renderCard(asset, assets, capabilities = []) {
  const card = document.createElement('article');
  card.className = 'portal-card bun-media-card';
  card.dataset.category = asset.category;
  card.dataset.kind = asset.kind;
  card.dataset.search =
    `${asset.title} ${asset.caption} ${asset.category} ${asset.id}`.toLowerCase();
  const preview = document.createElement('div');
  preview.className = 'bun-media-preview';
  renderMediaPreview(asset, preview, card, assets);
  const fallback = document.createElement('div');
  fallback.className = 'bun-media-fallback';
  fallback.textContent = 'Preview unavailable here. Use the official source link below.';
  preview.append(fallback);
  const body = document.createElement('div');
  body.className = 'bun-media-body';
  const title = document.createElement('h3');
  title.className = 'bun-media-title';
  title.textContent = asset.title;
  const caption = document.createElement('p');
  caption.className = 'bun-media-caption';
  caption.textContent = asset.caption;
  const meta = document.createElement('div');
  meta.className = 'bun-media-meta';
  const category = document.createElement('span');
  category.className = 'portal-pill';
  category.textContent = asset.category;
  meta.append(category);
  for (const capability of capabilities.slice(0, 3)) {
    const badge = document.createElement('span');
    badge.className = 'portal-pill bun-capability-badge';
    badge.textContent = capability.symbol;
    meta.append(badge);
  }
  const details = [
    asset.mimeType,
    formatBytes(asset.size),
    asset.width && asset.height ? `${asset.width}×${asset.height}` : '',
  ].filter(Boolean);
  if (details.length) {
    const detail = document.createElement('span');
    detail.textContent = details.join(' · ');
    meta.append(detail);
  }
  const links = document.createElement('div');
  links.className = 'bun-media-links';
  links.append(sourceLink(`Publisher: ${BUN_PUBLISHER.name} ↗`, BUN_PUBLISHER.url));
  links.append(sourceLink('Official asset source ↗', officialSourceUrl(asset)));
  if (asset.localUrl) links.append(sourceLink('Local copy', asset.localUrl));
  body.append(title, caption, meta, links);
  card.append(preview, body);
  return card;
}

function observeVideos(root) {
  const videos = [...root.querySelectorAll('video[data-src]')];
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    for (const video of videos) {
      video.hidden = true;
      const card = video.closest('.bun-media-card');
      card?.classList.add('is-reduced-motion');
      const fallback = card?.querySelector('.bun-media-fallback');
      if (fallback) fallback.textContent = 'Playback is paused by your reduced-motion preference.';
    }
    return;
  }
  const load = video => {
    if (!video.dataset.src || video.src) return;
    video.src = video.dataset.src;
    delete video.dataset.src;
  };
  if (!('IntersectionObserver' in window)) {
    videos.forEach(load);
    return;
  }
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          load(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '240px 0px' }
  );
  videos.forEach(video => observer.observe(video));
}

export { observeVideos, renderCard };
