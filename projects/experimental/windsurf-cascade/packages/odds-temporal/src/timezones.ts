import { Temporal } from '@js-temporal/polyfill';

export class TimezoneManager {
  private supportedTimezones: string[] = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Australia/Sydney',
    'UTC'
  ];

  public convertTimestamp(
    timestamp: number,
    fromTimezone: string,
    toTimezone: string
  ): { timestamp: number; localTime: string } {
    try {
      const fromDateTime = Temporal.Instant.fromEpochMilliseconds(timestamp)
        .toTimeZone(fromTimezone);
      
      const toDateTime = fromDateTime.toTimeZone(toTimezone);
      
      return {
        timestamp: toDateTime.toInstant().epochMilliseconds,
        localTime: toDateTime.toString()
      };
    } catch (error) {
      throw new Error(`Timezone conversion failed: ${error}`);
    }
  }

  public getLocalTime(timestamp: number, timezone: string): string {
    try {
      const dateTime = Temporal.Instant.fromEpochMilliseconds(timestamp)
        .toTimeZone(timezone);
      return dateTime.toString();
    } catch (error) {
      throw new Error(`Failed to get local time: ${error}`);
    }
  }

  public isTimezoneSupported(timezone: string): boolean {
    return this.supportedTimezones.includes(timezone);
  }

  public getSupportedTimezones(): string[] {
    return [...this.supportedTimezones];
  }

  public getMarketTimezone(market: string): string {
    const marketTimezones: Record<string, string> = {
      'US': 'America/New_York',
      'NYSE': 'America/New_York',
      'NASDAQ': 'America/New_York',
      'UK': 'Europe/London',
      'LSE': 'Europe/London',
      'JP': 'Asia/Tokyo',
      'TSE': 'Asia/Tokyo',
      'HK': 'Asia/Hong_Kong',
      'HKEX': 'Asia/Hong_Kong',
      'CN': 'Asia/Shanghai',
      'SSE': 'Asia/Shanghai',
      'AU': 'Australia/Sydney',
      'ASX': 'Australia/Sydney'
    };

    return marketTimezones[market.toUpperCase()] || 'UTC';
  }

  public getMarketOpenTimeUTC(
    market: string,
    localOpenTime: string,
    timezone?: string
  ): number {
    const tz = timezone || this.getMarketTimezone(market);
    
    try {
      const now = Temporal.Now.plainDateTimeISO(tz);
      const openDateTime = new Temporal.PlainDateTime(
        now.year,
        now.month,
        now.day,
        ...localOpenTime.split(':').map(Number)
      ).toTimeZone(tz);
      
      return openDateTime.toInstant().epochMilliseconds;
    } catch (error) {
      throw new Error(`Failed to calculate market open time: ${error}`);
    }
  }

  public getOffsetFromUTC(timezone: string): number {
    try {
      const now = Temporal.Now.plainDateTimeISO(timezone);
      const utc = Temporal.Now.plainDateTimeISO('UTC');
      
      const nowInstant = now.toInstant();
      const utcInstant = utc.toInstant();
      
      return (nowInstant.epochMilliseconds - utcInstant.epochMilliseconds) / (1000 * 60 * 60);
    } catch (error) {
      throw new Error(`Failed to get UTC offset: ${error}`);
    }
  }

  public isDSTActive(timezone: string, timestamp?: number): boolean {
    try {
      const instant = timestamp 
        ? Temporal.Instant.fromEpochMilliseconds(timestamp)
        : Temporal.Now.instant();
      
      const dateTime = instant.toTimeZone(timezone);
      const offset = dateTime.offset;
      
      // Simple DST detection - offsets ending in 01, 02, etc. typically indicate DST
      return offset.includes(':') && parseInt(offset.split(':')[1]) !== 0;
    } catch (error) {
      throw new Error(`Failed to check DST status: ${error}`);
    }
  }

  public formatTimeForMarket(
    timestamp: number,
    market: string,
    format: 'ISO' | 'local' | 'market' = 'local'
  ): string {
    const timezone = this.getMarketTimezone(market);
    const dateTime = Temporal.Instant.fromEpochMilliseconds(timestamp)
      .toTimeZone(timezone);

    switch (format) {
      case 'ISO':
        return dateTime.toString();
      case 'local':
        return dateTime.toPlainTime().toString();
      case 'market':
        return `${dateTime.toPlainDate()} ${dateTime.toPlainTime()} ${timezone}`;
      default:
        return dateTime.toString();
    }
  }

  public addBusinessDays(
    timestamp: number,
    days: number,
    timezone: string = 'America/New_York'
  ): number {
    try {
      let dateTime = Temporal.Instant.fromEpochMilliseconds(timestamp)
        .toTimeZone(timezone);
      
      let remainingDays = Math.abs(days);
      const direction = days >= 0 ? 1 : -1;
      
      while (remainingDays > 0) {
        dateTime = dateTime.add({ days: direction });
        
        // Skip weekends (Saturday = 6, Sunday = 7)
        if (dateTime.dayOfWeek <= 5) {
          remainingDays--;
        }
      }
      
      return dateTime.toInstant().epochMilliseconds;
    } catch (error) {
      throw new Error(`Failed to add business days: ${error}`);
    }
  }
}
