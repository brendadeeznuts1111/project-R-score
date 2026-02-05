/**
 * Unicode Table Generator for T3-Lattice
 * Implements a two-stage lookup table for fast Unicode property checks.
 */

export interface Context<T> {
  get(cp: number): T;
  eql(a: T, b: T): boolean;
}

export class Generator<T> {
  private context: Context<T>;
  private stage1: number[] = [];
  private stage2: T[] = [];

  constructor(context: Context<T>) {
    this.context = context;
  }

  async generate() {
    const blockSize = 256;
    const numBlocks = 0x110000 / blockSize;
    const blocks: Map<string, number> = new Map();

    for (let i = 0; i < numBlocks; i++) {
      const block: T[] = [];
      for (let j = 0; j < blockSize; j++) {
        block.push(this.context.get(i * blockSize + j));
      }

      const key = JSON.stringify(block);
      if (!blocks.has(key)) {
        const idx = this.stage2.length;
        blocks.set(key, idx);
        this.stage2.push(...block);
      }
      this.stage1.push(blocks.get(key)!);
    }

    return {
      stage1: this.stage1,
      stage2: this.stage2,
    };
  }
}
