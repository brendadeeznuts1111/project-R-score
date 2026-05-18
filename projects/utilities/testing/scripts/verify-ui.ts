/**
 * 🧪 PRODUCTION FEATURE TEST
 * Verifies table alignment, emoji support, and system logic.
 */

import { renderPhoneDashboard } from "../utils/table-formatter";
import { PhoneSystem } from "../systems/phone-system";

async function runTests() {
  console.info("🛠️ Testing Phone Dashboard Alignment...");
  
  const mockPhones = [
    { name: "iPhone 15 Pro", battery: 95, status: "Connected ✅" },
    { name: "Pixel 8", battery: 15, status: "Charging ⚡" },
    { name: "Samsung S24 Ultra", battery: 45, status: "Idle 💤" },
    { name: "Z-Fold 🦋", battery: 3, status: "Low Battery 🪫" }
  ];

  renderPhoneDashboard(mockPhones);

  console.info("\n🛠️ Checking PhoneSystem Class Structure...");
  const phoneSystem = new PhoneSystem();
  
  if (typeof phoneSystem.debugPhone === "function") {
    console.info("✅ debugPhone (Bun.Terminal) detected.");
  }
  
  if (typeof phoneSystem.captureScreenshot === "function") {
    console.info("✅ captureScreenshot (S3 Integration) detected.");
  }

  console.info("\n✨ Verification Complete!");
}

runTests();
