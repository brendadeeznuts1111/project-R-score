//! @mycompany/pkg-2 - TypeScript definitions

export function formatDate(date?: Date): string;
export function randomId(length?: number): string;
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
export const VERSION: string;

declare const _default: {
  formatDate: typeof formatDate;
  randomId: typeof randomId;
  debounce: typeof debounce;
  throttle: typeof throttle;
  VERSION: typeof VERSION;
};

export default _default;
