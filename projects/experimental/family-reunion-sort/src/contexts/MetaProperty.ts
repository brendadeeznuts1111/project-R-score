import { BUN_INSPECT_CUSTOM } from "../symbols/inspect";
import { ClassRef } from "./ClassRef";
import { getScopedKey } from "../utils/paths";

export class MetaProperty {
  private _classes: Record<string, ClassRef> | null = null;
  constructor(
    public property: string,
    public type: string,
    public scope: string,
    public domain: string
  ) {}

  get classes(): Record<string, ClassRef> {
    if (!this._classes) {
      if (this.type === "STORAGE") {
        this._classes = {
          "R2AppleManager": new ClassRef("R2AppleManager", this.property, this.scope),
        };
      } else {
        this._classes = {
          "UnifiedDashboardLauncher": new ClassRef("UnifiedDashboardLauncher", this.property, this.scope),
        };
      }
    }
    return this._classes;
  }

  [BUN_INSPECT_CUSTOM]() {
    return {
      [`[META:{${this.property}}]`]: {
        resolvedPath: this.getResolvedPath(),
        classes: this.classes,
      },
    };
  }

  private getResolvedPath(): string {
    if (this.type === "STORAGE") {
      return getScopedKey(this.property);
    }
    return `${this.scope}/${this.property}`;
  }
}
