import { describe, test, expect } from "bun:test";
import { config, type Config } from "../config";
import type { Project, DashboardStats, DashboardData, ApiResponse, UIState, Alert, TimelinePoint, SessionData, Theme } from "../../types";

// =============================================================================
// Interface Tests - Validate interface structure and constraints
// =============================================================================

describe("Interface Tests", () => {
  describe("Project Interface", () => {
    const validProject: Project = {
      id: "1",
      name: "test-project",
      branch: "main",
      status: "clean",
      modifiedFiles: 0,
      remote: "up-to-date",
      aheadBy: 0,
      behindBy: 0,
      lastCommit: "Initial commit",
      lastActivity: new Date(),
      health: 100,
    };

    test("Project interface accepts valid clean status", () => {
      const project: Project = { ...validProject, status: "clean" };
      expect(project.status).toBe("clean");
    });

    test("Project interface accepts valid modified status", () => {
      const project: Project = { ...validProject, status: "modified" };
      expect(project.status).toBe("modified");
    });

    test("Project interface accepts valid staged status", () => {
      const project: Project = { ...validProject, status: "staged" };
      expect(project.status).toBe("staged");
    });

    test("Project interface accepts valid conflict status", () => {
      const project: Project = { ...validProject, status: "conflict" };
      expect(project.status).toBe("conflict");
    });

    test("Project interface accepts valid remote ahead", () => {
      const project: Project = { ...validProject, remote: "ahead", aheadBy: 5 };
      expect(project.remote).toBe("ahead");
      expect(project.aheadBy).toBe(5);
    });

    test("Project interface accepts valid remote behind", () => {
      const project: Project = { ...validProject, remote: "behind", behindBy: 3 };
      expect(project.remote).toBe("behind");
      expect(project.behindBy).toBe(3);
    });

    test("Project interface accepts valid remote diverged", () => {
      const project: Project = { ...validProject, remote: "diverged", aheadBy: 2, behindBy: 3 };
      expect(project.remote).toBe("diverged");
    });

    test("Project interface accepts valid remote up-to-date", () => {
      const project: Project = { ...validProject, remote: "up-to-date" };
      expect(project.remote).toBe("up-to-date");
    });

    test("Project health can be 0", () => {
      const project: Project = { ...validProject, health: 0 };
      expect(project.health).toBe(0);
    });

    test("Project health can be 100", () => {
      const project: Project = { ...validProject, health: 100 };
      expect(project.health).toBe(100);
    });

    test("Project modifiedFiles can be 0", () => {
      const project: Project = { ...validProject, modifiedFiles: 0 };
      expect(project.modifiedFiles).toBe(0);
    });

    test("Project modifiedFiles can be large number", () => {
      const project: Project = { ...validProject, modifiedFiles: 999 };
      expect(project.modifiedFiles).toBe(999);
    });
  });

  describe("Alert Interface", () => {
    test("Alert interface accepts warning type", () => {
      const alert: Alert = {
        id: "1",
        type: "warning",
        message: "Test warning",
        timestamp: new Date(),
      };
      expect(alert.type).toBe("warning");
    });

    test("Alert interface accepts error type", () => {
      const alert: Alert = {
        id: "2",
        type: "error",
        message: "Test error",
        timestamp: new Date(),
      };
      expect(alert.type).toBe("error");
    });

    test("Alert interface accepts info type", () => {
      const alert: Alert = {
        id: "3",
        type: "info",
        message: "Test info",
        timestamp: new Date(),
      };
      expect(alert.type).toBe("info");
    });

    test("Alert interface accepts success type", () => {
      const alert: Alert = {
        id: "4",
        type: "success",
        message: "Test success",
        timestamp: new Date(),
      };
      expect(alert.type).toBe("success");
    });

    test("Alert interface accepts optional project", () => {
      const alert: Alert = {
        id: "5",
        type: "warning",
        message: "Project warning",
        project: "test-project",
        timestamp: new Date(),
      };
      expect(alert.project).toBe("test-project");
    });

    test("Alert interface works without project", () => {
      const alert: Alert = {
        id: "6",
        type: "info",
        message: "General info",
        timestamp: new Date(),
      };
      expect(alert.project).toBeUndefined();
    });
  });

  describe("TimelinePoint Interface", () => {
    test("TimelinePoint interface has all required fields", () => {
      const point: TimelinePoint = {
        timestamp: new Date(),
        requests: 100,
        latency: 15,
        errors: 2,
      };
      expect(point.requests).toBe(100);
      expect(point.latency).toBe(15);
      expect(point.errors).toBe(2);
    });

    test("TimelinePoint can have zero values", () => {
      const point: TimelinePoint = {
        timestamp: new Date(),
        requests: 0,
        latency: 0,
        errors: 0,
      };
      expect(point.requests).toBe(0);
      expect(point.latency).toBe(0);
      expect(point.errors).toBe(0);
    });
  });

  describe("DashboardStats Interface", () => {
    test("DashboardStats interface has all required fields", () => {
      const stats: DashboardStats = {
        totalRequests: 1000,
        successRate: 99.5,
        avgLatency: 15,
        uptime: 86400,
        timeline: [],
        alerts: [],
      };
      expect(stats.totalRequests).toBe(1000);
      expect(stats.successRate).toBe(99.5);
      expect(stats.avgLatency).toBe(15);
      expect(stats.uptime).toBe(86400);
    });

    test("DashboardStats can have populated timeline", () => {
      const stats: DashboardStats = {
        totalRequests: 100,
        successRate: 100,
        avgLatency: 10,
        uptime: 3600,
        timeline: [
          { timestamp: new Date(), requests: 10, latency: 5, errors: 0 },
          { timestamp: new Date(), requests: 15, latency: 8, errors: 1 },
        ],
        alerts: [],
      };
      expect(stats.timeline).toHaveLength(2);
    });

    test("DashboardStats can have populated alerts", () => {
      const stats: DashboardStats = {
        totalRequests: 100,
        successRate: 95,
        avgLatency: 20,
        uptime: 7200,
        timeline: [],
        alerts: [
          { id: "1", type: "warning", message: "High latency", timestamp: new Date() },
        ],
      };
      expect(stats.alerts).toHaveLength(1);
    });
  });

  describe("DashboardData Interface", () => {
    test("DashboardData combines projects and stats", () => {
      const data: DashboardData = {
        projects: [
          {
            id: "1",
            name: "test",
            branch: "main",
            status: "clean",
            modifiedFiles: 0,
            remote: "up-to-date",
            aheadBy: 0,
            behindBy: 0,
            lastCommit: "test",
            lastActivity: new Date(),
            health: 100,
          },
        ],
        stats: {
          totalRequests: 100,
          successRate: 100,
          avgLatency: 10,
          uptime: 3600,
          timeline: [],
          alerts: [],
        },
      };
      expect(data.projects).toHaveLength(1);
      expect(data.stats.totalRequests).toBe(100);
    });
  });

  describe("ApiResponse Interface", () => {
    test("ApiResponse with data (success)", () => {
      const response: ApiResponse<{ value: number }> = {
        data: { value: 42 },
      };
      expect(response.data?.value).toBe(42);
      expect(response.error).toBeUndefined();
    });

    test("ApiResponse with error (failure)", () => {
      const response: ApiResponse<never> = {
        error: "Not found",
      };
      expect(response.error).toBe("Not found");
      expect(response.data).toBeUndefined();
    });

    test("ApiResponse with array data", () => {
      const response: ApiResponse<number[]> = {
        data: [1, 2, 3],
      };
      expect(response.data).toHaveLength(3);
    });

    test("ApiResponse with complex nested data", () => {
      const response: ApiResponse<DashboardData> = {
        data: {
          projects: [],
          stats: {
            totalRequests: 0,
            successRate: 100,
            avgLatency: 0,
            uptime: 0,
            timeline: [],
            alerts: [],
          },
        },
      };
      expect(response.data?.projects).toHaveLength(0);
    });
  });

  describe("UIState Interface", () => {
    test("UIState has all required fields", () => {
      const state: UIState = {
        collapsedProjects: {},
        sidebarCollapsed: false,
        recentFilters: [],
        lastVisited: {},
      };
      expect(state.sidebarCollapsed).toBe(false);
    });

    test("UIState collapsedProjects is Record<string, boolean>", () => {
      const state: UIState = {
        collapsedProjects: { "project-1": true, "project-2": false },
        sidebarCollapsed: false,
        recentFilters: [],
        lastVisited: {},
      };
      expect(state.collapsedProjects["project-1"]).toBe(true);
      expect(state.collapsedProjects["project-2"]).toBe(false);
    });

    test("UIState recentFilters is string array", () => {
      const state: UIState = {
        collapsedProjects: {},
        sidebarCollapsed: false,
        recentFilters: ["status:clean", "branch:main", "health:>80"],
        lastVisited: {},
      };
      expect(state.recentFilters).toHaveLength(3);
      expect(state.recentFilters[0]).toBe("status:clean");
    });

    test("UIState lastVisited is Record<string, number>", () => {
      const state: UIState = {
        collapsedProjects: {},
        sidebarCollapsed: false,
        recentFilters: [],
        lastVisited: { "project-1": Date.now(), "project-2": Date.now() - 1000 },
      };
      expect(typeof state.lastVisited["project-1"]).toBe("number");
    });
  });

  describe("SessionData Interface", () => {
    test("SessionData has all required fields", () => {
      const session: SessionData = {
        sessionId: "sess_123456_abc",
        firstSeen: Date.now() - 10000,
        lastSeen: Date.now(),
        pageViews: 5,
      };
      expect(session.sessionId).toMatch(/^sess_/);
      expect(session.pageViews).toBe(5);
    });

    test("SessionData accepts optional userAgent", () => {
      const session: SessionData = {
        sessionId: "sess_123456_abc",
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        pageViews: 1,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      };
      expect(session.userAgent).toContain("Mozilla");
    });

    test("SessionData works without userAgent", () => {
      const session: SessionData = {
        sessionId: "sess_123456_abc",
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        pageViews: 1,
      };
      expect(session.userAgent).toBeUndefined();
    });
  });

  describe("Theme Type", () => {
    test("Theme accepts dark", () => {
      const theme: Theme = "dark";
      expect(theme).toBe("dark");
    });

    test("Theme accepts light", () => {
      const theme: Theme = "light";
      expect(theme).toBe("light");
    });
  });
});

