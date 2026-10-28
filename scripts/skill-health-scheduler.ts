#!/usr/bin/env bun
import { joinPath } from '../lib/path-bun.ts';
import { loadSkillHealthManifest } from '../lib/harness/skill-health-loader.ts';
import {
  jobById,
  runSkillHealthJob,
  startSkillHealthScheduler,
} from '../lib/harness/skill-health-runner.ts';
import {
  loadSkillHealthState,
  resolveSkillHealthPaths,
} from '../lib/harness/skill-health-state.ts';

const root = joinPath(import.meta.dir, '..');
const args = Bun.argv.slice(2);
const command = args.find(arg => !arg.startsWith('--')) ?? 'check';
const json = args.includes('--json');
const option = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
};
const manifestPath = joinPath(root, option('manifest') ?? 'config/skill-health-scheduler.json');
const manifest = await loadSkillHealthManifest(manifestPath, root);

function emit(value: object): void {
  console.info(
    json ? JSON.stringify(value, null, 2) : Bun.inspect(value, { colors: true, depth: 6 })
  );
}

async function waitForSignal(): Promise<void> {
  await new Promise<void>(resolve => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
}

if (command === 'check') {
  emit({
    ok: true,
    manifest: manifestPath,
    bunVersion: Bun.version,
    timezone: manifest.timezone,
    jobs: manifest.jobs.map(job => ({
      id: job.id,
      enabled: job.enabled,
      trigger: job.trigger,
      nextRunAt:
        job.trigger.kind === 'cron'
          ? (Bun.cron.parse(job.trigger.schedule)?.toISOString() ?? null)
          : null,
    })),
  });
} else if (command === 'status') {
  const paths = resolveSkillHealthPaths(root, manifest);
  emit({
    ok: true,
    statePath: paths.statePath,
    state: await loadSkillHealthState(paths.statePath),
  });
} else if (command === 'once') {
  const selected = option('job')
    ? [jobById(manifest, option('job') as string)]
    : manifest.jobs.filter(job => job.enabled);
  const outcomes = [];
  for (const job of selected) outcomes.push(await runSkillHealthJob(root, manifest, job));
  emit(outcomes);
  if (outcomes.some(outcome => outcome.status === 'busy' || !outcome.result.ok))
    process.exitCode = 1;
} else if (command === 'watch' || command === 'daemon') {
  const handle = startSkillHealthScheduler(root, manifest, {
    cron: command === 'daemon',
    watch: true,
  });
  console.info(
    `skill-health ${command}: ${handle.watchers.length} watcher(s), ${handle.cronJobs.length} cron job(s), ${manifest.timezone}`
  );
  await waitForSignal();
  handle.stop();
} else {
  throw new Error(
    'usage: skill-health-scheduler.ts check|status|once|watch|daemon [--job=id] [--json]'
  );
}
