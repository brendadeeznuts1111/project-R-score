/**
 * Task worker — spawned by the main server (Bun.spawn) for each task.
 *
 * Reads the task id from argv[2], runs the automation through the shared
 * driver layer, persists the session + logs + screenshot, and reports
 * progress over IPC (`process.send`) when spawned by the server. The SQLite
 * DB is the shared source of truth, so the worker can also be run standalone
 * (`bun worker.ts <taskId>`) for debugging — all writes go through the DB.
 *
 * @see https://bun.com/docs/runtime/spawn
 * @see https://bun.com/docs/runtime/webview
 * @see https://bun.com/docs/runtime/image
 */
import { randomUUID } from "node:crypto";
import { createDriver } from "./driver/factory.ts";
import {
  createDb,
  decrypt,
  logSession,
  resolveMasterKey,
  selectorsFor,
  type TaskRow,
  DB_PATH,
  DRIVER_MODE,
  LOG_LEVEL,
  SCREENSHOT_DIR,
} from "./lib/shared.ts";

await resolveMasterKey();

const taskId = process.argv[2];
if (!taskId) {
  console.error("[worker] no task ID provided — usage: bun worker.ts <taskId>");
  process.exit(1);
}

const db = createDb(DB_PATH);

function send(message: unknown): void {
  process.send?.(message);
}

function updateTask(progress: number, message: string): void {
  db.run(
    "UPDATE tasks SET progress = ?, progress_message = ?, updated_at = ? WHERE id = ?",
    [progress, message, Date.now(), taskId],
  );
  if (LOG_LEVEL === "debug") {
    console.log("[worker] progress %j", { taskId, progress, message });
  }
  send({ type: "progress", taskId, progress, message });
}

async function runTask(): Promise<void> {
  const task = db.query<TaskRow, [string]>("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) {
    send({ type: "error", taskId, error: "Task not found" });
    process.exit(1);
  }

  const driver = createDriver(DRIVER_MODE);
  const selectors = selectorsFor(task.url);
  try {
    updateTask(10, "Launching browser…");
    await driver.navigate(task.url);

    updateTask(30, "Navigating to login page…");
    await driver.waitForSelector(selectors.username, 15_000);

    updateTask(50, "Filling credentials…");
    await driver.fillLogin(selectors, task.username, decrypt(task.password_encrypted));
    await driver.submit(selectors.submit);

    updateTask(70, "Waiting for login to complete…");
    await driver.waitForSuccess(selectors.success, 30_000);

    updateTask(85, "Capturing session…");
    const snapshot = await driver.capture();
    const png = await driver.screenshot();

    const sessionId = randomUUID();
    const screenshotPath = `${SCREENSHOT_DIR}/${taskId}.png`;
    await Bun.write(screenshotPath, png);

    // Downscale thumbnail via Bun.Image
    try {
      const thumb = await new Bun.Image(new Uint8Array(png))
        .resize(480, 0, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .bytes();
      await Bun.write(`${SCREENSHOT_DIR}/${taskId}-thumb.jpg`, thumb);
    } catch (err) {
      console.warn("[worker] thumbnail failed:", (err as Error).message);
    }

    db.run(
      `INSERT INTO sessions (id, task_id, cookies, local_storage, session_storage, api_base, screenshot_path, last_healthy, expires_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        taskId,
        snapshot.cookies,
        snapshot.local_storage,
        snapshot.session_storage,
        new URL(task.url).origin + "/cloud/api",
        screenshotPath,
        Date.now(),
        Date.now() + 3_600_000,
        "active",
        Date.now(),
      ],
    );
    logSession(db, sessionId, "navigate", task.url);
    logSession(db, sessionId, "login", "success");

    db.run(
      "UPDATE tasks SET status = 'done', session_id = ?, progress = 100, progress_message = 'Done', updated_at = ? WHERE id = ?",
      [sessionId, Date.now(), taskId],
    );

    await driver.close().catch(() => {});
    send({ type: "done", taskId, sessionId });
    process.exit(0);
  } catch (err) {
    await driver.close().catch(() => {});
    const message = (err as Error).message || "Unknown error";
    db.run(
      "UPDATE tasks SET status = 'failed', progress_message = ?, updated_at = ? WHERE id = ?",
      [message, Date.now(), taskId],
    );
    const row = db.query<{ session_id: string | null }, [string]>("SELECT session_id FROM tasks WHERE id = ?").get(taskId);
    if (row?.session_id) logSession(db, row.session_id, "error", message);
    if (LOG_LEVEL === "debug") {
      console.log("[worker] error %j", { taskId, message });
    }
    send({ type: "error", taskId, error: message });
    process.exit(1);
  }
}

void runTask();
