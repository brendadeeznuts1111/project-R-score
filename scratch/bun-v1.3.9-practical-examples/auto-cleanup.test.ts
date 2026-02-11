/**
 * Bun v1.3.9 Mock Auto-Cleanup Examples
 * 
 * Migration guide: Replace beforeEach/afterEach with 'using'
 */

import { describe, test, expect, spyOn } from "bun:test";

// Example service
class PaymentService {
  static validateCard(cardNumber: string): boolean {
    return /^\d{16}$/.test(cardNumber);
  }
  
  static processPayment(amount: number, currency: string): Promise<{ id: string }> {
    return Promise.resolve({ id: `pay_${Date.now()}` });
  }
  
  static getBalance(userId: string): number {
    return 1000; // Mock balance
  }
}

describe("1. Basic Auto-Cleanup", () => {
  test("spyOn auto-cleans after scope", () => {
    const original = PaymentService.validateCard;
    
    {
      using spy = spyOn(PaymentService, "validateCard");
      spy.mockReturnValue(true);
      
      expect(PaymentService.validateCard("123")).toBe(true);
      expect(spy).toHaveBeenCalled();
      
    } // ← Automatically restored here!
    
    // Original function restored
    expect(PaymentService.validateCard).toBe(original);
    expect(PaymentService.validateCard("123")).toBe(false);
  });
});

describe("2. Multiple Mocks", () => {
  test("multiple spies in one scope", () => {
    {
      using spyValidate = spyOn(PaymentService, "validateCard");
      using spyBalance = spyOn(PaymentService, "getBalance");
      
      spyValidate.mockReturnValue(true);
      spyBalance.mockReturnValue(5000);
      
      expect(PaymentService.validateCard("any")).toBe(true);
      expect(PaymentService.getBalance("user1")).toBe(5000);
      
    } // ← Both restored automatically
    
    expect(PaymentService.validateCard("123")).toBe(false);
    expect(PaymentService.getBalance("user1")).toBe(1000);
  });
});

describe("3. Async Mocks", () => {
  test("mocking async functions", async () => {
    {
      using spy = spyOn(PaymentService, "processPayment");
      spy.mockResolvedValue({ id: "mock_payment_123" });
      
      const result = await PaymentService.processPayment(100, "USD");
      expect(result.id).toBe("mock_payment_123");
      
    } // ← Restored
    
    // Would call real implementation (but we won't await it in test)
  });
});

describe("4. Mock with Implementation", () => {
  test("custom mock implementation", () => {
    {
      using spy = spyOn(PaymentService, "getBalance");
      
      let callCount = 0;
      spy.mockImplementation((userId: string) => {
        callCount++;
        return callCount * 100;
      });
      
      expect(PaymentService.getBalance("a")).toBe(100);
      expect(PaymentService.getBalance("b")).toBe(200);
      expect(PaymentService.getBalance("c")).toBe(300);
      
    } // ← Restored
  });
});

describe("5. Call Tracking", () => {
  test("tracking calls without mocking", () => {
    {
      using spy = spyOn(PaymentService, "validateCard");
      
      // Call original implementation but track it
      PaymentService.validateCard("1234567890123456");
      PaymentService.validateCard("invalid");
      
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, "1234567890123456");
      expect(spy).toHaveBeenNthCalledWith(2, "invalid");
      
    } // ← Restored
  });
});

describe("6. Exception Safety", () => {
  test("cleanup happens even on exception", () => {
    const original = PaymentService.validateCard;
    
    try {
      {
        using spy = spyOn(PaymentService, "validateCard");
        spy.mockReturnValue(true);
        
        throw new Error("Test error");
      }
    } catch (e) {
      // Exception caught
    }
    
    // Still restored despite exception!
    expect(PaymentService.validateCard).toBe(original);
  });
});

describe("7. Chained Return Values", () => {
  test("mockReturnValueOnce chaining", () => {
    {
      using spy = spyOn(PaymentService, "getBalance");
      
      spy
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200)
        .mockReturnValue(300);
      
      expect(PaymentService.getBalance("a")).toBe(100);
      expect(PaymentService.getBalance("b")).toBe(200);
      expect(PaymentService.getBalance("c")).toBe(300);
      expect(PaymentService.getBalance("d")).toBe(300);
      
    } // ← Restored
  });
});

describe("8. Real-world Example", () => {
  test("payment validation flow", async () => {
    {
      using spyValidate = spyOn(PaymentService, "validateCard");
      using spyBalance = spyOn(PaymentService, "getBalance");
      using spyProcess = spyOn(PaymentService, "processPayment");
      
      // Setup mocks
      spyValidate.mockReturnValue(true);
      spyBalance.mockReturnValue(500);
      spyProcess.mockResolvedValue({ id: "payment_123" });
      
      // Test flow
      const isValid = PaymentService.validateCard("1234567890123456");
      const balance = PaymentService.getBalance("user1");
      const payment = await PaymentService.processPayment(100, "USD");
      
      expect(isValid).toBe(true);
      expect(balance).toBe(500);
      expect(payment.id).toBe("payment_123");
      
      expect(spyValidate).toHaveBeenCalled();
      expect(spyBalance).toHaveBeenCalled();
      expect(spyProcess).toHaveBeenCalledWith(100, "USD");
      
    } // ← All automatically restored
    
    // Verify restoration
    expect(PaymentService.validateCard("123")).toBe(false);
    expect(PaymentService.getBalance("user1")).toBe(1000);
  });
});
