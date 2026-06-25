/**
 * [KYC][PARSER][CLASS][META:{export}]
 * Parse ADB output for device integrity checks
 * #REF:ISSUE-KYC-005
 */

export class IntegrityParser {
  private static readonly EMULATOR_MODELS = [
    "sdk_gphone",
    "emulator",
    "goldfish",
    "generic",
  ];

  private static readonly ROOT_INDICATORS = [
    "su",
    "busybox",
    "superuser.apk",
    "magisk",
    "supersu",
  ];

  /**
   * [KYC][PARSER][FUNCTION][META:{public}]
   * Check if device model indicates an emulator
   */
  isEmulator(model: string): boolean {
    const lower = model.toLowerCase();
    return IntegrityParser.EMULATOR_MODELS.some((e) => lower.includes(e));
  }

  /**
   * [KYC][PARSER][FUNCTION][META:{public}]
   * Check if security patch is older than 6 months
   */
  isPatchOutdated(patch: string): boolean {
    if (!patch) return true;
    try {
      const patchDate = new Date(patch);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return patchDate < sixMonthsAgo;
    } catch {
      return true;
    }
  }

  /**
   * Extract Play Integrity token from dumpsys output
   */
  extractPlayIntegrityToken(output: string): string | null {
    const match = output.match(/PLAY_INTEGRITY_TOKEN:(\S+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if Google Play Services is in package list
   */
  hasPlayServices(packageList: string): boolean {
    return packageList.includes("com.google.android.gms");
  }

  /**
   * Check if Play Integrity is present in output
   */
  hasPlayIntegrity(output: string): boolean {
    return output.includes("PLAY_INTEGRITY");
  }

  /**
   * Get list of root indicator binaries to check
   */
  getRootIndicators(): string[] {
    return [...IntegrityParser.ROOT_INDICATORS];
  }

  /**
   * [KYC][PARSER][FUNCTION][META:{async}][META:{public}]
   * Check if any root indicator was found
   */
  async checkRootAccess(shellWhich: (binary: string) => Promise<boolean>): Promise<boolean> {
    for (const indicator of IntegrityParser.ROOT_INDICATORS) {
      try {
        if (await shellWhich(indicator)) {
          return true;
        }
      } catch {
        // Continue checking other indicators
      }
    }
    return false;
  }
}
