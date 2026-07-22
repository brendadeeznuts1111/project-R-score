/**
 * search.js — filter and sort logic for the package grid.
 * Pure state management, no DOM.
 */

/**
 * Build filter state from URL hash and merge with defaults.
 * Hash format: #type=library&tag=websocket
 * @returns {{ query: string, types: string[], tags: string[], sort: string }}
 */
export function readHashState() {
  const raw = window.location.hash.slice(1);
  const params = new URLSearchParams(raw);
  return {
    query: params.get('q') || '',
    types: params.get('type')?.split(',').filter(Boolean) || [],
    tags: params.get('tag')?.split(',').filter(Boolean) || [],
    sort: params.get('sort') || 'name',
  };
}

/** Write filter state back to URL hash. */
export function writeHashState(state) {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.types.length) params.set('type', state.types.join(','));
  if (state.tags.length) params.set('tag', state.tags.join(','));
  if (state.sort !== 'name') params.set('sort', state.sort);
  const hash = params.toString();
  window.location.hash = hash ? '#' + hash : '';
}

/**
 * Apply all filters and sorting to the package list.
 * @param {Array<[string, object]>} packages — entries from registryIndex.packages
 * @param {object} state — { query, types, tags, sort }
 * @returns {Array<[string, object]>} filtered + sorted copy
 */
export function applyFilters(packages, state) {
  let result = packages.filter(([name, info]) => {
    const release = info.releases?.[String(info['dist-tags']?.latest)];
    if (state.query) {
      const q = state.query.toLowerCase();
      if (!name.toLowerCase().includes(q) &&
          !release?.description?.toLowerCase().includes(q) &&
          !release?.tags?.some(t => t.toLowerCase().includes(q))) {
        return false;
      }
    }
    if (state.types.length && !state.types.includes(release?.type || 'library')) {
      return false;
    }
    if (state.tags.length && !state.tags.some(t => release?.tags?.includes(t))) {
      return false;
    }
    return true;
  });

  result.sort((a, b) => {
    const ra = a[1].releases?.[String(a[1]['dist-tags']?.latest)];
    const rb = b[1].releases?.[String(b[1]['dist-tags']?.latest)];
    switch (state.sort) {
      case 'version': return String(b[1]['dist-tags']?.latest || '').localeCompare(String(a[1]['dist-tags']?.latest || ''));
      case 'date':
        return new Date(rb?.publishedAt || 0).getTime() - new Date(ra?.publishedAt || 0).getTime();
      default: // name
        return a[0].localeCompare(b[0]);
    }
  });

  return result;
}

/** Collect all unique types from packages for filter chips. */
export function collectTypes(packages) {
  const types = new Set();
  for (const [, info] of packages) {
    const r = info.releases?.[String(info['dist-tags']?.latest)];
    if (r?.type) types.add(r.type);
  }
  return [...types].sort();
}

/** Collect all unique tags from packages for filter chips. */
export function collectTags(packages) {
  const tags = new Set();
  for (const [, info] of packages) {
    const r = info.releases?.[String(info['dist-tags']?.latest)];
    r?.tags?.forEach(t => tags.add(t));
  }
  return [...tags].sort();
}
