/**
 * [KYC][ANDROID][CLASS][META:{export}]
 * Play Integrity API validation
 * #REF:ISSUE-KYC-006
 */

import type { ADBTransport } from "./adbTransport";
import type { IntegrityParser } from "./integrityParser";
import type { PlayIntegrityResult } from "./types";

export class PlayIntegrityValidator {
  constructor(
    private readonly transport: ADBTransport,
    private readonly parser: IntegrityParser,
    private readonly packageName: string,
    private readonly googleCloudKey?: string
  ) {}

  /**
   * [KYC][ANDROID][FUNCTION][META:{async}][META:{public}]
   * Verify Play Integrity API status
   */
  async verify(): Promise<PlayIntegrityResult> {
    try {
      const output = await this.transport.dumpPackage(this.packageName);
      if (!output) {
        return { passed: false, failureReason: "package_not_found" };
      }

      // Check if Play Integrity token is present
      if (this.parser.hasPlayIntegrity(output)) {
        const token = this.parser.extractPlayIntegrityToken(output);
        if (token) {
          const isValid = await this.validateToken(token);
          return {
            passed: isValid,
            failureReason: isValid ? undefined : "invalid_token",
          };
        }
      }

      // If Play Integrity not found, check if device supports it
      const packageList = await this.transport.listPackages();
      if (!this.parser.hasPlayServices(packageList)) {
        return { passed: false, failureReason: "play_services_not_available" };
      }

      // Default to requiring manual review if Play Integrity not available
      return { passed: false, failureReason: "play_integrity_not_found" };
    } catch (error) {
      return {
        passed: false,
        failureReason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * [KYC][ANDROID][FUNCTION][META:{async}][META:{private}]
   * Validate Play Integrity token with Google API
   */
  private async validateToken(token: string): Promise<boolean> {
    if (!this.googleCloudKey) {
      // If no Google Cloud key configured, skip validation
      return true;
    }

    try {
      const response = await fetch("https://playintegrity.googleapis.com/v1/decrypt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.googleCloudKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ integrityToken: token }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return (
        data.deviceIntegrity?.deviceRecognitionVerdict?.includes("MEETS_DEVICE_INTEGRITY") ||
        false
      );
    } catch {
      return false;
    }
  }
}
