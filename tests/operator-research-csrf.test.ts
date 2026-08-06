import { describe, expect, test } from 'bun:test';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  checkCsrf,
  getSessionId,
  issueCsrf,
  isMutatingMethod,
} from '../lib/operator-research/auth/csrf.ts';

describe('operator-research Bun.CSRF', () => {
  test('isMutatingMethod covers write verbs', () => {
    expect(isMutatingMethod('POST')).toBe(true);
    expect(isMutatingMethod('put')).toBe(true);
    expect(isMutatingMethod('GET')).toBe(false);
  });

  test('registry publish POSTs require CSRF session binding', () => {
    // Desk wires POST /api/registry/publish + /factory-publish behind withCsrfGate.
    const issued = issueCsrf(new Request('http://127.0.0.1:8790/'));
    const bare = new Request('http://127.0.0.1:8790/api/registry/publish', {
      method: 'POST',
    });
    expect(checkCsrf(bare).ok).toBe(false);

    const ok = new Request('http://127.0.0.1:8790/api/registry/factory-publish', {
      method: 'POST',
      headers: {
        cookie: `${CSRF_COOKIE}=${issued.sessionId}`,
        [CSRF_HEADER]: issued.token,
      },
    });
    expect(checkCsrf(ok).ok).toBe(true);
  });

  test('issue + verify bound to sessionId', () => {
    const req0 = new Request('http://127.0.0.1:8790/');
    const issued = issueCsrf(req0);
    expect(issued.setCookie).toContain(`${CSRF_COOKIE}=`);
    expect(issued.token.length).toBeGreaterThan(10);

    const withSession = new Request('http://127.0.0.1:8790/api/alerts/rules', {
      method: 'POST',
      headers: {
        cookie: `${CSRF_COOKIE}=${issued.sessionId}`,
        [CSRF_HEADER]: issued.token,
      },
    });
    expect(getSessionId(withSession)).toBe(issued.sessionId);
    expect(checkCsrf(withSession).ok).toBe(true);
  });

  test('rejects missing / wrong session binding', () => {
    const issued = issueCsrf(new Request('http://127.0.0.1:8790/'));
    const noToken = new Request('http://127.0.0.1:8790/api/x', {
      method: 'POST',
      headers: { cookie: `${CSRF_COOKIE}=${issued.sessionId}` },
    });
    expect(checkCsrf(noToken).ok).toBe(false);

    const wrongSession = new Request('http://127.0.0.1:8790/api/x', {
      method: 'POST',
      headers: {
        cookie: `${CSRF_COOKIE}=other-session`,
        [CSRF_HEADER]: issued.token,
      },
    });
    expect(checkCsrf(wrongSession).ok).toBe(false);
  });

  test('API key without session cookie bypasses CSRF', () => {
    const prev = Bun.env.OPERATOR_RESEARCH_API_KEY;
    Bun.env.OPERATOR_RESEARCH_API_KEY = 'csrf-test-key-xyz';
    try {
      const req = new Request('http://127.0.0.1:8790/api/x', {
        method: 'POST',
        headers: { 'x-api-key': 'csrf-test-key-xyz' },
      });
      const result = checkCsrf(req);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.bypass).toBe('api-key');
    } finally {
      if (prev == null) delete Bun.env.OPERATOR_RESEARCH_API_KEY;
      else Bun.env.OPERATOR_RESEARCH_API_KEY = prev;
    }
  });
});
