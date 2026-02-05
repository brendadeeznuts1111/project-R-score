/// <reference types="bun-types" />

declare module 'bun:sqlite' {
  export class Database {
    constructor(path: string);
    exec(sql: string): void;
    query(sql: string): {
      all(...args: any[]): any[];
      get(...args: any[]): any;
    };
    prepare(sql: string): {
      run(...args: any[]): { changes?: number };
      all(...args: any[]): any[];
      get(...args: any[]): any;
    };
    close(): void;
  }
}

// Extend ImportMeta for Bun-specific features
interface ImportMeta {
  main?: boolean;
}

// Bun global types
declare const Bun: {
  serve(options: {
    port?: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }): void;
};
