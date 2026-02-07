
// lib/docs/references.ts - Documentation Reference Manager
import { BUN_DOCS } from './urls';

export class DocumentationReferenceManager {
  private references = new Map<string, DocReference>();
  
  constructor() {
    this.initSecretsRefs();
  }
  
  private initSecretsRefs(): void {
    // Bun Secrets API references
    this.add({
      id: 'secrets-get-options',
      title: 'Bun.secrets.get() Options',
      url: BUN_DOCS.secrets.getOptions,
      tags: ['secrets', 'security', 'runtime', 'api']
    });
    
    this.add({
      id: 'secrets-overview',
      title: 'Bun Secrets Overview',
      url: BUN_DOCS.secrets.overview,
      tags: ['secrets', 'security', 'runtime']
    });
    
    this.add({
      id: 'secrets-api',
      title: 'Bun Secrets API Reference',
      url: BUN_DOCS.secrets.api,
      tags: ['secrets', 'security', 'runtime', 'api']
    });
    
    // FactoryWager documentation
    this.add({
      id: 'factorywager-overview',
      title: 'FactoryWager Security Citadel Overview',
      url: BUN_DOCS.factorywager.overview,
      tags: ['factorywager', 'security', 'enterprise']
    });
    
    this.add({
      id: 'factorywager-versioning',
      title: 'FactoryWager Version Management',
      url: BUN_DOCS.factorywager.versioning,
      tags: ['factorywager', 'versioning', 'security']
    });
  }
  
  add(ref: DocReference): void {
    this.references.set(ref.id, ref);
  }
  
  get(id: string): DocReference | undefined {
    return this.references.get(id);
  }
  
  getByTag(tag: string): DocReference[] {
    return Array.from(this.references.values()).filter(ref => 
      ref.tags.includes(tag)
    );
  }
  
  // Convenience methods
  getSecretsRef(): DocReference | undefined {
    return this.get('secrets-get-options');
  }
  
  getFactoryWagerRef(): DocReference | undefined {
    return this.get('factorywager-overview');
  }
}

interface DocReference {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export const docRefs = new DocumentationReferenceManager();
