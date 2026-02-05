import { calculateLegRiskScore, LegSignal } from "./riskEngine.js";
import { SignalStore } from "./signalStore.js";
import { NebulaLogger } from "./logger.js";

const signalStore = new SignalStore();

export interface OrbitAssignment {
  starlightID: string;
  amount: number;
  orbitPath: string;
  orbitalPeriod: number; // minutes
  distance: number; // AU from center
}

export interface ScatterParams {
  amount: number;
  sourceFlow: string;
  totalStarlights: number;
  riskProfile: "low" | "medium" | "high";
}

export class OrbitAssign {
  private readonly ORBITAL_PATTERNS = [
    "spiral-galaxy",
    "elliptical-orbit",
    "asteroid-belt",
    "comet-trajectory",
    "binary-system",
  ];

  private readonly RISK_DISTRIBUTION = {
    low: {
      minOrbits: 50,
      maxOrbits: 100,
      baseAmount: 0.01, // 1% minimum per orbit
    },
    medium: {
      minOrbits: 25,
      maxOrbits: 75,
      baseAmount: 0.02, // 2% minimum per orbit
    },
    high: {
      minOrbits: 10,
      maxOrbits: 50,
      baseAmount: 0.05, // 5% minimum per orbit
    },
  };

  /**
   * Scatter value across the Starlight-ID galaxy
   */
  async scatterValue(params: ScatterParams): Promise<{
    orbits: OrbitAssignment[];
  }> {
    const config = this.RISK_DISTRIBUTION[params.riskProfile];
    const orbitCount = Math.floor(
      Math.random() * (config.maxOrbits - config.minOrbits + 1) +
        config.minOrbits
    );

    NebulaLogger.log("Orbit-Assign", "info", `Scattering $${params.amount} across ${orbitCount} Starlight-IDs`, {
      amount: params.amount,
      orbitCount,
      riskProfile: params.riskProfile,
    });

    const orbits: OrbitAssignment[] = [];
    let remainingAmount = params.amount;

    // Generate unique orbital paths
    for (let i = 0; i < orbitCount && remainingAmount > 0; i++) {
      const starlightID = this.generateStarlightID();
      const orbitPath =
        this.ORBITAL_PATTERNS[
          Math.floor(Math.random() * this.ORBITAL_PATTERNS.length)
        ];

      // Calculate orbital amount with cosmic distribution
      const amountRatio = this.calculateOrbitalRatio(
        i,
        orbitCount,
        params.riskProfile
      );
      const orbitAmount = Math.min(
        remainingAmount * amountRatio,
        remainingAmount * 0.3
      ); // Max 30% per orbit

      remainingAmount -= orbitAmount;

      orbits.push({
        starlightID,
        amount: orbitAmount,
        orbitPath,
        orbitalPeriod: this.calculateOrbitalPeriod(orbitPath),
        distance: this.calculateOrbitalDistance(i, orbitCount),
      });
    }

    // Add remaining amount to last orbit if any
    if (remainingAmount > 0 && orbits.length > 0) {
      orbits[orbits.length - 1].amount += remainingAmount;
    }

    NebulaLogger.log("Orbit-Assign", "info", `${orbits.length} orbits assigned`, {
      totalAmount: params.amount,
      orbits: orbits.length,
    });

    return { orbits };
  }

  /**
   * Generate unique Starlight-ID
   */
  private generateStarlightID(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `starlight-${timestamp}-${random}`;
  }

  /**
   * Calculate orbital amount ratio based on position
   */
  private calculateOrbitalRatio(
    position: number,
    total: number,
    risk: string
  ): number {
    const baseRatio = 1 / total;

    // Cosmic distribution: outer orbits get slightly more
    const positionFactor = 1 + (position / total) * 0.5;

    // Risk adjustment
    const riskMultiplier =
      risk === "high" ? 1.5 : risk === "medium" ? 1.2 : 1.0;

    return baseRatio * positionFactor * riskMultiplier;
  }

