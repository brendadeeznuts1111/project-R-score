import DuoPlusAPI, { LoopTaskHelper } from "./index";

// Initialize the API
const api = new DuoPlusAPI({
  apiToken: "your-api-token",
  baseUrl: "https://my.duoplus.net"
});

const loopTaskHelper = new LoopTaskHelper(api);

/**
 * Example 1: Create a simple interval task
 */
export async function createIntervalTaskExample() {
  try {
    const response = await loopTaskHelper.createIntervalTask({
      templateId: "template-123",
      templateType: 2, // Custom template
      name: "Social Media Posting Task",
      imageId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
      startAt: "2025-12-11 17:38",
      endAt: "2025-12-25 18:08",
      gapTime: 20, // Execute every 20 minutes
      remark: "Automated social media posting",
      config: {
        file: LoopTaskHelper.createFileConfig("file", [
          "https://example.com/image1.png",
          "https://example.com/image2.png"
        ]),
        text: LoopTaskHelper.createTextConfig(
          "text",
          "Check out my new post!\n#socialmedia #marketing"
        ),
        bool: LoopTaskHelper.createBooleanConfig("bool", true),
        age: LoopTaskHelper.createNumberConfig("age", 18),
        name: LoopTaskHelper.createStringConfig("name", "duoplus"),
        email: LoopTaskHelper.createExcelConfig(
          "email",
          ["user1@example.com", "user2@example.com"],
          false
        ),
        password: LoopTaskHelper.createExcelConfig("password", ["pass1", "pass2"], false)
      }
    });

    console.log("Interval task created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create interval task:", error);
    throw error;
  }
}

/**
 * Example 2: Create a daily task with loop execution
 */
export async function createDailyTaskExample() {
  try {
    const response = await loopTaskHelper.createDailyTask({
      templateId: "template-daily-456",
      templateType: 1, // Official template
      name: "Daily Data Backup",
      imageId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
      startAt: "2025-12-01 00:00",
      endAt: "2025-12-31 23:59",
      executeTime: "15:11", // Execute at 3:11 PM
      mode: 2, // Loop execution
      executeEndTime: "18:00", // Stop loop at 6:00 PM
      remark: "Automated daily backup process",
      config: {
        backup_path: LoopTaskHelper.createStringConfig("backup_path", "/sdcard/backup/"),
        compress: LoopTaskHelper.createBooleanConfig("compress", true),
        retention_days: LoopTaskHelper.createNumberConfig("retention_days", 7)
      }
    });

    console.log("Daily task created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create daily task:", error);
    throw error;
  }
}

/**
 * Example 3: Create a weekly task for specific weekdays
 */
export async function createWeeklyTaskExample() {
  try {
    const response = await loopTaskHelper.createWeeklyTask({
      templateId: "template-weekly-789",
      templateType: 2, // Custom template
      name: "Weekly Report Generation",
      imageId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
      startAt: "2025-12-01 09:00",
      endAt: "2025-12-31 17:00",
      executeTime: "09:00", // Execute at 9:00 AM
      weeks: [1, 2, 3, 4, 5], // Monday to Friday
      mode: 1, // Single execution
      remark: "Generate weekly business reports",
      config: {
        report_type: LoopTaskHelper.createStringConfig("report_type", "business"),
        recipients: LoopTaskHelper.createExcelConfig("recipients", [
          "manager@company.com",
          "team@company.com"
        ]),
        include_charts: LoopTaskHelper.createBooleanConfig("include_charts", true)
      }
    });

    console.log("Weekly task created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create weekly task:", error);
    throw error;
  }
}

/**
 * Example 4: Create a monthly task for specific days
 */
