import type { F402Config, F402Params, APIResponse } from "./types";
import { SPORTS, MARKETS, STATUS_FILTERS, HANDLE_PERIODS, POSITION_VIEWS, SPORT_POSSESSION_EMOJI, riskEmoji, riskColor } from "../../../shared/constants";

export { SPORTS, MARKETS, STATUS_FILTERS, HANDLE_PERIODS, POSITION_VIEWS, SPORT_POSSESSION_EMOJI, riskEmoji, riskColor };
export type { F402Config, F402Params, APIResponse };

async function loadConfig(): Promise<F402Config> {
  const configPath = `${import.meta.dir}/../../config.json`;
  const raw = await Bun.file(configPath).json().catch(() => ({}));
  return {
    api_key: raw?.f402?.api_key ?? Bun.env.F402_API_KEY ?? "",
    endpoint: raw?.f402?.endpoint ?? Bun.env.F402_ENDPOINT ?? "https://fantasy402.com/api/v1",
  };
}

async function readParams<T = F402Params>(): Promise<T> {
  try {
    const text = await Bun.stdin.text();
    return JSON.parse(text || "{}") as T;
  } catch (err) {
    respond({ error: true, message: `Failed to parse input: ${(err as Error).message}` });
    process.exit(1);
  }
}

export async function init<T = F402Params>(): Promise<{ config: F402Config; params: T }> {
  const [config, params] = await Promise.all([loadConfig(), readParams<T>()]);
  return { config, params };
}

export function runMain(fn: () => Promise<void>): void {
  fn().catch(err => {
    respond({ error: true, message: err.message });
    process.exit(1);
  });
}

export async function f402Fetch<T = any>(
  config: F402Config,
  path: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(`${config.endpoint}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
      "X-Source": "kimi-plugin",
    },
  });

  if (!res.ok) {
    respond({ error: true, status: res.status, message: res.statusText });
    process.exit(1);
  }

  return res.json();
}

export function respond(output: APIResponse): void {
  console.log(JSON.stringify(output));
}

export function makeTable(headers: string[], rows: string[]): string {
  if (rows.length === 0) return "";
  const sep = headers.map(() => "---").join(" | ");
  return `| ${headers.join(" | ")} |\n| ${sep} |\n${rows.join("\n")}`;
}

export function formatMoney(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `$${value.toLocaleString()}`;
}

export function formatPNL(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `${value >= 0 ? "+" : ""}$${value.toLocaleString()}`;
}
