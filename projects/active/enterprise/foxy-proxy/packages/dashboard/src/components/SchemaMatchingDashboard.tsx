import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  GitCompare,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import {
  validateSchema,
  compareSchemas,
  createDefaultSchema,
  type SchemaValidationResult,
  type SchemaComparisonResult,
  type FileSchema
} from "../utils/schema-validator";
import { enhancedBunR2Client } from "../utils/r2";

interface SchemaMatchResult {
  bucketName: string;
  schema: FileSchema | null;
  validation: SchemaValidationResult | null;
  fileCount: number;
  lastUpdated: Date | null;
}

export const SchemaMatchingDashboard: React.FC = () => {
  const [buckets, setBuckets] = useState<SchemaMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<SchemaComparisonResult | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load bucket schemas
  const loadBucketSchemas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get list of buckets to check
      const bucketNames = ["foxy-proxy-storage", "foxy-proxy-backup", "foxy-proxy-cache"];
      const results: SchemaMatchResult[] = [];

      for (const bucketName of bucketNames) {
        try {
          // Get sample file from bucket to extract schema
          const files = await enhancedBunR2Client.listFiles(bucketName);

          if (files.length > 0) {
            const { schema } = await enhancedBunR2Client.getFileInfoWithSchema(files[0].key);

            if (schema) {
              const validation = validateSchema(schema);

              results.push({
                bucketName,
                schema,
                validation,
                fileCount: files.length,
                lastUpdated: new Date()
              });
            }
          } else {
            // Empty bucket - create default schema for comparison
            const defaultSchema = createDefaultSchema({
              key: "sample",
              originalName: "sample.txt",
              mimeType: "text/plain",
              size: 0,
              bucket: bucketName
            });

            results.push({
              bucketName,
              schema: defaultSchema,
              validation: validateSchema(defaultSchema),
              fileCount: 0,
              lastUpdated: new Date()
            });
          }
        } catch (bucketError) {
          console.warn(`Failed to load schema for ${bucketName}:`, bucketError);

          // Create fallback schema
          const fallbackSchema = createDefaultSchema({
            key: "fallback",
            originalName: "fallback.txt",
            mimeType: "text/plain",
            size: 0,
            bucket: bucketName
          });

          results.push({
            bucketName,
            schema: fallbackSchema,
            validation: validateSchema(fallbackSchema),
            fileCount: 0,
            lastUpdated: new Date()
          });
        }
      }

      setBuckets(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bucket schemas");
    } finally {
      setLoading(false);
    }
  };

  // Compare selected buckets
  const compareSelectedBuckets = useCallback(() => {
    if (selectedBuckets.length < 2) {
      setComparisonResult(null);
      return;
    }

    const [bucket1, bucket2] = selectedBuckets;
    const schema1 = buckets.find((b) => b.bucketName === bucket1)?.schema;
    const schema2 = buckets.find((b) => b.bucketName === bucket2)?.schema;

    if (schema1 && schema2) {
      const result = compareSchemas(schema1, schema2);
      setComparisonResult(result);
    }
  }, [selectedBuckets, buckets]);

  // Toggle bucket expansion
  const toggleBucketExpansion = (bucketName: string) => {
    const newExpanded = new Set(expandedBuckets);
    if (newExpanded.has(bucketName)) {
      newExpanded.delete(bucketName);
    } else {
      newExpanded.add(bucketName);
    }
    setExpandedBuckets(newExpanded);
  };

  // Get status color
  const getStatusColor = (validation: SchemaValidationResult | null) => {
    if (!validation) {
      return "text-gray-500";
    }
    if (validation.isValid) {
      return "text-green-600";
    }
    return "text-red-600";
  };

  // Get status icon
  const getStatusIcon = (validation: SchemaValidationResult | null) => {
    if (!validation) {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (validation.isValid) {
      return <CheckCircle className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  useEffect(() => {
    loadBucketSchemas();
  }, []);

  useEffect(() => {
    compareSelectedBuckets();
  }, [compareSelectedBuckets]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Schema Matching Dashboard</h2>
        <p className="text-sm text-gray-600">
          Monitor and validate schema consistency across all storage buckets
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={loadBucketSchemas}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Schemas
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Info className="w-4 h-4" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
        </div>

        <div className="text-sm text-gray-600">{buckets.length} buckets loaded</div>
      </div>

      {/* Comparison Results */}
      {selectedBuckets.length >= 2 && comparisonResult && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <GitCompare className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Schema Comparison: {selectedBuckets.join(" vs ")}
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${
                comparisonResult.areIdentical
                  ? "bg-green-100 text-green-800"
                  : comparisonResult.compatibility === "incompatible"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {comparisonResult.areIdentical
                ? "Identical"
                : comparisonResult.compatibility === "incompatible"
                  ? "Incompatible"
                  : "Compatible with Warnings"}
            </span>

            <span className="text-sm text-gray-600">
              {comparisonResult.differences.length} differences
            </span>
          </div>

          {comparisonResult.differences.length > 0 && (
            <div className="space-y-2">
              {comparisonResult.differences.slice(0, 5).map((diff, index) => (
                <div key={index} className="text-sm p-2 bg-white rounded border">
                  <span className="font-medium">{diff.field}:</span>
                  <span className="ml-2 text-gray-600">
                    {diff.type === "missing_in_first" && "Missing in first bucket"}
                    {diff.type === "missing_in_second" && "Missing in second bucket"}
                    {diff.type === "value_mismatch" &&
                      `Values differ: ${JSON.stringify(diff.value1)} vs ${JSON.stringify(diff.value2)}`}
                  </span>
                </div>
              ))}

              {comparisonResult.differences.length > 5 && (
                <div className="text-sm text-gray-500 text-center">
                  ... and {comparisonResult.differences.length - 5} more differences
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bucket List */}
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.bucketName} className="border rounded-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBuckets.includes(bucket.bucketName)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBuckets([...selectedBuckets, bucket.bucketName]);
                      } else {
                        setSelectedBuckets(selectedBuckets.filter((b) => b !== bucket.bucketName));
                      }
                    }}
                    className="rounded border-gray-300"
                  />

                  <Database className="w-5 h-5 text-gray-600" />

                  <div>
                    <h3 className="font-semibold text-gray-900">{bucket.bucketName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{bucket.fileCount} files</span>
                      <span>•</span>
                      <span>Updated {bucket.lastUpdated?.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 ${getStatusColor(bucket.validation)}`}>
                    {getStatusIcon(bucket.validation)}
                    <span className="text-sm font-medium">
                      {bucket.validation?.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBucketExpansion(bucket.bucketName)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedBuckets.has(bucket.bucketName) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedBuckets.has(bucket.bucketName) && bucket.validation && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Validation Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Validation Results</h4>
                      {bucket.validation.errors.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-red-600">Errors:</div>
                          {bucket.validation.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-600 ml-2">
                              • {error}
                            </div>
                          ))}
                        </div>
                      )}

                      {bucket.validation.warnings.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-yellow-600">Warnings:</div>
                          {bucket.validation.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-yellow-600 ml-2">
                              • {warning}
                            </div>
                          ))}
                        </div>
                      )}

                      {bucket.validation.isValid && (
                        <div className="text-sm text-green-600">✓ Schema is valid</div>
                      )}
                    </div>

                    {/* Schema Details */}
                    {bucket.schema && showAdvanced && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Schema Details</h4>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">Version:</span>{" "}
                            {bucket.schema.version.current}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {bucket.schema.category}
                          </div>
                          <div>
                            <span className="font-medium">Storage Class:</span>{" "}
                            {bucket.schema.storageClass}
                          </div>
                          <div>
                            <span className="font-medium">Processing:</span>{" "}
                            {bucket.schema.processing.status}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>{" "}
                            {new Date(bucket.schema.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800">Error Loading Schemas</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {buckets.filter((b) => b.validation?.isValid).length}
            </div>
            <div className="text-sm text-gray-600">Valid Schemas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {buckets.filter((b) => !b.validation?.isValid).length}
            </div>
            <div className="text-sm text-gray-600">Invalid Schemas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {buckets.reduce((sum, b) => sum + b.fileCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {comparisonResult?.areIdentical ? "Yes" : "No"}
            </div>
            <div className="text-sm text-gray-600">All Match</div>
          </div>
        </div>
      </div>
    </div>
  );
};
