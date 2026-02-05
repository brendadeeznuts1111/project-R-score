// packages/odds-core/src/examples/sharp-movement-demo.ts - Sharp movement detection demonstration

/**
 * Standalone demonstration of sharp movement detection
 * This focuses on the specific analytics you were viewing
 */

// Simple types for demonstration
interface SharpMovement {
    timestamp: Date;
    fromPrice: number;
    toPrice: number;
    sportsbook: string;
    significance: number;
    reason?: string;
}

interface PricePoint {
    timestamp: Date;
    price: number;
    sportsbook: string;
    marketType: string;
}

/**
 * Simple sharp movement detector
 */
class SharpMovementDetector {
    private sharpMovementThreshold = 0.02; // 2%
    private priceHistory: PricePoint[] = [];
    private sharpMovements: SharpMovement[] = [];

    addPricePoint(pricePoint: PricePoint): void {
        this.priceHistory.push(pricePoint);

        // Keep only last 100 points
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }

        this.detectSharpMovement(pricePoint);
    }

    private detectSharpMovement(newPricePoint: PricePoint): void {
        if (this.priceHistory.length < 2) return;

        const previousPrice = this.priceHistory[this.priceHistory.length - 2];
        if (!previousPrice) return;

        const priceChange = Math.abs(newPricePoint.price - previousPrice.price) / Math.abs(previousPrice.price);

        if (priceChange >= this.sharpMovementThreshold) {
            const sharpMovement: SharpMovement = {
                timestamp: new Date(),
                fromPrice: previousPrice.price,
                toPrice: newPricePoint.price,
                sportsbook: newPricePoint.sportsbook,
                significance: priceChange,
                reason: this.determineMovementReason(priceChange)
            };

            this.sharpMovements.push(sharpMovement);

            // Keep only last 50 movements
            if (this.sharpMovements.length > 50) {
                this.sharpMovements.shift();
            }
        }
    }

    private determineMovementReason(priceChange: number): string {
        if (priceChange > 0.1) return 'Major market movement';
        if (priceChange > 0.05) return 'Significant price adjustment';
        if (priceChange > 0.02) return 'Market correction';
        return 'Normal price fluctuation';
    }

    getSharpMovements(): SharpMovement[] {
        return [...this.sharpMovements];
    }

    getPriceHistoryLength(): number {
        return this.priceHistory.length;
    }
}

/**
 * Demonstrate sharp movement detection
 */
export class SharpMovementDemo {

    static demonstrateSharpMovementDetection(): void {
        console.log('⚡ Sharp Movement Detection Demo\n');

        const detector = new SharpMovementDetector();
        const sportsbook = 'draftkings';

        console.log(`📈 Simulating price updates for ${sportsbook}...`);
        console.log(`   Sharp movement threshold: 2%\n`);

        // Simulate price updates with sharp movements
        const priceUpdates = [
            { price: -110, time: '1:00:00 PM' },
            { price: -108, time: '1:00:30 PM' },
            { price: -105, time: '1:01:00 PM' },  // 2.8% change - SHARP!
            { price: -102, time: '1:01:30 PM' },  // 2.9% change - SHARP!
            { price: -100, time: '1:02:00 PM' },
            { price: -98, time: '1:02:30 PM' },
            { price: -95, time: '1:03:00 PM' },  // 3.1% change - SHARP!
            { price: -94, time: '1:03:30 PM' },
            { price: -92, time: '1:04:00 PM' },  // 2.1% change - SHARP!
            { price: -91, time: '1:04:30 PM' }
        ];

        priceUpdates.forEach((update, index) => {
            const pricePoint: PricePoint = {
                timestamp: new Date(),
                price: update.price,
                sportsbook,
                marketType: 'spread'
            };

            detector.addPricePoint(pricePoint);

            const previousPrice = priceUpdates[index - 1];
            const priceChange = index > 0 && previousPrice ?
                Math.abs(update.price - previousPrice.price) / Math.abs(previousPrice.price) * 100 : 0;

            if (priceChange >= 2.0) {
                console.log(`   ${index + 1}. ${update.time}: Price ${update.price} 🚨 SHARP MOVEMENT (${priceChange.toFixed(1)}% change)`);
            } else {
                console.log(`   ${index + 1}. ${update.time}: Price ${update.price} (${priceChange.toFixed(1)}% change)`);
            }
        });

        // Display results (this matches the section you were viewing)
        const sharpMovements = detector.getSharpMovements();

        console.log('\n📊 Detection Results:');
        console.log(`   Price History Points: ${detector.getPriceHistoryLength()}`);
        console.log(`   Sharp Movements Detected: ${sharpMovements.length}`);

        if (sharpMovements.length > 0) {
            console.log('\n⚡ Sharp Movements:');
            sharpMovements.forEach((movement, index) => {
                const priceChange = Math.abs(movement.toPrice - movement.fromPrice);
                const percentChange = (priceChange / Math.abs(movement.fromPrice)) * 100;
                console.log(`   ${index + 1}. ${movement.timestamp.toLocaleTimeString()}: ${movement.fromPrice} → ${movement.toPrice} (${movement.sportsbook})`);
                console.log(`      Price Change: ${percentChange.toFixed(1)}% | Significance: ${(movement.significance * 100).toFixed(1)}%`);
                console.log(`      Reason: ${movement.reason}`);
            });
        } else {
            console.log('\n⚡ No sharp movements detected (threshold: 2%)');
        }

        console.log('\n📈 Analytics Summary:');
        console.log(`   Total Price Updates: ${detector.getPriceHistoryLength()}`);
        console.log(`   Sharp Movement Rate: ${((sharpMovements.length / detector.getPriceHistoryLength()) * 100).toFixed(1)}%`);
        console.log(`   Average Significance: ${sharpMovements.length > 0 ? (sharpMovements.reduce((sum, m) => sum + m.significance, 0) / sharpMovements.length * 100).toFixed(1) : 0}%`);

        if (sharpMovements.length > 0) {
            const mostSignificant = sharpMovements.reduce((max, current) =>
                current.significance > max.significance ? current : max
            );
            console.log(`   Most Significant: ${mostSignificant.fromPrice} → ${mostSignificant.toPrice} (${(mostSignificant.significance * 100).toFixed(1)}%)`);
        }
    }

