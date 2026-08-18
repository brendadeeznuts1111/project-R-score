// @see https://bun.com/docs/runtime/cron#bun-cron-parse — Bun.cron.parse
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version

const argumentSchedule = Bun.argv[2];
const environmentSchedule = Bun.env.CRON_SCHEDULE;
const schedule = argumentSchedule ?? environmentSchedule ?? '@hourly';
const scheduleSource =
  argumentSchedule !== undefined
    ? 'argument'
    : environmentSchedule !== undefined
      ? 'environment'
      : 'default';
const relativeInput = Bun.argv[3];

if (Bun.env.TZ !== 'UTC') {
  throw new TypeError('cron:preview requires TZ=UTC under the Bun 1.3.14 runtime contract.');
}

if (Bun.env.CRON_TZ !== undefined && Bun.env.CRON_TZ !== 'UTC') {
  throw new TypeError(
    `CRON_TZ=${JSON.stringify(Bun.env.CRON_TZ)} is unsupported by Bun 1.3.14; use UTC.`
  );
}

function parseRelativeDate(value: string | undefined): Date {
  if (value === undefined) return new Date();
  if (/^-?\d+$/.test(value)) return new Date(Number(value));
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new TypeError(
      `Invalid relative date ${JSON.stringify(value)}. Use Unix milliseconds or an ISO timestamp ending in Z or ±HH:MM.`
    );
  }
  return new Date(value);
}

const relativeDate = parseRelativeDate(relativeInput);

if (Number.isNaN(relativeDate.getTime())) {
  throw new TypeError(
    `Invalid relative date ${JSON.stringify(relativeInput)}. Use an ISO date or Unix milliseconds.`
  );
}

function parseNextCronOccurrence(cronSchedule: string, after: Date): Date {
  const next = Bun.cron.parse(cronSchedule, after);
  if (next === null) {
    throw new TypeError(`Cron schedule ${JSON.stringify(cronSchedule)} has no future occurrence.`);
  }
  return next;
}

const next = parseNextCronOccurrence(schedule, relativeDate);

console.log(
  JSON.stringify({
    schedule,
    scheduleSource,
    timeZone: 'UTC',
    relativeInput: relativeInput ?? 'now',
    relativeDate: relativeDate.toISOString(),
    next: next.toISOString(),
    bunVersion: Bun.version,
  })
);
