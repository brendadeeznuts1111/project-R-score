// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (primary)
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process (complement)
// @see https://github.com/tc39/proposal-explicit-resource-management — using → Disposable
/**
 * FactoryWager Bun.cron surface — claim/evidence in docs/harness/cron.md.
 *
 * Hierarchy (Bun docs):
 *   1. OS-persistent  await Bun.cron(path, schedule, title)   — primary lifecycle
 *   2. In-process     Bun.cron(schedule, handler) → CronJob — complement
 *
 * Prefer OS-persistent for standalone scripts / reboot-surviving jobs.
 * Prefer in-process for long-lived daemons that own their process lifetime
 * (spine scheduler) — no machine crontab mutation, shared state, UTC.
 */

/** CronJob handle from the in-process overload (Disposable). */
export type InProcessCronJob = Bun.CronJob;

/**
 * OS-persistent registration (primary for standalone / reboot-surviving jobs).
 *
 * Schedule uses **system local** time. Target module must:
 *   export default { scheduled(controller: Bun.CronController) { … } }
 *
 * @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
 */
export async function registerOsCron(path: string, schedule: string, title: string): Promise<void> {
  await Bun.cron(path, schedule, title);
}

/**
 * Remove a previously registered OS-level job by title.
 * @see https://bun.com/docs/runtime/cron#bun-cron-remove
 */
export async function removeOsCron(title: string): Promise<void> {
  await Bun.cron.remove(title);
}

/**
 * In-process complement — embed a scheduler in a long-lived process
 * (servers, containers, spine daemon). Shares pools/caches/module state.
 *
 * - Schedules are **UTC** (`0 9 * * *` = 09:00 UTC). OS-level form uses local time.
 * - **No overlap**: next fire only after handler + returned Promise settle.
 * - Errors match setTimeout: sync throw → uncaughtException; rejected Promise →
 *   unhandledRejection. Catch inside handlers so the daemon keeps running.
 * - `--hot` safe: jobs cleared before module re-eval.
 * - Prefer `using job = scheduleInProcess(…)` so Symbol.dispose → stop().
 * - `.ref()` (default) keeps process alive; `.unref()` allows natural exit.
 *
 * @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
 */
export function scheduleInProcess(
  schedule: string,
  handler: (this: Bun.CronJob) => unknown
): Bun.CronJob {
  return Bun.cron(schedule, handler);
}

/**
 * Preview next fire for an expression (always UTC).
 * @see https://bun.com/docs/runtime/cron#bun-cron-parse
 */
export function parseCron(expression: string, relativeDate?: Date | number): Date | null {
  return Bun.cron.parse(expression, relativeDate);
}
