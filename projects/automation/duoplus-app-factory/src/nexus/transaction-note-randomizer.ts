// 🌯 TRANSACTION NOTE RANDOMIZER
// Human-like transaction notes for financial warming loop
// Generated: January 22, 2026 | Bun 1.3.6 | Nebula-Flow™ v3.5.0

import { crypto } from "bun";

/**
 * Transaction Note Interface
 * Human-like transaction metadata
 */
export interface TransactionNote {
  text: string;
  emoji: string;
  timestamp: string;
  riskProfile: "low" | "medium" | "high";
  category: string;
}

/**
 * Note Randomization Configuration
 * Weighted categories for realistic distribution
 */
export interface NoteConfig {
  categories: {
    food: {
      notes: string[];
      emojis: string[];
      weight: number; // 0-1
    };
    transport: {
      notes: string[];
      emojis: string[];
      weight: number;
    };
    entertainment: {
      notes: string[];
      emojis: string[];
      weight: number;
    };
    utilities: {
      notes: string[];
      emojis: string[];
      weight: number;
    };
    social: {
      notes: string[];
      emojis: string[];
      weight: number;
    };
  };
  riskProfiles: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Transaction Note Randomizer
 * Generates human-like transaction notes with emojis
 */
export class TransactionNoteRandomizer {
  private config: NoteConfig;

  constructor() {
    this.config = {
      categories: {
        food: {
          notes: ["Lunch", "Coffee", "Brunch", "Dinner", "Snacks", "Groceries", "Takeout"],
          emojis: ["🌯", "☕", "🥞", "🍽️", "🍫", "🛒", "🍜"],
          weight: 0.35,
        },
        transport: {
          notes: ["Gas", "Uber", "Parking", "Transit", "Ride", "Taxi", "Fuel"],
          emojis: ["⛽", "🚗", "🅿️", "🚇", "🚕", "🛺", "⚡"],
          weight: 0.20,
        },
        entertainment: {
          notes: ["Movie", "Game", "Concert", "Stream", "Ticket", "Event", "Show"],
          emojis: ["🎬", "🎮", "🎵", "📺", "🎟️", "🎪", "🎭"],
          weight: 0.15,
        },
        utilities: {
          notes: ["Rent", "Bill", "Phone", "Internet", "Electric", "Water", "Heat"],
          emojis: ["🏠", "📱", "🌐", "💡", "💧", "🔥", "⚡"],
          weight: 0.10,
        },
        social: {
          notes: ["Split", "Thanks", "Reimburse", "Gift", "Present", "Charity", "Donation"],
          emojis: ["💰", "🙏", "↩️", "🎁", "💝", "❤️", "✨"],
          weight: 0.20,
        },
      },
      riskProfiles: {
        low: 0.85,
        medium: 0.10,
        high: 0.05,
      },
    };
  }

  /**
   * Generate Transaction Note
   * Creates human-like note with weighted randomization
   */
  generate(
    senderId: string,
    receiverId: string,
    amount: number
  ): TransactionNote {
    // Select category based on weights
    const category = this.selectCategory();
    const categoryData = this.config.categories[category];

    // Select note and emoji
    const note = categoryData.notes[
      Math.floor(Math.random() * categoryData.notes.length)
    ];
    const emoji = categoryData.emojis[
      Math.floor(Math.random() * categoryData.emojis.length)
    ];

    // Determine risk profile (mostly low for warming loop)
    const riskProfile = this.selectRiskProfile();

    // Add human-like variations based on amount
    const finalNote = this.addAmountVariation(note, amount);

    return {
      text: finalNote,
      emoji,
      timestamp: new Date().toISOString(),
      riskProfile,
      category,
    };
  }

  /**
   * Generate Batch Notes
   * Creates multiple notes for batch warmup
   */
  generateBatch(
    count: number,
    senderId: string,
    receiverId: string,
    amounts: number[]
  ): TransactionNote[] {
    const notes: TransactionNote[] = [];

    for (let i = 0; i < count; i++) {
      const amount = amounts[i] || 1.00;
      notes.push(this.generate(senderId, receiverId, amount));
    }

    return notes;
  }

  /**
   * Select Category
   * Weighted random selection
   */
  private selectCategory(): string {
    const rand = Math.random();
    let cumulative = 0;

    for (const [category, data] of Object.entries(this.config.categories)) {
      cumulative += data.weight;
      if (rand <= cumulative) {
        return category;
      }
    }

    return "food"; // Default
  }

  /**
   * Select Risk Profile
   * Mostly low for warming loop
   */
  private selectRiskProfile(): "low" | "medium" | "high" {
    const rand = Math.random();
    const profiles = this.config.riskProfiles;

    if (rand <= profiles.low) return "low";
    if (rand <= profiles.low + profiles.medium) return "medium";
    return "high";
  }

