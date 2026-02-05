/// <reference lib="dom" />
import { test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from 'react';
import { MetricsDisplay } from "./MetricsDisplay";

test("renders MetricsDisplay showing loading state initially", () => {
    render(<MetricsDisplay />);
    
    // Check if loading state is shown
    expect(screen.getByText(/Bridging System WebSocket/i)).toBeDefined();
});
