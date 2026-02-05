import { describe, it, expect, vi, beforeEach } from "vitest";
import DuoPlusAPI from "../../utils/duoplus/duoplus";
import { LoopTaskHelper } from "../../utils/duoplus/loop-task-helper";
import type {
  CreateLoopTaskRequest,
  LoopTaskImage,
  LoopTaskConfig,
  CreateLoopTaskResponse
} from "../../utils/duoplus/duoplus";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn()
    }))
  }
}));

describe("LoopTaskHelper", () => {
  let api: DuoPlusAPI;
  let helper: LoopTaskHelper;

  beforeEach(() => {
    api = new DuoPlusAPI({
      apiToken: "test-token",
      baseUrl: "https://test.duoplus.net"
    });
    helper = new LoopTaskHelper(api);
  });

  describe("Builder Pattern", () => {
    it("should build a valid loop task request", () => {
      const request = LoopTaskHelper.builder()
        .setTemplate("template-123", 2)
        .setName("Test Task")
        .setRemark("Test remark")
        .addImage({
          image_id: "phone-1",
          start_at: "2025-12-11 17:38",
          end_at: "2025-12-25 18:08",
          execute_type: "1",
          gap_time: 30
        })
        .build();

      expect(request).toEqual({
        template_id: "template-123",
        template_type: 2,
        name: "Test Task",
        remark: "Test remark",
        images: [
          {
            image_id: "phone-1",
            start_at: "2025-12-11 17:38",
            end_at: "2025-12-25 18:08",
            execute_type: "1",
            gap_time: 30
          }
        ]
      });
    });

    it("should throw error when template_id is missing", () => {
      expect(() => {
        LoopTaskHelper.builder()
          .setName("Test Task")
          .addImage({
            image_id: "phone-1",
            start_at: "2025-12-11 17:38",
            end_at: "2025-12-25 18:08",
            execute_type: "1",
            gap_time: 30
          })
          .build();
      }).toThrow("Template ID is required");
    });

    it("should throw error when name is missing", () => {
      expect(() => {
        LoopTaskHelper.builder()
          .setTemplate("template-123", 2)
          .addImage({
            image_id: "phone-1",
            start_at: "2025-12-11 17:38",
            end_at: "2025-12-25 18:08",
            execute_type: "1",
            gap_time: 30
          })
          .build();
      }).toThrow("Task name is required");
    });

    it("should throw error when no images are added", () => {
      expect(() => {
        LoopTaskHelper.builder().setTemplate("template-123", 2).setName("Test Task").build();
      }).toThrow("At least one image is required");
    });
  });

  describe("Validation", () => {
    it("should validate a correct image configuration", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "1",
        gap_time: 30
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const image: Partial<LoopTaskImage> = {
        image_id: "",
        start_at: "",
        end_at: "",
        execute_type: "1"
      };

      const errors = LoopTaskHelper.validateImage(image as LoopTaskImage);
      expect(errors).toContain("Image ID is required");
      expect(errors).toContain("Start time is required");
      expect(errors).toContain("End time is required");
    });

    it("should validate interval execution requirements", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "1"
        // Missing gap_time
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Gap time is required for interval execution");
    });

    it("should validate daily execution requirements", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "2"
        // Missing execute_time
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Execute time is required for daily/weekly/monthly execution");
    });

    it("should validate weekly execution requirements", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "3",
        execute_time: "15:00"
        // Missing weeks
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Weeks are required for weekly execution");
    });

    it("should validate monthly execution requirements", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "4",
        execute_time: "15:00"
        // Missing days
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Days are required for monthly execution");
    });

    it("should validate loop execution mode requirements", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "2",
        execute_time: "15:00",
        mode: 2
        // Missing execute_end_time
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Execute end time is required for loop execution mode");
    });

    it("should validate config fields", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "1",
        gap_time: 30,
        config: {
          "invalid-config": {
            key: "",
            value: "",
            type: "string" as const,
            required: true
          }
        }
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Config key is required for invalid-config");
      expect(errors).toContain("Config value is required for invalid-config");
    });
  });

  describe("Config Creation Helpers", () => {
    it("should create file config", () => {
      const config = LoopTaskHelper.createFileConfig("file", ["url1", "url2"]);
      expect(config).toEqual({
        key: "file",
        value: ["url1", "url2"],
        type: "file",
        required: true
      });
    });

    it("should create text config", () => {
      const config = LoopTaskHelper.createTextConfig("text", "Hello\nWorld");
      expect(config).toEqual({
        key: "text",
        value: "Hello\nWorld",
        type: "textarea",
        required: true
      });
    });

    it("should create boolean config", () => {
      const config = LoopTaskHelper.createBooleanConfig("bool", true);
      expect(config).toEqual({
        key: "bool",
        value: "true",
        type: "boolean",
        required: true
      });
    });

    it("should create number config", () => {
      const config = LoopTaskHelper.createNumberConfig("age", 25);
      expect(config).toEqual({
        key: "age",
        value: "25",
        type: "number",
        required: true
      });
    });

    it("should create string config", () => {
      const config = LoopTaskHelper.createStringConfig("name", "test");
      expect(config).toEqual({
        key: "name",
        value: "test",
        type: "string",
        required: true
      });
    });

    it("should create excel config", () => {
      const config = LoopTaskHelper.createExcelConfig(
        "emails",
        ["a@test.com", "b@test.com"],
        false
      );
      expect(config).toEqual({
        key: "emails",
        value: "a@test.com,b@test.com",
        type: "excel",
        required: false
      });
    });
  });

  describe("API Integration", () => {
    it("should create interval task successfully", async () => {
      const mockResponse: CreateLoopTaskResponse = {
        code: 200,
        data: { id: "task-123" },
        message: "Success"
      };

      // Mock the API call
      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const result = await helper.createIntervalTask({
        templateId: "template-123",
        templateType: 2,
        name: "Test Interval Task",
        imageId: "phone-1",
        startAt: "2025-12-11 17:38",
        endAt: "2025-12-25 18:08",
        gapTime: 30
      });

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          template_id: "template-123",
          template_type: 2,
          name: "Test Interval Task",
          images: expect.arrayContaining([
            expect.objectContaining({
              image_id: "phone-1",
              execute_type: "1",
              gap_time: 30
            })
          ])
        })
      );
    });

    it("should create daily task successfully", async () => {
      const mockResponse: CreateLoopTaskResponse = {
        code: 200,
        data: { id: "task-456" },
        message: "Success"
      };

      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const result = await helper.createDailyTask({
        templateId: "template-456",
        templateType: 1,
        name: "Test Daily Task",
        imageId: "phone-2",
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: "15:00",
        mode: 1
      });

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              execute_type: "2",
              execute_time: "15:00",
              mode: 1
            })
          ])
        })
      );
    });

    it("should create weekly task successfully", async () => {
      const mockResponse: CreateLoopTaskResponse = {
        code: 200,
        data: { id: "task-789" },
        message: "Success"
      };

      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const result = await helper.createWeeklyTask({
        templateId: "template-789",
        templateType: 2,
        name: "Test Weekly Task",
        imageId: "phone-3",
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: "09:00",
        weeks: [1, 2, 3, 4, 5],
        mode: 2,
        executeEndTime: "17:00"
      });

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              execute_type: "3",
              execute_time: "09:00",
              weeks: [1, 2, 3, 4, 5],
              mode: 2,
              execute_end_time: "17:00"
            })
          ])
        })
      );
    });

    it("should create monthly task successfully", async () => {
      const mockResponse: CreateLoopTaskResponse = {
        code: 200,
        data: { id: "task-101" },
        message: "Success"
      };

      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const result = await helper.createMonthlyTask({
        templateId: "template-101",
        templateType: 1,
        name: "Test Monthly Task",
        imageId: "phone-4",
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: "10:00",
        days: [1, 15, 30],
        mode: 1
      });

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              execute_type: "4",
              execute_time: "10:00",
              days: [1, 15, 30],
              mode: 1
            })
          ])
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error("API Error"));
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      await expect(
        helper.createIntervalTask({
          templateId: "template-123",
          templateType: 2,
          name: "Test Task",
          imageId: "phone-1",
          startAt: "2025-12-11 17:38",
          endAt: "2025-12-25 18:08",
          gapTime: 30
        })
      ).rejects.toThrow("Failed to create loop task: Error: API Error");
    });

    it("should validate before creating task (missing gapTime)", async () => {
      const mockPost = vi.fn();
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      // gapTime is required for execute_type: '1'
      const request: any = {
        template_id: "template-123",
        template_type: 2,
        name: "Test Task",
        images: [
          {
            image_id: "phone-1",
            start_at: "2025-12-11 17:38",
            end_at: "2025-12-25 18:08",
            execute_type: "1"
            // gap_time missing
          }
        ]
      };

      await expect(helper.createLoopTask(request)).rejects.toThrow(
        "Invalid image configuration: Gap time is required for interval execution"
      );

      expect(mockPost).not.toHaveBeenCalled();
    });

    it("should validate missing mode for daily task", async () => {
      const mockPost = vi.fn();
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const request: any = {
        template_id: "template-123",
        template_type: 1,
        name: "Test Task",
        images: [
          {
            image_id: "phone-1",
            start_at: "2025-12-11 17:38",
            end_at: "2025-12-25 18:08",
            execute_type: "2",
            execute_time: "12:00"
            // mode missing
          }
        ]
      };

      await expect(helper.createLoopTask(request)).rejects.toThrow(
        "Invalid image configuration: Mode is required for daily/weekly/monthly execution"
      );
    });

    it("should support official template type (1)", async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { code: 200, data: { id: "task-1" } } });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      await helper.createDailyTask({
        templateId: "official-123",
        templateType: 1,
        name: "Official Task",
        imageId: "phone-1",
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: "09:00",
        mode: 1
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          template_type: 1
        })
      );
    });

    it("should support custom template type (2)", async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { code: 200, data: { id: "task-2" } } });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      await helper.createDailyTask({
        templateId: "custom-123",
        templateType: 2,
        name: "Custom Task",
        imageId: "phone-1",
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: "09:00",
        mode: 1
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/automation/addPlan",
        expect.objectContaining({
          template_type: 2
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should detect invalid week selections for weekly task", async () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "3",
        execute_time: "12:00",
        weeks: [] // Empty weeks
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Weeks are required for weekly execution");
    });

    it("should detect invalid day selections for monthly task", async () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "4",
        execute_time: "12:00",
        days: [] // Empty days
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Days are required for monthly execution");
    });

    it("should validate required config fields", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "1",
        gap_time: 30,
        config: {
          "missing-val": {
            key: "test",
            value: "", // Empty but required
            type: "string" as const,
            required: true
          }
        }
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Config value is required for missing-val");
    });

    it("should allow empty optional config fields", () => {
      const image: LoopTaskImage = {
        image_id: "phone-1",
        start_at: "2025-12-11 17:38",
        end_at: "2025-12-25 18:08",
        execute_type: "1",
        gap_time: 30,
        config: {
          "optional-val": {
            key: "test",
            value: "", // Empty and optional
            type: "string" as const,
            required: false
          }
        }
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle task with complex configuration", async () => {
      const mockResponse: CreateLoopTaskResponse = {
        code: 200,
        data: { id: "complex-task" },
        message: "Success"
      };

      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse });
      // @ts-ignore
      api.axiosInstance = { post: mockPost };

      const request = LoopTaskHelper.builder()
        .setTemplate("complex-template", 2)
        .setName("Complex Marketing Task")
        .setRemark("Multi-stage automation")
        .addImage({
          image_id: "phone-complex",
          config: {
            file: LoopTaskHelper.createFileConfig("file", ["https://example.com/image.jpg"]),
            text: LoopTaskHelper.createTextConfig("text", "Marketing message\nCall to action"),
            bool: LoopTaskHelper.createBooleanConfig("bool", true),
            age: LoopTaskHelper.createNumberConfig("age", 25),
            name: LoopTaskHelper.createStringConfig("name", "campaign"),
            email: LoopTaskHelper.createExcelConfig("email", ["test@example.com"], false)
          },
          start_at: "2025-12-01 09:00",
          end_at: "2025-12-31 18:00",
          execute_type: "2",
          execute_time: "09:00",
          mode: 2,
          execute_end_time: "17:00"
        })
        .build();

      const result = await helper.createLoopTask(request);
      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith("/api/v1/automation/addPlan", request);
    });
  });
});
