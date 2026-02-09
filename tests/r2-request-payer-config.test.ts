import { afterEach, describe, expect, test } from 'bun:test';
import { resolveR2BridgeConfig } from '../scripts/lib/r2-bridge';
import { ProfileSessionUploader, resolveUploaderConfig } from '../lib/profile/session-uploader';

const ENV_KEYS = [
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_REQUEST_PAYER',
] as const;

const baselineEnv: Record<string, string | undefined> = Object.fromEntries(
  ENV_KEYS.map((key) => [key, Bun.env[key]])
);

function setBaseR2Env() {
  Bun.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
  Bun.env.R2_BUCKET = 'bucket';
  Bun.env.R2_ACCESS_KEY_ID = 'key';
  Bun.env.R2_SECRET_ACCESS_KEY = 'secret';
}

function resetEnv() {
  for (const key of ENV_KEYS) {
    const original = baselineEnv[key];
    if (original === undefined) delete Bun.env[key];
    else Bun.env[key] = original;
  }
}

afterEach(() => {
  resetEnv();
});

describe('R2 requestPayer parsing', () => {
  test('resolveR2BridgeConfig parses truthy env variants', () => {
    setBaseR2Env();
    for (const value of ['1', 'true', 'TRUE', 'Yes', 'on']) {
      Bun.env.R2_REQUEST_PAYER = value;
      const cfg = resolveR2BridgeConfig();
      expect(cfg.requestPayer).toBe(true);
    }
  });

  test('resolveR2BridgeConfig parses falsey env variants', () => {
    setBaseR2Env();
    for (const value of ['0', 'false', 'off', 'no', '']) {
      Bun.env.R2_REQUEST_PAYER = value;
      const cfg = resolveR2BridgeConfig();
      expect(cfg.requestPayer).toBe(false);
    }
    delete Bun.env.R2_REQUEST_PAYER;
    const cfg = resolveR2BridgeConfig();
    expect(cfg.requestPayer).toBe(false);
  });

  test('explicit input overrides env in resolveR2BridgeConfig', () => {
    setBaseR2Env();
    Bun.env.R2_REQUEST_PAYER = 'false';
    const cfg = resolveR2BridgeConfig({ requestPayer: true });
    expect(cfg.requestPayer).toBe(true);
  });

  test('resolveUploaderConfig parses truthy env variants', () => {
    setBaseR2Env();
    for (const value of ['1', 'true', 'TRUE', 'Yes', 'on']) {
      Bun.env.R2_REQUEST_PAYER = value;
      const cfg = resolveUploaderConfig();
      expect(cfg.requestPayer).toBe(true);
    }
  });

  test('ProfileSessionUploader forwards requestPayer to s3 options only when enabled', () => {
    const enabled = new ProfileSessionUploader({ requestPayer: true });
    const enabledOpts = (enabled as unknown as { s3Opts: Record<string, string | boolean> }).s3Opts;
    expect(enabledOpts.requestPayer).toBe(true);

    const disabled = new ProfileSessionUploader({ requestPayer: false });
    const disabledOpts = (disabled as unknown as { s3Opts: Record<string, string | boolean> }).s3Opts;
    expect(disabledOpts.requestPayer).toBeUndefined();
  });
});