  /**
   * Calculate orbital period in minutes
   */
  private calculateOrbitalPeriod(orbitPath: string): number {
    const basePeriods = {
      "spiral-galaxy": 45,
      "elliptical-orbit": 30,
      "asteroid-belt": 60,
      "comet-trajectory": 15,
      "binary-system": 25,
    };

    const base =
      basePeriods[orbitPath as keyof typeof basePeriods] || 30;
    return Math.floor(base + Math.random() * 20); // ±10 minutes variance
  }

  /**
   * Calculate orbital distance in AU (Astronomical Units)
   */
  private calculateOrbitalDistance(position: number, total: number): number {
    // Distance ranges from 0.5 AU to 50 AU
    const minDistance = 0.5;
    const maxDistance = 50;
    const range = maxDistance - minDistance;

    return parseFloat((minDistance + (position / total) * range).toFixed(2));
  }

  /**
   * Get orbital statistics
   */
  getOrbitalStats(orbits: OrbitAssignment[]): {
    totalOrbits: number;
    totalAmount: number;
    averageDistance: number;
    averagePeriod: number;
    distribution: Record<string, number>;
  } {
    const totalAmount = orbits.reduce((sum, orbit) => sum + orbit.amount, 0);
    const avgDistance =
      orbits.reduce((sum, orbit) => sum + orbit.distance, 0) / orbits.length;
    const avgPeriod =
      orbits.reduce((sum, orbit) => sum + orbit.orbitalPeriod, 0) /
      orbits.length;

    const distribution: Record<string, number> = {};
    orbits.forEach((orbit) => {
      distribution[orbit.orbitPath] =
        (distribution[orbit.orbitPath] || 0) + 1;
    });

    return {
      totalOrbits: orbits.length,
      totalAmount,
      averageDistance: parseFloat(avgDistance.toFixed(2)),
      averagePeriod: Math.floor(avgPeriod),
      distribution,
    };
  }
}

/**
 * Hardened Orbit-Assign with step-up auth and fraud detection
 */
export async function assignLeg(
  deviceId: string,
  amount: number,
  clientIp?: string
): Promise<
  | { allowed: true; risk: number }
  | {
      allowed: false;
      reason: "N-AI-B" | "STEP_UP_AUTH_REQUIRED";
      stepUpMethod?: "SMS_VERIFICATION";
      retryAfter?: number;
      action?: "retired";
    }
> {
  const signal = await buildSignal(deviceId, amount, clientIp);
  const risk = calculateLegRiskScore(signal);

  if (risk > 0.85) {
    NebulaLogger.log("Orbit-Assign", "error", "Leg blocked N-AI-B", {
      deviceId,
      amount,
      risk,
    });
    await retireDevice(deviceId); // auto-shred
    return {
      allowed: false,
      reason: "N-AI-B",
      action: "retired",
    };
  }

  if (risk > 0.7) {
    NebulaLogger.log("Orbit-Assign", "warn", "Step-up required N-AI-T", {
      deviceId,
      amount,
      risk,
    });
    return {
      allowed: false,
      reason: "STEP_UP_AUTH_REQUIRED",
      stepUpMethod: "SMS_VERIFICATION",
      retryAfter: 30,
    };
  }

  // proceed
  await signalStore.recordLeg(deviceId, amount);
  await signalStore.recordVelocity(deviceId);
  NebulaLogger.log("Orbit-Assign", "info", "Leg assigned", {
    deviceId,
    amount,
    risk,
  });

  return { allowed: true, risk };
}

async function buildSignal(
  deviceId: string,
  amount: number,
  clientIp?: string
): Promise<LegSignal> {
  return {
    deviceId,
    ageDays: await signalStore.getDeviceAge(deviceId),
    legAmount: amount,
    legVelocity: await signalStore.getVelocity(deviceId), // legs/hour from Redis
    ipJump: clientIp
      ? await signalStore.getLocationVariance(clientIp)
      : 0,
    walletAgeDelta: 0, // from Atlas
    ctrProximity: await signalStore.getRecentFunding(deviceId),
    chargebackHistory: false, // from Atlas
  };
}

async function retireDevice(deviceId: string): Promise<void> {
  await signalStore.retireDevice(deviceId);
}