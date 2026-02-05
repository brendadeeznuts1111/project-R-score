// quantum-hybrid-crypto.ts
interface DualSignature {
  pqSignature: string;
  traditionalSignature: string;
  timestamp: number;
  version: string;
  verificationPath: string;
}

interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export class QuantumHybridCrypto {
  private postQuantumKeyPair?: CryptoKeyPair;
  private traditionalKeyPair?: CryptoKeyPair;

  async initialize(): Promise<void> {
    // Note: ML-KEM-768 is not yet available in Web Crypto API
    // Using ECDSA P-384 as placeholder for post-quantum simulation
    [this.postQuantumKeyPair, this.traditionalKeyPair] = await Promise.all([
      this.generateQuantumKeyPair(),
      this.generateTraditionalKeyPair()
    ]);
  }

  async signWithQuantumBackup(data: any): Promise<DualSignature> {
    if (!this.postQuantumKeyPair || !this.traditionalKeyPair) {
      throw new Error('Crypto system not initialized');
    }

    const [pqSignature, traditionalSignature] = await Promise.all([
      this.generateQuantumSignature(data),
      this.generateTraditionalSignature(data)
    ]);

    return {
      pqSignature,
      traditionalSignature,
      timestamp: Date.now(),
      version: 'v4.0-hybrid',
      verificationPath: this.generateVerificationPath(pqSignature, traditionalSignature)
    };
  }

  async verifyDualSignature(data: any, signature: DualSignature): Promise<boolean> {
    if (!this.postQuantumKeyPair || !this.traditionalKeyPair) {
      throw new Error('Crypto system not initialized');
    }

    const [pqValid, traditionalValid] = await Promise.all([
      this.verifyQuantumSignature(data, signature.pqSignature),
      this.verifyTraditionalSignature(data, signature.traditionalSignature)
    ]);

    // Both signatures must be valid
    return pqValid && traditionalValid;
  }

  private async generateQuantumKeyPair(): Promise<CryptoKeyPair> {
    // Using ECDSA P-384 as proxy for post-quantum (ML-KEM-768 not available)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-384'
      },
      true,
      ['sign', 'verify']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  private async generateTraditionalKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  private async generateQuantumSignature(data: any): Promise<string> {
    if (!this.postQuantumKeyPair) throw new Error('PQ key pair not initialized');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));

    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-384'
      },
      this.postQuantumKeyPair.privateKey,
      dataBuffer
    );

    return Buffer.from(signature).toString('hex');
  }

  private async generateTraditionalSignature(data: any): Promise<string> {
    if (!this.traditionalKeyPair) throw new Error('Traditional key pair not initialized');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));

    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      this.traditionalKeyPair.privateKey,
      dataBuffer
    );

    return Buffer.from(signature).toString('hex');
  }

  private async verifyQuantumSignature(data: any, signature: string): Promise<boolean> {
    if (!this.postQuantumKeyPair) throw new Error('PQ key pair not initialized');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const signatureBuffer = Buffer.from(signature, 'hex');

    return crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-384'
      },
      this.postQuantumKeyPair.publicKey,
      signatureBuffer,
      dataBuffer
    );
  }

  private async verifyTraditionalSignature(data: any, signature: string): Promise<boolean> {
    if (!this.traditionalKeyPair) throw new Error('Traditional key pair not initialized');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const signatureBuffer = Buffer.from(signature, 'hex');

    return crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      this.traditionalKeyPair.publicKey,
      signatureBuffer,
      dataBuffer
    );
  }

  private generateVerificationPath(pqSig: string, tradSig: string): string {
    const leaves = [pqSig, tradSig, Date.now().toString()];
    return this.buildMerkleTree(leaves).root;
  }

  private buildMerkleTree(leaves: string[]): { root: string } {
    // Simple Merkle tree implementation
    if (leaves.length === 0) return { root: '' };

    let nodes = leaves.map(leaf => Bun.hash.wyhash(leaf));

    while (nodes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = i + 1 < nodes.length ? nodes[i + 1] : left;
        nextLevel.push(Bun.hash.wyhash(left + right));
      }
      nodes = nextLevel;
    }

    return { root: nodes[0] };
  }
}