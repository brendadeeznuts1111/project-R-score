export type BrowserTelemetryKind = "errors" | "violations";
export type BrowserNetworkMode = "online" | "offline-no-socket";
export type BrowserFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface BrowserTelemetryOptions {
  readonly fetcher?: BrowserFetch;
  readonly networkMode?: BrowserNetworkMode;
}

const TELEMETRY_ORIGIN = "https://monitoring.quantumnavigator.io";

export function postBrowserTelemetry(
  kind: BrowserTelemetryKind,
  body: string,
  options: BrowserTelemetryOptions = {},
): Promise<Response> {
  if (options.networkMode === "offline-no-socket")
    throw new Error("TOML CLI browser telemetry is disabled offline");
  if (kind !== "errors" && kind !== "violations")
    throw new TypeError("Unknown TOML CLI browser telemetry route");
  const input = `${TELEMETRY_ORIGIN}/${kind}`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "omit",
    redirect: "error",
    keepalive: true,
    signal: AbortSignal.timeout(5_000),
  };
  const request = options.fetcher ? options.fetcher(input, init) : fetch(input, init);
  return request.then(response => {
    response.body?.cancel().catch(() => {});
    return response;
  });
}
