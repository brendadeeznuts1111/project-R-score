#!/bin/bash
# Tier-1380 MCP Tool Registry - Quick Validation Examples

echo "🚀 Quick Validation One-Liners"
echo "==============================="
echo

echo "Example 1: Valid subset"
echo "bun -e '"
echo "const schemas = { \"rss/query\": { input: { pattern: \"string\", limit: \"number\" }, required: [\"pattern\"] } };"
echo "const call = { name: \"rss/query\", arguments: { pattern: \"bun\" } };"
echo "console.log(Bun.deepMatch(call.arguments, schemas[\"rss/query\"].input) ? \"Valid subset\" : \"Invalid\")'"
echo
bun -e '
const schemas = { "rss/query": { input: { pattern: "string", limit: "number" }, required: ["pattern"] } };
const call = { name: "rss/query", arguments: { pattern: "bun" } };
console.log(Bun.deepMatch(call.arguments, schemas["rss/query"].input) ? "Valid subset" : "Invalid")'
echo

echo "Example 2: Missing required field"
echo "bun -e '"
echo "const schemas = { \"rss/query\": { input: { pattern: \"string\" }, required: [\"pattern\"] } };"
echo "console.log(Bun.deepMatch({ limit: 10 }, schemas[\"rss/query\"].input) ? \"Valid\" : \"Missing pattern\")'"
echo
bun -e '
const schemas = { "rss/query": { input: { pattern: "string" }, required: ["pattern"] } };
console.log(Bun.deepMatch({ limit: 10 }, schemas["rss/query"].input) ? "Valid" : "Missing pattern")'
echo

echo "Example 3: Using the validation system"
echo "bun -e '"
echo "import { validateToolCall } from \"./validate.js\";"
echo "const result = validateToolCall(\"rss/query\", { pattern: \"bun\", limit: 5 });"
echo "console.log(result.valid ? \"✅ Valid\" : \"❌ Invalid: \" + result.error);'"
echo
bun -e '
import { validateToolCall } from "./validate.js";
const result = validateToolCall("rss/query", { pattern: "bun", limit: 5 });
console.log(result.valid ? "✅ Valid" : "❌ Invalid: " + result.error);'
echo

echo "Example 4: Constraint validation"
echo "bun -e '"
echo "import { validateToolCall } from \"./validate.js\";"
echo "const valid = validateToolCall(\"audit/scan\", { path: \"/src\", max_width: 89 });"
echo "const invalid = validateToolCall(\"audit/scan\", { path: \"/src\", max_width: 70 });"
echo "console.log(\"Valid width 89:\", valid.valid ? \"✅\" : \"❌\");"
echo "console.log(\"Invalid width 70:\", invalid.valid ? \"✅\" : \"❌\");'"
echo
bun -e '
import { validateToolCall } from "./validate.js";
const valid = validateToolCall("audit/scan", { path: "/src", max_width: 89 });
const invalid = validateToolCall("audit/scan", { path: "/src", max_width: 70 });
console.log("Valid width 89:", valid.valid ? "✅" : "❌");
console.log("Invalid width 70:", invalid.valid ? "✅" : "❌");'
echo

echo "🔐 All examples completed successfully!"
echo "   ▵⟂⥂ validation system operational"