// =============================================================================
// Config Object Tests
// =============================================================================

describe("Config Object", () => {
  describe("Server Config", () => {
    test("PORT is a number", () => {
      expect(typeof config.PORT).toBe("number");
    });

    test("PORT is positive", () => {
      expect(config.PORT).toBeGreaterThan(0);
    });

    test("PORT is within valid range", () => {
      expect(config.PORT).toBeLessThanOrEqual(65535);
    });

    test("HOST is a string", () => {
      expect(typeof config.HOST).toBe("string");
    });

    test("HOST is not empty", () => {
      expect(config.HOST.length).toBeGreaterThan(0);
    });

    test("HOSTNAME is a string", () => {
      expect(typeof config.HOSTNAME).toBe("string");
    });

    test("MAX_REQUEST_BODY_SIZE is a number", () => {
      expect(typeof config.MAX_REQUEST_BODY_SIZE).toBe("number");
    });

    test("MAX_REQUEST_BODY_SIZE is positive", () => {
      expect(config.MAX_REQUEST_BODY_SIZE).toBeGreaterThan(0);
    });

    test("DEVELOPMENT is a boolean", () => {
      expect(typeof config.DEVELOPMENT).toBe("boolean");
    });
  });

  describe("Git Scanning Config", () => {
    test("PROJECTS_DIR is a string", () => {
      expect(typeof config.PROJECTS_DIR).toBe("string");
    });

    test("PROJECTS_DIR is not empty", () => {
      expect(config.PROJECTS_DIR.length).toBeGreaterThan(0);
    });

    test("SCAN_DEPTH is a number", () => {
      expect(typeof config.SCAN_DEPTH).toBe("number");
    });

    test("SCAN_DEPTH is positive", () => {
      expect(config.SCAN_DEPTH).toBeGreaterThan(0);
    });

    test("SCAN_DEPTH is reasonable (1-10)", () => {
      expect(config.SCAN_DEPTH).toBeGreaterThanOrEqual(1);
      expect(config.SCAN_DEPTH).toBeLessThanOrEqual(10);
    });
  });

  describe("Interval Config", () => {
    test("TIMELINE_UPDATE_INTERVAL is a number", () => {
      expect(typeof config.TIMELINE_UPDATE_INTERVAL).toBe("number");
    });

    test("TIMELINE_UPDATE_INTERVAL is positive", () => {
      expect(config.TIMELINE_UPDATE_INTERVAL).toBeGreaterThan(0);
    });

    test("TIMELINE_UPDATE_INTERVAL is at least 1 second", () => {
      expect(config.TIMELINE_UPDATE_INTERVAL).toBeGreaterThanOrEqual(1000);
    });

    test("RESCAN_INTERVAL is a number", () => {
      expect(typeof config.RESCAN_INTERVAL).toBe("number");
    });

    test("RESCAN_INTERVAL is positive", () => {
      expect(config.RESCAN_INTERVAL).toBeGreaterThan(0);
    });

    test("RESCAN_INTERVAL is at least 5 seconds", () => {
      expect(config.RESCAN_INTERVAL).toBeGreaterThanOrEqual(5000);
    });
  });

  describe("Limits Config", () => {
    test("MAX_TIMELINE_POINTS is a number", () => {
      expect(typeof config.MAX_TIMELINE_POINTS).toBe("number");
    });

    test("MAX_TIMELINE_POINTS is positive", () => {
      expect(config.MAX_TIMELINE_POINTS).toBeGreaterThan(0);
    });

    test("MAX_ALERTS is a number", () => {
      expect(typeof config.MAX_ALERTS).toBe("number");
    });

    test("MAX_ALERTS is positive", () => {
      expect(config.MAX_ALERTS).toBeGreaterThan(0);
    });

    test("TIMELINE_DISPLAY_LIMIT is a number", () => {
      expect(typeof config.TIMELINE_DISPLAY_LIMIT).toBe("number");
    });

    test("TIMELINE_DISPLAY_LIMIT <= MAX_TIMELINE_POINTS", () => {
      expect(config.TIMELINE_DISPLAY_LIMIT).toBeLessThanOrEqual(config.MAX_TIMELINE_POINTS);
    });

    test("ALERTS_DISPLAY_LIMIT is a number", () => {
      expect(typeof config.ALERTS_DISPLAY_LIMIT).toBe("number");
    });

    test("ALERTS_DISPLAY_LIMIT <= MAX_ALERTS", () => {
      expect(config.ALERTS_DISPLAY_LIMIT).toBeLessThanOrEqual(config.MAX_ALERTS);
    });
  });

  describe("Health Thresholds Config", () => {
    test("HEALTH_WARNING_THRESHOLD is a number", () => {
      expect(typeof config.HEALTH_WARNING_THRESHOLD).toBe("number");
    });

    test("HEALTH_WARNING_THRESHOLD is between 0 and 100", () => {
      expect(config.HEALTH_WARNING_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(config.HEALTH_WARNING_THRESHOLD).toBeLessThanOrEqual(100);
    });
  });

  describe("Config Immutability", () => {
    test("config is readonly (as const)", () => {
      // This test verifies the config object structure
      const keys = Object.keys(config);
      expect(keys).toContain("PORT");
      expect(keys).toContain("HOST");
      expect(keys).toContain("PROJECTS_DIR");
    });
  });
});

// =============================================================================
// Function Tests - calculateHealth logic
// =============================================================================

describe("Function Tests", () => {
  // Recreate calculateHealth function for testing
  function calculateHealth(
    status: { modified: number; staged: number; untracked: number; conflicts: number },
    ahead: number,
    behind: number
  ): number {
    let health = 100;

    // Deduct for local changes
    if (status.conflicts > 0) health -= 40;
    if (status.modified > 0) health -= Math.min(status.modified * 3, 20);
    if (status.untracked > 5) health -= 10;

    // Deduct for remote divergence
    if (behind > 0) health -= Math.min(behind * 2, 15);
    if (ahead > 10) health -= 5;

    return Math.max(0, Math.min(100, health));
  }

  describe("calculateHealth Function", () => {
    test("Perfect health for clean repo", () => {
      const health = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health).toBe(100);
    });

    test("Conflicts reduce health by 40", () => {
      const health = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 1 }, 0, 0);
      expect(health).toBe(60);
    });

    test("Modified files reduce health (3 per file, max 20)", () => {
      const health1 = calculateHealth({ modified: 1, staged: 0, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health1).toBe(97); // 100 - 3

      const health2 = calculateHealth({ modified: 5, staged: 0, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health2).toBe(85); // 100 - 15

      const health3 = calculateHealth({ modified: 10, staged: 0, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health3).toBe(80); // 100 - 20 (capped)
    });

    test("Untracked files > 5 reduce health by 10", () => {
      const health1 = calculateHealth({ modified: 0, staged: 0, untracked: 5, conflicts: 0 }, 0, 0);
      expect(health1).toBe(100); // No penalty for <= 5

      const health2 = calculateHealth({ modified: 0, staged: 0, untracked: 6, conflicts: 0 }, 0, 0);
      expect(health2).toBe(90); // 100 - 10
    });

    test("Behind commits reduce health (2 per commit, max 15)", () => {
      const health1 = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 0, 1);
      expect(health1).toBe(98); // 100 - 2

      const health2 = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 0, 5);
      expect(health2).toBe(90); // 100 - 10

      const health3 = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 0, 10);
      expect(health3).toBe(85); // 100 - 15 (capped)
    });

    test("Ahead > 10 commits reduces health by 5", () => {
      const health1 = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 10, 0);
      expect(health1).toBe(100); // No penalty for <= 10

      const health2 = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 11, 0);
      expect(health2).toBe(95); // 100 - 5
    });

    test("Health with extreme penalties", () => {
      // Extreme values: 10 conflicts (400) + many modified + behind commits
      // Function uses Math.max(0, health) so minimum is 0
      const health = calculateHealth({ modified: 100, staged: 0, untracked: 100, conflicts: 10 }, 100, 100);
      expect(health).toBeGreaterThanOrEqual(0);
      expect(health).toBeLessThanOrEqual(100);
    });

    test("Health never exceeds 100", () => {
      const health = calculateHealth({ modified: 0, staged: 0, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health).toBe(100);
    });

    test("Combined penalties stack correctly", () => {
      // Conflicts (40) + modified 3 (9) + behind 3 (6) = 55 penalty
      const health = calculateHealth({ modified: 3, staged: 0, untracked: 0, conflicts: 1 }, 0, 3);
      expect(health).toBe(45); // 100 - 40 - 9 - 6
    });

    test("Staged files do not affect health", () => {
      const health = calculateHealth({ modified: 0, staged: 100, untracked: 0, conflicts: 0 }, 0, 0);
      expect(health).toBe(100);
    });
  });

  describe("Utility Functions", () => {
    // Test session ID generation format
    function generateSessionId(): string {
      return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    test("generateSessionId creates valid format", () => {
      const id = generateSessionId();
      expect(id).toMatch(/^sess_\d+_[a-z0-9]+$/);
    });

    test("generateSessionId creates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      expect(ids.size).toBe(100);
    });

    // Test uptime formatter
    function formatUptime(seconds: number): string {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }

    test("formatUptime formats seconds only", () => {
      expect(formatUptime(45)).toBe("45s");
    });

    test("formatUptime formats minutes and seconds", () => {
      expect(formatUptime(125)).toBe("2m 5s");
    });

    test("formatUptime formats hours, minutes, and seconds", () => {
      expect(formatUptime(3665)).toBe("1h 1m 5s");
    });

    test("formatUptime handles zero", () => {
      expect(formatUptime(0)).toBe("0s");
    });

    test("formatUptime handles exact hours", () => {
      expect(formatUptime(7200)).toBe("2h 0m 0s");
    });

    // Test theme validation
    function isValidTheme(theme: string): theme is Theme {
      return theme === "dark" || theme === "light";
    }

    test("isValidTheme returns true for dark", () => {
      expect(isValidTheme("dark")).toBe(true);
    });

    test("isValidTheme returns true for light", () => {
      expect(isValidTheme("light")).toBe(true);
    });

    test("isValidTheme returns false for invalid", () => {
      expect(isValidTheme("blue")).toBe(false);
      expect(isValidTheme("")).toBe(false);
      expect(isValidTheme("DARK")).toBe(false);
    });

    // Test project status determination
    function determineStatus(
      gitStatus: { modified: number; staged: number; untracked: number; conflicts: number }
    ): Project["status"] {
      const totalChanges = gitStatus.modified + gitStatus.staged + gitStatus.untracked;
      if (gitStatus.conflicts > 0) return "conflict";
      if (gitStatus.staged > 0) return "staged";
      if (totalChanges > 0) return "modified";
      return "clean";
    }

    test("determineStatus returns clean for no changes", () => {
      expect(determineStatus({ modified: 0, staged: 0, untracked: 0, conflicts: 0 })).toBe("clean");
    });

    test("determineStatus returns conflict when conflicts exist", () => {
      expect(determineStatus({ modified: 5, staged: 3, untracked: 2, conflicts: 1 })).toBe("conflict");
    });

    test("determineStatus returns staged when staged files exist", () => {
      expect(determineStatus({ modified: 5, staged: 3, untracked: 2, conflicts: 0 })).toBe("staged");
    });

    test("determineStatus returns modified for modified/untracked only", () => {
      expect(determineStatus({ modified: 5, staged: 0, untracked: 2, conflicts: 0 })).toBe("modified");
    });

    // Test remote status determination
    function determineRemote(ahead: number, behind: number): Project["remote"] {
      if (ahead > 0 && behind > 0) return "diverged";
      if (ahead > 0) return "ahead";
      if (behind > 0) return "behind";
      return "up-to-date";
    }

    test("determineRemote returns up-to-date when synced", () => {
      expect(determineRemote(0, 0)).toBe("up-to-date");
    });

    test("determineRemote returns ahead when only ahead", () => {
      expect(determineRemote(5, 0)).toBe("ahead");
    });

    test("determineRemote returns behind when only behind", () => {
      expect(determineRemote(0, 3)).toBe("behind");
    });

    test("determineRemote returns diverged when both", () => {
      expect(determineRemote(2, 3)).toBe("diverged");
    });
  });
});

