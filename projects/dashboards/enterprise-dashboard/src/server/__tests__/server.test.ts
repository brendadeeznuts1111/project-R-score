import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { serve } from "bun";
import type { ApiResponse, Project, DashboardStats, DashboardData, UIState } from "../../types";

// =============================================================================
// Test Server Setup
// =============================================================================

describe("Enterprise Dashboard Server", () => {
  let server: ReturnType<typeof serve>;
  let cookies: Map<string, string>;

  beforeAll(() => {
    cookies = new Map();

    server = serve({
      port: 0, // Random port for testing
      routes: {
        "/health": new Response("OK"),
        "/ready": new Response("Ready", { headers: { "X-Ready": "1" } }),

        "/api/dashboard": () =>
          Response.json({
            data: {
              projects: [
                { id: "1", name: "test-project", branch: "main", status: "clean", modifiedFiles: 0, remote: "up-to-date", aheadBy: 0, behindBy: 0, lastCommit: "test", lastActivity: new Date(), health: 100 },
                { id: "2", name: "demo-app", branch: "develop", status: "modified", modifiedFiles: 5, remote: "ahead", aheadBy: 3, behindBy: 0, lastCommit: "feat: add feature", lastActivity: new Date(), health: 85 },
              ],
              stats: { totalRequests: 100, successRate: 99, avgLatency: 15, uptime: 3600, timeline: [], alerts: [] },
            },
          } satisfies ApiResponse<DashboardData>),

        "/api/projects": () =>
          Response.json({
            data: [
              { id: "1", name: "test-project", branch: "main", status: "clean", modifiedFiles: 0, remote: "up-to-date", aheadBy: 0, behindBy: 0, lastCommit: "test", lastActivity: new Date(), health: 100 },
            ],
          } satisfies ApiResponse<Project[]>),

        "/api/projects/:projectId": (req) => {
          const { projectId } = req.params;
          if (projectId === "not-found" || projectId === "999") {
            return Response.json({ error: "Project not found" } satisfies ApiResponse<never>, { status: 404 });
          }
          return Response.json({
            data: { id: projectId, name: `project-${projectId}`, branch: "main", status: "clean", modifiedFiles: 0, remote: "up-to-date", aheadBy: 0, behindBy: 0, lastCommit: "test", lastActivity: new Date(), health: 100 },
          } satisfies ApiResponse<Project>);
        },

        "/api/stats": () =>
          Response.json({
            data: { totalRequests: 100, successRate: 99, avgLatency: 15, uptime: 3600, timeline: [], alerts: [] },
          } satisfies ApiResponse<DashboardStats>),

        "/api/rescan": {
          POST: () => Response.json({ data: { status: "scanning" } } satisfies ApiResponse<{ status: string }>),
        },

        // Theme endpoints
        "/api/theme": {
          GET: (req) => {
            const theme = cookies.get("theme") || "dark";
            return Response.json({ data: { theme } } satisfies ApiResponse<{ theme: string }>);
          },
          POST: async (req) => {
            const body = await req.json() as { theme?: string };
            const theme = body.theme === "light" ? "light" : "dark";
            cookies.set("theme", theme);
            const response = Response.json({ data: { theme } } satisfies ApiResponse<{ theme: string }>);
            return new Response(response.body, {
              headers: { ...Object.fromEntries(response.headers), "Set-Cookie": `theme=${theme}; Path=/; Max-Age=31536000` },
            });
          },
        },

        // Session endpoints
        "/api/session": {
          GET: (req) => {
            let sessionId = cookies.get("session_id");
            if (!sessionId) {
              sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              cookies.set("session_id", sessionId);
            }
            return Response.json({
              data: {
                sessionId,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                pageViews: 1,
                activeSessions: 1,
              },
            });
          },
        },

        // UI State endpoints
        "/api/ui-state": {
          GET: (req) => {
            const uiStateCookie = cookies.get("ui_state");
            const defaultState: UIState = { collapsedProjects: {}, sidebarCollapsed: false, recentFilters: [], lastVisited: {} };
            const uiState: UIState = uiStateCookie ? JSON.parse(uiStateCookie) : defaultState;
            return Response.json({ data: { uiState } } satisfies ApiResponse<{ uiState: UIState }>);
          },
          POST: async (req) => {
            const body = (await req.json()) as Partial<UIState>;
            const existingCookie = cookies.get("ui_state");
            const defaultState: UIState = { collapsedProjects: {}, sidebarCollapsed: false, recentFilters: [], lastVisited: {} };
            const existingState: UIState = existingCookie ? JSON.parse(existingCookie) : defaultState;
            const updatedState: UIState = { ...existingState, ...body };
            cookies.set("ui_state", JSON.stringify(updatedState));
            return Response.json({ data: { uiState: updatedState } } satisfies ApiResponse<{ uiState: UIState }>);
          },
          DELETE: (req) => {
            cookies.delete("ui_state");
            return Response.json({ data: { cleared: true } } satisfies ApiResponse<{ cleared: boolean }>);
          },
        },

        // Logout endpoint
        "/api/logout": {
          POST: (req) => {
            cookies.delete("session_id");
            cookies.delete("ui_state");
            cookies.delete("theme");
            return Response.json({
              data: { cleared: true, cookies: ["session_id", "ui_state", "theme"] },
            } satisfies ApiResponse<{ cleared: boolean; cookies: string[] }>);
          },
        },

        // Bulk cookies endpoint
        "/api/cookies": {
          GET: (req) => {
            const theme = cookies.get("theme") || "dark";
            const uiStateCookie = cookies.get("ui_state");
            const sessionId = cookies.get("session_id");
            const defaultState: UIState = { collapsedProjects: {}, sidebarCollapsed: false, recentFilters: [], lastVisited: {} };
            const uiState: UIState = uiStateCookie ? JSON.parse(uiStateCookie) : defaultState;
            return Response.json({
              data: { theme, uiState, hasSession: !!sessionId, cookieCount: cookies.size },
            });
          },
          POST: async (req) => {
            const body = await req.json() as { theme?: "dark" | "light"; uiState?: Partial<UIState> };
            if (body.theme) cookies.set("theme", body.theme);
            if (body.uiState) {
              const existing = cookies.get("ui_state");
              const existingState = existing ? JSON.parse(existing) : {};
              cookies.set("ui_state", JSON.stringify({ ...existingState, ...body.uiState }));
            }
            return Response.json({ data: { updated: true } });
          },
        },
      },

      fetch(req) {
        return Response.json({ error: "Not found" }, { status: 404 });
      },
    });
  });

  afterAll(() => {
    server.stop();
  });

  beforeEach(() => {
    cookies.clear();
  });

  const getUrl = (path: string) => `http://${server.hostname}:${server.port}${path}`;

  // ===========================================================================
  // Health Check Tests
  // ===========================================================================

  describe("Health endpoints", () => {
    test("GET /health returns OK", async () => {
      const response = await fetch(getUrl("/health"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    test("GET /ready returns Ready with custom header", async () => {
      const response = await fetch(getUrl("/ready"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Ready");
      expect(response.headers.get("X-Ready")).toBe("1");
    });

    test("Health endpoints respond quickly (< 50ms)", async () => {
      const start = performance.now();
      await fetch(getUrl("/health"));
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  // ===========================================================================
  // Dashboard API Tests
  // ===========================================================================

  describe("Dashboard API", () => {
    test("GET /api/dashboard returns complete dashboard data", async () => {
      const response = await fetch(getUrl("/api/dashboard"));
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");

      const data: ApiResponse<DashboardData> = await response.json();
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("projects");
      expect(data.data).toHaveProperty("stats");
      expect(Array.isArray(data.data?.projects)).toBe(true);
      expect(data.data?.projects.length).toBeGreaterThan(0);
    });

    test("Dashboard stats have required fields", async () => {
      const response = await fetch(getUrl("/api/dashboard"));
      const data: ApiResponse<DashboardData> = await response.json();

      const stats = data.data?.stats;
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("successRate");
      expect(stats).toHaveProperty("avgLatency");
      expect(stats).toHaveProperty("uptime");
      expect(stats).toHaveProperty("timeline");
      expect(stats).toHaveProperty("alerts");
    });

    test("Dashboard projects have required fields", async () => {
      const response = await fetch(getUrl("/api/dashboard"));
      const data: ApiResponse<DashboardData> = await response.json();

      const project = data.data?.projects[0];
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("branch");
      expect(project).toHaveProperty("status");
      expect(project).toHaveProperty("health");
    });
  });

  // ===========================================================================
  // Projects API Tests
  // ===========================================================================

  describe("Projects API", () => {
    test("GET /api/projects returns array of projects", async () => {
      const response = await fetch(getUrl("/api/projects"));
      expect(response.status).toBe(200);

      const data: ApiResponse<Project[]> = await response.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    test("GET /api/projects/:id returns specific project", async () => {
      const response = await fetch(getUrl("/api/projects/test-123"));
      expect(response.status).toBe(200);

      const data: ApiResponse<Project> = await response.json();
      expect(data).toHaveProperty("data");
      expect(data.data?.id).toBe("test-123");
    });

    test("GET /api/projects/:id returns 404 for non-existent project", async () => {
      const response = await fetch(getUrl("/api/projects/not-found"));
      expect(response.status).toBe(404);

      const data: ApiResponse<never> = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Project not found");
    });

    test("GET /api/projects/:id returns 404 for numeric not-found", async () => {
      const response = await fetch(getUrl("/api/projects/999"));
      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // Stats API Tests
  // ===========================================================================

  describe("Stats API", () => {
    test("GET /api/stats returns stats object", async () => {
      const response = await fetch(getUrl("/api/stats"));
      expect(response.status).toBe(200);

      const data: ApiResponse<DashboardStats> = await response.json();
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("totalRequests");
      expect(data.data).toHaveProperty("successRate");
      expect(data.data).toHaveProperty("avgLatency");
      expect(data.data).toHaveProperty("uptime");
    });

    test("Stats values are within valid ranges", async () => {
      const response = await fetch(getUrl("/api/stats"));
      const data: ApiResponse<DashboardStats> = await response.json();

      expect(data.data?.successRate).toBeGreaterThanOrEqual(0);
      expect(data.data?.successRate).toBeLessThanOrEqual(100);
      expect(data.data?.avgLatency).toBeGreaterThanOrEqual(0);
      expect(data.data?.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Rescan API Tests
  // ===========================================================================

  describe("Rescan API", () => {
    test("POST /api/rescan returns scanning status", async () => {
      const response = await fetch(getUrl("/api/rescan"), { method: "POST" });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ status: string }> = await response.json();
      expect(data).toHaveProperty("data");
      expect(data.data?.status).toBe("scanning");
    });

    test("GET /api/rescan returns 404 (method not allowed)", async () => {
      const response = await fetch(getUrl("/api/rescan"));
      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // Theme API Tests
  // ===========================================================================

  describe("Theme API", () => {
    test.serial("GET /api/theme returns default theme (dark)", async () => {
      const response = await fetch(getUrl("/api/theme"));
      expect(response.status).toBe(200);

      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("dark");
    });

    test("POST /api/theme sets theme to light", async () => {
      const response = await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "light" }),
      });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("light");
    });

    test("POST /api/theme sets theme to dark", async () => {
      const response = await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "dark" }),
      });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("dark");
    });

    test("POST /api/theme defaults invalid theme to dark", async () => {
      const response = await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "invalid" }),
      });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("dark");
    });

    test.serial("Theme persists across requests", async () => {
      // Set to light
      await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "light" }),
      });

      // Verify it persists
      const response = await fetch(getUrl("/api/theme"));
      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("light");
    });
  });

  // ===========================================================================
  // Session API Tests
  // ===========================================================================

  describe("Session API", () => {
    test("GET /api/session creates new session", async () => {
      const response = await fetch(getUrl("/api/session"));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveProperty("sessionId");
      expect(data.data.sessionId).toMatch(/^sess_/);
    });

    test("Session includes expected fields", async () => {
      const response = await fetch(getUrl("/api/session"));
      const data = await response.json();

      expect(data.data).toHaveProperty("firstSeen");
      expect(data.data).toHaveProperty("lastSeen");
      expect(data.data).toHaveProperty("pageViews");
      expect(data.data).toHaveProperty("activeSessions");
    });

    test.serial("Session ID is consistent across requests", async () => {
      const response1 = await fetch(getUrl("/api/session"));
      const data1 = await response1.json();

      const response2 = await fetch(getUrl("/api/session"));
      const data2 = await response2.json();

      expect(data1.data.sessionId).toBe(data2.data.sessionId);
    });
  });

  // ===========================================================================
  // UI State API Tests
  // ===========================================================================

  describe("UI State API", () => {
    test("GET /api/ui-state returns default state", async () => {
      const response = await fetch(getUrl("/api/ui-state"));
      expect(response.status).toBe(200);

      const data: ApiResponse<{ uiState: UIState }> = await response.json();
      expect(data.data?.uiState).toHaveProperty("collapsedProjects");
      expect(data.data?.uiState).toHaveProperty("sidebarCollapsed");
      expect(data.data?.uiState).toHaveProperty("recentFilters");
      expect(data.data?.uiState).toHaveProperty("lastVisited");
    });

    test("POST /api/ui-state updates sidebar state", async () => {
      const response = await fetch(getUrl("/api/ui-state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarCollapsed: true }),
      });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ uiState: UIState }> = await response.json();
      expect(data.data?.uiState.sidebarCollapsed).toBe(true);
    });

    test("POST /api/ui-state updates collapsed projects", async () => {
      const response = await fetch(getUrl("/api/ui-state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collapsedProjects: { "project-1": true, "project-2": false } }),
      });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ uiState: UIState }> = await response.json();
      expect(data.data?.uiState.collapsedProjects["project-1"]).toBe(true);
    });

    test("DELETE /api/ui-state clears state", async () => {
      // First set some state
      await fetch(getUrl("/api/ui-state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarCollapsed: true }),
      });

      // Clear it
      const response = await fetch(getUrl("/api/ui-state"), { method: "DELETE" });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ cleared: boolean }> = await response.json();
      expect(data.data?.cleared).toBe(true);
    });

    test.serial("UI state persists across requests", async () => {
      await fetch(getUrl("/api/ui-state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarCollapsed: true, recentFilters: ["status:clean"] }),
      });

      const response = await fetch(getUrl("/api/ui-state"));
      const data: ApiResponse<{ uiState: UIState }> = await response.json();
      expect(data.data?.uiState.sidebarCollapsed).toBe(true);
      expect(data.data?.uiState.recentFilters).toContain("status:clean");
    });
  });

  // ===========================================================================
  // Logout API Tests
  // ===========================================================================

  describe("Logout API", () => {
    test("POST /api/logout clears all cookies", async () => {
      // Set up some cookies first
      await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "light" }),
      });
      await fetch(getUrl("/api/session"));
      await fetch(getUrl("/api/ui-state"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarCollapsed: true }),
      });

      // Logout
      const response = await fetch(getUrl("/api/logout"), { method: "POST" });
      expect(response.status).toBe(200);

      const data: ApiResponse<{ cleared: boolean; cookies: string[] }> = await response.json();
      expect(data.data?.cleared).toBe(true);
      expect(data.data?.cookies).toContain("session_id");
      expect(data.data?.cookies).toContain("ui_state");
      expect(data.data?.cookies).toContain("theme");
    });

    test("After logout, theme returns to default", async () => {
      await fetch(getUrl("/api/theme"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "light" }),
      });

      await fetch(getUrl("/api/logout"), { method: "POST" });

      const response = await fetch(getUrl("/api/theme"));
      const data: ApiResponse<{ theme: string }> = await response.json();
      expect(data.data?.theme).toBe("dark");
    });
  });

  // ===========================================================================
  // Bulk Cookies API Tests
  // ===========================================================================

  describe("Bulk Cookies API", () => {
    test("GET /api/cookies returns all preferences", async () => {
      const response = await fetch(getUrl("/api/cookies"));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveProperty("theme");
      expect(data.data).toHaveProperty("uiState");
      expect(data.data).toHaveProperty("hasSession");
      expect(data.data).toHaveProperty("cookieCount");
    });

    test("POST /api/cookies updates multiple preferences", async () => {
      const response = await fetch(getUrl("/api/cookies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: "light",
          uiState: { sidebarCollapsed: true },
        }),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data?.updated).toBe(true);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe("Error Handling", () => {
    test("Unknown route returns 404", async () => {
      const response = await fetch(getUrl("/unknown/path"));
      expect(response.status).toBe(404);
    });

    test("404 response is JSON", async () => {
      const response = await fetch(getUrl("/unknown/path"));
      expect(response.headers.get("Content-Type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    test("Deep unknown routes return 404", async () => {
      const response = await fetch(getUrl("/api/v2/unknown/deeply/nested"));
      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // Performance Tests
  // ===========================================================================

  describe("Performance", () => {
    test("API responses are fast (< 100ms)", async () => {
      const endpoints = ["/api/dashboard", "/api/projects", "/api/stats"];

      for (const endpoint of endpoints) {
        const start = performance.now();
        await fetch(getUrl(endpoint));
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100);
      }
    });

    test("Concurrent requests are handled", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => fetch(getUrl("/api/dashboard")));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  // ===========================================================================
  // Content-Type Tests
  // ===========================================================================

  describe("Content-Type Headers", () => {
    test("JSON endpoints return application/json", async () => {
      const endpoints = ["/api/dashboard", "/api/projects", "/api/stats"];

      for (const endpoint of endpoints) {
        const response = await fetch(getUrl(endpoint));
        expect(response.headers.get("Content-Type")).toContain("application/json");
      }
    });

    test("Health endpoint returns text", async () => {
      const response = await fetch(getUrl("/health"));
      expect(response.headers.get("Content-Type")).toContain("text/plain");
    });
  });

  // ===========================================================================
  // Type Validation Tests
  // ===========================================================================

  describe("Type Validation", () => {
    describe("Project Type", () => {
      test("Project has correct id type (string)", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.id).toBe("string");
      });

      test("Project has correct name type (string)", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.name).toBe("string");
      });

      test("Project has correct branch type (string)", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.branch).toBe("string");
      });

      test("Project status is valid enum value", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();
        const validStatuses = ["clean", "modified", "staged", "conflict"];
        data.data?.projects.forEach((project) => {
          expect(validStatuses).toContain(project.status);
        });
      });

      test("Project remote is valid enum value", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();
        const validRemotes = ["ahead", "behind", "up-to-date", "diverged"];
        data.data?.projects.forEach((project) => {
          expect(validRemotes).toContain(project.remote);
        });
      });

      test("Project modifiedFiles is number", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.modifiedFiles).toBe("number");
      });

      test("Project aheadBy is number", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.aheadBy).toBe("number");
      });

      test("Project behindBy is number", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.behindBy).toBe("number");
      });

      test("Project health is number between 0-100", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();
        data.data?.projects.forEach((project) => {
          expect(typeof project.health).toBe("number");
          expect(project.health).toBeGreaterThanOrEqual(0);
          expect(project.health).toBeLessThanOrEqual(100);
        });
      });

      test("Project lastCommit is string", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        expect(typeof data.data?.lastCommit).toBe("string");
      });
    });

    describe("DashboardStats Type", () => {
      test("totalRequests is number", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(typeof data.data?.totalRequests).toBe("number");
      });

      test("successRate is number", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(typeof data.data?.successRate).toBe("number");
      });

      test("avgLatency is number", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(typeof data.data?.avgLatency).toBe("number");
      });

      test("uptime is number", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(typeof data.data?.uptime).toBe("number");
      });

      test("timeline is array", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(Array.isArray(data.data?.timeline)).toBe(true);
      });

      test("alerts is array", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        expect(Array.isArray(data.data?.alerts)).toBe(true);
      });
    });

    describe("UIState Type", () => {
      test("collapsedProjects is object", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        expect(typeof data.data?.uiState.collapsedProjects).toBe("object");
      });

      test("sidebarCollapsed is boolean", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        expect(typeof data.data?.uiState.sidebarCollapsed).toBe("boolean");
      });

      test("recentFilters is array", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        expect(Array.isArray(data.data?.uiState.recentFilters)).toBe(true);
      });

      test("lastVisited is object", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        expect(typeof data.data?.uiState.lastVisited).toBe("object");
      });
    });

    describe("Theme Type", () => {
      test("theme is string", async () => {
        const response = await fetch(getUrl("/api/theme"));
        const data: ApiResponse<{ theme: string }> = await response.json();
        expect(typeof data.data?.theme).toBe("string");
      });

      test("theme is valid value (dark or light)", async () => {
        const response = await fetch(getUrl("/api/theme"));
        const data: ApiResponse<{ theme: string }> = await response.json();
        expect(data.data?.theme).toBeDefined();
        expect(["dark", "light"]).toContain(data.data!.theme);
      });
    });

    describe("Session Type", () => {
      test("sessionId is string", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        expect(typeof data.data?.sessionId).toBe("string");
      });

      test("pageViews is number", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        expect(typeof data.data?.pageViews).toBe("number");
      });

      test("activeSessions is number", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        expect(typeof data.data?.activeSessions).toBe("number");
      });

      test("firstSeen is ISO date string", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        expect(typeof data.data?.firstSeen).toBe("string");
        expect(() => new Date(data.data?.firstSeen)).not.toThrow();
      });

      test("lastSeen is ISO date string", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        expect(typeof data.data?.lastSeen).toBe("string");
        expect(() => new Date(data.data?.lastSeen)).not.toThrow();
      });
    });
  });

  // ===========================================================================
  // Property Validation Tests
  // ===========================================================================

  describe("Property Validation", () => {
    describe("ApiResponse Properties", () => {
      test("Success response has data property, no error", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();
        expect(data).toHaveProperty("data");
        expect(data).not.toHaveProperty("error");
      });

      test("Error response has error property, no data", async () => {
        const response = await fetch(getUrl("/api/projects/not-found"));
        const data: ApiResponse<never> = await response.json();
        expect(data).toHaveProperty("error");
        expect(data.data).toBeUndefined();
      });
    });

    describe("Project Required Properties", () => {
      test("Project has all required properties", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        const project = data.data;

        const requiredProps = [
          "id", "name", "branch", "status", "modifiedFiles",
          "remote", "aheadBy", "behindBy", "lastCommit", "lastActivity", "health"
        ];

        requiredProps.forEach((prop) => {
          expect(project).toHaveProperty(prop);
        });
      });

      test("Project properties are not null", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        const project = data.data;

        expect(project?.id).not.toBeNull();
        expect(project?.name).not.toBeNull();
        expect(project?.branch).not.toBeNull();
        expect(project?.status).not.toBeNull();
        expect(project?.health).not.toBeNull();
      });

      test("Project properties are not empty strings where applicable", async () => {
        const response = await fetch(getUrl("/api/projects/test-123"));
        const data: ApiResponse<Project> = await response.json();
        const project = data.data;

        expect(project?.id.length).toBeGreaterThan(0);
        expect(project?.name.length).toBeGreaterThan(0);
        expect(project?.branch.length).toBeGreaterThan(0);
      });
    });

    describe("DashboardStats Required Properties", () => {
      test("Stats has all required properties", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        const stats = data.data;

        const requiredProps = [
          "totalRequests", "successRate", "avgLatency", "uptime", "timeline", "alerts"
        ];

        requiredProps.forEach((prop) => {
          expect(stats).toHaveProperty(prop);
        });
      });

      test("Stats numeric properties are non-negative", async () => {
        const response = await fetch(getUrl("/api/stats"));
        const data: ApiResponse<DashboardStats> = await response.json();
        const stats = data.data;

        expect(stats?.totalRequests).toBeGreaterThanOrEqual(0);
        expect(stats?.successRate).toBeGreaterThanOrEqual(0);
        expect(stats?.avgLatency).toBeGreaterThanOrEqual(0);
        expect(stats?.uptime).toBeGreaterThanOrEqual(0);
      });
    });

    describe("DashboardData Required Properties", () => {
      test("Dashboard has projects and stats", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();

        expect(data.data).toHaveProperty("projects");
        expect(data.data).toHaveProperty("stats");
      });

      test("Dashboard projects is non-empty array", async () => {
        const response = await fetch(getUrl("/api/dashboard"));
        const data: ApiResponse<DashboardData> = await response.json();

        expect(Array.isArray(data.data?.projects)).toBe(true);
        expect(data.data?.projects.length).toBeGreaterThan(0);
      });
    });

    describe("UIState Required Properties", () => {
      test("UIState has all required properties", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        const uiState = data.data?.uiState;

        const requiredProps = [
          "collapsedProjects", "sidebarCollapsed", "recentFilters", "lastVisited"
        ];

        requiredProps.forEach((prop) => {
          expect(uiState).toHaveProperty(prop);
        });
      });

      test("UIState default values are correct", async () => {
        const response = await fetch(getUrl("/api/ui-state"));
        const data: ApiResponse<{ uiState: UIState }> = await response.json();
        const uiState = data.data?.uiState;

        expect(uiState?.sidebarCollapsed).toBe(false);
        expect(Object.keys(uiState?.collapsedProjects || {})).toHaveLength(0);
        expect(uiState?.recentFilters).toHaveLength(0);
        expect(Object.keys(uiState?.lastVisited || {})).toHaveLength(0);
      });
    });

    describe("Session Required Properties", () => {
      test("Session has all required properties", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();
        const session = data.data;

        const requiredProps = [
          "sessionId", "firstSeen", "lastSeen", "pageViews", "activeSessions"
        ];

        requiredProps.forEach((prop) => {
          expect(session).toHaveProperty(prop);
        });
      });

      test("Session ID has correct format", async () => {
        const response = await fetch(getUrl("/api/session"));
        const data = await response.json();

        expect(data.data?.sessionId).toMatch(/^sess_\d+_[a-z0-9]+$/);
      });
    });

    describe("Cookies Endpoint Properties", () => {
      test("Cookies endpoint returns all expected properties", async () => {
        const response = await fetch(getUrl("/api/cookies"));
        const data = await response.json();

        expect(data.data).toHaveProperty("theme");
        expect(data.data).toHaveProperty("uiState");
        expect(data.data).toHaveProperty("hasSession");
        expect(data.data).toHaveProperty("cookieCount");
      });

      test("hasSession is boolean", async () => {
        const response = await fetch(getUrl("/api/cookies"));
        const data = await response.json();

        expect(typeof data.data?.hasSession).toBe("boolean");
      });

      test("cookieCount is number", async () => {
        const response = await fetch(getUrl("/api/cookies"));
        const data = await response.json();

        expect(typeof data.data?.cookieCount).toBe("number");
        expect(data.data?.cookieCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Logout Response Properties", () => {
      test("Logout returns cleared flag and cookie list", async () => {
        const response = await fetch(getUrl("/api/logout"), { method: "POST" });
        const data: ApiResponse<{ cleared: boolean; cookies: string[] }> = await response.json();

        expect(data.data).toHaveProperty("cleared");
        expect(data.data).toHaveProperty("cookies");
        expect(typeof data.data?.cleared).toBe("boolean");
        expect(Array.isArray(data.data?.cookies)).toBe(true);
      });

      test("Logout cookie list contains expected cookies", async () => {
        const response = await fetch(getUrl("/api/logout"), { method: "POST" });
        const data: ApiResponse<{ cleared: boolean; cookies: string[] }> = await response.json();

        expect(data.data?.cookies).toContain("session_id");
        expect(data.data?.cookies).toContain("ui_state");
        expect(data.data?.cookies).toContain("theme");
        expect(data.data?.cookies).toHaveLength(3);
      });
    });
  });
});
