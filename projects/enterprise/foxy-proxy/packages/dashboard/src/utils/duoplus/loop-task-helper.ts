import type {
  CreateLoopTaskRequest,
  LoopTaskImage,
  LoopTaskConfig,
  CreateLoopTaskResponse
} from "./duoplus";
import DuoPlusAPI from "./duoplus";

export interface LoopTaskBuilder {
  setTemplate(templateId: string, templateType: 1 | 2): LoopTaskBuilder;
  setName(name: string): LoopTaskBuilder;
  setRemark(remark: string): LoopTaskBuilder;
  addImage(image: LoopTaskImage): LoopTaskBuilder;
  build(): CreateLoopTaskRequest;
}

export class LoopTaskBuilderImpl implements LoopTaskBuilder {
  private request: Partial<CreateLoopTaskRequest> = {
    images: []
  };

  setTemplate(templateId: string, templateType: 1 | 2): LoopTaskBuilder {
    this.request.template_id = templateId;
    this.request.template_type = templateType;
    return this;
  }

  setName(name: string): LoopTaskBuilder {
    this.request.name = name;
    return this;
  }

  setRemark(remark: string): LoopTaskBuilder {
    this.request.remark = remark;
    return this;
  }

  addImage(image: LoopTaskImage): LoopTaskBuilder {
    if (!this.request.images) {
      this.request.images = [];
    }
    this.request.images.push(image);
    return this;
  }

  build(): CreateLoopTaskRequest {
    if (!this.request.template_id) {
      throw new Error("Template ID is required");
    }
    if (!this.request.template_type) {
      throw new Error("Template type is required");
    }
    if (!this.request.name) {
      throw new Error("Task name is required");
    }
    if (!this.request.images || this.request.images.length === 0) {
      throw new Error("At least one image is required");
    }

    return this.request as CreateLoopTaskRequest;
  }
}

export class LoopTaskHelper {
  constructor(private api: DuoPlusAPI) {}

  /**
   * Create a new loop task builder
   */
  static builder(): LoopTaskBuilder {
    return new LoopTaskBuilderImpl();
  }

  /**
   * Validate loop task configuration
   */
  static validateImage(image: LoopTaskImage): string[] {
    const errors: string[] = [];

    if (!image.image_id) {
      errors.push("Image ID is required");
    }

    if (!image.start_at) {
      errors.push("Start time is required");
    }

    if (!image.end_at) {
      errors.push("End time is required");
    }

    if (!image.execute_type) {
      errors.push("Execute type is required");
    } else {
      // Validate based on execute type
      if (image.execute_type === "1" && !image.gap_time) {
        errors.push("Gap time is required for interval execution");
      }

      if (["2", "3", "4"].includes(image.execute_type) && !image.execute_time) {
        errors.push("Execute time is required for daily/weekly/monthly execution");
      }

      if (image.execute_type === "3" && (!image.weeks || image.weeks.length === 0)) {
        errors.push("Weeks are required for weekly execution");
      }

      if (image.execute_type === "4" && (!image.days || image.days.length === 0)) {
        errors.push("Days are required for monthly execution");
      }

      if (
        ["2", "3", "4"].includes(image.execute_type) &&
        image.mode === 2 &&
        !image.execute_end_time
      ) {
        errors.push("Execute end time is required for loop execution mode");
      }

      if (["2", "3", "4"].includes(image.execute_type) && !image.mode) {
        errors.push("Mode is required for daily/weekly/monthly execution");
      }
    }

    if (image.config) {
      for (const [key, config] of Object.entries(image.config)) {
        if (!config.key) {
          errors.push(`Config key is required for ${key}`);
        }
        if (!config.type) {
          errors.push(`Config type is required for ${key}`);
        }
        if (config.required && (!config.value || config.value === "")) {
          errors.push(`Config value is required for ${key}`);
        }
      }
    }

    return errors;
  }

  /**
   * Create a loop task with validation
   */
  async createLoopTask(request: CreateLoopTaskRequest): Promise<CreateLoopTaskResponse> {
    // Validate all images
    for (const image of request.images) {
      const errors = LoopTaskHelper.validateImage(image);
      if (errors.length > 0) {
        throw new Error(`Invalid image configuration: ${errors.join(", ")}`);
      }
    }

    return this.api.createLoopTask(request);
  }

  /**
   * Create a simple interval loop task
   */
  async createIntervalTask(params: {
    templateId: string;
    templateType: 1 | 2;
    name: string;
    imageId: string;
    startAt: string;
    endAt: string;
    gapTime: number;
    remark?: string;
    config?: Record<string, LoopTaskConfig>;
  }): Promise<CreateLoopTaskResponse> {
    const request = LoopTaskHelper.builder()
      .setTemplate(params.templateId, params.templateType)
      .setName(params.name)
      .setRemark(params.remark || "")
      .addImage({
        image_id: params.imageId,
        config: params.config,
        start_at: params.startAt,
        end_at: params.endAt,
        execute_type: "1",
        gap_time: params.gapTime
      })
      .build();

    return this.createLoopTask(request);
  }

