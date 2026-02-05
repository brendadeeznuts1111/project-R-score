// Comprehensive test suite for Enhanced URLPattern API with RegExp Groups

import { beforeEach, describe, expect, it } from "bun:test";
import {
  FileServer,
  PatternValidator,
  Patterns,
  QueryParameterParser,
  RouteManager,
  URLPatternExamples,
  createDemoRouter,
  createRobustRouter,
  generatePatternsFromOpenAPI,
} from "../src/enhanced-urlpattern-api";

describe("URLPattern Examples", () => {
  it("should validate user ID patterns correctly", () => {
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/12345")
    ).toBe(true);
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/1")
    ).toBe(true);
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/1234567890")
    ).toBe(true);
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/12345678901")
    ).toBe(false); // 11 digits
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/abc")
    ).toBe(false);
    expect(
      URLPatternExamples.userPattern.test("http://localhost/users/12a34")
    ).toBe(false);
  });

  it("should validate email patterns correctly", () => {
    expect(
      URLPatternExamples.emailPattern.test(
        "http://localhost/profile/user@example.com"
      )
    ).toBe(true);
    expect(
      URLPatternExamples.emailPattern.test(
        "http://localhost/profile/test.email+tag@domain.co.uk"
      )
    ).toBe(true);
    expect(
      URLPatternExamples.emailPattern.test(
        "http://localhost/profile/invalid-email"
      )
    ).toBe(false);
    expect(
      URLPatternExamples.emailPattern.test(
        "http://localhost/profile/@domain.com"
      )
    ).toBe(false);
    expect(
      URLPatternExamples.emailPattern.test("http://localhost/profile/user@")
    ).toBe(false);
  });

  it("should validate slug patterns correctly", () => {
    expect(
      URLPatternExamples.slugPattern.test(
        "http://localhost/posts/bunreleasenotes"
      )
    ).toBe(true);
    expect(
      URLPatternExamples.slugPattern.test("http://localhost/posts/test123")
    ).toBe(true);
    expect(
      URLPatternExamples.slugPattern.test("http://localhost/posts/invalid slug")
    ).toBe(false);
    expect(
      URLPatternExamples.slugPattern.test("http://localhost/posts/invalid_slug")
    ).toBe(false);
    expect(
      URLPatternExamples.slugPattern.test("http://localhost/posts/Invalid")
    ).toBe(false); // uppercase not allowed
  });

  it("should validate date patterns correctly", () => {
    expect(
      URLPatternExamples.datePattern.test(
        "http://localhost/posts/2024/12/20/bunrelease"
      )
    ).toBe(true);
    expect(
      URLPatternExamples.datePattern.test(
        "http://localhost/posts/2023/01/01/new-year"
      )
    ).toBe(true);
    expect(
      URLPatternExamples.datePattern.test(
        "http://localhost/posts/24/12/20/bunrelease"
      )
    ).toBe(false); // year not 4 digits
    expect(
      URLPatternExamples.datePattern.test(
        "http://localhost/posts/2024/1/20/bunrelease"
      )
    ).toBe(false); // month not 2 digits
    expect(
      URLPatternExamples.datePattern.test(
        "http://localhost/posts/2024/12/5/bunrelease"
      )
    ).toBe(false); // day not 2 digits
  });

  it("should extract parameters correctly", () => {
    const result = URLPatternExamples.userPattern.exec(
      "http://localhost/users/12345"
    );
    expect(result?.pathname.groups.id).toBe("12345");

    const emailResult = URLPatternExamples.emailPattern.exec(
      "http://localhost/profile/user@example.com"
    );
    expect(emailResult?.pathname.groups.email).toBe("user@example.com");

    const dateResult = URLPatternExamples.datePattern.exec(
      "http://localhost/posts/2024/12/20/bunrelease"
    );
    expect(dateResult?.pathname.groups).toEqual({
      year: "2024",
      month: "12",
      day: "20",
      slug: "bunrelease",
    });
  });
});

