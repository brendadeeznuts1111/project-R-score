// Realistic US address generator integrated with proxy location
// Ensures address matches phone area code and proxy location

export class CashAppAddressGenerator {
  private usedAddresses: Set<string> = new Set();

  // Real address database by state/city
  private addressDatabase: Record<
    string,
    Record<
      string,
      {
        zipPrefixes: string[];
        streets: string[];
        cities: string[];
      }
    >
  > = {
      california: {
        losAngeles: {
          zipPrefixes: ["900", "901", "902", "903", "904"],
          streets: [
            "Hollywood Blvd",
            "Sunset Blvd",
            "Wilshire Blvd",
            "Melrose Ave",
            "Beverly Blvd",
            "Santa Monica Blvd",
            "Venice Blvd",
            "Crenshaw Blvd"
          ],
          cities: ["Los Angeles", "Hollywood", "Beverly Hills", "Santa Monica"]
        },
        sanFrancisco: {
          zipPrefixes: ["941", "940"],
          streets: [
            "Market St",
            "Mission St",
            "Geary Blvd",
            "Van Ness Ave",
            "Lombard St",
            "Folsom St",
            "Howard St",
            "California St"
          ],
          cities: ["San Francisco", "Daly City", "San Bruno", "South San Francisco"]
        }
      },
      newYork: {
        newYorkCity: {
          zipPrefixes: ["100", "101", "102"],
          streets: [
            "Broadway",
            "5th Ave",
            "Madison Ave",
            "Park Ave",
            "Lexington Ave",
            "6th Ave",
            "7th Ave",
            "8th Ave"
          ],
          cities: ["New York", "Manhattan", "Brooklyn", "Queens"]
        }
      },
      florida: {
        miami: {
          zipPrefixes: ["331", "330"],
          streets: [
            "Ocean Dr",
            "Collins Ave",
            "Biscayne Blvd",
            "Flagler St",
            "Washington Ave",
            "Lincoln Rd",
            "Brickell Ave",
            "Coral Way"
          ],
          cities: ["Miami", "Miami Beach", "Coral Gables", "Hialeah"]
        }
      },
      texas: {
        dallas: {
          zipPrefixes: ["752", "753", "750"],
          streets: [
            "Main St",
            "Commerce St",
            "Elm St",
            "Oak Lawn Ave",
            "Mockingbird Ln",
            "Greenville Ave",
            "Belt Line Rd",
            "Preston Rd"
          ],
          cities: ["Dallas", "Irving", "Plano", "Garland"]
        }
      },
      illinois: {
        chicago: {
          zipPrefixes: ["606", "607"],
          streets: [
            "State St",
            "Michigan Ave",
            "Lakeshore Dr",
            "Roosevelt Rd",
            "Cermak Rd",
            "North Ave",
            "Division St",
            "Chicago Ave"
          ],
          cities: ["Chicago", "Cicero", "Oak Park", "Evanston"]
        }
      }
    };

  constructor() {
    this.loadUsedAddresses();
  }

  // Generate address matching proxy location
  async generateAddress(proxyLocation: { city: string; state: string }): Promise<{
    street: string;
    number: string;
    apartment?: string;
    city: string;
    state: string;
    stateCode: string;
    zipCode: string;
    fullAddress: string;
    formatted: {
      line1: string;
      line2?: string;
      cityStateZip: string;
    };
  }> {
    const stateKey = this.getStateKey(proxyLocation.state);
    const cityKey = this.getCityKey(proxyLocation.city);

    const locationData = this.addressDatabase[stateKey]?.[cityKey];
    if (!locationData) {
      throw new Error(`No address data for ${proxyLocation.city}, ${proxyLocation.state}`);
    }

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      // Generate address components
      const streetNumber = this.generateStreetNumber();
      const streetName =
        locationData.streets[Math.floor(Math.random() * locationData.streets.length)];
      const city = locationData.cities[Math.floor(Math.random() * locationData.cities.length)];
      const zipCode = this.generateZipCode(locationData.zipPrefixes);

      // Optional apartment (30% chance)
      const hasApartment = Math.random() < 0.3;
      const apartment = hasApartment ? `Apt ${Math.floor(Math.random() * 50) + 1}` : undefined;

      const fullAddress = apartment
        ? `${streetNumber} ${streetName}, ${apartment}, ${city}, ${proxyLocation.state} ${zipCode}`
        : `${streetNumber} ${streetName}, ${city}, ${proxyLocation.state} ${zipCode}`;

      // Check uniqueness
      if (!this.usedAddresses.has(fullAddress.toLowerCase())) {
        this.usedAddresses.add(fullAddress.toLowerCase());
        await this.persistAddress(fullAddress);

        return {
          street: streetName,
          number: streetNumber,
          apartment,
          city,
          state: proxyLocation.state,
          stateCode: this.getStateCode(proxyLocation.state),
          zipCode,
          fullAddress,
          formatted: {
            line1: `${streetNumber} ${streetName}`,
            line2: apartment,
            cityStateZip: `${city}, ${proxyLocation.state} ${zipCode}`
          }
        };
      }

      attempts++;
    }

