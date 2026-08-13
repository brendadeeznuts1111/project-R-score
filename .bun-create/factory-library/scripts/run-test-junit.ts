import { $ } from 'bun';
import {
  junitContextPath,
  junitEnvironment,
  resolveJunitContext,
  writeJunitContext,
} from './junit-context.ts';

const reportPath = 'reports/junit.xml';
const context = await resolveJunitContext();
const env = { ...Bun.env, ...junitEnvironment(context, Bun.env) };

await $`mkdir -p reports`;
// A failed test run must not leave a prior XML report that downstream tooling
// could mistake for current evidence. The context is regenerated below.
await $`rm -f ${reportPath} ${junitContextPath(reportPath)}`;
await writeJunitContext(reportPath, context);
await $`bun test --reporter=junit --reporter-outfile=${reportPath} ${Bun.argv.slice(2)}`.env(env);
