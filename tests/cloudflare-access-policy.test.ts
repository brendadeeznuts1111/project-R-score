// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import { verifyCloudflareAccessPolicyText } from '../lib/verification/cloudflare-access-policy.ts';

const configPath = new URL('../.cloudflare-access.yml', import.meta.url);

describe('Cloudflare Access policy', () => {
  test('repository config is scoped and uses Cloudflare account-member SSO', async () => {
    const report = verifyCloudflareAccessPolicyText(await Bun.file(configPath).text());
    expect(report.ok).toBe(true);
    // ledger · score/portal · pages.dev/portal · all Pages previews
    expect(report.appCount).toBe(4);
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
        '- cloudflare_account_member: {}',
        '- email_domain:\n              domain: factory-wager.com\n          - auth_method:\n              auth_method: otp'
      )
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('legacy-otp');
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

  test('requires the wildcard Pages preview application', async () => {
    const source = await Bun.file(configPath).text();
    const report = verifyCloudflareAccessPolicyText(
      source.replace('domain: "*.project-r-score.pages.dev"', 'domain: preview.example.com')
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map(problem => problem.code)).toContain('missing-required-domain');
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
