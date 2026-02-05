// Bun TOML type declarations
declare module 'bun:toml' {
  export function parse(text: string): any;
  export function stringify(obj: any): string;
}

declare module 'bun:sqlite' {
  export class Database {
    constructor(path?: string);
    run(sql: string, ...args: any[]): { lastInsertRowid: number; changes: number };
    query(sql: string): {
      all(...args: any[]): any[];
      get(...args: any[]): any;
    };
    exec(sql: string): void;
    close(): void;
  }
}

declare module 'bun' {
  export function hash: {
    crc32(data: string | ArrayBuffer): number;
  };
  
  export function nanoseconds(): number;
  
  export function feature(name: string): boolean;
  
  export function file(path: string): BunFile;
  
  export interface BunFile {
    text(): Promise<string>;
    exists(): boolean;
    write(data: string | ArrayBuffer): Promise<number>;
    size(): number;
    list(): AsyncIterable<string>;
  }
  
  export function write(path: string, data: string | ArrayBuffer): Promise<number>;
}
