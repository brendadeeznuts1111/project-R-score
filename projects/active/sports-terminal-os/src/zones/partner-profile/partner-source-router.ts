/**
 * Partner Profile OS — Source Router
 *
 * Multi-layered data source separation:
 *   Raw Signal → Book Index (O(1)) → Candidate Filter → Per-Partner Evaluation → GateResult[]
 *
 * Key Principle:
 *   Separate by partner, using the partner's allowed sources/books as the first
 *   fast filter, then apply all other rules inside the gateway.
 */

import { type SignalContext, type GateResult } from "./partner-profile-schema";
import { partnerProfileService } from "./partner-profile-service";

/**
 * Refresh the book index. Builds Map<bookId, Set<partnerId>>.
 * O(n * s) where n = partners, s = sources per partner. Called once at boot.
 */
export function refreshBookIndex(): void {
  partnerProfileService.refreshBookIndex();
}

/**
 * Route a signal to all eligible partners that have the book.
 *
 * Algorithm:
 *   1. O(1) index lookup: bookId → Set<partnerId>
 *   2. Candidate filter: state must be active/graduated
 *   3. Per-partner gateway.evaluate(signal) → GateResult
 *   4. If allowed, gateway.recordExposure(stake)
 *
 * Complexity: O(m) where m = partners with this book (typically < 50).
 */
export function routeSignal(
  signal: SignalContext
): Array<{ partnerId: string; result: GateResult }> {
  return partnerProfileService.routeSignal(signal);
}

/**
 * Get all partner IDs associated with a given book.
 * O(1) lookup.
 */
export function getPartnersForBook(bookId: string): string[] {
  const idx = partnerProfileService.getBookIndex();
  const set = idx.get(bookId);
  return set ? Array.from(set) : [];
}

/**
 * Get all books currently indexed.
 */
export function getIndexedBooks(): string[] {
  const idx = partnerProfileService.getBookIndex();
  return Array.from(idx.keys());
}
