import {interactive} from '../lib/interactive-cli';

const cmd = 'validate-pointers';

await interactive.execute(cmd, async () => {
	const proc = Bun.spawn(['bun', 'scripts/validate-pointers.ts', '--bun-native']);
	const out = await new Response(proc.stdout).text();
	console.log(out);
	return out;
});
