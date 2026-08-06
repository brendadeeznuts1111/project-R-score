/**
 * Compare OCR/accounting figures against expected stake from play dispatch.
 */

export type DodReconcileStatus = 'ok' | 'mismatch' | 'unknown';

export type DodReconcileResult = {
  status: DodReconcileStatus;
  expected: number | null;
  actual: number | null;
  delta: number | null;
  reconciled: boolean;
  banner: string | null;
};

const STAKE_TOLERANCE = 0.01;

/** USD display for portal banners and ops replies. */
export function formatDodMoney(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/** Reconcile expected stake vs OCR/accounting amount. */
export function reconcileDodAmounts(
  expected: number | null | undefined,
  actual: number | null | undefined
): DodReconcileResult {
  const exp = expected != null && Number.isFinite(Number(expected)) ? Number(expected) : null;
  const act = actual != null && Number.isFinite(Number(actual)) ? Number(actual) : null;

  if (exp == null || act == null) {
    return {
      status: 'unknown',
      expected: exp,
      actual: act,
      delta: null,
      reconciled: false,
      banner: null,
    };
  }

  const delta = act - exp;
  if (Math.abs(delta) <= STAKE_TOLERANCE) {
    return {
      status: 'ok',
      expected: exp,
      actual: act,
      delta: 0,
      reconciled: true,
      banner: null,
    };
  }

  const expFmt = formatDodMoney(exp)!;
  const actFmt = formatDodMoney(act)!;
  const deltaFmt = formatDodMoney(Math.abs(delta))!;
  return {
    status: 'mismatch',
    expected: exp,
    actual: act,
    delta,
    reconciled: false,
    banner: `Stake mismatch: expected ${expFmt}, OCR shows ${actFmt} (Δ ${deltaFmt})`,
  };
}

/** Read expected stake column from SQLite/bake row. */
export function expectedAmountFromRow(row: Record<string, unknown>): number | null {
  const raw = row.expected_amount ?? row.expectedAmount;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
