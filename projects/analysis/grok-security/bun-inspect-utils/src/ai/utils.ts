import type { AnomalySignal } from "./types";

export function createSignal(
  deviceId: string,
  data: Partial<AnomalySignal>
): AnomalySignal {
  return {
    deviceId,
    sessionId: data.sessionId || `session-${Date.now()}`,
    timestamp: data.timestamp || Date.now(),
    deviceAgeDays: data.deviceAgeDays || 0,
    accountAgeDays: data.accountAgeDays || 0,
    walletAgeDelta: data.walletAgeDelta || 0,
    legAmount: data.legAmount || 0,
    legVelocity: data.legVelocity || 0,
    dailyVolumeUSD: data.dailyVolumeUSD || 0,
    ipJumpCount: data.ipJumpCount || 0,
    countryChangeCount: data.countryChangeCount || 0,
    vpnDetected: data.vpnDetected || false,
    ctrProximity: data.ctrProximity || 0,
    chargebackHistory: data.chargebackHistory || false,
    previousAnomalyScore: data.previousAnomalyScore || 0,
    isFirstTransaction: data.isFirstTransaction || false,
    isWeekendTransaction: data.isWeekendTransaction || false,
    isOffPeakHour: data.isOffPeakHour || false,
  };
}

export function calculateCTRProximity(dailyVolumeUSD: number): number {
  const CTR_THRESHOLD = 10000;
  if (dailyVolumeUSD >= CTR_THRESHOLD) return 1;
  return dailyVolumeUSD / CTR_THRESHOLD;
}

export function calculateLegVelocity(
  transactionCount: number,
  timeWindowHours: number
): number {
  return transactionCount / Math.max(timeWindowHours, 1);
}

export function isWeekendTransaction(timestamp: number): boolean {
  const date = new Date(timestamp);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isOffPeakHour(timestamp: number): boolean {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  return hour >= 2 && hour < 6;
}

export function calculateWalletAgeDelta(
  walletCreatedAt: number,
  transactionAt: number
): number {
  const deltaMs = transactionAt - walletCreatedAt;
  return Math.max(0, deltaMs / (1000 * 60 * 60 * 24));
}

export function detectIPJump(ips: string[]): number {
  if (ips.length < 2) return 0;

  const subnets = ips.map((ip) => {
    const parts = ip.split(".");
    return parts.slice(0, 3).join(".");
  });

  const uniqueSubnets = new Set(subnets);
  return uniqueSubnets.size - 1;
}

export function detectCountryChanges(countries: string[]): number {
  if (countries.length < 2) return 0;
  const uniqueCountries = new Set(countries);
  return uniqueCountries.size - 1;
}

export function formatScore(score: number): string {
  return (score * 100).toFixed(1) + "%";
}

export function signalToCSVRow(signal: AnomalySignal, score: number): string {
  return [
    signal.deviceId,
    signal.sessionId,
    signal.deviceAgeDays,
    signal.legAmount,
    signal.legVelocity.toFixed(2),
    signal.ipJumpCount,
    signal.ctrProximity.toFixed(3),
    signal.chargebackHistory ? "yes" : "no",
    signal.vpnDetected ? "yes" : "no",
    score.toFixed(4),
  ].join(",");
}

export function csvRowToSignal(row: string): Partial<AnomalySignal> {
  const [deviceId, sessionId, deviceAgeDays, legAmount, legVelocity, ipJumpCount, ctrProximity, chargebackHistory, vpnDetected] =
    row.split(",");

  return {
    deviceId,
    sessionId,
    deviceAgeDays: parseInt(deviceAgeDays, 10),
    legAmount: parseFloat(legAmount),
    legVelocity: parseFloat(legVelocity),
    ipJumpCount: parseInt(ipJumpCount, 10),
    ctrProximity: parseFloat(ctrProximity),
    chargebackHistory: chargebackHistory === "yes",
    vpnDetected: vpnDetected === "yes",
  };
}
