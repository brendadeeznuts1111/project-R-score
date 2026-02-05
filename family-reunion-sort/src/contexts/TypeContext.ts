import { BUN_INSPECT_CUSTOM } from "../symbols/inspect";
import { MetaProperty } from "./MetaProperty";
import * as config from "../config/scope.config";

export class TypeContext {
  private _meta: Record<string, MetaProperty> | null = null;
  constructor(
    public type: "STORAGE" | "SECRETS" | "SERVICE",
    public scope: string,
    public domain: string
  ) {}

  get meta(): Record<string, MetaProperty> {
    if (!this._meta) {
      if (this.type === "STORAGE") {
        this._meta = {
          "{PROPERTY}": new MetaProperty("accounts/user123.json", this.type, this.scope, this.domain),
        };
      } else if (this.type === "SECRETS") {
        this._meta = {
          "{PROPERTY}": new MetaProperty("service-credentials", this.type, this.scope, this.domain),
        };
      } else {
        this._meta = {
          "{PROPERTY}": new MetaProperty("launcher-config", this.type, this.scope, this.domain),
        };
      }
    }
    return this._meta;
  }

  [BUN_INSPECT_CUSTOM]() {
    const label = `[TYPE:${this.type}]`;
    return {
      [label]: {
        backend: this.getBackend(),
        prefix: this.getPrefix(),
        meta: this.meta,
      },
    };
  }

  private getBackend(): string {
    if (this.type === "SECRETS") return config.SECRETS_BACKEND;
    if (this.type === "STORAGE") return "R2 / Local Mirror";
    return "Bun.spawn / IPC";
  }

  private getPrefix(): string {
    if (this.type === "STORAGE") return config.STORAGE_PREFIX;
    if (this.type === "SECRETS") return config.SERVICE_NAME;
    return `duoplus-${this.scope}`;
  }
}
