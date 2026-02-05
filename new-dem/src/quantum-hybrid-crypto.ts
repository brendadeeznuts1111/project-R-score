/**
 * Quantum-Hybrid Cryptographic System for T3-Lattice v4.0
 * Implements dual-layer encryption: Post-Quantum + Traditional for migration period
 */

export interface DualSignature {
  pqSignature: string;
  traditionalSignature: string;
  timestamp: number;
  version: string;
  verificationPath: string;
}

export interface QuantumKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  algorithm: string;
}

export interface MerkleProof {
  root: string;
  leaves: string[];
  proof: string[];
}

export class QuantumHybridCrypto {
  private postQuantumKeyPair: CryptoKeyPair | null = null;
  private traditionalKeyPair: CryptoKeyPair | null = null;
  private isInitialized = false;
  private readonly VERSION = "v4.0-hybrid";

  /**
   * Initialize dual-layer cryptographic system
   */
  async initialize(): Promise<void> {
    try {
      // Parallel key generation for both layers
      [this.postQuantumKeyPair, this.traditionalKeyPair] = await Promise.all([
        this.generatePostQuantumKeyPair(),
        this.generateTraditionalKeyPair(),
      ]);

      this.isInitialized = true;
      console.log("✅ Quantum-Hybrid Crypto initialized");
    } catch (error) {
      console.error("❌ Failed to initialize quantum-hybrid crypto:", error);
      throw error;
    }
  }

