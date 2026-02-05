import { DomainContext } from "./contexts/DomainContext";

export class MermaidGenerator {
  static generate(domainCtx: DomainContext): string {
    let diagram = "graph TD\n";
    const serializable = this.toSerializable(domainCtx);
    
    this.traverse(serializable, "Domain", (parent, child) => {
      const parentId = parent.replace(/[^a-zA-Z0-9]/g, "_");
      const childId = child.replace(/[^a-zA-Z0-9]/g, "_");
      diagram += `  ${parentId} --> ${childId}\n`;
    });
    
    return diagram;
  }

  private static toSerializable(obj: any): any {
    const seen = new WeakSet();
    
    const recurse = (current: any): any => {
      if (current === null || current === undefined) return current;
      
      if (typeof current === "object") {
        if (seen.has(current)) return "[Circular]";
        seen.add(current);

        const inspect = current[Symbol.for("Bun.inspect.custom")];
        if (typeof inspect === "function") {
          return recurse(inspect.call(current));
        }

        if (Array.isArray(current)) {
          return current.map(item => recurse(item));
        }

        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(current)) {
          out[k] = recurse(v);
        }
        return out;
      }
      return current;
    };

    return recurse(obj);
  }

  private static traverse(obj: any, parentName: string, callback: (parent: string, child: string) => void) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object") {
        callback(parentName, key);
        this.traverse(value, key, callback);
      }
    }
  }
}