    static demonstrateDifferentThresholds(): void {
        console.log('\n🎯 Sharp Movement Threshold Comparison\n');

        const thresholds = [0.01, 0.02, 0.05, 0.1]; // 1%, 2%, 5%, 10%
        const priceUpdates = [-110, -108, -105, -102, -100, -98, -95, -92, -88, -85];

        console.log('Threshold\tMovements Detected\tDetection Rate\tSensitivity');
        console.log('---------\t------------------\t-------------\t----------');

        thresholds.forEach(threshold => {
            const detector = new SharpMovementDetector();
            (detector as any).sharpMovementThreshold = threshold; // Override threshold

            priceUpdates.forEach(price => {
                detector.addPricePoint({
                    timestamp: new Date(),
                    price,
                    sportsbook: 'draftkings',
                    marketType: 'spread'
                });
            });

            const movements = detector.getSharpMovements();
            const detectionRate = (movements.length / priceUpdates.length) * 100;
            const sensitivity = threshold < 0.02 ? 'High' : threshold < 0.05 ? 'Medium' : 'Low';

            console.log(`${(threshold * 100).toFixed(0)}%\t\t${movements.length}\t\t\t${detectionRate.toFixed(1)}%\t\t${sensitivity}`);
        });
    }

    static demonstrateRealTimeAlerts(): void {
        console.log('\n🚨 Real-Time Sharp Movement Alerts\n');

        const detector = new SharpMovementDetector();

        // Set up alert simulation
        console.log('📡 Simulating real-time price monitoring...\n');

        const priceSequence = [
            { price: -110, delay: 1000 },
            { price: -108, delay: 1000 },
            { price: -105, delay: 1000 },  // Will trigger alert
            { price: -102, delay: 1000 },  // Will trigger alert
            { price: -100, delay: 1000 },
            { price: -95, delay: 1000 }    // Will trigger alert
        ];

        let alertCount = 0;

        priceSequence.forEach(async (update, index) => {
            await new Promise(resolve => setTimeout(resolve, update.delay));

            const pricePoint: PricePoint = {
                timestamp: new Date(),
                price: update.price,
                sportsbook: 'draftkings',
                marketType: 'spread'
            };

            const previousMovements = detector.getSharpMovements().length;
            detector.addPricePoint(pricePoint);
            const newMovements = detector.getSharpMovements().length;

            if (newMovements > previousMovements) {
                alertCount++;
                const latestMovement = detector.getSharpMovements()[newMovements - 1];
                if (latestMovement) {
                    console.log(`🚨 ALERT ${alertCount}: Sharp movement detected!`);
                    console.log(`   ${latestMovement.fromPrice} → ${latestMovement.toPrice} (${(latestMovement.significance * 100).toFixed(1)}%)`);
                    console.log(`   Reason: ${latestMovement.reason}`);
                    console.log(`   Time: ${latestMovement.timestamp.toLocaleTimeString()}\n`);
                }
            } else {
                console.log(`📊 Update ${index + 1}: Price ${update.price} - No alert`);
            }
        });

        // Wait for all updates to complete
        setTimeout(() => {
            console.log(`✅ Monitoring complete. Generated ${alertCount} sharp movement alerts.`);
        }, priceSequence.reduce((sum, update) => sum + update.delay, 0) + 500);
    }

    static runAllDemos(): void {
        console.log('🚀 Sharp Movement Detection Demonstration\n');
        console.log('This demonstrates the analytics capabilities you were viewing.\n');
        console.log('='.repeat(80));

        // Basic sharp movement detection
        this.demonstrateSharpMovementDetection();

        console.log('='.repeat(80));

        // Threshold comparison
        this.demonstrateDifferentThresholds();

        console.log('='.repeat(80));

        // Real-time alerts
        this.demonstrateRealTimeAlerts();

        setTimeout(() => {
            console.log('\n✅ All sharp movement demonstrations completed!');
            console.log('\n🎯 Key Capabilities Demonstrated:');
            console.log('   • Real-time sharp movement detection');
            console.log('   • Configurable threshold sensitivity');
            console.log('   • Automatic alert generation');
            console.log('   • Movement significance calculation');
            console.log('   • Price change reason classification');
            console.log('   • Historical movement tracking');
            console.log('   • Analytics and reporting');
        }, 8000);
    }
}

// Run the demonstration if this file is executed directly
if (import.meta.main) {
    SharpMovementDemo.runAllDemos();
}

export default SharpMovementDemo;
