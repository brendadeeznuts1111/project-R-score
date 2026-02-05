export class AllowListViolationError extends Error {
  hostname: string;
  reason: string;

  constructor(hostname: string, reason: string) {
    super(`[DUOPLUS][ALLOWLIST][DENY] ${hostname}: ${reason}`);
    this.name = "AllowListViolationError";
    this.hostname = hostname;
    this.reason = reason;
  }
}

export function allowListViolationError(hostname: string, reason: string): AllowListViolationError {
  return new AllowListViolationError(hostname, reason);
}
