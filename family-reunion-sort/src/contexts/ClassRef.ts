import { BUN_INSPECT_CUSTOM } from "../symbols/inspect";

let instanceCounter = 0;

export class ClassRef {
  readonly #refId = ++instanceCounter;

  constructor(
    public className: string,
    public property: string,
    public scope: string
  ) {}

  [BUN_INSPECT_CUSTOM]() {
    return {
      [`[CLASS]`]: this.className,
      [`[#REF:${this.#refId}]`]: {
        scope: this.scope,
        property: this.property,
        methods: ["getScopedKey", "assertValid", "launch"],
      },
    };
  }
}
