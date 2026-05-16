export function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function coerceWholeNumber(value: string, fieldName: string): bigint {
  if (!isWholeNumber(value)) {
    throw new Error(`${fieldName} must be a whole-number string.`);
  }
  return BigInt(value.trim());
}

export function clampPagination(page: number, pageCount: number): number {
  if (pageCount <= 1) return 1;
  return Math.min(Math.max(1, page), pageCount);
}
