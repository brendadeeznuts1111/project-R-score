import type {ProjectInfo} from './scan';

export interface ProjectContext {
	id: string;
	name: string;
	path: string;
	projectInfo: ProjectInfo;
}

export function resolveProjectId(projectPath: string): string {
	return projectPath;
}

export function validateProjectId(projectId: string): boolean {
	return projectId.length > 0;
}

export function createProjectContext(projectId: string): ProjectContext {
	const projectInfo: ProjectInfo = {
		folder: projectId,
		name: projectId,
		version: '-',
		deps: 0,
		devDeps: 0,
		totalDeps: 0,
		engine: '-',
		lock: 'none',
		bunfig: false,
		workspace: false,
		keyDeps: [],
		author: '-',
		license: '-',
		description: '-',
		scriptsCount: 0,
		bin: [],
		registry: '-',
		authReady: false,
		hasNpmrc: false,
		hasBinDir: false,
		scopes: [],
		resilient: false,
		hasPkg: false,
		frozenLockfile: false,
		dryRun: false,
		production: false,
		exact: false,
		installOptional: true,
		installDev: true,
		installAuto: '-',
		linker: '-',
		configVersion: -1,
		backend: '-',
		minimumReleaseAge: 0,
		minimumReleaseAgeExcludes: [],
		saveTextLockfile: false,
		cacheDisabled: false,
		cacheDir: '-',
		cacheDisableManifest: false,
		globalDir: '-',
		globalBinDir: '-',
		hasCa: false,
		lockfileSave: true,
		lockfilePrint: '-',
		installSecurityScanner: '-',
		linkWorkspacePackages: false,
		noVerify: false,
		verbose: false,
		silent: false,
		concurrentScripts: 0,
		networkConcurrency: 0,
		targetCpu: '-',
		targetOs: '-',
		overrides: {},
		resolutions: {},
		trustedDeps: [],
		repo: '-',
		repoSource: '-',
		repoOwner: '-',
		repoHost: '-',
		envFiles: [],
		projectTz: 'UTC',
		projectDnsTtl: '-',
		bunfigEnvRefs: [],
		peerDeps: [],
		peerDepsMeta: [],
		installPeer: true,
		runShell: '-',
		runBun: false,
		runSilent: false,
		debugEditor: '-',
		hasTests: false,
		nativeDeps: [],
		workspacesList: [],
		lockHash: '-',
	};

	return {
		id: projectId,
		name: projectId,
		path: `./${projectId}`,
		projectInfo,
	};
}

export function logProjectContext(context: ProjectContext, verbose?: boolean): void {
	if (verbose) {
		console.log(`Project: ${context.name} (${context.id}) at ${context.path}`);
	} else {
		console.log(`Project: ${context.name} (${context.id})`);
	}
}
