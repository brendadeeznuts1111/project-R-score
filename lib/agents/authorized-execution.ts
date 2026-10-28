import {
  authorizeAgentInvocation,
  parseAgentCapabilityManifestWire,
  parseAgentInvocationWire,
  type AgentAuthorization,
  type AgentCapabilityManifest,
  type AgentInvocation,
} from './capability-manifest.ts';

export interface AuthorizedAgentExecutionContext {
  readonly manifest: AgentCapabilityManifest;
  readonly invocation: AgentInvocation;
  readonly authorization: AgentAuthorization & { readonly ok: true };
}

export interface AuthorizedAgentEffects<Result> {
  /** The only effectful callback. It is never entered unless parsing and authorization succeed. */
  readonly execute: (context: AuthorizedAgentExecutionContext) => Result | Promise<Result>;
}

export interface AuthorizedAgentExecutionInput<Result> {
  readonly manifest: unknown;
  readonly invocation: unknown;
  readonly effects: AuthorizedAgentEffects<Result>;
  readonly now?: Date;
}

export class AgentInvocationDeniedError extends Error {
  readonly rejected: readonly string[];

  constructor(rejected: readonly string[]) {
    super(`Agent invocation denied: ${rejected.join(', ')}`);
    this.name = 'AgentInvocationDeniedError';
    this.rejected = rejected;
  }
}

/**
 * Parse both untrusted documents, authorize every declared surface, and only
 * then enter the injected effect callback. Parsing and authorization are pure.
 */
export async function executeAuthorizedAgentInvocation<Result>(
  input: AuthorizedAgentExecutionInput<Result>
): Promise<Result> {
  const manifest = parseAgentCapabilityManifestWire(input.manifest);
  const invocation = parseAgentInvocationWire(input.invocation);
  const authorization = authorizeAgentInvocation(manifest, invocation, input.now);
  if (!authorization.ok) throw new AgentInvocationDeniedError(authorization.rejected);
  return await input.effects.execute({
    manifest,
    invocation,
    authorization: authorization as AgentAuthorization & { readonly ok: true },
  });
}