export async function createMonthlyTaskExample() {
  try {
    const response = await loopTaskHelper.createMonthlyTask({
      templateId: "template-monthly-101",
      templateType: 1, // Official template
      name: "Monthly Invoice Processing",
      imageId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
      startAt: "2025-12-01 00:00",
      endAt: "2026-12-31 23:59",
      executeTime: "10:00", // Execute at 10:00 AM
      days: [22, 23, 12, 11], // Execute on these days of the month
      mode: 2, // Loop execution
      executeEndTime: "16:00", // Stop loop at 4:00 PM
      remark: "Process monthly invoices and payments",
      config: {
        invoice_template: LoopTaskHelper.createStringConfig("invoice_template", "standard"),
        auto_send: LoopTaskHelper.createBooleanConfig("auto_send", true),
        payment_methods: LoopTaskHelper.createExcelConfig("payment_methods", [
          "credit_card",
          "bank_transfer",
          "paypal"
        ])
      }
    });

    console.log("Monthly task created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create monthly task:", error);
    throw error;
  }
}

/**
 * Example 5: Using the builder pattern for complex tasks
 */
export async function createComplexTaskExample() {
  try {
    const request = LoopTaskHelper.builder()
      .setTemplate("complex-template-202", 2)
      .setName("Multi-Stage Marketing Campaign")
      .setRemark("Complex marketing automation with multiple stages")
      .addImage({
        image_id: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
        config: {
          campaign_name: LoopTaskHelper.createStringConfig("campaign_name", "Holiday Sale 2025"),
          budget: LoopTaskHelper.createNumberConfig("budget", 5000),
          target_audience: LoopTaskHelper.createTextConfig("target_audience", "US, Canada, UK"),
          creative_assets: LoopTaskHelper.createFileConfig("creative_assets", [
            "https://cdn.example.com/banner1.jpg",
            "https://cdn.example.com/banner2.jpg",
            "https://cdn.example.com/video1.mp4"
          ]),
          enable_ab_testing: LoopTaskHelper.createBooleanConfig("enable_ab_testing", true),
          email_list: LoopTaskHelper.createExcelConfig("email_list", [
            "subscribers@example.com",
            "customers@example.com"
          ])
        },
        start_at: "2025-12-01 09:00",
        end_at: "2025-12-31 18:00",
        execute_type: "2", // Daily
        execute_time: "09:00",
        mode: 2, // Loop execution
        execute_end_time: "17:00"
      })
      .build();

    const response = await loopTaskHelper.createLoopTask(request);
    console.log("Complex task created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create complex task:", error);
    throw error;
  }
}

/**
 * Example 6: Batch create multiple tasks
 */
export async function createBatchTasksExample() {
  const tasks = [
    {
      name: "Morning Social Media Post",
      executeTime: "08:00",
      imageId: "phone-morning-1"
    },
    {
      name: "Afternoon Social Media Post",
      executeTime: "14:00",
      imageId: "phone-afternoon-2"
    },
    {
      name: "Evening Social Media Post",
      executeTime: "19:00",
      imageId: "phone-evening-3"
    }
  ];

  const results = await Promise.allSettled(
    tasks.map((task) =>
      loopTaskHelper.createDailyTask({
        templateId: "social-media-template",
        templateType: 2,
        name: task.name,
        imageId: task.imageId,
        startAt: "2025-12-01 00:00",
        endAt: "2025-12-31 23:59",
        executeTime: task.executeTime,
        mode: 1,
        remark: `Automated ${task.name.toLowerCase()}`
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  console.log(`Batch creation completed: ${successful.length} successful, ${failed.length} failed`);

  if (failed.length > 0) {
    console.error(
      "Failed tasks:",
      failed.map((f) => (f.status === "rejected" ? f.reason : "Unknown"))
    );
  }

  return {
    successful: successful.length,
    failed: failed.length,
    results
  };
}

/**
 * Example 7: Validate configuration before creating
 */
export function validateTaskExample() {
  const image = {
    image_id: "",
    start_at: "2025-12-11 17:38",
    end_at: "2025-12-25 18:08",
    execute_type: "1" as const
    // Missing gap_time which is required for interval execution
  };

  const errors = LoopTaskHelper.validateImage(image);

  if (errors.length > 0) {
    console.log("Validation errors found:", errors);
    return false;
  }

  console.log("Configuration is valid");
  return true;
}

// Export all examples for easy testing
export const examples = {
  createIntervalTaskExample,
  createDailyTaskExample,
  createWeeklyTaskExample,
  createMonthlyTaskExample,
  createComplexTaskExample,
  createBatchTasksExample,
  validateTaskExample
};

export default examples;
