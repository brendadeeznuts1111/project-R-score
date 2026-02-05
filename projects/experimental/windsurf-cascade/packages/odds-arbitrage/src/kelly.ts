export class KellyCriterion {
  
  /**
   * Calculate Kelly Criterion percentage
   * f = (bp - q) / b
   * where:
   * f = fraction of bankroll to wager
   * b = odds received on the bet (b to 1)
   * p = probability of winning
   * q = probability of losing (1 - p)
   */
  public static calculateKelly(
    winProbability: number,
    odds: number,
    KellyFraction: number = 0.25 // Conservative Kelly (1/4 Kelly)
  ): number {
    if (winProbability <= 0 || winProbability >= 1) return 0;
    if (odds <= 0) return 0;
    
    const loseProbability = 1 - winProbability;
    const kellyPercentage = (odds * winProbability - loseProbability) / odds;
    
    // Apply Kelly fraction for safety and ensure non-negative
    return Math.max(0, kellyPercentage * KellyFraction);
  }

  /**
   * Calculate position size based on Kelly Criterion
   */
  public static calculatePositionSize(
    bankroll: number,
    winProbability: number,
    odds: number,
    kellyFraction: number = 0.25
  ): number {
    const kellyPercentage = this.calculateKelly(winProbability, odds, kellyFraction);
    return bankroll * kellyPercentage;
  }

  /**
   * Calculate expected value
   */
  public static calculateExpectedValue(
    winProbability: number,
    odds: number
  ): number {
    const loseProbability = 1 - winProbability;
    return (winProbability * odds) - (loseProbability * 1); // Assuming 1:1 loss
  }

  /**
   * Calculate optimal bet size for arbitrage
   */
  public static calculateArbitrageSizes(
    totalBankroll: number,
    odds1: number,
    odds2: number,
    probability1: number,
    probability2: number
  ): { size1: number; size2: number; expectedProfit: number } {
    // Simplified arbitrage sizing
    const kelly1 = this.calculateKelly(probability1, odds1, 0.5);
    const kelly2 = this.calculateKelly(probability2, odds2, 0.5);
    
    const totalKelly = kelly1 + kelly2;
    if (totalKelly === 0) {
      return { size1: 0, size2: 0, expectedProfit: 0 };
    }
    
    const size1 = (kelly1 / totalKelly) * totalBankroll;
    const size2 = (kelly2 / totalKelly) * totalBankroll;
    
    const expectedProfit = 
      (size1 * odds1 * probability1) + 
      (size2 * odds2 * probability2) - 
      (size1 * (1 - probability1)) - 
      (size2 * (1 - probability2));
    
    return { size1, size2, expectedProfit };
  }

  /**
   * Validate if a bet is worth taking based on Kelly
   */
  public static isBetWorthTaking(
    winProbability: number,
    odds: number,
    minKellyPercentage: number = 0.01 // Minimum 1% Kelly
  ): boolean {
    const kellyPercentage = this.calculateKelly(winProbability, odds);
    return kellyPercentage >= minKellyPercentage;
  }
}
