/**
 * [KYC][ANDROID][CLASS][META:{export}][BUN-NATIVE]
 * Android 13 KYC Failsafe Handler
 * Probe Android 13 device integrity before allowing KYC
 * Implements DeviceAttestationProvider for multi-platform support
 * #REF:ISSUE-KYC-002
 * #REF:DeviceAttestationProvider
 */

import { kycConfig } from "./config";
import { ADBTransport } from "./adbTransport";
import { IntegrityParser } from "./integrityParser";
import { PlayIntegrityValidator } from "./playIntegrityValidator";
import type {
  DeviceAttestationProvider,
  DeviceIntegrityResult,
  AttestationType,
  TransportMethod,
} from "./types";

export class Android13KYCFailsafe implements DeviceAttestationProvider {
  private readonly transport: ADBTransport;
  private readonly parser: IntegrityParser;
  private readonly playIntegrity: PlayIntegrityValidator;

  constructor(
    transport?: ADBTransport,
    parser?: IntegrityParser,
    playIntegrity?: PlayIntegrityValidator
  ) {
    this.transport = transport ?? new ADBTransport(kycConfig.adbPath);
    this.parser = parser ?? new IntegrityParser();
    this.playIntegrity =
      playIntegrity ??
      new PlayIntegrityValidator(
        this.transport,
        this.parser,
        kycConfig.packageName,
        kycConfig.googleCloudKey
      );
  }

  /**
   * [KYC][ANDROID][FUNCTION][META:{async}][META:{public}][BUN-NATIVE]
   * Probe Android 13 device integrity before allowing KYC
   * #REF:API-KYC-DEVICE-VERIFY
   */
  async verifyDeviceIntegrity(userId: string): Promise<DeviceIntegrityResult> {
    const logBuffer: string[] = [];
    const traceId = `kyc-device-${userId}-${Date.now()}`;

    try {
      // Step 1: Emulator check
      const model = await this.transport.getProperty("ro.product.model");
      if (this.parser.isEmulator(model)) {
        logBuffer.push(`[${traceId}] 🚫 Device is emulated - KYC blocked`);
        return this.reject(95, ["emulator_detected"], logBuffer);
      }

      // Step 2: Security patch check
      const patchLevel = await this.transport.getProperty("ro.build.version.security_patch");
      if (this.parser.isPatchOutdated(patchLevel)) {
        logBuffer.push(`[${traceId}] ⚠️  Security patch outdated: ${patchLevel}`);
      }

      // Step 3: Root detection
      const isRooted = await this.parser.checkRootAccess(
        (binary) => this.transport.shellWhich(binary)
      );
      if (isRooted) {
        logBuffer.push(`[${traceId}] 🚫 Device is rooted - KYC blocked`);
        return this.reject(100, ["root_detected"], logBuffer);
      }

      // Step 4: Play Integrity verification
      const integrity = await this.playIntegrity.verify();
      if (!integrity.passed) {
        logBuffer.push(`[${traceId}] ⚠️  Play Integrity failed: ${integrity.failureReason}`);
        return this.reject(75, [integrity.failureReason || "play_integrity_failed"], logBuffer);
      }

      logBuffer.push(`[${traceId}] ✅ Device integrity verified`);
      return { isGenuine: true, riskScore: 0, signatures: ["integrity_passed"], logs: logBuffer };
    } catch (error) {
      logBuffer.push(
        `[${traceId}] ❌ Device verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return this.reject(80, ["verification_error"], logBuffer);
    }
  }

  /**
   * Helper to construct rejection result
   */
  private reject(
    riskScore: number,
    signatures: string[],
    logs: string[]
  ): DeviceIntegrityResult {
    return { isGenuine: false, riskScore, signatures, logs };
  }

  /**
   * [KYC][ATTESTATION][FUNCTION][META:{public}]
   */
  getAttestationType(): AttestationType {
    return "android_play_integrity";
  }

  /**
   * [KYC][ATTESTATION][FUNCTION][META:{public}]
   */
  getTransportMethod(): TransportMethod {
    return "adb";
  }
}
