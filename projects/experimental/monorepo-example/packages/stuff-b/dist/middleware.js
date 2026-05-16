// @bun
import {
  AUTH,
  HEADERS,
  LIMITS
} from "./index-kqsbh0ty.js";
import"./index-7ed6y08k.js";

// middleware.ts
function withCors(res) {
  for (const [key, value] of Object.entries(HEADERS.CORS)) {
    res.headers.set(key, value);
  }
  return res;
}
function corsPreflightResponse() {
  return withCors(new Response(null, { status: 204 }));
}
var logs = [];
function logRequest(entry) {
  logs.push(entry);
  if (logs.length > LIMITS.MAX_REQUEST_LOGS)
    logs.shift();
}
function getRequestLogs(limit = LIMITS.DEFAULT_LOG_LIMIT) {
  return logs.slice(-limit);
}
async function withTiming(handler, method, path) {
  const t0 = Bun.nanoseconds();
  const res = await handler();
  const durationMs = (Bun.nanoseconds() - t0) / 1e6;
  logRequest({ method, path, status: res.status, durationMs, ts: Date.now() });
  res.headers.set(HEADERS.RESPONSE_TIME, `${durationMs.toFixed(2)}ms`);
  return withCors(res);
}
async function checkAuth(req) {
  if (!AUTH.API_TOKEN)
    return true;
  const header = req.headers.get(HEADERS.AUTH);
  if (!header?.startsWith(AUTH.BEARER_PREFIX))
    return false;
  const token = header.slice(AUTH.BEARER_PREFIX.length);
  return await Bun.password.verify(token, AUTH.API_TOKEN);
}
async function hashToken(plaintext) {
  return await Bun.password.hash(plaintext, { algorithm: "bcrypt", cost: AUTH.BCRYPT_COST });
}
export {
  withTiming,
  withCors,
  logRequest,
  hashToken,
  getRequestLogs,
  corsPreflightResponse,
  checkAuth
};
