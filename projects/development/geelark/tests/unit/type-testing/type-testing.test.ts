#!/usr/bin/env bun

import { feature } from "bun:bundle";
import { describe, expectTypeOf, it } from "bun:test";

describe("Type Testing for Feature Elimination", () => {
  it("should type-check conditional code blocks", () => {
    // This tests that TypeScript understands the type narrowing
    if (feature("FEAT_PREMIUM")) {
      const premiumService = {
        analytics: () => "premium-analytics",
        export: (format: "json" | "csv") => `export-${format}`,
      };
      expectTypeOf(premiumService.analytics).toBeFunction();
      expectTypeOf(premiumService.export).toBeFunction();
    } else {
      const basicService = {
        core: () => "basic-core",
      };
      expectTypeOf(basicService.core).toBeFunction();
    }
  });

  it("should handle complex type scenarios", () => {
    interface PremiumFeatures {
      analytics: () => void;
      export: (format: "json" | "csv") => void;
    }

    interface BasicFeatures {
      core: () => void;
    }

    // Test conditional object types
    if (feature("FEAT_PREMIUM")) {
      const features: PremiumFeatures & BasicFeatures = {
        core: () => {},
        analytics: () => {},
        export: (f: "json" | "csv") => {},
      };
      expectTypeOf(features).toMatchObjectType<
        PremiumFeatures & BasicFeatures
      >();
    } else {
      const features: BasicFeatures = {
        core: () => {},
      };
      expectTypeOf(features).toMatchObjectType<BasicFeatures>();
    }
  });

  it("should type-check array operations", () => {
    const features: string[] = [];

    if (feature("FEAT_PREMIUM")) {
      features.push("analytics");
      features.push("export");
    }

    if (feature("FEAT_ADVANCED_MONITORING")) {
      features.push("monitoring");
    }

    expectTypeOf(features).toBeArray();
    expectTypeOf(features).items.toBeString();
  });

  it("should handle function parameter types", () => {
    type ServiceFactory = (features: string[]) => {
      analytics?: () => void;
      monitoring?: () => void;
    };

    const createService = (features: string[]): ServiceFactory => {
      const service: any = {};
      if (features.includes("analytics")) service.analytics = () => {};
      if (features.includes("monitoring")) service.monitoring = () => {};
      return service;
    };

    const activeFeatures: string[] = [];
    if (feature("FEAT_PREMIUM")) activeFeatures.push("analytics");
    if (feature("FEAT_ADVANCED_MONITORING")) activeFeatures.push("monitoring");

    const service = createService(activeFeatures);
    expectTypeOf(service).toBeFunction();
    expectTypeOf(createService).parameters.toEqualTypeOf<[string[]]>();
  });

  it("should demonstrate type elimination", () => {
    // This test shows how types are eliminated at compile time
    interface PremiumAPI {
      advancedAnalytics: (data: any) => any;
      exportReports: (format: string) => void;
    }

    interface BasicAPI {
      basicFunction: () => string;
    }

    let api: BasicAPI;

    if (feature("FEAT_PREMIUM")) {
      // In premium builds, this type is available
      api = {
        basicFunction: () => "basic",
        advancedAnalytics: (data: any) => data,
        exportReports: (format: string) => {},
      } as unknown as BasicAPI & PremiumAPI;

      // Type check that we have premium features
      expectTypeOf(
        (api as unknown as PremiumAPI).advancedAnalytics
      ).toBeFunction();
      expectTypeOf((api as unknown as PremiumAPI).exportReports).toBeFunction();
    } else {
      // In free builds, only basic features
      api = {
        basicFunction: () => "basic",
      };
    }

    expectTypeOf(api.basicFunction).toBeFunction();
  });
});
