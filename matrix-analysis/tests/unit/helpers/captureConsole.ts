import { spyOn } from "bun:test";
import type { Restorable } from "./captureExit";

export interface ConsoleCaptureResult extends Restorable {
  readonly logs: string[];
  readonly errors: string[];
  readonly stdout: string[];
}

export class ConsoleCapture implements ConsoleCaptureResult {
  readonly logs: string[] = [];
  readonly errors: string[] = [];
  readonly stdout: string[] = [];

  private logSpy: ReturnType<typeof spyOn>;
  private errorSpy: ReturnType<typeof spyOn>;
  private writeSpy: ReturnType<typeof spyOn>;

  constructor() {
    this.logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      this.logs.push(args.map(String).join(" "));
    });

    this.errorSpy = spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      this.errors.push(args.map(String).join(" "));
    });

    this.writeSpy = spyOn(process.stdout, "write").mockImplementation(
      (chunk: string | Uint8Array, ..._rest: unknown[]) => {
        if (typeof chunk === "string") {
          this.stdout.push(chunk);
        } else {
          this.stdout.push(new TextDecoder().decode(chunk));
        }
        return true;
      }
    );
  }

  restore(): void {
    this.logSpy.mockRestore();
    this.errorSpy.mockRestore();
    this.writeSpy.mockRestore();
  }
}

export function captureConsole(): ConsoleCaptureResult {
  return new ConsoleCapture();
}
