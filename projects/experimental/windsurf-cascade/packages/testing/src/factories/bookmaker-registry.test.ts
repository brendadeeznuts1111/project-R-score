// packages/testing/src/factories/bookmaker-registry.test.ts - Tests for bookmaker registry system

import { describe, it, expect, beforeEach } from 'bun:test';
import { BookmakerRegistry, BookmakerConfig, ExchangeMapping, SportType } from './bookmaker-registry';

describe('BookmakerRegistry', () => {
    let registry: BookmakerRegistry;

    beforeEach(() => {
        registry = BookmakerRegistry.getInstance();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = BookmakerRegistry.getInstance();
            const instance2 = BookmakerRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Default Bookmakers', () => {
        it('should have default bookmakers configured', () => {
            const bookmakers = registry.getAllBookmakers();
            expect(bookmakers.length).toBeGreaterThan(0);

            const draftkings = registry.getBookmaker('draftkings');
            expect(draftkings).toBeDefined();
            expect(draftkings?.name).toBe('DraftKings');
            expect(draftkings?.rotationScheme.prefix).toBe('DK');
        });

        it('should have supported sports for each bookmaker', () => {
            const draftkings = registry.getBookmaker('draftkings');
            expect(draftkings?.marketConvention.supportedSports).toContain('NBA');
            expect(draftkings?.marketConvention.supportedSports).toContain('NFL');
        });
    });

    describe('Exchange Mappings', () => {
        it('should map exchanges to bookmakers', () => {
            const draftkingsBookmaker = registry.getBookmakerByExchange('draftkings');
            expect(draftkingsBookmaker?.id).toBe('draftkings');

            const mgmBookmaker = registry.getBookmakerByExchange('mgm');
            expect(mgmBookmaker?.id).toBe('betmgm');
        });

        it('should return undefined for unknown exchanges', () => {
            const unknown = registry.getBookmakerByExchange('unknown-exchange');
            expect(unknown).toBeUndefined();
        });
    });

    describe('Rotation Number Generation', () => {
        it('should generate rotation numbers for known bookmakers', () => {
            const rotation1 = registry.generateRotationNumber('draftkings', 'NBA', 123);
            expect(rotation1).toMatch(/^DK\d{4}$/);
            expect(rotation1).toBe('DK2123'); // DK prefix + NBA range (2000-2999) + 123

            const rotation2 = registry.generateRotationNumber('fanduel', 'NFL', 456);
            expect(rotation2).toMatch(/^FD\d{4}$/);
            expect(rotation2).toBe('FD3456'); // FD prefix + NFL range (3000-3999) + 456
        });

        it('should use custom ranges when available', () => {
            const rotation = registry.generateRotationNumber('betmgm', 'NBA', 123);
            expect(rotation).toMatch(/^MGM\d{5}$/);
            expect(rotation).toBe('MGM12123'); // MGM prefix + custom NBA range (12000-12999) + 123
        });

        it('should return null for unknown bookmakers', () => {
            const rotation = registry.generateRotationNumber('unknown', 'NBA', 123);
            expect(rotation).toBeNull();
        });

        it('should handle separators correctly', () => {
            const rotation = registry.generateRotationNumber('pointsbet', 'NBA', 123);
            expect(rotation).toMatch(/^PB-\d{4}$/);
            expect(rotation).toBe('PB-2123');
        });
    });

    describe('Rotation Number Validation', () => {
        it('should validate correct rotation numbers', () => {
            expect(registry.validateRotationNumber('draftkings', 'DK2123')).toBe(true);
            expect(registry.validateRotationNumber('fanduel', 'FD3456')).toBe(true);
            expect(registry.validateRotationNumber('betmgm', 'MGM12123')).toBe(true);
            expect(registry.validateRotationNumber('pointsbet', 'PB-2123')).toBe(true);
        });

        it('should reject invalid rotation numbers', () => {
            expect(registry.validateRotationNumber('draftkings', 'FD2123')).toBe(false); // Wrong prefix
            expect(registry.validateRotationNumber('draftkings', 'DK212')).toBe(false);  // Wrong padding
            expect(registry.validateRotationNumber('draftkings', 'DK212a')).toBe(false); // Non-numeric
            expect(registry.validateRotationNumber('unknown', 'DK2123')).toBe(false);   // Unknown bookmaker
        });

        it('should reject numbers outside valid ranges', () => {
            // DK1999 falls in MLB range (1000-1999), so it should be valid
            expect(registry.validateRotationNumber('draftkings', 'DK15999')).toBe(false); // Outside all ranges
            expect(registry.validateRotationNumber('draftkings', 'DK999')).toBe(false); // Too short
            expect(registry.validateRotationNumber('draftkings', 'DK20000')).toBe(false); // Too high
        });
    });

    describe('Sport Detection from Rotation Numbers', () => {
        it('should detect sport from rotation number', () => {
            expect(registry.getSportFromRotationNumber('draftkings', 'DK2123')).toBe('NBA');
            expect(registry.getSportFromRotationNumber('draftkings', 'DK3456')).toBe('NFL');
            expect(registry.getSportFromRotationNumber('draftkings', 'DK4567')).toBe('NHL');
            expect(registry.getSportFromRotationNumber('draftkings', 'DK1234')).toBe('MLB');
        });

        it('should handle custom ranges', () => {
            expect(registry.getSportFromRotationNumber('betmgm', 'MGM12123')).toBe('NBA');
            expect(registry.getSportFromRotationNumber('betmgm', 'MGM13456')).toBe('NFL');
        });

        it('should return null for invalid rotation numbers', () => {
            expect(registry.getSportFromRotationNumber('draftkings', 'FD2123')).toBeNull();
            expect(registry.getSportFromRotationNumber('unknown', 'DK2123')).toBeNull();
        });
    });

    describe('Bookmaker Management', () => {
        it('should add new bookmakers', () => {
            const newBookmaker: BookmakerConfig = {
                id: 'test-bookmaker',
                name: 'Test Bookmaker',
                displayName: 'Test Sportsbook',
                rotationScheme: {
                    ranges: { NBA: [50000, 50999] },
                    prefix: 'TEST',
                    padding: 5
                },
                marketConvention: {
                    name: 'test-standard',
                    oddsFormat: 'american',
                    supportsLive: false,
                    supportedSports: ['NBA'],
                    marketTypes: ['moneyline']
                }
            };

            registry.addBookmaker(newBookmaker);

            const retrieved = registry.getBookmaker('test-bookmaker');
            expect(retrieved).toEqual(newBookmaker);
        });

        it('should add new exchange mappings', () => {
            const mapping: ExchangeMapping = {
                exchangeId: 'test-exchange',
                bookmakerId: 'draftkings',
                mappingType: 'transformed'
            };

            registry.addExchangeMapping(mapping);

            const bookmaker = registry.getBookmakerByExchange('test-exchange');
            expect(bookmaker?.id).toBe('draftkings');
        });
    });

    describe('Utility Methods', () => {
        it('should get bookmakers for specific sport', () => {
            const nbaBookmakers = registry.getBookmakersForSport('NBA');
            expect(nbaBookmakers.length).toBeGreaterThan(0);

            nbaBookmakers.forEach(bookmaker => {
                expect(bookmaker.marketConvention.supportedSports).toContain('NBA');
            });
        });

        it('should get all supported sports', () => {
            const sports = registry.getSupportedSports();
            expect(sports).toContain('NBA');
            expect(sports).toContain('NFL');
            expect(sports).toContain('NHL');
            expect(sports).toContain('MLB');
        });

        it('should get exchanges for bookmaker', () => {
            const exchanges = registry.getExchangesForBookmaker('betmgm');
            expect(exchanges).toContain('betmgm');
            expect(exchanges).toContain('mgm');
        });
    });

    describe('Rate Limits', () => {
        it('should have rate limits configured', () => {
            const draftkings = registry.getBookmaker('draftkings');
            expect(draftkings?.rateLimits).toBeDefined();
            expect(draftkings?.rateLimits?.requestsPerSecond).toBe(10);
            expect(draftkings?.rateLimits?.requestsPerMinute).toBe(600);
        });
    });
});
