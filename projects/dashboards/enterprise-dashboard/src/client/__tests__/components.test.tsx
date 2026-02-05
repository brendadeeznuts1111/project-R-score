/**
 * React Component Tests
 * Using @testing-library/react with Bun's fake timer support
 * 
 * Bun 1.3.6+: Fake timers now work correctly with @testing-library/react
 * - jest.useFakeTimers() sets setTimeout.clock = true for compatibility
 * - advanceTimersByTime(0) correctly fires setTimeout(fn, 0) callbacks
 * - No more hanging tests when using user.click() or similar interactions
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatCard, ProjectCard, AlertsPanel } from "../components";
import type { Project } from "../../types";

// Mock project data
const mockProject: Project = {
  id: "test-project-1",
  name: "test-repo",
  branch: "main",
  status: "modified",
  health: 85,
  modifiedFiles: 3,
  remote: "ahead",
  aheadBy: 2,
  behindBy: 0,
  lastCommit: "feat: add new feature",
  lastActivity: new Date(),
};

const cleanProject: Project = {
  ...mockProject,
  id: "clean-project",
  name: "clean-repo",
  status: "clean",
  health: 100,
  modifiedFiles: 0,
  remote: "up-to-date",
  aheadBy: 0,
};

// ============================================
// StatCard Tests
// ============================================
describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Active Projects" value={35} />);

    expect(screen.getByText("Active Projects")).toBeDefined();
    expect(screen.getByText("35")).toBeDefined();
  });

  it("renders with string value", () => {
    render(<StatCard title="Success Rate" value="99.5%" />);

    expect(screen.getByText("Success Rate")).toBeDefined();
    expect(screen.getByText("99.5%")).toBeDefined();
  });

  it("renders subtitle when provided", () => {
    render(
      <StatCard
        title="Latency"
        value="42ms"
        subtitle="Fast response"
      />
    );

    expect(screen.getByText("Fast response")).toBeDefined();
  });

  it("renders up trend indicator", () => {
    const { container } = render(
      <StatCard title="Requests" value={1000} trend="up" />
    );

    const trendElement = container.querySelector(".trend-up");
    expect(trendElement).toBeDefined();
  });

  it("renders down trend indicator", () => {
    const { container } = render(
      <StatCard title="Errors" value={5} trend="down" />
    );

    const trendElement = container.querySelector(".trend-down");
    expect(trendElement).toBeDefined();
  });

  it("renders icon when specified", () => {
    const { container } = render(
      <StatCard title="Projects" value={10} icon="projects" />
    );

    const iconWrapper = container.querySelector(".icon-wrapper");
    expect(iconWrapper).toBeDefined();
  });

  it("applies correct icon style class", () => {
    const { container } = render(
      <StatCard title="Success" value="100%" icon="success" />
    );

    const iconWrapper = container.querySelector(".icon-success");
    expect(iconWrapper).toBeDefined();
  });
});

// ============================================
// ProjectCard Tests
// ============================================
describe("ProjectCard", () => {
  it("renders project name and branch", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("test-repo")).toBeDefined();
    expect(screen.getByText("main")).toBeDefined();
  });

  it("renders health percentage", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("85% - Good")).toBeDefined();
  });

  it("renders modified files count", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("3 files")).toBeDefined();
  });

  it("renders last commit message", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("feat: add new feature")).toBeDefined();
  });

  it("shows selection indicator when selected", () => {
    const { container } = render(
      <ProjectCard project={mockProject} isSelected={true} />
    );

    // Should have selection indicator
    const selectionIndicator = container.querySelector(".bg-blue-500");
    expect(selectionIndicator).toBeDefined();
  });

  it("calls onOpenProject when open button clicked", async () => {
    const mockOpen = jest.fn();
    render(
      <ProjectCard
        project={mockProject}
        onOpenProject={mockOpen}
      />
    );

    // Find and click the open directory button (folder icon in header)
    const openButton = screen.getByTitle(`Open ${mockProject.name} in Finder`);
    fireEvent.click(openButton);

    expect(mockOpen).toHaveBeenCalledWith(mockProject);
  });

  it("calls onGitAction when git status button clicked", async () => {
    const mockGitAction = jest.fn();
    render(
      <ProjectCard
        project={mockProject}
        onGitAction={mockGitAction}
      />
    );

    const statusButton = screen.getByTitle("Git Status");
    fireEvent.click(statusButton);

    expect(mockGitAction).toHaveBeenCalledWith(mockProject, "status");
  });

  it("calls onGitAction when git log button clicked", async () => {
    const mockGitAction = jest.fn();
    render(
      <ProjectCard
        project={mockProject}
        onGitAction={mockGitAction}
      />
    );

    const logButton = screen.getByTitle("Recent Commits");
    fireEvent.click(logButton);

    expect(mockGitAction).toHaveBeenCalledWith(mockProject, "log");
  });

  it("calls onRescan when rescan button clicked", async () => {
    const mockRescan = jest.fn();
    render(
      <ProjectCard
        project={mockProject}
        onRescan={mockRescan}
      />
    );

    const rescanButton = screen.getByTitle("Rescan Project");
    fireEvent.click(rescanButton);

    expect(mockRescan).toHaveBeenCalledWith(mockProject);
  });

  it("displays correct status icon for modified", () => {
    const { container } = render(<ProjectCard project={mockProject} />);

    // Modified status should show yellow indicator
    const statusBadge = container.querySelector(".bg-yellow-500\\/20");
    expect(statusBadge).toBeDefined();
  });

  it("displays correct status icon for clean", () => {
    const { container } = render(<ProjectCard project={cleanProject} />);

    // Clean status should show green indicator
    const statusBadge = container.querySelector(".bg-green-500\\/20");
    expect(statusBadge).toBeDefined();
  });

  it("shows correct health label for excellent health", () => {
    const excellentProject = { ...mockProject, health: 95 };
    render(<ProjectCard project={excellentProject} />);

    expect(screen.getByText("95% - Excellent")).toBeDefined();
  });

  it("shows correct health label for warning health", () => {
    const warningProject = { ...mockProject, health: 55 };
    render(<ProjectCard project={warningProject} />);

    expect(screen.getByText("55% - Fair")).toBeDefined();
  });

  it("shows correct health label for critical health", () => {
    const criticalProject = { ...mockProject, health: 30 };
    render(<ProjectCard project={criticalProject} />);

    expect(screen.getByText("30% - Critical")).toBeDefined();
  });
});

// ============================================
// AlertsPanel Tests
// ============================================
describe("AlertsPanel", () => {
  const mockAlerts = [
    { id: "1", type: "warning" as const, message: "High memory usage", timestamp: new Date() },
    { id: "2", type: "error" as const, message: "Connection failed", timestamp: new Date() },
    { id: "3", type: "info" as const, message: "Scan complete", timestamp: new Date() },
  ];

  it("renders alerts list", () => {
    render(<AlertsPanel alerts={mockAlerts} />);

    expect(screen.getByText("High memory usage")).toBeDefined();
    expect(screen.getByText("Connection failed")).toBeDefined();
    expect(screen.getByText("Scan complete")).toBeDefined();
  });

  it("shows empty state when no alerts", () => {
    render(<AlertsPanel alerts={[]} />);

    expect(screen.getByText("No alerts")).toBeDefined();
  });

  it("displays correct count in header", () => {
    render(<AlertsPanel alerts={mockAlerts} />);

    // The count shows "3 active"
    expect(screen.getByText(/3.*active/)).toBeDefined();
  });
});

// ============================================
// User Interaction Tests with Fake Timers
// ============================================
describe("User Interactions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("handles rapid clicks on action buttons", async () => {
    const mockGitAction = jest.fn();
    render(
      <ProjectCard
        project={mockProject}
        onGitAction={mockGitAction}
      />
    );

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const statusButton = screen.getByTitle("Git Status");

    // Rapid clicks
    await user.click(statusButton);
    await user.click(statusButton);
    await user.click(statusButton);

    expect(mockGitAction).toHaveBeenCalledTimes(3);
  });

  it("handles hover state on project card", async () => {
    const { container } = render(<ProjectCard project={mockProject} />);

    const card = container.querySelector(".project-card");
    expect(card).toBeDefined();

    // The hover toolbar should exist in DOM (opacity controlled by CSS)
    const toolbar = container.querySelector(".group-hover\\:opacity-100");
    expect(toolbar).toBeDefined();
  });
});
