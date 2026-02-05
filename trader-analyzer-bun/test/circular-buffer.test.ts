#!/usr/bin/env bun
/**
 * @fileoverview Circular Buffer Tests
 * @description Test suite for CircularBuffer with Bun.inspect.custom
 */

import { describe, expect, test } from "bun:test";
import { CircularBuffer, createCircularBuffer } from "../src/utils/circular-buffer";

describe("CircularBuffer", () => {
  test("should create buffer with specified capacity", () => {
    const buffer = new CircularBuffer<number>(100);
    expect(buffer.capacity).toBe(100);
    expect(buffer.size).toBe(0);
    expect(buffer.isEmpty).toBe(true);
    expect(buffer.isFull).toBe(false);
  });

  test("should reject invalid capacity", () => {
    expect(() => new CircularBuffer(-1)).toThrow();
    expect(() => new CircularBuffer(0)).toThrow();
    expect(() => new CircularBuffer(1.5)).toThrow();
  });

  test("should push and pop items", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1, 2, 3);
    
    expect(buffer.size).toBe(3);
    expect(buffer.pop()).toBe(1);
    expect(buffer.pop()).toBe(2);
    expect(buffer.pop()).toBe(3);
    expect(buffer.isEmpty).toBe(true);
  });

  test("should overwrite oldest items when full", () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1, 2, 3, 4, 5);
    
    expect(buffer.size).toBe(3);
    expect(buffer.pop()).toBe(3); // Oldest remaining item
    expect(buffer.pop()).toBe(4);
    expect(buffer.pop()).toBe(5);
  });

  test("should peek without removing", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1, 2, 3);
    
    expect(buffer.peek()).toBe(1);
    expect(buffer.size).toBe(3);
    expect(buffer.pop()).toBe(1);
  });

  test("should access items by index", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(10, 20, 30);
    
    expect(buffer.at(0)).toBe(10);
    expect(buffer.at(1)).toBe(20);
    expect(buffer.at(2)).toBe(30);
    expect(buffer.at(3)).toBeUndefined();
    expect(buffer.at(-1)).toBeUndefined();
  });

  test("should slice correctly", () => {
    const buffer = new CircularBuffer<number>(10);
    buffer.push(1, 2, 3, 4, 5);
    
    expect(buffer.slice(1, 4)).toEqual([2, 3, 4]);
    expect(buffer.slice(0, 2)).toEqual([1, 2]);
    expect(buffer.slice()).toEqual([1, 2, 3, 4, 5]);
  });

  test("should clear buffer", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1, 2, 3);
    buffer.clear();
    
    expect(buffer.isEmpty).toBe(true);
    expect(buffer.size).toBe(0);
  });

  test("should convert to array", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1, 2, 3);
    
    expect(buffer.toArray()).toEqual([1, 2, 3]);
  });

  test("should be iterable", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1, 2, 3);
    
    const items: number[] = [];
    for (const item of buffer) {
      items.push(item);
    }
    
    expect(items).toEqual([1, 2, 3]);
  });

  test("should have custom inspect", () => {
    const buffer = new CircularBuffer<number>(10);
    buffer.push(1, 2, 3);
    
    const inspected = Bun.inspect(buffer);
    expect(inspected).toContain("CircularBuffer");
    expect(inspected).toContain("capacity");
    expect(inspected).toContain("size");
  });

  test("should create with initial values", () => {
    const buffer = createCircularBuffer(10, [1, 2, 3]);
    expect(buffer.size).toBe(3);
    expect(buffer.toArray()).toEqual([1, 2, 3]);
  });
});
