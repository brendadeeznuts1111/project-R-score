/**
 * DOD review API — approve/reject/list submissions.
 *
 * GET  /api/dod?status=flagged    → list submissions
 * POST /api/dod/approve {id}       → approve
 * POST /api/dod/reject  {id,reason} → reject
 */

import { DODVerifier } from "../../../lib/dod/verifier";

const verifier = new DODVerifier();

export async function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/dod", "");

  if (request.method === "GET") {
    const status = url.searchParams.get("status") || "all";
    return Response.json(verifier.list(status));
  }

  if (request.method === "POST" && path === "/approve") {
    const { id } = await request.json();
    verifier.approve(id);
    return Response.json({ ok: true, id, status: "verified" });
  }

  if (request.method === "POST" && path === "/reject") {
    const { id, reason } = await request.json();
    verifier.reject(id, reason || "Not specified");
    return Response.json({ ok: true, id, status: "rejected" });
  }

  return new Response("Not found", { status: 404 });
}