  /**
   * Generate Post-Quantum key pair (ML-KEM-768 simulation)
   */
  private async generatePostQuantumKeyPair(): Promise<CryptoKeyPair> {
    // Note: True ML-KEM not yet available in browsers, using ECDSA as placeholder
    // In production, this would use actual post-quantum algorithms
    return await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384",
      },
      true,
      ["sign", "verify"]
    );
  }

  /**
   * Generate Traditional key pair (ECDSA P-384)
   */
  private async generateTraditionalKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384",
      },
      true,
      ["sign", "verify"]
    );
  }

  /**
   * Sign data with both quantum and traditional signatures
   */
  async signWithQuantumBackup(data: any): Promise<DualSignature> {
    if (
      !this.isInitialized ||
      !this.postQuantumKeyPair ||
      !this.traditionalKeyPair
    ) {
      throw new Error("Quantum-Hybrid Crypto not initialized");
    }

    try {
      // Serialize data for signing
      const dataBuffer = this.serializeData(data);

      // Parallel signing for compatibility during PQ migration
      const [pqSignature, traditionalSignature] = await Promise.all([
        this.generateQuantumSignature(dataBuffer),
        this.generateTraditionalSignature(dataBuffer),
      ]);

      // Generate verification path using Merkle tree
      const verificationPath = this.generateVerificationPath(
        pqSignature,
        traditionalSignature
      );

      return {
        pqSignature: this.arrayBufferToBase64(pqSignature),
        traditionalSignature: this.arrayBufferToBase64(traditionalSignature),
        timestamp: Date.now(),
        version: this.VERSION,
        verificationPath,
      };
    } catch (error) {
      console.error("❌ Failed to sign with quantum backup:", error);
      throw error;
    }
  }

  /**
   * Verify dual signature
   */
  async verifyDualSignature(
    data: any,
    dualSignature: DualSignature
  ): Promise<boolean> {
    if (
      !this.isInitialized ||
      !this.postQuantumKeyPair ||
      !this.traditionalKeyPair
    ) {
      throw new Error("Quantum-Hybrid Crypto not initialized");
    }

    try {
      const dataBuffer = this.serializeData(data);

      // Parallel verification of both signatures
      const [pqValid, traditionalValid] = await Promise.all([
        this.verifyQuantumSignature(
          dataBuffer,
          this.base64ToArrayBuffer(dualSignature.pqSignature)
        ),
        this.verifyTraditionalSignature(
          dataBuffer,
          this.base64ToArrayBuffer(dualSignature.traditionalSignature)
        ),
      ]);

      // Verify Merkle proof
      const merkleValid = this.verifyMerkleProof(dualSignature);

      return pqValid && traditionalValid && merkleValid;
    } catch (error) {
      console.error("❌ Failed to verify dual signature:", error);
      return false;
    }
  }

  /**
   * Generate quantum signature
   */
  private async generateQuantumSignature(
    data: ArrayBuffer
  ): Promise<ArrayBuffer> {
    if (!this.postQuantumKeyPair?.privateKey) {
      throw new Error("Post-quantum key pair not available");
    }

    return await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-384" },
      },
      this.postQuantumKeyPair.privateKey,
      data
    );
  }

  /**
   * Generate traditional signature
   */
  private async generateTraditionalSignature(
    data: ArrayBuffer
  ): Promise<ArrayBuffer> {
    if (!this.traditionalKeyPair?.privateKey) {
      throw new Error("Traditional key pair not available");
    }

    return await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-384" },
      },
      this.traditionalKeyPair.privateKey,
      data
    );
  }

  /**
   * Verify quantum signature
   */
  private async verifyQuantumSignature(
    data: ArrayBuffer,
    signature: ArrayBuffer
  ): Promise<boolean> {
    if (!this.postQuantumKeyPair?.publicKey) {
      return false;
    }

    try {
      return await crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-384" },
        },
        this.postQuantumKeyPair.publicKey,
        signature,
        data
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify traditional signature
   */
  private async verifyTraditionalSignature(
    data: ArrayBuffer,
    signature: ArrayBuffer
  ): Promise<boolean> {
    if (!this.traditionalKeyPair?.publicKey) {
      return false;
    }

    try {
      return await crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-384" },
        },
        this.traditionalKeyPair.publicKey,
        signature,
        data
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate verification path using Merkle tree
   */
  private generateVerificationPath(pqSig: string, tradSig: string): string {
    const leaves = [pqSig, tradSig, Date.now().toString(), this.VERSION];
    const merkleTree = this.buildMerkleTree(leaves);
    return merkleTree.root;
  }

  /**
   * Build simple Merkle tree
   */
  private buildMerkleTree(leaves: string[]): { root: string; proof: string[] } {
    if (leaves.length === 0) {
      return { root: "", proof: [] };
    }

    // Hash leaves
    const hashedLeaves = leaves.map((leaf) => this.hashString(leaf));

    // Build tree (simplified implementation)
    let currentLevel = hashedLeaves;
    const proof: string[] = [];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Handle odd numbers
        const combined = left + right;
        nextLevel.push(this.hashString(combined));
      }

      proof.push(...currentLevel.slice(0, Math.min(2, currentLevel.length)));
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0] || "",
      proof,
    };
  }

  /**
   * Verify Merkle proof
   */
  private verifyMerkleProof(dualSignature: DualSignature): boolean {
    // Simplified verification - in production, this would reconstruct the path
    const leaves = [
      dualSignature.pqSignature,
      dualSignature.traditionalSignature,
      dualSignature.timestamp.toString(),
      dualSignature.version,
    ];

    const tree = this.buildMerkleTree(leaves);
    return tree.root === dualSignature.verificationPath;
  }

  /**
   * Serialize data to ArrayBuffer
   */
  private serializeData(data: any): ArrayBuffer {
    const jsonString = JSON.stringify(data);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Hash string using SHA-256
   */
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to Hex
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((byte: number) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Get public keys for sharing
   */
  async generateKeyPair(): Promise<{
    postQuantum: string;
    traditional: string;
  }> {
    if (
      !this.isInitialized ||
      !this.postQuantumKeyPair ||
      !this.traditionalKeyPair
    ) {
      throw new Error("Quantum-Hybrid Crypto not initialized");
    }

    const [pqPublicKey, tradPublicKey] = await Promise.all([
      crypto.subtle.exportKey("spki", this.postQuantumKeyPair.publicKey),
      crypto.subtle.exportKey("spki", this.traditionalKeyPair.publicKey),
    ]);

    return {
      postQuantum: this.arrayBufferToBase64(pqPublicKey),
      traditional: this.arrayBufferToBase64(tradPublicKey),
    };
  }

  /**
   * Check if system is initialized
   */
  isReady(): boolean {
    return (
      this.isInitialized &&
      this.postQuantumKeyPair !== null &&
      this.traditionalKeyPair !== null
    );
  }

  /**
   * Get system version
   */
  getVersion(): string {
    return this.VERSION;
  }

  /**
   * Performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    signTime: number;
    verifyTime: number;
    keyGenTime: number;
  }> {
    const testData = { test: "performance", timestamp: Date.now() };

    const signStart = performance.now();
    const signature = await this.signWithQuantumBackup(testData);
    const signTime = performance.now() - signStart;

    const verifyStart = performance.now();
    await this.verifyDualSignature(testData, signature);
    const verifyTime = performance.now() - verifyStart;

    const keyGenStart = performance.now();
    const tempCrypto = new QuantumHybridCrypto();
    await tempCrypto.initialize();
    const keyGenTime = performance.now() - keyGenStart;

    return { signTime, verifyTime, keyGenTime };
  }
}

/**
 * Factory for creating quantum-hybrid crypto instances
 */
export class QuantumHybridCryptoFactory {
  private static instance: QuantumHybridCrypto | null = null;

  /**
   * Get singleton instance
   */
  static async getInstance(): Promise<QuantumHybridCrypto> {
    if (!this.instance) {
      this.instance = new QuantumHybridCrypto();
      await this.instance.initialize();
    }
    return this.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Utility functions for quantum-hybrid operations
 */
export class QuantumHybridUtils {
  /**
   * Compare two dual signatures
   */
  static compareSignatures(sig1: DualSignature, sig2: DualSignature): boolean {
    return (
      sig1.pqSignature === sig2.pqSignature &&
      sig1.traditionalSignature === sig2.traditionalSignature &&
      sig1.timestamp === sig2.timestamp &&
      sig1.version === sig2.version
    );
  }

  /**
   * Check if signature is expired
   */
  static isSignatureExpired(
    signature: DualSignature,
    maxAgeMs: number = 300000
  ): boolean {
    return Date.now() - signature.timestamp > maxAgeMs;
  }

  /**
   * Validate signature format
   */
  static validateSignatureFormat(signature: DualSignature): boolean {
    return !!(
      signature.pqSignature &&
      signature.traditionalSignature &&
      signature.timestamp &&
      signature.version &&
      signature.verificationPath
    );
  }

  /**
   * Extract signature metadata
   */
  static extractMetadata(signature: DualSignature): {
    age: number;
    version: string;
    isValidFormat: boolean;
  } {
    return {
      age: Date.now() - signature.timestamp,
      version: signature.version,
      isValidFormat: this.validateSignatureFormat(signature),
    };
  }
}
