import { Temporal } from '@js-temporal/polyfill';
import type { MarketHours } from 'odds-core';

export class MarketHoursManager {
  private marketHours: Map<string, MarketHours> = new Map();
  private timezone: string = 'America/New_York';

  constructor(timezone: string = 'America/New_York') {
    this.timezone = timezone;
    this.initializeDefaultMarkets();
  }

  private initializeDefaultMarkets(): void {
    // NYSE/NASDAQ hours
    this.setMarketHours('US', {
      open: '09:30:00',
      close: '16:00:00',
      timezone: 'America/New_York',
      days: [1, 2, 3, 4, 5] // Monday-Friday
    });

    // London hours
    this.setMarketHours('UK', {
      open: '08:00:00',
      close: '16:30:00',
      timezone: 'Europe/London',
      days: [1, 2, 3, 4, 5]
    });

    // Tokyo hours
    this.setMarketHours('JP', {
      open: '09:00:00',
      close: '15:00:00',
      timezone: 'Asia/Tokyo',
      days: [1, 2, 3, 4, 5]
    });
  }

  public setMarketHours(market: string, hours: MarketHours): void {
    this.marketHours.set(market, hours);
  }

  public isMarketOpen(market: string = 'US', timestamp: number = Date.now()): boolean {
    const hours = this.marketHours.get(market);
    if (!hours) return false;

    const date = new Temporal.PlainDateTime(
      ...new Date(timestamp).toISOString().split('T')[0].split('-').map(Number),
      ...hours.open.split(':').map(Number)
    ).toTimeZone(hours.timezone);

    const closeTime = new Temporal.PlainDateTime(
      ...new Date(timestamp).toISOString().split('T')[0].split('-').map(Number),
      ...hours.close.split(':').map(Number)
    ).toTimeZone(hours.timezone);

    const current = Temporal.Now.plainDateTimeISO(hours.timezone);
    const currentDay = current.dayOfWeek;
    
    return hours.days.includes(currentDay) && 
           Temporal.PlainTime.compare(current.toPlainTime(), date.toPlainTime()) >= 0 &&
           Temporal.PlainTime.compare(current.toPlainTime(), closeTime.toPlainTime()) < 0;
  }

  public getNextMarketOpen(market: string = 'US', timestamp: number = Date.now()): number {
    const hours = this.marketHours.get(market);
    if (!hours) return 0;

    const current = new Temporal.PlainDateTime(
      ...new Date(timestamp).toISOString().split('T')[0].split('-').map(Number),
      ...new Date(timestamp).toISOString().split('T')[1].split('.')[0].split(':').map(Number)
    ).toTimeZone(hours.timezone);

    let nextOpen = new Temporal.PlainDateTime(
      current.year,
      current.month,
      current.day,
      ...hours.open.split(':').map(Number)
    ).toTimeZone(hours.timezone);

    // If today's market has already closed, move to next day
    if (Temporal.PlainTime.compare(current.toPlainTime(), nextOpen.toPlainTime()) > 0) {
      nextOpen = nextOpen.add({ days: 1 });
    }

    // Find next valid market day
    while (!hours.days.includes(nextOpen.dayOfWeek)) {
      nextOpen = nextOpen.add({ days: 1 });
    }

    // Convert back to timestamp
    const instant = nextOpen.toTimeZone('UTC').toInstant();
    return instant.epochMilliseconds;
  }

  public getNextMarketClose(market: string = 'US', timestamp: number = Date.now()): number {
    const hours = this.marketHours.get(market);
    if (!hours) return 0;

    const current = new Temporal.PlainDateTime(
      ...new Date(timestamp).toISOString().split('T')[0].split('-').map(Number),
      ...new Date(timestamp).toISOString().split('T')[1].split('.')[0].split(':').map(Number)
    ).toTimeZone(hours.timezone);

    let nextClose = new Temporal.PlainDateTime(
      current.year,
      current.month,
      current.day,
      ...hours.close.split(':').map(Number)
    ).toTimeZone(hours.timezone);

    // If today's market has already closed, move to next day
    if (Temporal.PlainTime.compare(current.toPlainTime(), nextClose.toPlainTime()) > 0) {
      nextClose = nextClose.add({ days: 1 });
    }

    // Find next valid market day
    while (!hours.days.includes(nextClose.dayOfWeek)) {
      nextClose = nextClose.add({ days: 1 });
    }

    // Convert back to timestamp
    const instant = nextClose.toTimeZone('UTC').toInstant();
    return instant.epochMilliseconds;
  }

  public getTimeUntilMarketOpen(market: string = 'US', timestamp: number = Date.now()): number {
    return this.getNextMarketOpen(market, timestamp) - timestamp;
  }

  public getTimeUntilMarketClose(market: string = 'US', timestamp: number = Date.now()): number {
    return this.getNextMarketClose(market, timestamp) - timestamp;
  }

  public getMarketHours(market: string): MarketHours | undefined {
    return this.marketHours.get(market);
  }

  public getAllMarkets(): string[] {
    return Array.from(this.marketHours.keys());
  }

  public getOpenMarkets(timestamp: number = Date.now()): string[] {
    return this.getAllMarkets().filter(market => this.isMarketOpen(market, timestamp));
  }
}
