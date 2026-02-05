// Enhanced validation for poolDetails data
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PoolValidator {
  static validatePoolDetails(poolDetails: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (typeof poolDetails !== 'object' || poolDetails === null) {
      errors.push("Pool details is not a valid object");
      return { isValid: false, errors, warnings };
    }

    // Required field validation
    const requiredFields = ['poolName', 'apy', 'balance', 'members', 'volume24h', 'yieldGenerated', 'riskScore', 'tier'];
    for (const field of requiredFields) {
      if (!(field in poolDetails)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Business logic validation
    if (poolDetails.apy !== undefined) {
      if (typeof poolDetails.apy !== 'number' || isNaN(poolDetails.apy)) {
        errors.push("APY must be a valid number");
      } else if (poolDetails.apy < -100 || poolDetails.apy > 1000) {
        warnings.push(`Unusual APY value: ${poolDetails.apy.toFixed(2)}%`);
      }
    }

    if (poolDetails.balance !== undefined) {
      if (typeof poolDetails.balance !== 'number' || isNaN(poolDetails.balance)) {
        errors.push("Balance must be a valid number");
      } else if (poolDetails.balance < 0) {
        warnings.push(`Negative balance: $${poolDetails.balance.toLocaleString()}`);
      }
    }

    if (poolDetails.members !== undefined) {
      if (typeof poolDetails.members !== 'number' || isNaN(poolDetails.members)) {
        errors.push("Members count must be a valid number");
      } else if (poolDetails.members < 0) {
        warnings.push(`Negative member count: ${poolDetails.members}`);
      } else if (poolDetails.members > 10000) {
        warnings.push(`Unusually high member count: ${poolDetails.members}`);
      }
    }

    if (poolDetails.riskScore !== undefined) {
      if (typeof poolDetails.riskScore !== 'number' || isNaN(poolDetails.riskScore)) {
        errors.push("Risk score must be a valid number");
      } else if (poolDetails.riskScore < 0 || poolDetails.riskScore > 100) {
        errors.push(`Risk score must be 0-100, got: ${poolDetails.riskScore}`);
      }
    }

    if (poolDetails.tier !== undefined) {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
      if (!validTiers.includes(poolDetails.tier.toLowerCase())) {
        warnings.push(`Unknown tier: ${poolDetails.tier}`);
      }
    }

    // Data freshness validation
    if (poolDetails.lastUpdated !== undefined) {
      const ageMs = Date.now() - new Date(poolDetails.lastUpdated).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours > 24) {
        warnings.push(`Data is ${ageHours.toFixed(1)} hours old`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Enhanced display with validation
  static displayPoolDetails(poolDetails: any): void {
    const validation = PoolValidator.validatePoolDetails(poolDetails);
    
    if (!validation.isValid) {
      console.log("\n❌ Pool data validation failed:");
      validation.errors.forEach((error: string) => console.log(`   • ${error}`));
      return;
    }

    if (validation.warnings.length > 0) {
      console.log("\n⚠️  Pool data warnings:");
      validation.warnings.forEach((warning: string) => console.log(`   • ${warning}`));
    }

    console.log(`\n📊 Detailed Pool Analysis: ${poolDetails.poolName}`);
    console.log(`  • Current APY: ${poolDetails.apy.toFixed(2)}%`);
    console.log(`  • Balance: $${poolDetails.balance.toLocaleString()}`);
    console.log(`  • Members: ${poolDetails.members}`);
    console.log(`  • 24h Volume: $${poolDetails.volume24h.toLocaleString()}`);
    console.log(`  • 30d Yield: $${poolDetails.yieldGenerated.toFixed(2)}`);
    console.log(`  • Risk Score: ${poolDetails.riskScore}/100`);
    console.log(`  • Tier: ${poolDetails.tier.toUpperCase()}`);
  }
}
