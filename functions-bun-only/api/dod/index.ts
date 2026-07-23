/**
 * DOD review API — approve/reject/list submissions.
 *
 * GET  /api/dod?status=flagged    → list submissions
 * POST /api/dod/approve {id}       → approve
 * POST /api/dod/reject  {id,reason} → reject
 */

import { DODVerifier } from "../../../lib/dod/verifier";

// DOD_DB_PATH override for integration tests; production uses the default.
// Lazy per request: avoids a stale handle if the DB file is replaced (and
// matches the Pages Functions lifecycle).
function getVerifier(): DODVerifier {
  return new DODVerifier(Bun.env.DOD_DB_PATH || undefined);
}

/** Constant-time-ish token check: compare sha256 digests (equal-length inputs). */
function tokenOk(provided: string, expected: string): boolean {
  const hash = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");
  return hash(provided) === hash(expected);
}

/** Bearer auth when DOD_REVIEW_TOKEN is set; open in dev when unset. */
function authorized(request: Request): boolean {
  const expected = Bun.env.DOD_REVIEW_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return provided.length > 0 && tokenOk(provided, expected);
}

export async function onRequest({ request }: { request: Request }) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/dod", "");

  if (request.method === "GET") {
    const status = url.searchParams.get("status") || "all";
    using verifier = getVerifier();
    return Response.json(verifier.list(status));
  }

  if (request.method === "POST" && path === "/approve") {
    const { id } = await request.json();
    using verifier = getVerifier();
    verifier.approve(id);
    return Response.json({ ok: true, id, status: "verified" });
  }

  if (request.method === "POST" && path === "/reject") {
    const { id, reason } = await request.json();
    using verifier = getVerifier();
    verifier.reject(id, reason || "Not specified");
    return Response.json({ ok: true, id, status: "rejected" });
  }

  return new Response("Not found", { status: 404 });
}
