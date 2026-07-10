// ─── lib/data/schema/SchemaTypes.ts ──────────────────────────────────────────
// Phase 70 — core schema and validation types.

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "isoDate";

export interface FieldSchema {
  type:       FieldType;
  required?:  boolean;
  min?:       number;        // inclusive, for numbers
  max?:       number;        // inclusive, for numbers
  minLength?: number;        // for strings
  maxLength?: number;        // for strings
  enum?:      (string | number | boolean)[];
  default?:   unknown;
  items?:     FieldSchema;   // element schema for arrays
}

export type ObjectSchema = Record<string, FieldSchema>;

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  field:    string;
  message:  string;
  value?:   unknown;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid:    boolean;     // true when no errors (warnings allowed)
  issues:   ValidationIssue[];
}

export interface SchemaDefinition {
  name:          string;
  schemaVersion: string;   // semver-style "1.0"
  fields:        ObjectSchema;
  migrate?:      (obj: Record<string, unknown>, fromVersion: string) => Record<string, unknown>;
}

// Stamped onto every object by the migration engine
export interface VersionStamp {
  _schemaVersion:    string;
  _createdAt:        string;   // ISO
  _updatedAt:        string;   // ISO
  _migrationVersion: number;
}
