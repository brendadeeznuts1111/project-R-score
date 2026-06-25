import { spyOn } from "bun:test";

export interface Restorable {
  restore(): void;
}

export interface ExitCaptureResult extends Restorable {}

export class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
    this.name = "ExitError";
  }
}

export class ExitCapture implements ExitCaptureResult {
  private exitSpy: ReturnType<typeof spyOn>;

  constructor() {
    this.exitSpy = spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new ExitError(code ?? 0);
    });
  }

  restore(): void {
    this.exitSpy.mockRestore();
  }
}

export function captureExit(): ExitCaptureResult {
  return new ExitCapture();
}
