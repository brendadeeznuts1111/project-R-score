import { describe, expect, test } from 'bun:test';

/**
 * Minimal Element fixture — duck-types enough for applySectionTitles / primarySectionTitleEl
 * without happy-dom (frozenLockfile workspace).
 */
function el(tag: string, attrs: Record<string, string> = {}, kids: ReturnType<typeof el>[] = []) {
  const node = {
    tagName: tag.toUpperCase(),
    attrs: { ...attrs },
    kids: [...kids],
    dataset: {} as Record<string, string>,
    get className() {
      return this.attrs.class || '';
    },
    getAttribute(name: string) {
      return this.attrs[name] ?? null;
    },
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
    },
    matches(sel: string) {
      if (sel.includes('section-anchor') && sel.includes('data-glossary-concept')) {
        return (
          this.tagName === 'A' &&
          (this.attrs.class || '').includes('section-anchor') &&
          !!this.attrs['data-glossary-concept']
        );
      }
      if (sel === 'a.section-anchor' || sel.startsWith('a.section-anchor')) {
        return this.tagName === 'A' && (this.attrs.class || '').includes('section-anchor');
      }
      if (sel.includes('data-glossary-concept')) {
        return this.tagName === 'A' && !!this.attrs['data-glossary-concept'];
      }
      return false;
    },
    querySelector(sel: string): ReturnType<typeof el> | null {
      const walk = (n: ReturnType<typeof el>): ReturnType<typeof el> | null => {
        if (n.matches(sel)) return n;
        // loose match for compound selectors used by primarySectionTitleEl
        if (sel.includes('a.section-anchor') && n.tagName === 'A' && (n.attrs.class || '').includes('section-anchor')) {
          if (sel.includes('data-glossary-concept=')) {
            const m = sel.match(/data-glossary-concept="([^"]+)"/);
            if (m && n.attrs['data-glossary-concept'] === m[1]) return n;
            if (!sel.includes('data-glossary-concept=')) return n;
          } else {
            return n;
          }
        }
        if (
          sel.includes('a[data-glossary-concept') &&
          n.tagName === 'A' &&
          n.attrs['data-glossary-concept']
        ) {
          const m = sel.match(/data-glossary-concept="([^"]+)"/);
          if (!m || n.attrs['data-glossary-concept'] === m[1]) return n;
        }
        if (/^h[1-3]$/i.test(sel) && n.tagName === sel.toUpperCase()) return n;
        if (sel.includes('h1, h2, h3') && /^H[1-3]$/.test(n.tagName)) return n;
        if (sel.includes(':scope > h') && /^H[1-3]$/.test(n.tagName)) return n;
        for (const c of n.kids) {
          const hit = walk(c);
          if (hit) return hit;
        }
        return null;
      };
      for (const c of this.kids) {
        const hit = walk(c);
        if (hit) return hit;
      }
      // also allow matching self for heading query from section
      return walk(this);
    },
    get textContent() {
      if (this._text !== undefined) return this._text;
      return this.kids.map(k => k.textContent).join('');
    },
    set textContent(v: string) {
      this._text = v;
      this.kids = [];
    },
    _text: undefined as string | undefined,
  };
  return node;
}

function makeRoot(section: ReturnType<typeof el>) {
  const map = new Map<string, ReturnType<typeof el>>();
  const index = (n: ReturnType<typeof el>) => {
    if (n.attrs.id) map.set(n.attrs.id, n);
    for (const c of n.kids) index(c);
  };
  index(section);
  return {
    getElementById(id: string) {
      return map.get(id) ?? null;
    },
    querySelector(sel: string) {
      const m = sel.match(/\[id="([^"]+)"\]/);
      if (m) return map.get(m[1]!) ?? null;
      return null;
    },
  };
}

