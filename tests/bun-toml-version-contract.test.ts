import { expect, test } from 'bun:test';

type TomlApi = typeof Bun.TOML & {
  stringify?: (value: unknown) => string;
};

const toml = Bun.TOML as TomlApi;
const onBun1314 = Bun.version === '1.3.14' ? test : test.skip;
const onBun140 = Bun.version === '1.4.0' ? test : test.skip;

onBun1314('Bun 1.3.14 exposes native TOML parsing but not TOML serialization', () => {
  expect(typeof toml.parse).toBe('function');
  expect(toml.stringify).toBeUndefined();
});

onBun140('Bun 1.4.0 canary exposes the observed TOML serialization candidate', () => {
  expect(typeof toml.parse).toBe('function');
  expect(typeof toml.stringify).toBe('function');
});
