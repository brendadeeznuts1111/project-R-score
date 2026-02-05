import { BUN_INSPECT_CUSTOM } from "../symbols/inspect";
import { TypeContext } from "./TypeContext";
import * as config from "../config/scope.config";

export class ScopeContext {
  private _types: any = null;
  constructor(public scope: string, public domain: string) {}

  get types() {
    if (!this._types) {
      this._types = {
        STORAGE: new TypeContext("STORAGE", this.scope, this.domain),
        SECRETS: new TypeContext("SECRETS", this.scope, this.domain),
        SERVICE: new TypeContext("SERVICE", this.scope, this.domain),
      };
    }
    return this._types;
  }

  [BUN_INSPECT_CUSTOM]() {
    return {
      [`[SCOPE]`]: this.scope,
      [`[PLATFORM]`]: config.PLATFORM,
      ...this.types,
    };
  }
}
