/**
 * search.js — filter and sort logic for the package grid.
 * Pure state management, no DOM.
 */

const DEFAULT_STATE = Object.freeze({
  query: '',
  types: [],
  scopes: [],
  tags: [],
  sort: 'name',
  project: '',
});

function parseList(params, key) {
  return params.get(key)?.split(',').map(value => value.trim()).filter(Boolean) || [];
}

/**
 * Build filter state from a hash string.
 * @param {string} rawHash
 * @returns {{ query: string, types: string[], scopes: string[], tags: string[], sort: string, project: string }}
 */
export function parseHashState(rawHash = '') {
  const params = new URLSearchParams(rawHash.replace(/^#/, ''));
  return {
    query: params.get('q') || DEFAULT_STATE.query,
    types: parseList(params, 'type'),
    scopes: parseList(params, 'scope'),
    tags: parseList(params, 'tag'),
    sort: params.get('sort') || DEFAULT_STATE.sort,
    project: params.get('project') || DEFAULT_STATE.project,
  };
}

/**
 * Build filter state from URL hash and merge with defaults.
 * Hash format: #type=library&scope=%40factorywager&tag=websocket
 * @returns {{ query: string, types: string[], scopes: string[], tags: string[], sort: string, project: string }}
 */
export function readHashState() {
  return parseHashState(window.location.hash);
}

/**
 * Serialize filter state into a canonical hash string.
 * @param {{ query?: string, types?: string[], scopes?: string[], tags?: string[], sort?: string, project?: string }} state
 */
export function serializeHashState(state) {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.types?.length) params.set('type', state.types.join(','));
  if (state.scopes?.length) params.set('scope', state.scopes.join(','));
  if (state.tags?.length) params.set('tag', state.tags.join(','));
  if (state.sort && state.sort !== DEFAULT_STATE.sort) params.set('sort', state.sort);
  if (state.project) params.set('project', state.project);
  const hash = params.toString();
  return hash ? `#${hash}` : '';
}

/** Write filter state back to URL hash. */
export function writeHashState(state) {
  window.location.hash = serializeHashState(state);
}

/**
 * Derive an npm scope from a package name.
 * @param {string} name
 */
export function derivePackageScope(name) {
  const separator = name.indexOf('/');
  return name.startsWith('@') && separator > 1 ? name.slice(0, separator) : 'unscoped';
}

/**
 * Apply all filters and sorting to the package list.
 * @param {Array<[string, object]>} packages — entries from registryIndex.packages
 * @param {object} state — { query, types, scopes, tags, sort }
 * @returns {Array<[string, object]>} filtered + sorted copy
 */
export function applyFilters(packages, state) {
  const types = state.types || [];
  const scopes = state.scopes || [];
  const tags = state.tags || [];
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
    if (types.length && !types.includes(release?.type || 'library')) {
      return false;
    }
    if (scopes.length && !scopes.includes(derivePackageScope(name))) {
      return false;
    }
    if (tags.length && !tags.some(t => release?.tags?.includes(t))) {
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

/** Collect all unique npm scopes from package names for filter chips. */
export function collectScopes(packages) {
  return [...new Set(packages.map(([name]) => derivePackageScope(name)))].sort((a, b) =>
    a.localeCompare(b),
  );
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