  /**
   * Create a daily loop task
   */
  async createDailyTask(params: {
    templateId: string;
    templateType: 1 | 2;
    name: string;
    imageId: string;
    startAt: string;
    endAt: string;
    executeTime: string;
    mode: 1 | 2;
    executeEndTime?: string;
    remark?: string;
    config?: Record<string, LoopTaskConfig>;
  }): Promise<CreateLoopTaskResponse> {
    const request = LoopTaskHelper.builder()
      .setTemplate(params.templateId, params.templateType)
      .setName(params.name)
      .setRemark(params.remark || "")
      .addImage({
        image_id: params.imageId,
        config: params.config,
        start_at: params.startAt,
        end_at: params.endAt,
        execute_type: "2",
        execute_time: params.executeTime,
        mode: params.mode,
        execute_end_time: params.executeEndTime
      })
      .build();

    return this.createLoopTask(request);
  }

  /**
   * Create a weekly loop task
   */
  async createWeeklyTask(params: {
    templateId: string;
    templateType: 1 | 2;
    name: string;
    imageId: string;
    startAt: string;
    endAt: string;
    executeTime: string;
    weeks: number[];
    mode: 1 | 2;
    executeEndTime?: string;
    remark?: string;
    config?: Record<string, LoopTaskConfig>;
  }): Promise<CreateLoopTaskResponse> {
    const request = LoopTaskHelper.builder()
      .setTemplate(params.templateId, params.templateType)
      .setName(params.name)
      .setRemark(params.remark || "")
      .addImage({
        image_id: params.imageId,
        config: params.config,
        start_at: params.startAt,
        end_at: params.endAt,
        execute_type: "3",
        execute_time: params.executeTime,
        weeks: params.weeks,
        mode: params.mode,
        execute_end_time: params.executeEndTime
      })
      .build();

    return this.createLoopTask(request);
  }

  /**
   * Create a monthly loop task
   */
  async createMonthlyTask(params: {
    templateId: string;
    templateType: 1 | 2;
    name: string;
    imageId: string;
    startAt: string;
    endAt: string;
    executeTime: string;
    days: number[];
    mode: 1 | 2;
    executeEndTime?: string;
    remark?: string;
    config?: Record<string, LoopTaskConfig>;
  }): Promise<CreateLoopTaskResponse> {
    const request = LoopTaskHelper.builder()
      .setTemplate(params.templateId, params.templateType)
      .setName(params.name)
      .setRemark(params.remark || "")
      .addImage({
        image_id: params.imageId,
        config: params.config,
        start_at: params.startAt,
        end_at: params.endAt,
        execute_type: "4",
        execute_time: params.executeTime,
        days: params.days,
        mode: params.mode,
        execute_end_time: params.executeEndTime
      })
      .build();

    return this.createLoopTask(request);
  }

  /**
   * Create config object for common field types
   */
  static createConfig(
    key: string,
    value: string | string[],
    type: LoopTaskConfig["type"],
    required: boolean = true
  ): LoopTaskConfig {
    return {
      key,
      value,
      type,
      required
    };
  }

  /**
   * Create file config
   */
  static createFileConfig(key: string, urls: string[], required: boolean = true): LoopTaskConfig {
    return this.createConfig(key, urls, "file", required);
  }

  /**
   * Create text config
   */
  static createTextConfig(key: string, text: string, required: boolean = true): LoopTaskConfig {
    return this.createConfig(key, text, "textarea", required);
  }

  /**
   * Create boolean config
   */
  static createBooleanConfig(
    key: string,
    value: boolean,
    required: boolean = true
  ): LoopTaskConfig {
    return this.createConfig(key, value.toString(), "boolean", required);
  }

  /**
   * Create number config
   */
  static createNumberConfig(key: string, value: number, required: boolean = true): LoopTaskConfig {
    return this.createConfig(key, value.toString(), "number", required);
  }

  /**
   * Create string config
   */
  static createStringConfig(key: string, value: string, required: boolean = true): LoopTaskConfig {
    return this.createConfig(key, value, "string", required);
  }

  /**
   * Create Excel config (comma-separated values)
   */
  static createExcelConfig(
    key: string,
    values: string[],
    required: boolean = false
  ): LoopTaskConfig {
    return this.createConfig(key, values.join(","), "excel", required);
  }
}

export default LoopTaskHelper;
