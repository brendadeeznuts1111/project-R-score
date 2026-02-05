/// <reference lib="dom" />
import { test, expect, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import React from 'react';
import { FeatureMatrix } from "./FeatureMatrix";

const mockFeatures = {
  features: [
    {
      id: "1",
      name: "Test Feature",
      enabled: true,
      badge: "ACTIVE",
      category: "TESTING",
      description: "A test feature description",
      criticalLevel: "Low Risk",
      logHook: "test-hook"
    }
  ]
};

test("renders FeatureMatrix and displays features", async () => {
  // Mock fetch for this specific test
  global.fetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockFeatures)
  })) as any;

  render(<FeatureMatrix />);

  // Should show loading or empty first then the feature after fetch
  await waitFor(() => {
    expect(screen.getByText("Test Feature")).toBeDefined();
    expect(screen.getByText("ACTIVE")).toBeDefined();
    expect(screen.getByText("TESTING")).toBeDefined();
  });
  
  expect(screen.getByText("1 FLAGS ACTIVE")).toBeDefined();
});
