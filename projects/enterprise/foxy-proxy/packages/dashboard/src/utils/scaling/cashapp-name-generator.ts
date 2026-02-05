// Advanced name generator for CashApp account creation
// Optimized for high-volume scaling with zero collisions

export class CashAppNameGenerator {
  private usedNames: Set<string> = new Set();
  private usedCashtags: Set<string> = new Set();
  private usedEmails: Set<string> = new Set();
  private usedPhones: Set<string> = new Set(); // Track phone numbers

  // Realistic name database (top 200 US names)
  private nameDatabase = {
    firstNames: {
      male: [
        "James",
        "John",
        "Robert",
        "Michael",
        "William",
        "David",
        "Richard",
        "Joseph",
        "Thomas",
        "Charles",
        "Christopher",
        "Daniel",
        "Matthew",
        "Anthony",
        "Mark",
        "Donald",
        "Steven",
        "Paul",
        "Andrew",
        "Joshua",
        "Kenneth",
        "Kevin",
        "Brian",
        "George",
        "Edward",
        "Ronald",
        "Timothy",
        "Jason",
        "Jeffrey",
        "Ryan",
        "Jacob",
        "Gary",
        "Nicholas",
        "Eric",
        "Jonathan",
        "Stephen",
        "Larry",
        "Justin",
        "Scott",
        "Brandon"
      ],
      female: [
        "Mary",
        "Patricia",
        "Jennifer",
        "Linda",
        "Barbara",
        "Elizabeth",
        "Susan",
        "Jessica",
        "Sarah",
        "Karen",
        "Nancy",
        "Lisa",
        "Betty",
        "Margaret",
        "Sandra",
        "Ashley",
        "Dorothy",
        "Kimberly",
        "Emily",
        "Donna",
        "Michelle",
        "Carol",
        "Amanda",
        "Melissa",
        "Deborah",
        "Stephanie",
        "Rebecca",
        "Laura",
        "Sharon",
        "Cynthia",
        "Kathleen",
        "Amy",
        "Shirley",
        "Angela",
        "Helen",
        "Anna",
        "Brenda",
        "Pamela",
        "Nicole",
        "Emma"
      ],
      unisex: [
        "Taylor",
        "Jordan",
        "Alex",
        "Casey",
        "Morgan",
        "Riley",
        "Avery",
        "Quinn",
        "Skyler",
        "Dakota"
      ]
    },
    lastNames: [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Clark",
      "Lewis",
      "Robinson",
      "Walker",
      "Young",
      "Allen",
      "King",
      "Wright",
      "Scott",
      "Green",
      "Baker",
      "Adams",
      "Nelson",
      "Carter",
      "Mitchell",
      "Perez",
      "Roberts",
      "Turner",
      "Phillips",
      "Campbell"
    ]
  };

  // Demographic data for realistic ages
  private demographicData: Record<string, { start: number; peak: number; end: number }> = {
    James: { start: 1940, peak: 1950, end: 2000 },
    Emma: { start: 1980, peak: 2000, end: 2020 },
    Taylor: { start: 1990, peak: 2010, end: 2020 }
  };

  constructor() {
    this.loadUsedData();
  }

  // Generate complete profile with unique identifiers
  async generateProfile(): Promise<{
    firstName: string;
    lastName: string;
    middleName?: string;
    displayName: string;
    cashtag: string;
    fullName: string;
    demographic: {
      birthYear: number;
      age: number;
    };
    email: string;
    phoneNumber: string;
  }> {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const gender = Math.random() > 0.5 ? "male" : "female";
      const firstName = this.getRandomFirstName(gender);
      const lastName = this.getRandomLastName();
      const middleName = Math.random() > 0.7 ? this.getRandomMiddleName(gender) : undefined;

      const fullName = middleName
        ? `${firstName} ${middleName} ${lastName}`
        : `${firstName} ${lastName}`;

      const displayName = this.generateDisplayName(firstName, lastName, middleName);
      const cashtag = this.generateCashtag(firstName, lastName);
      const email = this.generateEmail(firstName, lastName);
      const phoneNumber = this.generatePhoneNumber();

      // Check uniqueness across all identifiers
      const nameKey = fullName.toLowerCase();
      const cashtagKey = cashtag.toLowerCase();
      const emailKey = email.toLowerCase();
      const phoneKey = phoneNumber;

      if (
        !this.usedNames.has(nameKey) &&
        !this.usedCashtags.has(cashtagKey) &&
        !this.usedEmails.has(emailKey) &&
        !this.usedPhones.has(phoneKey)
      ) {
        // Mark all as used
        this.usedNames.add(nameKey);
        this.usedCashtags.add(cashtagKey);
        this.usedEmails.add(emailKey);
        this.usedPhones.add(phoneKey);

        // Save to DB (mock for now)
        await this.persistData({ fullName, cashtag, email, phoneNumber });

        return {
          firstName,
          lastName,
          middleName,
          displayName,
          cashtag,
          fullName,
          demographic: this.generateDemographics(firstName),
          email,
          phoneNumber
        };
      }

      attempts++;
    }

