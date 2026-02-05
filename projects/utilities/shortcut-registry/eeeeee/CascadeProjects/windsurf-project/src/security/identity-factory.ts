#!/usr/bin/env bun
// 🧬 src/nexus/identity-factory.ts - The Cryptographic Persona Engine
// Sovereign Identity Blueprint with deterministic human profile generation

import { hash } from "bun";

// Use global crypto if available, otherwise create mock
const crypto = (globalThis as any).crypto || {
  randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};
import personaConfig from "./persona.toml" with { type: "toml" };

export interface IdentitySilo {
  id: string;                    // app_hash_id
  fullName: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  ethnicity: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  recoveryEmail: string;
  
  // 🎓 Education & Career
  education: string;
  major: string;
  profession: string;
  company: string;
  income: string;
  creditScore: number;
  
  // 🏠 Physical Attributes
  height: string;
  eyeColor: string;
  hairColor: string;
  birthDate: string;
  
  // 🔐 Security Credentials
  totpSecret: string;            // For 2FA System
  passkeyId: string;             // Virtual Passkey ID
  passkeyAlgorithm: string;      // Passkey algorithm
  mfaMethod: string;             // Preferred MFA method
  recoveryHint: string;          // Security question
  recoveryAnswer: string;        // Security answer
  
  // 🌐 Social & Preferences
  socialPlatforms: string[];
  interests: string[];
  musicGenre: string;
  foodPreference: string;
  hobbies: string[];
  
  // 🏦 Financial
  bankType: string;
  bankAccount: string;
  
  // 📊 Metadata
  generatedAt: string;
  version: string;
  deterministic: boolean;
}

export interface PersonaGenerationOptions {
  useDeterministic: boolean;
  gender?: string;
  ageRange?: [number, number];
  location?: string;
  profession?: string;
  educationLevel?: string;
}

/**
 * 🧬 CRYPTOGRAPHIC PERSONA ENGINE
 * Generates complete human profiles with deterministic recovery
 */
export class IdentityFactory {
  private static readonly PERSONA_VERSION = "1.0";
  
