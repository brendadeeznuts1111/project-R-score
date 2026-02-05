// utils/taxonomy-validator.ts - Base taxonomy validator
export interface TaxonomyNode {
  domain: string;
  type: string;
  meta: Record<string, any>;
  class: string;
  ref: string;
  description: string;
  tests: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Base taxonomy validator class
 */
export class TaxonomyValidator {
  protected nodes: Map<string, TaxonomyNode> = new Map();

  constructor() {
    this.initializeTaxonomy();
  }

  /**
   * Initialize base taxonomy
   */
  private initializeTaxonomy() {
    // Base implementation
  }

  /**
   * Add a node to the taxonomy
   */
  public addNode(id: string, node: TaxonomyNode): void {
    this.nodes.set(id, node);
  }

  /**
   * Get a node by ID
   */
  public getNode(id: string): TaxonomyNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  public getAllNodes(): Map<string, TaxonomyNode> {
    return new Map(this.nodes);
  }

  /**
   * Validate the taxonomy
   */
  public async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation logic
    for (const [id, node] of this.nodes) {
      if (!node.domain) {
        errors.push(`Node ${id} missing domain`);
      }
      if (!node.type) {
        errors.push(`Node ${id} missing type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
