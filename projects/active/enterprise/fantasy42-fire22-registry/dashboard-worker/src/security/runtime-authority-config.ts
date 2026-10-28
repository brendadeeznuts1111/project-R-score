export type Fantasy42LocalAuthority = 'language-hub' | 'auth-test';

const LOCAL_AUTHORITIES: Record<Fantasy42LocalAuthority, string> = {
  'language-hub': 'http://localhost:3001',
  'auth-test': 'http://localhost:8788',
};

export function parseExactLocalAuthority(
  input: string | URL,
  authority: Fantasy42LocalAuthority
): string {
  const expected = LOCAL_AUTHORITIES[authority];
  let parsed: URL;
  try {
    parsed = new URL(input.toString());
  } catch {
    throw new TypeError(`${authority} authority must be an absolute URL`);
  }
  if (
    parsed.origin !== expected ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new TypeError(`${authority} requires exact ${expected} authority`);
  }
  return expected;
}