  /**
   * 🏭 GENERATE COMPLETE IDENTITY SILO
   * Creates full human profile with deterministic seed
   */
  static generateSilo(
    appHash: string, 
    options: PersonaGenerationOptions = { useDeterministic: true }
  ): IdentitySilo {

    // 🎲 USE DETERMINISTIC OR RANDOM GENERATION
    const seed = options.useDeterministic ? appHash : crypto.randomUUID();
    const rng = options.useDeterministic ? this.createDeterministicRNG(seed) : Math.random;
    
    // 👤 GENERATE BASIC IDENTITY
    const firstName = this.selectFirstName(rng);
    const lastName = this.generateLastName(appHash, rng);
    const fullName = `${firstName} ${lastName}`;
    
    // 🎂 GENERATE DEMOGRAPHICS
    const gender = options.gender || this.selectFromList(personaConfig.bio.genders, rng);
    const age = this.generateAge(options.ageRange, rng);
    const ethnicity = this.selectFromList(personaConfig.bio.ethnicities, rng);
    
    // 🏠 GENERATE LOCATION
    const cityIndex = Math.floor(rng() * personaConfig.locales.cities.length);
    const city = personaConfig.locales.cities[cityIndex];
    const state = personaConfig.locales.states[cityIndex];
    const zipCode = this.generateZipCode(rng);
    const address = `${Math.floor(rng() * 9999) + 1} ${lastName} St, ${city}, ${state} ${zipCode}`;
    
    // 📧 GENERATE CONTACT INFO
    const email = this.generateEmail(firstName, lastName, appHash, rng);
    const phone = this.generatePhone(rng);
    const recoveryEmail = `backup.${appHash}@protonmail.com`;
    
    // 🎓 GENERATE EDUCATION & CAREER
    const education = this.selectFromList(personaConfig.education.levels, rng);
    const major = this.selectFromList(personaConfig.education.majors, rng);
    const profession = this.selectFromList([...personaConfig.professions.tech, ...personaConfig.professions.creative, ...personaConfig.professions.business], rng);
    const company = this.generateCompany(profession, city, rng);
    const income = this.selectFromList(personaConfig.financial.income_brackets, rng);
    const creditScore = Math.floor(rng() * (personaConfig.financial.credit_score_range[1] - personaConfig.financial.credit_score_range[0])) + personaConfig.financial.credit_score_range[0];
    
    // 🏠 GENERATE PHYSICAL ATTRIBUTES
    const height = this.generateHeight(gender, rng);
    const eyeColor = this.selectFromList(personaConfig.physical.eye_colors, rng);
    const hairColor = this.selectFromList(personaConfig.physical.hair_colors, rng);
    const birthDate = this.generateBirthDate(age, rng);
    
    // 🔐 GENERATE SECURITY CREDENTIALS
    const totpSecret = this.generateTOTPSecret(appHash, rng);
    const passkeyId = this.generatePasskeyId(appHash, rng);
    const passkeyAlgorithm = this.selectFromList(personaConfig.security.passkey_algorithms, rng);
    const mfaMethod = this.selectFromList(personaConfig.security.mfa_methods, rng);
    const recoveryHint = this.selectFromList(personaConfig.security.recovery_hint_pool, rng);
    const recoveryAnswer = this.generateRecoveryAnswer(recoveryHint, rng);
    
    // 🌐 GENERATE SOCIAL & PREFERENCES
    const socialPlatforms = this.selectMultipleFromList(personaConfig.social.platforms, 2, 4, rng);
    const interests = this.selectMultipleFromList(personaConfig.social.interests, 3, 5, rng);
    const musicGenre = this.selectFromList(personaConfig.preferences.music_genres, rng);
    const foodPreference = this.selectFromList(personaConfig.preferences.food_preferences, rng);
    const hobbies = this.selectMultipleFromList(personaConfig.preferences.hobbies, 2, 4, rng);
    
    // 🏦 GENERATE FINANCIAL
    const bankType = this.selectFromList(personaConfig.financial.bank_types, rng);
    const bankAccount = this.generateBankAccount(rng);
    
    // 🏗️ CONSTRUCT COMPLETE SILO
    const silo: IdentitySilo = {
      id: appHash,
      fullName,
      firstName,
      lastName,
      age,
      gender,
      ethnicity,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      recoveryEmail,
      
      education,
      major,
      profession,
      company,
      income,
      creditScore,
      
      height,
      eyeColor,
      hairColor,
      birthDate,
      
      totpSecret,
      passkeyId,
      passkeyAlgorithm,
      mfaMethod,
      recoveryHint,
      recoveryAnswer,
      
      socialPlatforms,
      interests,
      musicGenre,
      foodPreference,
      hobbies,
      
      bankType,
      bankAccount,
      
      generatedAt: new Date().toISOString(),
      version: this.PERSONA_VERSION,
      deterministic: options.useDeterministic
    };

    return silo;
  }
  
  /**
   * 🔄 GENERATE BATCH SILOS
   * High-performance batch generation for fleet provisioning
   */
  static async generateBatchSilos(
    appHashes: string[], 
    options: PersonaGenerationOptions = { useDeterministic: true }
  ): Promise<IdentitySilo[]> {

    const silos: IdentitySilo[] = [];
    const startTime = performance.now();
    
    for (let i = 0; i < appHashes.length; i++) {
      const appHash = appHashes[i];
      const silo = this.generateSilo(appHash, options);
      silos.push(silo);
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {

      }
      
      // Small delay to prevent overwhelming the system
      if (i % 50 === 0 && i > 0) {
        await Bun.sleep(10);
      }
    }
    
    const elapsed = performance.now() - startTime;
    const rate = (silos.length / (elapsed / 1000)).toFixed(2);

    return silos;
  }
  
