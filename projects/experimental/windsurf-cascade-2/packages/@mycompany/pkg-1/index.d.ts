//! @mycompany/pkg-1 - TypeScript definitions

export function hello(name?: string): string;
export function add(a: number, b: number): number;
export function multiply(a: number, b: number): number;
export const VERSION: string;

declare const _default: {
  hello: typeof hello;
  add: typeof add;
  multiply: typeof multiply;
  VERSION: typeof VERSION;
};

export default _default;
