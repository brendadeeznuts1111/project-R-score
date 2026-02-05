/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DuoPlusPage } from "../../../pages/DuoPlusPage";
import { DuoPlusAPI } from "../../../utils/duoplus";

// Mock the DuoPlusAPI
vi.mock("../../../utils/duoplus", () => ({
  DuoPlusAPI: vi.fn(),
  __esModule: true
}));

// Mock the useProxyData hook
vi.mock("../../../hooks/useProxyData", () => ({
  useProxyData: vi.fn()
}));

const mockDuoPlusAPI = DuoPlusAPI as any;
const mockUseProxyData = vi.fn();

describe("DuoPlusPage", () => {
  const mockAccount = {
    id: "account-123",
    email: "test@example.com",
    balance: 100.5,
    currency: "USD",
    totalPhones: 5,
    activePhones: 3,
    plan: "Professional",
    expiresAt: "2024-12-31"
  };

  const mockPhones = [
    {
      id: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
      name: "Test Phone 1",
      status: "online" as const,
      proxy: {
        ip: "192.168.1.100",
        port: 8080,
        username: "user1",
        password: "pass1"
      },
      region: "United States",
      lastUsed: "2 hours ago",
      createdAt: "2024-01-15",
      specs: {
        cpu: "4 cores",
        memory: "4GB",
        storage: "64GB"
      }
    },
    {
      id: "phone-2",
      name: "Test Phone 2",
      status: "offline" as const,
      proxy: {
        ip: "192.168.1.101",
        port: 8080,
        username: "user2",
        password: "pass2"
      },
      region: "Germany",
      lastUsed: "1 day ago",
      createdAt: "2024-01-10",
      specs: {
        cpu: "2 cores",
        memory: "2GB",
        storage: "32GB"
      }
    }
  ];

  const mockAPIInstance = {
    getMockData: vi.fn(),
    getPhones: vi.fn(),
    getPhone: vi.fn(),
    startPhone: vi.fn(),
    stopPhone: vi.fn(),
    restartPhone: vi.fn(),
    configureProxy: vi.fn(),
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    getFileInfo: vi.fn(),
    deleteFile: vi.fn(),
    installApk: vi.fn(),
    getPhoneLogs: vi.fn(),
    getScreenshot: vi.fn(),
    getAccountInfo: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDuoPlusAPI.mockImplementation(() => mockAPIInstance);
    mockAPIInstance.getMockData.mockResolvedValue({
      account: mockAccount,
      phones: mockPhones
    });

    mockUseProxyData.mockReturnValue({
      data: { proxies: [] },
      loading: false,
      error: null
    });

    // Mock alert and confirm are already in setup.ts
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render the DuoPlus page correctly", async () => {
      render(<DuoPlusPage />);

      expect(screen.getByText("DuoPlus Cloud Phones")).toBeInTheDocument();
      expect(screen.getByText("Account Information")).toBeInTheDocument();
      expect(screen.getByText("Cloud Phone Management")).toBeInTheDocument();
      expect(screen.getByText("File Management")).toBeInTheDocument();
      expect(screen.getByText("API Access")).toBeInTheDocument();
    });

    it("should show loading state initially", () => {
      mockUseProxyData.mockReturnValue({
        data: null,
        loading: true,
        error: null
      });

      render(<DuoPlusPage />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should show error state when there is an error", () => {
      mockUseProxyData.mockReturnValue({
        data: null,
        loading: false,
        error: "Failed to load data"
      });

      render(<DuoPlusPage />);

      expect(screen.getByText("Error loading data")).toBeInTheDocument();
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });
  });

  describe("Account Information", () => {
    it("should display account information correctly", async () => {
      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText(mockAccount.email)).toBeInTheDocument();
        expect(screen.getByText(`$${mockAccount.balance}`)).toBeInTheDocument();
        expect(screen.getByText(mockAccount.plan)).toBeInTheDocument();
        expect(
          screen.getByText(`${mockAccount.activePhones}/${mockAccount.totalPhones}`)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Phone Management", () => {
    it("should display phone list correctly", async () => {
      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Phone 1")).toBeInTheDocument();
        expect(screen.getByText("Test Phone 2")).toBeInTheDocument();
        expect(screen.getByText("online")).toBeInTheDocument();
        expect(screen.getByText("offline")).toBeInTheDocument();
      });
    });

    it("should handle phone start operation", async () => {
      const user = userEvent.setup();
      mockAPIInstance.startPhone.mockResolvedValue(undefined);

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Phone 1")).toBeInTheDocument();
      });

      const startButtons = screen.getAllByTitle("Start Phone");
      await user.click(startButtons[0]);

      expect(mockAPIInstance.startPhone).toHaveBeenCalledWith(
        "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36"
      );
    });

    it("should handle phone stop operation", async () => {
      const user = userEvent.setup();
      mockAPIInstance.stopPhone.mockResolvedValue(undefined);

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Phone 1")).toBeInTheDocument();
      });

      const stopButtons = screen.getAllByTitle("Stop Phone");
      await user.click(stopButtons[0]);

      expect(mockAPIInstance.stopPhone).toHaveBeenCalledWith(
        "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36"
      );
    });

    it("should handle proxy configuration", async () => {
      const user = userEvent.setup();
      mockAPIInstance.configureProxy.mockResolvedValue(undefined);

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Phone 1")).toBeInTheDocument();
      });

      const configureButtons = screen.getAllByTitle("Configure Proxy");
      await user.click(configureButtons[0]);

      expect(mockAPIInstance.configureProxy).toHaveBeenCalledWith(
        "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
        mockPhones[0].proxy
      );
    });
  });

  describe("File Management", () => {
    it("should handle phone selection", async () => {
      const user = userEvent.setup();
      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      expect(selectElement).toHaveValue("d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");
    });

    it("should handle file path input", async () => {
      const user = userEvent.setup();
      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      const filePathInput = screen.getByPlaceholderText("/sdcard/Download/ucPHS.txt");
      await user.clear(filePathInput);
      await user.type(filePathInput, "/sdcard/Download/test.txt");

      expect(filePathInput).toHaveValue("/sdcard/Download/test.txt");
    });

    it("should handle file info operation", async () => {
      const user = userEvent.setup();
      const mockFileInfo = {
        name: "test.txt",
        size: 1024,
        modified: "2024-01-15T10:30:00Z",
        type: "text/plain"
      };

      mockAPIInstance.getFileInfo.mockResolvedValue(mockFileInfo);

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Select phone
      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      // Click Get Info button
      const getInfoButton = screen.getByText("Get Info");
      await user.click(getInfoButton);

      await waitFor(() => {
        expect(mockAPIInstance.getFileInfo).toHaveBeenCalledWith(
          "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
          "/sdcard/Download/ucPHS.txt"
        );
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("File Info:"));
      });
    });

    it("should handle file download operation", async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(["test content"], { type: "text/plain" });

      mockAPIInstance.downloadFile.mockResolvedValue(mockBlob);

      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: "",
        download: "",
        click: vi.fn()
      };
      const mockCreateElement = vi.fn(() => mockAnchor);
      Object.defineProperty(document, "createElement", { value: mockCreateElement });
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      Object.defineProperty(document.body, "appendChild", { value: mockAppendChild });
      Object.defineProperty(document.body, "removeChild", { value: mockRemoveChild });

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Select phone
      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      // Change operation to download
      const operationSelect = screen.getByDisplayValue("Get File Info");
      await user.selectOptions(operationSelect, "download");

      // Click Download File button
      const downloadButton = screen.getByText("Download File");
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockAPIInstance.downloadFile).toHaveBeenCalledWith(
          "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
          "/sdcard/Download/ucPHS.txt"
        );
        expect(mockCreateElement).toHaveBeenCalledWith("a");
        expect(mockAnchor.click).toHaveBeenCalled();
      });
    });

    it("should handle file delete operation", async () => {
      const user = userEvent.setup();
      mockAPIInstance.deleteFile.mockResolvedValue(undefined);

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Select phone
      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      // Change operation to delete
      const operationSelect = screen.getByDisplayValue("Get File Info");
      await user.selectOptions(operationSelect, "delete");

      // Click Delete File button
      const deleteButton = screen.getByText("Delete File");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          "Are you sure you want to delete /sdcard/Download/ucPHS.txt?"
        );
        expect(mockAPIInstance.deleteFile).toHaveBeenCalledWith(
          "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
          "/sdcard/Download/ucPHS.txt"
        );
        expect(global.alert).toHaveBeenCalledWith("File deleted successfully");
      });
    });

    it("should handle file upload operation", async () => {
      const user = userEvent.setup();
      const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });
      mockAPIInstance.uploadFile.mockResolvedValue("https://example.com/file.txt");

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Select phone
      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      // Get file input (it's hidden but we can still interact with it)
      const fileInput = screen.getByDisplayValue("");
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(mockAPIInstance.uploadFile).toHaveBeenCalledWith(
          "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
          mockFile,
          "/sdcard/Download/"
        );
        expect(global.alert).toHaveBeenCalledWith(
          "File uploaded successfully: https://example.com/file.txt"
        );
      });
    });

    it("should handle quick action buttons", async () => {
      const user = userEvent.setup();

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Click Load Example File button
      const loadExampleButton = screen.getByText("Load Example File");
      await user.click(loadExampleButton);

      const selectElement = screen.getByLabelText("Select Phone");
      const filePathInput = screen.getByPlaceholderText("/sdcard/Download/ucPHS.txt");

      expect(selectElement).toHaveValue("d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");
      expect(filePathInput).toHaveValue("/sdcard/Download/ucPHS.txt");

      // Click Browse Downloads button
      const browseButton = screen.getByText("Browse Downloads");
      await user.click(browseButton);

      expect(filePathInput).toHaveValue("/sdcard/Download/");
    });

    it("should show error when no phone is selected", async () => {
      const user = userEvent.setup();

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Try to click Get Info without selecting a phone
      const getInfoButton = screen.getByText("Get Info");
      await user.click(getInfoButton);

      expect(global.alert).toHaveBeenCalledWith("Please select a phone first");
    });
  });

  describe("API Access Section", () => {
    it("should display API credentials correctly", async () => {
      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("6370486b-c456-4efc-842e-9cd1461d05d8")).toBeInTheDocument();
        expect(screen.getByText("https://my.duoplus.net/api")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const user = userEvent.setup();
      mockAPIInstance.getFileInfo.mockRejectedValue(new Error("File not found"));

      render(<DuoPlusPage />);

      await waitFor(() => {
        expect(screen.getByText("File Management")).toBeInTheDocument();
      });

      // Select phone and try to get file info
      const selectElement = screen.getByLabelText("Select Phone");
      await user.selectOptions(selectElement, "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");

      const getInfoButton = screen.getByText("Get Info");
      await user.click(getInfoButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Operation failed: Error: File not found");
      });
    });

    it("should handle mock data loading errors", async () => {
      mockAPIInstance.getMockData.mockRejectedValue(new Error("Failed to load mock data"));

      render(<DuoPlusPage />);

      // Component should still render, just without the mock data
      expect(screen.getByText("DuoPlus Cloud Phones")).toBeInTheDocument();
    });
  });
});
