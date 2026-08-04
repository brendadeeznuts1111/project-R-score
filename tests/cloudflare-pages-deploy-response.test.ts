// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { parseCloudflareApiResponse } from '../tools/cloudflare-pages-deploy.ts';

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
