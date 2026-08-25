import { safeUrl, text } from './bun-1.4-assets.js';

function normalizeCapability(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  return {
    id: text(item.id),
    domain: text(item.domain, 'runtime'),
    symbol: text(item.symbol, 'Bun 1.4 capability'),
    changeKind: text(item.changeKind, 'changed'),
    adoption: text(item.adoption, 'candidate'),
    summary: text(item.summary, 'See the official Bun 1.4 release notes.'),
    boundary: text(item.boundary),
    chapterId: text(item.chapterId),
    releaseUrl: safeUrl(item.releaseUrl),
    docsUrl: item.docsUrl ? safeUrl(item.docsUrl) : '',
    assetIds: Array.isArray(item.assetIds) ? item.assetIds.map(text).filter(Boolean) : [],
    contractFiles: Array.isArray(item.contractFiles)
      ? item.contractFiles.map(text).filter(Boolean)
      : [],
  };
}

function normalizeReleaseChapters(raw) {
  const root = raw && typeof raw === 'object' ? raw : {};
  if (root.version !== '1.4.0' || !Array.isArray(root.chapters)) return [];
  return root.chapters
    .map(item => ({
      id: text(item?.id),
      title: text(item?.title, 'Release chapter'),
      releaseUrl: safeUrl(item?.releaseUrl),
      order: Number(item?.order) || 0,
    }))
    .filter(item => item.id && item.releaseUrl)
    .sort((left, right) => left.order - right.order);
}

function normalizeCapabilityRegistry(raw) {
  const root = raw && typeof raw === 'object' ? raw : {};
  if (root.version !== '1.4.0' || !Array.isArray(root.capabilities)) return [];
  return root.capabilities.map(normalizeCapability).filter(item => item.id);
}

function normalizeMigrationSources(raw) {
  const migration = raw && typeof raw === 'object' ? raw.migration : null;
  if (!migration || typeof migration !== 'object') return null;
  if (migration.reconciledTag !== 'bun-v1.4.0' || migration.underConsiderationShipped !== false) {
    return null;
  }
  return {
    breakingChangesUrl: safeUrl(migration.breakingChangesUrl),
    upgradeGuideUrl: safeUrl(migration.upgradeGuideUrl),
  };
}

function indexCapabilities(capabilities) {
  const byAsset = new Map();
  for (const capability of capabilities) {
    for (const assetId of capability.assetIds) {
      const related = byAsset.get(assetId) || [];
      related.push(capability);
      byAsset.set(assetId, related);
    }
  }
  return byAsset;
}

function pill(label, modifier = '') {
  const node = document.createElement('span');
  node.className = `portal-pill${modifier ? ` ${modifier}` : ''}`;
  node.textContent = label;
  return node;
}

function externalLink(label, href) {
  const link = document.createElement('a');
  link.href = safeUrl(href);
  link.textContent = label;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function channelLinks(capability, assetsById) {
  const kinds = new Set(capability.assetIds.map(id => assetsById.get(id)?.kind).filter(Boolean));
  const channels = [{ label: 'all', href: '/feeds/v1/all.xml' }];
  if (kinds.has('image')) channels.push({ label: 'images', href: '/feeds/v1/images.xml' });
  if (kinds.has('video')) channels.push({ label: 'videos', href: '/feeds/v1/videos.xml' });
  if (kinds.has('youtube')) channels.push({ label: 'embeds', href: '/feeds/v1/embeds.xml' });
  return channels;
}

function renderCapabilityCard(capability, assetsById, onFilter) {
  const card = document.createElement('article');
  card.className = 'portal-card bun-feature-card';
  card.dataset.domain = capability.domain;
  const labels = document.createElement('div');
  labels.className = 'bun-capability-labels';
  labels.append(pill(capability.domain, 'portal-pill--accent'));
  labels.append(pill(capability.changeKind));
  labels.append(pill(capability.adoption, 'portal-pill--rest'));
  const heading = document.createElement('h3');
  const symbol = document.createElement('code');
  symbol.textContent = capability.symbol;
  heading.append(symbol);
  const summary = document.createElement('p');
  summary.textContent = capability.summary;
  const boundary = document.createElement('p');
  boundary.className = 'bun-capability-boundary';
  boundary.textContent = capability.boundary;
  const evidence = document.createElement('div');
  evidence.className = 'bun-capability-evidence';
  const channels = channelLinks(capability, assetsById);
  if (capability.assetIds.length) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${capability.assetIds.length} related media`;
    button.addEventListener('click', () => onFilter(capability.id));
    evidence.append(button);
    for (const channel of channels) {
      const link = document.createElement('a');
      link.href = channel.href;
      link.textContent = channel.label;
      evidence.append(link);
    }
  }
  if (capability.contractFiles.length) {
    evidence.append(document.createTextNode(`${capability.contractFiles.length} contracts`));
  }
  const links = document.createElement('div');
  links.className = 'bun-media-links';
  links.append(externalLink('Release evidence ↗', capability.releaseUrl));
  if (capability.docsUrl) links.append(externalLink('API docs ↗', capability.docsUrl));
  card.append(labels, heading, summary, boundary, evidence, links);
  return card;
}

function renderCapabilityGrid(root, capabilities, assetsById, onFilter) {
  root.replaceChildren();
  for (const capability of capabilities) {
    root.append(renderCapabilityCard(capability, assetsById, onFilter));
  }
}

function renderChapterGrid(root, chapters, capabilities, onFilter) {
  root.replaceChildren();
  for (const chapter of chapters) {
    const related = capabilities.filter(capability => capability.chapterId === chapter.id);
    const card = document.createElement('article');
    card.className = 'portal-card bun-feature-card';
    const title = document.createElement('h3');
    title.textContent = chapter.title;
    const summary = document.createElement('p');
    summary.textContent = `${related.length} grounded capabilities in this official release view.`;
    const actions = document.createElement('div');
    actions.className = 'bun-media-links';
    const filter = document.createElement('button');
    filter.type = 'button';
    filter.textContent = 'Show related media';
    filter.addEventListener('click', () => onFilter(chapter.id));
    actions.append(filter, externalLink('Official chapter ↗', chapter.releaseUrl));
    card.append(title, summary, actions);
    root.append(card);
  }
}

export {
  indexCapabilities,
  normalizeCapability,
  normalizeCapabilityRegistry,
  normalizeMigrationSources,
  normalizeReleaseChapters,
  renderCapabilityGrid,
  renderChapterGrid,
};