describe("RouteManager", () => {
  let router: RouteManager;

  beforeEach(() => {
    router = new RouteManager();
  });

  it("should handle basic routing", async () => {
    router.addRoute(
      "home",
      new URLPattern("http://localhost/"),
      () => new Response("Home")
    );

    const req = new Request("http://localhost:3000/");
    const response = await router.handleRequest(req);
    expect(await response.text()).toBe("Home");
  });

  it("should handle parameterized routes", async () => {
    router.addRoute(
      "user",
      URLPatternExamples.userPattern,
      (req, params) => new Response(`User ${params.id}`)
    );

    const req = new Request("http://localhost:3000/users/123");
    const response = await router.handleRequest(req);
    expect(await response.text()).toBe("User 123");
  });

  it("should validate RegExp group parameters", async () => {
    router.addRoute(
      "user",
      URLPatternExamples.userPattern,
      (req, params) => new Response(`User ${params.id}`)
    );

    const invalidReq = new Request("http://localhost:3000/users/abc");
    const response = await router.handleRequest(invalidReq);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Invalid parameters");
  });

  it("should apply middleware", async () => {
    let middlewareCalled = false;

    router.addRoute(
      "protected",
      new URLPattern("http://localhost/protected"),
      () => new Response("Protected content"),
      {
        middleware: async (req, _params) => {
          middlewareCalled = true;
          const authHeader = req.headers.get("authorization");
          if (!authHeader) {
            return new Response("Unauthorized", { status: 401 });
          }
        },
      }
    );

    const req = new Request("http://localhost:3000/protected");
    const response = await router.handleRequest(req);
    expect(middlewareCalled).toBe(true);
    expect(response.status).toBe(401);
  });

  it("should return 404 for non-matching routes", async () => {
    const req = new Request("http://localhost:3000/nonexistent");
    const response = await router.handleRequest(req);
    expect(response.status).toBe(404);
  });
});

describe("Performance Optimization", () => {
  it("should sort routes by complexity", () => {
    const routes = [
      { pattern: URLPatternExamples.slugPattern, hasRegExpGroups: true },
      { pattern: URLPatternExamples.datePattern, hasRegExpGroups: true },
      {
        pattern: new URLPattern("http://localhost/simple"),
        hasRegExpGroups: false,
      },
    ];

    // Sort by complexity (simple patterns first, then complex ones)
    const _optimized = routes.sort((a, b) => {
      if (a.hasRegExpGroups && !b.hasRegExpGroups) return 1;
      if (!a.hasRegExpGroups && b.hasRegExpGroups) return -1;
      return 0;
    });

    expect(_optimized[0].hasRegExpGroups).toBe(false);
    expect(_optimized[1].hasRegExpGroups).toBe(true);
  });
});

describe("Query Parameter Parser", () => {
  it("should parse search parameters correctly", () => {
    const url = "/search?q=bun&category=tech&page=2";
    const result = QueryParameterParser.parseSearchParams(url);

    expect(result).toEqual({
      query: "bun",
      category: "tech",
      page: 2,
    });
  });

  it("should handle missing optional parameters", () => {
    const url = "/search?q=bun";
    const result = QueryParameterParser.parseSearchParams(url);

    expect(result).toEqual({
      query: "bun",
      category: "all",
      page: 1,
    });
  });

  it("should parse filter parameters correctly", () => {
    const url = "/products?minPrice=100&maxPrice=500&sort=price";
    const result = QueryParameterParser.parseFilterParams(url);

    expect(result).toEqual({
      minPrice: 100,
      maxPrice: 500,
      sort: "price",
    });
  });

  it("should validate search query format", () => {
    expect(() => {
      QueryParameterParser.parseSearchParams("/search?q=invalid@query");
    }).toThrow("Invalid search query");
  });
});

describe("File Server", () => {
  let fileServer: FileServer;

  beforeEach(() => {
    fileServer = new FileServer();
  });

  it("should handle valid file requests", async () => {
    const _mockFile = Bun.write("./static/test.txt", "Hello World");
    const req = new Request("http://localhost:3000/static/test.txt");
    const response = await fileServer.handleRequest(req);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello World");
  });

  it("should prevent directory traversal", async () => {
    const _req = new Request(
      "http://localhost:3000/static/../../../etc/passwd"
    );
    const response = await fileServer.handleRequest(_req);
    expect(response.status).toBe(403);
  });

  it("should prevent absolute paths", async () => {
    const _req = new Request("http://localhost:3000/static/absolute/path.txt");
    const response = await fileServer.handleRequest(_req);
    expect(response.status).toBe(403);
  });
});

describe("Robust Router", () => {
  it("should handle routes with fallbacks", async () => {
    const router = createRobustRouter();
    const req = new Request("http://localhost:3000/api/v1/users/invalid");
    const response = await router(req);
    expect(response.status).toBe(400);
  });

  it("should handle errors gracefully", async () => {
    const router = createRobustRouter();
    const req = new Request("http://localhost:3000/api/v1/posts/test-post");
    const response = await router(req);
    expect(await response.text()).toBe("Post test-post");
  });
});