describe('shared glossary UX contract', () => {
  test('keeps DOM, fragments, focus, and telemetry bounded', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();

    expect(ux).toContain("new URLPattern({ hash: 'section\\\\::section' })");
    expect(ux).toContain("new URLPattern({ hash: 'glossary\\\\::concept' })");
    expect(ux).toContain('decodeURIComponent(value)');
    expect(ux).not.toContain('location.hash.slice');
    expect(ux).not.toContain('.innerHTML');
    expect(ux).toContain("el.setAttribute('aria-describedby'");
    expect(ux).toContain('export function surfaceByPath');
    expect(ux).toContain('export function applySectionTitles');
    expect(ux).toContain('export function getElementByIdInRoot');
    expect(ux).toContain('export function primarySectionTitleEl');
    expect(ux).toContain('options.applySectionTitles === true');
    expect(ux).toContain('scrollSections');
    expect(ux).toContain('el.scrollIntoView');
  });

  test('resolves v3 surface domId without board-local id inventing', async () => {
    const {
      sectionDomIdFromSurface,
      sectionConceptFromSurface,
      sectionTitleFromSurface,
    } = await import('../public/portal/components/glossary-ux.js');
    const surface = {
      path: '/portal/account/',
      concept: 'page.accountDossier',
      sections: [
        {
          hash: 'identity',
          domId: 'ad-section-identity',
          conceptId: 'ops.limits.account',
          title: 'Identity',
        },
        {
          hash: 'outs',
          domId: 'ad-section-outs',
          conceptId: 'section.partnersOuts',
          title: 'Outs',
        },
      ],
    };
    expect(sectionDomIdFromSurface(surface, 'identity')).toBe('ad-section-identity');
    expect(sectionDomIdFromSurface(surface, 'missing')).toBeNull();
    expect(sectionConceptFromSurface(surface, 'outs')).toBe('section.partnersOuts');
    expect(sectionTitleFromSurface(surface, 'identity')).toBe('Identity');
    expect(sectionTitleFromSurface(surface, 'missing')).toBeNull();
    expect(sectionDomIdFromSurface({ sections: 'legacy' }, 'identity')).toBeNull();
  });

  test('limits opts into applySectionTitles; boot defaults off', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();
    expect(ux).toContain('options.applySectionTitles === true');
    expect(ux).not.toContain('options.applySectionTitles !== false');
    const limits = await Bun.file('public/portal/limits/limit-profiles.js').text();
    expect(limits).toContain('applySectionTitles: true');
  });

  test('applySectionTitles writes section.title into section-anchor and keeps siblings', async () => {
    const { applySectionTitles } = await import('../public/portal/components/glossary-ux.js');

    const defLink = el('a', { href: '#' }, []);
    defLink.textContent = 'Definition';
    const links = el('span', { class: 'section-heading__links' }, [defLink]);
    const anchor = el(
      'a',
      {
        class: 'section-anchor',
        href: '#section:account-control',
        'data-glossary-concept': 'section.accountLimitControl',
      },
      []
    );
    anchor.textContent = 'HARDCODED';
    const h2 = el('h2', { id: 'account-control-title', class: 'section-heading' }, [
      anchor,
      links,
    ]);
    const section = el(
      'section',
      { id: 'account-control', 'aria-labelledby': 'account-control-title' },
      [h2]
    );
    // index heading id on root map
    const root = makeRoot(section);
    // also register h2 id for aria-labelledby
    const rootWithHeading = {
      getElementById(id: string) {
        if (id === 'account-control-title') return h2;
        return root.getElementById(id);
      },
      querySelector(sel: string) {
        return root.querySelector(sel);
      },
    };

    const glossary = {
      surfaces: [
        {
          path: '/portal/limits/',
          concept: 'page.limitPatterns',
          sections: [
            {
              hash: 'account-control',
              domId: 'account-control',
              conceptId: 'section.accountLimitControl',
              title: 'Account limit control',
            },
          ],
        },
      ],
    };

    const result = applySectionTitles(glossary, {
      pathname: '/portal/limits/',
      root: rootWithHeading,
    });

    expect(result.applied).toBe(1);
    expect(result.missing).toEqual([]);
    expect(anchor.textContent).toBe('Account limit control');
    expect(defLink.textContent).toBe('Definition');
    expect(section.dataset.sectionTitle).toBe('Account limit control');
  });

  test('applySectionTitles skips sr-only mounts and refuses bare-h2 wipe', async () => {
    const { applySectionTitles } = await import('../public/portal/components/glossary-ux.js');

    const sr = el('div', {
      id: 'section:outs',
      class: 'sr-only',
      'aria-hidden': 'true',
    });
    const bareH2 = el('h2', {}, []);
    bareH2.textContent = 'Keep structure';
    const mixed = el('section', { id: 'weird' }, [bareH2]);

    const map = new Map<string, ReturnType<typeof el>>([
      ['section:outs', sr],
      ['weird', mixed],
    ]);
    const root = {
      getElementById(id: string) {
        return map.get(id) ?? null;
      },
      querySelector() {
        return null;
      },
    };

    const glossary = {
      surfaces: [
        {
          path: '/portal/partners/',
          concept: 'page.partners',
          sections: [
            { hash: 'outs', domId: 'section:outs', conceptId: 'section.partnersOuts', title: 'Outs' },
            { hash: 'weird', domId: 'weird', conceptId: 'x', title: 'Should miss' },
          ],
        },
      ],
    };

    const result = applySectionTitles(glossary, {
      pathname: '/portal/partners/',
      root,
    });
    // sr-only skipped (not missing); bare h2 without concept link → missing
    expect(result.applied).toBe(0);
    expect(result.missing).toEqual(['weird']);
    expect(bareH2.textContent).toBe('Keep structure');
  });
});
