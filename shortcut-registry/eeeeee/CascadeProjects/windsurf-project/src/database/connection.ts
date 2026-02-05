// src/database/connection.ts
import type { DatabaseConnection } from "../types";

// Mock database connection for development
// In production, this would connect to PostgreSQL or another database

class MockDatabase implements DatabaseConnection {
  private queries: Map<string, any[]> = new Map();

  async query(sql: string, params: any[] = []): Promise<any[]> {
    // Mock implementation - in production this would execute actual SQL

    // Return mock data based on query pattern
    if (sql.includes("user_lightning_balances")) {
      return [{ balance: 0 }];
    }
    
    if (sql.includes("routing_decisions")) {
      return [];
    }
    
    if (sql.includes("INSERT")) {
      return [{ insertId: Math.random() }];
    }
    
    return [];
  }

  async transaction(callback: (trx: any) => Promise<void>): Promise<void> {
    // Mock transaction implementation

    await callback(this);

  }
}

// Export singleton instance
export const db: DatabaseConnection = new MockDatabase();

// Export database class for testing
export { MockDatabase };
