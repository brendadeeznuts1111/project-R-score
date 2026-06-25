/** Compile-time loop palette (HUD / WebView hex). */
export const enum ColorHex {
  Loop = 0x00d4aa,
  Network = 0x7b61ff,
  Endpoints = 0xa78bfa,
  Health = 0x22c55e,
  Degraded = 0xeab308,
  Unreachable = 0xef4444,
  Perf = 0x06b6d4,
  Delta = 0xf97316,
}

export type NetworkLoopReason = "initial" | "watch" | "probe";

export const NETWORK_LOOP_REASONS = {
  initial: "initial",
  watch: "watch",
  probe: "probe",
} as const satisfies Record<NetworkLoopReason, NetworkLoopReason>;