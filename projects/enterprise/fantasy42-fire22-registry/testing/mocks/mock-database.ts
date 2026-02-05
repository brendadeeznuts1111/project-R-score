import { Database } from 'bun:sqlite';

// Mock Database class for testing
export class MockDatabase {
  private mockData: Map<string, any[]> = new Map();
  private mockStatements: Map<string, any> = new Map();

  constructor() {
    // Initialize with test data
    this.mockData.set('packages', []);
    this.mockData.set('security_scans', []);
    this.mockData.set('audit_log', []);
  }

  // Mock database methods
  exec(sql: string): void {
    // Mock SQL execution - just log for testing
    console.log(`Mock DB exec: ${sql}`);
  }

  prepare(sql: string): MockStatement {
    const mockStmt = new MockStatement(sql, this.mockData);
    this.mockStatements.set(sql, mockStmt);
    return mockStmt;
  }

  close(): void {
    console.log('Mock DB closed');
  }

  // Test helper methods
  insertMockData(table: string, data: any[]): void {
    this.mockData.set(table, data);
  }

  getMockData(table: string): any[] {
    return this.mockData.get(table) || [];
  }

  clearMockData(): void {
    this.mockData.clear();
  }
}

// Mock Statement class
export class MockStatement {
  constructor(
    private sql: string,
    private mockData: Map<string, any[]>
  ) {}

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    console.log(`Mock statement run: ${this.sql}`, params);

    // Simulate insert operation
    if (this.sql.toLowerCase().includes('insert')) {
      return { changes: 1, lastInsertRowid: Math.floor(Math.random() * 1000) };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }

  get(...params: any[]): any {
    console.log(`Mock statement get: ${this.sql}`, params);

    // Simulate select operations
    if (this.sql.toLowerCase().includes('select')) {
      // Return mock health check result
      if (this.sql.includes('SELECT 1')) {
        return { health_check: 1 };
      }

      // Return mock package data
      if (this.sql.includes('packages')) {
        const packages = this.mockData.get('packages') || [];
        return packages[0] || null;
      }
    }

    return null;
  }

  all(...params: any[]): any[] {
    console.log(`Mock statement all: ${this.sql}`, params);

    // Return mock data based on query
    if (this.sql.toLowerCase().includes('packages')) {
      return this.mockData.get('packages') || [];
    }

    if (this.sql.toLowerCase().includes('security_scans')) {
      return this.mockData.get('security_scans') || [];
    }

    return [];
  }

  transaction<T>(callback: () => T): T {
    console.log(`Mock transaction started`);
    try {
      const result = callback();
      console.log(`Mock transaction committed`);
      return result;
    } catch (error) {
      console.log(`Mock transaction rolled back`);
      throw error;
    }
  }
}

// Factory function to create mock database
export function createMockDatabase(): MockDatabase {
  return new MockDatabase();
}

// Mock database backup
export class MockDatabaseBackup {
  step(pages: number): boolean {
    console.log(`Mock backup step: ${pages} pages`);
    return true;
  }

  finish(): void {
    console.log('Mock backup finished');
  }
}
