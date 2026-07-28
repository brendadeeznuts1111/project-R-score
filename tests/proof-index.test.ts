// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  DOCUMENT_PROOF_ENTRIES,
  renderProofIndexLinksHtml,
} from '../public/portal/proof-index.js';

describe('proof-index', () => {
  test('lists all document-plane orphan pins', () => {
    const files = DOCUMENT_PROOF_ENTRIES.map(e => e.file);
    expect(files).toContain('formdata-proof.json');
    expect(files).toContain('networking-channel-proof.json');
    expect(files).toContain('verification-pinned-1.3.14.json');
    expect(files).toContain('verification-stable-1.4.0.json');
    expect(files).toContain('verification-stable-1.4.0-bundler.json');
    expect(files).toContain('verification-stable-1.4.0-networking.json');
    expect(DOCUMENT_PROOF_ENTRIES).toHaveLength(6);
    expect(DOCUMENT_PROOF_ENTRIES.every(e => e.path.startsWith('/registry/'))).toBe(true);
  });

  test('renderProofIndexLinksHtml escapes and links', () => {
    const html = renderProofIndexLinksHtml();
    expect(html).toContain('proof-index-list');
    expect(html).toContain('/registry/formdata-proof.json');
    expect(html).toContain('formdata-proof.json');
    expect(html).toContain('verification');
  });
});
