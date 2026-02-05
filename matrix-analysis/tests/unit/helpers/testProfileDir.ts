import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spyOn, mock } from "bun:test";
import type { Profile } from "../../../src/lib/profileLoader";
import * as profileLoader from "../../../src/lib/profileLoader";
import { makeProfile } from "./fixtures";

export interface TestProfileDir {
  readonly dir: string;
  addProfile(name: string, overrides?: Partial<Profile>): Promise<Profile>;
  mockLoader(): void;
  cleanup(): Promise<void>;
}

export class ProfileTestDir implements TestProfileDir {
  readonly dir: string;

  private constructor(dir: string) {
    this.dir = dir;
  }

  static async create(): Promise<ProfileTestDir> {
    const dir = await mkdtemp(join(tmpdir(), "matrix-test-profiles-"));
    return new ProfileTestDir(dir);
  }

  async addProfile(name: string, overrides?: Partial<Profile>): Promise<Profile> {
    const profile = makeProfile({ name, ...overrides });
    await Bun.write(join(this.dir, `${name}.json`), JSON.stringify(profile, null, 2));
    return profile;
  }

  mockLoader(): void {
    const dir = this.dir;

    spyOn(profileLoader, "getProfilesDir").mockReturnValue(dir);

    spyOn(profileLoader, "loadProfile").mockImplementation(async (name: string) => {
      const filePath = join(dir, `${name}.json`);
      const file = Bun.file(filePath);
      if (!(await file.exists())) return null;
      return file.json().catch(() => null);
    });

    spyOn(profileLoader, "listProfiles").mockImplementation(async () => {
      const glob = new Bun.Glob("*.json");
      const names: string[] = [];
      for await (const f of glob.scan({ cwd: dir, absolute: false })) {
        names.push(f.replace(/\.json$/, ""));
      }
      return names.sort();
    });
  }

  async cleanup(): Promise<void> {
    mock.restore();
    await rm(this.dir, { recursive: true, force: true });
  }
}

export async function createTestProfileDir(): Promise<TestProfileDir> {
  return ProfileTestDir.create();
}
