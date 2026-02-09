import { beforeEach, describe, expect, test } from 'bun:test';
import { CookieManager } from '../lib/cookie-manager';

type MockCookieState = {
  lastSet: string;
  values: Map<string, string>;
};

function createMockDocument(state: MockCookieState): Document {
  return {
    get cookie() {
      return Array.from(state.values.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    },
    set cookie(input: string) {
      state.lastSet = input;
      const parts = input.split(';').map((p) => p.trim());
      const [nameValue, ...attrs] = parts;
      const eqIdx = nameValue.indexOf('=');
      if (eqIdx <= 0) return;
      const name = nameValue.slice(0, eqIdx);
      const value = nameValue.slice(eqIdx + 1);
      const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
      if (maxAgeAttr && Number.parseInt(maxAgeAttr.split('=')[1] || '', 10) < 0) {
        state.values.delete(name);
        return;
      }
      state.values.set(name, value);
    },
  } as unknown as Document;
}

describe('CookieManager', () => {
  let state: MockCookieState;

  beforeEach(() => {
    state = { lastSet: '', values: new Map() };
    (globalThis as { document?: Document }).document = createMockDocument(state);
    (globalThis as { window?: Window }).window = {
      location: { hostname: 'localhost' },
    } as unknown as Window;
  });

  test('does not append httponly when setting cookies from browser context', () => {
    const manager = new CookieManager();
    manager.setCookie({
      name: 'fw_test',
      value: 'abc',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    });

    expect(state.lastSet.toLowerCase()).not.toContain('httponly');
  });

  test('includes max-age=0 when explicitly provided', () => {
    const manager = new CookieManager();
    manager.setCookie({
      name: 'fw_zero_age',
      value: 'abc',
      path: '/',
      maxAge: 0,
    });

    expect(state.lastSet.toLowerCase()).toContain('max-age=0');
  });

  test('parses cookies whose values contain = characters', () => {
    state.values.set('fw_payload', encodeURIComponent('a=b=c'));
    const manager = new CookieManager();
    const all = manager.getAllCookies();

    expect(all.fw_payload).toBe('a=b=c');
  });

  test('does not force production cookie domain on localhost', () => {
    const manager = new CookieManager();
    manager.setCookie({
      name: 'fw_local',
      value: 'ok',
      domain: '.factory-wager.com',
      path: '/',
    });

    expect(state.lastSet.toLowerCase()).not.toContain('domain=');
  });
});