    throw new Error("Failed to generate unique profile after 100 attempts");
  }

  // Name generation helpers
  private getRandomFirstName(gender: "male" | "female"): string {
    const useUnisex = Math.random() < 0.15;
    const source = useUnisex
      ? this.nameDatabase.firstNames.unisex
      : this.nameDatabase.firstNames[gender];

    return source[Math.floor(Math.random() * source.length)];
  }

  private getRandomLastName(): string {
    return this.nameDatabase.lastNames[
      Math.floor(Math.random() * this.nameDatabase.lastNames.length)
    ];
  }

  private getRandomMiddleName(gender: "male" | "female"): string {
    const common =
      gender === "male" ? ["Michael", "James", "William"] : ["Marie", "Ann", "Elizabeth"];
    return common[Math.floor(Math.random() * common.length)];
  }

  // Generate display name
  private generateDisplayName(firstName: string, lastName: string, middleName?: string): string {
    const formats = [
      `${firstName} ${lastName}`,
      `${firstName} ${lastName[0]}.`,
      `${firstName[0]}. ${lastName}`,
      middleName ? `${firstName} ${middleName[0]}. ${lastName}` : `${firstName} ${lastName}`
    ];

    return formats[Math.floor(Math.random() * formats.length)];
  }

  // Generate cashtag
  private generateCashtag(firstName: string, lastName: string): string {
    const patterns = [
      () => `$${firstName}${lastName}${Math.floor(Math.random() * 99)}`,
      () => `$${firstName[0]}${lastName}${Math.floor(Math.random() * 999)}`,
      () => `$${firstName}${Math.floor(Math.random() * 9999)}`
    ];

    let attempts = 0;
    while (attempts < 50) {
      const cashtag = patterns[Math.floor(Math.random() * patterns.length)]();

      // CashApp rules: $ + 1-15 chars (letters/numbers)
      if (cashtag.length <= 16 && /^$[a-zA-Z][a-zA-Z0-9]+$/.test(cashtag)) {
        return cashtag;
      }
      attempts++;
    }

    // Fallback
    return `$${firstName.toLowerCase()}${Date.now().toString().slice(-4)}`;
  }

  // Generate email using custom domain
  private generateEmail(firstName: string, lastName: string): string {
    const patterns = [
      `${firstName}.${lastName}@mobile-accounts.net`,
      `${firstName[0]}${lastName}@mobile-accounts.net`,
      `${firstName}${Math.floor(Math.random() * 99)}@mobile-accounts.net`
    ];
    return patterns[Math.floor(Math.random() * patterns.length)].toLowerCase();
  }

  // Generate phone number matching proxy location
  private generatePhoneNumber(): string {
    // Use DuoPlus area code from proxy location
    const areaCodes = ["213", "415", "212", "312", "305"]; // Major cities
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const prefix = Math.floor(200 + Math.random() * 800); // 200-999
    const lineNumber = Math.floor(1000 + Math.random() * 9000); // 1000-9999

    // Format: +1-XXX-XXX-XXXX
    return `+1-${areaCode}-${prefix}-${lineNumber}`;
  }

  // Generate realistic age based on name
  private generateDemographics(firstName: string): {
    birthYear: number;
    age: number;
  } {
    const currentYear = new Date().getFullYear();
    const nameData = this.demographicData[firstName];

    let birthYear: number;
    if (nameData) {
      const rand = Math.random();
      if (rand < 0.6) {
        const peakRange = nameData.peak - nameData.start;
        birthYear = nameData.start + Math.floor(Math.random() * peakRange);
      } else {
        const totalRange = nameData.end - nameData.start;
        birthYear = nameData.start + Math.floor(Math.random() * totalRange);
      }
    } else {
      birthYear = currentYear - (18 + Math.floor(Math.random() * 27));
    }

    // Ensure 18+ for CashApp
    if (currentYear - birthYear < 18) {
      birthYear = currentYear - 18;
    }

    return {
      birthYear,
      age: currentYear - birthYear
    };
  }

  // Batch generation for scaling
  async generateBatch(count: number): Promise<Array<CashAppProfile>> {
    const batch: CashAppProfile[] = [];

    for (let i = 0; i < count; i++) {
      const profile = await this.generateProfile();
      batch.push(profile);
    }

    return batch;
  }

  // Persistence methods (mock implementation)
  private async loadUsedData() {
    // In production, load from database
    console.log("📝 Loading used identifiers from database...");
  }

  private async persistData(data: {
    fullName: string;
    cashtag: string;
    email: string;
    phoneNumber: string;
  }) {
    // In production, save to database
    console.log(`💾 Saving profile: ${data.fullName} (${data.cashtag})`);
  }
}

// Display name validator for CashApp
export class CashAppDisplayNameValidator {
  private blockedPatterns = [
    /admin/i,
    /cashapp/i,
    /official/i,
    /support/i,
    /test/i,
    /bot/i,
    /fake/i,
    /scam/i,
    /spam/i,
    /\d{4,}/, // No long number sequences
    /^[^a-zA-Z]/ // Must start with letter
  ];

  validate(displayName: string): boolean {
    if (displayName.length < 2 || displayName.length > 20) {
      return false;
    }
    if (!/^[a-zA-Z\s.]+$/.test(displayName)) {
      return false;
    }
    return !this.blockedPatterns.some((pattern) => pattern.test(displayName));
  }
}

// Export profile type for use in other classes
export type CashAppProfile = Awaited<ReturnType<CashAppNameGenerator["generateProfile"]>>;
