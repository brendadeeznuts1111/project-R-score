// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
import { describe, expect, test } from 'bun:test';
import {
  VERIFICATION_SCRIPTS,
  buildVerificationScriptMeta,
  readVerificationScript,
  serveVerificationScript,
  verificationScriptSha256,
  verifyScriptSha256,
} from '../lib/http/verification-scripts.ts';

describe('lib/http/verification-scripts', () => {
  test('catalog includes defaults, networking, and release', () => {
    expect(VERIFICATION_SCRIPTS.defaults.path).toBe('tools/verify-defaults.ts');
    expect(VERIFICATION_SCRIPTS.networking.path).toBe('tools/verify-networking.bundle.js');
    expect(VERIFICATION_SCRIPTS.networking.pipeArgs).toContain('--local-only');
    expect(VERIFICATION_SCRIPTS.release.path).toBe('tools/verify-bun-release.ts');
    expect(VERIFICATION_SCRIPTS.release.proofPath).toBe('public/registry/release-features.json');
    expect(VERIFICATION_SCRIPTS['doc-index'].path).toBe('tools/build-doc-index.ts');
    expect(VERIFICATION_SCRIPTS['doc-index'].pipeArgs).toContain('--save');
  });

  test('readVerificationScript returns TypeScript source', async () => {
    const src = await readVerificationScript('defaults');
    expect(src).toContain('verify-defaults.ts');
    expect(src.startsWith('#!/usr/bin/env bun')).toBe(true);
  });

  test('scriptSha256 is stable for defaults script', async () => {
    const a = await verificationScriptSha256('defaults');
    const b = await verificationScriptSha256('defaults');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  test('buildVerificationScriptMeta includes pipe one-liners', async () => {
    const meta = await buildVerificationScriptMeta('networking', 'http://127.0.0.1:3000');
    expect(meta.pipe).toContain('curl -sf');
    expect(meta.pipe).toContain('bun run -');
    expect(meta.pipe).toContain('--local-only');
    expect(meta.pipeVerified).toContain('run-verified.ts');
    expect(meta.scriptSha256).toHaveLength(64);
  });

  test('release meta pipe matches Pages URL', async () => {
    const meta = await buildVerificationScriptMeta('release', 'https://project-r-score.pages.dev');
    expect(meta.pipe).toBe(
      'curl -sf https://project-r-score.pages.dev/api/release/script | bun run -'
    );
    expect(meta.scriptUrl).toBe('https://project-r-score.pages.dev/api/release/script');
    expect(meta.metaUrl).toBe('https://project-r-score.pages.dev/api/release/script.meta');
  });

  test('serveVerificationScript sets X-Script-SHA256 header', async () => {
    const res = await serveVerificationScript('defaults', {
      baseUrl: 'http://127.0.0.1:3000',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/typescript');
    const hash = res.headers.get('X-Script-SHA256');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const body = await res.text();
    expect(await verifyScriptSha256(body, hash!)).toBe(true);
  });

  test('serveVerificationScript sets X-Script-SHA256 header for release', async () => {
    const res = await serveVerificationScript('release', {
      baseUrl: 'http://127.0.0.1:3000',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/typescript');
    const hash = res.headers.get('X-Script-SHA256');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const body = await res.text();
    expect(body).toContain('verify-bun-release.ts');
    expect(await verifyScriptSha256(body, hash!)).toBe(true);
  });
});
