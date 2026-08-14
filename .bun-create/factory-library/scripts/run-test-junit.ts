// @see https://bun.com/docs/runtime/shell#getting-started
// @see https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
import { $ } from 'bun';
import {
  junitContextPath,
  junitEnvironment,
  resolveJunitContext,
  writeJunitContext,
} from './junit-context.ts';

const reportPath = 'reports/junit.xml';
const bunExecutable = Bun.argv[0];
const context = await resolveJunitContext();
const env = { ...Bun.env, ...junitEnvironment(context, Bun.env) };

await $`mkdir -p reports`;
// A failed test run must not leave a prior XML report that downstream tooling
// could mistake for current evidence. The context is regenerated below.
// @see https://bun.com/docs/guides/runtime/delete-file
for (const path of [reportPath, junitContextPath(reportPath)]) {
  const file = Bun.file(path);
  if (await file.exists()) await file.delete();
}
await writeJunitContext(reportPath, context);
await $`${bunExecutable} test --reporter=junit --reporter-outfile=${reportPath} ${Bun.argv.slice(2)}`.env(
  env,
);
