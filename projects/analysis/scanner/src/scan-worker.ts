import {scanProject} from './scan.ts';

declare const _self: {send(msg: unknown): void};

process.on('message', async (msg: {type: string; id?: number; dir?: string}) => {
	if (msg.type === 'shutdown') {
		process.exit(0);
	}
	if (msg.type === 'scan' && msg.id !== undefined && msg.dir) {
		try {
			const data = await scanProject(msg.dir);
			process.send!({type: 'result', id: msg.id, data});
		} catch (err: unknown) {
			process.send!({type: 'error', id: msg.id, error: err instanceof Error ? err.message : String(err)});
		}
	}
});

process.send!({type: 'ready'});
