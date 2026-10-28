/** Hermetic protocol proof rows owned by guard:protocol-matrix:check. */

export type HermeticProtocolProofRow = {
  readonly route: 'direct' | 'named-proxy-connect';
  readonly protocol: 'h1' | 'h2' | 'h3';
  readonly status: 'exercised' | 'candidate-unavailable';
  readonly fixture: string;
  readonly limitation?: string;
};

/**
 * This is a proof manifest, not a runtime capability promise. A row is
 * `exercised` only when the guard command owns a deterministic loopback test.
 */
export const HERMETIC_PROTOCOL_PROOF_MATRIX = [
  {
    route: 'direct',
    protocol: 'h1',
    status: 'exercised',
    fixture: 'Bun.serve loopback HTTP/1.1',
  },
  {
    route: 'direct',
    protocol: 'h2',
    status: 'exercised',
    fixture: 'node:http2 secure loopback server consumed by Bun.fetch HTTP/2',
  },
  {
    route: 'named-proxy-connect',
    protocol: 'h1',
    status: 'exercised',
    fixture: 'Bun.listen CONNECT proxy with a loopback TLS origin',
  },
  {
    route: 'named-proxy-connect',
    protocol: 'h2',
    status: 'candidate-unavailable',
    fixture: 'explicit named proxy request with a loopback node:http2 TLS origin',
    limitation: 'Bun 1.4 returns the exact HTTP2Unsupported error before opening a CONNECT tunnel',
  },
  {
    route: 'direct',
    protocol: 'h3',
    status: 'candidate-unavailable',
    fixture: 'none',
    limitation:
      'Bun 1.4 HTTP/3 remains experimental and this repository has no deterministic loopback QUIC fixture',
  },
] as const satisfies readonly HermeticProtocolProofRow[];
