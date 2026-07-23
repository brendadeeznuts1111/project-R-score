/**
 * Bun.TOML.stringify — types lag helper (bun-types 1.3.x vs runtime 1.4).
 *
 * @see https://bun.com/docs/runtime/toml#bun-toml-stringify
 */
import { TOML } from 'bun';

/** types lag bun-types@1.3.x — https://bun.com/docs/runtime/toml#bun-toml-stringify */
export function tomlStringify<TValue>(value: TValue): string {
  return (TOML as typeof TOML & { stringify: <TInput>(v: TInput) => string }).stringify(value);
}
