// @see https://bun.com/blog/bun-v1.3.6#s3-requester-pays-support — requestPayer
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
import { describe, expect, test } from 'bun:test';
import { asAccessKeyId } from '../lib/types/branded';
import {
  createS3RegistryStore,
  requireFactoryRegistryS3Config,
  tarballContentDisposition,
} from '../lib/factory/object-store.ts';

describe('factory S3 store requestPayer (Bun ≥1.3.6)', () => {
  test('requireFactoryRegistryS3Config includes requestPayer from env', () => {
    const previous = {
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID,
      requestPayer: Bun.env.R2_REQUEST_PAYER,
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY,
    };
    try {
      Bun.env.R2_ACCESS_KEY_ID = 'AKIAFACTORYTEST';
      Bun.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      Bun.env.R2_REQUEST_PAYER = 'true';
      const cfg = requireFactoryRegistryS3Config();
      expect(cfg.requestPayer).toBe(true);
      Bun.env.R2_REQUEST_PAYER = '0';
      expect(requireFactoryRegistryS3Config().requestPayer).toBe(false);
    } finally {
      if (previous.accessKeyId === undefined) delete Bun.env.R2_ACCESS_KEY_ID;
      else Bun.env.R2_ACCESS_KEY_ID = previous.accessKeyId;
      if (previous.requestPayer === undefined) delete Bun.env.R2_REQUEST_PAYER;
      else Bun.env.R2_REQUEST_PAYER = previous.requestPayer;
      if (previous.secretAccessKey === undefined) delete Bun.env.R2_SECRET_ACCESS_KEY;
      else Bun.env.R2_SECRET_ACCESS_KEY = previous.secretAccessKey;
    }
  });

  test('createS3RegistryStore accepts explicit requestPayer without throwing', () => {
    const store = createS3RegistryStore({
      accessKeyId: asAccessKeyId('AKIAFACTORYTEST'),
      secretAccessKey: 'test-secret',
      bucket: 'requester-pays-bucket',
      endpoint: 'https://example.r2.cloudflarestorage.com',
      requestPayer: true,
    });
    expect(typeof store.ping).toBe('function');
    expect(typeof store.putJson).toBe('function');
  });
});

describe('tarballContentDisposition', () => {
  test('uses last path segment as attachment filename', () => {
    expect(tarballContentDisposition('@scope/pkg/1.0.0/artifact.tgz')).toBe(
      'attachment; filename="artifact.tgz"'
    );
  });

  test('strips embedded quotes and falls back for empty key', () => {
    expect(tarballContentDisposition('evil"name.tgz')).toBe(
      'attachment; filename="evilname.tgz"'
    );
    expect(tarballContentDisposition('')).toBe('attachment; filename="artifact.tgz"');
  });
});
