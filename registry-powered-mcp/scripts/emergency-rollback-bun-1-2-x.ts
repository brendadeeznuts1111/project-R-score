#!/usr/bin/env bun

import { SecureDataRepository } from '../src/secure-data-repository';
import { ThreatIntelligenceService } from '../src/threat-intelligence-service';

/**
 * Emergency rollback to Bun 1.2.x if 1.3.5 breaks production
 */
class EmergencyRollback {
  private secureData: SecureDataRepository;
  private threatIntel: ThreatIntelligenceService;

  constructor() {
    this.secureData = new SecureDataRepository();
    this.threatIntel = new ThreatIntelligenceService();
  }

  async executeRollback(reason: string): Promise<void> {
    console.error('🚨 EMERGENCY ROLLBACK TRIGGERED');
    console.error(`Reason: ${reason}`);

    // Step 1: Log emergency event
    await this.threatIntel.reportThreat({
      type: 'emergency-rollback',
      severity: 'critical',
      reason,
      timestamp: Date.now()
    });

    // Step 2: Disable new binaries
    await this.disableBun135Binaries();

    // Step 3: Revert to 1.2.x
    await this.revertBunVersion();

    // Step 4: Enable runtime config loading
    await this.restoreRuntimeConfigLoading();

    // Step 5: Notify security team
    await this.notifySecurityTeam();

    console.error('✅ Emergency rollback complete');
  }

  private async disableBun135Binaries(): Promise<void> {
    // Mark all 1.3.5 binaries as compromised
    await this.secureData.store(
      'emergency:disabled-binaries',
      {
        version: '1.3.5',
        timestamp: Date.now(),
        reason: 'emergency-rollback'
      },
      { encrypt: true }
    );

    console.error('📛 Bun 1.3.5 binaries disabled');
  }

  private async revertBunVersion(): Promise<void> {
    // Revert to Bun 1.2.x
    const { exitCode } = Bun.spawnSync([
      'bun', 'install', 'bun@1.2.x'
    ]);

    if (exitCode !== 0) {
      throw new Error('Failed to revert Bun version');
    }

    console.error('↩️  Reverted to Bun 1.2.x');
  }

  private async restoreRuntimeConfigLoading(): Promise<void> {
    // Create emergency config that re-enables runtime loading
    await Bun.write('./bunfig.emergency.toml', `
# EMERGENCY CONFIG: Runtime config loading enabled
# Created: ${new Date().toISOString()}

[compile]
autoload_tsconfig = true
autoload_package_json = true
autoload_dotenv = true
autoload_bunfig = true

[security]
allow_runtime_config = true
emergency_mode = true
`);

    console.error('⚙️  Runtime config loading restored');
  }

  private async notifySecurityTeam(): Promise<void> {
    // Send alerts to all security channels
    const webhookUrls = [
      Bun.env.SECURITY_SLACK_WEBHOOK,
      Bun.env.SECURITY_PAGERDUTY_WEBHOOK,
      Bun.env.SECURITY_OPSGENIE_WEBHOOK
    ].filter(Boolean);

    await Promise.all(
      webhookUrls.map(url =>
        fetch(url!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 EMERGENCY ROLLBACK: Bun 1.3.5 → 1.2.x\nReason: ${reason}`,
            severity: 'critical',
            timestamp: new Date().toISOString()
          })
        })
      )
    );

    console.error('📢 Security team notified');
  }
}

// Export for programmatic use
export { EmergencyRollback };

// Execute if called directly
if (import.meta.main) {
  const rollback = new EmergencyRollback();
  const reason = process.argv[2] || 'Security issue detected';
  await rollback.executeRollback(reason);
}