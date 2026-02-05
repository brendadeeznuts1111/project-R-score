// packages/testing/src/factories/daily-pnl-tracker.ts - Daily P&L tracking with UTC midnight rollover

export class DailyPnlTracker {
    private dailyLoss = 0;
    private lastRollover = new Date().toISOString().split('T')[0];
    private config: any; // CircuitBreakerConfig

    constructor(config: any) {
        this.config = config;
    }

    recordPnl(opportunityId: string, pnl: number): void {
        const today = new Date().toISOString().split('T')[0];

        // Reset at midnight UTC
        if (today !== this.lastRollover) {
            console.log(`Daily P&L rollover: ${this.lastRollover} -> ${today}, previous loss: ${this.dailyLoss}`);
            this.dailyLoss = 0;
            this.lastRollover = today;
        }

        this.dailyLoss += pnl;

        // Log significant P&L changes
        if (Math.abs(pnl) > 100) {
            console.log(`Significant P&L recorded: ${opportunityId} = $${pnl.toFixed(2)}, daily total: $${this.dailyLoss.toFixed(2)}`);
        }
    }

    isWithinLimits(config?: any): boolean {
        const currentConfig = config || this.config;
        return Math.abs(this.dailyLoss) < currentConfig.maxDailyLoss;
    }

    getTripReason(): string {
        return `max_daily_loss:${Math.abs(this.dailyLoss)}/${this.config.maxDailyLoss}`;
    }

    getDailyPnL(): number {
        return this.dailyLoss;
    }

    getRemainingLimit(): number {
        return this.config.maxDailyLoss - Math.abs(this.dailyLoss);
    }

    getUtilization(): number {
        return (Math.abs(this.dailyLoss) / this.config.maxDailyLoss) * 100;
    }

    // For monitoring and alerting
    getStatus(): {
        dailyPnL: number;
        utilization: number;
        remaining: number;
        isWithinLimits: boolean;
        lastRollover: string;
    } {
        return {
            dailyPnL: this.dailyLoss,
            utilization: this.getUtilization(),
            remaining: this.getRemainingLimit(),
            isWithinLimits: this.isWithinLimits(),
            lastRollover: this.lastRollover
        };
    }

    // Manual reset for testing or emergency situations
    reset(): void {
        this.dailyLoss = 0;
        this.lastRollover = new Date().toISOString().split('T')[0];
        console.log('Daily P&L tracker manually reset');
    }
}