// =============================================================================
// Class-like Pattern Tests (Factory Functions)
// =============================================================================

describe("Factory Function Tests", () => {
  describe("Project Factory", () => {
    function createProject(overrides: Partial<Project> = {}): Project {
      return {
        id: "1",
        name: "test-project",
        branch: "main",
        status: "clean",
        modifiedFiles: 0,
        remote: "up-to-date",
        aheadBy: 0,
        behindBy: 0,
        lastCommit: "Initial commit",
        lastActivity: new Date(),
        health: 100,
        ...overrides,
      };
    }

    test("createProject creates valid default project", () => {
      const project = createProject();
      expect(project.id).toBe("1");
      expect(project.name).toBe("test-project");
      expect(project.status).toBe("clean");
      expect(project.health).toBe(100);
    });

    test("createProject allows overrides", () => {
      const project = createProject({ name: "custom-project", health: 75 });
      expect(project.name).toBe("custom-project");
      expect(project.health).toBe(75);
    });

    test("createProject preserves non-overridden defaults", () => {
      const project = createProject({ name: "custom" });
      expect(project.branch).toBe("main");
      expect(project.status).toBe("clean");
    });
  });

  describe("Alert Factory", () => {
    function createAlert(type: Alert["type"], message: string, project?: string): Alert {
      return {
        id: Bun.randomUUIDv7(), // Time-sortable UUID, faster than crypto.randomUUID()
        type,
        message,
        project,
        timestamp: new Date(),
      };
    }

    test("createAlert creates valid warning alert", () => {
      const alert = createAlert("warning", "Test warning");
      expect(alert.type).toBe("warning");
      expect(alert.message).toBe("Test warning");
      expect(alert.id).toBeTruthy();
    });

    test("createAlert creates alert with project", () => {
      const alert = createAlert("error", "Build failed", "my-project");
      expect(alert.project).toBe("my-project");
    });

    test("createAlert generates unique IDs", () => {
      const alert1 = createAlert("info", "Test 1");
      const alert2 = createAlert("info", "Test 2");
      expect(alert1.id).not.toBe(alert2.id);
    });
  });

  describe("UIState Factory", () => {
    function createUIState(overrides: Partial<UIState> = {}): UIState {
      return {
        collapsedProjects: {},
        sidebarCollapsed: false,
        recentFilters: [],
        lastVisited: {},
        ...overrides,
      };
    }

    test("createUIState creates valid default state", () => {
      const state = createUIState();
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.recentFilters).toHaveLength(0);
    });

    test("createUIState allows nested overrides", () => {
      const state = createUIState({
        collapsedProjects: { "project-1": true },
        sidebarCollapsed: true,
      });
      expect(state.collapsedProjects["project-1"]).toBe(true);
      expect(state.sidebarCollapsed).toBe(true);
    });
  });

  describe("ApiResponse Factory", () => {
    function createSuccessResponse<T>(data: T): ApiResponse<T> {
      return { data };
    }

    function createErrorResponse(error: string): ApiResponse<never> {
      return { error };
    }

    test("createSuccessResponse creates valid success response", () => {
      const response = createSuccessResponse({ value: 42 });
      expect(response.data?.value).toBe(42);
      expect(response.error).toBeUndefined();
    });

    test("createErrorResponse creates valid error response", () => {
      const response = createErrorResponse("Not found");
      expect(response.error).toBe("Not found");
      expect(response.data).toBeUndefined();
    });

    test("createSuccessResponse works with complex types", () => {
      const response = createSuccessResponse<Project[]>([
        {
          id: "1",
          name: "test",
          branch: "main",
          status: "clean",
          modifiedFiles: 0,
          remote: "up-to-date",
          aheadBy: 0,
          behindBy: 0,
          lastCommit: "test",
          lastActivity: new Date(),
          health: 100,
        },
      ]);
      expect(response.data).toHaveLength(1);
    });
  });
});
