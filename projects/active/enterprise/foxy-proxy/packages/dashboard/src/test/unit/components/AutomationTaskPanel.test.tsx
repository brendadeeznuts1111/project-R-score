/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AutomationTaskPanel } from "../../../components/AutomationTaskPanel";
import DuoPlusAPI from "../../../utils/duoplus/duoplus";
import { LoopTaskHelper } from "../../../utils/duoplus/loop-task-helper";
import "@testing-library/jest-dom";

// Mock the API and Helper
vi.mock("../../../utils/duoplus/duoplus", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      createLoopTask: vi.fn()
    }))
  };
});

vi.mock("../../../utils/duoplus/loop-task-helper", () => {
  const mockHelper = {
    createIntervalTask: vi.fn(),
    createDailyTask: vi.fn()
  };
  return {
    LoopTaskHelper: vi.fn().mockImplementation(() => mockHelper)
  };
});

describe("AutomationTaskPanel", () => {
  let api: DuoPlusAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new DuoPlusAPI({ apiToken: "test", baseUrl: "test" });
  });

  it("renders correctly", () => {
    render(<AutomationTaskPanel api={api} phoneId="phone-1" />);
    expect(screen.getByText("Automation Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("Task Name")).toHaveValue("New Automation Task");
  });

  it("disables button if no phone is selected", async () => {
    render(<AutomationTaskPanel api={api} phoneId="" />);
    expect(screen.getByText("Create Loop Task")).toBeDisabled();
  });

  it("creates an interval task successfully", async () => {
    const helperInstance = new LoopTaskHelper(api);
    vi.mocked(helperInstance.createIntervalTask).mockResolvedValue({
      data: { id: "task-123" },
      code: 200,
      message: "Success"
    });

    render(<AutomationTaskPanel api={api} phoneId="phone-1" />);

    fireEvent.change(screen.getByLabelText("Task Name"), { target: { value: "My Task" } });
    fireEvent.click(screen.getByText("Create Loop Task"));

    await waitFor(() => {
      expect(screen.getByText(/Task created successfully! ID: task-123/)).toBeInTheDocument();
    });

    expect(helperInstance.createIntervalTask).toHaveBeenCalled();
  });

  it("handles error during task creation", async () => {
    const helperInstance = new LoopTaskHelper(api);
    vi.mocked(helperInstance.createIntervalTask).mockRejectedValue(new Error("API Failure"));

    render(<AutomationTaskPanel api={api} phoneId="phone-1" />);
    fireEvent.click(screen.getByText("Create Loop Task"));

    await waitFor(() => {
      expect(screen.getByText("API Failure")).toBeInTheDocument();
    });
  });

  it("switches between Interval and Daily types", async () => {
    render(<AutomationTaskPanel api={api} phoneId="phone-1" />);

    // Default is Interval
    expect(screen.getByLabelText("Gap Time (minutes)")).toBeInTheDocument();

    // Switch to Daily
    fireEvent.click(screen.getByText("Daily"));
    expect(screen.queryByLabelText("Gap Time (minutes)")).not.toBeInTheDocument();

    // Switch back to Interval
    fireEvent.click(screen.getByText("Interval"));
    expect(screen.getByLabelText("Gap Time (minutes)")).toBeInTheDocument();
  });
});
