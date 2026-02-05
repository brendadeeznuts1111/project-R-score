// packages/testing/src/factories/daily-pnl-tracker.test.ts - Tests for daily P&L tracking with UTC midnight rollover

import { test, describe, expect, beforeEach } from 'bun:test';
import { DailyPnlTracker } from './daily-pnl-tracker';

describe('DailyPnlTracker - UTC Midnight Rollover', () => {
    let config: any;
    let tracker: DailyPnlTracker;

    beforeEach(() => {
        config = {
            maxDailyLoss: 10000
        };
        tracker = new DailyPnlTracker(config);
    });

    describe('Basic P&L Recording', () => {
        test('records P&L for opportunities', () => {
            tracker.recordPnl('opp-1', 500);
            tracker.recordPnl('opp-2', -300);

            const status = tracker.getStatus();
            expect(status.dailyPnL).toBe(200);
            expect(status.isWithinLimits).toBe(true);
        });

        test('accumulates losses correctly', () => {
            tracker.recordPnl('opp-1', -2000);
            tracker.recordPnl('opp-2', -3000);
            tracker.recordPnl('opp-3', -1000);

            expect(tracker.getDailyPnL()).toBe(-6000);
            expect(tracker.getRemainingLimit()).toBe(4000);
            expect(tracker.getUtilization()).toBe(60);
        });

        test('handles profits correctly', () => {
            tracker.recordPnl('opp-1', 2000);
            tracker.recordPnl('opp-2', 3000);

            expect(tracker.getDailyPnL()).toBe(5000);
            expect(tracker.isWithinLimits()).toBe(true);
        });
    });

    describe('Daily Loss Limits', () => {
        test('detects when daily loss limit is breached', () => {
            // Record losses up to the limit
            tracker.recordPnl('opp-1', -8000);
            expect(tracker.isWithinLimits()).toBe(true);

            // Breach the limit
            tracker.recordPnl('opp-2', -3000);
            expect(tracker.isWithinLimits()).toBe(false);
            expect(tracker.getTripReason()).toBe('max_daily_loss:11000/10000');
        });

        test('utilization calculation is accurate', () => {
            tracker.recordPnl('opp-1', -2500);
            expect(tracker.getUtilization()).toBe(25);

            tracker.recordPnl('opp-2', -2500);
            expect(tracker.getUtilization()).toBe(50);

            tracker.recordPnl('opp-3', -5000);
            expect(tracker.getUtilization()).toBe(100);
        });

        test('remaining limit calculation is accurate', () => {
            expect(tracker.getRemainingLimit()).toBe(10000);

            tracker.recordPnl('opp-1', -3000);
            expect(tracker.getRemainingLimit()).toBe(7000);

            tracker.recordPnl('opp-2', -2000);
            expect(tracker.getRemainingLimit()).toBe(5000);
        });
    });

    describe('UTC Midnight Rollover', () => {
        test('resets at UTC midnight (simulated)', () => {
            // Record some P&L
            tracker.recordPnl('opp-1', -5000);
            expect(tracker.getDailyPnL()).toBe(-5000);

            // Simulate midnight rollover by manipulating the date
            const originalDate = Date.now;
            const mockDate = () => {
                // Return a time that represents next day UTC
                const now = new Date();
                now.setUTCDate(now.getUTCDate() + 1);
                now.setUTCHours(0, 0, 0, 0);
                return now.getTime();
            };

            // Override Date.now for the test
            global.Date.now = mockDate;

            try {
                // Record new P&L should trigger rollover
                tracker.recordPnl('opp-2', -1000);

                // Should have reset and started fresh
                expect(tracker.getDailyPnL()).toBe(-1000);
                expect(tracker.getUtilization()).toBe(10);
            } finally {
                // Restore original Date.now
                global.Date.now = originalDate;
            }
        });

        test('maintains correct last rollover date', () => {
            const originalDate = Date.now;
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];

            // Mock Date.now to return consistent time
            global.Date.now = () => today.getTime();

            try {
                tracker.recordPnl('opp-1', -1000);
                expect(tracker.getStatus().lastRollover).toBe(todayString);

                // Simulate next day
                const tomorrow = new Date(today);
                tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
                global.Date.now = () => tomorrow.getTime();

                tracker.recordPnl('opp-2', -2000);

                const status = tracker.getStatus();
                expect(status.lastRollover).toBe(tomorrow.toISOString().split('T')[0]);
                expect(status.dailyPnL).toBe(-2000); // Reset to new day's P&L
            } finally {
                global.Date.now = originalDate;
            }
        });
    });

    describe('Status Reporting', () => {
        test('provides comprehensive status information', () => {
            tracker.recordPnl('opp-1', -3000);

            const status = tracker.getStatus();

            expect(status).toHaveProperty('dailyPnL');
            expect(status).toHaveProperty('utilization');
            expect(status).toHaveProperty('remaining');
            expect(status).toHaveProperty('isWithinLimits');
            expect(status).toHaveProperty('lastRollover');

            expect(status.dailyPnL).toBe(-3000);
            expect(status.utilization).toBe(30);
            expect(status.remaining).toBe(7000);
            expect(status.isWithinLimits).toBe(true);
        });

        test('status reflects limit breach correctly', () => {
            tracker.recordPnl('opp-1', -12000);

            const status = tracker.getStatus();

            expect(status.isWithinLimits).toBe(false);
            expect(status.utilization).toBeGreaterThan(100);
            expect(status.remaining).toBeLessThan(0);
        });
    });

    describe('Configuration', () => {
        test('uses provided configuration correctly', () => {
            const customConfig = { maxDailyLoss: 5000 };
            const customTracker = new DailyPnlTracker(customConfig);

            customTracker.recordPnl('opp-1', -3000);
            expect(customTracker.isWithinLimits()).toBe(true);

            customTracker.recordPnl('opp-2', -3000);
            expect(customTracker.isWithinLimits()).toBe(false);
            expect(customTracker.getTripReason()).toBe('max_daily_loss:6000/5000');
        });

        test('accepts runtime configuration override', () => {
            tracker.recordPnl('opp-1', -8000);

            // Should be within limits with default config
            expect(tracker.isWithinLimits()).toBe(true);

            // Override with stricter limit
            expect(tracker.isWithinLimits({ maxDailyLoss: 5000 })).toBe(false);
        });
    });

    describe('Manual Operations', () => {
        test('manual reset functionality', () => {
            tracker.recordPnl('opp-1', -8000);
            tracker.recordPnl('opp-2', -1000);

            expect(tracker.getDailyPnL()).toBe(-9000);

            tracker.reset();

            expect(tracker.getDailyPnL()).toBe(0);
            expect(tracker.getUtilization()).toBe(0);
            expect(tracker.getRemainingLimit()).toBe(10000);
            expect(tracker.isWithinLimits()).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('handles zero P&L correctly', () => {
            tracker.recordPnl('opp-1', 0);

            const status = tracker.getStatus();
            expect(status.dailyPnL).toBe(0);
            expect(status.utilization).toBe(0);
            expect(status.isWithinLimits).toBe(true);
        });

        test('handles very large P&L values', () => {
            tracker.recordPnl('opp-1', 999999);
            tracker.recordPnl('opp-2', -999999);

            expect(tracker.getDailyPnL()).toBe(0);
            expect(tracker.isWithinLimits()).toBe(true);
        });

        test('handles fractional P&L values', () => {
            tracker.recordPnl('opp-1', 123.45);
            tracker.recordPnl('opp-2', -67.89);

            expect(tracker.getDailyPnL()).toBeCloseTo(55.56, 2);
        });

        test('prevents division by zero in utilization calculation', () => {
            const zeroLimitTracker = new DailyPnlTracker({ maxDailyLoss: 0 });

            zeroLimitTracker.recordPnl('opp-1', -100);

            expect(zeroLimitTracker.getUtilization()).toBe(Infinity);
            expect(zeroLimitTracker.isWithinLimits()).toBe(false);
        });
    });

    describe('Integration Behavior', () => {
        test('behaves correctly under typical trading day scenarios', () => {
            // Morning trading
            tracker.recordPnl('morning-1', 1500);
            tracker.recordPnl('morning-2', -800);
            tracker.recordPnl('morning-3', 2000);

            expect(tracker.getDailyPnL()).toBe(2700);
            expect(tracker.isWithinLimits()).toBe(true);

            // Afternoon losses
            tracker.recordPnl('afternoon-1', -3000);
            tracker.recordPnl('afternoon-2', -1500);
            tracker.recordPnl('afternoon-3', -2000);

            expect(tracker.getDailyPnL()).toBe(-3800);
            expect(tracker.isWithinLimits()).toBe(true);
            expect(tracker.getUtilization()).toBe(38);

            // End of day breach
            tracker.recordPnl('end-day-1', -7000);

            expect(tracker.isWithinLimits()).toBe(false);
            expect(tracker.getTripReason()).toBe('max_daily_loss:10800/10000');
        });
    });
});
