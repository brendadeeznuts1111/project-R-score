import { CryptoHasher } from 'bun';
export function hashCss(css: string): string {
  const h = new CryptoHasher('sha256');
  h.update(css);
  return h.digest('hex');
}
