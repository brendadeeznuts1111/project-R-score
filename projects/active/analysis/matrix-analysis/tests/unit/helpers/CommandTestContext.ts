import { ExitCapture } from "./captureExit";
import { ConsoleCapture } from "./captureConsole";
import { ProfileTestDir } from "./testProfileDir";

export interface CommandTestContextOptions {
  skipExit?: boolean;
}

export class CommandTestContext {
  profileDir!: ProfileTestDir;
  console!: ConsoleCapture;
  exit!: ExitCapture;

  private options: CommandTestContextOptions;

  constructor(options: CommandTestContextOptions = {}) {
    this.options = options;
  }

  async setup(): Promise<void> {
    this.profileDir = await ProfileTestDir.create();
    this.profileDir.mockLoader();
    this.console = new ConsoleCapture();
    if (!this.options.skipExit) {
      this.exit = new ExitCapture();
    }
  }

  async teardown(): Promise<void> {
    if (this.exit) {
      this.exit.restore();
    }
    this.console.restore();
    await this.profileDir.cleanup();
  }

  get dir(): string {
    return this.profileDir.dir;
  }
}