  /**
   * 🔍 VALIDATE SILO INTEGRITY
   * Verify silo completeness and consistency
   */
  static validateSilo(silo: IdentitySilo): boolean {
    const requiredFields = [
      'id', 'fullName', 'firstName', 'lastName', 'age', 'gender',
      'address', 'email', 'phone', 'totpSecret', 'passkeyId'
    ];
    
    for (const field of requiredFields) {
      if (!silo[field as keyof IdentitySilo]) {

        return false;
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(silo.email)) {

      return false;
    }
    
    // Validate age range
    if (silo.age < 22 || silo.age > 45) {

      return false;
    }
    
    // Validate phone format (basic)
    if (!silo.phone.match(/^\+1-\d{3}-\d{3}-\d{4}$/)) {

      return false;
    }

    return true;
  }
  
  /**
   * 🔄 ROTATE SILO IDENTITY
   * Generate new silo while preserving some deterministic elements
   */
  static rotateSilo(
    oldSilo: IdentitySilo, 
    newAppHash: string,
    options: PersonaGenerationOptions = { useDeterministic: true }
  ): IdentitySilo {

    // Generate new silo with preserved elements
    const newSilo = this.generateSilo(newAppHash, options);
    
    // Optionally preserve some elements for continuity
    // newSilo.interests = oldSilo.interests;
    // newSilo.musicGenre = oldSilo.musicGenre;

    return newSilo;
  }
  
  // 🔒 PRIVATE HELPER METHODS
  
  /**
   * 🎲 CREATE DETERMINISTIC RNG FROM SEED
   */
  private static createDeterministicRNG(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }
  
  /**
   * 👤 SELECT FIRST NAME
   */
  private static selectFirstName(rng: () => number): string {
    const firstNames = [
      "Sarah", "Jessica", "Ashley", "Emily", "Samantha", "Amanda", "Elizabeth", "Rachel",
      "Jennifer", "Maria", "Lisa", "Michelle", "Laura", "Sarah", "Kimberly", "Patricia"
    ];
    return firstNames[Math.floor(rng() * firstNames.length)];
  }
  
  /**
   * 🏷️ GENERATE LAST NAME FROM HASH
   */
  private static generateLastName(appHash: string, rng: () => number): string {
    const prefixes = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    const suffix = (appHash || "0000").slice(0, 4).toUpperCase();
    return `${prefix}-${suffix}`;
  }
  
  /**
   * 🎂 GENERATE AGE
   */
  private static generateAge(ageRange: [number, number] | undefined, rng: () => number): number {
    const [min, max] = ageRange || personaConfig.bio.age_range;
    return Math.floor(rng() * (max - min + 1)) + min;
  }
  
  /**
   * 📧 GENERATE EMAIL
   */
  private static generateEmail(firstName: string, lastName: string, appHash: string, rng: () => number): string {
    const provider = this.selectFromList(personaConfig.communication.email_providers, rng);
    const variation = Math.floor(rng() * 100);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${variation}@${provider}`;
  }
  
  /**
   * 📱 GENERATE PHONE NUMBER
   */
  private static generatePhone(rng: () => number): string {
    const areaCode = Math.floor(rng() * 900) + 100;
    const exchange = Math.floor(rng() * 900) + 100;
    const number = Math.floor(rng() * 9000) + 1000;
    return `+1-${areaCode}-${exchange}-${number}`;
  }
  
  /**
   * 🏠 GENERATE ZIP CODE
   */
  private static generateZipCode(rng: () => number): string {
    return Math.floor(rng() * 90000 + 10000).toString();
  }
  
  /**
   * 💼 GENERATE COMPANY NAME
   */
  private static generateCompany(profession: string, city: string, rng: () => number): string {
    const companyTypes = ["Solutions", "Technologies", "Group", "Labs", "Systems", "Digital"];
    const companyType = this.selectFromList(companyTypes, rng);
    return `${city} ${profession} ${companyType}`;
  }
  
  /**
   * 🏠 GENERATE HEIGHT
   */
  private static generateHeight(gender: string, rng: () => number): string {
    const range = gender === "Male" ? personaConfig.physical.height_range_male : personaConfig.physical.height_range_female;
    const heightInches = Math.floor(rng() * (range[1] - range[0] + 1)) + range[0];
    const feet = Math.floor(heightInches / 12);
    const inches = heightInches % 12;
    return `${feet}'${inches}"`;
  }
  
  /**
   * 🎂 GENERATE BIRTH DATE
   */
  private static generateBirthDate(age: number, rng: () => number): string {
    const now = new Date();
    const birthYear = now.getFullYear() - age;
    const birthMonth = Math.floor(rng() * 12) + 1;
    const birthDay = Math.floor(rng() * 28) + 1;
    return `${birthMonth}/${birthDay}/${birthYear}`;
  }
  
  /**
   * 🔐 GENERATE TOTP SECRET
   */
  private static generateTOTPSecret(appHash: string, rng: () => number): string {
    const base = (appHash || "00000000").slice(0, 8).toUpperCase();
    const random = Math.floor(rng() * 10000).toString().padStart(4, '0');
    return `${base}${random}`;
  }
  
  /**
   * 🔑 GENERATE PASSKEY ID
   */
  private static generatePasskeyId(appHash: string, rng: () => number): string {
    return hash.crc32(`passkey-${appHash || "default"}-${Date.now()}`).toString(16);
  }
  
  /**
   * ❓ GENERATE RECOVERY ANSWER
   */
  private static generateRecoveryAnswer(hint: string, rng: () => number): string {
    const answers: Record<string, string[]> = {
      "First pet?": ["Max", "Buddy", "Luna", "Charlie", "Bella", "Cooper"],
      "Mother's maiden name?": ["Smith", "Johnson", "Williams", "Brown", "Jones", "Davis"],
      "Street you grew up on?": ["Oak Street", "Maple Avenue", "Pine Road", "Elm Drive", "Cedar Lane"],
      "Favorite teacher?": ["Mrs. Johnson", "Mr. Smith", "Dr. Brown", "Professor Davis", "Ms. Wilson"],
      "First car?": ["Honda Civic", "Toyota Camry", "Ford Focus", "Chevrolet Malibu", "Nissan Altima"]
    };
    
    const possibleAnswers = answers[hint] || ["Unknown"];
    return this.selectFromList(possibleAnswers, rng);
  }
  
  /**
   * 🏦 GENERATE BANK ACCOUNT
   */
  private static generateBankAccount(rng: () => number): string {
    const routing = Math.floor(rng() * 900000000) + 100000000;
    const account = Math.floor(rng() * 900000000) + 100000000;
    return `****${account.toString().slice(-4)}`;
  }
  
  /**
   * 🎯 SELECT FROM LIST
   */
  private static selectFromList(list: string[], rng: () => number): string {
    if (!list || list.length === 0) {
      return "default";
    }
    return list[Math.floor(rng() * list.length)];
  }
  
  /**
   * 🎯 SELECT MULTIPLE FROM LIST
   */
  private static selectMultipleFromList(list: string[], min: number, max: number, rng: () => number): string[] {
    const count = Math.floor(rng() * (max - min + 1)) + min;
    const selected: string[] = [];
    const available = [...list];
    
    for (let i = 0; i < count && i < available.length; i++) {
      const index = Math.floor(rng() * available.length);
      selected.push(available[index]);
      available.splice(index, 1);
    }
    
    return selected;
  }
}

// 🎯 CONVENIENCE FUNCTIONS
export function generateSilo(appHash: string, options?: PersonaGenerationOptions): IdentitySilo {
  return IdentityFactory.generateSilo(appHash, options);
}

export function validateSilo(silo: IdentitySilo): boolean {
  return IdentityFactory.validateSilo(silo);
}
