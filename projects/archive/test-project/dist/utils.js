// src/utils.ts
import { randomUUID } from "crypto";
import { performance } from "perf_hooks";
function generateId() {
  return randomUUID();
}
function measureTime(fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}
export {
  measureTime,
  generateId
};
