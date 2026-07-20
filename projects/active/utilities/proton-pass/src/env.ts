// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env

const PAT_ENV = 'PROTON_PASS_PERSONAL_ACCESS_TOKEN';
const CLI_PATH_ENV = 'PROTON_PASS_CLI_PATH';

export class MissingPersonalAccessTokenError extends Error {
  constructor() {
    super(`${PAT_ENV} is not set`);
  }
}

/** Read the Proton Pass personal access token from the environment. */
export function getPat(): string {
  const token = process.env[PAT_ENV] ?? Bun.env[PAT_ENV];
  if (!token) {
    throw new MissingPersonalAccessTokenError();
  }
  return token;
}

/** Resolve the Proton Pass CLI binary path. */
export function getCliPath(): string {
  return process.env[CLI_PATH_ENV] ?? Bun.env[CLI_PATH_ENV] ?? 'pass-cli';
}
