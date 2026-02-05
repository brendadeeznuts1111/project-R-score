import { BUN_INSPECT_CUSTOM } from "../symbols/inspect";
import { ScopeContext } from "./ScopeContext";

export class DomainContext {
  private _scopes: Record<string, ScopeContext> | null = null;
  constructor(public domain: string) {}

  get scopes(): Record<string, ScopeContext> {
    if (!this._scopes) {
      const scope = (globalThis as any).SCOPE || "LOCAL-SANDBOX";
      this._scopes = {
        [scope]: new ScopeContext(scope, this.domain),
      };
    }
    return this._scopes;
  }

  [BUN_INSPECT_CUSTOM]() {
    return {
      "[DOMAIN]": this.domain,
      "[SCOPES]": this.scopes,
    };
  }
}
