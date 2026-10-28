// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
import { describe, expect, test } from 'bun:test';
import { downloadArtifact } from '../scripts/bake-bookmakers-board.ts';

const bytes = new TextEncoder().encode('project-r artifact');

function digest(algorithm: 'sha256' | 'sha3-256'): string {
  return new Bun.CryptoHasher(algorithm).update(bytes).digest('hex');
}

const fetcher = (async () => new Response(bytes)) as unknown as typeof fetch;

describe('bookmakers artifact integrity', () => {
  test('verifies SHA-256 and SHA3-256 before extraction', async () => {
    const result = await downloadArtifact(
      {
        version: '1.0.0',
        r2Key: 'demo/artifact.tgz',
        size: bytes.byteLength,
        checksum: digest('sha256'),
        sha3: { algorithm: 'sha3-256', digest: digest('sha3-256') },
      },
      fetcher
    );
    expect(result).toEqual(bytes);
  });

  test('rejects a mismatched SHA3-256 digest', async () => {
    await expect(
      downloadArtifact(
        {
          version: '1.0.0',
          r2Key: 'demo/artifact.tgz',
          size: bytes.byteLength,
          checksum: digest('sha256'),
          sha3: { algorithm: 'sha3-256', digest: '0'.repeat(64) },
        },
        fetcher
      )
    ).rejects.toThrow('sha3-256 mismatch');
  });
});
