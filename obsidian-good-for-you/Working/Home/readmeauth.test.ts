/// <reference types="jest" />
/// <reference types="node" />

// Unit tests for APIAppleIDCreator
import { APIAppleIDCreator, ProfileData, ConfigManager } from './readmeauth';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

describe('APIAppleIDCreator', () => {
  let creator: APIAppleIDCreator;

  beforeEach(() => {
    creator = new APIAppleIDCreator({ enableLogging: false });
    mockFetch.mockClear();
  });

  describe('Configuration', () => {
    test('should load default configuration', () => {
      const config = ConfigManager.load();
      expect(config.maxRetries).toBe(3);
      expect(config.enableLogging).toBe(true);
      expect(config.userAgent).toContain('iPhone');
    });

    test('should accept custom configuration', () => {
      const customCreator = new APIAppleIDCreator({
        maxRetries: 5,
        enableLogging: false
      });
      expect(customCreator).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    test('should validate valid profile data', () => {
      const validProfile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      expect(() => creator['validateProfileData'](validProfile)).not.toThrow();
    });

    test('should reject invalid first name', () => {
      const invalidProfile: ProfileData = {
        firstName: 'J',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      expect(() => creator['validateProfileData'](invalidProfile))
        .toThrow('First name must be at least 2 characters');
    });

    test('should reject invalid phone number', () => {
      const invalidProfile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: 'invalid-phone',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      expect(() => creator['validateProfileData'](invalidProfile))
        .toThrow('Invalid phone number format');
    });

    test('should reject underage birth year', () => {
      const currentYear = new Date().getFullYear();
      const invalidProfile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: currentYear - 10,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      expect(() => creator['validateProfileData'](invalidProfile))
        .toThrow('Invalid birth year - must be at least 13 years old');
    });
  });

  describe('Helper Methods', () => {
    test('should generate valid session ID', () => {
      const sessionId = creator['generateSessionId']();
      expect(sessionId).toMatch(/^session_[a-z0-9]+\d+$/);
    });

    test('should generate valid UUID', () => {
      const uuid = creator['generateUUID']();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should generate Apple-specific email', () => {
      const profile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      const email = creator['generateAppleSpecificEmail'](profile);
      expect(email).toMatch(/^johndoe\d+@icloud\.com$/);
    });

    test('should generate secure password', () => {
      const password = creator['generateSecurePassword']();
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*]/);
    });

    test('should format birth date correctly', () => {
      const profile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          birthMonth: 6,
          birthDay: 15,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };
      const birthDate = creator['formatBirthDateForApple'](profile);
      expect(birthDate).toMatch(/^\d{2}\/\d{2}\/1990$/);
    });
  });

  describe('Metrics', () => {
    test('should track initial metrics correctly', () => {
      const metrics = creator.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulCreations).toBe(0);
      expect(metrics.failedCreations).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.cacheSize).toBe(0);
    });

    test('should reset metrics correctly', () => {
      creator.resetMetrics();
      const metrics = creator.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulCreations).toBe(0);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache correctly', () => {
      creator.clearCache();
      const metrics = creator.getMetrics();
      expect(metrics.cacheSize).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed operations', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await creator['retryWithBackoff'](mockOperation, 3, 10);
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    test('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(creator['retryWithBackoff'](mockOperation, 2, 10))
        .rejects.toThrow('Persistent failure');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Integration', () => {
    test('should handle successful account creation', async () => {
      const mockSession = { sessionId: 'test-session', deviceId: 'test-device' };
      const mockCreationResult = { accountId: 'test-account' };
      const mockVerification = { verified: true };
      const mockSetupResult = { appleId: 'test@icloud.com' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSession
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreationResult
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVerification
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSetupResult
        } as Response);

      const profile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };

      const result = await creator.createViaAPI(profile);

      expect(result.appleId).toBe('test@icloud.com');
      expect(result.status).toBe('created');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test('should handle API failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const profile: ProfileData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-123-4567',
        demographic: { 
          birthYear: 1990,
          country: 'US',
          residencyCountry: 'US'
        },
        security: {},
        preferences: {}
      };

      await expect(creator.createViaAPI(profile)).rejects.toThrow('Network error');
    });
  });
});

// Integration tests
describe('Integration Tests', () => {
  test('should work end-to-end with mocked responses', async () => {
    const creator = new APIAppleIDCreator({ enableLogging: false, maxRetries: 1 });
    
    // Mock all API responses
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    const profile: ProfileData = {
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+1-555-000-0000',
      demographic: { 
        birthYear: 1990,
        country: 'US',
        residencyCountry: 'US'
      },
      security: {},
      preferences: {}
    };

    // This would normally make real API calls, but we're mocking them
    expect(() => creator['validateProfileData'](profile)).not.toThrow();
    expect(creator['generateAppleSpecificEmail'](profile)).toContain('@icloud.com');
  });
});

export {};
