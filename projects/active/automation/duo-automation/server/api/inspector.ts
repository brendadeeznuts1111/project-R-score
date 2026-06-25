// [DUOPLUS][API][INSPECTOR][FIX][CRITICAL][#REF:CR-002-FIX][BUN:6.1-NATIVE]

import { inspectURL } from "../../cli/factorywager-inspector-enhanced";
import { RedactionEngine } from "../compliance/redaction-engine";

export async function handleInspectorQuery(req: Request): Promise<Response> {
  const body = await req.json();
  const result = await inspectURL(body.url, body.options || {});

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": req.headers.get("X-Request-ID") || crypto.randomUUID()
    }
  });
}

export async function handleInspectorRedact(req: Request): Promise<Response> {
  const body = await req.json();
  const engine = new RedactionEngine();
  const rules = body.rules || [];
  const { redactedText } = engine.scan(body.text || "", rules);

  return new Response(JSON.stringify({ redacted: redactedText }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export async function handleComplianceAudit(): Promise<Response> {
  const auditLog: unknown[] = [];

  return new Response(JSON.stringify(auditLog, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
