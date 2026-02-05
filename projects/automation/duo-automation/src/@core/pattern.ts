/**
 * Core Pattern Base Class
 * Foundation for all pattern implementations
 */

export abstract class Pattern {
  protected pathname: string;
  protected config: any;

  constructor(config: { pathname: string }) {
    this.pathname = config.pathname;
    this.config = config;
  }

  abstract test(input: any): boolean;
  abstract exec(input: any): Promise<any>;

  getPathname(): string {
    return this.pathname;
  }

  getConfig(): any {
    return this.config;
  }
}

export class Filter extends Pattern {
  constructor(config: { pathname: string }) {
    super(config);
  }

  async exec(input: any): Promise<any> {
    return this.filter(input);
  }

  protected abstract filter(input: any): any;
}

export class Query extends Pattern {
  constructor(config: { pathname: string }) {
    super(config);
  }

  async exec(input: any): Promise<any> {
    return this.query(input);
  }

  protected abstract query(input: any): any;
}

export class Workflow extends Pattern {
  constructor(config: { pathname: string }) {
    super(config);
  }

  async exec(input: any): Promise<any> {
    return this.execute(input);
  }

  protected abstract execute(input: any): Promise<any>;
}
