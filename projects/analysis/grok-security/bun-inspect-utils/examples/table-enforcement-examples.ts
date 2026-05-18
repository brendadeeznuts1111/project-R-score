/**
 * [SECURITY][EXAMPLES][PATTERNS][META:{VERSION:1.0.0}][#REF:table-enforcement]{BUN-NATIVE}
 * Comprehensive examples of table enforcement patterns
 */

import {
  table,
  tableMarkdown,
  tableCsv,
} from "../src/core/table";
import {
  validateTableColumns,
  analyzeTableData,
  getRecommendedColumns,
} from "../src/enforcement/index";

// ============================================================================
// EXAMPLE 1: Basic Compliant Usage
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  status: "active" | "inactive";
  joinDate: string;
  department: string;
}

const users: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "admin",
    status: "active",
    joinDate: "2024-01-01",
    department: "Engineering",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-01-02",
    department: "Sales",
  },
  {
    id: 3,
    name: "Charlie Brown",
    email: "charlie@example.com",
    role: "user",
    status: "inactive",
    joinDate: "2024-01-03",
    department: "Marketing",
  },
];

/**
 * ✅ COMPLIANT: Explicit properties with 6+ meaningful columns
 */
export function example1_ExplicitProperties() {
  console.info("\n=== Example 1: Explicit Properties ===\n");

  const properties = [
    "name",
    "email",
    "role",
    "status",
    "joinDate",
    "department",
  ];

  const result = table(users, properties);
  console.info(result);
}

// ============================================================================
// EXAMPLE 2: Using Recommended Columns
// ============================================================================

/**
 * ✅ COMPLIANT: Using intelligent column recommendations
 */
export function example2_RecommendedColumns() {
  console.info("\n=== Example 2: Recommended Columns ===\n");

  // Analyze data and get recommendations
  const recommended = getRecommendedColumns(users, 6);
  console.info("Recommended columns:", recommended);

  const result = table(users, recommended);
  console.info(result);
}

// ============================================================================
// EXAMPLE 3: Data Analysis
// ============================================================================

/**
 * ✅ COMPLIANT: Analyzing data structure before display
 */
export function example3_DataAnalysis() {
  console.info("\n=== Example 3: Data Analysis ===\n");

  const analysis = analyzeTableData(users);

  console.info("Total columns:", analysis.totalColumns);
  console.info("Column names:", analysis.columnNames);
  console.info("High cardinality:", analysis.highCardinalityColumns);
  console.info("Low cardinality:", analysis.lowCardinalityColumns);
  console.info("Data richness score:", analysis.dataRichnessScore);

  // Use high-cardinality columns for display
  const properties = analysis.highCardinalityColumns.slice(0, 6);
  const result = table(users, properties);
  console.info(result);
}

// ============================================================================
// EXAMPLE 4: Validation with Feedback
// ============================================================================

/**
 * ✅ COMPLIANT: Explicit validation with suggestions
 */
export function example4_ValidationWithFeedback() {
  console.info("\n=== Example 4: Validation with Feedback ===\n");

  const properties = ["name", "email", "role", "status", "joinDate", "department"];
  const validation = validateTableColumns(properties, users);

  console.info("Valid:", validation.isValid);
  console.info("Meaningful columns:", validation.meaningfulColumns);
  console.info("Generic columns:", validation.genericColumns);
  console.info("Message:", validation.message);

  if (validation.isValid) {
    const result = table(users, properties);
    console.info(result);
  }
}

// ============================================================================
// EXAMPLE 5: Markdown Format
// ============================================================================

/**
 * ✅ COMPLIANT: Markdown table with validation
 */
export function example5_MarkdownFormat() {
  console.info("\n=== Example 5: Markdown Format ===\n");

  const properties = [
    "name",
    "email",
    "role",
    "status",
    "joinDate",
    "department",
  ];

  const result = tableMarkdown(users, properties);
  console.info(result);
}

// ============================================================================
// EXAMPLE 6: CSV Format
// ============================================================================

/**
 * ✅ COMPLIANT: CSV table with validation
 */
export function example6_CsvFormat() {
  console.info("\n=== Example 6: CSV Format ===\n");

  const properties = [
    "name",
    "email",
    "role",
    "status",
    "joinDate",
    "department",
  ];

  const result = tableCsv(users, properties);
  console.info(result);
}

// ============================================================================
// EXAMPLE 7: Skip Validation When Needed
// ============================================================================

/**
 * ⚠️  SPECIAL CASE: Skip validation for specific use cases
 * Use only when you have a good reason!
 */
export function example7_SkipValidation() {
  console.info("\n=== Example 7: Skip Validation ===\n");

  // Sometimes you need to display minimal data
  const properties = ["id", "name"];

  const result = table(users, properties, { skipValidation: true });
  console.info(result);
  console.info("⚠️  Validation was skipped for this table");
}

// ============================================================================
// EXAMPLE 8: Dynamic Column Selection
// ============================================================================

/**
 * ✅ COMPLIANT: Dynamic column selection based on context
 */
export function example8_DynamicColumns() {
  console.info("\n=== Example 8: Dynamic Column Selection ===\n");

  // Different views for different contexts
  const adminView = [
    "name",
    "email",
    "role",
    "status",
    "joinDate",
    "department",
  ];
  const userView = ["name", "email", "role", "status", "joinDate", "department"];

  console.info("Admin view:");
  console.info(table(users, adminView));

  console.info("\nUser view:");
  console.info(table(users, userView));
}

// ============================================================================
// EXAMPLE 9: Error Handling
// ============================================================================

/**
 * ✅ COMPLIANT: Proper error handling
 */
export function example9_ErrorHandling() {
  console.info("\n=== Example 9: Error Handling ===\n");

  try {
    // This will fail validation in test environment
    const result = table(users, ["id", "name"]);
    console.info(result);
  } catch (error) {
    console.error("Validation error:", (error as Error).message);
    console.info("💡 Add more meaningful columns to fix this");
  }
}

// ============================================================================
// EXAMPLE 10: Production Patterns
// ============================================================================

/**
 * ✅ COMPLIANT: Production-ready pattern
 */
export async function example10_ProductionPattern() {
  console.info("\n=== Example 10: Production Pattern ===\n");

  // 1. Analyze data
  const analysis = analyzeTableData(users);

  // 2. Get recommendations
  const recommended = getRecommendedColumns(users, 6);

  // 3. Validate
  const validation = validateTableColumns(recommended, users);

  // 4. Display
  if (validation.isValid) {
    const result = table(users, recommended);
    console.info(result);
  } else {
    console.error("Cannot display table:", validation.message);
  }
}

// ============================================================================
// Run Examples
// ============================================================================

if (import.meta.main) {
  example1_ExplicitProperties();
  example2_RecommendedColumns();
  example3_DataAnalysis();
  example4_ValidationWithFeedback();
  example5_MarkdownFormat();
  example6_CsvFormat();
  example7_SkipValidation();
  example8_DynamicColumns();
  example9_ErrorHandling();
  example10_ProductionPattern();
}