  /**
   * Add Amount Variation
   * Human-like variations based on amount
   */
  private addAmountVariation(note: string, amount: number): string {
    if (amount < 5) {
      // Small amounts - casual
      const casualVariations = ["Quick", "Quickie", "Real quick", "Fast"];
      if (Math.random() > 0.7) {
        return `${casualVariations[Math.floor(Math.random() * casualVariations.length)]} ${note}`;
      }
    } else if (amount > 20) {
      // Larger amounts - more formal
      const formalVariations = ["", "Payment for", "Settlement for", "Re: "];
      return `${formalVariations[Math.floor(Math.random() * formalVariations.length)]} ${note}`;
    }

    return note;
  }

  /**
   * Export for Database
   * Format for SQLite storage
   */
  exportForSQLite(note: TransactionNote, transactionId: string): {
    transaction_id: string;
    text: string;
    emoji: string;
    risk_profile: string;
    category: string;
    timestamp: string;
  } {
    return {
      transaction_id: transactionId,
      text: note.text,
      emoji: note.emoji,
      risk_profile: note.riskProfile,
      category: note.category,
      timestamp: note.timestamp,
    };
  }

  /**
   * Generate Note for Specific Platform
   * Platform-specific note generation
   */
  generateForPlatform(
    platform: "venmo" | "cashapp" | "crypto",
    senderId: string,
    receiverId: string,
    amount: number
  ): TransactionNote {
    const baseNote = this.generate(senderId, receiverId, amount);

    // Platform-specific adjustments
    if (platform === "venmo") {
      // Venmo tends to be more social
      if (baseNote.category === "social") {
        baseNote.emoji = "💰"; // Standardize for Venmo
      }
    } else if (platform === "cashapp") {
      // CashApp tends to be more casual
      if (baseNote.category === "food") {
        baseNote.text = baseNote.text.toLowerCase(); // Casual casing
      }
    } else if (platform === "crypto") {
      // Crypto tends to be more technical
      if (baseNote.category === "utilities") {
        baseNote.text = baseNote.text.replace("Bill", "Payment");
        baseNote.emoji = "₿";
      }
    }

    return baseNote;
  }

  /**
   * Validate Note
   * Check if note meets platform requirements
   */
  validateNote(note: TransactionNote, platform: "venmo" | "cashapp" | "crypto"): boolean {
    // Venmo: Max 200 characters, no special chars except emoji
    if (platform === "venmo") {
      return note.text.length <= 200 && /^[a-zA-Z0-9\s.,!?]+$/.test(note.text);
    }

    // CashApp: Max 140 characters, casual
    if (platform === "cashapp") {
      return note.text.length <= 140;
    }

    // Crypto: Max 100 characters, technical
    if (platform === "crypto") {
      return note.text.length <= 100;
    }

    return true;
  }

  /**
   * Security Report
   * Audit note distribution
   */
  securityReport(notes: TransactionNote[]): {
    total: number;
    byCategory: Record<string, number>;
    byRiskProfile: Record<string, number>;
    averageLength: number;
    emojiCoverage: number;
  } {
    const byCategory: Record<string, number> = {};
    const byRiskProfile: Record<string, number> = {};

    notes.forEach(note => {
      byCategory[note.category] = (byCategory[note.category] || 0) + 1;
      byRiskProfile[note.riskProfile] = (byRiskProfile[note.riskProfile] || 0) + 1;
    });

    const averageLength = notes.reduce((sum, n) => sum + n.text.length, 0) / notes.length;
    const emojiCoverage = (notes.filter(n => n.emoji).length / notes.length) * 100;

    return {
      total: notes.length,
      byCategory,
      byRiskProfile,
      averageLength,
      emojiCoverage,
    };
  }
}

// Default export
export const transactionNoteRandomizer = new TransactionNoteRandomizer();

/**
 * Transaction Note Generator CLI
 * Generate notes for batch warmup
 */
if (import.meta.main) {
  const randomizer = new TransactionNoteRandomizer();
  
  // Generate 10 sample notes
  const notes = randomizer.generateBatch(10, "Worker-01", "Worker-02", [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00]);
  
  console.log("\n🧬 Transaction Note Randomizer - Sample Output");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  notes.forEach((note, index) => {
    console.log(`${index + 1}. ${note.text} ${note.emoji} | Risk: ${note.riskProfile} | Category: ${note.category}`);
  });
  
  const report = randomizer.securityReport(notes);
  console.log("\n📊 Security Report");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total: ${report.total}`);
  console.log(`By Category: ${JSON.stringify(report.byCategory)}`);
  console.log(`By Risk Profile: ${JSON.stringify(report.byRiskProfile)}`);
  console.log(`Average Length: ${report.averageLength.toFixed(1)} chars`);
  console.log(`Emoji Coverage: ${report.emojiCoverage.toFixed(0)}%`);
}