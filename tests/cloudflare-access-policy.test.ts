// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import { verifyCloudflareAccessPolicyText } from '../lib/verification/cloudflare-access-policy.ts';

const configPath = new URL('../.cloudflare-access.yml', import.meta.url);

describe('Cloudflare Access policy', () => {
  test('repository config is scoped and uses explicit email allowlist SSO', async () => {
    const report = verifyCloudflareAccessPolicyText(await Bun.file(configPath).text());
    expect(report.ok).toBe(true);
    // ledger · score/portal · pages.dev/portal. Pages previews are Pages-owned.
    expect(report.appCount).toBe(3);
    expect(report.issues).toEqual([]);
  });

  test('rejects an unscoped config before it can delete unlisted live apps', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(
      source.replace('\nscoped: true\n', '\nscoped: false\n')
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('unscoped-config');
  });

  test('rejects legacy email-domain OTP in place of managed SSO', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(
      source.replace(
        '- email:\n              email: utahj4754@gmail.com',
        '- email_domain:\n              domain: factory-wager.com\n          - auth_method:\n              auth_method: otp'
      )
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('legacy-otp');
  });

  test('rejects cloudflare_account_member in place of email allowlist', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(
      source.replace(
        /- email:\n\s+email: utahj4754@gmail.com\n\s+- email:\n\s+email: brendawill2233@gmail.com\n\s+- email:\n\s+email: nolarose@factory-wager.com(?:\n\s+- email:\n\s+email: inmikehuntglobal@gmail.com)?/,
        '- cloudflare_account_member: {}'
      )
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('account-member-selector');
  });

  test('requires the custom-domain portal path without gating the public read plane', async () => {
    const source = await Bun.file(configPath).text();
    // Replace the app domain field only — not the STATUS comment that also mentions the path.
    const report = verifyCloudflareAccessPolicyText(
      source.replace(
        'domain: score.factory-wager.com/portal',
        'domain: score.factory-wager.com'
      )
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('missing-required-domain');
  });

  test('keeps Pages preview protection out of the Access app plan', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(`${source}
  - name: Wrong preview owner
    domain: "*.project-r-score.pages.dev"
    type: self_hosted
    session_duration: 4h
    policies:
      - name: Allow owner emails
        decision: allow
        include:
          - email:
              email: utahj4754@gmail.com
`);
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('pages-preview-owner');
  });

  test('rejects interactive sessions above the four-hour identity cap', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(
      source.replace('session_duration: 4h', 'session_duration: 5h')
    );
    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: 'session-duration' })
    );
  });
});
