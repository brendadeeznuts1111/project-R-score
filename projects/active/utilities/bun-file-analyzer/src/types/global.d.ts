/// <reference types="bun-types" />

declare global {
  interface ImportMetaEnv {
    readonly ADMIN_USER: string;
    readonly ADMIN_PASS: string;
    [key: string]: any;
  }

  interface ImportMeta {
    readonly hot?: {
      data: Record<string, any>;
      accept(callback?: (newModule: any) => void): void;
      dispose(callback: () => void): void;
    };
  }
}

export {};
