/**
 * Route Benchmark using Mitata
 * Tests API endpoint performance by making HTTP requests
 * 
 * Based on Bun's benchmark structure: https://github.com/oven-sh/bun/tree/main/bench
 */

import { bench, group, run } from "./utils";
import { ROUTES } from "../../src/server/topology";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

// Group routes by route group
const routesByGroup = ROUTES.reduce((acc, route) => {
  if (!acc[route.group]) {
    acc[route.group] = [];
  }
  acc[route.group].push(route);
  return acc;
}, {} as Record<string, typeof ROUTES>);

// Benchmark routes by group
for (const [groupName, routes] of Object.entries(routesByGroup)) {
  group(`Routes: ${groupName}`, () => {
    for (const route of routes.slice(0, 10)) { // Limit to 10 routes per group for performance
      const method = route.methods[0] || "GET";
      const url = `${BASE_URL}${route.path}`;
      
      // Skip routes with parameters for now (would need actual values)
      if (route.path.includes(":")) {
        continue;
      }

      bench(`${method} ${route.path}`, async () => {
        try {
          await fetch(url, { method });
        } catch (error) {
          // Ignore errors in benchmark
        }
      });
    }
  });
}

await run();
