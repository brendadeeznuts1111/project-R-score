import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL for the given text.
 */
export async function generateQrDataUrl(
  text: string,
  opts?: { width?: number; margin?: number }
): Promise<string> {
  const width = opts?.width ?? 200;
  const margin = opts?.margin ?? 2;
  return QRCode.toDataURL(text, { width, margin, errorCorrectionLevel: "M" });
}

/**
 * Get the current dashboard URL (for remote access).
 * Uses the actual URL the browser loaded from.
 */
export function getDashboardUrl(): string {
  const loc = window.location;
  return `${loc.protocol}//${loc.host}${loc.pathname}`;
}
