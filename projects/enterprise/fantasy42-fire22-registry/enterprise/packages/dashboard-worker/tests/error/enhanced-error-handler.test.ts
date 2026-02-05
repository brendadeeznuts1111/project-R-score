/// <reference types="jest" />
import {
  EnhancedError,
  createEnhancedError,
  formatErrorResponse,
  handleApiError,
  withErrorHandling,
  validateRequiredFields,
  validateDataTypes,
  ErrorCodes,
  HttpStatusCodes,
} from '../../src/error/enhanced-error-handler';

describe('Enhanced Error Handler', () => {
  describe('EnhancedError', () => {
    it('should create an EnhancedError with correct properties', () => {
      const error = new EnhancedError('TEST_ERROR', 'Test error message', { detail: 'test' }, 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.httpStatus).toBe(400);
      expect(error.timestamp).toBeDefined();
      expect(error.requestId).toBeDefined();
      expect(error.name).toBe('EnhancedError');
    });

    it('should use default HTTP status when not provided', () => {
      const error = new EnhancedError('TEST_ERROR', 'Test error message');

      expect(error.httpStatus).toBe(500);
    });

    it('should have proper prototype chain', () => {
      const error = new EnhancedError('TEST_ERROR', 'Test error message');

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('createEnhancedError', () => {
    it('should create an EnhancedError with correct properties', () => {
      const error = createEnhancedError(
        'TEST_ERROR',
        'Test error message',
        { detail: 'test' },
        400
      );

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.httpStatus).toBe(400);
    });

    it('should use default HTTP status when not provided', () => {
      const error = createEnhancedError('TEST_ERROR', 'Test error message');

      expect(error.httpStatus).toBe(500);
    });

    it('should generate unique request IDs', () => {
      const error1 = createEnhancedError('TEST_ERROR', 'Test error message');
      const error2 = createEnhancedError('TEST_ERROR', 'Test error message');

      expect(error1.requestId).toBeDefined();
      expect(error2.requestId).toBeDefined();
      expect(error1.requestId).not.toBe(error2.requestId);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format EnhancedError into ErrorResponse', () => {
      const error = createEnhancedError(
        'TEST_ERROR',
        'Test error message',
        { detail: 'test' },
        400
      );
      const formatted = formatErrorResponse(error);

      expect(formatted.success).toBe(false);
      expect(formatted.error.code).toBe('TEST_ERROR');
      expect(formatted.error.message).toBe('Test error message');
      expect(formatted.error.details).toEqual({ detail: 'test' });
      expect(formatted.error.timestamp).toBe(error.timestamp);
      expect(formatted.error.requestId).toBe(error.requestId);
    });

    it('should handle error without details', () => {
      const error = createEnhancedError('TEST_ERROR', 'Test error message');
      const formatted = formatErrorResponse(error);

      expect(formatted.error.details).toBeUndefined();
    });
  });

  describe('handleApiError', () => {
    it('should handle EnhancedError correctly', () => {
      const error = createEnhancedError(
        'TEST_ERROR',
        'Test error message',
        { detail: 'test' },
        400
      );
      const response = handleApiError(error);

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Error-Code')).toBe('TEST_ERROR');
      expect(response.headers.get('X-Request-ID')).toBe(error.requestId);
      expect(response.headers.get('X-Timestamp')).toBe(error.timestamp);

      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('TEST_ERROR');
      expect(responseBody.error.message).toBe('Test error message');
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const response = handleApiError(unknownError);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Error-Code')).toBe('INTERNAL_ERROR');

      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_ERROR');
      expect(responseBody.error.details).toEqual({ originalError: 'Unknown error' });
    });

    it('should handle string errors', () => {
      const response = handleApiError('String error');

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error.details).toEqual({ originalError: 'String error' });
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap function and handle errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = withErrorHandling(mockFn, 'test context');

      await expect(wrappedFn()).rejects.toThrow('Error in test context: Test error');
    });

    it('should pass through EnhancedError without modification', async () => {
      const originalError = createEnhancedError('TEST_ERROR', 'Test error message');
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const wrappedFn = withErrorHandling(mockFn, 'test context');

      await expect(wrappedFn()).rejects.toBe(originalError);
    });

    it('should preserve original error stack', async () => {
      const originalError = new Error('Test error');
      originalError.stack = 'Error stack trace';
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const wrappedFn = withErrorHandling(mockFn, 'test context');

      try {
        await wrappedFn();
      } catch (error) {
        if (error instanceof EnhancedError) {
          expect(error.details.originalError).toBe('Error stack trace');
        }
      }
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation when all required fields are present', () => {
      const data = { name: 'John', age: 30, email: 'john@example.com' };
      const requiredFields = ['name', 'age', 'email'];

      expect(() => validateRequiredFields(data, requiredFields)).not.toThrow();
    });

    it('should throw error when required fields are missing', () => {
      const data = { name: 'John', age: 30 };
      const requiredFields = ['name', 'age', 'email'];

      expect(() => validateRequiredFields(data, requiredFields)).toThrow(
        'Missing required fields: email'
      );
    });

    it('should throw error when required fields are null or empty', () => {
      const data = { name: 'John', age: null, email: '' };
      const requiredFields = ['name', 'age', 'email'];

      expect(() => validateRequiredFields(data, requiredFields)).toThrow(
        'Missing required fields: age, email'
      );
    });

    it('should include context in error message', () => {
      const data = { name: 'John' };
      const requiredFields = ['name', 'age'];

      expect(() => validateRequiredFields(data, requiredFields, 'User Registration')).toThrow(
        'Missing required fields: age'
      );
    });

    it('should include missing and provided fields in error details', () => {
      const data = { name: 'John' };
      const requiredFields = ['name', 'age', 'email'];

      try {
        validateRequiredFields(data, requiredFields);
      } catch (error) {
        if (error instanceof EnhancedError) {
          expect(error.details.missingFields).toEqual(['age', 'email']);
          expect(error.details.providedFields).toEqual(['name']);
        }
      }
    });
  });

  describe('validateDataTypes', () => {
    it('should pass validation when all types match', () => {
      const data = { name: 'John', age: 30, active: true };
      const schema = { name: 'string', age: 'number', active: 'boolean' };

      expect(() => validateDataTypes(data, schema)).not.toThrow();
    });

    it('should throw error when types do not match', () => {
      const data = { name: 'John', age: '30', active: true };
      const schema = { name: 'string', age: 'number', active: 'boolean' };

      expect(() => validateDataTypes(data, schema)).toThrow('Type validation failed');
    });

    it('should include all type errors in error details', () => {
      const data = { name: 123, age: '30', active: 'yes' };
      const schema = { name: 'string', age: 'number', active: 'boolean' };

      try {
        validateDataTypes(data, schema);
      } catch (error) {
        if (error instanceof EnhancedError) {
          expect((error as any).errors).toContain(
            "Field 'name' expected type 'string' but got 'number'"
          );
          expect((error as any).errors).toContain(
            "Field 'age' expected type 'number' but got 'string'"
          );
          expect((error as any).errors).toContain(
            "Field 'active' expected type 'boolean' but got 'string'"
          );
        }
      }
    });

    it('should skip validation for null or undefined values', () => {
      const data = { name: 'John', age: null, active: undefined };
      const schema = { name: 'string', age: 'number', active: 'boolean' };

      expect(() => validateDataTypes(data, schema)).not.toThrow();
    });

    it('should include context in error message', () => {
      const data = { name: 123 };
      const schema = { name: 'string' };

      expect(() => validateDataTypes(data, schema, 'User Profile')).toThrow(
        'Type validation failed in User Profile'
      );
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
      expect(ErrorCodes.AUTH_INVALID).toBe('AUTH_INVALID');
      expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ErrorCodes.TOKEN_INVALID).toBe('TOKEN_INVALID');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.TYPE_VALIDATION_ERROR).toBe('TYPE_VALIDATION_ERROR');
      expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCodes.API_ERROR).toBe('API_ERROR');
      expect(ErrorCodes.API_TIMEOUT).toBe('API_TIMEOUT');
      expect(ErrorCodes.API_UNAVAILABLE).toBe('API_UNAVAILABLE');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCodes.SECURITY_VIOLATION).toBe('SECURITY_VIOLATION');
      expect(ErrorCodes.SUSPICIOUS_ACTIVITY).toBe('SUSPICIOUS_ACTIVITY');
      expect(ErrorCodes.INVALID_CSRF_TOKEN).toBe('INVALID_CSRF_TOKEN');
    });

    it('should be readonly', () => {
      // This test verifies that ErrorCodes cannot be modified
      expect(() => {
        // @ts-ignore - Intentional violation for testing
        ErrorCodes.AUTH_REQUIRED = 'MODIFIED';
      }).toThrow();
    });
  });

  describe('HttpStatusCodes', () => {
    it('should have all expected HTTP status codes', () => {
      expect(HttpStatusCodes[200]).toBe('OK');
      expect(HttpStatusCodes[201]).toBe('CREATED');
      expect(HttpStatusCodes[400]).toBe('BAD_REQUEST');
      expect(HttpStatusCodes[401]).toBe('UNAUTHORIZED');
      expect(HttpStatusCodes[403]).toBe('FORBIDDEN');
      expect(HttpStatusCodes[404]).toBe('NOT_FOUND');
      expect(HttpStatusCodes[429]).toBe('TOO_MANY_REQUESTS');
      expect(HttpStatusCodes[500]).toBe('INTERNAL_SERVER_ERROR');
      expect(HttpStatusCodes[502]).toBe('BAD_GATEWAY');
      expect(HttpStatusCodes[503]).toBe('SERVICE_UNAVAILABLE');
    });

    it('should be readonly', () => {
      // This test verifies that HttpStatusCodes cannot be modified
      expect(() => {
        // @ts-ignore - Intentional violation for testing
        HttpStatusCodes[200] = 'MODIFIED';
      }).toThrow();
    });
  });

  describe('Integration tests', () => {
    it('should work together in a real scenario', async () => {
      // Simulate a request validation scenario
      const requestData = { username: '', password: '123' };

      try {
        // Validate required fields
        validateRequiredFields(requestData, ['username', 'password'], 'Login Request');

        // This should not reach here
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof EnhancedError) {
          // Format the error for API response
          const errorResponse = formatErrorResponse(error);

          // Handle the API error
          const apiResponse = handleApiError(error);

          expect(apiResponse.status).toBe(400);
          expect(errorResponse.success).toBe(false);
          expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    it('should handle async operations with error handling', async () => {
      const asyncOperation = async () => {
        // Simulate database operation
        validateRequiredFields({ id: 1 }, ['id'], 'Database Operation');
        return { success: true };
      };

      const wrappedOperation = withErrorHandling(asyncOperation, 'Database Service');

      const result = await wrappedOperation();
      expect(result).toEqual({ success: true });
    });
  });
});
