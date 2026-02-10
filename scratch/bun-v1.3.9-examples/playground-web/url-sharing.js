// URL sharing and deep-link hydration for demo/category/search state.
(function () {
  const MAX_BOOT_RETRIES = 30;
  let bootRetries = 0;
  let syncing = false;
  let lastWrittenHref = '';

  function hasAppBindings() {
    return (
      typeof window.renderDemoList === 'function' &&
      typeof window.showWelcome === 'function' &&
      typeof window.loadDemo === 'function'
    );
  }

  function parseLocationState() {
    const url = new URL(window.location.href);
    const hashAliases = parseHashAliases(url.hash);
    const queryDemo = url.searchParams.get('demo') || '';
    const queryCategory = url.searchParams.get('category') || '';
    const querySearch = url.searchParams.get('search') || '';
    return {
      // Query params are canonical and take precedence over hash aliases.
      demoId: queryDemo || hashAliases.demoId || '',
      category: queryCategory || hashAliases.category || '',
      search: querySearch || hashAliases.search || '',
    };
  }

  function detectLinkMode() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('demo') || url.searchParams.has('category') || url.searchParams.has('search')) {
      return 'query';
    }
    const rawHash = String(url.hash || '').replace(/^#/, '').trim();
    if (!rawHash) return 'none';
    if (rawHash.startsWith(':~:')) return 'text-fragment';
    const parsedHash = parseHashAliases(url.hash);
    if (parsedHash.demoId || parsedHash.category || parsedHash.search) return 'hash';
    return 'none';
  }

  function publishLinkMode() {
    const mode = detectLinkMode();
    window.dispatchEvent(new CustomEvent('playground:link-mode', { detail: { mode } }));
  }

  function parseHashAliases(hashValue) {
    if (!hashValue) return {};
    let raw = String(hashValue).replace(/^#/, '').trim();
    if (!raw) return {};

    // Ignore standalone text fragments (e.g. #:~:text=...).
    if (raw.startsWith(':~:')) return {};

    // If the hash includes a text fragment suffix, parse only the state part.
    if (raw.includes(':~:')) {
      raw = raw.split(':~:')[0];
    }

    // Support hash-route forms like #/path?demo=... and plain #demo=...
    const queryStart = raw.indexOf('?');
    if (queryStart >= 0) {
      raw = raw.slice(queryStart + 1);
    }
    raw = raw.replace(/^[/!]+/, '').replace(/^&+/, '');
    if (!raw || !/[=&]/.test(raw)) return {};

    const params = new URLSearchParams(raw);
    return {
      demoId: params.get('demo') || '',
      category: params.get('category') || '',
      search: params.get('search') || '',
    };
  }

  function writeLocationState(state) {
    const url = new URL(window.location.href);
    const demoId = String(state.demoId || '').trim();
    const category = String(state.category || '').trim();
    const search = String(state.search || '').trim();

    if (demoId) url.searchParams.set('demo', demoId);
    else url.searchParams.delete('demo');

    if (category) url.searchParams.set('category', category);
    else url.searchParams.delete('category');

    if (search) url.searchParams.set('search', search);
    else url.searchParams.delete('search');

    const nextHref = url.toString();
    if (nextHref === window.location.href || nextHref === lastWrittenHref) return;
    lastWrittenHref = nextHref;
    const method = state.replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
    publishLinkMode();
  }

  function buildHashAlias(state) {
    const params = new URLSearchParams();
    const demoId = String(state.demoId || '').trim();
    const category = String(state.category || '').trim();
    const search = String(state.search || '').trim();
    if (demoId) params.set('demo', demoId);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return params.toString();
  }

  function snapshotStateFromURL() {
    return parseLocationState();
  }

  function applyCanonicalMode(mode, options = {}) {
    const replace = options.replace !== false;
    const state = snapshotStateFromURL();
    const method = replace ? 'replaceState' : 'pushState';
    const url = new URL(window.location.href);

    if (mode === 'hash') {
      const hashAlias = buildHashAlias(state);
      url.searchParams.delete('demo');
      url.searchParams.delete('category');
      url.searchParams.delete('search');
      url.hash = hashAlias ? `#${hashAlias}` : '';
    } else {
      // Canonical query mode
      if (state.demoId) url.searchParams.set('demo', state.demoId);
      else url.searchParams.delete('demo');
      if (state.category) url.searchParams.set('category', state.category);
      else url.searchParams.delete('category');
      if (state.search) url.searchParams.set('search', state.search);
      else url.searchParams.delete('search');
      url.hash = '';
    }

    const nextHref = url.toString();
    if (nextHref === window.location.href) {
      publishLinkMode();
      return;
    }
    lastWrittenHref = nextHref;
    window.history[method]({}, '', url);
    publishLinkMode();
  }

  async function copyLinkWithMode(mode) {
    const state = snapshotStateFromURL();
    const url = new URL(window.location.href);
    if (mode === 'hash') {
      const hashAlias = buildHashAlias(state);
      url.hash = hashAlias ? `#${hashAlias}` : '';
      url.searchParams.delete('demo');
      url.searchParams.delete('category');
      url.searchParams.delete('search');
    } else {
      url.hash = '';
      if (state.demoId) url.searchParams.set('demo', state.demoId);
      else url.searchParams.delete('demo');
      if (state.category) url.searchParams.set('category', state.category);
      else url.searchParams.delete('category');
      if (state.search) url.searchParams.set('search', state.search);
      else url.searchParams.delete('search');
    }
    const text = url.toString();
    try {
      await navigator.clipboard.writeText(text);
      if (typeof window.showToast === 'function') {
        window.showToast(`Copied ${mode === 'hash' ? 'hash' : 'link'} URL`, 'success');
      }
    } catch (error) {
      if (typeof window.showToast === 'function') {
        window.showToast(`Copy failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    }
  }

  function applyState(state) {
    if (!hasAppBindings()) return false;
    syncing = true;
    try {
      const hasAnyFilter = Boolean(state.category || state.search);
      if (hasAnyFilter) {
        if (state.category && typeof window.applyDemoCategoryFilter === 'function') {
          window.applyDemoCategoryFilter(state.category, {
            autoSelect: false,
            showHome: true,
            clearSearch: true,
          });
        } else {
          window.showWelcome();
        }
        window.renderDemoList(state.search || '');
      }

      if (state.demoId) {
        window.loadDemo(state.demoId);
      } else if (!hasAnyFilter) {
        window.showWelcome();
      }
      return true;
    } finally {
      syncing = false;
    }
  }

  function loadFromURL() {
    const state = parseLocationState();
    publishLinkMode();
    if (applyState(state)) return;
    bootRetries += 1;
    if (bootRetries <= MAX_BOOT_RETRIES) {
      setTimeout(loadFromURL, 100);
    }
  }

  window.addEventListener('playground:navigation', (event) => {
    if (syncing) return;
    const detail = event && event.detail ? event.detail : {};
    writeLocationState(detail);
  });

  window.addEventListener('popstate', () => {
    loadFromURL();
  });

  window.addEventListener('hashchange', () => {
    loadFromURL();
  });

  window.copyPlaygroundLink = (mode = 'query') => {
    copyLinkWithMode(mode === 'hash' ? 'hash' : 'query');
  };

  window.cyclePlaygroundLinkMode = () => {
    const current = detectLinkMode();
    const target = current === 'query' ? 'hash' : 'query';
    applyCanonicalMode(target, { replace: true });
    if (typeof window.showToast === 'function') {
      window.showToast(`Link mode: ${target.toUpperCase()}`, 'success', 1200);
    }
  };

  loadFromURL();
  publishLinkMode();
})();
