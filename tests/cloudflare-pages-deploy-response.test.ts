// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  assertPagesDeploymentTarget,
  assertPagesNotModifiedTarget,
  createPagesDeploymentForm,
  ensureCloudflareHttpSuccess,
  parsePagesDeployArgs,
  parseCloudflareApiResponse,
} from '../tools/cloudflare-pages-deploy.ts';
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';

describe('Cloudflare Pages deploy target boundary', () => {
  test('defaults only a valid empty argument list to the pinned production branch', () => {
    expect(parsePagesDeployArgs([])).toMatchObject({
      branch: CLOUDFLARE_DEFAULTS.pages.productionBranch,
      wait: false,
      verify: false,
    });
  });

  test('preserves both supported preview branch syntaxes', () => {
    expect(parsePagesDeployArgs(['--branch', 'preview-a', '--wait'])).toMatchObject({
      branch: 'preview-a',
      wait: true,
    });
    expect(parsePagesDeployArgs(['--branch=preview-b'])).toMatchObject({
      branch: 'preview-b',
      wait: false,
    });
  });

  test('rejects malformed, repeated, unknown, and unverifiable preview options', () => {
    expect(() => parsePagesDeployArgs(['--branch', '--wait'])).toThrow();
    expect(() => parsePagesDeployArgs(['--branch='])).toThrow('non-empty branch');
    expect(() =>
      parsePagesDeployArgs(['--branch', 'preview-a', '--branch', 'preview-b'])
    ).toThrow('only once');
    expect(() => parsePagesDeployArgs(['--bran', 'preview-a'])).toThrow('Unknown option');
    expect(() => parsePagesDeployArgs(['preview-a'])).toThrow('Unexpected argument');
    expect(() => parsePagesDeployArgs(['--branch', 'preview-a', '--verify'])).toThrow(
      'cannot verify a preview branch'
    );
  });

  test('builds a multipart branch body and never degrades preview to production', () => {
    const form = createPagesDeploymentForm('preview-a');
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('branch')).toBe('preview-a');

    expect(() =>
      assertPagesDeploymentTarget(
        {
          id: 'deploy-preview',
          environment: 'preview',
          deployment_trigger: { metadata: { branch: 'preview-a' } },
        },
        'preview-a'
      )
    ).not.toThrow();
    expect(() =>
      assertPagesDeploymentTarget(
        {
          id: 'deploy-main',
          environment: 'production',
          deployment_trigger: { metadata: { branch: 'main' } },
        },
        'preview-a'
      )
    ).toThrow('deployed branch main; expected preview-a');
    expect(() =>
      assertPagesDeploymentTarget(
        {
          id: 'deploy-wrong-environment',
          environment: 'production',
          deployment_trigger: { metadata: { branch: 'preview-a' } },
        },
        'preview-a'
      )
    ).toThrow('deployed environment production; expected preview');
  });

  test('requires returned branch/environment metadata for production and preview', () => {
    expect(() =>
      assertPagesDeploymentTarget(
        {
          id: 'deploy-production',
          environment: 'production',
          deployment_trigger: { metadata: { branch: 'main' } },
        },
        'main'
      )
    ).not.toThrow();
    expect(() => assertPagesDeploymentTarget({ id: 'missing' }, 'preview-a')).toThrow(
      'deployed branch (missing)'
    );
    expect(() =>
      assertPagesDeploymentTarget(
        { id: 'missing-env', deployment_trigger: { metadata: { branch: 'preview-a' } } },
        'preview-a'
      )
    ).toThrow('deployed environment (missing)');
    expect(() => assertPagesNotModifiedTarget('preview-a')).toThrow(
      '304 without metadata for a preview deployment'
    );
    expect(() => assertPagesNotModifiedTarget('main')).not.toThrow();
  });
});

describe('Cloudflare Pages deploy response boundary', () => {
  test('accepts a valid Cloudflare envelope', () => {
    const response = parseCloudflareApiResponse<{
      id: string; // brand-ok — opaque Cloudflare response fixture identifier
    }>(
      '{"success":true,"result":{"id":"deploy-1"}}',
      200,
      'POST /deployments'
    );
    expect(response.success).toBe(true);
    expect(response.result?.id).toBe('deploy-1');
  });

  test('reports a null JSON response with request and HTTP context', () => {
    expect(() => parseCloudflareApiResponse('null', 200, 'POST /deployments')).toThrow(
      'Cloudflare API POST /deployments returned an invalid envelope (HTTP 200): null'
    );
  });

  test('treats an empty HTTP 304 as an unchanged deployment signal', () => {
    const response = parseCloudflareApiResponse('', 304, 'POST /deployments');
    expect(response).toEqual({
      success: true,
      notModified: true,
    });
    expect(ensureCloudflareHttpSuccess(response, 304, 'POST /deployments')).toBe(response);
  });

  test('preserves Cloudflare errors for other non-success HTTP statuses', () => {
    expect(() =>
      ensureCloudflareHttpSuccess(
        { success: false, errors: [{ message: 'token rejected' }] },
        403,
        'POST /deployments'
      )
    ).toThrow('Cloudflare API POST /deployments HTTP 403: token rejected');
  });

  test('reports non-JSON without leaking an unbounded response body', () => {
    const body = `<html>${'x'.repeat(300)}</html>`;
    expect(() => parseCloudflareApiResponse(body, 502, 'POST /deployments')).toThrow(
      /returned non-JSON \(HTTP 502\): <html>x+…$/
    );
  });

  test('rejects object responses that omit the Cloudflare success flag', () => {
    expect(() => parseCloudflareApiResponse('{"result":{}}', 200, 'GET /deployments')).toThrow(
      'Cloudflare API GET /deployments omitted success (HTTP 200)'
    );
  });
});
