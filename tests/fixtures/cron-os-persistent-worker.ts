// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — scheduled() handler
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * OS-persistent cron worker for the cron-os-persistent journey.
 * Invoked by the OS scheduler (or manually via bun run --cron-title=…).
 */
export default {
  async scheduled(controller: Bun.CronController) {
    const marker = Bun.env.FW_CRON_OS_MARKER;
    if (!marker) {
      throw new Error('FW_CRON_OS_MARKER is required');
    }
    await Bun.write(
      marker,
      `${JSON.stringify({
        ok: true,
        cron: controller.cron,
        type: controller.type,
        scheduledTime: controller.scheduledTime,
        at: Date.now(),
      })}\n`
    );
  },
};