    throw new Error("Failed to generate unique address");
  }

  // Street number generation (realistic ranges)
  private generateStreetNumber(): string {
    // Random 4-digit number for most streets
    return Math.floor(100 + Math.random() * 900).toString();
  }

  // ZIP code generation (matches area code)
  private generateZipCode(prefixes: string[]): string {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${suffix}`.slice(0, 5); // 5-digit ZIP
  }

  // State name to key mapping
  private getStateKey(state: string): keyof typeof this.addressDatabase {
    const mapping: Record<string, keyof typeof this.addressDatabase> = {
      California: "california",
      "New York": "newYork",
      Florida: "florida",
      Texas: "texas",
      Illinois: "illinois"
    };
    return mapping[state] || "california";
  }

  // City name to key mapping
  private getCityKey(city: string): string {
    const mapping: Record<string, string> = {
      "Los Angeles": "losAngeles",
      "San Francisco": "sanFrancisco",
      "New York": "newYorkCity",
      Miami: "miami",
      Dallas: "dallas",
      Chicago: "chicago"
    };
    return mapping[city] || "losAngeles";
  }

  // State to 2-letter code
  private getStateCode(state: string): string {
    const codes: Record<string, string> = {
      California: "CA",
      "New York": "NY",
      Florida: "FL",
      Texas: "TX",
      Illinois: "IL"
    };
    return codes[state] || "CA";
  }

  // Integration with full profile generator
  async generateFullProfile(proxyLocation: { city: string; state: string }): Promise<{
    name: { firstName: string; lastName: string };
    address: {
      street: string;
      number: string;
      apartment?: string;
      city: string;
      state: string;
      zipCode: string;
      fullAddress: string;
    };
    demo: { birthYear: number; age: number };
  }> {
    // Import dynamically to avoid circular dependency
    const { CashAppNameGenerator } = await import("./cashapp-name-generator");
    const nameGenerator = new CashAppNameGenerator();
    const nameProfile = await nameGenerator.generateProfile();

    const address = await this.generateAddress(proxyLocation);

    return {
      name: {
        firstName: nameProfile.firstName,
        lastName: nameProfile.lastName
      },
      address,
      demo: nameProfile.demographic
    };
  }

  // Batch generation
  async generateBatch(
    count: number,
    proxyLocation: { city: string; state: string }
  ): Promise<Array<CashAppFullProfile>> {
    const batch = [];
    for (let i = 0; i < count; i++) {
      batch.push(await this.generateFullProfile(proxyLocation));
    }
    return batch;
  }

  private async loadUsedAddresses() {
    // In production, load from database
    console.log("🏠 Loading used addresses from database...");
  }

  private async persistAddress(fullAddress: string) {
    // In production, save to database
    console.log(`💾 Saving address: ${fullAddress}`);
  }
}

// CashApp location matcher
export class CashAppLocationMatcher {
  // Match phone area code to proxy city
  private locationMap: Record<string, { city: string; state: string }> = {
    "213": { city: "Los Angeles", state: "California" },
    "415": { city: "San Francisco", state: "California" },
    "212": { city: "New York", state: "New York" },
    "312": { city: "Chicago", state: "Illinois" },
    "305": { city: "Miami", state: "Florida" },
    "214": { city: "Dallas", state: "Texas" }
  };

  getLocation(areaCode: string): { city: string; state: string } {
    return this.locationMap[areaCode] || { city: "Los Angeles", state: "California" };
  }

  // Generate matching address set
  async generateMatchingAddressSet(
    areaCode: string,
    count: number
  ): Promise<
    Array<{
      firstName: string;
      lastName: string;
      address: CashAppAddress;
      phoneNumber: string;
      cashtag: string;
      email: string;
    }>
  > {
    const location = this.getLocation(areaCode);
    const generator = new CashAppAddressGenerator();

    const profiles = await generator.generateBatch(count, location);

    // Import name generator to get complete profile data
    const { CashAppNameGenerator } = await import("./cashapp-name-generator");
    const nameGenerator = new CashAppNameGenerator();

    const completeProfiles = [];
    for (let i = 0; i < count; i++) {
      const nameProfile = await nameGenerator.generateProfile();
      const addressProfile = profiles[i];

      completeProfiles.push({
        firstName: nameProfile.firstName,
        lastName: nameProfile.lastName,
        address: addressProfile.address as unknown as CashAppAddress,
        phoneNumber: nameProfile.phoneNumber,
        cashtag: nameProfile.cashtag,
        email: nameProfile.email
      });
    }

    return completeProfiles;
  }
}

// Export types for use in other classes
export type CashAppAddress = Awaited<ReturnType<CashAppAddressGenerator["generateAddress"]>>;
export type CashAppFullProfile = Awaited<
  ReturnType<CashAppAddressGenerator["generateFullProfile"]>
>;
// Export types for use in other classes
