import { getProfilesDir, listProfiles, loadProfile } from "../lib/profileLoader";

export async function profileList(): Promise<void> {
	const profiles = await listProfiles();

	if (profiles.length === 0) {
		console.log(`No profiles found in ${getProfilesDir()}`);
		return;
	}

	const rows: { Name: string; Version: string; Env: string; Description: string }[] = [];

	for (const name of profiles) {
		const profile = await loadProfile(name);
		if (profile) {
			rows.push({
				Name: profile.name,
				Version: profile.version,
				Env: profile.env.NODE_ENV || "-",
				Description: (profile.description || "").slice(0, 50),
			});
		}
	}

	console.log(Bun.inspect.table(rows, undefined, { colors: !process.env.NO_COLOR }));
}
