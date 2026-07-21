import { describe, expect, it } from 'bun:test';
import { getCliPath, getPat, MissingPersonalAccessTokenError } from '../src/env.ts';

describe('env', () => {
  it('throws when PAT is missing', () => {
    const previous = Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN;
    delete Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN;
    expect(() => getPat()).toThrow(MissingPersonalAccessTokenError);
    if (previous !== undefined) {
      Bun.env.PROTON_PASS_PERSONAL_ACCESS_TOKEN = previous;
    }
  });

  it('returns the configured CLI path', () => {
    const previous = Bun.env.PROTON_PASS_CLI_PATH;
    Bun.env.PROTON_PASS_CLI_PATH = '/custom/pass-cli';
    expect(getCliPath()).toBe('/custom/pass-cli');
    if (previous !== undefined) {
      Bun.env.PROTON_PASS_CLI_PATH = previous;
    } else {
      delete Bun.env.PROTON_PASS_CLI_PATH;
    }
  });

  it('defaults CLI path to pass-cli', () => {
    const previous = Bun.env.PROTON_PASS_CLI_PATH;
    delete Bun.env.PROTON_PASS_CLI_PATH;
    expect(getCliPath()).toBe('pass-cli');
    if (previous !== undefined) {
      Bun.env.PROTON_PASS_CLI_PATH = previous;
    }
  });
});