describe("OpenAPI Pattern Generation", () => {
  it("should generate patterns from OpenAPI spec", () => {
    const spec = {
      paths: {
        "/users/{userId}": {
          get: { summary: "Get user by ID" },
          put: { summary: "Update user" },
        },
        "/posts/{year}/{month}/{slug}": {
          get: { summary: "Get post by date and slug" },
        },
      },
    };

    const patterns = generatePatternsFromOpenAPI(spec);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].patternString).toContain("/users/:userId");
    expect(patterns[2].patternString).toContain("/posts/:year/:month/:slug");
    expect(patterns[0].description).toBe("Get user by ID");
  });
});

describe("Pattern Validator", () => {
  let validator: PatternValidator;

  beforeEach(() => {
    validator = new PatternValidator();
    validator.addPattern(URLPatternExamples.userPattern);
    validator.addPattern(URLPatternExamples.emailPattern);
  });

  it("should validate URLs against patterns", () => {
    const result1 = validator.validateUrl("/users/123");
    expect(result1.valid).toBe(true);
    expect(result1.params?.id).toBe("123");

    const result2 = validator.validateUrl("/users/abc");
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain("does not match pattern");
  });

  it("should cache validation results", () => {
    const url = "/users/123";

    // First call
    const result1 = validator.validateUrl(url);
    expect(result1.valid).toBe(true);

    // Second call should use cache
    const result2 = validator.validateUrl(url);
    expect(result2.valid).toBe(true);
    expect(result2).toBe(result1); // Same cached object
  });

  it("should clear cache", () => {
    validator.validateUrl("/users/123");
    validator.clearCache();

    // After clearing cache, should re-validate
    const result = validator.validateUrl("/users/123");
    expect(result.valid).toBe(true);
  });
});

describe("Demo Router", () => {
  it("should create a functional demo router", () => {
    const router = createDemoRouter();
    expect(router).toBeInstanceOf(RouteManager);
  });
});

describe("Exported Patterns", () => {
  it("should export all pattern types", () => {
    expect(Patterns.user).toBe(URLPatternExamples.userPattern);
    expect(Patterns.email).toBe(URLPatternExamples.emailPattern);
    expect(Patterns.slug).toBe(URLPatternExamples.slugPattern);
    expect(Patterns.date).toBe(URLPatternExamples.datePattern);
    expect(Patterns.search).toBe(URLPatternExamples.searchPattern);
    expect(Patterns.filter).toBe(URLPatternExamples.filterPattern);
    expect(Patterns.file).toBe(URLPatternExamples.filePattern);
  });
});

describe("Integration Tests", () => {
  it("should handle complex routing scenarios", async () => {
    const router = createDemoRouter();

    // Test user route
    const userReq = new Request("http://localhost:3000/users/123");
    const userResponse = await router.handleRequest(userReq);
    expect(userResponse.status).toBe(401); // Unauthorized due to middleware

    // Test without auth middleware
    const simpleRouter = new RouteManager();
    simpleRouter.addRoute(
      "user",
      URLPatternExamples.userPattern,
      (req, params) => new Response(`User ${params.id}`)
    );

    const simpleReq = new Request("http://localhost:3000/users/123");
    const simpleResponse = await simpleRouter.handleRequest(simpleReq);
    expect(await simpleResponse.text()).toBe("User 123");
  });

  it("should validate complex date patterns", async () => {
    const router = new RouteManager();
    router.addRoute(
      "postByDate",
      URLPatternExamples.datePattern,
      (req, params) =>
        new Response(
          `Post from ${params.year}-${params.month}-${params.day}: ${params.slug}`
        )
    );

    const validReq = new Request(
      "http://localhost:3000/posts/2024/12/20/bunrelease"
    );
    const validResponse = await router.handleRequest(validReq);
    expect(await validResponse.text()).toBe("Post from 2024-12-20: bunrelease");

    const invalidReq = new Request(
      "http://localhost:3000/posts/24/12/20/bunrelease"
    );
    const invalidResponse = await router.handleRequest(invalidReq);
    expect(invalidResponse.status).toBe(400);
  });

  it("should apply middleware", async () => {
    const middleware = async (
      _req: Request,
      params: Record<string, string>
    ) => {
      if (params.id === "123") {
        return new Response("Middleware blocked", { status: 403 });
      }
    };

    const routeManager = new RouteManager();
    routeManager.addRoute(
      "protected-user",
      URLPatternExamples.userPattern,
      async (_req, params) => new Response(`User ${params.id}`),
      {
        middleware,
      },
      true
    );

    const validReq = new Request("http://localhost:3000/users/456");
    const validResponse = await routeManager.handleRequest(validReq);
    expect(validResponse.status).toBe(200);

    const blockedReq = new Request("http://localhost:3000/users/123");
    const blockedResponse = await routeManager.handleRequest(blockedReq);
    expect(blockedResponse.status).toBe(403);
  });
});
