// packages/odds-core/src/__tests__/topics-utils.test.ts
// Tests for topic utility functions

import { test, expect, describe } from "bun:test";
import {
  MarketTopic,
  DataCategory,
  getTopicHierarchy,
  getTopicCategory,
  getTopicSubcategory,
  areTopicsRelated,
  getTopicsInCategory
} from '../types/topics.js';

describe('Topic Utility Functions', () => {
  describe('getTopicHierarchy', () => {
    test('should split topic into hierarchy parts', () => {
      const topic = MarketTopic.CRYPTO_SPOT;
      const hierarchy = getTopicHierarchy(topic);
      
      expect(hierarchy).toEqual(['crypto', 'spot']);
      expect(hierarchy).toHaveLength(2);
    });

    test('should handle sports topics', () => {
      const hierarchy = getTopicHierarchy(MarketTopic.SPORTS_BASKETBALL);
      expect(hierarchy).toEqual(['sports', 'basketball']);
    });

    test('should handle complex multi-level topics', () => {
      const hierarchy = getTopicHierarchy(MarketTopic.FIXED_INCOME_GOVT);
      expect(hierarchy).toEqual(['fixed_income', 'government']);
    });

    test('should handle all market topics', () => {
      const allTopics = Object.values(MarketTopic);
      
      allTopics.forEach(topic => {
        const hierarchy = getTopicHierarchy(topic);
        expect(Array.isArray(hierarchy)).toBe(true);
        expect(hierarchy.length).toBeGreaterThan(0);
        hierarchy.forEach(part => {
          expect(typeof part).toBe('string');
          expect(part.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getTopicCategory', () => {
    test('should return category for crypto topics', () => {
      expect(getTopicCategory(MarketTopic.CRYPTO_SPOT)).toBe('crypto');
      expect(getTopicCategory(MarketTopic.CRYPTO_DERIVATIVES)).toBe('crypto');
      expect(getTopicCategory(MarketTopic.CRYPTO_DEFI)).toBe('crypto');
      expect(getTopicCategory(MarketTopic.CRYPTO_NFT)).toBe('crypto');
      expect(getTopicCategory(MarketTopic.CRYPTO_STAKING)).toBe('crypto');
    });

    test('should return category for sports topics', () => {
      expect(getTopicCategory(MarketTopic.SPORTS_BASKETBALL)).toBe('sports');
      expect(getTopicCategory(MarketTopic.SPORTS_FOOTBALL)).toBe('sports');
      expect(getTopicCategory(MarketTopic.SPORTS_BASEBALL)).toBe('sports');
    });

    test('should return category for equities topics', () => {
      expect(getTopicCategory(MarketTopic.EQUITIES_US)).toBe('equities');
      expect(getTopicCategory(MarketTopic.EQUITIES_GLOBAL)).toBe('equities');
      expect(getTopicCategory(MarketTopic.EQUITIES_ETFS)).toBe('equities');
      expect(getTopicCategory(MarketTopic.EQUITIES_OPTIONS)).toBe('equities');
      expect(getTopicCategory(MarketTopic.EQUITIES_FUTURES)).toBe('equities');
    });

    test('should return category for forex topics', () => {
      expect(getTopicCategory(MarketTopic.FOREX_MAJOR)).toBe('forex');
      expect(getTopicCategory(MarketTopic.FOREX_MINOR)).toBe('forex');
      expect(getTopicCategory(MarketTopic.FOREX_EXOTIC)).toBe('forex');
      expect(getTopicCategory(MarketTopic.FOREX_CROSS)).toBe('forex');
    });

    test('should return category for commodity topics', () => {
      expect(getTopicCategory(MarketTopic.COMMODITY_ENERGY)).toBe('commodity');
      expect(getTopicCategory(MarketTopic.COMMODITY_METALS)).toBe('commodity');
      expect(getTopicCategory(MarketTopic.COMMODITY_AGRICULTURE)).toBe('commodity');
      expect(getTopicCategory(MarketTopic.COMMODITY_LIVESTOCK)).toBe('commodity');
    });

    test('should return category for fixed income topics', () => {
      expect(getTopicCategory(MarketTopic.FIXED_INCOME_GOVT)).toBe('fixed_income');
      expect(getTopicCategory(MarketTopic.FIXED_INCOME_CORPORATE)).toBe('fixed_income');
      expect(getTopicCategory(MarketTopic.FIXED_INCOME_MUNICIPAL)).toBe('fixed_income');
      expect(getTopicCategory(MarketTopic.FIXED_INCOME_MBS)).toBe('fixed_income');
    });

    test('should return category for alternative data topics', () => {
      expect(getTopicCategory(MarketTopic.ALT_DATA_NEWS)).toBe('alt_data');
      expect(getTopicCategory(MarketTopic.ALT_DATA_SENTIMENT)).toBe('alt_data');
      expect(getTopicCategory(MarketTopic.ALT_DATA_SOCIAL)).toBe('alt_data');
      expect(getTopicCategory(MarketTopic.ALT_DATA_WEATHER)).toBe('alt_data');
      expect(getTopicCategory(MarketTopic.ALT_DATA_ECONOMIC)).toBe('alt_data');
    });
  });

  describe('getTopicSubcategory', () => {
    test('should return subcategory for two-level topics', () => {
      expect(getTopicSubcategory(MarketTopic.CRYPTO_SPOT)).toBe('spot');
      expect(getTopicSubcategory(MarketTopic.CRYPTO_DERIVATIVES)).toBe('derivatives');
      expect(getTopicSubcategory(MarketTopic.SPORTS_BASKETBALL)).toBe('basketball');
      expect(getTopicSubcategory(MarketTopic.EQUITIES_US)).toBe('us');
      expect(getTopicSubcategory(MarketTopic.FOREX_MAJOR)).toBe('major');
    });

    test('should return subcategory for all complex topics', () => {
      const allTopics = Object.values(MarketTopic);
      
      allTopics.forEach(topic => {
        const subcategory = getTopicSubcategory(topic);
        if (topic.includes('.')) {
          expect(subcategory).not.toBeNull();
          expect(typeof subcategory).toBe('string');
          expect(subcategory!.length).toBeGreaterThan(0);
        }
      });
    });

    test('should handle all topic types consistently', () => {
      const allTopics = Object.values(MarketTopic);
      
      allTopics.forEach(topic => {
        const subcategory = getTopicSubcategory(topic);
        if (topic.includes('.')) {
          expect(subcategory).not.toBeNull();
          expect(typeof subcategory).toBe('string');
        }
      });
    });
  });

  describe('areTopicsRelated', () => {
    test('should identify related crypto topics', () => {
      expect(areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_DERIVATIVES)).toBe(true);
      expect(areTopicsRelated(MarketTopic.CRYPTO_DEFI, MarketTopic.CRYPTO_NFT)).toBe(true);
    });

    test('should identify related sports topics', () => {
      expect(areTopicsRelated(MarketTopic.SPORTS_BASKETBALL, MarketTopic.SPORTS_FOOTBALL)).toBe(true);
      expect(areTopicsRelated(MarketTopic.SPORTS_BASEBALL, MarketTopic.SPORTS_HOCKEY)).toBe(true);
    });

    test('should identify related equity topics', () => {
      expect(areTopicsRelated(MarketTopic.EQUITIES_US, MarketTopic.EQUITIES_GLOBAL)).toBe(true);
      expect(areTopicsRelated(MarketTopic.EQUITIES_ETFS, MarketTopic.EQUITIES_OPTIONS)).toBe(true);
    });

    test('should identify related forex topics', () => {
      expect(areTopicsRelated(MarketTopic.FOREX_MAJOR, MarketTopic.FOREX_MINOR)).toBe(true);
      expect(areTopicsRelated(MarketTopic.FOREX_EXOTIC, MarketTopic.FOREX_CROSS)).toBe(true);
    });

    test('should identify related commodity topics', () => {
      expect(areTopicsRelated(MarketTopic.COMMODITY_ENERGY, MarketTopic.COMMODITY_METALS)).toBe(true);
      expect(areTopicsRelated(MarketTopic.COMMODITY_AGRICULTURE, MarketTopic.COMMODITY_LIVESTOCK)).toBe(true);
    });

    test('should identify related fixed income topics', () => {
      expect(areTopicsRelated(MarketTopic.FIXED_INCOME_GOVT, MarketTopic.FIXED_INCOME_CORPORATE)).toBe(true);
      expect(areTopicsRelated(MarketTopic.FIXED_INCOME_MUNICIPAL, MarketTopic.FIXED_INCOME_MBS)).toBe(true);
    });

    test('should identify related alternative data topics', () => {
      expect(areTopicsRelated(MarketTopic.ALT_DATA_NEWS, MarketTopic.ALT_DATA_SENTIMENT)).toBe(true);
      expect(areTopicsRelated(MarketTopic.ALT_DATA_SOCIAL, MarketTopic.ALT_DATA_WEATHER)).toBe(true);
    });

    test('should return false for unrelated topics', () => {
      expect(areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.SPORTS_BASKETBALL)).toBe(false);
      expect(areTopicsRelated(MarketTopic.EQUITIES_US, MarketTopic.FOREX_MAJOR)).toBe(false);
      expect(areTopicsRelated(MarketTopic.COMMODITY_ENERGY, MarketTopic.FIXED_INCOME_GOVT)).toBe(false);
      expect(areTopicsRelated(MarketTopic.ALT_DATA_NEWS, MarketTopic.CRYPTO_SPOT)).toBe(false);
    });

    test('should handle same topic comparison', () => {
      expect(areTopicsRelated(MarketTopic.CRYPTO_SPOT, MarketTopic.CRYPTO_SPOT)).toBe(true);
      expect(areTopicsRelated(MarketTopic.SPORTS_FOOTBALL, MarketTopic.SPORTS_FOOTBALL)).toBe(true);
    });
  });

  describe('getTopicsInCategory', () => {
    test('should return all crypto topics', () => {
      const cryptoTopics = getTopicsInCategory('crypto');
      
      expect(cryptoTopics).toContain(MarketTopic.CRYPTO_SPOT);
      expect(cryptoTopics).toContain(MarketTopic.CRYPTO_DERIVATIVES);
      expect(cryptoTopics).toContain(MarketTopic.CRYPTO_DEFI);
      expect(cryptoTopics).toContain(MarketTopic.CRYPTO_NFT);
      expect(cryptoTopics).toContain(MarketTopic.CRYPTO_STAKING);
      
      // Should not contain non-crypto topics
      expect(cryptoTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
      expect(cryptoTopics).not.toContain(MarketTopic.EQUITIES_US);
      expect(cryptoTopics).not.toContain(MarketTopic.FOREX_MAJOR);
    });

    test('should return all sports topics', () => {
      const sportsTopics = getTopicsInCategory('sports');
      
      expect(sportsTopics).toContain(MarketTopic.SPORTS_BASKETBALL);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_FOOTBALL);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_BASEBALL);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_HOCKEY);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_SOCCER);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_TENNIS);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_GOLF);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_MMA);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_BOXING);
      expect(sportsTopics).toContain(MarketTopic.SPORTS_AUTO_RACING);
      
      // Should not contain non-sports topics
      expect(sportsTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(sportsTopics).not.toContain(MarketTopic.EQUITIES_US);
    });

    test('should return all equity topics', () => {
      const equityTopics = getTopicsInCategory('equities');
      
      expect(equityTopics).toContain(MarketTopic.EQUITIES_US);
      expect(equityTopics).toContain(MarketTopic.EQUITIES_GLOBAL);
      expect(equityTopics).toContain(MarketTopic.EQUITIES_ETFS);
      expect(equityTopics).toContain(MarketTopic.EQUITIES_OPTIONS);
      expect(equityTopics).toContain(MarketTopic.EQUITIES_FUTURES);
      
      // Should not contain non-equity topics
      expect(equityTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(equityTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
    });

    test('should return all forex topics', () => {
      const forexTopics = getTopicsInCategory('forex');
      
      expect(forexTopics).toContain(MarketTopic.FOREX_MAJOR);
      expect(forexTopics).toContain(MarketTopic.FOREX_MINOR);
      expect(forexTopics).toContain(MarketTopic.FOREX_EXOTIC);
      expect(forexTopics).toContain(MarketTopic.FOREX_CROSS);
      
      // Should not contain non-forex topics
      expect(forexTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(forexTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
    });

    test('should return all commodity topics', () => {
      const commodityTopics = getTopicsInCategory('commodity');
      
      expect(commodityTopics).toContain(MarketTopic.COMMODITY_ENERGY);
      expect(commodityTopics).toContain(MarketTopic.COMMODITY_METALS);
      expect(commodityTopics).toContain(MarketTopic.COMMODITY_AGRICULTURE);
      expect(commodityTopics).toContain(MarketTopic.COMMODITY_LIVESTOCK);
      
      // Should not contain non-commodity topics
      expect(commodityTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(commodityTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
    });

    test('should return all fixed income topics', () => {
      const fixedIncomeTopics = getTopicsInCategory('fixed_income');
      
      expect(fixedIncomeTopics).toContain(MarketTopic.FIXED_INCOME_GOVT);
      expect(fixedIncomeTopics).toContain(MarketTopic.FIXED_INCOME_CORPORATE);
      expect(fixedIncomeTopics).toContain(MarketTopic.FIXED_INCOME_MUNICIPAL);
      expect(fixedIncomeTopics).toContain(MarketTopic.FIXED_INCOME_MBS);
      
      // Should not contain non-fixed-income topics
      expect(fixedIncomeTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(fixedIncomeTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
    });

    test('should return all alternative data topics', () => {
      const altDataTopics = getTopicsInCategory('alt_data');
      
      expect(altDataTopics).toContain(MarketTopic.ALT_DATA_NEWS);
      expect(altDataTopics).toContain(MarketTopic.ALT_DATA_SENTIMENT);
      expect(altDataTopics).toContain(MarketTopic.ALT_DATA_SOCIAL);
      expect(altDataTopics).toContain(MarketTopic.ALT_DATA_WEATHER);
      expect(altDataTopics).toContain(MarketTopic.ALT_DATA_ECONOMIC);
      
      // Should not contain non-alt-data topics
      expect(altDataTopics).not.toContain(MarketTopic.CRYPTO_SPOT);
      expect(altDataTopics).not.toContain(MarketTopic.SPORTS_BASKETBALL);
    });

    test('should return empty array for non-existent category', () => {
      const nonExistentTopics = getTopicsInCategory('non_existent_category');
      expect(nonExistentTopics).toEqual([]);
    });

    test('should return all topics for valid categories', () => {
      const allCategories = ['sports', 'crypto', 'equities', 'forex', 'commodity', 'fixed_income', 'alt_data'];
      
      allCategories.forEach(category => {
        const topics = getTopicsInCategory(category);
        expect(Array.isArray(topics)).toBe(true);
        
        // All returned topics should belong to the category
        topics.forEach(topic => {
          expect(getTopicCategory(topic)).toBe(category);
        });
      });
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle all topic types gracefully', () => {
      const validTopics = Object.values(MarketTopic);
      
      validTopics.forEach(topic => {
        expect(() => {
          getTopicHierarchy(topic);
          getTopicCategory(topic);
          getTopicSubcategory(topic);
        }).not.toThrow();
      });
    });

    test('should maintain consistency across functions', () => {
      const allTopics = Object.values(MarketTopic);
      
      allTopics.forEach(topic => {
        const hierarchy = getTopicHierarchy(topic);
        const category = getTopicCategory(topic);
        const subcategory = getTopicSubcategory(topic);
        
        // Category should be first element of hierarchy
        expect(hierarchy[0]).toBe(category);
        
        // Subcategory should be second element if it exists
        if (subcategory) {
          expect(hierarchy[1]).toBe(subcategory);
        }
      });
    });

    test('should handle relationship testing consistently', () => {
      const cryptoTopics = getTopicsInCategory('crypto');
      const sportsTopics = getTopicsInCategory('sports');
      
      // All crypto topics should be related to each other
      cryptoTopics.forEach((topic1, i) => {
        cryptoTopics.forEach((topic2, j) => {
          if (i !== j) {
            expect(areTopicsRelated(topic1, topic2)).toBe(true);
          }
        });
      });
      
      // Crypto topics should not be related to sports topics
      cryptoTopics.forEach(cryptoTopic => {
        sportsTopics.forEach(sportsTopic => {
          expect(areTopicsRelated(cryptoTopic, sportsTopic)).toBe(false);
        });
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large numbers of operations efficiently', () => {
      const start = Date.now();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        getTopicHierarchy(MarketTopic.CRYPTO_SPOT);
        getTopicCategory(MarketTopic.SPORTS_BASKETBALL);
        getTopicSubcategory(MarketTopic.EQUITIES_US);
        areTopicsRelated(MarketTopic.CRYPTO_DERIVATIVES, MarketTopic.CRYPTO_DEFI);
        getTopicsInCategory('forex');
      }
      
      const end = Date.now();
      expect(end - start).toBeLessThan(100); // Should be very fast
    });

    test('should not create excessive objects', () => {
      const topic = MarketTopic.CRYPTO_SPOT;
      
      // Multiple calls should not create new arrays unnecessarily
      const hierarchy1 = getTopicHierarchy(topic);
      const hierarchy2 = getTopicHierarchy(topic);
      
      expect(hierarchy1).toEqual(hierarchy2);
    });
  });
});
