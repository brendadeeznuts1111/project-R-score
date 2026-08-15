import { describe, expect, test } from 'bun:test';
import {
  avatarWebpResponse,
  isSafeAvatarId,
} from '../lib/images/avatar-response.ts';

describe('avatarWebpResponse (Bun.Image)', () => {
  test('isSafeAvatarId rejects traversal', () => {
    expect(isSafeAvatarId('demo-player')).toBe(true);
    expect(isSafeAvatarId('../etc/passwd')).toBe(false);
    expect(isSafeAvatarId('a/b')).toBe(false);
    expect(isSafeAvatarId('')).toBe(false);
  });

  test('400 for unsafe id', async () => {
    const res = await avatarWebpResponse('../x');
    expect(res.status).toBe(400);
  });

  test('200 webp for demo-player (warehouse or fallback mark)', async () => {
    const res = await avatarWebpResponse('demo-player', {
      size: 64,
      quality: 80,
      autoOrient: false,
      filter: 'mitchell',
      fit: 'inside',
      withoutEnlargement: true,
      lossless: true,
      cache: false,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/webp');
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(50);
    // RIFF....WEBP magic
    expect(String.fromCharCode(buf[0], buf[1], buf[2], buf[3])).toBe('RIFF');
  });
});
