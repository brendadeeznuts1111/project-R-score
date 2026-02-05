#!/usr/bin/env bun
// scripts/debug-network.ts - Bun v1.3.6 Network Debug

if (Bun.env.DEBUG_FETCH === "1") {
  Bun.env.BUN_CONFIG_VERBOSE_FETCH = "curl";
  console.log("DEBUG_FETCH=1 -> BUN_CONFIG_VERBOSE_FETCH=curl");
} else {
  Bun.env.BUN_CONFIG_VERBOSE_FETCH = "false";
}

export async function debugFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  console.log(`${url} -> ${response.status} hsl(159,87%,37%)`);
  return response;
}

if (import.meta.main) {
  const argUrl = Bun.argv[2];
  const port = Bun.env.bunport || Bun.env.BUN_PORT || Bun.env.PORT || "8090";
  const url = argUrl || `http://localhost:${port}/health`;
  await debugFetch(url);
}
