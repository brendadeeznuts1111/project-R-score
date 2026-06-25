import { describe, it, expect, vi, beforeEach } from "vitest";
import DuoPlusAPI from "../../utils/duoplus/duoplus";
import { LoopTaskHelper } from "../../utils/duoplus/loop-task-helper";
import type { LoopTaskImage, LoopTaskConfig } from "../../utils/duoplus/duoplus";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn()
    }))
  }
}));

describe("LoopTaskHelper Advanced", () => {
  let api: DuoPlusAPI;
  let helper: LoopTaskHelper;

  beforeEach(() => {
    api = new DuoPlusAPI({
      apiToken: "test-token",
      baseUrl: "https://test.duoplus.net"
    });
    helper = new LoopTaskHelper(api);
  });

  describe("Complex Validation Scenarios", () => {
    it("should validate all execute types requirements", () => {
      // Type 1: Interval
      const img1: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "1"
      };
      expect(LoopTaskHelper.validateImage(img1)).toContain(
        "Gap time is required for interval execution"
      );

      // Type 2: Daily
      const img2: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "2"
      };
      expect(LoopTaskHelper.validateImage(img2)).toContain(
        "Execute time is required for daily/weekly/monthly execution"
      );
      expect(LoopTaskHelper.validateImage(img2)).toContain(
        "Mode is required for daily/weekly/monthly execution"
      );

      // Type 3: Weekly
      const img3: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "3",
        execute_time: "12:00",
        mode: 1
      };
      expect(LoopTaskHelper.validateImage(img3)).toContain(
        "Weeks are required for weekly execution"
      );

      // Type 4: Monthly
      const img4: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "4",
        execute_time: "12:00",
        mode: 1
      };
      expect(LoopTaskHelper.validateImage(img4)).toContain(
        "Days are required for monthly execution"
      );
    });

    it("should validate mode 2 (loop) requirements", () => {
      const image: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "2",
        execute_time: "12:00",
        mode: 2 // Loop mode
        // execute_end_time missing
      };

      expect(LoopTaskHelper.validateImage(image)).toContain(
        "Execute end time is required for loop execution mode"
      );
    });

    it("should validate nested config objects", () => {
      const config: Record<string, LoopTaskConfig> = {
        field1: { key: "k1", type: "string", value: "v1", required: true },
        field2: { key: "", type: "string", value: "v2", required: true }, // Missing key
        field3: { key: "k3", type: "string" as any, value: "", required: true } // Missing value
      };

      const image: LoopTaskImage = {
        image_id: "p1",
        start_at: "now",
        end_at: "later",
        execute_type: "1",
        gap_time: 30,
        config
      };

      const errors = LoopTaskHelper.validateImage(image);
      expect(errors).toContain("Config key is required for field2");
      expect(errors).toContain("Config value is required for field3");
    });
  });

  describe("Multiple Images", () => {
    it("should build a request with multiple images", () => {
      const builder = LoopTaskHelper.builder().setTemplate("tmpl-1", 1).setName("Multi Task");

      const img1: LoopTaskImage = {
        image_id: "p1",
        start_at: "t1",
        end_at: "t2",
        execute_type: "1",
        gap_time: 10
      };
      const img2: LoopTaskImage = {
        image_id: "p2",
        start_at: "t3",
        end_at: "t4",
        execute_type: "1",
        gap_time: 20
      };

      const request = builder.addImage(img1).addImage(img2).build();

      expect(request.images).toHaveLength(2);
      expect(request.images[0].image_id).toBe("p1");
      expect(request.images[1].image_id).toBe("p2");
    });
  });
});
