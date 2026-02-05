/**
 * [EXAMPLE][TABLE-UTILS][USAGE]{BUN-NATIVE}
 * Comprehensive examples of table utility functions
 */

import {
  enforceTable,
  aiSuggestColumns,
  validateTableData,
  compareTableData,
  calculateColumnWidths,
} from "../src/utils/table-utils";

// Sample medical data for enterprise table display
const medicalRecords = [
  {
    id: "MED-001",
    patientName: "Alice Johnson",
    email: "alice@hospital.com",
    status: "active",
    department: "Cardiology",
    timestamp: "2024-01-15T10:30:00Z",
    owner: "Dr. Smith",
    metrics: "BP: 120/80",
    tags: ["urgent", "follow-up"],
  },
  {
    id: "MED-002",
    patientName: "Bob Williams",
    email: "bob@hospital.com",
    status: "inactive",
    department: "Neurology",
    timestamp: "2024-01-14T14:20:00Z",
    owner: "Dr. Jones",
    metrics: "EEG: Normal",
    tags: ["routine"],
  },
];

// Example 1: Enforce table with minimum columns
console.log("=== Example 1: Enforce Table ===");
try {
  const columns = [
    "id",
    "patientName",
    "email",
    "status",
    "department",
    "timestamp",
  ];
  const result = enforceTable(medicalRecords, columns);
  console.log(result);
} catch (error) {
  console.error("Error:", (error as Error).message);
}

// Example 2: AI-suggest columns from data
console.log("\n=== Example 2: AI Suggest Columns ===");
const suggestedColumns = aiSuggestColumns(medicalRecords[0]);
console.log("Suggested columns:", suggestedColumns);
console.log("Total suggested:", suggestedColumns.length);

// Example 3: Validate table data
console.log("\n=== Example 3: Validate Table Data ===");
const isValid = validateTableData(medicalRecords);
console.log("Is valid for table display:", isValid);

// Example 4: Compare table datasets
console.log("\n=== Example 4: Compare Table Data ===");
const medicalRecords2 = JSON.parse(JSON.stringify(medicalRecords));
const isEqual = compareTableData(medicalRecords, medicalRecords2);
console.log("Datasets are equal:", isEqual);

// Example 5: Calculate column widths
console.log("\n=== Example 5: Calculate Column Widths ===");
const columns = ["id", "patientName", "email", "department"];
const widths = calculateColumnWidths(medicalRecords, columns);
console.log("Column widths:");
for (const [col, width] of widths) {
  console.log(`  ${col}: ${width} chars`);
}

// Example 6: Enforce with custom minimum columns
console.log("\n=== Example 6: Custom Minimum Columns ===");
try {
  const minimalColumns = ["id", "patientName", "status"];
  const result = enforceTable(medicalRecords, minimalColumns, 3);
  console.log(result);
} catch (error) {
  console.error("Error:", (error as Error).message);
}

// Example 7: Insufficient columns error
console.log("\n=== Example 7: Insufficient Columns Error ===");
try {
  const tooFewColumns = ["id", "patientName"];
  const result = enforceTable(medicalRecords, tooFewColumns, 6);
  console.log(result);
} catch (error) {
  console.error("Expected error:", (error as Error).message);
}

