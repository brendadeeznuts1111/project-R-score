// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @verified Bun.TOML · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/toml#bun-toml-parse
/** TOML serialization through the repository's stable Bun 1.4 runtime. */
import { TOML } from 'bun';

/** Serialize an object through Bun.TOML.stringify and reject unsupported roots. */
export function tomlStringify(value: object): string {
  const output = TOML.stringify(value);
  if (output === undefined) throw new TypeError('TOML root must be an object');
  return output;
}
