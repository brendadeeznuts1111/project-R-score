// Drift monitoring for consciousness metrics
const MAX_READINGS = 100;

export class DriftMonitor {
    private readings: number[] = [];
    private maxReadings = MAX_READINGS;

    addReading(reading: number): void {
        this.readings.push(reading);
        if (this.readings.length > this.maxReadings) {
            this.readings.shift();
        }
    }

    getRunningAverage(): number {
        if (this.readings.length === 0) return 0;
        return this.readings.reduce((sum, val) => sum + val, 0) / this.readings.length;
    }

    getCurrentDrift(): number {
        return this.readings[this.readings.length - 1] || 0;
    }

    reset(): void {
        this.readings = [];
    }
}

export const driftMonitor = new DriftMonitor();
